"use client";

import React from "react";

export const MediaCardSkeleton = () => {
  return (
    <div className="relative aspect-video w-full rounded-md overflow-hidden bg-zinc-900 animate-pulse border border-white/5">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900"></div>
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
        <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
      </div>
    </div>
  );
};

export default MediaCardSkeleton;
