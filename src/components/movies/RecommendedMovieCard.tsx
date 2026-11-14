"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import {
  pickBestMovieThumb,
  toOptimizedPhimimgUrl,
  toFastCdnImageUrl,
} from "@/lib/movieMedia";

export interface RecommendedMovieItem {
  slug: string;
  name?: string;
  title?: string;
  origin_name?: string;
  year?: number | string;
  quality?: string;
  time?: string;
  score?: number | string;
  matchPercent?: number;
  recScore?: number;
  category?: Array<{ name: string; slug?: string }>;
  country?: Array<{ name: string; slug?: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RecommendedMovieCardProps {
  item: RecommendedMovieItem;
  displayCategory?: string;
  matchPercent?: number;
}

/**
 * Thẻ phim đề xuất phong cách Tiếp tục xem (Aspect-Video 16:9, thoáng đãng, không bị đè chữ lên hình)
 */
export const RecommendedMovieCard = React.memo(function RecommendedMovieCard({
  item,
  displayCategory,
}: RecommendedMovieCardProps) {
  const rawThumb = pickBestMovieThumb(item, "/default-hero.jpg");
  const thumbUrl = toFastCdnImageUrl(toOptimizedPhimimgUrl(rawThumb, 320));
  const title = item.name || item.title || "Phim";
  const categoryName = displayCategory || item.category?.[0]?.name;
  const year = item.year;
  const time = item.time;
  const quality = item.quality || "FHD";

  return (
    <div className="group relative bg-zinc-900 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-2xl flex flex-col">
      <Link
        href={`/movies/${item.slug}`}
        prefetch={false}
        tabIndex={0}
        className="h-full flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:scale-[1.03] transition-transform rounded-2xl"
      >
        {/* 1. ẢNH THUMBNAIL (aspect-video 16:9 chuẩn) */}
        <div className="relative aspect-video w-full bg-zinc-900 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 overflow-hidden">
          <Image
            src={thumbUrl}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            decoding="async"
            loading="lazy"
            quality={85}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target && !target.src.includes("/default-hero.jpg")) {
                target.srcset = "";
                target.src = "/default-hero.jpg";
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Badge Chất lượng góc trên bên phải */}
          {quality && (
            <div className="absolute top-2 right-2 z-10 pointer-events-none">
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold backdrop-blur-md ${
                  quality.toUpperCase().includes("CAM")
                    ? "bg-netflix-red/85 text-white shadow-sm"
                    : "bg-black/75 text-zinc-300"
                }`}
              >
                {quality}
              </span>
            </div>
          )}

          {/* Nút Play trung tâm khi hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-black/80 transform group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* 2. THÔNG TIN PHIM BÊN DƯỚI (Ngăn nắp, thoáng đãng) */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between min-w-0">
          <h4
            title={title}
            className="text-white text-xs sm:text-sm font-semibold line-clamp-2 sm:line-clamp-1 min-h-[32px] sm:min-h-0 group-hover:text-red-500 transition-colors leading-snug"
          >
            {title}
          </h4>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 mt-2 gap-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 font-sans tabular-nums">
              {year && <span className="shrink-0">{year}</span>}
              {time && <span className="text-zinc-500 truncate min-w-0">• {time}</span>}
            </div>
            {categoryName && (
              <span className="text-[11px] font-medium text-zinc-400 bg-white/5 px-2 py-0.5 rounded truncate max-w-[85px] sm:max-w-[110px] shrink-0">
                {categoryName}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
});

export default RecommendedMovieCard;
