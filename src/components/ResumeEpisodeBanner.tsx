"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, RotateCcw, X, FastForward } from "lucide-react";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { resolveNextResumeEpisode, ResolvedResumeEpisode } from "@/lib/seriesResume";
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
  const episodes = React.useMemo(() => watchContext?.episodes || [], [watchContext?.episodes]);
  const activeEpisodeSlug = watchContext?.activeEpisodeSlug ?? propActiveEpisodeSlug;
  const switchEpisode = watchContext?.switchEpisode;

  const [resumeInfo, setResumeInfo] = useState<ResolvedResumeEpisode | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!movieSlug || episodes.length === 0) {
      setResumeInfo(null);
      return;
    }

    const resolved = resolveNextResumeEpisode(movieSlug, episodes);
    if (!resolved || !resolved.episode?.slug) {
      setResumeInfo(null);
      return;
    }

    const currentIdx = episodes.findIndex((ep) => ep.slug === activeEpisodeSlug);
    const resolvedIdx = resolved.episodeIndex;

    // Chỉ hiển thị banner khi:
    // 1. Tập gợi ý khác với tập đang phát
    // 2. Người dùng đang ở tập trước tập xem dở (ví dụ đang ở tập 1/mở đầu nhưng có lịch sử xem dở tập 61)
    // -> Tuyệt đối không hiển thị banner gợi ý quay lại tập cũ khi người dùng đã xem tiến xa hơn (ví dụ đang xem tập 67 thì không gợi ý tập 61)
    const isPastEpisode = currentIdx >= 0 && resolvedIdx >= 0 && currentIdx >= resolvedIdx;

    if (
      !isPastEpisode &&
      resolved.episode.slug !== activeEpisodeSlug &&
      (resolved.caseType === "in_progress" || resolved.caseType === "next_episode")
    ) {
      setResumeInfo(resolved);

      // Tự động ẩn thông báo sau 10 giây để không làm phiền trải nghiệm xem
      const autoDismissTimer = setTimeout(() => {
        setDismissed(true);
      }, 10000);

      return () => clearTimeout(autoDismissTimer);
    } else {
      setResumeInfo(null);
    }
  }, [movieSlug, episodes, activeEpisodeSlug]);

  if (!resumeInfo || !resumeInfo.episode?.slug || dismissed) {
    return null;
  }

  const epSlug = resumeInfo.episode.slug;
  const epDisplayName = formatEpisodeName(resumeInfo.sourceEpisodeName || epSlug);
  const isInProgress = resumeInfo.caseType === "in_progress";

  return (
    <aside
      aria-label="Thông báo xem dở"
      className="max-w-[1800px] mx-auto mb-2 px-1 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-netflix-red/10 border border-netflix-red/30 shadow-lg min-w-0">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-200 min-w-0">
          {isInProgress ? (
            <RotateCcw className="w-4 h-4 text-netflix-red flex-none animate-spin-slow" aria-hidden="true" />
          ) : (
            <FastForward className="w-4 h-4 text-emerald-400 flex-none" aria-hidden="true" />
          )}
          <span className="truncate leading-[1.4]">
            {isInProgress ? (
              <>
                Lần trước bạn đang xem dở:{" "}
                <strong className="text-white font-bold">{epDisplayName}</strong>
                {resumeInfo.progressPercent > 0 && (
                  <span className="text-zinc-400 font-sans tabular-nums ml-1">
                    ({resumeInfo.progressPercent}%)
                  </span>
                )}
              </>
            ) : (
              <>
                Gợi ý xem tiếp:{" "}
                <strong className="text-white font-bold">{epDisplayName}</strong>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-none">
          <Link
            href={`?ep=${epSlug}`}
            prefetch={false}
            scroll={false}
            onClick={(e) => {
              if (switchEpisode && epSlug) {
                e.preventDefault();
                switchEpisode(epSlug);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-lg bg-netflix-red hover:brightness-110 text-white text-xs font-bold transition shadow-md hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <Play className="w-3 h-3 fill-white" aria-hidden="true" />
            <span>{isInProgress ? "Tiếp tục xem ngay" : "Xem tập tiếp theo"}</span>
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
