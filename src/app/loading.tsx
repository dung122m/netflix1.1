import React from "react";

export default function RootLoading() {
  return (
    <div className="bg-black min-h-screen text-white pb-20 animate-pulse">
      {/* TOP NAVBAR SKELETON */}
      <div className="h-16 w-full border-b border-white/5 bg-zinc-950/80 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="h-7 w-28 bg-red-600/30 rounded-lg" />
          <div className="hidden lg:flex items-center gap-4">
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-white/10 rounded-full" />
          <div className="h-8 w-8 bg-white/10 rounded-full" />
        </div>
      </div>

      {/* HERO / HEADER SKELETON */}
      <div className="relative h-[45vh] sm:h-[60vh] w-full bg-zinc-900/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-8 left-4 md:left-8 max-w-xl space-y-3">
          <div className="h-5 w-28 bg-white/10 rounded-full" />
          <div className="h-10 sm:h-12 w-3/4 bg-white/15 rounded-xl" />
          <div className="h-4 w-full bg-white/10 rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-28 bg-white/20 rounded-xl" />
            <div className="h-10 w-28 bg-white/10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* CONTENT SKELETON */}
      <div className="px-4 md:px-8 mt-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-2xl bg-zinc-900/80 border border-white/5 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 space-y-2">
                <div className="h-4 w-3/4 bg-white/20 rounded" />
                <div className="h-3 w-1/2 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
