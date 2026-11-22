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
  tmdbId?: string | number;
  tmdb?: { id?: string | number; type?: string; vote_average?: number; vote_count?: number };
  itemType?: "movie" | "series";
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

const CACHE_KEY_NAME = "nanaflix_foryou_cache_v9";
const CACHE_TTL = 30 * 60 * 1000; // 30 phút TTL (người dùng quay lại trang chủ không gọi lại API)

// Danh sách fallback catalog phim nổi bật luôn sẵn sàng 0ms không cần API ngoài
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
    matchReason: "Tác phẩm viễn tưởng đoạt 3 giải Oscar của James Cameron",
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
    matchReason: "Phim khoa học viễn tưởng kinh điển của Christopher Nolan",
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
    matchReason: "Tác phẩm đoạt 4 giải Oscar của đạo diễn Bong Joon-ho",
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
    matchReason: "Phim kinh dị sinh tồn ăn khách của Hàn Quốc",
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
    matchReason: "Tác phẩm võ thuật Vịnh Xuân Quyền kinh điển của Chân Tử Đan",
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
    matchReason: "Phim siêu anh hùng kinh điển nằm trong Top IMDb 250",
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
    matchReason: "Phim hoạt hình Ghibli đoạt giải Oscar của Hayao Miyazaki",
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
    matchReason: "Phim hài hành động đặc sắc của Châu Tinh Trì",
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
    matchReason: "Phim tiểu sử lịch sử đoạt 7 giải Oscar của Christopher Nolan",
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
    matchReason: "Phim hành động kịch tính với các cảnh đấu võ cận chiến",
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
    matchReason: "Phim hoạt hình anime nổi tiếng của đạo diễn Makoto Shinkai",
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
    matchReason: "Phim hành động không chiến đoạt giải Oscar với Tom Cruise",
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
    matchReason: "Phần phim khép lại kỷ nguyên Infinity Saga của Marvel",
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
    matchReason: "Phim hoạt hình đoạt nhiều giải thưởng với phong cách hình ảnh đột phá",
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
    matchReason: "Phim bộ kinh dị sinh tồn ăn khách toàn cầu của Hàn Quốc",
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
    matchReason: "Phim hoạt hình chiếu rạp ăn khách thuộc thương hiệu One Piece",
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
        </div>
      </div>
    </section>
  );
}

export const ForYouPersonalizedRow = React.memo(ForYouPersonalizedRowInner);
export default ForYouPersonalizedRow;
