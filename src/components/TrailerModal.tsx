"use client";

import React, { useState, useEffect } from "react";
import { Film, X } from "lucide-react";

interface TrailerModalProps {
  trailerUrl?: string | null;
  title: string;
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    if (url.includes("youtube.com/embed/")) {
      return url.includes("autoplay=1") ? url : `${url}?autoplay=1`;
    }
    // youtube.com/watch?v=ID
    if (url.includes("watch?v=")) {
      const videoId = new URL(url).searchParams.get("v");
      return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
        : null;
    }
    // youtu.be/ID
    if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0];
      return videoId
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
        : null;
    }
    return url;
  } catch {
    return null;
  }
}

export const TrailerModal: React.FC<TrailerModalProps> = ({
  trailerUrl,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!trailerUrl) return null;

  const embedUrl = getYoutubeEmbedUrl(trailerUrl);
  if (!embedUrl) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-500/50 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-3 py-1 text-xs sm:text-sm font-bold shadow-md shadow-red-950/50 transition-all hover:scale-105 active:scale-95 cursor-pointer"
      >
        <Film className="w-3.5 h-3.5 text-white" />
        <span>🎬 Xem Trailer</span>
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl overflow-hidden border border-white/15 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-netflix-red" />
                <h3 className="text-white font-bold text-sm sm:text-base truncate max-w-[500px]">
                  Trailer chính thức: {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
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
        </div>
      )}
    </>
  );
};

export default TrailerModal;
