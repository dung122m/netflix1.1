import { generateFastAiChat } from "@/services/aiProviderService";
import { AiParsedResult, SearchIntent } from "./types";
import { normalizeTypos, resolveCharacter, resolveGenreSlug, resolveCountrySlug, resolveTypeSlug, cleanNormalizedString } from "./taxonomy";
import { resolveConcepts } from "./conceptRegistry";

/**
 * Xử lý bóc tách chuỗi JSON trả về từ AI với 3 tầng tự động sửa lỗi
 */
/**
 * Xử lý bóc tách chuỗi JSON trả về từ AI với 3 tầng tự động sửa lỗi
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeParseAiJson(rawText: string): any {
  if (!rawText) return null;
  let cleaned = rawText.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedObj: any = null;

  try {
    parsedObj = JSON.parse(cleaned);
  } catch {
    try {
      const sanitized = cleaned
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/[\u0000-\u001F]+/g, " ");
      parsedObj = JSON.parse(sanitized);
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

        parsedObj = JSON.parse(repaired);
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
          parsedObj = {
            intent: intentMatch ? intentMatch[1] : undefined,
            semanticQuery: semanticQueryMatch ? semanticQueryMatch[1] : undefined,
            analysis: analysisMatch ? analysisMatch[1] : "",
            mood: moodMatch ? moodMatch[1] : "",
            genres: genreMatch ? [genreMatch[1]] : [],
            countries: countryMatch ? [countryMatch[1]] : [],
            actor: actorMatch ? actorMatch[1] : "",
            character: characterMatch ? characterMatch[1] : "",
            suggested_movies: movies,
          };
        }
      }
    }
  }

  if (parsedObj && typeof parsedObj === "object") {
    // Normalization / bridge between old & new schema fields
    if (!Array.isArray(parsedObj.genres)) {
      parsedObj.genres = parsedObj.genre ? [parsedObj.genre] : [];
    }
    if (!Array.isArray(parsedObj.countries)) {
      parsedObj.countries = parsedObj.country ? [parsedObj.country] : [];
    }
    if (!Array.isArray(parsedObj.keywords)) {
      parsedObj.keywords = parsedObj.keyword ? [parsedObj.keyword] : [];
    }
    if (!Array.isArray(parsedObj.franchises)) {
      parsedObj.franchises = [];
    }
    if (!Array.isArray(parsedObj.themes)) {
      parsedObj.themes = [];
    }
    if (!Array.isArray(parsedObj.people)) {
      parsedObj.people = [];
      if (parsedObj.actor) {
        parsedObj.people.push({ name: parsedObj.actor, role: "actor" });
      }
      if (parsedObj.director) {
        parsedObj.people.push({ name: parsedObj.director, role: "director" });
      }
    }
    if (!parsedObj.suggested_movies && Array.isArray(parsedObj.movies)) {
      parsedObj.suggested_movies = parsedObj.movies;
    }
    if (!parsedObj.yearRange && parsedObj.years) {
      parsedObj.yearRange = parsedObj.years;
    }
    if (!parsedObj.exclude) {
      parsedObj.exclude = {
        countries: parsedObj.excluded_countries || [],
        genres: parsedObj.excluded_genres || [],
        titles: [],
        keywords: [],
      };
    }
  }

  return parsedObj;
}

/**
 * Xây dựng system prompt chuẩn cho AI Concierge với tư duy Semantic Understanding & Disambiguation
 */
