"use client";

import React, { useState, useRef, useTransition, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Film,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { MediaCard } from "@/components/browse/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";
import { ScrollFadeContainer } from "@/components/ui/ScrollFadeContainer";
import { CarouselContainer } from "@/components/ui/CarouselContainer";
import { MovieCardSkeleton } from "@/components/ui/MovieCardSkeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";

export type CuratedTabKey = "trending" | "rating" | "theaters" | "latest";

interface CuratedTabConfig {
  id: CuratedTabKey;
  label: string;
  tag: string;
  subtitle: string;
  viewAllHref: string;
}

const CURATED_TABS: CuratedTabConfig[] = [
  {
    id: "trending",
    label: "Thịnh Hành",
    tag: "Xem nhiều nhất",
    subtitle: "Phim được khán giả xem nhiều nhất hôm nay",
    viewAllHref: "/browse?sort=views",
  },
  {
    id: "rating",
    label: "Đánh Giá Cao",
    tag: "Đánh giá cao nhất",
    subtitle: "Tuyển chọn phim đạt điểm đánh giá cao từ khán giả và giới phê bình",
    viewAllHref: "/browse?sort=rating",
  },
  {
    id: "theaters",
    label: "Chiếu Rạp",
    tag: "Phim chiếu rạp",
    subtitle: "Phim từng công chiếu tại các cụm rạp",
    viewAllHref: "/browse?type=phim-chieu-rap",
  },
  {
    id: "latest",
    label: "Mới Cập Nhật",
    tag: "Mới lên sóng",
    subtitle: "Phim và tập phim mới cập nhật gần đây",
    viewAllHref: "/browse?sort=latest",
  },
];

const LOCAL_STORAGE_KEY = "nanaflix_curated_movies_v6";
const STORAGE_TTL_MS = 2 * 60 * 60 * 1000; // 2 giờ trong localStorage

interface CuratedMovieSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialMovies: any[];
  initialTotalItems?: number;
  activeSlug?: string;
  selectedSlug?: string;
}

