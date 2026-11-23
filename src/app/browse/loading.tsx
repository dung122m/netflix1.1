import React from "react";
import { GridSkeleton } from "@/components/ui/GridSkeleton";

export default function BrowseLoading() {
  return (
    <div className="bg-black min-h-dvh text-white pb-20 animate-pulse">
      {/* FILTER BAR / GENRE CHIPS SKELETON */}
      <div className="px-4 md:px-8 pt-16 sm:pt-24 space-y-4">
        {/* FILTER BAR SKELETON */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-10 w-28 bg-zinc-900/80 rounded-xl" />
          <div className="h-10 w-28 bg-zinc-900/80 rounded-xl" />
          <div className="h-10 w-28 bg-zinc-900/80 rounded-xl" />
          <div className="h-10 w-24 bg-zinc-900/80 rounded-xl" />
          <div className="ml-auto h-10 w-36 bg-zinc-900/80 rounded-xl hidden sm:block" />
        </div>

        {/* HEADER SKELETON */}
        <div className="flex justify-between items-center py-4">
          <div className="space-y-2">
            <div className="h-7 w-48 max-w-full bg-white/15 rounded-lg" />
            <div className="h-4 w-72 max-w-full bg-white/10 rounded-lg" />
          </div>
          <div className="h-9 w-28 bg-white/10 rounded-xl" />
        </div>

        {/* MOVIE GRID SKELETON (24 CARDS) */}
        <div className="py-2">
          <GridSkeleton count={24} />
        </div>
      </div>
    </div>
  );
}
