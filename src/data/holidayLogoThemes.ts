import { getVietnamTodayEvent, getVietnamNow } from "@/lib/vietnamCalendar";

/**
 * 🎬 NANAFLIX HOLIDAY LOGO SYSTEM
 * 
 * Hệ thống chuyển đổi Logo kỷ niệm linh hoạt theo sự kiện trong năm:
 * - LEVEL 0: Ngày thông thường (Normal NANAFLIX)
 * - LEVEL 1: Micro Accent (Ngày quốc tế / sự kiện nhỏ: đổi nhẹ accent & shimmer)
 * - LEVEL 2: Seasonal / National (Ngày lễ văn hóa / lịch sử quan trọng: accent riêng + micro-motif)
 * - LEVEL 3: Major Celebration (Tết, 2/9, 30/4, Noel, Tết Dương Lịch, Trung Thu: visual prism cao cấp)
 */

export type HolidayLogoLevel = 0 | 1 | 2 | 3;

export type HolidayLogoCategory =
  | "vietnam_traditional"   // Tết, Rằm, Giỗ Tổ, Vu Lan, Trung Thu...
  | "vietnam_national"      // 30/4, 2/9, 8/3, 20/10, 20/11, 19/5...
  | "international"         // Valentine, Earth Day, Children's Day, Water Day...
  | "cinema_entertainment"  // World TV Day, Photography Day, Radio Day, Cinema Day...
  | "seasonal_global";      // Christmas, New Year, Halloween...

export type HolidayMotifType =
  | "prism"        // Lăng kính điện ảnh mặc định
  | "star"         // Ngôi sao vàng cách điệu (Quốc khánh 2/9, 30/4, Giải phóng)
  | "sparkle"      // Ánh sáng lấp lánh 4 cánh (Tết Nguyên Đán, Năm Mới, Noel)
  | "moon"         // Ánh trăng / Vầng trăng thu (Trung Thu)
  | "lotus"        // Hoa sen thanh khiết (Vu Lan, Sinh nhật Bác, Phật Đản)
  | "leaf"         // Mầm xanh / Lá biếc (Earth Day, Môi trường)
  | "heart"        // Trái tim tinh tế (Valentine, Phụ nữ)
  | "flame"        // Ngọn lửa truyền thống (Quân đội, Cách mạng, Đoàn)
  | "aperture";    // Khẩu độ ống kính / Sách (World Book, Photography, Cinema)

export interface HolidayLogoTheme {
  id: string;
  name: string;
  category: HolidayLogoCategory;
  level: HolidayLogoLevel;
  priority: number; // 1 - 100 (Cao hơn sẽ được ưu tiên khi trùng ngày)
  
  // Điều kiện ngày Dương Lịch
  solarMatch?: {
    month: number;
    day: number;
    endDay?: number;
  };

  // Điều kiện ngày Âm Lịch
  lunarMatch?: {
    lunarMonth: number;
    lunarDay: number;
    endLunarDay?: number;
    isNewYearEve?: boolean;
  };

  // Liên kết trực tiếp ID từ VIETNAM_EVENTS (tận dụng nguồn dữ liệu hiện có)
  linkedEventIds?: string[];

  // Visual Modifiers (Tinh tế, sang trọng, không biến dạng typography)
  accentColor?: string;     // Màu accent mùa lễ hội
  glowColor?: string;       // Hào quang phát sáng
  motif?: HolidayMotifType; // Micro-motif trong crossbar chữ A
  shimmerTint?: string;     // Ánh vệt sáng quét qua khi hover
}

/**
 * 📚 CATALOG 40+ HOLIDAY & EVENT THEMES TOÀN DIỆN TRONG NĂM
 */