export const CuratedMovieSection: React.FC<CuratedMovieSectionProps> = ({
  initialMovies,
  activeSlug,
  selectedSlug: propSelectedSlug,
}) => {
  const [activeTab, setActiveTab] = useState<CuratedTabKey>("trending");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(
    activeSlug || propSelectedSlug || null
  );

  // Cập nhật selectedSlug nếu prop bên ngoài thay đổi
  useEffect(() => {
    if (activeSlug !== undefined || propSelectedSlug !== undefined) {
      setSelectedSlug(activeSlug || propSelectedSlug || null);
    }
  }, [activeSlug, propSelectedSlug]);

  const initialBatch = (initialMovies || []).slice(0, 12);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tabMovies, setTabMovies] = useState<Record<CuratedTabKey, any[]>>({
    trending: initialBatch,
    rating: [],
    theaters: [],
    latest: [],
  });
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Cache đệm trong RAM component để chuyển tab tức thì 0ms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheRef = useRef<Record<string, any[]>>({
    trending: initialBatch,
  });

  // Lưu trữ an toàn vào localStorage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveToStorage = useCallback((tab: CuratedTabKey, data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          ...prev,
          [tab]: data,
          [`${tab}_ts`]: Date.now(),
        })
      );
    } catch { }
  }, []);

  // Đọc từ localStorage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loadFromStorage = useCallback((tab: CuratedTabKey): any[] | null => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const ts = parsed[`${tab}_ts`];
      if (ts && Date.now() - ts < STORAGE_TTL_MS && Array.isArray(parsed[tab]) && parsed[tab].length > 0) {
        return parsed[tab];
      }
    } catch { }
    return null;
  }, []);

  // 1. Tự động đồng bộ khi SSR prop initialMovies có dữ liệu mới từ Server
  useEffect(() => {
    if (Array.isArray(initialMovies) && initialMovies.length > 0) {
      const batch = initialMovies.slice(0, 12);
      cacheRef.current.trending = batch;
      saveToStorage("trending", batch);
      setTabMovies((prev) => ({ ...prev, trending: batch }));
    }
  }, [initialMovies, saveToStorage]);

  // 2. Tự phục hồi ngay khi mount nếu tab trending bị rỗng (đọc localStorage trước, rồi fetch API)
  useEffect(() => {
    let isMounted = true;
    if ((tabMovies.trending || []).length === 0) {
      // Thử đọc từ localStorage ngay lập tức (0ms)
      const stored = loadFromStorage("trending");
      if (stored && stored.length > 0) {
        cacheRef.current.trending = stored;
        setTabMovies((prev) => ({ ...prev, trending: stored }));
        return;
      }

      // Fetch qua API route nội bộ an toàn (Node runtime, có Edge Cache)
      setLoading(true);
      fetch("/api/movies/curated?tab=trending&limit=12")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isMounted) return;
          const items = Array.isArray(data?.items) ? data.items.slice(0, 12) : [];
          if (items.length > 0) {
            cacheRef.current.trending = items;
            saveToStorage("trending", items);
            setTabMovies((prev) => ({ ...prev, trending: items }));
          }
        })
        .catch((err) => console.warn("[CuratedSection] Khôi phục tab trending thất bại:", err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [tabMovies.trending, loadFromStorage, saveToStorage]);

  // 3. Hàm chuyển tab thông minh với 2 tầng cache (RAM 0ms -> localStorage 0ms -> API fetch)
  const handleSelectTab = useCallback(
    async (tabId: CuratedTabKey) => {
      if (tabId === activeTab) return;

      // Tầng 1: RAM cache tức thì (0ms)
      if (cacheRef.current[tabId] && cacheRef.current[tabId].length > 0) {
        startTransition(() => {
          setActiveTab(tabId);
          setTabMovies((prev) => ({
            ...prev,
            [tabId]: cacheRef.current[tabId],
          }));
        });
        return;
      }

      // Tầng 2: localStorage tức thì (0ms)
      const stored = loadFromStorage(tabId);
      if (stored && stored.length > 0) {
        cacheRef.current[tabId] = stored;
        startTransition(() => {
          setActiveTab(tabId);
          setTabMovies((prev) => ({
            ...prev,
            [tabId]: stored,
          }));
        });
        return;
      }

      // Tầng 3: Fetch API nội bộ (chạy trên server, có CDN Edge Cache)
      setActiveTab(tabId);
      setLoading(true);

      try {
        const res = await fetch(`/api/movies/curated?tab=${tabId}&limit=12`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items.slice(0, 12) : [];

        if (items.length > 0) {
          cacheRef.current[tabId] = items;
          saveToStorage(tabId, items);
          startTransition(() => {
            setTabMovies((prev) => ({
              ...prev,
              [tabId]: items,
            }));
          });
        }
      } catch (err) {
        console.warn(`[CuratedSection] Lỗi khi tải tab ${tabId}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, loadFromStorage, saveToStorage]
  );

  const handleRetry = useCallback(() => {
    setLoading(true);
    fetch(`/api/movies/curated?tab=${activeTab}&limit=12`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items.slice(0, 12) : [];
        if (items.length > 0) {
          cacheRef.current[activeTab] = items;
          saveToStorage(activeTab, items);
          setTabMovies((prev) => ({
            ...prev,
            [activeTab]: items,
          }));
        }
      })
      .catch((err) => console.warn(`[CuratedSection] Retry tab ${activeTab} error:`, err))
      .finally(() => setLoading(false));
  }, [activeTab, saveToStorage]);

  const currentTabConfig =
    CURATED_TABS.find((t) => t.id === activeTab) || CURATED_TABS[0];
  const currentMovies = useMemo(
    () => tabMovies[activeTab] || [],
    [tabMovies, activeTab],
  );

  // Chuẩn hóa movies để truyền an toàn vào MediaCard
  const normalizedMovies = useMemo(() => {
    return (currentMovies || []).map((m) => {
      const norm = normalizeMovie(m);
      const bestThumb = norm.thumbUrl || norm.imageUrl;
      return { norm, bestThumb };
    });
  }, [currentMovies]);

  return (
    <section
      className="relative select-none w-full"
      aria-label="Tuyển chọn phim Nanaflix"
    >
      {/* HEADER SECTION */}
      <SectionHeader
        title="Tuyển Tập Phim Đặc Sắc"
        trailingBadge={
          isPending ? (
            <span className="text-xs text-zinc-400 flex items-center gap-1 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-netflix-red" />
              <span>Đang tải...</span>
            </span>
          ) : undefined
        }
        subtitle={currentTabConfig.subtitle}
        actions={
          <Link
            href={currentTabConfig.viewAllHref}
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition active:scale-95 group shrink-0"
          >
            <span>Xem tất cả {currentTabConfig.label}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-netflix-red" />
          </Link>
        }
      />

      {/* THANH TAB TUYỂN CHỌN ĐA NĂNG */}
      <ScrollFadeContainer
        className="mb-4 sm:mb-6"
        scrollClassName="gap-2 sm:gap-3 py-1 pb-2"
        activeChildTrigger={activeTab}
      >
        <div role="tablist" aria-label="Danh mục tuyển tập phim" className="flex items-center gap-2 sm:gap-3">
          {CURATED_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSelectTab(tab.id)}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none shrink-0 ${
                  isActive
                    ? "bg-netflix-red text-white shadow-md shadow-black/60 scale-[1.02]"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollFadeContainer>

      {/* HORIZONTAL CAROUSEL */}
      {loading ? (
        <div className="flex items-center gap-3 sm:gap-4 md:gap-5 overflow-hidden px-3 sm:px-4 py-3.5 sm:py-4">
          {Array.from({ length: 7 }).map((_, idx) => (
            <div
              key={idx}
              className="flex-none w-[140px] sm:w-[175px] md:w-[190px]"
            >
              <MovieCardSkeleton aspect="poster" rounded="xl" />
            </div>
          ))}
        </div>
      ) : normalizedMovies.length > 0 ? (
        <CarouselContainer
          resetTrigger={activeTab}
          watchTrigger={currentMovies}
          cardSelector=".snap-start"
          boundaryThreshold={8}
          navOffsetClass="top-[38%]"
          leftAriaLabel="Cuộn sang trái"
          rightAriaLabel="Cuộn sang phải"
          className="items-start gap-3 sm:gap-4 md:gap-5 px-3 sm:px-4 scroll-pl-3 sm:scroll-pl-4 py-3.5 sm:py-4"
        >
          {normalizedMovies.map(({ norm, bestThumb }, idx) => (
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
                isActive={selectedSlug === norm.slug}
              />
            </div>
          ))}
        </CarouselContainer>
      ) : (
        <div className="py-10 text-center rounded-2xl bg-zinc-900/40 border border-white/[0.04] p-6 flex flex-col items-center justify-center gap-3">
          <Film className="w-9 h-9 text-zinc-500" />
          <p className="text-zinc-400 text-sm">
            Đang tải danh sách phim {currentTabConfig.label}...
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tải lại</span>
          </button>
        </div>
      )}
    </section>
  );
};
export default CuratedMovieSection;
