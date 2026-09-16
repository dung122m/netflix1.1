import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { sanitizeImageUrl } from "@/lib/movieMedia";
import { generateFastAiChat } from "@/services/aiProviderService";

export const maxDuration = 15;

export interface SuggestionCard {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  rating?: string | number;
  category?: string;
  country?: string;
  actors?: string[];
  reason?: string;
}

// ============================================================================
// LAYER 1: BẢNG ÁNH XẠ DIỄN VIÊN THÔNG MINH (ACTOR SLUG MAP)
// ============================================================================
export const ACTOR_SLUG_MAP: Record<string, string[]> = {
  "thanh-long": ["thanh long", "thành long", "jackie chan", "jackie", "chan kong sang", "sing lung", "thanh long kungfu"],
  "chau-tinh-tri": ["chau tinh tri", "châu tinh trì", "stephen chow", "chow sing chi", "tinh gia", "tinh gia"],
  "chan-tu-dan": ["chan tu dan", "chân tử đan", "donnie yen", "yen ji dan", "diep van"],
  "ly-lien-kiet": ["ly lien kiet", "lý liên kiệt", "jet li", "li lian jie", "hoang phi hong"],
  "ngo-kinh": ["ngo kinh", "ngô kinh", "wu jing", "chien lang"],
  "luu-duc-hoa": ["luu duc hoa", "lưu đức hoa", "andy lau"],
  "luong-trieu-vy": ["luong trieu vy", "lương triều vỹ", "tony leung"],
  "quach-phu-thanh": ["quach phu thanh", "quách phú thành", "aaron kwok"],
  "co-thien-lac": ["co thien lac", "cổ thiên lạc", "louis koo"],
  "truong-gia-huy": ["truong gia huy", "trương gia huy", "nick cheung"],
  "ta-dinh-phong": ["ta dinh phong", "tạ đình phong", "nicholas tse"],
  "hong-kim-bao": ["hong kim bao", "hồng kim bảo", "sammo hung"],
  "nguyen-biao": ["nguyen biao", "nguyên tiêu", "yuen biao"],
  "tran-thanh": ["tran thanh", "trấn thành", "mc tran thanh", "bo gia"],
  "truong-giang": ["truong giang", "trường giang", "muoi kho", "mc truong giang"],
  "thai-hoa": ["thai hoa", "thái hòa", "ong hoang phong ve"],
  "ninh-duong-lan-ngoc": ["ninh duong lan ngoc", "ninh dương lan ngọc", "lan ngoc"],
  "kieu-minh-tuan": ["kieu minh tuan", "kiều minh tuấn"],
  "thu-trang": ["thu trang", "chi muoi ba", "hoa hau hai"],
  "ly-hai": ["ly hai", "lý hải", "lat mat"],
  "hoai-linh": ["hoai linh", "hoài linh", "sau sang"],
  "tom-cruise": ["tom cruise", "ethan hunt", "maverick"],
  "keanu-reeves": ["keanu reeves", "john wick", "neo"],
  "leonardo-dicaprio": ["leonardo dicaprio", "dicaprio", "leo dicaprio"],
  "dwayne-johnson": ["dwayne johnson", "the rock"],
  "jason-statham": ["jason statham", "nguoi van chuyen"],
  "song-joong-ki": ["song joong ki", "song joong-ki", "vincenzo"],
  "kim-soo-hyun": ["kim soo hyun", "kim soo-hyun"],
  "hyun-bin": ["hyun bin", "dai uy ri"],
  "lee-min-ho": ["lee min ho", "lee min-ho", "quan vuong"],
  "park-seo-joon": ["park seo joon", "park seo-jun"],
  "son-ye-jin": ["son ye jin", "son ye-jin"],
  "kim-ji-won": ["kim ji won", "kim ji-won"],
  "song-kang": ["song kang"],
  "iu": ["iu", "lee ji eun", "lee ji-eun"],
};

