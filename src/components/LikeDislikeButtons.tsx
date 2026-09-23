"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import {
  getMovieReaction,
  toggleLike,
  toggleDislike,
  MovieReaction,
  MovieReactionMetadata,
} from "@/lib/movieReactions";
import { toast } from "@/components/Toast";

export interface LikeDislikeButtonsProps {
  slug: string;
  movieMeta?: MovieReactionMetadata;
  variant?: "card" | "detail" | "compact" | "player";
  className?: string;
  onReactionChange?: (reaction: MovieReaction) => void;
}

export const LikeDislikeButtons: React.FC<LikeDislikeButtonsProps> = ({
  slug,
  movieMeta,
  variant = "card",
  className = "",
  onReactionChange,
}) => {
  const [reaction, setReaction] = useState<MovieReaction>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setReaction(getMovieReaction(slug));

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ slug?: string; reaction?: MovieReaction }>;
      if (!customEvent.detail || !customEvent.detail.slug || customEvent.detail.slug === slug) {
        setReaction(getMovieReaction(slug));
      }
    };

    window.addEventListener("movie-reaction-updated", handleSync);
    return () => {
      window.removeEventListener("movie-reaction-updated", handleSync);
    };
  }, [slug]);

  const handleLikeClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const next = await toggleLike(slug, movieMeta);
      setReaction(next);
      onReactionChange?.(next);

      if (next === "like") {
        toast.success(
          movieMeta?.title
            ? `Đã thích "${movieMeta.title}"! Nanaflix sẽ gợi ý thêm phim tương tự.`
            : "Đã thích phim! Nanaflix sẽ gợi ý thêm phim tương tự."
        );
      } else {
        toast.info("Đã bỏ thích.");
      }
    },
    [slug, movieMeta, onReactionChange]
  );

  const handleDislikeClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const next = await toggleDislike(slug, movieMeta);
      setReaction(next);
      onReactionChange?.(next);

      if (next === "dislike") {
        toast.info(
          movieMeta?.title
            ? `Đã đánh dấu không thích "${movieMeta.title}". Phim sẽ được ẩn khỏi mục đề xuất.`
            : "Đã đánh dấu không thích. Phim sẽ được ẩn khỏi mục đề xuất."
        );
      } else {
        toast.info("Đã bỏ đánh dấu không thích.");
      }
    },
    [slug, movieMeta, onReactionChange]
  );

  if (!mounted) {
    if (variant === "detail") {
      return (
        <div className={`inline-flex items-center gap-1.5 ${className}`}>
          <div className="h-8 w-20 rounded-lg bg-zinc-900/60 border border-white/10 animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-zinc-900/60 border border-white/10 animate-pulse" />
        </div>
      );
    }
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className="h-8 w-8 rounded-full bg-zinc-800/80 border border-white/20 animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-zinc-800/80 border border-white/20 animate-pulse" />
      </div>
    );
  }

  const isLiked = reaction === "like";
  const isDisliked = reaction === "dislike";

  // ============================================================
  // 1. DETAIL VARIANT: Thanh công cụ trang chi tiết phim
  // ============================================================
  if (variant === "detail") {
    return (
      <div className={`inline-flex items-center gap-1.5 flex-shrink-0 ${className}`}>
        {/* Nút Thích */}
        <button
          type="button"
          onClick={handleLikeClick}
          title={isLiked ? "Bỏ thích" : "Thích phim này"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95 flex-shrink-0 ${
            isLiked
              ? "bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-sm"
              : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
          }`}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${isLiked ? "fill-rose-400 text-rose-400" : ""}`} />
          <span>{isLiked ? "Đã thích" : "Thích"}</span>
        </button>

        {/* Nút Không thích */}
        <button
          type="button"
          onClick={handleDislikeClick}
          title={isDisliked ? "Bỏ đánh dấu không thích" : "Không thích (Ẩn khỏi đề xuất)"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer active:scale-95 flex-shrink-0 ${
            isDisliked
              ? "bg-zinc-800 text-zinc-300 border-zinc-500 shadow-sm"
              : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
          }`}
        >
          <ThumbsDown className={`h-3.5 w-3.5 ${isDisliked ? "fill-zinc-300 text-zinc-300" : ""}`} />
          <span>{isDisliked ? "Đã ẩn" : "Không thích"}</span>
        </button>
      </div>
    );
  }

  // ============================================================
  // 2. PLAYER TOOLBAR VARIANT: Thanh công cụ dưới trình phát
  // ============================================================
  if (variant === "player") {
    return (
      <div className={`inline-flex items-center gap-1 flex-shrink-0 ${className}`}>
        <button
          type="button"
          onClick={handleLikeClick}
          title={isLiked ? "Bỏ thích" : "Thích phim"}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${
            isLiked
              ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
              : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
          }`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-400 text-rose-400" : ""}`} />
        </button>
        <button
          type="button"
          onClick={handleDislikeClick}
          title={isDisliked ? "Bỏ không thích" : "Không thích"}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${
            isDisliked
              ? "bg-zinc-800 text-zinc-300 border-zinc-500"
              : "bg-zinc-900/80 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10"
          }`}
        >
          <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? "fill-zinc-300 text-zinc-300" : ""}`} />
        </button>
      </div>
    );
  }

  // ============================================================
  // 3. CARD VARIANT (DEFAULT): Hàng nút tròn trong MediaCard preview
  // ============================================================
  return (
    <div className={`flex items-center gap-1.5 flex-shrink-0 ${className}`}>
      {/* Nút Like tròn */}
      <button
        type="button"
        onClick={handleLikeClick}
        title={isLiked ? "Đã thích" : "Thích"}
        className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
          isLiked
            ? "bg-netflix-red text-white border-netflix-red shadow-lg"
            : "border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10"
        }`}
      >
        <ThumbsUp className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
      </button>

      {/* Nút Dislike tròn */}
      <button
        type="button"
        onClick={handleDislikeClick}
        title={isDisliked ? "Không thích (Ẩn khỏi gợi ý)" : "Không thích"}
        className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
          isDisliked
            ? "bg-zinc-700 text-zinc-200 border-zinc-500 shadow-lg"
            : "border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10"
        }`}
      >
        <ThumbsDown className={`h-3.5 w-3.5 ${isDisliked ? "fill-current" : ""}`} />
      </button>
    </div>
  );
};

export default LikeDislikeButtons;
