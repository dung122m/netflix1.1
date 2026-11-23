"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { getWatchHistory } from "@/lib/watchHistory";
import { normalizeMovie, formatGenreName } from "@/lib/movieMedia";
import MediaCard from "@/components/browse/MediaCard";
import { Tooltip } from "@/components/ui/Tooltip";
import { CarouselContainer } from "@/components/ui/CarouselContainer";
import { MovieCardSkeleton } from "@/components/ui/MovieCardSkeleton";

export interface ForYouMovieItem {
  slug: string;
  name: string;
  title: string;
  origin_name?: string;
  poster_url: string;
  thumb_url?: string;
  tmdbId?: string | number;
  tmdb?: { id?: string | number; type?: string; vote_average?: number; vote_count?: number };
  itemType?: "movie" | "series";
  year?: number | string;
  quality?: string;
  category?: { name: string }[];
  [key: string]: unknown;
}

export interface ForYouPersonalizedRowProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbackMovies?: any[];
}

const CACHE_KEY_NAME = "nanaflix_foryou_cache_v9";
const CACHE_TTL = 30 * 60 * 1000; // 30 phút TTL (người dùng quay lại trang chủ không gọi lại API)

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
        tmdbId: m.tmdbId || m.tmdb?.id || m.movie?.tmdb?.id,
        tmdb: m.tmdb || m.movie?.tmdb,
        itemType: m.itemType || (m.type === "series" || m.type === "hoathinh" || m.type === "tvshows" ? "series" : m.type === "single" ? "movie" : undefined),
        year: m.year,
        quality: m.quality || "Full HD",
        category: Array.isArray(m.category)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? m.category.map((c: any) => {
              const raw = typeof c === "string" ? c : c?.name || "";
              return { name: formatGenreName(raw) || "Đề Xuất" };
            })
          : typeof m.category === "string"
          ? [{ name: formatGenreName(m.category) || "Đề Xuất" }]
          : [{ name: "Đề Xuất" }],
      };
    });
}

interface CachedPayload {
  items: ForYouMovieItem[];
  context?: string;
  fingerprint?: string;
  timestamp: number;
  uid?: string | null;
}

let memoryCachedData: CachedPayload | null = null;

// Lấy cache từ memory, sessionStorage hoặc localStorage (0ms, tránh parse lặp lại)
function getCachedData(expectedUid?: string): CachedPayload | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  if (memoryCachedData) {
    if (!expectedUid || !memoryCachedData.uid || memoryCachedData.uid === expectedUid) {
      if (now - memoryCachedData.timestamp < CACHE_TTL) {
        return memoryCachedData;
      }
    }
  }
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_NAME) || localStorage.getItem(CACHE_KEY_NAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length >= 12) {
      if (expectedUid && parsed.uid && parsed.uid !== expectedUid) {
        return null;
      }
      if (parsed.timestamp && now - parsed.timestamp > CACHE_TTL) {
        return null;
      }
      const sanitizedItems = parsed.items.map((it: ForYouMovieItem) => ({
        ...it,
        category: Array.isArray(it.category)
          ? it.category.map((c) => ({ name: formatGenreName(c?.name) || "Đề Xuất" }))
          : [{ name: "Đề Xuất" }],
      }));
      memoryCachedData = {
        items: sanitizedItems,
        context: parsed.context,
        fingerprint: parsed.fingerprint,
        timestamp: parsed.timestamp || 0,
        uid: parsed.uid,
      };
      return memoryCachedData;
    }
  } catch {}
  return null;
}

