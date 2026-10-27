"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Film,
  Bookmark,
  FolderPlus,
} from "lucide-react";
import { isInWatchlist, toggleWatchlist, subscribeToWatchlist } from "@/lib/watchlist";
import {
  toOptimizedCardPosterUrl,
  sanitizeImageUrl,
  formatGenreName,
  formatCountryName,
  extractMovieCountry,
  COUNTRY_DISPLAY_MAP,
} from "@/lib/movieMedia";
import { TrailerModal } from "@/components/TrailerModal";
import { extractYoutubeId } from "@/lib/trailerHelper";
import { useAuth } from "@/context/AuthContext";
import { AddToCollectionModal } from "@/components/Collections/AddToCollectionModal";
import { AuthModal } from "@/components/AuthModal";
import { Tooltip } from "@/components/ui/Tooltip";

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

// Re-export bảng ánh xạ quốc gia và hàm chuẩn hóa
export { COUNTRY_DISPLAY_MAP, formatCountryName };

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  country?: string | any;
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
  isActive?: boolean;
  selected?: boolean;
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
  quality,
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
  isActive = false,
  selected = false,
}) => {
  const isCardActive = Boolean(isActive || selected);
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

  // Thể loại chính (chỉ lấy 1 thể loại ngắn gọn, loại trừ các loại phim như Phim lẻ / Phim bộ)
  const mainGenre = React.useMemo(() => {
    if (!genre || typeof genre !== "string") return "";
    const parts = genre
      .split(/[,/]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      const lower = part.toLowerCase();
      if (
        lower === "phim lẻ" ||
        lower === "phim bộ" ||
        lower === "phimle" ||
        lower === "phimbo" ||
        lower === "hoạt hình" ||
        lower === "tv shows" ||
        lower === "tvshows"
      ) {
        continue;
      }
      const formatted = formatGenreName(part);
      if (formatted) return formatted;
      if (part.length <= 15) return part;
    }
    return "";
  }, [genre]);

  // Quốc gia: Chuẩn hóa hiển thị ngắn gọn, thanh lịch (tuyệt đối không hiển thị loại phim hoặc mã thô)
  const displayCountry = React.useMemo(() => {
    let raw = "";
    if (typeof initialCountry === "string" && initialCountry.trim()) {
      raw = formatCountryName(initialCountry);
    } else if (initialCountry && typeof initialCountry === "object") {
      const record = initialCountry as Record<string, unknown>;
      const list = Array.isArray(initialCountry) ? (initialCountry as unknown[]) : null;
      const firstItem = list && list.length > 0 ? (list[0] as Record<string, unknown>) : null;
      const maybeName =
        (record?.name as string | undefined) ||
        (record?.slug as string | undefined) ||
        (firstItem?.name as string | undefined) ||
        (firstItem?.slug as string | undefined);
      if (typeof maybeName === "string") raw = formatCountryName(maybeName);
    }

    if (!raw) {
      raw = extractMovieCountry({
        origin_name,
        title,
        name: title,
        category: genre,
      }) || "";
    }

    if (!raw) return "";

    return formatCountryName(raw);
  }, [initialCountry, origin_name, title, genre]);

  // Chuỗi thông tin phụ:
  // - Mobile: Ưu tiên [Năm] • [Thể loại] (hoặc Quốc gia nếu không có thể loại) để vừa vặn card 140px, không bị tràn hay cắt cụt chữ
  // - Tablet/Desktop: Giữ nguyên [Năm] • [Quốc gia] • [Thể loại]
  const mobileMetaString = React.useMemo(() => {
    return [displayYear, mainGenre || displayCountry].filter(Boolean).join(" • ");
  }, [displayYear, mainGenre, displayCountry]);

  const desktopMetaString = React.useMemo(() => {
    const full = [displayYear, displayCountry, mainGenre].filter(Boolean).join(" • ");
    // Nếu cả 3 thành phần quá dài (> 31 ký tự), ưu tiên [Năm] • [Thể loại] để hiển thị trọn vẹn, không bị xén dở chữ
    if (full.length > 31 && displayYear && mainGenre) {
      return [displayYear, mainGenre].filter(Boolean).join(" • ");
    }
    return full;
  }, [displayYear, displayCountry, mainGenre]);

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


  // Nhãn chất lượng bản phim (CAM, HD, FHD, 4K, Vietsub...) đưa lên góc trên bên trái poster
  const displayQualityBadge = (() => {
    if (chieurap) return "Rạp";
    if (sub_docquyen) return "Độc Quyền";
    if (!quality || typeof quality !== "string") return "";
    const clean = quality.trim().toUpperCase();
    if (clean.includes("4K") || clean.includes("UHD")) return "4K";
    if (clean.includes("CAM")) return "CAM";
    if (clean.includes("FHD") || clean.includes("1080")) return "FHD";
    if (clean.includes("HD") || clean.includes("720")) return "HD";
    if (clean.includes("VIETSUB")) return "Vietsub";
    if (clean.includes("THUYET") || clean.includes("LỒNG TIẾNG")) return "T.Minh";
    return quality.trim();
  })();

  const handleMouseEnterCard = useCallback(() => {
    if (targetHref && !hasPrefetchedRef.current) {
      hasPrefetchedRef.current = true;
      router.prefetch(targetHref);
    }
  }, [targetHref, router]);

  return (
    <div
      className="group/card relative flex flex-col w-full select-none cursor-pointer hover:scale-[1.03] hover:-translate-y-1 hover:z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none"
      onMouseEnter={handleMouseEnterCard}
    >
      {/* ========================================================================= */}
      {/* 1. KHỐI POSTER NGHỆ THUẬT (2:3 POSTER ARTWORK CANVAS - CLEAN & ELEVATED)   */}
      {/* ========================================================================= */}
      <div
        className={`relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:ring-2 focus-within:ring-white ${
          isCardActive
            ? "ring-2 ring-emerald-500 ring-inset shadow-[inset_0_0_0_2px_#22c55e]"
            : "ring-1 ring-white/10 ring-inset group-hover/card:ring-2 group-hover/card:ring-netflix-red group-hover/card:ring-inset group-hover/card:shadow-[0_12px_28px_rgba(229,9,20,0.35),0_0_16px_rgba(0,0,0,0.8)]"
        }`}
        data-card-active={isCardActive ? "true" : undefined}
      >
        {/* LIÊN KẾT CHÍNH PHỦ TOÀN BỘ POSTER (A11Y + KEYBOARD FOCUS + CLICK MỞ PHIM) */}
        <Link
          ref={baseCardRef}
          href={targetHref}
          onClick={handleCardClick}
          tabIndex={0}
          aria-label={`Xem phim ${title}`}
          className={`block absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset rounded-xl ${
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
              className={`w-full h-full object-cover object-center group-hover/card:scale-108 group-hover/card:brightness-105 transition-all duration-500 ease-out motion-reduce:transform-none ${
                isImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setIsImageLoaded(true)}
              onError={handleImageError}
            />
          )}
        </Link>

        {/* HUY HIỆU CHẤT LƯỢNG BẢN PHIM GÓC TRÊN TRÁI POSTER (CAM, HD, FHD, Vietsub...) */}
        {displayQualityBadge && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] bg-black/75 backdrop-blur-md text-zinc-200 text-[11px] font-bold uppercase tracking-wider shadow border border-white/10 select-none">
              {displayQualityBadge}
            </span>
          </div>
        )}

        {/* HUY HIỆU TẬP PHIM (NẾU LÀ EPISODE) */}
        {isEpisode && episodeBadgeText && (
          <div className={`absolute ${displayQualityBadge ? "top-7.5 left-2" : "top-2 left-2"} z-10 pointer-events-none`}>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[11px] font-bold bg-amber-500 text-black shadow select-none">
              {episodeBadgeText}
            </span>
          </div>
        )}


        {/* NÚT THÊM BỘ SƯU TẬP TRÊN MOBILE (KHÔNG PHỤ THUỘC HOVER, HITBOX 44PX CHUẨN TOUCH HIG/WCAG) */}
        <div className="absolute bottom-2 right-2 z-20 pointer-events-auto sm:hidden">
          <button
            type="button"
            onClick={handleOpenCollectionModal}
            aria-label={`Thêm phim ${title} vào bộ sưu tập`}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-white/25 bg-black/75 backdrop-blur-md text-amber-400 active:scale-90 transition cursor-pointer shadow-md touch-manipulation relative before:absolute before:-inset-2 before:content-['']"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CỤM NÚT HÀNH ĐỘNG KHI HOVER TRÊN DESKTOP (GÓC DƯỚI PHẢI, KÈM CUSTOM GLASS TOOLTIP HƯỚNG LÊN) */}
        <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-auto opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hidden sm:flex items-center gap-1.5">
          {/* Nút Bộ sưu tập */}
          <Tooltip content="Thêm vào bộ sưu tập" side="top" align="end">
            <button
              type="button"
              onClick={handleOpenCollectionModal}
              aria-label={`Thêm phim ${title} vào bộ sưu tập`}
              className="w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-md shadow-black/50 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-amber-400 bg-black/75 hover:bg-amber-400 hover:border-amber-400 text-amber-400 hover:text-black border-white/20"
            >
              <FolderPlus className="w-3.5 h-3.5 transition-colors" />
            </button>
          </Tooltip>

          {/* Nút Watchlist */}
          <Tooltip content={inList ? "Xóa khỏi danh sách" : "Lưu vào danh sách"} side="top" align="end">
            <button
              type="button"
              onClick={handleToggleList}
              aria-label={inList ? `Bỏ lưu phim ${title}` : `Lưu phim ${title} vào danh sách`}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-md shadow-black/50 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                inList
                  ? "bg-netflix-red border-netflix-red text-white hover:bg-red-700 hover:border-red-700"
                  : "bg-black/75 hover:bg-netflix-red hover:border-netflix-red hover:text-white border-white/20 text-white"
              }`}
            >
              {inList ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Bookmark className="w-3.5 h-3.5 transition-colors" />}
            </button>
          </Tooltip>
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
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-white/20 bg-black/75 hover:bg-white hover:text-zinc-950 text-white text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-black/50 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Film className="w-3 h-3 text-current" />
              <span>{isLoadingTrailer ? "..." : "Trailer"}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. KHỐI THÔNG TIN DƯỚI POSTER: CHUẨN 1 DÒNG DUY NHẤT NETFLIX / DISNEY+   */}
      {/* ========================================================================= */}
      <div className="pt-2 px-0.5 flex flex-col w-full min-w-0">
        {/* ĐOẠN KHỚP TÌM KIẾM (NẾU ĐƯỢC GỌI TỪ TRANG TÌM KIẾM) */}
        {matchSnippet && (
          <div className="flex items-center gap-1 text-[11px] text-amber-300 font-medium line-clamp-1 mb-1">
            <span className="font-bold text-amber-300 shrink-0">Khớp:</span>
            <span className="italic text-amber-200/90 truncate">{matchSnippet}</span>
          </div>
        )}

        {/* DÒNG 1 — TÊN PHIM: CHUẨN 1 DÒNG TRUNCATE DUY NHẤT, CÂN ĐỐI 100%, KHÔNG KHOẢNG TRỐNG THỪA */}
        <Link
          href={targetHref}
          onClick={handleCardClick}
          tabIndex={-1}
          aria-hidden="true"
          className="outline-none block w-full min-w-0"
        >
          <div className="h-5 sm:h-5.5 flex items-center w-full min-w-0">
            <h3
              title={title}
              className="text-zinc-100 group-hover/card:text-red-400 font-semibold text-[13px] sm:text-[14px] leading-tight truncate w-full transition-colors"
            >
              {title}
            </h3>
          </div>
        </Link>

        {/* DÒNG 2 — THÔNG TIN PHỤ: KHOẢNG CÁCH 6PX CHUẨN MỰC, BÁM SÁT TIÊU ĐỀ, METADATA THẲNG TĂM TẮP */}
        <p
          title={desktopMetaString}
          className="text-[11px] sm:text-xs text-zinc-400/90 sm:text-neutral-400 mt-1.5 block truncate w-full min-w-0 select-none leading-none h-4"
        >
          <span className="sm:hidden">{mobileMetaString || <span className="text-transparent pointer-events-none">·</span>}</span>
          <span className="hidden sm:inline">{desktopMetaString || <span className="text-transparent pointer-events-none">·</span>}</span>
        </p>
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
