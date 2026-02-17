import { computed, inject, Injectable, signal } from '@angular/core';
import { TmdbMedia, WatchlistItem } from '../models/tmdb.model';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly KEY = 'flixsearch_watchlist';
  private toast = inject(ToastService);

  private _items = signal<WatchlistItem[]>(this.load());
  items = this._items.asReadonly();

  wantToWatch = computed(() => this._items().filter(m => m.watchlistCategory === 'want'));
  watching = computed(() => this._items().filter(m => m.watchlistCategory === 'watching'));
  watched = computed(() => this._items().filter(m => m.watchlistCategory === 'watched'));

  isInWatchlist(id: number) {
    return computed(() => this._items().some(m => m.id === id));
  }

  getCategory(id: number): WatchlistItem['watchlistCategory'] | null {
    return this._items().find(m => m.id === id)?.watchlistCategory ?? null;
  }

  toggle(media: TmdbMedia, category: WatchlistItem['watchlistCategory'] = 'want'): void {
    const current = this._items();
    const exists = current.some(m => m.id === media.id);
    const title = (media as TmdbMedia & { title?: string; name?: string }).title ?? (media as TmdbMedia & { title?: string; name?: string }).name ?? 'Item';
    const updated = exists
      ? current.filter(m => m.id !== media.id)
      : [{ ...media, watchlistCategory: category, addedAt: Date.now() }, ...current];
    this._items.set(updated);
    this.persist(updated);
    this.toast.show(exists ? `Removed "${title}" from watchlist` : `Added "${title}" to watchlist`, exists ? 'info' : 'success');
  }

  moveToCategory(id: number, category: WatchlistItem['watchlistCategory']): void {
    const updated = this._items().map(m => m.id === id ? { ...m, watchlistCategory: category } : m);
    this._items.set(updated);
    this.persist(updated);
  }

  remove(id: number): void {
    const updated = this._items().filter(m => m.id !== id);
    this._items.set(updated);
    this.persist(updated);
  }

  private persist(items: WatchlistItem[]): void {
    try { localStorage.setItem(this.KEY, JSON.stringify(items)); } catch {}
  }

  private load(): WatchlistItem[] {
    try {
      const raw = JSON.parse(localStorage.getItem(this.KEY) ?? '[]') as (TmdbMedia & Partial<WatchlistItem>)[];
      return raw.map(m => ({ ...m, watchlistCategory: m.watchlistCategory ?? 'want', addedAt: m.addedAt ?? Date.now() }));
    } catch { return []; }
  }
}
