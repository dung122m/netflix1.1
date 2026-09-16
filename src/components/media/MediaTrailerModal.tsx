"use client";

import React, { useEffect } from "react";
import { Film, X } from "lucide-react";

interface MediaTrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  modalTrailerUrl: string | null;
}

export const MediaTrailerModal: React.FC<MediaTrailerModalProps> = React.memo(
  function MediaTrailerModal({ isOpen, onClose, title, modalTrailerUrl }) {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isOpen) {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !modalTrailerUrl) return null;

    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl bg-zinc-950 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-white/10 bg-zinc-900/80">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-netflix-red" />
              <h3 className="text-white font-bold text-sm sm:text-base truncate">
                Trailer: {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative aspect-video w-full bg-black">
            <iframe
              src={modalTrailerUrl}
              title={`Trailer ${title}`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    );
  }
);
