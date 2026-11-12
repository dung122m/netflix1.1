import { movieApi, deduplicateServerEpisodes, filterDualServers } from "@/services/movies/service";
import { encodeStreamUrl } from "@/lib/streamCrypto";
import {
  buildMovieDescriptionFallback,
  pickBestMovieImage,
  pickBestMoviePoster,
  pickBestMovieThumb,
  formatCountryName,
  getCanonicalGenreSlug,
  getCanonicalCountrySlug,
} from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { findEpisodeMatch } from "@/lib/formatEpisode";
import {
  getTmdbTrailerUrl,
  searchTmdbTrailerByTitle,
  getTmdbMediaImagesById,
  searchTmdbPosterByTitle,
} from "@/services/tmdbService";

export interface NamedSlugItem {
  name: string;
  slug?: string;
}

export interface NormalizedEpisodeItem {
  name: string;
  slug: string;
  link_embed: string;
  link_m3u8: string;
  m3u8?: string;
  file?: string;
  [key: string]: unknown;
}

export interface NormalizedEpisodeServer {
  server_name: string;
  server_data: NormalizedEpisodeItem[];
}

export interface RawCategoryGroup {
  group?: { name?: string };
  list?: Array<{ id?: string; name: string; slug?: string }>;
}

export interface RawEpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
  m3u8?: string;
  file?: string;
}

export interface RawEpisodeServer {
  server_name?: string;
  server_data?: RawEpisodeItem[];
}

export interface MovieDetailRecord {
  slug: string;
  name?: string;
  title?: string;
  origin_name?: string;
  original_name?: string;
  alternative_names?: string[] | string;
  content?: string;
  description?: string;
  year?: number | string;
  time?: string | number;
  lang?: string;
  quality?: string;
  type?: string;
  status?: string;
  episode_current?: string;
  episode_total?: number | string;
  actor?: string[] | string;
  casts?: string[] | string;
  actors?: string[] | string;
  director?: string[] | string;
  directors?: string[] | string;
  category?: NamedSlugItem[] | Record<string, RawCategoryGroup>;
  genre?: string;
  country?: NamedSlugItem[] | string;
  trailer_url?: string;
  chieurap?: boolean | string | number;
  chieu_rap?: boolean;
  view?: number;
  showtimes?: string;
  notify?: string;
  modified?: { time?: string } | string;
  created?: { time?: string } | string;
  tmdb?: {
    id?: string | number;
    type?: string;
    vote_average?: number;
    vote_count?: number;
  };
  imdb?: {
    id?: string | number;
    vote_average?: number;
    vote_count?: number;
  };
  episodes?: RawEpisodeServer[];
  poster_url?: string;
  thumb_url?: string;
  image?: string;
  poster?: string;
  thumb?: string;
  [key: string]: unknown;
}

function getArrayCategories(category: MovieDetailRecord["category"]): NamedSlugItem[] {
  return Array.isArray(category) ? category : [];
}

function getArrayCountries(country: MovieDetailRecord["country"]): NamedSlugItem[] {
  return Array.isArray(country) ? country : [];
}

