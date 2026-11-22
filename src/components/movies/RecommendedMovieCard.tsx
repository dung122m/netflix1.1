"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { pickBestMovieThumb } from "@/lib/movieMedia";
import { MoviePosterImage } from "@/components/ui/MoviePosterImage";

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
  poster_url?: string;
  posterUrl?: string;
  thumb_url?: string;
  thumbUrl?: string;
  type?: string;
  tmdbId?: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RecommendedMovieCardProps {
  item: RecommendedMovieItem;
  displayCategory?: string;
  matchPercent?: number;
  variant?: "grid" | "sidebar";
  index?: number;
}

/**
 * Thẻ phim đề xuất:
 * - variant="grid" (default): Phong cách Tiếp tục xem (Aspect-Video 16:9, thoáng đãng, card dọc).
 * - variant="sidebar": Phong cách YouTube Watch Sidebar (Horizontal layout: Thumb bên trái, Text bên phải).
 */
export const RecommendedMovieCard = React.memo(function RecommendedMovieCard({
  item,
  displayCategory,
  variant = "grid",
  index = 0,
}: RecommendedMovieCardProps) {
  const isSidebar = variant === "sidebar";
  const rawThumb = pickBestMovieThumb(item, isSidebar ? "" : "/default-hero.jpg");
  const rawPoster = item.poster_url || item.posterUrl || "";
  const initialThumb = rawThumb || rawPoster || "/default-hero.jpg";

  const title = item.name || item.title || "Phim";
  const categoryName = displayCategory || item.category?.[0]?.name;
  const year = item.year;
  const time = item.time;
  const quality = item.quality || (isSidebar ? "HD" : "FHD");

  // Layout 1: Horizontal Sidebar (YouTube Watch style)
  if (isSidebar) {
    const isLcpCandidate = index === 0;

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
          <MoviePosterImage
            src={initialThumb}
            alt={title}
            title={title}
            origin_name={item.origin_name}
            slug={item.slug}
            year={year}
            type={item.type}
            tmdbId={item.tmdbId}
            preferBackdrop={true}
            fallbackSrc="/default-hero.jpg"
            fill
            unoptimized
            sizes="140px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            decoding="async"
            loading={isLcpCandidate ? "eager" : "lazy"}
            priority={isLcpCandidate}
            quality={80}
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
  }

  // Layout 2: Vertical Grid (Next-watch grid style)
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
          <MoviePosterImage
            src={initialThumb}
            alt={title}
            title={title}
            origin_name={item.origin_name}
            slug={item.slug}
            year={year}
            type={item.type}
            tmdbId={item.tmdbId}
            preferBackdrop={true}
            fallbackSrc="/default-hero.jpg"
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            decoding="async"
            loading="lazy"
            quality={85}
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
