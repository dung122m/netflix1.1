"use client";

import React, { useState, useEffect } from "react";
import { RecommendationTabs } from "@/components/RecommendationTabs";

interface MovieRecommendationsClientProps {
  currentMovieSlug: string;
  currentMovieTitle: string;
  categories?: Array<{ name: string; slug?: string }>;
  countries?: Array<{ name: string; slug?: string }>;
  primaryActor?: string;
  primaryDirector?: string;
  year?: number | string;
  type?: string;
  contentText?: string;
}

interface RecommendationsData {
  genreName?: string;
  countryName?: string;
  actorName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  genreMovies: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  countryMovies: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  actorMovies?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allMovies: any[];
}

export function RecommendationSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">
        <div className="h-9 w-28 bg-zinc-800 rounded-full" />
        <div className="h-9 w-28 bg-zinc-900 rounded-full" />
        <div className="h-9 w-28 bg-zinc-900 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-video bg-zinc-900/80 rounded-2xl border border-white/5" />
        ))}
      </div>
    </div>
  );
}

export function MovieRecommendationsClient({
  currentMovieSlug,
  currentMovieTitle,
  categories = [],
  countries = [],
  primaryActor,
  primaryDirector,
  year,
  type,
  contentText = "",
}: MovieRecommendationsClientProps) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `nanaflix_rec_${currentMovieSlug}`;

    // 1. Kiểm tra cache trong sessionStorage (0ms response)
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.allMovies) && parsed.allMovies.length > 0) {
          setData(parsed);
          setLoading(false);
          return;
        }
      }
    } catch {}

    setLoading(true);

    // 2. Fetch recommendations ngầm không block trang chính
    fetch("/api/movies/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentMovieSlug,
        currentMovieTitle,
        categories,
        countries,
        primaryActor,
        primaryDirector,
        year,
        type,
        contentText,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((recData) => {
        if (!isMounted) return;
        if (recData && Array.isArray(recData.allMovies) && recData.allMovies.length > 0) {
          setData(recData);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(recData));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn("[MovieRecommendationsClient] Lỗi tải đề xuất:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentMovieSlug, currentMovieTitle, categories, countries, primaryActor, primaryDirector, year, type, contentText]);

  if (loading || !data || data.allMovies.length === 0) {
    return <RecommendationSkeleton />;
  }

  return (
    <RecommendationTabs
      currentMovieTitle={currentMovieTitle}
      genreName={data.genreName}
      countryName={data.countryName}
      actorName={data.actorName || primaryActor}
      genreMovies={data.genreMovies}
      countryMovies={data.countryMovies}
      actorMovies={data.actorMovies}
      allMovies={data.allMovies}
    />
  );
}

export default MovieRecommendationsClient;
