import { isBrokenImageUrl, isSlowProviderSourceUrl } from "@/lib/movieMedia";
import { getTmdbMediaImagesById, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { isCorruptedTmdbId, isTmdbPayloadMatchingMovie } from "@/services/tmdb/tmdbSanityGuard";
import { cacheService } from "@/lib/cache";

export interface PosterEnrichmentOptions {
  /** Max time to wait before aborting remaining in-flight lookups and returning. */
  budgetMs?: number;
  /** Whether to clear legacy `/api/img-thumb` wrapper strings on fallback. */
  stripProxyUrls?: boolean;
}


function shouldUpgradeThumbUrl(thumbUrl: unknown): boolean {
  if (!thumbUrl || typeof thumbUrl !== "string") return true;
  if (isBrokenImageUrl(thumbUrl)) return true;
  return isSlowProviderSourceUrl(thumbUrl);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fastBatchEnrichFromCache(movieList: any[]): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const needsLookup: Array<{ item: any; key: string }> = [];
  const keys: string[] = [];

  for (const item of movieList) {
    if (!item) continue;
    if (item.poster_url && String(item.poster_url).includes("image.tmdb.org")) continue;

    if (item.tmdb?.id) {
      if (isCorruptedTmdbId(item.tmdb.id, item)) {
        item.tmdb = undefined;
        continue;
      }
      const cleanType = item.tmdb.type === "tv" || item.tmdb.type === "series" ? "tv" : "movie";
      const key = `tmdb:images:v3:${cleanType}:${item.tmdb.id}`;
      keys.push(key);
      needsLookup.push({ item, key });
    }
    if (item.slug) {
      const cleanKey = String(item.slug).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 100);
      const key = `tmdb:fallback_poster:v3:${cleanKey}`;
      if (!keys.includes(key)) {
        keys.push(key);
        needsLookup.push({ item, key });
      }
    }
  }

  if (keys.length > 0) {
    let timer: NodeJS.Timeout | null = null;
    try {
      const timeoutPromise = new Promise<null[]>((resolve) => {
        timer = setTimeout(() => resolve(new Array(keys.length).fill(null)), 120);
      });

      const results = await Promise.race([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cacheService.mget<any>(keys),
        timeoutPromise,
      ]);

      if (Array.isArray(results)) {
        for (let i = 0; i < needsLookup.length; i++) {
          const hit = results[i];
          if (hit && typeof hit === "object") {
            const { item } = needsLookup[i];
            if (hit.releaseDate || hit.title || hit.originalTitle) {
              const matches = isTmdbPayloadMatchingMovie(
                {
                  release_date: hit.releaseDate,
                  title: hit.title,
                  original_title: hit.originalTitle,
                  alternative_titles: hit.altTitles,
                },
                item
              );
              if (!matches) {
                item.tmdb = undefined;
                continue;
              }
            }
            if (hit.posterUrl) {
              item.poster_url = hit.posterUrl;
              item.posterUrl = hit.posterUrl;
              if (item.poster_url_webp) item.poster_url_webp = hit.posterUrl;
              if (hit.backdropUrl) {
                item.thumb_url = hit.backdropUrl;
                item.thumbUrl = hit.backdropUrl;
                if (item.thumb_url_webp) item.thumb_url_webp = hit.backdropUrl;
              }
            }
          }
        }
      }
    } catch { } finally {
      if (timer !== null) {
        clearTimeout(timer);
      }
    }
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

  const budgetMs = options.budgetMs ?? 0;
  const stripProxyUrls = options.stripProxyUrls ?? false;

  // 1. Luôn thực hiện tra cứu siêu tốc từ cache Redis + RAM + Direct TMDB ID (chỉ mất ~20-50ms)
  // để SSR gắn thẳng link image.tmdb.org vào HTML ban đầu, tránh việc client phải thấy ảnh cũ rồi mới đổi sang TMDb!
  await fastBatchEnrichFromCache(movieList);

  // Nếu budgetMs <= 0: Không gọi mạng tìm kiếm title TMDb (tránh tốn Active CPU); chỉ hoàn thiện ảnh trong RAM (0ms)
  if (budgetMs <= 0) {
    for (const item of movieList) {
      if (item) applyPosterFallback(item, stripProxyUrls);
    }
    return;
  }

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
      if (
        item.poster_url &&
        String(item.poster_url).includes("image.tmdb.org") &&
        !shouldUpgradeThumbUrl(item.thumb_url)
      ) {
        settledItems.add(item);
        return;
      }
      if (signal.aborted) {
        finalizeFallback(item);
        return;
      }

      // 1. Direct TMDB ID lookup (returns both poster + backdrop in 1 roundtrip when uncached)
      if (item.tmdb?.id) {
        if (isCorruptedTmdbId(item.tmdb.id, item)) {
          item.tmdb = undefined;
        } else {
          try {
            const tmdbLookupType = item.tmdb.type || item.type;
            const imgs = await getTmdbMediaImagesById(item.tmdb.id, tmdbLookupType, signal, item);
            if (imgs.posterUrl) {
              item.poster_url = imgs.posterUrl;
              item.posterUrl = imgs.posterUrl;
              if (item.poster_url_webp) item.poster_url_webp = imgs.posterUrl;
              if (shouldUpgradeThumbUrl(item.thumb_url)) {
                item.thumb_url = imgs.backdropUrl || imgs.posterUrl;
                item.thumbUrl = imgs.backdropUrl || imgs.posterUrl;
                if (item.thumb_url_webp) item.thumb_url_webp = imgs.backdropUrl || imgs.posterUrl;
              }
              settledItems.add(item);
              return;
            } else {
              item.tmdb = undefined;
            }
          } catch { }
        }
      }

      if (signal.aborted) {
        finalizeFallback(item);
        return;
      }

      // 2. Title search whenever poster or thumb is still non-TMDB (or broken / slow provider like phimimg/nguonc)
      const posterNonTmdb =
        !item.poster_url ||
        !String(item.poster_url).includes("image.tmdb.org") ||
        isSlowProviderSourceUrl(item.poster_url) ||
        isBrokenImageUrl(item.poster_url);
      const thumbIsSlow = typeof item.thumb_url === "string" && isSlowProviderSourceUrl(item.thumb_url);

      if (!posterNonTmdb && !thumbIsSlow) {
        settledItems.add(item);
        return;
      }

      const hasVietnameseName = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(item.name || "");
      const isVietnameseCountry =
        hasVietnameseName ||
        Boolean(item.countries?.some((c: string) => String(c).toLowerCase().includes("viet"))) ||
        Boolean(
          Array.isArray(item.country) &&
          item.country.some((c: unknown) => {
            if (typeof c === "object" && c !== null) {
              const obj = c as { name?: string; slug?: string };
              return (obj.name || obj.slug || "").toLowerCase().includes("viet");
            }
            return String(c).toLowerCase().includes("viet");
          })
        ) ||
        (typeof item.country === "string" && item.country.toLowerCase().includes("viet"));

      // Phim có tên tiếng Việt / Việt Nam: Luôn ưu tiên tên tiếng Việt lên đầu để tránh trường hợp origin_name bị scraper dịch tự động (như Xóm Nhỏ -> Hamlet).
      // Phim quốc tế: Ưu tiên origin_name để tìm chuẩn xác trên TMDb quốc tế.
      const rawCandidates = isVietnameseCountry
        ? [item.name, item.slug ? String(item.slug).replace(/-/g, " ") : null, item.origin_name]
        : [item.origin_name, item.name, item.slug ? String(item.slug).replace(/-/g, " ") : null];

      const primaryCandidates = Array.from(
        new Set(
          rawCandidates
            .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
            .map((s) => s.trim())
        )
      ).slice(0, 3);

      let foundPoster = false;
      for (const query of primaryCandidates) {
        if (signal.aborted) break;
        try {
          const res = await searchTmdbPosterByTitle(
            query,
            item.year,
            item.type,
            signal,
            isVietnameseCountry ? "VN" : undefined
          );
          if (res?.posterUrl) {
            if (posterNonTmdb) {
              item.poster_url = res.posterUrl;
              item.posterUrl = res.posterUrl;
              item.poster_url_webp = res.posterUrl;
            }
            if (shouldUpgradeThumbUrl(item.thumb_url)) {
              item.thumb_url = res.backdropUrl || res.posterUrl;
              item.thumbUrl = res.backdropUrl || res.posterUrl;
              item.thumb_url_webp = res.backdropUrl || res.posterUrl;
            }
            if (item.slug) {
              const cleanKey = String(item.slug).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 100);
              cacheService
                .set(
                  `tmdb:fallback_poster:v3:${cleanKey}`,
                  {
                    posterUrl: res.posterUrl,
                    backdropUrl: res.backdropUrl,
                    title: res.title || item.name,
                    originalTitle: res.originalTitle || item.origin_name,
                    releaseDate: res.releaseDate || (item.year ? String(item.year) : undefined),
                  },
                  30 * 86400
                )
                .catch(() => {});
            }
            foundPoster = true;
            break;
          }
        } catch { }
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
          // Cho phép SSR trả kết quả sớm để giữ TTFB siêu tốc,
          // KHÔNG abort controller để các tác vụ tìm ảnh TMDb chạy ngầm tiếp tục hoàn tất và lưu vào Redis.
          resolve();
        }, budgetMs);
      }),
    ]);
  } finally {
    if (budgetTimer !== undefined) {
      clearTimeout(budgetTimer);
    }
  }

  // Với các phim chưa kịp có kết quả tại thời điểm hết budget SSR, áp dụng fallback an toàn cho lần render này
  for (const item of movieList) {
    if (item && !settledItems.has(item)) {
      finalizeFallback(item);
    }
  }
}
