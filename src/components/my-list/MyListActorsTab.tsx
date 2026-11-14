"use client";

import React from "react";
import Link from "next/link";
import { Users, Trash2, Clapperboard, ExternalLink } from "lucide-react";
import { FavoriteActorItem } from "@/lib/favoriteActors";
import { ActorAvatar } from "@/components/actors/ActorAvatar";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
        {actors.map((actor) => {
          const actorHref = `/dien-vien/${actor.slug}`;

          return (
            <div
              key={actor.id || actor.slug}
              className="group/card relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] p-2.5 sm:p-3 flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] shadow-lg shadow-black/40"
            >
              {/* NÚT XÓA KHỎI YÊU THÍCH */}
              <button
                type="button"
                onClick={(e) => onRemove(e, actor.id || actor.slug, actor.name)}
                title={`Bỏ ${actor.name} khỏi yêu thích`}
                aria-label={`Bỏ ${actor.name} khỏi yêu thích`}
                className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/60 hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 backdrop-blur-md opacity-0 group-hover/card:opacity-100 transition-all duration-200 active:scale-90"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* THẺ LINK ĐẾN TRANG CHI TIẾT NGHỆ SĨ */}
              <Link
                href={actorHref}
                prefetch={false}
                className="w-full flex flex-col items-center text-center focus:outline-none"
              >
                {/* AVATAR CHÂN DUNG 3:4 */}
                <div className="relative aspect-[3/4] w-full rounded-xl bg-zinc-900 overflow-hidden shadow-md flex items-center justify-center">
                  <ActorAvatar
                    name={actor.name}
                    avatarUrl={actor.avatarUrl}
                    shape="card"
                    imageClassName="group-hover/card:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 150px, 200px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />

                  {/* HOVER BADGE */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-white/90 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <span>Xem tuyển tập</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </div>

                {/* THÔNG TIN DIỄN VIÊN */}
                <div className="mt-2.5 w-full px-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white group-hover/card:text-zinc-200 transition-colors line-clamp-1">
                    {actor.name}
                  </h4>

                  <div className="flex items-center justify-center gap-1.5 mt-1 text-[10.5px] sm:text-xs text-zinc-400">
                    {actor.country && (
                      <span className="line-clamp-1">{actor.country}</span>
                    )}
                    {actor.country && actor.totalMovies ? <span>•</span> : null}
                    {actor.totalMovies ? (
                      <span className="text-amber-300/90 font-medium inline-flex items-center gap-1">
                        <Clapperboard className="w-2.5 h-2.5 shrink-0" />
                        <span className="tabular-nums">{actor.totalMovies} phim</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
