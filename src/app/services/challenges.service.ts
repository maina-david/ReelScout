import { computed, inject, Injectable } from '@angular/core';
import { EpisodeProgressService } from './episode-progress.service';
import { RatingService } from './rating.service';
import { WatchlistService } from './watchlist.service';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChallengesService {
  private watchlist = inject(WatchlistService);
  private ratings = inject(RatingService);
  private progress = inject(EpisodeProgressService);

  challenges = computed((): Challenge[] => {
    const watchedMovies = this.watchlist.watched().filter(m => m.media_type === 'movie').length;
    const totalItems = this.watchlist.items().length;
    const totalRated = Object.keys(this.ratings.ratings()).length;
    const showsTracked = new Set(
      [...this.progress.watchedSignal()].map(k => k.split('-')[0])
    ).size;

    return [
      {
        id: 'watch_5_movies',
        title: 'Movie Marathon',
        description: 'Mark 5 movies as watched',
        target: 5,
        progress: Math.min(watchedMovies, 5),
        completed: watchedMovies >= 5,
      },
      {
        id: 'rate_10',
        title: 'Critic\'s Eye',
        description: 'Rate 10 movies or shows',
        target: 10,
        progress: Math.min(totalRated, 10),
        completed: totalRated >= 10,
      },
      {
        id: 'track_3_shows',
        title: 'Series Tracker',
        description: 'Track episodes in 3 different TV shows',
        target: 3,
        progress: Math.min(showsTracked, 3),
        completed: showsTracked >= 3,
      },
      {
        id: 'add_20',
        title: 'Collector',
        description: 'Add 20 titles to your watchlist',
        target: 20,
        progress: Math.min(totalItems, 20),
        completed: totalItems >= 20,
      },
    ];
  });

  completedCount = computed(() => this.challenges().filter(c => c.completed).length);
}
