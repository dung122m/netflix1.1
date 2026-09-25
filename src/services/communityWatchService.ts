import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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
    console.error("[recordMovieViewSupabase] Lỗi ghi nhận lượt xem vào Supabase watch_history:", error);
    throw error;
  }
}

export async function getTopTrendingCommunitySupabase(
  limit: number = 10,
  timeframe: "total" | "week" = "total"
): Promise<MovieViewStatItem[]> {
  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    throw new Error("[getTopTrendingCommunitySupabase] SUPABASE_SERVICE_ROLE_KEY is required to access watch history");
  }

  const { data, error } = await adminClient
    .from("watch_history")
    .select("slug, title, poster, year, quality, category, updated_at, synced_at");

  if (error) {
    console.error("[getTopTrendingCommunitySupabase] Lỗi truy vấn watch_history:", error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const movieMap = new Map<string, MovieViewStatItem>();

  for (const row of data) {
    if (!row.slug) continue;
    const slug = row.slug.toLowerCase();
    const updatedAt = Number(row.updated_at) || Number(row.synced_at) || 0;
    const isWeek = updatedAt >= sevenDaysAgo;

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

  // Sắp xếp: Ưu tiên số lượt xem nhiều nhất, nếu bằng nhau ưu tiên phim xem gần đây nhất
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
