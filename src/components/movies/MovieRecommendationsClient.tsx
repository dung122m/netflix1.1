"use client";

import React, { useState, useEffect } from "react";
import { RecommendationTabs } from "@/components/movies/RecommendationTabs";

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
  hasMartialArts?: boolean;
  initialData?: RecommendationsData | null;
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
  directorName?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  directorMovies?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allMovies: any[];
}

export function RecommendationSkeleton({ variant = "grid" }: { variant?: "grid" | "sidebar" }) {
  if (variant === "sidebar") {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="flex gap-2 pb-2 border-b border-white/[0.08]">
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
          <div key={i} className="aspect-video bg-zinc-900/80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// Module-level in-flight request singleton map để khử trùng lặp hoàn toàn khi Mobile + Desktop cùng mount
const inFlightRecommendations = new Map<string, Promise<RecommendationsData | null>>();
// Module-level in-memory cache chia sẻ tức thì giữa desktop và mobile components trong cùng trang
const clientMemoryRecommendationsCache = new Map<string, RecommendationsData>();

function encodeTaxonomyList(items: Array<{ name: string; slug?: string }> = []): string {
  return items
    .map((item) => {
      const slug = (item?.slug || "").trim();
      const name = (item?.name || "").trim();
      if (!slug && !name) return "";
      return `${slug}~${name}`;
    })
    .filter(Boolean)
    .sort()
    .join(",");
}

function buildRecommendationsGetUrl(payload: {
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
  hasMartialArts?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set("slug", payload.currentMovieSlug);
  if (payload.currentMovieTitle) params.set("title", payload.currentMovieTitle);

  const cats = encodeTaxonomyList(payload.categories);
  if (cats) params.set("cats", cats);

  const ctrs = encodeTaxonomyList(payload.countries);
  if (ctrs) params.set("ctrs", ctrs);

  if (payload.primaryActor) params.set("actor", payload.primaryActor);
  if (payload.primaryDirector) params.set("director", payload.primaryDirector);
  if (payload.year) params.set("year", String(payload.year));
  if (payload.type) params.set("type", payload.type);
  if (payload.tmdbId) params.set("tmdbId", String(payload.tmdbId));
  if (payload.tmdbType) params.set("tmdbType", payload.tmdbType);
  if (payload.hasMartialArts) params.set("martial", "1");

  return `/api/movies/recommendations?${params.toString()}`;
}

function fetchRecommendationsDeduplicated(
  cacheKey: string,
  requestUrl: string
): Promise<RecommendationsData | null> {
  // 1. Nếu đang có request in-flight cùng cacheKey -> tái sử dụng Promise ngay lập tức
  if (inFlightRecommendations.has(cacheKey)) {
    return inFlightRecommendations.get(cacheKey)!;
  }

  // 2. Tạo Promise fetch GET (cacheable trên Cloudflare CDN & browser)
  const promise = fetch(requestUrl)
    .then((res) => (res.ok ? res.json() : null))
    .then((recData) => {
      if (recData && Array.isArray(recData.allMovies) && recData.allMovies.length > 0) {
        clientMemoryRecommendationsCache.set(cacheKey, recData);
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
  hasMartialArts,
  initialData = null,
  variant = "grid",
}: MovieRecommendationsClientProps) {
  const hasValidInitialData = Boolean(
    initialData && Array.isArray(initialData.allMovies) && initialData.allMovies.length > 0
  );
  const [data, setData] = useState<RecommendationsData | null>(
    hasValidInitialData ? initialData : null
  );
  const [loading, setLoading] = useState(!hasValidInitialData);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean | null>(null);

  useEffect(() => {
    const hasMatchMedia =
      typeof window !== "undefined" && typeof window.matchMedia === "function";
    const mediaQuery = hasMatchMedia ? window.matchMedia("(min-width: 1024px)") : null;
    const isDesktop = mediaQuery ? mediaQuery.matches : variant === "sidebar";
    setIsDesktopViewport(isDesktop);

    const handleMediaChange = (e: MediaQueryListEvent) => setIsDesktopViewport(e.matches);
    mediaQuery?.addEventListener("change", handleMediaChange);

    const isActiveHere = variant === "sidebar" ? isDesktop : !isDesktop;
    if (!isActiveHere) {
      return () => mediaQuery?.removeEventListener("change", handleMediaChange);
    }

    let isMounted = true;
    const cacheKey = `nanaflix_rec_v4_${currentMovieSlug}_${tmdbId || ""}`;

    // 0. Nếu server đã bơm sẵn dữ liệu (SSR HIT từ L1/Redis) -> lưu ngay vào client cache và bỏ qua fetch
    if (hasValidInitialData && initialData) {
      clientMemoryRecommendationsCache.set(cacheKey, initialData);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(initialData));
      } catch {}
      setData(initialData);
      setLoading(false);
      return () => mediaQuery?.removeEventListener("change", handleMediaChange);
    }

    // 1. Kiểm tra cache trong RAM trước (0ms response, chia sẻ giữa desktop và mobile)
    if (clientMemoryRecommendationsCache.has(cacheKey)) {
      setData(clientMemoryRecommendationsCache.get(cacheKey)!);
      setLoading(false);
      return () => mediaQuery?.removeEventListener("change", handleMediaChange);
    }

    // 2. Kiểm tra cache trong sessionStorage (0ms response)
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.allMovies) && parsed.allMovies.length > 0) {
          clientMemoryRecommendationsCache.set(cacheKey, parsed);
          setData(parsed);
          setLoading(false);
          return () => mediaQuery?.removeEventListener("change", handleMediaChange);
        }
      }
    } catch {}

    setLoading(true);

    const resolvedHasMartialArts =
      typeof hasMartialArts === "boolean"
        ? hasMartialArts
        : /võ thuật|kung fu|martial|quyền|kiếm hiệp/i.test(contentText || "");

    const requestUrl = buildRecommendationsGetUrl({
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
      hasMartialArts: resolvedHasMartialArts,
    });

    // 3. Fetch GET cacheable qua singleton Promise khử trùng lặp ngay trong lần mount đầu tiên
    fetchRecommendationsDeduplicated(cacheKey, requestUrl)
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
      mediaQuery?.removeEventListener("change", handleMediaChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMovieSlug, tmdbId, variant]);

  const isActiveViewport =
    isDesktopViewport === null ||
    (variant === "sidebar" ? isDesktopViewport : !isDesktopViewport);

  if (!isActiveViewport) {
    return null;
  }

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
      directorName={data.directorName || primaryDirector}
      genreMovies={data.genreMovies}
      countryMovies={data.countryMovies}
      actorMovies={data.actorMovies}
      directorMovies={data.directorMovies}
      allMovies={data.allMovies}
      variant={variant}
    />
  );
}

export default MovieRecommendationsClient;
