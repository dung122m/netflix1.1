"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { Play, Trash2, FolderPlus, Film } from "lucide-react";
import { removeFromWatchlist } from "@/lib/watchlist";
import {
  toOptimizedCardPosterUrl,
  sanitizeImageUrl,
  formatGenreName,
} from "@/lib/movieMedia";
import { useAuth } from "@/context/AuthContext";
import { AddToCollectionModal } from "@/components/Collections/AddToCollectionModal";
import { AuthModal } from "@/components/AuthModal";
import { toast } from "@/components/Toast";

export interface WatchlistCardProps {
  slug: string;
  title: string;
  imageUrl: string;
  poster?: string;
  year?: string | number;
  genre?: string;
  quality?: string;
  time?: string;
  country?: string;
  type_name?: string;
  priority?: boolean;
  itemType?: "movie" | "series" | "episode";
  seriesSlug?: string;
  seriesTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  seasonName?: string;
}

export const WatchlistCard: React.FC<WatchlistCardProps> = ({
  slug,
  title,
  imageUrl,
  poster,
  year,
  genre,
  quality,
  time,
  country,
  type_name,
  priority = false,
  itemType,
  seriesSlug,
  seriesTitle,
  episodeSlug,
  episodeName,
  seasonName,
}) => {
  const { user } = useAuth();
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Xây dựng danh sách ảnh dự phòng: poster chuẩn -> imageUrl -> fallback
  const candidateImages = React.useMemo(() => {
    const list: string[] = [];
    const addUrl = (u?: string) => {
      if (!u || typeof u !== "string" || !u.trim()) return;
      const clean = toOptimizedCardPosterUrl(u);
      if (clean && !list.includes(clean)) list.push(clean);
      const raw = sanitizeImageUrl(u);
      if (raw && !list.includes(raw)) list.push(raw);
    };
    addUrl(poster);
    addUrl(imageUrl);
    return list;
  }, [poster, imageUrl]);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const currentSrc = candidateImages[currentImgIndex] || imageUrl;

  const handleImageError = () => {
    if (currentImgIndex < candidateImages.length - 1) {
      setCurrentImgIndex((prev) => prev + 1);
    } else {
      setImageError(true);
    }
  };

  // Nút xóa khỏi yêu thích (Quick Remove)
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsRemoving(true);
      removeFromWatchlist(slug);
      toast.info(`Đã xóa "${title}" khỏi danh sách yêu thích.`);
    },
    [slug, title]
  );

  // Mở modal thêm vào bộ sưu tập
  const handleOpenCollection = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      setShowCollectionModal(true);
    },
    [user]
  );

  const displayTag = formatGenreName(genre) || country || "";
  const displayYear = year ? String(year).trim() : "";
  const displayQuality = quality && !quality.includes("N/A") ? quality.trim().toUpperCase() : "";

  const isEpisode = itemType === "episode" || Boolean(episodeSlug) || slug.includes("__ep__");
  const isSeries = itemType === "series" || type_name === "series" || (genre && genre.toLowerCase().includes("series"));

  const targetHref = React.useMemo(() => {
    if (isEpisode) {
      const sSlug = seriesSlug || (slug.includes("__ep__") ? slug.split("__ep__")[0] : slug);
      const epSlug = episodeSlug || (slug.includes("__ep__") ? slug.split("__ep__")[1] : "");
      return epSlug ? `/movies/${sSlug}?ep=${encodeURIComponent(epSlug)}` : `/movies/${sSlug}`;
    }
    return `/movies/${slug}`;
  }, [isEpisode, seriesSlug, episodeSlug, slug]);

  const episodeBadgeText = React.useMemo(() => {
    if (!isEpisode) return null;
    if (episodeName) return episodeName;
    const epSlug = episodeSlug || (slug.includes("__ep__") ? slug.split("__ep__")[1] : "");
    if (!epSlug) return "Tập phim";
    const numMatch = epSlug.match(/(\d+)/);
    return numMatch ? `Tập ${numMatch[1]}` : epSlug;
  }, [isEpisode, episodeName, episodeSlug, slug]);

  if (isRemoving) {
    return null;
  }

  return (
    <div className="group relative flex flex-col w-full rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-red-500/50 shadow-[0_8px_25px_rgba(0,0,0,0.7)] hover:shadow-[0_16px_40px_rgba(229,9,20,0.3)] transition-all duration-300 hover:-translate-y-1.5 overflow-hidden select-none">
      {/* 1. KHỐI POSTER NGHỆ THUẬT (2:3 CANVASS) */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
        <Link
          href={targetHref}
          className="block absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={`Xem phim ${title}`}
        >
          {/* Skeleton placeholder */}
          {!imageError && !isImageLoaded && (
            <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center animate-pulse z-0">
              <Film className="w-8 h-8 text-zinc-700" />
            </div>
          )}

          {imageError || !currentSrc ? (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-3 text-center">
              <Film className="w-8 h-8 text-zinc-500 mb-2" />
              <span className="text-[11px] font-bold text-zinc-400 line-clamp-2 px-1">
                {title}
              </span>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={currentSrc}
              alt={title}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setIsImageLoaded(true)}
              onError={handleImageError}
            />
          )}

          {/* Lớp gradient điện ảnh che phủ */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </Link>

        {/* NÚT BỘ SƯU TẬP (GÓC TRÊN TRÁI) */}
        <div className="absolute top-2.5 left-2.5 z-20">
          <button
            type="button"
            onClick={handleOpenCollection}
            title="Thêm vào bộ sưu tập"
            aria-label={`Thêm phim ${title} vào bộ sưu tập`}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 hover:bg-amber-400 hover:text-black border border-white/20 text-amber-400 backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* NÚT XÓA KHỎI YÊU THÍCH (GÓC TRÊN PHẢI) */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <button
            type="button"
            onClick={handleRemove}
            title="Xóa khỏi danh sách yêu thích"
            aria-label={`Xóa phim ${title} khỏi danh sách`}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 hover:bg-netflix-red hover:border-netflix-red hover:text-white border border-white/20 text-zinc-300 backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* NÚT PLAY HERO Ở TRUNG TÂM KHI HOVER */}
        <Link
          href={targetHref}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-netflix-red text-white flex items-center justify-center shadow-[0_0_25px_rgba(229,9,20,0.85)] opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 ease-out">
            <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
          </div>
        </Link>

        {/* HUY HIỆU TẬP / SERIES (GÓC DƯỚI TRÁI) */}
        {isEpisode && episodeBadgeText ? (
          <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black shadow-md border border-amber-300/40">
              {episodeBadgeText}
            </span>
          </div>
        ) : !isEpisode && isSeries ? (
          <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-purple-600/90 text-white shadow-md border border-purple-400/30">
              Trọn bộ
            </span>
          </div>
        ) : null}

        {/* HUY HIỆU ĐỊNH DẠNG / CHẤT LƯỢNG GÓC DƯỚI */}
        {displayQuality && (
          <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/30 shadow-sm">
              {displayQuality}
            </span>
          </div>
        )}
      </div>

      {/* 2. KHỐI THÔNG TIN VÀ NÚT HÀNH ĐỘNG DƯỚI POSTER */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2.5 bg-gradient-to-b from-zinc-900/90 to-zinc-950">
        <div>
          <Link
            href={targetHref}
            className="block text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-red-400 transition-colors"
            title={title}
          >
            {title}
          </Link>

          {/* Dải thông tin bổ trợ: Năm · Thể loại · Thời lượng */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1 overflow-hidden">
            {displayYear && (
              <span className="text-zinc-300 font-mono font-medium shrink-0">
                {displayYear}
              </span>
            )}
            {displayYear && displayTag && (
              <span className="text-zinc-600 select-none shrink-0">·</span>
            )}
            {displayTag && (
              <span className="truncate text-zinc-400">{displayTag}</span>
            )}
            {time && (
              <>
                <span className="text-zinc-600 select-none shrink-0">·</span>
                <span className="truncate text-zinc-400">{time}</span>
              </>
            )}
          </div>
        </div>

        {/* Nút Xem phim trực tiếp */}
        <Link
          href={targetHref}
          className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-netflix-red text-white text-xs font-semibold border border-white/10 hover:border-netflix-red transition-all duration-200 shadow-sm active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Xem ngay</span>
        </Link>
      </div>

      {/* Modal Bộ sưu tập & Đăng nhập */}
      {showCollectionModal && (
        <AddToCollectionModal
          isOpen={true}
          onClose={() => setShowCollectionModal(false)}
          movie={{
            slug,
            title,
            poster: currentSrc || "/default-poster.jpg",
            year,
            quality,
            category: genre,
            itemType,
            seriesSlug,
            seriesTitle,
            episodeSlug,
            episodeName,
            seasonName,
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal
          isOpen={true}
          onClose={() => setShowAuthModal(false)}
          customTitle="Đăng nhập để thêm phim vào bộ sưu tập"
        />
      )}
    </div>
  );
};
