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
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";
import { useCarouselScroll } from "@/components/ui/useCarouselScroll";
import { MovieCardSkeleton } from "@/components/ui/MovieCardSkeleton";

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

const CACHE_KEY_NAME = "nanaflix_foryou_cache_v7";
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 giờ (giảm 85% gọi API Serverless cho người dùng)

// Danh sách fallback catalog siêu phẩm luôn sẵn sàng 0ms không cần API ngoài (16 phim đỉnh cao)
const DEFAULT_CATALOG_FALLBACK: ForYouMovieItem[] = [
  {
    slug: "avatar",
    name: "Avatar",
    title: "Avatar",
    origin_name: "Avatar",
    poster_url: "https://image.tmdb.org/t/p/w500/kyeqWdyUXW608qlYkRqosgbbJyK.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/vL5LR6WdxWPquIkzgSt2Y4WWWaq.jpg",
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
    poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
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
    poster_url: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/hiKmpnnSantftGFKdEgGdYzXmUC.jpg",
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
    poster_url: "https://image.tmdb.org/t/p/w500/vVdVfP9Q3wSkn9p8qZ6fC6Wz8iV.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/77SQqLpW399v3yQ9J6q4yJ6vA0B.jpg",
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
    poster_url: "https://image.tmdb.org/t/p/w500/f2178ad87d967d7199587a82ec1396a8.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/f2178ad87d967d7199587a82ec1396a8.jpg",
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
    poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
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
    poster_url: "https://image.tmdb.org/t/p/w500/393DYSB09pSj4pk9z06pfsu4Pqu.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
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
    poster_url: "https://image.tmdb.org/t/p/w500/wUzkb4097fM0V69w1jP3qV2G3oK.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/1kDYF4295gS9R279F89k8pP4z2m.jpg",
    year: 2004,
    quality: "Full HD",
    category: [{ name: "Hài Hước" }],
    matchPercentage: 96,
    matchReason: "Tuyệt tác hài hành động kinh điển Châu Tinh Trì",
  },
  {
    slug: "oppenheimer",
    name: "Oppenheimer",
    title: "Oppenheimer",
    origin_name: "Oppenheimer",
    poster_url: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
    year: 2023,
    quality: "4K UHD",
    category: [{ name: "Lịch Sử" }],
    matchPercentage: 98,
    matchReason: "Kiệt tác tiểu sử bom nguyên tử đoạt 7 giải Oscar",
  },
  {
    slug: "john-wick-chapter-4",
    name: "Sát Thủ John Wick 4",
    title: "Sát Thủ John Wick 4",
    origin_name: "John Wick: Chapter 4",
    poster_url: "https://image.tmdb.org/t/p/w500/vZloFAK7NKnMGKEslUsZevaRAVm.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/h8gHn0OzBoaefW0z1tGl4grio0z.jpg",
    year: 2023,
    quality: "4K UHD",
    category: [{ name: "Hành Động" }],
    matchPercentage: 99,
    matchReason: "Đỉnh cao hành động võ thuật hiện đại mãn nhãn",
  },
  {
    slug: "your-name",
    name: "Tên Cậu Là Gì?",
    title: "Tên Cậu Là Gì?",
    origin_name: "Your Name",
    poster_url: "https://image.tmdb.org/t/p/w500/q719jXXEzOoYaps6qFsxWa93bu.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/dIWwZW7dJJ1q49RJvT6NWPaevFl.jpg",
    year: 2016,
    quality: "Full HD",
    category: [{ name: "Hoạt Hình" }],
    matchPercentage: 97,
    matchReason: "Siêu phẩm anime lãng mạn rung động triệu trái tim",
  },
  {
    slug: "top-gun-maverick",
    name: "Phi Công Siêu Đẳng: Maverick",
    title: "Phi Công Siêu Đẳng: Maverick",
    origin_name: "Top Gun: Maverick",
    poster_url: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/odJ4hx6g6vBt4lBWKFD1tI8WS4x.jpg",
    year: 2022,
    quality: "4K UHD",
    category: [{ name: "Hành Động" }],
    matchPercentage: 98,
    matchReason: "Bom tấn không chiến đỉnh cao với những cảnh quay thật",
  },
  {
    slug: "avengers-endgame",
    name: "Avengers: Hồi Kết",
    title: "Avengers: Hồi Kết",
    origin_name: "Avengers: Endgame",
    poster_url: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    year: 2019,
    quality: "4K UHD",
    category: [{ name: "Hành Động" }],
    matchPercentage: 99,
    matchReason: "Hồi kết vĩ đại của vũ trụ điện ảnh Marvel",
  },
  {
    slug: "spider-man-across-the-spider-verse",
    name: "Người Nhện: Du Hành Vũ Trụ Nhện",
    title: "Người Nhện: Du Hành Vũ Trụ Nhện",
    origin_name: "Spider-Man: Across the Spider-Verse",
    poster_url: "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
    year: 2023,
    quality: "4K UHD",
    category: [{ name: "Hoạt Hình" }],
    matchPercentage: 98,
    matchReason: "Kiệt tác hoạt hình đột phá thị giác và cốt truyện",
  },
  {
    slug: "squid-game",
    name: "Trò Chơi Con Mực",
    title: "Trò Chơi Con Mực",
    origin_name: "Squid Game",
    poster_url: "https://image.tmdb.org/t/p/w500/dDlG1TzUgtcTqSkgGptH5K98aXl.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/oaGvjB0DvdurWhfPtF7AuMi32bm.jpg",
    year: 2021,
    quality: "4K UHD",
    category: [{ name: "Tâm Lý" }],
    matchPercentage: 96,
    matchReason: "Hiện tượng sinh tồn kịch tính toàn cầu của xứ sở kim chi",
  },
  {
    slug: "one-piece-film-red",
    name: "One Piece Film: Red",
    title: "One Piece Film: Red",
    origin_name: "One Piece Film: Red",
    poster_url: "https://image.tmdb.org/t/p/w500/ogDXpT9O8Z8z5V4k0fHw7R0gH8C.jpg",
    thumb_url: "https://image.tmdb.org/t/p/w780/7k2a2L1Y5vV9Vb3h7Y5X1b3h7Y5.jpg",
    year: 2022,
    quality: "Full HD",
    category: [{ name: "Hoạt Hình" }],
    matchPercentage: 97,
    matchReason: "Bom tấn anime One Piece càn quét mọi phòng vé",
  },
];

