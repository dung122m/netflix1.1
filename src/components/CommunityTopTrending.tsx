"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Flame,
  TrendingUp,
} from "lucide-react";
import { MovieViewStatItem } from "@/services/supabaseService";
import { pickBestMoviePoster, toOptimizedPhimimgUrl, formatGenreName } from "@/lib/movieMedia";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";

const TRENDING_CACHE_KEY = "nanaflix_trending_community_cache_v5";

interface CommunityTrendingPosterProps {
  movieTitle: string;
  movieSlug: string;
  poster?: string;
  thumb?: string;
  priority?: boolean;
}

function CommunityTrendingPoster({
  movieTitle,
  movieSlug,
  poster,
  thumb,
  priority = false,
}: CommunityTrendingPosterProps) {
  const initialPoster = pickBestMoviePoster(
    {
      poster_url: poster,
      thumb_url: thumb,
      name: movieTitle,
      slug: movieSlug,
    },
    ""
  );

  const [imgSrc, setImgSrc] = useState<string>(() => {
    if (initialPoster && !initialPoster.includes("/default-")) {
      return toOptimizedPhimimgUrl(initialPoster, 320);
    }
    return "";
  });

  const fallbackTriedRef = useRef(false);

  useEffect(() => {
    if (!imgSrc && !fallbackTriedRef.current) {
      fallbackTriedRef.current = true;
      fetch(`/api/movie-poster-fallback?title=${encodeURIComponent(movieTitle)}&slug=${encodeURIComponent(movieSlug)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.posterUrl) {
            setImgSrc(data.posterUrl);
          } else if (data?.backdropUrl) {
            setImgSrc(data.backdropUrl);
          } else {
            setImgSrc("/default-poster.jpg");
          }
        })
        .catch(() => {
          setImgSrc("/default-poster.jpg");
        });
    }
  }, [imgSrc, movieTitle, movieSlug]);

  const handleError = useCallback(() => {
    if (!fallbackTriedRef.current) {
      fallbackTriedRef.current = true;
      fetch(`/api/movie-poster-fallback?title=${encodeURIComponent(movieTitle)}&slug=${encodeURIComponent(movieSlug)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.posterUrl) {
            setImgSrc(data.posterUrl);
          } else if (data?.backdropUrl) {
            setImgSrc(data.backdropUrl);
          } else {
            setImgSrc("/default-poster.jpg");
          }
        })
        .catch(() => {
          setImgSrc("/default-poster.jpg");
        });
    } else {
      setImgSrc("/default-poster.jpg");
    }
  }, [movieTitle, movieSlug]);

  if (!imgSrc) {
    return (
      <div className="w-full h-full bg-zinc-900/80 animate-pulse flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border border-white/10 bg-white/5" />
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={movieTitle}
      fill
      unoptimized
      priority={priority}
      sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 240px"
      className="object-cover group-hover:scale-105 transition-transform duration-500"
      loading={priority ? "eager" : "lazy"}
      quality={85}
      onError={handleError}
    />
  );
}

