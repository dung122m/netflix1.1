/**
 * NANAFLIX HISTORICAL FIGURES REGISTRY & ENTITY RESOLUTION
 * Canonical catalog of Vietnamese historical figures, aliases, and safe entity linking.
 */

import { HistoricalFigure, HistoricalPeriodId } from "./types";

export const HISTORICAL_FIGURES: HistoricalFigure[] = [
  {
    id: "ho-chi-minh",
    canonicalName: "Hồ Chí Minh",
    aliases: [
      "Nguyễn Ái Quốc",
      "Nguyễn Tất Thành",
      "Bác Hồ",
      "Chủ tịch Hồ Chí Minh",
      "Nguyễn Sinh Cung",
      "Anh Ba"
    ],
    title: "Chủ tịch nước, Anh hùng giải phóng dân tộc, Danh nhân văn hóa thế giới",
    birthYear: 1890,
    deathYear: 1969,
    periodId: "khang-chien-chong-phap",
    summary: "Lãnh tụ vĩ đại của dân tộc Việt Nam, người sáng lập Đảng Cộng sản Việt Nam và khai sinh nước Việt Nam Dân chủ Cộng hòa."
  },
  {
    id: "tran-hung-dao",
    canonicalName: "Trần Hưng Đạo",
    aliases: [
      "Trần Quốc Tuấn",
      "Hưng Đạo Đại Vương",
      "Hưng Đạo Vương",
      "Đức Thánh Trần"
    ],
    title: "Tiết chế Quốc công, Đại danh tướng nhà Trần",
    birthYear: 1228,
    deathYear: 1300,
    periodId: "ly-tran-ho",
    summary: "Nhà quân sự thiên tài 3 lần lãnh đạo quân dân Đại Việt đánh tan quân xâm lược Nguyên Mông, tác giả Hịch tướng sĩ và Binh thư yếu lược."
  },
  {
    id: "ly-thuong-kiet",
    canonicalName: "Lý Thường Kiệt",
    aliases: [
      "Ngô Tuấn",
      "Thái úy Lý Thường Kiệt"
    ],
    title: "Thái úy Quốc công nhà Lý",
    birthYear: 1019,
    deathYear: 1105,
    periodId: "ly-tran-ho",
    summary: "Danh tướng kiệt xuất triều Lý lãnh đạo kháng chiến chống Tống oanh liệt, tác giả bản tuyên ngôn độc lập đầu tiên Nam quốc sơn hà."
  },
  {
    id: "quang-trung",
    canonicalName: "Quang Trung",
    aliases: [
      "Nguyễn Huệ",
      "Bắc Bình Vương",
      "Hoàng đế Quang Trung",
      "Hồ Thơm"
    ],
    title: "Hoàng đế triều Tây Sơn, Anh hùng áo vải cờ đào",
    birthYear: 1753,
    deathYear: 1792,
    periodId: "tay-son",
    summary: "Thiên tài quân sự bách chiến bách thắng, lãnh đạo phong trào Tây Sơn lật đổ các tập đoàn phong kiến phân tranh và quét sạch 29 vạn quân Mãn Thanh."
  },
  {
    id: "ly-bi",
    canonicalName: "Lý Bí",
    aliases: [
      "Lý Nam Đế",
      "Tiền Lý Nam Đế"
    ],
    title: "Hoàng đế sáng lập nhà Tiền Lý, khai sinh nước Vạn Xuân",
    birthYear: 503,
    deathYear: 548,
    periodId: "bac-thuoc",
    summary: "Thủ lĩnh kiệt xuất lãnh đạo nhân dân khởi nghĩa đánh đuổi quân đô hộ nhà Lương, xưng hoàng đế và lập ra nhà nước Vạn Xuân độc lập."
  },
  {
    id: "vo-nguyen-giap",
    canonicalName: "Võ Nguyên Giáp",
    aliases: [
      "Đại tướng Võ Nguyên Giáp",
      "Bác Giáp",
      "Tổng Tư lệnh Võ Nguyên Giáp",
      "Võ Giáp"
    ],
    title: "Đại tướng Tổng Tư lệnh Quân đội Nhân dân Việt Nam",
    birthYear: 1911,
    deathYear: 2013,
    periodId: "khang-chien-chong-phap",
    summary: "Nhà quân sự kiệt xuất, Tổng tư lệnh chỉ huy chiến dịch Điện Biên Phủ và chiến dịch Hồ Chí Minh lịch sử."
  },
  {
    id: "hai-ba-trung",
    canonicalName: "Hai Bà Trưng",
    aliases: [
      "Trưng Trắc",
      "Trưng Nhị",
      "Trưng Nữ Vương"
    ],
    title: "Nữ vương đầu tiên trong lịch sử dân tộc Việt Nam",
    birthYear: 14,
    deathYear: 43,
    periodId: "bac-thuoc",
    summary: "Hai nữ anh hùng dân tộc lãnh đạo cuộc khởi nghĩa đầu tiên chống ách đô hộ của nhà Đông Hán, giành lại độc lập và xưng vương."
  },
  {
    id: "dinh-bo-linh",
    canonicalName: "Đinh Bộ Lĩnh",
    aliases: [
      "Đinh Tiên Hoàng",
      "Vạn Thắng Vương",
      "Đinh Hoàn"
    ],
    title: "Hoàng đế sáng lập triều Đinh, người định đô ở Hoa Lư",
    birthYear: 924,
    deathYear: 979,
    periodId: "ngo-dinh-tien-le",
    summary: "Anh hùng dân tộc dẹp loạn 12 sứ quân, thống nhất non sông, xưng Hoàng đế và đặt quốc hiệu Đại Cồ Việt."
  },
  {
    id: "le-loi",
    canonicalName: "Lê Lợi",
    aliases: [
      "Lê Thái Tổ",
      "Bình Định Vương"
    ],
    title: "Hoàng đế sáng lập triều Hậu Lê",
    birthYear: 1385,
    deathYear: 1433,
    periodId: "hau-le-mac-trung-hung",
    summary: "Lãnh tụ cuộc khởi nghĩa Lam Sơn 10 năm gian khổ đánh tan giặc Minh xâm lược, lập nên vương triều Hậu Lê hưng thịnh."
  },
  {
    id: "ngo-quyen",
    canonicalName: "Ngô Quyền",
    aliases: [
      "Tiền Ngô Vương"
    ],
    title: "Vị vua khai sinh kỷ nguyên độc lập lâu dài",
    birthYear: 897,
    deathYear: 944,
    periodId: "ngo-dinh-tien-le",
    summary: "Chủ tướng trận Bạch Đằng năm 938 đại phá quân Nam Hán, chấm dứt hơn 1000 năm Bắc thuộc."
  },
  {
    id: "ba-trieu",
    canonicalName: "Bà Triệu",
    aliases: [
      "Triệu Thị Trinh",
      "Triệu Quốc Đạt",
      "Nhụy Kiều Tướng quân"
    ],
    title: "Nữ anh hùng lãnh đạo khởi nghĩa chống quân Đông Ngô",
    birthYear: 225,
    deathYear: 248,
    periodId: "bac-thuoc",
    summary: "Nữ tướng kiên cường lãnh đạo cuộc khởi nghĩa chống quân xâm lược Đông Ngô năm 248."
  },
  {
    id: "ly-cong-uan",
    canonicalName: "Lý Công Uẩn",
    aliases: [
      "Lý Thái Tổ"
    ],
    title: "Hoàng đế sáng lập triều Lý, người dời đô về Thăng Long",
    birthYear: 974,
    deathYear: 1028,
    periodId: "ly-tran-ho",
    summary: "Người sáng lập vương triều Lý, ban Chiếu dời đô về thành Đại La năm 1010 và đổi tên là Thăng Long."
  },
  {
    id: "tran-nhan-tong",
    canonicalName: "Trần Nhân Tông",
    aliases: [
      "Trần Khâm",
      "Phật hoàng Trần Nhân Tông",
      "Trúc Lâm Đại Đầu Đà"
    ],
    title: "Hoàng đế thứ ba triều Trần, Sơ tổ Thiền phái Trúc Lâm",
    birthYear: 1258,
    deathYear: 1308,
    periodId: "ly-tran-ho",
    summary: "Minh quân lãnh đạo quân dân Đại Việt chiến thắng 2 cuộc kháng chiến chống Nguyên Mông (1285, 1288) và sáng lập Thiền phái Trúc Lâm Yên Tử."
  },
  {
    id: "nguyen-trai",
    canonicalName: "Nguyễn Trãi",
    aliases: [
      "Ức Trai",
      "Quan Phục Hầu"
    ],
    title: "Đại danh thần, nhà quân sự, Danh nhân văn hóa thế giới",
    birthYear: 1380,
    deathYear: 1442,
    periodId: "hau-le-mac-trung-hung",
    summary: "Quân sư kiệt xuất của khởi nghĩa Lam Sơn, tác giả áng thiên cổ hùng văn Bình Ngô đại cáo."
  },
  {
    id: "phan-boi-chau",
    canonicalName: "Phan Bội Châu",
    aliases: [
      "Sào Nam",
      "Phan Văn San"
    ],
    title: "Chí sĩ yêu nước, thủ lĩnh phong trào Đông Du",
    birthYear: 1867,
    deathYear: 1940,
    periodId: "phap-thuoc",
    summary: "Nhà cách mạng tiêu biểu đầu thế kỷ XX, sáng lập Duy Tân hội và phong trào Đông Du."
  },
  {
    id: "phan-chau-trinh",
    canonicalName: "Phan Châu Trinh",
    aliases: [
      "Tây Hồ",
      "Phan Chu Trinh"
    ],
    title: "Chí sĩ yêu nước khởi xướng phong trào Duy Tân",
    birthYear: 1872,
    deathYear: 1926,
    periodId: "phap-thuoc",
    summary: "Nhà cải cách dân chủ chủ trương Khai dân trí, chấn dân khí, hậu dân sinh."
  },
  {
    id: "le-hong-phong",
    canonicalName: "Lê Hồng Phong",
    aliases: [
      "Lê Huy Doãn"
    ],
    title: "Tổng Bí thư Ban Chấp hành Trung ương Đảng Cộng sản Đông Dương",
    birthYear: 1902,
    deathYear: 1942,
    periodId: "phap-thuoc",
    summary: "Nhà lãnh đạo tiền bối xuất sắc của Đảng, kiên cường bất khuất trước ngục tù thực dân."
  },
  {
    id: "tran-phu",
    canonicalName: "Trần Phú",
    aliases: [],
    title: "Tổng Bí thư đầu tiên của Đảng Cộng sản Việt Nam",
    birthYear: 1904,
    deathYear: 1931,
    periodId: "phap-thuoc",
    summary: "Tổng Bí thư đầu tiên của Đảng, soạn thảo Luận cương Chính trị năm 1930."
  },
  {
    id: "nguyen-thi-minh-khai",
    canonicalName: "Nguyễn Thị Minh Khai",
    aliases: [
      "Nguyễn Thị Vịnh"
    ],
    title: "Bí thư Thành ủy Sài Gòn - Chợ Lớn",
    birthYear: 1910,
    deathYear: 1941,
    periodId: "phap-thuoc",
    summary: "Nữ chiến sĩ cách mạng kiên trung bất khuất trong phong trào Khởi nghĩa Nam Kỳ."
  },
  {
    id: "vo-thi-sau",
    canonicalName: "Võ Thị Sáu",
    aliases: [
      "Nguyễn Thị Sáu"
    ],
    title: "Nữ Anh hùng Lực lượng vũ trang nhân dân",
    birthYear: 1933,
    deathYear: 1952,
    periodId: "khang-chien-chong-phap",
    summary: "Nữ anh hùng Đất Đỏ, biểu tượng bất khuất của tuổi trẻ Việt Nam trong kháng chiến chống Pháp."
  }
];