export function formatVoteCount(v?: number): string {
  if (!v || v <= 0) return "";
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

export function formatCleanDuration(rawTime?: string | number): string {
  if (!rawTime) return "";
  const raw = String(rawTime).trim();
  if (raw.toLowerCase().includes("phút") || raw.toLowerCase().includes("min")) {
    return raw;
  }
  return `${raw} phút`;
}

export function parseEpisodeNumbers(
  movie: MovieDetailRecord,
  serverCount: number
): { current: number; total: number } {
  const currentStr = String(movie.episode_current || "").trim();
  const totalStr = String(movie.episode_total || "").trim();

  let current = 0;
  let total = typeof movie.episode_total === "number" ? movie.episode_total : 0;

  // 1. Kiểm tra dạng "Tập 13/13" hoặc "13/13" hoặc "Hoàn tất (16/16)"
  const slashMatch = currentStr.match(/(\d+)\s*[\/|\\]\s*(\d+)/);
  if (slashMatch) {
    current = parseInt(slashMatch[1], 10);
    if (!total) {
      total = parseInt(slashMatch[2], 10);
    }
  } else {
    // 2. Tìm số đơn lẻ trong episode_current (vd: "Tập 12" -> 12, "12" -> 12)
    const numMatch = currentStr.match(/(\d+)/);
    if (numMatch) {
      current = parseInt(numMatch[1], 10);
    } else {
      current = serverCount;
    }

    if (!total) {
      const totalMatch = totalStr.match(/(\d+)/);
      if (totalMatch) {
        total = parseInt(totalMatch[1], 10);
      }
    }
  }

  if (!total || total < current) {
    total = Math.max(total || 0, serverCount, current);
  }

  if (total > 0 && current > total) {
    current = total;
  }

  return { current, total };
}

export function extractPeopleAndTaxonomies(movie: MovieDetailRecord) {
  // Danh sách diễn viên dạng mảng (hỗ trợ cả movie.actor, movie.casts, movie.actors)
  const rawActors = movie.actor || movie.casts || movie.actors;
  const actorList: string[] = (
    Array.isArray(rawActors)
      ? rawActors.map(String).map((s) => s.trim()).filter(Boolean)
      : typeof rawActors === "string" && rawActors
        ? rawActors.split(",").map((s) => s.trim()).filter(Boolean)
        : []
  ).filter((a) => !a.toLowerCase().includes("cập nhật") && !a.toLowerCase().includes("updating"));

  // Danh sách đạo diễn dạng mảng (hỗ trợ cả movie.director, movie.directors)
  const rawDirectors = movie.director || movie.directors;
  const directorList: string[] = (
    Array.isArray(rawDirectors)
      ? rawDirectors.map(String).map((s) => s.trim()).filter(Boolean)
      : typeof rawDirectors === "string" && rawDirectors
        ? rawDirectors.split(",").map((s) => s.trim()).filter(Boolean)
        : []
  ).filter((d) => !d.toLowerCase().includes("cập nhật") && !d.toLowerCase().includes("updating"));

  // Danh sách thể loại (hỗ trợ mảng, group object NguonC, string genre)
  const categoryList: NamedSlugItem[] = (() => {
    if (Array.isArray(movie.category)) {
      return movie.category.map((c) => ({
        name: c.name,
        slug: getCanonicalGenreSlug(c.name, c.slug),
      }));
    }
    if (movie.category && typeof movie.category === "object") {
      const extracted: NamedSlugItem[] = [];
      for (const grp of Object.values(movie.category)) {
        const gName = (grp?.group?.name || "").toLowerCase();
        if (gName.includes("thể loại") || gName.includes("the loai")) {
          for (const item of grp.list || []) {
            if (item?.name) {
              extracted.push({
                name: item.name,
                slug: getCanonicalGenreSlug(item.name, item.slug || item.id),
              });
            }
          }
        }
      }
      if (extracted.length > 0) return extracted;
    }
    if (typeof movie.genre === "string" && movie.genre) {
      return movie.genre.split(",").map((g) => ({
        name: g.trim(),
        slug: getCanonicalGenreSlug(g.trim()),
      }));
    }
    return [];
  })().filter((c) => c?.name && !c.name.toLowerCase().includes("cập nhật"));

  // Danh sách quốc gia (hỗ trợ mảng, group object NguonC, string country)
  const countryList: NamedSlugItem[] = (() => {
    if (Array.isArray(movie.country)) {
      return movie.country.map((c) => ({
        name: formatCountryName(c?.name || c?.slug) || c?.name || "",
        slug: getCanonicalCountrySlug(c?.name, c?.slug),
      }));
    }
    if (movie.category && typeof movie.category === "object") {
      const extracted: NamedSlugItem[] = [];
      for (const grp of Object.values(movie.category)) {
        const gName = (grp?.group?.name || "").toLowerCase();
        if (gName.includes("quốc gia") || gName.includes("quoc gia")) {
          for (const item of grp.list || []) {
            if (item?.name) {
              extracted.push({
                name: formatCountryName(item.name || item.slug || item.id) || item.name,
                slug: getCanonicalCountrySlug(item.name, item.slug || item.id),
              });
            }
          }
        }
      }
      if (extracted.length > 0) return extracted;
    }
    if (typeof movie.country === "string" && movie.country) {
      return movie.country.split(",").map((c) => ({
        name: formatCountryName(c) || c.trim(),
        slug: getCanonicalCountrySlug(c.trim()),
      }));
    }
    return [];
  })().filter((c) => c?.name && !c.name.toLowerCase().includes("cập nhật"));

  // Tên gọi khác (tên tiếng Trung/Anh/phụ)
  const rawAlt =
    movie.alternative_names ||
    (movie.origin_name && movie.origin_name !== movie.name ? [movie.origin_name] : []) ||
    (movie.original_name && movie.original_name !== movie.name ? [movie.original_name] : []);
  const altNames: string[] = (
    Array.isArray(rawAlt)
      ? rawAlt.map(String).map((s) => s.trim()).filter(Boolean)
      : typeof rawAlt === "string" && rawAlt
        ? rawAlt.split(",").map((s) => s.trim()).filter(Boolean)
        : []
  ).filter((n) => n.toLowerCase() !== (movie.name || "").toLowerCase());

  return { actorList, directorList, categoryList, countryList, altNames };
}

export async function resolveTmdbFallbackMedia(movie: MovieDetailRecord) {
  const tmdbId = movie.tmdb?.id || movie.imdb?.id;
  const tmdbType =
    movie.tmdb?.type || (movie.type === "series" || movie.type === "phim-bo" ? "tv" : "movie");

  let effectivePosterUrl = pickBestMoviePoster(movie, "/default-poster.jpg");
  let effectiveThumbUrl = pickBestMovieThumb(movie, "/default-hero.jpg");
  let effectiveTrailerUrl = (movie.trailer_url || "").trim();

  const hasGoodPoster = effectivePosterUrl && !effectivePosterUrl.includes("default-poster");
  const hasGoodThumb = effectiveThumbUrl && !effectiveThumbUrl.includes("default-hero");
  const needsTrailer = !effectiveTrailerUrl;
  const isPhimimg = Boolean(
    effectivePosterUrl?.includes("phimimg.com") || effectiveThumbUrl?.includes("phimimg.com")
  );
  const needsPoster = !hasGoodPoster || !hasGoodThumb || isPhimimg;

  if ((needsTrailer || needsPoster) && (tmdbId || movie.origin_name || movie.name)) {
    const movieTitleForSearch = movie.origin_name || movie.name || "";
    const tmdbTasks = Promise.allSettled([
      needsTrailer
        ? (async () => {
            let tr = "";
            if (tmdbId) {
              tr = (await getTmdbTrailerUrl(tmdbId, tmdbType).catch(() => "")) || "";
            }
            if (!tr && movieTitleForSearch) {
              tr =
                (await searchTmdbTrailerByTitle(movieTitleForSearch, movie.year, tmdbType).catch(
                  () => ""
                )) || "";
            }
            return tr;
          })()
        : Promise.resolve(effectiveTrailerUrl),

      needsPoster
        ? (async () => {
            let pUrl = "";
            let tUrl = "";
            if (tmdbId) {
              const idImages = await getTmdbMediaImagesById(tmdbId, tmdbType).catch(() => null);
              if (idImages?.posterUrl) pUrl = idImages.posterUrl;
              if (idImages?.backdropUrl) tUrl = idImages.backdropUrl;
            }
            if ((!pUrl || !tUrl) && movieTitleForSearch) {
              const res = await searchTmdbPosterByTitle(
                movieTitleForSearch,
                movie.year,
                tmdbType
              ).catch(() => null);
              if (res?.posterUrl && !pUrl) {
                pUrl = res.posterUrl;
              }
              if (res?.backdropUrl && !tUrl) {
                tUrl = res.backdropUrl;
              }
            }
            return { posterUrl: pUrl, thumbUrl: tUrl };
          })()
        : Promise.resolve({ posterUrl: effectivePosterUrl, thumbUrl: effectiveThumbUrl }),
    ]);

    try {
      const tmdbTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TMDB SSR Timeout")), 1500)
      );
      const [trailerRes, posterRes] = await Promise.race([tmdbTasks, tmdbTimeout]);

      if (trailerRes.status === "fulfilled" && trailerRes.value) {
        effectiveTrailerUrl = trailerRes.value;
      }
      if (posterRes.status === "fulfilled" && posterRes.value) {
        if (posterRes.value.posterUrl) {
          effectivePosterUrl = posterRes.value.posterUrl;
        }
        if (posterRes.value.thumbUrl) {
          effectiveThumbUrl = posterRes.value.thumbUrl;
        }
      }
    } catch {
      // Timeout hoặc lỗi mạng: giữ nguyên ảnh dự phòng ban đầu, không tạo layout shift
    }
  }

  return {
    effectivePosterUrl,
    effectiveThumbUrl,
    effectiveTrailerUrl,
    tmdbId,
    tmdbType,
  };
}

