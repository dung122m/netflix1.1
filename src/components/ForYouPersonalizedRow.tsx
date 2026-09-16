"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { getWatchHistory } from "@/lib/watchHistory";

interface ForYouMovieItem {
  slug: string;
  name: string;
  title: string;
  origin_name?: string;
  poster_url: string;
  thumb_url?: string;
  year?: number | string;
  quality?: string;
  category?: { name: string }[];
  matchPercentage?: number;
  matchReason?: string;
}

export function ForYouPersonalizedRow() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const CACHE_KEY_NAME = "nanaflix_foryou_cache_v3";
  const CACHE_TTL = 15 * 60 * 1000; // 15 phút

  const [movies, setMovies] = useState<ForYouMovieItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawCached = localStorage.getItem(CACHE_KEY_NAME) || sessionStorage.getItem(CACHE_KEY_NAME);
        if (rawCached) {
          const cached = JSON.parse(rawCached);
          if (Array.isArray(cached?.items) && cached.items.length >= 6) {
            return cached.items;
          }
        }
      } catch {}
    }
    return [];
  });

  const [contextText, setContextText] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawCached = localStorage.getItem(CACHE_KEY_NAME) || sessionStorage.getItem(CACHE_KEY_NAME);
        if (rawCached) {
          const cached = JSON.parse(rawCached);
          if (cached?.context) return cached.context;
        }
      } catch {}
    }
    return "Tuyển chọn chuẩn gu cho bạn";
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const rawCached = localStorage.getItem(CACHE_KEY_NAME) || sessionStorage.getItem(CACHE_KEY_NAME);
        if (rawCached) {
          const cached = JSON.parse(rawCached);
          if (Array.isArray(cached?.items) && cached.items.length >= 6) {
            return false;
          }
        }
      } catch {}
    }
    return true;
  });

  const [refreshCount, setRefreshCount] = useState<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // 1. Theo dõi thông tin profile người dùng
  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(user.uid, (p) => {
      if (p) setProfile(p);
    });
    return () => unsub();
  }, [user?.uid]);

  const moviesRef = useRef<ForYouMovieItem[]>([]);
  moviesRef.current = movies;
  const inFlightRef = useRef(false);
  const lastFingerprintRef = useRef("");

  const favoriteGenres = useMemo(() => profile?.favoriteGenres || [], [profile?.favoriteGenres]);
  const genresKey = useMemo(() => favoriteGenres.slice().sort().join(","), [favoriteGenres]);

  // 2. Fetch danh sách phim đề xuất (hỗ trợ đổi mới luân phiên khi bấm Đổi Gợi Ý)
  const fetchRecommendations = useCallback(async (forceRefresh = false, nextSeed?: number) => {
    const currentSeed = nextSeed !== undefined ? nextSeed : refreshCount;
    const history = getWatchHistory();
    const watchedTitles = history.map((h) => h.title).filter(Boolean).slice(0, 3);
    const watchedSlugs = history.map((h) => h.slug).filter(Boolean).slice(0, 5);
    const currentFingerprint = `${user?.uid || "guest"}_${genresKey}_${watchedSlugs.join(",")}_seed${currentSeed}`;

    if (!forceRefresh && inFlightRef.current) return;
    if (!forceRefresh && lastFingerprintRef.current === currentFingerprint && moviesRef.current.length >= 8) return;

    // Kiểm tra cache local nếu không yêu cầu forceRefresh
    if (!forceRefresh && typeof window !== "undefined") {
      try {
        const rawCached = localStorage.getItem(CACHE_KEY_NAME) || sessionStorage.getItem(CACHE_KEY_NAME);
        if (rawCached) {
          const cached = JSON.parse(rawCached);
          if (
            cached &&
            cached.fingerprint === currentFingerprint &&
            Date.now() - cached.timestamp < CACHE_TTL &&
            Array.isArray(cached.items) &&
            cached.items.length >= 8
          ) {
            lastFingerprintRef.current = currentFingerprint;
            setMovies(cached.items);
            if (cached.context) setContextText(cached.context);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    inFlightRef.current = true;
    lastFingerprintRef.current = currentFingerprint;
    // Chỉ bật skeleton loading nếu chưa có dữ liệu nào trước đó
    if (moviesRef.current.length === 0) {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/recommendations/for-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genres: favoriteGenres,
          watchedTitles,
          watchedSlugs,
          refreshSeed: currentSeed,
          currentSlugs: moviesRef.current.map((m) => m.slug),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          setMovies(data.items);
          if (data.context) {
            setContextText(data.context);
          }
          // Lưu vào localStorage & sessionStorage
          if (typeof window !== "undefined") {
            try {
              const cacheData = JSON.stringify({
                items: data.items,
                context: data.context || "Tuyển chọn chuẩn gu cho bạn",
                timestamp: Date.now(),
                fingerprint: currentFingerprint,
              });
              localStorage.setItem(CACHE_KEY_NAME, cacheData);
              sessionStorage.setItem(CACHE_KEY_NAME, cacheData);
            } catch {}
          }
        }
      }
    } catch (err) {
      console.warn("Lỗi tải phim đề xuất cho bạn:", err);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [genresKey, user?.uid, refreshCount, favoriteGenres]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRefreshClick = () => {
    const next = refreshCount + 1;
    setRefreshCount(next);
    fetchRecommendations(true, next);
  };

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

  const displayName = profile?.displayName || user?.displayName || "Bạn";

  return (
    <section className="relative my-8 sm:my-12 select-none">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-pink-600 to-red-600 text-white shadow-lg shadow-purple-950/40">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-400 bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/20">
              Cá Nhân Hoá AI
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Dành Riêng Cho {user ? displayName : "Bạn"}</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            {contextText}
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            onClick={handleRefreshClick}
            title="Làm mới danh sách gợi ý"
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-netflix-red" : ""}`} />
            <span>Đổi Gợi Ý</span>
          </button>
        </div>
      </div>

      {/* KHUNG CAROUSEL CÓ NÚT ĐIỀU HƯỚNG TRÁI/PHẢI PHỦ MÉP CHUẨN NETFLIX */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI (HOVER NỔI MÉP TRÁI) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Cuộn sang trái"
            className="hidden sm:flex absolute left-0 top-0 bottom-4 z-30 w-12 md:w-14 bg-gradient-to-r from-black/90 via-black/60 to-transparent hover:from-black text-white items-center justify-start pl-2 opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer rounded-r-xl group/btn"
          >
            <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-md group-hover/btn:scale-110 group-hover/btn:bg-white/20 transition-all shadow-xl">
              <ChevronLeft className="w-5 h-5 text-white" />
            </div>
          </button>
        )}

        {/* NÚT CUỘN PHẢI (HOVER NỔI MÉP PHẢI) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Cuộn sang phải"
            className="hidden sm:flex absolute right-0 top-0 bottom-4 z-30 w-12 md:w-14 bg-gradient-to-l from-black/90 via-black/60 to-transparent hover:from-black text-white items-center justify-end pr-2 opacity-0 group-hover/row:opacity-100 transition-all duration-300 cursor-pointer rounded-l-xl group/btn"
          >
            <div className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center backdrop-blur-md group-hover/btn:scale-110 group-hover/btn:bg-white/20 transition-all shadow-xl">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          </button>
        )}

        {/* HORIZONTAL CAROUSEL */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex items-center gap-3.5 sm:gap-5 overflow-x-auto overflow-y-hidden pb-4 pt-2 scrollbar-none snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
        {loading && movies.length === 0
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none w-[160px] sm:w-[200px] h-[260px] sm:h-[310px] rounded-2xl bg-zinc-900/80 animate-pulse border border-white/5"
              />
            ))
          : movies.map((movie) => {
              const matchScore = movie.matchPercentage || 95;
              const categoryName = movie.category?.[0]?.name;

              return (
                <div
                  key={movie.slug}
                  className="flex-none w-[150px] sm:w-[190px] md:w-[210px] snap-start group select-none"
                >
                  <Link
                    href={`/movies/${movie.slug}`}
                    className="block relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.7)] group-hover:border-purple-500/60 group-hover:shadow-[0_15px_40px_rgba(168,85,247,0.3)] transition-all duration-300 group-hover:scale-[1.03]"
                  >
                    {/* POSTER IMAGE */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                      <Image
                        src={movie.poster_url || movie.thumb_url || "/default-poster.jpg"}
                        alt={movie.title || movie.name}
                        fill
                        sizes="(max-width: 640px) 150px, (max-width: 768px) 190px, 210px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target && !target.src.includes("/default-poster.jpg")) {
                            target.srcset = "";
                            target.src = "/default-poster.jpg";
                          }
                        }}
                      />

                      {/* AI MATCH BADGE */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[10px] font-black shadow-lg">
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>{matchScore}% HỢP GU</span>
                      </div>

                      {/* QUALITY TAG */}
                      {movie.quality && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-amber-300 text-[9px] font-bold border border-white/10">
                          {movie.quality}
                        </div>
                      )}

                      {/* HOVER OVERLAY */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                        <p className="text-white text-xs font-bold line-clamp-1 text-center">
                          {movie.title || movie.name}
                        </p>
                        {movie.matchReason && (
                          <p className="text-[10px] text-purple-300 text-center line-clamp-1 mt-0.5 font-medium">
                            {movie.matchReason}
                          </p>
                        )}
                      </div>

                      {/* BOTTOM INFO BAR */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-2.5 pt-6 group-hover:opacity-0 transition-opacity duration-200">
                        <p className="text-white text-xs font-bold line-clamp-1 drop-shadow">
                          {movie.title || movie.name}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                          {categoryName && (
                            <span className="text-gray-300 line-clamp-1">{categoryName}</span>
                          )}
                          {movie.year && <span>{movie.year}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
