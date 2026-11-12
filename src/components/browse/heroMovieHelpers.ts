import {
  pickHeroBackdropImage,
  toHighResBackdropUrl,
  toFastCdnImageUrl,
  formatCountryName,
} from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { clientSynopsisCache } from "@/services/synopsisService";

export const AUTO_SLIDE_NORMAL_MS = 6000;
export const AUTO_SLIDE_TRAILER_MS = 26000;

export type HeroMovie = {
  slug?: string;
  name?: string;
  title?: string;
  content?: string;
  description?: string;
  thumb_url?: string;
  poster_url?: string;
  imageUrl?: string;
  backdrop_url?: string;
  backdropUrl?: string;
  banner_url?: string;
  bannerUrl?: string;
  backdrop_path?: string;
  backdropPath?: string;
  year?: string | number;
  status?: string;
  episode_current?: string;
  lang?: string;
  quality?: string;
  time?: string | number;
  origin_name?: string;
  category?: Array<{ name?: string } | string>;
  country?: Array<{ name?: string; slug?: string }>;
  director?: string[];
  trailer_url?: string;
  tmdb?: {
    id?: string | number;
    type?: string;
    vote_average?: string | number;
    vote_count?: number;
  };
  [key: string]: unknown;
};

export interface HeroMovieMeta {
  title: string;
  isTrailerOnly: boolean;
  genresList: string[];
  rawEpisode: string;
  isEpisodeUseful: boolean;
  cleanDuration: string | null;
  displaySynopsis: string;
  heroCountry: string;
  heroType: string;
  voteText: string | null;
  heroImageSrc: string;
}

const USELESS_EPISODE_TAGS = new Set([
  "full",
  "trailer",
  "hd",
  "fhd",
  "4k",
  "cam",
  "sd",
  "đang cập nhật",
  "updating",
]);

/**
 * Normalizes hero slide metadata (title, duration, episode status, genres,
 * clean synopsis, TMDB score, and high-res backdrop URL).
 */
export function computeHeroMovieMeta(
  featuredMovie: HeroMovie | undefined,
  currentSlug: string | undefined,
  synopsisMap: Record<string, string>,
  failedHeroImages: Record<string, boolean>,
): HeroMovieMeta {
  const title = featuredMovie?.name || featuredMovie?.title || "Featured";
  const isTrailerOnly =
    featuredMovie?.status === "trailer" ||
    featuredMovie?.episode_current === "Trailer";
  const descriptionRaw =
    featuredMovie?.content || featuredMovie?.description || "";
  const descriptionClean = cleanHtmlText(descriptionRaw);

  const genresList = Array.isArray(featuredMovie?.category)
    ? featuredMovie.category
        .map((c) => (typeof c === "string" ? c : c?.name))
        .filter((name): name is string =>
          Boolean(name && !name.toLowerCase().includes("cập nhật")),
        )
    : [];

  const rawEpisode = featuredMovie?.episode_current?.trim() || "";
  const isEpisodeUseful = Boolean(
    rawEpisode && !USELESS_EPISODE_TAGS.has(rawEpisode.toLowerCase()),
  );

  const cleanDuration = (() => {
    if (!featuredMovie?.time) return null;
    const raw = String(featuredMovie.time)
      .trim()
      .replace(/phút\/tập\s*phút/gi, "phút/tập")
      .replace(/phút\s*phút/gi, "phút");
    if (!raw || raw.toLowerCase().includes("đang cập nhật")) return null;
    if (raw.toLowerCase().includes("phút") || raw.toLowerCase().includes("h")) {
      return raw;
    }
    return `${raw} phút`;
  })();

  const activeHeroSynopsis = currentSlug
    ? synopsisMap[currentSlug] || clientSynopsisCache.get(currentSlug) || ""
    : "";

  const hasRealSynopsis = Boolean(
    (activeHeroSynopsis &&
      !activeHeroSynopsis.startsWith("Tên gốc:") &&
      activeHeroSynopsis.trim().length > 10) ||
      (descriptionClean &&
        !descriptionClean.startsWith("Tên gốc:") &&
        descriptionClean.trim().length > 10),
  );
  const displaySynopsis = hasRealSynopsis
    ? activeHeroSynopsis || descriptionClean
    : "";

  const firstCountry = featuredMovie?.country?.[0];
  const heroCountry = formatCountryName(
    firstCountry?.name ||
      firstCountry?.slug ||
      (featuredMovie?.country as unknown),
  );

  const isSeries = Boolean(
    (featuredMovie?.episode_current &&
      String(featuredMovie.episode_current).toLowerCase().includes("tập")) ||
      (featuredMovie?.time &&
        String(featuredMovie.time).toLowerCase().includes("tập")) ||
      genresList.some((g) => g.toLowerCase().includes("phim bộ")),
  );
  const heroType = isSeries ? "Phim Bộ" : "Phim Lẻ";

  const voteAverage = featuredMovie?.tmdb?.vote_average;
  const voteText =
    voteAverage !== undefined && voteAverage !== null && voteAverage !== ""
      ? Number(voteAverage).toFixed(1)
      : null;

  // Giữ targetWidth w1280 ổn định giữa SSR và client hydration
  const targetWidth = "w1280";
  const heroImageSrc =
    !featuredMovie || (currentSlug && failedHeroImages[currentSlug])
      ? "/default-hero.jpg"
      : toFastCdnImageUrl(
          toHighResBackdropUrl(
            pickHeroBackdropImage(
              featuredMovie,
              "/default-hero.jpg",
              targetWidth,
            ),
            targetWidth,
          ),
        );

  return {
    title,
    isTrailerOnly,
    genresList,
    rawEpisode,
    isEpisodeUseful,
    cleanDuration,
    displaySynopsis,
    heroCountry,
    heroType,
    voteText,
    heroImageSrc,
  };
}