export async function buildMovieMetadata(slug: string) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://nanaflix.asia").replace(
    /\/+$/,
    ""
  );
  try {
    const data = await movieApi.getMovieDetail(slug);

    if (!data?.movie) {
      return {
        title: "Không tìm thấy phim | Nanaflix",
        description:
          "Bộ phim bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang liên kết mới.",
        alternates: {
          canonical: `${siteUrl}/movies/${slug}`,
        },
      };
    }

    const movie = data.movie as MovieDetailRecord;
    const rawTitle = movie.name || movie.title || "Phim";
    const originName = movie.origin_name ? ` (${movie.origin_name})` : "";
    const year = movie.year ? ` - ${movie.year}` : "";
    const description =
      cleanHtmlText(movie.content || movie.description) ||
      `Xem phim ${rawTitle}${originName} chất lượng cao Full HD, Vietsub, Thuyết minh miễn phí tốc độ cao trên Nanaflix.`;
    const image = pickBestMovieImage(movie, "/default-poster.jpg");

    return {
      title: `${rawTitle}${originName}${year} | Nanaflix `,
      description: description.slice(0, 160),
      alternates: {
        canonical: `${siteUrl}/movies/${slug}`,
      },
      openGraph: {
        title: `${rawTitle}${originName} | Nanaflix `,
        description: description.slice(0, 160),
        images: image ? [{ url: image, alt: rawTitle }] : [],
        type: "video.movie",
      },
      twitter: {
        card: "summary_large_image",
        title: `${rawTitle}${originName} | Nanaflix `,
        description: description.slice(0, 160),
        images: image ? [image] : [],
      },
    };
  } catch {
    return {
      title: "Nanaflix - Xem Phim Online Miễn Phí",
      alternates: {
        canonical: `${siteUrl}/movies`,
      },
    };
  }
}

