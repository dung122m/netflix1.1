"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Play,
  Plus,
  Check,
  ChevronRight,
  Star,
  Volume2,
  VolumeX,
  Film,
  Users,
  Clapperboard,
} from "lucide-react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { extractMovieCountry, detectMovieTypeName, toOptimizedCardBackdropUrl, sanitizeImageUrl } from "@/lib/movieMedia";
import { TrailerModal } from "@/components/TrailerModal";
import {
  extractYoutubeId,
  getYoutubeTrailerEmbedUrl,
  isDesktopWithHover,
  isYoutubeErrorMessage,
  isYoutubePlayingMessage,
  isYoutubeEndedMessage,
} from "@/lib/trailerHelper";

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

// Bộ nhớ đệm client
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
  description,
  priority = false,
  time,
  year,
  rating,
  quality,
  lang,
  chieurap,
  sub_docquyen,
  actor: initialActor,
  director: initialDirector,
  country: initialCountry,
  type_name: initialTypeName,
  hasTrailer: initialHasTrailer = false,
  trailer_url: initialTrailerUrl,
  isTrailerOnly = false,
  matchSnippet,
}) => {
  const router = useRouter();
  const [inList, setInList] = useState(false);

  // Danh sách các link ảnh dự phòng theo thứ tự ưu tiên (chuẩn HD sắc nét)
  const candidateImages = React.useMemo(() => {
    const list: string[] = [];
    const addUrl = (u?: string) => {
      if (!u || typeof u !== "string" || !u.trim()) return;
      const clean = toOptimizedCardBackdropUrl(u);
      if (clean && !list.includes(clean) && !clean.includes("/undefined") && !clean.includes("/null") && !clean.startsWith("/default-")) {
        list.push(clean);
      }
      const raw = sanitizeImageUrl(u);
      if (raw && !list.includes(raw) && !raw.includes("/undefined") && !raw.includes("/null") && !raw.startsWith("/default-")) {
        // Chỉ thêm raw nếu không phải ảnh phimimg nặng (để tránh rơi ngược về file 2MB khi proxy lỗi)
        if (!raw.includes("/upload/vod/") && !raw.includes("-poster.webp")) {
          list.push(raw);
        }
      }
    };
    // Với card landscape 16:9, ưu tiên thumbUrl / imageUrl trước posterUrl
    addUrl(thumbUrl);
    addUrl(imageUrl);
    addUrl(posterUrl);
    return list;
  }, [thumbUrl, imageUrl, posterUrl]);

  const [imageAttemptIndex, setImageAttemptIndex] = useState(0);
  const [currentImgSrc, setCurrentImgSrc] = useState(
    candidateImages[0] || (imageUrl ? toOptimizedCardBackdropUrl(imageUrl) : "/default-hero.jpg")
  );

  useEffect(() => {
    setImageAttemptIndex(0);
    setCurrentImgSrc(candidateImages[0] || (imageUrl ? toOptimizedCardBackdropUrl(imageUrl) : "/default-hero.jpg"));
  }, [imageUrl, candidateImages]);

  const handleImageError = () => {
    // 1. Chuyển sang nguồn ảnh tiếp theo trong danh sách candidate (vd: từ thumb sang poster hoặc link gốc)
    const nextIdx = imageAttemptIndex + 1;
    if (nextIdx < candidateImages.length) {
      setImageAttemptIndex(nextIdx);
      setCurrentImgSrc(candidateImages[nextIdx]);
      return;
    }

    // 2. Nếu tất cả đều lỗi, chuyển về ảnh bìa mặc định rõ nét
    if (currentImgSrc !== "/default-hero.jpg") {
      setCurrentImgSrc("/default-hero.jpg");
    }
  };

  // Trailer Video & Modal States (Desktop with hover only, lazy-load 1.1s, fault-tolerant)
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isTrailerReady, setIsTrailerReady] = useState(false);
  const [trailerFailed, setTrailerFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const cardIframeRef = useRef<HTMLIFrameElement>(null);
  const [trailerUrl, setTrailerUrl] = useState<string>(
    () => initialTrailerUrl || clientTrailerCache.get(slug) || ""
  );
  const [hasTrailerState, setHasTrailerState] = useState<boolean>(
    () => initialHasTrailer || Boolean(initialTrailerUrl) || isTrailerOnly || clientTrailerCache.has(slug)
  );
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // Extra Details (Actors, Directors, Origin Name)
  const [extraInfo, setExtraInfo] = useState<MovieExtraInfo>(() => {
    if (clientExtraInfoCache.has(slug)) {
      return clientExtraInfoCache.get(slug)!;
    }
    return {
      actor: initialActor,
      director: initialDirector,
      origin_name,
    };
  });

  // Hướng neo lề thông minh chống tràn mép màn hình (trái/phải/giữa)
  const cardRef = useRef<HTMLDivElement>(null);
  const [edgeOrigin, setEdgeOrigin] = useState<"left" | "right" | "center">("center");
  const [verticalShift, setVerticalShift] = useState(0);

  const hoverIntentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trailerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trailerReadyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unmountTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi tạo tóm tắt
  const [synopsis, setSynopsis] = useState<string>(() => {
    if (clientSynopsisCache.has(slug)) {
      return clientSynopsisCache.get(slug)!;
    }
    if (
      description &&
      !description.startsWith("Tên gốc:") &&
      !description.startsWith("Thể loại:") &&
      !description.includes("cập nhật")
    ) {
      return description;
    }
    return "";
  });
  const [isCardHovered, setIsCardHovered] = useState(false);

  // Đồng bộ Watchlist
  useEffect(() => {
    setInList(isInWatchlist(slug));
    const handleSync = () => setInList(isInWatchlist(slug));
    window.addEventListener("watchlist-updated", handleSync);
    return () => {
      window.removeEventListener("watchlist-updated", handleSync);
      if (hoverIntentTimerRef.current) clearTimeout(hoverIntentTimerRef.current);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      if (trailerReadyTimerRef.current) clearTimeout(trailerReadyTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
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

  // Lắng nghe thông báo từ YouTube iframe: fade-in khi video sẵn sàng hoặc fallback khi có lỗi
  useEffect(() => {
    if (!isPlayingTrailer) return;

    const handleMessage = (e: MessageEvent) => {
      // 1. Video thực sự PLAYING -> hủy timer chờ và kích hoạt fade-in trailer
      if (isYoutubePlayingMessage(e.data)) {
        if (trailerReadyTimerRef.current) {
          clearTimeout(trailerReadyTimerRef.current);
          trailerReadyTimerRef.current = null;
        }
        setIsTrailerReady(true);
        return;
      }

      // 2. Video gặp lỗi (100, 101, 150, 2, 5) -> Fallback poster ngay lập tức, không retry
      if (isYoutubeErrorMessage(e.data)) {
        if (trailerReadyTimerRef.current) {
          clearTimeout(trailerReadyTimerRef.current);
          trailerReadyTimerRef.current = null;
        }
        setTrailerFailed(true);
        setIsPlayingTrailer(false);
        setIsTrailerReady(false);
        return;
      }

      // 3. Video phát hết -> Loop tự động bằng API
      if (isYoutubeEndedMessage(e.data)) {
        try {
          cardIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
            "*"
          );
          cardIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: "" }),
            "*"
          );
        } catch {}
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (trailerReadyTimerRef.current) {
        clearTimeout(trailerReadyTimerRef.current);
        trailerReadyTimerRef.current = null;
      }
    };
  }, [isPlayingTrailer]);

  const displayYear = year || "";
  const displayTime = time || "";

  // Hover Intent: Chỉ kích hoạt mở rộng thẻ & tải dữ liệu sau 200ms người dùng thực sự dừng chuột
  const handleMouseEnter = () => {
    // Chỉ kích hoạt trên thiết bị desktop có hover chuột (loại bỏ hoàn toàn mobile/touch)
    if (!isDesktopWithHover()) {
      return;
    }

    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    if (hoverIntentTimerRef.current) {
      clearTimeout(hoverIntentTimerRef.current);
    }

    hoverIntentTimerRef.current = setTimeout(() => {
      hoverIntentTimerRef.current = null;
      setIsCardHovered(true);
      if (slug) {
        router.prefetch(`/movies/${slug}`);
      }
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const distLeft = rect.left;
        const distRight = window.innerWidth - rect.right;
        const threshold = Math.max(90, rect.width * 0.4);

        if (distLeft < threshold) {
          setEdgeOrigin("left");
        } else if (distRight < threshold) {
          setEdgeOrigin("right");
        } else {
          setEdgeOrigin("center");
        }

        // Tự động tính toán nâng toàn bộ thẻ hover lên khi ở gần đáy màn hình để thẻ luôn nổi trọn vẹn
        const estimatedHeight = 440;
        const spaceBelow = window.innerHeight - rect.top;
        if (spaceBelow < estimatedHeight + 20) {
          const needed = (estimatedHeight + 20) - spaceBelow;
          const maxAllowed = Math.max(0, rect.top - 75);
          setVerticalShift(-Math.min(needed, maxAllowed));
        } else {
          setVerticalShift(0);
        }
      }

      // Kiểm tra cache
      if (clientSynopsisCache.has(slug)) {
        const cached = clientSynopsisCache.get(slug)!;
        if (cached && cached !== synopsis) {
          setSynopsis(cached);
        }
      }
      if (clientExtraInfoCache.has(slug)) {
        setExtraInfo(clientExtraInfoCache.get(slug)!);
      }
      if (clientTrailerCache.has(slug)) {
        const cachedT = clientTrailerCache.get(slug)!;
        if (cachedT && cachedT !== trailerUrl) {
          setTrailerUrl(cachedT);
        }
      }

      // Tải thông tin chi tiết (Diễn viên, đạo diễn, nội dung, trailer) nếu chưa có
      if ((!synopsis || !extraInfo.actor?.length) && slug) {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(async () => {
          try {
            const data = await fetchMovieSynopsisShared(slug);
            if (data?.content) {
              clientSynopsisCache.set(slug, data.content);
              setSynopsis(data.content);
            } else if (description) {
              setSynopsis(description);
            }
            if (data?.trailer_url) {
              clientTrailerCache.set(slug, data.trailer_url);
              setTrailerUrl(data.trailer_url);
              setHasTrailerState(true);
            }
            if (data?.backdrop_url) {
              setCurrentImgSrc((prev) => {
                if (!prev || prev.includes("-poster") || prev.includes("/default-")) {
                  return data.backdrop_url || prev;
                }
                return prev;
              });
            }
            const info: MovieExtraInfo = {
              actor: data?.actor || [],
              director: data?.director || [],
              country: data?.country || [],
              category: data?.category || [],
              origin_name: data?.origin_name || origin_name,
              backdrop_url: data?.backdrop_url,
            };
            clientExtraInfoCache.set(slug, info);
            setExtraInfo(info);
          } catch {
            if (description) setSynopsis(description);
          }
        }, 650);
      }

      // Bật trailer preview sau 1.1s hover ổn định (tránh kích hoạt khi rê chuột nhanh hoặc scroll)
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
      trailerTimerRef.current = setTimeout(async () => {
        if (trailerFailed) return;

        let tUrl = clientTrailerCache.get(slug);
        if (tUrl === undefined) {
          try {
            const data = await fetchMovieSynopsisShared(slug);
            tUrl = data?.trailer_url || "";
            clientTrailerCache.set(slug, tUrl || "");
            if (data?.content && !synopsis) {
              clientSynopsisCache.set(slug, data.content);
              setSynopsis(data.content);
            }
            if (data?.actor) {
              const info: MovieExtraInfo = {
                actor: data?.actor || [],
                director: data?.director || [],
                country: data?.country || [],
                category: data?.category || [],
                origin_name: data?.origin_name || origin_name,
              };
              clientExtraInfoCache.set(slug, info);
              setExtraInfo(info);
            }
          } catch {
            tUrl = "";
          }
        }

        if (tUrl) {
          const ytId = extractYoutubeId(tUrl);
          if (ytId) {
            setTrailerUrl(tUrl);
            setIsTrailerReady(false);
            setIsPlayingTrailer(true);
          }
        }
      }, 1100);
    }, 200);
  };

  const handleMouseLeave = () => {
    // Hủy ngay lập tức hover-intent nếu người dùng chỉ lướt chuột qua thẻ (<200ms)
    if (hoverIntentTimerRef.current) {
      clearTimeout(hoverIntentTimerRef.current);
      hoverIntentTimerRef.current = null;
    }
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (trailerTimerRef.current) {
      clearTimeout(trailerTimerRef.current);
      trailerTimerRef.current = null;
    }
    if (trailerReadyTimerRef.current) {
      clearTimeout(trailerReadyTimerRef.current);
      trailerReadyTimerRef.current = null;
    }

    // Cleanup trailer iframe ngay lập tức khi rời chuột
    setIsPlayingTrailer(false);
    setIsTrailerReady(false);
    setIsMuted(true);

    // Đóng hover ngay lập tức, không delay
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    setIsCardHovered(false);
    setVerticalShift(0);
  };

  const handleToggleList = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = toggleWatchlist({
      slug,
      title,
      imageUrl,
      year: displayYear,
      genre,
      time: displayTime,
      country: displayCountry,
      type_name: displayType,
    });
    setInList(nextState);
  };

  const embedTrailerUrl = useMemo(() => {
    if (!isPlayingTrailer || !trailerUrl || trailerFailed) return null;
    return getYoutubeTrailerEmbedUrl(trailerUrl, {
      muted: true,
      controls: false,
      loop: true,
    });
  }, [isPlayingTrailer, trailerUrl, trailerFailed]);

  const modalTrailerUrl = trailerUrl
    ? getYoutubeModalUrl(trailerUrl)
    : null;

  const originClass =
    edgeOrigin === "left"
      ? "origin-top-left"
      : edgeOrigin === "right"
      ? "origin-top-right"
      : "origin-top";

  const displayActors = extraInfo.actor && extraInfo.actor.length > 0
    ? extraInfo.actor.slice(0, 3)
    : null;

  const displayDirectors = extraInfo.director && extraInfo.director.length > 0
    ? extraInfo.director.slice(0, 1)
    : null;

  const displayOrigin = extraInfo.origin_name || origin_name;

  // Quốc gia phim
  const resolvedCountry =
    initialCountry ||
    (Array.isArray(extraInfo.country) && extraInfo.country.length > 0
      ? typeof extraInfo.country[0] === "string"
        ? extraInfo.country[0]
        : (extraInfo.country[0] as { name?: string })?.name
      : typeof extraInfo.country === "string"
      ? extraInfo.country
      : undefined) ||
    extractMovieCountry({
      origin_name,
      title,
      slug,
      category: genre,
    });
  const displayCountry = resolvedCountry;

  // Loại phim: Phim lẻ / Phim bộ / Hoạt hình / Phim rạp
  const displayType = (() => {
    if (initialTypeName && initialTypeName !== "Phim lẻ") {
      return initialTypeName;
    }
    return detectMovieTypeName({
      name: title,
      title,
      slug,
      origin_name: origin_name || extraInfo.origin_name,
      category: extraInfo.category || genre,
      time: time || extraInfo.time,
      episode_current: extraInfo.episode_current,
      episode_total: extraInfo.episode_total,
      chieurap,
      sub_docquyen,
      type: extraInfo.type || initialTypeName,
    });
  })();

  // Lọc bỏ chuỗi "Đang cập nhật" trong danh sách thể loại
  const cleanGenres = genre
    ? genre
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g && !g.toLowerCase().includes("cập nhật"))
        .slice(0, 3)
    : [];

  return (
    <div
      ref={cardRef}
      className={`relative aspect-[2/3] sm:aspect-video w-full select-none focus-within:z-40 ${
        isCardHovered ? "z-50" : "z-0"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ============================================================ */}
      {/* 1. BASE CARD (Trạng thái tĩnh: Chuẩn Poster đứng 2:3 trên Mobile & 16:9 trên Desktop) */}
      {/* ============================================================ */}
      <Link
        href={`/movies/${slug}`}
        tabIndex={0}
        className={`block w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border relative transition-all duration-200 shadow-md outline-none focus-visible:ring-4 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-[1.05] focus-visible:shadow-[0_0_35px_rgba(229,9,20,0.6)] focus-visible:border-white/90 focus-visible:z-40 ${
          isCardHovered
            ? "border-white/40 shadow-[0_16px_40px_rgba(0,0,0,0.85)]"
            : "border-white/[0.12]"
        }`}
      >
        {/* Placeholder nền tối phía dưới ảnh */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 pointer-events-none" />

        <Image
          src={currentImgSrc}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
          className={`object-cover object-center transition-all duration-300 ${
            isCardHovered ? "scale-105" : "scale-100"
          }`}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          quality={85}
          onError={handleImageError}
        />

        {/* 1. GÓC TRÊN TRÁI: DÀNH CHO LOẠI PHIM (PHIM BỘ, PHIM LẺ, PHIM RẠP, HOẠT HÌNH) */}
        <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 flex items-center gap-1 sm:gap-1.5">
          {chieurap ? (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md border border-amber-400/40">
              <span>🎬 Phim Rạp</span>
            </div>
          ) : sub_docquyen ? (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md border border-purple-400/40">
              <span>💎 Độc Quyền</span>
            </div>
          ) : displayType === "Phim bộ" ? (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-blue-600/90 text-white font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md border border-blue-400/40">
              <span>📺 Phim Bộ</span>
            </div>
          ) : displayType === "Hoạt hình" ? (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-pink-600/90 text-white font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md border border-pink-400/40">
              <span>✨ Hoạt Hình</span>
            </div>
          ) : displayType === "TV Shows" ? (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-emerald-600/90 text-white font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md border border-emerald-400/40">
              <span>🎙️ TV Shows</span>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-zinc-900/95 text-gray-200 font-bold px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] uppercase tracking-wider shadow-md border border-white/20">
              <span>🎬 Phim Lẻ</span>
            </div>
          )}
        </div>

        {/* 2. GÓC TRÊN PHẢI: LUÔN CỐ ĐỊNH CHO ĐIỂM SAO VÀNG VÀ CHẤT LƯỢNG (FHD) */}
        <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 flex items-center gap-1 sm:gap-1.5">
          {rating && rating !== "N/A" && Number(rating) > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/90 border border-amber-500/40 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9.5px] sm:text-[11px] font-extrabold text-amber-400 shadow-md">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400 text-amber-400" />
              <span>{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
            </div>
          )}

          <span className="bg-black/90 border border-white/20 text-white font-bold text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg shadow-sm">
            {quality || "FHD"}
          </span>
        </div>

        {/* 3. LỚP PHỦ THÔNG TIN CHÂN CARD: HIỂN THỊ NĂM, THỜI LƯỢNG/TẬP, TIẾNG (ĐỒNG NHẤT, GỌN GÀNG, CONTRAST CAO) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 sm:via-black/75 to-transparent flex flex-col justify-end p-2.5 sm:p-4">
          {matchSnippet && (
            <div className="mb-1 flex items-center gap-1 text-[8.5px] sm:text-[9px] text-amber-300 font-bold bg-amber-950/90 border border-amber-500/30 px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm line-clamp-1">
              <span className="flex-none">💬 Khớp tóm tắt:</span>
              <span className="font-normal italic text-amber-200/90 truncate">{matchSnippet}</span>
            </div>
          )}
          <p className="text-white font-black text-xs sm:text-base line-clamp-2 sm:line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-snug sm:leading-tight">
            {title}
          </p>
          <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-semibold text-zinc-300 mt-0.5 sm:mt-1 flex-wrap">
            {displayYear && (
              <span>{displayYear}</span>
            )}
            {displayTime && (
              <>
                {displayYear && <span className="text-white/40">•</span>}
                <span className="truncate max-w-[90px] sm:max-w-[120px] text-white font-medium">{displayTime}</span>
              </>
            )}
            {lang && (
              <>
                {(displayYear || displayTime) && <span className="text-white/40">•</span>}
                <span className="text-rose-300 font-bold">{lang}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* ============================================================ */}
      {/* 2. EXPANDED HOVER CARD (Giao diện nổi thông minh, vừa vặn, chuẩn Netflix) */}
      {/* ============================================================ */}
      <div
        style={verticalShift ? { transform: `translateY(${verticalShift}px)` } : undefined}
        className={`hidden sm:block absolute top-0 left-0 w-full ${
          isCardHovered
            ? "opacity-100 pointer-events-auto scale-[1.08] md:scale-[1.10] z-50"
            : "opacity-0 pointer-events-none scale-100 z-0"
        } transition-all duration-200 ease-out ${originClass} rounded-2xl overflow-hidden keep-dark-cinema bg-zinc-950/98 backdrop-blur-2xl border border-white/30 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.98),0_0_20px_rgba(229,9,20,0.15)]`}
      >
        {isCardHovered && (
          <>
            {/* PHẦN TRÊN: VIDEO TRAILER HOẶC POSTER */}
            <div className="relative aspect-video w-full overflow-hidden bg-black group/video">
              <Link
                href={`/movies/${slug}`}
                className="block relative w-full h-full cursor-pointer"
              >
                <Image
                  src={currentImgSrc}
                  alt={title}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 450px"
                  loading="lazy"
                  decoding="async"
                  quality={85}
                  className="object-cover object-center"
                  onError={handleImageError}
                />

                {/* Video Trailer Preview tự động chạy - Poster luôn nằm dưới, trailer fade-in khi sẵn sàng */}
                {isPlayingTrailer && embedTrailerUrl && !trailerFailed && (
                  <div
                    className={`absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none transition-opacity duration-500 flex items-center justify-center ${
                      isTrailerReady ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <iframe
                      ref={cardIframeRef}
                      src={embedTrailerUrl}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] max-w-none border-0 pointer-events-none select-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      title={`Preview ${title}`}
                      onLoad={() => {
                        try {
                          cardIframeRef.current?.contentWindow?.postMessage(
                            JSON.stringify({ event: "listening" }),
                            "*"
                          );
                        } catch {}
                        if (trailerReadyTimerRef.current) clearTimeout(trailerReadyTimerRef.current);
                        trailerReadyTimerRef.current = setTimeout(() => {
                          setIsTrailerReady(true);
                        }, 500);
                      }}
                    />
                  </div>
                )}

                {/* Huy hiệu Loại phim hoặc Điểm số */}
                {rating && rating !== "N/A" && Number(rating) > 0 && !(isPlayingTrailer && isTrailerReady && !trailerFailed) ? (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/85 border border-amber-500/50 px-1.5 py-0.5 rounded text-[10px] font-extrabold text-amber-400 backdrop-blur-md shadow-md">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span>{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
                  </div>
                ) : (
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-zinc-900/90 text-white border border-white/20 px-1.5 py-0.5 rounded text-[9.5px] font-bold backdrop-blur-md shadow-md">
                    <span>{displayType}</span>
                  </div>
                )}

                <div className="absolute top-2 right-2 z-10">
                  <span className="bg-black/75 border border-white/20 text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                    {quality || "FHD"}
                  </span>
                </div>
              </Link>

              {/* Nút bật/tắt tiếng trailer preview (Sibling của Link, nằm trên cùng với z-30) */}
              {isPlayingTrailer && embedTrailerUrl && isTrailerReady && !trailerFailed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const nextMuted = !isMuted;
                    setIsMuted(nextMuted);
                    try {
                      cardIframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({
                          event: "command",
                          func: nextMuted ? "mute" : "unMute",
                          args: "",
                        }),
                        "*"
                      );
                    } catch {}
                  }}
                  title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                  className="absolute bottom-2 right-2 pointer-events-auto p-1 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 transition z-30 shadow-lg cursor-pointer hover:scale-110"
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3 text-netflix-red" />
                  )}
                </button>
              )}
            </div>

        {/* PHẦN DƯỚI: KHU VỰC THÔNG TIN (HỢP LÝ, GỌN GÀNG, ĐẦY ĐỦ NỘI DUNG & NỔI LÊN TRÊN) */}
        <div className="p-3 bg-zinc-950/95 text-white space-y-2">
          {/* 1. Hàng nút bấm hành động */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/movies/${slug}`}
                className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-transform hover:scale-110 active:scale-95 shadow-lg cursor-pointer"
                title="Xem phim ngay"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </Link>

              <button
                type="button"
                onClick={handleToggleList}
                title={inList ? "Đã thêm vào danh sách" : "Thêm vào danh sách"}
                className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  inList
                    ? "bg-white text-black border-white"
                    : "border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10"
                }`}
              >
                {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>

              {(trailerUrl || hasTrailerState || isTrailerOnly) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsPlayingTrailer(false);
                    setShowTrailerModal(true);
                  }}
                  title="Xem Trailer chính thức"
                  className="h-8 px-2.5 rounded-full border border-red-500/50 bg-red-600/20 text-red-300 hover:bg-netflix-red hover:text-white flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer text-[11px] font-bold shadow-sm"
                >
                  <Film className="h-3 w-3 text-current" />
                  <span>Trailer</span>
                </button>
              )}
            </div>

            <Link
              href={`/movies/${slug}`}
              title="Xem trang chi tiết"
              className="h-8 w-8 rounded-full border border-white/40 bg-zinc-800/80 text-white hover:border-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 2. Tiêu đề phim */}
          <div>
            <Link href={`/movies/${slug}`} className="block group/title">
              <p className="text-white font-extrabold text-sm line-clamp-1 group-hover/title:text-rose-400 transition-colors">
                {title}
              </p>
            </Link>
            {displayOrigin && displayOrigin !== title && (
              <p className="text-[10px] text-gray-400 truncate italic">
                {displayOrigin}
              </p>
            )}
          </div>

          {/* 3. Hàng chỉ số & Thông tin kỹ thuật */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-semibold">
            {rating && rating !== "N/A" && Number(rating) > 0 && (
              <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                {typeof rating === "number" ? rating.toFixed(1) : rating}
              </span>
            )}
            <span className="text-gray-300">{displayType}</span>
            {displayYear && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-gray-300">{displayYear}</span>
              </>
            )}
            {displayTime && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-gray-300">{displayTime}</span>
              </>
            )}
            {displayCountry && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-amber-300/90 font-medium">{displayCountry}</span>
              </>
            )}
            {lang && (
              <span className="bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded text-[9px] font-bold">
                {lang}
              </span>
            )}
          </div>

          {/* 4. Diễn viên hoặc Đạo diễn */}
          {displayActors && (
            <div className="pt-1 text-[10px] border-t border-white/10 flex items-start gap-1 text-gray-300 leading-tight">
              <Users className="w-3 h-3 text-rose-400 flex-none mt-0.5" />
              <span className="line-clamp-1 text-gray-300">
                <strong className="text-gray-400 font-medium">Diễn viên:</strong>{" "}
                {displayActors.join(", ")}
              </span>
            </div>
          )}

          {displayDirectors && !displayActors && (
            <div className="pt-1 text-[10px] border-t border-white/10 flex items-start gap-1 text-gray-300 leading-tight">
              <Clapperboard className="w-3 h-3 text-amber-400 flex-none mt-0.5" />
              <span className="line-clamp-1 text-gray-300">
                <strong className="text-gray-400 font-medium">Đạo diễn:</strong>{" "}
                {displayDirectors.join(", ")}
              </span>
            </div>
          )}

          {/* 5. Tóm tắt cốt truyện */}
          {matchSnippet ? (
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-left">
              <p className="text-[10px] text-amber-100/90 italic line-clamp-3 leading-relaxed">
                &ldquo;{matchSnippet}&rdquo;
              </p>
            </div>
          ) : synopsis ? (
            <p className="text-[10.5px] text-zinc-300 line-clamp-3 leading-relaxed pt-1 border-t border-white/10">
              {synopsis}
            </p>
          ) : description ? (
            <p className="text-[10.5px] text-zinc-300 line-clamp-3 leading-relaxed pt-1 border-t border-white/10">
              {description}
            </p>
          ) : null}

          {/* 6. Thể loại phim dạng danh sách tinh tế */}
          {cleanGenres.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-300 font-medium pt-0.5 flex-wrap">
              {cleanGenres.map((g, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-white/30 text-[9px]">•</span>}
                  <span className="hover:text-white transition-colors">{g}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. MODAL TRAILER MÀN ẢNH RỘNG (chỉ mount khi được mở xem thực tế) */}
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
