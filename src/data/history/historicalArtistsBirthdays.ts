/**
 * HISTORICAL ARTISTS BIRTHDAYS & METADATA INTERFACE
 * Kiến trúc phân giải động: Thay thế việc tải file cứng 683KB bằng On-Demand TMDb & Wikipedia API.
 */

import { getActorSynonyms } from "@/services/actor/actorAliasResolver";

export interface HistoricalArtistBirthday {
  slug: string;
  name: string;
  englishName?: string;
  country?: string;
  countryCode?: "vn" | "hk" | "cn" | "kr" | "jp" | "th" | "us_uk" | "in" | string;
  gender?: 1 | 2; // 1: Nữ, 2: Nam
  tags?: string[];
  roles?: string;
  avatarUrl?: string;
  tmdbPersonId?: number;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  bio?: string;
  biography?: string;
  wikiUrl?: string;
  extract?: string;
  aliases: string[];
  featured?: boolean;
}

// In-Memory Index (L1 RAM động, khởi tạo rỗng và tự động nạp theo nhu cầu)
export let HISTORICAL_ARTISTS_BIRTHDAYS: HistoricalArtistBirthday[] = [];
const slugMap = new Map<string, HistoricalArtistBirthday>();
const aliasMap = new Map<string, HistoricalArtistBirthday>();

export function normalizeArtistKey(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "")
    .trim();
}

export function initializeIndex(artists: HistoricalArtistBirthday[]) {
  slugMap.clear();
  aliasMap.clear();
  HISTORICAL_ARTISTS_BIRTHDAYS = artists;
  for (const a of artists) {
    if (a.slug) {
      slugMap.set(a.slug.toLowerCase().trim(), a);
      slugMap.set(a.slug.toLowerCase().replace(/[\s-]+/g, ""), a);
      slugMap.set(normalizeArtistKey(a.slug), a);
    }
    if (a.name) {
      aliasMap.set(a.name.toLowerCase().trim(), a);
      aliasMap.set(a.name.toLowerCase().replace(/[\s-]+/g, ""), a);
      aliasMap.set(normalizeArtistKey(a.name), a);
    }
    if (a.englishName) {
      aliasMap.set(a.englishName.toLowerCase().trim(), a);
      aliasMap.set(a.englishName.toLowerCase().replace(/[\s-]+/g, ""), a);
      aliasMap.set(normalizeArtistKey(a.englishName), a);
    }
    if (Array.isArray(a.aliases)) {
      for (const al of a.aliases) {
        if (typeof al === "string") {
          aliasMap.set(al.toLowerCase().trim(), a);
          aliasMap.set(al.toLowerCase().replace(/[\s-]+/g, ""), a);
          aliasMap.set(normalizeArtistKey(al), a);
        }
      }
    }
  }
}

/**
 * Đảm bảo kho dữ liệu đã nạp (trả về trực tiếp RAM index 0ms)
 */
export async function ensureHistoricalArtistsLoaded(): Promise<HistoricalArtistBirthday[]> {
  return HISTORICAL_ARTISTS_BIRTHDAYS;
}

export const getHistoricalArtistsList = () => HISTORICAL_ARTISTS_BIRTHDAYS;

/**
 * Tra cứu nghệ sĩ theo slug (0ms RAM cache, fallback dynamic synonyms)
 */
export function getHistoricalArtistBySlug(slug?: string): HistoricalArtistBirthday | undefined {
  if (!slug) return undefined;
  const clean = slug.trim().toLowerCase().replace(/\s+/g, "-");
  const normalizedSearch = clean.replace(/[\s-]+/g, "");
  const normKey = normalizeArtistKey(clean);

  // 1. Tìm trong slugMap RAM O(1)
  const exact = slugMap.get(clean) || slugMap.get(normalizedSearch) || slugMap.get(normKey);
  if (exact) return exact;

  // 2. Quét mảng RAM
  const found = HISTORICAL_ARTISTS_BIRTHDAYS.find((a) => {
    if (a.slug === clean) return true;
    const aNorm = a.slug.replace(/[\s-]+/g, "");
    if (aNorm === normalizedSearch || normalizeArtistKey(a.slug) === normKey) return true;
    if (a.aliases && a.aliases.some((alias) => normalizeArtistKey(alias) === normKey)) {
      return true;
    }
    return false;
  });
  if (found) return found;

  // 3. Tra cứu qua bảng từ điển actorSynonyms nếu có
  const syn = getActorSynonyms(slug);
  if (syn.isMatched) {
    return {
      slug: syn.slug,
      name: syn.canonicalName,
      englishName: syn.englishName,
      country: syn.country,
      aliases: syn.variants,
    };
  }
  return undefined;
}

/**
 * Tìm nghệ sĩ theo tên, nghệ danh, bí danh hoặc từ khóa bất kỳ
 */
export function findHistoricalArtist(nameOrQuery?: string): HistoricalArtistBirthday | undefined {
  if (!nameOrQuery) return undefined;
  const clean = nameOrQuery.trim().toLowerCase();
  const noSpaceQuery = clean.replace(/[\s-]+/g, "");
  const normKey = normalizeArtistKey(clean);

  // 1. Khớp slug trực tiếp
  const bySlug = getHistoricalArtistBySlug(clean);
  if (bySlug) return bySlug;

  // 2. Khớp alias map O(1)
  const byAlias = aliasMap.get(clean) || aliasMap.get(noSpaceQuery) || aliasMap.get(normKey);
  if (byAlias) return byAlias;

  // 3. Khớp tên hoặc alias quét toàn bộ danh sách
  const found = HISTORICAL_ARTISTS_BIRTHDAYS.find((a) => {
    if (a.name.toLowerCase() === clean) return true;
    if (a.name.toLowerCase().replace(/[\s-]+/g, "") === noSpaceQuery) return true;
    if (normalizeArtistKey(a.name) === normKey) return true;
    if (
      a.englishName &&
      (a.englishName.toLowerCase().replace(/[\s-]+/g, "") === noSpaceQuery ||
        normalizeArtistKey(a.englishName) === normKey)
    ) {
      return true;
    }
    if (a.aliases && a.aliases.some((alias) => normalizeArtistKey(alias) === normKey)) {
      return true;
    }
    return false;
  });
  if (found) return found;

  // 4. Tra cứu qua bảng từ điển actorSynonyms nếu có
  const syn = getActorSynonyms(nameOrQuery);
  if (syn.isMatched) {
    return {
      slug: syn.slug,
      name: syn.canonicalName,
      englishName: syn.englishName,
      country: syn.country,
      aliases: syn.variants,
    };
  }
  return undefined;
}

/**
 * Không còn sử dụng ảnh tĩnh R2 cố định, chuyển sang fallback an toàn
 */
export function getR2ActorAvatarUrl(_slug: string): string {
  return "";
}
