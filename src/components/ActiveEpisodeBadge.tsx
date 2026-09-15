"use client";

import React from "react";
import { useWatchController } from "./WatchController";
import { formatEpisodeName } from "@/lib/formatEpisode";

interface ActiveEpisodeBadgeProps {
  initialEpisodeName?: string;
  isTrailerOnly?: boolean;
}

export const ActiveEpisodeBadge: React.FC<ActiveEpisodeBadgeProps> = ({
  initialEpisodeName,
  isTrailerOnly: propIsTrailerOnly = false,
}) => {
  const watchContext = useWatchController();
  const isTrailerOnly = watchContext?.isTrailerOnly ?? propIsTrailerOnly;
  const activeEpisode = watchContext?.activeEpisode;
  const epName = activeEpisode?.name || initialEpisodeName;

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-netflix-red/20 border border-netflix-red/40 text-rose-300 font-extrabold text-xs sm:text-sm shadow-sm flex-shrink-0">
      {isTrailerOnly ? "Trailer" : formatEpisodeName(epName, "Tập 1")}
    </span>
  );
};

export const EpisodeCountBadge: React.FC<{ initialCount?: number; isTrailerOnly?: boolean }> = ({
  initialCount = 0,
  isTrailerOnly: propIsTrailerOnly = false,
}) => {
  const watchContext = useWatchController();
  const isTrailerOnly = watchContext?.isTrailerOnly ?? propIsTrailerOnly;
  const count = watchContext?.episodes?.length ?? initialCount;

  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-gray-300 font-medium transition-all">
      {isTrailerOnly || count === 0 ? "Trailer" : `${count} tập`}
    </span>
  );
};

export default ActiveEpisodeBadge;
