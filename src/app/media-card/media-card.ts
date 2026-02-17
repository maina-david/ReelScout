import { Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TmdbMedia } from '../models/tmdb.model';
import { NotInterestedService } from '../services/not-interested.service';
import { RatingService } from '../services/rating.service';
import { TmdbService } from '../services/tmdb.service';
import { WatchlistService } from '../services/watchlist.service';

@Component({
  selector: 'app-media-card',
  templateUrl: './media-card.html',
})
export class MediaCard {
  media = input.required<TmdbMedia>();
  dismissible = input<boolean>(false);

  private router = inject(Router);
  private tmdb = inject(TmdbService);
  private watchlist = inject(WatchlistService);
  readonly ratingService = inject(RatingService);
  readonly notInterested = inject(NotInterestedService);
  private el = inject(ElementRef<HTMLElement>);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.previewTimer);
      clearTimeout(this.hideTimer);
      window.removeEventListener('scroll', this.onScroll, true);
    });
  }

  inWatchlist = computed(() => this.watchlist.isInWatchlist(this.media().id)());
  hoverRating = signal(0);
  showPreview = signal(false);
  previewTop = signal(0);
  previewLeft = signal(0);
  private previewTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private readonly onScroll = () => {
    clearTimeout(this.previewTimer);
    clearTimeout(this.hideTimer);
    this.showPreview.set(false);
    window.removeEventListener('scroll', this.onScroll, true);
  };

  get posterUrl(): string {
    return this.tmdb.imageUrl(this.media().poster_path, 'w500');
  }

  get backdropUrl(): string {
    return this.tmdb.imageUrl(this.media().backdrop_path, 'w500');
  }

  get displayTitle(): string {
    return this.media().title ?? this.media().name ?? '';
  }

  get displayYear(): string {
    const d = this.media().release_date ?? this.media().first_air_date ?? '';
    return d ? d.slice(0, 4) : '';
  }

  get ratingColor(): string {
    const r = this.media().vote_average;
    if (r >= 7) return 'text-green-400';
    if (r >= 5) return 'text-yellow-400';
    return 'text-gray-400';
  }

  get typeBadge(): string {
    const t = this.media().media_type;
    if (t === 'movie') return 'MOVIE';
    if (t === 'tv') return 'TV';
    return 'PERSON';
  }

  navigate(): void {
    const m = this.media();
    if (m.media_type === 'movie') this.router.navigate(['/movie', m.id]);
    else if (m.media_type === 'tv') this.router.navigate(['/tv', m.id]);
    else if (m.media_type === 'person') this.router.navigate(['/person', m.id]);
  }

  toggleWatchlist(event: Event): void {
    event.stopPropagation();
    this.watchlist.toggle(this.media());
  }

  dismiss(event: Event): void {
    event.stopPropagation();
    this.notInterested.hide(this.media().id);
  }

  rate(event: Event, stars: number): void {
    event.stopPropagation();
    const id = this.media().id;
    if (this.ratingService.getRating(id) === stars) {
      this.ratingService.clearRating(id);
    } else {
      this.ratingService.setRating(id, stars);
    }
  }

  onCardMouseEnter(): void {
    if (this.media().media_type === 'person' || !this.media().overview) return;
    clearTimeout(this.hideTimer);
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => {
      const rect = this.el.nativeElement.getBoundingClientRect();
      const previewW = 288;
      const previewH = 380;
      let left = rect.right + 8;
      if (left + previewW > window.innerWidth - 8) left = rect.left - previewW - 8;
      let top = rect.top;
      if (top + previewH > window.innerHeight - 8) top = window.innerHeight - previewH - 8;
      if (top < 8) top = 8;
      this.previewLeft.set(Math.round(left));
      this.previewTop.set(Math.round(top));
      this.showPreview.set(true);
      window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
    }, 600);
  }

  onCardMouseLeave(): void {
    clearTimeout(this.previewTimer);
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.showPreview.set(false);
      window.removeEventListener('scroll', this.onScroll, true);
    }, 200);
  }

  onPreviewMouseEnter(): void {
    clearTimeout(this.hideTimer);
  }

  onPreviewMouseLeave(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.showPreview.set(false);
      window.removeEventListener('scroll', this.onScroll, true);
    }, 200);
  }
}
