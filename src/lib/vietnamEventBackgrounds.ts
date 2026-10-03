import type { VietnamTodayInfo } from "@/lib/vietnamCalendar";
import type { VietnamEvent } from "@/data/events/types";
import type { VietnamHistoricalEvent } from "@/data/historicalEvents";

/**
 * Curated Cinematic Backgrounds for Vietnam Today / Special Events
 * - Nhẹ, tối ưu, chỉ tải duy nhất background đang hiển thị.
 * - Được nhóm theo chủ đề: Đại lễ, Lịch sử, Văn hóa truyền thống, Xã hội/Y tế, Quốc tế, Nghệ thuật.
 */

// 1. Specific Major Holidays & High-Priority Events
const SPECIFIC_EVENT_BACKGROUNDS: Record<string, string> = {
  // Quốc Khánh 2/9 & Mùa thu lịch sử
  "ev-09-02-quoc-khanh-viet-nam": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "ev-09-01-khoi-dau-thang-lich-su": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",

  // 30/4 Giải phóng miền Nam & 1/5 Quốc tế Lao động
  "ev-04-30-giai-phong-mien-nam": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "ev-05-01-quoc-te-lao-dong": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",

  // 10/10 Giải phóng Thủ đô & 19/8 Cách mạng Tháng Tám
  "ev-10-10-giai-phong-thu-do": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "ev-08-19-cach-mang-thang-tam": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",

  // Tết Cổ Truyền & Giao Thừa (Âm lịch)
  "ev-01-01-tet-nguyen-dan": "https://images.unsplash.com/photo-1583248369069-9d91f1640fe6?auto=format&fit=crop&w=1200&q=80",
  "ev-12-30-dem-giao-thua": "https://images.unsplash.com/photo-1583248369069-9d91f1640fe6?auto=format&fit=crop&w=1200&q=80",

  // Giỗ Tổ Hùng Vương (10/3 ÂL)
  "ev-03-10-gio-to-hung-vuong": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",

  // Tết Trung Thu (15/8 ÂL)
  "ev-08-15-tet-trung-thu": "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80",

  // Ngày Tim Mạch Thế Giới (29/9)
  "ev-09-29-tim-mach-the-gioi": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80",

  // Ngày Dịch Thuật Quốc Tế (30/9)
  "ev-09-30-dich-thuat-the-gioi": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",

  // Ngày Nhà Giáo Việt Nam (20/11) & Khai Giảng (5/9)
  "ev-11-20-nha-giao-viet-nam": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",
  "ev-09-05-khai-giang-toan-quoc": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80",

  // Quân Đội Nhân Dân VN (22/12) & Thương Binh Liệt Sĩ (27/7)
  "ev-12-22-quan-doi-nhan-dan": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "ev-07-27-thuong-binh-liet-si": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",

  // Giáng Sinh (24-25/12) & Halloween (31/10)
  "ev-12-25-giang-sinh": "https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1200&q=80",
  "ev-10-31-halloween": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80",
};

// 2. Mapping by Effect Type
const EFFECT_BACKGROUNDS: Record<string, string> = {
  tet: "https://images.unsplash.com/photo-1583248369069-9d91f1640fe6?auto=format&fit=crop&w=1200&q=80",
  "national-day": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "mid-autumn": "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80",
  christmas: "https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=1200&q=80",
  halloween: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80",
  "nana-birthday": "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
};

// 3. Mapping by Historical Visual Theme
const HISTORICAL_THEME_BACKGROUNDS: Record<string, string> = {
  "ba-dinh-1945": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "dien-bien-phu": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "giai-phong-thu-do": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "thong-nhat-1975": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "general-history": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "dong-da": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
  "hai-ba-trung": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
  "bach-dang": "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80",
};

// 4. Mapping by Category / Nature
const CATEGORY_BACKGROUNDS: Record<string, string> = {
  "national-holiday": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "vietnam-history": "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
  "traditional-culture": "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80",
  "social-family": "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80",
  "environment-nature": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
  international: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  entertainment: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
  fun: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80",
};

