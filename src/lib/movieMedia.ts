type MovieLike = {
  poster_url?: unknown;
  thumb_url?: unknown;
  imageUrl?: unknown;
  [key: string]: unknown;
};

function scoreImageUrl(url?: unknown): number {
  if (typeof url !== "string" || !url) return -1;
  const lower = url.toLowerCase();
  let score = 0;

  // Ưu tiên ảnh ngang (thumb) để khớp với khung aspect-video
  if (lower.includes("thumb_")) score += 4;
  if (lower.includes("/thumb")) score += 3;
  if (lower.includes("backdrop")) score += 4;

  // Trừ điểm ảnh dọc (poster) để tránh bị cắt xén khung hình
  if (lower.includes("poster_")) score -= 2;
  if (lower.includes("/poster")) score -= 1;

  if (lower.includes("w780") || lower.includes("w1280")) score += 2;
  return score;
}

function sanitizeImageUrl(url: string): string {
  if (!url) return url;
  // Sửa lỗi url có 2 dấu gạch chéo // sau tên miền (gây redirect chậm)
  let clean = url.replace(/(https?:\/\/)([^/]+)\/\/+/g, "$1$2/");
  // Tối ưu ảnh TMDB original / w780 sang w500 để tải nhanh gấp nhiều lần, tốn ít băng thông
  if (clean.includes("image.tmdb.org/t/p/original/")) {
    clean = clean.replace("/t/p/original/", "/t/p/w500/");
  } else if (clean.includes("image.tmdb.org/t/p/w780/")) {
    clean = clean.replace("/t/p/w780/", "/t/p/w500/");
  }
  return clean;
}

export function pickBestMovieImage(movie: MovieLike, fallback: string) {
  const candidates = [movie.poster_url, movie.thumb_url, movie.imageUrl]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map(sanitizeImageUrl);
  if (candidates.length === 0) return fallback;

  let best = candidates[0];
  let bestScore = scoreImageUrl(best);
  for (const candidate of candidates.slice(1)) {
    const score = scoreImageUrl(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
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
  const imageUrl = pickBestMovieImage(m, "/default-poster.jpg");
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
