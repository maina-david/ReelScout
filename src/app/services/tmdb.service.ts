import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  DiscoverParams,
  TmdbCollection,
  TmdbGenre,
  TmdbMedia,
  TmdbMovie,
  TmdbPageResult,
  TmdbPerson,
  TmdbSeason,
  TmdbTv,
  WatchProvider,
} from '../models/tmdb.model';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private http = inject(HttpClient);
  private base = environment.tmdbApiUrl;
  private imgBase = environment.tmdbImageUrl;

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${environment.tmdbToken}` });
  }

  private get<T>(path: string, params: Record<string, string | number> = {}): Observable<T> {
    const queryString = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const url = `${this.base}${path}${queryString ? '?' + queryString : ''}`;
    return this.http.get<T>(url, { headers: this.headers });
  }

  getTrending(mediaType: 'all' | 'movie' | 'tv', timeWindow: 'day' | 'week', region?: string): Observable<TmdbPageResult<TmdbMedia>> {
    const params: Record<string, string | number> = {};
    if (region) params['region'] = region;
    return this.get(`/trending/${mediaType}/${timeWindow}`, params);
  }

  searchMulti(query: string, page = 1): Observable<TmdbPageResult<TmdbMedia>> {
    return this.get('/search/multi', { query, page });
  }

  getMovieDetails(id: number): Observable<TmdbMovie> {
    return this.get(`/movie/${id}`, { append_to_response: 'credits,videos,recommendations,keywords,reviews,similar,images,release_dates' });
  }

  getTvDetails(id: number): Observable<TmdbTv> {
    return this.get(`/tv/${id}`, { append_to_response: 'credits,videos,recommendations,keywords,reviews,similar,images,content_ratings' });
  }

  getTvSeason(tvId: number, seasonNum: number): Observable<TmdbSeason> {
    return this.get(`/tv/${tvId}/season/${seasonNum}`);
  }

  getPersonDetails(id: number): Observable<TmdbPerson> {
    return this.get(`/person/${id}`, { append_to_response: 'combined_credits,images' });
  }

  discoverMedia(mediaType: 'movie' | 'tv', params: DiscoverParams): Observable<TmdbPageResult<TmdbMedia>> {
    const p: Record<string, string | number> = { sort_by: 'popularity.desc', ...params as Record<string, string | number> };
    return this.get(`/discover/${mediaType}`, p);
  }

  getPopular(mediaType: 'movie' | 'tv', page = 1): Observable<TmdbPageResult<TmdbMedia>> {
    return this.get(`/${mediaType}/popular`, { page });
  }

  getTopRated(mediaType: 'movie' | 'tv', page = 1): Observable<TmdbPageResult<TmdbMedia>> {
    return this.get(`/${mediaType}/top_rated`, { page });
  }

  getNowPlaying(page = 1): Observable<TmdbPageResult<TmdbMedia>> {
    return this.get('/movie/now_playing', { page });
  }

  getUpcoming(page = 1): Observable<TmdbPageResult<TmdbMedia>> {
    return this.get('/movie/upcoming', { page });
  }

  getTvOnAir(page = 1): Observable<TmdbPageResult<TmdbMedia>> {
    return this.get('/tv/on_the_air', { page });
  }

  getTvAiringToday(page = 1): Observable<TmdbPageResult<TmdbMedia>> {
    return this.get('/tv/airing_today', { page });
  }

  getCollection(id: number): Observable<TmdbCollection> {
    return this.get(`/collection/${id}`);
  }

  getGenres(mediaType: 'movie' | 'tv'): Observable<{ genres: TmdbGenre[] }> {
    return this.get(`/genre/${mediaType}/list`);
  }

  getPersonExternalIds(id: number): Observable<{ imdb_id: string | null; instagram_id: string | null; twitter_id: string | null }> {
    return this.get(`/person/${id}/external_ids`);
  }

  getWatchProviders(mediaType: 'movie' | 'tv', id: number): Observable<{ results: Record<string, { flatrate?: WatchProvider[]; rent?: WatchProvider[]; buy?: WatchProvider[] }> }> {
    return this.get(`/${mediaType}/${id}/watch/providers`);
  }

  imageUrl(path: string | null, size: 'w185' | 'w300' | 'w500' | 'w780' | 'original'): string {
    if (!path) return '';
    return `${this.imgBase}${size}${path}`;
  }
}
