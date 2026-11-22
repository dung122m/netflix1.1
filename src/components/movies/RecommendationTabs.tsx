"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Shuffle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ScrollFadeContainer } from "@/components/ui/ScrollFadeContainer";
import { extractMovieRatingScore } from "@/lib/movieMedia";
import { toast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  RecommendedMovieCard,
  RecommendedMovieItem,
} from "./RecommendedMovieCard";
import { RecommendedSidebarCard } from "./RecommendedSidebarCard";

export type { RecommendedMovieItem };

export interface RecommendationTabsProps {
  currentMovieTitle?: string;
  genreName?: string;
  countryName?: string;
  actorName?: string;
  directorName?: string;
  genreMovies: RecommendedMovieItem[];
  countryMovies: RecommendedMovieItem[];
  actorMovies?: RecommendedMovieItem[];
  directorMovies?: RecommendedMovieItem[];
  allMovies: RecommendedMovieItem[];
  variant?: "grid" | "sidebar";
}

type TabKey = "best" | "genre" | "country" | "actor" | "director" | "top";

interface TabConfig {
  key: TabKey;
  label: string;
  count: number;
}

/**
 * Helper xác định nhãn thể loại tối ưu theo ngữ cảnh:
 * - Khi đang ở tab Thể loại (ví dụ "Kinh Dị") và phim có chứa thể loại đó -> ƯU TIÊN hiển thị đúng thể loại của tab.
 * - Khi ở các tab khác hoặc phim không có thể loại đó -> Hiển thị thể loại đầu tiên thực tế của phim.
 */
function resolveDisplayCategory(
  item: RecommendedMovieItem,
  activeTab: string,
  targetGenreName?: string
): string | undefined {
  if (!item.category || item.category.length === 0) return undefined;

  if (activeTab === "genre" && targetGenreName) {
    const normTarget = targetGenreName.toLowerCase().trim();
    const matched = item.category.find(
      (c) => c?.name && c.name.toLowerCase().trim() === normTarget
    );
    if (matched?.name) return matched.name;
  }

  return item.category[0]?.name;
}

