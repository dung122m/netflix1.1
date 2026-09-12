"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  X,
  Users,
  Clapperboard,
} from "lucide-react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { extractMovieCountry } from "@/lib/movieMedia";

export interface MovieExtraInfo {
  actor?: string[];
  director?: string[];
  country?: string[];
  category?: string[];
  origin_name?: string;
}

// Bộ nhớ đệm client
export const clientSynopsisCache = new Map<string, string>();
export const clientTrailerCache = new Map<string, string>();
export const clientExtraInfoCache = new Map<string, MovieExtraInfo>();

export function extractYoutubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

function getYoutubeEmbedUrl(url?: string | null, muted = true): string | null {
  const videoId = extractYoutubeId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${
    muted ? 1 : 0
  }&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}&disablekb=1&fs=0&iv_load_policy=3&playsinline=1`;
}

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
}) => {
  const [inList, setInList] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  // Danh sách các link ảnh dự phòng theo thứ tự ưu tiên
  const candidateImages = React.useMemo(() => {
    const list: string[] = [];
    if (imageUrl) list.push(imageUrl);
    if (thumbUrl && !list.includes(thumbUrl)) list.push(thumbUrl);
    if (posterUrl && !list.includes(posterUrl)) list.push(posterUrl);
    return list.filter(
      (u) =>
        Boolean(u) &&
        !u.includes("/undefined") &&
        !u.includes("/null") &&
        !u.startsWith("/default-")
    );
  }, [imageUrl, thumbUrl, posterUrl]);

  const [imageAttemptIndex, setImageAttemptIndex] = useState(0);
  const [currentImgSrc, setCurrentImgSrc] = useState(
    candidateImages[0] || imageUrl || "/default-hero.svg"
  );

  useEffect(() => {
    setImageAttemptIndex(0);
    setCurrentImgSrc(candidateImages[0] || imageUrl || "/default-hero.svg");
  }, [imageUrl, candidateImages]);

  const handleImageError = () => {
    // 1. Nếu đang thử link TMDb CDN (từ VSMOV) bị lỗi 404, thử link gốc lưu trữ VSMOV
    if (currentImgSrc.includes("image.tmdb.org")) {
      const match = currentImgSrc.match(/\/w500\/([a-zA-Z0-9_-]{20,}\.(?:jpg|jpeg|png|webp))/i);
      if (match) {
        setCurrentImgSrc(`https://vsmov.com/storage/images/${match[1]}`);
        return;
      }
    }

    // 2. Chuyển sang nguồn ảnh tiếp theo trong danh sách candidate (vd: từ thumb_url bị 404 sang poster_url hoạt động tốt)
    const nextIdx = imageAttemptIndex + 1;
    if (nextIdx < candidateImages.length) {
      setImageAttemptIndex(nextIdx);
      setCurrentImgSrc(candidateImages[nextIdx]);
      return;
    }

    // 3. Nếu tất cả đều lỗi 404, chuyển về ảnh placeholder
    setCurrentImgSrc("/default-hero.svg");
    setIsImgLoaded(true);
  };

  // Trailer Video & Modal States
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
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

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trailerTimerRef = useRef<NodeJS.Timeout | null>(null);
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
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
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

  const displayYear = year || "";
  const displayTime = time || "";

  // Hover Intent: Nạp thông tin diễn viên, tóm tắt và trailer
  const handleMouseEnter = () => {
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
    setIsCardHovered(true);
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

    // Tải thông tin chi tiết (Diễn viên, đạo diễn, nội dung) nếu chưa có
    if ((!synopsis || !extraInfo.actor?.length) && slug) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setLoadingDetails(true);
        fetch(`/api/synopsis?slug=${encodeURIComponent(slug)}`)
          .then((res) => res.json())
          .then((data) => {
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
            const info: MovieExtraInfo = {
              actor: data?.actor || [],
              director: data?.director || [],
              country: data?.country || [],
              category: data?.category || [],
              origin_name: data?.origin_name || origin_name,
            };
            clientExtraInfoCache.set(slug, info);
            setExtraInfo(info);
          })
          .catch(() => {
            if (description) setSynopsis(description);
          })
          .finally(() => {
            setLoadingDetails(false);
          });
      }, 100);
    }

    // Bật trailer preview sau 700ms hover
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
    trailerTimerRef.current = setTimeout(async () => {
      let tUrl = clientTrailerCache.get(slug);
      if (tUrl === undefined) {
        try {
          const res = await fetch(`/api/synopsis?slug=${encodeURIComponent(slug)}`);
          const data = await res.json();
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
        setTrailerUrl(tUrl);
        setIsPlayingTrailer(true);
      }
    }, 700);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (trailerTimerRef.current) {
      clearTimeout(trailerTimerRef.current);
      trailerTimerRef.current = null;
    }
    setIsPlayingTrailer(false);

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

  const embedTrailerUrl = trailerUrl
    ? getYoutubeEmbedUrl(trailerUrl, isMuted)
    : null;

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
  const displayType =
    initialTypeName ||
    (Array.isArray(extraInfo.category) &&
    extraInfo.category.some((c) =>
      typeof c === "string" ? c.includes("Bộ") : (c as { name?: string })?.name?.includes("Bộ")
    )
      ? "Phim bộ"
      : chieurap
      ? "Phim rạp"
      : "Phim lẻ");

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
        {/* Placeholder gradient mượt mà chống giật hình ảnh */}
        {!isImgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 z-0" />
        )}

        <Image
          src={currentImgSrc}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
          className="object-cover object-top group-hover:scale-105 transition-transform duration-300"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setIsImgLoaded(true)}
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

        {/* 3. LỚP PHỦ THÔNG TIN CHÂN CARD: HIỂN THỊ NĂM, THỜI LƯỢNG/TẬP, TIẾNG (ĐỒNG NHẤT, GỌN GÀNG) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3 sm:p-4">
          <h4 className="text-white font-black text-sm sm:text-base line-clamp-1 drop-shadow-md">
            {title}
          </h4>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 mt-1 flex-wrap">
            {displayYear && (
              <span>{displayYear}</span>
            )}
            {displayTime && (
              <>
                {displayYear && <span className="text-white/30">•</span>}
                <span className="truncate max-w-[120px]">{displayTime}</span>
              </>
            )}
            {lang && (
              <>
                {(displayYear || displayTime) && <span className="text-white/30">•</span>}
                <span className="text-rose-400 font-bold">{lang}</span>
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
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={`object-cover object-top transition-opacity duration-300 ${
              isPlayingTrailer && embedTrailerUrl ? "opacity-0" : "opacity-100"
            }`}
            onError={handleImageError}
          />

          {/* Video Trailer Preview tự động chạy */}
          {isPlayingTrailer && embedTrailerUrl && (
            <div className="absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none animate-in fade-in duration-300">
              <iframe
                src={embedTrailerUrl}
                className="w-[160%] h-[160%] -ml-[30%] -mt-[30%] border-0 object-cover pointer-events-none select-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title={`Preview ${title}`}
              />
            </div>
          )}

          {/* Nút bật/tắt tiếng trailer preview */}
          {isPlayingTrailer && embedTrailerUrl && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMuted((prev) => !prev);
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
          {rating && rating !== "N/A" && Number(rating) > 0 && !isPlayingTrailer ? (
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
              <h4 className="text-white font-extrabold text-xs sm:text-[13px] line-clamp-1 group-hover/title:text-netflix-red transition-colors">
                {title}
              </h4>
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

          {/* 5. Tóm tắt cốt truyện */}
          {synopsis ? (
            <p className="text-[10px] text-gray-300 line-clamp-2 leading-relaxed">
              {synopsis}
            </p>
          ) : loadingDetails ? (
            <div className="w-full space-y-1 pt-1 animate-pulse">
              <div className="h-1.5 bg-white/20 rounded w-full"></div>
              <div className="h-1.5 bg-white/15 rounded w-3/4"></div>
            </div>
          ) : description ? (
            <p className="text-[10px] text-gray-300 line-clamp-2 leading-relaxed">
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
      {/* 3. MODAL TRAILER MÀN ẢNH RỘNG */}
      {/* ============================================================ */}
      {showTrailerModal && modalTrailerUrl && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowTrailerModal(false);
          }}
          className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl overflow-hidden border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-zinc-900/80">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-netflix-red" />
                <h3 className="text-white font-bold text-sm sm:text-base truncate max-w-[500px]">
                  Trailer: {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTrailerModal(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={modalTrailerUrl}
                title={`Trailer ${title}`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const MediaCard = React.memo(MediaCardInner);
export default MediaCard;