// 5. Default Scenic Vietnam Cinematic Fallback
const DEFAULT_CINEMATIC_BACKGROUND = "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80";

const PLACEHOLDER_TEMPLATE_URLS = new Set([
  "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80",
]);

/**
 * Lấy background cinematic tối ưu cho sự kiện hôm nay
 */
export function getVietnamEventBackground(info: VietnamTodayInfo | {
  event: VietnamEvent;
  historicalEventsToday?: VietnamHistoricalEvent[];
}): string {
  const { event, historicalEventsToday } = info;

  // 0. Ảnh cụ thể đi kèm sự kiện (vd Avatar diễn viên sinh nhật, poster sự kiện thật, không phải placeholder)
  if (event?.imageUrl && !PLACEHOLDER_TEMPLATE_URLS.has(event.imageUrl)) {
    return event.imageUrl;
  }

  // 1. Kiểm tra ID sự kiện cụ thể
  if (event?.id && SPECIFIC_EVENT_BACKGROUNDS[event.id]) {
    return SPECIFIC_EVENT_BACKGROUNDS[event.id];
  }

  // 2. Kiểm tra hiệu ứng đặc biệt
  if (event?.effect && EFFECT_BACKGROUNDS[event.effect]) {
    return EFFECT_BACKGROUNDS[event.effect];
  }

  // 3. Kiểm tra mốc son lịch sử trùng ngày (nếu có)
  if (historicalEventsToday && historicalEventsToday.length > 0) {
    const firstHist = historicalEventsToday[0];
    if (firstHist?.visualTheme && HISTORICAL_THEME_BACKGROUNDS[firstHist.visualTheme]) {
      return HISTORICAL_THEME_BACKGROUNDS[firstHist.visualTheme];
    }
  }

  // 4. Kiểm tra theo Pattern Theme (như Môi trường, Thiên nhiên, Lễ hội...)
  const pattern = getVietnamEventPatternTheme(info);
  if (pattern && CATEGORY_BACKGROUNDS[pattern]) {
    return CATEGORY_BACKGROUNDS[pattern];
  }

  // 5. Kiểm tra Category
  if (event?.category && CATEGORY_BACKGROUNDS[event.category]) {
    return CATEGORY_BACKGROUNDS[event.category];
  }

  // 6. Default Fallback
  return DEFAULT_CINEMATIC_BACKGROUND;
}

/**
 * Danh sách các ngày đại lễ / sự kiện lớn ĐÃ CÓ THIẾT KẾ RIÊNG từ trước
 * (2/9, 30/4, 19/8, 10/10, Tết, Giỗ Tổ 10/3, Trung Thu, 20/11, 22/12, 27/7, Noel, Halloween...)
 */
const DEDICATED_MAJOR_EVENT_IDS = new Set([
  "ev-09-02-quoc-khanh-viet-nam",
  "ev-09-01-khoi-dau-thang-lich-su",
  "ev-04-30-giai-phong-mien-nam",
  "ev-08-19-cach-mang-thang-tam",
  "ev-10-10-giai-phong-thu-do",
  "ev-01-01-tet-nguyen-dan",
  "ev-12-30-dem-giao-thua",
  "ev-03-10-gio-to-hung-vuong",
  "ev-08-15-tet-trung-thu",
  "ev-11-20-nha-giao-viet-nam",
  "ev-09-05-khai-giang-toan-quoc",
  "ev-12-22-quan-doi-nhan-dan",
  "ev-07-27-thuong-binh-liet-si",
  "ev-12-25-giang-sinh",
  "ev-10-31-halloween",
]);

/**
 * Kiểm tra xem event có thiết kế / holiday effect riêng biệt từ trước hay không.
 * - 1. Có Holiday Effect riêng (Tết, Quốc khánh, Trung thu, Giáng sinh, Halloween, Nana Birthday)
 * - 2. Thuộc danh sách đại lễ lớn đã có thiết kế riêng từ trước (2/9, 30/4, 19/8, 10/10, Tết, Giỗ Tổ 10/3, Trung Thu...)
 * - 3. Có ảnh riêng (vd sinh nhật diễn viên, banner riêng)
 * Nếu đã có thiết kế riêng -> giữ nguyên 100%, không áp Thematic Illustration fallback đè lên.
 */
