import React from "react";
import { GridSkeleton } from "@/components/ui/GridSkeleton";

export default function BrowseLoading() {
  return (
    <div className="bg-black min-h-dvh text-white pb-20 animate-pulse">
      {/* HERO SKELETON */}
      <div className="relative h-[65dvh] sm:h-[75dvh] w-full bg-zinc-900/60 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-8 left-4 md:left-10 max-w-2xl space-y-4">
          <div className="h-6 w-32 bg-white/10 rounded-full" />
          <div className="h-10 sm:h-14 w-3/4 bg-white/15 rounded-2xl" />
          <div className="h-4 w-full bg-white/10 rounded-lg" />
          <div className="h-4 w-2/3 bg-white/10 rounded-lg" />
          <div className="flex gap-3 pt-2">
            <div className="h-11 w-32 bg-white/20 rounded-xl" />
            <div className="h-11 w-32 bg-white/10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* FILTER BAR / GENRE CHIPS SKELETON */}
      <div className="px-4 md:px-8 mt-6 space-y-4">
        <div className="h-16 w-full bg-zinc-900/80 rounded-3xl" />
        <div className="h-28 w-full bg-zinc-950/80 rounded-3xl" />

        {/* HEADER SKELETON */}
        <div className="flex justify-between items-center py-4">
          <div className="space-y-2">
            <div className="h-7 w-48 max-w-full bg-white/15 rounded-lg" />
            <div className="h-4 w-72 max-w-full bg-white/10 rounded-lg" />
          </div>
          <div className="h-9 w-28 bg-white/10 rounded-xl" />
        </div>

        {/* MOVIE GRID SKELETON (24 CARDS) */}
        <div className="p-2 sm:p-4 md:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-zinc-950/40">
          <GridSkeleton count={24} />
        </div>
      </div>
    </div>
  );
}
