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

function cleanActorQuery(query: string): string {
  return (query || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^phim\s+cua\s+/gi, "")
    .replace(/^phim\s+/gi, "")
    .replace(/^dien\s+vien\s+/gi, "")
    .replace(/^xem\s+phim\s+/gi, "")
    .replace(/^tuyen\s+tap\s+phim\s+(?:cua\s+)?/gi, "")
    .replace(/\s+dong$/gi, "")
    .replace(/\s+dien\s+xuat$/gi, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 1. PHÂN GIẢI NGHỆ SĨ & GIA TÀI ĐIỆN ẢNH BẰNG THUẦN AI ĐỘNG (100% PURE DYNAMIC AI)
 * - Tự động nhận diện MỌI diễn viên / đạo diễn trên toàn thế giới mà KHÔNG CẦN bất kỳ danh sách hardcode nào!
 * - Hỗ trợ cả tên tiếng Việt, tên phiên âm, tên tiếng Anh, nghệ danh quốc tế.
 * - Tự động lưu cache 7 ngày (lần sau gọi là 0ms).
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

  const cleanRaw = keyword.trim().toLowerCase();
  const normalizedQuery = cleanActorQuery(keyword);

  // 1.1 Kiểm tra Cache L1 (0ms)
  const cached = ACTOR_AI_CACHE.get(cleanRaw) || ACTOR_AI_CACHE.get(normalizedQuery);
  if (cached && cached.expireAt > Date.now()) {
    return {
      actorName: cached.actorName,
      country: cached.country,
      titles: cached.titles,
      isActor: cached.isActor,
      source: "cache",
    };
  }

  // 1.2 Phân tích trực tiếp qua Fast AI (Smart Provider Router)
  try {
    const promptText = `Bạn là Chuyên gia Bách khoa Toàn thư Điện ảnh thế giới (IMDb & TMDB Cast Directory Engine).
Phân tích từ khóa tìm kiếm: "${keyword}" (tên rút gọn: "${normalizedQuery}").

Nhiệm vụ:
Xác định xem từ khóa này có phải là tên của một DIỄN VIÊN, NGHỆ SĨ, hoặc ĐẠO DIỄN ĐIỆN ẢNH / TRUYỀN HÌNH CÓ THẬT trên thế giới (Việt Nam, Hollywood, Hàn Quốc, TVB Hồng Kông, Trung Quốc, Thái Lan, Nhật Bản, Châu Âu, Anime, v.v.) hay không.

Nếu ĐÚNG là diễn viên/nghệ sĩ/đạo diễn:
- "isActor": true
- "actorName": Tên chuẩn phổ biến nhất của nghệ sĩ (ví dụ: Trường Giang, Trấn Thành, Châu Tinh Trì, Dương Mịch, Benedict Cumberbatch, Cillian Murphy, Son Ye-jin, Song Kang, Baifern Pimchanok, Tom Cruise...).
- "country": Quốc gia / nền điện ảnh chính xác kèm cờ (vd: "Việt Nam 🇻🇳", "Hàn Quốc 🇰🇷", "Hồng Kông 🇭🇰", "Trung Quốc 🇨🇳", "Hollywood 🇺🇸", "Anh Quốc 🇬🇧", "Thái Lan 🇹🇭", "Nhật Bản 🇯🇵").
- "titles": Danh sách 8 đến 12 BỘ PHIM / SERIES TRUYỀN HÌNH THẬT NỔI TIẾNG NHẤT mà nghệ sĩ này từng tham gia đóng chính hoặc đạo diễn (ghi tên tiếng Việt và/hoặc tên tiếng Anh/gốc trong ngoặc đơn).
  * LƯU Ý ĐẶC BIỆT: Chỉ liệt kê các tác phẩm CÓ THẬT trong sự nghiệp của nghệ sĩ. Tuyệt đối không tự bịa ra hậu bản hay số thứ tự giả.

Nếu KHÔNG PHẢI là diễn viên/nghệ sĩ (ví dụ là tên một bộ phim cụ thể như "Titanic", "Inception", một thể loại như "phim ma", hoặc từ vô nghĩa):
- "isActor": false

BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "isActor": true,
  "actorName": "Tên chuẩn",
  "country": "Quốc gia",
  "titles": ["Phim 1", "Phim 2", "Phim 3", "Phim 4", "Phim 5", "Phim 6", "Phim 7", "Phim 8"]
}`;

    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là chuyên gia bách khoa toàn thư điện ảnh thế giới. Bắt buộc chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ.",
      userPrompt: promptText,
      temperature: 0.1,
      maxTokens: 600,
      jsonMode: true,
      timeoutMs: 6500,
    });

    if (aiRes && aiRes.text) {
      const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.isActor && Array.isArray(parsed.titles) && parsed.titles.length > 0) {
          const actorName = parsed.actorName || keyword;
          const country = parsed.country || undefined;
          const titles = parsed.titles.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0);

          ACTOR_AI_CACHE.set(cleanRaw, {
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
          ACTOR_AI_CACHE.set(cleanRaw, {
            actorName: "",
            titles: [],
            isActor: false,
            expireAt: Date.now() + 24 * 60 * 60 * 1000,
          });
        }
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
 * 2. TÌM KIẾM VÀ SO KHỚP CHÍNH XÁC PHIM TỪ KHO PHIM API (CÓ BỘ NHỚ ĐỆM 1 GIỜ)
 * Hỗ trợ tìm cả tên tiếng Việt và tên tiếng Anh / Quốc tế trong ngoặc để tối đa hóa tỷ lệ tìm thấy
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
  const tasks = titles.slice(0, 14).map(async (rawTitle) => {
    try {
      const viTitle = rawTitle.replace(/\([^)]*\)/g, "").trim();
      const matchEng = rawTitle.match(/\(([^)]+)\)/);
      const engTitle = matchEng ? matchEng[1].trim() : "";

      const cleanTargetVi = normalizeForMatch(viTitle);
      const cleanTargetEng = normalizeForMatch(engTitle);

      if (!cleanTargetVi && !cleanTargetEng) return null;

      // 1. Thử tìm bằng tên tiếng Việt trước
      let res = await movieApi.getMovies({
        keyword: viTitle,
        page: 1,
        limit: 5,
      });

      let items = res?.items || [];

      // 2. Nếu không ra kết quả mà có tên tiếng Anh, thử tìm bằng tên tiếng Anh
      if (items.length === 0 && engTitle) {
        res = await movieApi.getMovies({
          keyword: engTitle,
          page: 1,
          limit: 5,
        });
        items = res?.items || [];
      }

      if (items.length === 0) return null;

      // Tìm bộ phim có tiêu đề khớp chính xác nhất với tên phim mục tiêu
      let bestItem = null;
      let bestScore = -999;

      for (const it of items) {
        const name = normalizeForMatch(it.name || it.title || "");
        const orig = normalizeForMatch(it.origin_name || "");
        const slug = normalizeForMatch(it.slug || "");

        let score = 0;

        // So khớp với tên tiếng Việt
        if (cleanTargetVi) {
          if (name === cleanTargetVi || orig === cleanTargetVi || slug === cleanTargetVi.replace(/\s+/g, "-")) {
            score = Math.max(score, 100);
          } else if (name.startsWith(cleanTargetVi) || orig.startsWith(cleanTargetVi)) {
            score = Math.max(score, 80);
          } else if (name.includes(cleanTargetVi) || orig.includes(cleanTargetVi)) {
            score = Math.max(score, 60);
          }
        }

        // So khớp với tên tiếng Anh / gốc
        if (cleanTargetEng) {
          if (orig === cleanTargetEng || name === cleanTargetEng || slug === cleanTargetEng.replace(/\s+/g, "-")) {
            score = Math.max(score, 95);
          } else if (orig.includes(cleanTargetEng) || name.includes(cleanTargetEng)) {
            score = Math.max(score, 70);
          }
        }

        if (score === 0 && cleanTargetVi) {
          const targetWords = cleanTargetVi.split(" ").filter((w) => w.length > 1);
          const matchCount = targetWords.filter((w) => name.includes(w) || orig.includes(w) || slug.includes(w)).length;
          const ratio = targetWords.length > 0 ? matchCount / targetWords.length : 0;
          if (ratio >= 0.6) {
            score = Math.round(ratio * 55);
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestItem = it;
        }
      }

      // Chỉ lấy phim có độ khớp thực sự (>= 35 điểm) để tránh nhận nhầm phim không liên quan
      if (bestItem && bestScore >= 35) {
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
