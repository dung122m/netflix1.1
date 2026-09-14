"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Sparkles,
  Heart,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ExternalLink,
  Flame,
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

/**
 * Bóc tách tên 1-2 thể loại chính của phim để hiển thị rõ ràng, chuyên nghiệp
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMovieGenres(movie: any, defaultGenreName?: string): string {
  if (!movie) return defaultGenreName || "Phim hay";

  if (Array.isArray(movie.category) && movie.category.length > 0) {
    const names = movie.category
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((c: any) => (typeof c === "string" ? c : c?.name || ""))
      .filter(Boolean);
    if (names.length > 0) {
      return names.slice(0, 2).join(" • ");
    }
  } else if (typeof movie.category === "string" && movie.category.trim()) {
    const parts = movie.category
      .split(/[,/•]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.slice(0, 2).join(" • ");
    }
  }

  if (movie.type_name) return movie.type_name;
  if (defaultGenreName) return defaultGenreName;
  return "Phim hot";
}

/**
 * Từng hàng phim độc lập cho mỗi thể loại yêu thích (Lazy-loaded & Cached)
 */
interface SingleGenreRowProps {
  genreLabel: string;
  meta: GenreMeta;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialMovies?: any[];
}

// Bộ nhớ đệm tĩnh lưu kết quả phim đã fetch theo slug thể loại tránh fetch lặp lại
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const genreMoviesCache: Record<string, any[]> = {};