export const HOLIDAY_LOGO_CATALOG: HolidayLogoTheme[] = [
  // ==========================================================================
  // 🇻🇳 A. TẾT & VĂN HÓA TRUYỀN THỐNG VIỆT NAM (ÂM LỊCH & TRUYỀN THỐNG)
  // ==========================================================================
  {
    id: "tet-nguyen-dan",
    name: "Tết Nguyên Đán",
    category: "vietnam_traditional",
    level: 3,
    priority: 100,
    lunarMatch: { lunarMonth: 1, lunarDay: 1, endLunarDay: 3 },
    linkedEventIds: ["tet-nguyen-dan", "mung-1-tet", "mung-2-tet", "mung-3-tet"],
    accentColor: "#E50914",
    glowColor: "rgba(234, 179, 8, 0.6)",
    motif: "sparkle",
    shimmerTint: "rgba(250, 204, 21, 0.4)",
  },
  {
    id: "giao-thua",
    name: "Đêm Giao Thừa",
    category: "vietnam_traditional",
    level: 3,
    priority: 99,
    lunarMatch: { lunarMonth: 12, lunarDay: 29, isNewYearEve: true },
    linkedEventIds: ["giao-thua"],
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.7)",
    motif: "sparkle",
    shimmerTint: "rgba(245, 158, 11, 0.5)",
  },
  {
    id: "ong-cong-ong-tao",
    name: "Tết Ông Công Ông Táo",
    category: "vietnam_traditional",
    level: 2,
    priority: 80,
    lunarMatch: { lunarMonth: 12, lunarDay: 23 },
    linkedEventIds: ["ong-cong-ong-tao"],
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.5)",
    motif: "flame",
  },
  {
    id: "ram-thang-gieng",
    name: "Tết Nguyên Tiêu (Rằm Tháng Giêng)",
    category: "vietnam_traditional",
    level: 2,
    priority: 75,
    lunarMatch: { lunarMonth: 1, lunarDay: 15 },
    linkedEventIds: ["tet-nguyen-tieu"],
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.5)",
    motif: "moon",
  },
  {
    id: "gio-to-hung-vuong",
    name: "Giỗ Tổ Hùng Vương (10/3 Âm lịch)",
    category: "vietnam_traditional",
    level: 3,
    priority: 95,
    lunarMatch: { lunarMonth: 3, lunarDay: 10 },
    linkedEventIds: ["gio-to-hung-vuong"],
    accentColor: "#D97706",
    glowColor: "rgba(217, 119, 6, 0.6)",
    motif: "star",
  },
  {
    id: "tet-han-thuc",
    name: "Tết Hàn Thực (3/3 Âm lịch)",
    category: "vietnam_traditional",
    level: 1,
    priority: 60,
    lunarMatch: { lunarMonth: 3, lunarDay: 3 },
    linkedEventIds: ["tet-han-thuc"],
    accentColor: "#94A3B8",
    motif: "prism",
  },
  {
    id: "tet-doan-ngo",
    name: "Tết Đoan Ngọ (5/5 Âm lịch)",
    category: "vietnam_traditional",
    level: 2,
    priority: 70,
    lunarMatch: { lunarMonth: 5, lunarDay: 5 },
    linkedEventIds: ["tet-doan-ngo"],
    accentColor: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.5)",
    motif: "leaf",
  },
  {
    id: "vu-lan-bao-hieu",
    name: "Lễ Vu Lan Báo Hiếu (Rằm tháng 7 Âm lịch)",
    category: "vietnam_traditional",
    level: 2,
    priority: 78,
    lunarMatch: { lunarMonth: 7, lunarDay: 15 },
    linkedEventIds: ["le-vu-lan"],
    accentColor: "#EC4899",
    glowColor: "rgba(236, 72, 153, 0.5)",
    motif: "lotus",
  },
  {
    id: "tet-trung-thu",
    name: "Tết Trung Thu (Rằm tháng 8 Âm lịch)",
    category: "vietnam_traditional",
    level: 3,
    priority: 92,
    lunarMatch: { lunarMonth: 8, lunarDay: 14, endLunarDay: 15 },
    linkedEventIds: ["tet-trung-thu"],
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.7)",
    motif: "moon",
    shimmerTint: "rgba(251, 191, 36, 0.4)",
  },

  // ==========================================================================
  // 🇻🇳 B. NGÀY LỄ QUỐC GIA & KỶ NIỆM LỊCH SỬ VIỆT NAM (DƯƠNG LỊCH)
  // ==========================================================================
  {
    id: "thanh-lap-dang",
    name: "Ngày thành lập Đảng Cộng sản Việt Nam (3/2)",
    category: "vietnam_national",
    level: 2,
    priority: 82,
    solarMatch: { month: 2, day: 3 },
    linkedEventIds: ["thanh-lap-dang"],
    accentColor: "#DC2626",
    glowColor: "rgba(220, 38, 38, 0.5)",
    motif: "star",
  },
  {
    id: "quoc-te-phu-nu",
    name: "Quốc tế Phụ nữ (8/3)",
    category: "vietnam_national",
    level: 2,
    priority: 88,
    solarMatch: { month: 3, day: 8 },
    linkedEventIds: ["quoc-te-phu-nu"],
    accentColor: "#F43F5E",
    glowColor: "rgba(244, 63, 94, 0.6)",
    motif: "heart",
  },
  {
    id: "doan-tncs-hcm",
    name: "Ngày thành lập Đoàn TNCS Hồ Chí Minh (26/3)",
    category: "vietnam_national",
    level: 2,
    priority: 75,
    solarMatch: { month: 3, day: 26 },
    linkedEventIds: ["thanh-lap-doan"],
    accentColor: "#00B4D8",
    glowColor: "rgba(0, 180, 216, 0.5)",
    motif: "flame",
  },
  {
    id: "giai-phong-mien-nam",
    name: "Ngày Giải phóng miền Nam (30/4)",
    category: "vietnam_national",
    level: 3,
    priority: 98,
    solarMatch: { month: 4, day: 30 },
    linkedEventIds: ["giai-phong-mien-nam"],
    accentColor: "#E50914",
    glowColor: "rgba(234, 179, 8, 0.7)",
    motif: "star",
    shimmerTint: "rgba(234, 179, 8, 0.4)",
  },
  {
    id: "quoc-te-lao-dong",
    name: "Quốc tế Lao động (1/5)",
    category: "vietnam_national",
    level: 2,
    priority: 86,
    solarMatch: { month: 5, day: 1 },
    linkedEventIds: ["quoc-te-lao-dong"],
    accentColor: "#E50914",
    glowColor: "rgba(229, 9, 20, 0.5)",
    motif: "prism",
  },
  {
    id: "chien-thang-dien-bien-phu",
    name: "Chiến thắng Điện Biên Phủ (7/5)",
    category: "vietnam_national",
    level: 2,
    priority: 85,
    solarMatch: { month: 5, day: 7 },
    linkedEventIds: ["chien-thang-dien-bien-phu"],
    accentColor: "#DC2626",
    glowColor: "rgba(220, 38, 38, 0.5)",
    motif: "star",
  },
  {
    id: "sinh-nhat-bac-ho",
    name: "Ngày sinh Chủ tịch Hồ Chí Minh (19/5)",
    category: "vietnam_national",
    level: 2,
    priority: 88,
    solarMatch: { month: 5, day: 19 },
    linkedEventIds: ["sinh-nhat-bac-ho"],
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.6)",
    motif: "lotus",
  },
  {
    id: "thuong-binh-liet-si",
    name: "Ngày Thương binh - Liệt sĩ (27/7)",
    category: "vietnam_national",
    level: 2,
    priority: 80,
    solarMatch: { month: 7, day: 27 },
    linkedEventIds: ["thuong-binh-liet-si"],
    accentColor: "#DC2626",
    glowColor: "rgba(220, 38, 38, 0.4)",
    motif: "flame",
  },
  {
    id: "cach-mang-thang-tam",
    name: "Cách mạng Tháng Tám (19/8)",
    category: "vietnam_national",
    level: 2,
    priority: 85,
    solarMatch: { month: 8, day: 19 },
    linkedEventIds: ["cach-mang-thang-tam"],
    accentColor: "#DC2626",
    glowColor: "rgba(220, 38, 38, 0.5)",
    motif: "star",
  },
  {
    id: "quoc-khanh-2-9",
    name: "Quốc khánh Nước CHXHCN Việt Nam (2/9)",
    category: "vietnam_national",
    level: 3,
    priority: 99,
    solarMatch: { month: 9, day: 2 },
    linkedEventIds: ["quoc-khanh-2-9"],
    accentColor: "#E50914",
    glowColor: "rgba(234, 179, 8, 0.75)",
    motif: "star",
    shimmerTint: "rgba(250, 204, 21, 0.4)",
  },
  {
    id: "giai-phong-thu-do",
    name: "Ngày Giải phóng Thủ đô (10/10)",
    category: "vietnam_national",
    level: 2,
    priority: 80,
    solarMatch: { month: 10, day: 10 },
    linkedEventIds: ["giai-phong-thu-do"],
    accentColor: "#DC2626",
    glowColor: "rgba(220, 38, 38, 0.5)",
    motif: "star",
  },
  {
    id: "phu-nu-viet-nam",
    name: "Ngày Phụ nữ Việt Nam (20/10)",
    category: "vietnam_national",
    level: 2,
    priority: 88,
    solarMatch: { month: 10, day: 20 },
    linkedEventIds: ["phu-nu-viet-nam"],
    accentColor: "#F43F5E",
    glowColor: "rgba(244, 63, 94, 0.6)",
    motif: "heart",
  },
  {
    id: "nha-giao-viet-nam",
    name: "Ngày Nhà giáo Việt Nam (20/11)",
    category: "vietnam_national",
    level: 2,
    priority: 88,
    solarMatch: { month: 11, day: 20 },
    linkedEventIds: ["nha-giao-viet-nam"],
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.6)",
    motif: "aperture",
  },
  {
    id: "quan-doi-nhan-dan",
    name: "Ngày thành lập Quân đội Nhân dân Việt Nam (22/12)",
    category: "vietnam_national",
    level: 2,
    priority: 82,
    solarMatch: { month: 12, day: 22 },
    linkedEventIds: ["quan-doi-nhan-dan"],
    accentColor: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.5)",
    motif: "star",
  },

  // ==========================================================================
  // 🌍 C. NGÀY QUỐC TẾ (INTERNATIONAL DAYS - LEVEL 1 & 2)
  // ==========================================================================
  {
    id: "valentine-day",
    name: "Valentine's Day (14/2)",
    category: "international",
    level: 2,
    priority: 85,
    solarMatch: { month: 2, day: 14 },
    linkedEventIds: ["valentine"],
    accentColor: "#F43F5E",
    glowColor: "rgba(244, 63, 94, 0.6)",
    motif: "heart",
  },
  {
    id: "world-poetry-day",
    name: "World Poetry Day (21/3)",
    category: "international",
    level: 1,
    priority: 50,
    solarMatch: { month: 3, day: 21 },
    accentColor: "#A855F7",
    motif: "aperture",
  },
  {
    id: "world-water-day",
    name: "World Water Day (22/3)",
    category: "international",
    level: 1,
    priority: 50,
    solarMatch: { month: 3, day: 22 },
    accentColor: "#00B4D8",
    motif: "prism",
  },
  {
    id: "world-health-day",
    name: "World Health Day (7/4)",
    category: "international",
    level: 1,
    priority: 50,
    solarMatch: { month: 4, day: 7 },
    accentColor: "#10B981",
    motif: "leaf",
  },
  {
    id: "earth-day",
    name: "Earth Day (22/4)",
    category: "international",
    level: 2,
    priority: 72,
    solarMatch: { month: 4, day: 22 },
    linkedEventIds: ["earth-day"],
    accentColor: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.5)",
    motif: "leaf",
  },
  {
    id: "world-book-day",
    name: "World Book Day (23/4)",
    category: "international",
    level: 1,
    priority: 55,
    solarMatch: { month: 4, day: 23 },
    accentColor: "#F59E0B",
    motif: "aperture",
  },
  {
    id: "quoc-te-thieu-nhi",
    name: "Quốc tế Thiếu nhi (1/6)",
    category: "international",
    level: 2,
    priority: 78,
    solarMatch: { month: 6, day: 1 },
    linkedEventIds: ["quoc-te-thieu-nhi"],
    accentColor: "#00B4D8",
    glowColor: "rgba(0, 180, 216, 0.5)",
    motif: "sparkle",
  },
  {
    id: "world-environment-day",
    name: "World Environment Day (5/6)",
    category: "international",
    level: 1,
    priority: 55,
    solarMatch: { month: 6, day: 5 },
    accentColor: "#10B981",
    motif: "leaf",
  },
  {
    id: "world-music-day",
    name: "World Music Day (21/6)",
    category: "international",
    level: 2,
    priority: 65,
    solarMatch: { month: 6, day: 21 },
    accentColor: "#A855F7",
    glowColor: "rgba(168, 85, 247, 0.5)",
    motif: "sparkle",
  },
  {
    id: "world-literacy-day",
    name: "International Literacy Day (8/9)",
    category: "international",
    level: 1,
    priority: 50,
    solarMatch: { month: 9, day: 8 },
    accentColor: "#F59E0B",
    motif: "aperture",
  },
  {
    id: "world-teachers-day",
    name: "World Teachers' Day (5/10)",
    category: "international",
    level: 1,
    priority: 55,
    solarMatch: { month: 10, day: 5 },
    accentColor: "#F59E0B",
    motif: "aperture",
  },
  {
    id: "world-mental-health-day",
    name: "World Mental Health Day (10/10)",
    category: "international",
    level: 1,
    priority: 50,
    solarMatch: { month: 10, day: 10 },
    accentColor: "#10B981",
    motif: "lotus",
  },
  {
    id: "united-nations-day",
    name: "United Nations Day (24/10)",
    category: "international",
    level: 1,
    priority: 55,
    solarMatch: { month: 10, day: 24 },
    accentColor: "#00B4D8",
    motif: "prism",
  },
  {
    id: "human-rights-day",
    name: "Human Rights Day (10/12)",
    category: "international",
    level: 1,
    priority: 50,
    solarMatch: { month: 12, day: 10 },
    accentColor: "#F59E0B",
    motif: "flame",
  },

  // ==========================================================================
  // 🎬 D. NHÓM ĐIỆN ẢNH & GIẢI TRÍ (ENTERTAINMENT & CINEMA DAYS)
  // ==========================================================================
  {
    id: "world-radio-day",
    name: "World Radio Day (13/2)",
    category: "cinema_entertainment",
    level: 1,
    priority: 55,
    solarMatch: { month: 2, day: 13 },
    accentColor: "#F59E0B",
    motif: "prism",
  },
  {
    id: "world-photography-day",
    name: "World Photography Day (19/8)",
    category: "cinema_entertainment",
    level: 2,
    priority: 65,
    solarMatch: { month: 8, day: 19 },
    accentColor: "#00B4D8",
    glowColor: "rgba(0, 180, 216, 0.5)",
    motif: "aperture",
  },
  {
    id: "world-television-day",
    name: "World Television Day (21/11)",
    category: "cinema_entertainment",
    level: 2,
    priority: 68,
    solarMatch: { month: 11, day: 21 },
    accentColor: "#A855F7",
    glowColor: "rgba(168, 85, 247, 0.5)",
    motif: "prism",
  },
  {
    id: "nanaflix-anniversary",
    name: "Nanaflix Cinema Anniversary (1/11)",
    category: "cinema_entertainment",
    level: 3,
    priority: 96,
    solarMatch: { month: 11, day: 1 },
    accentColor: "#E50914",
    glowColor: "rgba(229, 9, 20, 0.7)",
    motif: "sparkle",
    shimmerTint: "rgba(250, 204, 21, 0.5)",
  },

  // ==========================================================================
  // 🎄 E. SEASONAL & GLOBAL HOLIDAYS
  // ==========================================================================
  {
    id: "halloween",
    name: "Halloween (31/10)",
    category: "seasonal_global",
    level: 2,
    priority: 76,
    solarMatch: { month: 10, day: 31 },
    linkedEventIds: ["halloween"],
    accentColor: "#F59E0B",
    glowColor: "rgba(168, 85, 247, 0.5)",
    motif: "flame",
  },
  {
    id: "christmas-season",
    name: "Giáng Sinh / Christmas (24 - 25/12)",
    category: "seasonal_global",
    level: 3,
    priority: 95,
    solarMatch: { month: 12, day: 24, endDay: 25 },
    linkedEventIds: ["giang-sinh", "christmas-eve"],
    accentColor: "#E50914",
    glowColor: "rgba(16, 185, 129, 0.6)",
    motif: "sparkle",
    shimmerTint: "rgba(255, 255, 255, 0.5)",
  },
  {
    id: "new-year-season",
    name: "Tết Dương Lịch & Đêm Giao Thừa Quốc Tế (31/12 - 1/1)",
    category: "seasonal_global",
    level: 3,
    priority: 96,
    solarMatch: { month: 1, day: 1 },
    linkedEventIds: ["tet-duong-lich", "new-year-eve"],
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.7)",
    motif: "sparkle",
    shimmerTint: "rgba(250, 204, 21, 0.4)",
  },
];

