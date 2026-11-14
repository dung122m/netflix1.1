"use client";

import React from "react";
import Link from "next/link";
import { Users, Trash2, Film, ArrowRight } from "lucide-react";
import { FavoriteActorItem } from "@/lib/favoriteActors";
import { ActorAvatar } from "@/components/actors/ActorAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Tooltip";
import { cleanCountryName } from "@/lib/stringUtils";
import { getActorSynonyms } from "@/services/actor/actorAliasResolver";

interface MyListActorsTabProps {
  actors: FavoriteActorItem[];
  onRemove: (e: React.MouseEvent, idOrSlug: string | number, name: string) => void;
}

export function MyListActorsTab({ actors, onRemove }: MyListActorsTabProps) {
  if (actors.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-9 w-9 text-zinc-500" />}
        title="Bạn chưa lưu nghệ sĩ yêu thích nào"
        description={
          <p>
            Khi xem phim hoặc hồ sơ diễn viên, hãy bấm nút <span className="text-white font-bold">Yêu thích</span> để lưu nghệ sĩ vào danh sách, tiện theo dõi và thưởng thức trọn bộ các tác phẩm điện ảnh.
          </p>
        }
        action={
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg"
          >
            Khám phá phim & nghệ sĩ
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-b from-zinc-900/40 to-transparent py-3 sm:py-4 md:py-5 px-0 overflow-visible">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-6">
        {actors.map((actor) => {
          const actorHref = `/dien-vien/${actor.slug}`;
          const cleanCountry =
            cleanCountryName(actor.country) ||
            cleanCountryName(getActorSynonyms(actor.name || actor.slug)?.country) ||
            "";
          const roleText = actor.roles || "Diễn viên";
          const movieText =
            typeof actor.totalMovies === "number" && actor.totalMovies > 0
              ? `${actor.totalMovies} phim`
              : null;

          return (
            <div
              key={actor.id || actor.slug}
              className="group/card relative flex flex-col w-full select-none"
            >
              {/* POSTER PORTRAIT (3:4 CHÂN DUNG ĐIỆN ẢNH VỚI ISOLATE VÀ OVERFLOW HIDDEN) */}
              <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-zinc-900 shadow-md shadow-black/40 isolate">
                {/* LINK CHÍNH ĐẾN TRANG HỒ SƠ DIỄN VIÊN */}
                <Link
                  href={actorHref}
                  prefetch={false}
                  aria-label={`Xem hồ sơ và tuyển tập phim của ${actor.name}`}
                  className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-netflix-red rounded-2xl"
                >
                  <ActorAvatar
                    name={actor.name}
                    avatarUrl={actor.avatarUrl}
                    shape="card"
                    imageClassName="group-hover/card:scale-105 will-change-transform transform-gpu"
                    sizes="(max-width: 640px) 180px, (max-width: 1024px) 220px, 260px"
                  />

                  {/* GRADIENT CINEMATIC OVERLAY KHI HOVER */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none"
                    aria-hidden="true"
                  />
                </Link>

                {/* NÚT XÓA KHỎI YÊU THÍCH - NẰM GỌN TRÊN ẢNH GÓC TRÊN PHẢI */}
                <div className="absolute top-2.5 right-2.5 z-20 pointer-events-auto">
                  <Tooltip content={`Bỏ ${actor.name} khỏi yêu thích`} side="top" align="end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove(e, actor.id || actor.slug, actor.name);
                      }}
                      aria-label={`Bỏ ${actor.name} khỏi yêu thích`}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 hover:bg-netflix-red text-zinc-300 hover:text-white backdrop-blur-md flex items-center justify-center shadow-lg shadow-black/60 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer max-sm:opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100 focus:opacity-100 border border-white/10"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:rotate-6" />
                    </button>
                  </Tooltip>
                </div>

                {/* DÒNG XEM TUYỂN TẬP - NẰM TRONG POSTER DẠNG GLASS PILL SANG TRỌNG */}
                <div className="absolute bottom-3 inset-x-3 z-10 flex justify-center pointer-events-none opacity-0 group-hover/card:opacity-100 transition-all duration-300 translate-y-1.5 group-hover/card:translate-y-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-[11.5px] font-semibold backdrop-blur-md shadow-xl shadow-black/80 border border-white/15 transition-all">
                    <Film className="w-3.5 h-3.5 text-netflix-red shrink-0" />
                    <span>Xem tuyển tập</span>
                    <ArrowRight className="w-3 h-3 text-white/80 shrink-0" />
                  </span>
                </div>
              </div>

              {/* THÔNG TIN DIỄN VIÊN BÊN DƯỚI POSTER */}
              <Link
                href={actorHref}
                prefetch={false}
                className="pt-2 px-0.5 flex flex-col w-full text-center items-center focus:outline-none"
              >
                <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover/card:text-netflix-red transition-colors line-clamp-1">
                  {actor.name}
                </h4>

                <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] sm:text-xs text-zinc-400 min-h-[18px]">
                  {cleanCountry ? (
                    <>
                      <span className="truncate max-w-[120px]">{cleanCountry}</span>
                      <span className="text-zinc-600 font-normal select-none">•</span>
                      {movieText ? (
                        <span className="tabular-nums font-sans font-medium text-zinc-300">
                          {movieText}
                        </span>
                      ) : (
                        <span className="truncate">{roleText}</span>
                      )}
                    </>
                  ) : movieText ? (
                    <>
                      <span className="tabular-nums font-sans font-medium text-zinc-300">
                        {movieText}
                      </span>
                      <span className="text-zinc-600 font-normal select-none">•</span>
                      <span className="truncate">{roleText}</span>
                    </>
                  ) : (
                    <span className="truncate">{roleText}</span>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
