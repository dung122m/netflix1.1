"use client";

import React, { useState, useRef, useTransition, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  Star,
  Clapperboard,
  Clock,
  Sparkles,
  ChevronRight,
  Film,
  Loader2,
} from "lucide-react";
import { MediaCard } from "@/components/browse/MediaCard";
import { normalizeMovie } from "@/lib/movieMedia";
import { movieApi } from "@/services/movieApi";
import { ScrollFadeContainer } from "@/components/ui/ScrollFadeContainer";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";

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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 15);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
    }
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const cardEl = scrollContainerRef.current.querySelector<HTMLElement>(".snap-start");
      const step = cardEl
        ? (cardEl.offsetWidth + 16) * Math.max(1, Math.floor(scrollContainerRef.current.clientWidth / (cardEl.offsetWidth + 16)))
        : scrollContainerRef.current.clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -step : step,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 350);
    }
  };

  // Reset cuộn về đầu hàng khi đổi tab
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
    checkScroll();
  }, [activeTab, currentMovies, checkScroll]);

  // Lắng nghe thay đổi kích thước cửa sổ
  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5 px-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-netflix-red/15 text-zinc-200 border border-netflix-red/30">
              <Sparkles className="w-3.5 h-3.5 text-netflix-red" />
              <span>{currentTabConfig.tag}</span>
            </span>
            {isPending && (
              <span className="text-xs text-gray-400 flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3 animate-spin text-netflix-red" />
                Đang chuyển...
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>Tuyển Tập Phim Đặc Sắc</span>
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
            {currentTabConfig.subtitle}
          </p>
        </div>

        {/* NÚT XEM TOÀN BỘ Ở HEADER */}
        <Link
          href={currentTabConfig.viewAllHref}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition border border-white/10 active:scale-95 group shrink-0"
        >
          <span>Xem tất cả {currentTabConfig.label}</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-netflix-red" />
        </Link>
      </div>

      {/* THANH TAB TUYỂN CHỌN ĐA NĂNG */}
      <ScrollFadeContainer
        className="mb-4 sm:mb-6"
        scrollClassName="gap-2 sm:gap-3 py-1 pb-2"
        activeChildTrigger={activeTab}
      >
        {CURATED_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none shrink-0 border ${
                isActive
                  ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-[var(--accent-glow,rgba(229,9,20,0.4))] scale-[1.02]"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10 hover:border-white/20"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </ScrollFadeContainer>

      {/* HORIZONTAL CAROUSEL */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI / PHẢI: FLOATING GLASS PILL CHUẨN */}
        {canScrollLeft && (
          <CarouselNavButton
            direction="left"
            onClick={() => handleScroll("left")}
            ariaLabel="Cuộn sang trái"
            topOffsetClass="top-[38%]"
          />
        )}

        {canScrollRight && (
          <CarouselNavButton
            direction="right"
            onClick={() => handleScroll("right")}
            ariaLabel="Cuộn sang phải"
            topOffsetClass="top-[38%]"
          />
        )}

        {/* TRACK CUỘN NGANG HOẶC SKELETON LOADING (CÓ KHOẢNG ĐỆM TRÊN/DƯỚI/TRÁI/PHẢI CHỐNG OVERFLOW CLIPPING) */}
        {loading ? (
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5 overflow-hidden px-3 sm:px-4 py-3.5 sm:py-4">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none w-[140px] sm:w-[175px] md:w-[190px] aspect-[2/3] rounded-xl sm:rounded-2xl bg-zinc-900/80 animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : normalizedMovies.length > 0 ? (
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex items-start gap-3 sm:gap-4 md:gap-5 overflow-x-auto overflow-y-hidden px-3 sm:px-4 py-3.5 sm:py-4 scrollbar-none snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
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
          <div className="py-12 text-center rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
            <Film className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              Đang cập nhật danh sách phim {currentTabConfig.label}...
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
