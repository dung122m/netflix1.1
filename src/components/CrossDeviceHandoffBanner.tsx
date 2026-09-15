"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  subscribeActivePlaybackSession,
  getTabSessionId,
} from "@/services/handoffService";
import { PlaybackSession } from "@/types/deviceSession";
import { Smartphone, Laptop, Tablet, Play, X, Sparkles } from "lucide-react";

export const CrossDeviceHandoffBanner: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [activeSession, setActiveSession] = useState<PlaybackSession | null>(null);
  const [dismissedSessionTime, setDismissedSessionTime] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(100);

  // Tự động tắt sau 10 giây nếu người dùng không tương tác (tự dừng đếm khi rê chuột vào)
  useEffect(() => {
    if (!activeSession) {
      setProgressPercent(100);
      return;
    }

    if (isHovered) return;

    const DURATION = 10000; // 10 giây
    const INTERVAL = 100;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += INTERVAL;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgressPercent(remaining);

      if (elapsed >= DURATION) {
        clearInterval(timer);
        setDismissedSessionTime(activeSession.updatedAt);
        setActiveSession(null);
      }
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [activeSession, isHovered]);

  useEffect(() => {
    if (!user?.uid) {
      setActiveSession(null);
      return;
    }

    const unsub = subscribeActivePlaybackSession(user.uid, (session) => {
      if (!session) {
        setActiveSession(null);
        return;
      }

      // Không hiển thị nếu là phiên phát từ chính tab trình duyệt này
      if (session.sessionId === getTabSessionId()) {
        setActiveSession(null);
        return;
      }

      // Chỉ hiển thị nếu phiên được cập nhật trong vòng 15 phút
      const isRecent = Date.now() - session.updatedAt < 15 * 60 * 1000;
      // Và người dùng đã xem được ít nhất 10 giây
      const hasWatchedEnough = session.currentTime > 10;

      if (isRecent && hasWatchedEnough) {
        setActiveSession(session);
      } else {
        setActiveSession(null);
      }
    });

    return () => unsub();
  }, [user?.uid]);

  if (!activeSession) return null;

  // Nếu người dùng đã bấm tắt thông báo cho phiên này
  if (dismissedSessionTime === activeSession.updatedAt) return null;

  // Nếu người dùng đang ở ngay trang phim đó, ẩn banner để tránh che màn hình
  if (pathname.includes(`/movies/${activeSession.movieSlug}`)) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const handleResume = () => {
    const targetUrl = `/movies/${activeSession.movieSlug}?ep=${activeSession.episodeSlug || "tap-1"}&t=${activeSession.currentTime}`;
    setActiveSession(null);
    router.push(targetUrl);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedSessionTime(activeSession.updatedAt);
    setActiveSession(null);
  };

  const DeviceIcon =
    activeSession.deviceType === "Điện thoại"
      ? Smartphone
      : activeSession.deviceType === "Tablet"
      ? Tablet
      : Laptop;

  return (
    <aside
      aria-label="Tiếp tục xem từ thiết bị khác"
      className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-[390px] w-[calc(100vw-32px)] animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative rounded-2xl bg-zinc-950/95 border border-white/20 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white overflow-hidden ring-1 ring-white/10 group transition-all duration-200 hover:border-white/30"
      >
        {/* Glow ambient background */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-netflix-red/20 rounded-full blur-2xl pointer-events-none" />

        {/* Nút đóng */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Bỏ qua"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tiêu đề thanh handoff */}
        <div className="flex items-center gap-1.5 text-xs text-rose-300 font-semibold mb-2.5">
          <DeviceIcon className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Đang xem trên {activeSession.deviceType}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-auto mr-5" />
        </div>

        {/* Thông tin phim */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-18 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0 border border-white/15 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeSession.posterUrl || "/default-poster.jpg"}
              alt={activeSession.movieTitle}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="text-sm font-bold text-white truncate group-hover:text-netflix-red transition-colors">
              {activeSession.movieTitle}
            </h4>
            <p className="text-xs text-gray-300 truncate mt-0.5">
              {activeSession.episodeName || "Tập phim"}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
              <span className="font-mono text-rose-300 font-bold">
                {formatTime(activeSession.currentTime)}
              </span>
              {activeSession.duration > 0 && (
                <>
                  <span>/</span>
                  <span className="font-mono">
                    {formatTime(activeSession.duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Nút hành động xem tiếp */}
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Đồng bộ đám mây
          </span>

          <button
            type="button"
            onClick={handleResume}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Xem tiếp ngay</span>
          </button>
        </div>

        {/* Thanh đếm ngược tự động đóng (tự dừng khi rê chuột) */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </aside>
  );
};

export default CrossDeviceHandoffBanner;
