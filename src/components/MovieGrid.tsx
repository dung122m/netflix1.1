"use client";

import React from "react";
import { MediaCard } from "@/components/browse/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";

interface MovieGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

const INITIAL_BATCH = 8;
const BATCH_SIZE = 8;

const MovieGridInner = ({ movies }: MovieGridProps) => {
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_BATCH);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  // Memoize danh sách phim đã chuẩn hóa để giữ nguyên tham chiếu props của MediaCard
  const normalizedMovies = React.useMemo(() => {
    return (movies || []).map((m) => {
      const norm = normalizeMovie(m);
      const bestThumb = norm.thumbUrl || norm.imageUrl;
      return { norm, bestThumb };
    });
  }, [movies]);

  // Reset batch khi danh sách phim thay đổi (đổi trang, filter)
  React.useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [movies]);

  // Observer đón đầu khi cuộn gần cuối danh sách để mount batch tiếp theo
  React.useEffect(() => {
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

  const visibleMovies = React.useMemo(() => {
    return normalizedMovies.slice(0, visibleCount);
  }, [normalizedMovies, visibleCount]);

  return (
    <div className="movie-grid-container rounded-2xl sm:rounded-3xl border border-white/10 p-2 sm:p-5 md:p-6 shadow-2xl space-y-6 overflow-visible">
      {/* LƯỚI PHIM CHÍNH: 2 cột trên mobile (<640px), 2 cột trên sm và iPad (md: 768-1023px), 3 cột trên laptop/lg, 4 cột trên PC (xl) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5 md:gap-6">
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
              priority={index < 4}
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
