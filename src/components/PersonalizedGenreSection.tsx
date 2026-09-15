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
  Play,
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
  "🎨 Hoạt Hình / Anime": { slug: "hoat-hinh", isType: true, name: "Hoạt Hình & Anime" },
  "🤣 Hài Hước": { slug: "hai-huoc", name: "Hài Hước" },
  "🏯 Cổ Trang": { slug: "co-trang", name: "Cổ Trang" },
  "🕵️ Trinh Thám": { slug: "trinh-tham", name: "Trinh Thám" },
  "🍿 Chiếu Rạp": { slug: "phim-chieu-rap", isType: true, name: "Phim Chiếu Rạp" },
  "📺 Phim Bộ": { slug: "phim-bo", isType: true, name: "Phim Bộ" },
  "🎪 TV Shows": { slug: "tv-shows", isType: true, name: "TV Shows" },
  "🥋 Võ Thuật": { slug: "vo-thuat", name: "Võ Thuật" },
  "🎭 Tâm Lý": { slug: "tam-ly", name: "Tâm Lý" },
};

export function toSlug(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getGenreEmoji(slug: string): string {
  if (slug === "hanh-dong") return "💥";
  if (slug === "tinh-cam") return "💖";
  if (slug === "kinh-di") return "👻";
  if (slug === "vien-tuong") return "🛸";
  if (slug === "hoat-hinh") return "🎨";
  if (slug === "hai-huoc") return "🤣";
  if (slug === "co-trang") return "🏯";
  if (slug === "trinh-tham") return "🕵️";
  if (slug === "phim-chieu-rap") return "🍿";
  if (slug === "phim-bo") return "📺";
  if (slug === "tv-shows") return "🎪";
  if (slug === "vo-thuat") return "🥋";
  if (slug === "tam-ly") return "🎭";
  return "🎬";
}

export function resolveGenreMeta(genreLabel: string): GenreMeta {
  if (GENRE_MAP[genreLabel]) {
    return GENRE_MAP[genreLabel];
  }

  // Chuẩn hóa tên (bỏ emoji nếu có)
  const cleanName = genreLabel.replace(/^[^\w\s\u00C0-\u1EF9]+/gu, "").trim();
  const rawSlug = toSlug(cleanName || genreLabel);

  // Tra cứu theo tên sạch trong GENRE_MAP
  for (const [key, val] of Object.entries(GENRE_MAP)) {
    const keyClean = key.replace(/^[^\w\s\u00C0-\u1EF9]+/gu, "").trim().toLowerCase();
    if (
      keyClean === cleanName.toLowerCase() ||
      val.name.toLowerCase() === cleanName.toLowerCase() ||
      val.slug === rawSlug
    ) {
      return val;
    }
  }

  // Các trường hợp nhận diện thông minh
  if (rawSlug.includes("tinh-cam") || rawSlug.includes("lang-man")) {
    return { slug: "tinh-cam", name: "Tình Cảm" };
  }
  if (rawSlug.includes("hanh-dong")) {
    return { slug: "hanh-dong", name: "Hành Động" };
  }
  if (rawSlug.includes("kinh-di")) {
    return { slug: "kinh-di", name: "Kinh Dị" };
  }
  if (rawSlug.includes("vien-tuong")) {
    return { slug: "vien-tuong", name: "Viễn Tưởng" };
  }
  if (rawSlug.includes("hoat-hinh") || rawSlug.includes("anime")) {
    return { slug: "hoat-hinh", isType: true, name: "Hoạt Hình & Anime" };
  }
  if (rawSlug.includes("hai-huoc") || rawSlug.includes("hai")) {
    return { slug: "hai-huoc", name: "Hài Hước" };
  }
  if (rawSlug.includes("co-trang")) {
    return { slug: "co-trang", name: "Cổ Trang" };
  }
  if (rawSlug.includes("trinh-tham") || rawSlug.includes("hinh-su")) {
    return { slug: "trinh-tham", name: "Trinh Thám" };
  }
  if (rawSlug.includes("chieu-rap")) {
    return { slug: "phim-chieu-rap", isType: true, name: "Phim Chiếu Rạp" };
  }
  if (rawSlug.includes("phim-bo")) {
    return { slug: "phim-bo", isType: true, name: "Phim Bộ" };
  }
  if (rawSlug.includes("tv-show")) {
    return { slug: "tv-shows", isType: true, name: "TV Shows" };
  }
  if (rawSlug.includes("vo-thuat") || rawSlug.includes("kiem-hiep")) {
    return { slug: "vo-thuat", name: "Võ Thuật" };
  }
  if (rawSlug.includes("tam-ly")) {
    return { slug: "tam-ly", name: "Tâm Lý" };
  }

  return {
    slug: rawSlug || "tinh-cam",
    name: cleanName || "Tình Cảm",
  };
}

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
      const matches = (initialMovies || []).filter((movie) => {
        if (!movie) return false;
        const categories = movie.category || [];
        const catList = Array.isArray(categories) ? categories : [categories];
        return catList.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => {
            const s = (typeof c === "string" ? c : c?.slug || c?.name || "").toLowerCase();
            return s.includes(meta.slug) || s.includes(meta.name.toLowerCase());
          }
        );
      });
      return matches.length >= 6 ? matches : [];
    });

    const [loading, setLoading] = useState<boolean>(movies.length === 0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (genreMoviesCache[meta.slug]?.length >= 6) {
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
            limit: 18,
            page: 1,
          });
          if (isMounted) {
            const list = res?.items || [];
            if (list.length > 0) {
              genreMoviesCache[meta.slug] = list;
              setMovies(list);
            }
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
    }, [meta.slug, meta.isType, meta.name]);

    const scroll = (direction: "left" | "right") => {
      if (scrollContainerRef.current) {
        const scrollAmount = direction === "left" ? -500 : 500;
        scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };

    const viewAllUrl = meta.isType
      ? `/browse?type=${meta.slug}`
      : `/browse?category=${meta.slug}`;

    return (
      <div className="w-full space-y-3.5 pt-3 pb-4">
        {/* HEADER CỦA TỪNG HÀNG THỂ LOẠI */}
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2 tracking-tight group cursor-pointer">
              <span className="group-hover:text-rose-400 transition-colors">{genreLabel}</span>
            </h4>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500 animate-pulse" />
              <span>Chuẩn gu</span>
            </span>
          </div>

          <Link
            href={viewAllUrl}
            className="text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 cursor-pointer flex-shrink-0 group/link shadow-sm"
          >
            <span>Khám phá thêm</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* CAROUSEL CONTAINER */}
        <div className="relative group/row">
          {/* NÚT CUỘN TRÁI */}
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Cuộn sang trái"
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-950/90 hover:bg-red-600 border border-white/20 hover:border-red-500 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-xl active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* NÚT CUỘN PHẢI */}
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Cuộn sang phải"
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-zinc-950/90 hover:bg-red-600 border border-white/20 hover:border-red-500 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-xl active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {loading && movies.length === 0 ? (
            <div className="w-full py-12 flex items-center justify-center text-xs text-gray-400 gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-netflix-red" />
              <span>Đang tải danh sách phim {meta.name}...</span>
            </div>
          ) : movies.length > 0 ? (
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto py-2 px-1 scrollbar-none scroll-smooth"
            >
              {movies.map((movie) => {
                const poster =
                  movie.poster_url || movie.poster || movie.thumb_url || "/default-poster.jpg";
                const fullPoster = poster.startsWith("http")
                  ? poster
                  : `https://phimimg.com/${poster}`;

                const genreSnippet = extractMovieGenres(movie, meta.name);
                const quality = movie.quality || "FHD";

                return (
                  <Link
                    key={movie.slug}
                    href={`/movies/${movie.slug}`}
                    className="group relative flex-shrink-0 w-36 sm:w-44 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/90 transition-all duration-300 hover:-translate-y-1.5 hover:border-red-500/50 hover:shadow-[0_14px_30px_-6px_rgba(229,9,20,0.35)]"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden relative bg-zinc-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fullPoster}
                        alt={movie.name || movie.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "/default-poster.jpg";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-300" />

                      {/* BADGE CHẤT LƯỢNG CAO CẤP */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-black tracking-wider text-white border border-white/15 shadow-md uppercase">
                          {quality}
                        </span>
                      </div>

                      {/* NÚT PLAY NHẸ NHÀNG TRÊN HOVER */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                        <div className="w-11 h-11 rounded-full bg-netflix-red/90 text-white flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300 backdrop-blur-sm border border-white/20">
                          <Play className="w-5 h-5 fill-white ml-0.5" />
                        </div>
                      </div>

                      {/* BADGE TẬP PHIM / TRẠNG THÁI */}
                      {movie.episode_current && (
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-amber-300 text-[10px] font-extrabold border border-amber-400/20 shadow-lg">
                          {movie.episode_current}
                        </span>
                      )}
                    </div>

                    <div className="p-2.5 sm:p-3 space-y-1 bg-gradient-to-b from-zinc-900/90 to-zinc-950">
                      <h5 className="text-xs sm:text-[13px] font-bold text-white truncate group-hover:text-rose-400 transition-colors">
                        {movie.name || movie.title}
                      </h5>
                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5">
                        {movie.year && (
                          <span className="text-zinc-300 font-medium">{movie.year}</span>
                        )}
                        {movie.year && <span className="text-zinc-600">•</span>}
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
    <div className="relative w-full my-6 sm:my-8 space-y-6 bg-gradient-to-b from-zinc-900/70 via-zinc-950/85 to-black p-4 sm:p-6 md:p-7 rounded-3xl border border-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden">
      {/* Hiệu ứng ánh sáng nền ambient */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none -z-0" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-[90px] pointer-events-none -z-0" />

      {/* HEADER SECTION TỔNG QUAN */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-rose-600/25 via-red-500/20 to-amber-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-lg flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-xl font-black text-white flex items-center gap-2 tracking-tight">
              <span>Tuyển Tập Phim Đúng Gu Của Bạn</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Được tuyển chọn tự động thành {favoriteGenres.length} hàng phim theo các thể loại bạn quan tâm nhất
            </p>
          </div>
        </div>

        {/* NÚT ĐỔI GU PHIM */}
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-user-profile"));
          }}
          className="text-xs text-white hover:text-white flex items-center gap-2 font-bold transition-all cursor-pointer bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-xl border border-white/15 hover:border-white/25 flex-shrink-0 self-start sm:self-auto shadow-md active:scale-95"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
          <span>Tùy chỉnh gu phim</span>
        </button>
      </div>

      {/* HIỂN THỊ TỐI ĐA 5 HÀNG THỂ LOẠI (NETFLIX MULTI-ROW STYLE) */}
      <div className="space-y-4 divide-y divide-white/5">
        {favoriteGenres.map((genreLabel) => {
          const meta = resolveGenreMeta(genreLabel);
          const emoji = getGenreEmoji(meta.slug);
          const displayLabel =
            genreLabel.startsWith("💥") ||
            genreLabel.startsWith("💖") ||
            genreLabel.startsWith("👻") ||
            genreLabel.startsWith("🛸") ||
            genreLabel.startsWith("🎨") ||
            genreLabel.startsWith("🤣") ||
            genreLabel.startsWith("🏯") ||
            genreLabel.startsWith("🕵️") ||
            genreLabel.startsWith("🍿") ||
            genreLabel.startsWith("📺") ||
            genreLabel.startsWith("🎪") ||
            genreLabel.startsWith("🥋") ||
            genreLabel.startsWith("🎭")
              ? genreLabel
              : `${emoji} ${meta.name}`;

          return (
            <SingleGenreRow
              key={genreLabel}
              genreLabel={displayLabel}
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
