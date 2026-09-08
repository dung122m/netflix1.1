"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Star, Users } from "lucide-react";
import { normalizeMovie } from "@/lib/movieMedia";
import {
  clientSynopsisCache,
  clientExtraInfoCache,
  clientTrailerCache,
} from "./sites/netflix-3f78535a/browse-1234abcd/MediaCard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { m: any };

function MovieCardInner({ m }: Props) {
  const norm = normalizeMovie(m);
  const { title, year, quality, isTrailerOnly, description, imageUrl, slug } =
    norm;
  const rating = norm.score !== "N/A" ? norm.score : null;
  const [isHovered, setIsHovered] = useState(false);

  const [actors, setActors] = useState<string[]>(() => {
    if (slug && clientExtraInfoCache.has(slug)) {
      return clientExtraInfoCache.get(slug)?.actor || [];
    }
    return norm.actor || [];
  });

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
    }
    if (slug && clientExtraInfoCache.has(slug)) {
      const cachedInfo = clientExtraInfoCache.get(slug)!;
      if (cachedInfo.actor?.length) {
        setActors(cachedInfo.actor);
      }
    }

    if ((!synopsis || !actors.length) && slug) {
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
            if (data?.actor?.length) {
              setActors(data.actor);
              clientExtraInfoCache.set(slug, {
                actor: data.actor,
                director: data.director,
                origin_name: data.origin_name,
              });
            }
          })
          .catch(() => {
            if (description) setSynopsis(description);
          });
      }, 150);
    }
  };

  const handleHoverEnd = () => {
    setIsHovered(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const [isImgLoaded, setIsImgLoaded] = useState(false);

  return (
    <motion.article
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      animate={{ y: isHovered ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      className={`relative aspect-[2/3] overflow-hidden rounded-2xl border bg-zinc-900/85 transition-shadow duration-300 shadow-lg ${
        isHovered
          ? "border-white/40 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.95)]"
          : "border-white/10"
      }`}
    >
      <Link
        href={`/movies/${slug}`}
        aria-label={`${isTrailerOnly ? "Xem trailer" : "Xem phim"} ${title}`}
        className="absolute inset-0 z-30"
      />

      {/* Skeleton Shimmer trong khi tải ảnh */}
      {!isImgLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-850 to-zinc-950 animate-pulse z-0" />
      )}

      <motion.div
        className="absolute inset-0"
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className={`object-cover transition-all duration-500 ${
            isImgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-102"
          }`}
          decoding="async"
          loading="lazy"
          onLoad={() => setIsImgLoaded(true)}
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

      <div className="absolute left-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">
        <span className="text-netflix-red">{quality}</span>
        <span className="text-white/60">•</span>
        <span>{year}</span>
      </div>

      {rating && (
        <div className="absolute right-2.5 top-2.5 z-20 inline-flex items-center gap-1 rounded-lg border border-amber-300/40 bg-black/65 px-2 py-0.5 text-[11px] font-bold text-amber-300 backdrop-blur">
          <Star size={11} fill="currentColor" />
          {rating}
        </div>
      )}

      {/* NÚT PLAY KIỂU NETFLIX (NẰM CHÍNH GIỮA KHI HOVER) */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-2xl">
          <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-black border-b-[7px] border-b-transparent ml-1"></div>
        </div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-3 pointer-events-none space-y-1">
        <h3 className="text-white font-extrabold text-xs sm:text-sm leading-snug line-clamp-1 drop-shadow">
          {title}
        </h3>

        {actors.length > 0 && isHovered && (
          <div className="flex items-center gap-1 text-[10.5px] text-gray-300 animate-in fade-in duration-150">
            <Users size={11} className="text-rose-400 flex-none" />
            <span className="truncate">{actors.slice(0, 2).join(", ")}</span>
          </div>
        )}

        <p
          className={`overflow-hidden text-[10.5px] text-gray-300 transition-[max-height,opacity] duration-200 ease-out line-clamp-2 leading-relaxed ${
            isHovered ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
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
