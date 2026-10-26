"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Crown,
  Globe,
} from "lucide-react";
import { pickBestMoviePoster, toOptimizedPhimimgUrl, formatGenreName, formatCountryName } from "@/lib/movieMedia";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";

export interface TmdbTrendingCategoryItem {
  id?: string;
  name: string;
  slug?: string;
}

export interface TmdbTrendingMovieItem {
  _id?: string;
  name: string;
  slug: string;
  origin_name?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  time?: string;
  type?: string;
  episode_current?: string;
  episode_total?: string;
  quality?: string;
  lang?: string;
  category?: TmdbTrendingCategoryItem[] | string[] | string;
  country?: TmdbTrendingCategoryItem[] | string[] | string;
  tmdb?: {
    vote_average?: number | string;
    vote_count?: number | string;
  };
  score?: number | string;
}

type TmdbTab = "week" | "month" | "top_rated";

const TMDB_RANKING_CACHE_KEY = "nanaflix_ranking_cache_v5";
const FRESH_REVALIDATE_TTL = 6 * 60 * 60 * 1000; // 6 giờ: Tránh fetch TMDB lặp lại khi tải trang chủ

const TAB_CONFIG: Record<
  TmdbTab,
  {
    title: string;
    subtitle: string;
    badge: string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
    gradientClass: string;
  }
> = {
  week: {
    title: "Phim Thịnh Hành Trong Tuần",
    subtitle: "Top 20 phim thịnh hành toàn cầu trên TMDB đã có bản xem tại Nanaflix",
    badge: "TMDB Quốc Tế • Thịnh Hành Tuần",
    icon: Flame,
    badgeClass: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    gradientClass: "from-rose-600 to-amber-500 shadow-red-950/40",
  },
  month: {
    title: "Phim Nổi Bật Trong Tháng",
    subtitle: "Top 20 tác phẩm được đông đảo khán giả quốc tế quan tâm nhất trong tháng",
    badge: "TMDB Quốc Tế • Nổi Bật Tháng",
    icon: Zap,
    badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    gradientClass: "from-amber-500 to-orange-600 shadow-orange-950/40",
  },
  top_rated: {
    title: "Top Phim Hay Nhất Mọi Thời Đại",
    subtitle: "Top 20 kiệt tác điện ảnh kinh điển theo bảng xếp hạng IMDb Top 250",
    badge: "IMDb Top 250 • Kiệt Tác Điện Ảnh",
    icon: Crown,
    badgeClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    gradientClass: "from-amber-400 to-yellow-600 shadow-yellow-950/40",
  },
};

