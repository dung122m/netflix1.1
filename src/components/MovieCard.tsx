"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { movieApi } from "@/services/movieApi";
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

  const [detailDescription, setDetailDescription] = useState<string>("");
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const [hasFetchedDescription, setHasFetchedDescription] = useState(false);

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
  const description = detailDescription || listDescription;

  const loadMovieDescription = async () => {
    if (hasFetchedDescription || isLoadingDescription || !m?.slug) return;
    setIsLoadingDescription(true);
    try {
      const data = await movieApi.getMovieDetail(m.slug);
      const raw = data?.movie?.content || data?.movie?.description || "";
      const cleaned = String(raw).replace(/<[^>]*>/g, "");
      if (cleaned) setDetailDescription(cleaned);
    } finally {
      setHasFetchedDescription(true);
      setIsLoadingDescription(false);
    }
  };

  const handleMouseMove: React.MouseEventHandler<HTMLElement> = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mx", `${x}%`);
    e.currentTarget.style.setProperty("--my", `${y}%`);
  };

  return (
    <article
      onMouseEnter={loadMovieDescription}
      onMouseMove={handleMouseMove}
      style={
        {
          "--mx": "50%",
          "--my": "50%",
        } as React.CSSProperties
      }
      // Tăng duration và cải thiện hiệu ứng hover cho cảm giác premium
      className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/5 bg-zinc-900/85 transition-all duration-500 ease-out hover:-translate-y-2 hover:border-white/20 hover:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]"
    >
      <Link
        href={`/movies/${m.slug}`}
        aria-label={`${isTrailerOnly ? "Xem trailer" : "Xem phim"} ${title}`}
        className="absolute inset-0 z-30"
      />

      <Image
        src={imgUrl}
        alt={title}
        fill
        quality={90}
        sizes="(max-width: 640px) 52vw, (max-width: 1024px) 34vw, (max-width: 1536px) 22vw, 18vw"
        className="object-cover transition-[filter,transform] duration-300 group-hover:brightness-[1.1] group-hover:scale-[1.02]"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.20), transparent 55%)",
        }}
      />

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
      <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110">
          {/* Tam giác play thuần CSS */}
          <div className="w-0 h-0 border-t-[7px] border-t-transparent border-l-[12px] border-l-black border-b-[7px] border-b-transparent ml-1"></div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 p-4 pointer-events-none">
        <h3 className="text-white font-bold text-sm md:text-base leading-snug line-clamp-2 drop-shadow">
          {title}
        </h3>
        <p className="mt-2 text-gray-200/95 text-xs line-clamp-3 opacity-0 max-h-0 overflow-hidden transition-all duration-300 group-hover:opacity-100 group-hover:max-h-24">
          {isLoadingDescription ? "Đang tải mô tả..." : description}
        </p>
      </div>
    </article>
  );
}

export const MovieCard = React.memo(MovieCardInner);
export default MovieCard;