export function hasDedicatedEventDesign(info: VietnamTodayInfo | {
  event: VietnamEvent;
  historicalEventsToday?: VietnamHistoricalEvent[];
}): boolean {
  const { event } = info;

  // 1. Có Holiday Effect riêng (Tết, Quốc khánh, Trung thu, Giáng sinh, Halloween, Nana Birthday)
  if (event?.effect) {
    return true;
  }

  // 2. Thuộc danh sách đại lễ lớn đã có thiết kế riêng
  if (event?.id && DEDICATED_MAJOR_EVENT_IDS.has(event.id)) {
    return true;
  }

  // 3. Có ảnh riêng (vd sinh nhật diễn viên)
  if (event?.imageUrl || event?.actorSlug || event?.id?.startsWith("ev-actor-birthday")) {
    return true;
  }

  return false;
}

/**
 * Các chủ đề biểu tượng hoa văn nền cho Vietnam Today / Special Events
 */
export type VietnamPatternThemeKey =
  | "medical-health"
  | "vietnam-national"
  | "vietnam-history"
  | "culture-festival"
  | "education-teachers"
  | "international"
  | "family-social"
  | "arts-entertainment"
  | "environment-nature"
  | "technology"
  | "sports"
  | "christmas"
  | "halloween"
  | "fallback";

/**
 * Xác định chủ đề hoa văn biểu tượng tương ứng với sự kiện hiện tại
 */
