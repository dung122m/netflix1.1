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

  // 🛠 SỬA TẠI ĐÂY: Ưu tiên ảnh ngang (thumb) để khớp với khung aspect-video
  if (lower.includes("thumb_")) score += 4;
  if (lower.includes("/thumb")) score += 3;
  if (lower.includes("backdrop")) score += 4;

  // Trừ điểm ảnh dọc (poster) để tránh bị cắt xén khung hình
  if (lower.includes("poster_")) score -= 2;
  if (lower.includes("/poster")) score -= 1;

  if (lower.includes("w780") || lower.includes("w1280")) score += 2;
  return score;
}

export function pickBestMovieImage(movie: MovieLike, fallback: string) {
  const candidates = [movie.poster_url, movie.thumb_url, movie.imageUrl].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
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
