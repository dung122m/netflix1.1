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
  tmdbId?: number | string;
  tmdbType?: string;
  contentText?: string;
  variant?: "grid" | "sidebar";
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

export function RecommendationSkeleton({ variant = "grid" }: { variant?: "grid" | "sidebar" }) {
  if (variant === "sidebar") {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex gap-2 pb-2 border-b border-white/10">
          <div className="h-7 w-24 bg-zinc-800 rounded-xl" />
          <div className="h-7 w-20 bg-zinc-900 rounded-xl" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2.5 p-1.5 rounded-xl bg-zinc-900/40">
              <div className="aspect-video w-[110px] bg-zinc-800 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-zinc-800 rounded w-4/5" />
                <div className="h-2.5 bg-zinc-900 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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

// Module-level in-flight request singleton map để khử trùng lặp hoàn toàn khi Mobile + Desktop cùng mount
const inFlightRecommendations = new Map<string, Promise<RecommendationsData | null>>();

function fetchRecommendationsDeduplicated(
  cacheKey: string,
  payload: Record<string, unknown>
): Promise<RecommendationsData | null> {
  // 1. Nếu đang có request in-flight cùng cacheKey -> tái sử dụng Promise ngay lập tức
  if (inFlightRecommendations.has(cacheKey)) {
    return inFlightRecommendations.get(cacheKey)!;
  }

  // 2. Tạo Promise fetch mới
  const promise = fetch("/api/movies/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => (res.ok ? res.json() : null))
    .then((recData) => {
      if (recData && Array.isArray(recData.allMovies) && recData.allMovies.length > 0) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(recData));
        } catch {}
        return recData;
      }
      return null;
    })
    .catch((err) => {
      console.warn("[MovieRecommendationsClient] Lỗi tải đề xuất:", err);
      return null;
    })
    .finally(() => {
      // Dọn dẹp in-flight entry sau khi hoàn tất
      inFlightRecommendations.delete(cacheKey);
    });

  inFlightRecommendations.set(cacheKey, promise);
  return promise;
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
  tmdbId,
  tmdbType,
  contentText = "",
  variant = "grid",
}: MovieRecommendationsClientProps) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `nanaflix_rec_${currentMovieSlug}_${tmdbId || ""}`;

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

    // 2. Fetch recommendations qua singleton Promise khử trùng lặp (Mobile + Desktop chia sẻ 1 request duy nhất)
    fetchRecommendationsDeduplicated(cacheKey, {
      currentMovieSlug,
      currentMovieTitle,
      categories,
      countries,
      primaryActor,
      primaryDirector,
      year,
      type,
      tmdbId,
      tmdbType,
      contentText,
    })
      .then((recData) => {
        if (!isMounted) return;
        if (recData && Array.isArray(recData.allMovies) && recData.allMovies.length > 0) {
          setData(recData);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMovieSlug, tmdbId]);

  if (loading) {
    return <RecommendationSkeleton variant={variant} />;
  }

  if (!data || !Array.isArray(data.allMovies) || data.allMovies.length === 0) {
    return null;
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
      variant={variant}
    />
  );
}

export default MovieRecommendationsClient;
