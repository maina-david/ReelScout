import { Component, computed, ElementRef, inject, input, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TmdbMedia } from '../models/tmdb.model';
import { MediaCard } from '../media-card/media-card';
import { NotInterestedService } from '../services/not-interested.service';

@Component({
  selector: 'app-media-shelf',
  imports: [MediaCard, RouterLink],
  templateUrl: './media-shelf.html',
})
export class MediaShelf {
  title = input.required<string>();
  items = input.required<TmdbMedia[]>();
  viewAllLink = input<string | null>(null);
  ranked = input<boolean>(false);
  dismissible = input<boolean>(false);

  @ViewChild('scrollRef') scrollRef!: ElementRef<HTMLDivElement>;

  private notInterested = inject(NotInterestedService);

  visibleItems = computed(() => {
    const hidden = this.notInterested.hiddenSignal();
    return this.items().filter(m => !hidden.has(m.id));
  });

  scroll(dir: 'left' | 'right'): void {
    const el = this.scrollRef?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: dir === 'right' ? el.clientWidth * 0.8 : -el.clientWidth * 0.8, behavior: 'smooth' });
  }
}
