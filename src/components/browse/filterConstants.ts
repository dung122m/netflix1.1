import React from "react";
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
  { label: "Mới cập nhật", value: "latest", icon: Clock, color: "text-sky-400" },
  { label: "Điểm đánh giá cao", value: "rating", icon: Star, color: "text-amber-400" },
  { label: "Xem nhiều nhất", value: "views", icon: Flame, color: "text-orange-500" },
  { label: "Năm mới nhất", value: "year", icon: Calendar, color: "text-emerald-400" },
];