export function getVietnamEventPatternTheme(info: VietnamTodayInfo | {
  event: VietnamEvent;
  historicalEventsToday?: VietnamHistoricalEvent[];
}): VietnamPatternThemeKey {
  const { event, historicalEventsToday } = info;
  const id = event?.id || "";
  const title = event?.title || "";

  // 1. Nhóm Y tế, Tim mạch & Sức khỏe (vd 29/9 World Heart Day)
  if (
    id === "ev-09-29-tim-mach-the-gioi" ||
    id === "ev-02-27-thay-thuoc-viet-nam" ||
    id === "ev-04-07-suc-khoe-the-gioi" ||
    id === "ev-06-14-hien-mau-the-gioi" ||
    id === "ev-12-01-phong-chong-aids" ||
    id === "ev-05-08-chu-thap-do-quoc-te" ||
    /tim-mach|thay-thuoc|y-te|suc-khoe|hien-mau|dieu-duong|benh-vien/i.test(id) ||
    /tim mạch|thầy thuốc|y tế|sức khỏe|hiến máu|điều dưỡng/i.test(title)
  ) {
    return "medical-health";
  }

  // 2. Giáo dục & Nhà giáo (vd 20/11, 5/9)
  if (
    id === "ev-11-20-nha-giao-viet-nam" ||
    id === "ev-09-05-khai-giang-toan-quoc" ||
    id === "ev-01-09-hoc-sinh-sinh-vien" ||
    /nha-giao|giao-duc|khai-giang|hoc-sinh|sinh-vien|sach/i.test(id) ||
    /nhà giáo|giáo dục|khai giảng|học sinh|sinh viên|sách/i.test(title)
  ) {
    return "education-teachers";
  }

  // 3. Giáng Sinh & Halloween
  if (event?.effect === "christmas" || id === "ev-12-25-giang-sinh" || /giang-sinh|noel/i.test(id)) {
    return "christmas";
  }
  if (event?.effect === "halloween" || id === "ev-10-31-halloween" || /halloween/i.test(id)) {
    return "halloween";
  }

  // 4. Quốc Khánh & Đại lễ Việt Nam (2/9, 30/4, 19/8, 10/10, 22/12...)
  if (
    event?.effect === "national-day" ||
    id === "ev-09-02-quoc-khanh-viet-nam" ||
    id === "ev-04-30-giai-phong-mien-nam" ||
    id === "ev-08-19-cach-mang-thang-tam" ||
    id === "ev-10-10-giai-phong-thu-do" ||
    id === "ev-12-22-quan-doi-nhan-dan" ||
    id === "ev-07-27-thuong-binh-liet-si"
  ) {
    return "vietnam-national";
  }

  // 5. Văn hóa & Lễ hội cổ truyền (Tết, Trung Thu, Giỗ Tổ...)
  if (
    event?.effect === "tet" ||
    event?.effect === "mid-autumn" ||
    event?.effect === "nana-birthday" ||
    event?.category === "traditional-culture" ||
    event?.nature === "traditional-festival" ||
    /tet|trung-thu|gio-to|le-hoi|han-thuc|doan-ngo|phat-dan|vu-lan/i.test(id)
  ) {
    return "culture-festival";
  }

  // 6. Công nghệ & Số hóa (vd Ngày Chuyển đổi số...)
  if (
    /so-hoa|chuyen-doi-so|cong-nghe|lap-trinh|it-|digital/i.test(id) ||
    /chuyển đổi số|công nghệ|số hóa/i.test(title)
  ) {
    return "technology";
  }

  // 7. Thể dục Thể thao & Olympic
  if (
    /the-thao|olympic|bong-da|chay-bo|sea-games|fitness/i.test(id) ||
    /thể thao|thể dục|olympic/i.test(title)
  ) {
    return "sports";
  }

  // 8. Môi trường, Thiên nhiên & Định cư xanh (vd World Habitat Day, Earth Day, Môi trường thế giới)
  if (
    id === "ev-10-world-habitat-day" ||
    id === "ev-10-05-moi-truong-dinh-cu" ||
    /moi-truong|khi-hau|trai-dat|rung|nuoc|dai-duong|dinh-cu|habitat/i.test(id) ||
    /môi trường|khí hậu|trái đất|rừng|định cư|habitat/i.test(title)
  ) {
    return "environment-nature";
  }

  // 9. Ngày quốc tế & Toàn cầu (vd 1/5 Quốc tế Lao động, 8/3, 30/9 Dịch thuật...)
  if (
    id === "ev-05-01-quoc-te-lao-dong" ||
    id === "ev-03-08-quoc-te-phu-nu" ||
    id === "ev-09-30-dich-thuat-the-gioi" ||
    event?.category === "international" ||
    event?.nature === "international-day"
  ) {
    return "international";
  }

  // 9. Mốc son lịch sử Việt Nam
  if (
    (historicalEventsToday && historicalEventsToday.length > 0) ||
    event?.category === "vietnam-history" ||
    event?.nature === "historical-anniversary"
  ) {
    return "vietnam-history";
  }

  // 10. Quốc lễ Việt Nam
  if (event?.category === "national-holiday" || event?.nature === "official-holiday") {
    return "vietnam-national";
  }

  // 11. Nghệ thuật & Giải trí
  if (
    event?.category === "entertainment" ||
    event?.nature === "arts-culture" ||
    /dien-anh|am-nhac|nghe-thuat|dich-thuat|san-khau|cinema/i.test(id)
  ) {
    return "arts-entertainment";
  }

  // 12. Gia đình & Xã hội
  if (event?.category === "social-family" || event?.nature === "social-observance") {
    return "family-social";
  }

  // 13. Fallback
  return "fallback";
}

export interface ThemeVisualConfig {
  gradient: string;
  spotlightRgba: string;
  primaryColorClass: string;
  secondaryColorClass: string;
  detailColorClass: string;
}

