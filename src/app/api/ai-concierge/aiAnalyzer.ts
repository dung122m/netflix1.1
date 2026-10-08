import { generateFastAiChat } from "@/services/aiProviderService";
import { AiParsedResult, SearchIntent } from "./types";
import {
  normalizeTypos,
  resolveCharacter,
  resolveGenreSlug,
  resolveCountrySlug,
  resolveTypeSlug,
  resolveActorSlug,
  getActorAliases,
  cleanNormalizedString,
} from "./taxonomy";
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
  return `Bạn là Nana AI - Trợ Lý Điện Ảnh Thông Minh của Nanaflix (Mốc năm: ${currentYear}).
Nhiệm vụ: Phân tích câu hỏi người dùng & chuyển đổi thành JSON Search Intent (không kèm markdown ngoài JSON):

1. "genres": ["Võ thuật", "Kinh dị", "Hài hước", "Tình cảm", "Hoạt hình", "Hành động", "Cổ trang", "Tâm lý", "Hình sự", "Viễn tưởng", "Phiêu lưu", "Chiến tranh", "Tài liệu", "Bí ẩn"].
2. "countries": ["Hàn Quốc", "Trung Quốc", "Nhật Bản", "Âu Mỹ", "Hồng Kông", "Thái Lan", "Việt Nam", "Đài Loan", "Ấn Độ"].
3. "type": "phim-le" | "phim-bo" | "hoat-hinh" | "tv-shows" | "phim-chieu-rap" | null.
4. "people": Danh sách diễn viên/đạo diễn: [{ "name": "Thành Long", "role": "actor" }]. Nếu tìm nhiều diễn viên, liệt kê đầy đủ.
5. "character": Tên nhân vật (ví dụ "Tôn Ngộ Không", "Batman", "Diệp Vấn").
6. "year" & "yearRange": Số nguyên năm (2024) hoặc khoảng năm { "from": 2015, "to": 2025 }.
7. "is_trap": true nếu câu hỏi chứa tiền đề sai thực tế (ví dụ: 'Tom Cruise đóng Tây Du Ký 1986' hay 'Thành Long đóng Titanic 1997').
8. "is_off_topic": true nếu không liên quan phim ảnh.
9. "suggested_movies": 4-6 tác phẩm điện ảnh xuất sắc, CÓ THẬT, KHỚP CHÍNH XÁC ràng buộc (ví dụ phim võ thuật chiếu rạp -> Diệp Vấn, Tuyệt Đỉnh Kungfu, Fist of Legend...).
10. "analysis": Lời chào và phân tích ngắn gọn sành sỏi. Nếu là câu hỏi bẫy/sai dữ kiện, đính chính lịch sự.

SCHEMA BẮT BUỘC:
{
  "intent": "genre" | "country" | "actor" | "character" | "movie_title" | "year" | "theme" | "mood" | "mixed" | "unknown",
  "genres": [],
  "countries": [],
  "type": null,
  "year": null,
  "yearRange": null,
  "people": [],
  "character": null,
  "keywords": [],
  "themes": [],
  "clearFields": [],
  "exclude": { "countries": [], "genres": [], "titles": [], "keywords": [] },
  "is_trap": false,
  "is_off_topic": false,
  "semanticQuery": "",
  "analysis": "",
  "mood": "Tiêu Đề Kèm Emoji 🎬",
  "suggested_movies": [{ "title": "Tên phim", "original_title": "Original Title", "year": 2024, "reason": "Lý do đúng gu" }]
}`;
}


/**
 * Kiểm tra các câu hỏi bẫy hoặc có tiền đề sai thực tế đã biết
 */
