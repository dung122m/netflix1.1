"use client";

import React from "react";
import { MovieCardSkeleton } from "./MovieCardSkeleton";

export interface GridSkeletonProps {
  count?: number;
  columnsClassName?: string;
  aspect?: "poster" | "video" | "square";
  rounded?: "lg" | "xl" | "2xl" | "3xl";
  showInfo?: boolean;
  className?: string;
  containerClassName?: string;
}

/**
 * Lưới Skeleton hiển thị danh sách phim tải trang (Grid Skeleton)
 * Đồng bộ layout 100% với MovieGrid (2 cột mobile, 3 tablet, 4 laptop, 6 desktop)
 */
export const GridSkeleton: React.FC<GridSkeletonProps> = ({
  count = 24,
  columnsClassName = "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-5",
  aspect = "poster",
  rounded = "xl",
  showInfo = true,
  className = "",
  containerClassName = "",
}) => {
  return (
    <div className={`w-full overflow-hidden ${containerClassName}`}>
      <div className={`grid ${columnsClassName} ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <MovieCardSkeleton
            key={i}
            aspect={aspect}
            rounded={rounded}
            showInfo={showInfo}
          />
        ))}
      </div>
    </div>
  );
};

export default GridSkeleton;
