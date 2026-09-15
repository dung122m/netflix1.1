import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";

export const revalidate = 600; // Cache 10 phút tại Edge
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const type = searchParams.get("type") || undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 18, 30);

  try {
    const res = await movieApi.getMovies({
      ...(type ? { type } : { category }),
      limit,
      page: 1,
    });

    return NextResponse.json({
      success: true,
      items: res?.items || [],
      totalItems: res?.totalItems || 0,
    });
  } catch (err) {
    console.error("[category-movies API] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
