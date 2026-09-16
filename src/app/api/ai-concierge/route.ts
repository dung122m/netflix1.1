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

// Bảng ánh xạ bí danh quốc gia chuẩn hóa
const COUNTRY_SLUG_MAP: Record<string, string[]> = {
  "thai-lan": ["thai-lan", "thailand", "thai lan", "thái lan", "thai"],
  "han-quoc": ["han-quoc", "korea", "han quoc", "hàn quốc", "south korea"],
  "trung-quoc": ["trung-quoc", "china", "trung quoc", "trung quốc", "chinese"],
  "hong-kong": ["hong-kong", "hong kong", "hongkong", "hồng kông", "hk"],
  "nhat-ban": ["nhat-ban", "japan", "nhat ban", "nhật bản", "japanese", "anime"],
  "au-my": ["au-my", "us", "usa", "hollywood", "my", "mỹ", "au my", "âu mỹ", "anh", "uk", "phap", "pháp", "france", "duc", "đức", "germany", "y", "ý", "italy", "tay ban nha", "tây ban nha", "spain"],
  "viet-nam": ["viet-nam", "vietnam", "viet nam", "việt nam"],
  "dai-loan": ["dai-loan", "taiwan", "dai loan", "đài loan"],
  "an-do": ["an-do", "india", "an do", "ấn độ", "bollywood"],
};

