import { NextRequest, NextResponse } from "next/server";
import { movieApi } from "@/services/movieApi";

// Bộ nhớ đệm RAM trên server cho các yêu cầu tóm tắt phim
const serverSynopsisCache = new Map<
  string,
  { content: string; origin_name?: string; trailer_url?: string }
>();

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "Tham số slug là bắt buộc" },
      { status: 400 }
    );
  }

  // 1. Kiểm tra cache RAM
  if (serverSynopsisCache.has(slug)) {
    const cached = serverSynopsisCache.get(slug)!;
    return NextResponse.json(
      { slug, ...cached },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  }

  try {
    // 2. Lấy dữ liệu chi tiết phim
    const data = await movieApi.getMovieDetail(slug);
    const rawContent = data?.movie?.content || "";
    const originName = data?.movie?.origin_name || "";
    const trailerUrl = data?.movie?.trailer_url || "";

    // Làm sạch thẻ HTML (<p>, <em>, <b>, <br>) thành văn bản thuần túy
    const cleanContent = String(rawContent)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const payload = {
      content: cleanContent,
      origin_name: originName,
      trailer_url: trailerUrl,
    };

    // Lưu vào RAM cache
    serverSynopsisCache.set(slug, payload);

    return NextResponse.json(
      { slug, ...payload },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("Lỗi lấy tóm tắt phim:", slug, err);
    return NextResponse.json(
      { slug, content: "", origin_name: "" },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300",
        },
      }
    );
  }
}
