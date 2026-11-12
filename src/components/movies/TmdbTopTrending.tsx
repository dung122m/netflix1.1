"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Flame,
  Film,
  Zap,
  Crown,
} from "lucide-react";
import { formatGenreName, formatCountryName } from "@/lib/movieMedia";
import { RankedCarouselSection, RankedMovieData } from "@/components/movies/RankedCarouselSection";

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

const TMDB_RANKING_CACHE_KEY = "nanaflix_ranking_cache_v8";
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
    badgeClass: "text-netflix-red bg-netflix-red/10 ",
    gradientClass: "from-netflix-red to-netflix-red/70 shadow-black/50",
  },
  month: {
    title: "Phim Nổi Bật Trong Tháng",
    subtitle: "Top 20 tác phẩm được đông đảo khán giả quốc tế quan tâm nhất trong tháng",
    badge: "TMDB Quốc Tế • Nổi Bật Tháng",
    icon: Zap,
    badgeClass: "text-amber-400 bg-amber-500/10 ",
    gradientClass: "from-amber-500 to-orange-600 shadow-black/50",
  },
  top_rated: {
    title: "Top Phim Hay Nhất Mọi Thời Đại",
    subtitle: "Top 20 kiệt tác điện ảnh kinh điển theo bảng xếp hạng IMDb Top 250",
    badge: "IMDb Top 250 • Kiệt Tác Điện Ảnh",
    icon: Crown,
    badgeClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    gradientClass: "from-amber-400 to-yellow-600 shadow-black/50",
  },
};