export const THEME_VISUAL_CONFIGS: Record<VietnamPatternThemeKey, ThemeVisualConfig> = {
  "medical-health": {
    gradient: "from-red-950/80 via-rose-950/40 to-zinc-950",
    spotlightRgba: "rgba(239, 68, 68, 0.18)",
    primaryColorClass: "text-rose-400",
    secondaryColorClass: "text-rose-300",
    detailColorClass: "text-amber-200",
  },
  "vietnam-national": {
    gradient: "from-red-950/80 via-amber-950/40 to-zinc-950",
    spotlightRgba: "rgba(234, 179, 8, 0.18)",
    primaryColorClass: "text-yellow-400",
    secondaryColorClass: "text-red-300",
    detailColorClass: "text-amber-200",
  },
  "vietnam-history": {
    gradient: "from-red-950/70 via-amber-950/35 to-zinc-950",
    spotlightRgba: "rgba(217, 119, 6, 0.16)",
    primaryColorClass: "text-amber-400",
    secondaryColorClass: "text-red-300",
    detailColorClass: "text-yellow-200",
  },
  international: {
    gradient: "from-cyan-950/70 via-blue-950/40 to-zinc-950",
    spotlightRgba: "rgba(6, 182, 212, 0.18)",
    primaryColorClass: "text-cyan-400",
    secondaryColorClass: "text-sky-300",
    detailColorClass: "text-teal-200",
  },
  "culture-festival": {
    gradient: "from-amber-950/70 via-orange-950/40 to-zinc-950",
    spotlightRgba: "rgba(245, 158, 11, 0.18)",
    primaryColorClass: "text-amber-400",
    secondaryColorClass: "text-orange-300",
    detailColorClass: "text-yellow-200",
  },
  "education-teachers": {
    gradient: "from-indigo-950/75 via-sky-950/40 to-zinc-950",
    spotlightRgba: "rgba(99, 102, 241, 0.18)",
    primaryColorClass: "text-indigo-300",
    secondaryColorClass: "text-sky-300",
    detailColorClass: "text-amber-300",
  },
  "environment-nature": {
    gradient: "from-emerald-950/75 via-teal-950/40 to-zinc-950",
    spotlightRgba: "rgba(16, 185, 129, 0.18)",
    primaryColorClass: "text-emerald-400",
    secondaryColorClass: "text-teal-300",
    detailColorClass: "text-lime-200",
  },
  sports: {
    gradient: "from-orange-950/75 via-red-950/40 to-zinc-950",
    spotlightRgba: "rgba(249, 115, 22, 0.18)",
    primaryColorClass: "text-amber-400",
    secondaryColorClass: "text-orange-300",
    detailColorClass: "text-yellow-200",
  },
  technology: {
    gradient: "from-blue-950/75 via-violet-950/40 to-zinc-950",
    spotlightRgba: "rgba(59, 130, 246, 0.18)",
    primaryColorClass: "text-blue-400",
    secondaryColorClass: "text-violet-300",
    detailColorClass: "text-cyan-200",
  },
  "family-social": {
    gradient: "from-rose-950/70 via-amber-950/35 to-zinc-950",
    spotlightRgba: "rgba(244, 63, 94, 0.16)",
    primaryColorClass: "text-rose-300",
    secondaryColorClass: "text-amber-300",
    detailColorClass: "text-orange-200",
  },
  "arts-entertainment": {
    gradient: "from-purple-950/75 via-pink-950/35 to-zinc-950",
    spotlightRgba: "rgba(168, 85, 247, 0.18)",
    primaryColorClass: "text-purple-300",
    secondaryColorClass: "text-pink-300",
    detailColorClass: "text-amber-200",
  },
  christmas: {
    gradient: "from-red-950/80 via-emerald-950/35 to-zinc-950",
    spotlightRgba: "rgba(239, 68, 68, 0.18)",
    primaryColorClass: "text-emerald-400",
    secondaryColorClass: "text-red-300",
    detailColorClass: "text-amber-200",
  },
  halloween: {
    gradient: "from-orange-950/80 via-purple-950/45 to-zinc-950",
    spotlightRgba: "rgba(249, 115, 22, 0.18)",
    primaryColorClass: "text-orange-400",
    secondaryColorClass: "text-purple-300",
    detailColorClass: "text-amber-300",
  },
  fallback: {
    gradient: "from-slate-900/80 via-zinc-900/50 to-zinc-950",
    spotlightRgba: "rgba(148, 163, 184, 0.14)",
    primaryColorClass: "text-slate-300",
    secondaryColorClass: "text-zinc-300",
    detailColorClass: "text-amber-200",
  },
};

export function getVietnamEventThemeConfig(themeKey: VietnamPatternThemeKey): ThemeVisualConfig {
  return THEME_VISUAL_CONFIGS[themeKey] || THEME_VISUAL_CONFIGS.fallback;
}
