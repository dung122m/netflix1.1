"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MediaCard } from "@/components/browse/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";
import { Loader2 } from "lucide-react";

interface MovieGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

const INITIAL_BATCH = 24;
const BATCH_SIZE = 24;

const MovieGridInner = ({ movies }: MovieGridProps) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const [isDimmed, setIsDimmed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Memoize danh sách phim đã chuẩn hóa để giữ nguyên tham chiếu props của MediaCard
  const normalizedMovies = useMemo(() => {
    return (movies || []).map((m) => {
      const norm = normalizeMovie(m);
      const bestThumb = norm.thumbUrl || norm.imageUrl;
      return { norm, bestThumb };
    });
  }, [movies]);

  // Reset batch & tắt dimming khi danh sách phim thay đổi (đổi trang, filter)
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
    setIsDimmed(false);
  }, [movies]);

  // Lắng nghe sự kiện loading toàn trang hoặc filter để làm mờ nhẹ lưới phim tức thì
  useEffect(() => {
    const handleStart = () => setIsDimmed(true);
    const handleEnd = () => setIsDimmed(false);

    window.addEventListener("app:loading-start", handleStart);
    window.addEventListener("app:loading-end", handleEnd);

    return () => {
      window.removeEventListener("app:loading-start", handleStart);
      window.removeEventListener("app:loading-end", handleEnd);
    };
  }, []);

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
    <div className="relative movie-grid-container rounded-2xl sm:rounded-3xl border border-white/10 p-2 sm:p-5 md:p-6 shadow-2xl space-y-6 overflow-visible">
      {/* FLOATING LOADING BADGE KHI ĐANG LỌC PHIM */}
      {isDimmed && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="sticky top-1/2 -translate-y-1/2 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-zinc-950/95 border border-white/20 shadow-2xl backdrop-blur-xl text-white text-xs font-bold animate-in fade-in zoom-in-95 duration-150">
            <Loader2 className="w-4 h-4 text-netflix-red animate-spin flex-none" />
            <span>Đang cập nhật danh sách phim...</span>
          </div>
        </div>
      )}

      {/* LƯỚI PHIM CHÍNH: 2 cột trên mobile (<640px), 2 cột trên sm và iPad (md: 768-1023px), 3 cột trên laptop/lg, 4 cột trên PC (xl) */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5 md:gap-6 transition-all duration-300 ${
          isDimmed ? "opacity-35 blur-[0.6px] scale-[0.995] pointer-events-none select-none" : "opacity-100 blur-0 scale-100"
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
              matchSnippet={norm.matchSnippet}
              matchType={norm.matchType}
              priority={index < 8}
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
