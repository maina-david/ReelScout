import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TmdbMedia } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';
import { MediaCard } from '../media-card/media-card';

type TvTab = 'popular' | 'on_air' | 'airing_today' | 'top_rated';

@Component({
  selector: 'app-tv-shows',
  imports: [MediaCard],
  templateUrl: './tv-shows.html',
})
export class TvShows implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('sentinel') sentinelRef!: ElementRef;

  private tmdb = inject(TmdbService);
  private titleService = inject(Title);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private observer?: IntersectionObserver;

  tabs: { id: TvTab; label: string }[] = [
    { id: 'popular', label: 'Popular' },
    { id: 'on_air', label: 'On The Air' },
    { id: 'airing_today', label: 'Airing Today' },
    { id: 'top_rated', label: 'Top Rated' },
  ];

  activeTab = signal<TvTab>('popular');
  shows = signal<TmdbMedia[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  totalResults = signal(0);
  currentPage = signal(1);
  private hasMore_ = computed(() => this.shows().length < this.totalResults());

  ngOnInit(): void {
    this.titleService.setTitle('TV Shows | FlixSearch');
    this.route.queryParams.subscribe(params => {
      const tab = (params['tab'] as TvTab) ?? 'popular';
      this.activeTab.set(tab);
      this.fetchPage(tab, 1, true);
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && this.hasMore_() && !this.loadingMore() && !this.loading()) {
        this.loadMore();
      }
    }, { threshold: 0.1 });
    this.observer.observe(this.sentinelRef.nativeElement);
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }

  selectTab(tab: TvTab): void {
    this.router.navigate(['/tv-shows'], { queryParams: { tab } });
  }

  private fetchPage(tab: TvTab, page: number, reset: boolean): void {
    if (reset) { this.loading.set(true); this.shows.set([]); this.currentPage.set(1); }
    else this.loadingMore.set(true);

    const req$ = tab === 'on_air' ? this.tmdb.getTvOnAir(page)
      : tab === 'airing_today' ? this.tmdb.getTvAiringToday(page)
      : tab === 'top_rated' ? this.tmdb.getTopRated('tv', page)
      : this.tmdb.getPopular('tv', page);

    req$.subscribe({
      next: (res) => {
        const items = res.results.map(m => ({ ...m, media_type: 'tv' as const }));
        this.shows.update(prev => reset ? items : [...prev, ...items]);
        this.totalResults.set(res.total_results);
        this.currentPage.set(page);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadingMore.set(false);
        this.toast.show('Failed to load TV shows.', 'error');
      },
    });
  }

  private loadMore(): void {
    this.fetchPage(this.activeTab(), this.currentPage() + 1, false);
  }
}
