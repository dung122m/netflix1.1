import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyServerAuth } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

export interface RawWatchItem {
  slug: string;
  title?: string;
  category?: string;
  country?: string;
  type?: string;
  episodeName?: string;
  episodeSlug?: string;
  progressSeconds?: number;
  durationSeconds?: number;
  updatedAt?: number;
  actor?: string[];
}

export type StatsTimeRange = "7d" | "30d" | "90d" | "2026" | "all";

// Bảng phân loại thể loại chuẩn
const GENRE_KEYWORDS: Record<string, string> = {
  "hanh dong": "Hành Động",
  action: "Hành Động",
  "vo thuat": "Võ Thuật",
  kungfu: "Võ Thuật",
  "hinh su": "Hình Sự",
  crime: "Hình Sự",
  "kinh di": "Kinh Dị",
  horror: "Kinh Dị",
  "vien tuong": "Viễn Tưởng",
  "sci fi": "Viễn Tưởng",
  "tinh cam": "Tình Cảm",
  romance: "Tình Cảm",
  "hai huoc": "Hài Hước",
  comedy: "Hài Hước",
  "tam ly": "Tâm Lý",
  drama: "Tâm Lý",
  "hoat hinh": "Hoạt Hình",
  anime: "Hoạt Hình",
  "co trang": "Cổ Trang",
  "phieu luu": "Phiêu Lưu",
  "chien tranh": "Chiến Tranh",
  "bi an": "Bí Ẩn",
  "hoc duong": "Học Đường",
  "gia dinh": "Gia Đình",
  "tai lieu": "Tài Liệu",
};

// Bảng phân loại quốc gia chuẩn
const COUNTRY_KEYWORDS: Record<string, string> = {
  "han quoc": "Hàn Quốc",
  korea: "Hàn Quốc",
  "trung quoc": "Trung Quốc",
  china: "Trung Quốc",
  "au my": "Âu Mỹ",
  us: "Âu Mỹ",
  hollywood: "Âu Mỹ",
  "nhat ban": "Nhật Bản",
  japan: "Nhật Bản",
  "viet nam": "Việt Nam",
  vietnam: "Việt Nam",
  "thai lan": "Thái Lan",
  thailand: "Thái Lan",
  "hong kong": "Hồng Kông",
  "dai loan": "Đài Loan",
  "an do": "Ấn Độ",
  india: "Ấn Độ",
  anh: "Anh",
  phap: "Pháp",
};

function cleanText(raw?: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();
}

function extractGenres(text: string): string[] {
  const clean = cleanText(text);
  const found = new Set<string>();
  for (const [key, name] of Object.entries(GENRE_KEYWORDS)) {
    if (clean.includes(key)) {
      found.add(name);
    }
  }
  return Array.from(found);
}

function extractCountries(text: string): string[] {
  const clean = cleanText(text);
  const found = new Set<string>();
  for (const [key, name] of Object.entries(COUNTRY_KEYWORDS)) {
    if (clean.includes(key)) {
      found.add(name);
    }
  }
  return Array.from(found);
}

function extractTypeName(typeStr?: string, categoryStr?: string): string {
  const clean = cleanText(`${typeStr || ""} ${categoryStr || ""}`);
  if (clean.includes("hoat hinh") || clean.includes("anime")) return "Hoạt Hình";
  if (clean.includes("phim bo") || clean.includes("series") || clean.includes("tap")) return "Phim Bộ";
  if (clean.includes("phim le") || clean.includes("movie") || clean.includes("single") || clean.includes("chieu rap")) return "Phim Lẻ";
  if (clean.includes("tv show") || clean.includes("truyen hinh")) return "TV Shows";
  return "Phim Lẻ";
}

function getTimeRangeFilter(range: StatsTimeRange): number {
  const now = Date.now();
  if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  if (range === "90d") return now - 90 * 24 * 60 * 60 * 1000;
  if (range === "2026") return new Date("2026-01-01T00:00:00Z").getTime();
  return 0; // all
}

