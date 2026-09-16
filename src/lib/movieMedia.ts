import { cleanHtmlText } from "@/lib/cleanHtml";

export type MovieLike = {
  poster_url?: unknown;
  thumb_url?: unknown;
  imageUrl?: unknown;
  [key: string]: unknown;
};

export function sanitizeImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let clean = url.trim();
  if (
    !clean ||
    clean === "null" ||
    clean === "undefined" ||
    clean.endsWith("/null") ||
    clean.endsWith("/undefined")
  ) {
    return "";
  }
  if (!clean.startsWith("http://") && !clean.startsWith("https://") && !clean.startsWith("/")) {
    clean = `https://phimimg.com/${clean.replace(/^\/+/, "")}`;
  }
  // Sửa lỗi url có 2 dấu gạch chéo // sau tên miền (gây redirect chậm)
  clean = clean.replace(/(https?:\/\/)([^/]+)\/\/+/g, "$1$2/");

  // Tối ưu ảnh VSMOV: Chỉ chuyển sang TMDb CDN nếu filename là mã hash TMDb hợp lệ (chuỗi alphanumeric 22-35 ký tự, KHÔNG chứa dấu gạch nối hoặc từ ngữ tùy chỉnh)
  const vsmovMatch = clean.match(/https?:\/\/vsmov\.com\/storage\/images\/([a-zA-Z0-9]{22,35}\.(?:jpg|jpeg|png|webp))$/i);
  if (vsmovMatch && !vsmovMatch[1].includes("-") && !vsmovMatch[1].includes("_")) {
    clean = `https://image.tmdb.org/t/p/w500/${vsmovMatch[1]}`;
  }

  // Tối ưu ảnh TMDB original / w1280 sang w500 để tải nhanh gấp nhiều lần, tốn ít băng thông
  if (clean.includes("image.tmdb.org/t/p/original/")) {
    clean = clean.replace("/t/p/original/", "/t/p/w500/");
  } else if (clean.includes("image.tmdb.org/t/p/w1280/")) {
    clean = clean.replace("/t/p/w1280/", "/t/p/w500/");
  }

  // Tối ưu ảnh IMDb: Amazon CloudFront CDN cho phép resize tự động bằng URL slug
  // Chuyển từ ảnh gốc 1000px-2000px (_UX1000_) sang _UX400_ nén từ 300KB xuống ~18KB mà nét căng
  if (clean.includes("media-amazon.com/images/M/")) {
    clean = clean.replace(/_V1_.*(\.(?:jpg|jpeg|png|webp))$/i, "_V1_QL80_UX400_$1");
  }

  return clean;
}

export function isNguonCSource(movie: MovieLike): boolean {
  if (!movie) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (movie as any)?.movie || movie;
  const p = String(raw.poster_url || raw.posterUrl || "");
  const t = String(raw.thumb_url || raw.thumbUrl || "");
  return (
    p.includes("nguonc.com") ||
    t.includes("nguonc.com") ||
    p.includes("vsmov.com") ||
    t.includes("vsmov.com") ||
    (raw._id !== undefined && typeof raw._id === "number")
  );
}

export const isVsmovSource = isNguonCSource;

export function pickBestMoviePoster(movie: MovieLike, fallback = "/default-poster.svg"): string {
  if (!movie) return fallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = (movie as any)?.movie || movie;
  const isVsmov = isVsmovSource(movie);

  // VSMOV đảo ngược trường: thumb_url là poster dọc (2:3), poster_url là backdrop ngang (16:9)
  const primary = isVsmov
    ? rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl
    : rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl;

  const secondary = isVsmov
    ? rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl
    : rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl;

  const candidates = [primary, secondary, movie.imageUrl]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(sanitizeImageUrl)
    .filter((url) => Boolean(url) && !url.endsWith("/null") && !url.endsWith("/undefined"));

  if (candidates.length === 0) return fallback;

  // Ưu tiên ảnh poster dọc
  for (const c of candidates) {
    const l = c.toLowerCase();
    if (l.includes("poster_") || l.includes("/poster") || l.includes("-poster") || l.includes("/w500") || l.includes("/w300")) {
      return c;
    }
  }
  return candidates[0];
}

export function pickBestMovieThumb(movie: MovieLike, fallback = "/default-hero.svg"): string {
  if (!movie) return fallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = (movie as any)?.movie || movie;
  const isVsmov = isVsmovSource(movie);

  // VSMOV đảo ngược trường: poster_url là backdrop ngang (16:9), thumb_url là poster dọc (2:3)
  const primary = isVsmov
    ? rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl
    : rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl;

  const secondary = isVsmov
    ? rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl
    : rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl;

  const candidates = [primary, secondary, movie.imageUrl]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(sanitizeImageUrl)
    .filter((url) => Boolean(url) && !url.endsWith("/null") && !url.endsWith("/undefined"));

  if (candidates.length === 0) return fallback;

  // Ưu tiên ảnh thumb ngang / backdrop
  for (const c of candidates) {
    const l = c.toLowerCase();
    if (l.includes("thumb_") || l.includes("/thumb") || l.includes("-thumb") || l.includes("backdrop") || l.includes("w780") || l.includes("w1280") || l.includes("w500")) {
      return c;
    }
  }
  return candidates[0];
}