// Hàm tính điểm hợp gu ổn định (deterministic) dựa trên slug để tránh lệch SSR/Hydration
function getDeterministicMatchPercentage(key: string): number {
  if (!key) return 96;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return 94 + (Math.abs(hash) % 5); // 94% - 98%
}

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
          ? m.category.map((c: any) => {
              const raw = typeof c === "string" ? c : c?.name || "";
              return { name: formatGenreName(raw) || "Đề Xuất" };
            })
          : typeof m.category === "string"
          ? [{ name: formatGenreName(m.category) || "Đề Xuất" }]
          : [{ name: "Đề Xuất" }],
        matchPercentage: m.matchPercentage || getDeterministicMatchPercentage(m.slug || title),
        matchReason: m.matchReason || "Siêu phẩm thịnh hành được đánh giá cao nhất",
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

// Lấy cache từ memory hoặc localStorage một lần duy nhất (0ms, tránh parse lặp lại)
function getCachedData(expectedUid?: string): CachedPayload | null {
  if (typeof window === "undefined") return null;
  if (memoryCachedData) {
    if (!expectedUid || !memoryCachedData.uid || memoryCachedData.uid === expectedUid) {
      return memoryCachedData;
    }
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY_NAME);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items) && parsed.items.length >= 12) {
      if (expectedUid && parsed.uid && parsed.uid !== expectedUid) {
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

  // Nguồn fallback ưu tiên 2: Catalog từ prop có sẵn
  const catalogFallback = useMemo(() => {
    const mapped = mapToForYouItems(fallbackMovies || []);
    return mapped.length >= 12 ? mapped : DEFAULT_CATALOG_FALLBACK;
  }, [fallbackMovies]);

  // Khởi tạo ngay lập tức không để trống: ưu tiên catalog fallback hoặc default
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

    const watchedTitles = history.map((h) => h.title).filter(Boolean).slice(0, 20);
    const watchedSlugs = history.map((h) => h.slug).filter(Boolean);
    const historyHash = historyItems
      .slice(0, 6)
      .map((h) => `${h.slug}:${Math.round((h.progressSeconds || 0) / 60)}`)
      .join("|");
    const currentFingerprint = `${user?.uid || "guest"}_${genresKey}_${historyHash}_seed${currentSeed}`;

    if (!forceRefresh && inFlightRef.current) return;
    if (!forceRefresh && lastFingerprintRef.current === currentFingerprint && moviesRef.current.length >= 8) return;

    // Kiểm tra cache đã nạp trong memory (Fresh Cache Hit) - Tránh đọc localStorage/JSON.parse lần nữa
    if (!forceRefresh) {
      const cached = getCachedData(user?.uid);
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

    inFlightRef.current = true;
    lastFingerprintRef.current = currentFingerprint;

    // Nếu đã có phim fallback/stale, giữ nguyên hiển thị và chỉ bật trạng thái updating ngầm
    if (moviesRef.current.length === 0) {
      setLoading(true);
    } else {
      setIsUpdating(true);
    }

    try {
      const isGuestUser = !user?.uid && historyItems.length === 0 && favoriteGenres.length === 0;

      const res = isGuestUser
        ? await fetch(`/api/recommendations/for-you?seed=${currentSeed}`)
        : await fetch("/api/recommendations/for-you", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              genres: favoriteGenres,
              historyItems,
              watchedTitles,
              watchedSlugs,
              refreshSeed: currentSeed,
              currentSlugs: forceRefresh ? moviesRef.current.map((m) => m.slug) : [],
            }),
          });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length >= 12) {
          // Cập nhật mượt mà dữ liệu mới
          setMovies(data.items);
          if (data.context) {
            setContextText(data.context);
          }
          // Lưu vào memory cache và localStorage một lần duy nhất
          const payload: CachedPayload = {
            items: data.items,
            context: data.context || "Tuyển chọn chuẩn gu cho bạn",
            timestamp: Date.now(),
            fingerprint: currentFingerprint,
            uid: user?.uid || null,
          };
          memoryCachedData = payload;
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(CACHE_KEY_NAME, JSON.stringify(payload));
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

  const {
    scrollRef: scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    handleScroll,
  } = useCarouselScroll<HTMLDivElement>({
    resetTrigger: movies,
    watchTrigger: movies,
    cardSelector: ".snap-start",
    boundaryThreshold: 8,
  });

  const displayName = profile?.displayName || user?.displayName || "Bạn";

  const normalizedMovies = useMemo(() => {
    return (movies || []).map((m) => {
      const norm = normalizeMovie(m);
      const bestThumb = norm.thumbUrl || norm.imageUrl;
      return { norm, bestThumb };
    });
  }, [movies]);

  return (
    <section className="relative my-8 sm:my-12 select-none">
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
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI / PHẢI: FLOATING GLASS PILL */}
        <CarouselNavButton
          direction="left"
          onClick={() => handleScroll("left")}
          visible={canScrollLeft}
          topOffsetClass="top-[38%]"
        />
        <CarouselNavButton
          direction="right"
          onClick={() => handleScroll("right")}
          visible={canScrollRight}
          topOffsetClass="top-[38%]"
        />

        {/* HORIZONTAL CAROUSEL */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className={`flex items-start gap-3.5 sm:gap-5 overflow-x-auto overflow-y-hidden px-3 sm:px-4 scroll-pl-3 sm:scroll-pl-4 py-3.5 sm:py-4 scrollbar-none snap-x snap-mandatory md:snap-proximity scroll-smooth transition-opacity duration-500 ${
            isUpdating ? "opacity-75" : "opacity-100"
          } [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
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
                  hasTrailer={norm.hasTrailer}
                  trailer_url={norm.trailer_url}
                  isTrailerOnly={norm.isTrailerOnly}
                  matchSnippet={norm.matchSnippet}
                  matchType={norm.matchType}
                  priority={idx < 6}
                />
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

export const ForYouPersonalizedRow = React.memo(ForYouPersonalizedRowInner);
export default ForYouPersonalizedRow;
