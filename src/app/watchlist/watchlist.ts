import { Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MediaCard } from '../media-card/media-card';
import { WatchlistItem } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';
import { WatchlistService } from '../services/watchlist.service';

type WatchlistTab = 'all' | 'want' | 'watching' | 'watched';
type SortOption = 'addedAt' | 'title' | 'rating';

@Component({
  selector: 'app-watchlist',
  imports: [MediaCard, RouterLink, FormsModule],
  templateUrl: './watchlist.html',
})
export class Watchlist {
  readonly watchlist = inject(WatchlistService);
  private titleService = inject(Title);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly tmdb = inject(TmdbService);

  activeTab = signal<WatchlistTab>('all');
  sortBy = signal<SortOption>('addedAt');
  pickedItem = signal<WatchlistItem | null>(null);
  editingNotesId = signal<number | null>(null);
  notesValue = signal('');

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

  tonightPick = computed((): WatchlistItem | null => {
    const want = this.watchlist.wantToWatch().filter(m => m.media_type === 'movie');
    return want[0] ?? null;
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

  pickForMe(): void {
    const pool = this.watchlist.wantToWatch();
    if (!pool.length) { this.toast.show('No items in Want to Watch', 'info'); return; }
    this.pickedItem.set(pool[Math.floor(Math.random() * pool.length)]);
  }

  pickAgain(): void {
    this.pickForMe();
  }

  closePick(): void {
    this.pickedItem.set(null);
  }

  viewPicked(): void {
    const item = this.pickedItem();
    if (!item) return;
    this.closePick();
    this.router.navigate([item.media_type === 'movie' ? '/movie' : '/tv', item.id]);
  }

  exportWatchlist(): void {
    const items = this.watchlist.items();
    if (!items.length) { this.toast.show('Nothing to export', 'info'); return; }
    const lines = items.map(m => {
      const title = m.title ?? m.name ?? 'Unknown';
      const year = (m.release_date ?? m.first_air_date ?? '').slice(0, 4);
      const cat = m.watchlistCategory === 'want' ? 'Want to Watch' : m.watchlistCategory === 'watching' ? 'Watching' : 'Watched';
      return `${title}${year ? ` (${year})` : ''} — ${cat}`;
    });
    navigator.clipboard.writeText(lines.join('\n')).then(
      () => this.toast.show('Watchlist copied to clipboard', 'success'),
      () => this.toast.show('Could not copy to clipboard', 'error')
    );
  }

  startEditNotes(item: WatchlistItem): void {
    this.editingNotesId.set(item.id);
    this.notesValue.set(item.notes ?? '');
  }

  saveNotes(id: number): void {
    this.watchlist.updateNotes(id, this.notesValue());
    this.editingNotesId.set(null);
  }

  posterUrl(item: WatchlistItem): string {
    return this.tmdb.imageUrl(item.poster_path, 'w185');
  }

  constructor() {
    this.titleService.setTitle('My Watchlist | ReelScout');
  }
}
