"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeActivePlaybackSession,
  getTabSessionId,
} from "@/services/handoffService";
import { getWatchHistory, WatchHistoryItem } from "@/lib/watchHistory";
import { toOptimizedPhimimgUrl } from "@/lib/movieMedia";
import { Play, X, Sparkles, Smartphone, Laptop, Tablet } from "lucide-react";

interface UnifiedSession {
  type: "handoff" | "local";
  movieSlug: string;
  movieTitle: string;
  episodeSlug?: string;
  episodeName?: string;
  posterUrl: string;
  currentTime: number;
  duration: number;
  deviceType?: "Điện thoại" | "Máy tính" | "Tablet" | "Trình duyệt này";
  updatedAt: number;
}

const STORAGE_DISMISSED_KEY = "nanaflix_continue_widget_dismissed";
const HAS_SHOWN_TOAST_KEY = "nanaflix_has_shown_continue_toast";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function ContinueWatchingWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<UnifiedSession | null>(null);
  const [viewState, setViewState] = useState<"toast" | "bubble" | "hidden">("hidden");
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isProgressActive, setIsProgressActive] = useState(false);

  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  // 1. Lắng nghe và đồng bộ dữ liệu (Ưu tiên Handoff đa thiết bị -> Fallback Local History)
  const syncSessionData = useCallback(() => {
    // Không hiện khi đang trong trang xem phim hoặc trực tiếp
    if (
      !pathname ||
      pathname.startsWith("/movies/") ||
      pathname.startsWith("/live") ||
      pathname.startsWith("/live-tv") ||
      pathname.startsWith("/live-football")
    ) {
      setViewState("hidden");
      return;
    }

    // Kiểm tra nếu người dùng đã chủ động bấm Tắt hoàn toàn trong phiên này
    try {
      if (sessionStorage.getItem(STORAGE_DISMISSED_KEY) === "true") {
        setViewState("hidden");
        return;
      }
    } catch {}

    // Fallback: Kiểm tra Local Watch History
    const history = getWatchHistory();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const latestLocal: WatchHistoryItem | undefined = history?.find((item) => {
      if (!item.progressSeconds || item.progressSeconds < 20) return false;
      if (item.durationSeconds && item.durationSeconds > 0) {
        if (item.progressSeconds / item.durationSeconds > 0.92) return false;
      }
      return Date.now() - (item.updatedAt || 0) < ONE_DAY_MS;
    });

    if (latestLocal) {
      setSession((prev) => {
        // Nếu đang có phiên handoff thiết bị khác thì giữ nguyên
        if (prev?.type === "handoff" && Date.now() - prev.updatedAt < 15 * 60 * 1000) {
          return prev;
        }
        return {
          type: "local",
          movieSlug: latestLocal.slug,
          movieTitle: latestLocal.title,
          episodeSlug: latestLocal.episodeSlug,
          episodeName: latestLocal.episodeName,
          posterUrl: latestLocal.poster || "/default-poster.jpg",
          currentTime: latestLocal.progressSeconds || 0,
          duration: latestLocal.durationSeconds || 0,
          deviceType: "Trình duyệt này",
          updatedAt: latestLocal.updatedAt || Date.now(),
        };
      });
    }
  }, [pathname]);

  // Lắng nghe Handoff từ Supabase/BroadcastChannel
  useEffect(() => {
    if (!user?.uid) {
      syncSessionData();
      return;
    }

    const unsub = subscribeActivePlaybackSession(user.uid, (handoff) => {
      if (handoff && handoff.sessionId !== getTabSessionId()) {
        const isRecent = Date.now() - handoff.updatedAt < 15 * 60 * 1000;
        const hasWatchedEnough = handoff.currentTime > 10;
        if (isRecent && hasWatchedEnough) {
          setSession({
            type: "handoff",
            movieSlug: handoff.movieSlug,
            movieTitle: handoff.movieTitle,
            episodeSlug: handoff.episodeSlug,
            episodeName: handoff.episodeName,
            posterUrl: handoff.posterUrl || "/default-poster.jpg",
            currentTime: handoff.currentTime,
            duration: handoff.duration,
            deviceType: handoff.deviceType,
            updatedAt: handoff.updatedAt,
          });
          return;
        }
      }
      syncSessionData();
    });

    return () => unsub();
  }, [user?.uid, syncSessionData]);

  // Lắng nghe sự kiện cập nhật lịch sử xem
  useEffect(() => {
    syncSessionData();
    const handleHistoryUpdate = () => syncSessionData();
    window.addEventListener("watch-history-updated", handleHistoryUpdate);
    return () => window.removeEventListener("watch-history-updated", handleHistoryUpdate);
  }, [syncSessionData]);

  // 2. Quyết định mở Toast hay Bubble
  useEffect(() => {
    if (!session) {
      setViewState("hidden");
      return;
    }

    // Nếu đang ở trang xem phim
    if (
      pathname &&
      (pathname.startsWith("/movies/") ||
        pathname.startsWith("/live") ||
        pathname.startsWith("/live-tv") ||
        pathname.startsWith("/live-football"))
    ) {
      setViewState("hidden");
      return;
    }

    // Kiểm tra xem trong session này đã từng hiện Toast mở rộng chưa
    try {
      const hasShown = sessionStorage.getItem(HAS_SHOWN_TOAST_KEY);
      if (!hasShown) {
        // Lần đầu tiên vào web -> Hiện Toast mở rộng 3.5s rồi tự co thành Bubble
        sessionStorage.setItem(HAS_SHOWN_TOAST_KEY, "true");
        setViewState("toast");
      } else {
        // Các lần chuyển trang tiếp theo -> Giữ nguyên trạng thái Bubble gọn gàng, KHÔNG bung to làm phiền
        setViewState("bubble");
      }
    } catch {
      setViewState("bubble");
    }
  }, [session, pathname]);

  // 3. Tự động thu gọn từ Toast thành Bubble sau 3.5 giây đếm ngược qua CSS transition và single setTimeout
  useEffect(() => {
    if (viewState !== "toast") {
      setIsProgressActive(false);
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
      return;
    }

    if (isHovered) {
      // Khi rê chuột vào Toast: Tạm dừng đếm ngược
      setIsProgressActive(false);
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
      return;
    }

    // Kích hoạt CSS transition từ 100% -> 0%
    setIsProgressActive(true);

    const timer = setTimeout(() => {
      setViewState("bubble");
    }, 3500);

    countdownTimeoutRef.current = timer;

    return () => {
      clearTimeout(timer);
      countdownTimeoutRef.current = null;
    };
  }, [viewState, isHovered]);

  // Xử lý chuyển trang phát tiếp
  const handleResume = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!session) return;
    const targetUrl = `/movies/${session.movieSlug}?ep=${session.episodeSlug || "tap-1"}&t=${Math.floor(session.currentTime)}`;
    router.push(targetUrl);
  };

  // Tắt hoàn toàn widget trong phiên
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewState("hidden");
    try {
      sessionStorage.setItem(STORAGE_DISMISSED_KEY, "true");
    } catch {}
  };

  // Thu gọn thủ công thành bubble
  const handleCollapseToBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewState("bubble");
  };

  // Hover & Click handlers cho Bubble (Tránh mất tooltip khi lia chuột sang)
  const handleMouseEnterBubble = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setShowTooltip(true);
  };

  const handleMouseLeaveBubble = () => {
    if (isPinned) return;
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 400); // 400ms grace period giúp lia chuột thoải mái sang nút X mà không bị mất
  };

  const handleBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Bấm vào icon tròn -> Ghim mở hoặc đóng card
    setIsPinned((prev) => {
      const next = !prev;
      setShowTooltip(next);
      return next;
    });
  };

  // Đóng card khi click ra ngoài vùng widget
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setIsPinned(false);
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  if (!session || viewState === "hidden") return null;

  // Tính phần trăm xem
  const watchPercent =
    session.duration > 0
      ? Math.min(100, Math.max(5, Math.round((session.currentTime / session.duration) * 100)))
      : 30;

  // Icon loại thiết bị
  const DeviceIcon =
    session.deviceType === "Điện thoại"
      ? Smartphone
      : session.deviceType === "Tablet"
      ? Tablet
      : session.deviceType === "Máy tính"
      ? Laptop
      : Sparkles;

  // SVG Circular progress calculation
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (watchPercent / 100) * circumference;

  return (
    <aside
      aria-label="Tiếp tục xem phim"
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-[85] select-none"
    >
      {/* ======================================================== */}
      {/* 1. CHẾ ĐỘ TOAST MỞ RỘNG (CHỈ HIỆN 3.5S KHI MỚI VÀO WEB) */}
      {/* ======================================================== */}
      {viewState === "toast" && (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative max-w-[340px] sm:max-w-[370px] w-[calc(100vw-32px)] rounded-2xl bg-zinc-950/95 border border-white/20 p-3 sm:p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white overflow-hidden ring-1 ring-white/10 group animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          {/* Ambient glow */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-netflix-red/25 rounded-full blur-2xl pointer-events-none" />

          {/* Hàng trên: Badge nguồn + Nút thu nhỏ + Nút đóng */}
          <div className="flex items-center justify-between gap-1.5 text-xs mb-2">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold min-w-0">
              <DeviceIcon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 animate-pulse" />
              <span className="truncate text-[11px] sm:text-xs">
                {session.type === "handoff"
                  ? `Đang xem trên ${session.deviceType}`
                  : "Tiếp tục xem phim"}
              </span>
              {session.type === "handoff" && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0 ml-1" />
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Nút thu nhỏ về icon tròn */}
              <button
                type="button"
                onClick={handleCollapseToBubble}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-[10px]"
                title="Thu nhỏ thành icon tròn"
              >
                Thu gọn
              </button>
              {/* Nút tắt */}
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Thông tin phim */}
          <div
            onClick={handleResume}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group/card p-1 rounded-xl hover:bg-white/5 transition"
          >
            {/* Poster */}
            <div className="relative w-10 h-13 sm:w-11 sm:h-14 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 border border-white/15 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toOptimizedPhimimgUrl(session.posterUrl, 192)}
                alt={session.movieTitle}
                className="w-full h-full object-cover group-hover/card:scale-105 transition-transform"
                onError={(e) => {
                  e.currentTarget.src = "/default-poster.jpg";
                }}
              />
            </div>

            {/* Chi tiết */}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs sm:text-sm font-bold text-white truncate group-hover/card:text-rose-400 transition-colors">
                {session.movieTitle}
              </p>
              <p className="text-[11px] text-gray-300 truncate mt-0.5">
                {session.episodeName || "Tập phim"} •{" "}
                <span className="font-mono text-rose-300 font-bold">
                  {formatTime(session.currentTime)}
                </span>
                {session.duration > 0 && (
                  <span className="text-gray-400"> / {formatTime(session.duration)}</span>
                )}
              </p>

              {/* Mini progress bar */}
              <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-netflix-red rounded-full transition-all"
                  style={{ width: `${watchPercent}%` }}
                />
              </div>
            </div>

            {/* Nút Play nhanh */}
            <button
              type="button"
              onClick={handleResume}
              className="w-8 h-8 rounded-full bg-netflix-red hover:bg-rose-700 text-white flex items-center justify-center transition shadow-md shadow-red-950/60 flex-shrink-0 cursor-pointer hover:scale-105 active:scale-95 ml-1"
              title="Xem tiếp ngay"
            >
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </button>
          </div>

          {/* Thanh đếm ngược thời gian tự thu gọn thành bubble */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
            <div
              className="h-full bg-rose-500/70"
              style={{
                width: isProgressActive ? "0%" : "100%",
                transition: isProgressActive ? "width 3500ms linear" : "none",
              }}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CHẾ ĐỘ ICON TRÒN NỔI THU GỌN (FLOATING BUBBLE WIDGET)  */}
      {/* ======================================================== */}
      {viewState === "bubble" && (
        <div
          ref={widgetRef}
          className="relative group/bubble flex items-center"
          onMouseEnter={handleMouseEnterBubble}
          onMouseLeave={handleMouseLeaveBubble}
        >
          {/* Quick Floating Card khi Hover hoặc Click mở trên Desktop */}
          {(showTooltip || isPinned) && (
            <div
              onMouseEnter={handleMouseEnterBubble}
              onMouseLeave={handleMouseLeaveBubble}
              className="flex absolute right-0 sm:right-full bottom-full sm:bottom-auto mb-3 sm:mb-0 sm:mr-3.5 sm:top-1/2 sm:-translate-y-1/2 items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-zinc-950/95 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-white animate-in fade-in slide-in-from-bottom-2 sm:slide-in-from-right-3 duration-200 z-50 w-[calc(100vw-32px)] sm:w-auto min-w-[280px] max-w-[340px]
              before:content-[''] before:absolute sm:before:-right-5 sm:before:top-0 sm:before:bottom-0 sm:before:w-6 sm:before:pointer-events-auto"
            >
              {/* Poster nhỏ bên trái, bấm để phát ngay */}
              <div
                onClick={handleResume}
                className="relative w-11 h-14 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 border border-white/15 cursor-pointer group/thumb shadow-md"
                title="Bấm để phát tiếp ngay"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={toOptimizedPhimimgUrl(session.posterUrl, 192)}
                  alt={session.movieTitle}
                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = "/default-poster.jpg";
                  }}
                />
                <div className="absolute inset-0 bg-black/35 group-hover/thumb:bg-black/10 transition-colors flex items-center justify-center">
                  <Play className="w-4 h-4 fill-white text-white drop-shadow" />
                </div>
              </div>

              {/* Chi tiết nội dung phim */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5 text-[11px] text-rose-300 font-bold">
                  <DeviceIcon className="w-3 h-3 text-rose-400 flex-shrink-0" />
                  <span className="truncate">Xem tiếp {watchPercent}%</span>
                  {session.currentTime > 0 && (
                    <span className="text-gray-400 font-mono text-[10px] font-normal flex-shrink-0">
                      • {formatTime(session.currentTime)}
                    </span>
                  )}
                </div>
                <p
                  onClick={handleResume}
                  className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:text-rose-400 transition-colors mt-0.5"
                  title={session.movieTitle}
                >
                  {session.movieTitle}
                </p>
                {session.episodeName && (
                  <p className="text-[10px] text-gray-400 truncate mt-0.5">
                    {session.episodeName}
                  </p>
                )}

                {/* Progress bar nhỏ */}
                <div className="w-full h-1 bg-white/15 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-netflix-red rounded-full"
                    style={{ width: `${watchPercent}%` }}
                  />
                </div>
              </div>

              {/* Nhóm nút hành động: Play và Đóng (X) */}
              <div className="flex items-center gap-1.5 flex-shrink-0 pl-2 border-l border-white/15">
                {/* Nút Play to rõ */}
                <button
                  type="button"
                  onClick={handleResume}
                  className="w-8 h-8 rounded-full bg-netflix-red hover:bg-red-600 text-white flex items-center justify-center transition shadow-md shadow-red-950/60 hover:scale-110 active:scale-95 cursor-pointer"
                  title="Phát tiếp ngay"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </button>

                {/* Nút X hit-box rộng 32x32px cực kỳ dễ bấm */}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-rose-600/30 hover:text-rose-300 text-gray-300 flex items-center justify-center transition hover:scale-110 active:scale-90 cursor-pointer border border-white/10"
                  title="Đóng / Bỏ qua"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Nút tròn chính (Floating Circular Button) */}
          <button
            type="button"
            onClick={handleBubbleClick}
            className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-zinc-950 border border-white/20 p-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 group/btn ${
              isPinned ? "ring-2 ring-netflix-red/80 scale-105" : ""
            }`}
            title={`Xem tiếp: ${session.movieTitle} (${formatTime(session.currentTime)}) - Bấm để mở menu`}
          >
            {/* SVG Circular Progress Ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
              viewBox="0 0 52 52"
            >
              <circle
                cx="26"
                cy="26"
                r={radius}
                className="stroke-white/15"
                strokeWidth="2.5"
                fill="transparent"
              />
              <circle
                cx="26"
                cy="26"
                r={radius}
                className="stroke-netflix-red transition-all duration-500"
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Poster phim cắt tròn */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toOptimizedPhimimgUrl(session.posterUrl, 192)}
                alt={session.movieTitle}
                className="w-full h-full object-cover group-hover/btn:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = "/default-poster.jpg";
                }}
              />
              {/* Dark overlay with Play icon on hover */}
              <div className="absolute inset-0 bg-black/40 group-hover/btn:bg-black/20 transition-colors flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-white text-white drop-shadow-md ml-0.5" />
              </div>
            </div>

            {/* Huy hiệu nhỏ góc dưới (Live Device hoặc Red dot) */}
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-netflix-red text-white flex items-center justify-center border border-zinc-950 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            </span>
          </button>

          {/* Nút X nhỏ bên ngoài để tắt hẳn bubble trên mobile */}
          <button
            type="button"
            onClick={handleDismiss}
            className="sm:hidden absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-zinc-900 border border-white/20 text-gray-300 flex items-center justify-center shadow-md z-10 active:scale-90"
            title="Đóng"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </aside>
  );
}

export default ContinueWatchingWidget;