export function RecommendationTabs({
  currentMovieTitle,
  genreName,
  countryName,
  actorName,
  directorName,
  genreMovies = [],
  countryMovies = [],
  actorMovies = [],
  directorMovies = [],
  allMovies = [],
  variant = "grid",
}: RecommendationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("best");
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [visibleLimit, setVisibleLimit] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Lọc phim theo diễn viên loại bỏ phim hiện tại
  const validActorMovies = useMemo(() => {
    return (actorMovies || []).filter(
      (m) => m && m.name !== currentMovieTitle
    );
  }, [actorMovies, currentMovieTitle]);

  // Lọc phim theo đạo diễn loại bỏ phim hiện tại
  const validDirectorMovies = useMemo(() => {
    return (directorMovies || []).filter(
      (m) => m && m.name !== currentMovieTitle
    );
  }, [directorMovies, currentMovieTitle]);

  // Danh sách phim đánh giá cao (sắp xếp theo điểm rating / năm)
  const topRatedMovies = useMemo(() => {
    return [...allMovies]
      .sort((a, b) => {
        const { rating: rateA, voteCount: vcA } = extractMovieRatingScore(a);
        const { rating: rateB, voteCount: vcB } = extractMovieRatingScore(b);
        if (rateB !== rateA) return rateB - rateA;
        if (vcB !== vcA) return vcB - vcA;
        const yearA = Number(a.year || 0);
        const yearB = Number(b.year || 0);
        if (yearB !== yearA) return yearB - yearA;
        return String(a.name || "").localeCompare(String(b.name || ""));
      })
      .slice(0, 18);
  }, [allMovies]);

  // Phim đề xuất phù hợp nhất (kết hợp các nguồn & xáo trộn khi bấm Shuffle)
  const bestMatchMovies = useMemo(() => {
    const list = [...allMovies];
    if (shuffleSeed > 0) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = (i * 7 + shuffleSeed) % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
  }, [allMovies, shuffleSeed]);

  // Tự động chuyển về tab "best" nếu tab đang chọn không có phim
  useEffect(() => {
    if (activeTab === "genre" && (!genreName || genreMovies.length === 0)) {
      setActiveTab("best");
    } else if (activeTab === "country" && (!countryName || countryMovies.length === 0)) {
      setActiveTab("best");
    } else if (activeTab === "actor" && (!actorName || validActorMovies.length === 0)) {
      setActiveTab("best");
    } else if (activeTab === "director" && (!directorName || validDirectorMovies.length === 0)) {
      setActiveTab("best");
    } else if (activeTab === "top" && topRatedMovies.length === 0) {
      setActiveTab("best");
    }
  }, [
    activeTab,
    genreName,
    genreMovies.length,
    countryName,
    countryMovies.length,
    actorName,
    validActorMovies.length,
    directorName,
    validDirectorMovies.length,
    topRatedMovies.length,
  ]);

  // Danh sách các tab hợp lệ
  const tabsList = useMemo(() => {
    const list: TabConfig[] = [
      {
        key: "best",
        label: variant === "sidebar" ? "Tương Tự" : "Phim Tương Tự",
        count: allMovies.length,
      },
    ];

    if (actorName && validActorMovies.length > 0) {
      list.push({
        key: "actor",
        label: variant === "sidebar" ? actorName : `Diễn viên: ${actorName}`,
        count: validActorMovies.length,
      });
    }

    if (directorName && validDirectorMovies.length > 0) {
      list.push({
        key: "director",
        label: variant === "sidebar" ? directorName : `Đạo diễn: ${directorName}`,
        count: validDirectorMovies.length,
      });
    }

    if (genreName && genreMovies.length > 0) {
      list.push({
        key: "genre",
        label: variant === "sidebar" ? genreName : `Thể loại: ${genreName}`,
        count: genreMovies.length,
      });
    }

    if (countryName && countryMovies.length > 0) {
      list.push({
        key: "country",
        label: variant === "sidebar" ? countryName : `Quốc gia: ${countryName}`,
        count: countryMovies.length,
      });
    }

    if (topRatedMovies.length > 0) {
      list.push({
        key: "top",
        label: "Đánh giá cao",
        count: topRatedMovies.length,
      });
    }

    return list;
  }, [
    variant,
    allMovies.length,
    actorName,
    validActorMovies.length,
    directorName,
    validDirectorMovies.length,
    genreName,
    genreMovies.length,
    countryName,
    countryMovies.length,
    topRatedMovies.length,
  ]);

  // Danh sách phim đang được chọn theo tab
  const currentTabMovies = useMemo(() => {
    switch (activeTab) {
      case "genre":
        return genreMovies;
      case "country":
        return countryMovies;
      case "actor":
        return validActorMovies;
      case "director":
        return validDirectorMovies;
      case "top":
        return topRatedMovies;
      case "best":
      default:
        return bestMatchMovies;
    }
  }, [
    activeTab,
    genreMovies,
    countryMovies,
    validActorMovies,
    validDirectorMovies,
    topRatedMovies,
    bestMatchMovies,
  ]);

  const displayedMovies = useMemo(() => {
    return currentTabMovies.slice(0, visibleLimit);
  }, [currentTabMovies, visibleLimit]);

  // Auto lazy load more movies when scrolling near bottom of list
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => {
            if (prev < currentTabMovies.length) {
              return prev + 12;
            }
            return prev;
          });
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentTabMovies.length]);

  // Xử lý đổi gợi ý ngẫu nhiên (Shuffle)
  const handleShuffle = () => {
    setIsShuffling(true);
    setShuffleSeed((prev) => prev + (Date.now() % 100) + 1);
    toast.info("Đã đổi danh sách phim đề xuất!");
    setTimeout(() => {
      setIsShuffling(false);
    }, 450);
  };

  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-hidden ${
        variant === "sidebar" ? "space-y-3" : "space-y-6"
      }`}
    >
      {/* 1. THANH TABS ĐỀ XUẤT THÔNG MINH */}
      <div className="relative border-b border-white/[0.08] pb-2 w-full min-w-0">
        <div className="flex items-center gap-1.5 w-full min-w-0">
          <ScrollFadeContainer
            className="flex-1 min-w-0"
            scrollClassName="gap-1.5 py-0.5 px-0.5"
            activeChildTrigger={activeTab}
          >
            {tabsList.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(t.key);
                    setVisibleLimit(12);
                  }}
                  className={`flex items-center gap-1.5 ${
                    variant === "sidebar"
                      ? "px-2.5 py-1 rounded-full text-[11px]"
                      : "px-3 py-1.5 rounded-xl text-xs"
                  } font-bold transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red shrink-0 ${
                    isActive
                      ? "bg-netflix-red text-white shadow-sm"
                      : "bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="font-sans tabular-nums text-[11px] opacity-85">
                    ({t.count})
                  </span>
                </button>
              );
            })}
          </ScrollFadeContainer>

          {/* NÚT SHUFFLE */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip content="Đổi phim khác" side="top">
              <button
                type="button"
                onClick={handleShuffle}
                aria-label="Đổi phim khác"
                className="flex items-center justify-center h-7 w-7 rounded-xl text-xs font-bold text-zinc-200 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 transition shadow-sm cursor-pointer active:scale-95 shrink-0"
              >
                <Shuffle
                  className={`w-3.5 h-3.5 text-amber-400 transition-transform ${
                    isShuffling ? "rotate-180 scale-110" : ""
                  }`}
                />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* 2. HIỂN THỊ PHIM GỢI Ý: DẠNG SIDEBAR HOẶC DẠNG LƯỚI GRID */}
      {displayedMovies.length > 0 ? (
        variant === "sidebar" ? (
          <div className="space-y-3">
            <div className="space-y-1.5 pr-0.5">
              {displayedMovies.map((item, index) => (
                <RecommendedSidebarCard
                  key={item.slug}
                  item={item}
                  index={index}
                  displayCategory={resolveDisplayCategory(item, activeTab, genreName)}
                />
              ))}
              <div
                ref={sentinelRef}
                className="w-full h-2 pointer-events-none opacity-0"
                aria-hidden="true"
              />
            </div>

            {currentTabMovies.length > visibleLimit && (
              <div className="flex justify-center pt-1 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 8)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  <span>Xem thêm</span>
                  <ChevronDown className="w-3.5 h-3.5 text-netflix-red" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {displayedMovies.map((item) => (
                <RecommendedMovieCard
                  key={item.slug}
                  item={item}
                  displayCategory={resolveDisplayCategory(item, activeTab, genreName)}
                />
              ))}
            </div>

            {currentTabMovies.length > visibleLimit && (
              <div
                ref={sentinelRef}
                className="w-full h-4 pointer-events-none opacity-0"
                aria-hidden="true"
              />
            )}

            {currentTabMovies.length > visibleLimit && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 12)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <span>Xem thêm gợi ý</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] text-zinc-300 font-sans tabular-nums">
                    +{Math.min(12, currentTabMovies.length - visibleLimit)}
                  </span>
                  <ChevronDown className="w-4 h-4 text-netflix-red" />
                </button>
              </div>
            )}

            {visibleLimit > 12 && (
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setVisibleLimit(12)}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition font-medium cursor-pointer"
                >
                  <span>Thu gọn</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="rounded-2xl bg-zinc-900/50 p-6 text-center text-sm text-zinc-400 space-y-3">
          <p>Chưa có danh sách phim đề xuất phù hợp.</p>
          <button
            type="button"
            onClick={() => setActiveTab("best")}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition cursor-pointer"
          >
            Xem gợi ý chung
          </button>
        </div>
      )}
    </div>
  );
}

export default RecommendationTabs;
