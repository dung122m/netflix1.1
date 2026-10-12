"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  Plus,
  Check,
  Star,
  Film,
} from "lucide-react";
import { isInWatchlist, toggleWatchlist, subscribeToWatchlist } from "@/lib/watchlist";
import { detectMovieTypeName, toOptimizedCardPosterUrl, sanitizeImageUrl } from "@/lib/movieMedia";
import { TrailerModal } from "@/components/TrailerModal";
import { extractYoutubeId } from "@/lib/trailerHelper";

export interface MovieExtraInfo {
  actor?: string[];
  director?: string[];
  country?: string[];
  category?: string[];
  origin_name?: string;
  type?: string;
  time?: string;
  episode_current?: string;
  episode_total?: number;
  backdrop_url?: string;
}

// Bộ nhớ đệm client (giữ nguyên cho các component khác như HeroFeatured)
export const clientSynopsisCache = new Map<string, string>();
export const clientTrailerCache = new Map<string, string>();
export const clientExtraInfoCache = new Map<string, MovieExtraInfo>();

import { fetchMovieSynopsisShared } from "@/services/synopsisService";
export { fetchMovieSynopsisShared };
export { extractYoutubeId };

function getYoutubeModalUrl(url?: string | null): string | null {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0`;
}

export interface MediaCardProps {
  slug: string;
  title: string;
  origin_name?: string;
  imageUrl: string;
  posterUrl?: string;
  thumbUrl?: string;
  genre: string;
  description?: string;
  priority?: boolean;
  time?: string;
  year?: string | number;
  rating?: string | number;
  quality?: string;
  lang?: string;
  rank?: number;
  chieurap?: boolean;
  sub_docquyen?: boolean;
  actor?: string[];
  director?: string[];
  country?: string;
  type_name?: string;
  hasTrailer?: boolean;
  trailer_url?: string;
  isTrailerOnly?: boolean;
  matchSnippet?: string;
  matchType?: "title" | "actor" | "content";
}

const MediaCardInner: React.FC<MediaCardProps> = ({
  slug,
  title,
  origin_name,
  imageUrl,
  posterUrl,
  thumbUrl,
  genre,
  priority = false,
  time,
  year,
  rating,
  quality,
  lang,
  chieurap,
  sub_docquyen,
  country: initialCountry,
  type_name: initialTypeName,
  hasTrailer: initialHasTrailer = false,
  trailer_url: initialTrailerUrl,
  isTrailerOnly = false,
  matchSnippet,
}) => {
  const router = useRouter();
  const [inList, setInList] = useState(false);

  // Danh sách ảnh ứng viên cho Poster đứng 2:3: Ưu tiên posterUrl (ảnh dọc 2:3 chuẩn) -> imageUrl -> thumbUrl
  const imageCandidates = React.useMemo(() => {
    const list: string[] = [];
    const addUrl = (u?: string) => {
      if (!u || typeof u !== "string" || !u.trim()) return;
      const clean = toOptimizedCardPosterUrl(u);
      if (
        clean &&
        !list.includes(clean) &&
        !clean.includes("/undefined") &&
        !clean.includes("/null") &&
        !clean.startsWith("/default-")
      ) {
        list.push(clean);
      }
      const raw = sanitizeImageUrl(u);
      if (
        raw &&
        !list.includes(raw) &&
        !raw.includes("/undefined") &&
        !raw.includes("/null") &&
        !raw.startsWith("/default-")
      ) {
        if (!raw.includes("/upload/vod/")) {
          list.push(raw);
        }
      }
    };
    addUrl(posterUrl);
    addUrl(imageUrl);
    addUrl(thumbUrl);
    return list;
  }, [posterUrl, imageUrl, thumbUrl]);

  const attemptIndexRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string>(() => imageCandidates[0] || "");
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(() => imageCandidates.length === 0);

  const checkImageComplete = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete && node.naturalWidth > 0) {
      setIsImageLoaded(true);
    }
  }, []);

  useEffect(() => {
    attemptIndexRef.current = 0;
    const initial = imageCandidates[0] || "";

    if (!initial) {
      setHasError(true);
      setCurrentSrc("");
      setIsImageLoaded(false);
    } else {
      setHasError(false);
      setCurrentSrc(initial);
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setIsImageLoaded(true);
      } else {
        setIsImageLoaded(false);
      }
    }
  }, [imageCandidates]);

  const handleImageError = () => {
    attemptIndexRef.current += 1;
    const nextIdx = attemptIndexRef.current;

    if (nextIdx < imageCandidates.length) {
      setCurrentSrc(imageCandidates[nextIdx]);
      setIsImageLoaded(false);
      return;
    }

    // Tất cả ứng viên đều lỗi -> Chuyển sang fallback
    setHasError(true);
    setCurrentSrc("");
    setIsImageLoaded(true);
  };

  // Trạng thái Trailer & Modal Trailer (Chỉ kích hoạt khi bấm nút xem Trailer)
  const [trailerUrl, setTrailerUrl] = useState<string>(
    () => initialTrailerUrl || clientTrailerCache.get(slug) || ""
  );
  const [hasTrailerState, setHasTrailerState] = useState<boolean>(
    () => initialHasTrailer || Boolean(initialTrailerUrl) || isTrailerOnly || clientTrailerCache.has(slug)
  );
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  const baseCardRef = useRef<HTMLAnchorElement>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const navTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Đồng bộ Watchlist qua 1 shared listener duy nhất
  useEffect(() => {
    setInList(isInWatchlist(slug));
    const unsubscribe = subscribeToWatchlist(slug, (newInList) => {
      setInList(newInList);
    });

    return () => {
      unsubscribe();
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, [slug]);

  // Phím ESC đóng Trailer Modal
  useEffect(() => {
    if (!showTrailerModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowTrailerModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showTrailerModal]);

  const displayYear = year || "";
  const displayTime = time && typeof time === "string" && time.trim() && time.trim() !== "Đang cập nhật" && time.trim() !== "N/A" ? time.trim() : "";

  // Thẻ thông tin phụ (Thể loại / Thời lượng / Ngôn ngữ) gọn gàng, không bị cắt xén
  const displayTag = (() => {
    if (genre && typeof genre === "string" && genre.trim() && genre.trim() !== "Đang cập nhật" && genre.trim() !== "N/A") {
      const first = genre.split(/[,/]/)[0].trim();
      if (first) return first;
    }
    if (displayTime) {
      return displayTime.replace(/\s*phút.*$/i, "p");
    }
    if (lang && typeof lang === "string" && lang.trim()) {
      return lang.trim();
    }
    return "";
  })();

  // Bấm nút thêm/bỏ khỏi Watchlist
  const handleToggleList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = toggleWatchlist({
      slug,
      title,
      imageUrl: currentSrc || imageUrl,
      year: displayYear,
      genre,
      time: displayTime,
      country: initialCountry,
      type_name: initialTypeName,
    });
    setInList(nextState);
  };

  // Điều hướng chuyển trang khi click Movie Card
  const handleCardClick = (e: React.MouseEvent) => {
    // Để trình duyệt xử lý tự nhiên khi mở tab mới (Ctrl, Cmd, Shift, Alt, chuột giữa)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }

    // Nếu người dùng bật prefers-reduced-motion -> điều hướng trực tiếp không cần animation delay
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    e.preventDefault();
    if (isNavigating) return;

    setIsNavigating(true);

    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = setTimeout(() => {
      router.push(`/movies/${slug}`);
    }, 180);
  };

  // Xử lý khi nhấn nút Trailer: Tải trailer theo nhu cầu (nếu chưa có) và mở TrailerModal
  const handleTrailerClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let targetUrl = trailerUrl || clientTrailerCache.get(slug) || "";
    if (!targetUrl && slug) {
      setIsLoadingTrailer(true);
      try {
        const data = await fetchMovieSynopsisShared(slug);
        if (data?.trailer_url) {
          clientTrailerCache.set(slug, data.trailer_url);
          setTrailerUrl(data.trailer_url);
          setHasTrailerState(true);
          targetUrl = data.trailer_url;
        }
      } catch {
      } finally {
        setIsLoadingTrailer(false);
      }
    }
    setShowTrailerModal(true);
  };

  const modalTrailerUrl = trailerUrl
    ? getYoutubeModalUrl(trailerUrl)
    : clientTrailerCache.has(slug)
    ? getYoutubeModalUrl(clientTrailerCache.get(slug)!)
    : null;

  // Loại phim: Phim lẻ / Phim bộ / Hoạt hình / Phim rạp
  const displayType = (() => {
    if (initialTypeName && initialTypeName !== "Phim lẻ") {
      return initialTypeName;
    }
    return detectMovieTypeName({
      name: title,
      title,
      slug,
      origin_name,
      category: genre,
      time,
      chieurap,
      sub_docquyen,
      type: initialTypeName,
    });
  })();

  return (
    <div
      className="group/card relative aspect-[2/3] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-zinc-950 border border-white/[0.12] hover:border-white/35 transition-all duration-300 hover:scale-[1.025] hover:shadow-[0_16px_36px_rgba(0,0,0,0.85),0_0_20px_rgba(229,9,20,0.15)] select-none focus-within:ring-2 focus-within:ring-netflix-red"
      onMouseEnter={() => {
        if (slug) {
          router.prefetch(`/movies/${slug}`);
        }
      }}
    >
      {/* 1. LIÊN KẾT CHÍNH PHỦ TOÀN THẺ (A11Y + KEYBOARD FOCUS + CLICK MỞ PHIM) */}
      <Link
        ref={baseCardRef}
        href={`/movies/${slug}`}
        onClick={handleCardClick}
        tabIndex={0}
        aria-label={`Xem phim ${title}`}
        className={`block absolute inset-0 z-0 outline-none focus-visible:ring-4 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-xl sm:rounded-2xl ${
          isNavigating ? "movie-card-navigating" : ""
        }`}
      >
        {/* Placeholder skeleton khi ảnh đang tải */}
        {!hasError && !isImageLoaded && (
          <div
            className="absolute inset-0 bg-zinc-900 flex items-center justify-center pointer-events-none z-0 animate-pulse"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/60 via-zinc-900 to-zinc-950" />
            <Film className="w-8 h-8 text-zinc-700/50" />
          </div>
        )}

        {hasError || !currentSrc ? (
          <div
            className="absolute inset-0 bg-gradient-to-br from-zinc-800/90 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-3 select-none pointer-events-none"
            aria-hidden="true"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
              <Film className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-netflix-red" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-white/50 uppercase">
              NANAFLIX
            </span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={checkImageComplete}
            src={currentSrc}
            alt={title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover/card:scale-105 ${
              isImageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setIsImageLoaded(true)}
            onError={handleImageError}
          />
        )}
      </Link>

      {/* 2. CỤM HUY HIỆU ĐỈNH THẺ (HEADER 1 HÀNG, FROSTED GLASS CAO CẤP, TINH TẾ) */}
      <div className="absolute top-1.5 sm:top-2 inset-x-1.5 sm:inset-x-2 z-10 flex items-center justify-between gap-1 pointer-events-none">
        {/* Nhãn loại phim bên trái (Pill glassmorphism cao cấp, không icon thừa) */}
        <div className="shrink-0 flex items-center">
          {chieurap ? (
            <span className="inline-flex items-center bg-black/75 backdrop-blur-md text-amber-300 font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] shadow-sm border border-amber-500/35 whitespace-nowrap select-none">
              Phim Rạp
            </span>
          ) : sub_docquyen ? (
            <span className="inline-flex items-center bg-black/75 backdrop-blur-md text-purple-300 font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] shadow-sm border border-purple-500/35 whitespace-nowrap select-none">
              Độc Quyền
            </span>
          ) : displayType === "Phim bộ" ? (
            <span className="inline-flex items-center bg-black/75 backdrop-blur-md text-sky-300 font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] shadow-sm border border-sky-500/35 whitespace-nowrap select-none">
              Phim Bộ
            </span>
          ) : displayType === "Hoạt hình" ? (
            <span className="inline-flex items-center bg-black/75 backdrop-blur-md text-fuchsia-300 font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] shadow-sm border border-fuchsia-500/35 whitespace-nowrap select-none">
              Hoạt Hình
            </span>
          ) : displayType === "TV Shows" ? (
            <span className="inline-flex items-center bg-black/75 backdrop-blur-md text-emerald-300 font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] shadow-sm border border-emerald-500/35 whitespace-nowrap select-none">
              TV Shows
            </span>
          ) : (
            <span className="inline-flex items-center bg-black/75 backdrop-blur-md text-zinc-300 font-semibold px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] shadow-sm border border-white/20 whitespace-nowrap select-none">
              Phim Lẻ
            </span>
          )}
        </div>

        {/* Nhóm chất lượng + Watchlist trên cùng 1 hàng bên phải */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span
            className={`border font-semibold text-[9.5px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm backdrop-blur-md uppercase tracking-wider shrink-0 pointer-events-none ${
              (quality || "FHD").toUpperCase().includes("CAM")
                ? "bg-amber-950/90 border-amber-500/40 text-amber-300"
                : "bg-black/80 border-white/20 text-zinc-200"
            }`}
          >
            {quality || "FHD"}
          </span>

          {/* Nút Thêm vào danh sách (Watchlist) */}
          <button
            type="button"
            onClick={handleToggleList}
            title={inList ? "Đã thêm vào danh sách của tôi" : "Thêm vào danh sách của tôi"}
            aria-label={inList ? "Bỏ khỏi danh sách của tôi" : "Thêm vào danh sách của tôi"}
            className={`w-5.5 h-5.5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full backdrop-blur-md border transition-all cursor-pointer pointer-events-auto shadow-md active:scale-90 shrink-0 ${
              inList
                ? "bg-white text-black border-white"
                : "bg-black/80 text-zinc-300 border-white/20 hover:text-white hover:bg-black hover:scale-110"
            }`}
          >
            {inList ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 4. NÚT PLAY TRUNG TÂM NỔI BẬT KHI HOVER */}
      <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-netflix-red text-white flex items-center justify-center shadow-2xl transform group-hover/card:scale-110 transition-transform">
          <Play className="w-5 h-5 fill-white ml-0.5" />
        </div>
      </div>

      {/* 5. LỚP PHỦ THÔNG TIN DƯỚI ĐÁY POSTER */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2 sm:p-2.5 md:p-3 pt-10 pointer-events-none flex flex-col justify-end">
        {matchSnippet && (
          <div className="mb-1 flex items-center gap-1 text-[11px] sm:text-xs text-amber-300 font-bold bg-amber-950/90 border border-amber-500/30 px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm line-clamp-1">
            <span className="flex-none font-bold text-amber-300">Khớp:</span>
            <span className="font-normal italic text-amber-200/90 truncate">{matchSnippet}</span>
          </div>
        )}

        <p className="text-white font-bold text-xs sm:text-[13px] md:text-sm line-clamp-1 truncate group-hover/card:text-rose-400 transition-colors drop-shadow leading-snug">
          {title}
        </p>

        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 font-medium flex-nowrap overflow-hidden">
          {rating && rating !== "N/A" && Number(rating) > 0 && (
            <>
              <span className="text-amber-400 font-semibold flex items-center gap-0.5 shrink-0">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400 inline" />
                {typeof rating === "number" ? rating.toFixed(1) : rating}
              </span>
              <span className="text-zinc-600 shrink-0">•</span>
            </>
          )}
          {displayYear && (
            <span className="shrink-0">{displayYear}</span>
          )}
          {displayTag && (
            <>
              {(displayYear || (rating && rating !== "N/A" && Number(rating) > 0)) && (
                <span className="text-zinc-600 shrink-0">•</span>
              )}
              <span className="text-zinc-300 truncate font-normal">{displayTag}</span>
            </>
          )}
        </div>

        {/* NÚT TRAILER CHÍNH THỨC (CHỈ HIỆN KHI PHIM CÓ TRAILER) */}
        {(trailerUrl || hasTrailerState || isTrailerOnly) && (
          <div className="mt-1.5 sm:mt-2 pointer-events-auto flex items-center">
            <button
              type="button"
              onClick={handleTrailerClick}
              disabled={isLoadingTrailer}
              title="Xem Trailer chính thức"
              aria-label={`Xem Trailer phim ${title}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-netflix-red/50 bg-netflix-red/20 hover:bg-netflix-red text-white text-[10.5px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm backdrop-blur-sm"
            >
              <Film className="w-3 h-3 text-current" />
              <span>{isLoadingTrailer ? "Đang tải..." : "Trailer"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. MODAL TRAILER MÀN ẢNH RỘNG */}
      {showTrailerModal && (
        <TrailerModal
          isOpen={true}
          onClose={() => setShowTrailerModal(false)}
          title={title}
          modalTrailerUrl={modalTrailerUrl}
        />
      )}
    </div>
  );
};

export const MediaCard = React.memo(MediaCardInner);
export default MediaCard;