function TmdbTopTrendingInner({
  initialItems,
}: {
  initialItems?: TmdbTrendingMovieItem[];
} = {}) {
  const hasInitialItems = Boolean(initialItems && initialItems.length > 0);
  const [activeTab, setActiveTab] = useState<TmdbTab>("week");
  const [items, setItems] = useState<TmdbTrendingMovieItem[]>(() =>
    hasInitialItems ? initialItems! : [],
  );
  const [loading, setLoading] = useState<boolean>(() => !hasInitialItems);
  const [isFading, setIsFading] = useState(false);

  const tabCacheRef = useRef<Partial<Record<TmdbTab, TmdbTrendingMovieItem[]>>>(
    hasInitialItems ? { week: initialItems } : {},
  );
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // 1. Đọc cache localStorage ngay khi mount (0ms) và bỏ qua fetch nếu đã có SSR initialItems hoặc cache tươi
  useEffect(() => {
    let isMounted = true;
    let shouldRevalidateWeek = !hasInitialItems;

    try {
      // Dọn dẹp cache cũ để tránh hiển thị danh sách TMDB top_rated cũ
      localStorage.removeItem("nanaflix_tmdb_ranking_cache_v3");
      localStorage.removeItem("nanaflix_tmdb_ranking_cache_v4");
      localStorage.removeItem("nanaflix_ranking_cache_v7");

      const raw = localStorage.getItem(TMDB_RANKING_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Cache hợp lệ trong 12 giờ
        const isValid = parsed.timestamp && Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000;
        if (isValid) {
          if (!hasInitialItems && Array.isArray(parsed.week) && parsed.week.length > 0) {
            tabCacheRef.current["week"] = parsed.week;
          }
          if (Array.isArray(parsed.month) && parsed.month.length > 0) {
            tabCacheRef.current["month"] = parsed.month;
          }
          if (Array.isArray(parsed.top_rated) && parsed.top_rated.length > 0) {
            tabCacheRef.current["top_rated"] = parsed.top_rated;
          }

          if (!hasInitialItems) {
            const currentTab = activeTabRef.current;
            const cachedForCurrent = tabCacheRef.current[currentTab];
            if (cachedForCurrent && cachedForCurrent.length > 0) {
              setItems(cachedForCurrent);
              setLoading(false);

              // Chỉ bỏ qua fetch nếu ĐÃ CÓ dữ liệu thực sự trong cache và cache dưới 6 tiếng
              if (Date.now() - parsed.timestamp < FRESH_REVALIDATE_TTL) {
                shouldRevalidateWeek = false;
              }
            }
          }
        }
      }
    } catch {
      // Bỏ qua nếu localStorage bị vô hiệu hóa
    }

    if (!shouldRevalidateWeek) {
      return () => {
        isMounted = false;
      };
    }

    // Luôn fetch tab mặc định "week" khi vào trang (SWR) nếu cần revalidate
    const fetchWeek = async () => {
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
            const raw = localStorage.getItem(TMDB_RANKING_CACHE_KEY);
            const currentCache = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
              TMDB_RANKING_CACHE_KEY,
              JSON.stringify({
                ...currentCache,
                week: data.items,
                timestamp: Date.now(),
              })
            );
          } catch {}
        }
      } catch (err) {
        console.warn("Lỗi tải TMDB Trending:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWeek();
    return () => {
      isMounted = false;
    };
  }, [hasInitialItems]);

  // 2. Chuyển đổi tab: render cache tức thì nếu có, và fetch ngầm nếu chưa có
  const switchTab = (nextTab: TmdbTab) => {
    if (nextTab === activeTab) return;

    setIsFading(true);
    setActiveTab(nextTab);
    activeTabRef.current = nextTab;

    const cached = tabCacheRef.current[nextTab];
    if (cached && cached.length > 0) {
      setItems(cached);
      setTimeout(() => setIsFading(false), 100);
      return;
    }

    setLoading(true);
    fetch(`/api/trending-tmdb?type=${nextTab}&limit=20`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items && Array.isArray(data.items)) {
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
        console.warn(`Lỗi tải TMDB ${nextTab}:`, err);
      })
      .finally(() => {
        setIsFading(false);
        setLoading(false);
      });
  };

  const currentConfig = TAB_CONFIG[activeTab];
  const IconComponent = currentConfig.icon;

  const rankedItems: RankedMovieData[] = useMemo(() => {
    return items.map((movie, index) => {
      const movieSlug = movie.slug || `trending-tmdb-${activeTab}-${index}`;
      const movieTitle = movie.name || movie.origin_name || "Phim";

      const rawCountry = Array.isArray(movie.country)
        ? (typeof movie.country[0] === "object"
            ? movie.country[0]?.name || movie.country[0]?.slug
            : movie.country[0]) || ""
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

      const secondaryTag = categoryText || countryText;

      return {
        slug: movieSlug,
        title: movieTitle,
        origin_name: movie.origin_name,
        poster_url: movie.poster_url,
        thumb_url: movie.thumb_url,
        year: movie.year,
        quality: movie.quality,
        secondaryTag,
      };
    });
  }, [items, activeTab]);

  return (
    <RankedCarouselSection
      title={currentConfig.title}
      icon={<IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
      iconBadge
      subtitle={currentConfig.subtitle}
      theme="amber"
      ariaLabel="Bảng xếp hạng TMDB"
      resetTrigger={activeTab}
      items={rankedItems}
      loading={loading}
      isFading={isFading}
      emptyIcon={<Film className="w-8 h-8 text-zinc-600 mb-2" />}
      emptyMessage="Chưa có phim phù hợp trong danh mục này."
      actions={
        <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 text-xs font-semibold backdrop-blur-md overflow-x-auto scrollbar-none max-w-full w-full sm:w-auto justify-start">
            <button
              type="button"
              onClick={() => switchTab("week")}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 text-[11px] sm:text-xs ${
                activeTab === "week"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50 scale-100"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95"
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
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50 scale-100"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95"
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
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50 scale-100"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95"
              }`}
            >
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span>Mọi Thời Đại</span>
            </button>
          </div>
        </div>
      }
    />
  );
}

export const TmdbTopTrending = React.memo(TmdbTopTrendingInner);
export default TmdbTopTrending;
