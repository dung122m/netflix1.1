"use client";

import React from "react";
import { useWatchController } from "./WatchController";
import { WatchlistButton } from "@/components/WatchlistButton";
import { AddToCollectionButton } from "@/components/Collections/AddToCollectionButton";

interface ActiveEpisodeActionButtonsProps {
  movieSlug: string;
  movieTitle: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
  isSeries?: boolean;
  initialEpisodeSlug?: string;
  initialEpisodeName?: string;
}

export const ActiveEpisodeActionButtons: React.FC<ActiveEpisodeActionButtonsProps> = ({
  movieSlug,
  movieTitle,
  poster,
  year,
  quality,
  category,
  isSeries: propIsSeries,
  initialEpisodeSlug,
  initialEpisodeName,
}) => {
  const watchContext = useWatchController();
  const isSeries = watchContext?.isSeries ?? propIsSeries;
  const activeEpisode = watchContext?.activeEpisode;

  // Lấy tập phim hiện tại từ WatchController (client) hoặc fallback từ props ban đầu (server)
  const currentSlug = activeEpisode?.slug || initialEpisodeSlug;
  const currentName = activeEpisode?.name || initialEpisodeName || currentSlug;

  if (!isSeries || !currentSlug) {
    return null;
  }

  const episodeIdentifier = `${movieSlug}__ep__${currentSlug}`;
  const fullTitle = `${movieTitle} - ${currentName}`;

  return (
    <>
      <div className="h-6 w-px bg-white/10 mx-0.5 flex-shrink-0" />
      <WatchlistButton
        movie={{
          slug: episodeIdentifier,
          title: fullTitle,
          poster,
          imageUrl: poster,
          year,
          quality,
          category,
          itemType: "episode",
          seriesSlug: movieSlug,
          seriesTitle: movieTitle,
          episodeSlug: currentSlug,
          episodeName: currentName,
        }}
        label={`Lưu ${currentName || "tập"}`}
        savedLabel={`Đã lưu ${currentName || "tập"}`}
      />
      <AddToCollectionButton
        movie={{
          slug: episodeIdentifier,
          title: fullTitle,
          poster,
          year,
          quality,
          category,
          itemType: "episode",
          seriesSlug: movieSlug,
          seriesTitle: movieTitle,
          episodeSlug: currentSlug,
          episodeName: currentName,
        }}
        label={`Thêm ${currentName || "tập"}`}
      />
    </>
  );
};

export default ActiveEpisodeActionButtons;
