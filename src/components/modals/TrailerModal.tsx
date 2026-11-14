"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Film, ExternalLink, Loader2 } from "lucide-react";
import { extractYoutubeId } from "@/lib/trailerHelper";
import { BaseModal } from "@/components/ui/BaseModal";

export interface TrailerModalProps {
  title: string;
  trailerUrl?: string | null;
  modalTrailerUrl?: string | null;
  /** Chế độ Controlled: điều khiển đóng mở từ component cha */
  isOpen?: boolean;
  onClose?: () => void;
  triggerClassName?: string;
}

function getYoutubeEmbedUrl(url: string): { embedUrl: string; videoId: string } | null {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;

  const origin = typeof window !== "undefined" && window.location?.origin ? window.location.origin : "";
  const originParam = origin ? `&origin=${encodeURIComponent(origin)}` : "";

  // Tham số chuẩn: playsinline, enablejsapi, origin và permissions để vượt qua Autoplay Policy & Cross-Origin Check
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0&playsinline=1&enablejsapi=1${originParam}&iv_load_policy=3&cc_load_policy=0`;

  return { embedUrl, videoId };
}

export const TrailerModal: React.FC<TrailerModalProps> = React.memo(
  function TrailerModal({
    title,
    trailerUrl,
    modalTrailerUrl,
    isOpen: controlledIsOpen,
    onClose,
    triggerClassName,
  }) {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const [isIframeLoading, setIsIframeLoading] = useState(true);
    const [loadTimeout, setLoadTimeout] = useState(false);

    const isControlled = typeof controlledIsOpen === "boolean";
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    const rawUrl = modalTrailerUrl || trailerUrl;
    const parsed = useMemo(() => (rawUrl ? getYoutubeEmbedUrl(rawUrl) : null), [rawUrl]);

    // Reset trạng thái tải khi mở modal
    useEffect(() => {
      if (isOpen) {
        setIsIframeLoading(true);
        setLoadTimeout(false);
        const timer = setTimeout(() => {
          setLoadTimeout(true);
        }, 7000);
        return () => clearTimeout(timer);
      }
    }, [isOpen, rawUrl]);

    const handleClose = useCallback(() => {
      if (isControlled) {
        onClose?.();
      } else {
        setInternalIsOpen(false);
      }
    }, [isControlled, onClose]);

    if (!rawUrl || !parsed) return null;

    return (
      <>
        {!isControlled && (
          <button
            type="button"
            onClick={() => setInternalIsOpen(true)}
            className={
              triggerClassName ||
              "inline-flex items-center gap-1 sm:gap-1.5 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-white px-2 min-[380px]:px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-sm font-semibold shadow transition-all active:scale-95 cursor-pointer flex-shrink-0 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            }
          >
            <Film className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span className="sm:hidden">Trailer</span>
            <span className="hidden sm:inline">Xem Trailer</span>
          </button>
        )}

        <BaseModal
          isOpen={Boolean(isOpen)}
          onClose={handleClose}
          size="4xl"
          headerClassName="bg-zinc-900/70"
          bodyClassName="p-0 overflow-hidden"
          title={`Trailer: ${title}`}
          icon={<Film className="w-4 h-4 sm:w-5 sm:h-5 text-netflix-red" />}
          footer={
            parsed.videoId ? (
              <a
                href={`https://www.youtube.com/watch?v=${parsed.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở YouTube</span>
              </a>
            ) : null
          }
        >
          {/* VIDEO IFRAME & LOADING STATE */}
          <div translate="no" className="notranslate relative aspect-video w-full bg-black overflow-hidden">
            {isIframeLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white z-10 gap-3 p-4">
                <Loader2 className="w-8 h-8 text-netflix-red animate-spin" />
                <span className="text-xs sm:text-sm text-zinc-400 font-medium">Đang tải Trailer...</span>
                {loadTimeout && parsed.videoId && (
                  <div className="mt-2 text-center animate-in fade-in duration-300">
                    <p className="text-xs text-zinc-500 mb-2">Trình duyệt hoặc trình chặn quảng cáo có thể đang cản trở video nhúng.</p>
                    <a
                      href={`https://www.youtube.com/watch?v=${parsed.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs font-semibold shadow transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem trực tiếp trên YouTube</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            <iframe
              src={parsed.embedUrl}
              translate="no"
              title={`Trailer ${title}`}
              className={`notranslate w-full h-full border-0 transition-opacity duration-300 ${
                isIframeLoading ? "opacity-0" : "opacity-100"
              }`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setIsIframeLoading(false)}
            />
          </div>
        </BaseModal>
      </>
    );
  }
);

export const MediaTrailerModal = TrailerModal;
export default TrailerModal;

