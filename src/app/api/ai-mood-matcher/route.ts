import { NextResponse } from "next/server";
import { generateFastAiChat } from "@/services/aiProviderService";
import { fetchMoviesByTitles } from "@/services/aiActorService";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mood = typeof body.mood === "string" ? body.mood.trim() : "";

    if (!mood || mood.length < 2) {
      return NextResponse.json(
        { error: "Vui lòng nhập cảm xúc hoặc tình huống của bạn" },
        { status: 400 }
      );
    }

    const systemPrompt = `Bạn là Nana AI - Trợ lý điện ảnh tâm lý, tinh tế và ấm áp của Nanaflix.
Nhiệm vụ của bạn là lắng nghe tâm trạng/hoàn cảnh của người dùng, an ủi/đồng cảm với họ bằng một lời nhắn ngắn gọn, ấm áp (nanaNote), sau đó chọn ra 4 đến 6 tác phẩm điện ảnh xuất sắc và nổi tiếng nhất có trên các nền tảng phim Việt Nam/châu Á khớp hoàn hảo với cảm xúc đó.

Yêu cầu trả về DUY NHẤT một chuỗi JSON hợp lệ với cấu trúc sau:
{
  "nanaNote": "Đoạn lời nhắn ngắn gọn (2-3 câu), ấm áp, thân thiện và thấu hiểu cảm xúc của người xem.",
  "moodSummary": "Tóm tắt ngắn tâm trạng (vd: Chữa lành & Cười sảng khoái, Hoài niệm đêm mưa, Căng thẳng nghẹt thở...)",
  "vibeTags": ["#Tag1", "#Tag2", "#Tag3"],
  "recommendations": [
    {
      "title": "Tên phim tiếng Việt phổ biến (vd: Lạc Lối Ở Tokyo, Hạ Cánh Nơi Anh, Ký Sinh Trùng, Vút Bay...)",
      "whyWatch": "Lý do vì sao bộ phim này phù hợp với tâm trạng người dùng (1 câu ngắn gọn)."
    }
  ]
}`;

    const userPrompt = `Người dùng chia sẻ tâm trạng: "${mood}".
Hãy chọn ra các bộ phim điện ảnh/truyền hình phù hợp nhất và gửi gắm lời khuyên chân thành.`;

    const aiRes = await generateFastAiChat({
      systemPrompt,
      userPrompt,
      temperature: 0.35,
      maxTokens: 800,
      jsonMode: true,
      timeoutMs: 6000,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any = null;

    if (aiRes && aiRes.text) {
      try {
        const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
      } catch (e) {
        console.warn("[ai-mood-matcher] JSON parse error:", e);
      }
    }

    // Nếu AI bận hoặc JSON không parse được, tự động tạo phản hồi tâm lý mặc định chất lượng cao
    if (!parsed) {
      parsed = {
        nanaNote: `Nana hiểu rằng bạn đang tìm kiếm những thước phim phù hợp với tâm trạng "${mood}". Hãy để những câu chuyện điện ảnh dưới đây mang lại sự thư giãn và nạp đầy cảm hứng cho bạn nhé! ✨`,
        moodSummary: "Gợi Ý Phim Theo Cảm Xúc",
        vibeTags: ["#NanaflixAI", "#ChữaLành", "#ThưGiãn"],
        recommendations: [
          { title: "Vùng Đất Linh Hồn", whyWatch: "Khung cảnh kỳ ảo và âm nhạc diệu kỳ giúp xoa dịu tâm hồn." },
          { title: "Lạc Lối Ở Tokyo", whyWatch: "Nhịp điệu sâu lắng, đồng điệu với những khoảng lặng trong tâm trí." },
          { title: "Ký Sinh Trùng", whyWatch: "Kịch tính, cuốn hút và khiến bạn hoàn toàn đắm chìm vào câu chuyện." },
          { title: "Chuyến Tàu Sinh Tử", whyWatch: "Cảm xúc mãnh liệt, nghẹt thở và đầy tính nhân văn." },
        ],
      };
    }

    const titles = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r: { title: string }) => r.title).filter(Boolean)
      : [];

    // Lấy thông tin chi tiết phim từ kho phim API
    let resolvedMovies = await fetchMoviesByTitles(titles, 8);

    // Nếu không tìm thấy phim từ danh sách gợi ý ban đầu, fallback sang các siêu phẩm phù hợp
    if (resolvedMovies.length === 0) {
      const fallbackTitles = ["Sát Phá Lang", "Diệp Vấn", "Interstellar", "Chuyến Tàu Sinh Tử", "Đại Thoại Tây Du", "Ký Sinh Trùng"];
      resolvedMovies = await fetchMoviesByTitles(fallbackTitles, 6);
    }

    // Ghép lý do whyWatch vào dữ liệu phim
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalMovies = resolvedMovies.map((m: any, idx: number) => {
      const match = Array.isArray(parsed.recommendations)
        ? parsed.recommendations.find((r: { title: string }) => {
            const t = (r.title || "").toLowerCase();
            return (
              (m.name && m.name.toLowerCase().includes(t)) ||
              (m.origin_name && m.origin_name.toLowerCase().includes(t)) ||
              t.includes((m.name || "").toLowerCase())
            );
          })
        : null;

      const fallbackWhy = [
        "Tiết tấu kịch tính, mãn nhãn bùng nổ cảm xúc từ đầu đến cuối.",
        "Cốt truyện cuốn hút, dàn diễn viên thực lực đỉnh cao.",
        "Siêu phẩm được khán giả toàn cầu đánh giá xuất sắc nhất.",
      ][idx % 3];

      return {
        ...m,
        whyWatch: match?.whyWatch || fallbackWhy,
      };
    });

    return NextResponse.json({
      success: true,
      nanaNote: parsed.nanaNote || "Chúc bạn có những phút giây thư giãn tuyệt vời cùng Nanaflix!",
      moodSummary: parsed.moodSummary || "Gợi ý phim theo tâm trạng",
      vibeTags: Array.isArray(parsed.vibeTags) ? parsed.vibeTags : ["#NanaflixAI", "#ChữaLành"],
      movies: finalMovies,
      provider: aiRes?.provider || "Nana AI",
    });
  } catch (err) {
    console.error("[ai-mood-matcher] Error:", err);
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu phân tích tâm trạng." },
      { status: 500 }
    );
  }
}
