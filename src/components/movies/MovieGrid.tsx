"use client";

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { MediaCard } from "@/components/browse/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface MovieGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
  columnsClassName?: string;
}

const INITIAL_BATCH = 24;
const BATCH_SIZE = 24;

const MovieGridInner = ({ movies, columnsClassName }: MovieGridProps) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Memoize danh sách phim đã chuẩn hóa để giữ nguyên tham chiếu props của MediaCard
  const normalizedMovies = useMemo(() => {
    return (movies || []).map((m) => {
      const norm = normalizeMovie(m);
      const bestThumb = norm.thumbUrl || norm.imageUrl;
      return { norm, bestThumb };
    });
  }, [movies]);

  const isFirstMount = useRef(true);

  // Reset batch khi danh sách phim thay đổi (đổi trang, filter)
  // Đảm bảo khi trang mới xuất hiện, viewport ở vị trí đầu trang (0, 0) tức thì
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, 0);
    return () => clearTimeout(timer);
  }, [movies]);

  // Observer đón đầu khi cuộn gần cuối danh sách để mount batch tiếp theo
  useEffect(() => {
    if (visibleCount >= normalizedMovies.length) return;

    const currentSentinel = sentinelRef.current;
    if (!currentSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, normalizedMovies.length));
        }
      },
      { rootMargin: "400px 0px" } // Đón đầu trước 400px để cuộn mượt mà không bị khựng
    );

    observer.observe(currentSentinel);
    return () => {
      observer.disconnect();
    };
  }, [visibleCount, normalizedMovies.length]);

  const visibleMovies = useMemo(() => {
    return normalizedMovies.slice(0, visibleCount);
  }, [normalizedMovies, visibleCount]);

  return (
    <div className="relative movie-grid-container py-1 sm:py-2 md:py-3 px-0 space-y-6 overflow-visible">
      {/* LƯỚI PHIM CHÍNH: 2 cột mobile, 3 cột tablet, 4 cột laptop, 6 CỘT CÂN BẰNG TRÊN DESKTOP (24 PHIM = 4 HÀNG FULL) */}
      <div
        className={`grid ${
          columnsClassName ||
          "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-4 lg:gap-5 xl:gap-5"
        }`}
      >
        {visibleMovies.map(({ norm, bestThumb }, index) => {
          return (
            <MediaCard
              key={norm.slug || index}
              slug={norm.slug}
              title={norm.title}
              origin_name={norm.origin_name}
              imageUrl={bestThumb}
              posterUrl={norm.posterUrl}
              thumbUrl={norm.thumbUrl}
              tmdbId={norm.tmdbId}
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
              itemType={norm.itemType}
              hasTrailer={norm.hasTrailer}
              trailer_url={norm.trailer_url}
              isTrailerOnly={norm.isTrailerOnly}
              matchSnippet={norm.matchSnippet}
              matchType={norm.matchType}
              priority={index < 6}
            />
          );
        })}
      </div>
      {/* Sentinel đón đầu tự động mount batch tiếp theo khi user cuộn gần tới đáy */}
      {visibleCount < normalizedMovies.length && (
        <div ref={sentinelRef} className="h-10 w-full pointer-events-none" aria-hidden="true" />
      )}
    </div>
  );
};

export const MovieGrid = React.memo(MovieGridInner);
export default MovieGrid;
