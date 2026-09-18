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
  country?: string;
  type?: string;
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
  country,
  type,
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
        country,
        type,
      });
    }
  }, [slug, title, poster, thumb, episodeName, episodeSlug, year, quality, category, country, type]);

  return null;
}
