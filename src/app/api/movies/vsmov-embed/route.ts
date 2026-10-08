import { NextRequest, NextResponse } from "next/server";
import { fetchVsmovDetail } from "@/services/providers/vsmov";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const ep = searchParams.get("ep");

  if (!slug) {
    return NextResponse.json(
      { success: false, error: "Missing movie slug" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchVsmovDetail(slug, 4500);
    if (!data || !data.movie || !data.episodes || data.episodes.length === 0) {
      return NextResponse.json(
        { success: false, error: "No movie/episodes found on VSMOV" },
        { status: 404 }
      );
    }

    const firstServer = data.episodes[0]?.server_data || [];
    if (firstServer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Empty server data on VSMOV" },
        { status: 404 }
      );
    }

    // Match requested episode or fallback to first episode
    let targetEpisode = firstServer[0];
    if (ep) {
      const epDigits = ep.match(/\d+/)?.[0];
      const found = firstServer.find(
        (e) =>
          e.slug === ep ||
          e.name === ep ||
          `tap-${e.name}` === ep ||
          `tap-${e.slug}` === ep ||
          (epDigits && (e.name === epDigits || e.slug === epDigits || e.slug === `tap-${epDigits}` || e.name === `Tập ${epDigits}`))
      );
      if (found) targetEpisode = found;
    }

    const embedUrl = targetEpisode?.link_embed;
    if (!embedUrl) {
      return NextResponse.json(
        { success: false, error: "Episode has no link_embed on VSMOV" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      embedUrl,
      movieName: data.movie.name,
      episodeName: targetEpisode.name,
      tmdbId: data.movie.tmdb?.id,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
