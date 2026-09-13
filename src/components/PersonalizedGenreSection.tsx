"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Heart,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { movieApi } from "@/services/movieApi";

interface PersonalizedGenreSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allMovies?: any[];
}

export interface GenreMeta {
  slug: string;
  name: string;
  isType?: boolean;
}

export const GENRE_MAP: Record<string, GenreMeta> = {
  "💥 Hành Động": { slug: "hanh-dong", name: "Hành Động" },
  "💖 Tình Cảm": { slug: "tinh-cam", name: "Tình Cảm" },
  "👻 Kinh Dị": { slug: "kinh-di", name: "Kinh Dị" },
  "🛸 Viễn Tưởng": { slug: "vien-tuong", name: "Viễn Tưởng" },
  "🎨 Hoạt Hình / Anime": { slug: "hoat-hinh", name: "Hoạt Hình & Anime" },
  "🤣 Hài Hước": { slug: "hai-huoc", name: "Hài Hước" },
  "🏯 Cổ Trang": { slug: "co-trang", name: "Cổ Trang" },
  "🕵️ Trinh Thám": { slug: "trinh-tham", name: "Trinh Thám" },
  "🍿 Chiếu Rạp": { slug: "phim-chieu-rap", isType: true, name: "Phim Chiếu Rạp" },
  "📺 Phim Bộ": { slug: "phim-bo", isType: true, name: "Phim Bộ" },
  "🎪 TV Shows": { slug: "tv-shows", isType: true, name: "TV Shows" },
  "🥋 Võ Thuật": { slug: "vo-thuat", name: "Võ Thuật" },
};

