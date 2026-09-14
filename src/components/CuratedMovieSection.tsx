"use client";

import React, { useState, useRef, useTransition, useCallback } from "react";
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
import { MovieGrid } from "@/components/MovieGrid";
import { movieApi } from "@/services/movieApi";

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
    tag: "🔥 XEM NHIỀU NHẤT",
    subtitle: "Các siêu phẩm điện ảnh & phim bộ đang được quan tâm nhất hôm nay",
    fetchParams: { sort: "views", limit: 24 },
    viewAllHref: "/browse?sort=views",
  },
  {
    id: "rating",
    label: "Đánh Giá Cao",
    icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
    tag: "⭐ IMDB & REVIEW CAO",
    subtitle: "Tuyển tập những tác phẩm nghệ thuật đạt điểm đánh giá xuất sắc",
    fetchParams: { sort: "rating", limit: 24 },
    viewAllHref: "/browse?sort=rating",
  },
  {
    id: "theaters",
    label: "Chiếu Rạp",
    icon: <Clapperboard className="w-4 h-4 text-rose-500" />,
    tag: "🎬 BOM TẤN RẠP",
    subtitle: "Phim chiếu rạp chất lượng cao, hình ảnh & âm thanh sống động",
    fetchParams: { type: "phim-chieu-rap", limit: 24 },
    viewAllHref: "/browse?type=phim-chieu-rap",
  },
  {
    id: "latest",
    label: "Mới Cập Nhật",
    icon: <Clock className="w-4 h-4 text-emerald-400" />,
    tag: "🆕 TẬP MỚI LÊN SÓNG",
    subtitle: "Phim mới phát hành và các tập mới nhất vừa được đưa lên hệ thống",
    fetchParams: { sort: "latest", limit: 24 },
    viewAllHref: "/browse?sort=latest",
  },
];

interface CuratedMovieSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialMovies: any[];
  initialTotalItems?: number;
}

export const CuratedMovieSection: React.FC<CuratedMovieSectionProps> = ({
  initialMovies,
  initialTotalItems = 0,
}) => {
  const [activeTab, setActiveTab] = useState<CuratedTabKey>("trending");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tabMovies, setTabMovies] = useState<Record<CuratedTabKey, any[]>>({
    trending: initialMovies,
    rating: [],
    theaters: [],
    latest: [],
  });
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Cache đệm trong component để chuyển tab tức thì 0ms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheRef = useRef<Record<string, any[]>>({
    trending: initialMovies,
  });

  const currentTabConfig =
    CURATED_TABS.find((t) => t.id === activeTab) || CURATED_TABS[0];
  const currentMovies = tabMovies[activeTab] || [];

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

        const items = res?.items || [];
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
    <section className="mt-8 mb-12" aria-label="Tuyển chọn phim Nanaflix">
      {/* HEADER & TABS BAR */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-600/20 to-purple-600/20 text-rose-300 border border-red-500/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {currentTabConfig.tag}
            </span>
            {isPending && (
              <span className="text-xs text-gray-400 flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-netflix-red" />
                Đang chuyển...
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <span>Tuyển Tập Phim Đặc Sắc</span>
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
            {currentTabConfig.subtitle}
          </p>
        </div>

        {/* NÚT XEM TOÀN BỘ */}
        <Link
          href={currentTabConfig.viewAllHref}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition border border-white/10 active:scale-95 group shrink-0"
        >
          <span>Xem tất cả {currentTabConfig.label}</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-netflix-red" />
        </Link>
      </div>

      {/* THANH TAB TUYỂN CHỌN ĐA NĂNG */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-3 mb-6">
        {CURATED_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer select-none shrink-0 border ${
                isActive
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500 shadow-lg shadow-red-950/50 scale-[1.02]"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border-white/10 hover:border-white/20"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* LƯỚI PHIM VỚI 100% HIỆU ỨNG HOVER */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 p-2.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-zinc-950/50">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="relative aspect-[16/10] sm:aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 animate-pulse border border-white/5"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-zinc-800/60 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : currentMovies.length > 0 ? (
        <MovieGrid movies={currentMovies} />
      ) : (
        <div className="py-12 text-center rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
          <Film className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            Đang cập nhật danh sách phim {currentTabConfig.label}...
          </p>
        </div>
      )}
    </section>
  );
};
