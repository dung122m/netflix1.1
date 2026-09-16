import { movieApi } from "@/services/movieApi";
import { generateFastAiChat } from "@/services/aiProviderService";

export interface ActorFilmography {
  name: string;
  aliases: string[];
  country: string;
  titles: string[];
}

// In-memory cache thông minh cho các truy vấn AI phân giải diễn viên (TTL: 7 ngày)
const ACTOR_AI_CACHE = new Map<
  string,
  { actorName: string; country?: string; titles: string[]; isActor: boolean; expireAt: number }
>();
const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache cho danh sách phim đã tìm thấy từ kho (TTL: 1 giờ)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number }>();
const CACHE_1_HOUR = 60 * 60 * 1000;

/**
 * Chuẩn hoá chuỗi để so khớp không dấu
 */
function normalizeForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 1. PHÂN GIẢI NGHỆ SĨ & GIA TÀI ĐIỆN ẢNH BẰNG THUẦN AI (AI-FIRST)
 * - Tự động nhận diện mọi diễn viên / đạo diễn toàn cầu (Việt Nam, Hàn Quốc, Trung Quốc, Âu Mỹ, Anime...)
 * - Tự động hiểu các câu tìm kiếm vai diễn chi tiết (vd: "Châu Tinh Trì làm thám tử", "Tom Cruise lái máy bay")
 * - Tự động lưu cache 7 ngày (lần sau gọi là 0ms)
 */
export async function resolveActorMovies(keyword: string): Promise<{
  actorName: string;
  country?: string;
  titles: string[];
  isActor: boolean;
  source: "ai" | "cache" | "none";
}> {
  if (!keyword || keyword.trim().length < 2) {
    return { actorName: "", titles: [], isActor: false, source: "none" };
  }

  const clean = keyword.trim().toLowerCase();

  // 1.1 Kiểm tra Cache L1 (0ms)
  const cached = ACTOR_AI_CACHE.get(clean);
  if (cached && cached.expireAt > Date.now()) {
    return {
      actorName: cached.actorName,
      country: cached.country,
      titles: cached.titles,
      isActor: cached.isActor,
      source: "cache",
    };
  }

  // 1.2 Phân tích trực tiếp qua Fast AI (Groq Qwen 3.8 / Cloudflare / Gemini Flash)
  try {
    const promptText = `Người dùng tìm kiếm: "${keyword}".
Hãy phân tích xem từ khóa này có phải là TÊN DIỄN VIÊN / ĐẠO DIỄN ĐIỆN ẢNH (hoặc diễn viên kèm vai diễn / bối cảnh cụ thể) không?

Nếu ĐÚNG là diễn viên/đạo diễn điện ảnh:
Hãy trích xuất 6 đến 10 tác phẩm xuất sắc, có thật và phổ biến nhất tại Việt Nam (PhimAPI/Netflix) của nghệ sĩ này.
Nếu người dùng tìm kèm vai diễn/nghề nghiệp/thể loại (ví dụ: làm thám tử, cảnh sát, sát thủ, võ thuật...), CHỈ CHỌN các phim đúng vai diễn hoặc bối cảnh này!

Trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "isActor": true,
  "actorName": "Tên tiếng Việt chuẩn của diễn viên (vd: Châu Tinh Trì, Tạ Đình Phong, Trường Giang, Tom Cruise)",
  "country": "Quốc gia (vd: Hồng Kông 🇭🇰, Việt Nam 🇻🇳, Hàn Quốc 🇰🇷, Hollywood 🇺🇸)",
  "titles": ["Tên phim 1 tiếng Việt", "Tên phim 2", "Tên phim 3", "Tên phim 4", "Tên phim 5", "Tên phim 6"]
}

Nếu KHÔNG PHẢI là diễn viên/đạo diễn (mà là tên phim bình thường, thể loại, hoặc từ vô nghĩa):
Trả về DUY NHẤT:
{
  "isActor": false
}`;

    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là chuyên gia bách khoa toàn thư điện ảnh. Trả về DUY NHẤT định dạng JSON.",
      userPrompt: promptText,
      temperature: 0.1,
      maxTokens: 500,
      jsonMode: true,
      timeoutMs: 4000,
    });

    if (aiRes && aiRes.text) {
      const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

      if (parsed.isActor && Array.isArray(parsed.titles) && parsed.titles.length > 0) {
        const actorName = parsed.actorName || keyword;
        const country = parsed.country || undefined;
        const titles = parsed.titles.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0);

        ACTOR_AI_CACHE.set(clean, {
          actorName,
          country,
          titles,
          isActor: true,
          expireAt: Date.now() + CACHE_7_DAYS,
        });

        return {
          actorName,
          country,
          titles,
          isActor: true,
          source: "ai",
        };
      } else {
        // Cache lại kết quả false trong 1 ngày để không gọi AI liên tục cho từ khóa không phải diễn viên
        ACTOR_AI_CACHE.set(clean, {
          actorName: "",
          titles: [],
          isActor: false,
          expireAt: Date.now() + 24 * 60 * 60 * 1000,
        });
      }
    }
  } catch (err) {
    console.warn("[aiActorService] Fast AI resolution error:", err);
  }

  return {
    actorName: "",
    titles: [],
    isActor: false,
    source: "none",
  };
}

