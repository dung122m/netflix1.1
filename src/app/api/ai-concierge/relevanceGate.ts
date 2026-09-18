import { SearchIntent, CharacterProfile } from "./types";
import {
  cleanNormalizedString,
  extractMovieYear,
  getActorAliases,
  hasWordMatch,
  matchesActor,
  matchesCountry,
  matchesGenre,
  resolveGenreSlug,
  resolveCountrySlug,
  resolveActorSlug,
  resolveCharacter,
} from "./taxonomy";
import { toSafeActors, toSafeCategory, toSafeCountry } from "./movieFormatter";
import { resolveConcepts, evaluateConceptEvidence } from "./conceptRegistry";

export interface RelevanceCheckOptions {
  originalQuery: string;
  keywords?: string[];
  semanticQuery?: string;
  concepts?: string[];
  expectedActorSlug?: string;
  expectedCharacter?: string;
  targetGenreSlug?: string;
  targetCountrySlug?: string;
  targetYear?: number;
  detectedChar?: CharacterProfile | null;
}

export interface RelevanceResult {
  relevant: boolean;
  score: number;
  reason?: string;
}

// Danh sách các từ dừng phổ biến trong câu hỏi phim tiếng Việt
export const VIETNAMESE_STOP_WORDS = new Set([
  "phim",
  "nhung",
  "những",
  "bo",
  "bộ",
  "cac",
  "các",
  "co",
  "có",
  "ve",
  "về",
  "cho",
  "toi",
  "tôi",
  "minh",
  "mình",
  "hay",
  "nhat",
  "nhất",
  "xem",
  "mot",
  "một",
  "vai",
  "vài",
  "la",
  "là",
  "gi",
  "gì",
  "nao",
  "nào",
  "muon",
  "muốn",
  "tim",
  "tìm",
  "goi",
  "gợi",
  "y",
  "ý",
  "nhu",
  "như",
  "the",
  "thể",
  "loai",
  "loại",
  "kieu",
  "kiểu",
]);

// Danh sách các từ đơn quá ngắn hoặc quá chung chung, không được coi là từ khóa chủ đề độc lập
export const GENERIC_SINGLE_WORDS = new Set([
  "nha",
  "nhà",
  "hang",
  "hàng",
  "dau",
  "đầu",
  "bep",
  "bếp",
  "banh",
  "bánh",
  "nau",
  "nấu",
  "nguoi",
  "người",
  "ngay",
  "ngày",
  "nam",
  "năm",
  "thang",
  "tháng",
  "con",
  "xe",
  "bac",
  "bác",
  "chuyen",
  "chuyện",
  "khi",
  "luc",
  "lúc",
  "noi",
  "nơi",
  "cho",
  "chỗ",
  "di",
  "đi",
  "den",
  "đến",
  "ve",
  "về",
  "ai",
  "toi",
  "anh",
  "em",
  "co",
  "chu",
  "ong",
  "ba",
  "thay",
  "thầy",
  "tro",
  "trò",
  "nhom",
  "nhóm",
  "hanh",
  "hành",
  "trinh",
  "trình",
  "tim",
  "tìm",
  "kiem",
  "kiếm",
  "gai",
  "gái",
  "kinh",
  "lay",
  "lấy",
  "may",
  "mấy",
]);

// Danh sách các cụm từ quá chung chung không cấu thành một chủ đề phim cụ thể
const GENERIC_PHRASES = new Set([
  "hanh trinh",
  "hành trình",
  "nhom nguoi",
  "nhóm người",
  "di tim",
  "đi tìm",
  "co nguoi",
  "có người",
  "ve nguoi",
  "về người",
  "co thay",
  "có thầy",
  "co bep",
  "có bếp",
  "co banh",
  "có bánh",
]);

/**
 * Trích xuất các cụm từ hoặc từ khóa thực chất từ câu truy vấn (loại bỏ stop words & generic single words)
 */
