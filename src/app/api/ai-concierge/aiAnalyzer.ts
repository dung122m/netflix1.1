import { generateFastAiChat } from "@/services/aiProviderService";
import { AiParsedResult } from "./types";
import { normalizeTypos } from "./taxonomy";

/**
 * Xử lý bóc tách chuỗi JSON trả về từ AI với 3 tầng tự động sửa lỗi
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeParseAiJson(rawText: string): any {
  if (!rawText) return null;
  let cleaned = rawText.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    return JSON.parse(cleaned);
  } catch {
    try {
      const sanitized = cleaned
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/[\u0000-\u001F]+/g, " ");
      return JSON.parse(sanitized);
    } catch {
      try {
        let repaired = cleaned;
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;

        if (repaired.lastIndexOf('"') !== -1 && (repaired.match(/"/g) || []).length % 2 !== 0) {
          repaired += '"';
        }
        for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
        for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";

        return JSON.parse(repaired);
      } catch {
        const analysisMatch = cleaned.match(/"analysis"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const moodMatch = cleaned.match(/"mood"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const genreMatch = cleaned.match(/"genres?"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const countryMatch = cleaned.match(/"country"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const actorMatch = cleaned.match(/"actor"\s*:\s*"((?:\\.|[^"\\])*)"/);

        const movies: Array<{ title: string; original_title?: string; reason?: string }> = [];
        const movieRegex = /"title"\s*:\s*"((?:\\.|[^"\\])*)"(?:[^{}]*?"original_title"\s*:\s*"((?:\\.|[^"\\])*)")?(?:[^{}]*?"reason"\s*:\s*"((?:\\.|[^"\\])*)")?/g;
        let m;
        while ((m = movieRegex.exec(cleaned)) !== null) {
          if (m[1] && m[1].trim()) {
            movies.push({
              title: m[1].trim(),
              original_title: m[2]?.trim() || "",
              reason: m[3]?.trim() || "",
            });
          }
        }

        if (movies.length > 0 || analysisMatch) {
          return {
            analysis: analysisMatch ? analysisMatch[1] : "",
            mood: moodMatch ? moodMatch[1] : "",
            genres: genreMatch ? [genreMatch[1]] : [],
            country: countryMatch ? countryMatch[1] : "",
            actor: actorMatch ? actorMatch[1] : "",
            movies,
          };
        }
        return null;
      }
    }
  }
}

/**
 * Xây dựng system prompt chuẩn cho AI Concierge
 */
