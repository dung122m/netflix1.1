"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { User, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { TmdbCastMember } from "@/services/tmdbService";
import { ActorChipClient } from "@/components/ActorChipClient";

export interface MovieCastGalleryProps {
  cast?: TmdbCastMember[];
  fallbackActors?: string[];
}

export const MovieCastGallery: React.FC<MovieCastGalleryProps> = ({
  cast = [],
  fallbackActors = [],
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const handleActorClick = (name: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-actor-bio", {
          detail: { name },
        })
      );
    }
  };

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
    }
    window.addEventListener("resize", checkScroll);
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, cast]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  // FALLBACK: Nếu không có dữ liệu TMDB Cast, render dạng Chip như hiện tại
  if (!cast || cast.length === 0) {
    if (!fallbackActors || fallbackActors.length === 0) return null;

    return (
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-gray-400 font-medium min-w-[75px] flex-shrink-0 text-xs uppercase tracking-wider">
          Diễn viên:
        </span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {fallbackActors.slice(0, 10).map((a, idx) => (
            <ActorChipClient key={idx} name={a} isDirector={false} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 select-none">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Users className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-200">
            Diễn viên & Vai diễn
          </h3>
        </div>
        <span className="text-[11px] text-gray-400 font-medium">
          {cast.length} diễn viên
        </span>
      </div>

      {/* CAROUSEL WRAPPER */}
      <div className="relative group/gallery">
        {/* NÚT CUỘN TRÁI */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Cuộn sang trái"
            className="hidden sm:flex absolute left-0 top-0 bottom-4 z-20 w-9 bg-gradient-to-r from-black/90 via-black/60 to-transparent items-center justify-start pl-1 text-white hover:text-rose-400 transition cursor-pointer group/btn"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-900/90 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-lg group-hover/btn:scale-110 transition">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </button>
        )}

        {/* NÚT CUỘN PHẢI */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Cuộn sang phải"
            className="hidden sm:flex absolute right-0 top-0 bottom-4 z-20 w-9 bg-gradient-to-l from-black/90 via-black/60 to-transparent items-center justify-end pr-1 text-white hover:text-rose-400 transition cursor-pointer group/btn"
          >
            <div className="w-7 h-7 rounded-full bg-zinc-900/90 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-lg group-hover/btn:scale-110 transition">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        )}

        {/* MOBILE GRADIENT FADE AFFORDANCE */}
        {canScrollLeft && (
          <div
            className="sm:hidden absolute left-0 top-0 bottom-3 w-4 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />
        )}
        {canScrollRight && (
          <div
            className="sm:hidden absolute right-0 top-0 bottom-3 w-6 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />
        )}

        {/* DANH SÁCH THẺ DIỄN VIÊN */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 pb-2"
        >
          {cast.map((actor) => (
            <button
              key={actor.id}
              type="button"
              onClick={() => handleActorClick(actor.name)}
              onMouseEnter={() => {
                fetch(`/api/actor-bio?name=${encodeURIComponent(actor.name)}`).catch(() => {});
              }}
              title={`Xem hồ sơ & phim của ${actor.name}${actor.character ? ` (Vai: ${actor.character})` : ""}`}
              className="group/card flex-none w-[100px] sm:w-[115px] md:w-[125px] rounded-xl bg-zinc-900/70 hover:bg-zinc-800/90 border border-white/10 hover:border-rose-500/40 p-2 transition-all duration-200 hover:scale-[1.03] shadow-md cursor-pointer flex flex-col text-left"
            >
              {/* ẢNH AVATAR CHÂN DUNG 3:4 */}
              <div className="relative aspect-[3/4] w-full rounded-lg bg-zinc-950 overflow-hidden border border-white/5 flex items-center justify-center">
                {actor.profile_path ? (
                  <Image
                    src={actor.profile_path}
                    alt={actor.name}
                    fill
                    sizes="(max-width: 640px) 100px, 130px"
                    unoptimized
                    decoding="async"
                    loading="lazy"
                    className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 text-zinc-500">
                    <User className="w-7 h-7 sm:w-8 sm:h-8 mb-1 text-zinc-600" />
                    <span className="text-[9px] font-semibold text-zinc-500">No Image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
              </div>

              {/* TÊN DIỄN VIÊN & NHÂN VẬT */}
              <div className="mt-2 text-center min-w-0 flex-1 flex flex-col justify-between w-full">
                <h4 className="text-[11.5px] sm:text-xs font-bold text-white group-hover/card:text-rose-400 transition-colors line-clamp-1">
                  {actor.name}
                </h4>
                {actor.character && (
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 line-clamp-1 mt-0.5" title={actor.character}>
                    {actor.character}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieCastGallery;