export function extractContentKeywords(query: string): string[] {
  const clean = cleanNormalizedString(query || "");
  if (!clean) return [];

  // Tách bỏ các tiền tố phổ biến như "phim ve", "phim chu de", "phim noi ve", v.v.
  const coreSubject = clean
    .replace(/^(?:phim\s+)?(?:ve|chu de|noi ve|ke ve|xoay quanh|de tai)\s+/i, "")
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter(
    (w) =>
      !VIETNAMESE_STOP_WORDS.has(w) &&
      !GENERIC_SINGLE_WORDS.has(w) &&
      w.length >= 3
  );

  const keywords: string[] = [];

  if (coreSubject && coreSubject.length >= 2 && !GENERIC_PHRASES.has(coreSubject) && !VIETNAMESE_STOP_WORDS.has(coreSubject)) {
    keywords.push(coreSubject);
  }

  // 1. Thêm cụm 2 từ liền kề có nghĩa
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i];
    const w2 = words[i + 1];
    const isW1Generic = VIETNAMESE_STOP_WORDS.has(w1) || GENERIC_SINGLE_WORDS.has(w1);
    const isW2Generic = VIETNAMESE_STOP_WORDS.has(w2) || GENERIC_SINGLE_WORDS.has(w2);

    // Không cho phép bigram cấu tạo từ 2 từ generic, hoặc bắt đầu bằng từ dừng như 've', 'phim', 'tim'
    if (VIETNAMESE_STOP_WORDS.has(w1) || (isW1Generic && isW2Generic)) {
      continue;
    }

    const bigram = `${w1} ${w2}`;
    if (GENERIC_PHRASES.has(bigram)) {
      continue;
    }

    keywords.push(bigram);
  }

  // 2. Thêm từng từ đơn có nghĩa sâu sắc
  keywords.push(...meaningfulWords);

  return Array.from(new Set(keywords));
}

/**
 * Phát hiện chuỗi ngẫu nhiên, vô nghĩa, spam hoặc không thể là câu hỏi tìm phim hợp lệ
 */
export function isGibberishQuery(query: string): boolean {
  if (!query) return true;
  const trimmed = query.trim();
  if (trimmed.length < 2) return true;
  // Chuỗi gồm cả chữ và số dính liền dài bất thường: ABCXYZ123456, test123456, abc123xyz
  if (/[a-zA-Z]{3,}\d{2,}/.test(trimmed) || /\d{2,}[a-zA-Z]{3,}/.test(trimmed)) return true;
  // Chuỗi không có dấu cách dài >= 6 ký tự và có >= 5 phụ âm liên tiếp (ví dụ: bcxyz, asdfgh)
  if (!trimmed.includes(" ") && trimmed.length >= 6 && /[bcdfghjklmnpqrstvwxz]{5,}/i.test(trimmed)) return true;
  // Chuỗi ký tự lặp vô nghĩa (ví dụ: aaaaaa, zzzzzz, 111111)
  if (/^(.)\1{4,}$/.test(trimmed)) return true;
  return false;
}

/**
 * Phát hiện câu truy vấn quá mơ hồ, chung chung (ví dụ: "phim về người", "phim có người", "phim có thầy", "phim có hành trình", "phim đi tìm")
 */
