import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotInterestedService {
  private readonly KEY = 'flixsearch_not_interested';
  private _hidden = signal<Set<number>>(this.load());

  isHidden(id: number): boolean {
    return this._hidden().has(id);
  }

  hide(id: number): void {
    const next = new Set(this._hidden());
    next.add(id);
    this._hidden.set(next);
    try { localStorage.setItem(this.KEY, JSON.stringify([...next])); } catch {}
  }

  restore(id: number): void {
    const next = new Set(this._hidden());
    next.delete(id);
    this._hidden.set(next);
    try { localStorage.setItem(this.KEY, JSON.stringify([...next])); } catch {}
  }

  hiddenSignal = this._hidden.asReadonly();

  private load(): Set<number> {
    try { return new Set(JSON.parse(localStorage.getItem(this.KEY) ?? '[]')); } catch { return new Set(); }
  }
}
