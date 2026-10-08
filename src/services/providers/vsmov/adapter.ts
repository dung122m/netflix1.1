import {
  VsmovRawMovieItem,
  VsmovRawDetailResponse,
  VsmovRawServerItem,
} from "./types";

/**
 * Normalizes VSMOV storage image URLs to clean TMDB or direct image paths
 */
export function normalizeVsmovImageUrl(url?: string): string {
  if (!url) return "";
  const clean = String(url).trim();
  const vsmovMatch = clean.match(
    /https?:\/\/vsmov\.com\/storage\/images\/([a-zA-Z0-9]{22,35}\.(?:jpg|jpeg|png|webp))$/i
  );
  if (vsmovMatch && !vsmovMatch[1].includes("-") && !vsmovMatch[1].includes("_")) {
    return `https://image.tmdb.org/t/p/w500/${vsmovMatch[1]}`;
  }
  return clean;
}

/**
 * Transforms raw VSMOV list movie item into Nanaflix canonical item
 */
export function adaptVsmovMovieItem(raw: VsmovRawMovieItem) {
  if (!raw) return null;

  const poster = normalizeVsmovImageUrl(raw.poster_url);
  const thumb = normalizeVsmovImageUrl(raw.thumb_url);

  return {
    _id: String(raw._id || raw.id || raw.slug),
    name: raw.name || "",
    slug: raw.slug || "",
    origin_name: raw.origin_name || raw.name || "",
    thumb_url: thumb || poster,
    poster_url: poster || thumb,
    year: raw.year ? (typeof raw.year === "string" ? parseInt(raw.year, 10) || raw.year : raw.year) : undefined,
    type: raw.type || (raw.tmdb?.type === "tv" ? "series" : "single"),
    quality: raw.quality || "HD",
    lang: raw.lang || "Vietsub",
    time: raw.time || "",
    episode_current: raw.episode_current || "",
    episode_total: raw.episode_total || "",
    category: Array.isArray(raw.category) ? raw.category : [],
    country: Array.isArray(raw.country) ? raw.country : [],
    tmdb: raw.tmdb
      ? {
          id: raw.tmdb.id ? String(raw.tmdb.id) : undefined,
          type: raw.tmdb.type || "movie",
          vote_average: raw.tmdb.vote_average ? Number(raw.tmdb.vote_average) : undefined,
          vote_count: raw.tmdb.vote_count,
        }
      : undefined,
    imdb: raw.imdb?.id ? { id: raw.imdb.id } : undefined,
    modified: raw.modified,
    source: "vsmov" as const,
    sources: ["vsmov"],
  };
}

/**
 * Transforms raw VSMOV episode servers into Nanaflix EpisodeServer format
 */
export function adaptVsmovEpisodes(servers?: VsmovRawServerItem[]) {
  if (!Array.isArray(servers) || servers.length === 0) return [];

  return servers.map((srv, idx) => ({
    server_name: srv.server_name || `Server VSMOV #${idx + 1}`,
    server_data: (srv.server_data || []).map((ep) => ({
      name: ep.name || "",
      slug: ep.slug || "",
      filename: ep.filename || ep.name || "",
      link_embed: ep.link_embed || "",
      link_m3u8: ep.link_m3u8 || "",
    })),
  }));
}

/**
 * Transforms raw VSMOV detail response into Nanaflix canonical Movie Detail model
 */
export function adaptVsmovMovieDetail(raw: VsmovRawDetailResponse) {
  if (!raw || !raw.movie) return null;

  const movie = raw.movie;
  const baseItem = adaptVsmovMovieItem(movie);
  if (!baseItem) return null;

  const episodes = adaptVsmovEpisodes(raw.episodes);

  return {
    movie: {
      ...baseItem,
      content: movie.content || "",
      status: movie.status || "",
      showtimes: movie.showtimes || "",
      trailer_url: movie.trailer_url || "",
      director: Array.isArray(movie.director)
        ? movie.director
        : movie.director
        ? [movie.director]
        : [],
      actor: Array.isArray(movie.actor)
        ? movie.actor
        : movie.actor
        ? [movie.actor]
        : [],
    },
    episodes,
  };
}
