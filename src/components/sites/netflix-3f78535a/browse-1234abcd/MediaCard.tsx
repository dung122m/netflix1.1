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
} from "lucide-react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";

// Bộ nhớ đệm tóm tắt và trailer phim dùng chung tại client
export const clientSynopsisCache = new Map<string, string>();
export const clientTrailerCache = new Map<string, string>();

function getYoutubeEmbedUrl(url?: string | null, muted = true): string | null {
  if (!url) return null;
  try {
    let videoId = "";
    if (url.includes("watch?v=")) {
      videoId = new URL(url).searchParams.get("v") || "";
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("youtube.com/embed/")[1]?.split("?")[0] || "";
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${
      muted ? 1 : 0
    }&controls=0&modestbranding=1&rel=0&loop=1&playlist=${videoId}&disablekb=1&fs=0`;
  } catch {
    return null;
  }
}

function getYoutubeModalUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    let videoId = "";
    if (url.includes("watch?v=")) {
      videoId = new URL(url).searchParams.get("v") || "";
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
    } else if (url.includes("youtube.com/embed/")) {
      videoId = url.split("youtube.com/embed/")[1]?.split("?")[0] || "";
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1&rel=0`;
  } catch {
    return null;
  }
}

interface MediaCardProps {
  slug: string;
  title: string;
  imageUrl: string;
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
}

const MediaCardInner: React.FC<MediaCardProps> = ({
  slug,
  title,
  imageUrl,
  genre,
  description,
  priority = false,
  time,
  year,
  rating,
  quality,
  lang,
  rank,
  chieurap,
  sub_docquyen,
}) => {
  const [inList, setInList] = useState(false);
  const [liked, setLiked] = useState(false);

  // Trailer Video & Modal States
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [trailerUrl, setTrailerUrl] = useState<string>(() => clientTrailerCache.get(slug) || "");
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // Tham chiếu và hướng neo lề thông minh (chống tràn/mất nội dung ở 2 bên mép màn hình)
  const cardRef = useRef<HTMLDivElement>(null);
  const [edgeOrigin, setEdgeOrigin] = useState<"left" | "right" | "center">("center");

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trailerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Khởi tạo tóm tắt từ client cache hoặc prop description
  const [synopsis, setSynopsis] = useState<string>(() => {
    if (clientSynopsisCache.has(slug)) {
      return clientSynopsisCache.get(slug)!;
    }
    if (
      description &&
      !description.startsWith("Tên gốc:") &&
      !description.startsWith("Thể loại:") &&
      !description.includes("Nội dung phim đang được cập nhật")
    ) {
      return description;
    }
    return "";
  });
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);

  // Tự động tính toán vị trí thẻ so với mép màn hình khi nạp & khi đổi kích thước cửa sổ
  useEffect(() => {
    const updateOrigin = () => {
      if (!cardRef.current) return;
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
    };

    updateOrigin();
    window.addEventListener("resize", updateOrigin, { passive: true });
    return () => window.removeEventListener("resize", updateOrigin);
  }, []);

  // Đồng bộ trạng thái danh sách yêu thích từ localStorage
  useEffect(() => {
    setInList(isInWatchlist(slug));
    const handleSync = () => setInList(isInWatchlist(slug));
    window.addEventListener("watchlist-updated", handleSync);
    return () => {
      window.removeEventListener("watchlist-updated", handleSync);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current);
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

  const displayYear = year || "Mới";
  const displayTime = time || "";

  // Tạo % match ngẫu nhiên nhưng cố định dựa theo tên phim để chuẩn Netflix
  const matchScore = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0;
    }
    return 92 + (Math.abs(hash) % 7); // 92% - 98%
  }, [title]);

  // Hover Intent:
  // 1. Sau 150ms: Nạp tóm tắt & kiểm tra trailer
  // 2. Sau 700ms: Bật trailer preview (khi người dùng dừng chuột lại ngắm phim)
  const handleMouseEnter = () => {
    // 0. Cập nhật vị trí neo lề chính xác ngay khi rê chuột (tránh tràn mép)
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

    // 1. Kiểm tra cache
    if (clientSynopsisCache.has(slug)) {
      const cached = clientSynopsisCache.get(slug)!;
      if (cached && cached !== synopsis) {
        setSynopsis(cached);
      }
    }
    if (clientTrailerCache.has(slug)) {
      const cachedT = clientTrailerCache.get(slug)!;
      if (cachedT && cachedT !== trailerUrl) {
        setTrailerUrl(cachedT);
      }
    }

    if (!synopsis && !loadingSynopsis && slug) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(() => {
        setLoadingSynopsis(true);
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
            }
          })
          .catch(() => {
            if (description) setSynopsis(description);
          })
          .finally(() => {
            setLoadingSynopsis(false);
          });
      }, 150);
    }

    // 2. Trailer Preview (Debounce 700ms)
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
    // Hủy ngay trailer khi nhấc chuột ra ngoài để giải phóng 100% RAM & GPU
    setIsPlayingTrailer(false);
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

  // Hướng bung mở: mép trái bung sang phải, mép phải bung sang trái, ở giữa bung đều
  const originClass =
    edgeOrigin === "left"
      ? "origin-top-left"
      : edgeOrigin === "right"
      ? "origin-top-right"
      : "origin-top";

  return (
    <div
      ref={cardRef}
      className="relative aspect-video w-full group select-none hover:z-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ============================================================ */}
      {/* 1. BASE CARD (Trạng thái tĩnh chuẩn 16:9 - Giữ vững bố cục lưới) */}
      {/* ============================================================ */}
      <Link
        href={`/movies/${slug}`}
        className="block w-full h-full rounded-xl overflow-hidden bg-zinc-900 border border-white/10 relative transition-transform duration-300"
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />

        {/* Huy hiệu TOP 10 Thịnh Hành hoặc Điểm số ở góc trái */}
        {rank && rank <= 10 ? (
          <div
            className={`absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-lg border ${
              rank === 1
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-300"
                : rank === 2
                ? "bg-gradient-to-r from-slate-200 to-gray-300 text-black border-white"
                : rank === 3
                ? "bg-gradient-to-r from-amber-700 to-orange-600 text-white border-orange-400"
                : "bg-netflix-red text-white border-red-500/40"
            }`}
          >
            <span>{rank === 1 ? "👑 TOP 1" : `TOP ${rank}`}</span>
          </div>
        ) : rating && rating !== "N/A" && Number(rating) > 0 ? (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/85 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10.5px] font-extrabold text-amber-400 backdrop-blur-md shadow-md">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
          </div>
        ) : null}

        {/* Cụm huy hiệu góc trên phải: Rating (nếu đã có rank ở góc trái) + Chiếu rạp + Độc quyền */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {rank && rank <= 10 && rating && rating !== "N/A" && Number(rating) > 0 && (
            <div className="flex items-center gap-1 bg-black/85 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-extrabold text-amber-400 backdrop-blur-md shadow-md">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
            </div>
          )}
          {chieurap && (
            <div className="flex items-center gap-0.5 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black px-1.5 py-0.5 rounded text-[9.5px] uppercase tracking-wider backdrop-blur-md shadow-md border border-amber-400/40">
              <span>🎬 Rạp</span>
            </div>
          )}
          {sub_docquyen && (
            <div className="flex items-center gap-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-1.5 py-0.5 rounded text-[9.5px] uppercase tracking-wider backdrop-blur-md shadow-md border border-purple-400/40">
              <span>💎 Độc quyền</span>
            </div>
          )}
        </div>

        {/* Lớp phủ mặc định ở chân card */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-2.5 sm:p-3">
          <h4 className="text-white font-bold text-xs sm:text-sm line-clamp-1 drop-shadow-md">
            {title}
          </h4>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-gray-300 mt-0.5">
            <span className="text-emerald-400 font-semibold">{matchScore}% Phù hợp</span>
            <span className="text-white/30">•</span>
            <span>{displayYear}</span>
            {displayTime && (
              <>
                <span className="text-white/30">•</span>
                <span className="truncate max-w-[80px]">{displayTime}</span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* ============================================================ */}
      {/* 2. EXPANDED HOVER CARD (Phóng to ngoạn mục, bung mở đa năng) */}
      {/* ============================================================ */}
      <div
        className={`hidden sm:block absolute top-0 left-0 w-full opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-[1.28] sm:group-hover:scale-[1.32] md:group-hover:scale-[1.35] group-hover:z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] delay-0 group-hover:delay-150 ${originClass} rounded-2xl overflow-hidden bg-zinc-900 border border-white/25 shadow-[0_30px_75px_rgba(0,0,0,0.98)] will-change-transform`}
      >
        {/* PHẦN TRÊN: 16:9 VIDEO TRAILER HOẶC POSTER SẮC NÉT (KHÔNG BỊ CHỮ CHE LẤP) */}
        <Link
          href={`/movies/${slug}`}
          className="block relative aspect-video w-full overflow-hidden bg-black cursor-pointer group/video"
        >
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-opacity duration-300 ${
              isPlayingTrailer && embedTrailerUrl ? "opacity-0" : "opacity-100"
            }`}
          />

          {/* Video Trailer Preview tự động chạy không viền */}
          {isPlayingTrailer && embedTrailerUrl && (
            <div className="absolute inset-0 z-0 bg-black overflow-hidden pointer-events-none animate-in fade-in duration-300">
              <iframe
                src={embedTrailerUrl}
                className="w-[140%] h-[140%] -ml-[20%] -mt-[20%] border-0 object-cover"
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
              className="absolute bottom-2.5 right-2.5 pointer-events-auto p-1.5 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 transition z-30 shadow-lg cursor-pointer hover:scale-110"
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-netflix-red" />
              )}
            </button>
          )}

          {/* Huy hiệu TOP 10 hoặc Điểm số */}
          {rank && rank <= 10 && !isPlayingTrailer ? (
            <div
              className={`absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-md border ${
                rank === 1
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-300"
                  : "bg-netflix-red text-white border-red-500/50"
              }`}
            >
              <span>{rank === 1 ? "👑 TOP 1 Thịnh Hành" : `TOP ${rank} Thịnh Hành`}</span>
            </div>
          ) : rating && rating !== "N/A" && Number(rating) > 0 && !isPlayingTrailer ? (
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 bg-black/85 border border-amber-500/50 px-1.5 py-0.5 rounded text-[10.5px] font-extrabold text-amber-400 backdrop-blur-md shadow-md">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
            </div>
          ) : null}

          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="bg-black/75 border border-white/20 text-white/90 text-[9.5px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
              {quality || "HD 4K"}
            </span>
          </div>
        </Link>

        {/* PHẦN DƯỚI: KHU VỰC THÔNG TIN & TÍNH NĂNG MỞ RỘNG (EXPANDED DETAILS PANEL) */}
        <div className="p-3 sm:p-3.5 bg-zinc-900 text-white space-y-2">
          {/* 1. Hàng nút bấm hành động tương tác */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Nút Xem Phim (Play) */}
              <Link
                href={`/movies/${slug}`}
                className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-transform hover:scale-110 active:scale-95 shadow-lg cursor-pointer"
                title="Xem phim ngay"
              >
                <Play className="h-4 w-4 fill-current ml-0.5" />
              </Link>

              {/* Nút Thêm vào danh sách yêu thích */}
              <button
                type="button"
                onClick={handleToggleList}
                title={inList ? "Đã thêm vào danh sách" : "Thêm vào danh sách"}
                className={`h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  inList
                    ? "bg-white text-black border-white"
                    : "border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10"
                }`}
              >
                {inList ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>

              {/* Nút Thích */}
              <button
                type="button"
                onClick={handleToggleLike}
                title={liked ? "Đã thích" : "Thích"}
                className={`h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer ${
                  liked
                    ? "bg-netflix-red text-white border-netflix-red"
                    : "border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10"
                }`}
              >
                <ThumbsUp className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
              </button>

              {/* Nút Xem Trailer nhanh (Popup Trailer lớn) nếu có trailerUrl */}
              {trailerUrl && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsPlayingTrailer(false);
                    setShowTrailerModal(true);
                  }}
                  title="Xem Trailer màn hình rộng"
                  className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full border border-white/40 bg-zinc-800/80 text-white hover:border-white hover:bg-white/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                >
                  <Film className="h-3.5 w-3.5 text-netflix-red" />
                </button>
              )}
            </div>

            {/* Nút Chi tiết */}
            <Link
              href={`/movies/${slug}`}
              title="Thông tin chi tiết"
              className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full border border-white/40 bg-zinc-800/80 text-white hover:border-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 2. Tiêu đề phim to rõ */}
          <Link href={`/movies/${slug}`} className="block group/title">
            <h4 className="text-white font-black text-xs sm:text-sm md:text-base line-clamp-1 group-hover/title:text-red-500 transition-colors">
              {title}
            </h4>
          </Link>

          {/* 3. Hàng chỉ số & Thông tin kỹ thuật */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] sm:text-xs font-semibold">
            {rank && rank <= 10 && (
              <span className="bg-netflix-red text-white font-black px-1.5 py-0.2 rounded text-[9.5px] uppercase tracking-wider shadow-sm">
                #{rank} Thịnh hành
              </span>
            )}
            {chieurap && (
              <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wide shadow-sm">
                🎬 Chiếu Rạp
              </span>
            )}
            {sub_docquyen && (
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wide shadow-sm">
                💎 Độc Quyền
              </span>
            )}
            {rating && rating !== "N/A" && Number(rating) > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400 font-extrabold bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 rounded text-[10px]">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                {typeof rating === "number" ? rating.toFixed(1) : rating}
              </span>
            )}
            <span className="text-emerald-400 font-bold">{matchScore}% Phù hợp</span>
            <span className="border border-white/30 px-1.5 py-0.2 rounded text-[9.5px] text-gray-200">
              {quality || "HD 4K"}
            </span>
            {displayYear && <span className="text-gray-300">{displayYear}</span>}
            {displayTime && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-gray-300">{displayTime}</span>
              </>
            )}
            {lang && (
              <span className="bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded text-[9.5px] font-bold">
                {lang}
              </span>
            )}
          </div>

          {/* 4. Tóm tắt cốt truyện mở rộng - Hiển thị 3-4 dòng rõ ràng, sắc nét */}
          <div className="min-h-[2.8rem] flex items-start">
            {synopsis ? (
              <p className="text-[11px] sm:text-[11.5px] text-gray-300 line-clamp-3 leading-relaxed">
                {synopsis}
              </p>
            ) : loadingSynopsis ? (
              <div className="w-full space-y-1 pt-1 animate-pulse">
                <div className="h-2 bg-white/20 rounded w-full"></div>
                <div className="h-2 bg-white/15 rounded w-5/6"></div>
                <div className="h-2 bg-white/10 rounded w-3/4"></div>
              </div>
            ) : description ? (
              <p className="text-[10.5px] sm:text-[11px] text-gray-300 line-clamp-3 leading-relaxed">
                {description}
              </p>
            ) : (
              <p className="text-[10.5px] text-gray-500 italic">
                Nội dung phim đang được cập nhật...
              </p>
            )}
          </div>

          {/* 5. Các thẻ thể loại chi tiết */}
          {genre && (
            <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-white/10">
              {genre.split(",").slice(0, 4).map((g, i) => (
                <span
                  key={i}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 px-1.5 py-0.5 rounded text-[9.5px] text-gray-300 font-medium transition-colors"
                >
                  {g.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MODAL TRAILER MÀN ẢNH RỘNG (Full Theater Popup) */}
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
            {/* MODAL HEADER */}
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

            {/* VIDEO IFRAME */}
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

