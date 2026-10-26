import { cleanHtmlText } from "@/lib/cleanHtml";

export type MovieLike = {
  poster_url?: unknown;
  thumb_url?: unknown;
  imageUrl?: unknown;
  [key: string]: unknown;
};

/**
 * Trích xuất và chuẩn hóa điểm đánh giá thống nhất từ TMDB / IMDb / internal score.
 * - Trả về rating trong khoảng (0, 10] và voteCount >= 0.
 * - Điểm không hợp lệ, null, NaN hoặc <= 0 trả về 0 (không tự gán điểm cao).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieRatingScore(m: any): { rating: number; voteCount: number } {
  if (!m) return { rating: 0, voteCount: 0 };
  const rawRating =
    m.tmdb?.vote_average ??
    m.imdb?.vote_average ??
    m.imdb?.rating ??
    m.vote_average ??
    m.score ??
    m.rating;
  const parsedRating = typeof rawRating === "string" ? parseFloat(rawRating) : Number(rawRating);
  const rating = Number.isFinite(parsedRating) && parsedRating > 0 && parsedRating <= 10 ? parsedRating : 0;

  const rawVoteCount = m.tmdb?.vote_count ?? m.imdb?.vote_count ?? 0;
  const parsedVoteCount = typeof rawVoteCount === "string" ? parseInt(rawVoteCount, 10) : Number(rawVoteCount);
  const voteCount = Number.isFinite(parsedVoteCount) && parsedVoteCount > 0 ? parsedVoteCount : 0;

  return { rating, voteCount };
}

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

  // Tối ưu ảnh VSMOV / NguonC: Chỉ chuyển sang TMDb CDN nếu filename là mã hash TMDb hợp lệ (chuỗi alphanumeric 22-35 ký tự, KHÔNG chứa dấu gạch nối hoặc từ ngữ tùy chỉnh)
  const vsmovMatch = clean.match(
    /https?:\/\/(?:vsmov\.com\/storage\/images|phim\.nguonc\.com\/public\/images\/Film)\/([a-zA-Z0-9]{22,35}\.(?:jpg|jpeg|png|webp))$/i
  );
  if (vsmovMatch && !vsmovMatch[1].includes("-") && !vsmovMatch[1].includes("_")) {
    clean = `https://image.tmdb.org/t/p/w500/${vsmovMatch[1]}`;
  }

  // Tối ưu ảnh TMDB: Dùng w780 (chuẩn HD cho màn hình Retina 2x & màn hình lớn), giữ nguyên độ nét mà nén chỉ ~45KB
  if (clean.includes("image.tmdb.org/t/p/original/")) {
    clean = clean.replace("/t/p/original/", "/t/p/w780/");
  } else if (clean.includes("image.tmdb.org/t/p/w1280/")) {
    clean = clean.replace("/t/p/w1280/", "/t/p/w780/");
  }

  // Tối ưu ảnh IMDb: Amazon CloudFront CDN cho phép resize tự động bằng URL slug
  // Dùng _UX720_ chuẩn HD sắc sảo từng nét chữ trên cả màn hình Retina 2x/4K, nén chỉ ~35KB
  if (clean.includes("media-amazon.com/images/M/")) {
    clean = clean.replace(/_V1_.*(\.(?:jpg|jpeg|png|webp))$/i, "_V1_QL85_UX720_$1");
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
  const isVsmov = isNguonCSource(movie);

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

  // 1. Ưu tiên tuyệt đối ảnh poster dọc rõ ràng (keyword poster, NguonC /Post/, hoặc TMDB w500/w300)
  for (const c of candidates) {
    const l = c.toLowerCase();
    if (
      l.includes("poster_") ||
      l.includes("/poster") ||
      l.includes("-poster") ||
      l.includes("/w500") ||
      l.includes("/w300") ||
      l.includes("/post/") ||
      l.includes("_ux")
    ) {
      return c;
    }
  }

  // 2. Nếu candidate có dạng -thumb.webp từ phimimg, tự động phái sinh sang -poster.webp (chuẩn tỷ lệ 2:3)
  for (const c of candidates) {
    if (c.includes("-thumb.webp")) {
      return c.replace("-thumb.webp", "-poster.webp");
    }
  }

  // 3. Loại trừ các candidate là thumbnail/backdrop ngang rõ ràng nếu còn candidate khác
  for (const c of candidates) {
    const l = c.toLowerCase();
    const isExplicitThumb =
      l.includes("thumb_") ||
      l.includes("/thumb") ||
      l.includes("-thumb") ||
      l.includes("backdrop") ||
      l.includes("banner");
    if (!isExplicitThumb) {
      return c;
    }
  }

  return candidates[0];
}

export function pickBestMovieThumb(movie: MovieLike, fallback = "/default-hero.svg"): string {
  if (!movie) return fallback;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMovie = (movie as any)?.movie || movie;
  const isVsmov = isNguonCSource(movie);

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

  // 1. Ưu tiên tuyệt đối ảnh thumb ngang / backdrop (chứa keyword thumb, backdrop, banner, w780, w1280)
  for (const c of candidates) {
    const l = c.toLowerCase();
    if (
      l.includes("thumb_") ||
      l.includes("/thumb") ||
      l.includes("-thumb") ||
      l.includes("backdrop") ||
      l.includes("banner") ||
      l.includes("w780") ||
      l.includes("w1280") ||
      l.includes("w500")
    ) {
      return c;
    }
  }

  // 2. Trả về candidate hợp lệ sẵn có (poster dọc 2:3 với object-cover vẫn hiển thị đẹp hơn là tự chế link thumb bị 404)
  for (const c of candidates) {
    if (!c.includes("/default-") && !c.includes("null") && !c.includes("undefined")) {
      return c;
    }
  }

  return candidates[0] || fallback;
}

export const ALLOWED_PROXY_WIDTHS = [192, 320, 480, 640, 1280] as const;
export type OptimizedProxyWidth = (typeof ALLOWED_PROXY_WIDTHS)[number];

/**
 * Tối ưu ảnh từ nguồn phimimg.com qua internal image proxy (/api/img-thumb).
 * CHỈ rewrite các ảnh thực sự nặng chưa có biến thể nhỏ:
 * 1. /upload/vod/ (JPEG gốc 1-3MB)
 * 2. /uploads/movies/...-poster.webp (Poster dọc 2000x3000 ~900KB)
 *
 * KHÔNG rewrite:
 * - ...-thumb.webp (ảnh thumb đã tối ưu sẵn ~25-46KB)
 * - TMDB, IMDb, hoặc ảnh local (/default-...)
 * - URL đã được bọc /api/img-thumb
 */
