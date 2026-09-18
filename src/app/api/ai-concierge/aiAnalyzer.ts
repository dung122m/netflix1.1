import { generateFastAiChat } from "@/services/aiProviderService";
import { AiParsedResult } from "./types";
import { normalizeTypos, resolveCharacter } from "./taxonomy";
import { resolveConcepts } from "./conceptRegistry";

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
        const intentMatch = cleaned.match(/"intent"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const analysisMatch = cleaned.match(/"analysis"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const moodMatch = cleaned.match(/"mood"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const genreMatch = cleaned.match(/"genres?"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const countryMatch = cleaned.match(/"country"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const actorMatch = cleaned.match(/"actor"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const characterMatch = cleaned.match(/"character"\s*:\s*"((?:\\.|[^"\\])*)"/);
        const semanticQueryMatch = cleaned.match(/"semanticQuery"\s*:\s*"((?:\\.|[^"\\])*)"/);

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
            intent: intentMatch ? intentMatch[1] : undefined,
            semanticQuery: semanticQueryMatch ? semanticQueryMatch[1] : undefined,
            analysis: analysisMatch ? analysisMatch[1] : "",
            mood: moodMatch ? moodMatch[1] : "",
            genres: genreMatch ? [genreMatch[1]] : [],
            country: countryMatch ? countryMatch[1] : "",
            actor: actorMatch ? actorMatch[1] : "",
            character: characterMatch ? characterMatch[1] : "",
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

QUY TẮC PHÂN TÍCH VÀ ĐẶC BIỆT TUÂN THỦ CÁC NGUYÊN TẮC VÀNG SAU:

1. PHÂN LOẠI Ý ĐỊNH TÌM KIẾM (SEARCH INTENT) - BẮT BUỘC ĐIỀN TRƯỜNG "intent":
- "movie_title": Người dùng tìm một tựa phim cụ thể (Ví dụ: "Avatar", "Titanic", "Vua Sư Tử", "Inception", "Interstellar").
- "actor": Người dùng tìm phim theo tên diễn viên (Ví dụ: "phim của Trấn Thành", "phim Tom Cruise", "phim Châu Tinh Trì").
- "character": Người dùng tìm phim theo tên nhân vật (Ví dụ: "phim có nhân vật Trần Chân", "phim về Tôn Ngộ Không", "phim Người Nhện", "phim Batman").
- "genre": Người dùng tìm theo thể loại phim chung (Ví dụ: "phim hành động", "phim kinh dị", "phim hoạt hình anime").
- "country": Người dùng tìm theo quốc gia (Ví dụ: "phim Hàn Quốc", "phim Trung Quốc", "phim Âu Mỹ").
- "theme": Người dùng tìm theo chủ đề, đề tài hoặc bối cảnh trong phim (Ví dụ: "phim có đầu bếp nấu bánh", "phim về ẩm thực", "phim trường học thanh xuân", "phim du hành thời gian", "phim sinh tồn trên đảo hoang", "phim về y khoa bác sĩ", "phim cướp ngân hàng", "phim võ thuật đường phố").
- "mood": Người dùng tìm theo tâm trạng, cảm xúc (Ví dụ: "phim chữa lành", "phim khóc cạn nước mắt", "phim xả stress", "phim hoài niệm mưa đêm").
- "mixed": Kết hợp nhiều yếu tố (Ví dụ: "phim hành động Hàn Quốc", "phim hài đầu bếp Hong Kong", "phim tình cảm Âu Mỹ").
- "unknown": Câu hỏi vô nghĩa, chuỗi ký tự ngẫu nhiên hoặc không thể xác định (Ví dụ: "ABCXYZ123456", "asdfghjk").

2. QUY TẮC ĐẶC BIỆT CHO TRUY VẤN CHỦ ĐỀ & KHÁI NIỆM NGỮ NGHĨA (THEME & SEMANTIC CONCEPT QUERY):
- Khi người dùng hỏi về chủ đề hoặc mô tả cốt truyện, hình mẫu kinh điển trong phim (ví dụ: "thầy trò đi lấy kinh", "đầu bếp nấu bánh", "nhóm người tìm kho báu", "người ngoài hành tinh", "cô gái xuyên không", "sinh tồn trên đảo hoang"...):
  + BẮT BUỘC gán "intent": "theme".
  + TUYỆT ĐỐI KHÔNG coi chủ đề phim là ngoài lề ("is_off_topic" phải là false)!
  + TUYỆT ĐỐI KHÔNG tự tiện gán các thể loại không liên quan (Ví dụ: cấm gán "hanh-dong", "kinh-di" cho phim thầy trò đi lấy kinh hoặc đầu bếp nấu bánh). Trường "genres" để mảng rỗng [] nếu người dùng không yêu cầu thể loại cụ thể.
  + BẮT BUỘC điền trường "keywords": mảng 3 đến 5 từ khóa cốt lõi của chủ đề (Ví dụ: ["thầy trò", "lấy kinh", "thỉnh kinh", "Tây Du Ký"]).
  + BẮT BUỘC điền trường "semanticQuery": câu truy vấn ngữ nghĩa tóm lược chủ đề (Ví dụ: "nhóm thầy trò đi thỉnh kinh Tây Du Ký Đường Tăng Tôn Ngộ Không").
  + BẮT BUỘC điền trường "concepts": mảng mã khái niệm chuẩn hóa (Ví dụ: ["journey_to_west", "pilgrimage"], ["culinary_cooking"], ["treasure_hunt"], ["alien_extraterrestrial"], ["time_travel"], ["zombie_apocalypse"]).

3. XỬ LÝ CÂU HỎI BẪY & ẢO GIÁC (ANTI-HALLUCINATION & TRAP DETECTION):
- CHỈ gán "is_trap": true khi người dùng hỏi về một tác phẩm, phần phim HOÀN TOÀN KHÔNG CÓ THẬT mang tính bịa đặt (Ví dụ: "Inception phần 5 do Trấn Thành làm năm 2028", "Titanic 2 của Christopher Nolan", "Avatar 8").
- TUYỆT ĐỐI KHÔNG coi các lỗi chính tả hoặc nhầm lẫn dấu tiếng Việt (ví dụ: "Trẩn Chân" thay vì "Trần Chân", "Tôn Ngộ Ko" thay vì "Tôn Ngộ Không") là câu hỏi bẫy. Hãy tự động sửa lỗi và trả về "is_trap": false.

4. PHÂN TÁCH CÂU HỎI NGOÀI LỀ THẬT SỰ (OFF-TOPIC):
- CHỈ gán "is_off_topic": true khi người dùng hỏi các việc HOÀN TOÀN KHÔNG LIÊN QUAN ĐẾN PHIM ẢNH (Ví dụ: hỏi dự báo thời tiết hôm nay, nhờ viết code Python, hỏi giá vàng, hỏi tỷ số bóng đá trực tiếp, hỏi công thức hóa học).
- Tuyệt đối không nhầm các chủ đề phim (ẩm thực, nấu ăn, thể thao, trường học, kinh doanh) thành off-topic.

5. PHÂN BIỆT NHÂN VẬT VS DIỄN VIÊN (CHARACTER VS ACTOR):
- "character": Nhân vật trong phim (Trần Chân, Iron Man, Tôn Ngộ Không, Diệp Vấn...).
- "actor": Tên diễn viên ngoài đời thực (Trấn Thành, Chân Tử Đan, Lý Tiểu Long, Tom Cruise...).
- TUYỆT ĐỐI KHÔNG nhầm từ khóa chủ đề (như "đầu bếp", "bác sĩ", "nấu bánh") thành tên diễn viên hay tên nhân vật!

6. QUY TẮC TRẢ VỀ PHIM VÀ TÊN PHIM (OUTPUT QUALITY):
- "title": Tên tiếng Việt quen thuộc, chính xác ở Việt Nam.
- "original_title": Tên gốc tiếng Anh / quốc tế chuẩn xác.
- "year": Năm phát hành thực tế (số nguyên 4 chữ số).
- "reason": 1-2 câu súc tích về điểm nhấn cốt truyện hoặc lý do phù hợp với chủ đề của CHÍNH BỘ PHIM ĐÓ.
- "analysis": Lời mở đầu niềm nở, thông minh, gắn kết trực tiếp với yêu cầu của người dùng.
- "mood": Tên chủ đề súc tích kèm emoji phù hợp.
- "suggested_movies": Đề xuất từ 6 đến 8 tác phẩm điện ảnh xuất sắc nhất, có thật, tiêu biểu cho yêu cầu.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "intent": "theme",
  "keywords": ["đầu bếp", "nấu ăn", "làm bánh", "ẩm thực"],
  "semanticQuery": "phim về đầu bếp làm bánh và ẩm thực",
  "concepts": ["culinary_cooking"],
  "is_trap": false,
  "is_off_topic": false,
  "analysis": "Lời mở đầu duyên dáng, sành sỏi gắn kết trực tiếp với người dùng...",
  "mood": "Tên chủ đề ngắn gọn kèm Emoji (vd: 'Ẩm Thực & Bánh Ngọt 🍰👨‍🍳')",
  "genres": [],
  "country": "",
  "is_latest": false,
  "years": {
    "from": 2000,
    "to": 2026
  },
  "keyword": "",
  "actor": "",
  "director": "",
  "character": "",
  "excluded_countries": [],
  "excluded_genres": [],
  "suggested_movies": [
    {
      "title": "Tên tiếng Việt chuẩn",
      "original_title": "Original English/International Title",
      "year": 2010,
      "reason": "Mô tả ngắn gọn, cụ thể về nội dung của chính phim này"
    }
  ]
}
`;
}

/**
 * Gọi AI để phân tích câu hỏi người dùng và trả về cấu trúc trích xuất chuẩn.
 * Hỗ trợ truyền conversation context (các tin nhắn gần nhất) để hiểu ngữ cảnh tiếp nối.
 */
export async function analyzeUserPrompt(
  prompt: string,
  userApiKey?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ parsed: AiParsedResult | null; provider: string }> {
  const currentYear = new Date().getFullYear();
  const systemPrompt = buildSystemPrompt(currentYear);
  const typoNormalized = normalizeTypos(prompt);
  const detectedChar = resolveCharacter(prompt);
  const charHint = detectedChar
    ? `, Phát hiện ý định tìm kiếm nhân vật: "${detectedChar.name}" (${detectedChar.slug})`
    : "";

  let contextPrompt = "";
  if (conversationHistory && conversationHistory.length > 0) {
    const recentTurns = conversationHistory.slice(-6).map((msg) => {
      const speaker = msg.role === "user" ? "Người dùng" : "Nana AI";
      return `${speaker}: "${(msg.content || "").slice(0, 200)}"`;
    }).join("\n");
    contextPrompt = `\nNgữ cảnh cuộc hội thoại trước đó (6 lượt gần nhất):\n${recentTurns}\n`;
  }

  let parsed: AiParsedResult | null = null;
  let provider = "Nana AI Engine";

  try {
    const aiRes = await generateFastAiChat({
      systemPrompt,
      userPrompt: `${contextPrompt}Phân tích yêu cầu tìm phim hiện tại: "${prompt}" (Ý định chuẩn hóa: "${typoNormalized}"${charHint}). Mốc năm hiện tại là ${currentYear}. Trả về duy nhất JSON theo đúng schema.`,
      temperature: 0.2,
      maxTokens: 850,
      jsonMode: true,
      customApiKey: userApiKey,
      timeoutMs: 4500,
    });

    if (aiRes && aiRes.text) {
      parsed = safeParseAiJson(aiRes.text);
      if (aiRes.provider) provider = aiRes.provider;

      // Bảo vệ: Nếu regex đã xác định rõ ràng là nhân vật có thật trong từ điển
      // thì TUYỆT ĐỐI KHÔNG để LLM gắn cờ is_trap sai lầm do lỗi chính tả
      if (parsed && detectedChar) {
        if (!parsed.character) {
          parsed.character = detectedChar.name;
        }
        if (parsed.is_trap) {
          parsed.is_trap = false;
        }
      }

      // Bảo vệ: Nếu phát hiện các khái niệm ngữ nghĩa cụ thể (như Tây Du Ký / thỉnh kinh, tìm kho báu...)
      // thì đảm bảo intent là "theme", gắn concepts và không bao giờ đánh dấu off_topic / trap
      if (parsed) {
        const detectedConcepts = resolveConcepts(prompt);
        if (detectedConcepts.length > 0) {
          const conceptIds = detectedConcepts.map((c) => c.id);
          parsed.concepts = Array.from(new Set([...(parsed.concepts || []), ...conceptIds]));
          parsed.intent = "theme";
          if (parsed.is_off_topic) parsed.is_off_topic = false;
          if (parsed.is_trap) parsed.is_trap = false;
          if (!parsed.semanticQuery) {
            parsed.semanticQuery = detectedConcepts.map((c) => c.canonicalName).join(" ");
          }
        }
      }
    }
  } catch (aiErr) {
    console.warn("[aiAnalyzer] AI LLM call failed or timed out:", aiErr);
  }

  return { parsed, provider };
}

