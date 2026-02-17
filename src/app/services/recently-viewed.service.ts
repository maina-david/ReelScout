import { Injectable, signal } from '@angular/core';
import { TmdbMedia } from '../models/tmdb.model';

@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly KEY = 'flixsearch_recently_viewed';
  private readonly MAX = 12;

  items = signal<TmdbMedia[]>(this.load());

  private load(): TmdbMedia[] {
    try { return JSON.parse(localStorage.getItem(this.KEY) ?? '[]'); }
    catch { return []; }
  }

  add(media: TmdbMedia): void {
    const updated = [media, ...this.items().filter(m => m.id !== media.id)].slice(0, this.MAX);
    this.items.set(updated);
    localStorage.setItem(this.KEY, JSON.stringify(updated));
  }

  clear(): void {
    this.items.set([]);
    localStorage.removeItem(this.KEY);
  }
}
