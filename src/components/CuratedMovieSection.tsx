"use client";

import React, { useState, useRef, useTransition, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Star,
  Clapperboard,
  Clock,
  ChevronRight,
  Film,
  Loader2,
} from "lucide-react";
import { MediaCard } from "@/components/browse/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";
import { movieApi } from "@/services/movies/service";
import { ScrollFadeContainer } from "@/components/ui/ScrollFadeContainer";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";
import { useCarouselScroll } from "@/components/ui/useCarouselScroll";
import { SectionHeader } from "@/components/ui/SectionHeader";

export type CuratedTabKey = "trending" | "rating" | "theaters" | "latest";

interface CuratedTabConfig {
  id: CuratedTabKey;
  label: string;
  icon: React.ReactNode;
  tag: string;
  subtitle: string;
  fetchParams: {
    sort?: "views" | "rating" | "latest" | "year";
    type?: string;
    limit?: number;
  };
  viewAllHref: string;
}

const CURATED_TABS: CuratedTabConfig[] = [
  {
    id: "trending",
    label: "Thịnh Hành",
    icon: <Flame className="w-4 h-4 text-orange-500 animate-pulse" />,
    tag: "Xem nhiều nhất",
    subtitle: "Các siêu phẩm điện ảnh & phim bộ đang được quan tâm nhất hôm nay",
    fetchParams: { sort: "views", limit: 12 },
    viewAllHref: "/browse?sort=views",
  },
  {
    id: "rating",
    label: "Đánh Giá Cao",
    icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
    tag: "Điểm đánh giá cao",
    subtitle: "Tuyển tập những tác phẩm nghệ thuật đạt điểm đánh giá xuất sắc",
    fetchParams: { sort: "rating", limit: 12 },
    viewAllHref: "/browse?sort=rating",
  },
  {
    id: "theaters",
    label: "Chiếu Rạp",
    icon: <Clapperboard className="w-4 h-4 text-rose-500" />,
    tag: "Bom tấn chiếu rạp",
    subtitle: "Phim chiếu rạp chất lượng cao, hình ảnh & âm thanh sống động",
    fetchParams: { type: "phim-chieu-rap", limit: 12 },
    viewAllHref: "/browse?type=phim-chieu-rap",
  },
  {
    id: "latest",
    label: "Mới Cập Nhật",
    icon: <Clock className="w-4 h-4 text-emerald-400" />,
    tag: "Mới lên sóng",
    subtitle: "Phim mới phát hành và các tập mới nhất vừa được đưa lên hệ thống",
    fetchParams: { sort: "latest", limit: 12 },
    viewAllHref: "/browse?sort=latest",
  },
];

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

  // Cache đệm trong component để chuyển tab tức thì 0ms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheRef = useRef<Record<string, any[]>>({
    trending: initialBatch,
  });

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

  const {
    scrollRef: scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    handleScroll,
  } = useCarouselScroll<HTMLDivElement>({
    resetTrigger: activeTab,
    cardSelector: ".snap-start",
    boundaryThreshold: 8,
  });

  const handleSelectTab = useCallback(
    async (tabId: CuratedTabKey) => {
      if (tabId === activeTab) return;

      const targetConfig = CURATED_TABS.find((t) => t.id === tabId);
      if (!targetConfig) return;

      // 1. Nếu đã có dữ liệu trong cache -> hiển thị tức thì (0ms)
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

      // 2. Nếu chưa có -> fetch ngầm với UI tối ưu
      setActiveTab(tabId);
      setLoading(true);

      try {
        const res = await movieApi.getMovies({
          ...targetConfig.fetchParams,
          page: 1,
        });

        const items = (res?.items || []).slice(0, 12);
        cacheRef.current[tabId] = items;

        startTransition(() => {
          setTabMovies((prev) => ({
            ...prev,
            [tabId]: items,
          }));
        });
      } catch (err) {
        console.error(`Lỗi khi tải tab ${tabId}:`, err);
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  return (
    <section
      className="relative my-8 sm:my-12 select-none w-full"
      aria-label="Tuyển chọn phim Nanaflix"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "auto 440px",
      }}
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
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition hover: active:scale-95 group shrink-0"
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
                className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none shrink-0 border ${
                  isActive
                    ? "bg-netflix-red text-white border-netflix-red shadow-md shadow-black/60 scale-[1.02]"
                    : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white  hover:"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </ScrollFadeContainer>

      {/* HORIZONTAL CAROUSEL */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI / PHẢI: FLOATING GLASS CHUẨN ĐỒNG BỘ */}
        <CarouselNavButton
          direction="left"
          onClick={() => handleScroll("left")}
          visible={canScrollLeft}
          ariaLabel="Cuộn sang trái"
          topOffsetClass="top-[38%]"
        />

        <CarouselNavButton
          direction="right"
          onClick={() => handleScroll("right")}
          visible={canScrollRight}
          ariaLabel="Cuộn sang phải"
          topOffsetClass="top-[38%]"
        />

        {/* TRACK CUỘN NGANG HOẶC SKELETON LOADING (CÓ KHOẢNG ĐỆM TRÊN/DƯỚI/TRÁI/PHẢI CHỐNG OVERFLOW CLIPPING) */}
        {loading ? (
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 overflow-hidden px-3 sm:px-4 py-3.5 sm:py-4">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none w-[140px] sm:w-[175px] md:w-[190px] aspect-[2/3] rounded-xl sm:rounded-2xl bg-zinc-900/80 animate-pulse"
              />
            ))}
          </div>
        ) : normalizedMovies.length > 0 ? (
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-start gap-3 sm:gap-4 md:gap-5 overflow-x-auto overflow-y-hidden px-3 sm:px-4 scroll-pl-3 sm:scroll-pl-4 py-3.5 sm:py-4 scrollbar-none snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
                  priority={idx < 4}
                  isActive={selectedSlug === norm.slug}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center rounded-2xl bg-zinc-900/50 p-6">
            <Film className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">
              Đang cập nhật danh sách phim {currentTabConfig.label}...
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
