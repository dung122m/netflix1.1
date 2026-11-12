export const GENRE_OPTIONS = [
  "Hành Động",
  "Tình Cảm",
  "Kinh Dị",
  "Viễn Tưởng",
  "Hoạt Hình / Anime",
  "Hài Hước",
  "Cổ Trang",
  "Trinh Thám",
  "Chiếu Rạp",
  "Phim Bộ",
  "TV Shows",
  "Võ Thuật",
];

export const AVAILABLE_BADGES = [
  { id: "night-owl", label: "Mọt Phim Đêm", minMinutesReq: 0, reqText: "Tân Thủ (0h xem)" },
  { id: "director", label: "Đạo Diễn Tương Lai", minMinutesReq: 60, reqText: "1h+ xem (Bạc)" },
  { id: "anime-god", label: "Thánh Anime", minMinutesReq: 300, reqText: "5h+ xem Anime" },
  { id: "super-watcher", label: "Cày Phim Siêu Cấp", minMinutesReq: 600, reqText: "10h+ xem (Vàng)" },
  { id: "diamond-vampire", label: "Cương Thi Đêm", minMinutesReq: 3000, reqText: "50h+ xem (Kim Cương)" },
  { id: "top-fan", label: "Top Fan Nanaflix", minMinutesReq: 12000, reqText: "200h+ xem (Thánh Phim)" },
];

export type ProfileTab = "profile" | "player_settings" | "comments";