function PersonalizedGenreSectionInner({ allMovies = [] }: PersonalizedGenreSectionProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [genreFetchedMovies, setGenreFetchedMovies] = useState<Record<string, any[]>>({});
  const [loadingGenre, setLoadingGenre] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(user.uid, (data) => {
      setProfile(data);
    });
    return () => unsub();
  }, [user]);

  const favoriteGenres = profile?.favoriteGenres || [];

  // Tự động tải phim theo thể loại từ API khi chọn Tab cụ thể
  useEffect(() => {
    if (activeTab === "ALL" || !activeTab) return;
    const meta = GENRE_MAP[activeTab];
    if (!meta) return;

    if (genreFetchedMovies[activeTab] && genreFetchedMovies[activeTab].length > 0) {
      return; // Đã có trong cache
    }

    let isMounted = true;
    setLoadingGenre(true);

    const fetchCategoryMovies = async () => {
      try {
        const res = await movieApi.getMovies({
          ...(meta.isType ? { type: meta.slug } : { category: meta.slug }),
          limit: 18,
          page: 1,
        });
        if (isMounted && res?.items) {
          setGenreFetchedMovies((prev) => ({
            ...prev,
            [activeTab]: res.items,
          }));
        }
      } catch (err) {
        console.warn("Lỗi tải phim theo thể loại:", activeTab, err);
      } finally {
        if (isMounted) setLoadingGenre(false);
      }
    };

    fetchCategoryMovies();
    return () => {
      isMounted = false;
    };
  }, [activeTab, genreFetchedMovies]);

  // Cuộn mượt hàng phim sang Trái / Phải
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Xác định danh sách phim hiển thị dựa trên Tab được chọn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayMovies: any[] = React.useMemo(() => {
    if (favoriteGenres.length === 0) return [];

    // Nếu chọn Tab thể loại cụ thể
    if (activeTab !== "ALL" && GENRE_MAP[activeTab]) {
      const fetched = genreFetchedMovies[activeTab];
      if (fetched && fetched.length > 0) return fetched;

      // Fallback tìm trong allMovies
      const meta = GENRE_MAP[activeTab];
      return allMovies.filter((movie) => {
        if (!movie) return false;
        const categories = movie.category || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return categories.some((c: any) => c.slug === meta.slug || (c.name || "").includes(meta.name));
      });
    }

    // Nếu chọn Tab "Tất Cả Gu": Tổng hợp phim từ allMovies khớp với các thể loại yêu thích
    const lowerFavNames = favoriteGenres.map((g) => {
      const meta = GENRE_MAP[g];
      return meta ? meta.name.toLowerCase() : g.replace(/^[^\w\s]+/g, "").trim().toLowerCase();
    });

    const matches = allMovies.filter((movie) => {
      if (!movie) return false;
      const categories = (movie.category || []).map((c: { name: string }) =>
        (c.name || "").toLowerCase()
      );
      const title = (movie.name || movie.title || "").toLowerCase();

      return lowerFavNames.some(
        (fav) => categories.some((cat: string) => cat.includes(fav) || fav.includes(cat)) || title.includes(fav)
      );
    });

    return matches.length > 0 ? matches : allMovies.slice(0, 12);
  }, [activeTab, allMovies, favoriteGenres, genreFetchedMovies]);

  // Nếu người dùng chưa chọn thể loại yêu thích -> Hiện Banner gợi ý cài đặt
  if (!favoriteGenres || favoriteGenres.length === 0) {
    return (
      <div className="w-full my-6 rounded-2xl border border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-zinc-950 to-zinc-950 p-4 sm:p-5 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="w-11 h-11 rounded-2xl bg-netflix-red/20 border border-netflix-red/40 flex items-center justify-center text-rose-400 flex-shrink-0 mx-auto sm:mx-0 shadow-inner">
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <span>Cá Nhân Hóa Đề Xuất Theo Gu Của Bạn</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Chọn 3–5 thể loại khoái khẩu trong Hồ sơ để Nanaflix tự động ưu tiên gợi ý đúng bộ phim bạn yêu thích nhất!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-user-profile"));
          }}
          className="px-4 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white text-xs font-black transition shadow-lg shadow-rose-950/50 flex items-center gap-2 flex-shrink-0 cursor-pointer active:scale-95"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Chọn thể loại yêu thích</span>
        </button>
      </div>
    );
  }

  const activeGenreMeta = activeTab !== "ALL" ? GENRE_MAP[activeTab] : null;
  const viewAllUrl = activeGenreMeta
    ? activeGenreMeta.isType
      ? `/browse?type=${activeGenreMeta.slug}`
      : `/browse?category=${activeGenreMeta.slug}`
    : `/browse`;

  return (
    <div className="w-full my-6 sm:my-8 space-y-3.5 bg-gradient-to-b from-zinc-950/80 to-transparent p-4 sm:p-5 rounded-2xl border border-white/10 shadow-2xl">
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600/30 to-amber-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Gợi Ý Đúng Gu Của Bạn</span>
            </h3>
            <p className="text-xs text-gray-400">
              {activeTab === "ALL"
                ? `Tổng hợp phim đúng với ${favoriteGenres.length} thể loại bạn thích`
                : `Danh sách phim thể loại ${activeGenreMeta?.name || activeTab}`}
            </p>
          </div>
        </div>

        {/* NÚT ĐỔI GU PHIM & XEM TẤT CẢ PHIM THEO THỂ LOẠI */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end w-full sm:w-auto">
          {activeTab !== "ALL" && activeGenreMeta && (
            <Link
              href={viewAllUrl}
              className="px-2.5 py-1.5 rounded-xl bg-netflix-red/20 border border-netflix-red/40 text-rose-300 hover:bg-netflix-red hover:text-white text-[11.5px] sm:text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả <span className="hidden sm:inline">phim {activeGenreMeta.name}</span></span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("open-user-profile"));
            }}
            className="text-[11.5px] sm:text-xs text-gray-300 hover:text-white flex items-center gap-1 font-semibold transition cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 ml-auto sm:ml-0 flex-shrink-0"
          >
            <span>Đổi gu phim</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* TABS CHỌN THỂ LOẠI NHANH */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 cursor-pointer border ${
            activeTab === "ALL"
              ? "bg-netflix-red text-white border-rose-500 shadow-md shadow-rose-950/50"
              : "bg-zinc-900 text-gray-400 hover:text-white border-white/10 hover:border-white/25"
          }`}
        >
          ✨ Tất Cả Gu ({favoriteGenres.length})
        </button>

        {favoriteGenres.map((g) => {
          const isSelected = activeTab === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setActiveTab(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 cursor-pointer border ${
                isSelected
                  ? "bg-netflix-red text-white border-rose-500 shadow-md shadow-rose-950/50 scale-102"
                  : "bg-zinc-900 text-gray-400 hover:text-white border-white/10 hover:border-white/25"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {/* HORIZONTAL CAROUSEL SLIDER (Gọn gàng 1 hàng mượt mà) */}
      <div className="relative group/carousel">
        {/* NÚT CUỘN TRÁI */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:scale-110 cursor-pointer backdrop-blur-md"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* NÚT CUỘN PHẢI */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:scale-110 cursor-pointer backdrop-blur-md"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {loadingGenre ? (
          <div className="w-full py-12 flex items-center justify-center text-xs text-rose-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Đang tải danh sách phim chuẩn gu...</span>
          </div>
        ) : displayMovies.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="flex items-center gap-3.5 overflow-x-auto py-1 scrollbar-none scroll-smooth"
          >
            {displayMovies.map((movie) => {
              const poster =
                movie.poster_url || movie.poster || movie.thumb_url || "/default-poster.jpg";
              const fullPoster = poster.startsWith("http")
                ? poster
                : `https://phimimg.com/${poster}`;

              return (
                <Link
                  key={movie.slug}
                  href={`/movies/${movie.slug}`}
                  className="group relative flex-shrink-0 w-36 sm:w-44 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 transition-all duration-300 hover:scale-105 hover:border-netflix-red/70 hover:shadow-xl hover:shadow-red-950/50"
                >
                  <div className="aspect-[2/3] w-full overflow-hidden relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fullPoster}
                      alt={movie.name || movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/default-poster.jpg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-85 group-hover:opacity-60 transition-opacity" />

                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-netflix-red text-white text-[9.5px] font-black tracking-wider uppercase shadow-md">
                      Chuẩn Gu
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 space-y-0.5">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                      {movie.name || movie.title}
                    </h4>
                    <p className="text-[10.5px] text-gray-400 truncate">
                      {movie.year ? `${movie.year} • ` : ""}
                      {movie.category?.[0]?.name || "Đặc sắc"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-400">
            Không tìm thấy phim khớp với gu phim đã chọn.
          </div>
        )}
      </div>
    </div>
  );
}

export const PersonalizedGenreSection = React.memo(PersonalizedGenreSectionInner);
export default PersonalizedGenreSection;
