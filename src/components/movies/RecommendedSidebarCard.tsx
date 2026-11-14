"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  pickBestMovieThumb,
  toOptimizedPhimimgUrl,
  toFastCdnImageUrl,
} from "@/lib/movieMedia";
import { RecommendedMovieItem } from "./RecommendedMovieCard";

export interface RecommendedSidebarCardProps {
  item: RecommendedMovieItem;
  index?: number;
  matchPercent?: number;
  displayCategory?: string;
}

/**
 * Thẻ phim đề xuất phong cách YouTube Watch Sidebar (Horizontal layout: Thumb bên trái, Text bên phải)
 */
export const RecommendedSidebarCard = React.memo(function RecommendedSidebarCard({
  item,
  index = 0,
  displayCategory,
}: RecommendedSidebarCardProps) {
  const isLcpCandidate = index === 0;
  const rawThumb = pickBestMovieThumb(item, "/default-hero.jpg");
  const thumbUrl = toFastCdnImageUrl(toOptimizedPhimimgUrl(rawThumb, 240));
  const title = item.name || item.title || "Phim";
  const categoryName = displayCategory || item.category?.[0]?.name;
  const year = item.year;
  const time = item.time;
  const quality = item.quality || "HD";

  return (
    <Link
      href={`/movies/${item.slug}`}
      prefetch={false}
      tabIndex={0}
      aria-label={title}
      className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.07] transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer w-full max-w-full min-w-0"
    >
      {/* 1. THUMBNAIL (16:9) */}
      <div className="relative aspect-video w-[115px] sm:w-[130px] rounded-lg overflow-hidden bg-zinc-800 shrink-0 shadow-sm">
        <Image
          src={thumbUrl}
          alt={title}
          fill
          unoptimized
          sizes="140px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          decoding="async"
          loading={isLcpCandidate ? "eager" : "lazy"}
          priority={isLcpCandidate}
          fetchPriority={isLcpCandidate ? "high" : "auto"}
          quality={80}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (target && !target.src.includes("/default-hero.jpg")) {
              target.srcset = "";
              target.src = "/default-hero.jpg";
            }
          }}
        />
        {quality && (
          <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[9px] font-bold bg-black/80 text-zinc-300 backdrop-blur-sm pointer-events-none">
            {quality}
          </span>
        )}
      </div>

      {/* 2. THÔNG TIN PHIM */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="text-white text-xs sm:text-[13px] font-bold line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1 font-sans tabular-nums">
          {year && <span>{year}</span>}
          {time && <span className="text-zinc-500 truncate">• {time}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {categoryName && (
            <span className="text-[11px] font-medium text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded truncate max-w-[90px]">
              {categoryName}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});

export default RecommendedSidebarCard;
