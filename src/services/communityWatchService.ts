import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTopMovieSlugsFromAnalytics, getStartOfWeekVietnam } from "@/services/analyticsService";
import { movieApi } from "@/services/movies/service";
import { pickBestMoviePoster, pickBestMovieThumb, isBrokenImageUrl } from "@/lib/movieMedia";
import { getTmdbPosterUrl, searchTmdbPosterByTitle } from "@/services/tmdbService";
import { cacheService } from "@/lib/cache";

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
 * Lấy danh sách phim thịnh hành cộng đồng theo view count thực tế từ Analytics Pipeline.
 * Hỗ trợ phân định chính xác giữa "total" (Toàn thời gian) và "week" (Thứ 2 00:00 -> Chủ Nhật 23:59:59 Asia/Ho_Chi_Minh).
 * 
 * Kiến trúc 2 tầng Cache tối ưu:
 * 1. Dedicated Summary Cache (trending:community:summary:v1:${timeframe}:${limit}, TTL 600s):
 *    - Cache HIT chỉ tốn 1 Redis GET (~3-5 KB), TUYỆT ĐỐI KHÔNG gọi movieApi.getMovieDetail() trong vòng lặp.
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
      return cached.slice(0, safeLimit);
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
        // Dữ liệu luôn tươi mới tự động mà không cần bắn phá lệnh DEL liên tục
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
 * Hàm phân giải danh sách phim thịnh hành (chỉ thực thi khi cache MISS)
 */
async function resolveTrendingCommunityInternal(
  limit: number,
  timeframe: "total" | "week"
): Promise<MovieViewStatItem[]> {
  try {
    // 1. Lấy danh sách top slugs từ Analytics Pipeline (Redis Sorted Sets + Supabase events)
    const analyticsSlugs = await getTopMovieSlugsFromAnalytics(timeframe, Math.max(limit * 2, 20));

    if (analyticsSlugs && analyticsSlugs.length > 0) {
      const allSlugs = analyticsSlugs.map((s) => s.slug);
      const detailMap = await movieApi.getMoviesDetailBatch(allSlugs);

      const resolvedMovies = await Promise.allSettled(
        analyticsSlugs.map(async ({ slug, score }) => {
          try {
            const detail = detailMap[slug] || (await movieApi.getMovieDetail(slug));
            if (!detail || !detail.movie) return null;
            const m = detail.movie;

            const title = m.name || m.title || slug;
            const year = m.year ? Number(m.year) : undefined;
            const quality = m.quality || "HD";

            let poster = pickBestMoviePoster(m, "");
            let thumb = pickBestMovieThumb(m, "");

            // Thay thế ngay từ đầu trên Server: Tra cứu poster chính thức từ TMDb nếu nguồn cũ bị thiếu/hỏng
            if (!poster || isBrokenImageUrl(poster) || poster.includes("/default-")) {
              if (m.tmdb?.id) {
                try {
                  const tmdbP = await getTmdbPosterUrl(m.tmdb.id, m.type);
                  if (tmdbP) poster = tmdbP;
                } catch {}
              }
              if (!poster || isBrokenImageUrl(poster) || poster.includes("/default-")) {
                const candidates = [title, m.origin_name, slug.replace(/-/g, " ")].filter(Boolean);
                for (const query of candidates) {
                  try {
                    const tmdbRes = await searchTmdbPosterByTitle(query, year, m.type);
                    if (tmdbRes?.posterUrl) {
                      poster = tmdbRes.posterUrl;
                      if (!thumb || isBrokenImageUrl(thumb) || thumb.includes("/default-")) {
                        thumb = tmdbRes.backdropUrl || tmdbRes.posterUrl;
                      }
                      break;
                    }
                  } catch {}
                }
              }
            }
            if (!poster) poster = "/default-poster.jpg";
            if (!thumb) thumb = poster || "/default-hero.jpg";

            const rawCats = Array.isArray(m.category)
              ? m.category
              : Array.isArray(m.categories)
              ? m.categories
              : [];
            const category =
              rawCats
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((c: any) => (typeof c === "string" ? c : c?.name || ""))
                .filter(Boolean)
                .join(", ") || "Phim Hay";

            return {
              movieSlug: slug,
              movieTitle: title,
              poster,
              thumb,
              year,
              quality,
              category,
              viewsTotal: timeframe === "total" ? score : 0,
              viewsWeek: timeframe === "week" ? score : 0,
              lastViewedAt: Date.now(),
            } as MovieViewStatItem;
          } catch {
            return null;
          }
        })
      );

      const items: MovieViewStatItem[] = [];
      for (const r of resolvedMovies) {
        if (r.status === "fulfilled" && r.value) {
          items.push(r.value);
        }
      }

      if (items.length > 0) {
        return items.slice(0, limit);
      }
    }
  } catch (analyticsErr) {
    console.warn("[getTopTrendingCommunitySupabase] Analytics fetch warning:", analyticsErr);
  }

  // 2. Fallback dự phòng: Query watch_history khi hệ thống analytics chưa có dữ liệu ban đầu
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return [];
  }

  const { data, error } = await adminClient
    .from("watch_history")
    .select("slug, title, poster, year, quality, category, updated_at, synced_at")
    .limit(1000);

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

  return items.slice(0, limit);
}