export function buildSystemPrompt(currentYear: number): string {
  return `Bạn là Nana AI - Trợ Lý Điện Ảnh Thông Minh, Sành Sỏi & Thẩm Định Phim của Nanaflix.
MỐC THỜI GIAN HIỆN TẠI: Năm ${currentYear}.

NHIỆM VỤ CỐT LÕI:
Phân tích yêu cầu tìm phim của người dùng theo NGỮ NGHĨA TỔNG QUÁT (Semantic Understanding) và trích xuất cấu trúc Normalized Search Intent.
TUYỆT ĐỐI KHÔNG dịch từng từ ngữ một cách máy móc (literal translation) mà phải hiểu trọn vẹn ngữ cảnh.

NGUYÊN TẮC PHÂN BIỆT VÀ KHỬ NHẬP NHẰNG (DISAMBIGUATION RULES):
1. Siêu nhân Nhật Bản vs Superman:
   - "phim về siêu nhân nhật bản", "anh hùng biến hình nhật", "tokusatsu", "phim kiểu Kamen Rider", "5 anh em siêu nhân", "siêu nhân Gao", "quái vật Nhật":
     -> countries: ["Nhật Bản"] (Japan)
     -> themes: ["Japanese tokusatsu", "anh hùng biến hình"]
     -> franchises: ["Super Sentai", "Kamen Rider", "Ultraman", "Power Rangers"]
     -> concepts: ["japanese_tokusatsu"]
     -> TUYỆT ĐỐI KHÔNG hiểu thành "Superman" hay phim siêu anh hùng Âu Mỹ!
   - "Superman", "Người đàn ông thép", "Clark Kent":
     -> franchises: ["Superman"]
     -> character: "Superman"
     -> countries: ["Âu Mỹ"]
   - "Người Nhện" / "Spider-Man":
     -> franchises: ["Spider-Man"]
     -> character: "Spider-Man"
     -> countries: ["Âu Mỹ"]
   - "Batman" / "Người Dơi":
     -> franchises: ["Batman"]
     -> character: "Batman"
     -> countries: ["Âu Mỹ"]
   - "Kamen Rider" / "Hiệp sĩ mặt nạ":
     -> franchises: ["Kamen Rider"]
     -> countries: ["Nhật Bản"]
     -> concepts: ["japanese_tokusatsu"]
   - "Ultraman" / "Siêu nhân điện quang":
     -> franchises: ["Ultraman"]
     -> countries: ["Nhật Bản"]
     -> concepts: ["japanese_tokusatsu"]

2. Phân tích đa ràng buộc (Multi-constraint Handling) & Định dạng phim:
   - Khi người dùng kết hợp nhiều điều kiện (thể loại + quốc gia + diễn viên + thời gian + định dạng), BẮT BUỘC trích xuất ĐẦY ĐỦ các trường, KHÔNG được bỏ sót:
     Ví dụ: "phim bộ Hàn Quốc trinh thám năm 2023"
     -> type: "series" (hoặc "phim-bo")
     -> genres: ["Hình sự"]
     -> countries: ["Hàn Quốc"]
     -> themes: ["trinh thám", "phá án", "điều tra"]
     -> year: 2023
     Ví dụ: "phim lẻ kinh dị Mỹ"
     -> type: "single" (hoặc "phim-le")
     -> genres: ["Kinh dị"]
     -> countries: ["Âu Mỹ"]
     Ví dụ: "phim kiếm hiệp Trung Quốc"
     -> genres: ["Cổ trang", "Võ thuật"]
     -> countries: ["Trung Quốc"]
     -> concepts: ["kiem_hiep"]
     -> themes: ["kiếm hiệp", "võ lâm giang hồ"]
     Ví dụ: "phim hoa ngữ"
     -> countries: ["Trung Quốc"]
     Ví dụ: "phim trinh thám phá án"
     -> genres: ["Hình sự"]
     -> themes: ["trinh thám", "phá án", "điều tra tội phạm"]

3. Ràng buộc loại trừ & Lệnh xóa bộ lọc trong hội thoại (Exclusions & Clear Filters):
   - Khi người dùng yêu cầu loại trừ hoặc tìm phim tương tự mà không phải phim gốc:
     Ví dụ: "phim giống John Wick nhưng không phải John Wick"
     -> themes: ["sát thủ", "hành động bắn súng", "gun-fu", "trả thù"]
     -> exclude: {"titles": ["John Wick", "Sát Thủ John Wick"]}
     -> suggested_movies: các phim như Nobody, Atomic Blonde, Bullet Train, Taken... KHÔNG ĐƯỢC đề xuất John Wick.
   - Khi người dùng yêu cầu HỦY/XÓA điều kiện lọc từ các lượt chat trước (Ví dụ: "bỏ điều kiện năm đi", "bỏ năm", "không giới hạn năm nữa", "bỏ quốc gia", "bỏ thể loại", "cho mình xem tất cả các năm"):
     -> "clearFields": ["year"] (hoặc ["country"], ["genre"], ["type"], ["actor"])
     -> Giữ nguyên các bộ lọc còn lại từ ngữ cảnh trước đó (Ví dụ: nếu trước đó là phim kinh dị Thái Lan năm 2020, người dùng bảo "bỏ năm" thì genres: ["Kinh dị"], countries: ["Thái Lan"], year: null, clearFields: ["year"]).

4. Phân loại Search Intent (Trường "intent"):
   - "movie_title": Tìm tựa phim cụ thể (Ví dụ: "Inception", "Avatar", "Titanic", "Mắt Biếc").
   - "actor": Tìm theo diễn viên (Ví dụ: "phim của Trấn Thành", "phim Thành Long", "phim Châu Tinh Trì").
   - "character": Tìm theo nhân vật cụ thể (Ví dụ: "phim về Tôn Ngộ Không", "phim Spider-Man", "phim Batman").
   - "genre": Tìm theo thể loại (Ví dụ: "phim kinh dị", "phim anime", "phim hài").
   - "country": Tìm theo quốc gia (Ví dụ: "phim Hàn Quốc", "phim Thái Lan").
   - "theme": Tìm theo chủ đề, bối cảnh, nghề nghiệp hoặc khái niệm (Ví dụ: "siêu nhân nhật bản", "phim cảnh sát phá án", "phim về đầu bếp", "thầy trò đi lấy kinh", "xuyên không", "sinh tồn đảo hoang", "người ngoài hành tinh", "bác sĩ y khoa", "luật sư tòa án", "kiếm hiệp giang hồ", "tổng tài bá đạo", "trả thù").
   - "mixed": Kết hợp nhiều yếu tố (Ví dụ: "phim hành động Hàn Quốc sau 2020", "phim hài Trung Quốc Châu Tinh Trì", "phim bộ trinh thám Hàn Quốc 2023").
   - "mood": Tìm theo tâm trạng cảm xúc (Ví dụ: "phim chữa lành tâm hồn", "phim xả stress").
   - "unknown": Vô nghĩa hoặc không xác định (Ví dụ: "asdfghjk", "123456").

5. Chống ảo giác & Câu hỏi bẫy / Ngoài lề:
   - "is_trap": true CHỈ KHI người dùng hỏi về tác phẩm bịa đặt hoàn toàn không có thật (Ví dụ: "Inception 5 của Trấn Thành năm 2030").
   - "is_off_topic": true CHỈ KHI hỏi việc không liên quan đến phim ảnh (thời tiết, code Python, giá vàng). Các chủ đề nghề nghiệp/bối cảnh trong phim KHÔNG PHẢI off-topic!

6. Cấu trúc danh sách phim đề xuất ("suggested_movies"):
   - Đề xuất từ 6 đến 8 tác phẩm điện ảnh xuất sắc, có thật, tiêu biểu nhất cho yêu cầu.
   - "title": Tên tiếng Việt chuẩn tại Việt Nam.
   - "original_title": Tên gốc tiếng Anh / Quốc tế chính xác.
   - "year": Năm phát hành (số nguyên 4 chữ số).
   - "reason": 1-2 câu giải thích tại sao phim khớp với yêu cầu của người dùng.

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON THEO SCHEMA SAU (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "intent": "theme",
  "keywords": ["siêu nhân nhật bản", "tokusatsu", "kamen rider", "super sentai", "biến hình"],
  "genres": ["Hành động", "Viễn tưởng"],
  "countries": ["Nhật Bản"],
  "people": [],
  "franchises": ["Super Sentai", "Kamen Rider", "Ultraman"],
  "themes": ["Japanese tokusatsu", "anh hùng biến hình"],
  "year": null,
  "yearRange": null,
  "type": null,
  "clearFields": [],
  "exclude": {
    "countries": [],
    "genres": [],
    "titles": [],
    "keywords": []
  },
  "sortPreference": null,
  "concepts": ["japanese_tokusatsu"],
  "is_trap": false,
  "is_off_topic": false,
  "semanticQuery": "phim siêu nhân tokusatsu Nhật Bản anh hùng biến hình Kamen Rider Super Sentai",
  "analysis": "Lời chào mở đầu niềm nở, hiểu đúng ý định người dùng và sành sỏi về điện ảnh...",
  "mood": "Siêu Nhân Tokusatsu 🇯🇵⚡",
  "suggested_movies": [
    {
      "title": "Tên tiếng Việt",
      "original_title": "Original Title",
      "year": 2023,
      "reason": "Lý do tác phẩm này phù hợp"
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
    ? `, Gợi ý nhân vật nhận diện được: "${detectedChar.name}" (${detectedChar.slug})`
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
      userPrompt: `${contextPrompt}Phân tích yêu cầu tìm phim hiện tại: "${prompt}" (Chuẩn hóa chính tả: "${typoNormalized}"${charHint}). Mốc năm hiện tại là ${currentYear}. Trả về duy nhất JSON theo đúng schema.`,
      temperature: 0.2,
      maxTokens: 450,
      jsonMode: true,
      customApiKey: userApiKey,
      timeoutMs: 2000,
    });

    if (aiRes && aiRes.text) {
      parsed = safeParseAiJson(aiRes.text);
      if (aiRes.provider) provider = aiRes.provider;

      if (parsed) {
        // Disambiguation Guard: Nếu query có từ khóa Tokusatsu / Siêu nhân Nhật Bản
        // TUYỆT ĐỐI KHÔNG để gán nhầm thành Superman
        const detectedConcepts = resolveConcepts(prompt, parsed.concepts);
        const hasTokusatsu = detectedConcepts.some((c) => c.id === "japanese_tokusatsu");

        if (hasTokusatsu) {
          if (parsed.character === "Superman" || parsed.franchises?.includes("Superman")) {
            parsed.character = undefined;
            parsed.franchises = (parsed.franchises || []).filter((f) => f !== "Superman");
          }
          if (!parsed.countries || parsed.countries.length === 0) {
            parsed.countries = ["Nhật Bản"];
          }
          if (!parsed.concepts?.includes("japanese_tokusatsu")) {
            parsed.concepts = Array.from(new Set([...(parsed.concepts || []), "japanese_tokusatsu"]));
          }
        }

        // Bảo vệ: Nếu regex đã xác định rõ ràng là nhân vật có thật trong từ điển
        // và không mâu thuẫn với ngữ cảnh tokusatsu
        if (detectedChar && !hasTokusatsu) {
          if (!parsed.character) {
            parsed.character = detectedChar.name;
          }
          if (parsed.is_trap) {
            parsed.is_trap = false;
          }
        }

        // Bảo vệ: Gắn concept IDs nếu trigger phrases khớp
        if (detectedConcepts.length > 0) {
          const conceptIds = detectedConcepts.map((c) => c.id);
          parsed.concepts = Array.from(new Set([...(parsed.concepts || []), ...conceptIds]));
          if (parsed.intent === "unknown") parsed.intent = "theme";
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

  // Heuristic Fallback cứu cánh nếu LLM thất bại hoàn toàn
  if (!parsed) {
    const cleanPromptLower = cleanNormalizedString(prompt).toLowerCase();
    const detectedConcepts = resolveConcepts(prompt);
    const themePatternMatch = prompt.match(
      /(?:phim\s+(?:về|ve)|chủ\s+đề|chu\s+de|nói\s+về|noi\s+ve|kể\s+về|ke\s+ve|xoay\s+quanh|đề\s+tài|de\s+tai)\s+(.+)/i
    );

    // Kế thừa ngữ cảnh từ conversation history
    const inheritedGenres: string[] = [];
    const inheritedCountries: string[] = [];
    let inheritedType: string | null = null;
    let inheritedYear: number | null = null;

    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role === "user") {
          const g = resolveGenreSlug(msg.content);
          if (g && !inheritedGenres.includes(g)) inheritedGenres.push(g);
          const c = resolveCountrySlug(msg.content);
          if (c && !inheritedCountries.includes(c)) inheritedCountries.push(c);
          const t = resolveTypeSlug(undefined, msg.content);
          if (t) inheritedType = t;
          const ym = msg.content.match(/\b(19\d{2}|20\d{2})\b/);
          if (ym) inheritedYear = parseInt(ym[1], 10);
        }
      }
    }

    const currentGenre = resolveGenreSlug(prompt);
    const currentCountry = resolveCountrySlug(prompt);
    const currentType = resolveTypeSlug(undefined, prompt);
    const explicitYearMatch = prompt.match(/(?:năm|nam)\s*(\d{4})/i) || prompt.match(/\b(19\d{2}|20\d{2})\b/);
    const currentYear = explicitYearMatch ? parseInt(explicitYearMatch[1], 10) : null;

    const clearYearRequested =
      /(?:bo|xoa|bo qua|khong gioi han|tat ca|moi)\s+(?:dieu kien\s+)?(?:nam|thoi gian)/i.test(cleanPromptLower) ||
      /(?:bo|xoa)\s+nam/i.test(cleanPromptLower) ||
      /(?:khong|chua)\s+(?:can|gioi han)\s+nam/i.test(cleanPromptLower);

    const clearCountryRequested =
      /(?:bo|xoa|khong gioi han|tat ca|moi)\s+(?:dieu kien\s+)?(?:quoc gia|nuoc)/i.test(cleanPromptLower) ||
      /(?:bo|xoa)\s+quoc gia/i.test(cleanPromptLower);

    const clearGenreRequested =
      /(?:bo|xoa|khong gioi han)\s+(?:dieu kien\s+)?(?:the loai|loai phim)/i.test(cleanPromptLower) ||
      /(?:bo|xoa)\s+the loai/i.test(cleanPromptLower);

    const clearFields: Array<"year" | "country" | "genre" | "type" | "actor" | "character"> = [];
    if (clearYearRequested) clearFields.push("year");
    if (clearCountryRequested) clearFields.push("country");
    if (clearGenreRequested) clearFields.push("genre");

    const effectiveGenres = clearGenreRequested
      ? []
      : currentGenre
      ? [currentGenre]
      : inheritedGenres;
    const effectiveCountries = clearCountryRequested
      ? []
      : currentCountry
      ? [currentCountry]
      : inheritedCountries;
    const effectiveType = currentType || inheritedType || null;
    const effectiveYear = clearYearRequested ? null : currentYear || inheritedYear || null;

    if (detectedConcepts.length > 0) {
      const conceptIds = detectedConcepts.map((c) => c.id);
      const isTokusatsu = conceptIds.includes("japanese_tokusatsu");
      parsed = {
        intent: "theme",
        keywords: detectedConcepts.flatMap((c) => c.discoveryKeywords),
        semanticQuery: detectedConcepts.map((c) => c.canonicalName).join(" "),
        concepts: conceptIds,
        genres: isTokusatsu ? ["Hành động", "Viễn tưởng"] : effectiveGenres,
        countries: isTokusatsu ? ["Nhật Bản"] : effectiveCountries,
        people: [],
        franchises: isTokusatsu ? ["Super Sentai", "Kamen Rider", "Ultraman"] : [],
        themes: [detectedConcepts[0]?.canonicalName || "Chủ đề"],
        year: effectiveYear,
        type: effectiveType,
        clearFields,
        is_trap: false,
        is_off_topic: false,
        analysis: `Dưới đây là các tác phẩm điện ảnh tiêu biểu về ${detectedConcepts[0]?.canonicalName} dành cho bạn:`,
        mood: `${detectedConcepts[0]?.canonicalName} 🎬`,
        suggested_movies: [],
      };
    } else if (themePatternMatch) {
      const rawTheme = themePatternMatch[1].trim();
      parsed = {
        intent: "theme",
        keywords: [rawTheme],
        semanticQuery: prompt,
        concepts: [],
        genres: effectiveGenres,
        countries: effectiveCountries,
        people: [],
        franchises: [],
        themes: [rawTheme],
        year: effectiveYear,
        type: effectiveType,
        clearFields,
        is_trap: false,
        is_off_topic: false,
        analysis: `Dưới đây là các tác phẩm điện ảnh xuất sắc về chủ đề "${rawTheme}" dành cho bạn:`,
        mood: `Chủ Đề & Điện Ảnh 🎬`,
        suggested_movies: [],
      };
    } else if (effectiveGenres.length > 0 || effectiveCountries.length > 0 || effectiveType || effectiveYear) {
      let derivedIntent: SearchIntent = "genre";
      if (effectiveGenres.length > 0 && effectiveCountries.length > 0) derivedIntent = "mixed";
      else if (effectiveGenres.length > 0) derivedIntent = "genre";
      else if (effectiveCountries.length > 0) derivedIntent = "country";
      else if (effectiveYear) derivedIntent = "year";

      parsed = {
        intent: derivedIntent,
        keywords: [],
        semanticQuery: prompt,
        concepts: [],
        genres: effectiveGenres,
        countries: effectiveCountries,
        people: [],
        franchises: [],
        themes: [],
        year: effectiveYear,
        type: effectiveType,
        clearFields,
        is_trap: false,
        is_off_topic: false,
        analysis: `Dưới đây là danh sách phim phù hợp nhất với yêu cầu của bạn:`,
        mood: `Điện Ảnh Tuyển Chọn 🎬`,
        suggested_movies: [],
      };
    }
  }

  return { parsed, provider };
}

