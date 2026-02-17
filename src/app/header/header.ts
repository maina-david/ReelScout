import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { WatchlistService } from '../services/watchlist.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './header.html',
})
export class Header implements OnInit {
  private router = inject(Router);
  readonly watchlist = inject(WatchlistService);

  isDetailPage = signal(false);
  watchlistCount = computed(() => this.watchlist.items().length);

  searchOpen = signal(false);
  searchQuery = signal('');

  ngOnInit(): void {
    this.updateState(this.router.url);
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.updateState((e as NavigationEnd).urlAfterRedirects);
        this.searchOpen.set(false);
        this.searchQuery.set('');
      });
  }

  private updateState(url: string): void {
    const path = url.split('?')[0];
    this.isDetailPage.set(
      path.startsWith('/movie/') || path.startsWith('/tv/') || path.startsWith('/person/')
    );
  }

  openSearch(): void { this.searchOpen.set(true); }

  closeSearch(): void { this.searchOpen.set(false); this.searchQuery.set(''); }

  submitSearch(): void {
    const q = this.searchQuery().trim();
    if (!q) return;
    this.router.navigate(['/search'], { queryParams: { q } });
    this.searchOpen.set(false);
    this.searchQuery.set('');
  }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName;
    if (e.key === 'Escape') { this.closeSearch(); return; }
    if (e.key === '/' && tag !== 'INPUT' && !this.searchOpen()) {
      e.preventDefault();
      this.openSearch();
    }
  }
}
