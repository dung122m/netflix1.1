export interface SmartCollectionConfig {
  id: string;
  name: string;
  description: string;
  emoji?: string;
  badge: string;
  query: {
    category?: string;
    country?: string;
    type?: string;
    sort?: "views" | "rating" | "latest";
    limit?: number;
    page?: number;
  };
}

export const SMART_COLLECTIONS: SmartCollectionConfig[] = [
  {
    id: "weekend-picks",
    name: "Xem Cuối Tuần",
    description: "Tuyển chọn các bộ phim giải trí và bom tấn phù hợp cho những ngày nghỉ trọn vẹn.",
    emoji: "",
    badge: "Cuối Tuần",
    query: { sort: "views", limit: 24, page: 1 },
  },
  {
    id: "martial-arts-legends",
    name: "Võ Thuật & Hành Động",
    description: "Những pha hành động kịch tính, kungfu và các màn đọ sức ấn tượng của điện ảnh châu Á và thế giới.",
    emoji: "",
    badge: "Hành Động",
    query: { category: "vo-thuat", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "deep-drama",
    name: "Tâm Lý & Chính Kịch",
    description: "Những tác phẩm chính kịch giàu cảm xúc và chiều sâu tâm lý.",
    emoji: "",
    badge: "Tâm Lý",
    query: { category: "tam-ly", sort: "rating", limit: 24, page: 1 },
  },
  {
    id: "k-drama-wave",
    name: "Làn Sóng K-Drama",
    description: "Những bộ phim truyền hình Hàn Quốc được yêu thích với dàn diễn viên quen thuộc.",
    emoji: "",
    badge: "K-Drama",
    query: { country: "han-quoc", type: "phim-bo", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "most-watched",
    name: "Phim Được Xem Nhiều Nhất",
    description: "Bảng xếp hạng những bộ phim được cộng đồng người xem Nanaflix theo dõi nhiều nhất.",
    emoji: "",
    badge: "Top Views",
    query: { sort: "views", limit: 24, page: 1 },
  },
  {
    id: "cinema-blockbusters",
    name: "Phim Điện Ảnh Nổi Bật",
    description: "Tuyển tập những bộ phim chiếu rạp ấn tượng với chất lượng hình ảnh sắc nét.",
    emoji: "",
    badge: "Chiếu Rạp",
    query: { type: "phim-le", sort: "rating", limit: 24, page: 1 },
  },
  {
    id: "sci-fi-mysteries",
    name: "Khoa Học & Viễn Tưởng",
    description: "Những bộ phim khám phá tương lai công nghệ, không gian và những giả thuyết khoa học kỳ thú.",
    emoji: "",
    badge: "Viễn Tưởng",
    query: { category: "vien-tuong", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "anime-hits",
    name: "Anime & Hoạt Hình Hot",
    description: "Các tác phẩm hoạt hình và anime Nhật Bản chọn lọc với cốt truyện hấp dẫn.",
    emoji: "",
    badge: "Anime",
    query: { type: "hoat-hinh", sort: "views", limit: 24, page: 1 },
  },
];

/**
 * Lấy danh sách tóm tắt tất cả các Tuyển tập thông minh (Smart Collections)
 */
export function getSmartCollectionsList(): SmartCollectionConfig[] {
  return SMART_COLLECTIONS;
}
