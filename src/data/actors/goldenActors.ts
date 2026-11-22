export interface ActorProfile {
  name: string;
  aliases: string[];
  country: string;
}

/**
 * GOLDEN ACTOR INDEX (LEGACY SHIM)
 * Kiến trúc phân giải động: Toàn bộ danh tính nghệ sĩ, biệt danh và ID hiện nay
 * được phân giải 100% tự động theo thời gian thực qua TMDb API (Person Search & Detail)
 * kết hợp thuật toán chuẩn hóa Hán - Việt. Không còn duy trì mảng tĩnh hardcode trong code.
 */
export const GOLDEN_ACTOR_INDEX: ActorProfile[] = [];

export const ACTOR_CANONICAL_MAP: Record<string, string> = {};
export const ACTOR_SLUG_MAP: Record<string, string[]> = {};
