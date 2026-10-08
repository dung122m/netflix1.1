"use client";

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { TmdbCastMember } from "@/services/tmdbService";
import { ActorAvatar } from "@/components/actors/ActorAvatar";
import { findCatalogActor } from "@/data/actorsCatalog";

export interface MovieCastGalleryProps {
  cast?: TmdbCastMember[];
  fallbackActors?: string[];
}

interface ProcessedCastItem {
  id: string | number;
  name: string;
  character?: string;
  avatarUrl?: string | null;
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

  // Chuẩn hóa danh sách diễn viên hiển thị: ưu tiên cast TMDB, nếu không có thì dùng fallbackActors
  const displayItems = useMemo<ProcessedCastItem[]>(() => {
    if (cast && cast.length > 0) {
      return cast.map((c) => {
        // Nếu TMDB không có profile_path, tra cứu thử trong danh mục actorsCatalog của hệ thống
        const catalogAvatar = !c.profile_path ? findCatalogActor(c.name)?.avatarUrl : undefined;
        return {
          id: c.id,
          name: c.name,
          character: c.character || undefined,
          avatarUrl: c.profile_path || catalogAvatar || null,
        };
      });
    }

    if (fallbackActors && fallbackActors.length > 0) {
      return fallbackActors
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 16)
        .map((name, idx) => {
          const catalogItem = findCatalogActor(name);
          return {
            id: `fb-${idx}-${name}`,
            name,
            character: catalogItem?.roles ? catalogItem.roles.split("•")[0]?.trim() : undefined,
            avatarUrl: catalogItem?.avatarUrl || null,
          };
        });
    }

    return [];
  }, [cast, fallbackActors]);

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
  }, [checkScroll, displayItems]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.75;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  if (displayItems.length === 0) {
    return null;
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
          {displayItems.length} diễn viên
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
          {displayItems.map((actor) => (
            <button
              key={actor.id}
              type="button"
              onClick={() => handleActorClick(actor.name)}
              onMouseEnter={() => {
                fetch(`/api/actor-bio?name=${encodeURIComponent(actor.name)}`).catch(() => {});
              }}
              title={`Xem hồ sơ & phim của ${actor.name}${actor.character ? ` (Vai: ${actor.character})` : ""}`}
              className="group/card flex-none w-[105px] sm:w-[115px] md:w-[125px] rounded-xl bg-zinc-900/70 hover:bg-zinc-800/90 border border-white/10 hover:border-rose-500/40 p-2 transition-all duration-200 hover:scale-[1.03] shadow-md cursor-pointer flex flex-col text-left"
            >
              {/* ẢNH AVATAR CHÂN DUNG 3:4 VỚI FALLBACK CAO CẤP */}
              <div className="relative aspect-[3/4] w-full rounded-lg bg-zinc-950 overflow-hidden border border-white/5 flex items-center justify-center">
                <ActorAvatar
                  name={actor.name}
                  avatarUrl={actor.avatarUrl}
                  shape="card"
                  imageClassName="group-hover/card:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 105px, 130px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />
              </div>

              {/* TÊN DIỄN VIÊN & NHÂN VẬT */}
              <div className="mt-2 text-center min-w-0 flex-1 flex flex-col justify-between w-full">
                <h4 className="text-[11.5px] sm:text-xs font-bold text-white group-hover/card:text-rose-400 transition-colors line-clamp-1">
                  {actor.name}
                </h4>
                {actor.character ? (
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 line-clamp-1 mt-0.5" title={actor.character}>
                    {actor.character}
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                    Diễn viên
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
