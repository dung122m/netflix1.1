"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Plus, ThumbsUp, ChevronDown } from "lucide-react";
import { movieApi } from "@/services/movieApi";

interface MediaCardProps {
  slug: string;
  title: string;
  imageUrl: string;
  genre: string;
  description?: string;
  priority?: boolean;
  time?: string;
  year?: string | number;
}

interface MovieDetail {
  imdb?: {
    vote_average?: number | string;
    rating?: number | string;
  };
  tmdb?: {
    vote_average?: number | string;
  };
  vote_average?: number | string;
  rating?: number | string;
  year?: string | number;
  quality?: string;
  time?: string;
  actor?: string[];
  content?: string;
}

const descriptionCache = new Map<string, MovieDetail>();

const MediaCardInner: React.FC<MediaCardProps> = ({
  slug,
  title,
  imageUrl,
  genre,
  description: initialDescription,
  priority = false,
  time,
  year,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [movieDetail, setMovieDetail] = useState<MovieDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimeoutRef.current = setTimeout(async () => {
      if (descriptionCache.has(slug)) {
        setMovieDetail(descriptionCache.get(slug) || null);
        return;
      }

      if (!movieDetail) {
        setIsLoading(true);
        try {
          const source = imageUrl.includes("vsmov.com") ? "vsmov" : "ophim";
          const detail = await movieApi.getMovieDetail(slug, source);

          const data = detail?.data?.movie || detail?.movie;
          if (data) {
            setMovieDetail(data);
            descriptionCache.set(slug, data);
          }
        } catch (error) {
          console.error("Lỗi tải chi tiết:", error);
        } finally {
          setIsLoading(false);
        }
      }
    }, 400);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const score =
    movieDetail?.imdb?.vote_average || movieDetail?.tmdb?.vote_average || "N/A";
  const detailYear = movieDetail?.year || year || "N/A";
  const quality = movieDetail?.quality || "FHD";
  const detailTime = movieDetail?.time || time || "N/A";
  const actors = movieDetail?.actor?.slice(0, 3).join(", ");

  const rawDesc = movieDetail?.content
    ? String(movieDetail.content)
        .replace(/<[^>]*>/g, "")
        .trim()
    : initialDescription;

  return (
    <div
      className="relative aspect-video w-full snap-start group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* THẺ MẶC ĐỊNH (Hiển thị sẵn hình ảnh, Tên và Thời lượng) */}
      <div className="relative w-full h-full rounded-md overflow-hidden bg-zinc-900 border border-white/5">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
          priority={priority}
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        />

        {/* Lớp phủ Gradient đen ở dưới để hiện chữ rõ hơn */}
        <div className="absolute inset-x-0 bottom-0 pt-10 pb-2 px-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end pointer-events-none transition-opacity duration-300 group-hover:opacity-0">
          <h4 className="text-white font-bold text-xs md:text-sm line-clamp-1 drop-shadow-md">
            {title}
          </h4>
          <div className="flex items-center gap-1.5 text-[9px] md:text-[11px] font-medium text-gray-300 mt-0.5">
            {year && <span>{year}</span>}
            {year && time && <span className="text-white/40">•</span>}
            {time && <span>{time}</span>}
            {!time && <span className="line-clamp-1">{genre}</span>}
          </div>
        </div>
      </div>

      {/* THẺ EXPAND (Nổi lên khi hover) */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] bg-[#141414] rounded-lg shadow-[0_15px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden transition-all duration-300 ease-out z-50 ${
          isHovered
            ? "scale-100 opacity-100 visible"
            : "scale-95 opacity-0 invisible"
        }`}
      >
        <Link href={`/movies/${slug}`} className="block w-full">
          {/* Nửa trên: Hình ảnh gốc */}
          <div className="relative w-full aspect-video bg-zinc-900">
            <Image
              src={imageUrl}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
              priority={priority}
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#141414] to-transparent" />
          </div>

          {/* Nửa dưới: Khung chứa rất nhiều text */}
          <div className="px-4 pb-4 pt-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-2">
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition">
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-400 bg-zinc-900/80 text-white hover:border-white hover:bg-white/20 transition">
                  <Plus className="h-4 w-4" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-400 bg-zinc-900/80 text-white hover:border-white hover:bg-white/20 transition">
                  <ThumbsUp className="h-4 w-4" />
                </button>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-400 bg-zinc-900/80 text-white hover:border-white hover:bg-white/20 transition">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            <h4 className="text-white font-bold text-sm md:text-base line-clamp-1 mb-1">
              {title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white mb-2">
              <span className="text-green-500">
                {score !== "N/A" ? `${Number(score) * 10}% Đáng xem` : "Mới"}
              </span>
              <span className="border border-gray-500 px-1 rounded-sm text-gray-300">
                {quality}
              </span>
              <span className="text-gray-300">{detailYear}</span>
              <span className="text-gray-300">{detailTime}</span>
            </div>

            <div className="text-[11px] text-gray-400">
              {isLoading ? (
                <div className="animate-pulse space-y-1">
                  <div className="h-2 bg-gray-700 rounded w-full"></div>
                  <div className="h-2 bg-gray-700 rounded w-5/6"></div>
                  <div className="h-2 bg-gray-700 rounded w-4/6"></div>
                </div>
              ) : (
                <>
                  <p className="line-clamp-4 text-base text-gray-300 leading-relaxed mb-1">
                    {rawDesc || "Đang cập nhật nội dung..."}
                  </p>
                  {actors && (
                    <p className="line-clamp-1 mt-2">
                      <span className="text-gray-500">Diễn viên: </span>{" "}
                      {actors}
                    </p>
                  )}
                  {genre && (
                    <p className="line-clamp-1">
                      <span className="text-gray-500">Thể loại: </span> {genre}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export const MediaCard = React.memo(MediaCardInner);
