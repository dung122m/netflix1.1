import React from "react";

export default function MovieDetailLoading() {
  return (
    <div className="bg-black min-h-screen text-white pt-20 pb-20 px-2 sm:px-4 md:px-8">
      {/* Video Player Skeleton */}
      <div className="w-full max-w-[1800px] mx-auto aspect-video bg-zinc-900/80 rounded-xl border border-white/10 animate-pulse flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-zinc-800" />
      </div>

      {/* Detail & Episodes Skeleton */}
      <div className="max-w-7xl mx-auto mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-zinc-900/40 p-6 space-y-4 animate-pulse">
          <div className="h-10 w-2/3 bg-zinc-800 rounded-lg" />
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-zinc-800 rounded" />
            <div className="h-6 w-16 bg-zinc-800 rounded" />
            <div className="h-6 w-20 bg-zinc-800 rounded" />
          </div>
          <div className="h-4 w-full bg-zinc-800 rounded" />
          <div className="h-4 w-5/6 bg-zinc-800 rounded" />
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-6 animate-pulse">
          <div className="h-6 w-36 bg-zinc-800 rounded mb-4" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-800 rounded" />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
