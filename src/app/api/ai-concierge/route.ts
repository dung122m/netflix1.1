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
// BƯỚC 3: BẢNG ÁNH XẠ CHUẨN HÓA (SLUG MAPPERS - CODE DETERMINISTIC)
// ============================================================================
export const COUNTRY_SLUG_MAP: Record<string, string[]> = {
  "thai-lan": ["thai-lan", "thailand", "thai lan", "thái lan", "thai", "xiem"],
  "han-quoc": ["han-quoc", "korea", "han quoc", "hàn quốc", "south korea", "han", "hàn"],
  "trung-quoc": ["trung-quoc", "china", "trung quoc", "trung quốc", "chinese", "hoa ngu", "hoa ngữ"],
  "hong-kong": ["hong-kong", "hong kong", "hongkong", "hồng kông", "hk", "tvb"],
  "nhat-ban": ["nhat-ban", "japan", "nhat ban", "nhật bản", "japanese", "anime", "nhat", "nhật"],
  "au-my": ["au-my", "us", "usa", "hollywood", "my", "mỹ", "au my", "âu mỹ", "anh", "uk", "phap", "pháp", "france", "duc", "đức", "germany", "y", "ý", "italy", "tay ban nha", "tây ban nha", "spain", "canada", "uc", "úc", "australia"],
  "viet-nam": ["viet-nam", "vietnam", "viet nam", "việt nam", "vn"],
  "dai-loan": ["dai-loan", "taiwan", "dai loan", "đài loan"],
  "an-do": ["an-do", "india", "an do", "ấn độ", "bollywood"],
};

export const GENRE_SLUG_MAP: Record<string, string[]> = {
  "kinh-di": ["kinh-di", "kinh di", "kinh dị", "horror", "ma", "ma quai", "ma quái", "rung ron", "rùng rợn", "am anh", "ám ảnh", "quy", "quỷ", "tam linh", "tâm linh"],
  "hanh-dong": ["hanh-dong", "hanh dong", "hành động", "action", "ban sung", "bắn súng", "truy duoi", "truy đuổi"],
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

export function resolveCountrySlug(rawCountry?: string): string {
  if (!rawCountry) return "";
  const clean = cleanNormalizedString(rawCountry);
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a) || clean.includes(cleanNormalizedString(a)))) {
      return slug;
    }
  }
  return "";
}

export function resolveGenreSlug(rawGenre?: string): string {
  if (!rawGenre) return "";
  const clean = cleanNormalizedString(rawGenre);
  for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a) || clean.includes(cleanNormalizedString(a)))) {
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
        score -= 75; // Phạt nặng nếu sai quốc gia khi người dùng đã chỉ định quốc gia rõ ràng
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
        const genreMatch = cleaned.match(/"genre"\s*:\s*"((?:\\.|[^"\\])*)"/) || cleaned.match(/"target_genre"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const countryMatch = cleaned.match(/"country"\s*:\s*"((?:\\.|[^"\\])*)"/) || cleaned.match(/"target_country"\s*:\s*"((?:\\.|[^"\\])*)"/);

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
Phân tích yêu cầu tự nhiên của người dùng và bóc tách cấu trúc JSON chứa đầy đủ các thực thể tìm kiếm: thể loại (genre), quốc gia (country), diễn viên (actor), đạo diễn (director), mốc thời gian (year_range), từ khóa mở rộng (keyword), danh sách loại trừ (excluded_countries, excluded_genres) và danh sách các phim tiêu biểu xuất sắc nhất (suggested_movies).

