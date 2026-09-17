"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { MediaCard } from "@/components/browse/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";

interface MovieGridProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

const INITIAL_BATCH = 8;
const BATCH_SIZE = 8;

const MovieGridInner = ({ movies }: MovieGridProps) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [, startTransition] = useTransition();

  // Reset về số lượng ban đầu khi danh sách phim thay đổi (đổi trang, tìm kiếm, lọc)
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH);
  }, [movies]);

  // Observer kích hoạt lazy loading khi người dùng cuộn gần tới cuối danh sách hiện tại
  useEffect(() => {
    if (visibleCount >= movies.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          startTransition(() => {
            setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, movies.length));
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, movies.length]);

  // Memoize danh sách phim đã chuẩn hóa để giữ nguyên tham chiếu props của MediaCard qua các đợt tăng batch
  const normalizedMovies = React.useMemo(() => {
    return movies.map((m) => {
      const norm = normalizeMovie(m);
      const bestThumb = norm.thumbUrl || norm.imageUrl;
      return { norm, bestThumb };
    });
  }, [movies]);

  const displayedMovies = normalizedMovies.slice(0, visibleCount);
  const hasMore = visibleCount < movies.length;

  return (
    <div className="movie-grid-container rounded-2xl sm:rounded-3xl border border-white/10 p-2.5 sm:p-5 md:p-6 shadow-2xl space-y-6">
      {/* LƯỚI PHIM CHÍNH: 1 cột trên mobile (rộng rãi, rõ nét), 2 cột sm, 3 cột md, 4 cột trên PC (lg/xl) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
        {displayedMovies.map(({ norm, bestThumb }, index) => {
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

      {/* Sentinel vô hình kích hoạt lazy load mượt mà khi cuộn gần cuối, loại bỏ mọi thông báo chữ gây phiền */}
      {hasMore && (
        <div ref={sentinelRef} className="w-full h-4 pointer-events-none opacity-0" aria-hidden="true" />
      )}
    </div>
  );
};

export const MovieGrid = React.memo(MovieGridInner);
export default MovieGrid;
