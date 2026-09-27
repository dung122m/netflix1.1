import { NextRequest, NextResponse } from "next/server";
import { getTmdbReviews } from "@/services/tmdbService";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tmdbId = searchParams.get("tmdbId");
    const type = searchParams.get("type") || "movie";

    if (!tmdbId) {
      return NextResponse.json({ success: true, reviews: [] });
    }

    const reviews = await getTmdbReviews(tmdbId, type);
    return NextResponse.json(
      {
        success: true,
        reviews,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (err) {
    console.error("[TMDB Reviews API] Error:", err);
    return NextResponse.json({ success: false, reviews: [] }, { status: 200 });
  }
}
