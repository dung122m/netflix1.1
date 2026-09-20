import React from "react";

export default function LiveLoading() {
  return (
    <div className="bg-black min-h-screen text-white pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* HEADER SKELETON */}
      <div className="space-y-3 border-b border-white/10 pb-6">
        <div className="h-6 w-32 bg-red-600/20 rounded-full" />
        <div className="h-10 w-72 bg-white/15 rounded-xl" />
        <div className="h-4 w-96 bg-white/10 rounded-lg" />
      </div>

      {/* MATCH GRID SKELETON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-44 rounded-2xl bg-zinc-900/80 border border-white/5 p-4 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 w-24 bg-white/10 rounded-full" />
              <div className="h-5 w-16 bg-red-600/30 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-5 w-full bg-white/15 rounded" />
              <div className="h-4 w-2/3 bg-white/10 rounded" />
            </div>
            <div className="h-8 w-full bg-white/10 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
