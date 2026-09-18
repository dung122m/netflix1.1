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
import { pickBestMoviePoster, toOptimizedPhimimgUrl } from "@/lib/movieMedia";

export interface ForYouMovieItem {
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
  [key: string]: unknown;
}

export interface ForYouPersonalizedRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbackMovies?: any[];
}

const CACHE_KEY_NAME = "nanaflix_foryou_cache_v4";
const CACHE_TTL = 15 * 60 * 1000; // 15 phút

// Danh sách fallback catalog siêu phẩm luôn sẵn sàng 0ms không cần API ngoài
const DEFAULT_CATALOG_FALLBACK: ForYouMovieItem[] = [
  {
    slug: "avatar",
    name: "Avatar",
    title: "Avatar",
    origin_name: "Avatar",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/b9bfbda8d01150cce89aee8ecf16751c.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/b9bfbda8d01150cce89aee8ecf16751c.jpg",
    year: 2009,
    quality: "4K UHD",
    category: [{ name: "Viễn Tưởng" }],
    matchPercentage: 98,
    matchReason: "Siêu phẩm điện ảnh kinh điển được yêu thích nhất",
  },
  {
    slug: "interstellar",
    name: "Hố Đen Tử Thần",
    title: "Hố Đen Tử Thần",
    origin_name: "Interstellar",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/cbb61be4949efbb532551a141cf5e1e6.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/cbb61be4949efbb532551a141cf5e1e6.jpg",
    year: 2014,
    quality: "4K UHD",
    category: [{ name: "Khoa Học" }],
    matchPercentage: 99,
    matchReason: "Kiệt tác du hành không gian đỉnh cao mọi thời đại",
  },
  {
    slug: "parasite",
    name: "Ký Sinh Trùng",
    title: "Ký Sinh Trùng",
    origin_name: "Parasite",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/e5a40b9918fb5ff61d90f23d8c1cfaeb.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/e5a40b9918fb5ff61d90f23d8c1cfaeb.jpg",
    year: 2019,
    quality: "Full HD",
    category: [{ name: "Tâm Lý" }],
    matchPercentage: 97,
    matchReason: "Tác phẩm đoạt 4 giải Oscar danh giá",
  },
  {
    slug: "train-to-busan",
    name: "Chuyến Tàu Sinh Tử",
    title: "Chuyến Tàu Sinh Tử",
    origin_name: "Train to Busan",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/5e929f452818c644ef061db9395f13b1.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/5e929f452818c644ef061db9395f13b1.jpg",
    year: 2016,
    quality: "Full HD",
    category: [{ name: "Kinh Dị" }],
    matchPercentage: 96,
    matchReason: "Bom tấn sinh tồn zombie đỉnh cao châu Á",
  },
  {
    slug: "diep-van",
    name: "Diệp Vấn",
    title: "Diệp Vấn",
    origin_name: "Ip Man",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/6a0a0cfb2e697faef6a26084041b65e9.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/6a0a0cfb2e697faef6a26084041b65e9.jpg",
    year: 2008,
    quality: "Full HD",
    category: [{ name: "Võ Thuật" }],
    matchPercentage: 98,
    matchReason: "Đỉnh cao võ thuật Vịnh Xuân Quyền huyền thoại",
  },
  {
    slug: "the-dark-knight",
    name: "Kỵ Sĩ Bóng Đêm",
    title: "Kỵ Sĩ Bóng Đêm",
    origin_name: "The Dark Knight",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/7e15bf9273c52a0a2df3d8544d673523.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/7e15bf9273c52a0a2df3d8544d673523.jpg",
    year: 2008,
    quality: "4K UHD",
    category: [{ name: "Hành Động" }],
    matchPercentage: 99,
    matchReason: "Siêu phẩm siêu anh hùng vĩ đại nhất lịch sử",
  },
  {
    slug: "spirited-away",
    name: "Vùng Đất Linh Hồn",
    title: "Vùng Đất Linh Hồn",
    origin_name: "Spirited Away",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/8d689626e2a2292f7c65c2ca16ad909e.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/8d689626e2a2292f7c65c2ca16ad909e.jpg",
    year: 2001,
    quality: "Full HD",
    category: [{ name: "Hoạt Hình" }],
    matchPercentage: 97,
    matchReason: "Kiệt tác hoạt hình Ghibli đoạt giải Oscar",
  },
  {
    slug: "kung-fu-hustle",
    name: "Tuyệt Đỉnh Kungfu",
    title: "Tuyệt Đỉnh Kungfu",
    origin_name: "Kung Fu Hustle",
    poster_url: "https://phimimg.com/upload/vod/20231201-1/2fba9ad1be84e5659779df52c15f4039.jpg",
    thumb_url: "https://phimimg.com/upload/vod/20231201-1/2fba9ad1be84e5659779df52c15f4039.jpg",
    year: 2004,
    quality: "Full HD",
    category: [{ name: "Hài Hước" }],
    matchPercentage: 96,
    matchReason: "Tuyệt tác hài hành động kinh điển Châu Tinh Trì",
  },
];

