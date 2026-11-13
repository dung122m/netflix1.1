/**
 * TMDb Domain Types & Interfaces
 */

export interface TmdbPerson {
  id: number;
  name: string;
  original_name?: string;
  profile_path?: string | null;
  popularity: number;
  known_for_department?: string;
}

export interface TmdbPersonDetail extends TmdbPerson {
  birthday?: string;
  deathday?: string;
  place_of_birth?: string;
  biography?: string;
  also_known_as?: string[];
  gender?: number;
  homepage?: string;
  imdb_id?: string;
}

export interface TmdbMovieCredit {
  id: number; // tmdb_id
  title: string;
  original_title: string;
  release_date?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  character?: string;
  department?: string;
  job?: string;
  imdb_id?: string;
  media_type?: string;
  genre_ids?: number[];
  original_language?: string;
}

export interface MatchTmdbOptions {
  isActorFilmography?: boolean;
}