function ForYouPersonalizedRowInner({ fallbackMovies }: ForYouPersonalizedRowProps = {}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Nguồn fallback: Catalog từ prop có sẵn (do Server Component truyền vào từ real DB/API)
  const catalogFallback = useMemo(() => {
    return mapToForYouItems(fallbackMovies || []);
  }, [fallbackMovies]);

  // Khởi tạo ngay lập tức không để trống: ưu tiên catalog fallback
  const [movies, setMovies] = useState<ForYouMovieItem[]>(() => {
    return catalogFallback.slice(0, 16);
  });
  const [contextText, setContextText] = useState<string>("Tuyển chọn chuẩn gu cho bạn");
  const [loading, setLoading] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const [refreshCount, setRefreshCount] = useState<number>(0);


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

  // Nạp cache từ memory / localStorage một lần duy nhất khi client mount
  useEffect(() => {
    const cached = getCachedData(user?.uid);
    if (cached && cached.items.length >= 8) {
      setMovies(cached.items);
      if (cached.context) {
        setContextText(cached.context);
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
      episodeName: h.episodeName,
      episodeSlug: h.episodeSlug,
      progressSeconds: h.progressSeconds,
      durationSeconds: h.durationSeconds,
      updatedAt: h.updatedAt,
    }));

    const watchedSlugs = history.map((h) => h.slug).filter(Boolean);

    // Tính Taste Profile Hash (Top 3 thể loại & định dạng) thay vì băm theo danh sách slug phim
    // Giữ cache ổn định khi người dùng xem thêm phim cùng thể loại, triệt tiêu việc gọi lại API Serverless
    const genreFrequency: Record<string, number> = {};
    const typeFrequency: Record<string, number> = {};
    for (const h of historyItems.slice(0, 15)) {
      if (h.category) {
        const cat = String(h.category).toLowerCase().trim();
        genreFrequency[cat] = (genreFrequency[cat] || 0) + 1;
      }
      if (h.type) {
        const typ = String(h.type).toLowerCase().trim();
        typeFrequency[typ] = (typeFrequency[typ] || 0) + 1;
      }
    }
    const topGenres = Object.entries(genreFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([g]) => g)
      .sort()
      .join(",");
    const topTypes = Object.entries(typeFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => t)
      .sort()
      .join(",");

    const tasteProfileHash = `g:${topGenres || "none"}|t:${topTypes || "none"}`;
    const currentFingerprint = `${user?.uid || "guest"}_${genresKey}_${tasteProfileHash}_seed${currentSeed}`;

    if (typeof document !== "undefined" && document.hidden) return;
    if (!forceRefresh && inFlightRef.current) return;
    if (!forceRefresh && lastFingerprintRef.current === currentFingerprint && moviesRef.current.length >= 8) return;

    // Giữ cache tối thiểu 15 phút tại Client cho người dùng đăng nhập trước khi cho phép gọi lại
    const MIN_CLIENT_CACHE_TTL = 15 * 60 * 1000; // 15 phút

    // Kiểm tra cache đã nạp trong memory (Fresh Cache Hit) - Tránh đọc localStorage/JSON.parse lần nữa
    if (!forceRefresh) {
      const cached = getCachedData(user?.uid);
      if (
        cached &&
        (cached.fingerprint === currentFingerprint || Date.now() - cached.timestamp < MIN_CLIENT_CACHE_TTL) &&
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

    inFlightRef.current = true;
    lastFingerprintRef.current = currentFingerprint;

    // Nếu đã có phim fallback/stale, giữ nguyên hiển thị và chỉ bật trạng thái updating ngầm
    if (moviesRef.current.length === 0) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }

    try {
      // Tối ưu hóa: Chuyển sang GET có Edge Cache CDN 1 giờ trên Vercel.
      // Gom toàn bộ thể loại (profile favorite + top history), deduplicate và sort cố định
      const combinedGenres = Array.from(
        new Set([
          ...favoriteGenres.map((g) => g.trim().toLowerCase()),
          ...(topGenres ? topGenres.split(",").map((g) => g.trim().toLowerCase()) : []),
        ])
      )
        .filter(Boolean)
        .sort();

      const params = new URLSearchParams();
      if (combinedGenres.length > 0) {
        params.set("genres", combinedGenres.join(","));
      }
      if (topTypes) {
        params.set("types", topTypes);
      }
      if (currentSeed > 0) {
        params.set("seed", String(currentSeed));
      }

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/recommendations/for-you?${queryString}`
        : `/api/recommendations/for-you?seed=${currentSeed}`;

      const res = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          // Lọc client-side các phim đã xem để Edge CDN cache dùng chung tối đa giữa các user cùng gu
          const watchedSet = new Set((watchedSlugs || []).map((s) => s.toLowerCase().trim()));
          const filtered = data.items.filter(
            (m: ForYouMovieItem) => m?.slug && !watchedSet.has(m.slug.toLowerCase().trim())
          );
          const finalItems = filtered.length >= 8 ? filtered : data.items;

          if (finalItems.length >= 8) {
            // Cập nhật mượt mà dữ liệu mới
            setMovies(finalItems);
            if (data.context) {
              setContextText(data.context);
            }
            // Lưu vào memory cache, sessionStorage và localStorage (TTL 30 phút)
            const payload: CachedPayload = {
              items: finalItems,
              context: data.context || "Tuyển chọn chuẩn gu cho bạn",
              timestamp: Date.now(),
              fingerprint: currentFingerprint,
              uid: user?.uid || null,
            };
            memoryCachedData = payload;
            if (typeof window !== "undefined") {
              try {
                const serialized = JSON.stringify(payload);
                sessionStorage.setItem(CACHE_KEY_NAME, serialized);
                localStorage.setItem(CACHE_KEY_NAME, serialized);
              } catch {}
            }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genresKey, user?.uid, refreshCount]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleRefreshClick = () => {
    const next = refreshCount + 1;
    setRefreshCount(next);
    fetchRecommendations(true, next);
  };

  const displayName = profile?.displayName || user?.displayName || "Bạn";

  const normalizedMovies = useMemo(() => {
    return (movies || []).map((m) => {
      const norm = normalizeMovie(m);
      const bestThumb = norm.thumbUrl || norm.imageUrl;
      return { norm, bestThumb };
    });
  }, [movies]);

  if (!loading && movies.length === 0) {
    return null;
  }

  return (
    <section className="relative select-none">
      {/* HEADER SECTION */}
      <SectionHeader
        title={`Dành Riêng Cho ${user ? displayName : "Bạn"}`}
        subtitle={contextText}
        actions={
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <Tooltip content="Làm mới danh sách gợi ý" side="top">
              <button
                type="button"
                onClick={handleRefreshClick}
                disabled={isUpdating}
                aria-label="Làm mới danh sách gợi ý"
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-md disabled:opacity-75"
              >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || isUpdating ? "animate-spin text-netflix-red" : ""}`} />
              <span>{isUpdating ? "Đang Cập Nhật..." : "Đổi Gợi Ý"}</span>
              </button>
            </Tooltip>
          </div>
        }
      />

      {/* KHUNG CAROUSEL CÓ NÚT ĐIỀU HƯỚNG TRÁI/PHẢI PHỦ MÉP CHUẨN NETFLIX */}
      <CarouselContainer
        resetTrigger={movies}
        watchTrigger={movies}
        cardSelector=".snap-start"
        boundaryThreshold={8}
        navOffsetClass="top-[38%]"
        className={`items-start gap-3.5 sm:gap-5 px-3 sm:px-4 scroll-pl-3 sm:scroll-pl-4 py-3.5 sm:py-4 transition-opacity duration-500 ${
          isUpdating ? "opacity-75" : "opacity-100"
        }`}
      >
        {loading && movies.length === 0
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none w-[140px] sm:w-[175px] md:w-[190px]"
              >
                <MovieCardSkeleton aspect="poster" rounded="xl" />
              </div>
            ))
          : normalizedMovies.map(({ norm, bestThumb }, idx) => (
              <div
                key={norm.slug || idx}
                className="flex-none w-[140px] sm:w-[175px] md:w-[190px] snap-start select-none"
              >
                <MediaCard
                  slug={norm.slug}
                  title={norm.title}
                  origin_name={norm.origin_name}
                  imageUrl={bestThumb}
                  posterUrl={norm.posterUrl}
                  thumbUrl={norm.thumbUrl}
                  tmdbId={norm.tmdbId}
                  genre={norm.genre}
                  description={norm.description}
                  time={norm.time}
                  year={norm.year}
                  rating={norm.score}
                  quality={norm.quality}
                  lang={norm.lang}
                  chieurap={norm.chieurap}
                  sub_docquyen={norm.sub_docquyen}
                  actor={norm.actor}
                  director={norm.director}
                  country={norm.country}
                  type_name={norm.type_name}
                  itemType={norm.itemType}
                  hasTrailer={norm.hasTrailer}
                  trailer_url={norm.trailer_url}
                  isTrailerOnly={norm.isTrailerOnly}
                  matchSnippet={norm.matchSnippet}
                  matchType={norm.matchType}
                  priority={idx < 6}
                />
              </div>
            ))}
      </CarouselContainer>
    </section>
  );
}

export const ForYouPersonalizedRow = React.memo(ForYouPersonalizedRowInner);
export default ForYouPersonalizedRow;