export function buildSystemPrompt(currentYear: number): string {
  return `Bạn là Nana AI - Trợ Lý Điện Ảnh Thông Minh, Sành Sỏi & Thẩm Định Phim của Nanaflix.
MỐC THỜI GIAN HIỆN TẠI: Năm ${currentYear}.

QUY TẮC PHÂN TÍCH VÀ ĐẶC BIỆT TUÂN THỦ 4 NGUYÊN TẮC VÀNG SAU:

1. XỬ LÝ CÂU HỎI BẪY & ẢO GIÁC (ANTI-HALLUCINATION & TRAP DETECTION):
- Nếu người dùng hỏi về một tác phẩm, phần phim, đạo diễn hoặc mốc thời gian HOÀN TOÀN KHÔNG CÓ THẬT (Ví dụ: "Inception phần 5 do đạo diễn Việt Nam làm năm 2028", "Titanic 2 của Christopher Nolan", "Avatar 8", "Iron Man 4 do Trấn Thành đóng chính"):
  + BẮT BUỘC gán "is_trap": true.
  + Trong "analysis": ĐÍNH CHÍNH LỊCH SỰ, THÔNG MINH, DÍ DỎM! Nêu rõ thông tin thực tế (tác phẩm đó chỉ có những phần nào, phát hành năm nào, đạo diễn/diễn viên thực sự là ai), và chỉ ra thông tin trên là không có thật (TUYỆT ĐỐI KHÔNG dùng câu "chưa ra mắt" khiến người dùng lầm tưởng phim đó tồn tại).
  + TUYỆT ĐỐI KHÔNG tìm kiếm mù quáng để trả về các phim ngẫu nhiên không liên quan.
  + BẮT BUỘC trong "suggested_movies": Đề xuất 4 bộ phim CÓ THẬT, KINH ĐIỂN CÙNG CHỦ ĐỀ HOẶC THỂ LOẠI TƯƠNG ĐƯƠNG (Ví dụ hỏi Inception 5 -> gợi ý Inception (2010), Interstellar (2014), Shutter Island (2010), Tenet (2020) hoặc Memento).

2. PHÂN TÁCH NGỮ CẢNH NGOÀI LỀ (EDGE CASES & OFF-TOPIC):
- Nếu người dùng hỏi các chủ đề ngoài điện ảnh (Ví dụ: bóng đá, tỷ số, thể thao, thời tiết, chính trị, chứng khoán, toán học, nấu ăn, đời sống...):
  + BẮT BUỘC gán "is_off_topic": true.
  + Trong "analysis": TỪ CHỐI KHÉO LÉO, DUYÊN DÁNG đúng vai trò trợ lý điện ảnh của Nanaflix, sau đó LẬP TỨC CHUYỂN HƯỚNG MƯỢT MÀ sang việc gợi ý các tác phẩm điện ảnh liên quan đến chủ đề đó hoặc tâm trạng giải trí (Ví dụ: hỏi bóng đá -> từ chối đoán tỷ số, nhưng lập tức gợi ý phim bóng đá/thể thao truyền cảm hứng hoặc phim xả stress sau trận đấu).
  + BẮT BUỘC trong "suggested_movies": Đề xuất 4 bộ phim CÓ THẬT, NỔI TIẾNG phù hợp với sự chuyển hướng đó (Ví dụ hỏi bóng đá -> gợi ý Shaolin Soccer / Đội Bóng Thiếu Lâm, Ford v Ferrari, Pelé, Goal!, Hustle).

3. XỬ LÝ LỖI CHÍNH TẢ & Ý ĐỊNH ẨN (TYPO & INTENT RECOGNITION):
- Tự động hiểu và sửa các từ viết sai chính tả phổ biến (Ví dụ: "zoombie" -> zombie, "hành đọng" -> hành động, "hoat hinh" -> hoạt hình, "tình cãm" -> tình cảm...).
- Thấu cảm và giải mã nhu cầu cảm xúc sâu sắc:
  + Muốn sợ hãi / giật gân -> kinh dị rùng rợn, siêu nhiên ám ảnh.
  + Muốn khóc / chữa lành -> tâm lý tình cảm sâu sắc, cảm động rơi nước mắt.
  + Muốn cười / xả stress -> hài kịch dí dỏm, phiêu lưu sảng khoái.
  + Muốn hack não -> trinh thám điều tra, vòng lặp thời gian, plot twist bất ngờ.

4. QUY TẮC TRẢ VỀ PHIM VÀ TÊN PHIM (OUTPUT QUALITY):
- "title": Tên tiếng Việt chuẩn xác, trang trọng, quen thuộc nhất ở Việt Nam (hoặc giữ tên gốc nếu là phim kinh điển nổi tiếng như "Inception", "Interstellar", "John Wick"). TUYỆT ĐỐI CẤM DỊCH MÁY MÓC BỊA ĐẶT KỲ LẠ (như dịch The Mongoose thành "Cầy Mangut").
- "original_title": Tên gốc tiếng Anh / quốc tế chuẩn xác.
- "year": Năm phát hành thực tế chính xác (số nguyên 4 chữ số).
- "reason": 1-2 câu ngắn gọn, súc tích, hấp dẫn về điểm nhấn cốt truyện hoặc nút thắt kịch tính của CHÍNH BỘ PHIM ĐÓ. Tuyệt đối CẤM câu chung chung sáo rỗng.
- "analysis": Lời mở đầu niềm nở, thông minh, gắn kết trực tiếp với yêu cầu của người dùng.
- "mood": Tên chủ đề súc tích kèm emoji phù hợp.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "is_trap": false,
  "is_off_topic": false,
  "analysis": "Lời mở đầu duyên dáng, sành sỏi gắn kết trực tiếp với người dùng...",
  "mood": "Tên chủ đề ngắn gọn kèm Emoji (vd: 'Đấu Trí Hack Não 🧠✨')",
  "genres": ["hanh-dong"],
  "country": "au-my",
  "is_latest": false,
  "years": {
    "from": 2010,
    "to": 2024
  },
  "keyword": "",
  "actor": "",
  "director": "",
  "excluded_countries": [],
  "excluded_genres": [],
  "suggested_movies": [
    {
      "title": "Tên tiếng Việt chuẩn",
      "original_title": "Original English/International Title",
      "year": 2010,
      "reason": "Mô tả ngắn gọn, cụ thể về nội dung hoặc nút thắt cốt truyện của chính phim này"
    }
  ]
}`;
}

/**
 * Gọi AI để phân tích câu hỏi người dùng và trả về cấu trúc trích xuất chuẩn
 */
export async function analyzeUserPrompt(
  prompt: string,
  userApiKey?: string
): Promise<{ parsed: AiParsedResult | null; provider: string }> {
  const currentYear = new Date().getFullYear();
  const systemPrompt = buildSystemPrompt(currentYear);
  const typoNormalized = normalizeTypos(prompt);

  let parsed: AiParsedResult | null = null;
  let provider = "Nana AI Engine";

  try {
    const aiRes = await generateFastAiChat({
      systemPrompt,
      userPrompt: `Phân tích yêu cầu tìm phim: "${prompt}" (Ý định chuẩn hóa: "${typoNormalized}"). Mốc năm hiện tại là ${currentYear}. Trả về duy nhất JSON theo đúng schema.`,
      temperature: 0.2,
      maxTokens: 1400,
      jsonMode: true,
      customApiKey: userApiKey,
      timeoutMs: 9500,
    });

    if (aiRes && aiRes.text) {
      parsed = safeParseAiJson(aiRes.text);
      if (aiRes.provider) provider = aiRes.provider;
    }
  } catch (aiErr) {
    console.warn("[aiAnalyzer] AI LLM call failed or timed out:", aiErr);
  }

  return { parsed, provider };
}
