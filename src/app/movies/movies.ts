import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TmdbMedia } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';
import { MediaCard } from '../media-card/media-card';

type MovieTab = 'popular' | 'now_playing' | 'upcoming' | 'top_rated';

@Component({
  selector: 'app-movies',
  imports: [MediaCard],
  templateUrl: './movies.html',
})
export class Movies implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sentinel') sentinelRef!: ElementRef;

  private tmdb = inject(TmdbService);
  private titleService = inject(Title);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private observer?: IntersectionObserver;

  tabs: { id: MovieTab; label: string }[] = [
    { id: 'popular', label: 'Popular' },
    { id: 'now_playing', label: 'Now Playing' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'top_rated', label: 'Top Rated' },
  ];

  activeTab = signal<MovieTab>('popular');
  movies = signal<TmdbMedia[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  totalResults = signal(0);
  currentPage = signal(1);
  hasMore = computed(() => this.movies().length < this.totalResults());

  ngOnInit(): void {
    this.titleService.setTitle('Movies | ReelScout');
    this.route.queryParams.subscribe(params => {
      const tab = (params['tab'] as MovieTab) ?? 'popular';
      this.activeTab.set(tab);
      this.fetchPage(tab, 1, true);
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && this.hasMore() && !this.loadingMore() && !this.loading()) {
        this.loadMore();
      }
    }, { threshold: 0.1 });
    this.observer.observe(this.sentinelRef.nativeElement);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }

  selectTab(tab: MovieTab): void {
    this.router.navigate(['/movies'], { queryParams: { tab } });
  }

  private fetchPage(tab: MovieTab, page: number, reset: boolean): void {
    if (reset) { this.loading.set(true); this.movies.set([]); this.currentPage.set(1); }
    else this.loadingMore.set(true);

    const req$ = tab === 'now_playing' ? this.tmdb.getNowPlaying(page)
      : tab === 'upcoming' ? this.tmdb.getUpcoming(page)
        : tab === 'top_rated' ? this.tmdb.getTopRated('movie', page)
          : this.tmdb.getPopular('movie', page);

    req$.subscribe({
      next: (res) => {
        const items = res.results.map(m => ({ ...m, media_type: 'movie' as const }));
        this.movies.update(prev => reset ? items : [...prev, ...items]);
        this.totalResults.set(res.total_results);
        this.currentPage.set(page);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
        this.toast.show('Failed to load movies.', 'error');
      },
    });
  }

  private loadMore(): void {
    this.fetchPage(this.activeTab(), this.currentPage() + 1, false);
  }
}
