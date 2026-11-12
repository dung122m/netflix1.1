"use client";

import React from "react";

export function LiveHubSkeleton() {
  return (
    <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 space-y-3 sm:space-y-4 animate-pulse">
      {/* 1. Header Command Bar Skeleton */}
      <header className="flex items-center justify-between gap-2 p-2 sm:p-2.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl bg-zinc-950/80 shadow-xl shadow-black/40">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-zinc-800/80 shrink-0" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-16 h-4 rounded bg-zinc-800/80" />
              <span className="hidden sm:inline-block w-32 h-4 rounded bg-zinc-800/60" />
            </div>
            <div className="hidden sm:block w-44 h-5 rounded bg-zinc-800/90" />
          </div>
        </div>

        {/* Tab Buttons Skeleton */}
        <div className="flex items-center gap-1 p-1 rounded-lg sm:rounded-xl bg-zinc-900 shrink-0">
          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-netflix-red/30 text-white/50 text-xs font-bold">
            <span>Thể Thao</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg bg-white/5 text-zinc-500 text-xs font-bold">
            <span>Truyền Hình</span>
          </div>
        </div>
      </header>

      {/* 2. Sport Category Selector Bar Skeleton */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="h-8 sm:h-9 rounded-xl bg-zinc-900/90 shrink-0"
            style={{ width: `${80 + (idx % 3) * 24}px` }}
          />
        ))}
      </div>

      {/* 3. Section Title Skeleton */}
      <div className="flex items-center justify-between px-1 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-36 h-4 rounded bg-zinc-800/80" />
        </div>
        <div className="w-14 h-5 rounded-full bg-zinc-800/70" />
      </div>

      {/* 4. Match Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-zinc-900/70 p-3 sm:p-3.5 flex flex-col justify-between gap-3 min-h-[160px]"
          >
            {/* Header: Tournament + Live dot */}
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="w-24 h-3 rounded bg-zinc-800/80" />
              <div className="w-10 h-3 rounded bg-zinc-800/80" />
            </div>

            {/* 3-Column Match Body: Home, VS, Away */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
              {/* Home */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-full bg-zinc-800/80" />
                <div className="w-16 h-3 rounded bg-zinc-800/70" />
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-1 px-1">
                <div className="w-8 h-4 rounded bg-zinc-800/80" />
                <div className="w-12 h-3 rounded bg-zinc-800/60" />
              </div>

              {/* Away */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-11 h-11 rounded-full bg-zinc-800/80" />
                <div className="w-16 h-3 rounded bg-zinc-800/70" />
              </div>
            </div>

            {/* Footer mini line */}
            <div className="flex items-center justify-between pt-1">
              <div className="w-20 h-2.5 rounded bg-zinc-800/60" />
              <div className="w-12 h-2.5 rounded bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LiveHubSkeleton;