export function isVagueQuery(query: string): boolean {
  if (!query) return true;
  const clean = cleanNormalizedString(query);
  if (!clean || clean.length < 2) return true;

  // 1. Nếu câu hỏi khớp với một concept cụ thể trong registry (ví dụ: thay tro di lay kinh, xuyen khong, ufo...) -> Không phải vague
  const matchedConcepts = resolveConcepts(clean);
  if (matchedConcepts.length > 0) return false;

  // 2. Nếu chứa năm phát hành cụ thể 4 chữ số (ví dụ: 2024, 1999) -> Không phải vague
  if (/\b(19\d{2}|20\d{2})\b/.test(query)) return false;

  // 3. Nếu khớp thể loại, quốc gia, diễn viên hoặc nhân vật -> Không phải vague
  if (
    resolveGenreSlug(query) ||
    resolveCountrySlug(query) ||
    resolveActorSlug("", query) ||
    resolveCharacter(query)
  ) {
    return false;
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  // Nếu tất cả các từ trong câu đều là stop words hoặc generic single words
  const nonGenericWords = words.filter(
    (w) => !VIETNAMESE_STOP_WORDS.has(w) && !GENERIC_SINGLE_WORDS.has(w)
  );

  return nonGenericWords.length === 0;
}

/**
 * Cổng kiểm duyệt độ liên quan tối hậu (Strict Final Relevance Gate).
 * Phải được chạy sau khi thu thập tất cả ứng viên và trước khi trả về cho client.
 * Nếu không có bằng chứng liên quan thực sự trong metadata/title/synopsis: REJECT NGAY!
 */
export function isRelevantToQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movie: any,
  parsedIntent?: SearchIntent,
  options?: RelevanceCheckOptions
): RelevanceResult {
  if (!movie) return { relevant: false, score: 0, reason: "Phim rỗng" };

  const rawQuery = options?.originalQuery || "";
  const cleanQ = cleanNormalizedString(rawQuery);

  // 1. CHẶN TRUY VẤN VÔ NGHĨA HOẶC QUÁ NGẮN KHÔNG CÓ Ý NGHĨA
  if (!cleanQ || cleanQ.length < 2) {
    return { relevant: false, score: 0, reason: "Truy vấn quá ngắn" };
  }

  // Phát hiện chuỗi ngẫu nhiên vô nghĩa hoặc câu hỏi quá mơ hồ, chung chung
  if (isGibberishQuery(rawQuery) || isVagueQuery(rawQuery) || parsedIntent === "unknown") {
    return { relevant: false, score: 0, reason: "Truy vấn vô nghĩa, mơ hồ hoặc không xác định" };
  }

  const name = cleanNormalizedString(movie.name || movie.title || "");
  const orig = cleanNormalizedString(movie.origin_name || "");
  const slug = cleanNormalizedString(movie.slug || "");
  const category = toSafeCategory(movie);
  const country = toSafeCountry(movie);
  const actors = toSafeActors(movie);
  const desc = cleanNormalizedString(movie.content || movie.description || movie.overview || "");

  // 2. INTENT = MOVIE_TITLE (Tìm tựa phim cụ thể)
  if (parsedIntent === "movie_title") {
    const cleanQSlug = cleanQ.replace(/\s+/g, "-");
    // 1. Khớp chính xác hoàn toàn (tựa Việt, tựa gốc, hoặc slug)
    const isExact = name === cleanQ || orig === cleanQ || slug === cleanQSlug;
    if (isExact) return { relevant: true, score: 100, reason: "Khớp chính xác tựa phim" };

    // 2. Khớp bắt đầu bằng tựa phim / franchise (ví dụ: "Avatar: The Way of Water" bắt đầu bằng "avatar")
    if (name.startsWith(cleanQ) || orig.startsWith(cleanQ) || slug.startsWith(cleanQSlug)) {
      return { relevant: true, score: 90, reason: "Khớp đầu tựa phim / franchise" };
    }

    // 3. Tựa tiếng Việt chứa từ trọn vẹn
    if (hasWordMatch(name, cleanQ)) {
      return { relevant: true, score: 80, reason: "Tựa tiếng Việt chứa tựa phim" };
    }

    // 4. Loạt phim phụ / tiền tố franchise chính thức (The Avengers, Marvel's Avengers...)
    if (
      hasWordMatch(orig, cleanQ) &&
      (orig.startsWith(`the ${cleanQ}`) ||
        orig.startsWith(`marvel's ${cleanQ}`) ||
        orig.includes(`: ${cleanQ}`) ||
        orig.includes(` - ${cleanQ}`) ||
        orig.includes(` – ${cleanQ}`))
    ) {
      return { relevant: true, score: 75, reason: "Tựa gốc thuộc cùng loạt phim" };
    }

    // 5. Nếu là tên phim gồm từ 3 từ trở lên: kiểm tra độ phủ từ cao (>= 80%)
    const qWords = cleanQ.split(" ").filter((w) => w.length > 2);
    if (qWords.length >= 3) {
      const matched = qWords.filter((w) => hasWordMatch(name, w) || hasWordMatch(orig, w));
      if (matched.length / qWords.length >= 0.8) {
        return { relevant: true, score: 65, reason: "Khớp phần lớn tựa phim" };
      }
    }

    return { relevant: false, score: 0, reason: "Không khớp tựa phim cần tìm" };
  }

  // 3. INTENT = ACTOR (Tìm theo diễn viên)
  if (parsedIntent === "actor" || options?.expectedActorSlug) {
    const actorSlug = options?.expectedActorSlug;
    if (actorSlug) {
      const hasActor = matchesActor(actors, actorSlug);
      if (hasActor) return { relevant: true, score: 95, reason: "Có diễn viên yêu cầu" };

      const aliases = getActorAliases(actorSlug).map(cleanNormalizedString);
      // Kiểm tra trong mô tả phim, tựa đề, hoặc danh sách diễn viên thô
      const matchedAlias = aliases.find((a) => a && (desc.includes(a) || name.includes(a) || orig.includes(a)));
      if (matchedAlias) {
        return { relevant: true, score: 70, reason: "Diễn viên có trong tóm tắt hoặc tựa đề phim" };
      }
      return { relevant: false, score: 0, reason: "Không có diễn viên yêu cầu" };
    }
  }

  // 4. INTENT = CHARACTER (Tìm theo nhân vật)
  if (parsedIntent === "character" || options?.expectedCharacter || options?.detectedChar) {
    const charProfile = options?.detectedChar;
    const charName = cleanNormalizedString(charProfile?.name || options?.expectedCharacter || "");
    const aliases = charProfile?.aliases?.map(cleanNormalizedString) || [charName];

    const hasCharInTitle = aliases.some(
      (a) => a && (name.includes(a) || orig.includes(a) || slug.includes(a.replace(/\s+/g, "-")))
    );
    if (hasCharInTitle) return { relevant: true, score: 95, reason: "Tên nhân vật có trong tựa phim" };

    const hasCharInDesc = aliases.some((a) => a && a.length >= 3 && desc.includes(a));
    if (hasCharInDesc) return { relevant: true, score: 75, reason: "Nhân vật có trong mô tả cốt truyện" };

    if (charProfile?.defaultTitles) {
      const matchDefault = charProfile.defaultTitles.some((dt) => {
        const cdt = cleanNormalizedString(dt);
        return name.includes(cdt) || orig.includes(cdt) || slug.includes(cdt.replace(/\s+/g, "-"));
      });
      if (matchDefault) return { relevant: true, score: 80, reason: "Tác phẩm tiêu biểu của nhân vật" };
    }

    return { relevant: false, score: 0, reason: "Không tìm thấy nhân vật trong phim" };
  }

  // 5. INTENT = THEME (Chủ đề / Khái niệm ngữ nghĩa / Ngữ cảnh cốt truyện cụ thể)
  if (parsedIntent === "theme") {
    // A. Kiểm tra với Hệ thống Khái niệm Ngữ Nghĩa (Semantic Concept Registry)
    const activeConcepts = resolveConcepts(rawQuery, options?.concepts);
    if (activeConcepts.length > 0) {
      const conceptEval = evaluateConceptEvidence(movie, activeConcepts);
      if (conceptEval.relevant) {
        return {
          relevant: true,
          score: conceptEval.score,
          reason: conceptEval.evidence,
        };
      }
      // Nếu câu hỏi đã xác định rõ một khái niệm cụ thể (như Tây Du Ký, săn kho báu, người ngoài hành tinh...)
      // nhưng bộ phim này không có bằng chứng thuộc khái niệm đó, lập tức loại bỏ!
      return {
        relevant: false,
        score: 0,
        reason: conceptEval.evidence || "Phim không khớp khái niệm chủ đề yêu cầu",
      };
    }

    // B. Xử lý các chủ đề linh hoạt khác (ad-hoc themes: ca sĩ, bác sĩ, giáo viên, luật sư, cảnh sát, đầu bếp, phi công, nhà báo...)
    const cleanSubject = cleanQ
      .replace(/^(?:phim\s+)?(?:ve|chu de|noi ve|ke ve|xoay quanh|de tai)\s+/i, "")
      .trim();

    const rawTerms = [
      ...(options?.keywords || []),
      cleanSubject,
      ...extractContentKeywords(rawQuery),
    ];
    const themeTerms: string[] = Array.from(
      new Set(
        rawTerms
          .map(cleanNormalizedString)
          .filter((t) => {
            if (!t || t.length < 2) return false;
            if (VIETNAMESE_STOP_WORDS.has(t) || GENERIC_SINGLE_WORDS.has(t)) return false;
            if (GENERIC_PHRASES.has(t)) return false;
            return true;
          })
      )
    );

    if (themeTerms.length === 0) {
      return { relevant: false, score: 0, reason: "Truy vấn không chứa từ khóa chủ đề hợp lệ" };
    }

    // Kiểm tra đa điều kiện nếu câu hỏi có cấu trúc: [chủ đề A] + [ngữ cảnh/địa điểm B] (ví dụ: "phim về ca sĩ trên sao Hỏa")
    const compoundParts = cleanSubject
      .split(/\s+(?:tren|o|tai|trong|va)\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3 && !VIETNAMESE_STOP_WORDS.has(s) && !GENERIC_SINGLE_WORDS.has(s));

    if (compoundParts.length >= 2) {
      for (const part of compoundParts) {
        const partSlug = part.replace(/\s+/g, "-");
        const hasPartInTitle =
          part.length <= 4
            ? hasWordMatch(name, part) || hasWordMatch(orig, part) || slug === partSlug || slug.includes(partSlug)
            : name.includes(part) || orig.includes(part) || slug.includes(partSlug);
        const hasPartInDesc =
          part.length <= 4
            ? hasWordMatch(desc, part)
            : desc.includes(part);

        if (!hasPartInTitle && !hasPartInDesc) {
          return {
            relevant: false,
            score: 0,
            reason: `Phim không thỏa mãn điều kiện '${part}' trong yêu cầu kết hợp`,
          };
        }
      }
    }

    // Bổ trợ thể loại phù hợp với ngữ cảnh chủ đề
    const cleanCategory = cleanNormalizedString(category || "");
    let categoryBonus = 0;
    if (
      themeTerms.some((t) => t.includes("ca si") || t.includes("am nhac") || t.includes("ca hat") || t.includes("nhac")) &&
      (cleanCategory.includes("am nhac") || cleanCategory.includes("phim nhac"))
    ) {
      categoryBonus += 25;
    } else if (
      themeTerms.some((t) => t.includes("canh sat") || t.includes("hinh su") || t.includes("dieu tra")) &&
      (cleanCategory.includes("hinh su") || cleanCategory.includes("hanh dong") || cleanCategory.includes("trinh tham"))
    ) {
      categoryBonus += 25;
    } else if (
      themeTerms.some((t) => t.includes("luat su") || t.includes("phap luat") || t.includes("toa an")) &&
      (cleanCategory.includes("chinh kich") || cleanCategory.includes("tam ly") || cleanCategory.includes("hinh su"))
    ) {
      categoryBonus += 20;
    }

    let matchCount = 0;
    let hasTitleMatch = false;
    let hasDescMatch = false;

    for (const term of themeTerms) {
      if (!term || term.length < 2) continue;
      const termSlug = term.replace(/\s+/g, "-");

      if (term.length <= 4) {
        if (
          hasWordMatch(name, term) ||
          hasWordMatch(orig, term) ||
          slug === termSlug ||
          slug.startsWith(`${termSlug}-`) ||
          slug.endsWith(`-${termSlug}`)
        ) {
          matchCount += 3;
          hasTitleMatch = true;
        } else if (hasWordMatch(desc, term)) {
          matchCount += 1;
          hasDescMatch = true;
        }
      } else {
        if (name.includes(term) || orig.includes(term) || slug.includes(termSlug)) {
          matchCount += 3;
          hasTitleMatch = true;
        } else if (desc.includes(term)) {
          matchCount += 1;
          hasDescMatch = true;
        }
      }
    }

    if (hasTitleMatch || (hasDescMatch && matchCount >= 1)) {
      return {
        relevant: true,
        score: 50 + matchCount * 10 + categoryBonus,
        reason: "Phù hợp chủ đề tìm kiếm",
      };
    }

    return { relevant: false, score: 0, reason: "Không có bằng chứng phù hợp chủ đề" };
  }

  // 6. INTENT = GENRE + COUNTRY (hoặc mixed)
  let genreOk = true;
  let countryOk = true;

  if (options?.targetGenreSlug) {
    genreOk = matchesGenre(category, options.targetGenreSlug);
  }
  if (options?.targetCountrySlug) {
    countryOk = matchesCountry(country, options.targetCountrySlug);
  }

  if (options?.targetGenreSlug && options?.targetCountrySlug) {
    if (!genreOk || !countryOk) {
      return { relevant: false, score: 0, reason: "Không khớp thể loại hoặc quốc gia" };
    }
    return { relevant: true, score: 85, reason: "Khớp chuẩn cả thể loại và quốc gia" };
  }

  if (options?.targetGenreSlug) {
    if (!genreOk) return { relevant: false, score: 0, reason: "Không khớp thể loại" };
    return { relevant: true, score: 85, reason: "Khớp thể loại yêu cầu" };
  }

  if (options?.targetCountrySlug) {
    if (!countryOk) return { relevant: false, score: 0, reason: "Không khớp quốc gia" };
    return { relevant: true, score: 85, reason: "Khớp quốc gia yêu cầu" };
  }

  // 6.5. INTENT = YEAR (Tìm kiếm theo năm phát hành)
  if (options?.targetYear || parsedIntent === "year") {
    const movieYear = extractMovieYear(movie);
    const targetY = options?.targetYear;
    if (targetY && movieYear > 0) {
      if (movieYear === targetY) {
        return { relevant: true, score: 85, reason: `Phát hành đúng năm ${targetY}` };
      }
      return { relevant: false, score: 0, reason: `Không khớp năm phát hành (yêu cầu ${targetY})` };
    }
  }

  // 7. MẶC ĐỊNH / MOOD
  // Kiểm tra độ tương đồng từ khóa nội dung tối thiểu
  const contentKeywords = extractContentKeywords(rawQuery);
  if (contentKeywords.length > 0) {
    const hasAnyContent = contentKeywords.some(
      (kw) => name.includes(kw) || orig.includes(kw) || desc.includes(kw)
    );
    if (hasAnyContent) {
      return { relevant: true, score: 70, reason: "Khớp ngữ cảnh tìm kiếm" };
    }
  }

  // Nếu là query theo tâm trạng (mood: chữa lành, cảm động, xả stress)
  if (parsedIntent === "mood") {
    const lowerMood = cleanQ;
    if (
      lowerMood.includes("chua lanh") ||
      lowerMood.includes("chữa lành") ||
      lowerMood.includes("nhe nhang") ||
      lowerMood.includes("nhẹ nhàng") ||
      lowerMood.includes("am ap") ||
      lowerMood.includes("ấm áp")
    ) {
      // Phim chữa lành: thể loại tâm lý, tình cảm, hoạt hình, gia đình
      const isHealingCategory =
        category.includes("Tâm Lý") ||
        category.includes("Tình Cảm") ||
        category.includes("Hoạt Hình") ||
        category.includes("Gia Đình") ||
        category.includes("Hài Hước");
      // Trừ các phim kinh dị, bạo lực
      const isViolent = category.includes("Kinh Dị") || category.includes("Chiến Tranh");
      if (isHealingCategory && !isViolent) {
        return { relevant: true, score: 70, reason: "Phù hợp cảm xúc chữa lành" };
      }
      return { relevant: false, score: 0, reason: "Không phù hợp tâm trạng chữa lành" };
    }
  }

  return { relevant: false, score: 0, reason: "Không có bằng chứng phù hợp với yêu cầu tìm kiếm" };
}
