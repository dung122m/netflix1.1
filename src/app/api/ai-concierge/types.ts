export interface SuggestionCard {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  rating?: string | number;
  category?: string;
  country?: string;
  actors?: string[];
  reason?: string;
}

export interface MatchOptions {
  expectedCountry?: string;
  expectedGenre?: string;
  expectedActorSlug?: string;
  yearFrom?: number;
  yearTo?: number;
  isLatest?: boolean;
  excludedCountries?: string[];
  excludedGenres?: string[];
  expectedCharacter?: string;
}

export interface CandidateMovie {
  title: string;
  original_title?: string;
  year?: number;
  reason?: string;
}

export interface CharacterProfile {
  name: string;
  aliases: string[];
  searchKeywords: string[];
  defaultTitles?: string[];
}

export type SearchIntent =
  | "movie_title"
  | "actor"
  | "character"
  | "genre"
  | "country"
  | "year"
  | "theme"
  | "mood"
  | "mixed"
  | "unknown";

export interface AiParsedResult {
  intent?: SearchIntent;
  keywords?: string[];
  semanticQuery?: string;
  concepts?: string[];
  is_trap?: boolean;
  is_off_topic?: boolean;
  analysis?: string;
  mood?: string;
  genres?: string[];
  genre?: string;
  country?: string;
  is_latest?: boolean;
  years?: { from?: number; to?: number };
  year_from?: number;
  year_to?: number;
  keyword?: string;
  actor?: string;
  director?: string;
  character?: string;
  excluded_countries?: string[];
  excluded_genres?: string[];
  suggested_movies?: CandidateMovie[];
  movies?: CandidateMovie[];
}

export interface CacheEntry {
  reply: string;
  mood: string;
  movies: SuggestionCard[];
  provider: string;
  cachedAt: number;
}

export interface ChatMessageContext {
  role: "user" | "assistant";
  content: string;
}

export interface ConciergeApiResponse {
  reply: string;
  mood: string;
  movies: SuggestionCard[];
  provider: string;
  cached?: boolean;
}

