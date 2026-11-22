"use client";

import React from "react";
import {
  RecommendedMovieCard,
  RecommendedMovieCardProps,
  RecommendedMovieItem,
} from "./RecommendedMovieCard";

export type { RecommendedMovieItem, RecommendedMovieCardProps };
export type RecommendedSidebarCardProps = RecommendedMovieCardProps;

/**
 * Thẻ phim đề xuất dạng sidebar (wrapper mỏng tương thích ngược cho RecommendedMovieCard với variant="sidebar")
 */
export const RecommendedSidebarCard = React.memo(function RecommendedSidebarCard(
  props: RecommendedSidebarCardProps
) {
  return <RecommendedMovieCard {...props} variant="sidebar" />;
});

export default RecommendedSidebarCard;
