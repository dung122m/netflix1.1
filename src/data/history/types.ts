/**
 * NANAFLIX VIETNAM HISTORICAL DATA ARCHITECTURE
 * Schema foundation for "Ngày này trong lịch sử Việt Nam", Timeline, and future History features.
 */

export type HistoricalPrecision = "exact_day" | "month_year" | "year_only" | "era_approx";

export type HistoricalPeriodId =
  | "tien-su-hung-vuong"       // Thời Tiền sử, Văn Lang - Âu Lạc (Đến 179 TCN)
  | "bac-thuoc"                // Thời kỳ Bắc thuộc & Chống Bắc thuộc (179 TCN - 938)
  | "ngo-dinh-tien-le"         // Ngô - Đinh - Tiền Lê (938 - 1009)
  | "ly-tran-ho"               // Nhà Lý, Nhà Trần, Nhà Hồ (1009 - 1407)
  | "hau-le-mac-trung-hung"    // Lê Sơ, Nhà Mạc, Lê Trung Hưng (1428 - 1788)
  | "tay-son"                  // Phong trào Tây Sơn & Triều đại Tây Sơn (1771 - 1802)
  | "nha-nguyen"               // Triều Nguyễn trước Pháp thuộc (1802 - 1883)
  | "phap-thuoc"               // Thời kỳ Pháp thuộc & Phong trào giải phóng (1884 - 1945)
  | "khang-chien-chong-phap"   // Cách mạng Tháng Tám & Kháng chiến chống Pháp (1945 - 1954)
  | "khang-chien-chong-my"     // Kháng chiến chống Mỹ cứu nước & Thống nhất (1954 - 1975)
  | "hien-dai-doi-moi"         // Xây dựng, Đổi mới & Hội nhập quốc tế (1975 - Nay)
  | "chua-xac-dinh";

export interface HistoricalPeriod {
  id: HistoricalPeriodId;
  name: string;
  shortName: string;
  timeRange: string;
  startYear?: number;
  endYear?: number;
  description: string;
  colorToken: string;
}

export type HistoricalVisualTheme =
  | "ba-dinh-1945"
  | "dien-bien-phu"
  | "giai-phong-thu-do"
  | "thong-nhat-1975"
  | "dong-da"
  | "hai-ba-trung"
  | "bach-dang"
  | "bac-ho-cuu-nuoc"
  | "khang-chien"
  | "general-history";

export interface HistoricalEvent {
  id: string;
  
  // Date precision
  date: {
    day?: number;
    month?: number;
    year?: number;
    precision: HistoricalPrecision;
    lunarDate?: { lunarMonth: number; lunarDay: number };
    isBce?: boolean; // TCN
  };
  displayDate: string; // e.g. "02/09/1945", "Tháng 8/1945", "Năm 938"
  year?: number;

  // Taxonomy & Priority
  title: string;
  slug?: string;
  periodId: HistoricalPeriodId;
  priorityTier: "S" | "A" | "B" | "C" | "D";
  priorityScore: number; // 1 - 100

  // Narrative & Facts
  summary: string;
  context?: string;
  significance: string;
  keyFacts?: string[];
  didYouKnow?: string;
  
  // Entity relations (Phase 1: simple array, Phase 2 ready)
  figures?: string[];
  location?: string;
  relatedMediaIds?: string[];
  
  // Visual presentation & Documentary Imagery
  visualTheme: HistoricalVisualTheme;
  imageUrl?: string;
  imageCaption?: string;
  imageSource?: string;
  sources: string[];
  isCurated?: boolean;
}

/**
 * Entity schema preparations for future Phase 2
 */
export interface HistoricalFigure {
  id: string;
  canonicalName: string;
  aliases: string[];
  title: string;
  birthYear?: number;
  deathYear?: number;
  periodId: HistoricalPeriodId;
  summary: string;
  avatarUrl?: string;
}

export interface HistoricalPlace {
  id: string;
  name: string;
  historicalNames?: string[];
  currentLocation: string;
  latitude?: number;
  longitude?: number;
  description: string;
}
