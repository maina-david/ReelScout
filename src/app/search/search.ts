import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { MediaCard } from '../media-card/media-card';
import { TmdbMedia } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';

type SearchFilter = 'all' | 'movie' | 'tv' | 'person';

@Component({
  selector: 'app-search',
  imports: [FormsModule, MediaCard],
  templateUrl: './search.html',
})
export class SearchPage implements OnInit {
  private tmdb = inject(TmdbService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private titleService = inject(Title);
  private destroyRef = inject(DestroyRef);

  query = signal('');
  searchFilter = signal<SearchFilter>('all');
  searchResults = signal<TmdbMedia[]>([]);
  searchLoading = signal(false);
  hasSearched = signal(false);

  private searchQuery$ = new Subject<string>();

  filteredResults = computed(() => {
    const f = this.searchFilter();
    const results = this.searchResults();
    return f === 'all' ? results : results.filter(r => r.media_type === f);
  });

  searchFilterCounts = computed((): Record<string, number> => {
    const results = this.searchResults();
    return {
      all: results.length,
      movie: results.filter(r => r.media_type === 'movie').length,
      tv: results.filter(r => r.media_type === 'tv').length,
      person: results.filter(r => r.media_type === 'person').length,
    };
  });

  ngOnInit(): void {
    this.titleService.setTitle('Search | FlixSearch');

    this.searchQuery$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe(q => {
      if (q.length >= 2) this.runSearch(q);
      if (q.length === 0) { this.searchResults.set([]); this.hasSearched.set(false); }
    });

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const q = params['q'] ?? '';
      this.query.set(q);
      if (q.length >= 2) this.runSearch(q);
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.router.navigate(['/search'], { queryParams: value.trim() ? { q: value.trim() } : {}, replaceUrl: true });
    this.searchQuery$.next(value.trim());
  }

  private runSearch(q: string): void {
    if (!q) return;
    this.searchLoading.set(true);
    this.hasSearched.set(true);
    this.titleService.setTitle(`"${q}" — FlixSearch`);
    this.tmdb.searchMulti(q).subscribe({
      next: (res) => { this.searchResults.set(res.results); this.searchLoading.set(false); },
      error: () => { this.toast.show('Search failed.', 'error'); this.searchLoading.set(false); },
    });
  }

  clearSearch(): void {
    this.query.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.titleService.setTitle('Search | FlixSearch');
    this.router.navigate(['/search'], { replaceUrl: true });
  }
}