function TmdbTopTrendingInner() {
  const [activeTab, setActiveTab] = useState<TmdbTab>("week");
  const [items, setItems] = useState<TmdbTrendingMovieItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFading, setIsFading] = useState(false);

  const tabCacheRef = useRef<Partial<Record<TmdbTab, TmdbTrendingMovieItem[]>>>({});
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // 1. Đọc cache localStorage ngay khi mount (0ms) và fetch revalidate chỉ tab "week" nếu cache đã quá 5 phút
  useEffect(() => {
    let isMounted = true;
    let shouldRevalidateWeek = true;

    try {
      // Dọn dẹp cache cũ để tránh hiển thị danh sách TMDB top_rated cũ
      localStorage.removeItem("nanaflix_tmdb_ranking_cache_v3");
      localStorage.removeItem("nanaflix_tmdb_ranking_cache_v4");

      const raw = localStorage.getItem(TMDB_RANKING_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Cache hợp lệ trong 12 giờ
        const isValid = parsed.timestamp && Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000;
        if (isValid) {
          if (Array.isArray(parsed.week) && parsed.week.length > 0) {
            tabCacheRef.current["week"] = parsed.week;
          }
          if (Array.isArray(parsed.month) && parsed.month.length > 0) {
            tabCacheRef.current["month"] = parsed.month;
          }
          if (Array.isArray(parsed.top_rated) && parsed.top_rated.length > 0) {
            tabCacheRef.current["top_rated"] = parsed.top_rated;
          }

          const currentTf = activeTabRef.current;
          const cachedForCurrent = tabCacheRef.current[currentTf];
          if (cachedForCurrent && cachedForCurrent.length > 0) {
            setItems(cachedForCurrent);
            setLoading(false);
          }

          // Nếu cache tuần còn dưới 5 phút, không cần revalidate ngầm
          if (Date.now() - parsed.timestamp < FRESH_REVALIDATE_TTL && Array.isArray(parsed.week) && parsed.week.length > 0) {
            shouldRevalidateWeek = false;
          }
        }
      }
    } catch {
      // Bỏ qua nếu localStorage lỗi
    }

    if (!shouldRevalidateWeek) return;

    // Chỉ fetch tab "week" khi mới mở trang (Lazy/On-demand cho các tab còn lại)
    const fetchWeekInitial = async () => {
      try {
        const res = await fetch("/api/trending-tmdb?type=week&limit=20");
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (!isMounted) return;

        if (Array.isArray(data?.items) && data.items.length > 0) {
          tabCacheRef.current["week"] = data.items;
          if (activeTabRef.current === "week") {
            setItems(data.items);
          }
          try {
            localStorage.setItem(
              TMDB_RANKING_CACHE_KEY,
              JSON.stringify({
                ...tabCacheRef.current,
                week: data.items,
                timestamp: Date.now(),
              })
            );
          } catch {}
        }
      } catch (err) {
        console.warn("Lỗi tải TMDB Trending Week:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWeekInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Chuyển đổi tab: fetch on-demand nếu tab chưa có cache
  const switchTab = (nextTab: TmdbTab) => {
    if (nextTab === activeTab) return;

    setIsFading(true);
    setActiveTab(nextTab);
    activeTabRef.current = nextTab;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }

    const cached = tabCacheRef.current[nextTab];
    if (cached && cached.length > 0) {
      setItems(cached);
      setTimeout(() => setIsFading(false), 100);

      // Nếu cache còn dưới 5 phút, không cần gửi request revalidate ngầm
      let isFresh = false;
      try {
        const raw = localStorage.getItem(TMDB_RANKING_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.timestamp && Date.now() - parsed.timestamp < FRESH_REVALIDATE_TTL && parsed[nextTab]) {
            isFresh = true;
          }
        }
      } catch {}

      if (isFresh) return;

      // Revalidate ngầm
      fetch(`/api/trending-tmdb?type=${nextTab}&limit=20`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
            tabCacheRef.current[nextTab] = data.items;
            if (activeTabRef.current === nextTab) {
              setItems(data.items);
            }
            try {
              const raw = localStorage.getItem(TMDB_RANKING_CACHE_KEY);
              const currentCache = raw ? JSON.parse(raw) : {};
              localStorage.setItem(
                TMDB_RANKING_CACHE_KEY,
                JSON.stringify({
                  ...currentCache,
                  [nextTab]: data.items,
                  timestamp: Date.now(),
                })
              );
            } catch {}
          }
        })
        .catch(() => {});
    } else {
      // Chưa có cache cho tab này: fetch mới
      setLoading(true);
      fetch(`/api/trending-tmdb?type=${nextTab}&limit=20`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
            tabCacheRef.current[nextTab] = data.items;
            if (activeTabRef.current === nextTab) {
              setItems(data.items);
            }
            try {
              const raw = localStorage.getItem(TMDB_RANKING_CACHE_KEY);
              const currentCache = raw ? JSON.parse(raw) : {};
              localStorage.setItem(
                TMDB_RANKING_CACHE_KEY,
                JSON.stringify({
                  ...currentCache,
                  [nextTab]: data.items,
                  timestamp: Date.now(),
                })
              );
            } catch {}
          }
        })
        .catch((err) => {
          console.warn(`Lỗi tải BXH TMDB ${nextTab}:`, err);
        })
        .finally(() => {
          setIsFading(false);
          setLoading(false);
        });
    }
  };

  const rafRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!scrollContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const nextLeft = scrollLeft > 20;
      const nextRight = scrollLeft < scrollWidth - clientWidth - 20;
      setCanScrollLeft((prev) => (prev !== nextLeft ? nextLeft : prev));
      setCanScrollRight((prev) => (prev !== nextRight ? nextRight : prev));
    });
  }, []);

  // Đảm bảo scroll luôn reset về 0 (Top 1) khi đổi tab hoặc đổi danh sách phim
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
    checkScroll();
  }, [activeTab, items, checkScroll]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

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
      checkScroll();
    }
  };

  const currentConfig = TAB_CONFIG[activeTab];
  const IconComponent = currentConfig.icon;

  return (
    <section
      className="relative my-8 sm:my-12 select-none"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 480px",
      }}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5 sm:gap-4 mb-4 sm:mb-5 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr ${currentConfig.gradientClass} text-white shadow-lg shrink-0`}
            >
              <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </span>
            <span
              className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${currentConfig.badgeClass}`}
            >
              <Globe className="w-3 h-3 shrink-0" />
              <span>{currentConfig.badge}</span>
            </span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span>{currentConfig.title}</span>
            {activeTab === "week" && <Flame className="w-5 h-5 text-netflix-red shrink-0" />}
            {activeTab === "month" && <Zap className="w-5 h-5 text-amber-400 shrink-0" />}
            {activeTab === "top_rated" && <Crown className="w-5 h-5 text-yellow-400 shrink-0" />}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 line-clamp-2">
            {currentConfig.subtitle}
          </p>
        </div>

        {/* 3 TABS & CAROUSEL CONTROLS */}
        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-semibold backdrop-blur-md overflow-x-auto scrollbar-none max-w-full w-full sm:w-auto justify-start">
            <button
              type="button"
              onClick={() => switchTab("week")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                activeTab === "week"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-red-950/40 scale-100"
                  : "text-gray-400 hover:text-white hover:bg-white/5 active:scale-95"
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>Thịnh Hành Tuần</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab("month")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                activeTab === "month"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-red-950/40 scale-100"
                  : "text-gray-400 hover:text-white hover:bg-white/5 active:scale-95"
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Nổi Bật Tháng</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab("top_rated")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                activeTab === "top_rated"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-red-950/40 scale-100"
                  : "text-gray-400 hover:text-white hover:bg-white/5 active:scale-95"
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span>Mọi Thời Đại</span>
            </button>
          </div>
        </div>
      </div>

      {/* HORIZONTAL SCROLL CAROUSEL */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI / PHẢI: FLOATING GLASS PILL CHUẨN */}
        {canScrollLeft && (
          <CarouselNavButton
            direction="left"
            onClick={() => handleScroll("left")}
            ariaLabel="Cuộn bảng xếp hạng sang trái"
            topOffsetClass="top-[40%]"
          />
        )}

        {canScrollRight && (
          <CarouselNavButton
            direction="right"
            onClick={() => handleScroll("right")}
            ariaLabel="Cuộn bảng xếp hạng sang phải"
            topOffsetClass="top-[40%]"
          />
        )}

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
          className="flex items-center gap-3 sm:gap-6 overflow-x-auto overflow-y-hidden px-3 sm:px-6 py-4 sm:py-5 scrollbar-none snap-x snap-mandatory"
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
              <Sparkles className="w-8 h-8 text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-400">
                Chưa có phim phù hợp trong danh mục này.
              </p>
            </div>
          ) : (
            items.map((movie, index) => {
              const rank = index + 1;
              const movieSlug = movie.slug;
              const movieTitle = movie.name || movie.origin_name || "Phim";

              const rawCountry = Array.isArray(movie.country)
                ? (typeof movie.country[0] === "object" ? movie.country[0]?.name || movie.country[0]?.slug : movie.country[0]) || ""
                : typeof movie.country === "string"
                ? movie.country
                : "";
              const countryText = formatCountryName(rawCountry);

              const rawCategory = Array.isArray(movie.category)
                ? (typeof movie.category[0] === "object" ? movie.category[0]?.name : movie.category[0]) || ""
                : typeof movie.category === "string"
                ? movie.category
                : "";
              const categoryText = formatGenreName(rawCategory);

              const secondaryTag = countryText || categoryText;

              return (
                <div
                  key={movieSlug || `trending-tmdb-${activeTab}-${index}`}
                  className="flex-none relative snap-start group select-none"
                >
                  <Link
                    href={`/movies/${movieSlug}`}
                    className="flex items-start relative block cursor-pointer group-hover:scale-[1.025] group-hover:-translate-y-1 transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-xl"
                  >
                    {/* NETFLIX-STYLE GIANT 3D NUMBER BEHIND POSTER */}
                    <div className="flex items-end h-[210px] sm:h-[262px] md:h-[285px] relative -mr-5 sm:-mr-8 z-0 pointer-events-none select-none shrink-0">
                      <span
                        className="text-[90px] sm:text-[130px] md:text-[150px] font-black leading-none tracking-tighter"
                        style={{
                          WebkitTextStroke: rank <= 3 ? "2px rgba(245, 158, 11, 0.85)" : "2px rgba(255, 255, 255, 0.22)",
                          color: rank <= 3 ? "transparent" : "rgba(0, 0, 0, 0.6)",
                          backgroundImage: rank === 1
                            ? "linear-gradient(180deg, #fbbf24 0%, #d97706 100%)"
                            : rank === 2
                            ? "linear-gradient(180deg, #f1f5f9 0%, #64748b 100%)"
                            : rank === 3
                            ? "linear-gradient(180deg, #d97706 0%, #78350f 100%)"
                            : undefined,
                          WebkitBackgroundClip: rank <= 3 ? "text" : undefined,
                          filter: rank <= 3 ? "drop-shadow(0 10px 15px rgba(245, 158, 11, 0.35))" : undefined,
                        }}
                      >
                        {rank}
                      </span>
                    </div>

                    {/* CỘT POSTER + METADATA DƯỚI POSTER */}
                    <div className="relative z-10 w-[140px] sm:w-[175px] md:w-[190px] flex flex-col shrink-0 min-w-0">
                      {/* MOVIE POSTER CONTAINER (ARTWORK THUẦN KHIẾT) */}
                      <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-950 bg-gradient-to-br from-zinc-800/70 via-zinc-900 to-zinc-950 ring-1 ring-white/10 group-hover:ring-2 group-hover:ring-amber-400 group-hover:ring-inset group-hover:shadow-[0_14px_32px_rgba(245,158,11,0.3),0_0_20px_rgba(0,0,0,0.8)] transition-all duration-300">
                        {(() => {
                          const rawPoster = pickBestMoviePoster(
                            {
                              poster_url: movie.poster_url,
                              thumb_url: movie.thumb_url,
                              name: movieTitle,
                              slug: movieSlug,
                            },
                            "/default-poster.jpg"
                          );
                          const posterSrc = toOptimizedPhimimgUrl(rawPoster, 320);

                          return (
                            <Image
                              src={posterSrc}
                              alt={movieTitle}
                              fill
                              unoptimized
                              priority={index < 3}
                              sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 240px"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              loading={index < 3 ? "eager" : "lazy"}
                              quality={85}
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                if (target) {
                                  if (
                                    movie.thumb_url &&
                                    typeof movie.thumb_url === "string" &&
                                    movie.thumb_url.includes("-thumb.webp") &&
                                    target.src !== movie.thumb_url
                                  ) {
                                    target.src = movie.thumb_url;
                                  } else if (!target.src.includes("/default-poster.jpg")) {
                                    target.srcset = "";
                                    target.src = "/default-poster.jpg";
                                  }
                                }
                              }}
                            />
                          );
                        })()}

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

                      {/* THÔNG TIN PHIM DƯỚI POSTER: RÕ RÀNG, KHÔNG XUNG ĐỘT ARTWORK, CĂN ĐỀU BASELINE */}
                      <div className="pt-2 sm:pt-2.5 min-w-0 flex flex-col">
                        <h3
                          title={movieTitle}
                          className="text-white text-xs sm:text-[13px] font-semibold truncate group-hover:text-amber-300 transition-colors"
                        >
                          {movieTitle}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400 mt-1 font-medium min-w-0">
                          <span className="shrink-0">{movie.year || "Mới"}</span>
                          {secondaryTag && <span className="text-zinc-600 shrink-0">•</span>}
                          {secondaryTag && (
                            <span className="text-zinc-400 truncate min-w-0">{secondaryTag}</span>
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

export const TmdbTopTrending = React.memo(TmdbTopTrendingInner);
export default TmdbTopTrending;
