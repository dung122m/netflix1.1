"use client";

import { useEffect } from "react";
import { saveWatchHistory } from "@/lib/watchHistory";

interface TrackHistoryClientProps {
  slug: string;
  title: string;
  poster: string;
  thumb?: string;
  episodeName?: string;
  episodeSlug?: string;
  year?: number | string;
  quality?: string;
  category?: string;
}

export default function TrackHistoryClient({
  slug,
  title,
  poster,
  thumb,
  episodeName,
  episodeSlug,
  year,
  quality,
  category,
}: TrackHistoryClientProps) {
  useEffect(() => {
    if (slug) {
      saveWatchHistory({
        slug,
        title,
        poster,
        thumb,
        episodeName,
        episodeSlug,
        year,
        quality,
        category,
      });
    }
  }, [slug, title, poster, thumb, episodeName, episodeSlug, year, quality, category]);

  return null;
}
