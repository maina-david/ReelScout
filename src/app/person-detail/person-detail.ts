import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaCard } from '../media-card/media-card';
import { TmdbImageFile, TmdbMedia, TmdbPerson } from '../models/tmdb.model';
import { TmdbService } from '../services/tmdb.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-person-detail',
  imports: [MediaCard],
  templateUrl: './person-detail.html',
})
export class PersonDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly tmdb = inject(TmdbService);
  private titleService = inject(Title);
  private toast = inject(ToastService);

  person = signal<TmdbPerson | null>(null);
  loading = signal(true);
  error = signal('');
  showFullBio = signal(false);
  visibleCount = signal(12);
  imdbId = signal<string | null>(null);
  showGallery = signal(false);
  selectedGalleryIndex = signal(0);

  personImages = computed((): TmdbImageFile[] => (this.person()?.images?.profiles ?? []).slice(0, 20));

  allFilmography = computed((): TmdbMedia[] => {
    return (this.person()?.combined_credits?.cast ?? [])
      .filter(c => c.poster_path)
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .map((c): TmdbMedia => ({
        id: c.id,
        title: c.title,
        name: c.name,
        poster_path: c.poster_path,
        backdrop_path: null,
        media_type: c.media_type,
        vote_average: c.vote_average,
        release_date: c.release_date,
        first_air_date: c.first_air_date,
        genre_ids: [],
        overview: c.character ? `as ${c.character}` : undefined,
      }));
  });

  filmography = computed((): TmdbMedia[] => {
    return this.allFilmography().slice(0, this.visibleCount());
  });

  hasMore = computed(() => this.visibleCount() < this.allFilmography().length);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || isNaN(Number(id))) { this.router.navigate(['/']); return; }
    const numId = Number(id);
    this.tmdb.getPersonDetails(numId).subscribe({
      next: (res) => {
        this.person.set(res);
        this.titleService.setTitle(`${res.name} | ReelScout`);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load person details.');
        this.toast.show('Failed to load person details.', 'error');
        this.loading.set(false);
      },
    });
    this.tmdb.getPersonExternalIds(numId).subscribe({
      next: (ext) => this.imdbId.set(ext.imdb_id),
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.showGallery.set(false);
    if (e.key === 'ArrowRight' && this.showGallery()) this.galleryNext();
    if (e.key === 'ArrowLeft' && this.showGallery()) this.galleryPrev();
  }

  openGallery(index = 0): void {
    this.selectedGalleryIndex.set(index);
    this.showGallery.set(true);
  }

  galleryNext(): void {
    this.selectedGalleryIndex.update(i => Math.min(i + 1, this.personImages().length - 1));
  }

  galleryPrev(): void {
    this.selectedGalleryIndex.update(i => Math.max(i - 1, 0));
  }

  galleryImageUrl(path: string): string {
    return this.tmdb.imageUrl(path, 'original');
  }

  showMore(): void {
    this.visibleCount.update(n => n + 12);
  }

  profileUrl(): string {
    return this.tmdb.imageUrl(this.person()?.profile_path ?? null, 'w300');
  }

  get age(): string {
    const p = this.person();
    if (!p?.birthday) return '';
    const end = p.deathday ? new Date(p.deathday) : new Date();
    const age = end.getFullYear() - new Date(p.birthday).getFullYear();
    return p.deathday ? `${age} (deceased)` : `${age}`;
  }

  get bioPreview(): string {
    const bio = this.person()?.biography ?? '';
    return bio.length > 500 ? bio.slice(0, 500) + '…' : bio;
  }
}
