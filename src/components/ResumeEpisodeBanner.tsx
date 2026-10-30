"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, RotateCcw, X } from "lucide-react";
import { getWatchHistory } from "@/lib/watchHistory";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { useWatchController } from "./WatchController";
import { Tooltip } from "@/components/ui/Tooltip";

interface ResumeEpisodeBannerProps {
  movieSlug: string;
  activeEpisodeSlug?: string;
}

export const ResumeEpisodeBanner: React.FC<ResumeEpisodeBannerProps> = ({
  movieSlug,
  activeEpisodeSlug: propActiveEpisodeSlug,
}) => {
  const watchContext = useWatchController();
  const activeEpisodeSlug = watchContext?.activeEpisodeSlug ?? propActiveEpisodeSlug;
  const switchEpisode = watchContext?.switchEpisode;

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

      // Tự động ẩn thông báo sau 12 giây để không làm phiền trải nghiệm xem
      const autoDismissTimer = setTimeout(() => {
        setDismissed(true);
      }, 12000);

      return () => clearTimeout(autoDismissTimer);
    } else {
      setResumeData(null);
    }
  }, [movieSlug, activeEpisodeSlug]);

  if (!resumeData || !resumeData.episodeSlug || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Thông báo xem dở"
      className="max-w-[1800px] mx-auto mb-2 px-1 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-netflix-red/10 border border-netflix-red/30 shadow-lg min-w-0">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-200 min-w-0">
          <RotateCcw className="w-4 h-4 text-netflix-red flex-none animate-spin-slow" aria-hidden="true" />
          <span className="truncate leading-[1.4]">
            Lần trước bạn đang xem dở:{" "}
            <strong className="text-white font-bold">
              {formatEpisodeName(resumeData.episodeName || resumeData.episodeSlug)}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-none">
          <Link
            href={`?ep=${resumeData.episodeSlug}`}
            scroll={false}
            onClick={(e) => {
              if (switchEpisode && resumeData.episodeSlug) {
                e.preventDefault();
                switchEpisode(resumeData.episodeSlug);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-lg bg-netflix-red hover:brightness-110 text-white text-xs font-bold transition shadow-md hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Play className="w-3 h-3 fill-white" aria-hidden="true" />
            <span>Tiếp tục xem ngay</span>
          </Link>

          <Tooltip content="Đóng thông báo" side="top">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Đóng thông báo xem dở"
              className="p-2 sm:p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition flex items-center justify-center min-w-[38px] min-h-[38px] sm:min-w-0 sm:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
};

export default ResumeEpisodeBanner;
