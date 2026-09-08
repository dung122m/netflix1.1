"use client";

import React, { useState } from "react";
import { MovieCard } from "./MovieCard";
import { Sparkles, Clapperboard, Globe2 } from "lucide-react";

interface MovieItem {
  slug: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface RecommendationTabsProps {
  genreName?: string;
  countryName?: string;
  genreMovies: MovieItem[];
  countryMovies: MovieItem[];
  allMovies: MovieItem[];
}

export function RecommendationTabs({
  genreName,
  countryName,
  genreMovies,
  countryMovies,
  allMovies,
}: RecommendationTabsProps) {
  const [activeTab, setActiveTab] = useState<"all" | "genre" | "country">("all");

  const displayedMovies =
    activeTab === "genre" && genreMovies.length > 0
      ? genreMovies
      : activeTab === "country" && countryMovies.length > 0
      ? countryMovies
      : allMovies;

  return (
    <div className="space-y-5">
      {/* TABS HEADER */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
            activeTab === "all"
              ? "bg-white text-black shadow-md"
              : "bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tất cả đề xuất ({allMovies.length})</span>
        </button>

        {genreName && genreMovies.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("genre")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              activeTab === "genre"
                ? "bg-netflix-red text-white shadow-md shadow-red-950/40"
                : "bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" />
            <span>Cùng thể loại: {genreName} ({genreMovies.length})</span>
          </button>
        )}

        {countryName && countryMovies.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab("country")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              activeTab === "country"
                ? "bg-sky-600 text-white shadow-md shadow-sky-950/40"
                : "bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Cùng quốc gia: {countryName} ({countryMovies.length})</span>
          </button>
        )}
      </div>

      {/* MOVIES GRID */}
      {displayedMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
          {displayedMovies.map((item) => (
            <MovieCard key={item.slug} m={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 text-center text-sm text-gray-400">
          Chưa có phim phù hợp trong mục này.
        </div>
      )}
    </div>
  );
}

export default RecommendationTabs;