export function checkKnownFactualTraps(prompt: string): { isTrap: boolean; clarification: string } | null {
  const p = cleanNormalizedString(prompt).toLowerCase();

  if (p.includes("tom cruise") && (p.includes("tay du ky") || p.includes("ton ngo khong"))) {
    return {
      isTrap: true,
      clarification: "Phim truyền hình kinh điển 'Tây Du Ký' (1986) do nữ đạo diễn Dương Khiết thực hiện với dàn diễn viên Lục Tiểu Linh Đồng (Tôn Ngộ Không), Từ Thiếu Hoa, Mã Đức Hoa... hoàn toàn không có sự tham gia của Tom Cruise."
    };
  }

  if (p.includes("thanh long") && p.includes("titanic")) {
    return {
      isTrap: true,
      clarification: "Siêu phẩm 'Titanic' (1997) do James Cameron đạo diễn với hai diễn viên chính là Leonardo DiCaprio và Kate Winslet. Thành Long không tham gia bộ phim này."
    };
  }

  if ((p.includes("steven spielberg") || p.includes("spielberg")) && p.includes("interstellar")) {
    return {
      isTrap: true,
      clarification: "Tác phẩm khoa học viễn tưởng 'Interstellar' (2014) do đạo diễn Christopher Nolan chỉ đạo (với kịch bản của Jonathan Nolan và Christopher Nolan), không phải của Steven Spielberg."
    };
  }

  if (p.includes("leonardo") && (p.includes("diep van") || p.includes("ip man"))) {
    return {
      isTrap: true,
      clarification: "Loạt phim võ thuật 'Diệp Vấn' (Ip Man) do Chân Tử Đan đóng chính, không có sự tham gia của Leonardo DiCaprio."
    };
  }

  if (p.includes("christopher nolan") && p.includes("thanh long")) {
    return {
      isTrap: true,
      clarification: "Đạo diễn Christopher Nolan và ngôi sao võ thuật Thành Long chưa từng hợp tác trong dự án điện ảnh nào."
    };
  }

  if (p.includes("thanh long") && (p.includes("2035") || p.includes("2036") || p.includes("2040"))) {
    return {
      isTrap: true,
      clarification: "Hiện tại chưa có bất kỳ thông tin chính thức nào về dự án phim của Thành Long phát hành vào năm 2035."
    };
  }

  return null;
}

/**
 * Gọi AI để phân tích câu hỏi người dùng và trả về cấu trúc trích xuất chuẩn.
 * Hỗ trợ truyền conversation context (các tin nhắn gần nhất) để hiểu ngữ cảnh tiếp nối.
 */
