"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, X, Sparkles, Clock } from "lucide-react";
import { getWatchHistory, WatchHistoryItem } from "@/lib/watchHistory";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

const SESSION_DISMISSED_KEY = "nanaflix_continue_watching_dismissed";

function ContinueWatchingSyncInner() {
  const pathname = usePathname();
  const [recentItem, setRecentItem] = useState<WatchHistoryItem | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Chỉ chạy ở phía Client và KHÔNG hiển thị khi đang ở trang xem phim (/movies/...)
    if (typeof window === "undefined") return;
    if (
      pathname &&
      (pathname.startsWith("/movies/") ||
        pathname.startsWith("/live-tv") ||
        pathname.startsWith("/live-football"))
    ) {
      setRecentItem(null);
      return;
    }

    const checkHistory = () => {
      // Kiểm tra nếu người dùng đã bấm tắt trong phiên duyệt web này
      try {
        const isSessionDismissed = sessionStorage.getItem(SESSION_DISMISSED_KEY);
        if (isSessionDismissed === "true") {
          setRecentItem(null);
          return;
        }
      } catch {}

      const history = getWatchHistory();
      if (!history || history.length === 0) {
        setRecentItem(null);
        return;
      }

      // Chỉ gợi ý nếu đã xem dở > 30s và xem trong vòng 24 giờ qua (thay vì 7 ngày trước đó)
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const latest = history.find((item) => {
        if (!item.progressSeconds || item.progressSeconds < 30) return false;
        // Nếu đã xem gần hết phim (> 92% thời lượng) thì không gợi ý xem lại
        if (item.durationSeconds && item.durationSeconds > 0) {
          if (item.progressSeconds / item.durationSeconds > 0.92) return false;
        }
        // Kiểm tra xem trong vòng 24h qua
        return Date.now() - (item.updatedAt || 0) < ONE_DAY_MS;
      });

      if (latest) {
        // Kiểm tra xem phim này cụ thể đã bị dismiss chưa
        try {
          const itemDismissed = sessionStorage.getItem(
            `${SESSION_DISMISSED_KEY}_${latest.slug}`
          );
          if (itemDismissed === "true") {
            setRecentItem(null);
            return;
          }
        } catch {}

        // Trì hoãn 1.2s trước khi hiện để tránh giật UI khi mới load trang
        const showTimer = setTimeout(() => {
          setRecentItem(latest);
          setDismissed(false);

          // Tự động biến mất sau 7 giây để không che chắn màn hình người dùng
          if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
          autoHideTimerRef.current = setTimeout(() => {
            setDismissed(true);
          }, 7000);
        }, 1200);

        return () => clearTimeout(showTimer);
      } else {
        setRecentItem(null);
      }
    };

    const cleanup = checkHistory();
    window.addEventListener("watch-history-updated", checkHistory);
    return () => {
      if (cleanup) cleanup();
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      window.removeEventListener("watch-history-updated", checkHistory);
    };
  }, [pathname]);

  const handleDismiss = () => {
    setDismissed(true);
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    try {
      // Nhớ rằng người dùng đã chủ động tắt thông báo này trong phiên làm việc
      if (recentItem?.slug) {
        sessionStorage.setItem(`${SESSION_DISMISSED_KEY}_${recentItem.slug}`, "true");
      }
      sessionStorage.setItem(SESSION_DISMISSED_KEY, "true");
    } catch {}
  };

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
          onClick={handleDismiss}
          className="w-9 h-9 rounded-full bg-netflix-red hover:bg-rose-700 text-white flex items-center justify-center transition shadow-md shadow-red-950/60 flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95"
          title="Bấm để xem tiếp ngay"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </Link>

        {/* Nút Đóng */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export const ContinueWatchingSync = React.memo(ContinueWatchingSyncInner);
export default ContinueWatchingSync;
