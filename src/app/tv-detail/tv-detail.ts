import { SlicePipe } from '@angular/common';
import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { MediaCard } from '../media-card/media-card';
import { MediaShelf } from '../media-shelf/media-shelf';
import { TmdbCastMember, TmdbImageFile, TmdbKeyword, TmdbMedia, TmdbReview, TmdbSeason, TmdbTv, TmdbVideo, WatchProvider } from '../models/tmdb.model';
import { EpisodeProgressService } from '../services/episode-progress.service';
import { RecentlyViewedService } from '../services/recently-viewed.service';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';
import { WatchlistService } from '../services/watchlist.service';

@Component({
  selector: 'app-tv-detail',
  imports: [RouterLink, SlicePipe, MediaCard, MediaShelf],
  templateUrl: './tv-detail.html',
})
export class TvDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly tmdb = inject(TmdbService);
  private titleService = inject(Title);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  readonly watchlist = inject(WatchlistService);
  readonly progress = inject(EpisodeProgressService);
  private recentlyViewed = inject(RecentlyViewedService);

  show = signal<TmdbTv | null>(null);
  loading = signal(true);
  error = signal('');
  watchProviders = signal<WatchProvider[]>([]);

  seasons = signal<TmdbSeason[]>([]);
  loadingSeasons = signal(false);
  selectedSeason = signal(0);
  selectedEpisodeId = signal<number | null>(null);

  trailerKey = signal<string | null>(null);
  showTrailer = signal(false);
  selectedTrailerIndex = signal(0);
  showMoreModal = signal(false);

  inWatchlist = computed(() => {
    const s = this.show();
    if (!s) return false;
    return this.watchlist.isInWatchlist(s.id)();
  });

  safeTrailerUrl = computed((): SafeResourceUrl | null => {
    const key = this.trailerKey();
    if (!key) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${key}?autoplay=1`
    );
  });

  recommendations = computed((): TmdbMedia[] => {
    return (this.show()?.recommendations?.results ?? []).slice(0, 12).map(r => ({
      ...r,
      media_type: r.media_type ?? 'tv',
    }));
  });

  nextAirInfo = computed(() => {
    const n = this.show()?.next_episode_to_air;
    if (!n?.air_date) return null;
    const days = Math.ceil((new Date(n.air_date).getTime() - Date.now()) / 86400000);
    return { ...n, days };
  });

  keywords = computed((): TmdbKeyword[] => this.show()?.keywords?.results ?? []);

  reviews = computed((): TmdbReview[] => (this.show()?.reviews?.results ?? []).slice(0, 5));

  contentRating = computed((): string => {
    const us = this.show()?.content_ratings?.results?.find(r => r.iso_3166_1 === 'US');
    return us?.rating ?? '';
  });

  galleryImages = computed((): TmdbImageFile[] => (this.show()?.images?.backdrops ?? []).slice(0, 20));

  showGallery = signal(false);
  selectedGalleryIndex = signal(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || isNaN(Number(id))) { this.router.navigate(['/']); return; }
    this.tmdb.getTvDetails(Number(id)).subscribe({
      next: (res) => {
        this.show.set(res);
        this.titleService.setTitle(`${res.name} | FlixSearch`);
        this.loading.set(false);
        this.loadSeasons(Number(id), res);
        this.recentlyViewed.add({
          id: res.id, name: res.name, poster_path: res.poster_path,
          backdrop_path: res.backdrop_path, media_type: 'tv',
          vote_average: res.vote_average, first_air_date: res.first_air_date,
          genre_ids: res.genres.map(g => g.id),
        });
      },
      error: () => {
        this.error.set('Failed to load show details.');
        this.toast.show('Failed to load show details.', 'error');
        this.loading.set(false);
      },
    });
    const numId = Number(id);
    this.tmdb.getWatchProviders('tv', numId).subscribe({
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

  private loadSeasons(tvId: number, show: TmdbTv): void {
    const realSeasons = show.seasons.filter(s => s.season_number > 0);
    if (!realSeasons.length) return;
    this.loadingSeasons.set(true);
    forkJoin(
      realSeasons.map(s =>
        this.tmdb.getTvSeason(tvId, s.season_number).pipe(catchError(() => of(null)))
      )
    ).subscribe({
      next: (results) => {
        this.seasons.set(results.filter((s): s is TmdbSeason => s !== null));
        this.loadingSeasons.set(false);
      },
      error: () => this.loadingSeasons.set(false),
    });
  }

  selectSeason(index: number): void {
    this.selectedSeason.set(index);
    this.selectedEpisodeId.set(null);
  }

  toggleEpisode(id: number): void {
    this.selectedEpisodeId.set(this.selectedEpisodeId() === id ? null : id);
  }

  posterUrl(): string {
    return this.tmdb.imageUrl(this.show()?.poster_path ?? null, 'w500');
  }

  backdropUrl(): string {
    return this.tmdb.imageUrl(this.show()?.backdrop_path ?? null, 'original');
  }

  profileUrl(path: string | null): string {
    return this.tmdb.imageUrl(path, 'w185');
  }

  stillUrl(path: string | null): string {
    return this.tmdb.imageUrl(path, 'w300');
  }

  get cast(): TmdbCastMember[] {
    return (this.show()?.credits.cast ?? []).slice(0, 12);
  }

  get allTrailers(): TmdbVideo[] {
    return (this.show()?.videos?.results ?? []).filter(v => v.site === 'YouTube');
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
    const t = this.allTrailers[index];
    if (t) { this.trailerKey.set(t.key); this.showTrailer.set(true); }
  }

  closeTrailer(): void {
    this.showTrailer.set(false);
    this.trailerKey.set(null);
  }

  toggleWatchlist(): void {
    const s = this.show();
    if (!s) return;
    this.watchlist.toggle({
      id: s.id, name: s.name, poster_path: s.poster_path, backdrop_path: s.backdrop_path,
      media_type: 'tv', vote_average: s.vote_average, first_air_date: s.first_air_date,
      genre_ids: s.genres.map(g => g.id), overview: s.overview,
    });
  }

  share(): void {
    const s = this.show();
    if (!s) return;
    if (navigator.share) {
      navigator.share({ title: s.name, text: s.overview, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.toast.show('Link copied to clipboard', 'info');
      });
    }
  }

  toggleEpisodeWatched(season: TmdbSeason, episodeNumber: number): void {
    const id = this.show()?.id;
    if (!id) return;
    this.progress.toggle(id, season.season_number, episodeNumber);
  }

  markSeasonWatched(season: TmdbSeason): void {
    const id = this.show()?.id;
    if (!id) return;
    this.progress.markSeasonWatched(id, season);
  }

  isEpisodeWatched(season: TmdbSeason, episodeNumber: number): boolean {
    const id = this.show()?.id;
    if (!id) return false;
    this.progress.watchedSignal();
    return this.progress.isWatched(id, season.season_number, episodeNumber);
  }

  seasonProgressPct(season: TmdbSeason): number {
    const id = this.show()?.id;
    if (!id) return 0;
    this.progress.watchedSignal();
    return this.progress.seasonProgress(id, season);
  }

  episodeRatingColor(r: number): string {
    if (r >= 8) return 'text-green-400';
    if (r >= 6) return 'text-yellow-400';
    return 'text-gray-500';
  }
}
