export interface TmdbMedia {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: 'movie' | 'tv' | 'person';
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  overview?: string;
  profile_path?: string | null;
}

export interface WatchlistItem extends TmdbMedia {
  watchlistCategory: 'want' | 'watching' | 'watched';
  addedAt: number;
}

export interface TmdbMovie {
  id: number;
  title: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  genres: TmdbGenre[];
  credits: { cast: TmdbCastMember[]; crew: TmdbCrewMember[] };
  videos: { results: TmdbVideo[] };
  recommendations: TmdbPageResult<TmdbMedia>;
  status: string;
  budget: number;
  revenue: number;
  original_language: string;
  production_countries: { name: string }[];
  belongs_to_collection: TmdbCollectionStub | null;
  keywords: { keywords: TmdbKeyword[] };
  reviews: TmdbPageResult<TmdbReview>;
  similar: TmdbPageResult<TmdbMedia>;
  images: { backdrops: TmdbImageFile[]; posters: TmdbImageFile[] };
  release_dates: { results: { iso_3166_1: string; release_dates: { certification: string; type: number }[] }[] };
}

export interface TmdbCollectionStub {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface TmdbCollection {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: TmdbMedia[];
}

export interface TmdbTv {
  id: number;
  name: string;
  tagline: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  next_episode_to_air: { air_date: string; episode_number: number; season_number: number; name: string } | null;
  number_of_seasons: number;
  number_of_episodes: number;
  vote_average: number;
  vote_count: number;
  genres: TmdbGenre[];
  credits: { cast: TmdbCastMember[] };
  videos: { results: TmdbVideo[] };
  recommendations: TmdbPageResult<TmdbMedia>;
  seasons: TmdbSeasonSummary[];
  status: string;
  networks: { id: number; name: string; logo_path: string | null }[];
  original_language: string;
  keywords: { results: TmdbKeyword[] };
  reviews: TmdbPageResult<TmdbReview>;
  similar: TmdbPageResult<TmdbMedia>;
  images: { backdrops: TmdbImageFile[]; posters: TmdbImageFile[] };
  content_ratings: { results: { iso_3166_1: string; rating: string }[] };
}

export interface TmdbSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
  overview: string;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  episodes: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  runtime: number | null;
}

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
  department: string;
}

export interface TmdbPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  popularity: number;
  combined_credits: { cast: TmdbPersonCredit[] };
  images: { profiles: TmdbImageFile[] };
}

export interface TmdbPersonCredit {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  character: string;
  popularity: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  official: boolean;
  name: string;
}

export interface TmdbPageResult<T> {
  results: T[];
  total_results: number;
  total_pages: number;
  page: number;
}

export interface DiscoverParams {
  sort_by?: string;
  'primary_release_year'?: number;
  'first_air_date_year'?: number;
  'vote_average.gte'?: number;
  'vote_count.gte'?: number;
  with_genres?: number;
  page?: number;
}

export interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

export interface TmdbReview {
  id: string;
  author: string;
  content: string;
  created_at: string;
  author_details: { avatar_path: string | null; rating: number | null };
}

export interface TmdbImageFile {
  file_path: string;
  width: number;
  height: number;
  vote_average: number;
}