const SingleGenreRow: React.FC<SingleGenreRowProps> = React.memo(
  ({ genreLabel, meta, initialMovies = [] }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [movies, setMovies] = useState<any[]>(() => {
      if (genreMoviesCache[meta.slug]?.length) {
        return genreMoviesCache[meta.slug];
      }
      // Lọc từ allMovies nếu đã có sẵn
      const matches = initialMovies.filter((movie) => {
        if (!movie) return false;
        const categories = movie.category || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return categories.some(
          (c: any) => c.slug === meta.slug || (c.name || "").includes(meta.name)
        );
      });
      return matches.length >= 6 ? matches : [];
    });

    const [loading, setLoading] = useState<boolean>(movies.length === 0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (movies.length >= 8) return;
      if (genreMoviesCache[meta.slug]?.length) {
        setMovies(genreMoviesCache[meta.slug]);
        setLoading(false);
        return;
      }

      let isMounted = true;
      setLoading(true);

      const fetchCategoryMovies = async () => {
        try {
          const res = await movieApi.getMovies({
            ...(meta.isType ? { type: meta.slug } : { category: meta.slug }),
            limit: 14,
            page: 1,
          });
          if (isMounted && res?.items && res.items.length > 0) {
            genreMoviesCache[meta.slug] = res.items;
            setMovies(res.items);
          }
        } catch (err) {
          console.warn(`Lỗi tải phim hàng thể loại ${meta.name}:`, err);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchCategoryMovies();
      return () => {
        isMounted = false;
      };
    }, [meta, movies.length]);

    const scroll = (direction: "left" | "right") => {
      if (scrollContainerRef.current) {
        const scrollAmount = direction === "left" ? -480 : 480;
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };

    const viewAllUrl = meta.isType
      ? `/browse?type=${meta.slug}`
      : `/browse?category=${meta.slug}`;

    return (
      <div className="w-full space-y-3 pt-2 pb-3">
        {/* HEADER CỦA TỪNG HÀNG THỂ LOẠI */}
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 hover:text-netflix-red transition-colors">
              <span>{genreLabel}</span>
              <span className="text-xs font-normal text-rose-400">· Chuẩn gu</span>
            </h4>
          </div>

          <Link
            href={viewAllUrl}
            className="text-[11px] sm:text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1 transition px-2.5 py-1 rounded-lg hover:bg-white/5 cursor-pointer flex-shrink-0"
          >
            <span>Khám phá thêm</span>
            <ChevronRight className="w-3.5 h-3.5 text-netflix-red" />
          </Link>
        </div>

        {/* CAROUSEL CONTAINER */}
        <div className="relative group/row">
          {/* NÚT CUỘN TRÁI */}
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Cuộn sang trái"
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/85 border border-white/20 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110 cursor-pointer backdrop-blur-md active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* NÚT CUỘN PHẢI */}
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Cuộn sang phải"
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/85 border border-white/20 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all hover:scale-110 cursor-pointer backdrop-blur-md active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {loading && movies.length === 0 ? (
            <div className="w-full py-8 flex items-center justify-center text-xs text-gray-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-netflix-red" />
              <span>Đang tải danh sách phim {meta.name}...</span>
            </div>
          ) : movies.length > 0 ? (
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-3 sm:gap-4 overflow-x-auto py-1.5 px-0.5 scrollbar-none scroll-smooth"
            >
              {movies.map((movie) => {
                const poster =
                  movie.poster_url || movie.poster || movie.thumb_url || "/default-poster.jpg";
                const fullPoster = poster.startsWith("http")
                  ? poster
                  : `https://phimimg.com/${poster}`;

                const genreSnippet = extractMovieGenres(movie, meta.name);

                return (
                  <Link
                    key={movie.slug}
                    href={`/movies/${movie.slug}`}
                    className="group relative flex-shrink-0 w-32 sm:w-40 rounded-xl overflow-hidden border border-white/10 bg-zinc-900 transition-all duration-300 hover:scale-105 hover:border-netflix-red/70 hover:shadow-xl hover:shadow-red-950/40"
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-50 transition-opacity" />

                      {/* BADGE THỂ LOẠI / CHUẨN GU */}
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-netflix-red text-white text-[9px] font-black tracking-wider uppercase shadow-md flex items-center gap-0.5">
                        <Flame size={9} className="fill-white" />
                        <span>{meta.name}</span>
                      </span>

                      {movie.episode_current && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-amber-300 text-[9px] font-bold border border-white/10">
                          {movie.episode_current}
                        </span>
                      )}
                    </div>

                    <div className="p-2 sm:p-2.5 space-y-0.5">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                        {movie.name || movie.title}
                      </h5>
                      <p className="text-[10.5px] text-gray-400 truncate flex items-center gap-1">
                        {movie.year && (
                          <span className="text-zinc-300 font-medium">{movie.year} •</span>
                        )}
                        <span className="text-zinc-400 truncate">{genreSnippet}</span>
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-gray-500">
              Đang cập nhật thêm phim cho thể loại này.
            </div>
          )}
        </div>
      </div>
    );
  }
);

SingleGenreRow.displayName = "SingleGenreRow";

/**
 * Khung chứa chính: Hiển thị tối đa 5 hàng thể loại yêu thích (Netflix Style)
 */
function PersonalizedGenreSectionInner({ allMovies = [] }: PersonalizedGenreSectionProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

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

  const favoriteGenres = React.useMemo(() => {
    const list = profile?.favoriteGenres || [];
    // Giới hạn tối đa 5 hàng cho 5 thể loại yêu thích
    return list.slice(0, 5);
  }, [profile?.favoriteGenres]);

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
              Chọn các thể loại khoái khẩu trong Hồ sơ để Nanaflix tự động xếp các hàng phim theo đúng sở thích của bạn!
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

  return (
    <div className="w-full my-6 sm:my-8 space-y-4 bg-gradient-to-b from-zinc-950/90 via-zinc-950/60 to-transparent p-4 sm:p-6 rounded-3xl border border-white/10 shadow-2xl">
      {/* HEADER SECTION TỔNG QUAN */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-rose-600/30 to-amber-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Tuyển Tập Phim Đúng Gu Của Bạn</span>
            </h3>
            <p className="text-xs text-gray-400">
              Tự động phân loại thành {favoriteGenres.length} hàng phim theo các thể loại bạn quan tâm nhất
            </p>
          </div>
        </div>

        {/* NÚT ĐỔI GU PHIM */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-user-profile"));
          }}
          className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5 font-semibold transition cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 flex-shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-netflix-red" />
          <span>Đổi gu phim</span>
        </button>
      </div>

      {/* HIỂN THỊ TỐI ĐA 5 HÀNG THỂ LOẠI (NETFLIX MULTI-ROW STYLE) */}
      <div className="space-y-4 divide-y divide-white/5">
        {favoriteGenres.map((genreLabel) => {
          const meta = GENRE_MAP[genreLabel] || {
            slug: genreLabel.replace(/^[^\w\s]+/g, "").trim().toLowerCase(),
            name: genreLabel.replace(/^[^\w\s]+/g, "").trim(),
          };

          return (
            <SingleGenreRow
              key={genreLabel}
              genreLabel={genreLabel}
              meta={meta}
              initialMovies={allMovies}
            />
          );
        })}
      </div>
    </div>
  );
}

export const PersonalizedGenreSection = React.memo(PersonalizedGenreSectionInner);
export default PersonalizedGenreSection;
