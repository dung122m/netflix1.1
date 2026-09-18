import { sanitizeImageUrl } from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { extractMovieYear } from "./taxonomy";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSafePoster(item: any): string {
  if (!item) return "/default-poster.svg";
  const poster = sanitizeImageUrl(item.poster_url || item.posterUrl || "");
  if (poster) return poster;
  const thumb = sanitizeImageUrl(item.thumb_url || item.thumbUrl || "");
  if (thumb) return thumb;
  return "/default-poster.svg";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSafeActors(item: any): string[] {
  const result: string[] = [];
  if (Array.isArray(item?.actor)) {
    result.push(...item.actor.map(String).map((s: string) => s.trim()).filter(Boolean));
  } else if (typeof item?.actor === "string" && item.actor.trim()) {
    result.push(...item.actor.split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  if (Array.isArray(item?.actors)) {
    result.push(...item.actors.map(String).map((s: string) => s.trim()).filter(Boolean));
  } else if (typeof item?.actors === "string" && item.actors.trim()) {
    result.push(...item.actors.split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  if (Array.isArray(item?.director)) {
    result.push(...item.director.map(String).map((s: string) => s.trim()).filter(Boolean));
  } else if (typeof item?.director === "string" && item.director.trim()) {
    result.push(...item.director.split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  return Array.from(new Set(result));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSafeCountry(item: any): string {
  if (Array.isArray(item?.country) && item.country.length > 0) {
    return item.country[0]?.name || item.country[0]?.slug || "";
  }
  if (typeof item?.country === "string") return item.country;
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSafeCategory(item: any): string {
  if (Array.isArray(item?.category) && item.category.length > 0) {
    return item.category[0]?.name || item.category[0]?.slug || "Điện Ảnh";
  }
  if (typeof item?.category === "string") return item.category;
  return "Điện Ảnh";
}

/**
 * Kiểm tra các câu từ chối hoặc mô tả sáo rỗng thường gặp
 */
export function isGenericBoilerplate(text?: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase().trim();
  return (
    lower.includes("tác phẩm tiêu biểu") ||
    lower.includes("tác phẩm đặc sắc") ||
    lower.includes("tác phẩm hành động đặc sắc") ||
    lower.includes("một bộ phim kịch tính") ||
    lower.includes("phù hợp với yêu cầu") ||
    lower.includes("phù hợp hoàn hảo với yêu cầu") ||
    lower.includes("đang chờ bạn khám phá") ||
    lower.includes("tác phẩm điện ảnh đặc sắc") ||
    lower.includes("tác phẩm kinh điển gắn liền") ||
    lower.includes("gắn liền với tên tuổi") ||
    lower.includes("phong cách diễn xuất") ||
    lower.includes("siêu phẩm điện ảnh thịnh hành") ||
    lower.includes("sẵn sàng thưởng thức trên nền tảng") ||
    lower.includes("khớp chuẩn xác với yêu cầu") ||
    lower.includes("đạt điểm đánh giá cao") ||
    lower.includes("có điểm đánh giá cao") ||
    lower.includes("phim hay chất lượng cao") ||
    lower.includes("chất lượng cao đáng xem")
  );
}

/**
 * Lấy highlight mô tả ngắn gọn động cho bộ phim, loại bỏ câu sáo rỗng
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMovieHighlight(movie: any, customReason?: string): string {
  // 1. Ưu tiên customReason do AI sinh ra nếu hợp lệ và không phải câu rập khuôn
  if (customReason && customReason.trim().length >= 12 && !isGenericBoilerplate(customReason)) {
    const cleanReason = cleanHtmlText(customReason).trim();
    if (cleanReason.length > 95) {
      return cleanReason.substring(0, 90) + "...";
    }
    return cleanReason;
  }

  // 2. Ưu tiên lấy trường overview/description/content sẵn có của phim từ database
  const rawText =
    movie?.overview ||
    movie?.description ||
    movie?.content ||
    movie?.movie?.overview ||
    movie?.movie?.description ||
    movie?.movie?.content ||
    "";

  const clean = cleanHtmlText(rawText).trim();
  if (clean && clean.length >= 15 && !isGenericBoilerplate(clean)) {
    if (clean.length > 95) {
      return clean.substring(0, 90) + "...";
    }
    return clean;
  }

  // 3. Nếu không có overview từ database, hiển thị thông tin thực tế của phim mà không bịa đặt cảm xúc
  const cat = toSafeCategory(movie);
  const yr = extractMovieYear(movie);
  const orig = movie?.origin_name ? ` (${movie.origin_name})` : "";
  if (yr && cat) {
    return `${movie?.name || movie?.title || "Tác phẩm"}${orig} - Thể loại ${cat.toLowerCase()}, phát hành năm ${yr}.`;
  }
  if (cat) {
    return `${movie?.name || movie?.title || "Tác phẩm"}${orig} - Thể loại ${cat.toLowerCase()}.`;
  }
  return "Tác phẩm điện ảnh có sẵn trên Nanaflix.";
}
