import { NextResponse } from "next/server";
import { generateFastAiChat } from "@/services/aiProviderService";
import { fetchMoviesByTitles } from "@/services/aiActorService";
import { getWatchHistorySupabase } from "@/services/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

interface CuratedPlaylistResponse {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  gradient: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movies: any[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    let historyTitles: string[] = Array.isArray(body.historyTitles)
      ? body.historyTitles.filter((t: unknown): t is string => typeof t === "string" && t.length > 0)
      : [];

    // Nếu có userId và Supabase được cấu hình, lấy lịch sử xem trực tiếp từ database
    if (userId && isSupabaseConfigured() && historyTitles.length === 0) {
      try {
        const remoteHistory = await getWatchHistorySupabase(userId);
        if (Array.isArray(remoteHistory) && remoteHistory.length > 0) {
          historyTitles = remoteHistory.slice(0, 15).map((h) => h.title);
        }
      } catch (e) {
        console.warn("[ai-curated-playlists] Could not fetch remote history:", e);
      }
    }

    // Nếu người dùng mới chưa có lịch sử xem, sử dụng danh sách hạt giống thịnh hành chất lượng cao
    const isNewUser = historyTitles.length === 0;
    const sampleSeed = isNewUser
      ? "Ký Sinh Trùng, Đại Thoại Tây Du, Interstellar, Chuyến Tàu Sinh Tử, Đội Bóng Thiếu Lâm, Thanh Gươm Diệt Quỷ"
      : historyTitles.slice(0, 10).join(", ");

    const refreshCount = typeof body.refreshCount === "number" ? body.refreshCount : 0;

    const systemPrompt = `Bạn là Giám Đốc Tuyển Chọn Phim (Curator) hàng đầu của Nanaflix.
Nhiệm vụ: Dựa vào lịch sử xem phim của người dùng, phân tích sở thích và gu điện ảnh thực sự của họ để tạo ra ĐÚNG 3 BỘ SƯU TẬP (Curated Playlists) độc đáo, cuốn hút và CHUẨN XÁC 100% VỀ THỂ LOẠI.

QUY TẮC CỐT LÕI BẮT BUỘC TUÂN THỦ:
1. TÊN BỘ SƯU TẬP: Phải là chủ đề / vibe nghệ thuật hấp dẫn (vd: "Góc Trinh Thám & Giải Mã Kỳ Án", "Vũ Trụ Khoa Học Giả Tưởng & Hack Não", "Đỉnh Cao Võ Thuật & Hành Động Châu Á", "Góc Chữa Lành Tâm Hồn & Hoạt Họa", "Thế Giới Phép Thuật & Thần Thoại Kỳ Bí", "Tình Yêu Tuổi Trẻ & Thanh Xuân Rực Rỡ").
   - TUYỆT ĐỐI KHÔNG ghép tên một bộ phim cụ thể vào tiêu đề playlist (VÍ DỤ CẤM: "Hành Trình Tiên Nghịch...", "Góc Ký Sinh Trùng...").
2. LỜI TỰA (TAGLINE): Là lời giới thiệu ngắn gọn, lôi cuốn miêu tả vibe của bộ sưu tập (VÍ DỤ: "Những vụ án hóc búa và những bộ não sắc sảo nhất dành cho đêm thử thách trí tuệ").
   - TUYỆT ĐỐI KHÔNG dùng các câu gượng ép nhắc lại tên phim người dùng vừa click (VÍ DỤ CẤM: "Vì bạn đã mê Ký Sinh Trùng...", "Từ Tinh Võ Anh Hùng đến Ẩn Võ Giả...").
3. ĐỒNG NHẤT THỂ LOẠI 100% (Strict Thematic Cohesion):
   - Mọi bộ phim trong danh sách movieTitles PHẢI THUỘC ĐÚNG THỂ LOẠI của playlist đó.
   - VÍ DỤ: Nếu playlist là "Trinh Thám & Kỳ Án" -> CHỈ CHỌN các phim trinh thám/phá án/giật gân (như Sherlock Holmes, Kẻ Đâm Lén, Ký Sinh Trùng, Thám Tử Lừng Danh...). TUYỆT ĐỐI KHÔNG nhét phim hoạt hình tiên hiệp, phim hài công sở, hay thần thoại vào đây!
4. GỢI Ý MỞ RỘNG (Khám phá): Đưa ra các tác phẩm nổi tiếng cùng thể loại để người xem khám phá thêm tác phẩm mới, không chỉ lặp lại lịch sử xem.
5. MỖI PLAYLIST CUNG CẤP 10-12 TỰA PHIM TIẾNG VIỆT PHỔ BIẾN trên các nền tảng xem phim Việt Nam để người dùng có thể cuộn ngang xem danh sách phong phú.

Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng sau:
{
  "playlists": [
    {
      "name": "Tên chủ đề tuyển tập ấn tượng",
      "tagline": "Lời tựa ngắn gọn, lôi cuốn miêu tả không khí của tuyển tập (1 câu ngắn)",
      "emoji": "🕵️",
      "gradient": "from-amber-600/30 via-red-950/40 to-zinc-900",
      "movieTitles": ["Tên phim 1 tiếng Việt", "Tên phim 2", "Tên phim 3", "Tên phim 4", "Tên phim 5", "Tên phim 6", "Tên phim 7", "Tên phim 8", "Tên phim 9", "Tên phim 10"]
    }
  ]
}`;

    const userPrompt = isNewUser
      ? `Người dùng mới tinh (Lần làm mới thứ ${refreshCount}), hãy tạo 3 bộ sưu tập điện ảnh tuyển chọn kinh điển và cuốn hút nhất (đa dạng các chủ đề: Hành Động/Võ Thuật, Trinh Thám/Kỳ Án, Giả Tưởng/Sci-Fi, Anime/Chữa Lành...).`
      : `Lịch sử xem gần đây của người dùng: [${sampleSeed}] (Lần làm mới thứ ${refreshCount}). Hãy phân tích các góc nhìn gu phim khác nhau và sáng tạo 3 bộ sưu tập tuyển chọn riêng biệt, đồng nhất thể loại 100%.`;

    const aiRes = await generateFastAiChat({
      systemPrompt,
      userPrompt,
      temperature: refreshCount > 0 ? 0.45 : 0.25,
      maxTokens: 1500,
      jsonMode: true,
      timeoutMs: 7000,
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

    const playlistsRaw = Array.isArray(parsed.playlists) ? parsed.playlists : [];
    const finalPlaylists: CuratedPlaylistResponse[] = [];

    // Phân giải phim song song cho 3 playlist (mỗi playlist lấy tối đa 12 phim)
    for (let i = 0; i < playlistsRaw.length; i++) {
      const pl = playlistsRaw[i];
      const titles = Array.isArray(pl.movieTitles) ? pl.movieTitles : [];
      const resolvedMovies = await fetchMoviesByTitles(titles, 12);

      if (resolvedMovies.length >= 2) {
        finalPlaylists.push({
          id: `ai-curated-${i + 1}-${Date.now()}`,
          name: pl.name || `Bộ sưu tập tuyển chọn ${i + 1}`,
          tagline: pl.tagline || "Được tuyển chọn tự động bởi Nana AI",
          emoji: pl.emoji || "✨",
          gradient: pl.gradient || "from-rose-900/30 via-purple-950/30 to-zinc-900",
          movies: resolvedMovies,
        });
      }
    }

    return NextResponse.json({
      success: true,
      isPersonalized: !isNewUser,
      playlists: finalPlaylists,
      provider: aiRes.provider,
    });
  } catch (err) {
    console.error("[ai-curated-playlists] Error:", err);
    return NextResponse.json(
      { error: "Không thể tạo bộ sưu tập tự động." },
      { status: 500 }
    );
  }
}