// Kho danh sách tác phẩm kinh điển của các siêu sao (để tối đa hóa kết quả tìm kiếm)
export const ACTOR_TOP_TITLES: Record<string, string[]> = {
  "thanh-long": [
    "Câu Chuyện Cảnh Sát (Police Story)",
    "Câu Chuyện Cảnh Sát 2 (Police Story 2)",
    "Câu Chuyện Cảnh Sát 3 (Police Story 3: Super Cop)",
    "Câu Chuyện Cảnh Sát 4: Nhiệm Vụ Đơn Độc (First Strike)",
    "Tân Câu Chuyện Cảnh Sát (New Police Story)",
    "Giờ Cao Điểm (Rush Hour)",
    "Giờ Cao Điểm 2 (Rush Hour 2)",
    "Giờ Cao Điểm 3 (Rush Hour 3)",
    "Túy Quyền (Drunken Master)",
    "Túy Quyền 2 (Drunken Master II)",
    "Kế Hoạch A (Project A)",
    "Kế Hoạch A 2 (Project A 2)",
    "Đại Náo Phố Bronx (Rumble in the Bronx)",
    "Thần Thoại (The Myth)",
    "12 Con Giáp (CZ12 / Chinese Zodiac)",
    "Kẻ Ngoại Tộc (The Foreigner)",
    "Đại Náo Shinjuku (Shinjuku Incident)",
    "Hiệp Khách Thượng Hải (Shanghai Knights)",
    "Trưa Thượng Hải (Shanghai Noon)",
    "Cậu Bé Karate (The Karate Kid)",
    "Phi Ưng Vút Bay (Armour of God II: Operation Condor)",
    "Kế Hoạch Baby (Rob-B-Hood)",
    "Vua Kung Fu (The Forbidden Kingdom)",
    "Long Huynh Hổ Đệ (Armour of God)",
    "Long Mã Tinh Thần (Ride On)",
  ],
  "chau-tinh-tri": [
    "Tuyệt Đỉnh Kungfu (Kung Fu Hustle)",
    "Đội Bóng Thiếu Lâm (Shaolin Soccer)",
    "Tây Du Ký: Nguyệt Quang Bảo Hợp (A Chinese Odyssey Part 1)",
    "Tây Du Ký: Tiên Lý Kỳ Duyên (A Chinese Odyssey Part 2)",
    "Vua Hài Kịch (King of Comedy)",
    "Thần Ăn (The God of Cookery)",
    "Quan Xẩm Lốc Cốc (Hail the Judge)",
    "Đường Bá Hổ Điểm Thu Hương (Flirting Scholar)",
    "Thánh Bài (All for the Winner)",
    "Thánh Bài 2 (God of Gamblers II)",
    "Trường Học Uy Long (Fight Back to School)",
    "Trường Học Uy Long 2 (Fight Back to School 2)",
    "Quốc Sản 007 (From Beijing with Love)",
    "Mỹ Nhân Ngư (The Mermaid)",
    "Gia Hữu Hỷ Sự (All's Well, Ends Well)",
  ],
  "chan-tu-dan": [
    "Diệp Vấn (Ip Man)",
    "Diệp Vấn 2 (Ip Man 2)",
    "Diệp Vấn 3 (Ip Man 3)",
    "Diệp Vấn 4: Hồi Cuối (Ip Man 4: The Finale)",
    "Sát Phá Lang (SPL: Kill Zone)",
    "Đảo Hỏa Tuyến (Flash Point)",
    "Trùm Hương Cảng (Chasing the Dragon)",
    "Huyền Thoại Trần Chân (Legend of the Fist)",
    "Kẻ Săn Đêm (Raging Fire)",
    "Hiệp Sĩ Mù (Blind War)",
  ],
  "ly-lien-kiet": [
    "Hoàng Phi Hồng (Once Upon a Time in China)",
    "Hoàng Phi Hồng 2 (Once Upon a Time in China II)",
    "Hoàng Phi Hồng 3 (Once Upon a Time in China III)",
    "Tinh Võ Anh Hùng (Fist of Legend)",
    "Phương Thế Ngọc (Fong Sai-yuk)",
    "Nụ Hôn Của Rồng (Kiss of the Dragon)",
    "Đấu Quyết (Fearless / Hoắc Nguyên Giáp)",
    "Anh Hùng (Hero)",
    "Vua Kung Fu (The Forbidden Kingdom)",
    "Biệt Đội Đánh Thuê (The Expendables)",
  ],
};

// ============================================================================
// BƯỚC 3: BẢNG ÁNH XẠ CHUẨN HÓA (SLUG MAPPERS - CODE DETERMINISTIC)
// ============================================================================
export const COUNTRY_SLUG_MAP: Record<string, string[]> = {
  "au-my": ["au-my", "us", "usa", "hollywood", "my", "mỹ", "hoa ky", "hoa kỳ", "au my", "âu mỹ", "anh", "uk", "phap", "pháp", "france", "duc", "đức", "germany", "y", "ý", "italy", "tay ban nha", "tây ban nha", "spain", "canada", "uc", "úc", "australia"],
  "thai-lan": ["thai-lan", "thailand", "thai lan", "thái lan", "thai", "xiem"],
  "han-quoc": ["han-quoc", "korea", "han quoc", "hàn quốc", "south korea", "han", "hàn"],
  "trung-quoc": ["trung-quoc", "china", "trung quoc", "trung quốc", "chinese", "hoa ngu", "hoa ngữ", "dai luc", "đại lục"],
  "hong-kong": ["hong-kong", "hong kong", "hongkong", "hồng kông", "hk", "tvb"],
  "nhat-ban": ["nhat-ban", "japan", "nhat ban", "nhật bản", "japanese", "anime", "nhat", "nhật"],
  "viet-nam": ["viet-nam", "vietnam", "viet nam", "việt nam", "vn"],
  "dai-loan": ["dai-loan", "taiwan", "dai loan", "đài loan"],
  "an-do": ["an-do", "india", "an do", "ấn độ", "bollywood"],
};

