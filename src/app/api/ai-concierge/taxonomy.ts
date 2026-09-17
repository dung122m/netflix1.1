import { COUNTRY_SLUG_MAP, GENRE_SLUG_MAP } from "./constants";
import { ACTOR_SLUG_MAP } from "@/services/aiActorService";
import { cleanNormalizedString } from "@/lib/stringUtils";

export { cleanNormalizedString };

/**
 * Chuẩn hóa query dùng cho cache key
 */
export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Sửa các lỗi chính tả phổ biến trong tiếng Việt trước khi gửi AI
 */
export function normalizeTypos(prompt: string): string {
  return prompt
    .replace(/\bzoombie[s]?\b/gi, "zombie")
    .replace(/\bhành đọng\b/gi, "hành động")
    .replace(/\bhanh dong\b/gi, "hành động")
    .replace(/\btình cãm\b/gi, "tình cảm")
    .replace(/\btinh cam\b/gi, "tình cảm")
    .replace(/\bhoat hinh\b/gi, "hoạt hình")
    .replace(/\bhai huoc\b/gi, "hài hước")
    .replace(/\bkinh di\b/gi, "kinh dị")
    .replace(/\bviễn tuởng\b/gi, "viễn tưởng")
    .replace(/\bvien tuong\b/gi, "viễn tưởng")
    .replace(/\btrinh tham\b/gi, "trinh thám");
}

/**
 * Trích xuất năm an toàn (xử lý cả '1995', '1995-12-01', 1995)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieYear(item: any): number {
  if (!item) return 0;
  const raw = item.year || item.movie?.year || item.release_date || item.publish_date || item.created_at || "";
  const match = String(raw).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Tìm kiếm slug diễn viên dựa trên bảng ánh xạ ACTOR_SLUG_MAP dùng chung
 */
export function resolveActorSlug(rawActor?: string): string {
  if (!rawActor) return "";
  const clean = cleanNormalizedString(rawActor);
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    if (aliases.some((a) => clean.includes(cleanNormalizedString(a)) || cleanNormalizedString(a).includes(clean))) {
      return slug;
    }
  }
  return "";
}

/**
 * Lấy danh sách bí danh của một diễn viên theo slug
 */
export function getActorAliases(actorSlug: string): string[] {
  return ACTOR_SLUG_MAP[actorSlug] || [actorSlug.replace(/-/g, " ")];
}

/**
 * Kiểm tra mảng diễn viên của phim có khớp với diễn viên mục tiêu hay không
 */
export function matchesActor(itemActors: string[], actorSlug: string): boolean {
  if (!actorSlug || !itemActors || itemActors.length === 0) return false;
  const aliases = getActorAliases(actorSlug).map(cleanNormalizedString);
  const cleanActors = itemActors.map(cleanNormalizedString);
  return cleanActors.some((act) =>
    aliases.some((alias) => act === alias || (alias.split(" ").length >= 2 && act.includes(alias)))
  );
}

/**
 * Tìm kiếm slug quốc gia chuẩn hóa
 */
export function resolveCountrySlug(rawCountry?: string): string {
  if (!rawCountry) return "";
  const clean = cleanNormalizedString(rawCountry);
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => clean.includes(cleanNormalizedString(a)) || cleanNormalizedString(a).includes(clean))) {
      return slug;
    }
  }
  return "";
}

/**
 * Tìm kiếm slug thể loại chuẩn hóa
 */
export function resolveGenreSlug(rawGenre?: string): string {
  if (!rawGenre) return "";
  const clean = cleanNormalizedString(rawGenre);
  for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
    if (aliases.some((a) => clean.includes(cleanNormalizedString(a)) || cleanNormalizedString(a).includes(clean))) {
      return slug;
    }
  }
  return "";
}

/**
 * Kiểm tra chuỗi quốc gia của phim có khớp với slug mục tiêu không
 */
export function matchesCountry(itemCountryStr: string, targetCountrySlug: string): boolean {
  if (!targetCountrySlug || !itemCountryStr) return true;
  const cleanItem = cleanNormalizedString(itemCountryStr);
  const targetAliases = COUNTRY_SLUG_MAP[targetCountrySlug] || [targetCountrySlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
}

/**
 * Kiểm tra chuỗi thể loại của phim có khớp với slug mục tiêu không
 */
export function matchesGenre(itemCategoryStr: string, targetGenreSlug: string): boolean {
  if (!targetGenreSlug || !itemCategoryStr) return true;
  const cleanItem = cleanNormalizedString(itemCategoryStr);
  const targetAliases = GENRE_SLUG_MAP[targetGenreSlug] || [targetGenreSlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
}
