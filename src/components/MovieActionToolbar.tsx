"use client";

import React, { useState, useEffect } from "react";
import {
  Film,
  Bookmark,
  Check,
  FolderHeart,
  Share2,
  Smartphone,
  Flag,
} from "lucide-react";
import { isInWatchlist } from "@/lib/watchlist";
import { TrailerModal } from "@/components/TrailerModal";
import { WatchlistButton } from "@/components/WatchlistButton";
import { AddToCollectionButton } from "@/components/Collections/AddToCollectionButton";
import { ShareButton } from "@/components/ShareButton";
import { MobileQrModal } from "@/components/MobileQrModal";
import { ReportIssueModal } from "@/components/ReportIssueModal";

interface MovieActionToolbarProps {
  movie: {
    slug: string;
    title: string;
    poster?: string;
    year?: string | number;
    quality?: string;
    category?: { name: string }[];
    trailer_url?: string | null;
  };
  title: string;
  slug: string;
  activeEpisode?: { slug?: string; name?: string } | null;
}

export function MovieActionToolbar({
  movie,
  title,
  slug,
  activeEpisode,
}: MovieActionToolbarProps) {
  const posterUrl = movie.poster || "/default-poster.jpg";

  return (
    <div className="mt-4 sm:mt-5 pt-3.5 border-t border-white/10">
      {/* Scrollable single-row toolbar — never wraps */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1 pb-0.5">

        {/* === NHÓM CHÍNH === */}
        {/* Xem Trailer */}
        <TrailerModal trailerUrl={movie.trailer_url} title={title} />

        {/* Separator */}
        <div className="w-px h-5 bg-white/10 flex-shrink-0 mx-0.5" />

        {/* Yêu thích */}
        <WatchlistButton
          movie={{
            slug: movie.slug,
            title,
            poster: posterUrl,
            year: movie.year,
            quality: movie.quality,
            category: movie.category?.[0]?.name,
          }}
        />

        {/* Bộ sưu tập */}
        <AddToCollectionButton
          movie={{
            slug: movie.slug,
            title,
            poster: posterUrl,
            year: movie.year,
            quality: movie.quality,
            category: movie.category?.[0]?.name,
          }}
        />

        {/* Spacer đẩy nhóm phụ sang phải */}
        <div className="flex-1 min-w-0" />

        {/* === NHÓM PHỤ === */}
        {/* Separator — chỉ show trên sm+ */}
        <div className="w-px h-5 bg-white/10 flex-shrink-0 mx-0.5 hidden sm:block" />

        {/* Chia sẻ */}
        <ShareButton title={title} />

        {/* QR Phone */}
        <MobileQrModal
          title={title}
          movieSlug={slug}
          activeEpisodeSlug={activeEpisode?.slug}
          activeEpisodeName={activeEpisode?.name}
        />
      </div>
    </div>
  );
}
