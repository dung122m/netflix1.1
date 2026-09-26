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

interface ActorDetailClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
  bioText?: string;
  wikiUrl?: string;
  actorName: string;
}

export const ActorDetailClient: React.FC<ActorDetailClientProps> = ({
  movies,
  bioText,
  wikiUrl,
  actorName,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "single" | "series">("all");
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

  // Giới hạn hiển thị ban đầu của Bio
  const isBioLong = bioText && bioText.length > 280;
  const shortBio = isBioLong && !isBioExpanded ? `${bioText.slice(0, 280)}...` : bioText;

  return (
    <div className="space-y-12">
      {/* ============================================================ */}
      {/* 1. SECTION TIỂU SỬ / BIOGRAPHY */}
      {/* ============================================================ */}
      {bioText && (
        <section className="p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Tiểu Sử & Sự Nghiệp Điện Ảnh</span>
            </h2>

            {wikiUrl && (
              <a
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition font-medium"
              >
                <span>Wikipedia</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
            <p className="whitespace-pre-line">{shortBio}</p>
          </div>

          {isBioLong && (
            <button
              type="button"
              onClick={() => setIsBioExpanded(!isBioExpanded)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-netflix-red hover:text-red-400 transition cursor-pointer pt-1"
            >
              <span>{isBioExpanded ? "Thu gọn tiểu sử" : "Xem thêm tiểu sử đầy đủ"}</span>
              {isBioExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* 2. SECTION PHIM CỦA DIỄN VIÊN */}
      {/* ============================================================ */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Film className="w-5 h-5 sm:w-6 sm:h-6 text-netflix-red" />
              <span>Tuyển Tập Phim Của {actorName}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Tổng hợp {movies.length} tác phẩm đã được đối chiếu nguồn phát trên Nanaflix
            </p>
          </div>

          {/* TABS LỌC LOẠI PHIM (NẾU CÓ CẢ 2 LOẠI) */}
          {movies.length > 0 && (singleMovies.length > 0 || seriesMovies.length > 0) && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
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
                  onClick={() => setActiveTab("single")}
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
                  onClick={() => setActiveTab("series")}
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
        {displayedMovies.length > 0 ? (
          <MovieGrid movies={displayedMovies} />
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
