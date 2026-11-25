import { NextRequest, NextResponse } from "next/server";
import {
  generateForYouRecommendations,
  type WatchHistoryInputItem,
  type MovieFormat,
  type FormatPreference,
} from "@/services/movies/forYouService";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

export const maxDuration = 20;

export type { MovieFormat, FormatPreference, WatchHistoryInputItem };

/**
 * GET /api/recommendations/for-you
 * Hỗ trợ tham số URL query: genres, types, exclude/watched, seed
 * Tối đa hóa tỷ lệ Edge CDN Cache Hit (1 giờ) cho cả khách lẫn người dùng cá nhân hóa
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const { searchParams } = new URL(req.url);
    const seed = Number(searchParams.get("seed")) || 0;

    // Chuẩn hóa và sắp xếp cố định các genres để tối đa hóa Edge Cache hit rate
    const rawGenres = searchParams.get("genres");
    const genres = rawGenres
      ? rawGenres
          .split(",")
          .map((g) => g.trim().toLowerCase())
          .filter(Boolean)
          .sort()
      : [];

    // Chuẩn hóa danh sách exclude/watched slugs (tối đa 15 slugs gần nhất để URL gọn và cache ổn định)
    const rawExclude = searchParams.get("exclude") || searchParams.get("watched");
    const excludeSlugs = rawExclude
      ? rawExclude
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 15)
      : [];

    const rawTypes = searchParams.get("types");
    const types = rawTypes
      ? rawTypes
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    // Tạo synthetic history items nếu có types để phục vụ phân loại format/live-action/animation
    const syntheticHistory: WatchHistoryInputItem[] = types.map((t) => ({
      slug: `synth-${t}`,
      type: t,
    }));

    const result = await generateForYouRecommendations({
      genres,
      historyItems: syntheticHistory,
      watchedSlugs: excludeSlugs,
      refreshSeed: seed,
      currentSlugs: excludeSlugs,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        "Vercel-CDN-Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[for-you recommendations GET] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}

/**
 * POST /api/recommendations/for-you
 * Dành cho người dùng đã đăng nhập hoặc có lịch sử xem cá nhân
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.RECOMMENDATIONS_IN_MEMORY);
    if (!rateLimit.allowed) {
      return buildRateLimitResponse(rateLimit);
    }

    const body = (await req.json().catch(() => null)) || {};
    const result = await generateForYouRecommendations(body);

    const isGuest =
      (!body.historyItems || body.historyItems.length === 0) &&
      (!body.genres || body.genres.length === 0);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": isGuest
          ? "public, s-maxage=1800, stale-while-revalidate=3600"
          : "private, max-age=900",
      },
    });
  } catch (err) {
    console.error("[for-you recommendations POST] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
