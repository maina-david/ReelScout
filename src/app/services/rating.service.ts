import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RatingService {
  private readonly KEY = 'flixsearch_ratings';
  private _ratings = signal<Record<number, number>>(this.load());
  ratings = this._ratings.asReadonly();

  getRating(id: number): number {
    return this._ratings()[id] ?? 0;
  }

  setRating(id: number, stars: number): void {
    const updated = { ...this._ratings(), [id]: stars };
    this._ratings.set(updated);
    try { localStorage.setItem(this.KEY, JSON.stringify(updated)); } catch {}
  }

  clearRating(id: number): void {
    const updated = { ...this._ratings() };
    delete updated[id];
    this._ratings.set(updated);
    try { localStorage.setItem(this.KEY, JSON.stringify(updated)); } catch {}
  }

  private load(): Record<number, number> {
    try { return JSON.parse(localStorage.getItem(this.KEY) ?? '{}'); } catch { return {}; }
  }
}
