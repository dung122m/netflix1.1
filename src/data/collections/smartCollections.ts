export interface SmartCollectionConfig {
  id: string;
  name: string;
  description: string;
  emoji: string;
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
    description: "Tuyển chọn các siêu phẩm giải trí và bom tấn điện ảnh hấp dẫn nhất cho những ngày nghỉ trọn vẹn.",
    emoji: "🔥",
    badge: "Cuối Tuần",
    query: { sort: "views", limit: 24, page: 1 },
  },
  {
    id: "martial-arts-legends",
    name: "Võ Thuật & Hành Động",
    description: "Những pha hành động nghẹt thở, kungfu kinh điển và các màn đọ sức đỉnh cao của điện ảnh châu Á và thế giới.",
    emoji: "🥋",
    badge: "Hành Động",
    query: { category: "vo-thuat", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "deep-drama",
    name: "Tâm Lý & Chính Kịch",
    description: "Những tác phẩm chính kịch sâu sắc, chạm đến tầng sâu cảm xúc và suy ngẫm của người xem.",
    emoji: "🎭",
    badge: "Tâm Lý",
    query: { category: "tam-ly", sort: "rating", limit: 24, page: 1 },
  },
  {
    id: "k-drama-wave",
    name: "Làn Sóng K-Drama",
    description: "Những bộ phim truyền hình Hàn Quốc đình đám với dàn diễn viên xuất sắc và kịch bản cuốn hút.",
    emoji: "🇰🇷",
    badge: "K-Drama",
    query: { country: "han-quoc", type: "phim-bo", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "most-watched",
    name: "Phim Được Xem Nhiều Nhất",
    description: "Bảng xếp hạng những bộ phim được cộng đồng người xem Nanaflix đón nhận và theo dõi nhiều nhất.",
    emoji: "⭐",
    badge: "Top Views",
    query: { sort: "views", limit: 24, page: 1 },
  },
  {
    id: "cinema-blockbusters",
    name: "Phim Điện Ảnh Nổi Bật",
    description: "Tuyển tập những siêu phẩm chiếu rạp chất lượng cao với kỹ xảo và âm thanh đỉnh cao.",
    emoji: "🎬",
    badge: "Chiếu Rạp",
    query: { type: "phim-le", sort: "rating", limit: 24, page: 1 },
  },
  {
    id: "sci-fi-mysteries",
    name: "Khoa Học & Viễn Tưởng",
    description: "Khám phá những chiều không gian bí ẩn, tương lai công nghệ và những giả thuyết khoa học kỳ vĩ.",
    emoji: "🔮",
    badge: "Viễn Tưởng",
    query: { category: "vien-tuong", sort: "views", limit: 24, page: 1 },
  },
  {
    id: "anime-hits",
    name: "Anime & Hoạt Hình Hot",
    description: "Thế giới anime Nhật Bản và phim hoạt hình đặc sắc với hình ảnh tuyệt mỹ và cốt truyện lay động.",
    emoji: "🌸",
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
