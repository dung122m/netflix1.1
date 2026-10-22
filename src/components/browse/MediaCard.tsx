"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Star,
  Film,
  Bookmark,
  FolderPlus,
} from "lucide-react";
import { isInWatchlist, toggleWatchlist, subscribeToWatchlist } from "@/lib/watchlist";
import {
  detectMovieTypeName,
  toOptimizedCardPosterUrl,
  sanitizeImageUrl,
  formatGenreName,
} from "@/lib/movieMedia";
import { TrailerModal } from "@/components/TrailerModal";
import { extractYoutubeId } from "@/lib/trailerHelper";
import { useAuth } from "@/context/AuthContext";
import { AddToCollectionModal } from "@/components/Collections/AddToCollectionModal";
import { AuthModal } from "@/components/AuthModal";

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
  itemType?: "movie" | "series" | "episode";
  seriesSlug?: string;
  seriesTitle?: string;
  episodeSlug?: string;
  episodeName?: string;
  seasonName?: string;
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
  itemType,
  seriesSlug,
  seriesTitle,
  episodeSlug,
  episodeName,
  seasonName,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const [inList, setInList] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleOpenCollectionModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowCollectionModal(true);
  }, [user]);

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
  const hasPrefetchedRef = useRef(false);

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

  // Năm phát hành được lọc an toàn (loại bỏ năm lỗi như 1885)
  const displayYear = (() => {
    if (!year) return "";
    const parsed = typeof year === "number" ? year : parseInt(String(year).trim(), 10);
    const maxYear = new Date().getFullYear() + 2;
    if (Number.isFinite(parsed) && parsed >= 1920 && parsed <= maxYear) {
      return String(parsed);
    }
    return "";
  })();

  const displayTime = time && typeof time === "string" && time.trim() && time.trim() !== "Đang cập nhật" && time.trim() !== "N/A" ? time.trim() : "";

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

  // Thẻ thông tin phụ: Luôn hiển thị thể loại chuẩn hoá tiếng Việt có dấu (ví dụ "Hành Động", không hiển thị slug "hanh-dong").
  // Nếu dữ liệu thiếu thể loại, tự động dùng loại phim (Phim lẻ / Phim bộ / Hoạt hình)
  // để toàn bộ hàng thẻ luôn đồng nhất cấu trúc [Năm · Thể loại · Rating], tuyệt đối không hiển thị
  // thời lượng ("70p", "41p") vào vị trí thể loại làm hàng thẻ bị "lạc quẻ".
  const displayTag = (() => {
    const formatted = formatGenreName(genre);
    if (formatted) return formatted;
    if (displayType) return displayType;
    return "";
  })();

  const isEpisode = itemType === "episode" || Boolean(episodeSlug) || slug.includes("__ep__");
  const sSlug = seriesSlug || (slug.includes("__ep__") ? slug.split("__ep__")[0] : slug);
  const epSlug = episodeSlug || (slug.includes("__ep__") ? slug.split("__ep__")[1] : "");
  const targetHref = React.useMemo(() => {
    if (isEpisode && epSlug) {
      return `/movies/${sSlug}?ep=${encodeURIComponent(epSlug)}`;
    }
    return `/movies/${slug}`;
  }, [isEpisode, epSlug, sSlug, slug]);

  const episodeBadgeText = React.useMemo(() => {
    if (!isEpisode) return null;
    if (episodeName) return episodeName;
    if (!epSlug) return "Tập phim";
    const numMatch = epSlug.match(/(\d+)/);
    return numMatch ? `Tập ${numMatch[1]}` : epSlug;
  }, [isEpisode, episodeName, epSlug]);

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
      itemType,
      seriesSlug,
      seriesTitle,
      episodeSlug,
      episodeName,
      seasonName,
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
      router.push(targetHref);
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

  const modalTrailerUrl = trailerUrl || clientTrailerCache.get(slug) || null;

  const validRating = (() => {
    if (!rating || rating === "N/A") return 0;
    const num = typeof rating === "number" ? rating : parseFloat(String(rating));
    return Number.isFinite(num) && num > 0 && num <= 10 ? num : 0;
  })();

  // Chỉ hiển thị huy hiệu chất lượng cho các định dạng đặc biệt (4K, UHD, CAM).
  // Tuyệt đối không hiển thị FHD/HD tràn lan trên mọi thẻ để tránh giao diện "web phim lậu".
  const specialQualityBadge = (() => {
    if (!quality || typeof quality !== "string") return "";
    const clean = quality.trim().toUpperCase();
    if (clean.includes("4K") || clean.includes("UHD")) return "4K";
    if (clean.includes("CAM")) return "CAM";
    return "";
  })();

  return (
    <div
      className="group/card relative flex flex-col w-full select-none cursor-pointer group-hover/card:scale-[1.02] transition-transform duration-300 ease-out motion-reduce:transform-none"
      onMouseEnter={() => {
        if (targetHref && !hasPrefetchedRef.current) {
          hasPrefetchedRef.current = true;
          router.prefetch(targetHref);
        }
      }}
    >
      {/* ========================================================================= */}
      {/* 1. KHỐI POSTER NGHỆ THUẬT (2:3 POSTER ARTWORK CANVAS - CLEAN & ELEVATED)   */}
      {/* ========================================================================= */}
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 ring-1 ring-white/10 group-hover/card:ring-netflix-red/60 shadow-[0_10px_25px_rgba(0,0,0,0.7)] group-hover/card:shadow-[0_18px_40px_rgba(229,9,20,0.35)] transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-white">
        {/* LIÊN KẾT CHÍNH PHỦ TOÀN BỘ POSTER (A11Y + KEYBOARD FOCUS + CLICK MỞ PHIM) */}
        <Link
          ref={baseCardRef}
          href={targetHref}
          onClick={handleCardClick}
          tabIndex={0}
          aria-label={`Xem phim ${title}`}
          className={`block absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-xl ${
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
                <Film className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-zinc-400" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-white/40 uppercase">
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
              className={`w-full h-full object-cover object-center group-hover/card:scale-105 transition-transform duration-500 ease-out motion-reduce:transform-none ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setIsImageLoaded(true)}
              onError={handleImageError}
            />
          )}
        </Link>

        {/* HUY HIỆU TẬP PHIM (NẾU LÀ EPISODE) */}
        {isEpisode && episodeBadgeText && (
          <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-black shadow-md border border-amber-300/40 select-none">
              {episodeBadgeText}
            </span>
          </div>
        )}

        {/* HUY HIỆU ĐẶC BIỆT GÓC TRÊN TRÁI (TỐI ĐA 1 BADGE: CHIẾU RẠP HOẶC ĐỘC QUYỀN) */}
        {(chieurap || sub_docquyen) && (
          <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
            {chieurap ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-zinc-100 text-[10px] font-medium tracking-wide shadow-md border border-white/15 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Chiếu Rạp
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-zinc-100 text-[10px] font-medium tracking-wide shadow-md border border-white/15 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Độc Quyền
              </span>
            )}
          </div>
        )}

        {/* NÚT THÊM BỘ SƯU TẬP TRÊN MOBILE (KHÔNG PHỤ THUỘC HOVER) */}
        <div className="absolute top-2 right-2 z-20 pointer-events-auto sm:hidden">
          <button
            type="button"
            onClick={handleOpenCollectionModal}
            title="Thêm vào bộ sưu tập"
            aria-label={`Thêm phim ${title} vào bộ sưu tập`}
            className="w-6 h-6 rounded-full flex items-center justify-center border border-white/20 bg-black/60 backdrop-blur-md text-amber-400 active:scale-90 transition cursor-pointer shadow-sm"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
        </div>

        {/* CỤM NÚT HÀNH ĐỘNG KHI HOVER TRÊN DESKTOP */}
        <div className="absolute top-2.5 right-2.5 z-20 pointer-events-auto opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hidden sm:flex items-center gap-1.5">
          {/* Nút Bộ sưu tập */}
          <button
            type="button"
            onClick={handleOpenCollectionModal}
            title="Thêm vào bộ sưu tập"
            aria-label={`Thêm phim ${title} vào bộ sưu tập`}
            className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-md backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-white bg-black/75 hover:bg-amber-400 hover:border-amber-400 hover:text-black border-white/20 text-white group/btn"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400 group-hover/btn:text-black transition-colors" />
          </button>

          {/* Nút Watchlist */}
          <button
            type="button"
            onClick={handleToggleList}
            title={inList ? "Bỏ lưu khỏi danh sách của tôi" : "Lưu vào danh sách của tôi"}
            aria-label={inList ? `Bỏ lưu phim ${title}` : `Lưu phim ${title} vào danh sách`}
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer shadow-md backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-white ${
              inList
                ? "bg-netflix-red border-netflix-red text-white"
                : "bg-black/75 hover:bg-white hover:text-zinc-950 border-white/20 text-white"
            }`}
          >
            {inList ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* NÚT TRAILER KÍNH MỜ GÓC DƯỚI TRÁI KHI HOVER (CHỈ HIỆN KHI CÓ TRAILER) */}
        {(trailerUrl || hasTrailerState || isTrailerOnly) && (
          <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-auto opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hidden sm:flex">
            <button
              type="button"
              onClick={handleTrailerClick}
              disabled={isLoadingTrailer}
              title="Xem Trailer chính thức"
              aria-label={`Xem Trailer phim ${title}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/20 bg-black/75 hover:bg-white hover:text-zinc-950 text-white text-[10.5px] font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Film className="w-3 h-3 text-current" />
              <span>{isLoadingTrailer ? "..." : "Trailer"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. KHỐI METADATA TÁCH BIỆT BÊN DƯỚI (UNDER-POSTER INFO STACK)              */}
      {/* ========================================================================= */}
      <div className="pt-2.5 sm:pt-3 px-0.5 flex flex-col gap-1 w-full">
        {/* ĐOẠN KHỚP TÌM KIẾM (NẾU ĐƯỢC GỌI TỪ TRANG TÌM KIẾM) */}
        {matchSnippet && (
          <div className="flex items-center gap-1 text-[11px] text-amber-300 font-medium line-clamp-1">
            <span className="font-bold text-amber-300 shrink-0">Khớp:</span>
            <span className="italic text-amber-200/90 truncate">{matchSnippet}</span>
          </div>
        )}

        {/* TIÊU ĐỀ PHIM: TỐI ĐA 2 DÒNG, CHIỀU CAO ĐỒNG BỘ GIỮA CÁC THẺ TRONG HÀNG */}
        <Link
          href={targetHref}
          onClick={handleCardClick}
          tabIndex={-1}
          aria-hidden="true"
          className="outline-none block"
        >
          <div className="min-h-[2.4rem] sm:min-h-[2.6rem] flex flex-col justify-start">
            <h4 className="text-zinc-200 group-hover/card:text-red-400 font-medium sm:font-semibold text-[13px] sm:text-[14px] leading-snug line-clamp-2 transition-colors">
              {title}
            </h4>
          </div>
        </Link>

        {/* DẢI MICRO-METADATA: NĂM · THỂ LOẠI · RATING (CHUẨN APPLE TV+ / MUBI) */}
        <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] text-zinc-400 font-normal leading-none overflow-hidden">
          {displayYear && (
            <span className="text-zinc-300 shrink-0">{displayYear}</span>
          )}
          {displayYear && displayTag && (
            <span className="text-zinc-600 font-light select-none shrink-0">·</span>
          )}
          {displayTag && (
            <span className="text-zinc-400 truncate">{displayTag}</span>
          )}
          {(displayYear || displayTag) && validRating > 0 && (
            <span className="text-zinc-600 font-light select-none shrink-0">·</span>
          )}
          {validRating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-400/90 font-medium shrink-0">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
              <span>{validRating.toFixed(1)}</span>
            </span>
          )}
          {specialQualityBadge && (
            <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/10 text-zinc-300 border border-white/15">
              {specialQualityBadge}
            </span>
          )}
        </div>
      </div>

      {/* 3. MODAL TRAILER MÀN ẢNH RỘNG */}
      {showTrailerModal && (
        <TrailerModal
          isOpen={true}
          onClose={() => setShowTrailerModal(false)}
          title={title}
          modalTrailerUrl={modalTrailerUrl}
        />
      )}

      {/* 4. MODAL THÊM VÀO BỘ SƯU TẬP & MODAL ĐĂNG NHẬP */}
      {showCollectionModal && (
        <AddToCollectionModal
          isOpen={true}
          onClose={() => setShowCollectionModal(false)}
          movie={{
            slug,
            title,
            poster: currentSrc || imageUrl || posterUrl || thumbUrl || "/default-poster.jpg",
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

export const MediaCard = React.memo(MediaCardInner);
export default MediaCard;
