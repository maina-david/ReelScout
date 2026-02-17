import { Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MediaCard } from '../media-card/media-card';
import { WatchlistItem } from '../models/tmdb.model';
import { WatchlistService } from '../services/watchlist.service';

type WatchlistTab = 'all' | 'want' | 'watching' | 'watched';
type SortOption = 'addedAt' | 'title' | 'rating';

@Component({
  selector: 'app-watchlist',
  imports: [MediaCard, RouterLink],
  templateUrl: './watchlist.html',
})
export class Watchlist {
  readonly watchlist = inject(WatchlistService);
  private titleService = inject(Title);

  activeTab = signal<WatchlistTab>('all');
  sortBy = signal<SortOption>('addedAt');

  tabs: { id: WatchlistTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'want', label: 'Want to Watch' },
    { id: 'watching', label: 'Watching' },
    { id: 'watched', label: 'Watched' },
  ];

  sortOptions: { value: SortOption; label: string }[] = [
    { value: 'addedAt', label: 'Recently Added' },
    { value: 'title', label: 'Title A–Z' },
    { value: 'rating', label: 'Highest Rated' },
  ];

  filteredItems = computed((): WatchlistItem[] => {
    const tab = this.activeTab();
    const sort = this.sortBy();
    let items: WatchlistItem[];

    if (tab === 'all') items = [...this.watchlist.items()];
    else if (tab === 'want') items = [...this.watchlist.wantToWatch()];
    else if (tab === 'watching') items = [...this.watchlist.watching()];
    else items = [...this.watchlist.watched()];

    if (sort === 'addedAt') items.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    else if (sort === 'title') items.sort((a, b) => (a.title ?? a.name ?? '').localeCompare(b.title ?? b.name ?? ''));
    else if (sort === 'rating') items.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));

    return items;
  });

  tabCount(tab: WatchlistTab): number {
    if (tab === 'all') return this.watchlist.items().length;
    if (tab === 'want') return this.watchlist.wantToWatch().length;
    if (tab === 'watching') return this.watchlist.watching().length;
    return this.watchlist.watched().length;
  }

  moveToCategory(id: number, category: WatchlistItem['watchlistCategory']): void {
    this.watchlist.moveToCategory(id, category);
  }

  remove(id: number): void {
    this.watchlist.remove(id);
  }

  constructor() {
    this.titleService.setTitle('My Watchlist | ReelScout');
  }
}
