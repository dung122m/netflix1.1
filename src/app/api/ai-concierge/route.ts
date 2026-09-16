import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { sanitizeImageUrl } from "@/lib/movieMedia";
import { generateFastAiChat } from "@/services/aiProviderService";

export const maxDuration = 15;

interface SuggestionCard {
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

interface UserIntent {
  category?: string;
  country?: string;
  countryName?: string;
  excludedCountries?: string[];
  actor?: string;
  director?: string;
  universe?: string;
  timePeriod?: string;
  isNsfw?: boolean;
  isOffTopic?: boolean;
  isHealingRural?: boolean;
  isTimeLoop?: boolean;
  isDisasterNonUs?: boolean;
  isAnimeCrossover?: boolean;
  moodLabel: string;
  defaultAnalysis: string;
  reasons: string[];
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
      { signal: AbortSignal.timeout(2200), next: { revalidate: 3600 } }
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
async function searchSingleMovieFast(title: string, originalTitle: string): Promise<any> {
  const cleanTitle = (title || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const cleanOriginal = (originalTitle || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
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
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
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
    TITLE_LOOKUP_CACHE.set(key, { item: null, expireAt: Date.now() + 1000 * 30 });
  }

  return foundItem;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeCountry(item: any): string {
  if (Array.isArray(item?.country) && item.country.length > 0) {
    return item.country[0]?.slug || item.country[0]?.name || "";
  }
  if (typeof item?.country === "string") return item.country;
  return "";
}

// BỘ PHÂN TÍCH Ý ĐỊNH ĐA CHIỀU & BỘ QUY TẮC NÂNG CAO (Anti-Bias, Negative Filter, Concepts)
function parseUserIntent(prompt: string): UserIntent {
  const p = prompt.toLowerCase();

  // 1. KIỂM TRA EDGE CASE: NỘI DUNG 18+ / NHẠY CẢM
  const isNsfw =
    p.includes("18+") ||
    p.includes("sex") ||
    p.includes("khiêu dâm") ||
    p.includes("khieu dam") ||
    p.includes("hentai") ||
    p.includes("jav") ||
    p.includes("phim cấp 3") ||
    p.includes("phim cap 3") ||
    p.includes("phim heo") ||
    p.includes("nude") ||
    p.includes("người lớn") ||
    p.includes("nguoi lon");

  // 2. KIỂM TRA EDGE CASE: NGOÀI LỀ PHIM ẢNH
  const isOffTopic =
    (p.includes("nấu") || p.includes("cách làm") || p.includes("công thức") || p.includes("nấu phở") || p.includes("phở bò")) &&
    !p.includes("phim") &&
    !p.includes("xem") ||
    p.includes("thời tiết") ||
    p.includes("viết code") ||
    p.includes("lập trình") ||
    p.includes("chứng khoán") ||
    p.includes("giải toán");

  // 3. NEGATIVE CONSTRAINTS (LOẠI TRỪ KHẮT KHE)
  const excludedCountries: string[] = [];
  if (
    (p.includes("không lấy") || p.includes("không phải") || p.includes("trừ") || p.includes("loại trừ") || p.includes("ko lấy")) &&
    (p.includes("mỹ") || p.includes("hollywood") || p.includes("âu mỹ") || p.includes("us"))
  ) {
    excludedCountries.push("au-my", "us", "hollywood");
  }

  // 4. VIBE / CHỮA LÀNH ĐỒNG QUÊ / ZERO DRAMA
  const isHealingRural =
    (p.includes("chữa lành") || p.includes("chua lanh") || p.includes("đồng quê") || p.includes("dong que") || p.includes("chán nản") || p.includes("bình yên")) &&
    (p.includes("nhẹ nhàng") || p.includes("không có drama") || p.includes("không drama") || p.includes("không cãi vã") || p.includes("chill"));

  // 5. CONCEPT VÒNG LẶP THỜI GIAN (TIME LOOP)
  const isTimeLoop =
    p.includes("vòng lặp") ||
    p.includes("vong lap") ||
    p.includes("time loop") ||
    p.includes("chết đi sống lại") ||
    p.includes("chet di song lai") ||
    p.includes("lặp lại một ngày") ||
    p.includes("lặp lại ngày");

  // 6. PHIM THẢM HỌA KHÔNG PHẢI MỸ
  const isDisasterNonUs =
    (p.includes("thảm họa") || p.includes("tham hoa") || p.includes("sóng thần") || p.includes("song than") || p.includes("động đất")) &&
    excludedCountries.length > 0;

  // 7. CROSSOVER STYLE (ANIME TRINH THÁM + VISUAL MAKOTO SHINKAI)
  const isAnimeCrossover =
    (p.includes("anime") || p.includes("hoạt hình")) &&
    (p.includes("trinh thám") || p.includes("conan") || p.includes("hack não") || p.includes("bí ẩn")) &&
    (p.includes("makoto shinkai") || p.includes("shinkai") || p.includes("đẹp lung linh") || p.includes("màu phim"));

  // 8. VŨ TRỤ ĐIỆN ẢNH & TIMELINE
  let universe = "";
  if (p.includes("marvel") || p.includes("mcu") || p.includes("avengers") || p.includes("siêu anh hùng")) {
    universe = "Marvel Cinematic Universe (MCU)";
  } else if (p.includes("dc") || p.includes("batman") || p.includes("superman") || p.includes("justice league")) {
    universe = "DC Extended Universe (DCEU)";
  } else if (p.includes("harry potter") || p.includes("phù thủy") || p.includes("hogwarts")) {
    universe = "Thế Giới Phù Thủy Harry Potter";
  } else if (p.includes("chúa nhẫn") || p.includes("lord of the rings") || p.includes("hobbit")) {
    universe = "Chúa Tể Những Chiếc Nhẫn (Lord of the Rings)";
  } else if (p.includes("star wars") || p.includes("chiến tranh giữa các vì sao")) {
    universe = "Vũ Trụ Star Wars";
  }

  // 9. ĐẠO DIỄN
  let director = "";
  const FAMOUS_DIRECTORS = [
    { keywords: ["christopher nolan", "nolan"], name: "Christopher Nolan" },
    { keywords: ["quentin tarantino", "tarantino"], name: "Quentin Tarantino" },
    { keywords: ["denis villeneuve", "villeneuve"], name: "Denis Villeneuve" },
    { keywords: ["james cameron", "cameron"], name: "James Cameron" },
    { keywords: ["david fincher", "fincher"], name: "David Fincher" },
    { keywords: ["bong joon-ho", "bong joon ho"], name: "Bong Joon-ho" },
    { keywords: ["hayao miyazaki", "miyazaki", "ghibli"], name: "Hayao Miyazaki" },
    { keywords: ["makoto shinkai", "shinkai"], name: "Makoto Shinkai" },
    { keywords: ["châu tinh trì", "stephen chow"], name: "Châu Tinh Trì" },
  ];
  for (const d of FAMOUS_DIRECTORS) {
    if (d.keywords.some((kw) => p.includes(kw))) {
      director = d.name;
      break;
    }
  }

  // 10. DIỄN VIÊN
  let actor = "";
  const FAMOUS_ACTORS: Array<{
    keywords: string[];
    name: string;
    country?: string;
    countryName?: string;
    category?: string;
  }> = [
    { keywords: ["thành long", "jackie chan"], name: "Thành Long", country: "hong-kong", countryName: "Hồng Kông 🇭🇰", category: "vo-thuat" },
    { keywords: ["châu tinh trì", "stephen chow"], name: "Châu Tinh Trì", country: "hong-kong", countryName: "Hồng Kông 🇭🇰", category: "hai-huoc" },
    { keywords: ["chân tử đan", "donnie yen"], name: "Chân Tử Đan", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "vo-thuat" },
    { keywords: ["lý liên kiệt", "jet li"], name: "Lý Liên Kiệt", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "vo-thuat" },
    { keywords: ["ngô kinh", "wu jing"], name: "Ngô Kinh", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "hanh-dong" },
    { keywords: ["tom cruise"], name: "Tom Cruise", country: "au-my", countryName: "Hollywood 🇺🇸", category: "hanh-dong" },
    { keywords: ["leonardo dicaprio", "dicaprio"], name: "Leonardo DiCaprio", country: "au-my", countryName: "Hollywood 🇺🇸", category: "tam-ly" },
    { keywords: ["keanu reeves", "john wick"], name: "Keanu Reeves", country: "au-my", countryName: "Hollywood 🇺🇸", category: "hanh-dong" },
  ];

  for (const act of FAMOUS_ACTORS) {
    if (act.keywords.some((kw) => p.includes(kw))) {
      actor = act.name;
      break;
    }
  }

  // 11. PHÂN LOẠI THỂ LOẠI & LỜI PHÂN TÍCH TỰ NHIÊN MẶC ĐỊNH
  let category = "";
  let moodLabel = "";
  let defaultAnalysis = "";
  let reasons: string[] = [];

  if (isHealingRural) {
    category = "tinh-cam";
    moodLabel = "Đồng Quê Bình Yên & Chữa Lành Không Drama 🌾🏡";
    defaultAnalysis =
      "Chào bạn! Những ngày mệt mỏi thế này thì những thước phim êm đềm, hòa mình vào thiên nhiên và không hề có drama cãi vã là liều thuốc chữa lành tuyệt vời nhất. Cùng thả lỏng và tận hưởng những kiệt tác bình yên này nhé:";
    reasons = [
      "Bình yên, nhẹ nhàng đưa bạn về với thiên nhiên đồng quê và ẩm thực thuần khiết",
      "Không hề có drama tranh đấu hay cãi vã, chỉ có sự bình thản và dịu êm",
      "Xoa dịu tâm trạng mệt mỏi và nạp đầy năng lượng tích cực cho tâm hồn",
    ];
  } else if (isTimeLoop) {
    category = "tam-ly";
    moodLabel = "Vòng Lặp Thời Gian & Chết Đi Sống Lại (Time Loop) ⏳🌀";
    defaultAnalysis =
      "Chào bạn! Vòng lặp thời gian (Time Loop) là một trong những đề tài khoa học viễn tưởng - tâm lý lôi cuốn bậc nhất với những kịch bản 'chết đi sống lại' đầy nghẹt thở và kịch tính. Dưới đây là trọn bộ những siêu phẩm time loop đỉnh cao nhất:";
    reasons = [
      "Cơ chế vòng lặp thời gian lôi cuốn, gay cấn từng giây",
      "Mỗi lần 'reset' là một nước đi chiến thuật và khám phá bí ẩn mới",
      "Cú lật ngược tình thế ngoạn mục thoát khỏi vòng xoáy vô tận",
    ];
  } else if (isDisasterNonUs) {
    category = "hanh-dong";
    moodLabel = "Thảm Họa & Sóng Thần Châu Á & Quốc Tế (Non-US) 🌊🚨";
    defaultAnalysis =
      "Chào bạn! Tuân thủ đúng yêu cầu 'không lấy phim Mỹ/Hollywood', Nana đã tuyển chọn các kiệt tác thảm họa thiên nhiên và sóng thần xuất sắc của điện ảnh Hàn Quốc, Na Uy và Châu Á với những đại cảnh hùng tráng và tình người sâu sắc:";
    reasons = [
      "Khai thác thảm họa chân thực, chạm tới cảm xúc gia đình và tình người sâu sắc",
      "Kỹ xảo điện ảnh chân thực, nghẹt thở từng phân cảnh",
      "Đặc sắc văn hóa bản địa khác biệt hoàn toàn với công thức Hollywood",
    ];
  } else if (isAnimeCrossover) {
    category = "hoat-hinh";
    moodLabel = "Anime Trinh Thám Suy Luận Đồ Họa Tuyệt Mỹ 🎨🔍";
    defaultAnalysis =
      "Chào bạn! Sự giao thoa giữa cốt truyện trinh thám/bí ẩn hack não và mỹ thuật ánh sáng lung linh đạt chuẩn điện ảnh Makoto Shinkai sẽ mang lại cho bạn trải nghiệm thị giác và tư duy trọn vẹn nhất. Dưới đây là các kiệt tác anime xuất sắc:";
    reasons = [
      "Màu phim và hiệu ứng ánh sáng lung linh huyền ảo từng khung hình",
      "Cốt truyện trinh thám suy luận tinh tế, bí ẩn đan xen tầng tầng lớp lớp",
      "Âm nhạc lay động lòng người và trải nghiệm thị giác đỉnh chóp",
    ];
  } else {
    category = "hanh-dong";
    moodLabel = "Tác Phẩm Đặc Sắc Tuyển Chọn ⭐";
    defaultAnalysis = "Chào bạn! Dưới đây là các tác phẩm điện ảnh xuất sắc được Nana AI tuyển chọn phù hợp nhất với sở thích của bạn:";
    reasons = [
      "Tác phẩm có điểm đánh giá xuất sắc và lượt xem kỷ lục",
      "Cốt truyện lôi cuốn, giữ chân người xem từ đầu đến cuối",
      "Dàn diễn viên chất lượng cùng kịch bản xuất sắc",
    ];
  }

  return {
    category,
    excludedCountries,
    actor,
    director,
    universe,
    isNsfw,
    isOffTopic,
    isHealingRural,
    isTimeLoop,
    isDisasterNonUs,
    isAnimeCrossover,
    moodLabel,
    defaultAnalysis,
    reasons,
  };
}

interface RawMovieItem {
  slug?: string;
  name?: string;
  title?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  quality?: string;
  country?: Array<{ slug?: string; name?: string }>;
  category?: Array<{ name?: string }>;
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
  if (record.count >= 30) {
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
    activeModel: "Google Gemini 2.0 Flash / Groq Hybrid",
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

    const intent = parseUserIntent(prompt);

    // ========================================================================
    // TEST CASE AN TOÀN: 18+ / NHẠY CẢM
    // ========================================================================
    if (intent.isNsfw) {
      const safeAnimeRes = await movieApi.getMovies({ category: "hoat-hinh", limit: 6, sort: "rating" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeCards: SuggestionCard[] = (safeAnimeRes?.items || []).map((item: any) => ({
        slug: item.slug,
        title: item.name || item.title || "Anime Hay",
        poster: toSafePoster(item),
        year: item.year || 2024,
        quality: item.quality || "HD",
        category: "Hoạt Hình",
        country: "Nhật Bản 🇯🇵",
        actors: toSafeActors(item),
        reason: "Tác phẩm anime hành động & phiêu lưu kỳ ảo cực kỳ ăn khách",
      }));

      return NextResponse.json({
        reply:
          "Chào bạn! Nanaflix là nền tảng giải trí thân thiện và an toàn, Nana không hỗ trợ tìm kiếm nội dung 18+ hoặc nhạy cảm nha. Tuy nhiên, nếu bạn yêu thích thể loại Hoạt Hình / Anime với cốt truyện kịch tính, đồ họa đỉnh cao và những trận chiến mãn nhãn, Nana đã chọn sẵn những siêu phẩm Anime tuyệt đỉnh dưới đây nè! ✨🍿",
        mood: "Thế Giới Anime Tuyệt Đỉnh 🎨",
        movies: safeCards,
        provider: "Nana AI Guard",
      });
    }

    // ========================================================================
    // TEST CASE NGOÀI LỀ PHIM ẢNH (NẤU ĂN, THỜI TIẾT...)
    // ========================================================================
    if (intent.isOffTopic) {
      const foodMovies = await movieApi.getMovies({ keyword: "ẩm thực", limit: 6 });
      const fallbackList = foodMovies?.items?.length ? foodMovies.items : (await movieApi.getMovies({ limit: 6 }))?.items || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeCards: SuggestionCard[] = fallbackList.map((item: any) => ({
        slug: item.slug,
        title: item.name || item.title || "Phim Hay",
        poster: toSafePoster(item),
        year: item.year || 2024,
        quality: item.quality || "HD",
        category: "Ẩm Thực & Đời Sống",
        country: toSafeCountry(item) || "Quốc Tế",
        actors: toSafeActors(item),
        reason: "Những thước phim ẩm thực ấm áp, mãn nhãn và chữa lành tâm hồn",
      }));

      return NextResponse.json({
        reply:
          "Chào bạn! Nana là trợ lý chuyên sâu về thế giới điện ảnh và phim ảnh của Nanaflix nên chưa hỗ trợ trả lời các chủ đề ngoài lề được nè! Nhưng nếu bạn có niềm đam mê bất tận với ẩm thực hoặc muốn tìm những bộ phim hấp dẫn để vừa xem vừa chill, hãy cùng Nana khám phá những tác phẩm đặc sắc dưới đây nhé! 🍲🎬",
        mood: "Phim Hay & Ẩm Thực Đời Sống 🍜",
        movies: safeCards,
        provider: "Nana AI Guard",
      });
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
    // GỌI FAST AI ENGINE VỚI BỘ LUẬT CHỐNG BIAS TÊN VÀ NÂNG CAO TƯ DUY ĐIỆN ẢNH
    // ========================================================================
    try {
      const systemPrompt = `Bạn là Trợ lý Điện Ảnh Thông Minh (Cinema AI Concierge) của nền tảng xem phim Nanaflix.
Bạn sở hữu kiến thức bách khoa toàn thư về điện ảnh thế giới: đạo diễn, diễn viên, năm phát hành, thể loại, bối cảnh kinh điển, cơ chế cốt truyện (time loop, body swap, slice-of-life) và mệnh lệnh loại trừ.

NHIỆM VỤ CỦA BẠN: Phân tích yêu cầu "${prompt}" và trả về JSON chuẩn xác nhất với 6 ĐẾN 8 BỘ PHIM PHÙ HỢP.

🚫 QUY TẮC CHỐNG TỰ ÁM THỊ TÊN (ANTI-NAME BIAS - BẮT BUỘC):
- Tên hệ thống của bạn là Nana AI. TUYỆT ĐỐI KHÔNG tự động gợi ý bộ anime/phim "Nana" (2006) hay bất kỳ phim nào chỉ vì tên nó trùng với bạn, TRỪ KHI người dùng hỏi đích danh về bộ phim "Nana" (Nana Osaki / Nana Komatsu).
- Tuyệt đối không được bịa đặt nội dung của anime Nana thành phim vòng lặp thời gian hay thể loại khác.

💬 NGUYÊN TẮC LỜI NÓI MỞ ĐẦU (ANALYSIS - BẮT BUỘC):
- Mở đầu bằng lời chào tự nhiên, ấm áp, thông minh (Ví dụ: "Chào bạn! Vòng lặp thời gian...", "Chào bạn! Những ngày mệt mỏi thế này...").
- TUYỆT ĐỐI KHÔNG lặp lại nguyên văn câu hỏi của người dùng (như "khớp với yêu cầu: ..."). Hãy dùng văn phong điện ảnh mượt mà, phân tích ngắn gọn điểm hay của nhóm phim được chọn.

🎯 QUY TẮC BẮT BUỘC CHO TỪNG DẠNG TRUY VẤN:
1. TRUY VẤN CƠ CHẾ CỐT TRUYỆN ĐẶC THÙ (Time Loop / Vòng lặp thời gian / Chết đi sống lại):
   - BẮT BUỘC chọn đúng 6-8 kiệt tác vòng lặp thời gian kinh điển: "Cuộc Chiến Luân Hồi" (Edge of Tomorrow), "Ngày Chuột Chũi" (Groundhog Day), "Sinh Nhật Chết Chóc" (Happy Death Day), "Mắc Kẹt Ở Palm Springs" (Palm Springs), "Mật Mã Gốc" (Source Code), "Khởi Đầu" (Reset), "Tam Giác Quỷ" (Triangle).

2. TRUY VẤN CẢM XÚC / VIBE (Chữa lành, đồng quê, không drama, không cãi vã):
   - BẮT BUỘC chỉ chọn dòng Slice-of-Life / Healing nhẹ nhàng yên bình: "Khu Rừng Nhỏ" (Little Forest), "Điệu Cha-Cha-Cha Làng Biển" (Hometown Cha-Cha-Cha), "Nơi Đảo Xanh" (Our Blues), "Chuyến Đi Bí Mật Của Walter Mitty" (The Secret Life of Walter Mitty), "Hàng Xóm Của Tôi Là Totoro" (My Neighbor Totoro), "Chào Mừng Đến Samdal-ri" (Welcome to Samdal-ri), "Em Gái Bé Nhỏ" (Our Little Sister), "Quán Ăn Đêm" (Midnight Diner).
   - TUYỆT ĐỐI KHÔNG chọn drama sướt mướt hay tranh đấu cãi vã.

3. MỆNH LỆNH LOẠI TRỪ KHẮT KHE (Negative Constraints - Phim thảm họa nhưng KHÔNG lấy phim Mỹ/Hollywood):
   - BẮT BUỘC TUÂN THỦ MỆNH LỆNH PHỦ ĐỊNH 100%. TUYỆT ĐỐI KHÔNG GỢI Ý phim Mỹ (như 2012, San Andreas, The Day After Tomorrow...).
   - BẮT BUỘC chỉ chọn các phim thảm họa của Hàn Quốc, Na Uy, Trung Quốc, Nhật Bản: "Sóng Thần Ở Haeundae" (Haeundae / Tidal Wave - Hàn Quốc), "Lối Thoát Trên Không" (Exit - Hàn Quốc), "Thảm Họa Hạt Nhân Pandora" (Pandora - Hàn Quốc), "Thảm Họa Sóng Thần Na Uy" (The Wave / Bølgen), "Địa Chấn Đường Sơn" (Aftershock - Trung Quốc), "Đội Cứu Hộ Biển Sâu" (The Rescue - Trung Quốc), "Chuyến Tàu Sinh Tử" (Train to Busan - Hàn Quốc).

4. GIAO THOA PHONG CÁCH (Anime trinh thám hack não kiểu Conan + đồ họa lung linh Makoto Shinkai):
   - Gợi ý các tác phẩm anime bí ẩn xuất sắc có hình ảnh tuyệt mỹ: "Tên Cậu Là Gì?" (Your Name), "Băng Trộm Kem Đá" (Hyouka), "Thị Trấn Nơi Chỉ Mình Tôi Xóa Bỏ" (Erased), "Dược Sư Tự Sự" (The Apothecary Diaries), "Đứa Con Của Thời Tiết" (Weathering With You), "Thám Tử Lừng Danh Conan: Nàng Dâu Halloween" (Movie Conan đồ họa điện ảnh tuyệt mỹ).

5. ĐỊNH DẠNG TÊN PHIM:
   - "title": Tên tiếng Việt chuẩn phổ biến (ví dụ: "Cuộc Chiến Luân Hồi", "Khu Rừng Nhỏ", "Sóng Thần Ở Haeundae", "Tên Cậu Là Gì"). KHÔNG ghi năm hay dấu ngoặc vào title.
   - "original_title": Tên gốc tiếng Anh/quốc tế (ví dụ: "Edge of Tomorrow", "Little Forest", "Haeundae", "Your Name").

BẮT BUỘC TRẢ VỀ DUY NHẤT CHUỖI JSON ĐÚNG CẤU TRÚC SAU (KHÔNG KÈM VĂN BẢN NGOÀI JSON):
{
  "analysis": "Lời mở đầu tự nhiên, thân thiện và phân tích sâu sắc từ Nana về nhóm phim được chọn",
  "mood": "Tên chủ đề ngắn gọn",
  "genre_slug": "tam-ly",
  "country_slug": "au-my",
  "movies": [
    {
      "title": "Tên tiếng Việt",
      "original_title": "Tên gốc tiếng Anh",
      "reason": "Lý do ngắn gọn nêu bật điểm đắt giá nhất của phim"
    }
  ]
}`;

      const aiRes = await generateFastAiChat({
        systemPrompt,
        userPrompt: `Hãy phân tích và gợi ý 6-8 phim xuất sắc cho: "${prompt}". Trả về JSON duy nhất.`,
        temperature: 0.2,
        maxTokens: 1200,
        jsonMode: true,
        customApiKey: userApiKey,
        timeoutMs: 9000,
      });

      if (aiRes && aiRes.text) {
        const parsed = safeParseAiJson(aiRes.text);
        if (parsed) {
          type SuggestedItem = { title: string; original_title?: string; reason?: string };
          let suggestedItems: SuggestedItem[] = [];

          if (Array.isArray(parsed.movies) && parsed.movies.length > 0) {
            suggestedItems = parsed.movies.map((m: Record<string, string>) => ({
              title: m.title || "",
              original_title: m.original_title || "",
              reason: m.reason || "",
            }));
          } else if (Array.isArray(parsed.movie_titles) && parsed.movie_titles.length > 0) {
            suggestedItems = parsed.movie_titles.map((t: string, idx: number) => ({
              title: t,
              reason: parsed.reasons?.[idx] || "",
            }));
          }

          const genreSlug: string = parsed.genre_slug || "";
          const countrySlug: string = parsed.country_slug || "";
          const cards: SuggestionCard[] = [];
          const seenSlugs = new Set<string>();

          // Lọc bỏ trường hợp bị hallucinate bộ anime "Nana" khi người dùng hỏi time loop hay chủ đề khác
          if (!prompt.toLowerCase().includes("anime nana") && !prompt.toLowerCase().includes("osaki nana")) {
            suggestedItems = suggestedItems.filter(
              (it) => it.title.toLowerCase() !== "nana" && (it.original_title || "").toLowerCase() !== "nana"
            );
          }

          const searchTasks = suggestedItems.slice(0, 8).map(async (itemObj) => {
            const cleanTitle = (itemObj.title || "").trim();
            const cleanOriginal = (itemObj.original_title || "").trim();
            const foundItem = await searchSingleMovieFast(cleanTitle, cleanOriginal);

            return {
              item: foundItem,
              fallbackTitle: cleanTitle || cleanOriginal,
              reason: itemObj.reason,
            };
          });

          const searchResults = await Promise.all(searchTasks);

          for (const r of searchResults) {
            if (r.item && r.item.slug && !seenSlugs.has(r.item.slug)) {
              const itemCountry = toSafeCountry(r.item);

              // Lọc bỏ phim Mỹ nếu có yêu cầu loại trừ
              if (intent.excludedCountries && intent.excludedCountries.length > 0) {
                if (intent.excludedCountries.some((ex) => itemCountry.toLowerCase().includes(ex) || (r.item.country && JSON.stringify(r.item.country).toLowerCase().includes(ex)))) {
                  continue;
                }
              }

              seenSlugs.add(r.item.slug);
              cards.push({
                slug: r.item.slug,
                title: r.item.name || r.item.title || r.fallbackTitle,
                poster: toSafePoster(r.item),
                year: r.item.year || 2024,
                quality: r.item.quality || "HD",
                category: r.item.category?.[0]?.name || genreSlug || "Đặc sắc",
                country: itemCountry || countrySlug || "Quốc tế",
                actors: toSafeActors(r.item),
                reason: r.reason || "Tác phẩm tiêu biểu khớp chuẩn xác với yêu cầu của bạn",
              });
            }
          }

          // Tự động bổ sung nếu kho phim thiếu để đảm bảo luôn có ít nhất 6 phim cho người dùng
          let missingNote = "";
          if (cards.length < 5) {
            if (suggestedItems.length > 0 && cards.length === 0) {
              const requestedName = suggestedItems[0].title || prompt;
              missingNote = `Chào bạn! Bộ phim "${requestedName}" hiện tại chưa có sẵn trong kho phim của Nanaflix. Tuy nhiên, Nana đã tuyển chọn ngay cho bạn các tác phẩm cùng thể loại và phong cách tương tự đang có sẵn để bạn thưởng thức ngay nè!\n\n`;
            }

            try {
              const supplementRes = await movieApi.getMovies({
                keyword: intent.actor || intent.director || undefined,
                category: genreSlug || intent.category,
                country: (intent.excludedCountries && intent.excludedCountries.length > 0) ? "han-quoc" : (countrySlug || undefined),
                limit: 10,
              });
              if (supplementRes?.items?.length) {
                for (const sItem of supplementRes.items) {
                  if (cards.length >= 8) break;
                  if (sItem.slug && !seenSlugs.has(sItem.slug)) {
                    const sCountry = toSafeCountry(sItem);
                    if (intent.excludedCountries && intent.excludedCountries.length > 0) {
                      if (intent.excludedCountries.some((ex) => sCountry.toLowerCase().includes(ex))) {
                        continue;
                      }
                    }

                    seenSlugs.add(sItem.slug);
                    cards.push({
                      slug: sItem.slug,
                      title: sItem.name || sItem.title || "Phim Hay",
                      poster: toSafePoster(sItem),
                      year: sItem.year || 2024,
                      quality: sItem.quality || "HD",
                      category: sItem.category?.[0]?.name || genreSlug || "Đặc sắc",
                      country: sCountry || countrySlug || "Quốc tế",
                      actors: toSafeActors(sItem),
                      reason: "Tác phẩm đặc sắc cùng thể loại sẵn sàng thưởng thức",
                    });
                  }
                }
              }
            } catch {}
          }

          if (cards.length > 0) {
            const finalPayload = {
              reply: missingNote
                ? `${missingNote}${parsed.analysis || ""}`
                : (parsed.analysis || "Chào bạn! Dưới đây là các tác phẩm xuất sắc nhất mà Nana AI đã tuyển chọn dành riêng cho bạn:"),
              mood: parsed.mood || intent.moodLabel,
              movies: cards.slice(0, 14),
              provider: aiRes.provider || "Nana AI Intelligence",
            };

            if (AI_RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
              const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
              if (oldestKey) AI_RESPONSE_CACHE.delete(oldestKey);
            }
            AI_RESPONSE_CACHE.set(cacheKey, { ...finalPayload, cachedAt: Date.now() });

            return NextResponse.json(finalPayload);
          }
        }
      }
    } catch (aiError) {
      console.warn("AI API fallback:", aiError);
    }

    // ========================================================================
    // DỰ PHÒNG CHUẨN XÁC NẾU MẠNG AI QUÁ TẢI (0 TOKEN FALLBACK ENGINE)
    // ========================================================================
    let movieList: RawMovieItem[] = [];

    // Danh sách phim fallback có sẵn cho từng concept đặc thù
    if (intent.isTimeLoop) {
      const timeLoopTitles = ["Cuộc Chiến Luân Hồi", "Mật Mã Gốc", "Sinh Nhật Chết Chóc", "Khởi Đầu", "Tam Giác Quỷ"];
      for (const t of timeLoopTitles) {
        const item = await searchSingleMovieFast(t, "");
        if (item && item.slug) movieList.push(item);
      }
    } else if (intent.isHealingRural) {
      const healingTitles = ["Khu Rừng Nhỏ", "Điệu Cha-Cha-Cha Làng Biển", "Nơi Đảo Xanh", "Chào Mừng Đến Samdal-ri", "Totoro"];
      for (const t of healingTitles) {
        const item = await searchSingleMovieFast(t, "");
        if (item && item.slug) movieList.push(item);
      }
    } else if (intent.isDisasterNonUs) {
      const disasterTitles = ["Sóng Thần Ở Haeundae", "Lối Thoát Trên Không", "Pandora", "Địa Chấn Đường Sơn", "Chuyến Tàu Sinh Tử"];
      for (const t of disasterTitles) {
        const item = await searchSingleMovieFast(t, "");
        if (item && item.slug) movieList.push(item);
      }
    } else if (intent.isAnimeCrossover) {
      const animeTitles = ["Tên Cậu Là Gì", "Hyouka", "Erased", "Dược Sư Tự Sự", "Nàng Dâu Halloween"];
      for (const t of animeTitles) {
        const item = await searchSingleMovieFast(t, "");
        if (item && item.slug) movieList.push(item);
      }
    }

    if (movieList.length === 0) {
      const queryParams: Record<string, string | number> = {
        sort: "rating",
        page: 1,
        limit: 14,
      };
      if (intent.category) queryParams.category = intent.category;
      if (intent.excludedCountries && intent.excludedCountries.length > 0) {
        queryParams.country = "han-quoc";
      }

      const res = await movieApi.getMovies(queryParams);
      movieList = (res?.items || []) as RawMovieItem[];
    }

    if (movieList.length === 0) {
      const fallbackRes = await movieApi.getMovies({ sort: "rating", page: 1, limit: 14 });
      movieList = (fallbackRes?.items || []) as RawMovieItem[];
    }

    const cards: SuggestionCard[] = movieList.slice(0, 12).map((item: RawMovieItem, idx: number) => ({
      slug: item.slug || "",
      title: item.name || item.title || "Phim Hay",
      poster: toSafePoster(item),
      year: item.year || 2024,
      quality: item.quality || "HD",
      category: item.category?.[0]?.name || "Đặc sắc",
      country: toSafeCountry(item) || "Quốc tế",
      actors: toSafeActors(item),
      reason: intent.reasons[idx % intent.reasons.length] || "Tác phẩm có cốt truyện hấp dẫn và đánh giá cao",
    }));

    const fallbackPayload = {
      reply: `${intent.defaultAnalysis}`,
      mood: intent.moodLabel,
      movies: cards,
      provider: "Nana AI Engine",
    };

    if (cards.length > 0) {
      AI_RESPONSE_CACHE.set(cacheKey, { ...fallbackPayload, cachedAt: Date.now() });
    }

    return NextResponse.json(fallbackPayload);
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
