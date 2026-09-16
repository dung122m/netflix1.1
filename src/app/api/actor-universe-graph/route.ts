import { NextResponse } from "next/server";
import { generateFastAiChat } from "@/services/aiProviderService";

export const runtime = "nodejs";

const UNIVERSE_GRAPH_CACHE = new Map<string, { data: unknown; expireAt: number }>();
const CACHE_14_DAYS = 14 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actorName = searchParams.get("name")?.trim();

    if (!actorName || actorName.length < 2) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp tên diễn viên." },
        { status: 400 }
      );
    }

    const clean = actorName.toLowerCase();
    const cached = UNIVERSE_GRAPH_CACHE.get(clean);
    if (cached && cached.expireAt > Date.now()) {
      return NextResponse.json({ success: true, ...(cached.data as object), source: "cache" });
    }

    const systemPrompt = `Bạn là Chuyên gia Bách khoa Toàn thư Vũ trụ Điện ảnh (Cinema Universe & Filmography Graph).
Nhiệm vụ của bạn: Khi nhận được tên của một DIỄN VIÊN / NGHỆ SĨ, hãy phân tích toàn bộ sự nghiệp của họ và trích xuất ra MẠNG LƯỚI BẠN DIỄN ĂN Ý & CỘNG SỰ KINH ĐIỂN NHẤT (4 đến 6 bạn diễn tiêu biểu nhất).

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau:
{
  "actorName": "Tên tiếng Việt chuẩn",
  "era": "Thời kỳ hoàng kim (vd: Thập niên 90 - 2000s, Tân điện ảnh Hồng Kông, Hollywood thập niên 80...)",
  "universeTitle": "Danh hiệu điện ảnh (vd: Vũ Trụ Hài Nhảm Châu Tinh Trì, Vũ Trụ Võ Thuật Thành Long, Vũ Trụ Siêu Anh Hùng...)",
  "coStars": [
    {
      "name": "Tên bạn diễn ăn ý (vd: Ngô Mạnh Đạt)",
      "relationType": "Mối quan hệ màn ảnh (vd: Cặp bài trùng thế kỷ / Chú cháu giang hồ)",
      "chemistryScore": 98,
      "collaborationsCount": "Hơn 20 tác phẩm",
      "sharedMovies": ["Đại Thoại Tây Du", "Đội Bóng Thiếu Lâm", "Quan Xẩm Lốc Cốc", "Thánh Bài"]
    }
  ]
}`;

    const userPrompt = `Hãy phân tích mạng lưới vũ trụ điện ảnh và các bạn diễn ăn ý nhất của diễn viên: "${actorName}".`;

    const aiRes = await generateFastAiChat({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 900,
      jsonMode: true,
      timeoutMs: 5500,
    });

    if (!aiRes || !aiRes.text) {
      return NextResponse.json(
        { error: "AI tạm thời bận, vui lòng thử lại sau." },
        { status: 503 }
      );
    }

    const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);

    const resultData = {
      actorName: parsed.actorName || actorName,
      era: parsed.era || "Điện ảnh kinh điển",
      universeTitle: parsed.universeTitle || `Vũ trụ điện ảnh ${actorName}`,
      coStars: Array.isArray(parsed.coStars) ? parsed.coStars : [],
      provider: aiRes.provider,
    };

    UNIVERSE_GRAPH_CACHE.set(clean, {
      data: resultData,
      expireAt: Date.now() + CACHE_14_DAYS,
    });

    return NextResponse.json({
      success: true,
      ...resultData,
      source: "ai",
    });
  } catch (err) {
    console.error("[actor-universe-graph] Error:", err);
    return NextResponse.json(
      { error: "Không thể phân tích vũ trụ điện ảnh." },
      { status: 500 }
    );
  }
}
