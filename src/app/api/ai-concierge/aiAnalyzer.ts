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
Chuyển đổi câu hỏi tự nhiên của người dùng thành cấu trúc Normalized Search Intent dựa trên catalog & bộ lọc chuẩn của Nanaflix:
1. "genres": Danh sách thể loại chuẩn từ catalog:
   - "Võ thuật" (kungfu, võ thuật, võ đạo, quyền cước, wushu, đánh võ)
   - "Kinh dị" (kinh dị, phim ma, quỷ, rùng rợn, tâm linh, ám ảnh)
   - "Hài hước" (hài hước, hài, gây cười, vui nhộn, hài kịch)
   - "Tình cảm" (tình cảm, lãng mạn, tình yêu, yêu đương, ngôn tình, chữa lành)
   - "Hoạt hình" (hoạt hình, anime, manga, hoạt họa)
   - "Hành động" (hành động, bắn súng, rượt đuổi, đặc nhiệm, cướp)
   - "Cổ trang" (cổ trang, cung đấu, triều đại, kiếm hiệp, tiên hiệp)
   - "Tâm lý" (tâm lý, chính kịch, gia đình, xã hội, đời sống)
   - "Hình sự" (hình sự, trinh thám, phá án, cảnh sát, điều tra, tội phạm)
   - "Viễn tưởng" (viễn tưởng, khoa học viễn tưởng, sci-fi, du hành thời gian, vũ trụ)
   - "Phiêu lưu" (phiêu lưu, thám hiểm, khám phá, sinh tồn)
   - "Chiến tranh" (chiến tranh, quân sự, lịch sử)
   - "Tài liệu" (tài liệu, khoa học, documentary)
   - "Bí ẩn" (bí ẩn, bí mật, hack não, đấu trí)

2. "countries": Danh sách quốc gia chuẩn:
   - "Hàn Quốc" (korea, hàn, hàn quốc, k-drama)
   - "Trung Quốc" (china, trung quốc, hoa ngữ, đại lục, c-drama)
   - "Nhật Bản" (japan, nhật, nhật bản, anime, j-drama)
   - "Âu Mỹ" (hollywood, mỹ, us, anh, uk, pháp, đức, ý, âu mỹ, phương tây)
   - "Hồng Kông" (hồng kông, hong kong, tvb)
   - "Thái Lan" (thái lan, thai)
   - "Việt Nam" (việt nam, phim việt)
   - "Đài Loan" (đài loan, taiwan)
   - "Ấn Độ" (ấn độ, bollywood)

3. "type": Định dạng phim chuẩn:
   - "phim-le": Phim lẻ / Điện ảnh / Chiếu rạp (single movie, không phải phim bộ dài tập hay anime dài tập).
   - "phim-bo": Phim bộ / Series nhiều tập / Drama truyền hình.
   - "hoat-hinh": Phim hoạt hình / Anime.
   - "tv-shows": TV Shows / Chương trình truyền hình thực tế / Gameshow.
   - "phim-chieu-rap": Phim điện ảnh chiếu rạp.

4. "year" & "yearRange": Năm cụ thể (số nguyên 4 chữ số, ví dụ 2024, 2023) hoặc khoảng năm { "from": 2020, "to": 2024 }.

5. "people": Danh sách diễn viên / đạo diễn: [{ "name": "Thành Long", "role": "actor" }].

6. "intent": Phân loại chính:
   - "genre": Tìm theo thể loại (ví dụ: "phim võ thuật chiếu rạp", "phim kinh dị", "phim hài 2024").
   - "country": Tìm theo quốc gia (ví dụ: "phim Hàn Quốc", "phim Thái Lan").
   - "actor": Tìm theo diễn viên (ví dụ: "phim của Thành Long", "phim Trấn Thành", "phim Châu Tinh Trì").
   - "character": Tìm theo nhân vật cụ thể (ví dụ: "phim về Tôn Ngộ Không", "phim Batman", "phim Diệp Vấn").
   - "movie_title": Tìm đích danh tựa phim cụ thể.
   - "year": Tìm theo năm phát hành.
   - "theme": Tìm theo chủ đề, nghề nghiệp, khái niệm cốt truyện (ví dụ: "siêu nhân nhật bản", "bác sĩ y khoa", "đầu bếp", "xuyên không").
   - "mood": Tìm theo cảm xúc (ví dụ: "phim chữa lành", "phim xả stress").
   - "mixed": Kết hợp nhiều điều kiện (ví dụ: "phim tình cảm Hàn Quốc", "phim lẻ Hàn Quốc kinh dị 2023", "phim Trung Quốc cổ trang").

7. ĐẶC BIỆT VỀ "suggested_movies":
   - Đề xuất 6-8 tác phẩm điện ảnh xuất sắc, có thật, KHỚP CHÍNH XÁC với TOÀN BỘ ràng buộc của người dùng.
   - VÍ DỤ: Nếu người dùng tìm "phim võ thuật chiếu rạp" (genre = Võ thuật, type = phim-le):
     -> BẮT BUỘC đề xuất các phim điện ảnh võ thuật võ hiệp kinh điển (Diệp Vấn / Ip Man, Tuyệt Đỉnh Kungfu / Kung Fu Hustle, Sát Phá Lang / SPL, Tinh Võ Môn / Fist of Legend, Ong Bak, The Raid: Redemption, Ngọa Hổ Tàng Long, Thập Diện Mai Phục...).
     -> TUYỆT ĐỐI KHÔNG đề xuất anime dài tập hoặc phim siêu anh hùng Âu Mỹ thuần bắn súng/khoa học viễn tưởng (như Naruto, Dragon Ball, Avengers, Spider-Man)!

BẮT BUỘC TRẢ VỀ DUY NHẤT MỘT ĐỐI TƯỢNG JSON THEO SCHEMA SAU (KHÔNG KÈM TEXT NGOÀI JSON):
{
  "intent": "genre",
  "genres": ["Võ thuật"],
  "countries": [],
  "type": "phim-le",
  "year": null,
  "yearRange": null,
  "people": [],
  "keywords": ["võ thuật", "chiếu rạp"],
  "themes": ["võ thuật", "kungfu"],
  "clearFields": [],
  "exclude": {
    "countries": [],
    "genres": [],
    "titles": [],
    "keywords": []
  },
  "sortPreference": null,
  "concepts": [],
  "is_trap": false,
  "is_off_topic": false,
  "semanticQuery": "phim võ thuật kung fu điện ảnh chiếu rạp",
  "analysis": "Lời chào mở đầu niềm nở, hiểu đúng ý định người dùng và sành sỏi về điện ảnh...",
  "mood": "Võ Thuật Đỉnh Cao 🥋💥",
  "suggested_movies": [
    {
      "title": "Diệp Vấn",
      "original_title": "Ip Man",
      "year": 2008,
      "reason": "Tuyệt phẩm võ thuật Vịnh Xuân Quyền đỉnh cao của điện ảnh võ thuật"
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

