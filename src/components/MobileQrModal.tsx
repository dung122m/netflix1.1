"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Smartphone, X, Copy, Check, QrCode, Clock, Film, ExternalLink } from "lucide-react";
import { getWatchProgress } from "@/lib/watchHistory";
import { formatEpisodeName } from "@/lib/formatEpisode";

interface MobileQrModalProps {
  title: string;
  movieSlug?: string;
  activeEpisodeSlug?: string;
  activeEpisodeName?: string;
  currentTime?: number;
  duration?: number;
  triggerButton?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export function MobileQrModal({
  title,
  movieSlug,
  activeEpisodeSlug,
  activeEpisodeName,
  currentTime: propCurrentTime,
  duration,
  triggerButton = true,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: MobileQrModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  const [exactProgressSeconds, setExactProgressSeconds] = useState<number>(
    propCurrentTime !== undefined && propCurrentTime > 0 ? Math.floor(propCurrentTime) : 0
  );

  useEffect(() => {
    setMounted(true);
    if (propCurrentTime !== undefined && propCurrentTime > 0) {
      setExactProgressSeconds(Math.floor(propCurrentTime));
    } else if (movieSlug) {
      const saved = getWatchProgress(movieSlug, activeEpisodeSlug);
      if (saved > 0) {
        setExactProgressSeconds(Math.floor(saved));
      }
    }
  }, [propCurrentTime, movieSlug, activeEpisodeSlug]);

  // Lắng nghe sự kiện phát tiến độ xem realtime từ CinemaPlayer và localStorage
  useEffect(() => {
    if (!movieSlug) return;

    const handleProgressUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ slug?: string; episodeSlug?: string; progressSeconds?: number }>;
      if (customEvent.detail) {
        if (
          (!customEvent.detail.slug || customEvent.detail.slug === movieSlug) &&
          (!activeEpisodeSlug || !customEvent.detail.episodeSlug || customEvent.detail.episodeSlug === activeEpisodeSlug)
        ) {
          if (customEvent.detail.progressSeconds !== undefined) {
            setExactProgressSeconds(Math.floor(customEvent.detail.progressSeconds));
            return;
          }
        }
      }
      const saved = getWatchProgress(movieSlug, activeEpisodeSlug);
      if (saved > 0) {
        setExactProgressSeconds(Math.floor(saved));
      }
    };

    window.addEventListener("watch-progress-updated", handleProgressUpdate);
    window.addEventListener("watch-history-updated", handleProgressUpdate);

    // Khi modal mở, tự động làm mới mốc thời gian ngay lập tức
    if (isModalOpen) {
      const saved = getWatchProgress(movieSlug, activeEpisodeSlug);
      if (saved > 0) {
        setExactProgressSeconds(Math.floor(saved));
      }
    }

    return () => {
      window.removeEventListener("watch-progress-updated", handleProgressUpdate);
      window.removeEventListener("watch-history-updated", handleProgressUpdate);
    };
  }, [movieSlug, activeEpisodeSlug, isModalOpen]);

  // Xây dựng URL xem tiếp chính xác mang theo tập và số giây
  const watchUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const pathname = movieSlug ? `/movies/${encodeURIComponent(movieSlug)}` : window.location.pathname;

    const params = new URLSearchParams();
    if (activeEpisodeSlug) {
      params.set("ep", activeEpisodeSlug);
    }
    if (exactProgressSeconds > 0) {
      params.set("t", exactProgressSeconds.toString());
    }

