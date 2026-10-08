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
  bannerDescription?: string | null;
  description?: string | null;
  subtitle?: string | null;
  dateLabel?: string | null;
  category: VietnamEventCategory;
  categoryLabel: string;
  nature: EventNature;
  natureLabel: string;
  priority: number; // Điểm ưu tiên hiển thị (số càng cao ưu tiên càng lớn)
  eventYear?: number | null; // Năm diễn ra sự kiện gốc (dùng để tính số năm kỷ niệm anniversary)
  milestoneFigure?: string | null; // Nhân vật / danh nhân gắn liền với sự kiện
  effect?: EventEffectType | null;
  country?: string | null;
  region?: string | null;
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
  history?: string | null;
  significance: string;
  meaning?: string | null;
  whyItMatters?: string | null;
  traditions?: string[];
  activities?: string[];
  cuisine?: string | null;
  didYouKnow: string;
  interestingFacts?: string[];
  milestones: string[];
  quote?: string | null;
  message?: string | null;
  tag?: string | null;
  imageUrl?: string | null;
  imageCaption?: string | null;
  imageSource?: string | null;
  accentGradient?: string | null;
  relatedLink?: string | null;
  relatedLabel?: string | null;
  actorSlug?: string | null;
  actorName?: string | null;
  historicalEventId?: string | null;
  heroEligible?: boolean;
}


