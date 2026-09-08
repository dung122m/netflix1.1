"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { normalizeMovie } from "@/lib/movieMedia";
import { clientSynopsisCache } from "./sites/netflix-3f78535a/browse-1234abcd/MediaCard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { m: any };

function MovieCardInner({ m }: Props) {
  const norm = normalizeMovie(m);
  const { title, year, quality, isTrailerOnly, description, imageUrl, slug } =
    norm;
  const rating = norm.score !== "N/A" ? norm.score : null;
  const [isHovered, setIsHovered] = useState(false);

  const [synopsis, setSynopsis] = useState<string>(() => {
    if (slug && clientSynopsisCache.has(slug)) {
      return clientSynopsisCache.get(slug)!;
    }
    if (
      description &&
      !description.startsWith("Tên gốc:") &&
      !description.startsWith("Thể loại:") &&
      !description.includes("Nội dung phim đang được cập nhật")
    ) {
      return description;
    }
    return "";
  });

  const hoverTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleHoverStart = () => {
    setIsHovered(true);

    if (slug && clientSynopsisCache.has(slug)) {
      const cached = clientSynopsisCache.get(slug)!;
      if (cached && cached !== synopsis) {
        setSynopsis(cached);
      }
      return;
    }

    if (!synopsis && slug) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        fetch(`/api/synopsis?slug=${encodeURIComponent(slug)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.content) {
              clientSynopsisCache.set(slug, data.content);
              setSynopsis(data.content);
            } else if (description) {
              setSynopsis(description);
            }
          })
          .catch(() => {
            if (description) setSynopsis(description);
          });
      }, 220);
    }
  };

  const handleHoverEnd = () => {
    setIsHovered(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  return (
    <motion.article
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      animate={{ y: isHovered ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      className={`relative aspect-[2/3] overflow-hidden rounded-xl border bg-zinc-900/85 transition-shadow duration-300 ${
        isHovered
          ? "border-white/30 shadow-[0_18px_38px_-16px_rgba(0,0,0,0.9)]"
          : "border-white/5"
      }`}
    >
      <Link
        href={`/movies/${slug}`}
        aria-label={`${isTrailerOnly ? "Xem trailer" : "Xem phim"} ${title}`}
        className="absolute inset-0 z-30"
      />

      <motion.div
        className="absolute inset-0"
        animate={{ scale: isHovered ? 1.035 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      >
        <Image
          src={imageUrl}
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

      {/* NÚT PLAY KIỂU NETFLIX (NẰM CHÍNH GIỮA KHI HOVER) */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
          <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-black border-b-[7px] border-b-transparent ml-1"></div>
        </div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-3.5 pointer-events-none">
        <h3 className="text-white font-bold text-xs sm:text-sm md:text-base leading-snug line-clamp-1 drop-shadow">
          {title}
        </h3>
        <p
          className={`mt-1.5 overflow-hidden text-[11px] text-gray-200 transition-[max-height,opacity] duration-200 ease-out line-clamp-3 leading-relaxed ${
            isHovered ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {synopsis || description}
        </p>
      </div>
    </motion.article>
  );
}

export const MovieCard = React.memo(MovieCardInner);
export default MovieCard;
