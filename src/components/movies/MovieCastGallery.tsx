"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";
import { useCarouselScroll } from "@/components/ui/useCarouselScroll";
import { TmdbCastMember } from "@/services/tmdbService";
import { ActorAvatar } from "@/components/actors/ActorAvatar";
import { FavoriteActorButton } from "@/components/actors/FavoriteActorButton";
import { normalizeForMatch } from "@/lib/stringUtils";
import { toVietnameseTitleCase } from "@/services/actor/actorAliasResolver";

export interface MovieCastGalleryProps {
  cast?: TmdbCastMember[];
  fallbackActors?: string[];
}

interface ProcessedCastItem {
  id: string | number;
  name: string;
  character?: string;
  avatarUrl?: string | null;
  href: string;
  slug: string;
}

function toActorSlug(name: string): string {
  const norm = normalizeForMatch(name).replace(/\s+/g, "-");
  return norm ? encodeURIComponent(norm) : "";
}

export const MovieCastGallery: React.FC<MovieCastGalleryProps> = ({
  cast = [],
  fallbackActors = [],
}) => {
  

  // Chuẩn hóa danh sách diễn viên hiển thị: ưu tiên cast TMDB (có ID), nếu không có thì dùng fallbackActors (chỉ có tên)
  const displayItems = useMemo<ProcessedCastItem[]>(() => {
    if (cast && cast.length > 0) {
      return cast.map((c) => {
        const slug = toActorSlug(c.name);
        const href =
          typeof c.id === "number"
            ? slug
              ? `/dien-vien/${c.id}-${slug}`
              : `/dien-vien/${c.id}`
            : `/dien-vien/${slug || "nghe-si"}`;
        return {
          id: c.id,
          name: toVietnameseTitleCase(c.name),
          character: c.character || undefined,
          avatarUrl: c.profile_path || null,
          href,
          slug: typeof c.id === "number" ? (slug ? `${c.id}-${slug}` : `${c.id}`) : slug || "nghe-si",
        };
      });
    }

    if (fallbackActors && fallbackActors.length > 0) {
      return fallbackActors
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 16)
        .map((name, idx) => {
          const slug = toActorSlug(name);
          return {
            id: `fb-${idx}-${name}`,
            name: toVietnameseTitleCase(name),
            avatarUrl: null,
            href: `/dien-vien/${slug || "nghe-si"}`,
            slug: slug || "nghe-si",
          };
        });
    }

    return [];
  }, [cast, fallbackActors]);

  const {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    handleScroll,
  } = useCarouselScroll<HTMLDivElement>({
    resetTrigger: displayItems,
    watchTrigger: displayItems,
    cardSelector: ".snap-start",
    boundaryThreshold: 5,
  });

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 select-none">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-rose-500/10 text-rose-400">
            <Users className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-bold text-zinc-100">
            Diễn viên & Vai diễn
          </h3>
        </div>
        <span className="text-[11px] text-zinc-400 font-medium">
          {displayItems.length} diễn viên
        </span>
      </div>

      {/* CAROUSEL WRAPPER */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI / PHẢI CHUẨN ĐỒNG BỘ */}
        <CarouselNavButton
          direction="left"
          onClick={() => handleScroll("left")}
          visible={canScrollLeft}
          ariaLabel="Cuộn danh sách diễn viên sang trái"
          topOffsetClass="top-[45%]"
        />

        <CarouselNavButton
          direction="right"
          onClick={() => handleScroll("right")}
          visible={canScrollRight}
          ariaLabel="Cuộn danh sách diễn viên sang phải"
          topOffsetClass="top-[45%]"
        />

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
          onScroll={checkScroll}
          className="flex gap-2.5 sm:gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 pb-2 snap-x snap-mandatory md:snap-proximity px-0.5 scroll-pl-0.5 scroll-smooth"
        >
          {displayItems.map((actor) => (
            <Link
              key={actor.id}
              href={actor.href}
              prefetch={false}
              aria-label={`Xem hồ sơ & phim của ${actor.name}${actor.character ? ` (Vai: ${actor.character})` : ""}`}
              className="group/card flex-none w-[100px] sm:w-[112px] md:w-[120px] transition-all duration-200 cursor-pointer flex flex-col text-left snap-start select-none"
            >
              {/* ẢNH AVATAR CHÂN DUNG 3:4 VỚI FALLBACK CAO CẤP */}
              <div className="relative aspect-[3/4] w-full rounded-xl bg-zinc-900 overflow-hidden group-hover/card:shadow-md flex items-center justify-center group-hover/card:scale-[1.03] transition-transform duration-200">
                <ActorAvatar
                  name={actor.name}
                  avatarUrl={actor.avatarUrl}
                  shape="card"
                  imageClassName="group-hover/card:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 105px, 130px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none" />

                {/* QUICK FAVORITE BUTTON: CHỈ HIỆN KHI HOVER, GIỮ KHUNG HÌNH TĨNH LUÔN SẠCH ĐẸP */}
                <div className="absolute top-1.5 right-1.5 z-10 pointer-events-auto">
                  <FavoriteActorButton
                    id={actor.id}
                    name={actor.name}
                    slug={actor.slug}
                    avatarUrl={actor.avatarUrl}
                    variant="icon"
                    className="w-7 h-7 p-0 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
                  />
                </div>
              </div>

              {/* TÊN DIỄN VIÊN & NHÂN VẬT */}
              <div className="mt-2 text-center min-w-0 flex-1 flex flex-col justify-between w-full px-0.5">
                <h4 className="text-[11.5px] sm:text-xs font-bold text-white group-hover/card:text-zinc-200 transition-colors line-clamp-1">
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieCastGallery;
