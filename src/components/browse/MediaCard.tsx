"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Check,
  Film,
  Bookmark,
  FolderPlus,
  X,
} from "lucide-react";
import { isInWatchlist, toggleWatchlist, subscribeToWatchlist } from "@/lib/watchlist";
import { formatEpisodeName, isFullEpisodeLabel } from "@/lib/formatEpisode";
import {
  toOptimizedCardPosterUrl,
  toFastCdnImageUrl,
  extractOriginalSourceUrl,
  sanitizeImageUrl,
  formatCountryName,
  COUNTRY_DISPLAY_MAP,
} from "@/lib/movieMedia";
const TrailerModal = dynamic(
  () => import("@/components/modals/TrailerModal").then((m) => m.TrailerModal),
  { ssr: false }
);
import { extractYoutubeId } from "@/lib/trailerHelper";
import { useAuth } from "@/context/AuthContext";
const AddToCollectionModal = dynamic(
  () => import("@/components/Collections/AddToCollectionModal").then((m) => m.AddToCollectionModal),
  { ssr: false }
);
const AuthModal = dynamic(
  () => import("@/components/modals/AuthModal").then((m) => m.AuthModal),
  { ssr: false }
);
import { Tooltip } from "@/components/ui/Tooltip";
import { useMoviePosterFallback } from "@/hooks/useMoviePosterFallback";

// Bộ nhớ đệm client (giữ nguyên cho các component khác như HeroFeatured)
import { clientSynopsisCache } from "@/services/synopsisService";
export { clientSynopsisCache };
export const clientTrailerCache = new Map<string, string>();

