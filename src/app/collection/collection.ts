import { Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TmdbCollection } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';
import { MediaCard } from '../media-card/media-card';

@Component({
  selector: 'app-collection',
  imports: [MediaCard],
  templateUrl: './collection.html',
})
export class Collection implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tmdb = inject(TmdbService);
  private titleService = inject(Title);
  private toast = inject(ToastService);

  collection = signal<TmdbCollection | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || isNaN(Number(id))) { this.router.navigate(['/']); return; }
    this.tmdb.getCollection(Number(id)).subscribe({
      next: (res) => {
        const parts = res.parts.map(p => ({ ...p, media_type: 'movie' as const }))
          .sort((a, b) => (a.release_date ?? '').localeCompare(b.release_date ?? ''));
        this.collection.set({ ...res, parts });
        this.titleService.setTitle(`${res.name} | FlixSearch`);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load collection.');
        this.toast.show('Failed to load collection.', 'error');
        this.loading.set(false);
      },
    });
  }

  backdropUrl(): string {
    return this.tmdb.imageUrl(this.collection()?.backdrop_path ?? null, 'original');
  }
}
