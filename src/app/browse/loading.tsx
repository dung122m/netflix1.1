import React from "react";
import { MediaCardSkeleton } from "@/components/MediaCardSkeleton";

export default function BrowseLoading() {
  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-20 px-4 md:px-8">
      {/* Hero Skeleton */}
      <div className="w-full h-[55vh] min-h-[380px] rounded-2xl bg-zinc-900/60 border border-white/5 animate-pulse mb-10 flex flex-col justify-end p-6 md:p-10">
        <div className="space-y-4 max-w-xl">
          <div className="h-6 w-32 bg-zinc-800 rounded-full" />
          <div className="h-10 w-3/4 bg-zinc-800 rounded-lg" />
          <div className="h-4 w-full bg-zinc-800 rounded" />
          <div className="h-4 w-2/3 bg-zinc-800 rounded" />
          <div className="flex gap-3 pt-2">
            <div className="h-10 w-28 bg-zinc-800 rounded-md" />
            <div className="h-10 w-32 bg-zinc-800 rounded-md" />
          </div>
        </div>
      </div>

      {/* Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-8 w-28 bg-zinc-800 rounded-lg animate-pulse" />
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/30 p-4 md:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
