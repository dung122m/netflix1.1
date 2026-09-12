"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { MediaCard } from "./sites/netflix-3f78535a/browse-1234abcd/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";
import { MediaCardSkeleton } from "./MediaCardSkeleton";
import { Loader2 } from "lucide-react";

interface MovieGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

const INITIAL_BATCH = 8;
const BATCH_SIZE = 8;

const MovieGridInner = ({ movies }: MovieGridProps) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [, startTransition] = useTransition();

  // Reset về số lượng ban đầu khi danh sách phim thay đổi (đổi trang, tìm kiếm, lọc)
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
    setIsLoadingMore(false);
  }, [movies]);

  // Observer kích hoạt lazy loading khi người dùng cuộn gần tới cuối danh sách hiện tại
  useEffect(() => {
    if (visibleCount >= movies.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsLoadingMore(true);
          const timer = setTimeout(() => {
            startTransition(() => {
              setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, movies.length));
              setIsLoadingMore(false);
            });
          }, 350);

          return () => clearTimeout(timer);
        }
      },
      { rootMargin: "180px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, movies.length]);

  const displayedMovies = movies.slice(0, visibleCount);
  const hasMore = visibleCount < movies.length;

  return (
    <div className="movie-grid-container rounded-2xl sm:rounded-3xl border border-white/10 p-2.5 sm:p-5 md:p-6 shadow-2xl space-y-6">
      {/* Lưới phim chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 sm:gap-4 md:gap-6">
        {displayedMovies.map((m, index) => {
          const norm = normalizeMovie(m);
          const bestThumb = norm.thumbUrl || norm.imageUrl;

          return (
            <div
              key={norm.slug || index}
              className="lazy-card-enter"
              style={{ animationDelay: `${(index % 8) * 55}ms` }}
            >
              <MediaCard
                slug={norm.slug}
                title={norm.title}
                origin_name={norm.origin_name}
                imageUrl={bestThumb}
                posterUrl={norm.posterUrl}
                thumbUrl={norm.thumbUrl}
                genre={norm.genre}
                description={norm.description}
                time={norm.time}
                year={norm.year}
                rating={norm.score}
                quality={norm.quality}
                lang={norm.lang}
                chieurap={norm.chieurap}
                sub_docquyen={norm.sub_docquyen}
                actor={norm.actor}
                director={norm.director}
                country={norm.country}
                type_name={norm.type_name}
                hasTrailer={norm.hasTrailer}
                trailer_url={norm.trailer_url}
                isTrailerOnly={norm.isTrailerOnly}
                priority={index < 4}
              />
            </div>
          );
        })}

        {/* Skeleton placeholders hiển thị rõ ràng khi đang lazy loading thêm phim */}
        {isLoadingMore && (
          <>
            {Array.from({ length: Math.min(4, movies.length - visibleCount) }).map((_, i) => (
              <div key={`grid-skeleton-${i}`} className="animate-in fade-in duration-300">
                <MediaCardSkeleton />
              </div>
            ))}
          </>
        )}
      </div>

      {/* Sentinel kích hoạt lazy load & thanh chỉ báo tiến trình cuộn */}
      {hasMore && (
        <div ref={sentinelRef} className="pt-4 pb-2 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/90 border border-white/15 text-xs font-bold text-gray-200 shadow-xl backdrop-blur-md">
            <Loader2 className="w-4 h-4 text-netflix-red animate-spin" />
            <span>
              Đang cuộn tải thêm phim... ({visibleCount}/{movies.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setVisibleCount(movies.length)}
            className="text-xs text-gray-400 hover:text-white transition cursor-pointer underline underline-offset-4"
          >
            Hiển thị tất cả {movies.length} phim trên trang này
          </button>
        </div>
      )}



    </div>
  );
};

export const MovieGrid = React.memo(MovieGridInner);
export default MovieGrid;
