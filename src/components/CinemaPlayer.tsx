"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  SkipBack,
  SkipForward,
  Keyboard,
  X,
  ArrowUpRight,
} from "lucide-react";

interface EpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
}

interface CinemaPlayerProps {
  embedSrc?: string;
  videoLink?: string;
  title: string;
  activeEpisodeName?: string;
  activeEpisodeSlug?: string;
  isTrailerOnly: boolean;
  posterUrl: string;
  episodes: EpisodeItem[];
}

export const CinemaPlayer: React.FC<CinemaPlayerProps> = ({
  embedSrc,
  videoLink,
  title,
  activeEpisodeName,
  activeEpisodeSlug,
  isTrailerOnly,
  posterUrl,
  episodes,
}) => {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isLightsOff, setIsLightsOff] = useState(false);
  const [showShortcutModal, setShowShortcutModal] = useState(false);

  // Floating Mini-Player States
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [dismissedMini, setDismissedMini] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Tìm tập hiện tại, tập trước và tập kế tiếp
  const currentIndex = episodes.findIndex((ep) => ep.slug === activeEpisodeSlug);
  const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
  const nextEpisode =
    currentIndex !== -1 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;

  // Lắng nghe scroll để tự động bật Mini-Player khi video trôi ra khỏi màn hình
  useEffect(() => {
    if (!videoLink) return;
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isOutOfView = rect.bottom < 100;
      setShowMiniPlayer(isOutOfView);

      // Nếu cuộn ngược lại đầu trang, reset dismissedMini
      if (rect.top > -50) {
        setDismissedMini(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [videoLink]);

  // Lắng nghe phím tắt: T, L, P, N, Esc, ?
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (showShortcutModal) setShowShortcutModal(false);
        else if (isLightsOff) setIsLightsOff(false);
        else if (isTheaterMode) setIsTheaterMode(false);
        return;
      }

      // Phím T: Bật/Tắt chế độ Rạp phim
      if (e.key === "t" || e.key === "T") {
        setIsTheaterMode((prev) => !prev);
      }

      // Phím L: Bật/Tắt đèn
      if (e.key === "l" || e.key === "L") {
        setIsLightsOff((prev) => !prev);
      }

      // Phím P: Tập trước đó
      if ((e.key === "p" || e.key === "P") && prevEpisode?.slug) {
        router.push(`?ep=${prevEpisode.slug}`, { scroll: false });
      }

      // Phím N: Tập tiếp theo
      if ((e.key === "n" || e.key === "N") && nextEpisode?.slug) {
        router.push(`?ep=${nextEpisode.slug}`, { scroll: false });
      }

      // Phím ?: Xem danh sách phím tắt
      if (e.key === "?") {
        setShowShortcutModal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightsOff, isTheaterMode, showShortcutModal, prevEpisode, nextEpisode, router]);

  const scrollToPlayer = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* LỚP NỀN TẮT ĐÈN (LIGHTS OFF OVERLAY) */}
      {isLightsOff && (
        <div
          onClick={() => setIsLightsOff(false)}
          className="fixed inset-0 bg-black/95 z-40 transition-opacity duration-300 cursor-pointer flex items-start justify-center pt-24"
        >
          <div className="text-white/60 text-xs bg-zinc-900/80 border border-white/10 px-3.5 py-2 rounded-full backdrop-blur-sm pointer-events-none shadow-xl">
            💡 Nhấn phím <span className="text-white font-bold">L</span> hoặc <span className="text-white font-bold">Escape</span> để bật đèn lại
          </div>
        </div>
      )}

      {/* CONTAINER KHUNG PHÁT VIDEO CHÍNH */}
      <div
        ref={containerRef}
        className={`w-full mx-auto transition-all duration-300 ${
          isTheaterMode ? "max-w-none px-0 sm:px-0" : "max-w-[1800px]"
        } ${isLightsOff ? "relative z-50" : "relative"}`}
      >
        <div
          className={`w-full aspect-video bg-zinc-950 relative overflow-hidden transition-all duration-300 ${
            isTheaterMode
              ? "rounded-none border-y border-white/20 shadow-[0_30px_90px_rgba(0,0,0,0.85)] max-h-[85vh]"
              : "rounded-none sm:rounded-xl md:rounded-2xl border-y sm:border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.55)]"
          }`}
        >
          {videoLink ? (
            <iframe
              src={embedSrc}
              className="w-full h-full absolute inset-0 border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
              title={`Đang phát ${activeEpisodeName || "phim"}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center border border-white/10 relative">
              <Image
                src={posterUrl}
                alt={title}
                fill
                quality={95}
                className="object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-black/55" />
              <div className="relative z-10 text-center px-6">
                <p className="text-white text-lg md:text-2xl font-semibold">
                  {isTrailerOnly
                    ? "Phim đang ở trạng thái trailer/sắp chiếu"
                    : "Video chưa được cập nhật"}
                </p>
                <p className="text-gray-300 mt-2 text-sm md:text-base">
                  {isTrailerOnly
                    ? "Hiện chưa có tập phát chính thức. Vui lòng quay lại sau."
                    : "Nguồn phát hiện chưa sẵn sàng."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* THANH ĐIỀU KHIỂN RẠP PHIM & TẮT ĐÈN & PHÍM TẮT */}
        <div className="flex items-center justify-between gap-2 py-2.5 px-1 text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                isTheaterMode
                  ? "bg-netflix-red/90 text-white border-netflix-red font-medium"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
              }`}
            >
              {isTheaterMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Thu nhỏ player (T)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Chế độ Rạp phim (T)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsLightsOff(!isLightsOff)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                isLightsOff
                  ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-medium"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
              }`}
            >
              {isLightsOff ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Bật đèn (L)</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Tắt đèn (L)</span>
                </>
              )}
            </button>

            {/* NÚT BẢNG PHÍM TẮT */}
            <button
              type="button"
              onClick={() => setShowShortcutModal(true)}
              title="Xem danh sách phím tắt"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-gray-400 hover:text-white border border-white/10 transition cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Phím tắt</span>
            </button>
          </div>

          {/* CỤM NÚT ĐIỀU HƯỚNG TẬP: TRƯỚC / SAU */}
          <div className="flex items-center gap-1.5">
            {prevEpisode && (
              <Link
                href={`?ep=${prevEpisode.slug}`}
                scroll={false}
                title={`Tập trước: ${prevEpisode.name} (Phím P)`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white transition font-medium border border-white/10 text-xs"
              >
                <SkipBack className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tập trước ({prevEpisode.name}) [P]</span>
              </Link>
            )}
            {nextEpisode && (
              <Link
                href={`?ep=${nextEpisode.slug}`}
                scroll={false}
                title={`Tập tiếp theo: ${nextEpisode.name} (Phím N)`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-netflix-red text-white transition font-semibold border border-white/10 shadow-md text-xs"
              >
                <span>Tập tiếp ({nextEpisode.name}) [N]</span>
                <SkipForward className="w-3.5 h-3.5 fill-white" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING MINI-PLAYER KHI CUỘN TRANG */}
      {videoLink && showMiniPlayer && !dismissedMini && !isTheaterMode && (
        <div className="fixed bottom-6 right-6 z-40 w-72 sm:w-80 md:w-96 aspect-video bg-zinc-950 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] border border-white/20 animate-in slide-in-from-bottom-5 duration-200">
          {/* MINI CONTROLS BAR */}
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 to-transparent p-2 flex items-center justify-between z-20">
            <span className="text-white text-xs font-semibold truncate max-w-[180px] drop-shadow-md">
              {title} {activeEpisodeName ? `• Tập ${activeEpisodeName}` : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={scrollToPlayer}
                title="Quay lại khung lớn"
                className="p-1 rounded-full bg-black/60 text-gray-300 hover:text-white hover:bg-black transition cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDismissedMini(true)}
                title="Đóng mini-player"
                className="p-1 rounded-full bg-black/60 text-gray-300 hover:text-white hover:bg-black transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <iframe
            src={embedSrc}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="no-referrer"
            title={`Mini ${title}`}
          />
        </div>
      )}

      {/* MODAL DANH SÁCH PHÍM TẮT (SHORTCUTS MODAL) */}
      {showShortcutModal && (
        <div
          onClick={() => setShowShortcutModal(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <Keyboard className="w-4 h-4 text-netflix-red" />
                <span>Phím tắt xem phim</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Chế độ Rạp phim</span>
                <kbd className="px-2 py-1 rounded bg-zinc-800 border border-white/15 text-xs font-mono text-white">
                  T
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Tắt / Bật đèn xung quanh</span>
                <kbd className="px-2 py-1 rounded bg-zinc-800 border border-white/15 text-xs font-mono text-white">
                  L
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Chuyển về tập trước</span>
                <kbd className="px-2 py-1 rounded bg-zinc-800 border border-white/15 text-xs font-mono text-white">
                  P
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Chuyển sang tập kế tiếp</span>
                <kbd className="px-2 py-1 rounded bg-zinc-800 border border-white/15 text-xs font-mono text-white">
                  N
                </kbd>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-300">Thoát chế độ xem / Đóng</span>
                <kbd className="px-2 py-1 rounded bg-zinc-800 border border-white/15 text-xs font-mono text-white">
                  Esc
                </kbd>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => setShowShortcutModal(false)}
                className="w-full py-2 rounded-lg bg-netflix-red text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CinemaPlayer;
