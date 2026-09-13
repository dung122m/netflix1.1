"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, X, Sparkles, Clock } from "lucide-react";
import { getWatchHistory, WatchHistoryItem } from "@/lib/watchHistory";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function ContinueWatchingSyncInner() {
  const [recentItem, setRecentItem] = useState<WatchHistoryItem | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Chỉ chạy ở phía Client
    if (typeof window === "undefined") return;

    const checkHistory = () => {
      const history = getWatchHistory();
      if (!history || history.length === 0) {
        setRecentItem(null);
        return;
      }

      // Tìm mục xem dở mới nhất có progress > 15s và cập nhật trong 7 ngày gần đây
      const latest = history.find(
        (item) =>
          item.progressSeconds &&
          item.progressSeconds > 15 &&
          Date.now() - (item.updatedAt || 0) < 7 * 24 * 60 * 60 * 1000
      );

      if (latest) {
        setRecentItem(latest);
      }
    };

    checkHistory();
    window.addEventListener("watch-history-updated", checkHistory);
    return () => window.removeEventListener("watch-history-updated", checkHistory);
  }, []);

  if (!recentItem || dismissed) return null;

  const targetUrl = `/movies/${recentItem.slug}${
    recentItem.episodeSlug ? `?ep=${recentItem.episodeSlug}` : ""
  }`;

  return (
    <div className="fixed bottom-5 right-4 sm:right-6 z-[90] max-w-sm animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="relative rounded-2xl border border-netflix-red/40 bg-zinc-950/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex items-center gap-3 space-y-0 group">
        {/* Glow hiệu ứng nền đỏ */}
        <div className="absolute -inset-1 bg-netflix-red/10 rounded-2xl blur-md pointer-events-none" />

        {/* Poster / Thumbnail */}
        <div className="relative w-11 h-14 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recentItem.poster || "/default-poster.jpg"}
            alt={recentItem.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/default-poster.jpg";
            }}
          />
        </div>

        {/* Nội dung thông báo */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold mb-0.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Tiếp tục xem phim</span>
          </div>
          <h4 className="text-xs font-bold text-white truncate">
            {recentItem.title}
          </h4>
          <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
            <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
            <span>
              {recentItem.episodeName ? `${recentItem.episodeName} • ` : ""}
              Đang ở phút {formatTime(recentItem.progressSeconds || 0)}
            </span>
          </p>
        </div>

        {/* Nút Xem tiếp 1-chạm */}
        <Link
          href={targetUrl}
          onClick={() => setDismissed(true)}
          className="w-9 h-9 rounded-full bg-netflix-red hover:bg-rose-700 text-white flex items-center justify-center transition shadow-md shadow-red-950/60 flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95"
          title="Bấm để xem tiếp ngay"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </Link>

        {/* Nút Đóng */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export const ContinueWatchingSync = React.memo(ContinueWatchingSyncInner);
export default ContinueWatchingSync;