export const GENRE_SLUG_MAP: Record<string, string[]> = {
  "hanh-dong": ["hanh-dong", "hanh dong", "hành động", "hanh dong giat gan", "hành động giật gân", "giat gan", "giật gân", "action", "thriller", "ban sung", "bắn súng", "truy duoi", "truy đuổi", "cuop", "cướp", "cuop ngan hang", "cướp ngân hàng", "heist", "toi pham", "tội phạm"],
  "kinh-di": ["kinh-di", "kinh di", "kinh dị", "horror", "ma", "ma quai", "ma quái", "rung ron", "rùng rợn", "am anh", "ám ảnh", "quy", "quỷ", "tam linh", "tâm linh"],
  "hai-huoc": ["hai-huoc", "hai huoc", "hài hước", "hai", "hài", "comedy", "vui nhon", "vui nhộn", "cuoi", "cười"],
  "tinh-cam": ["tinh-cam", "tinh cam", "tình cảm", "lang man", "lãng mạn", "romance", "tinh yeu", "tình yêu", "ngon tinh", "ngôn tình", "chua lanh", "chữa lành", "dong que", "đồng quê", "slice of life"],
  "hoat-hinh": ["hoat-hinh", "hoat hinh", "hoạt hình", "anime", "animation", "manga"],
  "vien-tuong": ["vien-tuong", "vien tuong", "viễn tưởng", "khoa hoc vien tuong", "khoa học viễn tưởng", "sci-fi", "scifi", "time loop", "vong lap", "vòng lặp", "du hanh", "du hành"],
  "co-trang": ["co-trang", "co trang", "cổ trang", "kiem hiep", "kiếm hiệp", "tien hiep", "tiên hiệp", "cung dau", "cung đấu"],
  "tam-ly": ["tam-ly", "tam ly", "tâm lý", "drama", "chinh kich", "chính kịch", "gia dinh", "gia đình"],
  "trinh-tham": ["trinh-tham", "trinh tham", "trinh thám", "bi an", "bí ẩn", "mystery", "pha an", "phá án", "hack nao", "hack não", "dau tri", "đấu trí", "investigation"],
  "vo-thuat": ["vo-thuat", "vo thuat", "võ thuật", "kungfu", "martial arts", "danh nhau", "đánh nhau"],
  "chien-tranh": ["chien-tranh", "chien tranh", "chiến tranh", "war", "quan su", "quân sự"],
  "tai-lieu": ["tai-lieu", "tai lieu", "tài liệu", "documentary"],
  "phieu-luu": ["phieu-luu", "phieu luu", "phiêu lưu", "adventure", "kham pha", "khám phá", "sinh ton", "sinh tồn"],
};

