import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";
import { upsertMovieEmbedding } from "@/services/aiVectorService";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  if (!supabase) {
    return NextResponse.json({ success: false, error: "Supabase chưa được cấu hình" }, { status: 400 });
  }

  try {
    // 1. Lấy danh sách phim hot / mới nhất
    const res = await movieApi.getMovies({ page: 1, limit });
    const items = res?.items || [];

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: "Không tìm thấy phim để nạp vector" });
    }

    let syncedCount = 0;
    const errors: string[] = [];

    // 2. Chạy tạo vector và lưu vào Supabase
    for (const item of items) {
      try {
        const ok = await upsertMovieEmbedding({
          slug: item.slug,
          title: item.name || item.title || "",
          originalName: item.origin_name,
          posterUrl: item.poster_url || item.thumb_url || "/default-poster.jpg",
          thumbUrl: item.thumb_url,
          year: item.year,
          quality: item.quality,
          category: item.category?.[0]?.name,
          description: item.content || item.description,
        });

        if (ok) {
          syncedCount++;
        }
      } catch (err) {
        errors.push(`${item.slug}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalRequested: items.length,
      syncedCount,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    console.error("[sync-embeddings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi đồng bộ vector phim" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