export function toOptimizedPhimimgUrl(
  url: string,
  targetWidth: number | OptimizedProxyWidth = 320
): string {
  if (!url || typeof url !== "string") return "";
  const clean = sanitizeImageUrl(url);
  if (!clean) return "";

  // Bỏ qua ảnh local, ảnh TMDB/IMDb hoặc đã là URL proxy
  if (
    clean.startsWith("/api/img-thumb") ||
    clean.startsWith("/default-") ||
    clean.startsWith("/images/") ||
    clean.includes("image.tmdb.org") ||
    clean.includes("media-amazon.com")
  ) {
    return clean;
  }

  if (clean.includes("phimimg.com")) {
    // 0. Ảnh đã là thumbnail WebP tối ưu sẵn của phimimg.com (~25-45KB): Dùng trực tiếp từ CDN
    if (clean.includes("-thumb.webp")) {
      return clean;
    }

    const w = typeof targetWidth === "number" && targetWidth <= 192
      ? 192
      : typeof targetWidth === "number" && targetWidth <= 320
      ? 320
      : typeof targetWidth === "number" && targetWidth <= 480
      ? 480
      : typeof targetWidth === "number" && targetWidth <= 640
      ? 640
      : 320;

    // Route qua proxy để nén và resize chuẩn xác an toàn
    return `/api/img-thumb?url=${encodeURIComponent(clean)}&w=${w}`;
  }

  return clean;
}

/**
 * Tối ưu ảnh cho Thẻ phim 16:9 trong danh sách (CuratedMovieSection / MediaCard).
 * - TMDb: Dùng TMDb w780 (~45KB) cho độ sắc nét Retina 2x/4K, tải siêu nhanh và không bị mờ.
 * - Phimimg: Dùng proxy an toàn nén thành WebP nhẹ và chuẩn kích thước.
 */
export function toOptimizedCardBackdropUrl(url: string, targetWidth: number = 320): string {
  if (!url || typeof url !== "string") return "";
  let clean = sanitizeImageUrl(url);
  if (!clean) return "";

  // Bỏ qua ảnh local, proxy
  if (
    clean.startsWith("/api/img-thumb") ||
    clean.startsWith("/default-") ||
    clean.startsWith("/images/")
  ) {
    return clean;
  }

  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w1280|original)\//, "/t/p/w780/");
    return clean;
  }

  if (clean.includes("phimimg.com")) {
    // 1. Nếu đã là -thumb.webp: Dùng trực tiếp an toàn từ CDN
    if (clean.includes("-thumb.webp")) {
      return clean;
    }
    const w = targetWidth <= 192 ? 192 : targetWidth <= 320 ? 320 : targetWidth <= 480 ? 480 : 640;
    return `/api/img-thumb?url=${encodeURIComponent(clean)}&w=${w}`;
  }

  return clean;
}

/**
 * Tối ưu ảnh cho Thẻ phim dọc 2:3 trên mobile (MediaCard / Mobile Grid).
 * - TMDb: Dùng TMDb w500 chuẩn tỷ lệ poster 2:3 sắc nét.
 * - Phimimg: Tự động đổi -thumb.webp thành -poster.webp (chuẩn tỷ lệ 2:3).
 */
