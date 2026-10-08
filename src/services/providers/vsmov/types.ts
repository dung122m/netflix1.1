export interface VsmovRawTmdb {
  type?: "movie" | "tv";
  id?: string | number;
  season?: number | null;
  vote_average?: string | number;
  vote_count?: number;
}

export interface VsmovRawImdb {
  id?: string;
}

export interface VsmovRawCategory {
  _id?: number | string;
  id?: number | string;
  name: string;
  slug: string;
}

export interface VsmovRawCountry {
  _id?: number | string;
  id?: number | string;
  name: string;
  slug: string;
}

export interface VsmovRawEpisodeItem {
  name?: string;
  slug?: string;
  filename?: string;
  link_embed?: string;
  link_m3u8?: string;
}

export interface VsmovRawServerItem {
  server_name?: string;
  server_data?: VsmovRawEpisodeItem[];
}

export interface VsmovRawMovieItem {
  _id?: number | string;
  id?: number | string;
  name: string;
  origin_name?: string;
  slug: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  content?: string;
  type?: string;
  status?: string;
  time?: string;
  episode_current?: string;
  episode_total?: string | number;
  quality?: string;
  lang?: string;
  showtimes?: string;
  trailer_url?: string;
  tmdb?: VsmovRawTmdb;
  imdb?: VsmovRawImdb;
  created?: { time?: string } | string;
  modified?: { time?: string } | string;
  category?: VsmovRawCategory[];
  country?: VsmovRawCountry[];
  director?: string[] | string;
  actor?: string[] | string;
}

export interface VsmovRawListResponse {
  status?: boolean | string;
  items?: VsmovRawMovieItem[];
  pagination?: {
    totalItems?: number;
    totalItemsPerPage?: number;
    currentPage?: number;
    totalPages?: number;
  };
}

export interface VsmovRawDetailResponse {
  status?: boolean | string;
  movie?: VsmovRawMovieItem;
  episodes?: VsmovRawServerItem[];
}
