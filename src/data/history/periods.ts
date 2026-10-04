import { HistoricalPeriod } from "./types";

export const HISTORICAL_PERIODS: HistoricalPeriod[] = [
  {
    id: "tien-su-hung-vuong",
    name: "Thời Tiền Sử & Các Vua Hùng",
    shortName: "Hùng Vương - Âu Lạc",
    timeRange: "Thời tiền sử - 179 TCN",
    description: "Khởi nguồn dân tộc Việt Nam, thời đại đồ đồng Đông Sơn rực rỡ và nhà nước Văn Lang, Âu Lạc.",
    colorToken: "#F59E0B"
  },
  {
    id: "bac-thuoc",
    name: "Thời Kỳ Bắc Thuộc & Đấu Tranh Giành Độc Lập",
    shortName: "Thời Bắc Thuộc",
    timeRange: "179 TCN - 938",
    startYear: -179,
    endYear: 938,
    description: "Hơn một thiên niên kỷ kiên cường đấu tranh chống đồng hóa, các cuộc khởi nghĩa oanh liệt của Hai Bà Trưng, Bà Triệu, Lý Bí, Mai Thúc Loan.",
    colorToken: "#EF4444"
  },
  {
    id: "ngo-dinh-tien-le",
    name: "Thời Kỳ Ngô - Đinh - Tiền Lê",
    shortName: "Ngô - Đinh - Tiền Lê",
    timeRange: "938 - 1009",
    startYear: 938,
    endYear: 1009,
    description: "Chiến thắng Bạch Đằng năm 938 mở ra kỷ nguyên độc lập lâu dài, thống nhất 12 sứ quân và kháng Tống lần thứ nhất.",
    colorToken: "#10B981"
  },
  {
    id: "ly-tran-ho",
    name: "Thời Kỳ Nhà Lý - Nhà Trần - Nhà Hồ",
    shortName: "Lý - Trần - Hồ",
    timeRange: "1009 - 1407",
    startYear: 1009,
    endYear: 1407,
    description: "Thời đại văn minh Đại Việt phát triển đỉnh cao, hào khí Đông A 3 lần đại phá quân Nguyên Mông xâm lược.",
    colorToken: "#3B82F6"
  },
  {
    id: "hau-le-mac-trung-hung",
    name: "Thời Kỳ Hậu Lê - Nhà Mạc - Lê Trung Hưng",
    shortName: "Lê Sơ & Trung Hưng",
    timeRange: "1428 - 1788",
    startYear: 1428,
    endYear: 1788,
    description: "Khởi nghĩa Lam Sơn đại thắng giặc Minh, thời kỳ thịnh trị Lê Sơ và Bình Ngô Đại Cáo bất hủ.",
    colorToken: "#8B5CF6"
  },
  {
    id: "tay-son",
    name: "Phong Trào & Triều Đại Tây Sơn",
    shortName: "Nhà Tây Sơn",
    timeRange: "1771 - 1802",
    startYear: 1771,
    endYear: 1802,
    description: "Hoàng đế Quang Trung - Nguyễn Huệ thần tốc đại phá 2 vạn quân Xiêm và 29 vạn quân Mãn Thanh.",
    colorToken: "#EC4899"
  },
  {
    id: "nha-nguyen",
    name: "Thời Kỳ Triều Nguyễn",
    shortName: "Triều Nguyễn",
    timeRange: "1802 - 1883",
    startYear: 1802,
    endYear: 1883,
    description: "Thống nhất lãnh thổ từ ải Nam Quan đến mũi Cà Mau, xây dựng kinh thành Huế và phát triển văn hiến dân tộc.",
    colorToken: "#F97316"
  },
  {
    id: "phap-thuoc",
    name: "Thời Kỳ Pháp Thuộc & Phong Trào Yêu Nước",
    shortName: "Thời Pháp Thuộc",
    timeRange: "1884 - 1945",
    startYear: 1884,
    endYear: 1945,
    description: "Phong trào Cần Vương, Đông Kinh Nghĩa Thục, cuộc hành trình tìm đường cứu nước của người thanh niên Nguyễn Tất Thành.",
    colorToken: "#6B7280"
  },
  {
    id: "khang-chien-chong-phap",
    name: "Cách Mạng Tháng Tám & Kháng Chiến Chống Pháp",
    shortName: "K/C Chống Pháp (1945 - 1954)",
    timeRange: "1945 - 1954",
    startYear: 1945,
    endYear: 1954,
    description: "Tuyên ngôn Độc lập khai sinh nước VNDCCH, 9 năm trường kỳ kháng chiến kết thúc bằng chiến thắng Điện Biên Phủ 'lừng lẫy năm châu'.",
    colorToken: "#DC2626"
  },
  {
    id: "khang-chien-chong-my",
    name: "Kháng Chiến Chống Mỹ Cứu Nước",
    shortName: "K/C Chống Mỹ (1954 - 1975)",
    timeRange: "1954 - 1975",
    startYear: 1954,
    endYear: 1975,
    description: "Cuộc kháng chiến thần thánh giải phóng miền Nam, thống nhất non sông với Chiến dịch Hồ Chí Minh lịch sử 30/04/1975.",
    colorToken: "#E11D48"
  },
  {
    id: "hien-dai-doi-moi",
    name: "Thời Kỳ Hiện Đại, Đổi Mới & Phát Triển",
    shortName: "Hiện Đại (1975 - Nay)",
    timeRange: "1975 - Nay",
    startYear: 1975,
    description: "Khắc phục hậu quả chiến tranh, công cuộc Đổi mới toàn diện từ 1986, hội nhập quốc tế và bảo vệ chủ quyền biển đảo.",
    colorToken: "#059669"
  }
];

export function getHistoricalPeriodById(id: string): HistoricalPeriod | undefined {
  return HISTORICAL_PERIODS.find(p => p.id === id);
}
