export type VietnamEventCategory =
  | "national-holiday"
  | "vietnam-history"
  | "traditional-culture"
  | "social-family"
  | "international"
  | "entertainment"
  | "fun";

export type EventNature =
  | "official-holiday"      // Quốc lễ / Nghỉ lễ chính thức
  | "historical-anniversary" // Kỷ niệm lịch sử / Ngày truyền thống ngành
  | "traditional-festival"   // Lễ hội cổ truyền / Phong tục dân tộc
  | "social-observance"      // Ngày vì cộng đồng / Gia đình & Xã hội
  | "international-day"      // Ngày quốc tế hưởng ứng (LHQ / UNESCO / WHO)
  | "arts-culture"           // Văn hóa, Nghệ thuật & Điện ảnh
  | "theme-day";             // Ngày chủ đề đời sống & Thú vị

export type EventEffectType =
  | "mid-autumn"
  | "tet"
  | "national-day"
  | "christmas"
  | "halloween"
  | "nana-birthday";

export interface VietnamEvent {
  id: string;
  title: string;
  shortDescription: string;
  category: VietnamEventCategory;
  categoryLabel: string;
  nature: EventNature;
  natureLabel: string;
  priority: number; // Điểm ưu tiên hiển thị (số càng cao ưu tiên càng lớn)
  effect?: EventEffectType | null;
  solarDate?: {
    month: number; // 1 - 12
    day: number; // 1 - 31
    endDay?: number;
  };
  lunarDate?: {
    lunarMonth: number; // 1 - 12
    lunarDay: number; // 1 - 30
    endLunarDay?: number;
    isNewYearEve?: boolean;
  };
  dateRule?: string;
  displayDate: string;
  lunarDisplayDate?: string | null;
  origin: string;
  significance: string;
  didYouKnow: string;
  milestones: string[];
  quote?: string | null;
  tag?: string | null;
  imageUrl?: string | null;
  accentGradient?: string | null;
}
