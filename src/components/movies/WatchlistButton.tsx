"use client";

import React, { useState, useEffect } from "react";
import { Bookmark, Check } from "lucide-react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { toast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";

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
    itemType?: "movie" | "series" | "episode";
    seriesSlug?: string;
    seriesTitle?: string;
    episodeSlug?: string;
    episodeName?: string;
    seasonName?: string;
  };
  variant?: "badge" | "button" | "icon" | "player";
  className?: string;
  label?: string;
  mobileLabel?: string;
  savedLabel?: string;
  savedMobileLabel?: string;
}

export const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  movie,
  variant = "badge",
  className = "",
  label,
  mobileLabel,
  savedLabel,
  savedMobileLabel,
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
      poster: movie.poster || movie.imageUrl,
      year: movie.year,
      genre: movie.genre || movie.category,
      category: movie.category || movie.genre,
      quality: movie.quality,
      time: movie.time,
      itemType: movie.itemType,
      seriesSlug: movie.seriesSlug,
      seriesTitle: movie.seriesTitle,
      episodeSlug: movie.episodeSlug,
      episodeName: movie.episodeName,
      seasonName: movie.seasonName,
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
        className={`inline-flex items-center gap-1.5 rounded-lg  bg-zinc-900/60 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-zinc-500 opacity-60 flex-shrink-0 whitespace-nowrap ${className}`}
      >
        <Bookmark className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="whitespace-nowrap sm:hidden">{mobileLabel || "Lưu"}</span>
        <span className="whitespace-nowrap hidden sm:inline">{label || "Lưu"}</span>
      </button>
    );
  }

  // Variant dành riêng cho thanh công cụ dưới Player
  if (variant === "player") {
    return (
      <Tooltip content={inList ? "Bỏ lưu khỏi danh sách yêu thích" : "Lưu vào danh sách yêu thích"} side="top">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={inList ? "Bỏ lưu khỏi danh sách yêu thích" : "Lưu vào danh sách yêu thích"}
          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg transition cursor-pointer text-xs active:scale-95 whitespace-nowrap ${
            inList
              ? "bg-netflix-red/20 text-netflix-red font-semibold shadow-sm"
              : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white"
          } ${className}`}
        >
          {inList ? (
            <>
              <Check className="w-3.5 h-3.5 text-amber-400" />
              <span>{savedLabel || (label ? `Đã lưu` : "Đã lưu")}</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>{label || "Lưu"}</span>
            </>
          )}
        </button>
      </Tooltip>
    );
  }

  // Variant nút bấm chính (Badge / Action Toolbar trên trang chi tiết phim)
  return (
    <Tooltip content={inList ? "Đã lưu vào danh sách yêu thích" : "Thêm vào danh sách yêu thích"} side="top">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={inList ? "Đã lưu vào danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
        className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-lg transition-all cursor-pointer active:scale-95 px-2 min-[380px]:px-2.5 sm:px-3.5 py-2 sm:py-1.5 text-xs sm:text-sm font-medium shadow-sm flex-shrink-0 whitespace-nowrap ${
          inList
            ? "bg-netflix-red/20 text-netflix-red hover:bg-netflix-red/30"
            : "bg-zinc-900/80 text-zinc-200 hover:bg-white/10 hover:text-white"
        } ${className}`}
      >
        {inList ? (
          <>
            <Check className="w-4 h-4 text-netflix-red flex-shrink-0" />
            <span className="whitespace-nowrap sm:hidden">{savedMobileLabel || "Đã lưu"}</span>
            <span className="whitespace-nowrap hidden sm:inline">{savedLabel || (label ? "Đã lưu" : "Đã lưu")}</span>
          </>
        ) : (
          <>
            <Bookmark className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
            <span className="whitespace-nowrap sm:hidden">{mobileLabel || "Lưu"}</span>
            <span className="whitespace-nowrap hidden sm:inline">{label || "Yêu thích"}</span>
          </>
        )}
      </button>
    </Tooltip>
  );
};

export default WatchlistButton;