function cleanNormalizedString(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

export function getActorAliases(actorSlug: string): string[] {
  return ACTOR_SLUG_MAP[actorSlug] || [actorSlug.replace(/-/g, " ")];
}

export function matchesActor(itemActors: string[], actorSlug: string): boolean {
  if (!actorSlug || !itemActors || itemActors.length === 0) return false;
  const aliases = getActorAliases(actorSlug).map(cleanNormalizedString);
  const cleanActors = itemActors.map(cleanNormalizedString);
  return cleanActors.some((act) => aliases.some((alias) => act.includes(alias) || alias.includes(act)));
}

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

export function matchesCountry(itemCountryStr: string, targetCountrySlug: string): boolean {
  if (!targetCountrySlug || !itemCountryStr) return true;
  const cleanItem = cleanNormalizedString(itemCountryStr);
  const targetAliases = COUNTRY_SLUG_MAP[targetCountrySlug] || [targetCountrySlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
}

export function matchesGenre(itemCategoryStr: string, targetGenreSlug: string): boolean {
  if (!targetGenreSlug || !itemCategoryStr) return true;
  const cleanItem = cleanNormalizedString(itemCategoryStr);
  const targetAliases = GENRE_SLUG_MAP[targetGenreSlug] || [targetGenreSlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafePoster(item: any): string {
  if (!item) return "/default-poster.svg";
  const poster = sanitizeImageUrl(item.poster_url || item.posterUrl || "");
  if (poster) return poster;
  const thumb = sanitizeImageUrl(item.thumb_url || item.thumbUrl || "");
  if (thumb) return thumb;
  return "/default-poster.svg";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeActors(item: any): string[] {
  if (Array.isArray(item?.actor)) {
    return item.actor.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  if (typeof item?.actor === "string" && item.actor.trim()) {
    return item.actor.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeCountry(item: any): string {
  if (Array.isArray(item?.country) && item.country.length > 0) {
    return item.country[0]?.name || item.country[0]?.slug || "";
  }
  if (typeof item?.country === "string") return item.country;
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeCategory(item: any): string {
  if (Array.isArray(item?.category) && item.category.length > 0) {
    return item.category[0]?.name || item.category[0]?.slug || "Điện Ảnh";
  }
  if (typeof item?.category === "string") return item.category;
  return "Điện Ảnh";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TITLE_LOOKUP_CACHE = new Map<string, { item: any; expireAt: number }>();

export interface MatchOptions {
  expectedCountry?: string;
  expectedGenre?: string;
  expectedActorSlug?: string;
  yearFrom?: number;
  yearTo?: number;
  excludedCountries?: string[];
  excludedGenres?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findBestMatchMovie(items: any[], query: string, originalQuery?: string, options?: MatchOptions): any {
  if (!items || items.length === 0) return null;
  const cleanQ = cleanNormalizedString(query || "");
  const cleanOq = cleanNormalizedString(originalQuery || "");

  let bestItem = null;
  let bestScore = -999;

  for (const it of items) {
    const name = cleanNormalizedString(it.name || it.title || "");
    const orig = cleanNormalizedString(it.origin_name || "");
    const slug = cleanNormalizedString(it.slug || "");
    const country = toSafeCountry(it);
    const category = toSafeCategory(it);
    const itemYear = Number(it.year) || 0;
    const itemActors = toSafeActors(it);

    // 1. Kiểm tra loại trừ
    if (options?.excludedCountries && options.excludedCountries.length > 0) {
      if (options.excludedCountries.some((ex) => matchesCountry(country, ex))) {
        continue;
      }
    }
    if (options?.excludedGenres && options.excludedGenres.length > 0) {
      if (options.excludedGenres.some((ex) => matchesGenre(category, ex))) {
        continue;
      }
    }

    // 2. Kiểm tra quốc gia nghiêm ngặt
    if (options?.expectedCountry && country) {
      if (!matchesCountry(country, options.expectedCountry)) {
        continue;
      }
    }

    let score = 0;

    if (name === cleanQ || (cleanOq && (name === cleanOq || orig === cleanOq))) {
      score += 100;
    } else if (slug === cleanQ.replace(/\s+/g, "-") || (cleanOq && slug === cleanOq.replace(/\s+/g, "-"))) {
      score += 90;
    } else if (name.startsWith(cleanQ) || (cleanOq && (name.startsWith(cleanOq) || orig.startsWith(cleanOq)))) {
      score += 70;
    } else if (name.includes(cleanQ) || (cleanOq && (name.includes(cleanOq) || orig.includes(cleanOq)))) {
      score += 50;
    } else {
      const qWords = cleanQ.split(" ").filter((w) => w.length > 1);
      if (qWords.length > 1) {
        const matchWords = qWords.filter((w) => name.includes(w) || (orig && orig.includes(w)));
        const ratio = matchWords.length / qWords.length;
        if (ratio >= 0.6) score += Math.round(ratio * 45);
      }
    }

    const lenDiff = Math.abs(name.length - cleanQ.length);
    score -= Math.min(25, lenDiff * 1.5);

    if (it.thumb_url || it.poster_url) score += 10;

    // Điểm thưởng nếu có diễn viên mong muốn
    if (options?.expectedActorSlug && matchesActor(itemActors, options.expectedActorSlug)) {
      score += 30;
    }

    // Điểm thưởng cho năm sản xuất
    if (itemYear > 0 && options?.yearFrom && options?.yearTo) {
      if (itemYear >= options.yearFrom && itemYear <= options.yearTo) {
        score += 25;
      } else if (Math.abs(itemYear - options.yearFrom) <= 5 || Math.abs(itemYear - options.yearTo) <= 5) {
        score += 10;
      }
    }

    // Điểm thưởng cho thể loại
    if (options?.expectedGenre && matchesGenre(category, options.expectedGenre)) {
      score += 20;
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = it;
    }
  }

  return bestScore >= 45 ? bestItem : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryPhimApiDirect(keyword: string, originalKeyword?: string, options?: MatchOptions): Promise<any> {
  if (!keyword?.trim()) return null;
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}&limit=8`,
      { signal: AbortSignal.timeout(2400), next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json?.data?.items || [];
    if (items.length > 0) {
      const best = findBestMatchMovie(items, keyword, originalKeyword, options);
      if (!best) return null;

      const imageDomain = (json.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com/").replace(/\/+$/, "");
      const formatImg = (p?: string) => {
        if (!p) return "";
        if (p.startsWith("http://") || p.startsWith("https://")) return p;
        return `${imageDomain}/${p.replace(/^\/+/, "")}`;
      };
      return {
        ...best,
        thumb_url: formatImg(best.thumb_url) || formatImg(best.poster_url),
        poster_url: formatImg(best.poster_url) || formatImg(best.thumb_url),
      };
    }
  } catch {}
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchSingleMovieFast(title: string, originalTitle?: string, options?: MatchOptions): Promise<any> {
  const cleanTitle = (title || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const cleanOriginal = (originalTitle || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  if (!cleanTitle && !cleanOriginal) return null;

  const key = `${cleanTitle}__${cleanOriginal}__${options?.expectedCountry || ""}__${options?.expectedGenre || ""}`.toLowerCase();
  const cached = TITLE_LOOKUP_CACHE.get(key);
  if (cached && Date.now() < cached.expireAt) return cached.item;

  let foundItem = null;

  if (cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanTitle, cleanOriginal, options);
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanOriginal, cleanTitle, options);
  }

  if (!foundItem && cleanTitle) {
    try {
      const res1 = await Promise.race([
        movieApi.getMovies({ keyword: cleanTitle, page: 1, limit: 6 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res1?.items && res1.items.length > 0) {
        foundItem = findBestMatchMovie(res1.items, cleanTitle, cleanOriginal, options);
      }
    } catch {}
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    try {
      const res2 = await Promise.race([
        movieApi.getMovies({ keyword: cleanOriginal, page: 1, limit: 6 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res2?.items && res2.items.length > 0) {
        foundItem = findBestMatchMovie(res2.items, cleanOriginal, cleanTitle, options);
      }
    } catch {}
  }

  if (foundItem) {
    TITLE_LOOKUP_CACHE.set(key, { item: foundItem, expireAt: Date.now() + 1000 * 60 * 60 * 24 });
  } else {
    TITLE_LOOKUP_CACHE.set(key, { item: null, expireAt: Date.now() + 1000 * 60 });
  }

  return foundItem;
}

interface CacheEntry {
  reply: string;
  mood: string;
  movies: SuggestionCard[];
  provider: string;
  cachedAt: number;
}

const AI_RESPONSE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;

function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, "")
    .replace(/\s+/g, " ");
}

const ipRequestMap = new Map<string, { count: number; expiresAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);
  if (!record || record.expiresAt < now) {
    ipRequestMap.set(ip, { count: 1, expiresAt: now + 60_000 });
    return true;
  }
  if (record.count >= 40) {
    return false;
  }
  record.count += 1;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseAiJson(rawText: string): any {
  if (!rawText) return null;
  let cleaned = rawText.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const sanitized = cleaned
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/[\u0000-\u001F]+/g, " ");
      return JSON.parse(sanitized);
    } catch {
      try {
        let repaired = cleaned;
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;

        if (repaired.lastIndexOf('"') !== -1 && (repaired.match(/"/g) || []).length % 2 !== 0) {
          repaired += '"';
        }
        for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
        for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

        return JSON.parse(repaired);
      } catch {
        const analysisMatch = cleaned.match(/"analysis"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const moodMatch = cleaned.match(/"mood"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const genreMatch = cleaned.match(/"genre"\s*:\s*"((?:\\.|[^"\\])*)"/) || cleaned.match(/"target_genre"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const countryMatch = cleaned.match(/"country"\s*:\s*"((?:\\.|[^"\\])*)"/) || cleaned.match(/"target_country"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const actorMatch = cleaned.match(/"actor"\s*:\s*"((?:\\.|[^"\\])*)"/);

        const movies: Array<{ title: string; original_title?: string; reason?: string }> = [];
        const movieRegex = /"title"\s*:\s*"((?:\\.|[^"\\])*)"(?:[^{}]*?"original_title"\s*:\s*"((?:\\.|[^"\\])*)")?(?:[^{}]*?"reason"\s*:\s*"((?:\\.|[^"\\])*)")?/g;
        let m;
        while ((m = movieRegex.exec(cleaned)) !== null) {
          if (m[1] && m[1].trim()) {
            movies.push({
              title: m[1].trim(),
              original_title: m[2]?.trim() || "",
              reason: m[3]?.trim() || "",
            });
          }
        }

        if (movies.length > 0 || analysisMatch) {
          return {
            analysis: analysisMatch ? analysisMatch[1] : "",
            mood: moodMatch ? moodMatch[1] : "",
            genre: genreMatch ? genreMatch[1] : "",
            country: countryMatch ? countryMatch[1] : "",
            actor: actorMatch ? actorMatch[1] : "",
            movies,
          };
        }
        return null;
      }
    }
  }
}

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return NextResponse.json({
    hasServerKey: hasKey,
    activeModel: "Google Gemini Flash & Groq Universal Reasoning",
    status: hasKey ? "ready" : "fallback_only",
    cacheSize: AI_RESPONSE_CACHE.size,
  });
}

// ============================================================================
// BƯỚC 1: USER INPUT & POST CONTROLLER
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous_client";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ 30 giây rồi thử lại để bảo vệ hệ thống.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const prompt: string = body.prompt?.trim() || "";
    const userApiKey: string = body.apiKey?.trim() || "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Vui lòng nhập tâm trạng hoặc câu hỏi phim của bạn." },
        { status: 400 }
      );
    }

    // Kiểm tra cache hit
    const cacheKey = normalizeQuery(prompt);
    const cachedItem = AI_RESPONSE_CACHE.get(cacheKey);
    if (cachedItem && Date.now() - cachedItem.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        reply: cachedItem.reply,
        mood: cachedItem.mood,
        movies: cachedItem.movies,
        provider: cachedItem.provider || "Nana AI",
        cached: true,
      });
    }

    // ========================================================================
    // BƯỚC 2: AI INTENT EXTRACTION (LLM AS STRUCTURED ANALYST & PARSER)
    // ========================================================================
    const systemPrompt = `Bạn là Nana AI - Trợ Lý Điện Ảnh Thông Minh & Phân Tích Ý Định Tìm Kiếm Phim của Nanaflix.

NHIỆM VỤ:
Phân tích yêu cầu tự nhiên của người dùng (kể cả câu dài nhiều tầng nghĩa kết hợp thể loại + quốc gia + thập niên + diễn viên/đạo diễn + chi tiết cốt truyện) và trích xuất JSON sạch chuẩn xác.

QUY TẮC BÓC TÁCH THỰC THỂ:
1. "actor": Trích xuất tên diễn viên nếu có (ví dụ: "Thành Long", "Châu Tinh Trì", "Chân Tử Đan", "Tom Cruise", "Keanu Reeves", "Trấn Thành"...).
2. "genre": Trích xuất thể loại/chủ đề chính (ví dụ: "hanh-dong", "kinh-di", "hai-huoc", "tinh-cam", "hoat-hinh", "vien-tuong", "co-trang", "tam-ly", "trinh-tham", "vo-thuat", "chien-tranh", "tai-lieu", "phieu-luu").
3. "country": Trích xuất quốc gia mục tiêu chuẩn hóa (ví dụ: "au-my", "thai-lan", "han-quoc", "hong-kong", "nhat-ban", "trung-quoc", "viet-nam").
4. "year_from" & "year_to": Nếu người dùng nhắc đến thập niên (vd: "thập niên 90" -> year_from: 1990, year_to: 1999).
5. "keyword": Trích xuất chi tiết cốt truyện hoặc bối cảnh đặc thù (ví dụ: "cướp ngân hàng", "vòng lặp thời gian", "sóng thần", "đầu bếp", "đấu trí").
6. "director": Đạo diễn nếu có (ví dụ: "Christopher Nolan", "Quentin Tarantino"...).
7. "excluded_countries": Danh sách các quốc gia người dùng yêu cầu LOẠI TRỪ.
8. "excluded_genres": Danh sách các thể loại người dùng yêu cầu LOẠI TRỪ.
9. "suggested_movies": Đề xuất 8-10 phim THỰC TẾ, NỔI TIẾNG KINH ĐIỂN khớp 100% với diễn viên, quốc gia, thể loại hoặc cốt truyện.
10. KHÔNG BIAS TÊN: Tuyệt đối không tự động đưa anime "Nana" vào danh sách trừ khi người dùng đích danh tìm kiếm phim đó.
11. "analysis": Lời chào tự nhiên, sành sỏi về điện ảnh giới thiệu ngắn gọn điểm hấp dẫn nhất của nhóm phim này (KHÔNG lặp lại nguyên văn câu hỏi người dùng).

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "analysis": "Lời chào tự nhiên, sâu sắc giới thiệu nhóm phim được chọn",
  "mood": "Tên chủ đề ngắn gọn kèm Emoji (vd: 'Siêu Phẩm Điện Ảnh Thành Long 🥋')",
  "actor": "thành long",
  "genre": "vo-thuat",
  "country": "hong-kong",
  "year_from": 0,
  "year_to": 0,
  "keyword": "",
  "director": "",
  "excluded_countries": [],
  "excluded_genres": [],
  "suggested_movies": [
    {
      "title": "Tên tiếng Việt",
      "original_title": "Tên gốc quốc tế / tiếng Anh",
      "year": 1995,
      "reason": "Lý do ngắn gọn nêu bật điểm sáng giá nhất của phim này khớp với yêu cầu"
    }
  ]
}`;

    let aiParsed: {
      analysis?: string;
      mood?: string;
      genre?: string;
      country?: string;
      year_from?: number;
      year_to?: number;
      keyword?: string;
      actor?: string;
      director?: string;
      excluded_countries?: string[];
      excluded_genres?: string[];
      suggested_movies?: Array<{
        title: string;
        original_title?: string;
        year?: number;
        reason?: string;
      }>;
      movies?: Array<{
        title: string;
        original_title?: string;
        year?: number;
        reason?: string;
      }>;
    } | null = null;

    let aiProviderName = "Nana AI Engine";

    try {
      const aiRes = await generateFastAiChat({
        systemPrompt,
        userPrompt: `Phân tích yêu cầu tìm phim: "${prompt}". Trả về JSON theo đúng định dạng.`,
        temperature: 0.2,
        maxTokens: 1400,
        jsonMode: true,
        customApiKey: userApiKey,
        timeoutMs: 9500,
      });

      if (aiRes && aiRes.text) {
        aiParsed = safeParseAiJson(aiRes.text);
        if (aiRes.provider) aiProviderName = aiRes.provider;
      }
    } catch (aiErr) {
      console.warn("AI LLM call failed or timed out:", aiErr);
    }

    // ========================================================================
    // BƯỚC 3: SLUG MAPPING & DATABASE DETERMINISTIC QUERYING
    // ========================================================================
    const rawActor = aiParsed?.actor || "";
    const rawGenre = aiParsed?.genre || "";
    const rawCountry = aiParsed?.country || "";
    const rawDirector = aiParsed?.director || "";
    const rawKeyword = aiParsed?.keyword || "";

    // 1. Dịch JSON của AI thành các slug chuẩn hóa
    const targetActorSlug = resolveActorSlug(rawActor) || resolveActorSlug(prompt);
    const targetGenreSlug = resolveGenreSlug(rawGenre) || resolveGenreSlug(prompt);
    const targetCountrySlug = resolveCountrySlug(rawCountry) || resolveCountrySlug(prompt);

    // Xử lý thập niên nếu prompt có
    let yearFrom = aiParsed?.year_from || 0;
    let yearTo = aiParsed?.year_to || 0;
    const lowerPrompt = prompt.toLowerCase();
    if (!yearFrom && !yearTo) {
      if (lowerPrompt.includes("thap nien 90") || lowerPrompt.includes("thập niên 90") || lowerPrompt.includes("90s")) {
        yearFrom = 1990;
        yearTo = 1999;
      } else if (lowerPrompt.includes("thap nien 80") || lowerPrompt.includes("thập niên 80") || lowerPrompt.includes("80s")) {
        yearFrom = 1980;
        yearTo = 1989;
      } else if (lowerPrompt.includes("thap nien 2000") || lowerPrompt.includes("thập niên 2000") || lowerPrompt.includes("2000s")) {
        yearFrom = 2000;
        yearTo = 2009;
      }
    }

    const excludedCountrySlugs: string[] = [];
    for (const rawEx of aiParsed?.excluded_countries || []) {
      const s = resolveCountrySlug(rawEx);
      if (s && !excludedCountrySlugs.includes(s)) excludedCountrySlugs.push(s);
      else if (rawEx && !excludedCountrySlugs.includes(rawEx.toLowerCase())) excludedCountrySlugs.push(rawEx.toLowerCase());
    }

    if (
      (lowerPrompt.includes("không lấy") || lowerPrompt.includes("trừ") || lowerPrompt.includes("loại trừ") || lowerPrompt.includes("ko lấy")) &&
      (lowerPrompt.includes("mỹ") || lowerPrompt.includes("hollywood") || lowerPrompt.includes("âu mỹ") || lowerPrompt.includes("us"))
    ) {
      if (!excludedCountrySlugs.includes("au-my")) excludedCountrySlugs.push("au-my");
    }

    const excludedGenreSlugs: string[] = [];
    for (const rawEx of aiParsed?.excluded_genres || []) {
      const s = resolveGenreSlug(rawEx);
      if (s && !excludedGenreSlugs.includes(s)) excludedGenreSlugs.push(s);
    }

    const matchOptions: MatchOptions = {
      expectedCountry: targetCountrySlug || undefined,
      expectedGenre: targetGenreSlug || undefined,
      expectedActorSlug: targetActorSlug || undefined,
      yearFrom: yearFrom || undefined,
      yearTo: yearTo || undefined,
      excludedCountries: excludedCountrySlugs.length ? excludedCountrySlugs : undefined,
      excludedGenres: excludedGenreSlugs.length ? excludedGenreSlugs : undefined,
    };

    const cards: SuggestionCard[] = [];
    const seenSlugs = new Set<string>();

    // 2. TỔNG HỢP DANH SÁCH ỨNG VIÊN ĐA NGUỒN (AI Suggestions + Filmography Top Titles)
    const candidateMovieList: Array<{ title: string; original_title?: string; year?: number; reason?: string }> = [
      ...(aiParsed?.suggested_movies || aiParsed?.movies || []),
    ];

    // Mở rộng kho phim nếu tìm theo diễn viên nổi tiếng (Thành Long, Châu Tinh Trì, Chân Tử Đan...)
    if (targetActorSlug && ACTOR_TOP_TITLES[targetActorSlug]) {
      for (const t of ACTOR_TOP_TITLES[targetActorSlug]) {
        const viTitle = t.replace(/\([^)]*\)/g, "").trim();
        const matchEng = t.match(/\(([^)]+)\)/);
        const engTitle = matchEng ? matchEng[1].trim() : "";
        if (!candidateMovieList.some((c) => cleanNormalizedString(c.title) === cleanNormalizedString(viTitle))) {
          candidateMovieList.push({
            title: viTitle,
            original_title: engTitle,
            reason: `Tác phẩm kinh điển gắn liền với tên tuổi của ${rawActor || targetActorSlug}`,
          });
        }
      }
    }

    // 3. Pass 1: Tra cứu song song toàn bộ danh sách ứng viên
    if (candidateMovieList.length > 0) {
      let filteredSuggestions = candidateMovieList;
      if (!lowerPrompt.includes("anime nana") && !lowerPrompt.includes("nana osaki") && !lowerPrompt.includes("nana komatsu")) {
        filteredSuggestions = filteredSuggestions.filter(
          (m) => m.title.toLowerCase().trim() !== "nana" && (m.original_title || "").toLowerCase().trim() !== "nana"
        );
      }

      const lookupPromises = filteredSuggestions.slice(0, 30).map(async (m) => {
        const found = await searchSingleMovieFast(m.title, m.original_title, matchOptions);
        return {
          suggested: m,
          found,
        };
      });

      const resolved = await Promise.all(lookupPromises);

      for (const item of resolved) {
        if (item.found && item.found.slug && !seenSlugs.has(item.found.slug)) {
          const itemCountry = toSafeCountry(item.found);
          const itemCategory = toSafeCategory(item.found);

          if (excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))) continue;
          if (excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))) continue;
          if (targetCountrySlug && !matchesCountry(itemCountry, targetCountrySlug)) continue;

          seenSlugs.add(item.found.slug);
          cards.push({
            slug: item.found.slug,
            title: item.found.name || item.found.title || item.suggested.title,
            poster: toSafePoster(item.found),
            year: item.found.year || item.suggested.year || 2024,
            quality: item.found.quality || "HD",
            category: itemCategory,
            country: itemCountry || (targetCountrySlug ? "Âu Mỹ" : "Quốc Tế"),
            actors: toSafeActors(item.found),
            reason: item.suggested.reason || "Tác phẩm xuất sắc phù hợp hoàn hảo với yêu cầu của bạn",
          });
        }
      }
    }

    // 4. Pass 2: Truy vấn Database theo Diễn Viên & Từ Khóa với các biến thể Alias
    if (cards.length < 16 && (targetActorSlug || targetGenreSlug || targetCountrySlug || rawKeyword || rawDirector)) {
      const searchKeywords = targetActorSlug
        ? getActorAliases(targetActorSlug)
        : [rawActor, rawDirector, rawKeyword].filter(Boolean) as string[];

      for (const kw of searchKeywords) {
        if (cards.length >= 24) break;
        try {
          const directRes = await movieApi.getMovies({
            keyword: kw,
            category: targetGenreSlug || undefined,
            country: targetCountrySlug || undefined,
            limit: 20,
          });

          if (directRes?.items && Array.isArray(directRes.items)) {
            for (const it of directRes.items) {
              if (cards.length >= 24) break;
              if (it.slug && !seenSlugs.has(it.slug)) {
                const itemCountry = toSafeCountry(it);
                const itemCategory = toSafeCategory(it);
                const itemActors = toSafeActors(it);

                if (excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))) continue;
                if (excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))) continue;
                if (targetCountrySlug && !matchesCountry(itemCountry, targetCountrySlug)) continue;

                // Nếu đang tìm theo diễn viên, kiểm tra xem có khớp tên diễn viên không
                if (targetActorSlug) {
                  const hasActorMatch =
                    matchesActor(itemActors, targetActorSlug) ||
                    cleanNormalizedString(it.name || "").includes(cleanNormalizedString(kw)) ||
                    cleanNormalizedString(it.origin_name || "").includes(cleanNormalizedString(kw));
                  if (!hasActorMatch) continue;
                }

                seenSlugs.add(it.slug);
                cards.push({
                  slug: it.slug,
                  title: it.name || it.title || "Phim Hay",
                  poster: toSafePoster(it),
                  year: it.year || 2024,
                  quality: it.quality || "HD",
                  category: itemCategory,
                  country: itemCountry || "Quốc Tế",
                  actors: itemActors,
                  reason: targetActorSlug
                    ? `Tác phẩm tiêu biểu có sự tham gia của ngôi sao ${rawActor || kw}`
                    : "Tác phẩm đặc sắc cùng thể loại sẵn sàng thưởng thức trên nền tảng",
                });
              }
            }
          }
        } catch {}
      }
    }

    // 5. Pass 3: Nếu chưa đủ và không phải tìm theo diễn viên riêng biệt, bổ sung phim cùng thể loại/quốc gia
    if (cards.length < 6 && !targetActorSlug && (targetGenreSlug || targetCountrySlug)) {
      try {
        const fallbackRes = await movieApi.getMovies({
          category: targetGenreSlug || undefined,
          country: targetCountrySlug || undefined,
          sort: "rating",
          limit: 10,
        });
        if (fallbackRes?.items) {
          for (const it of fallbackRes.items) {
            if (cards.length >= 8) break;
            if (it.slug && !seenSlugs.has(it.slug)) {
              const itemCountry = toSafeCountry(it);
              const itemCategory = toSafeCategory(it);

              if (excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))) continue;
              if (excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))) continue;
              if (targetCountrySlug && !matchesCountry(itemCountry, targetCountrySlug)) continue;
              if (targetGenreSlug && !matchesGenre(itemCategory, targetGenreSlug)) continue;

              seenSlugs.add(it.slug);
              cards.push({
                slug: it.slug,
                title: it.name || it.title || "Phim Hay",
                poster: toSafePoster(it),
                year: it.year || 2024,
                quality: it.quality || "HD",
                category: itemCategory,
                country: itemCountry || "Quốc Tế",
                actors: toSafeActors(it),
                reason: "Siêu phẩm điện ảnh thịnh hành nhận được nhiều đánh giá tích cực",
              });
            }
          }
        }
      } catch {}
    }

    // 6. Xây dựng lời phản hồi
    let finalAnalysis = aiParsed?.analysis?.trim() || "";
    if (!finalAnalysis) {
      finalAnalysis = `Chào bạn! Nana AI đã tuyển chọn trọn bộ các siêu phẩm điện ảnh đặc sắc nhất phù hợp với yêu cầu "${prompt}" để bạn thưởng thức ngay:`;
    }

    if (cards.length === 0) {
      finalAnalysis = `Chào bạn! Hiện tại các tác phẩm đúng theo yêu cầu chi tiết "${prompt}" đang tiếp tục được cập nhật thêm vào kho phim Nanaflix. Bạn hãy thử tìm kiếm theo tên diễn viên hoặc thể loại khác nhé!`;
    }

    const finalMood = aiParsed?.mood || (targetActorSlug ? `Tuyển Tập ${rawActor || 'Diễn Viên'} ⭐` : "Điện Ảnh Tuyển Chọn ⭐");

    const finalPayload = {
      reply: finalAnalysis,
      mood: finalMood,
      movies: cards.slice(0, 24),
      provider: aiProviderName,
    };

    if (cards.length > 0) {
      if (AI_RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
        if (oldestKey) AI_RESPONSE_CACHE.delete(oldestKey);
      }
      AI_RESPONSE_CACHE.set(cacheKey, { ...finalPayload, cachedAt: Date.now() });
    }

    return NextResponse.json(finalPayload);
  } catch (error) {
    console.error("Lỗi AI Concierge:", error);
    return NextResponse.json(
      {
        reply: "Rất tiếc, đã có sự gián đoạn kết nối. Bạn hãy thử lại hoặc khám phá các thể loại thịnh hành trên thanh điều hướng nhé!",
        mood: "Gợi ý",
        movies: [],
      },
      { status: 500 }
    );
  }
}