// Chuyển đổi dữ liệu catalog sẵn có thành định dạng For You
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToForYouItems(rawItems: any[]): ForYouMovieItem[] {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .filter((m) => m && m.slug)
    .map((m) => {
      const title = m.title || m.name || "Phim Hay";
      return {
        slug: m.slug,
        name: title,
        title: title,
        origin_name: m.origin_name || "",
        poster_url: m.poster_url || m.posterUrl || m.thumb_url || m.thumbUrl || "/default-poster.jpg",
        thumb_url: m.thumb_url || m.thumbUrl || m.poster_url || "/default-hero.jpg",
        year: m.year,
        quality: m.quality || "Full HD",
        category: Array.isArray(m.category)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? m.category.map((c: any) => ({ name: typeof c === "string" ? c : c?.name || "Đề Xuất" }))
          : typeof m.category === "string"
          ? [{ name: m.category }]
          : [{ name: "Đề Xuất" }],
        matchPercentage: m.matchPercentage || (Math.floor(Math.random() * 5) + 94),
        matchReason: m.matchReason || "Siêu phẩm thịnh hành được đánh giá cao nhất",
      };
    });
}

// Lấy cache cũ trong localStorage/sessionStorage bất kể thời gian (Stale Cache)
function getStaleCachedData(expectedUid?: string): { items: ForYouMovieItem[]; context?: string; fingerprint?: string; timestamp?: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_NAME) || sessionStorage.getItem(CACHE_KEY_NAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length >= 8) {
      if (expectedUid && parsed.uid && parsed.uid !== expectedUid) {
        return null;
      }
      return {
        items: parsed.items,
        context: parsed.context,
        fingerprint: parsed.fingerprint,
        timestamp: parsed.timestamp,
      };
    }
  } catch {}
  return null;
}

