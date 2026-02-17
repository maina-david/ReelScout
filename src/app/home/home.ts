import { Component, computed, DestroyRef, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { MediaCard } from '../media-card/media-card';
import { MediaShelf } from '../media-shelf/media-shelf';
import { TmdbMedia, TmdbMovie, TmdbTv } from '../models/tmdb.model';
import { EpisodeProgressService } from '../services/episode-progress.service';
import { RecentlyViewedService } from '../services/recently-viewed.service';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';
import { WatchlistService } from '../services/watchlist.service';

type SearchFilter = 'all' | 'movie' | 'tv' | 'person';

@Component({
  selector: 'app-home',
  imports: [FormsModule, MediaCard, MediaShelf],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy {
  private tmdb = inject(TmdbService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private titleService = inject(Title);
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);
  readonly recentlyViewed = inject(RecentlyViewedService);
  readonly watchlist = inject(WatchlistService);
  private progress = inject(EpisodeProgressService);

  query = signal('');
  searchFilter = signal<SearchFilter>('all');
  searchResults = signal<TmdbMedia[]>([]);
  suggestions = signal<TmdbMedia[]>([]);
  showSuggestions = signal(false);
  searchLoading = signal(false);
  searchTotal = signal(0);
  hasSearched = signal(false);

  heroItems = signal<TmdbMedia[]>([]);
  heroIndex = signal(0);
  heroLoading = signal(true);
  trailerKey = signal<string | null>(null);
  showTrailer = signal(false);

  trendingToday = signal<TmdbMedia[]>([]);
  popularMovies = signal<TmdbMedia[]>([]);
  topRatedTv = signal<TmdbMedia[]>([]);
  nowPlaying = signal<TmdbMedia[]>([]);
  newAndPopular = signal<TmdbMedia[]>([]);
  hiddenGems = signal<TmdbMedia[]>([]);
  sectionsLoading = signal(true);
  trendingRegion = signal('US');
  trendingLoading = signal(false);

  readonly countries = [
    { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
    { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' },
    { code: 'IN', name: 'India' }, { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' }, { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' },
  ];

  private heroInterval?: ReturnType<typeof setInterval>;
  private searchQuery$ = new Subject<void>();
  private suggestQuery$ = new Subject<string>();

  currentHero = computed(() => this.heroItems()[this.heroIndex()] ?? null);

  heroInWatchlist = computed(() => {
    const h = this.currentHero();
    return h ? this.watchlist.isInWatchlist(h.id)() : false;
  });

  continueWatching = computed((): TmdbMedia[] => {
    this.progress.watchedSignal();
    return this.recentlyViewed.items().filter(
      m => m.media_type === 'tv' && this.progress.hasAnyProgress(m.id)
    );
  });

  safeTrailerUrl = computed((): SafeResourceUrl | null => {
    const key = this.trailerKey();
    if (!key) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${key}?autoplay=1`);
  });

  filteredResults = computed(() => {
    const f = this.searchFilter();
    const results = this.searchResults();
    return f === 'all' ? results : results.filter(r => r.media_type === f);
  });

  searchFilterCounts = computed((): Record<string, number> => {
    const results = this.searchResults();
    return {
      all: results.length,
      movie: results.filter(r => r.media_type === 'movie').length,
      tv: results.filter(r => r.media_type === 'tv').length,
      person: results.filter(r => r.media_type === 'person').length,
    };
  });

  ngOnInit(): void {
    this.titleService.setTitle('ReelScout — Stream Your Next Obsession');

    this.searchQuery$.pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      const q = this.query().trim();
      if (q.length >= 2) this.runSearch(q);
      if (q.length === 0) { this.searchResults.set([]); this.hasSearched.set(false); this.showSuggestions.set(false); }
    });

    this.suggestQuery$.pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      if (q.length < 2) { this.suggestions.set([]); this.showSuggestions.set(false); return; }
      this.tmdb.searchMulti(q, 1).subscribe({
        next: (res) => {
          this.suggestions.set(res.results.slice(0, 6));
          this.showSuggestions.set(true);
        },
      });
    });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const q = params['q'];
      if (q) { this.query.set(q); this.runSearch(q); }
    });

    this.loadHero();
    this.loadSections();
  }

  ngOnDestroy(): void { clearInterval(this.heroInterval); }

  @HostListener('document:keydown', ['$event'])
  onKeyGlobal(e: KeyboardEvent): void {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'Escape') { this.closeTrailer(); this.showSuggestions.set(false); }
    if (e.key === 'ArrowRight') this.nextHero();
    if (e.key === 'ArrowLeft') this.prevHero();
    if (e.key === 't' || e.key === 'T') { if (!this.showTrailer()) this.openTrailer(); }
  }

  private loadHero(): void {
    this.tmdb.getTrending('all', 'week').subscribe({
      next: (res) => {
        this.heroItems.set(res.results.filter(m => m.backdrop_path && m.media_type !== 'person').slice(0, 8));
        this.heroLoading.set(false);
        this.startHeroCycle();
      },
      error: () => this.heroLoading.set(false),
    });
  }

  loadTrending(region: string): void {
    this.trendingRegion.set(region);
    this.trendingLoading.set(true);
    this.tmdb.getTrending('movie', 'day', region).subscribe({
      next: (res) => { this.trendingToday.set(res.results.slice(0, 10)); this.trendingLoading.set(false); },
      error: () => this.trendingLoading.set(false),
    });
  }

  private loadSections(): void {
    this.tmdb.getTrending('movie', 'day', 'US').subscribe({
      next: (res) => { this.trendingToday.set(res.results.slice(0, 10)); this.sectionsLoading.set(false); },
      error: () => this.sectionsLoading.set(false),
    });
    this.tmdb.getPopular('movie').subscribe({ next: (res) => this.popularMovies.set(res.results.slice(0, 10)) });
    this.tmdb.getTopRated('tv').subscribe({ next: (res) => this.topRatedTv.set(res.results.slice(0, 10)) });
    this.tmdb.getNowPlaying().subscribe({ next: (res) => this.nowPlaying.set(res.results.slice(0, 10)) });
    this.tmdb.getTrending('tv', 'week').subscribe({ next: (res) => this.newAndPopular.set(res.results.slice(0, 10).map(m => ({ ...m, media_type: 'tv' as const }))) });
    this.tmdb.discoverMedia('movie', { 'vote_average.gte': 7.5, 'vote_count.gte': 50, sort_by: 'vote_average.desc' }).subscribe({
      next: (res) => this.hiddenGems.set(res.results.slice(0, 10).map(m => ({ ...m, media_type: 'movie' as const }))),
    });
  }

  private startHeroCycle(): void {
    this.heroInterval = setInterval(() => {
      this.heroIndex.update(i => (i + 1) % this.heroItems().length);
    }, 6000);
  }

  heroImageUrl(path: string | null): string { return this.tmdb.imageUrl(path, 'original'); }

  toggleHeroWatchlist(): void {
    const h = this.currentHero();
    if (!h) return;
    this.watchlist.toggle(h);
  }

  openTrailer(): void {
    const hero = this.currentHero();
    if (!hero) return;
    const handle = (d: TmdbMovie | TmdbTv) => {
      const videos = d.videos?.results ?? [];
      const t = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official)
        ?? videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
        ?? videos.find(v => v.site === 'YouTube');
      if (t) { this.trailerKey.set(t.key); this.showTrailer.set(true); }
      else this.toast.show('No trailer available', 'info');
    };
    const err = () => this.toast.show('Failed to load trailer', 'error');
    if (hero.media_type === 'movie') this.tmdb.getMovieDetails(hero.id).subscribe({ next: handle, error: err });
    else this.tmdb.getTvDetails(hero.id).subscribe({ next: handle, error: err });
  }

  closeTrailer(): void { this.showTrailer.set(false); this.trailerKey.set(null); }

  navigateToHero(): void {
    const hero = this.currentHero();
    if (!hero) return;
    if (hero.media_type === 'movie') this.router.navigate(['/movie', hero.id]);
    else if (hero.media_type === 'tv') this.router.navigate(['/tv', hero.id]);
  }

  nextHero(): void { clearInterval(this.heroInterval); this.heroIndex.update(i => (i + 1) % this.heroItems().length); this.startHeroCycle(); }
  prevHero(): void { clearInterval(this.heroInterval); this.heroIndex.update(i => (i - 1 + this.heroItems().length) % this.heroItems().length); this.startHeroCycle(); }
  selectHero(i: number): void { this.heroIndex.set(i); clearInterval(this.heroInterval); this.startHeroCycle(); }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.searchQuery$.next();
    this.suggestQuery$.next(value.trim());
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') { this.showSuggestions.set(false); this.runSearch(this.query().trim()); }
    if (e.key === 'Escape') this.showSuggestions.set(false);
  }

  pickSuggestion(item: TmdbMedia): void {
    this.showSuggestions.set(false);
    if (item.media_type === 'movie') this.router.navigate(['/movie', item.id]);
    else if (item.media_type === 'tv') this.router.navigate(['/tv', item.id]);
    else if (item.media_type === 'person') this.router.navigate(['/person', item.id]);
  }

  private runSearch(q: string): void {
    if (!q) return;
    this.searchLoading.set(true);
    this.hasSearched.set(true);
    this.tmdb.searchMulti(q).subscribe({
      next: (res) => { this.searchResults.set(res.results); this.searchTotal.set(res.total_results); this.searchLoading.set(false); },
      error: () => { this.toast.show('Search failed. Try again.', 'error'); this.searchLoading.set(false); },
    });
  }

  clearSearch(): void { this.query.set(''); this.searchResults.set([]); this.hasSearched.set(false); this.showSuggestions.set(false); }

  suggestionTitle(item: TmdbMedia): string { return item.title ?? item.name ?? ''; }
  suggestionYear(item: TmdbMedia): string { const d = item.release_date ?? item.first_air_date ?? ''; return d ? d.slice(0, 4) : ''; }
  suggestionPoster(item: TmdbMedia): string { return this.tmdb.imageUrl(item.poster_path ?? item.profile_path ?? null, 'w185'); }

  get heroTitle(): string { const h = this.currentHero(); return h?.title ?? h?.name ?? ''; }
  get heroOverview(): string { const ov = this.currentHero()?.overview ?? ''; return ov.length > 200 ? ov.slice(0, 200) + '…' : ov; }
}
