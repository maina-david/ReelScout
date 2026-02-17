import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then(m => m.Home),
  },
  {
    path: 'search',
    loadComponent: () => import('./search/search').then(m => m.SearchPage),
  },
  {
    path: 'movie/:id',
    loadComponent: () => import('./movie-detail/movie-detail').then(m => m.MovieDetail),
  },
  {
    path: 'tv/:id',
    loadComponent: () => import('./tv-detail/tv-detail').then(m => m.TvDetail),
  },
  {
    path: 'person/:id',
    loadComponent: () => import('./person-detail/person-detail').then(m => m.PersonDetail),
  },
  {
    path: 'genre',
    loadComponent: () => import('./genre/genre').then(m => m.GenrePage),
  },
  {
    path: 'movies',
    loadComponent: () => import('./movies/movies').then(m => m.Movies),
  },
  {
    path: 'tv-shows',
    loadComponent: () => import('./tv-shows/tv-shows').then(m => m.TvShows),
  },
  {
    path: 'collection/:id',
    loadComponent: () => import('./collection/collection').then(m => m.Collection),
  },
  {
    path: 'watchlist',
    loadComponent: () => import('./watchlist/watchlist').then(m => m.Watchlist),
  },
  {
    path: 'stats',
    loadComponent: () => import('./stats/stats').then(m => m.Stats),
  },
  {
    path: 'calendar',
    loadComponent: () => import('./calendar/calendar').then(m => m.CalendarPage),
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then(m => m.NotFound),
  },
];