// Bảng ánh xạ thể loại chuẩn hóa
const GENRE_SLUG_MAP: Record<string, string[]> = {
  "kinh-di": ["kinh-di", "kinh di", "kinh dị", "horror", "ma", "rung ron", "rùng rợn", "am anh", "ám ảnh", "quy"],
  "hanh-dong": ["hanh-dong", "hanh dong", "hành động", "action"],
  "hai-huoc": ["hai-huoc", "hai huoc", "hài hước", "hai", "hài", "comedy"],
  "tinh-cam": ["tinh-cam", "tinh cam", "tình cảm", "lang man", "lãng mạn", "romance"],
  "hoat-hinh": ["hoat-hinh", "hoat hinh", "hoạt hình", "anime", "animation"],
  "vien-tuong": ["vien-tuong", "vien tuong", "viễn tưởng", "khoa hoc vien tuong", "khoa học viễn tưởng", "sci-fi"],
  "co-trang": ["co-trang", "co trang", "cổ trang"],
  "tam-ly": ["tam-ly", "tam ly", "tâm lý", "drama"],
  "trinh-tham": ["trinh-tham", "trinh tham", "trinh thám", "bi an", "bí ẩn", "mystery", "investigation"],
  "vo-thuat": ["vo-thuat", "vo thuat", "võ thuật", "kungfu", "martial arts"],
  "chien-tranh": ["chien-tranh", "chien tranh", "chiến tranh", "war"],
  "tai-lieu": ["tai-lieu", "tai lieu", "tài liệu", "documentary"],
  "phieu-luu": ["phieu-luu", "phieu luu", "phiêu lưu", "adventure"],
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

    // Kiểm tra loại trừ
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

    // Kiểm tra tính nhất quán về quốc gia và thể loại
    if (options?.expectedCountry) {
      if (matchesCountry(country, options.expectedCountry)) {
        score += 35;
      } else if (country) {
        score -= 75; // Phạt nặng nếu sai quốc gia khi người dùng đã chỉ định quốc gia rõ ràng!
      }
    }

    if (options?.expectedGenre) {
      if (matchesGenre(category, options.expectedGenre)) {
        score += 25;
      } else if (category && !matchesGenre(category, options.expectedGenre)) {
        score -= 30; // Phạt nếu sai thể loại
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = it;
    }
  }

  // Chỉ chấp nhận kết quả có điểm tin cậy cao (>= 45), KHÔNG tự tiện lấy items[0] sai lệch
  return bestScore >= 45 ? bestItem : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryPhimApiDirect(keyword: string, originalKeyword?: string, options?: MatchOptions): Promise<any> {
  if (!keyword?.trim()) return null;
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}&limit=6`,
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
        const genreMatch = cleaned.match(/"target_genre"\s*:\s*"((?:\\.|[^"\\])*)"/) || cleaned.match(/"genre_slug"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const countryMatch = cleaned.match(/"target_country"\s*:\s*"((?:\\.|[^"\\])*)"/) || cleaned.match(/"country_slug"\s*:\s*"((?:\\.|[^"\\])*)"/);

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
            target_genre: genreMatch ? genreMatch[1] : "",
            target_country: countryMatch ? countryMatch[1] : "",
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

    // KIỂM TRA BỘ NHỚ ĐỆM (CACHE HIT)
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
    // GENERAL PURPOSE AI CINEMA REASONING ENGINE (TRUY XUẤT ĐA CHIỀU)
    // ========================================================================
    const systemPrompt = `Bạn là Nana AI - Chuyên Gia Tư Vấn Điện Ảnh Thông Minh & Thân Thiện của nền tảng xem phim Nanaflix.
Bạn sở hữu kiến thức bách khoa toàn thư sâu rộng về điện ảnh thế giới (Hollywood, Châu Á, Châu Âu, Anime, phim độc lập, các dòng phim kinh điển từ quá khứ đến hiện đại).

NĂNG LỰC CỦA BẠN:
- Hiểu sâu sắc mọi yêu cầu của người dùng: từ khóa mập mờ, tiếng lóng ("cuốn cuốn", "lú đầu", "hack não", "chữa lành", "chill"), cảm xúc trừu tượng, bối cảnh đặc thù (vòng lặp thời gian, hoán đổi thân xác, sinh tồn, zombie, thảm họa, du hành thời gian, trinh thám...), gộp nhiều tiêu chí (diễn viên + thời gian + chi tiết cốt truyện), và các mệnh lệnh loại trừ nghiêm ngặt ("không lấy phim Mỹ", "không có cảnh máu me"...).
- BÓC TÁCH CHÍNH XÁC QUỐC GIA & THỂ LOẠI MỤC TIÊU:
  + Nếu người dùng hỏi "phim kinh dị Thái Lan": target_country PHẢI là "thai-lan", target_genre PHẢI là "kinh-di". TẤT CẢ các phim đề xuất BẮT BUỘC PHẢI LÀ PHIM KINH DỊ CỦA THÁI LAN (ví dụ: Shutter, Pee Mak, Ladda Land, Nang Nak, The Medium, Inhuman Kiss, 4bia, Alone...). Tuyệt đối không gợi ý phim tình cảm/hài kịch hay phim của nước khác (Ý, Trung Quốc, Mỹ...).
  + Nếu người dùng hỏi "phim võ thuật Hồng Kông": target_country là "hong-kong", target_genre là "vo-thuat".
  + Nếu người dùng hỏi "phim lãng mạn Hàn Quốc": target_country là "han-quoc", target_genre là "tinh-cam".
  + Nếu người dùng hỏi "phim cổ trang Trung Quốc": target_country là "trung-quoc", target_genre là "co-trang".
  + Nếu người dùng hỏi "anime Nhật Bản": target_country là "nhat-ban", target_genre là "hoat-hinh".
- Nếu người dùng hỏi ngoài lề (nấu ăn, thời tiết, lập trình...) hoặc nói chuyện phiếm: Hãy mở đầu duyên dáng, thân thiện và khéo léo kết nối với những bộ phim điện ảnh đặc sắc có liên quan (ví dụ: hỏi nấu ăn -> gợi ý phim ẩm thực/đầu bếp truyền cảm hứng; chào hỏi -> gợi ý phim thịnh hành nhất).
- Nếu người dùng tìm nội dung 18+/nhạy cảm: Khéo léo giải thích Nanaflix là nền tảng giải trí thân thiện và chuyển hướng sang các siêu phẩm hoạt hình/anime hành động kỳ ảo chất lượng cao.

🚫 NGUYÊN TẮC QUAN TRỌNG:
1. KHÔNG BIAS TÊN: Tên bạn là Nana AI, nhưng TUYỆT ĐỐI KHÔNG tự động đưa bộ anime "Nana (2006)" vào danh sách trừ khi người dùng chủ động tìm đích danh tác phẩm đó.
2. KHÔNG LẶP CÂU HỎI: Mở đầu bằng lời chào tự nhiên, ấm áp, phân tích tinh tế về gu phim người dùng đang tìm. Không lặp lại nguyên văn cụm từ người dùng đã nhập.
3. CHÍNH XÁC 100% VỀ QUỐC GIA & THỂ LOẠI: Đề xuất đúng 6 ĐẾN 8 BỘ PHIM THỰC TẾ, ĐÚNG QUỐC GIA VÀ ĐÚNG THỂ LOẠI NGƯỜI DÙNG YÊU CẦU.
4. TUÂN THỦ MỆNH LỆNH LOẠI TRỪ: Nếu người dùng yêu cầu loại trừ quốc gia hay thể loại nào (ví dụ "không lấy phim Mỹ", "trừ phim kinh dị"), bạn PHẢI tuân thủ 100% và liệt kê vào trường "excluded_countries" hoặc "excluded_genres".

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM BẤT KỲ VĂN BẢN NGOÀI LỀ NÀO):
{
  "analysis": "Lời chào tự nhiên, sâu sắc, chia sẻ góc nhìn điện ảnh về chủ đề người dùng đang quan tâm (khoảng 2-3 câu truyền cảm hứng)",
  "mood": "Tên chủ đề hoặc cảm xúc ngắn gọn kèm Emoji (ví dụ: 'Kinh Dị Rùng Rợn Thái Lan 👻', 'Đồng Quê Chữa Lành Bình Yên 🌾', 'Thảm Họa Châu Á Hùng Tráng 🌊')",
  "target_genre": "Slug thể loại mục tiêu (vd: kinh-di, hanh-dong, tinh-cam, hoat-hinh, vien-tuong, hai-huoc, co-trang, tam-ly, trinh-tham, vo-thuat, tai-lieu, phieu-luu...)",
  "target_country": "Slug quốc gia mục tiêu nếu có (vd: thai-lan, han-quoc, trung-quoc, nhat-ban, hong-kong, au-my, viet-nam, dai-loan, an-do...)",
  "excluded_countries": ["Danh sách mã quốc gia bị loại trừ nếu người dùng yêu cầu, vd: 'au-my', 'us' hoặc để rỗng []"],
  "excluded_genres": ["Danh sách mã thể loại bị loại trừ nếu người dùng yêu cầu, hoặc để rỗng []"],
  "search_keywords": ["Từ khóa mở rộng tìm thêm trong database"],
  "movies": [
    {
      "title": "Tên tiếng Việt phổ biến của phim",
      "original_title": "Tên gốc quốc tế / tiếng Anh",
      "year": 2013,
      "country": "Thái Lan",
      "genre": "Kinh Dị",
      "reason": "Giải thích ngắn gọn 1 câu nêu bật điểm sáng giá nhất của phim này khớp với yêu cầu"
    }
  ]
}`;

    let aiParsed: {
      analysis?: string;
      mood?: string;
      target_genre?: string;
      genre_slug?: string;
      target_country?: string;
      country_slug?: string;
      excluded_countries?: string[];
      excluded_genres?: string[];
      search_keywords?: string[];
      movies?: Array<{
        title: string;
        original_title?: string;
        year?: number;
        country?: string;
        genre?: string;
        reason?: string;
      }>;
    } | null = null;

    let aiProviderName = "Nana AI Engine";

    try {
      const aiRes = await generateFastAiChat({
        systemPrompt,
        userPrompt: `Yêu cầu của khán giả: "${prompt}". Hãy phân tích đa chiều và trả về JSON đề xuất 6-8 phim xuất sắc.`,
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
    // RESOLVE PHIM TỪ DATABASE VỚI BỘ LỌC ĐA CHIỀU NGHIÊM NGẶT
    // ========================================================================
    const targetCountry = aiParsed?.target_country || aiParsed?.country_slug || "";
    const targetGenre = aiParsed?.target_genre || aiParsed?.genre_slug || "";
    const excludedCountries: string[] = (aiParsed?.excluded_countries || []).map((c) => c.toLowerCase());
    const excludedGenres: string[] = (aiParsed?.excluded_genres || []).map((g) => g.toLowerCase());

    const lowerPrompt = prompt.toLowerCase();
    if (
      (lowerPrompt.includes("không lấy") || lowerPrompt.includes("trừ") || lowerPrompt.includes("loại trừ") || lowerPrompt.includes("ko lấy")) &&
      (lowerPrompt.includes("mỹ") || lowerPrompt.includes("hollywood") || lowerPrompt.includes("âu mỹ") || lowerPrompt.includes("us"))
    ) {
      if (!excludedCountries.includes("au-my")) excludedCountries.push("au-my", "us", "hollywood", "mỹ");
    }

    const matchOptions: MatchOptions = {
      expectedCountry: targetCountry || undefined,
      expectedGenre: targetGenre || undefined,
      excludedCountries: excludedCountries.length ? excludedCountries : undefined,
      excludedGenres: excludedGenres.length ? excludedGenres : undefined,
    };

    const cards: SuggestionCard[] = [];
    const seenSlugs = new Set<string>();

    if (aiParsed && Array.isArray(aiParsed.movies) && aiParsed.movies.length > 0) {
      // 1. Lọc bỏ trường hợp bot bị dính anime "Nana" khi người dùng không hỏi
      let suggestedList = aiParsed.movies;
      if (!lowerPrompt.includes("anime nana") && !lowerPrompt.includes("nana osaki") && !lowerPrompt.includes("nana komatsu")) {
        suggestedList = suggestedList.filter(
          (m) => m.title.toLowerCase().trim() !== "nana" && (m.original_title || "").toLowerCase().trim() !== "nana"
        );
      }

      // 2. Tìm kiếm song song trong Database với bộ tiêu chí đối chiếu chính xác
      const lookupPromises = suggestedList.map(async (m) => {
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

          // Kiểm tra loại trừ
          if (excludedCountries.some((ex) => matchesCountry(itemCountry, ex))) continue;
          if (excludedGenres.some((ex) => matchesGenre(itemCategory, ex))) continue;

          // Kiểm tra quốc gia nếu có yêu cầu
          if (targetCountry && !matchesCountry(itemCountry, targetCountry)) continue;

          seenSlugs.add(item.found.slug);
          cards.push({
            slug: item.found.slug,
            title: item.found.name || item.found.title || item.suggested.title,
            poster: toSafePoster(item.found),
            year: item.found.year || item.suggested.year || 2024,
            quality: item.found.quality || "HD",
            category: itemCategory,
            country: itemCountry || (targetCountry ? "Thái Lan" : "Quốc Tế"),
            actors: toSafeActors(item.found),
            reason: item.suggested.reason || "Tác phẩm xuất sắc phù hợp hoàn hảo với yêu cầu của bạn",
          });
        }
      }
    }

    // ========================================================================
    // BỔ SUNG NĂNG ĐỘNG TỪ DATABASE THEO ĐÚNG TIÊU CHÍ TARGET GENRE & COUNTRY
    // ========================================================================
    if (cards.length < 6) {
      try {
        const queryParams: Record<string, string | number> = {
          limit: 12,
          sort: "rating",
        };
        if (targetGenre) queryParams.category = targetGenre;
        if (targetCountry) queryParams.country = targetCountry;

        const directRes = await movieApi.getMovies(queryParams);
        if (directRes?.items && Array.isArray(directRes.items)) {
          for (const it of directRes.items) {
            if (cards.length >= 8) break;
            if (it.slug && !seenSlugs.has(it.slug)) {
              const itemCountry = toSafeCountry(it);
              const itemCategory = toSafeCategory(it);

              if (excludedCountries.some((ex) => matchesCountry(itemCountry, ex))) continue;
              if (excludedGenres.some((ex) => matchesGenre(itemCategory, ex))) continue;
              if (targetCountry && !matchesCountry(itemCountry, targetCountry)) continue;

              seenSlugs.add(it.slug);
              cards.push({
                slug: it.slug,
                title: it.name || it.title || "Phim Hay",
                poster: toSafePoster(it),
                year: it.year || 2024,
                quality: it.quality || "HD",
                category: itemCategory,
                country: itemCountry || (targetCountry ? "Thái Lan" : "Quốc Tế"),
                actors: toSafeActors(it),
                reason: targetGenre === "kinh-di"
                  ? "Tác phẩm kinh dị kịch tính với nhiều tình tiết rùng rợn và lôi cuốn"
                  : "Tác phẩm tiêu biểu cùng chủ đề đạt điểm đánh giá cao trên nền tảng",
              });
            }
          }
        }
      } catch {}
    }

    // Nếu vẫn chưa đủ, thử mở rộng bằng các từ khóa do AI đề xuất
    if (cards.length < 6 && aiParsed?.search_keywords?.length) {
      for (const kw of aiParsed.search_keywords) {
        if (cards.length >= 8) break;
        try {
          const res = await movieApi.getMovies({
            keyword: kw,
            category: targetGenre || undefined,
            country: targetCountry || undefined,
            limit: 6,
          });

          if (res?.items && Array.isArray(res.items)) {
            for (const it of res.items) {
              if (cards.length >= 8) break;
              if (it.slug && !seenSlugs.has(it.slug)) {
                const itemCountry = toSafeCountry(it);
                const itemCategory = toSafeCategory(it);

                if (excludedCountries.some((ex) => matchesCountry(itemCountry, ex))) continue;
                if (excludedGenres.some((ex) => matchesGenre(itemCategory, ex))) continue;
                if (targetCountry && !matchesCountry(itemCountry, targetCountry)) continue;

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
                  reason: "Tác phẩm đặc sắc cùng phong cách sẵn sàng thưởng thức",
                });
              }
            }
          }
        } catch {}
      }
    }

    const finalAnalysis =
      aiParsed?.analysis?.trim() ||
      "Chào bạn! Nana AI đã phân tích yêu cầu của bạn và tuyển chọn danh sách các siêu phẩm điện ảnh xuất sắc, giàu cảm xúc và cuốn hút nhất để bạn thưởng thức ngay nè:";

    const finalMood = aiParsed?.mood || "Điện Ảnh Tuyển Chọn ⭐";

    const finalPayload = {
      reply: finalAnalysis,
      mood: finalMood,
      movies: cards.slice(0, 12),
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
