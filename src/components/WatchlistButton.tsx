"use client";

import React, { useState, useEffect } from "react";
import { Bookmark, Check } from "lucide-react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { toast } from "@/components/Toast";

interface WatchlistButtonProps {
  movie: {
    slug: string;
    title: string;
    poster?: string;
    imageUrl?: string;
    year?: string | number;
    quality?: string;
    category?: string;
    genre?: string;
    time?: string;
  };
  variant?: "badge" | "button" | "icon" | "player";
  className?: string;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  movie,
  variant = "badge",
  className = "",
}) => {
  const [inList, setInList] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInList(isInWatchlist(movie.slug));

    const handleSync = () => {
      setInList(isInWatchlist(movie.slug));
    };

    window.addEventListener("watchlist-updated", handleSync);
    return () => {
      window.removeEventListener("watchlist-updated", handleSync);
    };
  }, [movie.slug]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const added = toggleWatchlist({
      slug: movie.slug,
      title: movie.title,
      imageUrl: movie.imageUrl || movie.poster || "/default-poster.jpg",
      year: movie.year,
      genre: movie.genre || movie.category,
      time: movie.time,
    });

    setInList(added);
    if (added) {
      toast.success(`Đã thêm "${movie.title}" vào Danh sách yêu thích!`);
    } else {
      toast.info(`Đã xóa khỏi Danh sách yêu thích.`);
    }
  };

  if (!mounted) {
    // Skeleton placeholder to prevent hydration layout shift
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-medium text-gray-500 opacity-60 flex-shrink-0 ${className}`}
      >
        <Bookmark className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="hidden sm:inline">Yêu thích</span>
      </button>
    );
  }

  // Variant dành riêng cho thanh công cụ dưới Player
  if (variant === "player") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        title={inList ? "Bỏ lưu khỏi Danh sách yêu thích" : "Lưu vào Danh sách yêu thích"}
        className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border transition cursor-pointer text-xs active:scale-95 ${
          inList
            ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold shadow-sm"
            : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
        } ${className}`}
      >
        {inList ? (
          <>
            <Check className="w-3.5 h-3.5 text-amber-400" />
            <span>Đã lưu</span>
          </>
        ) : (
          <>
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Yêu thích</span>
          </>
        )}
      </button>
    );
  }

  // Variant nút bấm chính (Badge / Action Toolbar trên trang chi tiết phim)
  return (
    <button
      type="button"
      onClick={handleToggle}
      title={inList ? "Đã lưu vào danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium shadow-sm flex-shrink-0 ${
        inList
          ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
          : "border-white/15 bg-zinc-900/80 text-gray-200 hover:bg-white/10 hover:text-white"
      } ${className}`}
    >
      {inList ? (
        <>
          <Check className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <span className="hidden xs:inline sm:inline">Đã lưu</span>
        </>
      ) : (
        <>
          <Bookmark className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
          <span className="hidden xs:inline sm:inline">Yêu thích</span>
        </>
      )}
    </button>
  );
};
