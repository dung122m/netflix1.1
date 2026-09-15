import { NextRequest, NextResponse } from "next/server";
import { searchMoviesBySemantic } from "@/services/aiVectorService";
import { movieApi } from "@/services/movieApi";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || searchParams.get("prompt") || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  if (!q.trim()) {
    return NextResponse.json({ success: true, query: "", movies: [], count: 0 });
  }

  try {
    // 1. Tìm kiếm bằng Supabase pgvector (Semantic Search < 50ms)
    let results = await searchMoviesBySemantic(q, limit);

    // 2. Fallback tìm kiếm thông minh nếu database vector chưa được nạp nhiều phim
    if (!results || results.length === 0) {
      try {
        const fallbackRes = await movieApi.getMovies({ keyword: q, page: 1, limit });
        if (fallbackRes?.items && fallbackRes.items.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results = fallbackRes.items.slice(0, limit).map((m: any) => ({
            id: m.slug,
            title: m.name || m.title || "",
            originalName: m.origin_name,
            posterUrl: m.poster_url || m.thumb_url || "/default-poster.jpg",
            thumbUrl: m.thumb_url,
            year: m.year,
            quality: m.quality,
            category: m.category?.[0]?.name,
            similarity: 0.75,
          }));
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      query: q,
      count: results.length,
      movies: results,
    });
  } catch (error) {
    console.error("[api/ai-vector-search] Lỗi tìm kiếm:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi tìm kiếm vector AI", movies: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const q: string = body.q || body.prompt || "";
    const limit = Math.min(Number(body.limit) || 20, 50);
    const customApiKey: string | undefined = body.apiKey;

    if (!q.trim()) {
      return NextResponse.json({ success: true, query: "", movies: [], count: 0 });
    }

    let results = await searchMoviesBySemantic(q, limit, 0.35, customApiKey);

    // Fallback nếu chưa có vector
    if (!results || results.length === 0) {
      try {
        const fallbackRes = await movieApi.getMovies({ keyword: q, page: 1, limit });
        if (fallbackRes?.items && fallbackRes.items.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results = fallbackRes.items.slice(0, limit).map((m: any) => ({
            id: m.slug,
            title: m.name || m.title || "",
            originalName: m.origin_name,
            posterUrl: m.poster_url || m.thumb_url || "/default-poster.jpg",
            thumbUrl: m.thumb_url,
            year: m.year,
            quality: m.quality,
            category: m.category?.[0]?.name,
            similarity: 0.75,
          }));
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      query: q,
      count: results.length,
      movies: results,
    });
  } catch (error) {
    console.error("[api/ai-vector-search] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi tìm kiếm vector AI", movies: [] },
      { status: 500 }
    );
  }
}