/**
 * 🎯 DETERMINISTIC HOLIDAY LOGO RESOLVER
 * Tìm kiếm theme phù hợp nhất cho ngày hôm nay dựa trên:
 * 1. Event đang diễn ra từ VietnamTodayCalendar (Single Source of Truth)
 * 2. So khớp ngày Dương lịch / Âm lịch trực tiếp
 * 3. Xếp hạng phân tầng: Level 3 > Level 2 > Level 1 > Level 0
 * 4. Priority cao hơn sẽ được chọn khi trùng lặp.
 */
export function resolveHolidayLogoTheme(customDate?: Date): HolidayLogoTheme | null {
  const todayInfo = getVietnamTodayEvent(customDate);
  const now = getVietnamNow(customDate);
  const solarDay = now.getDate();
  const solarMonth = now.getMonth() + 1;
  const lunar = todayInfo.todayLunar;

  const matches: HolidayLogoTheme[] = [];

  for (const theme of HOLIDAY_LOGO_CATALOG) {
    let isMatch = false;

    // 1. So khớp qua linkedEventIds từ Calendar Engine
    if (todayInfo.isToday && theme.linkedEventIds && theme.linkedEventIds.length > 0) {
      const todayEventId = todayInfo.event?.id;
      const allIds = todayInfo.allEventsToday?.map((e) => e.id) || [];
      if (
        (todayEventId && theme.linkedEventIds.includes(todayEventId)) ||
        theme.linkedEventIds.some((id) => allIds.includes(id))
      ) {
        isMatch = true;
      }
    }

    // 2. So khớp Solar Date
    if (!isMatch && theme.solarMatch) {
      const { month, day, endDay } = theme.solarMatch;
      if (solarMonth === month) {
        if (endDay) {
          if (solarDay >= day && solarDay <= endDay) isMatch = true;
        } else if (solarDay === day) {
          isMatch = true;
        }
      }
    }

    // 3. So khớp Lunar Date (cho các ngày lễ âm lịch)
    if (!isMatch && theme.lunarMatch && lunar) {
      const { lunarMonth, lunarDay, endLunarDay, isNewYearEve } = theme.lunarMatch;
      if (isNewYearEve) {
        if (lunar.lunarMonth === 12 && (lunar.lunarDay === 29 || lunar.lunarDay === 30)) {
          isMatch = true;
        }
      } else if (lunar.lunarMonth === lunarMonth) {
        if (endLunarDay) {
          if (lunar.lunarDay >= lunarDay && lunar.lunarDay <= endLunarDay) isMatch = true;
        } else if (lunar.lunarDay === lunarDay) {
          isMatch = true;
        }
      }
    }

    if (isMatch) {
      matches.push(theme);
    }
  }

  if (matches.length === 0) return null;

  // Sắp xếp ưu tiên: Level (3 > 2 > 1) rồi đến Priority (cao > thấp)
  matches.sort((a, b) => {
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    return b.priority - a.priority;
  });

  return matches[0];
}
