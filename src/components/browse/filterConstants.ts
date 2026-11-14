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

export type SortField = "latest" | "views" | "rating" | "year";
export type SortDirection = "desc" | "asc";

export interface SortFieldOption {
  field: SortField;
  label: string;
  icon: LucideIcon;
  color: string;
  descLabel: string;
  ascLabel: string;
}

/**
 * 4 Tiêu chí sắp xếp cốt lõi chuẩn TMDB / Letterboxd
 */
export const SORT_FIELDS: SortFieldOption[] = [
  {
    field: "latest",
    label: "Mới cập nhật",
    icon: Clock,
    color: "text-sky-400",
    descLabel: "Mới cập nhật",
    ascLabel: "Cập nhật cũ nhất",
  },
  {
    field: "views",
    label: "Lượt xem",
    icon: Flame,
    color: "text-orange-500",
    descLabel: "Xem nhiều nhất",
    ascLabel: "Xem ít nhất",
  },
  {
    field: "rating",
    label: "Điểm đánh giá",
    icon: Star,
    color: "text-amber-400",
    descLabel: "Điểm cao nhất",
    ascLabel: "Điểm thấp nhất",
  },
  {
    field: "year",
    label: "Năm phát hành",
    icon: Calendar,
    color: "text-emerald-400",
    descLabel: "Năm mới nhất",
    ascLabel: "Năm cũ nhất",
  },
];

/**
 * Phân rã chuỗi sort param URL thành { field, direction }
 */
export function unpackSort(sortValue: string = "latest"): { field: SortField; direction: SortDirection } {
  const s = (sortValue || "").trim().toLowerCase();
  if (s === "year" || s === "year-desc" || s === "year_desc") return { field: "year", direction: "desc" };
  if (s === "year-asc" || s === "year_asc" || s === "year-oldest") return { field: "year", direction: "asc" };
  if (s === "oldest" || s === "time-asc" || s === "time_asc") return { field: "latest", direction: "asc" };
  if (s === "views" || s === "views-desc" || s === "views_desc") return { field: "views", direction: "desc" };
  if (s === "views-asc" || s === "views_asc") return { field: "views", direction: "asc" };
  if (s === "rating" || s === "rating-desc" || s === "rating_desc") return { field: "rating", direction: "desc" };
  if (s === "rating-asc" || s === "rating_asc") return { field: "rating", direction: "asc" };
  return { field: "latest", direction: "desc" };
}

/**
 * Gộp { field, direction } thành chuỗi sort param chuẩn hóa cho URL
 */
export function packSort(field: SortField, direction: SortDirection): string {
  if (field === "latest") {
    return direction === "asc" ? "oldest" : "latest";
  }
  if (field === "views") {
    return direction === "asc" ? "views-asc" : "views";
  }
  if (field === "rating") {
    return direction === "asc" ? "rating-asc" : "rating";
  }
  if (field === "year") {
    return direction === "asc" ? "year-asc" : "year";
  }
  return "latest";
}

/**
 * Lấy nhãn hiển thị trực quan cho thanh công cụ và nút bấm
 */
export function getSortDisplayLabel(sortValue: string = "latest"): {
  fieldLabel: string;
  directionLabel: string;
  combinedLabel: string;
  direction: SortDirection;
} {
  const { field, direction } = unpackSort(sortValue);
  const found = SORT_FIELDS.find((f) => f.field === field) || SORT_FIELDS[0];
  const directionLabel = direction === "desc" ? found.descLabel : found.ascLabel;
  const option = SORT_OPTIONS.find((o) => o.value === sortValue);
  return {
    fieldLabel: found.label,
    directionLabel: option ? option.label : directionLabel,
    combinedLabel: option ? option.label : `${found.label} ${direction === "desc" ? "↓" : "↑"}`,
    direction,
  };
}

/**
 * 4 Tiêu chí cốt lõi tinh gọn chuẩn Netflix / Apple TV+ (Phương án 1)
 */
export const SORT_OPTIONS: SortOptionItem[] = [
  { label: "Mới cập nhật", value: "latest", icon: Clock, color: "text-sky-400" },
  { label: "Xem nhiều nhất", value: "views", icon: Flame, color: "text-orange-500" },
  { label: "Điểm đánh giá cao", value: "rating", icon: Star, color: "text-amber-400" },
  { label: "Năm phát hành mới", value: "year", icon: Calendar, color: "text-emerald-400" },
];