export async function buildMovieDetailPageData(
  slug: string,
  options: { ep?: string; server?: string }
) {
  const { ep, server } = options;
  const data = await movieApi.getMovieDetail(slug, undefined, ep);
  if (!data || !data.movie) {
    return null;
  }

  const movie = data.movie as MovieDetailRecord;
  const episodes = data.episodes as RawEpisodeServer[] | undefined;
  const title = movie.name || movie.title || "Phim";

  const arrayCategories = getArrayCategories(movie.category);
  const arrayCountries = getArrayCountries(movie.country);

  const { actorList, directorList, categoryList, countryList, altNames } =
    extractPeopleAndTaxonomies(movie);

  const description =
    cleanHtmlText(movie.content || movie.description) ||
    buildMovieDescriptionFallback({
      origin_name: movie.origin_name,
      year: movie.year,
      time: movie.time,
      lang: movie.lang,
      quality: movie.quality,
      category: categoryList,
      country: countryList,
      director: directorList,
    }) ||
    "";

  const tmdbScore = movie.tmdb?.vote_average ? Number(movie.tmdb.vote_average) : undefined;
  const tmdbVotes = movie.tmdb?.vote_count ? Number(movie.tmdb.vote_count) : undefined;
  const imdbScore = movie.imdb?.vote_average ? Number(movie.imdb.vote_average) : undefined;
  const imdbVotes = movie.imdb?.vote_count ? Number(movie.imdb.vote_count) : undefined;

  const {
    effectivePosterUrl,
    effectiveThumbUrl,
    effectiveTrailerUrl,
    tmdbId,
    tmdbType,
  } = await resolveTmdbFallbackMedia(movie);

  const tmdbVotesText = formatVoteCount(tmdbVotes);
  const imdbVotesText = formatVoteCount(imdbVotes);

  const isChieuRap = Boolean(
    movie.chieurap === true ||
      movie.chieurap === "true" ||
      movie.chieurap === 1 ||
      movie.chieu_rap === true
  );

  const viewCount = typeof movie.view === "number" && movie.view > 0 ? movie.view : undefined;

  const rawModified =
    (typeof movie.modified === "object" ? movie.modified?.time : movie.modified) ||
    (typeof movie.created === "object" ? movie.created?.time : movie.created) ||
    movie.time;
  const modifiedTime = rawModified ? new Date(rawModified) : null;
  const formattedModified =
    modifiedTime && !isNaN(modifiedTime.getTime())
      ? modifiedTime.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  const rawEpisodes = episodes && episodes.length > 0 ? episodes : movie.episodes || [];
  const dualServers = filterDualServers(rawEpisodes) as RawEpisodeServer[];
  const episodeServers: NormalizedEpisodeServer[] = dualServers.map((srv, sIdx) => ({
    server_name: srv.server_name || `Server #${sIdx + 1}`,
    server_data: deduplicateServerEpisodes(
      (srv.server_data || []).map((item) => ({
        name: item.name || "",
        slug: item.slug || "",
        link_embed: encodeStreamUrl(item.link_embed || ""),
        link_m3u8: encodeStreamUrl(item.link_m3u8 || ""),
      }))
    ) as NormalizedEpisodeItem[],
  }));

  const serverSummaries = episodeServers.map((s) => ({
    server_name: s.server_name,
    count: s.server_data.length,
  }));

  const currentServerIndex = Math.min(
    Math.max(0, parseInt(server || "0", 10)),
    Math.max(0, episodeServers.length - 1)
  );
  const currentServer = episodeServers[currentServerIndex] || episodeServers[0];
  const serverData: NormalizedEpisodeItem[] = currentServer?.server_data || [];
  const isTrailerOnly =
    movie.status === "trailer" ||
    serverData.length === 0 ||
    movie.episode_current === "Trailer";
  const isSingleEpisode = serverData.length <= 1;

  const cleanDuration = formatCleanDuration(movie.time);
  const { current: currentEpNum, total: totalEpNum } = parseEpisodeNumbers(
    movie,
    serverData.length
  );
  const isCompleted =
    movie.status === "completed" || (totalEpNum > 0 && currentEpNum >= totalEpNum);
  const hasProgress = totalEpNum > 1 && currentEpNum > 0;
  const progressPercent = hasProgress
    ? Math.min(100, Math.round((currentEpNum / totalEpNum) * 100))
    : 0;

  const activeEpisode = ep ? findEpisodeMatch(serverData, ep) : serverData[0];
  const videoLink = activeEpisode?.link_embed || activeEpisode?.link_m3u8;
  const embedSrc = activeEpisode?.link_embed;
  const rawM3u8 =
    activeEpisode?.link_m3u8 || activeEpisode?.m3u8 || activeEpisode?.file;

  const primaryGenreSlug =
    getCanonicalGenreSlug(categoryList[0]?.name, categoryList[0]?.slug) ||
    getCanonicalGenreSlug(arrayCategories[0]?.name, arrayCategories[0]?.slug);
  const primaryGenreName =
    categoryList[0]?.name || arrayCategories[0]?.name || "Thể loại";

  const bestImagePoster = pickBestMovieImage(movie, "/default-poster.jpg");
  const bestImageHero = pickBestMovieImage(movie, "/default-hero.jpg");

  const isSeries =
    movie.type === "series" ||
    movie.type === "tvshows" ||
    serverData.length > 1 ||
    (Boolean(movie.episode_total) && parseInt(String(movie.episode_total), 10) > 1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": isSeries ? "TVSeries" : "Movie",
    name: title,
    alternateName: movie.origin_name || undefined,
    image: pickBestMovieImage(movie, "https://nanaflix.asia/default-poster.jpg"),
    description:
      cleanHtmlText(movie.content || movie.description) ||
      `Xem phim ${title} chất lượng cao Full HD, Vietsub trên Nanaflix.`,
    datePublished: movie.year ? `${movie.year}` : undefined,
    genre: arrayCategories.map((c) => c.name),
    actor: actorList.slice(0, 10).map((actorName) => ({
      "@type": "Person",
      name: actorName,
    })),
    director: directorList.slice(0, 5).map((directorName) => ({
      "@type": "Person",
      name: directorName,
    })),
    ...(movie.tmdb?.vote_average
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: movie.tmdb.vote_average,
            bestRating: "10",
            ratingCount: movie.tmdb.vote_count || 50,
          },
        }
      : {}),
  };

  return {
    movie,
    title,
    description,
    actorList,
    directorList,
    categoryList,
    countryList,
    altNames,
    arrayCategories,
    arrayCountries,
    tmdbScore,
    tmdbVotesText,
    imdbScore,
    imdbVotesText,
    effectivePosterUrl,
    effectiveThumbUrl,
    effectiveTrailerUrl,
    bestImagePoster,
    bestImageHero,
    tmdbId,
    tmdbType,
    isChieuRap,
    viewCount,
    formattedModified,
    episodeServers,
    serverSummaries,
    currentServerIndex,
    serverData,
    isTrailerOnly,
    isSingleEpisode,
    cleanDuration,
    currentEpNum,
    totalEpNum,
    isCompleted,
    hasProgress,
    progressPercent,
    activeEpisode,
    videoLink,
    embedSrc,
    rawM3u8,
    primaryGenreSlug,
    primaryGenreName,
    isSeries,
    jsonLd,
  };
}
