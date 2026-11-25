"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Film,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { MovieGrid } from "@/components/movies/MovieGrid";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { SortDropdown } from "@/components/ui/SortDropdown";
import { SORT_OPTIONS } from "@/components/browse/filterConstants";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";

interface ActorDetailClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
  bioText?: string;
  wikiUrl?: string;
  actorName: string;
}

import { getPaginationPages } from "@/lib/pagination";

const PAGE_SIZE = 24;

import { parseBioContent } from "@/services/actor/bioFormatter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMovieRating(movie: any): number {
  if (!movie) return 0;
  const val =
    movie.tmdb?.vote_average ??
    movie.vote_average ??
    movie.tmdb_vote_average ??
    movie.imdb_score ??
    movie.imdb?.vote_average ??
    movie.vote ??
    movie.rate;
  const num = parseFloat(String(val));
  return isNaN(num) ? 0 : num;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMovieViews(movie: any): number {
  if (!movie) return 0;
  const viewVal = movie.view ?? movie.views ?? movie.view_count ?? movie.total_views;
  const numView = parseFloat(String(viewVal));
  if (!isNaN(numView) && numView > 0) return numView;

  const voteCountVal = movie.tmdb?.vote_count ?? movie.vote_count ?? movie.imdb?.vote_count;
  const numVoteCount = parseFloat(String(voteCountVal));
  if (!isNaN(numVoteCount) && numVoteCount > 0) return numVoteCount;

  const popVal = movie.tmdb?.popularity ?? movie.popularity;
  const numPop = parseFloat(String(popVal));
  if (!isNaN(numPop) && numPop > 0) return Math.round(numPop * 100);

  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMovieYear(movie: any): number {
  if (!movie) return 0;
  const y = parseInt(String(movie.year || 0), 10);
  return isNaN(y) ? 0 : y;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMovieModifiedTime(movie: any): number {
  if (!movie) return 0;
  const mod = movie.modified?.time || (typeof movie.modified === "string" ? movie.modified : null);
  if (mod) {
    const t = new Date(mod).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

export const ActorDetailClient: React.FC<ActorDetailClientProps> = ({
  movies,
  bioText,
  wikiUrl,
  actorName,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "single" | "series">("all");
  const [activeSort, setActiveSort] = useState<string>("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Phân loại phim lẻ / phim bộ
  const { singleMovies, seriesMovies } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const single: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series: any[] = [];

    movies.forEach((m) => {
      const type = String(m?.type || m?.type_name || "").toLowerCase();
      const episodeCurrent = String(m?.episode_current || "").toLowerCase();
      const isSeries =
        type === "series" ||
        type === "phim-bo" ||
        type === "tv" ||
        episodeCurrent.includes("tập") ||
        episodeCurrent.includes("hoàn tất");

      if (isSeries) {
        series.push(m);
      } else {
        single.push(m);
      }
    });

    return { singleMovies: single, seriesMovies: series };
  }, [movies]);

  // Lọc theo tab hiển thị
  const baseFilteredMovies = useMemo(() => {
    if (activeTab === "single") return singleMovies;
    if (activeTab === "series") return seriesMovies;
    return movies;
  }, [activeTab, movies, singleMovies, seriesMovies]);

  // Sắp xếp danh sách phim theo tiêu chí đã chọn (Client-side sorting 0ms)
  const displayedMovies = useMemo(() => {
    const list = [...baseFilteredMovies];

    return list.sort((a, b) => {
      const yearA = getMovieYear(a);
      const yearB = getMovieYear(b);
      const ratingA = getMovieRating(a);
      const ratingB = getMovieRating(b);
      const viewsA = getMovieViews(a);
      const viewsB = getMovieViews(b);

      if (activeSort === "views" || activeSort === "views-desc") {
        if (viewsB !== viewsA) return viewsB - viewsA;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return yearB - yearA;
      }

      if (activeSort === "rating" || activeSort === "rating-desc") {
        if (ratingB !== ratingA) return ratingB - ratingA;
        if (viewsB !== viewsA) return viewsB - viewsA;
        return yearB - yearA;
      }

      if (activeSort === "year-asc") {
        if (yearA > 0 && yearB === 0) return -1;
        if (yearA === 0 && yearB > 0) return 1;
        if (yearA !== yearB) return yearA - yearB;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return viewsB - viewsA;
      }

      if (activeSort === "year" || activeSort === "year-desc") {
        if (yearB !== yearA) return yearB - yearA;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return viewsB - viewsA;
      }

      // Default: "latest" -> Mới cập nhật (ưu tiên thời gian cập nhật nội dung, fallback sang năm phát hành)
      const modA = getMovieModifiedTime(a);
      const modB = getMovieModifiedTime(b);
      if (modB !== modA && (modA > 0 || modB > 0)) return modB - modA;
      if (yearB !== yearA) return yearB - yearA;
      if (viewsB !== viewsA) return viewsB - viewsA;
      return ratingB - ratingA;
    });
  }, [baseFilteredMovies, activeSort]);

  // Phân trang danh sách phim
  const totalPages = Math.max(1, Math.ceil(displayedMovies.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginationPages = useMemo(
    () => getPaginationPages(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
  );

  const pagedMovies = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return displayedMovies.slice(start, start + PAGE_SIZE);
  }, [displayedMovies, safeCurrentPage]);

  const handleTabChange = (tab: "all" | "single" | "series") => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort: string) => {
    setActiveSort(newSort);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const el = document.getElementById("actor-filmography-heading");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Parse structured bio
  const { leadParagraph, sections } = useMemo(() => parseBioContent(bioText), [bioText]);
  const estimatedReadTime = useMemo(() => {
    if (!bioText) return 1;
    return Math.max(1, Math.ceil(bioText.split(/\s+/).length / 160));
  }, [bioText]);

  const isBioLong = Boolean(bioText && bioText.length > 380);

  return (
    <div className="space-y-12">
      {/* ============================================================ */}
      {/* 1. SECTION TIỂU SỬ & SỰ NGHIỆP ĐIỆN ẢNH (EDITORIAL CARD) */}
      {/* ============================================================ */}
      {bioText && (
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-zinc-900/60 shadow-2xl p-5 sm:p-7 md:p-8">
          {/* HEADER BAR */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4 mb-5 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Tiểu Sử & Dấu Ấn Nghệ Thuật
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-normal">
                Hành trình cống hiến và các cột mốc sự nghiệp của {actorName}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.05] text-[11px] text-zinc-400 font-medium tabular-nums">
                ~{estimatedReadTime} phút đọc
              </span>

              {wikiUrl && (
                <a
                  href={wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-zinc-300 hover:text-white transition font-medium cursor-pointer"
                >
                  <span>Wikipedia</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              )}
            </div>
          </div>

          {/* MAIN CONTENT WRAPPER (WITH COLLAPSIBLE OVERLAY) */}
          <div
            className={`relative transition-all duration-500 ease-in-out ${!isBioExpanded && isBioLong
              ? "max-h-[260px] sm:max-h-[300px] overflow-hidden"
              : "max-h-none"
              }`}
          >
            <div className="space-y-4 sm:space-y-5 text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal">
              {/* LEAD INTRO PARAGRAPH */}
              {leadParagraph && (
                <div className="relative p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-zinc-900/70">
                  <p className="text-zinc-200 text-sm sm:text-[14.5px] leading-relaxed font-normal">
                    {leadParagraph}
                  </p>
                </div>
              )}

              {/* STRUCTURED SUB-SECTIONS */}
              {sections.map((sec, sIdx) => {
                return (
                  <div key={sIdx} className="space-y-2.5">
                    {sec.heading && (
                      <div className="pt-3 sm:pt-4 border-t border-white/[0.06]">
                        <h3 className="text-sm font-bold text-zinc-200">
                          {sec.heading}
                        </h3>
                      </div>
                    )}

                    <div className="space-y-3.5">
                      {sec.paragraphs.map((p, pIdx) => (
                        <p key={pIdx} className="text-zinc-300/95 leading-relaxed text-xs sm:text-sm">
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* COLLAPSED BOTTOM GRADIENT FADE */}
            {!isBioExpanded && isBioLong && (
              <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent flex items-end justify-center pb-1 z-10 pointer-events-none">
                <button
                  type="button"
                  onClick={() => setIsBioExpanded(true)}
                  className="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800/95 hover:bg-zinc-700/95 text-white text-xs font-bold backdrop-blur-md shadow-xl hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span>Xem toàn bộ tiểu sử (~{estimatedReadTime} phút đọc)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            )}
          </div>

          {/* EXPANDED BOTTOM COLLAPSE BUTTON */}
          {isBioExpanded && isBioLong && (
            <div className="pt-5 border-t border-white/[0.06] flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsBioExpanded(false);
                  const el = document.getElementById("actor-filmography-heading");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer"
              >
                <span>Thu gọn tiểu sử</span>
                <ChevronUp className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* 2. SECTION PHIM CỦA DIỄN VIÊN */}
      {/* ============================================================ */}
      <section id="actor-filmography-heading" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              Tuyển Tập Phim Của {actorName}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Tuyển tập {displayedMovies.length} bộ phim đặc sắc {totalPages > 1 ? `• Trang ${safeCurrentPage} / ${totalPages}` : ""}
            </p>
          </div>

          {/* CỤM ĐIỀU KHIỂN: BỘ LỌC LOẠI PHIM + DROPDOWN SẮP XẾP */}
          {movies.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-start lg:self-auto">
              {/* TABS LỌC LOẠI PHIM (NẾU CÓ CẢ 2 LOẠI) */}
              {(singleMovies.length > 0 || seriesMovies.length > 0) && (
                <SegmentedTabs<"all" | "single" | "series">
                  variant="pills"
                  size="sm"
                  tabs={[
                    { id: "all", label: "Tất cả", count: movies.length },
                    ...(singleMovies.length > 0
                      ? [
                        {
                          id: "single" as const,
                          label: "Phim lẻ",
                          count: singleMovies.length,
                        },
                      ]
                      : []),
                    ...(seriesMovies.length > 0
                      ? [
                        {
                          id: "series" as const,
                          label: "Phim bộ",
                          count: seriesMovies.length,
                        },
                      ]
                      : []),
                  ]}
                  activeTab={activeTab}
                  onChange={handleTabChange}
                />
              )}

              {/* DROPDOWN SẮP XẾP CHUẨN DÙNG CHUNG TOÀN HỆ THỐNG */}
              {movies.length > 1 && (
                <SortDropdown
                  value={activeSort}
                  onChange={handleSortChange}
                  options={SORT_OPTIONS}
                  menuAlign="left"
                />
              )}
            </div>
          )}
        </div>

        {/* LƯỚI PHIM MOVIEGRID */}
        {pagedMovies.length > 0 ? (
          <>
            <MovieGrid movies={pagedMovies} />
            {totalPages > 1 && (
              <PaginationControl
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                pages={paginationPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        ) : (
          <div className="py-16 px-6 rounded-3xl bg-zinc-900/60 shadow-xl text-center max-w-xl mx-auto space-y-4">
            <Film className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Chưa có phim của {actorName}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Danh sách phim đang được cập nhật. Bạn có thể khám phá các tác phẩm hấp dẫn khác.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-xs transition shadow-md shadow-black/50 cursor-pointer"
              >
                <span>Khám phá các phim khác</span>
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