function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Index lookup map for O(1) resolution
const figureLookupMap = new Map<string, HistoricalFigure>();

HISTORICAL_FIGURES.forEach((fig) => {
  // 1. By ID
  figureLookupMap.set(normalizeString(fig.id), fig);
  // 2. By Canonical Name
  figureLookupMap.set(normalizeString(fig.canonicalName), fig);
  // 3. By Aliases
  fig.aliases.forEach((alias) => {
    figureLookupMap.set(normalizeString(alias), fig);
  });
});

/**
 * Resolves any name, alias, or ID to a canonical HistoricalFigure entity.
 */
export function resolveHistoricalFigure(nameOrAlias: string): HistoricalFigure | undefined {
  if (!nameOrAlias || typeof nameOrAlias !== "string") return undefined;
  const key = normalizeString(nameOrAlias);
  return figureLookupMap.get(key);
}

/**
 * Retrieves a historical figure by their stable ID.
 */
export function getHistoricalFigureById(id: string): HistoricalFigure | undefined {
  return HISTORICAL_FIGURES.find((f) => f.id === id);
}

/**
 * Retrieves all historical figures associated with a specific period.
 */
export function getHistoricalFiguresForPeriod(periodId: HistoricalPeriodId): HistoricalFigure[] {
  return HISTORICAL_FIGURES.filter((f) => f.periodId === periodId);
}

/**
 * Gets the canonical display name for a given figure or alias, or returns original name if unknown.
 */
export function getCanonicalFigureName(nameOrAlias: string): string {
  const figure = resolveHistoricalFigure(nameOrAlias);
  return figure ? figure.canonicalName : nameOrAlias;
}
