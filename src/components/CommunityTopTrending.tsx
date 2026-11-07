"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Flame,
  TrendingUp,
} from "lucide-react";
import { MovieViewStatItem } from "@/services/supabaseService";
import { formatGenreName } from "@/lib/movieMedia";
import { RankedCarouselSection, RankedMovieData } from "@/components/movies/RankedCarouselSection";

const TRENDING_CACHE_KEY = "nanaflix_trending_community_cache_v5";

function CommunityTopTrendingInner() {
  const [items, setItems] = useState<MovieViewStatItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [timeframe, setTimeframe] = useState<"total" | "week">("total");
  const [isFading, setIsFading] = useState(false);
  const tabCacheRef = useRef<Partial<Record<"total" | "week", MovieViewStatItem[]>>>({});
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

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

  const rankedItems: RankedMovieData[] = useMemo(() => {
    return items.map((movie) => {
      const categoryText = movie.category ? formatGenreName(movie.category) : "";
      const safePoster =
        movie.poster && !movie.poster.includes("phimimg.com") && !movie.poster.includes("/api/img-thumb")
          ? movie.poster
          : undefined;
      const safeThumb =
        movie.thumb && !movie.thumb.includes("phimimg.com") && !movie.thumb.includes("/api/img-thumb")
          ? movie.thumb
          : undefined;

      return {
        slug: movie.movieSlug,
        title: movie.movieTitle,
        poster_url: safePoster,
        thumb_url: safeThumb,
        year: movie.year,
        quality: movie.quality,
        secondaryTag: categoryText,
      };
    });
  }, [items]);

  return (
    <RankedCarouselSection
      title="Khán Giả Xem Nhiều Nhất"
      icon={<TrendingUp className="w-4 h-4" />}
      iconBadge
      subtitle="Bảng xếp hạng phim thịnh hành được cộng đồng khán giả xem nhiều nhất"
      theme="red"
      ariaLabel="Bảng xếp hạng cộng đồng"
      resetTrigger={timeframe}
      items={rankedItems}
      loading={loading}
      isFading={isFading}
      emptyIcon={<Flame className="w-8 h-8 text-zinc-600 mb-2" />}
      emptyMessage={
        timeframe === "week"
          ? "Chưa có lượt xem nào trong 7 ngày gần nhất."
          : "Chưa có dữ liệu lượt xem trên hệ thống."
      }
      emptySubmessage="Khám phá và xem phim để cùng đưa phim lên bảng xếp hạng nhé!"
      actions={
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="inline-flex p-1 rounded-xl bg-zinc-900/90 text-xs font-semibold backdrop-blur-md">
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
      }
    />
  );
}

export const CommunityTopTrending = React.memo(CommunityTopTrendingInner);
export default CommunityTopTrending;