export async function analyzeUserPrompt(
  prompt: string,
  userApiKey?: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  options?: { forceLocalFallback?: boolean }
): Promise<{ parsed: AiParsedResult | null; provider: string }> {
  const currentYear = new Date().getFullYear();
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
  let provider = options?.forceLocalFallback
    ? "Nana AI (Fallback/Heuristic)"
    : "Nana AI Engine";

  if (!options?.forceLocalFallback) {
    try {
      const systemPrompt = buildSystemPrompt(currentYear);
      const aiRes = await generateFastAiChat({
        systemPrompt,
        userPrompt: `${contextPrompt}Phân tích yêu cầu tìm phim hiện tại: "${prompt}" (Chuẩn hóa chính tả: "${typoNormalized}"${charHint}). Mốc năm hiện tại là ${currentYear}. Trả về duy nhất JSON theo đúng schema.`,
        temperature: 0.2,
        maxTokens: 850,
        jsonMode: true,
        customApiKey: userApiKey,
        timeoutMs: 4800,
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

        // Bảo vệ: Kiểm tra câu hỏi bẫy / tiền đề sai
        const trapCheck = checkKnownFactualTraps(prompt);
        if (trapCheck && trapCheck.isTrap) {
          parsed.is_trap = true;
          parsed.analysis = trapCheck.clarification;
          parsed.suggested_movies = [];
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
}

  // Heuristic Fallback cứu cánh nếu LLM thất bại hoàn toàn
  if (!parsed) {
    const cleanPromptLower = cleanNormalizedString(prompt).toLowerCase();

    // Kiểm tra câu hỏi bẫy / sai thực tế trong fallback
    const fallbackTrap = checkKnownFactualTraps(prompt);
    if (fallbackTrap && fallbackTrap.isTrap) {
      return {
        parsed: {
          intent: "unknown",
          keywords: [],
          semanticQuery: prompt,
          concepts: [],
          genres: [],
          countries: [],
          people: [],
          franchises: [],
          themes: [],
          year: null,
          type: null,
          clearFields: [],
          is_trap: true,
          is_off_topic: false,
          analysis: fallbackTrap.clarification,
          mood: "Xác Minh Dữ Kiện 🎬",
          suggested_movies: [],
        },
        provider: "Nana AI Guard (Factual Verification)",
      };
    }

    const detectedConcepts = resolveConcepts(prompt);
    const themePatternMatch = prompt.match(
      /(?:phim\s+(?:về|ve)|chủ\s+đề|chu\s+de|nói\s+về|noi\s+ve|kể\s+về|ke\s+ve|xoay\s+quanh|đề\s+tài|de\s+tai)\s+(.+)/i
    );

    // Kế thừa ngữ cảnh từ conversation history
    const inheritedGenres: string[] = [];
    const inheritedCountries: string[] = [];
    const inheritedActors: Array<{ name: string; role?: "actor" | "director" }> = [];
    const inheritedFranchises: string[] = [];
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
          const actSlug = resolveActorSlug("", msg.content);
          if (actSlug) {
            const actName = getActorAliases(actSlug)[0] || actSlug.replace(/-/g, " ");
            if (!inheritedActors.some((a) => a.name.toLowerCase() === actName.toLowerCase())) {
              inheritedActors.push({ name: actName, role: "actor" });
            }
          }
          if (msg.content.toLowerCase().includes("interstellar")) {
            inheritedFranchises.push("Interstellar");
          }
        }
      }
    }

    const currentGenre = resolveGenreSlug(prompt);
    const currentCountry = resolveCountrySlug(prompt);
    const currentType = resolveTypeSlug(undefined, prompt);
    const currentActorSlug = resolveActorSlug("", prompt);
    const currentActorName = currentActorSlug ? getActorAliases(currentActorSlug)[0] : "";
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

    const clearActorRequested =
      /(?:bo|xoa|khong can)\s+(?:dieu kien\s+)?(?:dien vien|actor)/i.test(cleanPromptLower);

    const clearFields: Array<"year" | "country" | "genre" | "type" | "actor" | "character"> = [];
    if (clearYearRequested) clearFields.push("year");
    if (clearCountryRequested) clearFields.push("country");
    if (clearGenreRequested) clearFields.push("genre");
    if (clearActorRequested) clearFields.push("actor");

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
    const effectiveActors: Array<{ name: string; role?: "actor" | "director" }> = clearActorRequested
      ? []
      : currentActorName
      ? [{ name: currentActorName, role: "actor" }]
      : inheritedActors;
    const effectiveType = currentType || inheritedType || null;
    const effectiveYear = clearYearRequested ? null : currentYear || inheritedYear || null;

    const similarPatternMatch = prompt.match(
      /(?:phim\s+)?(?:giống|giong|tương tự|tuong tu|kiểu như|kieu nhu|same as|similar to|like)\s+(?:phim\s+)?([^\.,\?!]+)/i
    );

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
    } else if (similarPatternMatch && similarPatternMatch[1]) {
      const rawSeed = similarPatternMatch[1]
        .replace(/(?:nhưng|nhung|mà|ma|chứ|chu|không|khong|trừ|tru)[\s\S]*/i, "")
        .trim();
      parsed = {
        intent: "theme",
        keywords: [rawSeed],
        semanticQuery: prompt,
        concepts: [],
        genres: effectiveGenres,
        countries: effectiveCountries,
        people: [],
        franchises: [],
        themes: [`Tương đồng với ${rawSeed}`],
        year: effectiveYear,
        type: effectiveType,
        clearFields,
        is_trap: false,
        is_off_topic: false,
        analysis: `Dưới đây là các tác phẩm điện ảnh tương đồng với "${rawSeed}" dành cho bạn:`,
        mood: `Gợi Ý Tương Đồng 🎬`,
        suggested_movies: [{ title: rawSeed, original_title: rawSeed, reason: `Tương đồng với ${rawSeed}` }],
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
    } else if (effectiveActors.length > 0 || effectiveGenres.length > 0 || effectiveCountries.length > 0 || effectiveType || effectiveYear) {
      let derivedIntent: SearchIntent = "genre";
      if (effectiveActors.length > 0 && (effectiveGenres.length > 0 || effectiveCountries.length > 0)) derivedIntent = "mixed";
      else if (effectiveActors.length > 0) derivedIntent = "actor";
      else if (effectiveGenres.length > 0 && effectiveCountries.length > 0) derivedIntent = "mixed";
      else if (effectiveGenres.length > 0) derivedIntent = "genre";
      else if (effectiveCountries.length > 0) derivedIntent = "country";
      else if (effectiveYear) derivedIntent = "year";

      const actorDesc = effectiveActors.length > 0 ? ` của diễn viên ${effectiveActors.map(a => a.name).join(" & ")}` : "";
      parsed = {
        intent: derivedIntent,
        keywords: effectiveActors.map(a => a.name),
        semanticQuery: prompt,
        concepts: [],
        genres: effectiveGenres,
        countries: effectiveCountries,
        people: effectiveActors,
        franchises: inheritedFranchises,
        themes: [],
        year: effectiveYear,
        type: effectiveType,
        clearFields,
        is_trap: false,
        is_off_topic: false,
        analysis: `Dưới đây là danh sách phim${actorDesc} phù hợp nhất với yêu cầu của bạn:`,
        mood: effectiveActors.length > 0 ? `Diễn Viên: ${effectiveActors[0].name} 🎬` : `Điện Ảnh Tuyển Chọn 🎬`,
        suggested_movies: [],
      };
    }
  }

  return { parsed, provider };
}

