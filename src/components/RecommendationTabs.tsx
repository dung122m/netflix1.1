"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Clapperboard,
  Globe2,
  Users,
  Star,
  Shuffle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Play,
} from "lucide-react";
import { pickBestMovieThumb, toOptimizedPhimimgUrl } from "@/lib/movieMedia";
import { toast } from "./Toast";

interface MovieItem {
  slug: string;
  name?: string;
  origin_name?: string;
  year?: number | string;
  quality?: string;
  score?: number | string;
  matchPercent?: number;
  recScore?: number;
  category?: Array<{ name: string; slug?: string }>;
  country?: Array<{ name: string; slug?: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface RecommendationTabsProps {
  currentMovieTitle?: string;
  genreName?: string;
  countryName?: string;
  actorName?: string;
  genreMovies: MovieItem[];
  countryMovies: MovieItem[];
  actorMovies?: MovieItem[];
  allMovies: MovieItem[];
  variant?: "grid" | "sidebar";
}

export function RecommendationTabs({
  currentMovieTitle,
  genreName,
  countryName,
  actorName,
  genreMovies = [],
  countryMovies = [],
  actorMovies = [],
  allMovies = [],
  variant = "grid",
}: RecommendationTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "best" | "genre" | "country" | "actor" | "top"
  >("best");
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [visibleLimit, setVisibleLimit] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Lọc phim theo diễn viên loại bỏ phim hiện tại
  const validActorMovies = useMemo(() => {
    return (actorMovies || []).filter(
      (m) => m && m.name !== currentMovieTitle
    );
  }, [actorMovies, currentMovieTitle]);

  // Danh sách phim đánh giá cao (sắp xếp theo điểm rating / năm)
  const topRatedMovies = useMemo(() => {
    return [...allMovies]
      .sort((a, b) => {
        const scoreA = Number(a.score) || Number(a.imdb?.vote_average) || 7.0;
        const scoreB = Number(b.score) || Number(b.imdb?.vote_average) || 7.0;
        return scoreB - scoreA;
      })
      .slice(0, 18);
  }, [allMovies]);

  // Phim đề xuất phù hợp nhất (kết hợp các nguồn & xáo trộn khi bấm Shuffle)
  const bestMatchMovies = useMemo(() => {
    const list = [...allMovies];
    if (shuffleSeed > 0) {
      // Fisher-Yates shuffle có kiểm soát seed
      for (let i = list.length - 1; i > 0; i--) {
        const j = (i * 7 + shuffleSeed) % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
  }, [allMovies, shuffleSeed]);

  // Danh sách phim đang được chọn theo tab
  const currentTabMovies = useMemo(() => {
    switch (activeTab) {
      case "genre":
        return genreMovies.length > 0 ? genreMovies : allMovies;
      case "country":
        return countryMovies.length > 0 ? countryMovies : allMovies;
      case "actor":
        return validActorMovies.length > 0 ? validActorMovies : allMovies;
      case "top":
        return topRatedMovies.length > 0 ? topRatedMovies : allMovies;
      case "best":
      default:
        return bestMatchMovies;
    }
  }, [
    activeTab,
    genreMovies,
    countryMovies,
    validActorMovies,
    topRatedMovies,
    bestMatchMovies,
    allMovies,
  ]);

  const displayedMovies = useMemo(() => {
    return currentTabMovies.slice(0, visibleLimit);
  }, [currentTabMovies, visibleLimit]);

  // Auto lazy load more movies when scrolling near bottom of list
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => {
            if (prev < currentTabMovies.length) {
              return prev + 12;
            }
            return prev;
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentTabMovies.length]);

  // Xử lý đổi gợi ý ngẫu nhiên (Shuffle)
  const handleShuffle = () => {
    setIsShuffling(true);
    setShuffleSeed((prev) => prev + Date.now() % 100 + 1);
    toast.info("Đã đổi danh sách phim đề xuất!");
    setTimeout(() => {
      setIsShuffling(false);
    }, 450);
  };

  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const checkScroll = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = tabsRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [checkScroll, currentTabMovies]);

  const scrollTabs = (direction: "left" | "right") => {
    if (!tabsRef.current) return;
    const amount = direction === "left" ? -160 : 160;
    tabsRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tabsRef.current && (e.deltaY !== 0 || e.deltaX !== 0)) {
      e.preventDefault();
      tabsRef.current.scrollLeft += e.deltaY !== 0 ? e.deltaY * 0.8 : e.deltaX;
      checkScroll();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    startX.current = e.pageX - (tabsRef.current?.offsetLeft || 0);
    scrollLeftStart.current = tabsRef.current?.scrollLeft || 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || !tabsRef.current) return;
    e.preventDefault();
    const x = e.pageX - (tabsRef.current.offsetLeft || 0);
    const walk = (x - startX.current) * 1.2;
    tabsRef.current.scrollLeft = scrollLeftStart.current - walk;
    checkScroll();
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div className={variant === "sidebar" ? "space-y-4" : "space-y-6"}>
      {/* 1. THANH TABS ĐỀ XUẤT THÔNG MINH (KÉO CHUỘT / LĂN CHUỘT / NÚT MŨI TÊN TRÁI PHẢI) */}
      <div className="relative border-b border-white/10 pb-2.5 w-full min-w-0">
        <div className="flex items-center gap-1.5 w-full min-w-0 relative">
          
          {/* NÚT CUỘN TRÁI */}
          {canScrollLeft && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10 sm:hidden" />
              <button
                type="button"
                onClick={() => scrollTabs("left")}
                aria-label="Cuộn sang trái"
                className="absolute left-0 z-20 h-7 w-7 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 shadow-xl flex items-center justify-center transition cursor-pointer backdrop-blur-md"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}

          {/* DẢI TABS CUỘN NGANG VỚI KÉO CHUỘT + LĂN CHUỘT */}
          <div
            ref={tabsRef}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none [&::-webkit-scrollbar]:hidden flex-1 min-w-0 cursor-grab active:cursor-grabbing select-none"
          >
            {/* Tab 1: Phù hợp nhất */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("best");
                setVisibleLimit(12);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-netflix-red shrink-0 ${
                activeTab === "best"
                  ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-[var(--accent-glow,rgba(229,9,20,0.4))]"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>{variant === "sidebar" ? "Tương Tự" : "Phim Tương Tự"} ({allMovies.length})</span>
            </button>

            {/* Tab 2: Cùng diễn viên (nếu có) */}
            {actorName && validActorMovies.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("actor");
                  setVisibleLimit(12);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-purple-500 shrink-0 ${
                  activeTab === "actor"
                    ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60"
                    : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-300" />
                <span>{variant === "sidebar" ? actorName : `Diễn viên: ${actorName}`} ({validActorMovies.length})</span>
              </button>
            )}

            {/* Tab 3: Cùng thể loại */}
            {genreName && genreMovies.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("genre");
                  setVisibleLimit(12);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-rose-500 shrink-0 ${
                  activeTab === "genre"
                    ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-red-950/60"
                    : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Clapperboard className="w-3.5 h-3.5 text-rose-300" />
                <span>{variant === "sidebar" ? genreName : `Thể loại: ${genreName}`} ({genreMovies.length})</span>
              </button>
            )}

            {/* Tab 4: Cùng quốc gia */}
            {countryName && countryMovies.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("country");
                  setVisibleLimit(12);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-sky-500 shrink-0 ${
                  activeTab === "country"
                    ? "bg-sky-600 text-white border-sky-400 shadow-lg shadow-sky-950/60"
                    : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Globe2 className="w-3.5 h-3.5 text-sky-300" />
                <span>{variant === "sidebar" ? countryName : `Quốc gia: ${countryName}`} ({countryMovies.length})</span>
              </button>
            )}

            {/* Tab 5: Đánh giá cao (Top Rated) */}
            {topRatedMovies.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab("top");
                  setVisibleLimit(12);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0 ${
                  activeTab === "top"
                    ? "bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-950/60"
                    : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Star className="w-3.5 h-3.5 text-amber-300 fill-current" />
                <span>Đánh giá cao ({topRatedMovies.length})</span>
              </button>
            )}
          </div>

          {/* NÚT CUỘN PHẢI */}
          {canScrollRight && (
            <>
              <div className="absolute right-8 sm:right-10 top-0 bottom-0 w-8 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10 sm:hidden" />
              <button
                type="button"
                onClick={() => scrollTabs("right")}
                aria-label="Cuộn sang phải"
                className="absolute right-10 sm:right-11 z-20 h-7 w-7 rounded-full bg-zinc-900/95 hover:bg-zinc-800 text-white border border-white/20 shadow-xl flex items-center justify-center transition cursor-pointer backdrop-blur-md"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* NÚT ĐỔI PHIM (SHUFFLE) */}
          <div className="flex items-center flex-shrink-0 ml-1">
            <button
              type="button"
              onClick={handleShuffle}
              title="Đổi phim khác"
              aria-label="Đổi phim khác"
              className="flex items-center justify-center p-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 hover:border-white/30 transition shadow-sm cursor-pointer active:scale-95 shrink-0"
            >
              <Shuffle
                className={`w-3.5 h-3.5 text-amber-400 transition-transform ${
                  isShuffling ? "rotate-180 scale-110" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 2. HIỂN THỊ PHIM GỢI Ý: DẠNG SIDEBAR (YOUTUBE WATCH STYLE) HOẶC DẠNG LƯỚI GRID */}
      {displayedMovies.length > 0 ? (
        variant === "sidebar" ? (
          <div className="space-y-3">
            <div className="space-y-1.5 max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500 pr-1">
              {displayedMovies.map((item, index) => {
                const matchPercent =
                  typeof item.matchPercent === "number"
                    ? item.matchPercent
                    : Math.max(65, 95 - (index % 10));

                return (
                  <RecommendedSidebarCard
                    key={item.slug}
                    item={item}
                    matchPercent={matchPercent}
                  />
                );
              })}
              <div ref={sentinelRef} className="w-full h-2 pointer-events-none opacity-0" aria-hidden="true" />
            </div>

            {/* NÚT XEM THÊM TRONG SIDEBAR */}
            {currentTabMovies.length > visibleLimit && (
              <div className="flex justify-center pt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 8)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <span>Xem thêm</span>
                  <ChevronDown className="w-3.5 h-3.5 text-netflix-red" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {displayedMovies.map((item, index) => {
                // Điểm tương đồng thực tế từ recommendation score
                const matchPercent =
                  typeof item.matchPercent === "number"
                    ? item.matchPercent
                    : Math.max(65, 95 - (index % 10));

                return (
                  <RecommendedMovieCard
                    key={item.slug}
                    item={item}
                    matchPercent={matchPercent}
                  />
                );
              })}
            </div>

            {/* Sentinel kích hoạt cuộn tự động lazy load mượt mà */}
            {currentTabMovies.length > visibleLimit && (
              <div ref={sentinelRef} className="w-full h-4 pointer-events-none opacity-0" aria-hidden="true" />
            )}

            {/* NÚT XEM THÊM PHIM ĐỀ XUẤT */}
            {currentTabMovies.length > visibleLimit && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 12)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm border border-white/15 hover:border-white/30 shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <span>Xem thêm gợi ý</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] text-gray-300">
                    +{Math.min(12, currentTabMovies.length - visibleLimit)}
                  </span>
                  <ChevronDown className="w-4 h-4 text-netflix-red" />
                </button>
              </div>
            )}

            {/* Nút thu gọn nếu đã mở rộng nhiều */}
            {visibleLimit > 12 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisibleLimit(12)}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition font-medium cursor-pointer"
                >
                  <span>Thu gọn</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 text-center text-sm text-gray-400 space-y-3">
          <p>Chưa có danh sách phim đề xuất phù hợp.</p>
          <button
            type="button"
            onClick={() => setActiveTab("best")}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition cursor-pointer"
          >
            Xem gợi ý chung
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Thẻ phim đề xuất phong cách Tiếp tục xem (Aspect-Video 16:9, thoáng đãng, không bị đè chữ lên hình)
 */
const RecommendedMovieCard = React.memo(function RecommendedMovieCard({
  item,
  matchPercent,
}: {
  item: MovieItem;
  matchPercent: number;
}) {
  const rawThumb = pickBestMovieThumb(item, "/default-hero.jpg");
  const thumbUrl = toOptimizedPhimimgUrl(rawThumb, 320);
  const title = item.name || item.title || "Phim";
  const categoryName = item.category?.[0]?.name;
  const year = item.year;
  const time = item.time;
  const quality = item.quality || "FHD";
  const score = item.score || item.imdb?.vote_average;

  return (
    <div className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all duration-300 hover:scale-[1.02] shadow-md hover:shadow-2xl flex flex-col">
      <Link
        href={`/movies/${item.slug}`}
        tabIndex={0}
        className="block h-full flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:scale-[1.03] transition-transform rounded-2xl"
      >
        {/* 1. ẢNH THUMBNAIL (aspect-video 16:9 chuẩn như Tiếp tục xem) */}
        <div className="relative aspect-video w-full bg-zinc-900 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 overflow-hidden">
          <Image
            src={thumbUrl}
            alt={title}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            decoding="async"
            loading="lazy"
            quality={85}
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target && !target.src.includes("/default-hero.jpg")) {
                target.srcset = "";
                target.src = "/default-hero.jpg";
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Badge % Khớp thông minh góc trên bên trái */}
          <div className="absolute top-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-md">
              <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-current" />
              <span>{matchPercent}% Trùng khớp</span>
            </span>
          </div>

          {/* Badge Chất lượng góc trên bên phải */}
          {quality && (
            <div className="absolute top-2 right-2 z-10 pointer-events-none">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md border ${
                  quality.toUpperCase().includes("CAM")
                    ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                    : "bg-black/75 text-zinc-300 border-white/10"
                }`}
              >
                {quality}
              </span>
            </div>
          )}

          {/* Nút Play trung tâm khi hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl shadow-red-950/70 transform group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* 2. THÔNG TIN PHIM BÊN DƯỚI (Ngăn nắp, thoáng đãng, không bị đè lên hình) */}
        <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between">
          <h4 className="text-white text-xs sm:text-sm font-semibold truncate group-hover:text-red-500 transition-colors leading-snug">
            {title}
          </h4>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 mt-2 gap-1">
            <div className="flex items-center gap-1.5 truncate">
              {year && <span>{year}</span>}
              {time && <span className="text-zinc-500 truncate">• {time}</span>}
            </div>
            {categoryName && (
              <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 truncate max-w-[85px] sm:max-w-[110px] shrink-0">
                {categoryName}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
});

/**
 * Thẻ phim đề xuất phong cách YouTube Watch Sidebar (Horizontal layout: Thumb bên trái, Text bên phải)
 */
const RecommendedSidebarCard = React.memo(function RecommendedSidebarCard({
  item,
  matchPercent,
}: {
  item: MovieItem;
  matchPercent: number;
}) {
  const rawThumb = pickBestMovieThumb(item, "/default-hero.jpg");
  const thumbUrl = toOptimizedPhimimgUrl(rawThumb, 240);
  const title = item.name || item.title || "Phim";
  const categoryName = item.category?.[0]?.name;
  const year = item.year;
  const time = item.time;
  const quality = item.quality || "HD";

  return (
    <Link
      href={`/movies/${item.slug}`}
      tabIndex={0}
      title={title}
      className="group flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.07] border border-transparent hover:border-white/10 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
    >
      {/* 1. THUMBNAIL (16:9) */}
      <div className="relative aspect-video w-[115px] sm:w-[130px] rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/10 group-hover:border-white/25 shadow-sm">
        <Image
          src={thumbUrl}
          alt={title}
          fill
          unoptimized
          sizes="140px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          decoding="async"
          loading="lazy"
          quality={80}
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            if (target && !target.src.includes("/default-hero.jpg")) {
              target.srcset = "";
              target.src = "/default-hero.jpg";
            }
          }}
        />
        {quality && (
          <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-bold bg-black/80 text-zinc-300 backdrop-blur-sm border border-white/10 pointer-events-none">
            {quality}
          </span>
        )}
      </div>

      {/* 2. THÔNG TIN PHIM */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-white text-xs sm:text-[13px] font-bold line-clamp-2 leading-tight group-hover:text-red-500 transition-colors">
          {title}
        </h4>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
          {year && <span>{year}</span>}
          {time && <span className="text-zinc-500 truncate">• {time}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          {categoryName && (
            <span className="text-[10px] font-medium text-zinc-300 bg-white/10 px-1.5 py-0.2 rounded border border-white/10 truncate max-w-[90px]">
              {categoryName}
            </span>
          )}
          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5 fill-current" />
            <span>{matchPercent}%</span>
          </span>
        </div>
      </div>
    </Link>
  );
});

export default RecommendationTabs;
