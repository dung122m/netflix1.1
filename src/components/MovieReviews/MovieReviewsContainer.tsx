"use client";

import React, { useState } from "react";
import { MessageSquare, Globe } from "lucide-react";
import { MovieCommentsSection } from "./MovieCommentsSection";
import { TmdbAudienceReviews } from "@/components/TmdbAudienceReviews";

interface MovieReviewsContainerProps {
  movieSlug: string;
  movieTitle: string;
  currentEpisodeSlug?: string;
  currentEpisodeName?: string;
  tmdbId?: string | number | null;
  tmdbType?: string | null;
}

export const MovieReviewsContainer: React.FC<MovieReviewsContainerProps> = ({
  movieSlug,
  movieTitle,
  currentEpisodeSlug,
  currentEpisodeName,
  tmdbId,
  tmdbType,
}) => {
  const [activeTab, setActiveTab] = useState<"nanaflix" | "tmdb">("nanaflix");

  return (
    <div className="bg-zinc-950/80 rounded-2xl sm:rounded-3xl border border-white/10 p-4 sm:p-6 md:p-8 backdrop-blur-xl shadow-2xl">
      {/* Header Bar with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-netflix-red/10 border border-netflix-red/30 flex items-center justify-center text-netflix-red">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Đánh Giá &amp; Bình Luận
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Góc nhìn, chấm điểm và thảo luận cảm nhận về &quot;{movieTitle}&quot;
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-white/10 self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("nanaflix")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "nanaflix"
                ? "bg-netflix-red text-white shadow-md shadow-netflix-red/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>💬 Bình luận Nanaflix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tmdb")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tmdb"
                ? "bg-amber-500 text-black shadow-md shadow-amber-500/30"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>🌍 TMDb Quốc Tế</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        <div className={activeTab === "nanaflix" ? "block" : "hidden"}>
          <MovieCommentsSection
            movieSlug={movieSlug}
            movieTitle={movieTitle}
            currentEpisodeSlug={currentEpisodeSlug}
            currentEpisodeName={currentEpisodeName}
            hideOuterCard={true}
          />
        </div>
        <div className={activeTab === "tmdb" ? "block" : "hidden"}>
          <TmdbAudienceReviews
            tmdbId={tmdbId}
            tmdbType={tmdbType}
            hideOuterCard={true}
          />
        </div>
      </div>
    </div>
  );
};
