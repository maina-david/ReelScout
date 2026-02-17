import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { EpisodeProgressService } from '../services/episode-progress.service';
import { RatingService } from '../services/rating.service';
import { WatchlistService } from '../services/watchlist.service';

@Component({
  selector: 'app-stats',
  imports: [RouterLink],
  templateUrl: './stats.html',
})
export class Stats {
  readonly watchlist = inject(WatchlistService);
  readonly progress = inject(EpisodeProgressService);
  readonly ratingService = inject(RatingService);

  constructor() {
    inject(Title).setTitle('My Stats | FlixSearch');
  }

  totalWatchlist = computed(() => this.watchlist.items().length);
  moviesInWatchlist = computed(() => this.watchlist.items().filter(m => m.media_type === 'movie').length);
  tvInWatchlist = computed(() => this.watchlist.items().filter(m => m.media_type === 'tv').length);
  wantToWatch = computed(() => this.watchlist.wantToWatch().length);
  watching = computed(() => this.watchlist.watching().length);
  watched = computed(() => this.watchlist.watched().length);

  episodesWatched = computed(() => this.progress.watchedSignal().size);
  showsTracked = computed(() => {
    const keys = [...this.progress.watchedSignal()];
    const ids = new Set(keys.map(k => k.split('-')[0]));
    return ids.size;
  });

  totalRated = computed(() => Object.keys(this.ratingService.ratings()).length);
  avgRating = computed(() => {
    const vals = Object.values(this.ratingService.ratings());
    if (!vals.length) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  });

  ratingDist = computed(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    Object.values(this.ratingService.ratings()).forEach(r => { if (dist[r] !== undefined) dist[r]++; });
    return [1, 2, 3, 4, 5].map(s => ({ stars: s, count: dist[s] }));
  });

  maxRatingCount = computed(() => Math.max(...this.ratingDist().map(d => d.count), 1));

  topGenres = computed(() => {
    const counts: Record<number, number> = {};
    this.watchlist.items().forEach(m => m.genre_ids.forEach(g => { counts[g] = (counts[g] ?? 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 8)
      .map(([id, count]) => ({ id: Number(id), count }));
  });

  genreNames: Record<number, string> = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
    99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
    27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
    10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
    10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
  };

  genreName(id: number): string {
    return this.genreNames[id] ?? `Genre ${id}`;
  }
}
