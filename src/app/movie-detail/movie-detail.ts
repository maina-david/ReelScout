import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MediaCard } from '../media-card/media-card';
import { MediaShelf } from '../media-shelf/media-shelf';
import { TmdbCastMember, TmdbImageFile, TmdbKeyword, TmdbMedia, TmdbMovie, TmdbReview, TmdbVideo, WatchProvider } from '../models/tmdb.model';
import { RecentlyViewedService } from '../services/recently-viewed.service';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';
import { WatchlistService } from '../services/watchlist.service';

@Component({
  selector: 'app-movie-detail',
  imports: [RouterLink, MediaCard, MediaShelf, SlicePipe],
  templateUrl: './movie-detail.html',
})
export class MovieDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly tmdb = inject(TmdbService);
  private titleService = inject(Title);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  readonly watchlist = inject(WatchlistService);
  private recentlyViewed = inject(RecentlyViewedService);

  movie = signal<TmdbMovie | null>(null);
  loading = signal(true);
  error = signal('');
  watchProviders = signal<WatchProvider[]>([]);

  trailerKey = signal<string | null>(null);
  showTrailer = signal(false);
  selectedTrailerIndex = signal(0);
  showMoreModal = signal(false);

  inWatchlist = computed(() => {
    const m = this.movie();
    if (!m) return false;
    return this.watchlist.isInWatchlist(m.id)();
  });

  safeTrailerUrl = computed((): SafeResourceUrl | null => {
    const key = this.trailerKey();
    if (!key) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${key}?autoplay=1`
    );
  });

  recommendations = computed((): TmdbMedia[] => {
    return (this.movie()?.recommendations?.results ?? []).slice(0, 12).map(r => ({
      ...r,
      media_type: r.media_type ?? 'movie',
    }));
  });

  keywords = computed((): TmdbKeyword[] => this.movie()?.keywords?.keywords ?? []);

  reviews = computed((): TmdbReview[] => (this.movie()?.reviews?.results ?? []).slice(0, 5));

  certification = computed((): string => {
    const us = this.movie()?.release_dates?.results?.find(r => r.iso_3166_1 === 'US');
    return us?.release_dates?.find(d => d.certification)?.certification ?? '';
  });

  galleryImages = computed((): TmdbImageFile[] => (this.movie()?.images?.backdrops ?? []).slice(0, 20));

  showGallery = signal(false);
  selectedGalleryIndex = signal(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || isNaN(Number(id))) { this.router.navigate(['/']); return; }
    this.tmdb.getMovieDetails(Number(id)).subscribe({
      next: (res) => {
        this.movie.set(res);
        this.titleService.setTitle(`${res.title} | ReelScout`);
        this.loading.set(false);
        this.recentlyViewed.add({
          id: res.id, title: res.title, poster_path: res.poster_path,
          backdrop_path: res.backdrop_path, media_type: 'movie',
          vote_average: res.vote_average, release_date: res.release_date,
          genre_ids: res.genres.map(g => g.id),
        });
      },
      error: () => {
        this.error.set('Failed to load movie details.');
        this.toast.show('Failed to load movie details.', 'error');
        this.loading.set(false);
      },
    });
    const numId = Number(id);
    this.tmdb.getWatchProviders('movie', numId).subscribe({
      next: (res) => {
        const region = res.results['US'] ?? res.results[Object.keys(res.results)[0]];
        this.watchProviders.set(region?.flatrate ?? []);
      },
    });
  }

  providerLogoUrl(logoPath: string): string {
    return this.tmdb.imageUrl(logoPath, 'w185');
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === 'Escape') { this.closeTrailer(); this.showMoreModal.set(false); this.showGallery.set(false); }
    if ((e.key === 't' || e.key === 'T') && !this.showTrailer()) this.openTrailer();
    if (e.key === 'ArrowRight' && this.showGallery()) this.galleryNext();
    if (e.key === 'ArrowLeft' && this.showGallery()) this.galleryPrev();
  }

  openGallery(index = 0): void {
    this.selectedGalleryIndex.set(index);
    this.showGallery.set(true);
  }

  galleryNext(): void {
    this.selectedGalleryIndex.update(i => Math.min(i + 1, this.galleryImages().length - 1));
  }

  galleryPrev(): void {
    this.selectedGalleryIndex.update(i => Math.max(i - 1, 0));
  }

  galleryImageUrl(path: string): string {
    return this.tmdb.imageUrl(path, 'original');
  }

  posterUrl(size: 'w500' | 'w780' = 'w500'): string {
    return this.tmdb.imageUrl(this.movie()?.poster_path ?? null, size);
  }

  backdropUrl(): string {
    return this.tmdb.imageUrl(this.movie()?.backdrop_path ?? null, 'original');
  }

  profileUrl(path: string | null): string {
    return this.tmdb.imageUrl(path, 'w185');
  }

  get directors(): string {
    return (this.movie()?.credits.crew ?? [])
      .filter(c => c.job === 'Director')
      .map(c => c.name)
      .join(', ') || 'N/A';
  }

  get cast(): TmdbCastMember[] {
    return (this.movie()?.credits.cast ?? []).slice(0, 12);
  }

  get allTrailers(): TmdbVideo[] {
    return (this.movie()?.videos?.results ?? []).filter(v => v.site === 'YouTube');
  }

  get trailer(): TmdbVideo | null {
    const videos = this.allTrailers;
    if (!videos.length) return null;
    return videos[this.selectedTrailerIndex()] ?? videos[0];
  }

  openTrailer(): void {
    const t = this.trailer;
    if (t) { this.trailerKey.set(t.key); this.showTrailer.set(true); }
    else this.toast.show('No trailer available', 'info');
  }

  selectTrailer(index: number): void {
    this.selectedTrailerIndex.set(index);
    const videos = this.allTrailers;
    const t = videos[index];
    if (t) { this.trailerKey.set(t.key); this.showTrailer.set(true); }
  }

  closeTrailer(): void {
    this.showTrailer.set(false);
    this.trailerKey.set(null);
  }

  toggleWatchlist(): void {
    const m = this.movie();
    if (!m) return;
    this.watchlist.toggle({
      id: m.id, title: m.title, poster_path: m.poster_path, backdrop_path: m.backdrop_path,
      media_type: 'movie', vote_average: m.vote_average, release_date: m.release_date,
      genre_ids: m.genres.map(g => g.id), overview: m.overview,
    });
  }

  share(): void {
    const m = this.movie();
    if (!m) return;
    if (navigator.share) {
      navigator.share({ title: m.title, text: m.overview, url: window.location.href }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.toast.show('Link copied to clipboard', 'info');
      });
    }
  }

  formatMoney(n: number): string {
    if (!n) return 'N/A';
    return '$' + n.toLocaleString();
  }

  formatRuntime(min: number | null): string {
    if (!min) return 'N/A';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