    const qs = params.toString();
    return `${origin}${pathname}${qs ? `?${qs}` : ""}`;
  }, [movieSlug, activeEpisodeSlug, exactProgressSeconds]);

  // Tạo mã QR chất lượng cao nội bộ (dynamic import thư viện qrcode khi modal mở để giảm initial bundle)
  useEffect(() => {
    if (!isModalOpen || !watchUrl) return;

    let isMounted = true;
    import("qrcode")
      .then((QRCodeModule) => {
        const QRCode = QRCodeModule.default || QRCodeModule;
        return QRCode.toDataURL(watchUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });
      })
      .then((url) => {
        if (isMounted) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error("Lỗi tạo mã QR:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isModalOpen, watchUrl]);

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && watchUrl) {
      try {
        await navigator.clipboard.writeText(watchUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <>
      {triggerButton && (
        <button
          type="button"
          onClick={() => setInternalIsOpen(true)}
          title="Quét mã QR để xem tiếp trên thiết bị di động"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-zinc-900/80 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer active:scale-95 flex-shrink-0"
        >
          <Smartphone className="h-4 w-4 text-sky-400 flex-shrink-0" />
          <span className="hidden sm:inline">Chuyển sang di động</span>
          {mounted && exactProgressSeconds > 0 && (
            <span className="text-[10px] text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md ml-0.5">
              {formatTime(exactProgressSeconds)}
            </span>
          )}
        </button>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md rounded-3xl border border-white/20 bg-zinc-950 p-5 sm:p-6 shadow-[0_20px_70px_rgba(0,0,0,0.95)] text-center animate-in zoom-in-95 duration-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Red Glow */}
            <div className="pointer-events-none absolute -top-16 -left-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 w-36 h-36 bg-sky-600/20 rounded-full blur-3xl" />

            {/* Nút đóng */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header */}
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600/20 to-sky-600/20 border border-white/15 flex items-center justify-center text-white mb-3 shadow-lg">
              <QrCode className="w-6 h-6 text-rose-400" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              Đồng Bộ Đa Thiết Bị
            </span>

            <h3 className="text-lg sm:text-xl font-black text-white mt-1.5 mb-1 tracking-tight">
              Xem Tiếp Trên Di Động
            </h3>

            <p className="text-xs text-gray-400 mb-3 px-2 line-clamp-1">
              {title}
            </p>

            {/* Thông tin mốc thời gian xem dở */}
            <div className="flex items-center justify-center gap-2.5 py-1.5 px-3 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-gray-300 mb-4 max-w-full">
              {activeEpisodeName && (
                <>
                  <div className="flex items-center gap-1 text-white font-bold">
                    <Film className="w-3.5 h-3.5 text-rose-400 flex-none" />
                    <span>{formatEpisodeName(activeEpisodeName)}</span>
                  </div>
                  <span className="text-gray-600">•</span>
                </>
              )}
              <div className="flex items-center gap-1.5 text-amber-300 font-extrabold">
                <Clock className="w-3.5 h-3.5 text-amber-400 flex-none animate-pulse" />
                <span>
                  {exactProgressSeconds > 0
                    ? `Đang xem: ${formatTime(exactProgressSeconds)}`
                    : "Bắt đầu từ đầu"}
                </span>
                {duration && duration > 0 ? (
                  <span className="text-gray-500 font-normal">
                    / {formatTime(duration)}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Khung Mã QR siêu nét */}
            <div className="relative mx-auto w-[220px] h-[220px] sm:w-[240px] sm:h-[240px] rounded-2xl overflow-hidden border-2 border-white/20 bg-white p-3 shadow-2xl flex items-center justify-center group">
              {qrCodeDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrCodeDataUrl}
                  alt={`Mã QR xem phim ${title}`}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-800 text-xs font-semibold gap-2">
                  <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tạo mã QR...</span>
                </div>
              )}
            </div>

            {/* Hướng dẫn quét */}
            <p className="text-[11.5px] text-gray-300 font-medium mt-3.5 px-2 leading-relaxed">
              Mở ứng dụng <strong className="text-white font-bold">Camera</strong> hoặc <strong className="text-sky-400 font-bold">Zalo</strong> trên điện thoại quét mã trên để mở ngay lập tức tại đúng mốc <span className="text-amber-400 font-bold">{formatTime(exactProgressSeconds)}</span>.
            </p>



            {/* Cụm nút hành động */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-800 text-xs font-bold text-white transition border border-white/15 cursor-pointer shadow-lg active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Đã sao chép link xem tiếp!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-400" />
                    <span>Sao chép liên kết có mốc thời gian</span>
                  </>
                )}
              </button>

              <a
                href={watchUrl}
                target="_blank"
                rel="noreferrer"
                title="Mở trong tab mới"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition border border-white/10 flex items-center justify-center cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileQrModal;
