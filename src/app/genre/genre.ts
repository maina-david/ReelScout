import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MediaCard } from '../media-card/media-card';
import { DiscoverParams, TmdbGenre, TmdbMedia } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';

type MediaFilter = 'movie' | 'tv';

@Component({
  selector: 'app-genre',
  imports: [MediaCard, FormsModule],
  templateUrl: './genre.html',
})
export class GenrePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sentinel') sentinelRef!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tmdb = inject(TmdbService);
  private titleService = inject(Title);
  private toast = inject(ToastService);

  private observer?: IntersectionObserver;

  genres = signal<TmdbGenre[]>([]);
  activeGenre = signal<TmdbGenre | null>(null);
  mediaFilter = signal<MediaFilter>('movie');

  sortBy = signal('popularity.desc');
  yearFilter = signal('');
  minRating = signal(0);

  movies = signal<TmdbMedia[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  totalResults = signal(0);
  currentPage = signal(1);
  hasMore = computed(() => this.movies().length < this.totalResults());

  sortOptions = [
    { value: 'popularity.desc', label: 'Most Popular' },
    { value: 'vote_average.desc', label: 'Highest Rated' },
    { value: 'release_date.desc', label: 'Newest First' },
    { value: 'release_date.asc', label: 'Oldest First' },
    { value: 'revenue.desc', label: 'Highest Revenue' },
  ];

  ngOnInit(): void {
    forkJoin({
      movie: this.tmdb.getGenres('movie'),
      tv: this.tmdb.getGenres('tv'),
    }).subscribe({
      next: ({ movie, tv }) => {
        const combined = [...movie.genres];
        tv.genres.forEach(g => { if (!combined.some(m => m.id === g.id)) combined.push(g); });
        combined.sort((a, b) => a.name.localeCompare(b.name));
        this.genres.set(combined);

        this.route.queryParams.subscribe(params => {
          const genreId = params['g'] ? Number(params['g']) : null;
          const filter = (params['f'] as MediaFilter) ?? 'movie';
          this.mediaFilter.set(filter);
          const match = genreId ? combined.find(g => g.id === genreId) ?? combined[0] : combined[0];
          this.activeGenre.set(match);
          this.titleService.setTitle(`${match.name} | FlixSearch`);
          this.fetchPage(match.id, filter, 1, true);
        });
      },
      error: () => this.toast.show('Failed to load genres.', 'error'),
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && this.hasMore() && !this.loadingMore() && !this.loading()) {
          this.loadMore();
        }
      },
      { threshold: 0.1 }
    );
    this.observer.observe(this.sentinelRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  selectGenre(genre: TmdbGenre): void {
    this.router.navigate(['/genre'], { queryParams: { g: genre.id, f: this.mediaFilter() } });
  }

  setFilter(filter: MediaFilter): void {
    const g = this.activeGenre();
    if (!g) return;
    this.router.navigate(['/genre'], { queryParams: { g: g.id, f: filter } });
  }

  applyFilters(): void {
    const g = this.activeGenre();
    if (!g) return;
    this.fetchPage(g.id, this.mediaFilter(), 1, true);
  }

  private fetchPage(genreId: number, filter: MediaFilter, page: number, reset: boolean): void {
    if (reset) { this.loading.set(true); this.movies.set([]); this.currentPage.set(1); }
    else this.loadingMore.set(true);

    const year = parseInt(this.yearFilter(), 10);
    const params: DiscoverParams = {
      with_genres: genreId,
      page,
      sort_by: this.sortBy(),
    };
    if (!isNaN(year) && year > 1900) {
      if (filter === 'movie') params['primary_release_year'] = year;
      else params['first_air_date_year'] = year;
    }
    if (this.minRating() > 0) {
      params['vote_average.gte'] = this.minRating();
      params['vote_count.gte'] = 50;
    }

    this.tmdb.discoverMedia(filter, params).subscribe({
      next: (res) => {
        const items = res.results.map(m => ({ ...m, media_type: filter as 'movie' | 'tv' }));
        this.movies.update(prev => reset ? items : [...prev, ...items]);
        this.totalResults.set(res.total_results);
        this.currentPage.set(page);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
        this.toast.show('Failed to load titles.', 'error');
      },
    });
  }

  private loadMore(): void {
    const g = this.activeGenre();
    if (!g) return;
    this.fetchPage(g.id, this.mediaFilter(), this.currentPage() + 1, false);
  }
}
