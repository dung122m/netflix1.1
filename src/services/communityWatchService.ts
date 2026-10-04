import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTopMovieSlugsFromAnalytics, getStartOfWeekVietnam } from "@/services/analyticsService";
import { movieApi } from "@/services/movies/service";
import { pickBestMoviePoster, pickBestMovieThumb } from "@/lib/movieMedia";

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

/**
 * Lấy danh sách phim thịnh hành cộng đồng theo view count thực tế từ Analytics Pipeline.
 * Hỗ trợ phân định chính xác giữa "total" (Toàn thời gian) và "week" (Thứ 2 00:00 -> Chủ Nhật 23:59:59 Asia/Ho_Chi_Minh).
 */
export async function getTopTrendingCommunitySupabase(
  limit: number = 10,
  timeframe: "total" | "week" = "total"
): Promise<MovieViewStatItem[]> {
  try {
    // 1. Lấy danh sách top slugs từ Analytics Pipeline (Redis Sorted Sets + Supabase events)
    const analyticsSlugs = await getTopMovieSlugsFromAnalytics(timeframe, Math.max(limit * 2, 20));

    if (analyticsSlugs && analyticsSlugs.length > 0) {
      const resolvedMovies = await Promise.allSettled(
        analyticsSlugs.map(async ({ slug, score }) => {
          try {
            const detail = await movieApi.getMovieDetail(slug);
            if (!detail || !detail.movie) return null;
            const m = detail.movie;

            const title = m.name || m.title || slug;
            const poster = pickBestMoviePoster(m, "/default-poster.jpg");
            const thumb = pickBestMovieThumb(m, "/default-hero.jpg");
            const year = m.year ? Number(m.year) : undefined;
            const quality = m.quality || "HD";

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