// Bộ nhớ đệm toàn cục lưu các ảnh đã tải thành công trong phiên (persists across unmount/remount)
export const GLOBAL_LOADED_IMAGES = new Set<string>();

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
  genre?: string;
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
  progressPercent?: number;
  onRemove?: (e: React.MouseEvent) => void;
  removeTooltip?: string;
  updatedTimeAgo?: string;
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
  chieurap: _chieurap,
  sub_docquyen: _sub_docquyen,
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
  progressPercent,
  onRemove,
  removeTooltip,
  updatedTimeAgo,
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

  // Danh sách ảnh ứng viên cho Poster đứng 2:3 theo thứ tự ưu tiên: TMDb CDN -> Poster dọc -> Thumb gốc
  const imageCandidates = React.useMemo(() => {
    const list: string[] = [];
    const addUrl = (u?: string) => {
      if (!u || typeof u !== "string" || !u.trim()) return;
      const clean = toFastCdnImageUrl(toOptimizedCardPosterUrl(u));
      if (
        clean &&
        !list.includes(clean) &&
        !clean.includes("/undefined") &&
        !clean.includes("/null") &&
        !clean.startsWith("/default-")
      ) {
        list.push(clean);
      }
      const raw = toFastCdnImageUrl(sanitizeImageUrl(u));
      if (
        raw &&
        !list.includes(raw) &&
        !raw.includes("/undefined") &&
        !raw.includes("/null") &&
        !raw.startsWith("/default-")
      ) {
        list.push(raw);
      }
    };

    // 1. Ưu tiên poster dọc chuẩn: nếu có -thumb.webp, suy ra -poster.webp trước
    if (posterUrl && posterUrl.includes("-thumb.webp")) {
      addUrl(posterUrl.replace("-thumb.webp", "-poster.webp"));
    }
    addUrl(posterUrl);
    if (posterUrl && posterUrl.includes("-poster.webp")) {
      addUrl(posterUrl.replace("-poster.webp", "-thumb.webp"));
    }

    // 2. Thêm imageUrl và thumbUrl làm phương án dự phòng
    if (thumbUrl && thumbUrl.includes("-thumb.webp")) {
      addUrl(thumbUrl.replace("-thumb.webp", "-poster.webp"));
    }
    addUrl(imageUrl);
    addUrl(thumbUrl);
    if (thumbUrl && thumbUrl.includes("-poster.webp")) {
      addUrl(thumbUrl.replace("-poster.webp", "-thumb.webp"));
    }

    // Sắp xếp ưu tiên:
    // 0. Ảnh đã từng nạp thành công trong phiên (0ms cache hit)
    // 1. TMDb CDN chính chủ siêu nhẹ & cực nhanh (30ms CDN)
    // 2. R2 CDN (phimimg/phimapi/ophim đều được route qua toFastCdnImageUrl → R2 direct URL)
    // 3. Poster dọc (-poster.webp, poster_, /w500)
    // 4. Thumb ngang (-thumb.webp) làm fallback
    return list.sort((a, b) => {
      const aLoaded = GLOBAL_LOADED_IMAGES.has(a);
      const bLoaded = GLOBAL_LOADED_IMAGES.has(b);
      if (aLoaded && !bLoaded) return -1;
      if (!aLoaded && bLoaded) return 1;

      const aTmdb = a.includes("image.tmdb.org");
      const bTmdb = b.includes("image.tmdb.org");
      if (aTmdb && !bTmdb) return -1;
      if (!aTmdb && bTmdb) return 1;

      const aPoster = a.includes("-poster") || a.includes("poster_") || a.includes("/w500");
      const bPoster = b.includes("-poster") || b.includes("poster_") || b.includes("/w500");
      if (aPoster && !bPoster) return -1;
      if (!aPoster && bPoster) return 1;

      return 0;
    });
  }, [posterUrl, imageUrl, thumbUrl]);

  const triedUrlsRef = useRef<Set<string>>(new Set());
  const imgRef = useRef<HTMLImageElement | null>(null);

  const initialCandidate = imageCandidates[0] || "";

  // Kích hoạt TMDb fallback chỉ khi KHÔNG CÓ candidate nào từ đầu.
  // Phimimg được route qua R2 direct URL — cứ thử load trước, thất bại mới gọi TMDb.
  const [needsFallback, setNeedsFallback] = useState<boolean>(
    () => !initialCandidate
  );

  // Chuẩn hóa và tra cứu fallback TMDb dùng chung khi cần
  const { displaySrc: tmdbFallbackSrc, isLoading: isFallbackLoading, triggerFallback } = useMoviePosterFallback({
    slug,
    title,
    origin_name,
    year,
    type: itemType,
    initialSrc: initialCandidate,
    enabled: needsFallback,
    upgradePhimimg: true,
  });

  const [currentSrc, setCurrentSrc] = useState<string>(() => initialCandidate);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(() => {
    return Boolean(
      (initialCandidate && GLOBAL_LOADED_IMAGES.has(initialCandidate)) ||
      (posterUrl && GLOBAL_LOADED_IMAGES.has(posterUrl)) ||
      (imageUrl && GLOBAL_LOADED_IMAGES.has(imageUrl)) ||
      (thumbUrl && GLOBAL_LOADED_IMAGES.has(thumbUrl))
    );
  });
  const [hasError, setHasError] = useState(() => !initialCandidate && imageCandidates.length === 0);

  const checkImageComplete = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete && node.naturalWidth > 0) {
      const actualSrc = node.currentSrc || node.src || currentSrc;
      if (actualSrc) {
        GLOBAL_LOADED_IMAGES.add(actualSrc);
      }
      setIsImageLoaded(true);
    }
  }, [currentSrc]);

  // Đồng bộ khi card được tái sử dụng cho phim khác hoặc khi danh sách ứng viên thay đổi
  useEffect(() => {
    triedUrlsRef.current.clear();
    const initial = imageCandidates.find((u) => !triedUrlsRef.current.has(u)) || imageCandidates[0] || "";
    if (initial) {
      setHasError(false);
      setCurrentSrc(initial);
      setIsImageLoaded(
        Boolean(
          GLOBAL_LOADED_IMAGES.has(initial) ||
          (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0)
        )
      );
    } else {
      setCurrentSrc("");
      setHasError(false);
      setIsImageLoaded(false);
    }
  }, [slug, imageCandidates]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsImageLoaded(true);
    }
  }, [currentSrc]);

  // Khi hook useMoviePosterFallback tìm thấy ảnh TMDb hoặc hoàn tất tra cứu:
  useEffect(() => {
    if (!needsFallback || isFallbackLoading) return;

    if (
      tmdbFallbackSrc &&
      tmdbFallbackSrc !== currentSrc &&
      !triedUrlsRef.current.has(tmdbFallbackSrc)
    ) {
      setHasError(false);
      setCurrentSrc(tmdbFallbackSrc);
      setIsImageLoaded(GLOBAL_LOADED_IMAGES.has(tmdbFallbackSrc));
      return;
    }

    // TMDb fallback hoàn tất nhưng không tìm được ảnh → hiện Poster Canvas
    if (currentSrc && triedUrlsRef.current.has(currentSrc)) {
      setHasError(true);
      setIsImageLoaded(true);
    }
  }, [needsFallback, isFallbackLoading, tmdbFallbackSrc, currentSrc]);

  const handleImageError = useCallback(() => {
    if (currentSrc) {
      triedUrlsRef.current.add(currentSrc);
      GLOBAL_LOADED_IMAGES.delete(currentSrc);
    }

    // 1. Thử ứng viên kế tiếp trong danh sách candidates
    const nextCandidate = imageCandidates.find(
      (url) => !triedUrlsRef.current.has(url)
    );
    if (nextCandidate) {
      setCurrentSrc(nextCandidate);
      setIsImageLoaded(GLOBAL_LOADED_IMAGES.has(nextCandidate));
      return;
    }

    // 2. R2 direct URL bị 404 → gọi r2-proxy NGAY (không chờ TMDb)
    //    Server Vercel ở nước ngoài không bị ISP VN chặn → fetch phimimg được
    //    Song song kích hoạt TMDb fallback để chuẩn bị sẵn phòng r2-proxy cũng fail
    if (
      currentSrc &&
      currentSrc.includes("/cache/") &&
      !currentSrc.includes("/api/media/r2-proxy")
    ) {
      const originalSource = extractOriginalSourceUrl(currentSrc);
      if (originalSource && originalSource !== currentSrc) {
        const r2ProxyUrl = `/api/media/r2-proxy?url=${encodeURIComponent(originalSource)}`;
        if (!triedUrlsRef.current.has(r2ProxyUrl)) {
          setCurrentSrc(r2ProxyUrl);
          setIsImageLoaded(false);
          setHasError(false);
          // Chuẩn bị TMDb song song để sẵn sàng nếu r2-proxy cũng fail
          if (!needsFallback) {
            setNeedsFallback(true);
            triggerFallback();
          }
          return;
        }
      }
    }

    // 3. Nếu fallback TMDb đã có sẵn → dùng ngay
    if (tmdbFallbackSrc && tmdbFallbackSrc !== currentSrc && !triedUrlsRef.current.has(tmdbFallbackSrc)) {
      setCurrentSrc(tmdbFallbackSrc);
      setIsImageLoaded(GLOBAL_LOADED_IMAGES.has(tmdbFallbackSrc));
      setHasError(false);
      return;
    }

    // 4. Kích hoạt gọi TMDb fallback nếu chưa kích hoạt
    if (!needsFallback) {
      setNeedsFallback(true);
      triggerFallback();
      setIsImageLoaded(false);
      setHasError(false);
      return;
    }

    // 5. TMDb đang tải ngầm → giữ skeleton shimmer chờ
    if (isFallbackLoading) {
      setIsImageLoaded(false);
      setHasError(false);
      return;
    }

    // 6. Toàn bộ candidates, R2 proxy, và TMDb đều thất bại → Poster Canvas
    setHasError(true);
    setIsImageLoaded(true);
  }, [currentSrc, imageCandidates, tmdbFallbackSrc, isFallbackLoading, needsFallback, triggerFallback]);

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
    if (episodeName) {
      const trimmed = episodeName.trim();
      if (isFullEpisodeLabel(trimmed) || /^tap-full$/i.test(trimmed)) return null;
      return formatEpisodeName(trimmed);
    }
    if (!epSlug || /^(full|tap-full)$/i.test(epSlug.trim())) return null;
    const numMatch = epSlug.match(/(\d+)/);
    return numMatch ? `Tập ${numMatch[1]}` : null;
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


  // Nhãn chất lượng bản phim: loại bỏ hẳn chữ "Rạp", HD, FHD, Vietsub... để poster luôn sạch sẽ, chuẩn điện ảnh cao cấp
  const displayQualityBadge = (() => {
    if (!quality || typeof quality !== "string") return "";
    const clean = quality.trim().toUpperCase();
    if (clean.includes("CAM")) return "CAM";
    if (clean.includes("4K") || clean.includes("UHD")) return "4K";
    return "";
  })();

  return (
    <div
      className="group/card relative flex flex-col w-full select-none cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 hover:z-20 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transform-none"
    >
      {/* ========================================================================= */}
      {/* 1. KHỐI POSTER NGHỆ THUẬT (2:3 POSTER ARTWORK CANVAS - CLEAN & ELEVATED)   */}
      {/* ========================================================================= */}
      <div
        className={`relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:ring-2 focus-within:ring-white ${
          isCardActive
            ? "shadow-[inset_0_0_0_2px_#22c55e]"
            : "group-hover/card:ring-2 group-hover/card:ring-netflix-red group-hover/card:ring-inset group-hover/card:shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
        }`}
        data-card-active={isCardActive ? "true" : undefined}
      >
        {/* LỚP DỊU MÉP TRONG (LÀM MỀM POSTER NỀN SÁNG TRÊN DARK MODE MÀ KHÔNG CẦN VIỀN) */}
        <div
          className={`pointer-events-none absolute inset-0 z-[3] rounded-xl shadow-[inset_0_0_24px_rgba(0,0,0,0.22)] transition-opacity duration-300 ${
            isCardActive
              ? ""
              : "ring-1 ring-inset ring-transparent group-hover/card:ring-white/25"
          }`}
          aria-hidden="true"
        />
        {/* LIÊN KẾT CHÍNH PHỦ TOÀN BỘ POSTER (A11Y + KEYBOARD FOCUS + CLICK MỞ PHIM) */}
        <Link
          ref={baseCardRef}
          href={targetHref}
          prefetch={false}
          onClick={handleCardClick}
          tabIndex={0}
          aria-label={`Xem phim ${title}`}
          className={`block absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset rounded-xl ${
            isNavigating ? "movie-card-navigating" : ""
          }`}
        >
          {/* LỚP NỀN POSTER: SKELETON KHI CHỜ LOAD ẢNH VÀ DEFAULT LOGO KHI KHÔNG CÓ ẢNH */}
          <div
            className="absolute inset-0 z-0 flex flex-col items-center justify-center p-3 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black select-none overflow-hidden"
            aria-hidden="true"
          >
            {/* Hiệu ứng tia sáng quét nhẹ (Shimmer sheen) khi đang chờ tải ảnh (không hiện logo) */}
            {!isImageLoaded && !hasError && (
              <div
                className="absolute inset-0 -translate-x-full poster-placeholder-shimmer bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none"
                aria-hidden="true"
              />
            )}

            {/* CHỈ HIỆN LOGO NANAFLIX KHI PHIM HOÀN TOÀN KHÔNG CÓ ẢNH HOẶC LỖI TẢI (hasError hoặc !currentSrc) */}
            {(hasError || !currentSrc) && (
              <div className="relative z-[1] inline-flex items-center gap-2 select-none poster-placeholder-logo">
                <div className="w-5.5 h-4 rounded-[4px] bg-[#EA1D24] flex items-center justify-center shadow-md">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-2.5 h-2.5 text-[#FFF200] fill-current"
                    aria-hidden="true"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <span className="text-white font-extrabold text-xs sm:text-sm tracking-tight drop-shadow-sm">Nanaflix</span>
              </div>
            )}
          </div>

          {/* THẺ ẢNH CHÍNH PHỦ LÊN TRÊN CANVAS NỀN */}
          {currentSrc && !hasError && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={currentSrc}
              ref={checkImageComplete}
              src={currentSrc}
              alt={title}
              loading={priority ? "eager" : "lazy"}
              decoding={priority ? "sync" : "async"}
              fetchPriority={priority ? "high" : "auto"}
              referrerPolicy="no-referrer"
              className="relative z-[1] w-full h-full object-cover object-center brightness-[0.94] group-hover/card:scale-105 group-hover/card:brightness-105 transition-all duration-300 ease-out motion-reduce:transform-none opacity-100"
              onLoad={(e) => {
                const target = e.currentTarget;
                const loadedSrc = target.currentSrc || target.src || currentSrc;
                if (loadedSrc) {
                  GLOBAL_LOADED_IMAGES.add(loadedSrc);
                }
                if (currentSrc) {
                  GLOBAL_LOADED_IMAGES.add(currentSrc);
                }
                setIsImageLoaded(true);
              }}
              onError={handleImageError}
            />
          )}
        </Link>

        {/* HUY HIỆU CHẤT LƯỢNG BẢN PHIM GÓC TRÊN TRÁI POSTER (CHỈ HIỆN VỚI BẢN ĐẶC BIỆT: CAM / 4K) */}
        {displayQualityBadge && (
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase tracking-wider shadow select-none ${
                displayQualityBadge === "CAM"
                  ? "bg-amber-500 text-black font-black"
                  : "bg-black/80 backdrop-blur-md text-zinc-100"
              }`}
            >
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


        {/* NÚT XOÁ (NẾU ĐƯỢC TRUYỀN onRemove) */}
        {onRemove && (
          <div className="absolute top-2 right-2 z-20 pointer-events-auto">
            <Tooltip content={removeTooltip || "Xóa"} side="top" align="end">
              <button
                type="button"
                onClick={onRemove}
                aria-label={removeTooltip || `Xóa ${title}`}
                className="w-7 h-7 rounded-full bg-black/75 hover:bg-netflix-red hover:text-white text-zinc-300 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform transition-colors duration-200 hover:scale-110 active:scale-90 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
        )}

        {/* THANH TIẾN ĐỘ XEM THEO THEME DƯỚI ĐÁY POSTER */}
        {typeof progressPercent === "number" && progressPercent >= 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-white/20 backdrop-blur-sm z-10 overflow-hidden">
            <div
              className="h-full bg-netflix-red rounded-r-full transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}



        {/* CỤM NÚT HÀNH ĐỘNG KHI HOVER TRÊN DESKTOP (GÓC DƯỚI PHẢI, KÈM CUSTOM GLASS TOOLTIP HƯỚNG LÊN) */}
        <div className="absolute bottom-2.5 right-2.5 z-20 pointer-events-auto opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hidden sm:flex items-center gap-1.5">
          {/* Nút Bộ sưu tập */}
          <Tooltip content="Thêm vào bộ sưu tập" side="top" align="end">
            <button
              type="button"
              onClick={handleOpenCollectionModal}
              aria-label={`Thêm phim ${title} vào bộ sưu tập`}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform transition-colors duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-md shadow-black/50 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-amber-400 bg-black/75 hover:bg-amber-400 text-amber-400 hover:text-black"
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
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform transition-colors duration-150 hover:scale-110 active:scale-95 cursor-pointer shadow-md shadow-black/50 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
                inList
                  ? "bg-netflix-red text-white hover:brightness-110"
                  : "bg-black/75 hover:bg-netflix-red hover:text-white text-white"
              }`}
            >
              {inList ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Bookmark className="w-3.5 h-3.5 transition-colors" />}
            </button>
          </Tooltip>
        </div>

        {/* NÚT TRAILER KÍNH MỜ GÓC DƯỚI TRÁI KHI HOVER (CHỈ HIỆN KHI CÓ TRAILER) */}
        {(trailerUrl || hasTrailerState || isTrailerOnly) && (
          <div className="absolute bottom-2.5 left-2.5 z-20 pointer-events-auto opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity duration-200 hidden sm:flex">
            <Tooltip content="Xem Trailer chính thức" side="top" align="start">
              <button
                type="button"
                onClick={handleTrailerClick}
                disabled={isLoadingTrailer}
                aria-label={`Xem Trailer phim ${title}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/75 hover:bg-white hover:text-zinc-950 text-white text-[11px] font-bold transition-transform transition-colors duration-150 hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-black/50 backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Film className="w-3 h-3 text-current" />
                <span>{isLoadingTrailer ? "..." : "Trailer"}</span>
              </button>
            </Tooltip>
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
          prefetch={false}
          onClick={handleCardClick}
          aria-label={title}
          className="outline-none block w-full min-w-0"
        >
          <div className="h-5 sm:h-5.5 flex items-center w-full min-w-0">
            <h3
              title={title}
              className="text-zinc-100 group-hover/card:text-netflix-red font-semibold text-[13px] sm:text-[14px] leading-tight truncate w-full transition-colors"
            >
              {title}
            </h3>
          </div>
        </Link>

        {/* DÒNG 2 — THÔNG TIN PHỤ: KHOẢNG CÁCH 6PX CHUẨN MỰC, BÁM SÁT TIÊU ĐỀ, METADATA THẲNG TĂM TẮP */}
        {typeof progressPercent === "number" ? (
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 mt-1 select-none leading-none h-4">
            <span className="text-netflix-red font-semibold">
              {progressPercent > 0 ? `Đã xem ${progressPercent}%` : "Chưa xem"}
            </span>
            {updatedTimeAgo ? (
              <span className="text-zinc-500 text-[10px]">{updatedTimeAgo}</span>
            ) : null}
          </div>
        ) : (
          <p
            title={displayYear ? String(displayYear) : "Phim"}
            className="text-[11px] sm:text-xs text-zinc-400 mt-1.5 block truncate w-full min-w-0 select-none leading-none h-4"
          >
            {displayYear ? (
              <span className="font-medium text-zinc-400">{displayYear}</span>
            ) : (
              <span className="text-zinc-500">Phim</span>
            )}
          </p>
        )}
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
