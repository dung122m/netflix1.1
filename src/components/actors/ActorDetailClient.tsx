"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Film,
  Tv,
  Clapperboard,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { MovieGrid } from "@/components/MovieGrid";
import { PaginationControl } from "@/components/PaginationControl";

interface ActorDetailClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
  bioText?: string;
  wikiUrl?: string;
  actorName: string;
}

const PAGE_SIZE = 24;

function getPaginationPages(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

import { parseBioContent } from "@/lib/bioFormatter";

function getSectionIcon(heading?: string) {
  if (!heading) return Sparkles;
  const lower = heading.toLowerCase();
  if (lower.includes("âm nhạc") || lower.includes("ca hát")) return Sparkles;
  if (lower.includes("điện ảnh") || lower.includes("diễn xuất") || lower.includes("phim") || lower.includes("filmography")) return Clapperboard;
  if (lower.includes("thành tựu") || lower.includes("giải thưởng") || lower.includes("awards")) return Sparkles;
  if (lower.includes("đời tư") || lower.includes("thời thơ ấu") || lower.includes("tiểu sử") || lower.includes("personal") || lower.includes("life")) return BookOpen;
  return BookOpen;
}

export const ActorDetailClient: React.FC<ActorDetailClientProps> = ({
  movies,
  bioText,
  wikiUrl,
  actorName,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "single" | "series">("all");
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

  const displayedMovies = useMemo(() => {
    if (activeTab === "single") return singleMovies;
    if (activeTab === "series") return seriesMovies;
    return movies;
  }, [activeTab, movies, singleMovies, seriesMovies]);

  // Phân trang danh sách phim
  const totalPages = Math.max(1, Math.ceil(displayedMovies.length / PAGE_SIZE));
  const paginationPages = useMemo(() => getPaginationPages(currentPage, totalPages), [currentPage, totalPages]);

  const pagedMovies = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return displayedMovies.slice(start, start + PAGE_SIZE);
  }, [displayedMovies, currentPage]);

  const handleTabChange = (tab: "all" | "single" | "series") => {
    setActiveTab(tab);
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
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-950/95 to-zinc-950 border border-white/[0.1] shadow-2xl p-5 sm:p-7 md:p-8 backdrop-blur-2xl">
          {/* Ambient Glow Accents */}
          <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-red-600/[0.04] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-amber-500/[0.03] rounded-full blur-3xl pointer-events-none" />

          {/* HEADER BAR */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4 mb-5 sm:mb-6">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner flex-shrink-0">
                <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Tiểu Sử & Dấu Ấn Nghệ Thuật</span>
                </h2>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-normal">
                  Hành trình cống hiến và các cột mốc sự nghiệp của {actorName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 font-medium">
                ~{estimatedReadTime} phút đọc
              </span>

              {wikiUrl && (
                <a
                  href={wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs text-zinc-300 hover:text-white transition font-medium cursor-pointer"
                >
                  <span>Wikipedia</span>
                  <ExternalLink className="w-3 h-3 text-zinc-400" />
                </a>
              )}
            </div>
          </div>

          {/* MAIN CONTENT WRAPPER (WITH COLLAPSIBLE OVERLAY) */}
          <div
            className={`relative transition-all duration-500 ease-in-out ${
              !isBioExpanded && isBioLong
                ? "max-h-[260px] sm:max-h-[300px] overflow-hidden"
                : "max-h-none"
            }`}
          >
            <div className="space-y-4 sm:space-y-5 text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal">
              {/* LEAD INTRO PARAGRAPH */}
              {leadParagraph && (
                <div className="relative p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-950/25 via-zinc-900/40 to-transparent border-l-4 border-red-600/80 border-y border-r border-white/[0.06] shadow-sm">
                  <p className="text-zinc-200 text-sm sm:text-[14.5px] leading-relaxed font-normal">
                    {leadParagraph}
                  </p>
                </div>
              )}

              {/* STRUCTURED SUB-SECTIONS */}
              {sections.map((sec, sIdx) => {
                const SecIcon = getSectionIcon(sec.heading);
                return (
                  <div key={sIdx} className="space-y-3">
                    {sec.heading && (
                      <div className="flex items-center gap-2 pt-3 sm:pt-4 border-t border-white/[0.06]">
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                          <SecIcon className="w-3 h-3" />
                        </span>
                        <h3 className="text-xs sm:text-sm uppercase tracking-wider font-bold text-amber-300/90">
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
                  className="pointer-events-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800/95 hover:bg-zinc-700/95 text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-xl hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer"
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-white/10 transition cursor-pointer"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 text-netflix-red" />
              <span>Tuyển Tập Phim Của {actorName}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Tổng hợp {displayedMovies.length} tác phẩm {totalPages > 1 ? `(Trang ${currentPage} / ${totalPages})` : ""} đã được đối chiếu nguồn phát trên Nanaflix
            </p>
          </div>

          {/* TABS LỌC LOẠI PHIM (NẾU CÓ CẢ 2 LOẠI) */}
          {movies.length > 0 && (singleMovies.length > 0 || seriesMovies.length > 0) && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleTabChange("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "all"
                    ? "bg-netflix-red text-white shadow-md"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Tất cả ({movies.length})</span>
              </button>

              {singleMovies.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange("single")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "single"
                      ? "bg-netflix-red text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Clapperboard className="w-3 h-3" />
                  <span>Phim lẻ ({singleMovies.length})</span>
                </button>
              )}

              {seriesMovies.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleTabChange("series")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "series"
                      ? "bg-netflix-red text-white shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>Phim bộ ({seriesMovies.length})</span>
                </button>
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
                currentPage={currentPage}
                totalPages={totalPages}
                pages={paginationPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        ) : (
          <div className="py-16 px-6 rounded-3xl bg-zinc-950/60 border border-white/[0.08] text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Đang cập nhật thêm nguồn phát cho {actorName}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Hệ thống đang tiếp tục chỉ mục và bổ sung các tập phim chất lượng cao của nghệ sĩ vào thư viện.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-xs transition shadow-lg shadow-red-950/40 cursor-pointer"
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