/**
 * 2. TÌM KIẾM VÀ SO KHỚP CHÍNH XÁC 1:1 PHIM TỪ KHO PHIM API (CÓ BỘ NHỚ ĐỆM 1 GIỜ)
 * Loại bỏ triệt để các phim lạc đề, chỉ giữ lại các phim khớp chính xác
 */
export async function fetchMoviesByTitles(
  titles: string[],
  maxMovies = 16
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!titles || titles.length === 0) return [];

  const cacheKey = titles.slice(0, 10).join("|");
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const seenSlugs = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  // Thực thi song song tìm kiếm từng tựa phim
  const tasks = titles.slice(0, 12).map(async (t) => {
    try {
      const cleanTarget = normalizeForMatch(t.replace(/\([^)]*\)/g, ""));
      if (!cleanTarget) return null;

      const res = await movieApi.getMovies({
        keyword: t.replace(/\([^)]*\)/g, "").trim(),
        page: 1,
        limit: 5,
      });

      const items = res?.items || [];
      if (items.length === 0) return null;

      // Tìm bộ phim có tiêu đề khớp chính xác nhất với tên phim mục tiêu
      let bestItem = null;
      let bestScore = -999;

      for (const it of items) {
        const name = normalizeForMatch(it.name || it.title || "");
        const orig = normalizeForMatch(it.origin_name || "");
        const slug = normalizeForMatch(it.slug || "");

        let score = 0;
        if (name === cleanTarget || orig === cleanTarget || slug === cleanTarget.replace(/\s+/g, "-")) {
          score += 100;
        } else if (name.startsWith(cleanTarget) || orig.startsWith(cleanTarget)) {
          score += 80;
        } else if (name.includes(cleanTarget) || orig.includes(cleanTarget)) {
          score += 60;
        } else {
          // So khớp từ khóa
          const targetWords = cleanTarget.split(" ").filter((w) => w.length > 1);
          const matchCount = targetWords.filter((w) => name.includes(w) || orig.includes(w) || slug.includes(w)).length;
          const ratio = targetWords.length > 0 ? matchCount / targetWords.length : 0;
          if (ratio >= 0.5) {
            score += Math.round(ratio * 60);
          } else {
            score -= 20;
          }
        }

        // Độ dài lệch
        const lenDiff = Math.abs(name.length - cleanTarget.length);
        score -= Math.min(20, lenDiff * 0.8);

        if (score > bestScore) {
          bestScore = score;
          bestItem = it;
        }
      }

      // Chỉ trả về khi có độ khớp hợp lý (tránh fallback lấy bừa phim đầu tiên gây lạc đề)
      if (bestItem && bestScore >= 25) {
        return bestItem;
      }
      return null;
    } catch {
      return null;
    }
  });

  const bestItems = await Promise.all(tasks);
  for (const item of bestItems) {
    if (item && item.slug && !seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      results.push(item);
    }
    if (results.length >= maxMovies) break;
  }

  if (results.length > 0) {
    ACTOR_FILM_CACHE.set(cacheKey, {
      items: results,
      expireAt: Date.now() + CACHE_1_HOUR,
    });
  }

  return results;
}
