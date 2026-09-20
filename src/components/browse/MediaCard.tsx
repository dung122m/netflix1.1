"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Play,
  Plus,
  Check,
  ThumbsUp,
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
// In-flight shared promise map để tránh fetch 2 lần cho cùng 1 slug
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightSynopsisRequests = new Map<string, Promise<any>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchMovieSynopsisShared(slug: string): Promise<any> {
  if (!slug) return null;
  if (inFlightSynopsisRequests.has(slug)) {
    return inFlightSynopsisRequests.get(slug);
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/synopsis?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    } finally {
      inFlightSynopsisRequests.delete(slug);
    }
  })();

  inFlightSynopsisRequests.set(slug, promise);
  return promise;
}

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
  const [liked, setLiked] = useState(false);

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
    addUrl(imageUrl);
    addUrl(thumbUrl);
    addUrl(posterUrl);
    return list;
  }, [imageUrl, thumbUrl, posterUrl]);

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

  // Hướng neo lề thông minh chống tràn mép màn hình
  const cardRef = useRef<HTMLDivElement>(null);
  const [edgeOrigin, setEdgeOrigin] = useState<"left" | "right" | "center">("center");

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
  const [loadingDetails, setLoadingDetails] = useState(false);
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

  // Hover Intent: Chỉ kích hoạt mở rộng thẻ & tải dữ liệu sau 80ms người dùng thực sự dừng chuột
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
          setLoadingDetails(true);
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
                  return data.backdrop_url;
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
          } finally {
            setLoadingDetails(false);
          }
        }, 450);
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
    }, 80);
  };

  const handleMouseLeave = () => {
    // Hủy ngay lập tức hover-intent nếu người dùng chỉ lướt chuột qua thẻ
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

    // Giữ nội dung hiển thị trong suốt 280ms thời gian fade-out của card, tránh chớp nháy
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    unmountTimerRef.current = setTimeout(() => {
      setIsCardHovered(false);
      unmountTimerRef.current = null;
    }, 280);
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

  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((prev) => !prev);
  };

  const embedTrailerUrl = useMemo(() => {
    if (!isPlayingTrailer || !trailerUrl || trailerFailed) return null;
    return getYoutubeTrailerEmbedUrl(trailerUrl, {
      muted: isMuted,
      controls: false,
      loop: true,
    });
  }, [isPlayingTrailer, trailerUrl, trailerFailed, isMuted]);

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
      className="relative aspect-video w-full group select-none hover:z-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ============================================================ */}
      {/* 1. BASE CARD (Trạng thái tĩnh chuẩn 16:9 - To rõ, đẹp mắt) */}
      {/* ============================================================ */}
      <Link
        href={`/movies/${slug}`}
        className="block w-full h-full rounded-2xl overflow-hidden bg-zinc-950 border border-white/[0.12] relative transition-all duration-300 shadow-md group-hover:border-white/40 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.85)]"
      >
        <Image
          src={currentImgSrc}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
          className="object-cover object-center group-hover:scale-105 transition-all duration-300"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          quality={85}
          onError={handleImageError}
        />

        {/* 1. GÓC TRÊN TRÁI: DÀNH CHO LOẠI PHIM (PHIM BỘ, PHIM LẺ, PHIM RẠP, HOẠT HÌNH) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          {chieurap ? (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-amber-400/40">
              <span>🎬 Phim Rạp</span>
            </div>
          ) : sub_docquyen ? (
            <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-purple-400/40">
              <span>💎 Độc Quyền</span>
            </div>
          ) : displayType === "Phim bộ" ? (
            <div className="flex items-center gap-1 bg-blue-600/90 text-white font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-blue-400/40">
              <span>📺 Phim Bộ</span>
            </div>
          ) : displayType === "Hoạt hình" ? (
            <div className="flex items-center gap-1 bg-pink-600/90 text-white font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-pink-400/40">
              <span>✨ Hoạt Hình</span>
            </div>
          ) : displayType === "TV Shows" ? (
            <div className="flex items-center gap-1 bg-emerald-600/90 text-white font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-emerald-400/40">
              <span>🎙️ TV Shows</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-zinc-900/85 text-gray-200 font-bold px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-white/20">
              <span>🎬 Phim Lẻ</span>
            </div>
          )}
        </div>

        {/* 2. GÓC TRÊN PHẢI: LUÔN CỐ ĐỊNH CHO ĐIỂM SAO VÀNG VÀ CHẤT LƯỢNG (FHD) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {rating && rating !== "N/A" && Number(rating) > 0 && (
            <div className="flex items-center gap-1 bg-black/85 border border-amber-500/40 px-2 py-0.5 rounded-lg text-[10.5px] sm:text-[11px] font-extrabold text-amber-400 backdrop-blur-md shadow-md">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
            </div>
          )}

          <span className="bg-black/80 border border-white/20 text-white font-bold text-[10px] px-2 py-0.5 rounded-lg backdrop-blur-md shadow-sm">
            {quality || "FHD"}
          </span>
        </div>

        {/* 3. LỚP PHỦ THÔNG TIN CHÂN CARD: HIỂN THỊ NĂM, THỜI LƯỢNG/TẬP, TIẾNG (ĐỒNG NHẤT, GỌN GÀNG, CONTRAST CAO) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col justify-end p-3 sm:p-4">
          {matchSnippet && (
            <div className="mb-1.5 flex items-center gap-1 text-[9px] text-amber-300 font-bold bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md backdrop-blur-md shadow-sm line-clamp-1">
              <span className="flex-none">💬 Khớp tóm tắt:</span>
              <span className="font-normal italic text-amber-200/90 truncate">{matchSnippet}</span>
            </div>
          )}
          <p className="text-white font-black text-sm sm:text-base line-clamp-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {title}
          </p>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mt-1 flex-wrap">
            {displayYear && (
              <span>{displayYear}</span>
            )}
            {displayTime && (
              <>
                {displayYear && <span className="text-white/40">•</span>}
                <span className="truncate max-w-[120px] text-white font-medium">{displayTime}</span>
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
      {/* 2. EXPANDED HOVER CARD (Giao diện tinh gọn, vừa vặn, chuẩn Netflix) */}
      {/* ============================================================ */}
      <div
        className={`hidden sm:block absolute top-0 left-0 w-full opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-[1.08] md:group-hover:scale-[1.10] group-hover:z-50 transition-all duration-250 ease-out delay-0 group-hover:delay-150 ${originClass} rounded-2xl overflow-hidden keep-dark-cinema bg-zinc-950/95 backdrop-blur-2xl border border-white/30 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.98),0_0_20px_rgba(229,9,20,0.15)] will-change-transform`}
      >
        {isCardHovered && (
          <>
            {/* PHẦN TRÊN: VIDEO TRAILER HOẶC POSTER */}
            <Link
              href={`/movies/${slug}`}
              className="block relative aspect-video w-full overflow-hidden bg-black cursor-pointer group/video"
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

          {/* Nút bật/tắt tiếng trailer preview */}
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

        {/* PHẦN DƯỚI: KHU VỰC THÔNG TIN (HỢP LÝ, GỌN GÀNG, KHÔNG RÁC THÔNG TIN) */}
        <div className="p-2.5 sm:p-3 bg-zinc-900 text-white space-y-1.5">
          {/* 1. Hàng nút bấm hành động */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/movies/${slug}`}
                className="h-7.5 w-7.5 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-transform hover:scale-110 active:scale-95 shadow-lg cursor-pointer"
                title="Xem phim ngay"
              >
                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
              </Link>

              <button
                type="button"
                onClick={handleToggleList}
                title={inList ? "Đã thêm vào danh sách" : "Thêm vào danh sách"}
                className={`h-7.5 w-7.5 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  inList
                    ? "bg-white text-black border-white"
                    : "border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10"
                }`}
              >
                {inList ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={handleToggleLike}
                title={liked ? "Đã thích" : "Thích"}
                className={`h-7.5 w-7.5 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  liked
                    ? "bg-netflix-red text-white border-netflix-red"
                    : "border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10"
                }`}
              >
                <ThumbsUp className={`h-3 w-3 ${liked ? "fill-current" : ""}`} />
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
                  className="h-7.5 px-2 rounded-full border border-red-500/50 bg-red-600/20 text-red-300 hover:bg-netflix-red hover:text-white flex items-center gap-1 transition-all hover:scale-105 active:scale-95 cursor-pointer text-[11px] font-bold shadow-sm"
                >
                  <Film className="h-3 w-3 text-current" />
                  <span>Trailer</span>
                </button>
              )}
            </div>

            <Link
              href={`/movies/${slug}`}
              title="Thông tin chi tiết"
              className="h-7.5 w-7.5 rounded-full border border-white/40 bg-zinc-800/80 text-white hover:border-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* 2. Tiêu đề phim & Tên gốc */}
          <div>
            <Link href={`/movies/${slug}`} className="block group/title">
              <p className="text-white font-extrabold text-xs sm:text-[13px] line-clamp-1 group-hover/title:text-rose-400 transition-colors">
                {title}
              </p>
            </Link>
            {displayOrigin && displayOrigin !== title && (
              <p className="text-[9.5px] text-gray-400 truncate italic">
                {displayOrigin}
              </p>
            )}
          </div>

          {/* 3. Hàng chỉ số & Thông tin kỹ thuật (Phim bộ/lẻ, Quốc gia, Năm, Thời lượng, Ngôn ngữ) */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
            <span className="bg-white/10 border border-white/15 text-white font-bold px-1.5 py-0.2 rounded text-[9px]">
              {displayType}
            </span>
            {displayCountry && (
              <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold px-1.5 py-0.2 rounded text-[9px]">
                {displayCountry}
              </span>
            )}
            {chieurap && (
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold px-1.5 py-0.2 rounded text-[8.5px] uppercase tracking-wide shadow-sm">
                🎬 Rạp
              </span>
            )}
            {sub_docquyen && (
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold px-1.5 py-0.2 rounded text-[8.5px] uppercase tracking-wide shadow-sm">
                💎 Độc Quyền
              </span>
            )}
            {displayYear && <span className="text-gray-300">{displayYear}</span>}
            {displayTime && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-gray-300">{displayTime}</span>
              </>
            )}
            {lang && (
              <span className="bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded text-[9px] font-bold">
                {lang}
              </span>
            )}
          </div>

          {/* 4. THÔNG TIN DIỄN VIÊN / ĐẠO DIỄN (CHỈ HIỆN KHI CÓ DỮ LIỆU) */}
          {displayActors && (
            <div className="pt-1 text-[10px] border-t border-white/10 flex items-start gap-1 text-gray-300 leading-tight">
              <Users className="w-2.5 h-2.5 text-rose-400 flex-none mt-0.5" />
              <span className="line-clamp-1 text-gray-300">
                <strong className="text-gray-400 font-medium">Diễn viên:</strong>{" "}
                {displayActors.join(", ")}
              </span>
            </div>
          )}

          {displayDirectors && !displayActors && (
            <div className="pt-1 text-[10px] border-t border-white/10 flex items-start gap-1 text-gray-300 leading-tight">
              <Clapperboard className="w-2.5 h-2.5 text-amber-400 flex-none mt-0.5" />
              <span className="line-clamp-1 text-gray-300">
                <strong className="text-gray-400 font-medium">Đạo diễn:</strong>{" "}
                {displayDirectors.join(", ")}
              </span>
            </div>
          )}

          {/* 5. Tóm tắt cốt truyện (Hiển thị 5 dòng mô tả đầy đủ, chi tiết) */}
          {matchSnippet ? (
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 my-1 text-left">
              <p className="text-[9.5px] font-bold text-amber-300 flex items-center gap-1 mb-0.5">
                <span>💬 Khớp trong tóm tắt nội dung phim:</span>
              </p>
              <p className="text-[10.5px] text-amber-100/90 italic leading-relaxed line-clamp-4">
                &ldquo;{matchSnippet}&rdquo;
              </p>
            </div>
          ) : synopsis ? (
            <p className="text-[10.5px] text-zinc-300 line-clamp-5 leading-relaxed pt-1 border-t border-white/10">
              {synopsis}
            </p>
          ) : loadingDetails ? (
            <div className="w-full space-y-1.5 pt-1 animate-pulse">
              <div className="h-1.5 bg-white/20 rounded w-full"></div>
              <div className="h-1.5 bg-white/15 rounded w-5/6"></div>
              <div className="h-1.5 bg-white/10 rounded w-4/5"></div>
            </div>
          ) : description ? (
            <p className="text-[10.5px] text-zinc-300 line-clamp-5 leading-relaxed pt-1 border-t border-white/10">
              {description}
            </p>
          ) : null}

          {/* 6. Thẻ thể loại chi tiết */}
          {cleanGenres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-white/10">
              {cleanGenres.map((g, i) => (
                <span
                  key={i}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 px-1.5 py-0.2 rounded text-[9px] text-gray-300 font-medium transition-colors"
                >
                  {g}
                </span>
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
