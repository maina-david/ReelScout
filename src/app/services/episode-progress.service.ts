import { computed, Injectable, signal } from '@angular/core';
import { TmdbSeason } from '../models/tmdb.model';

@Injectable({ providedIn: 'root' })
export class EpisodeProgressService {
  private readonly KEY = 'ReelScout_progress';
  private _watched = signal<Set<string>>(this.load());

  isWatched(tvId: number, season: number, episode: number): boolean {
    return this._watched().has(this.key(tvId, season, episode));
  }

  watchedCount(tvId: number, season: TmdbSeason): number {
    return season.episodes.filter(ep => this.isWatched(tvId, season.season_number, ep.episode_number)).length;
  }

  seasonProgress(tvId: number, season: TmdbSeason): number {
    if (!season.episodes.length) return 0;
    return Math.round((this.watchedCount(tvId, season) / season.episodes.length) * 100);
  }

  toggle(tvId: number, season: number, episode: number): void {
    const k = this.key(tvId, season, episode);
    const next = new Set(this._watched());
    next.has(k) ? next.delete(k) : next.add(k);
    this._watched.set(next);
    try { localStorage.setItem(this.KEY, JSON.stringify([...next])); } catch { }
  }

  markSeasonWatched(tvId: number, season: TmdbSeason): void {
    const next = new Set(this._watched());
    season.episodes.forEach(ep => next.add(this.key(tvId, season.season_number, ep.episode_number)));
    this._watched.set(next);
    try { localStorage.setItem(this.KEY, JSON.stringify([...next])); } catch { }
  }

  watchedSignal = computed(() => this._watched());

  hasAnyProgress(tvId: number): boolean {
    return [...this._watched()].some(k => k.startsWith(`${tvId}-`));
  }

  private key(tvId: number, s: number, e: number): string {
    return `${tvId}-${s}-${e}`;
  }

  private load(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(this.KEY) ?? '[]')); } catch { return new Set(); }
  }
}
