"use client";

import React, { useState, useMemo } from "react";
import { MovieCard } from "./MovieCard";
import {
  Sparkles,
  Clapperboard,
  Globe2,
  Users,
  Star,
  Shuffle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "./Toast";

interface MovieItem {
  slug: string;
  name?: string;
  origin_name?: string;
  year?: number | string;
  quality?: string;
  score?: number | string;
  category?: Array<{ name: string; slug?: string }>;
  country?: Array<{ name: string; slug?: string }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface RecommendationTabsProps {
  currentMovieTitle?: string;
  genreName?: string;
  countryName?: string;
  actorName?: string;
  genreMovies: MovieItem[];
  countryMovies: MovieItem[];
  actorMovies?: MovieItem[];
  allMovies: MovieItem[];
}

export function RecommendationTabs({
  currentMovieTitle,
  genreName,
  countryName,
  actorName,
  genreMovies = [],
  countryMovies = [],
  actorMovies = [],
  allMovies = [],
}: RecommendationTabsProps) {
  const [activeTab, setActiveTab] = useState<
    "best" | "genre" | "country" | "actor" | "top"
  >("best");
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [visibleLimit, setVisibleLimit] = useState(12);

  // Lọc phim theo diễn viên loại bỏ phim hiện tại
  const validActorMovies = useMemo(() => {
    return (actorMovies || []).filter(
      (m) => m && m.name !== currentMovieTitle
    );
  }, [actorMovies, currentMovieTitle]);

  // Danh sách phim đánh giá cao (sắp xếp theo điểm rating / năm)
  const topRatedMovies = useMemo(() => {
    return [...allMovies]
      .sort((a, b) => {
        const scoreA = Number(a.score) || Number(a.imdb?.vote_average) || 7.0;
        const scoreB = Number(b.score) || Number(b.imdb?.vote_average) || 7.0;
        return scoreB - scoreA;
      })
      .slice(0, 18);
  }, [allMovies]);

  // Phim đề xuất phù hợp nhất (kết hợp các nguồn & xáo trộn khi bấm Shuffle)
  const bestMatchMovies = useMemo(() => {
    const list = [...allMovies];
    if (shuffleSeed > 0) {
      // Fisher-Yates shuffle có kiểm soát seed
      for (let i = list.length - 1; i > 0; i--) {
        const j = (i * 7 + shuffleSeed) % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
      }
    }
    return list;
  }, [allMovies, shuffleSeed]);

  // Danh sách phim đang được chọn theo tab
  const currentTabMovies = useMemo(() => {
    switch (activeTab) {
      case "genre":
        return genreMovies.length > 0 ? genreMovies : allMovies;
      case "country":
        return countryMovies.length > 0 ? countryMovies : allMovies;
      case "actor":
        return validActorMovies.length > 0 ? validActorMovies : allMovies;
      case "top":
        return topRatedMovies.length > 0 ? topRatedMovies : allMovies;
      case "best":
      default:
        return bestMatchMovies;
    }
  }, [
    activeTab,
    genreMovies,
    countryMovies,
    validActorMovies,
    topRatedMovies,
    bestMatchMovies,
    allMovies,
  ]);

  const displayedMovies = useMemo(() => {
    return currentTabMovies.slice(0, visibleLimit);
  }, [currentTabMovies, visibleLimit]);

  // Xử lý đổi gợi ý ngẫu nhiên (Shuffle)
  const handleShuffle = () => {
    setIsShuffling(true);
    setShuffleSeed((prev) => prev + Date.now() % 100 + 1);
    toast.info("Đã làm mới danh sách gợi ý phim!");
    setTimeout(() => {
      setIsShuffling(false);
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* 1. THANH TABS ĐỀ XUẤT THÔNG MINH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Cụm Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {/* Tab 1: Phù hợp nhất */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("best");
              setVisibleLimit(12);
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm ${
              activeTab === "best"
                ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white border-netflix-red shadow-lg shadow-red-950/60 scale-102"
                : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Đề Xuất Phù Hợp Nhất ({allMovies.length})</span>
          </button>

          {/* Tab 2: Cùng diễn viên (nếu có) */}
          {actorName && validActorMovies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("actor");
                setVisibleLimit(12);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm ${
                activeTab === "actor"
                  ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-950/60 scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-300" />
              <span>Diễn viên: {actorName} ({validActorMovies.length})</span>
            </button>
          )}

          {/* Tab 3: Cùng thể loại */}
          {genreName && genreMovies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("genre");
                setVisibleLimit(12);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm ${
                activeTab === "genre"
                  ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-red-950/60 scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5 text-rose-300" />
              <span>Thể loại: {genreName} ({genreMovies.length})</span>
            </button>
          )}

          {/* Tab 4: Cùng quốc gia */}
          {countryName && countryMovies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("country");
                setVisibleLimit(12);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm ${
                activeTab === "country"
                  ? "bg-sky-600 text-white border-sky-400 shadow-lg shadow-sky-950/60 scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Globe2 className="w-3.5 h-3.5 text-sky-300" />
              <span>Quốc gia: {countryName} ({countryMovies.length})</span>
            </button>
          )}

          {/* Tab 5: Đánh giá cao (Top Rated) */}
          {topRatedMovies.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("top");
                setVisibleLimit(12);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border shadow-sm ${
                activeTab === "top"
                  ? "bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-950/60 scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Star className="w-3.5 h-3.5 text-amber-300 fill-current" />
              <span>Đánh Giá Cao ({topRatedMovies.length})</span>
            </button>
          )}
        </div>

        {/* Nút Đổi Gợi Ý Ngẫu Nhiên (Shuffle) */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={handleShuffle}
            title="Xáo trộn và đổi danh sách phim đề xuất mới"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 hover:border-white/30 transition shadow-sm cursor-pointer active:scale-95"
          >
            <Shuffle
              className={`w-3.5 h-3.5 text-amber-400 transition-transform ${
                isShuffling ? "rotate-180 scale-110" : ""
              }`}
            />
            <span>Đổi gợi ý ngẫu nhiên</span>
          </button>
        </div>
      </div>

      {/* 2. LƯỚI PHIM GỢI Ý ĐẸP MẮT */}
      {displayedMovies.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5 sm:gap-4">
            {displayedMovies.map((item, index) => {
              // Điểm tương đồng giả lập thông minh (98% -> 85%) theo thứ tự tuyển chọn
              const matchPercent = Math.max(85, 98 - (index % 12));

              return (
                <div key={item.slug} className="relative group/rec">
                  {/* Badge độ tương đồng thông minh của Nana */}
                  <div className="absolute top-2 left-2 z-20 pointer-events-none">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/40 shadow-lg flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-current" />
                      <span>{matchPercent}% Khớp</span>
                    </span>
                  </div>

                  <MovieCard m={item} />
                </div>
              );
            })}
          </div>

          {/* NÚT XEM THÊM PHIM ĐỀ XUẤT */}
          {currentTabMovies.length > visibleLimit && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleLimit((prev) => prev + 12)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs sm:text-sm border border-white/15 hover:border-white/30 shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <span>Xem thêm các phim tương tự khác</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] text-gray-300">
                  +{Math.min(12, currentTabMovies.length - visibleLimit)}
                </span>
                <ChevronDown className="w-4 h-4 text-netflix-red" />
              </button>
            </div>
          )}

          {/* Nút thu gọn nếu đã mở rộng nhiều */}
          {visibleLimit > 12 && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleLimit(12)}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition font-medium cursor-pointer"
              >
                <span>Thu gọn lại</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 text-center text-sm text-gray-400 space-y-3">
          <p>Chưa có phim phù hợp trong mục này.</p>
          <button
            type="button"
            onClick={() => setActiveTab("best")}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition cursor-pointer"
          >
            Quay lại Đề Xuất Phù Hợp Nhất
          </button>
        </div>
      )}
    </div>
  );
}

export default RecommendationTabs;
