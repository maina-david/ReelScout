import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TmdbMedia } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
interface CalendarDay {
  date: Date;
  dateStr: string;
  isToday: boolean;
  items: TmdbMedia[];
}

@Component({
  selector: 'app-calendar',
  imports: [RouterLink],
  templateUrl: './calendar.html',
})
export class CalendarPage implements OnInit {
  private tmdb = inject(TmdbService);

  constructor() {
    inject(Title).setTitle('Release Calendar | FlixSearch');
  }

  loading = signal(true);
  tab = signal<'movie' | 'tv'>('movie');
  releases = signal<TmdbMedia[]>([]);

  readonly today = new Date();
  readonly monthLabel = this.today.toLocaleString('default', { month: 'long', year: 'numeric' });

  weeks = computed((): CalendarDay[][] => {
    const todayStr = this.toDateStr(this.today);
    const byDate: Record<string, TmdbMedia[]> = {};
    this.releases().forEach(m => {
      const d = m.release_date ?? m.first_air_date ?? '';
      if (d) { if (!byDate[d]) byDate[d] = []; byDate[d].push(m); }
    });

    const year = this.today.getFullYear();
    const month = this.today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];
    // Pad start to Monday
    const startPad = (firstDay.getDay() + 6) % 7;
    for (let i = startPad; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      days.push({ date: d, dateStr: this.toDateStr(d), isToday: false, items: byDate[this.toDateStr(d)] ?? [] });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const dateStr = this.toDateStr(date);
      days.push({ date, dateStr, isToday: dateStr === todayStr, items: byDate[dateStr] ?? [] });
    }
    // Pad end to full weeks
    const endPad = 7 - (days.length % 7);
    if (endPad < 7) {
      for (let i = 1; i <= endPad; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: d, dateStr: this.toDateStr(d), isToday: false, items: byDate[this.toDateStr(d)] ?? [] });
      }
    }

    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  });

  upcoming = computed((): TmdbMedia[] => {
    const todayStr = this.toDateStr(this.today);
    return this.releases()
      .filter(m => {
        const d = m.release_date ?? m.first_air_date ?? '';
        return d >= todayStr;
      })
      .sort((a, b) => {
        const da = a.release_date ?? a.first_air_date ?? '';
        const db = b.release_date ?? b.first_air_date ?? '';
        return da.localeCompare(db);
      })
      .slice(0, 20);
  });

  ngOnInit(): void {
    this.loadReleases('movie');
  }

  switchTab(t: 'movie' | 'tv'): void {
    this.tab.set(t);
    this.loadReleases(t);
  }

  private loadReleases(type: 'movie' | 'tv'): void {
    this.loading.set(true);
    const obs = type === 'movie'
      ? this.tmdb.getUpcoming()
      : this.tmdb.getTvOnAir();
    obs.subscribe({
      next: (res) => {
        this.releases.set(res.results.map(m => ({ ...m, media_type: type })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  dayLabel(date: Date): number {
    return date.getDate();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.today.getMonth() && date.getFullYear() === this.today.getFullYear();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  monthAbbr(mm: string): string {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(mm, 10) - 1] ?? '';
  }
}
