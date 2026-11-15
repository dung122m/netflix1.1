"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { MovieReviewsContainerProps } from "./MovieReviewsContainer";

const MovieReviewsContainer = dynamic<MovieReviewsContainerProps>(
  () => import("./MovieReviewsContainer").then((m) => m.MovieReviewsContainer),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full py-12 flex flex-col items-center justify-center gap-3 text-zinc-500"
        aria-label="Đang tải khu vực bình luận"
      >
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-netflix-red animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">Đang tải bình luận...</span>
      </div>
    ),
  }
);

export function MovieReviewsHost(props: MovieReviewsContainerProps) {
  return <MovieReviewsContainer {...props} />;
}
