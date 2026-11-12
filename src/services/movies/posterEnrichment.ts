import { isBrokenImageUrl } from "@/lib/movieMedia";
import { getTmdbMediaImagesById, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { searchAniListPoster } from "@/services/aniListService";

export interface PosterEnrichmentOptions {
  /** Max time to wait before aborting remaining in-flight lookups and returning. */
  budgetMs?: number;
  /** Whether to clear legacy `/api/img-thumb` wrapper strings on fallback. */
  stripProxyUrls?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAnimeOrAnimationItem(item: any): boolean {
  return (
    item.type === "hoathinh" ||
    item.type === "hoat-hinh" ||
    Boolean(
      item.category?.some(
        (c: { slug?: string; name?: string }) =>
          c.slug === "hoat-hinh" || c.name?.toLowerCase().includes("hoạt hình")
      )
    )
  );
}

function shouldUpgradeThumbUrl(thumbUrl: unknown): boolean {
  if (!thumbUrl || typeof thumbUrl !== "string") return true;
  if (isBrokenImageUrl(thumbUrl)) return true;
  return thumbUrl.includes("phimimg.com");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyPosterFallback(item: any, stripProxyUrls: boolean): void {
  if (!item.poster_url || isBrokenImageUrl(item.poster_url)) {
    if (item.thumb_url && !isBrokenImageUrl(item.thumb_url)) {
      item.poster_url = item.thumb_url;
    } else {
      item.poster_url = "/default-poster.jpg";
    }
  }
  if (stripProxyUrls) {
    if (typeof item.poster_url === "string" && item.poster_url.includes("/api/img-thumb")) {
      item.poster_url = "";
    }
    if (typeof item.thumb_url === "string" && item.thumb_url.includes("/api/img-thumb")) {
      item.thumb_url = "";
    }
  }
}

/**
 * Register task settlement with Vercel/Next.js `waitUntil` when running inside a server
 * request lifecycle so the container stays alive until aborted sockets tear down cleanly.
 * Avoids importing `next/server` here because transitive modules are shared with client bundles.
 */
function scheduleAfterSettlement(task: Promise<unknown>): void {
  if (typeof window !== "undefined") return;
  try {
    const reqCtx = (
      globalThis as Record<
        symbol,
        { get?: () => { waitUntil?: (promise: Promise<unknown>) => void } | undefined } | undefined
      >
    )[Symbol.for("@next/request-context")];
    reqCtx?.get?.()?.waitUntil?.(task.catch(() => undefined));
  } catch {
    // Outside Next.js/Vercel request scope (CLI / unit tests): safe no-op
  }
}

/**
 * Upgrade movie list posters & thumbs to TMDB CDN (with AniList fallback for animation).
 * Ties an `AbortController` directly to `budgetMs` and registers settlement via `after()` so
 * SSR never hangs and stalled HTTP/2 sockets never remain open past serverless freeze.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enrichMovieListPosters(movieList: any[], options: PosterEnrichmentOptions = {}): Promise<void> {
  if (!Array.isArray(movieList) || movieList.length === 0) return;

  const budgetMs = options.budgetMs ?? 3000;
  const stripProxyUrls = options.stripProxyUrls ?? false;
  const controller = new AbortController();
  const { signal } = controller;
  const settledItems = new WeakSet<object>();

  // Ensure every item starts with a valid non-broken image before external lookups settle.
  for (const item of movieList) {
    if (item) applyPosterFallback(item, false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalizeFallback = (item: any) => {
    if (!item || settledItems.has(item)) return;
    applyPosterFallback(item, stripProxyUrls);
    settledItems.add(item);
  };

  const work = Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    movieList.map(async (item: any) => {
      if (!item) return;
      if (signal.aborted) {
        finalizeFallback(item);
        return;
      }

      // 1. Direct TMDB ID lookup (returns both poster + backdrop in 1 roundtrip when uncached)
      if (item.tmdb?.id) {
        try {
          const tmdbLookupType = item.tmdb.type || item.type;
          const imgs = await getTmdbMediaImagesById(item.tmdb.id, tmdbLookupType, signal);
          if (imgs.posterUrl) {
            item.poster_url = imgs.posterUrl;
            if (shouldUpgradeThumbUrl(item.thumb_url)) {
              item.thumb_url = imgs.backdropUrl || imgs.posterUrl;
            }
            settledItems.add(item);
            return;
          }
        } catch {}
      }

      if (signal.aborted) {
        finalizeFallback(item);
        return;
      }

      // 2. Title search whenever poster or thumb is still non-TMDB (or broken / phimimg.com)
      const posterNonTmdb =
        !item.poster_url ||
        !String(item.poster_url).includes("image.tmdb.org") ||
        String(item.poster_url).includes("phimimg.com") ||
        isBrokenImageUrl(item.poster_url);
      const thumbIsPhimimg = typeof item.thumb_url === "string" && item.thumb_url.includes("phimimg.com");

      if (!posterNonTmdb && !thumbIsPhimimg) {
        settledItems.add(item);
        return;
      }

      const primaryCandidates = Array.from(
        new Set(
          [
            item.origin_name && item.origin_name !== item.name ? item.origin_name : null,
            item.name,
            item.slug ? String(item.slug).replace(/-/g, " ") : null,
          ].filter(Boolean) as string[]
        )
      ).slice(0, 2);

      let foundPoster = false;
      for (const query of primaryCandidates) {
        if (signal.aborted) break;
        try {
          const res = await searchTmdbPosterByTitle(query, item.year, item.type, signal);
          if (res?.posterUrl) {
            if (posterNonTmdb) {
              item.poster_url = res.posterUrl;
            }
            if (shouldUpgradeThumbUrl(item.thumb_url)) {
              item.thumb_url = res.backdropUrl || res.posterUrl;
            }
            foundPoster = true;
            break;
          }
        } catch {}
      }

      // 3. AniList fallback for animation titles when TMDB did not match
      if (!foundPoster && posterNonTmdb && !signal.aborted && isAnimeOrAnimationItem(item)) {
        try {
          const aniRes = await searchAniListPoster(
            item.name,
            item.origin_name,
            item.alternative_names,
            signal
          );
          if (aniRes?.posterUrl) {
            item.poster_url = aniRes.posterUrl;
            if (shouldUpgradeThumbUrl(item.thumb_url)) {
              item.thumb_url = aniRes.backdropUrl || aniRes.posterUrl;
            }
            foundPoster = true;
          }
        } catch {}
      }

      if (!foundPoster) {
        finalizeFallback(item);
      } else {
        settledItems.add(item);
      }
    })
  );

  // Keep container alive until any aborted lookup tears down cleanly on Vercel.
  scheduleAfterSettlement(work);

  let budgetTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      work,
      new Promise<void>((resolve) => {
        budgetTimer = setTimeout(() => {
          controller.abort(new DOMException(`Poster enrichment budget (${budgetMs}ms) exceeded`, "AbortError"));
          resolve();
        }, budgetMs);
      }),
    ]);
  } finally {
    if (budgetTimer !== undefined) {
      clearTimeout(budgetTimer);
    }
  }

  // Ensure any items still mid-flight at budget expiration strip legacy proxy URLs before rendering.
  if (signal.aborted) {
    for (const item of movieList) {
      finalizeFallback(item);
    }
  }
}
