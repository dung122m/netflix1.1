import { Clock, Star, Flame, Calendar, LucideIcon } from "lucide-react";

export type FilterGroup = "type" | "genre" | "country" | "year" | "sort";

export interface MovieTypeOption {
  name: string;
  slug: string;
}

export interface SortOptionItem {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

export const MOVIE_TYPES: MovieTypeOption[] = [
  { name: "Phim Lẻ", slug: "phim-le" },
  { name: "Phim Bộ", slug: "phim-bo" },
  { name: "Chiếu Rạp", slug: "phim-chieu-rap" },
  { name: "Hoạt Hình", slug: "hoat-hinh" },
  { name: "TV Shows", slug: "tv-shows" },
  { name: "Sắp Chiếu", slug: "phim-sap-chieu" },
  { name: "Thuyết Minh", slug: "phim-thuyet-minh" },
  { name: "Lồng Tiếng", slug: "phim-long-tieng" },
];

export const SORT_OPTIONS: SortOptionItem[] = [
  // 1. Năm phát hành (2 chiều: Mới nhất & Cũ nhất)
  { label: "Năm mới nhất", value: "year", icon: Calendar, color: "text-emerald-400" },
  { label: "Năm cũ nhất", value: "year-asc", icon: Calendar, color: "text-emerald-500" },

  // 2. Thời gian cập nhật (2 chiều: Mới cập nhật & Cũ nhất)
  { label: "Mới cập nhật", value: "latest", icon: Clock, color: "text-sky-400" },
  { label: "Cập nhật cũ nhất", value: "oldest", icon: Clock, color: "text-zinc-400" },

  // 3. Điểm đánh giá (2 chiều: Cao nhất & Thấp nhất)
  { label: "Điểm đánh giá cao", value: "rating", icon: Star, color: "text-amber-400" },
  { label: "Điểm đánh giá thấp", value: "rating-asc", icon: Star, color: "text-amber-600" },

  // 4. Lượt xem (2 chiều: Xem nhiều & Xem ít)
  { label: "Xem nhiều nhất", value: "views", icon: Flame, color: "text-orange-500" },
  { label: "Xem ít nhất", value: "views-asc", icon: Flame, color: "text-amber-500" },
];

