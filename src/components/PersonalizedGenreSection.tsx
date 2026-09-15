"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Heart,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Star,
  Play,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { movieApi } from "@/services/movieApi";
import { normalizeMovie } from "@/lib/movieMedia";

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

/**
 * Card phim dạng ngang (16:9) cao cấp cho từng hàng thể loại
 * Không phát trailer khi hover để đảm bảo mượt mà 100%, không bị vỡ layout cuộn ngang
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GenreLandscapeCard({ movie, defaultGenre }: { movie: any; defaultGenre?: string }) {
  const router = useRouter();
  const norm = normalizeMovie(movie);
  const {
    slug,
    title,
    year,
    time,
    quality,
    lang,
    chieurap,
    sub_docquyen,
    type_name,
    score,
    thumbUrl,
    imageUrl,
    posterUrl,
  } = norm;

  const rating = score && score !== "N/A" && Number(score) > 0 ? score : null;
  const [isLoaded, setIsLoaded] = useState(false);

  // Danh sách ảnh ưu tiên cho khung hình 16:9
  const candidateImages = React.useMemo(() => {
    const list: string[] = [];
    if (thumbUrl) list.push(thumbUrl);
    if (imageUrl && !list.includes(imageUrl)) list.push(imageUrl);
    if (posterUrl && !list.includes(posterUrl)) list.push(posterUrl);
    return list.filter(
      (u) =>
        Boolean(u) &&
        !u.includes("/undefined") &&
        !u.includes("/null") &&
        !u.startsWith("/default-")
    );
  }, [thumbUrl, imageUrl, posterUrl]);

  const [attemptIndex, setAttemptIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(
    candidateImages[0] || thumbUrl || imageUrl || posterUrl || "/default-poster.svg"
  );

  React.useEffect(() => {
    setAttemptIndex(0);
    setCurrentSrc(candidateImages[0] || thumbUrl || imageUrl || posterUrl || "/default-poster.svg");
  }, [candidateImages, thumbUrl, imageUrl, posterUrl]);

  const handleImageError = () => {
    if (currentSrc.includes("image.tmdb.org")) {
      const match = currentSrc.match(/\/w500\/([a-zA-Z0-9_-]{20,}\.(?:jpg|jpeg|png|webp))/i);
      if (match) {
        setCurrentSrc(`https://vsmov.com/storage/images/${match[1]}`);
        return;
      }
    }
    const nextIdx = attemptIndex + 1;
    if (nextIdx < candidateImages.length) {
      setAttemptIndex(nextIdx);
      setCurrentSrc(candidateImages[nextIdx]);
      return;
    }
    if (currentSrc !== "/default-poster.svg") {
      setCurrentSrc("/default-poster.svg");
      setIsLoaded(true);
    }
  };

  const handleMouseEnter = () => {
    if (slug) {
      router.prefetch(`/movies/${slug}`);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/90 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30 hover:shadow-[0_16px_36px_-8px_rgba(0,0,0,0.95)] select-none"
    >
      <Link
        href={`/movies/${slug}`}
        aria-label={`Xem phim ${title}`}
        className="absolute inset-0 z-30"
      />

      {/* Ảnh backdrop 16:9 với hiệu ứng zoom nhẹ khi hover */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={currentSrc}
          alt={title}
          fill
          sizes="(max-width: 640px) 260px, (max-width: 1024px) 300px, 320px"
          className={`object-cover object-center transition-all duration-500 group-hover:scale-105 ${
            isLoaded ? "opacity-100" : "opacity-0 scale-102"
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={handleImageError}
        />
      </div>

      {/* Placeholder shimmer khi ảnh chưa tải */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 z-0 animate-pulse" />
      )}

      {/* Gradient phủ tối dần về phía chân để nổi bật text */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />

      {/* 1. GÓC TRÊN TRÁI: BADGE LOẠI PHIM */}
      <div className="absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5 flex-wrap max-w-[70%]">
        {chieurap ? (
          <div className="flex items-center gap-1 bg-gradient-to-r from-amber-600 to-orange-500 text-white font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-amber-400/40">
            <span>🎬 Rạp</span>
          </div>
        ) : sub_docquyen ? (
          <div className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-purple-400/40">
            <span>💎 Độc Quyền</span>
          </div>
        ) : type_name === "Phim bộ" ? (
          <div className="flex items-center gap-1 bg-blue-600/90 text-white font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-blue-400/40">
            <span>📺 Bộ</span>
          </div>
        ) : type_name === "Hoạt hình" ? (
          <div className="flex items-center gap-1 bg-pink-600/90 text-white font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-pink-400/40">
            <span>✨ Hoạt Hình</span>
          </div>
        ) : type_name === "TV Shows" ? (
          <div className="flex items-center gap-1 bg-emerald-600/90 text-white font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider backdrop-blur-md shadow-md border border-emerald-400/40">
            <span>🎙️ Show</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-black/60 text-gray-200 font-bold px-2 py-0.5 rounded-md text-[10px] backdrop-blur-md border border-white/15">
            <span>{defaultGenre || "Phim Lẻ"}</span>
          </div>
        )}
      </div>

      {/* 2. GÓC TRÊN PHẢI: SAO ĐÁNH GIÁ & CHẤT LƯỢNG */}
      <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5">
        {rating && (
          <div className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-black/80 px-2 py-0.5 text-[10.5px] font-black text-amber-300 backdrop-blur-md shadow-sm">
            <Star size={10.5} className="fill-amber-400 text-amber-400" />
            <span>{rating}</span>
          </div>
        )}
        <div className="inline-flex items-center rounded-md border border-white/20 bg-black/70 px-1.5 py-0.5 text-[10px] font-extrabold text-white backdrop-blur-md">
          <span>{quality || "FHD"}</span>
        </div>
      </div>

      {/* 3. NÚT PLAY TRUNG TÂM (HIỆN LÊN MƯỢT KHI HOVER) */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_0_20px_rgba(229,9,20,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
          <Play size={18} className="fill-white ml-0.5" />
        </div>
      </div>

      {/* 4. CHÂN CARD: TIÊU ĐỀ & THÔNG SỐ */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-3 pointer-events-none space-y-1">
        <h4 className="text-white font-black text-xs sm:text-[13px] leading-snug line-clamp-1 drop-shadow-md group-hover:text-red-400 transition-colors">
          {title}
        </h4>

        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-gray-300 flex-wrap">
          {year && <span className="font-semibold text-gray-200">{year}</span>}
          {time && (
            <>
              <span className="text-white/30">•</span>
              <span className="truncate max-w-[90px]">{time}</span>
            </>
          )}
          {lang && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-rose-400 font-bold">{lang}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const SingleGenreRow: React.FC<SingleGenreRowProps> = React.memo(
  ({ genreLabel, meta, initialMovies = [] }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [movies, setMovies] = useState<any[]>(() => {
      if (genreMoviesCache[meta.slug]?.length) {
        return genreMoviesCache[meta.slug];
      }
      // Lấy ngay các phim khớp từ allMovies nếu đã có sẵn (0ms)
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
      return matches.length > 0 ? matches : [];
    });

    const [loading, setLoading] = useState<boolean>(movies.length < 6);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (genreMoviesCache[meta.slug]?.length >= 6) {
        setMovies(genreMoviesCache[meta.slug]);
        setLoading(false);
        return;
      }

      let isMounted = true;

      const fetchCategoryMovies = async () => {
        try {
          const endpoint = meta.isType
            ? `/api/category-movies?type=${encodeURIComponent(meta.slug)}&limit=18`
            : `/api/category-movies?category=${encodeURIComponent(meta.slug)}&limit=18`;

          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            const list = data?.items || [];
            if (isMounted && list.length > 0) {
              genreMoviesCache[meta.slug] = list;
              setMovies(list);
            }
          } else {
            // Fallback trực tiếp
            const fallbackRes = await movieApi.getMovies({
              ...(meta.isType ? { type: meta.slug } : { category: meta.slug }),
              limit: 18,
              page: 1,
            });
            if (isMounted) {
              const list = fallbackRes?.items || [];
              if (list.length > 0) {
                genreMoviesCache[meta.slug] = list;
                setMovies(list);
              }
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
            /* SHIMMER SKELETON CAROUSEL MƯỢT MÀ */
            <div className="flex gap-4 overflow-hidden py-3 px-1">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-[260px] sm:w-[300px] md:w-[320px] aspect-[16/9] flex-none rounded-2xl bg-zinc-900/90 animate-pulse border border-white/5 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                </div>
              ))}
            </div>
          ) : movies.length > 0 ? (
            <div
              ref={scrollContainerRef}
              data-lenis-prevent
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth py-3 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {movies.map((movie, index) => {
                const norm = normalizeMovie(movie);
                return (
                  <div key={norm.slug || index} className="w-[260px] sm:w-[300px] md:w-[320px] flex-none">
                    <GenreLandscapeCard movie={movie} defaultGenre={meta.name} />
                  </div>
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
