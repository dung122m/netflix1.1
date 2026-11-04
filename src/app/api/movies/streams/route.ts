import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movies/service";
import { enforceRateLimit, buildRateLimitResponse, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const rateLimit = await enforceRateLimit(req, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const ep = searchParams.get("ep");
  const server = searchParams.get("server") || undefined;
  const source = (searchParams.get("source") || undefined) as "nguonc" | "ophim" | "vsmov" | undefined;

  if (!slug || !ep) {
    return NextResponse.json(
      { success: false, error: "Missing movie slug or episode slug" },
      { status: 400 }
    );
  }

  try {
    const streams = await movieApi.getEpisodeStream(slug, ep, server, source);
    return NextResponse.json(
      {
        success: true,
        slug,
        episodeSlug: ep,
        streams,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[api/movies/streams] Error fetching episode stream:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}

