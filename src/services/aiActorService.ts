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

  // 1.2 Phân tích trực tiếp qua Fast AI (Qwen 3.8 / Gemini Flash)
  try {
    const promptText = `Bạn là Chuyên gia Bách khoa Toàn thư Điện ảnh thế giới (Hollywood, Hoa Ngữ, TVB Hồng Kông, Hàn Quốc K-Drama, Việt Nam, Nhật Bản, Anime).
Hãy phân tích từ khóa tìm kiếm: "${keyword}".

Nhiệm vụ:
1. Xác định xem từ khóa có phải là TÊN DIỄN VIÊN / ĐẠO DIỄN / NGHỆ SĨ (hoặc tên diễn viên kèm vai diễn/thể loại) hay không.
2. Nếu ĐÚNG:
   - "actorName": Tên chuẩn tiếng Việt của nghệ sĩ (vd: Dương Mịch, Lý Liên Kiệt, Châu Tinh Trì, Thành Long, Tom Cruise, Son Ye-jin, Hyun Bin, Trấn Thành).
   - "country": Xác định ĐÚNG QUỐC GIA / NỀN ĐIỆN ẢNH của nghệ sĩ (vd: Trung Quốc 🇨🇳, Hồng Kông 🇭🇰, Hollywood 🇺🇸, Hàn Quốc 🇰🇷, Việt Nam 🇻🇳, Nhật Bản 🇯🇵). TUYỆT ĐỐI KHÔNG gán nhầm diễn viên quốc tế thành Việt Nam!
   - "titles": Liệt kê 8 đến 12 TÁC PHẨM ĐIỆN ẢNH / TRUYỀN HÌNH NỔI TIẾNG NHẤT CÓ THẬT của nghệ sĩ này bằng tên tiếng Việt phổ biến kèm tên gốc/tiếng Anh trong ngoặc đơn.
     Ví dụ:
     - Dương Mịch: ["Tam Sinh Tam Thế Thập Lý Đào Hoa (Eternal Love)", "Cung Tỏa Tâm Ngọc (Palace)", "Tiên Kiếm Kỳ Hiệp 3 (Chinese Paladin 3)", "Cổ Kiếm Kỳ Đàm (Swords of Legends)", "Phù Dao Hoàng Hậu (Legend of Fuyao)", "Hộc Châu Phu Nhân (Novoland: Pearl Eclipse)", "Hồ Yêu Tiểu Hồng Nương (Fox Spirit Matchmaker)"]
     - Lý Liên Kiệt: ["Hoàng Phi Hồng (Once Upon a Time in China)", "Tinh Võ Anh Hùng (Fist of Legend)", "Phương Thế Ngọc (Fong Sai-yuk)", "Thiếu Lâm Tự (The Shaolin Temple)", "Anh Hùng (Hero)", "Vua Kung Fu (The Forbidden Kingdom)", "Vũ Khí Tối Thượng 4 (Lethal Weapon 4)", "Biệt Đội Đánh Thuê (The Expendables)"]
     - Châu Tinh Trì: ["Tuyệt Đỉnh Kungfu (Kung Fu Hustle)", "Đội Bóng Thiếu Lâm (Shaolin Soccer)", "Đại Thoại Tây Du (A Chinese Odyssey)", "Thánh Bài (All for the Winner)", "Quan Xẩm Lốc Cốc (Hail the Judge)", "Trường Học Uy Long (Fight Back to School)"]

BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "isActor": true,
  "actorName": "Tên chuẩn nghệ sĩ",
  "country": "Quốc gia chính xác kèm cờ",
  "titles": ["Tên phim 1", "Tên phim 2", "Tên phim 3", "Tên phim 4", "Tên phim 5", "Tên phim 6", "Tên phim 7", "Tên phim 8"]
}

Nếu KHÔNG PHẢI là diễn viên/nghệ sĩ:
{
  "isActor": false
}`;

    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là chuyên gia bách khoa toàn thư điện ảnh. Trả về DUY NHẤT định dạng JSON.",
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
          ACTOR_AI_CACHE.set(clean, {
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
