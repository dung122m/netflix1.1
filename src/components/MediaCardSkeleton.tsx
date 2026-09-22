"use client";

import React from "react";

export const MediaCardSkeleton = () => {
  return (
    <div className="relative aspect-[2/3] sm:aspect-video w-full rounded-2xl overflow-hidden bg-zinc-950 animate-pulse border border-white/10 shadow-md">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/80 via-zinc-900 to-zinc-950"></div>
      <div className="absolute bottom-3.5 left-3.5 right-3.5 space-y-2">
        <div className="h-4 bg-zinc-800 rounded-md w-3/4"></div>
        <div className="h-3 bg-zinc-800/60 rounded-md w-1/2"></div>
      </div>
    </div>
  );
};

export default MediaCardSkeleton;
