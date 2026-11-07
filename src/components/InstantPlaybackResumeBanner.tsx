"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Play, X, Smartphone, Laptop, Tv, Monitor } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeActivePlaybackSession, getTabSessionId } from "@/services/handoffService";
import { PlaybackSession } from "@/types/deviceSession";

function formatSeconds(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function getDeviceIcon(deviceType?: string) {
  const norm = (deviceType || "").toLowerCase();
  if (norm.includes("thoại") || norm.includes("phone") || norm.includes("mobile")) {
    return <Smartphone className="w-3.5 h-3.5 text-netflix-red flex-none" />;
  }
  if (norm.includes("tablet") || norm.includes("ipad")) {
    return <TabletIcon className="w-3.5 h-3.5 text-netflix-red flex-none" />;
  }
  if (norm.includes("tv") || norm.includes("tivi")) {
    return <Tv className="w-3.5 h-3.5 text-netflix-red flex-none" />;
  }
  return <Laptop className="w-3.5 h-3.5 text-netflix-red flex-none" />;
}

function TabletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <line x1="12" x2="12.01" y1="18" y2="18" />
    </svg>
  );
}

export const InstantPlaybackResumeBanner: React.FC = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const [activeSession, setActiveSession] = useState<PlaybackSession | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentTabSessionId = typeof window !== "undefined" ? getTabSessionId() : "";

  const handleSessionUpdate = useCallback(
    (session: PlaybackSession | null) => {
      if (!session || !session.movieSlug) {
        setActiveSession(null);
        return;
      }

      // 1. Bỏ qua nếu phiên này do chính tab này vừa cập nhật
      if (session.sessionId === currentTabSessionId) {
        return;
      }

      // 2. Bỏ qua nếu thời gian cập nhật quá cũ (> 24 giờ)
      const now = Date.now();
      if (now - session.updatedAt > 24 * 3600 * 1000) {
        return;
      }

      // 3. Bỏ qua nếu tiến độ chưa đáng kể (< 10s) hoặc phim đã xem xong (> 95%)
      if (session.currentTime < 10) return;
      if (session.duration > 0 && session.currentTime >= session.duration * 0.95) return;

      // 4. Bỏ qua nếu người dùng đã đóng phiên xem này trong session hiện tại
      try {
        const dismissedKey = `nanaflix_dismissed_resume_${session.updatedAt}`;
        if (sessionStorage.getItem(dismissedKey)) {
          return;
        }
      } catch {}

      // 5. Bỏ qua nếu người dùng đang ở chính trang chi tiết/phát của bộ phim này
      if (pathname && pathname.includes(`/movies/${session.movieSlug}`)) {
        return;
      }

      setActiveSession(session);
      setDismissed(false);

      // Tự động ẩn nhẹ nhàng sau 20 giây nếu người dùng không thao tác
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = setTimeout(() => {
        setDismissed(true);
      }, 20000);
    },
    [currentTabSessionId, pathname]
  );

  useEffect(() => {
    if (!user?.uid) {
      setActiveSession(null);
      return;
    }

    const unsubscribe = subscribeActivePlaybackSession(user.uid, handleSessionUpdate);

    return () => {
      unsubscribe();
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
    };
  }, [user?.uid, handleSessionUpdate]);

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (activeSession) {
      try {
        sessionStorage.setItem(`nanaflix_dismissed_resume_${activeSession.updatedAt}`, "true");
      } catch {}
    }
    setDismissed(true);
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current);
  };

  if (!user || !activeSession || dismissed) {
    return null;
  }

  const targetHref = `/movies/${activeSession.movieSlug}?tap=${activeSession.episodeSlug || "tap-1"}&t=${activeSession.currentTime}`;
  const progressPercent =
    activeSession.duration > 0
      ? Math.min(100, Math.round((activeSession.currentTime / activeSession.duration) * 100))
      : 0;

  return (
    <aside
      aria-label="Tiếp tục xem từ thiết bị khác"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-[340px] sm:max-w-[380px] w-full animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-netflix-red/30 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(229,9,20,0.15)] p-3 sm:p-3.5 transition-all hover:border-netflix-red/50">
        {/* Nút đóng banner */}
        <button
          onClick={handleDismiss}
          aria-label="Đóng thông báo tiếp tục xem"
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-3 items-center min-w-0">
          {/* Ảnh thumbnail phim */}
          <div className="relative w-12 h-16 sm:w-14 sm:h-20 flex-none rounded-lg overflow-hidden bg-zinc-800 shadow-md">
            {activeSession.posterUrl ? (
              <Image
                src={activeSession.posterUrl}
                alt={activeSession.movieTitle}
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                <Monitor className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Nội dung thông báo */}
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 mb-0.5">
              {getDeviceIcon(activeSession.deviceType)}
              <span className="truncate">
                Tiếp tục từ <strong className="text-zinc-200">{activeSession.deviceType || "Thiết bị khác"}</strong>
              </span>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-white truncate leading-snug">
              {activeSession.movieTitle}
            </h4>

            <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5 font-sans tabular-nums">
              {activeSession.episodeName || "Tập 1"} • {formatSeconds(activeSession.currentTime)}
              {activeSession.duration > 0 && ` / ${formatSeconds(activeSession.duration)}`}
            </p>

            {/* Mini Progress Bar */}
            {progressPercent > 0 && (
              <div className="w-full h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-netflix-red transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-500">Đồng bộ Cloud Instant</span>
          <Link
            href={targetHref}
            onClick={() => setDismissed(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-netflix-red hover:bg-red-700 text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Xem tiếp ngay</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default InstantPlaybackResumeBanner;

