"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { Play, Trash2, FolderPlus, Film } from "lucide-react";
import { removeFromWatchlist } from "@/lib/watchlist";
import {
  toOptimizedCardPosterUrl,
  sanitizeImageUrl,
  formatGenreName,
  formatCountryName,
} from "@/lib/movieMedia";
import { useAuth } from "@/context/AuthContext";
import { AddToCollectionModal } from "@/components/Collections/AddToCollectionModal";
import { AuthModal } from "@/components/AuthModal";
import { toast } from "@/components/Toast";

import { useMoviePosterFallback } from "@/hooks/useMoviePosterFallback";

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

    // Ưu tiên TMDb CDN (image.tmdb.org) lên đầu tiên
    return list.sort((a, b) => {
      const aTmdb = a.includes("image.tmdb.org");
      const bTmdb = b.includes("image.tmdb.org");
      if (aTmdb && !bTmdb) return -1;
      if (!aTmdb && bTmdb) return 1;
      return 0;
    });
  }, [poster, imageUrl]);

  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const baseSrc = candidateImages[currentImgIndex] || toOptimizedCardPosterUrl(imageUrl);

  // Tự động nâng cấp poster sang TMDb nếu ảnh hiện tại là phimimg.com
  const { displaySrc: currentSrc } = useMoviePosterFallback({
    slug,
    title,
    year,
    initialSrc: baseSrc,
  });

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

  const displayTag = formatGenreName(genre) || formatCountryName(country) || "";
  const displayYear = year ? String(year).trim() : "";
  const displayQuality = (() => {
    if (!quality || quality.includes("N/A")) return "";
    const clean = quality.trim().toUpperCase();
    if (clean.includes("4K") || clean.includes("UHD")) return "4K";
    if (clean.includes("CAM")) return "CAM";
    if (
      clean.includes("FHD") ||
      clean.includes("1080") ||
      clean.includes("HD") ||
      clean.includes("720") ||
      clean === "FULL"
    ) {
      return "";
    }
    return "";
  })();

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
    if (episodeName) {
      const trimmed = episodeName.trim();
      if (/^(full|bản full|tap-full)$/i.test(trimmed)) return null;
      return trimmed;
    }
    const epSlug = episodeSlug || (slug.includes("__ep__") ? slug.split("__ep__")[1] : "");
    if (!epSlug || /^(full|tap-full)$/i.test(epSlug.trim())) return null;
    const numMatch = epSlug.match(/(\d+)/);
    return numMatch ? `Tập ${numMatch[1]}` : null;
  }, [isEpisode, episodeName, episodeSlug, slug]);

  if (isRemoving) {
    return null;
  }

  return (
    <div className="group/card relative flex flex-col w-full select-none cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 hover:z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none">
      {/* 1. KHỐI POSTER DỌC 2:3 CHUẨN MEDIACARD TRANG CHỦ */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 group-hover/card: group-hover/card:ring-netflix-red group-hover/card:ring-inset group-hover/card:shadow-[0_12px_28px_rgba(229,9,20,0.35),0_0_16px_rgba(0,0,0,0.8)] transition-all duration-300">
        <Link
          href={targetHref}
          className="block absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-white rounded-xl"
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
              className={`w-full h-full object-cover object-center group-hover/card:scale-105 transition-transform duration-500 ease-out ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setIsImageLoaded(true)}
              onError={handleImageError}
            />
          )}

          {/* Lớp gradient điện ảnh che phủ */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </Link>

        {/* NÚT PLAY HERO Ở TRUNG TÂM KHI HOVER */}
        <Link
          href={targetHref}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-netflix-red text-white flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.8)] opacity-0 group-hover/card:opacity-100 transform scale-75 group-hover/card:scale-100 transition-all duration-200 ease-out">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
          </div>
        </Link>

        {/* NÚT BỘ SƯU TẬP (GÓC TRÊN TRÁI) */}
        <div className="absolute top-2 left-2 z-20">
          <button
            type="button"
            onClick={handleOpenCollection}
            title="Thêm vào bộ sưu tập"
            aria-label={`Thêm phim ${title} vào bộ sưu tập`}
            className="w-7 h-7 rounded-full bg-black/75 hover:bg-amber-400 hover:text-black text-amber-400 backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* NÚT XÓA KHỎI YÊU THÍCH (GÓC TRÊN PHẢI) */}
        <div className="absolute top-2 right-2 z-20">
          <button
            type="button"
            onClick={handleRemove}
            title="Xóa khỏi danh sách yêu thích"
            aria-label={`Xóa phim ${title} khỏi danh sách`}
            className="w-7 h-7 rounded-full bg-black/75 hover:bg-netflix-red hover:border-netflix-red hover:text-white text-zinc-300 backdrop-blur-md flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 active:scale-90 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* HUY HIỆU TẬP / SERIES (GÓC DƯỚI TRÁI) */}
        {isEpisode && episodeBadgeText ? (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-black shadow-md">
              {episodeBadgeText}
            </span>
          </div>
        ) : !isEpisode && isSeries ? (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-600/90 text-white shadow-md border border-purple-400/30">
              Trọn bộ
            </span>
          </div>
        ) : null}

        {/* HUY HIỆU ĐỊNH DẠNG / CHẤT LƯỢNG GÓC DƯỚI PHẢI */}
        {displayQuality && (
          <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-amber-300 shadow-sm">
              {displayQuality}
            </span>
          </div>
        )}
      </div>

      {/* 2. THÔNG TIN PHIM DƯỚI POSTER (TITLE & METADATA CHUẨN MEDIACARD) */}
      <div className="pt-2 sm:pt-2.5 pb-1 flex flex-col gap-0.5 sm:gap-1">
        <Link
          href={targetHref}
          className="text-xs sm:text-[13px] md:text-sm font-semibold text-zinc-100 truncate group-hover/card:text-rose-400 transition-colors leading-snug"
          title={title}
        >
          {title}
        </Link>

        {/* Dải thông tin bổ trợ: Năm · Thể loại · Thời lượng */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
          {displayYear && (
            <span className="text-zinc-300 font-sans tabular-nums font-medium shrink-0">
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