export function toOptimizedCardPosterUrl(url: string, targetWidth: number = 320): string {
  if (!url || typeof url !== "string") return "";
  let clean = sanitizeImageUrl(url);
  if (!clean) return "";

  if (
    clean.startsWith("/api/img-thumb") ||
    clean.startsWith("/default-") ||
    clean.startsWith("/images/")
  ) {
    return clean;
  }

  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w1280|original|w780)\//, "/t/p/w500/");
    return clean;
  }

  if (clean.includes("phimimg.com")) {
    // Nếu có dạng -thumb.webp, chuyển sang -poster.webp để lấy poster dọc 2:3 chuẩn
    if (clean.includes("-thumb.webp")) {
      clean = clean.replace("-thumb.webp", "-poster.webp");
    }
    if (clean.includes("-poster.webp")) {
      return clean;
    }
    const w = targetWidth <= 192 ? 192 : targetWidth <= 320 ? 320 : targetWidth <= 480 ? 480 : 640;
    return `/api/img-thumb?url=${encodeURIComponent(clean)}&w=${w}`;
  }

  return clean;
}

/**
 * Dành riêng cho Banner Hero cỡ lớn toàn màn hình trên đầu trang.
 * Ưu tiên độ phân giải gốc cực cao (original / w1280) cho màn hình lớn & Retina 2x/4K.
 */
