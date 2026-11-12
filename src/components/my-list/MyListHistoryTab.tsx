"use client";

import React from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { MediaCard } from "@/components/browse/MediaCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatTimeAgo } from "./myListFormatters";

function HistoryCardItem({
  item,
  onRemove,
}: {
  item: WatchHistoryItem;
  onRemove: (slug: string) => void;
}) {
  const progressPercent =
    item.progressSeconds && item.durationSeconds && item.durationSeconds > 0
      ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
      : 0;

  return (
    <MediaCard
      slug={item.slug}
      title={item.title}
      imageUrl={item.poster || item.thumb || ""}
      posterUrl={item.poster}
      thumbUrl={item.thumb}
      year={item.year}
      genre={item.category || ""}
      quality={item.quality}
      country={item.country}
      type_name={item.type}
      episodeSlug={item.episodeSlug}
      episodeName={item.episodeName}
      progressPercent={progressPercent}
      onRemove={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onRemove(item.slug);
      }}
      removeTooltip="Xóa khỏi lịch sử xem"
      updatedTimeAgo={item.updatedAt ? formatTimeAgo(item.updatedAt) : undefined}
    />
  );
}

interface MyListHistoryTabProps {
  history: WatchHistoryItem[];
  visibleHistoryCount: number;
  pageSize: number;
  onRemove: (slug: string) => void;
  onLoadMore: () => void;
}

export function MyListHistoryTab({
  history,
  visibleHistoryCount,
  pageSize,
  onRemove,
  onLoadMore,
}: MyListHistoryTabProps) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-9 w-9 text-zinc-500" />}
        title="Chưa có lịch sử xem phim"
        description="Các bộ phim và tập phim bạn thưởng thức sẽ tự động xuất hiện tại đây để bạn có thể dễ dàng xem tiếp bất cứ lúc nào."
        action={
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg"
          >
            Xem phim ngay
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-b from-zinc-900/40 to-transparent py-3 sm:py-4 md:py-5 px-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
        {history.slice(0, visibleHistoryCount).map((item, index) => (
          <HistoryCardItem
            key={`${item.slug}_${item.episodeSlug || ""}_${index}`}
            item={item}
            onRemove={onRemove}
          />
        ))}
      </div>
      {history.length > visibleHistoryCount && (
        <div className="flex justify-center mt-6 sm:mt-8 pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span>
              Xem thêm {Math.min(pageSize, history.length - visibleHistoryCount)} phim
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

