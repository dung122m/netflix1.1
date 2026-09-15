"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Play,
  Eye,
  TrendingUp,
} from "lucide-react";
import { MovieViewStatItem } from "@/services/supabaseService";

export function CommunityTopTrending() {
  const [items, setItems] = useState<MovieViewStatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"total" | "week">("total");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const fetchTrending = async (tf: "total" | "week") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trending-community?timeframe=${tf}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.warn("Lỗi tải Top Trending cộng đồng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending(timeframe);
  }, [timeframe]);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="relative my-8 sm:my-12 select-none">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-lg shadow-red-950/40">
              <TrendingUp className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Cộng Đồng Nanaflix
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Top 10 Phim Được Xem Nhiều Nhất</span>
            <Flame className="w-6 h-6 text-netflix-red animate-bounce" />
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Xếp hạng theo số lượt xem và bình chọn thực tế từ khán giả trên hệ thống
          </p>
        </div>

        {/* TIMEFRAME TABS & NAVIGATION BUTTONS */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="inline-flex p-1 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-semibold backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTimeframe("total")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === "total"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-red-950/40"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              🔥 Toàn Thời Gian
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("week")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timeframe === "week"
                  ? "bg-netflix-red text-white font-bold shadow-md shadow-red-950/40"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              ⚡ Trong Tuần
            </button>
          </div>

          {/* CAROUSEL ARROWS */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Cuộn trái"
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${
                canScrollLeft
                  ? "bg-zinc-800/90 border-white/15 text-white hover:bg-zinc-700 hover:scale-105 active:scale-95 cursor-pointer"
                  : "bg-zinc-900/50 border-white/5 text-zinc-600 cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Cuộn phải"
              className={`w-8 h-8 rounded-full flex items-center justify-center border transition ${
                canScrollRight
                  ? "bg-zinc-800/90 border-white/15 text-white hover:bg-zinc-700 hover:scale-105 active:scale-95 cursor-pointer"
                  : "bg-zinc-900/50 border-white/5 text-zinc-600 cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* HORIZONTAL SCROLL CAROUSEL */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-3 sm:gap-6 overflow-x-auto overflow-y-hidden pb-4 pt-2 scrollbar-none snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading && items.length === 0
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none w-[220px] sm:w-[260px] h-[320px] sm:h-[360px] rounded-2xl bg-zinc-900/80 animate-pulse border border-white/5"
              />
            ))
          : items.map((movie, index) => {
              const rank = index + 1;
              const views = timeframe === "week" ? movie.viewsWeek : movie.viewsTotal;

              return (
                <div
                  key={movie.movieSlug}
                  className="flex-none relative snap-start group select-none"
                >
                  <Link
                    href={`/movies/${movie.movieSlug}`}
                    className="flex items-end relative block cursor-pointer group-hover:scale-[1.02] transition-transform duration-300 ease-out"
                  >
                    {/* NETFLIX-STYLE GIANT 3D NUMBER */}
                    <div className="relative -mr-5 sm:-mr-8 z-0 pointer-events-none select-none">
                      <span
                        className="text-[90px] sm:text-[130px] md:text-[150px] font-black leading-none tracking-tighter"
                        style={{
                          WebkitTextStroke: rank <= 3 ? "2px rgba(239, 68, 68, 0.9)" : "2px rgba(255, 255, 255, 0.25)",
                          color: rank === 1
                            ? "transparent"
                            : rank === 2
                            ? "transparent"
                            : rank === 3
                            ? "transparent"
                            : "rgba(0, 0, 0, 0.6)",
                          backgroundImage: rank === 1
                            ? "linear-gradient(180deg, #f59e0b 0%, #dc2626 100%)"
                            : rank === 2
                            ? "linear-gradient(180deg, #e2e8f0 0%, #64748b 100%)"
                            : rank === 3
                            ? "linear-gradient(180deg, #d97706 0%, #78350f 100%)"
                            : undefined,
                          WebkitBackgroundClip: rank <= 3 ? "text" : undefined,
                          filter: rank <= 3 ? "drop-shadow(0 10px 15px rgba(220, 38, 38, 0.4))" : undefined,
                        }}
                      >
                        {rank}
                      </span>
                    </div>

                    {/* MOVIE POSTER CARD */}
                    <div className="relative z-10 w-[140px] sm:w-[175px] md:w-[190px] aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.8)] group-hover:border-netflix-red/60 group-hover:shadow-[0_20px_45px_rgba(229,9,20,0.35)] transition-all duration-300">
                      <Image
                        src={movie.poster || movie.thumb || "/default-poster.jpg"}
                        alt={movie.movieTitle}
                        fill
                        sizes="(max-width: 640px) 140px, (max-width: 768px) 175px, 190px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        loading={rank <= 4 ? "eager" : "lazy"}
                      />

                      {/* TOP BADGE */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        {rank <= 3 && (
                          <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-amber-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md">
                            TOP {rank}
                          </span>
                        )}
                        {movie.quality && (
                          <span className="ml-auto px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-amber-300 text-[9px] font-bold border border-white/10">
                            {movie.quality}
                          </span>
                        )}
                      </div>

                      {/* HOVER OVERLAY PLAY BUTTON */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 sm:p-3">
                        <div className="w-10 h-10 rounded-full bg-netflix-red text-white flex items-center justify-center mx-auto mb-2 shadow-lg shadow-red-950/60 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                        <p className="text-white text-xs font-bold line-clamp-1 text-center">
                          {movie.movieTitle}
                        </p>
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300 mt-1">
                          <Eye className="w-3 h-3 text-amber-400" />
                          <span>{views.toLocaleString("vi-VN")} lượt xem</span>
                        </div>
                      </div>

                      {/* FOOTER VIEW COUNT BADGE (ALWAYS VISIBLE) */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2 pt-6 group-hover:opacity-0 transition-opacity duration-200">
                        <p className="text-white text-[11px] sm:text-xs font-bold line-clamp-1 drop-shadow">
                          {movie.movieTitle}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                          <span className="flex items-center gap-1 text-amber-400 font-semibold">
                            <Eye className="w-3 h-3" />
                            {views.toLocaleString("vi-VN")}
                          </span>
                          {movie.year && <span>{movie.year}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
      </div>
    </section>
  );
}
