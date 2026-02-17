import { Component, inject, signal, computed } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TmdbMedia } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { MediaCard } from '../media-card/media-card';

interface Mood {
  label: string;
  emoji: string;
  genres: number[];
}

type MediaType = 'movie' | 'tv';

const MOODS: Mood[] = [
  { label: 'Light & Fun', emoji: '😄', genres: [35, 16, 10751] },
  { label: 'Intense', emoji: '😤', genres: [53, 80, 9648] },
  { label: 'Emotional', emoji: '🥺', genres: [18, 10749, 10752] },
  { label: 'Horror', emoji: '😱', genres: [27, 9648] },
  { label: 'Action', emoji: '💥', genres: [28, 12, 878] },
];

@Component({
  selector: 'app-discover',
  imports: [MediaCard],
  templateUrl: './discover.html',
})
export class DiscoverPage {
  private tmdb = inject(TmdbService);

  constructor() {
    inject(Title).setTitle('Mood Discovery | ReelScout');
  }

  moods = MOODS;
  selectedMood = signal<Mood | null>(null);
  mediaType = signal<MediaType>('movie');
  results = signal<TmdbMedia[]>([]);
  loading = signal(false);
  hasSearched = signal(false);

  selectedMoodLabel = computed(() => this.selectedMood()?.label ?? null);

  selectMood(mood: Mood): void {
    if (this.selectedMood()?.label === mood.label) {
      this.selectedMood.set(null);
    } else {
      this.selectedMood.set(mood);
    }
  }

  setType(type: MediaType): void {
    this.mediaType.set(type);
  }

  discover(): void {
    const mood = this.selectedMood();
    if (!mood) return;
    this.loading.set(true);
    this.hasSearched.set(true);
    const type = this.mediaType();
    this.tmdb.discoverMedia(type, {
      with_genres: mood.genres[0],
      sort_by: 'popularity.desc',
      'vote_average.gte': 6,
      'vote_count.gte': 100,
    }).subscribe({
      next: (res) => {
        this.results.set(res.results.map(m => ({ ...m, media_type: type })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
