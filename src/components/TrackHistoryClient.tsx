"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { trackMovieView } from "@/lib/analyticsClient";

interface TrackHistoryClientProps {
  slug: string;
  title: string;
  poster?: string;
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
}: TrackHistoryClientProps) {
  const { user, loading } = useAuth();
  const hasTrackedViewRef = useRef<string | null>(null);

  useEffect(() => {
    if (slug) {
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
  }, [slug, title, user?.uid, loading]);

  return null;
}

