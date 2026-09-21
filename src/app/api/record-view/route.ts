import { NextRequest, NextResponse } from "next/server";
import { recordMovieViewSupabase } from "@/services/communityWatchService";

export const maxDuration = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, title, poster, thumb, year, quality, category } = body || {};

    if (!slug) {
      return NextResponse.json({ success: false, error: "Thiếu slug phim" }, { status: 400 });
    }

    // Ghi nhận lượt xem vào Supabase
    await recordMovieViewSupabase({
      slug,
      title: title || slug,
      poster,
      thumb,
      year: Number(year) || undefined,
      quality,
      category,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.warn("[record-view API] Lỗi:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