QUY TẮC BÓC TÁCH THỰC THỂ:
1. "genre": Trích xuất thể loại/chủ đề chính (ví dụ: "ma", "kinh dị", "hài", "võ thuật", "tình cảm", "chữa lành", "hoạt hình", "viễn tưởng", "cổ trang", "tâm lý", "trinh thám", "thảm họa", "vòng lặp thời gian"...). Nếu không có, để rỗng "".
2. "country": Trích xuất quốc gia/khu vực (ví dụ: "thái lan", "hàn quốc", "hồng kông", "nhật bản", "mỹ", "trung quốc", "việt nam", "đài loan", "âu mỹ"...). Nếu không có, để rỗng "".
3. "actor": Diễn viên được nhắc đến (ví dụ: "Thành Long", "Châu Tinh Trì", "Tom Cruise"...). Nếu không có, để rỗng "".
4. "director": Đạo diễn nếu có (ví dụ: "Christopher Nolan", "Makoto Shinkai"...). Nếu không có, để rỗng "".
5. "excluded_countries": Danh sách các quốc gia người dùng yêu cầu LOẠI TRỪ (ví dụ: "không lấy phim Mỹ" -> ["mỹ", "hollywood", "âu mỹ"]).
6. "excluded_genres": Danh sách các thể loại người dùng yêu cầu LOẠI TRỪ.
7. "suggested_movies": Đề xuất 6-8 phim thực tế, xuất sắc, khớp 100% với genre và country vừa bóc tách.
8. KHÔNG BIAS TÊN: Tuyệt đối không tự động đưa anime "Nana" vào danh sách trừ khi người dùng đích danh tìm kiếm phim đó.
9. "analysis": Lời chào tự nhiên, ấm áp, phân tích 2 câu ngắn gọn về gu phim người dùng đang tìm kiếm (KHÔNG lặp lại nguyên văn câu hỏi người dùng).

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "analysis": "Lời chào tự nhiên, sâu sắc giới thiệu nhóm phim được chọn",
  "mood": "Tên chủ đề ngắn gọn kèm Emoji (vd: 'Kinh Dị Ma Quái Thái Lan 👻')",
  "genre": "ma",
  "country": "thái lan",
  "actor": "",
  "director": "",
  "year_range": "",
  "keyword": "",
  "excluded_countries": [],
  "excluded_genres": [],
  "suggested_movies": [
    {
      "title": "Tên tiếng Việt phổ biến",
      "original_title": "Tên gốc quốc tế / tiếng Anh",
      "year": 2013,
      "reason": "Lý do ngắn gọn nêu bật điểm sáng giá nhất của phim này khớp với yêu cầu"
    }
  ]
}`;

    let aiParsed: {
      analysis?: string;
      mood?: string;
      genre?: string;
      country?: string;
      actor?: string;
      director?: string;
      year_range?: string;
      keyword?: string;
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
    const rawGenre = aiParsed?.genre || "";
    const rawCountry = aiParsed?.country || "";
    const rawActor = aiParsed?.actor || "";
    const rawDirector = aiParsed?.director || "";
    const rawKeyword = aiParsed?.keyword || "";

    // 1. Dịch JSON của AI thành các slug chuẩn hóa trong hệ thống
    const targetGenreSlug = resolveGenreSlug(rawGenre);
    const targetCountrySlug = resolveCountrySlug(rawCountry);

    const excludedCountrySlugs: string[] = [];
    for (const rawEx of aiParsed?.excluded_countries || []) {
      const s = resolveCountrySlug(rawEx);
      if (s && !excludedCountrySlugs.includes(s)) excludedCountrySlugs.push(s);
      else if (rawEx && !excludedCountrySlugs.includes(rawEx.toLowerCase())) excludedCountrySlugs.push(rawEx.toLowerCase());
    }

    const lowerPrompt = prompt.toLowerCase();
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
      excludedCountries: excludedCountrySlugs.length ? excludedCountrySlugs : undefined,
      excludedGenres: excludedGenreSlugs.length ? excludedGenreSlugs : undefined,
    };

    const cards: SuggestionCard[] = [];
    const seenSlugs = new Set<string>();

    const candidateMovieList = aiParsed?.suggested_movies || aiParsed?.movies || [];

    // 2. Pass 1: Tra cứu các phim cụ thể do AI gợi ý (nếu có)
    if (Array.isArray(candidateMovieList) && candidateMovieList.length > 0) {
      let filteredSuggestions = candidateMovieList;
      if (!lowerPrompt.includes("anime nana") && !lowerPrompt.includes("nana osaki") && !lowerPrompt.includes("nana komatsu")) {
        filteredSuggestions = filteredSuggestions.filter(
          (m) => m.title.toLowerCase().trim() !== "nana" && (m.original_title || "").toLowerCase().trim() !== "nana"
        );
      }

      const lookupPromises = filteredSuggestions.map(async (m) => {
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
            country: itemCountry || (targetCountrySlug ? "Thái Lan" : "Quốc Tế"),
            actors: toSafeActors(item.found),
            reason: item.suggested.reason || "Tác phẩm xuất sắc phù hợp hoàn hảo với yêu cầu của bạn",
          });
        }
      }
    }

    // 3. Pass 2: Truy vấn trực tiếp Database theo Target Genre & Target Country Slugs
    if (cards.length < 8 && (targetGenreSlug || targetCountrySlug || rawActor || rawDirector || rawKeyword)) {
      try {
        const directRes = await movieApi.getMovies({
          category: targetGenreSlug || undefined,
          country: targetCountrySlug || undefined,
          keyword: rawActor || rawDirector || rawKeyword || undefined,
          sort: "rating",
          limit: 12,
        });

        if (directRes?.items && Array.isArray(directRes.items)) {
          for (const it of directRes.items) {
            if (cards.length >= 8) break;
            if (it.slug && !seenSlugs.has(it.slug)) {
              const itemCountry = toSafeCountry(it);
              const itemCategory = toSafeCategory(it);

              if (excludedCountrySlugs.some((ex) => matchesCountry(itemCountry, ex))) continue;
              if (excludedGenreSlugs.some((ex) => matchesGenre(itemCategory, ex))) continue;
              if (targetCountrySlug && !matchesCountry(itemCountry, targetCountrySlug)) continue;

              seenSlugs.add(it.slug);
              cards.push({
                slug: it.slug,
                title: it.name || it.title || "Phim Hay",
                poster: toSafePoster(it),
                year: it.year || 2024,
                quality: it.quality || "HD",
                category: itemCategory,
                country: itemCountry || (targetCountrySlug ? "Thái Lan" : "Quốc Tế"),
                actors: toSafeActors(it),
                reason: targetGenreSlug === "kinh-di"
                  ? "Tác phẩm kinh dị kịch tính với nhiều tình tiết rùng rợn và lôi cuốn"
                  : "Tác phẩm tiêu biểu cùng thể loại đạt điểm đánh giá cao trên nền tảng",
              });
            }
          }
        }
      } catch {}
    }

    // 4. Pass 3: Nếu vẫn chưa đủ, mở rộng tìm kiếm theo từ khóa tổng hợp
    if (cards.length < 6) {
      try {
        const fallbackRes = await movieApi.getMovies({
          category: targetGenreSlug || undefined,
          country: targetCountrySlug || undefined,
          sort: "rating",
          limit: 8,
        });
        if (fallbackRes?.items) {
          for (const it of fallbackRes.items) {
            if (cards.length >= 8) break;
            if (it.slug && !seenSlugs.has(it.slug)) {
              seenSlugs.add(it.slug);
              cards.push({
                slug: it.slug,
                title: it.name || it.title || "Phim Hay",
                poster: toSafePoster(it),
                year: it.year || 2024,
                quality: it.quality || "HD",
                category: toSafeCategory(it),
                country: toSafeCountry(it) || "Quốc Tế",
                actors: toSafeActors(it),
                reason: "Siêu phẩm điện ảnh thịnh hành nhận được nhiều đánh giá tích cực",
              });
            }
          }
        }
      } catch {}
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
