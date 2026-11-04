"use client";

import React from "react";

export function LiveTvSkeleton() {
  return (
    <div className="space-y-4 pt-1 animate-pulse">
      {/* 1. Category Chips Placeholder */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div
            key={idx}
            className="h-7 sm:h-8 rounded-lg bg-zinc-800/80 shrink-0"
            style={{ width: `${60 + (idx % 4) * 20}px` }}
          />
        ))}
      </div>

      {/* 2. Channel Cards Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {Array.from({ length: 18 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-white/[0.06] p-2.5 sm:p-3 flex flex-col items-center justify-between gap-2.5 min-h-[110px] sm:min-h-[125px]"
          >
            {/* Top row mini badge */}
            <div className="w-full flex items-center justify-between">
              <div className="w-8 h-3 rounded bg-zinc-800/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800/80" />
            </div>

            {/* Logo box */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-800/70" />

            {/* Channel Name */}
            <div className="w-3/4 h-3 rounded bg-zinc-800/80" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveTvSkeleton;

