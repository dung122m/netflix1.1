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

  // Tối ưu ảnh VSMOV: VSMOV lưu ảnh thô 4K (1.6MB - 3MB/ảnh) từ TMDb mà không qua CDN/nén.
  // Chuyển trực tiếp sang CDN toàn cầu Cloudflare của TMDb (w500) giúp dung lượng giảm từ 1.6MB xuống ~25KB (giảm 98%) và load tức thì!
  const vsmovMatch = clean.match(/https?:\/\/vsmov\.com\/storage\/images\/([a-zA-Z0-9_-]{20,}\.(?:jpg|jpeg|png|webp))/i);
  if (vsmovMatch) {
    clean = `https://image.tmdb.org/t/p/w500/${vsmovMatch[1]}`;
  }

  // Tối ưu ảnh TMDB original / w780 sang w500 để tải nhanh gấp nhiều lần, tốn ít băng thông
  if (clean.includes("image.tmdb.org/t/p/original/")) {
    clean = clean.replace("/t/p/original/", "/t/p/w500/");
  } else if (clean.includes("image.tmdb.org/t/p/w780/")) {
    clean = clean.replace("/t/p/w780/", "/t/p/w500/");
  }
  return clean;
}

export function isVsmovSource(movie: MovieLike): boolean {
  if (!movie) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (movie as any)?.movie || movie;
  const p = String(raw.poster_url || raw.posterUrl || "");
  const t = String(raw.thumb_url || raw.thumbUrl || "");
  return (
    p.includes("vsmov.com") ||
    t.includes("vsmov.com") ||
    (raw._id !== undefined && typeof raw._id === "number")
  );
}

export function pickBestMoviePoster(movie: MovieLike, fallback = "/default-poster.jpg"): string {
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

export function pickBestMovieThumb(movie: MovieLike, fallback = "/default-hero.jpg"): string {
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
    if (l.includes("thumb_") || l.includes("/thumb") || l.includes("-thumb") || l.includes("backdrop") || l.includes("w780") || l.includes("w1280")) {
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
export function normalizeMovie(m: any): NormalizedMovie {
  const title = m?.name || m?.title || "Phim";
  const origin_name = m?.origin_name || undefined;
  let posterUrl = pickBestMoviePoster(m, "");
  let thumbUrl = pickBestMovieThumb(m, "");

  if (!thumbUrl && posterUrl) thumbUrl = posterUrl;
  if (!posterUrl && thumbUrl) posterUrl = thumbUrl;
  if (!thumbUrl) thumbUrl = "/default-hero.jpg";
  if (!posterUrl) posterUrl = "/default-poster.jpg";

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

  const rawType = String(m?.type || "").toLowerCase();
  let type_name = "Phim lẻ";
  if (rawType === "series" || rawType === "phim-bo" || (m?.episode_total && Number(m?.episode_total) > 1)) {
    type_name = "Phim bộ";
  } else if (rawType === "hoathinh" || rawType === "hoat-hinh") {
    type_name = "Hoạt hình";
  } else if (rawType === "tvshows" || rawType === "tv-shows") {
    type_name = "TV Shows";
  } else if (chieurap) {
    type_name = "Phim rạp";
  } else if (
    (m?.time && String(m.time).toLowerCase().includes("tập")) ||
    (m?.episode_current && String(m.episode_current).toLowerCase().includes("tập"))
  ) {
    type_name = "Phim bộ";
  }

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

  const cleanedDesc = String(m?.content || m?.description || "")
    .replace(/<[^>]*>/g, "")
    .trim();
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
    raw: m,
  };
}
