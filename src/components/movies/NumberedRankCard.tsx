"use client";

import React from "react";
import Link from "next/link";
import { pickBestMoviePoster } from "@/lib/movieMedia";
import { MoviePosterImage } from "@/components/ui/MoviePosterImage";
import { MOVIE_CARD_TOKENS } from "@/lib/cardDimensions";

export interface NumberedRankCardProps {
  rank: number;
  slug: string;
  title: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: string | number;
  quality?: string;
  secondaryTag?: string;
  priority?: boolean;
  theme?: "red" | "amber";
  type?: string;
  tmdbId?: string | number;
}

export const NumberedRankCard: React.FC<NumberedRankCardProps> = ({
  rank,
  slug,
  title,
  origin_name,
  poster_url,
  thumb_url,
  year,
  quality,
  secondaryTag,
  priority = false,
  theme: _theme = "red",
  type,
  tmdbId,
}) => {
  const initialPoster = React.useMemo(() => {
    const best = pickBestMoviePoster(
      {
        poster_url,
        thumb_url,
        name: title,
        origin_name,
        slug,
      },
      ""
    );
    if (best && !best.includes("/api/img-thumb") && !best.includes("/default-")) {
      return best;
    }
    return "";
  }, [poster_url, thumb_url, title, origin_name, slug]);

  const ringClasses =
    "group-hover:ring-2 group-hover:ring-netflix-red group-hover:ring-inset group-hover:shadow-[0_14px_32px_rgba(0,0,0,0.85)] focus-visible:ring-netflix-red";

  const titleHoverColor = "group-hover:text-netflix-red";

  // Badges: chỉ giữ CAM hoặc 4K
  const specialBadge = React.useMemo(() => {
    const q = quality?.toUpperCase() || "";
    const isCam = q.includes("CAM");
    const is4k = q.includes("4K") || q.includes("UHD");
    if (!isCam && !is4k) return null;
    return isCam ? "CAM" : "4K";
  }, [quality]);

  return (
    <div className="flex-none relative snap-start group select-none [content-visibility:auto] [contain-intrinsic-size:auto_260px]">
      <Link
        href={`/movies/${slug}`}
        prefetch={false}
        className="flex items-start relative block cursor-pointer group-hover:scale-[1.025] group-hover:-translate-y-1 transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 rounded-xl"
      >
        {/* SỐ THỨ TỰ BẢNG XẾP HẠNG (RANK) */}
        <div
          aria-hidden="true"
          className={`flex items-end ${
            rank >= 10
              ? MOVIE_CARD_TOKENS.ranked.numberColDouble
              : MOVIE_CARD_TOKENS.ranked.numberCol
          } relative z-0 pointer-events-none select-none shrink-0 overflow-visible`}
        >
          {rank >= 10 ? (
            <span
              className="font-black leading-none text-transparent select-none text-[72px] sm:text-[98px] md:text-[116px] inline-flex items-baseline"
              style={{
                WebkitTextStroke: "2px rgba(255, 255, 255, 0.28)",
              }}
            >
              <span className="shrink-0">{String(rank)[0]}</span>
              <span className="shrink-0 -ml-1 sm:-ml-1.5 md:-ml-2">{String(rank)[1]}</span>
            </span>
          ) : (
            <span
              className="font-black leading-none text-transparent select-none text-[90px] sm:text-[125px] md:text-[145px] tracking-tighter"
              style={{
                WebkitTextStroke:
                  rank === 1
                    ? "3px var(--accent-color, #e50914)"
                    : rank === 2
                      ? "3px #d4d4d8"
                      : rank === 3
                        ? "3px #a1a1aa"
                        : "2px rgba(255, 255, 255, 0.24)",
              }}
            >
              {rank}
            </span>
          )}
        </div>

        {/* CỘT POSTER + METADATA */}
        <div className={`relative z-10 ${MOVIE_CARD_TOKENS.ranked.posterWidth} flex flex-col shrink-0 min-w-0`}>
          {/* POSTER CONTAINER */}
          <div
            className={`relative w-full aspect-[2/3] ${MOVIE_CARD_TOKENS.ranked.radius} overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 transition-all duration-300 ${ringClasses}`}
          >
            <MoviePosterImage
              src={initialPoster || "/default-poster.jpg"}
              alt={title}
              title={title}
              origin_name={origin_name}
              slug={slug}
              year={year}
              type={type}
              tmdbId={tmdbId}
              fill
              unoptimized
              priority={priority}
              decoding="async"
              sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 240px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              loading={priority ? "eager" : "lazy"}
              quality={85}
            />

            {/* BADGE ĐẶC BIỆT (CAM / 4K) */}
            {specialBadge && (
              <div className="absolute top-2 right-2 pointer-events-none z-10">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    specialBadge === "CAM"
                      ? "bg-amber-950/90 text-amber-300"
                      : "bg-black/85 text-zinc-100"
                  }`}
                >
                  {specialBadge}
                </span>
              </div>
            )}
          </div>

          {/* THÔNG TIN PHIM DƯỚI POSTER */}
          <div className="pt-2 sm:pt-2.5 min-w-0 flex flex-col">
            <h3
              title={title}
              className={`text-white text-xs sm:text-[13px] font-semibold truncate ${titleHoverColor} transition-colors`}
            >
              {title}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400 mt-1 font-medium min-w-0">
              <span className="shrink-0">{year || "Mới"}</span>
              {secondaryTag && <span className="text-zinc-600 shrink-0">•</span>}
              {secondaryTag && (
                <span className="text-zinc-400 truncate min-w-0">{secondaryTag}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default NumberedRankCard;
