"use client";

import { useEffect, useRef } from "react";
import { saveWatchHistory } from "@/lib/watchHistory";
import { useAuth } from "@/context/AuthContext";
import { trackMovieView } from "@/lib/analyticsClient";

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
  actor?: string[];
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
  actor,
}: TrackHistoryClientProps) {
  const { user, loading } = useAuth();
  const hasTrackedViewRef = useRef<string | null>(null);
  const actorKey = Array.isArray(actor) ? actor.join(",") : "";

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
        actor,
      });

      // Track movie view for analytics once Firebase auth hydration completes
      if (!loading && hasTrackedViewRef.current !== slug) {
        hasTrackedViewRef.current = slug;
        trackMovieView({
          movieSlug: slug,
          movieTitle: title,
          userId: user?.uid,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, title, poster, thumb, episodeName, episodeSlug, year, quality, category, country, type, actorKey, user?.uid, loading]);

  return null;
}