/**
 * Tối ưu ảnh cho Thẻ phim 16:9 trong danh sách (CuratedMovieSection / MediaCard).
 * Dùng TMDb w500 (~35KB) thay vì w1280 (1.5MB - 2.5MB), tăng tốc độ tải gấp 30 lần!
 */
export function toOptimizedCardBackdropUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let clean = sanitizeImageUrl(url);
  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w1280|original|w780)\//, "/t/p/w500/");
  }
  return clean;
}

/**
 * Dành riêng cho Banner Hero cỡ lớn toàn màn hình trên đầu trang
 */
export function toHighResBackdropUrl(url: string): string {
  if (!url || typeof url !== "string") return "";
  let clean = sanitizeImageUrl(url);
  // Nếu là ảnh từ TMDb (hoặc VSMOV đã chuyển sang TMDb CDN), nâng cấp lên w1280 (HD) sắc nét chuẩn màn hình lớn
  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w500|w780|w300)\//, "/t/p/w1280/");
  }
  return clean;
}

export function pickHeroBackdropImage(movie: MovieLike, fallback = "/default-hero.jpg"): string {
  if (!movie) return fallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = (movie as any)?.movie || movie;
  const isVsmov = isVsmovSource(movie);

  // VSMOV đảo ngược: poster_url là backdrop 16:9, thumb_url là poster dọc 2:3
  const primary = isVsmov
    ? rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl
    : rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl;

  const secondary = isVsmov
    ? rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl
    : rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl;

  const candidates = [
    rawMovie.backdrop_url,
    rawMovie.backdropUrl,
    movie.backdrop_url,
    movie.backdropUrl,
    primary,
    secondary,
    movie.imageUrl,
    rawMovie.imageUrl,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(toHighResBackdropUrl)
    .filter((url) => Boolean(url) && !url.endsWith("/null") && !url.endsWith("/undefined"));

  if (candidates.length === 0) return fallback;

  // 1. Tuyệt đối ưu tiên ảnh ngang (backdrop / thumb / w1280) không chứa từ khóa poster dọc
  for (const c of candidates) {
    const l = c.toLowerCase();
    const isExplicitPoster = l.includes("-poster.") || l.includes("_poster.") || l.includes("/poster/") || l.includes("poster_");
    if (!isExplicitPoster) {
      if (l.includes("thumb_") || l.includes("/thumb") || l.includes("-thumb") || l.includes("backdrop") || l.includes("w1280") || l.includes("w780")) {
        return c;
      }
    }
  }

  // 2. Nếu không có thumb chuyên dụng, chọn bất kỳ ứng viên nào không phải là poster dọc
  for (const c of candidates) {
    const l = c.toLowerCase();
    if (!l.includes("-poster.") && !l.includes("_poster.") && !l.includes("/poster/") && !l.includes("poster_")) {
      return c;
    }
  }

  return candidates[0];
}

export function pickBestMovieImage(movie: MovieLike, fallback: string) {
  return pickBestMovieThumb(movie, fallback);
}

export function buildMovieDescriptionFallback(movie: {
  origin_name?: string;
  year?: string | number;
  time?: string | number;
  lang?: string;
  quality?: string;
  category?: Array<{ name?: string }>;
  country?: Array<{ name?: string }>;
  director?: string[];
  actor?: string[];
}) {
  const parts: string[] = [];
  if (movie.origin_name) parts.push(`Tên gốc: ${movie.origin_name}.`);
  const meta = [
    movie.year ? `${movie.year}` : null,
    movie.time ? `${movie.time} phút` : null,
    movie.lang || null,
    movie.quality || null,
  ]
    .filter(Boolean)
    .join(" • ");
  if (meta) parts.push(meta);

  const genres =
    movie.category
      ?.map((item) => item.name)
      .filter(Boolean)
      .join(", ") || "";
  if (genres) parts.push(`Thể loại: ${genres}.`);

  const countries =
    movie.country
      ?.map((item) => item.name)
      .filter(Boolean)
      .join(", ") || "";
  if (countries) parts.push(`Quốc gia: ${countries}.`);

  const directors =
    movie.director?.filter(Boolean).slice(0, 2).join(", ") || "";
  if (directors) parts.push(`Đạo diễn: ${directors}.`);

  return parts.join(" ").trim();
}

export interface NormalizedMovie {
  slug: string;
  title: string;
  origin_name?: string;
  imageUrl: string;
  posterUrl: string;
  thumbUrl: string;
  year: string;
  time?: string;
  quality: string;
  genre: string;
  description: string;
  score: string;
  isTrailerOnly: boolean;
  trailer_url?: string;
  hasTrailer: boolean;
  lang?: string;
  chieurap?: boolean;
  sub_docquyen?: boolean;
  actor?: string[];
  director?: string[];
  country?: string;
  type_name?: string;
  matchSnippet?: string;
  matchType?: "title" | "actor" | "content";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

const KNOWN_COUNTRIES = [
  "Hàn Quốc",
  "Trung Quốc",
  "Mỹ",
  "Âu Mỹ",
  "Nhật Bản",
  "Thái Lan",
  "Việt Nam",
  "Đài Loan",
  "Ấn Độ",
  "Hồng Kông",
  "Anh",
  "Pháp",
  "Tây Ban Nha",
  "Thổ Nhĩ Kỳ",
  "Đức",
  "Ý",
  "Nga",
  "Canada",
  "Úc",
  "Philippines",
  "Indonesia",
  "Malaysia",
  "Singapore",
  "Mexico",
  "Brazil",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieCountry(m: any): string | undefined {
  if (!m) return undefined;

  // 1. Array of objects or strings: m.country or m.countries
  const countryList = m.country || m.countries;
  if (Array.isArray(countryList) && countryList.length > 0) {
    const first = countryList[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (first && typeof first === "object" && first.name) return String(first.name).trim();
  }
  if (typeof countryList === "string" && countryList.trim()) {
    return countryList.trim();
  }

  // 2. Direct string fields
  if (m.country_name && typeof m.country_name === "string") return m.country_name.trim();
  if (m.countryName && typeof m.countryName === "string") return m.countryName.trim();

  // 3. Check categories for country tags
  const catList = m.category || m.categories;
  if (Array.isArray(catList)) {
    for (const cat of catList) {
      const catName = (typeof cat === "string" ? cat : cat?.name || "").trim();
      for (const kc of KNOWN_COUNTRIES) {
        if (catName.toLowerCase().includes(kc.toLowerCase())) {
          return kc;
        }
      }
    }
  }

  // 4. Check origin_name or title for language/script clues
  const origin = String(m.origin_name || "");
  if (/[\uac00-\ud7a3]/.test(origin)) return "Hàn Quốc";
  if (/[\u3040-\u30ff]/.test(origin)) return "Nhật Bản";

  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectMovieTypeName(m: any): string {
  if (!m) return "Phim lẻ";

  const rawType = String(m?.type || m?.type_name || m?.type_slug || "").toLowerCase().trim();
  const rawName = String(m?.name || m?.title || m?.origin_name || "").toLowerCase();
  const rawSlug = String(m?.slug || "").toLowerCase();
  const timeStr = String(m?.time || "").toLowerCase();
  const epCurrent = String(m?.episode_current || "").toLowerCase();
  const epTotal = Number(m?.episode_total || 0);

  const categories = Array.isArray(m?.category)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? m.category.map((c: any) => (typeof c === "string" ? c : `${c?.slug || ""} ${c?.name || ""}`).toLowerCase())
    : [String(m?.category || "").toLowerCase()];

  const isHoatHinh =
    rawType === "hoathinh" ||
    rawType === "hoat-hinh" ||
    rawType === "anime" ||
    categories.some((c: string) => c.includes("hoat-hinh") || c.includes("hoạt hình") || c.includes("anime"));

  const isTvShows =
    rawType === "tvshows" ||
    rawType === "tv-shows" ||
    categories.some((c: string) => c.includes("tv-shows") || c.includes("tv shows") || c.includes("show"));

  const isChieuRap = Boolean(
    m?.chieurap === true ||
      m?.chieurap === "true" ||
      m?.chieurap === 1 ||
      m?.chieu_rap === true ||
      categories.some((c: string) => c.includes("chieu-rap") || c.includes("chiếu rạp"))
  );

  // Nhận diện phim bộ nhiều tập chuẩn xác tuyệt đối:
  // 1. Phim có từ khóa phần/tập/season trong tiêu đề hoặc slug (ví dụ: "Tây Du Ký - Phần 1", "Tây Du Ký (Phần 2)", "-phan-1", "-phan-2", "Season 2")
  const hasSeriesKeywordsInTitle =
    /phần\s*\d+|phần\s*[ivx]+|season\s*\d+|ss\s*\d+|\btập\s*\d+/i.test(rawName) ||
    /-phan-\d+|-phan-[ivx]+|-season-\d+|-tap-\d+/i.test(rawSlug);

  // 2. Định dạng tập trong episode_current (ví dụ: "Hoàn Tất (16/16)", "Tập 25", "25/25", "45 phút/tập")
  const hasEpCountPattern =
    /\(\d+\/\d+\)|\d+\/\d+|\btập\s*\d+/i.test(epCurrent) ||
    timeStr.includes("/tập") ||
    timeStr.includes("phút/tập");

  const isPhimBo =
    rawType === "series" ||
    rawType === "phim-bo" ||
    rawType === "tv" ||
    rawType.includes("bộ") ||
    epTotal > 1 ||
    hasEpCountPattern ||
    hasSeriesKeywordsInTitle ||
    categories.some(
      (c: string) =>
        c.includes("phim-bo") ||
        c.includes("phim bộ") ||
        c.includes("truyền hình") ||
        c.includes("series") ||
        c.includes("drama")
    );

  if (isHoatHinh) return "Hoạt hình";
  if (isTvShows) return "TV Shows";
  if (isPhimBo) return "Phim bộ";
  if (isChieuRap) return "Phim rạp";

  return "Phim lẻ";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeMovie(m: any): NormalizedMovie {
  const title = m?.name || m?.title || "Phim";
  const origin_name = m?.origin_name || undefined;
  let posterUrl = pickBestMoviePoster(m, "");
  let thumbUrl = pickBestMovieThumb(m, "");

  if (!thumbUrl && posterUrl) thumbUrl = posterUrl;
  if (!posterUrl && thumbUrl) posterUrl = thumbUrl;
  if (!thumbUrl) thumbUrl = "/default-hero.svg";
  if (!posterUrl) posterUrl = "/default-poster.svg";

  const imageUrl = posterUrl;
  const year = m?.year ? String(m.year) : "";
  const quality = m?.quality || "FHD";
  const time = m?.time || m?.episode_current || undefined;
  const genre =
    m?.category?.[0]?.name ||
    (Array.isArray(m?.genre) ? m.genre.join(", ") : m?.genre) ||
    "";
  const isTrailerOnly =
    m?.status === "trailer" || m?.episode_current === "Trailer";

  const chieurap = Boolean(
    m?.chieurap === true ||
      m?.chieurap === "true" ||
      m?.chieurap === 1 ||
      m?.chieu_rap === true
  );
  const sub_docquyen = Boolean(
    m?.sub_docquyen === true ||
      m?.sub_docquyen === "true" ||
      m?.sub_docquyen === 1 ||
      m?.doc_quyen === true
  );

  const type_name = detectMovieTypeName(m);

  const ratingRaw =
    m?.imdb?.rating ??
    m?.imdb?.vote_average ??
    m?.tmdb?.vote_average ??
    m?.vote_average ??
    m?.rating;
  const score =
    ratingRaw !== undefined && ratingRaw !== null && ratingRaw !== ""
      ? Number(ratingRaw).toFixed(1)
      : "N/A";

  // Bóc tách diễn viên nếu có trong raw object
  let actor: string[] | undefined;
  if (Array.isArray(m?.actor)) {
    actor = m.actor.map(String).map((s: string) => s.trim()).filter(Boolean);
  } else if (typeof m?.actor === "string" && m.actor) {
    actor = m.actor.split(",").map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(m?.casts)) {
    actor = m.casts.map(String).map((s: string) => s.trim()).filter(Boolean);
  }

  // Bóc tách đạo diễn
  let director: string[] | undefined;
  if (Array.isArray(m?.director)) {
    director = m.director.map(String).map((s: string) => s.trim()).filter(Boolean);
  } else if (typeof m?.director === "string" && m.director) {
    director = m.director.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  const country = extractMovieCountry(m);

  const cleanedDesc = cleanHtmlText(m?.content || m?.description || "");
  const description =
    cleanedDesc ||
    buildMovieDescriptionFallback({
      origin_name: m?.origin_name,
      year: m?.year,
      time: m?.time,
      lang: m?.lang,
      quality: m?.quality,
      category: m?.category,
      country: m?.country,
      director: m?.director,
      actor,
    }) ||
    "";

  const trailer_url: string | undefined =
    m?.trailer_url || m?.trailer || m?.movie?.trailer_url || undefined;
  const hasTrailer = Boolean(
    trailer_url || isTrailerOnly || m?.hasTrailer || (typeof trailer_url === "string" && trailer_url.length > 0)
  );

  return {
    slug: m?.slug || "",
    title,
    origin_name,
    imageUrl,
    posterUrl,
    thumbUrl,
    year,
    time,
    quality,
    genre,
    description,
    score,
    isTrailerOnly,
    trailer_url,
    hasTrailer,
    lang: m?.lang,
    chieurap,
    sub_docquyen,
    actor,
    director,
    country,
    type_name,
    matchSnippet: m?.matchSnippet,
    matchType: m?.matchType,
    raw: m,
  };
}
