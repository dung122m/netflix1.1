import type { VietnamTodayInfo } from "@/lib/vietnamCalendar";
import type { VietnamEvent } from "@/data/events/types";
import type { VietnamHistoricalEvent } from "@/data/historicalEvents";

/**
 * Curated Cinematic Backgrounds for Vietnam Today / Special Events
 * - Nhẹ, tối ưu, chỉ tải duy nhất background đang hiển thị.
 * - Được nhóm theo chủ đề: Đại lễ, Lịch sử, Văn hóa truyền thống, Xã hội/Y tế, Quốc tế, Nghệ thuật.
 */



/**
 * Helper kiểm tra URL ảnh có phải là stock placeholder ngẫu nhiên hay không
 */
export function isPlaceholderUrl(url?: string | null): boolean {
  if (!url) return true;
  if (url.includes("images.unsplash.com")) return true;
  if (url.includes("placeholder")) return true;
  return false;
}

/**
 * Lấy background cinematic tối ưu cho sự kiện hôm nay
 * - Chỉ dùng ảnh cụ thể cho diễn viên thật (TMDB actor backdrop/poster thật).
 * - Tất cả các ngày kỷ niệm / sự kiện văn hóa / lịch sử / đại lễ sử dụng hệ màu sắc gradient tinh tế,
 *   ánh sáng ambient spotlights và các hiệu ứng động đặc quyền (Tết, Trung Thu, Quốc Khánh, Noel, Halloween...).
 */
export function getVietnamEventBackground(info: VietnamTodayInfo | {
  event: VietnamEvent;
  historicalEventsToday?: VietnamHistoricalEvent[];
}): string {
  const { event } = info;

  // 0. Ảnh cụ thể của diễn viên thật hoặc ảnh tư liệu lịch sử từ GitHub Historical Events
  if (
    event?.imageUrl &&
    !isPlaceholderUrl(event.imageUrl) &&
    (event.id?.startsWith("ev-actor-birthday") ||
      event.actorName ||
      event.actorSlug ||
      event.category === "vietnam-history" ||
      Boolean(event.historicalEventId) ||
      event.id?.startsWith("he-") ||
      event.id?.startsWith("hist-"))
  ) {
    return event.imageUrl;
  }

  // Đối với các ngày kỷ niệm, lịch sử, văn hóa, đại lễ không có ảnh: Không dùng ảnh stock ngẫu nhiên để tránh lệch ngữ cảnh.
  // Trả về rỗng để component render màu sắc gradient, ambient spotlights và hiệu ứng lễ hội.
  return "";
}

/**
 * Kiểm tra xem event có thiết kế / holiday effect riêng biệt từ trước hay không.
 * - 1. Có Holiday Effect riêng (Tết, Quốc khánh, Trung thu, Giáng sinh, Halloween, Nana Birthday)
 * - 2. Có ảnh diễn viên thực tế hoặc ảnh tư liệu lịch sử
 * Nếu đã có thiết kế riêng -> giữ nguyên 100% hiệu ứng và không áp Thematic Icon Composition đè lên.
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

  // 2. Có ảnh diễn viên thực tế (sinh nhật diễn viên) hoặc ảnh tư liệu lịch sử
  if (
    event?.imageUrl &&
    !isPlaceholderUrl(event.imageUrl) &&
    (event?.id?.startsWith("ev-actor-birthday") ||
      event?.actorSlug ||
      event?.actorName ||
      event?.category === "vietnam-history" ||
      Boolean(event?.historicalEventId) ||
      event?.id?.startsWith("he-") ||
      event?.id?.startsWith("hist-"))
  ) {
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
