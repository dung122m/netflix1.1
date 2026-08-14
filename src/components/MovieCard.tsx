"use client";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import {
  buildMovieDescriptionFallback,
  pickBestMovieImage,
} from "@/lib/movieMedia";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { m: any };

function MovieCardInner({ m }: Props) {
  const imgUrl = pickBestMovieImage(m, "/default-poster.jpg");
  const title = m.name || m.title || "Phim";
  const year = m.year ? String(m.year) : "N/A";
  const quality = m.quality || "HD";
  const isTrailerOnly =
    m.status === "trailer" || m.episode_current === "Trailer";
  const ratingRaw =
    m?.imdb?.rating ?? m?.tmdb?.vote_average ?? m?.vote_average ?? m?.rating;
  const rating =
    ratingRaw !== undefined && ratingRaw !== null && ratingRaw !== ""
      ? Number(ratingRaw).toFixed(1)
      : null;


  const listDescription = useMemo(() => {
    const cleaned = String(m.content || m.description || "").replace(
      /<[^>]*>/g,
      "",
    );
    if (cleaned) return cleaned;
    return (
      buildMovieDescriptionFallback({
        origin_name: m.origin_name,
        year: m.year,
        time: m.time,
        lang: m.lang,
        quality: m.quality,
        category: m.category,
        country: m.country,
        director: m.director,
      }) || "Đang cập nhật mô tả phim."
    );
  }, [
    m.content,
    m.description,
    m.origin_name,
    m.year,
    m.time,
    m.lang,
    m.quality,
    m.category,
    m.country,
    m.director,
  ]);
  const description = listDescription;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.article
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{ y: isHovered ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      // Tăng duration và cải thiện hiệu ứng hover cho cảm giác premium
      className={`relative aspect-[2/3] overflow-hidden rounded-xl border bg-zinc-900/85 ${
        isHovered
          ? "border-white/30 shadow-[0_18px_38px_-16px_rgba(0,0,0,0.9)]"
          : "border-white/5"
      }`}
    >
      <Link
        href={`/movies/${m.slug}`}
        aria-label={`${isTrailerOnly ? "Xem trailer" : "Xem phim"} ${title}`}
        className="absolute inset-0 z-30"
      />

      <motion.div
        className="absolute inset-0"
        animate={{ scale: isHovered ? 1.035 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      >
        <Image
          src={imgUrl}
          alt={title}
          fill
          quality={90}
          sizes="(max-width: 640px) 52vw, (max-width: 1024px) 34vw, (max-width: 1536px) 22vw, 18vw"
          className="object-cover"
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

      <div className="absolute left-3 top-3 z-20 inline-flex items-center gap-2 rounded-md border border-white/25 bg-black/55 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
        <span className="text-netflix-red">{quality}</span>
        <span className="text-white/70">•</span>
        <span>{year}</span>
      </div>

      {isTrailerOnly && (
        <div className="absolute left-3 top-11 z-20 rounded-md border border-netflix-red/50 bg-netflix-red/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          Trailer
        </div>
      )}

      {rating && (
        <div className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-md border border-amber-300/40 bg-black/55 px-2 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur">
          <Star size={12} fill="currentColor" />
          {rating}
        </div>
      )}

      {/* =========================================
          NÚT PLAY KIỂU NETFLIX (NẰM CHÍNH GIỮA KHI HOVER)
      ========================================= */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
          {/* Tam giác play thuần CSS */}
          <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-black border-b-[7px] border-b-transparent ml-1"></div>
        </div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-4 pointer-events-none">
        <h3 className="text-white font-bold text-sm md:text-base leading-snug line-clamp-2 drop-shadow">
          {title}
        </h3>
        <p
          className={`mt-2 overflow-hidden text-xs text-gray-200/95 transition-[max-height,opacity] duration-200 ease-out line-clamp-3 ${
            isHovered ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {description}
        </p>
      </div>
    </motion.article>
  );
}

export const MovieCard = React.memo(MovieCardInner);
export default MovieCard;
