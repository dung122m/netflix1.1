import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cacheService } from "@/lib/cache";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";
import { isSlowProviderSourceUrl } from "@/lib/movieMedia";

export const VIETNAM_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Tính mốc thời gian bắt đầu tuần Thứ 2 00:00:00 (Asia/Ho_Chi_Minh)
 */
export function getStartOfWeekVietnam(nowMs: number = Date.now()): number {
  const vnDate = new Date(nowMs + VIETNAM_TIMEZONE_OFFSET_MS);
  const vnYear = vnDate.getUTCFullYear();
  const vnMonth = vnDate.getUTCMonth();
  const vnDay = vnDate.getUTCDate();
  const dayOfWeek = vnDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfDayMs = Date.UTC(vnYear, vnMonth, vnDay, 0, 0, 0, 0) - VIETNAM_TIMEZONE_OFFSET_MS;
  return startOfDayMs - daysSinceMonday * 24 * 60 * 60 * 1000;
}

/**
 * Tạo weekKey đại diện tuần tại Việt Nam (VD: 2026_10_05)
 */
export function getWeekKeyVietnam(nowMs: number = Date.now()): string {
  const startOfWeekMs = getStartOfWeekVietnam(nowMs);
  const d = new Date(startOfWeekMs + VIETNAM_TIMEZONE_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}_${m}_${day}`;
}

export interface MovieViewStatItem {
  movieSlug: string;
  movieTitle: string;
  poster: string;
  thumb?: string;
  year?: number;
  quality?: string;
  category?: string;
  viewsTotal: number;
  viewsWeek: number;
  lastViewedAt: number;
}

export async function recordMovieViewSupabase(movie: {
  slug: string;
  title: string;
  poster?: string;
  thumb?: string;
  year?: number;
  quality?: string;
  category?: string;
  userId?: string;
  anonymousId?: string;
}): Promise<void> {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error("[recordMovieViewSupabase] SUPABASE_SERVICE_ROLE_KEY is required to record watch history");
  }
  if (!movie.slug) return;
  const now = Date.now();
  const uid = movie.userId || movie.anonymousId || "guest";
  const id = `${uid}_${movie.slug}`;

  const { error } = await adminClient.from("watch_history").upsert(
    {
      id,
      user_id: uid,
      slug: movie.slug,
      title: movie.title || "Phim",
      poster: movie.poster || movie.thumb || "/default-poster.jpg",
      year: movie.year || null,
      quality: movie.quality || "HD",
      category: movie.category || "Phim Hay",
      updated_at: now,
      synced_at: now,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("[recordMovieViewSupabase] Lỗi ghi nhận lịch sử xem vào Supabase watch_history:", error);
    throw error;
  }
}

// Single-Flight Mutex chống cache stampede khi nhiều request cùng MISS trên instance lạnh
const inFlightTrendingResolves = new Map<string, Promise<MovieViewStatItem[]>>();

// Throttle chống bão lệnh DEL Redis khi nhiều lượt xem ghi nhận liên tiếp
let lastTrendingInvalidateTime = 0;
const TRENDING_INVALIDATE_THROTTLE_MS = 60 * 1000; // Tối đa 1 lần xóa mỗi 60 giây

/**
 * Xóa cache tóm tắt Trending Community trên Redis (phục vụ test hoặc admin invalidate)
 * Có cơ chế throttle chống spam lệnh DEL khi lượt xem phát sinh dồn dập
 */
export async function invalidateTrendingSummaryCache(
  timeframe?: "total" | "week",
  limit?: number,
  options?: { force?: boolean; simulateProduction?: boolean }
): Promise<void> {
  const now = Date.now();
  const isTest =
    !options?.simulateProduction &&
    (process.env.NODE_ENV === "test" ||
      process.env.APP_ENV === "test" ||
      process.argv.some((a) => a.includes("--test") || a.includes(".test.ts")));
  if (!options?.force && !isTest && now - lastTrendingInvalidateTime < TRENDING_INVALIDATE_THROTTLE_MS) {
    // Bỏ qua các lệnh DEL lặp lại dồn dập, để cache tự hết hạn theo TTL 15 phút
    return;
  }
  lastTrendingInvalidateTime = now;

  if (timeframe && limit) {
    await cacheService.delete(`trending:community:summary:v1:${timeframe}:${limit}`).catch(() => {});
  } else {
    await Promise.allSettled([
      cacheService.delete(`trending:community:summary:v1:total:10`),
      cacheService.delete(`trending:community:summary:v1:week:10`),
      cacheService.delete(`trending:community:summary:v1:total:20`),
      cacheService.delete(`trending:community:summary:v1:week:20`),
    ]);
  }
}

/**
 * Lấy danh sách phim thịnh hành cộng đồng theo view count thực tế từ watch_history.
 * Hỗ trợ phân định chính xác giữa "total" (Toàn thời gian) và "week" (Thứ 2 00:00 -> Chủ Nhật 23:59:59 Asia/Ho_Chi_Minh).
 * 
 * Kiến trúc 2 tầng Cache tối ưu:
 * 1. Dedicated Summary Cache (trending:community:summary:v1:${timeframe}:${limit}, TTL 3600s)
 * 2. Single-Flight Mutex:
 *    - Đảm bảo khi cache MISS đồng thời nhiều request trên instance lạnh, chỉ có 1 request thực thi resolve.
 */
export async function getTopTrendingCommunitySupabase(
  limit: number = 10,
  timeframe: "total" | "week" = "total"
): Promise<MovieViewStatItem[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const summaryCacheKey = `trending:community:summary:v1:${timeframe}:${safeLimit}`;

  // 1. Kiểm tra L1 Memory & L2 Redis qua CacheService (0ms nếu L1 hit, 1 GET nếu Redis hit)
  try {
    const cached = await cacheService.get<MovieViewStatItem[]>(summaryCacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      const slice = cached.slice(0, safeLimit);
      const hasSlowPoster = slice.some((it) => isSlowProviderSourceUrl(it.poster));
      if (hasSlowPoster) {
        const enrichPayload = slice.map((it) => ({
          slug: it.movieSlug,
          name: it.movieTitle,
          poster_url: it.poster,
          thumb_url: it.thumb,
          year: it.year,
        }));
        await enrichMovieListPosters(enrichPayload, { budgetMs: 1200, stripProxyUrls: true }).catch(() => {});
        let changed = false;
        for (let i = 0; i < slice.length; i++) {
          const ep = enrichPayload[i];
          if (ep?.poster_url && String(ep.poster_url).includes("image.tmdb.org")) {
            slice[i] = {
              ...slice[i],
              poster: String(ep.poster_url),
              thumb: ep.thumb_url && String(ep.thumb_url).includes("image.tmdb.org")
                ? String(ep.thumb_url)
                : String(ep.poster_url),
            };
            changed = true;
          }
        }
        if (changed) {
          cacheService.set(summaryCacheKey, slice, 3600).catch(() => {});
        }
      }
      return slice;
    }
  } catch (err) {
    console.warn("[getTopTrendingCommunitySupabase] Cache read warning:", err);
  }

  // 2. Chống Cache Stampede: gom các request đồng thời trên cùng instance
  const existingResolve = inFlightTrendingResolves.get(summaryCacheKey);
  if (existingResolve) {
    return await existingResolve;
  }

  const resolveTask = (async () => {
    try {
      const items = await resolveTrendingCommunityInternal(safeLimit, timeframe);
      if (items && items.length > 0) {
        // Lưu summary nhẹ (~3-5 KB) vào Redis với TTL 3600s (1 giờ)
        await cacheService.set(summaryCacheKey, items, 3600).catch(() => {});
      }
      return items;
    } finally {
      inFlightTrendingResolves.delete(summaryCacheKey);
    }
  })();

  inFlightTrendingResolves.set(summaryCacheKey, resolveTask);
  return await resolveTask;
}

/**
 * Hàm phân giải danh sách phim thịnh hành từ watch_history (chỉ thực thi khi cache MISS)
 * Không quét bảng analytics_events, tiết kiệm tối đa CPU & IOPS Supabase
 */
async function resolveTrendingCommunityInternal(
  limit: number,
  timeframe: "total" | "week"
): Promise<MovieViewStatItem[]> {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return [];
  }

  try {
    const { data, error } = await adminClient
      .from("watch_history")
      .select("slug, title, poster, year, quality, category, updated_at, synced_at")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error || !data || data.length === 0) return [];

    const now = Date.now();
    const startOfWeekMs = getStartOfWeekVietnam(now);
    const movieMap = new Map<string, MovieViewStatItem>();

    for (const row of data) {
      if (!row.slug) continue;
      const slug = row.slug.toLowerCase();
      const updatedAt = Number(row.updated_at) || Number(row.synced_at) || 0;
      const isWeek = updatedAt >= startOfWeekMs;

      if (timeframe === "week" && !isWeek) {
        continue;
      }

      const existing = movieMap.get(slug);
      if (!existing) {
        movieMap.set(slug, {
          movieSlug: row.slug,
          movieTitle: row.title || row.slug,
          poster: row.poster || "/default-poster.jpg",
          thumb: row.poster || "/default-hero.jpg",
          year: Number(row.year) || undefined,
          quality: row.quality || "HD",
          category: row.category || "Phim Hay",
          viewsTotal: 1,
          viewsWeek: isWeek ? 1 : 0,
          lastViewedAt: updatedAt,
        });
      } else {
        existing.viewsTotal += 1;
        if (isWeek) existing.viewsWeek += 1;
        if (updatedAt > existing.lastViewedAt) {
          existing.lastViewedAt = updatedAt;
        }
      }
    }

    const items = Array.from(movieMap.values());
    items.sort((a, b) => {
      const viewA = timeframe === "week" ? a.viewsWeek : a.viewsTotal;
      const viewB = timeframe === "week" ? b.viewsWeek : b.viewsTotal;
      if (viewB !== viewA) {
        return viewB - viewA;
      }
      return b.lastViewedAt - a.lastViewedAt;
    });

    const topItems = items.slice(0, limit);
    try {
      const enrichPayload = topItems.map((it) => ({
        slug: it.movieSlug,
        name: it.movieTitle,
        poster_url: it.poster,
        thumb_url: it.thumb,
        year: it.year,
      }));
      await enrichMovieListPosters(enrichPayload, { budgetMs: 1800, stripProxyUrls: true });
      for (let i = 0; i < topItems.length; i++) {
        const enriched = enrichPayload[i];
        if (enriched?.poster_url && String(enriched.poster_url).includes("image.tmdb.org")) {
          topItems[i].poster = String(enriched.poster_url);
        }
        if (enriched?.thumb_url && String(enriched.thumb_url).includes("image.tmdb.org")) {
          topItems[i].thumb = String(enriched.thumb_url);
        } else if (topItems[i].poster.includes("image.tmdb.org")) {
          topItems[i].thumb = topItems[i].poster;
        }
      }
    } catch {
      // Giữ nguyên danh sách nếu enrich tạm thời thất bại
    }

    return topItems;
  } catch (err) {
    console.warn("[resolveTrendingCommunityInternal] Error:", err);
    return [];
  }
}