export function toHighResBackdropUrl(url: string, targetWidth: "w780" | "w1280" = "w1280"): string {
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

  // 1. Nhận diện trực tiếp mã hash TMDb từ VSMOV hoặc NguonC -> Chuyển sang TMDb targetWidth (mặc định w1280, mobile w780)
  const tmdbHashMatch = clean.match(
    /https?:\/\/(?:vsmov\.com\/storage\/images|phim\.nguonc\.com\/public\/images\/Film)\/([a-zA-Z0-9]{22,35}\.(?:jpg|jpeg|png|webp))$/i
  );
  if (tmdbHashMatch && !tmdbHashMatch[1].includes("-") && !tmdbHashMatch[1].includes("_")) {
    return `https://image.tmdb.org/t/p/${targetWidth}/${tmdbHashMatch[1]}`;
  }

  // 2. Nhận diện đường dẫn tương đối TMDb (vd: /jUiZOFbC9MjQV3gzi9nn7AsQ4Ea.jpg)
  if (/^\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(clean)) {
    return `https://image.tmdb.org/t/p/${targetWidth}${clean}`;
  }

  // 3. Chuẩn hóa qua sanitizeImageUrl
  clean = sanitizeImageUrl(url);

  // 4. Nếu là ảnh TMDb, chuyển về targetWidth (w1280 cho desktop, w780 cho mobile) thay vì original để tránh làm nghẽn LCP
  if (clean.includes("image.tmdb.org/t/p/")) {
    clean = clean.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${targetWidth}/`);
  }

  return clean;
}

export function pickHeroBackdropImage(
  movie: MovieLike,
  fallback = "/default-hero.jpg",
  targetWidth: "w780" | "w1280" = "w1280"
): string {
  if (!movie) return fallback;
  const rawMovie = ((movie as Record<string, unknown>)?.movie as MovieLike) || movie;
  const isVsmov = isNguonCSource(movie);

  // VSMOV / NguonC đảo ngược: poster_url là backdrop 16:9, thumb_url là poster dọc 2:3
  const primary = isVsmov
    ? rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl
    : rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl;

  const secondary = isVsmov
    ? rawMovie.thumb_url || rawMovie.thumbUrl || movie.thumb_url || movie.thumbUrl
    : rawMovie.poster_url || rawMovie.posterUrl || movie.poster_url || movie.posterUrl;

  // Thu thập các trường backdrop chuyên dụng độ phân giải cao
  const backdropFields = [
    rawMovie.backdrop_url,
    rawMovie.backdropUrl,
    movie.backdrop_url,
    movie.backdropUrl,
    (rawMovie.tmdb as Record<string, unknown> | undefined)?.backdrop_url,
    (movie.tmdb as Record<string, unknown> | undefined)?.backdrop_url,
    rawMovie.banner_url,
    rawMovie.bannerUrl,
    movie.banner_url,
    movie.bannerUrl,
    rawMovie.backdrop_path,
    movie.backdrop_path,
    rawMovie.backdropPath,
    movie.backdropPath,
    (rawMovie.tmdb as Record<string, unknown> | undefined)?.backdrop_path,
    (movie.tmdb as Record<string, unknown> | undefined)?.backdrop_path,
  ];

  const rawCandidates = [
    ...backdropFields,
    primary,
    secondary,
    movie.imageUrl,
    rawMovie.imageUrl,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  const candidates = rawCandidates
    .map((u) => toHighResBackdropUrl(u, targetWidth))
    .filter((url) => Boolean(url) && !url.endsWith("/null") && !url.endsWith("/undefined"));

  if (candidates.length === 0) return fallback;

  const isPoster = (url: string) => {
    const l = url.toLowerCase();
    return (
      l.includes("-poster.") ||
      l.includes("_poster.") ||
      l.includes("/poster/") ||
      l.includes("poster_") ||
      l.includes("thumb-360x504")
    );
  };

  const isLowResThumb = (url: string) => {
    const l = url.toLowerCase();
    return l.includes("-thumb.webp") || l.includes("/thumb.webp") || l.endsWith("thumb.webp");
  };

  // 1. Ưu tiên tuyệt đối backdrop TMDb w1280 (hoặc w780 cho mobile)
  for (const c of candidates) {
    if (!isPoster(c)) {
      const l = c.toLowerCase();
      if (l.includes("image.tmdb.org/t/p/w1280") || l.includes("image.tmdb.org/t/p/w780")) {
        return c;
      }
    }
  }

  // 2. TMDb w1920 (chỉ dùng nếu w1280 không tồn tại/không khả dụng)
  for (const c of candidates) {
    if (!isPoster(c)) {
      const l = c.toLowerCase();
      if (l.includes("image.tmdb.org/t/p/w1920")) {
        return c;
      }
    }
  }

  // 3. Ảnh backdrop chuyên dụng hoặc banner chất lượng cao (không phải poster, không phải thumb.webp)
  for (const c of candidates) {
    if (!isPoster(c) && !isLowResThumb(c)) {
      const l = c.toLowerCase();
      if (l.includes("backdrop") || l.includes("banner") || l.includes("image.tmdb.org")) {
        return c;
      }
    }
  }

  // 4. Ảnh ngang chất lượng cao khác (vd: NguonC Post 16:9, ảnh JPG/PNG không phải poster và không phải thumb.webp)
  for (const c of candidates) {
    if (!isPoster(c) && !isLowResThumb(c)) {
      return c;
    }
  }

  // Tuyệt đối không dùng poster dọc hoặc thumb.webp độ phân giải thấp gây mờ cho Hero -> fallback an toàn
  return fallback;
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

  const cleanTime = movie.time
    ? String(movie.time).trim().replace(/phút\/tập\s*phút/gi, "phút/tập").replace(/phút\s*phút/gi, "phút")
    : null;
  const formattedTime = cleanTime
    ? cleanTime.toLowerCase().includes("phút") || cleanTime.toLowerCase().includes("h")
      ? cleanTime
      : `${cleanTime} phút`
    : null;

  const meta = [
    movie.year ? `${movie.year}` : null,
    formattedTime,
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
  categories?: Array<{ name: string; slug?: string }>;
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

// Bảng ánh xạ toàn diện mã quốc gia ISO, slug API (viet-nam, trung-quoc...) và tên thông dụng sang tiếng Việt chuẩn có dấu
export const COUNTRY_DISPLAY_MAP: Record<string, string> = {
  // Việt Nam
  "viet-nam": "Việt Nam",
  "vietnam": "Việt Nam",
  "viet nam": "Việt Nam",
  "việt nam": "Việt Nam",
  vn: "Việt Nam",
  vnm: "Việt Nam",

  // Trung Quốc
  "trung-quoc": "Trung Quốc",
  "trung quoc": "Trung Quốc",
  "trung quốc": "Trung Quốc",
  china: "Trung Quốc",
  cn: "Trung Quốc",
  chn: "Trung Quốc",

  // Hàn Quốc
  "han-quoc": "Hàn Quốc",
  "han quoc": "Hàn Quốc",
  "hàn quốc": "Hàn Quốc",
  korea: "Hàn Quốc",
  "south korea": "Hàn Quốc",
  "south-korea": "Hàn Quốc",
  kr: "Hàn Quốc",
  kor: "Hàn Quốc",

  // Nhật Bản
  "nhat-ban": "Nhật Bản",
  "nhat ban": "Nhật Bản",
  "nhật bản": "Nhật Bản",
  japan: "Nhật Bản",
  jp: "Nhật Bản",
  jpn: "Nhật Bản",

  // Mỹ / Hoa Kỳ
  my: "Mỹ",
  mỹ: "Mỹ",
  "hoa-ky": "Mỹ",
  "hoa ky": "Mỹ",
  "hoa kỳ": "Mỹ",
  "hợp chúng quốc hoa kỳ": "Mỹ",
  "united states": "Mỹ",
  "united-states": "Mỹ",
  us: "Mỹ",
  usa: "Mỹ",

  // Âu Mỹ
  "au-my": "Âu Mỹ",
  "au my": "Âu Mỹ",
  "âu mỹ": "Âu Mỹ",

  // Thái Lan
  "thai-lan": "Thái Lan",
  "thai lan": "Thái Lan",
  "thái lan": "Thái Lan",
  thailand: "Thái Lan",
  th: "Thái Lan",
  tha: "Thái Lan",

  // Đài Loan
  "dai-loan": "Đài Loan",
  "dai loan": "Đài Loan",
  "đài loan": "Đài Loan",
  taiwan: "Đài Loan",
  tw: "Đài Loan",
  twn: "Đài Loan",

  // Hồng Kông
  "hong-kong": "Hồng Kông",
  "hong kong": "Hồng Kông",
  hongkong: "Hồng Kông",
  "hồng kông": "Hồng Kông",
  hk: "Hồng Kông",
  hkg: "Hồng Kông",

  // Ấn Độ
  "an-do": "Ấn Độ",
  "an do": "Ấn Độ",
  "ấn độ": "Ấn Độ",
  india: "Ấn Độ",
  in: "Ấn Độ",
  ind: "Ấn Độ",

  // Anh / Vương quốc Anh
  anh: "Anh",
  "vuong-quoc-anh": "Anh",
  "vuong quoc anh": "Anh",
  "vương quốc anh": "Anh",
  "united kingdom": "Anh",
  "united-kingdom": "Anh",
  "great britain": "Anh",
  uk: "Anh",
  gb: "Anh",
  gbr: "Anh",

  // Pháp
  phap: "Pháp",
  pháp: "Pháp",
  france: "Pháp",
  fr: "Pháp",
  fra: "Pháp",

  // Canada
  canada: "Canada",
  ca: "Canada",
  can: "Canada",

  // Đức
  duc: "Đức",
  đức: "Đức",
  germany: "Đức",
  de: "Đức",
  deu: "Đức",

  // Tây Ban Nha
  "tay-ban-nha": "Tây Ban Nha",
  "tay ban nha": "Tây Ban Nha",
  "tây ban nha": "Tây Ban Nha",
  spain: "Tây Ban Nha",
  es: "Tây Ban Nha",
  esp: "Tây Ban Nha",

  // Thổ Nhĩ Kỳ
  "tho-nhi-ky": "Thổ Nhĩ Kỳ",
  "tho nhi ky": "Thổ Nhĩ Kỳ",
  "thổ nhĩ kỳ": "Thổ Nhĩ Kỳ",
  turkey: "Thổ Nhĩ Kỳ",
  tr: "Thổ Nhĩ Kỳ",
  tur: "Thổ Nhĩ Kỳ",

  // Nga
  nga: "Nga",
  russia: "Nga",
  ru: "Nga",
  rus: "Nga",

  // Úc
  uc: "Úc",
  úc: "Úc",
  australia: "Úc",
  au: "Úc",
  aus: "Úc",

  // Philippines
  philippines: "Philippines",
  ph: "Philippines",
  phl: "Philippines",

  // Singapore
  singapore: "Singapore",
  sg: "Singapore",
  sgp: "Singapore",

  // Malaysia
  malaysia: "Malaysia",
  mys: "Malaysia",

  // Indonesia
  indonesia: "Indonesia",
  id: "Indonesia",
  idn: "Indonesia",

  // Ý / Italia
  y: "Ý",
  ý: "Ý",
  "y-quoc": "Ý",
  "y quoc": "Ý",
  "ý quốc": "Ý",
  italia: "Ý",
  italy: "Ý",
  it: "Ý",
  ita: "Ý",

  // Mexico
  mexico: "Mexico",
  mx: "Mexico",
  mex: "Mexico",

  // Brazil
  brazil: "Brazil",
  br: "Brazil",
  bra: "Brazil",

  // Hà Lan
  "ha-lan": "Hà Lan",
  "ha lan": "Hà Lan",
  "hà lan": "Hà Lan",
  netherlands: "Hà Lan",
  nl: "Hà Lan",
  nld: "Hà Lan",

  // Thụy Điển
  "thuy-dien": "Thụy Điển",
  "thuy dien": "Thụy Điển",
  "thụy điển": "Thụy Điển",
  sweden: "Thụy Điển",
  se: "Thụy Điển",
  swe: "Thụy Điển",

  // Na Uy
  "na-uy": "Na Uy",
  "na uy": "Na Uy",
  norway: "Na Uy",
  no: "Na Uy",
  nor: "Na Uy",

  // Đan Mạch
  "dan-mach": "Đan Mạch",
  "dan mach": "Đan Mạch",
  "đan mạch": "Đan Mạch",
  denmark: "Đan Mạch",
  dk: "Đan Mạch",
  dnk: "Đan Mạch",

  // Ba Lan
  "ba-lan": "Ba Lan",
  "ba lan": "Ba Lan",
  poland: "Ba Lan",
  pl: "Ba Lan",
  pol: "Ba Lan",

  // Bỉ
  bi: "Bỉ",
  bỉ: "Bỉ",
  belgium: "Bỉ",
  be: "Bỉ",
  bel: "Bỉ",

  // Thụy Sĩ
  "thuy-si": "Thụy Sĩ",
  "thuy si": "Thụy Sĩ",
  "thụy sĩ": "Thụy Sĩ",
  switzerland: "Thụy Sĩ",
  ch: "Thụy Sĩ",
  che: "Thụy Sĩ",

  // Bồ Đào Nha
  "bo-dao-nha": "Bồ Đào Nha",
  "bo dao nha": "Bồ Đào Nha",
  "bồ đào nha": "Bồ Đào Nha",
  portugal: "Bồ Đào Nha",
  pt: "Bồ Đào Nha",
  prt: "Bồ Đào Nha",

  // Hy Lạp
  "hy-lap": "Hy Lạp",
  "hy lap": "Hy Lạp",
  "hy lạp": "Hy Lạp",
  greece: "Hy Lạp",
  gr: "Hy Lạp",
  grc: "Hy Lạp",

  // Argentina
  argentina: "Argentina",
  ar: "Argentina",
  arg: "Argentina",

  // Colombia
  colombia: "Colombia",
  co: "Colombia",
  col: "Colombia",

  // Chile
  chile: "Chile",
  cl: "Chile",
  chl: "Chile",

  // New Zealand
  "new-zealand": "New Zealand",
  "new zealand": "New Zealand",
  nz: "New Zealand",
  nzl: "New Zealand",

  // Ukraine
  ukraine: "Ukraine",
  ua: "Ukraine",
  ukr: "Ukraine",

  // Triều Tiên
  "trieu-tien": "Triều Tiên",
  "trieu tien": "Triều Tiên",
  "triều tiên": "Triều Tiên",
  "north korea": "Triều Tiên",
  kp: "Triều Tiên",
  prk: "Triều Tiên",

  // Nam Phi
  "nam-phi": "Nam Phi",
  "nam phi": "Nam Phi",
  "south africa": "Nam Phi",
  za: "Nam Phi",
  zaf: "Nam Phi",

  // Quốc tế
  "quoc-te": "Quốc Tế",
  "quốc tế": "Quốc Tế",
  international: "Quốc Tế",
};

/**
 * Chuẩn hóa tên quốc gia từ slug (viet-nam, trung-quoc...), mã ISO hoặc tên thô sang tiếng Việt chuẩn có dấu.
 */
export function formatCountryName(raw?: unknown): string {
  if (!raw) return "";
  let clean = "";
  if (typeof raw === "string") {
    clean = raw.trim();
  } else if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    clean = String(obj.name || obj.slug || obj.id || "").trim();
  }
  if (!clean || clean === "N/A" || clean === "Đang cập nhật") return "";

  // Lọc bỏ nếu là loại phim
  const lower = clean.toLowerCase();
  if (
    lower === "phim lẻ" ||
    lower === "phim bộ" ||
    lower === "phimle" ||
    lower === "phimbo" ||
    lower === "phim rạp" ||
    lower === "hoạt hình" ||
    lower === "tv shows" ||
    lower === "tvshows"
  ) {
    return "";
  }

  // Khử các ký tự phân tách nếu truyền chuỗi kép
  if (clean.includes(",") || clean.includes("/") || clean.includes(";")) {
    clean = clean.split(/[,/;]/)[0].trim();
  }

  const lookupKey = clean.toLowerCase().replace(/_/g, "-");
  if (COUNTRY_DISPLAY_MAP[lookupKey]) {
    return COUNTRY_DISPLAY_MAP[lookupKey];
  }

  // Tra cứu theo key thay gạch nối bằng khoảng trắng và ngược lại
  const spaceKey = lookupKey.replace(/-/g, " ");
  if (COUNTRY_DISPLAY_MAP[spaceKey]) {
    return COUNTRY_DISPLAY_MAP[spaceKey];
  }
  const hyphenKey = lookupKey.replace(/\s+/g, "-");
  if (COUNTRY_DISPLAY_MAP[hyphenKey]) {
    return COUNTRY_DISPLAY_MAP[hyphenKey];
  }

  // Ẩn nếu là mã ISO 2-3 chữ cái viết hoa không xác định
  if (/^[A-Z]{2,3}$/.test(clean)) {
    return "";
  }

  // Nếu là slug có dấu gạch nối (vd: "trieu-tien"), chuyển thành từ viết hoa có khoảng trắng
  if (lookupKey.includes("-")) {
    return lookupKey
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  if (clean.length > 20) {
    return clean.slice(0, 20) + "…";
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieCountry(m: any): string | undefined {
  if (!m) return undefined;

  // 1. Array of objects or strings: m.country or m.countries
  const countryList = m.country || m.countries;
  if (Array.isArray(countryList) && countryList.length > 0) {
    const first = countryList[0];
    if (typeof first === "string" && first.trim()) {
      const formatted = formatCountryName(first);
      if (formatted) return formatted;
    }
    if (first && typeof first === "object") {
      const formatted = formatCountryName(first.name || first.slug || first.id);
      if (formatted) return formatted;
    }
  }
  if (typeof countryList === "string" && countryList.trim()) {
    const formatted = formatCountryName(countryList);
    if (formatted) return formatted;
  }

  // 2. Direct string fields
  if (m.country_name && typeof m.country_name === "string") {
    const formatted = formatCountryName(m.country_name);
    if (formatted) return formatted;
  }
  if (m.countryName && typeof m.countryName === "string") {
    const formatted = formatCountryName(m.countryName);
    if (formatted) return formatted;
  }

  // 3. Check categories for country tags
  const catList = m.category || m.categories;
  if (Array.isArray(catList)) {
    for (const cat of catList) {
      const catName = (typeof cat === "string" ? cat : cat?.name || cat?.slug || "").trim();
      const formatted = formatCountryName(catName);
      if (formatted) return formatted;
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

// Bảng ánh xạ slug thể loại sang tiếng Việt có dấu chuẩn giao diện điện ảnh cao cấp
export const GENRE_DISPLAY_MAP: Record<string, string> = {
  "hanh-dong": "Hành Động",
  "hanh dong": "Hành Động",
  "action": "Hành Động",
  "tinh-cam": "Tình Cảm",
  "tinh cam": "Tình Cảm",
  "romance": "Tình Cảm",
  "kinh-di": "Kinh Dị",
  "kinh di": "Kinh Dị",
  "horror": "Kinh Dị",
  "hai-huoc": "Hài Hước",
  "hai huoc": "Hài Hước",
  "comedy": "Hài Hước",
  "vien-tuong": "Viễn Tưởng",
  "vien tuong": "Viễn Tưởng",
  "sci-fi": "Viễn Tưởng",
  "co-trang": "Cổ Trang",
  "co trang": "Cổ Trang",
  "tam-ly": "Tâm Lý",
  "tam ly": "Tâm Lý",
  "drama": "Tâm Lý",
  "vo-thuat": "Võ Thuật",
  "vo thuat": "Võ Thuật",
  "martial-arts": "Võ Thuật",
  "trinh-tham": "Trinh Thám",
  "trinh tham": "Trinh Thám",
  "detective": "Trinh Thám",
  "chien-tranh": "Chiến Tranh",
  "chien tranh": "Chiến Tranh",
  "war": "Chiến Tranh",
  "war & politics": "Chiến Tranh",
  "war-politics": "Chiến Tranh",
  "war and politics": "Chiến Tranh",
  "action & adventure": "Hành Động",
  "action-adventure": "Hành Động",
  "action and adventure": "Hành Động",
  "sci-fi & fantasy": "Viễn Tưởng",
  "sci-fi-fantasy": "Viễn Tưởng",
  "sci-fi and fantasy": "Viễn Tưởng",
  "history": "Lịch Sử",
  "historical": "Lịch Sử",
  "lich-su": "Lịch Sử",
  "lich su": "Lịch Sử",
  "politics": "Chính Trị",
  "chinh-tri": "Chính Trị",
  "western": "Miền Tây",
  "mien-tay": "Miền Tây",
  "kids": "Thiếu Nhi",
  "thieu-nhi": "Thiếu Nhi",
  "reality": "Thực Tế",
  "talk": "Talk Show",
  "news": "Thời Sự",
  "thoi-su": "Thời Sự",
  "phieu-luu": "Phiêu Lưu",
  "phieu luu": "Phiêu Lưu",
  "adventure": "Phiêu Lưu",
  "am-nhac": "Âm Nhạc",
  "am nhac": "Âm Nhạc",
  "music": "Âm Nhạc",
  "the-thao": "Thể Thao",
  "the thao": "Thể Thao",
  "sport": "Thể Thao",
  "sports": "Thể Thao",
  "tai-lieu": "Tài Liệu",
  "tai lieu": "Tài Liệu",
  "documentary": "Tài Liệu",
  "bi-an": "Bí Ẩn",
  "bi an": "Bí Ẩn",
  "mystery": "Bí Ẩn",
  "hoc-duong": "Học Đường",
  "hoc duong": "Học Đường",
  "school": "Học Đường",
  "gia-dinh": "Gia Đình",
  "gia dinh": "Gia Đình",
  "family": "Gia Đình",
  "khoa-hoc": "Khoa Học",
  "khoa hoc": "Khoa Học",
  "science": "Khoa Học",
  "than-thoai": "Thần Thoại",
  "than thoai": "Thần Thoại",
  "mythology": "Thần Thoại",
  "fantasy": "Thần Thoại",
  "hoat-hinh": "Hoạt Hình",
  "hoat hinh": "Hoạt Hình",
  "animation": "Hoạt Hình",
  "anime": "Hoạt Hình",
  "hinh-su": "Hình Sự",
  "hinh su": "Hình Sự",
  "crime": "Hình Sự",
  "chieu-rap": "Chiếu Rạp",
  "chieu rap": "Chiếu Rạp",
  "phim-chieu-rap": "Chiếu Rạp",
  "chinh-kich": "Chính Kịch",
  "chinh kich": "Chính Kịch",
  "lang-man": "Lãng Mạn",
  "lang man": "Lãng Mạn",
  "giat-gan": "Giật Gân",
  "giat gan": "Giật Gân",
  "thriller": "Giật Gân",
  "gay-can": "Gây Cấn",
  "gay can": "Gây Cấn",
  "phim-bo": "Phim Bộ",
  "phim bo": "Phim Bộ",
  "series": "Phim Bộ",
  "phim-le": "Phim Lẻ",
  "phim le": "Phim Lẻ",
  "single": "Phim Lẻ",
  "tv-shows": "TV Shows",
  "tv shows": "TV Shows",
};

/**
 * Chuẩn hóa tên thể loại từ slug hoặc chuỗi thô sang tiếng Việt có dấu, viết hoa đẹp mắt.
 * Tự động loại bỏ các từ dịch thuật / chất lượng (vietsub, thuyết minh, cam).
 */
export function formatGenreName(raw?: unknown): string {
  if (!raw || typeof raw !== "string") return "";
  let clean = raw.trim();
  if (!clean || clean === "N/A" || clean === "Đang cập nhật") return "";

  // Bỏ các nhãn phát hành/dịch thuật vô nghĩa nếu bị nhét vào trường genre
  const lower = clean.toLowerCase();
  if (
    lower.includes("vietsub") ||
    lower.includes("thuyết minh") ||
    lower.includes("lồng tiếng") ||
    lower.includes("bản đẹp") ||
    lower.includes("raw") ||
    lower.includes("cam")
  ) {
    return "";
  }

  // Khử các ký tự phân tách nếu truyền chuỗi kép (vd: "hanh-dong, phieu-luu")
  if (clean.includes(",") || clean.includes("/")) {
    clean = clean.split(/[,/]/)[0].trim();
  }

  const lookupKey = clean.toLowerCase().replace(/_/g, "-");
  if (GENRE_DISPLAY_MAP[lookupKey]) {
    return GENRE_DISPLAY_MAP[lookupKey];
  }

  // Nếu là slug có dấu gạch nối (vd: "tam-ly-xa-hoi")
  if (lookupKey.includes("-")) {
    return lookupKey
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Nếu đã viết hoa đẹp hoặc từ tiếng Việt chuẩn
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Cache ổn định tham chiếu array diễn viên / đạo diễn theo từng movie object
const movieArrayCache = new WeakMap<object, { actor?: string[]; director?: string[] }>();

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

  const imageUrl = thumbUrl || posterUrl;

  // Chuẩn hóa và làm sạch năm phát hành: Loại bỏ năm vô lý (< 1920 hoặc > năm hiện tại + 2, ví dụ lỗi 1885)
  let year = "";
  if (m?.year) {
    const parsedYear = typeof m.year === "number" ? m.year : parseInt(String(m.year).trim(), 10);
    const maxYear = new Date().getFullYear() + 2;
    if (Number.isFinite(parsedYear) && parsedYear >= 1920 && parsedYear <= maxYear) {
      year = String(parsedYear);
    }
  }

  const quality = m?.quality || "FHD";
  const time = m?.time || m?.episode_current || undefined;
  const rawCats = Array.isArray(m?.category)
    ? m.category
    : Array.isArray(m?.movie?.category)
    ? m.movie.category
    : Array.isArray(m?.categories)
    ? m.categories
    : [];
  const categories: Array<{ name: string; slug?: string }> = rawCats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => {
      const rawName = typeof c === "string" ? c.trim() : String(c?.name || "").trim();
      const slug = typeof c === "object" && c?.slug ? String(c.slug).trim() : undefined;
      const formatted = formatGenreName(rawName) || (slug ? formatGenreName(slug) : "");
      return {
        name: formatted || rawName,
        slug,
      };
    })
    .filter((c: { name: string }) => Boolean(c.name));

  const rawGenre =
    m?.category?.[0]?.name ||
    categories[0]?.name ||
    (Array.isArray(m?.genre) ? m.genre.join(", ") : m?.genre) ||
    "";

  // Thể loại chính được chuẩn hoá tiếng Việt đẹp mắt
  let genre = formatGenreName(rawGenre) || categories[0]?.name || "";

  // Nếu dữ liệu upstream hoàn toàn không có thể loại, tự động gán loại phim (Phim lẻ / Phim bộ / Hoạt hình)
  // để các thẻ luôn có danh mục nhất quán, không bị khuyết tạo cảm giác "lạc quẻ"
  const type_name = detectMovieTypeName(m);
  if (!genre) {
    genre = type_name;
  }

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

  const { rating: normRating } = extractMovieRatingScore(m);
  const score = normRating > 0 ? normRating.toFixed(1) : "N/A";

  // Bóc tách diễn viên & đạo diễn (tái sử dụng tham chiếu array ổn định nếu cùng movie object)
  const isObject = typeof m === "object" && m !== null;
  const cachedArrays = isObject ? movieArrayCache.get(m) : undefined;
  let actor: string[] | undefined;
  let director: string[] | undefined;

  if (cachedArrays) {
    actor = cachedArrays.actor;
    director = cachedArrays.director;
  } else {
    if (Array.isArray(m?.actor)) {
      actor = m.actor.map(String).map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof m?.actor === "string" && m.actor) {
      actor = m.actor.split(",").map((s: string) => s.trim()).filter(Boolean);
    } else if (Array.isArray(m?.casts)) {
      actor = m.casts.map(String).map((s: string) => s.trim()).filter(Boolean);
    }

    if (Array.isArray(m?.director)) {
      director = m.director.map(String).map((s: string) => s.trim()).filter(Boolean);
    } else if (typeof m?.director === "string" && m.director) {
      director = m.director.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    if (isObject) {
      movieArrayCache.set(m, { actor, director });
    }
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
    categories,
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
