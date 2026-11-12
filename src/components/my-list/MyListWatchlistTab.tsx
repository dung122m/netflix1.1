"use client";

import React from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import { WatchlistItem } from "@/lib/watchlist";
import { MediaCard } from "@/components/browse/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";

interface MyListWatchlistTabProps {
  watchlist: WatchlistItem[];
  onRemove: (e: React.MouseEvent, slug: string, title: string) => void;
}

export function MyListWatchlistTab({ watchlist, onRemove }: MyListWatchlistTabProps) {
  if (watchlist.length === 0) {
    return (
      <EmptyState
        icon={<Film className="h-9 w-9 text-zinc-500" />}
        title="Danh sách của bạn chưa có phim nào"
        description={
          <p>
            Khi lướt phim trên Nanaflix, hãy bấm vào nút dấu cộng (<span className="text-white font-bold">+</span>) trên các bộ phim bạn thích để lưu vào danh sách xem sau.
          </p>
        }
        action={
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg"
          >
            Khám phá phim ngay
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-b from-zinc-900/40 to-transparent py-3 sm:py-4 md:py-5 px-0 overflow-visible">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-6">
        {watchlist.map((item, index) => (
          <MediaCard
            key={item.slug}
            slug={item.slug}
            title={item.title}
            imageUrl={item.imageUrl}
            posterUrl={item.poster}
            genre={item.genre || item.category || ""}
            year={item.year}
            quality={item.quality}
            time={item.time}
            country={item.country}
            type_name={item.type_name}
            itemType={item.itemType}
            seriesSlug={item.seriesSlug}
            seriesTitle={item.seriesTitle}
            episodeSlug={item.episodeSlug}
            episodeName={item.episodeName}
            seasonName={item.seasonName}
            priority={index < 6}
            onRemove={(e) => onRemove(e, item.slug, item.title)}
            removeTooltip="Xóa khỏi danh sách yêu thích"
          />
        ))}
      </div>
    </div>
  );
}

