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

function cleanNormalizedString(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findBestMatchMovie(items: any[], query: string, originalQuery?: string): any {
  if (!items || items.length === 0) return null;
  const cleanQ = cleanNormalizedString(query || "");
  const cleanOq = cleanNormalizedString(originalQuery || "");

  let bestItem = null;
  let bestScore = -999;

  for (const it of items) {
    const name = cleanNormalizedString(it.name || it.title || "");
    const orig = cleanNormalizedString(it.origin_name || "");
    const slug = cleanNormalizedString(it.slug || "");

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
    score -= Math.min(20, lenDiff * 1.2);

    if (it.thumb_url || it.poster_url) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestItem = it;
    }
  }

  return bestScore > 10 ? bestItem : (items[0] || null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryPhimApiDirect(keyword: string, originalKeyword?: string): Promise<any> {
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
      const best = findBestMatchMovie(items, keyword, originalKeyword);
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
async function searchSingleMovieFast(title: string, originalTitle?: string): Promise<any> {
  const cleanTitle = (title || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const cleanOriginal = (originalTitle || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  if (!cleanTitle && !cleanOriginal) return null;

  const key = `${cleanTitle}__${cleanOriginal}`.toLowerCase();
  const cached = TITLE_LOOKUP_CACHE.get(key);
  if (cached && Date.now() < cached.expireAt) return cached.item;

  let foundItem = null;

  if (cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanTitle, cleanOriginal);
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanOriginal, cleanTitle);
  }

  if (!foundItem && cleanTitle) {
    try {
      const res1 = await Promise.race([
        movieApi.getMovies({ keyword: cleanTitle, page: 1, limit: 5 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res1?.items && res1.items.length > 0) {
        foundItem = findBestMatchMovie(res1.items, cleanTitle, cleanOriginal);
      }
    } catch {}
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    try {
      const res2 = await Promise.race([
        movieApi.getMovies({ keyword: cleanOriginal, page: 1, limit: 5 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res2?.items && res2.items.length > 0) {
        foundItem = findBestMatchMovie(res2.items, cleanOriginal, cleanTitle);
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
        const genreMatch = cleaned.match(/"genre_slug"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const countryMatch = cleaned.match(/"country_slug"\s*:\s*"((?:\\.|[^"\\])*)"/);

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
            genre_slug: genreMatch ? genreMatch[1] : "",
            country_slug: countryMatch ? countryMatch[1] : "",
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
    activeModel: "Google Gemini Flash & Groq Fast Engine",
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
    // GENERAL PURPOSE AI CINEMA REASONING ENGINE (KHÔNG HARDCODE IF/ELSE)
    // ========================================================================
    const systemPrompt = `Bạn là Nana AI - Chuyên Gia Tư Vấn Điện Ảnh Thông Minh & Thân Thiện của nền tảng xem phim Nanaflix.
Bạn sở hữu kiến thức bách khoa toàn thư sâu rộng về điện ảnh thế giới (Hollywood, Châu Á, Châu Âu, Anime, phim độc lập, các dòng phim kinh điển từ quá khứ đến hiện đại).

NĂNG LỰC CỦA BẠN:
- Hiểu sâu sắc mọi yêu cầu của người dùng: từ khóa mập mờ, tiếng lóng ("cuốn cuốn", "lú đầu", "hack não", "chữa lành", "chill"), cảm xúc trừu tượng, bối cảnh đặc thù (vòng lặp thời gian, hoán đổi thân xác, sinh tồn, zombie, thảm họa, du hành thời gian, trinh thám...), gộp nhiều tiêu chí (diễn viên + thời gian + chi tiết cốt truyện), và các mệnh lệnh loại trừ nghiêm ngặt ("không lấy phim Mỹ", "không có cảnh máu me"...).
- Nếu người dùng hỏi ngoài lề (nấu ăn, thời tiết, lập trình...) hoặc nói chuyện phiếm: Hãy mở đầu duyên dáng, thân thiện và khéo léo kết nối với những bộ phim điện ảnh đặc sắc có liên quan (ví dụ: hỏi nấu ăn -> gợi ý phim ẩm thực/đầu bếp truyền cảm hứng; chào hỏi -> gợi ý phim thịnh hành nhất).
- Nếu người dùng tìm nội dung 18+/nhạy cảm: Khéo léo giải thích Nanaflix là nền tảng giải trí thân thiện và chuyển hướng sang các siêu phẩm hoạt hình/anime hành động kỳ ảo chất lượng cao.

🚫 NGUYÊN TẮC QUAN TRỌNG:
1. KHÔNG BIAS TÊN: Tên bạn là Nana AI, nhưng TUYỆT ĐỐI KHÔNG tự động đưa bộ anime "Nana (2006)" vào danh sách trừ khi người dùng chủ động tìm đích danh tác phẩm đó. Tuyệt đối không bịa đặt cốt truyện của phim Nana.
2. KHÔNG LẶP CÂU HỎI: Mở đầu bằng lời chào tự nhiên, ấm áp, phân tích tinh tế về gu phim người dùng đang tìm. Không lặp lại nguyên văn cụm từ người dùng đã nhập.
3. CHÍNH XÁC & ĐA DẠNG: Đề xuất đúng 6 ĐẾN 8 BỘ PHIM THỰC TẾ, CÓ THẬT, NỔI TIẾNG VÀ ĐƯỢC ĐÁNH GIÁ CAO. Cung cấp cả tên tiếng Việt chuẩn và tên gốc quốc tế để hệ thống dễ dàng truy xuất poster & video.
4. TUÂN THỦ MỆNH LỆNH LOẠI TRỪ (Negative Constraints): Nếu người dùng yêu cầu loại trừ quốc gia hay thể loại nào (ví dụ "không lấy phim Mỹ", "trừ phim kinh dị"), bạn PHẢI tuân thủ 100% và liệt kê vào trường "excluded_countries" hoặc "excluded_genres".

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM BẤT KỲ VĂN BẢN NGOÀI LỀ NÀO):
{
  "analysis": "Lời chào tự nhiên, sâu sắc, chia sẻ góc nhìn điện ảnh về chủ đề người dùng đang quan tâm (khoảng 2-3 câu truyền cảm hứng)",
  "mood": "Tên chủ đề hoặc cảm xúc ngắn gọn kèm Emoji (ví dụ: 'Vòng Lặp Thời Gian Nghẹt Thở ⏳', 'Đồng Quê Chữa Lành Bình Yên 🌾', 'Thảm Họa Châu Á Hùng Tráng 🌊')",
  "genre_slug": "Slug thể loại chính (vd: hanh-dong, tinh-cam, hoat-hinh, vien-tuong, kinh-di, hai-huoc, co-trang, tam-ly, tai-lieu, phieu-luu...)",
  "country_slug": "Slug quốc gia chính nếu có (vd: au-my, han-quoc, trung-quoc, nhat-ban, viet-nam, thai-lan...)",
  "excluded_countries": ["Danh sách mã quốc gia bị loại trừ nếu người dùng yêu cầu, vd: 'au-my', 'us' hoặc để rỗng []"],
  "search_keywords": ["Từ khóa mở rộng để tìm thêm phim tương tự trong database"],
  "movies": [
    {
      "title": "Tên tiếng Việt phổ biến",
      "original_title": "Tên gốc quốc tế / tiếng Anh",
      "year": 2022,
      "country": "Hàn Quốc / Mỹ / Nhật Bản / ...",
      "reason": "Giải thích ngắn gọn 1 câu nêu bật điểm sáng giá nhất của phim này khớp với yêu cầu"
    }
  ]
}`;

    let aiParsed: {
      analysis?: string;
      mood?: string;
      genre_slug?: string;
      country_slug?: string;
      excluded_countries?: string[];
      search_keywords?: string[];
      movies?: Array<{
        title: string;
        original_title?: string;
        year?: number;
        country?: string;
        reason?: string;
      }>;
    } | null = null;

    let aiProviderName = "Nana AI Engine";

    try {
      const aiRes = await generateFastAiChat({
        systemPrompt,
        userPrompt: `Yêu cầu của khán giả: "${prompt}". Hãy phân tích đa chiều và trả về JSON đề xuất 6-8 phim xuất sắc.`,
        temperature: 0.3,
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
    // RESOLVE PHIM TỪ DATABASE VỚI ĐỘ CHÍNH XÁC CAO
    // ========================================================================
    const cards: SuggestionCard[] = [];
    const seenSlugs = new Set<string>();

    const excludedList: string[] = (aiParsed?.excluded_countries || []).map((c) => c.toLowerCase());
    const lowerPrompt = prompt.toLowerCase();
    if (
      (lowerPrompt.includes("không lấy") || lowerPrompt.includes("trừ") || lowerPrompt.includes("loại trừ") || lowerPrompt.includes("ko lấy")) &&
      (lowerPrompt.includes("mỹ") || lowerPrompt.includes("hollywood") || lowerPrompt.includes("âu mỹ") || lowerPrompt.includes("us"))
    ) {
      if (!excludedList.includes("au-my")) excludedList.push("au-my", "us", "hollywood", "mỹ");
    }

    const isExcluded = (countryStr: string) => {
      if (!excludedList.length || !countryStr) return false;
      const c = countryStr.toLowerCase();
      return excludedList.some((ex) => c.includes(ex));
    };

    if (aiParsed && Array.isArray(aiParsed.movies) && aiParsed.movies.length > 0) {
      // 1. Lọc bỏ trường hợp bot bị dính anime "Nana" khi người dùng không hỏi
      let suggestedList = aiParsed.movies;
      if (!lowerPrompt.includes("anime nana") && !lowerPrompt.includes("nana osaki") && !lowerPrompt.includes("nana komatsu")) {
        suggestedList = suggestedList.filter(
          (m) => m.title.toLowerCase().trim() !== "nana" && (m.original_title || "").toLowerCase().trim() !== "nana"
        );
      }

      // 2. Tìm kiếm song song trong Database
      const lookupPromises = suggestedList.map(async (m) => {
        const found = await searchSingleMovieFast(m.title, m.original_title);
        return {
          suggested: m,
          found,
        };
      });

      const resolved = await Promise.all(lookupPromises);

      for (const item of resolved) {
        if (item.found && item.found.slug && !seenSlugs.has(item.found.slug)) {
          const itemCountry = toSafeCountry(item.found);
          if (isExcluded(itemCountry)) continue;

          seenSlugs.add(item.found.slug);
          cards.push({
            slug: item.found.slug,
            title: item.found.name || item.found.title || item.suggested.title,
            poster: toSafePoster(item.found),
            year: item.found.year || item.suggested.year || 2024,
            quality: item.found.quality || "HD",
            category: toSafeCategory(item.found),
            country: itemCountry || item.suggested.country || "Quốc Tế",
            actors: toSafeActors(item.found),
            reason: item.suggested.reason || "Tác phẩm xuất sắc phù hợp hoàn hảo với yêu cầu của bạn",
          });
        }
      }
    }

    // ========================================================================
    // BỔ SUNG NĂNG ĐỘNG TỪ DATABASE NẾU CẦN ĐỂ ĐẢM BẢO LUÔN ĐỦ 6-8 PHIM
    // ========================================================================
    if (cards.length < 6) {
      const searchKeywords = [
        ...(aiParsed?.search_keywords || []),
        aiParsed?.genre_slug,
        prompt.length < 30 ? prompt : undefined,
      ].filter(Boolean) as string[];

      for (const kw of searchKeywords) {
        if (cards.length >= 8) break;
        try {
          const res = await movieApi.getMovies({
            keyword: kw,
            category: aiParsed?.genre_slug,
            country: excludedList.includes("au-my") ? "han-quoc" : aiParsed?.country_slug,
            limit: 8,
          });

          if (res?.items && Array.isArray(res.items)) {
            for (const it of res.items) {
              if (cards.length >= 8) break;
              if (it.slug && !seenSlugs.has(it.slug)) {
                const itemCountry = toSafeCountry(it);
                if (isExcluded(itemCountry)) continue;

                seenSlugs.add(it.slug);
                cards.push({
                  slug: it.slug,
                  title: it.name || it.title || "Phim Hay",
                  poster: toSafePoster(it),
                  year: it.year || 2024,
                  quality: it.quality || "HD",
                  category: toSafeCategory(it),
                  country: itemCountry || "Châu Á",
                  actors: toSafeActors(it),
                  reason: "Tác phẩm đặc sắc cùng chủ đề hiện đang có sẵn trên nền tảng",
                });
              }
            }
          }
        } catch {}
      }
    }

    // Trường hợp xấu nhất (AI hoàn toàn không phản hồi và DB chưa có kết quả): lấy danh sách phim đánh giá cao
    if (cards.length === 0) {
      try {
        const defaultRes = await movieApi.getMovies({
          sort: "rating",
          limit: 8,
          country: excludedList.includes("au-my") ? "han-quoc" : undefined,
        });
        if (defaultRes?.items) {
          for (const it of defaultRes.items) {
            if (it.slug && !seenSlugs.has(it.slug)) {
              seenSlugs.add(it.slug);
              cards.push({
                slug: it.slug,
                title: it.name || it.title || "Phim Hot",
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
