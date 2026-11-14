"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { isFavoriteActor, toggleFavoriteActor } from "@/lib/favoriteActors";
import { toast } from "@/components/ui/Toast";

export interface FavoriteActorButtonProps {
  id: string | number;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  country?: string;
  roles?: string;
  totalMovies?: number;
  variant?: "button" | "icon";
  className?: string;
}

export const FavoriteActorButton: React.FC<FavoriteActorButtonProps> = ({
  id,
  name,
  slug,
  avatarUrl,
  country,
  roles,
  totalMovies,
  variant = "button",
  className = "",
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsFavorited(isFavoriteActor(id) || isFavoriteActor(slug));

    const handleUpdate = () => {
      setIsFavorited(isFavoriteActor(id) || isFavoriteActor(slug));
    };

    window.addEventListener("favorite-actors-updated", handleUpdate);
    return () => {
      window.removeEventListener("favorite-actors-updated", handleUpdate);
    };
  }, [id, slug]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const nextState = toggleFavoriteActor({
        id,
        name,
        slug,
        avatarUrl,
        country,
        roles,
        totalMovies,
      });

      setIsFavorited(nextState);

      if (nextState) {
        toast.success(`Đã thêm ${name} vào danh sách yêu thích`);
      } else {
        toast.info(`Đã bỏ ${name} khỏi danh sách yêu thích`);
      }
    },
    [id, name, slug, avatarUrl, country, roles, totalMovies]
  );

  if (!mounted) {
    if (variant === "icon") {
      return (
        <span
          className={`inline-flex items-center justify-center p-2 rounded-full bg-black/50 text-zinc-400 ${className}`}
          aria-hidden="true"
        >
          <Heart className="w-3.5 h-3.5" />
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] text-zinc-400 text-xs sm:text-sm font-semibold ${className}`}
        aria-hidden="true"
      >
        <Heart className="w-4 h-4" />
        <span>Yêu thích</span>
      </span>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={isFavorited ? `Bỏ yêu thích ${name}` : `Thêm ${name} vào yêu thích`}
        aria-label={isFavorited ? `Bỏ yêu thích ${name}` : `Thêm ${name} vào yêu thích`}
        className={`group/btn relative inline-flex items-center justify-center p-2 rounded-full backdrop-blur-md transition-all duration-300 active:scale-90 ${
          isFavorited
            ? "bg-rose-500/30 text-rose-400 hover:bg-rose-500/40 ring-1 ring-rose-500/40 !opacity-100"
            : "bg-black/60 text-zinc-300 hover:bg-black/90 hover:text-white"
        } ${className}`}
      >
        <Heart
          className={`w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:scale-110 ${
            isFavorited ? "fill-rose-500 text-rose-500" : ""
          }`}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFavorited}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 active:scale-95 cursor-pointer backdrop-blur-md shadow-lg ${
        isFavorited
          ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 ring-1 ring-rose-500/40 shadow-rose-950/20"
          : "bg-white/[0.08] hover:bg-white/[0.14] text-zinc-100 hover:text-white"
      } ${className}`}
    >
      <Heart
        className={`w-4 h-4 transition-transform duration-300 ${
          isFavorited ? "fill-rose-500 text-rose-500 scale-110" : "text-zinc-300"
        }`}
      />
      <span>{isFavorited ? "Đã yêu thích" : "Yêu thích"}</span>
    </button>
  );
};