export function ForYouPersonalizedRow({ fallbackMovies }: ForYouPersonalizedRowProps = {}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Nguồn fallback ưu tiên 2: Catalog từ prop có sẵn
  const catalogFallback = useMemo(() => {
    const mapped = mapToForYouItems(fallbackMovies || []);
    return mapped.length >= 8 ? mapped : DEFAULT_CATALOG_FALLBACK;
  }, [fallbackMovies]);

  // Khởi tạo ngay lập tức không để trống: ưu tiên catalog fallback hoặc default
  const [movies, setMovies] = useState<ForYouMovieItem[]>(() => {
    return catalogFallback.slice(0, 16);
  });
  const [contextText, setContextText] = useState<string>("Tuyển chọn chuẩn gu cho bạn");
  const [loading, setLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

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

  const moviesRef = useRef<ForYouMovieItem[]>(movies);
  moviesRef.current = movies;
  const inFlightRef = useRef(false);
  const lastFingerprintRef = useRef("");

  const favoriteGenres = useMemo(() => profile?.favoriteGenres || [], [profile?.favoriteGenres]);
  const genresKey = useMemo(() => favoriteGenres.slice().sort().join(","), [favoriteGenres]);

  // Nạp Stale cache từ localStorage ngay khi client mount nếu có
  useEffect(() => {
    const stale = getStaleCachedData(user?.uid);
    if (stale && stale.items.length >= 8) {
      setMovies(stale.items);
      if (stale.context) {
        setContextText(stale.context);
      }
    }
  }, [user?.uid]);

  // 2. Fetch danh sách phim đề xuất chạy ở background (SWR pattern)
  const fetchRecommendations = useCallback(async (forceRefresh = false, nextSeed?: number) => {
    const currentSeed = nextSeed !== undefined ? nextSeed : refreshCount;
    const history = getWatchHistory();
    
    // Thu thập đầy đủ tín hiệu lịch sử xem (tối đa 20 phim gần nhất)
    const historyItems = history.slice(0, 20).map((h) => ({
      slug: h.slug,
      title: h.title,
      category: h.category,
      country: h.country,
      type: h.type,
      progressSeconds: h.progressSeconds,
      durationSeconds: h.durationSeconds,
      updatedAt: h.updatedAt,
    }));

    const watchedTitles = history.map((h) => h.title).filter(Boolean).slice(0, 20);
    const watchedSlugs = history.map((h) => h.slug).filter(Boolean);
    const historyHash = historyItems
      .slice(0, 6)
      .map((h) => `${h.slug}:${Math.round((h.progressSeconds || 0) / 60)}`)
      .join("|");
    const currentFingerprint = `${user?.uid || "guest"}_${genresKey}_${historyHash}_seed${currentSeed}`;

    if (!forceRefresh && inFlightRef.current) return;
    if (!forceRefresh && lastFingerprintRef.current === currentFingerprint && moviesRef.current.length >= 8) return;

    // Kiểm tra cache local còn tươi (Fresh Cache Hit)
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
            setIsUpdating(false);
            return;
          }
        }
      } catch {}
    }

    inFlightRef.current = true;
    lastFingerprintRef.current = currentFingerprint;

    // Nếu đã có phim fallback/stale, giữ nguyên hiển thị và chỉ bật trạng thái updating ngầm
    if (moviesRef.current.length === 0) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }

    try {
      const res = await fetch("/api/recommendations/for-you", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genres: favoriteGenres,
          historyItems,
          watchedTitles,
          watchedSlugs,
          refreshSeed: currentSeed,
          currentSlugs: moviesRef.current.map((m) => m.slug),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length >= 8) {
          // Cập nhật mượt mà dữ liệu mới
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
                uid: user?.uid || null,
              });
              localStorage.setItem(CACHE_KEY_NAME, cacheData);
              sessionStorage.setItem(CACHE_KEY_NAME, cacheData);
            } catch {}
          }
        }
      }
    } catch (err) {
      // Khi API lỗi, giữ nguyên fallback hiện tại, không làm mất section
      console.warn("Lỗi tải phim đề xuất cho bạn, tiếp tục dùng fallback:", err);
    } finally {
      setLoading(false);
      setIsUpdating(false);
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
            disabled={isUpdating}
            title="Làm mới danh sách gợi ý"
            className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isUpdating ? "animate-spin text-netflix-red" : ""}`} />
            <span>{isUpdating ? "Đang Cập Nhật..." : "Đổi Gợi Ý"}</span>
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
          className={`flex items-center gap-3.5 sm:gap-5 overflow-x-auto overflow-y-hidden pb-4 pt-2 scrollbar-none snap-x snap-mandatory scroll-smooth transition-opacity duration-500 ${
            isUpdating ? "opacity-75" : "opacity-100"
          } [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
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
                    {/* POSTER IMAGE (Chuẩn tỷ lệ 2:3, ưu tiên poster dọc) */}
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                      <Image
                        src={toOptimizedPhimimgUrl(pickBestMoviePoster(movie, "/default-poster.jpg"), 480)}
                        alt={movie.title || movie.name}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 180px, (max-width: 1024px) 240px, 300px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        quality={85}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (target) {
                            // Chỉ fallback sang thumb_url nếu là file nhẹ (-thumb.webp)
                            if (movie.thumb_url && typeof movie.thumb_url === "string" && movie.thumb_url.includes("-thumb.webp") && target.src !== movie.thumb_url) {
                              target.src = movie.thumb_url;
                            } else if (!target.src.includes("/default-poster.jpg")) {
                              target.srcset = "";
                              target.src = "/default-poster.jpg";
                            }
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
