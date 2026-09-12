"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Star, Users, Play } from "lucide-react";
import { normalizeMovie } from "@/lib/movieMedia";
import {
  clientSynopsisCache,
  clientExtraInfoCache,
} from "./sites/netflix-3f78535a/browse-1234abcd/MediaCard";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = { m: any; priority?: boolean };

function MovieCardInner({ m, priority = false }: Props) {
  const norm = normalizeMovie(m);
  const {
    title,
    year,
    quality,
    isTrailerOnly,
    description,
    posterUrl,
    imageUrl,
    slug,
    time,
    lang,
    chieurap,
    sub_docquyen,
    type_name,
  } = norm;
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

  const candidateImages = React.useMemo(() => {
    const list: string[] = [];
    if (posterUrl) list.push(posterUrl);
    if (imageUrl && !list.includes(imageUrl)) list.push(imageUrl);
    if (norm.thumbUrl && !list.includes(norm.thumbUrl)) list.push(norm.thumbUrl);
    return list.filter(
      (u) =>
        Boolean(u) &&
        !u.includes("/undefined") &&
        !u.includes("/null") &&
        !u.startsWith("/default-")
    );
  }, [posterUrl, imageUrl, norm.thumbUrl]);

  const [imageAttemptIndex, setImageAttemptIndex] = useState(0);
  const [currentImgSrc, setCurrentImgSrc] = useState(
    candidateImages[0] || posterUrl || imageUrl || "/default-poster.svg"
  );

  React.useEffect(() => {
    setImageAttemptIndex(0);
    setCurrentImgSrc(candidateImages[0] || posterUrl || imageUrl || "/default-poster.svg");
  }, [posterUrl, imageUrl, candidateImages]);

  const handleImageError = () => {
    if (currentImgSrc.includes("image.tmdb.org")) {
      const match = currentImgSrc.match(/\/w500\/([a-zA-Z0-9_-]{20,}\.(?:jpg|jpeg|png|webp))/i);
      if (match) {
        setCurrentImgSrc(`https://vsmov.com/storage/images/${match[1]}`);
        return;
      }
    }

    const nextIdx = imageAttemptIndex + 1;
    if (nextIdx < candidateImages.length) {
      setImageAttemptIndex(nextIdx);
      setCurrentImgSrc(candidateImages[nextIdx]);
      return;
    }

    if (currentImgSrc !== "/default-poster.svg") {
      setCurrentImgSrc("/default-poster.svg");
      setIsImgLoaded(true);
    }
  };

  return (
    <motion.article
      onHoverStart={handleHoverStart}
      onHoverEnd={handleHoverEnd}
      animate={{ y: isHovered ? -6 : 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      className={`group relative aspect-[2/3] overflow-hidden rounded-2xl border bg-zinc-900/85 transition-shadow duration-300 shadow-lg ${
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

      {/* Shimmer tĩnh mượt mà trong khi tải ảnh */}
      {!isImgLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 z-0" />
      )}

      <motion.div
        className="absolute inset-0"
        animate={{ scale: isHovered ? 1.05 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.65 }}
      >
        <Image
          src={currentImgSrc}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className={`object-cover object-center transition-all duration-500 ${
            isImgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-102"
          }`}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsImgLoaded(true)}
          onError={handleImageError}
        />
      </motion.div>

      {/* Lớp phủ chuyển màu gradient từ dưới lên */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

      {/* 1. GÓC TRÊN TRÁI: DÀNH CHO LOẠI PHIM (PHIM RẠP, ĐỘC QUYỀN, BỘ, LẺ) */}
      <div className="absolute left-2 top-2 z-20 flex items-center gap-1 flex-wrap max-w-[70%]">
        {chieurap ? (
          <div className="flex items-center gap-0.5 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md border border-amber-400/40">
            <span>🎬 Rạp</span>
          </div>
        ) : sub_docquyen ? (
          <div className="flex items-center gap-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md border border-purple-400/40">
            <span>💎 Độc Quyền</span>
          </div>
        ) : type_name === "Phim bộ" ? (
          <div className="flex items-center gap-0.5 bg-blue-600/90 text-white font-black px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md border border-blue-400/40">
            <span>📺 Bộ</span>
          </div>
        ) : type_name === "Hoạt hình" ? (
          <div className="flex items-center gap-0.5 bg-pink-600/90 text-white font-black px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md border border-pink-400/40">
            <span>✨ Hoạt Hình</span>
          </div>
        ) : type_name === "TV Shows" ? (
          <div className="flex items-center gap-0.5 bg-emerald-600/90 text-white font-black px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider backdrop-blur-md shadow-md border border-emerald-400/40">
            <span>🎙️ Show</span>
          </div>
        ) : null}
      </div>

      {/* 2. GÓC TRÊN PHẢI: ĐIỂM SAO VÀNG & CHẤT LƯỢNG (HD/FHD) */}
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1">
        {rating && Number(rating) > 0 && (
          <div className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-black/75 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-300 backdrop-blur-md shadow-sm">
            <Star size={10} fill="currentColor" />
            <span>{rating}</span>
          </div>
        )}
        <div className="inline-flex items-center rounded-md border border-white/20 bg-black/60 px-1.5 py-0.5 text-[9.5px] font-bold text-white backdrop-blur-md">
          <span>{quality || "FHD"}</span>
        </div>
      </div>

      {/* 3. NÚT PLAY KIỂU NETFLIX (NẰM CHÍNH GIỮA KHI HOVER) */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-2xl">
          <Play size={18} className="fill-black ml-0.5" />
        </div>
      </motion.div>

      {/* 4. CHÂN POSTER: TIÊU ĐỀ & THÔNG SỐ (NĂM, THỜI LƯỢNG, TIẾNG) */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-3 pointer-events-none space-y-1">
        <h3 className="text-white font-black text-xs sm:text-[13px] leading-snug line-clamp-1 drop-shadow-md">
          {title}
        </h3>

        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-gray-300 flex-wrap">
          {year && <span>{year}</span>}
          {time && (
            <>
              {year && <span className="text-white/30">•</span>}
              <span className="truncate max-w-[85px]">{time}</span>
            </>
          )}
          {lang && (
            <>
              {(year || time) && <span className="text-white/30">•</span>}
              <span className="text-rose-400 font-bold">{lang}</span>
            </>
          )}
        </div>

        {actors.length > 0 && isHovered && (
          <div className="flex items-center gap-1 text-[10px] text-gray-300 animate-in fade-in duration-150">
            <Users size={10} className="text-rose-400 flex-none" />
            <span className="truncate">{actors.slice(0, 2).join(", ")}</span>
          </div>
        )}

        <p
          className={`overflow-hidden text-[10px] text-gray-300 transition-[max-height,opacity] duration-200 ease-out line-clamp-2 leading-relaxed ${
            isHovered ? "max-h-12 opacity-100" : "max-h-0 opacity-0"
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