/**
 * POST /api/user/stats
 * Tính toán thống kê xem phim và dữ liệu Nanaflix Wrapped từ watch_history
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { range = "all", items: clientItems } = body as {
      range?: StatsTimeRange;
      items?: RawWatchItem[];
    };

    let historyRecords: RawWatchItem[] = [];

    // 1. Nếu có authenticated user, thử query trực tiếp từ Supabase
    const auth = await verifyServerAuth(req);
    const supabase = getSupabaseAdmin();

    if (auth.isAuthenticated && auth.userId && supabase) {
      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", auth.userId)
        .order("updated_at", { ascending: false })
        .limit(300);

      if (!error && Array.isArray(data) && data.length > 0) {
        historyRecords = data.map((row) => ({
          slug: row.slug,
          title: row.title,
          category: row.category,
          episodeName: row.episode_name,
          episodeSlug: row.episode_slug,
          progressSeconds: Number(row.progress_seconds) || 0,
          durationSeconds: Number(row.duration_seconds) || 0,
          year: row.year ? Number(row.year) : undefined,
          updatedAt: Number(row.updated_at) || Date.now(),
        }));
      }
    }

    // 2. Nếu chưa có từ server hoặc là guest, sử dụng clientItems
    if (historyRecords.length === 0 && Array.isArray(clientItems) && clientItems.length > 0) {
      historyRecords = clientItems;
    }

    // 3. Lọc theo Time Range
    const minTimestamp = getTimeRangeFilter(range as StatsTimeRange);
    const filteredRecords = historyRecords.filter((item) => {
      const ts = Number(item.updatedAt) || Date.now();
      return ts >= minTimestamp;
    });

    // 4. Tính toán số liệu thống kê
    const uniqueMovieSlugs = new Set<string>();
    let totalWatchSeconds = 0;
    let completedCount = 0;

    const genreCountMap: Record<string, number> = {};
    const countryCountMap: Record<string, number> = {};
    const typeCountMap: Record<string, number> = {};
    const actorCountMap: Record<string, number> = {};

    const timeSlots = {
      morning: 0,   // 05:00 - 11:59
      afternoon: 0, // 12:00 - 17:59
      evening: 0,   // 18:00 - 22:59
      night: 0,     // 23:00 - 04:59
    };

    const monthlyBreakdown: Record<string, { movies: number; minutes: number }> = {};

    for (const record of filteredRecords) {
      if (!record.slug) continue;
      uniqueMovieSlugs.add(record.slug);

      const progress = Math.max(0, Number(record.progressSeconds) || 0);
      const duration = Math.max(0, Number(record.durationSeconds) || 0);
      totalWatchSeconds += progress;

      // Tính hoàn thành: tỉ lệ >= 85% hoặc xem >= 1200 giây (20 phút)
      if ((duration > 0 && progress / duration >= 0.85) || progress >= 1800) {
        completedCount++;
      }

      // Khung giờ xem
      const date = new Date(Number(record.updatedAt) || Date.now());
      const hour = date.getHours();
      if (hour >= 5 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
      else if (hour >= 18 && hour < 23) timeSlots.evening++;
      else timeSlots.night++;

      // Tháng xem
      const monthKey = `T${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = { movies: 0, minutes: 0 };
      }
      monthlyBreakdown[monthKey].movies++;
      monthlyBreakdown[monthKey].minutes += Math.round(progress / 60);

      // Trích xuất thể loại
      const combinedText = `${record.category || ""} ${record.title || ""} ${record.slug}`;
      const genres = extractGenres(combinedText);
      for (const g of genres) {
        genreCountMap[g] = (genreCountMap[g] || 0) + 1;
      }

      // Trích xuất quốc gia
      const countries = extractCountries(`${record.country || ""} ${combinedText}`);
      for (const c of countries) {
        countryCountMap[c] = (countryCountMap[c] || 0) + 1;
      }

      // Trích xuất loại phim
      const typeName = extractTypeName(record.type, record.category);
      typeCountMap[typeName] = (typeCountMap[typeName] || 0) + 1;

      // Trích xuất diễn viên nếu có
      if (Array.isArray(record.actor)) {
        for (const act of record.actor) {
          const cleanAct = String(act).trim();
          if (cleanAct && cleanAct.length > 2) {
            actorCountMap[cleanAct] = (actorCountMap[cleanAct] || 0) + 1;
          }
        }
      }
    }

    const totalMovies = uniqueMovieSlugs.size;
    const totalEpisodes = filteredRecords.length;
    const totalMinutes = Math.round(totalWatchSeconds / 60);
    const totalHours = Math.round((totalWatchSeconds / 3600) * 10) / 10;

    // Sắp xếp bảng xếp hạng
    const sortBreakdown = (map: Record<string, number>, topN = 5) => {
      const entries = Object.entries(map).map(([name, count]) => ({ name, count }));
      entries.sort((a, b) => b.count - a.count);
      const total = entries.reduce((acc, curr) => acc + curr.count, 0) || 1;
      return entries.slice(0, topN).map((item) => ({
        ...item,
        percent: Math.round((item.count / total) * 100),
      }));
    };

    const topGenres = sortBreakdown(genreCountMap, 5);
    const topCountries = sortBreakdown(countryCountMap, 4);
    const topTypes = sortBreakdown(typeCountMap, 4);
    const topActors = sortBreakdown(actorCountMap, 5);

    // Xác định peak time slot
    let peakSlot: "morning" | "afternoon" | "evening" | "night" = "evening";
    let maxSlotCount = -1;
    for (const [slot, count] of Object.entries(timeSlots)) {
      if (count > maxSlotCount) {
        maxSlotCount = count;
        peakSlot = slot as "morning" | "afternoon" | "evening" | "night";
      }
    }

    const slotLabels: Record<string, string> = {
      morning: "Buổi Sáng (05:00 - 12:00)",
      afternoon: "Buổi Chiều (12:00 - 18:00)",
      evening: "Buổi Tối Hoàng Kim (18:00 - 23:00)",
      night: "Cú Đêm (23:00 - 05:00)",
    };

    // Tạo Persona danh hiệu Nanaflix Wrapped
    let personaTitle = "Nhà Thám Hiểm Điện Ảnh";
    let personaQuote = "Bạn luôn cởi mở khám phá những tác phẩm cuốn hút và đa dạng!";

    const top1Genre = topGenres[0]?.name;
    const top1Country = topCountries[0]?.name;

    if (peakSlot === "night" && top1Genre === "Kinh Dị") {
      personaTitle = "Bóng Đêm Can Trường";
      personaQuote = "Xem phim kinh dị lúc nửa đêm chính là thú vui bất tận của bạn!";
    } else if (top1Country === "Hàn Quốc" || (top1Genre === "Tình Cảm" && top1Country === "Hàn Quốc")) {
      personaTitle = "Tín Đồ K-Drama Đích Thực";
      personaQuote = "Những câu chuyện lãng mạn và cảm xúc chạm đến trái tim bạn!";
    } else if (top1Genre === "Hành Động" || top1Genre === "Võ Thuật") {
      personaTitle = "Chiến Binh Bom Tấn";
      personaQuote = "Những pha hành động mãn nhãn và kịch tính luôn tiếp thêm năng lượng cho bạn!";
    } else if (top1Genre === "Hoạt Hình") {
      personaTitle = "Bậc Thầy Thế Giới Anime";
      personaQuote = "Bạn có tình yêu bất tận với thế giới hoạt hình diệu kỳ và đầy màu sắc!";
    } else if (peakSlot === "night") {
      personaTitle = "Cú Đêm Điện Ảnh";
      personaQuote = "Thế giới chìm vào giấc ngủ cũng là lúc rạp chiếu phim của riêng bạn sáng đèn!";
    } else if (totalHours >= 50) {
      personaTitle = "Đại Trưởng Lão Cày Phim";
      personaQuote = "Không có bộ phim hay nào có thể thoát khỏi tầm ngắm của bạn!";
    }

    const wrapped = {
      totalMovies,
      totalEpisodes,
      totalHours,
      totalMinutes,
      completedCount,
      topGenre: top1Genre || "Đa dạng",
      topCountry: top1Country || "Quốc tế",
      topActor: topActors[0]?.name || null,
      topType: topTypes[0]?.name || "Phim Lẻ",
      peakTimeSlot: slotLabels[peakSlot],
      peakTimeKey: peakSlot,
      personaTitle,
      personaQuote,
      year: 2026,
    };

    return NextResponse.json({
      success: true,
      range,
      stats: {
        totalMovies,
        totalEpisodes,
        totalHours,
        totalMinutes,
        completedCount,
        topGenres,
        topCountries,
        topTypes,
        topActors,
        timeSlots,
        peakTimeSlot: slotLabels[peakSlot],
        monthlyBreakdown,
      },
      wrapped,
    });
  } catch (err) {
    console.error("[User Stats API POST] Error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
