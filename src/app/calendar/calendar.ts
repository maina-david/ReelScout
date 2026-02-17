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
    inject(Title).setTitle('Release Calendar | ReelScout');
  }

  loading = signal(true);
  tab = signal<'movie' | 'tv'>('movie');
  viewMode = signal<'calendar' | 'list'>('calendar');
  releases = signal<TmdbMedia[]>([]);

  readonly today = new Date();
  viewDate = signal(new Date(this.today.getFullYear(), this.today.getMonth(), 1));

  monthLabel = computed(() => {
    const d = this.viewDate();
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  });

  isCurrentViewMonth = computed(() => {
    const v = this.viewDate();
    return v.getFullYear() === this.today.getFullYear() && v.getMonth() === this.today.getMonth();
  });

  weeks = computed((): CalendarDay[][] => {
    const todayStr = this.toDateStr(this.today);
    const v = this.viewDate();
    const year = v.getFullYear();
    const month = v.getMonth();

    const byDate: Record<string, TmdbMedia[]> = {};
    this.releases().forEach(m => {
      const d = m.release_date ?? m.first_air_date ?? '';
      if (d) { if (!byDate[d]) byDate[d] = []; byDate[d].push(m); }
    });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: CalendarDay[] = [];

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
    const v = this.viewDate();
    const monthStart = this.monthStartStr(v);
    const monthEnd = this.monthEndStr(v);
    const cutoff = monthStart > todayStr ? monthStart : todayStr;

    return this.releases()
      .filter(m => {
        const d = m.release_date ?? m.first_air_date ?? '';
        return d >= cutoff && d <= monthEnd;
      })
      .sort((a, b) => {
        const da = a.release_date ?? a.first_air_date ?? '';
        const db = b.release_date ?? b.first_air_date ?? '';
        return da.localeCompare(db);
      })
      .slice(0, 20);
  });

  listItems = computed((): TmdbMedia[] => {
    return [...this.releases()].sort((a, b) => {
      const da = a.release_date ?? a.first_air_date ?? '';
      const db = b.release_date ?? b.first_air_date ?? '';
      return da.localeCompare(db);
    });
  });

  ngOnInit(): void {
    this.loadReleases('movie');
  }

  switchTab(t: 'movie' | 'tv'): void {
    this.tab.set(t);
    this.loadReleases(t);
  }

  prevMonth(): void {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() - 1, 1));
    this.loadReleases(this.tab());
  }

  nextMonth(): void {
    const v = this.viewDate();
    this.viewDate.set(new Date(v.getFullYear(), v.getMonth() + 1, 1));
    this.loadReleases(this.tab());
  }

  goToToday(): void {
    this.viewDate.set(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
    this.loadReleases(this.tab());
  }

  private loadReleases(type: 'movie' | 'tv'): void {
    this.loading.set(true);
    const v = this.viewDate();
    const gte = this.monthStartStr(v);
    const lte = this.monthEndStr(v);

    const params = type === 'movie'
      ? { 'primary_release_date.gte': gte, 'primary_release_date.lte': lte, sort_by: 'primary_release_date.asc', page: 1 }
      : { 'first_air_date.gte': gte, 'first_air_date.lte': lte, sort_by: 'first_air_date.asc', page: 1 };

    this.tmdb.discoverMedia(type, params).subscribe({
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

  private monthStartStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  private monthEndStr(d: Date): string {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  }

  dayLabel(date: Date): number {
    return date.getDate();
  }

  isCurrentMonth(date: Date): boolean {
    const v = this.viewDate();
    return date.getMonth() === v.getMonth() && date.getFullYear() === v.getFullYear();
  }

  monthAbbr(mm: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(mm, 10) - 1] ?? '';
  }
}
