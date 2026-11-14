"use client";

import React from "react";

export interface MovieCardSkeletonProps {
  aspect?: "poster" | "video" | "square";
  rounded?: "lg" | "xl" | "2xl" | "3xl";
  showInfo?: boolean;
  className?: string;
}

const ASPECT_CLASSES = {
  poster: "aspect-[2/3]",
  video: "aspect-video",
  square: "aspect-square",
};

const ROUNDED_CLASSES = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
};

/**
 * Khung xương hiển thị khi đang tải thẻ phim (Movie Card Skeleton)
 * Chuẩn hóa tỷ lệ khung hình 2:3 (Poster) hoặc 16:9 (Video)
 * Chống Layout Shift (CLS) tuyệt đối và tích hợp hiệu ứng Shimmer điện ảnh.
 */
export const MovieCardSkeleton: React.FC<MovieCardSkeletonProps> = ({
  aspect = "poster",
  rounded = "xl",
  showInfo = true,
  className = "",
}) => {
  return (
    <div
      className={`relative w-full ${ASPECT_CLASSES[aspect]} ${ROUNDED_CLASSES[rounded]} bg-zinc-900/80 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      {/* HIỆU ỨNG SHIMMER LƯỚT QUA TINH TẾ */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent poster-placeholder-shimmer pointer-events-none" />

      {/* LỚP GRADIENT TỐI Ở ĐÁY THẺ */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

      {/* KHUNG THÔNG TIN PHỤ (TIÊU ĐỀ + NĂM / THỂ LOẠI) */}
      {showInfo && (
        <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 space-y-1.5 sm:space-y-2 pointer-events-none">
          <div className="h-3.5 sm:h-4 w-3/4 bg-white/15 rounded-md" />
          <div className="h-2.5 sm:h-3 w-1/2 bg-white/10 rounded-md" />
        </div>
      )}
    </div>
  );
};

export default MovieCardSkeleton;
