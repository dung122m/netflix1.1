"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, RotateCcw, X } from "lucide-react";
import { getWatchHistory } from "@/lib/watchHistory";

interface ResumeEpisodeBannerProps {
  movieSlug: string;
  activeEpisodeSlug?: string;
}

export const ResumeEpisodeBanner: React.FC<ResumeEpisodeBannerProps> = ({
  movieSlug,
  activeEpisodeSlug,
}) => {
  const [resumeData, setResumeData] = useState<{
    episodeName?: string;
    episodeSlug?: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const history = getWatchHistory();
    const item = history.find((h) => h.slug === movieSlug);

    if (
      item &&
      item.episodeSlug &&
      item.episodeSlug !== activeEpisodeSlug
    ) {
      setResumeData({
        episodeName: item.episodeName,
        episodeSlug: item.episodeSlug,
      });
    } else {
      setResumeData(null);
    }
  }, [movieSlug, activeEpisodeSlug]);

  if (!resumeData || !resumeData.episodeSlug || dismissed) {
    return null;
  }

  return (
    <div className="max-w-[1800px] mx-auto mb-2 px-1 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-red-950/40 border border-netflix-red/30 shadow-lg">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-200 min-w-0">
          <RotateCcw className="w-4 h-4 text-netflix-red flex-none animate-spin-slow" />
          <span className="truncate">
            Lần trước bạn đang xem dở:{" "}
            <strong className="text-white font-bold">
              Tập {resumeData.episodeName || resumeData.episodeSlug}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-none">
          <Link
            href={`?ep=${resumeData.episodeSlug}`}
            scroll={false}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-md hover:scale-105"
          >
            <Play className="w-3 h-3 fill-white" />
            <span>Tiếp tục xem ngay</span>
          </Link>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            title="Đóng thông báo"
            className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeEpisodeBanner;
