"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Film, X } from "lucide-react";
import { extractYoutubeId } from "@/lib/trailerHelper";
import { useBodyScrollLock } from "@/lib/scrollLock";

export interface TrailerModalProps {
  title: string;
  trailerUrl?: string | null;
  modalTrailerUrl?: string | null;
  /** Chế độ Controlled: điều khiển đóng mở từ component cha */
  isOpen?: boolean;
  onClose?: () => void;
  triggerClassName?: string;
}

function getYoutubeEmbedUrl(url: string): string | null {
  if (url.includes("youtube-nocookie.com/embed/")) {
    return url;
  }
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0`;
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
    const [mounted, setMounted] = useState(false);
    const isControlled = typeof controlledIsOpen === "boolean";
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

    useBodyScrollLock(Boolean(isOpen && mounted));

    useEffect(() => {
      setMounted(true);
    }, []);

    const handleClose = useCallback(() => {
      if (isControlled) {
        onClose?.();
      } else {
        setInternalIsOpen(false);
      }
    }, [isControlled, onClose]);

    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          handleClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen, handleClose]);

    const rawUrl = modalTrailerUrl || trailerUrl;
    if (!rawUrl) return null;

    const embedUrl = getYoutubeEmbedUrl(rawUrl);
    if (!embedUrl) return null;

    return (
      <>
        {!isControlled && (
          <button
            type="button"
            onClick={() => setInternalIsOpen(true)}
            className={
              triggerClassName ||
              "inline-flex items-center gap-1.5 rounded-lg bg-netflix-red hover:bg-red-700 text-white px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold shadow transition-all active:scale-95 cursor-pointer flex-shrink-0 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            }
          >
            <Film className="w-3.5 h-3.5 text-white flex-shrink-0" />
            <span className="sm:hidden">Trailer</span>
            <span className="hidden sm:inline">Xem Trailer</span>
          </button>
        )}

        {isOpen && mounted &&
          createPortal(
            <div
              onClick={handleClose}
              className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="trailer-modal-title"
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-4xl my-auto bg-zinc-950 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200 transform-gpu will-change-[transform,opacity]"
              >
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-white/10 bg-zinc-900/70">
                  <div className="flex items-center gap-2 min-w-0">
                    <Film className="w-4 h-4 sm:w-5 sm:h-5 text-netflix-red flex-shrink-0" />
                    <h3
                      id="trailer-modal-title"
                      className="text-white font-bold text-sm sm:text-base truncate max-w-[500px]"
                    >
                      Trailer: {title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer flex-shrink-0"
                    aria-label="Đóng trailer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* VIDEO IFRAME */}
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    src={embedUrl}
                    title={`Trailer ${title}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }
);

export const MediaTrailerModal = TrailerModal;
export default TrailerModal;
