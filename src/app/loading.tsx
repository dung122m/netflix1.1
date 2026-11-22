import React from "react";
import { GridSkeleton } from "@/components/ui/GridSkeleton";

export default function RootLoading() {
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col pt-20 pb-20 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1800px] mx-auto w-full space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-36 sm:h-56 w-full bg-zinc-900/60 rounded-3xl" />

      {/* Row Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 bg-white/15 rounded-lg" />
        <div className="h-7 w-24 bg-white/10 rounded-lg" />
      </div>

      {/* Movie Grid Skeleton */}
      <GridSkeleton count={18} />
    </div>
  );
}