function CommunityTopTrendingInner() {
  const [items, setItems] = useState<MovieViewStatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [timeframe, setTimeframe] = useState<"total" | "week">("total");
  const [isFading, setIsFading] = useState(false);
  const tabCacheRef = useRef<Partial<Record<"total" | "week", MovieViewStatItem[]>>>({});
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // 1. Đọc cache localStorage ngay khi mount (0ms) và luôn revalidate ngầm từ server (SWR)
  useEffect(() => {
    let isMounted = true;

    // Đọc cache localStorage ngay khi mount nếu dữ liệu còn hợp lệ (trong 12 giờ)
    try {
      // Dọn dẹp cache v3, v4 cũ
      localStorage.removeItem("nanaflix_trending_community_cache_v3");
      localStorage.removeItem("nanaflix_trending_community_cache_v4");

      const raw = localStorage.getItem(TRENDING_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const isValid = parsed.timestamp && Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000;
        if (isValid) {
          if (Array.isArray(parsed.total) && parsed.total.length > 0) {
            tabCacheRef.current["total"] = parsed.total;
          }
          if (Array.isArray(parsed.week) && parsed.week.length > 0) {
            tabCacheRef.current["week"] = parsed.week;
          }

          const currentTf = timeframeRef.current;
          const cachedForCurrent = tabCacheRef.current[currentTf];
          if (cachedForCurrent && cachedForCurrent.length > 0) {
            setItems(cachedForCurrent);
            setLoading(false);
          }
        }
      }
    } catch {
      // Bỏ qua nếu localStorage lỗi
    }

    // Luôn fetch BXH "total" khi mới vào trang (SWR: chạy ngầm revalidate)
    const fetchTotal = async () => {
      try {
        const res = await fetch("/api/trending-community?timeframe=total&limit=10");
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data?.items)) {
          tabCacheRef.current["total"] = data.items;
          if (timeframeRef.current === "total") {
            setItems(data.items);
          }

          try {
            const raw = localStorage.getItem(TRENDING_CACHE_KEY);
            const currentCache = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
              TRENDING_CACHE_KEY,
              JSON.stringify({
                ...currentCache,
                total: data.items,
                timestamp: Date.now(),
              })
            );
          } catch {}
        }
      } catch (err) {
        console.warn("Lỗi tải BXH total:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTotal();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Chuyển đổi tab: render cache tức thì nếu có, và luôn fetch revalidate ngầm
  const switchTab = (nextTf: "total" | "week") => {
    if (nextTf === timeframe) return;

    setIsFading(true);
    setTimeframe(nextTf);
    timeframeRef.current = nextTf;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }

    const cached = tabCacheRef.current[nextTf];
    if (cached && cached.length > 0) {
      setItems(cached);
      setTimeout(() => setIsFading(false), 100);
    } else {
      setLoading(true);
    }

    // Luôn gửi request lấy dữ liệu mới nhất cho tab được chọn
    fetch(`/api/trending-community?timeframe=${nextTf}&limit=10`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items && Array.isArray(data.items)) {
          tabCacheRef.current[nextTf] = data.items;
          if (timeframeRef.current === nextTf) {
            setItems(data.items);
          }
          try {
            const raw = localStorage.getItem(TRENDING_CACHE_KEY);
            const currentCache = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
              TRENDING_CACHE_KEY,
              JSON.stringify({
                ...currentCache,
                [nextTf]: data.items,
                timestamp: Date.now(),
              })
            );
          } catch {}
        }
      })
      .catch((err) => {
        console.warn(`Lỗi tải BXH ${nextTf}:`, err);
      })
      .finally(() => {
        setIsFading(false);
        setLoading(false);
      });
  };

  const rafRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!scrollContainerRef.current) return;
      const el = scrollContainerRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const firstCard = el.querySelector<HTMLElement>(".snap-start");
      const isAtStart =
        scrollLeft <= 8 ||
        (firstCard ? firstCard.getBoundingClientRect().left >= el.getBoundingClientRect().left - 2 : scrollLeft <= 8);
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 8;

      setCanScrollLeft(!isAtStart);
      setCanScrollRight(!isAtEnd);
    });
  }, []);

  // Đảm bảo scroll luôn reset về 0 (Top 1) khi đổi tab hoặc đổi danh sách phim
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
    checkScroll();
  }, [timeframe, items, checkScroll]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScrollEnd = () => checkScroll();
    el.addEventListener("scrollend", onScrollEnd, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      el.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const cardEl = scrollContainerRef.current.querySelector<HTMLElement>(".snap-start");
      const step = cardEl
        ? (cardEl.offsetWidth + 16) * Math.max(1, Math.floor(scrollContainerRef.current.clientWidth / (cardEl.offsetWidth + 16)))
        : scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -step : step,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 150);
      setTimeout(checkScroll, 400);
    }
  };

  return (
    <section
      className="relative my-8 sm:my-12 select-none"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 480px",
      }}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 px-1">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-netflix-red text-white shadow-md shadow-black/50 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span>Khán Giả Xem Nhiều Nhất</span>
            <Flame className="w-5 h-5 text-netflix-red shrink-0" />
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-[65ch] leading-relaxed">
            Bảng xếp hạng phim thịnh hành được cộng đồng khán giả xem nhiều nhất
          </p>
        </div>

        {/* TIMEFRAME TABS & NAVIGATION BUTTONS */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="inline-flex p-1 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-semibold backdrop-blur-md">
            <button
              type="button"
              onClick={() => switchTab("total")}
              className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                timeframe === "total"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50 scale-100"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95"
              }`}
            >
              Toàn Thời Gian
            </button>
            <button
              type="button"
              onClick={() => switchTab("week")}
              className={`px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                timeframe === "week"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50 scale-100"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95"
              }`}
            >
              Trong Tuần
            </button>
          </div>
        </div>
      </div>

      {/* HORIZONTAL SCROLL CAROUSEL */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI / PHẢI: FLOATING GLASS CHUẨN ĐỒNG BỘ */}
        <CarouselNavButton
          direction="left"
          onClick={() => handleScroll("left")}
          visible={canScrollLeft}
          ariaLabel="Cuộn bảng xếp hạng cộng đồng sang trái"
          topOffsetClass="top-[40%]"
        />

        <CarouselNavButton
          direction="right"
          onClick={() => handleScroll("right")}
          visible={canScrollRight}
          ariaLabel="Cuộn bảng xếp hạng cộng đồng sang phải"
          topOffsetClass="top-[40%]"
        />

        {/* MOBILE SUBTLE GRADIENT FADE AFFORDANCE */}
        {canScrollLeft && (
          <div
            className="sm:hidden absolute left-0 top-4 bottom-4 w-6 bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none z-20 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}
        {canScrollRight && (
          <div
            className="sm:hidden absolute right-0 top-4 bottom-4 w-8 bg-gradient-to-l from-black via-black/60 to-transparent pointer-events-none z-20 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-3 sm:gap-6 overflow-x-auto overflow-y-hidden px-3 sm:px-6 scroll-pl-3 sm:scroll-pl-6 py-4 sm:py-5 scrollbar-none snap-x snap-mandatory"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            opacity: isFading ? 0.4 : 1,
            transition: "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {loading && items.length === 0 ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none flex items-start"
              >
                <div className="w-[45px] sm:w-[65px] md:w-[75px] h-[210px] sm:h-[262px] md:h-[285px] -mr-5 sm:-mr-8" />
                <div className="w-[140px] sm:w-[175px] md:w-[190px] flex flex-col gap-2">
                  <div className="aspect-[2/3] rounded-xl bg-zinc-900/80 animate-pulse border border-white/5" />
                  <div className="h-4 bg-zinc-900/80 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-zinc-900/60 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))
          ) : items.length === 0 ? (
            <div className="w-full py-12 flex flex-col items-center justify-center text-center px-4">
              <Flame className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-400">
                {timeframe === "week"
                  ? "Chưa có lượt xem nào trong 7 ngày gần nhất."
                  : "Chưa có dữ liệu lượt xem trên hệ thống."}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Khám phá và xem phim để cùng đưa phim lên bảng xếp hạng nhé!
              </p>
            </div>
          ) : (
            items.map((movie, index) => {
              const rank = index + 1;
              const categoryText = movie.category ? formatGenreName(movie.category) : "";

              return (
                <div
                  key={movie.movieSlug}
                  className="flex-none relative snap-start group select-none"
                >
                  <Link
                    href={`/movies/${movie.movieSlug}`}
                    className="flex items-start relative block cursor-pointer group-hover:scale-[1.025] group-hover:-translate-y-1 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netflix-red rounded-xl"
                  >
                    <div aria-hidden="true" className="flex items-end h-[210px] sm:h-[262px] md:h-[285px] relative -mr-5 sm:-mr-8 z-0 pointer-events-none select-none shrink-0">
                      <span
                        className="text-[90px] sm:text-[130px] md:text-[150px] font-black leading-none tracking-tighter text-transparent"
                        style={{
                          WebkitTextStroke:
                            rank === 1
                              ? "3px #e50914"
                              : rank === 2
                              ? "3px #d4d4d8"
                              : rank === 3
                              ? "3px #a1a1aa"
                              : "2px rgba(255, 255, 255, 0.2)",
                        }}
                      >
                        {rank}
                      </span>
                    </div>

                    {/* CỘT POSTER + METADATA DƯỚI POSTER */}
                    <div className="relative z-10 w-[140px] sm:w-[175px] md:w-[190px] flex flex-col shrink-0 min-w-0">
                      {/* MOVIE POSTER CONTAINER (ARTWORK THUẦN KHIẾT) */}
                      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-netflix-red group-hover:ring-inset group-hover:shadow-[0_14px_32px_rgba(229,9,20,0.35),0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300">
                        <CommunityTrendingPoster
                          movieTitle={movie.movieTitle}
                          movieSlug={movie.movieSlug}
                          poster={movie.poster}
                          thumb={movie.thumb}
                          priority={index < 3}
                        />

                        {/* CHỈ GIỮ BADGE ĐẶC BIỆT (CAM HOẶC 4K), LOẠI BỎ BADGE FHD/HD PHỔ THÔNG */}
                        {(() => {
                          const q = movie.quality?.toUpperCase() || "";
                          const isCam = q.includes("CAM");
                          const is4k = q.includes("4K") || q.includes("UHD");
                          if (!isCam && !is4k) return null;
                          return (
                            <div className="absolute top-2 right-2 pointer-events-none z-10">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md border ${
                                  isCam
                                    ? "bg-amber-950/90 text-amber-300 border-amber-500/40"
                                    : "bg-black/75 text-zinc-100 border-white/20"
                                }`}
                              >
                                {isCam ? "CAM" : "4K"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* THÔNG TIN PHIM DƯỚI POSTER: 1 DÒNG DUY NHẤT, CĂN ĐỀU BASELINE */}
                      <div className="pt-2 sm:pt-2.5 min-w-0 flex flex-col">
                        <h3
                          title={movie.movieTitle}
                          className="text-white text-xs sm:text-[13px] font-semibold truncate group-hover:text-netflix-red transition-colors"
                        >
                          {movie.movieTitle}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400 mt-1 font-medium min-w-0">
                          <span className="shrink-0">{movie.year || "Mới"}</span>
                          {categoryText && <span className="text-zinc-600 shrink-0">•</span>}
                          {categoryText && (
                            <span className="text-zinc-400 truncate min-w-0">{categoryText}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export const CommunityTopTrending = React.memo(CommunityTopTrendingInner);
export default CommunityTopTrending;
