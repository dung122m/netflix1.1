import { SearchIntent, CharacterProfile } from "./types";
import {
  cleanNormalizedString,
  extractMovieYear,
  extractCleanSearchKeywords,
  getActorAliases,
  hasWordMatch,
  matchesActor,
  matchesDirector,
  extractEpisodeTotal,
  matchesCountry,
  matchesGenre,
  resolveGenreSlug,
  resolveCountrySlug,
  resolveActorSlug,
  resolveCharacter,
} from "./taxonomy";
import { toSafeActors, toSafeCategory, toSafeCategories, toSafeCountry, toSafeCountries } from "./movieFormatter";
import { resolveConcepts, evaluateConceptEvidence } from "./conceptRegistry";
import { isMovieOfType } from "@/services/movies/service";

export interface RelevanceCheckOptions {
  originalQuery: string;
  keywords?: string[];
  semanticQuery?: string;
  concepts?: string[];
  expectedActorSlug?: string;
  expectedActorName?: string;
  expectedActorSlugs?: string[];
  expectedActorNames?: string[];
  expectedDirector?: string;
  expectedCharacter?: string;
  targetGenreSlug?: string;
  targetGenreSlugs?: string[];
  targetCountrySlug?: string;
  targetTypeSlug?: string;
  expectedTypeSlug?: string;
  targetYear?: number;
  yearFrom?: number;
  yearTo?: number;
  detectedChar?: CharacterProfile | null;
  excludedTitles?: string[];
  excludedCountries?: string[];
  excludedGenres?: string[];
  franchises?: string[];
  themes?: string[];
  episodeConstraint?: {
    maxEpisodes?: number;
    strictLessThan?: number;
    requireSeries?: boolean;
  };
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
  "giong",
  "giống",
  "tuong",
  "tương",
  "tu",
  "tự",
  "them",
  "thêm",
  "nua",
  "nữa",
  "con",
  "còn",
  "same",
  "similar",
  "like",
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
  "tuong tu",
  "tương tự",
  "giong phim",
  "giống phim",
  "them phim",
  "thêm phim",
  "con nua",
  "còn nữa",
  "cho them",
  "cho thêm",
]);

/**
 * Trích xuất các cụm từ hoặc từ khóa thực chất từ câu truy vấn (loại bỏ stop words & generic single words)
 */
export function extractContentKeywords(query: string): string[] {
  const clean = cleanNormalizedString(query || "");
  if (!clean) return [];

  // Tách bỏ các tiền tố phổ biến như "phim ve", "phim chu de", "phim noi ve", "phim giong", "cho them", v.v.
  const coreSubject = clean
    .replace(/^(?:phim\s+)?(?:ve|chu de|noi ve|ke ve|xoay quanh|de tai|giong|tuong tu|kieu nhu|same as|similar to|like|cho them|them|con nua)\s+(?:phim\s+)?/i, "")
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
  const cleanedKeyword = extractCleanSearchKeywords(rawQuery);
  const cleanQ = cleanNormalizedString(cleanedKeyword || rawQuery);
  const cleanRawQ = cleanNormalizedString(rawQuery);

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
  const categories = toSafeCategories(movie);
  const categoryStr = categories.length > 0 ? categories.join(" ") : category;
  const country = toSafeCountry(movie);
  const countries = toSafeCountries(movie);
  const countryStr = countries.length > 0 ? countries.join(" ") : country;
  const actors = toSafeActors(movie);
  const desc = cleanNormalizedString(movie.content || movie.description || movie.overview || "");

  // 1.1 KIỂM TRA LOẠI TRỪ TIÊU ĐỀ, QUỐC GIA, THỂ LOẠI (HARD NEGATIVE CONSTRAINTS)
  if (options?.excludedTitles && options.excludedTitles.length > 0) {
    const isExcludedTitle = options.excludedTitles.some((ex) => {
      const cleanEx = cleanNormalizedString(ex);
      if (!cleanEx) return false;

      // Khớp trực tiếp tên phim hoặc slug
      if (
        name === cleanEx ||
        orig === cleanEx ||
        slug === cleanEx.replace(/\s+/g, "-") ||
        hasWordMatch(name, cleanEx) ||
        hasWordMatch(orig, cleanEx)
      ) {
        return true;
      }

      // Khớp loại trừ theo chủ đề / thực thể bị cấm
      if (cleanEx.includes("nguoi ngoai hanh tinh") || cleanEx.includes("alien") || cleanEx.includes("ngoai hanh tinh")) {
        if (
          name.includes("alien") ||
          orig.includes("alien") ||
          slug.includes("alien") ||
          name.includes("nguoi ngoai hanh tinh") ||
          name.includes("ngoai hanh tinh") ||
          orig.includes("nguoi ngoai hanh tinh") ||
          orig.includes("ngoai hanh tinh") ||
          slug.includes("nguoi-ngoai-hanh-tinh") ||
          desc.includes("nguoi ngoai hanh tinh") ||
          desc.includes("sinh vat ngoai trai dat") ||
          desc.includes("ngoai hanh tinh")
        ) {
          return true;
        }
      }

      if (cleanEx.includes("zombie") || cleanEx.includes("xac song")) {
        if (
          name.includes("zombie") ||
          orig.includes("zombie") ||
          slug.includes("zombie") ||
          name.includes("xac song") ||
          orig.includes("xac song") ||
          slug.includes("xac-song") ||
          desc.includes("zombie") ||
          desc.includes("xac song")
        ) {
          return true;
        }
      }

      if (cleanEx.includes("ma ca rong") || cleanEx.includes("vampire")) {
        if (
          name.includes("vampire") ||
          orig.includes("vampire") ||
          slug.includes("vampire") ||
          name.includes("ma ca rong") ||
          orig.includes("ma ca rong") ||
          slug.includes("ma-ca-rong") ||
          desc.includes("ma ca rong") ||
          desc.includes("vampire")
        ) {
          return true;
        }
      }

      return false;
    });
    if (isExcludedTitle) {
      return { relevant: false, score: 0, reason: "Phim thuộc danh sách loại trừ hoặc chủ đề bị cấm của người dùng" };
    }
  }

  if (options?.excludedCountries && options.excludedCountries.length > 0) {
    if (
      options.excludedCountries.some(
        (ex) =>
          countries.some((c) => matchesCountry(c, ex)) ||
          matchesCountry(countryStr, ex) ||
          matchesCountry(country, ex)
      )
    ) {
      return { relevant: false, score: 0, reason: "Quốc gia thuộc danh sách loại trừ" };
    }
  }

  if (options?.excludedGenres && options.excludedGenres.length > 0) {
    if (
      options.excludedGenres.some(
        (ex) =>
          categories.some((c) => matchesGenre(c, ex)) ||
          matchesGenre(categoryStr, ex)
      )
    ) {
      return { relevant: false, score: 0, reason: "Thể loại thuộc danh sách loại trừ" };
    }
  }

  // 1.1b KIỂM TRA QUỐC GIA MỤC TIÊU (TARGET COUNTRY CONSTRAINT)
  if (options?.targetCountrySlug) {
    const isCountryMatch =
      countries.some((c) => matchesCountry(c, options.targetCountrySlug!)) ||
      matchesCountry(countryStr, options.targetCountrySlug!) ||
      matchesCountry(country, options.targetCountrySlug!);
    if (!isCountryMatch && (countries.length > 0 || country)) {
      return { relevant: false, score: 0, reason: `Không đúng quốc gia yêu cầu (${options.targetCountrySlug})` };
    }
  }

  // 1.2 KIỂM TRA ĐỊNH DẠNG PHIM (TYPE FILTER: PHIM BỘ / PHIM LẺ / HOẠT HÌNH / TV SHOWS)
  if (options?.targetTypeSlug) {
    const isTypeMatch = isMovieOfType(movie, options.targetTypeSlug);
    if (!isTypeMatch) {
      return { relevant: false, score: 0, reason: `Không khớp định dạng phim yêu cầu (${options.targetTypeSlug})` };
    }
  }

  // 1.3 KIỂM TRA RÀNG BUỘC SỐ TẬP (EPISODE COUNT & SERIES CONSTRAINT)
  if (options?.episodeConstraint) {
    const epConst = options.episodeConstraint;
    const epTotal = extractEpisodeTotal(movie);

    if (epConst.requireSeries) {
      const isSeries = movie.type === "series" || movie.type === "phim-bo" || (epTotal !== null && epTotal > 1);
      if (!isSeries) {
        return { relevant: false, score: 0, reason: "Không phải định dạng phim bộ / series theo yêu cầu" };
      }
    }

    if (epTotal !== null) {
      if (epConst.strictLessThan !== undefined && epTotal >= epConst.strictLessThan) {
        return {
          relevant: false,
          score: 0,
          reason: `Số tập (${epTotal}) không nhỏ hơn yêu cầu (< ${epConst.strictLessThan} tập)`,
        };
      }
      if (epConst.maxEpisodes !== undefined && epTotal > epConst.maxEpisodes) {
        return {
          relevant: false,
          score: 0,
          reason: `Số tập (${epTotal}) vượt quá giới hạn tối đa (${epConst.maxEpisodes} tập)`,
        };
      }
    }
  }

  // 2. INTENT = MOVIE_TITLE (Tìm tựa phim cụ thể)
  if (parsedIntent === "movie_title") {
    const cleanQSlug = cleanQ.replace(/\s+/g, "-");
    const cleanRawQSlug = cleanRawQ.replace(/\s+/g, "-");

    // 1. Khớp chính xác hoàn toàn (tựa Việt, tựa gốc, hoặc slug)
    const isExact =
      name === cleanQ ||
      orig === cleanQ ||
      slug === cleanQSlug ||
      (cleanRawQ && (name === cleanRawQ || orig === cleanRawQ || slug === cleanRawQSlug));
    if (isExact) return { relevant: true, score: 100, reason: "Khớp chính xác tựa phim" };

    // 2. Khớp bắt đầu bằng tựa phim / franchise (ví dụ: "Avatar: The Way of Water" bắt đầu bằng "avatar")
    if (
      name.startsWith(cleanQ) ||
      orig.startsWith(cleanQ) ||
      slug.startsWith(cleanQSlug) ||
      (cleanRawQ && (name.startsWith(cleanRawQ) || orig.startsWith(cleanRawQ) || slug.startsWith(cleanRawQSlug)))
    ) {
      return { relevant: true, score: 90, reason: "Khớp đầu tựa phim / franchise" };
    }

    // 3. Tựa tiếng Việt chứa từ trọn vẹn
    if (hasWordMatch(name, cleanQ) || (cleanRawQ && hasWordMatch(name, cleanRawQ))) {
      return { relevant: true, score: 80, reason: "Tựa tiếng Việt chứa tựa phim" };
    }

    // 4. Loạt phim phụ / tiền tố franchise chính thức (The Avengers, Marvel's Avengers...)
    if (
      (hasWordMatch(orig, cleanQ) || (cleanRawQ && hasWordMatch(orig, cleanRawQ))) &&
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

  // 3. INTENT = ACTOR / PERSON / DIRECTOR (Tìm theo diễn viên / đạo diễn)
  if (
    parsedIntent === "actor" ||
    options?.expectedActorSlug ||
    options?.expectedActorName ||
    options?.expectedDirector ||
    (options?.expectedActorSlugs && options.expectedActorSlugs.length > 0) ||
    (options?.expectedActorNames && options.expectedActorNames.length > 0)
  ) {
    const actorSlugs = options?.expectedActorSlugs && options.expectedActorSlugs.length > 0
      ? options.expectedActorSlugs
      : options?.expectedActorSlug
      ? [options.expectedActorSlug]
      : [];
    const actorNames = options?.expectedActorNames && options.expectedActorNames.length > 0
      ? options.expectedActorNames
      : options?.expectedActorName
      ? [options.expectedActorName]
      : [];
    if (options?.expectedDirector && !actorNames.includes(options.expectedDirector)) {
      actorNames.push(options.expectedDirector);
    }

    const directorMeta = movie.director || movie.directors;

    if (actorSlugs.length > 0) {
      const allSlugsMatched = actorSlugs.every((slug) => {
        // 1. Kiểm tra danh sách diễn viên (cast list)
        if (actors && actors.length > 0 && matchesActor(actors, slug)) {
          return true;
        }
        // 2. Kiểm tra đạo diễn (director)
        if (directorMeta && matchesDirector(directorMeta, slug)) {
          return true;
        }
        // 3. Nếu metadata hoàn toàn thiếu cả actors và director, chỉ chấp nhận nếu tựa phim khớp từ nguyên vẹn (word boundary)
        if ((!actors || actors.length === 0) && !directorMeta) {
          const aliases = getActorAliases(slug).map(cleanNormalizedString);
          return aliases.some((a) => a && (hasWordMatch(name, a) || hasWordMatch(orig, a)));
        }
        return false;
      });

      if (allSlugsMatched) {
        if (options?.franchises && options.franchises.length > 0) {
          const hasFranchiseMatch = options.franchises.some((fr) => {
            const cleanFr = cleanNormalizedString(fr);
            return (
              hasWordMatch(name, cleanFr) ||
              hasWordMatch(orig, cleanFr) ||
              slug.includes(cleanFr.replace(/\s+/g, "-"))
            );
          });
          if (!hasFranchiseMatch) {
            return { relevant: false, score: 0, reason: "Không khớp loạt phim yêu cầu" };
          }
        }

        return {
          relevant: true,
          score: 95 + (actorSlugs.length > 1 ? 10 : 0),
          reason: `Xác minh có diễn viên/đạo diễn yêu cầu (${actorSlugs.join(", ")})`,
        };
      }
      return { relevant: false, score: 0, reason: "Không có diễn viên hoặc đạo diễn yêu cầu trong metadata" };
    } else if (actorNames.length > 0) {
      const allNamesMatched = actorNames.every((an) => {
        const cleanAn = cleanNormalizedString(an);
        if (!cleanAn || cleanAn.length < 2) return true;

        if (actors && actors.length > 0) {
          const hasInCast = actors.some((a) => {
            const cleanA = cleanNormalizedString(a);
            return cleanA === cleanAn || cleanA.includes(cleanAn) || cleanAn.includes(cleanA) || hasWordMatch(cleanA, cleanAn);
          });
          if (hasInCast) return true;
        }

        if (directorMeta && matchesDirector(directorMeta, an)) {
          return true;
        }

        // Nếu thiếu cả actors và director
        if ((!actors || actors.length === 0) && !directorMeta) {
          return hasWordMatch(name, cleanAn) || hasWordMatch(orig, cleanAn);
        }
        return false;
      });

      if (allNamesMatched) {
        if (options?.franchises && options.franchises.length > 0) {
          const hasFranchiseMatch = options.franchises.some((fr) => {
            const cleanFr = cleanNormalizedString(fr);
            return (
              hasWordMatch(name, cleanFr) ||
              hasWordMatch(orig, cleanFr) ||
              slug.includes(cleanFr.replace(/\s+/g, "-"))
            );
          });
          if (!hasFranchiseMatch) {
            return { relevant: false, score: 0, reason: "Không khớp loạt phim yêu cầu" };
          }
        }

        return {
          relevant: true,
          score: 95 + (actorNames.length > 1 ? 10 : 0),
          reason: `Xác minh có nhân sự yêu cầu (${actorNames.join(", ")})`,
        };
      }
      return { relevant: false, score: 0, reason: "Không có diễn viên hoặc đạo diễn yêu cầu trong metadata" };
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

  // 6. MULTI-CONSTRAINT VALIDATION (GENRE + COUNTRY + YEAR + FORMAT)
  let genreOk = true;
  let countryOk = true;
  let yearOk = true;

  const requestedGenreSlugs = options?.targetGenreSlugs && options.targetGenreSlugs.length > 0
    ? options.targetGenreSlugs
    : options?.targetGenreSlug
    ? [options.targetGenreSlug]
    : [];

  let genreBonus = 0;
  if (requestedGenreSlugs.length > 0) {
    const primaryGenre = requestedGenreSlugs[0];
    const isPrimaryMatch =
      categories.some((c) => matchesGenre(c, primaryGenre)) ||
      matchesGenre(categoryStr, primaryGenre);

    if (isPrimaryMatch) {
      genreOk = true;
      genreBonus += 10;
      // Bonus cho các thể loại phụ khớp thêm (ví dụ vừa võ thuật vừa hành động / hài hước)
      for (let i = 1; i < requestedGenreSlugs.length; i++) {
        const secGenre = requestedGenreSlugs[i];
        if (categories.some((c) => matchesGenre(c, secGenre)) || matchesGenre(categoryStr, secGenre)) {
          genreBonus += 15;
        }
      }
    } else if (primaryGenre === "vo-thuat") {
      // Catalog metadata fallback: Nếu phim không có tag "vo-thuat" chính thức nhưng có tag "hanh-dong"
      // VÀ có bằng chứng võ thuật rõ rệt từ tựa đề/mô tả/diễn viên võ thuật
      const isAction = categories.some((c) => matchesGenre(c, "hanh-dong")) || matchesGenre(categoryStr, "hanh-dong");
      const hasMartialArtsEvidence =
        name.includes("vo thuat") || name.includes("kungfu") || name.includes("kung fu") || name.includes("diep van") ||
        name.includes("ip man") || name.includes("the raid") || name.includes("john wick") || name.includes("ong bak") ||
        desc.includes("vo thuat") || desc.includes("can chien") || desc.includes("thuc chien") || desc.includes("danh vo") ||
        desc.includes("kung fu") || desc.includes("mon phai") || desc.includes("vo dai") ||
        actors.some((a) => ["chan tu dan", "ly tieu long", "thanh long", "ly lien kiet", "ngo kinh", "tony jaa", "iko uwais", "keanu reeves"].some((actor) => a.includes(actor)));

      if (isAction && hasMartialArtsEvidence) {
        genreOk = true;
        genreBonus += 5;
      } else {
        genreOk = false;
      }
    } else {
      // Đối với các thể loại khác, nếu có ít nhất 1 thể loại trong danh sách requested khớp
      const anyMatch = requestedGenreSlugs.some((g) => categories.some((c) => matchesGenre(c, g)) || matchesGenre(categoryStr, g));
      genreOk = anyMatch;
      if (anyMatch) genreBonus += 10;
    }
  }

  if (options?.targetCountrySlug) {
    countryOk =
      countries.some((c) => matchesCountry(c, options.targetCountrySlug!)) ||
      matchesCountry(countryStr, options.targetCountrySlug) ||
      matchesCountry(country, options.targetCountrySlug);
  }
  if (options?.targetYear) {
    const movieYear = extractMovieYear(movie);
    if (movieYear > 0 && movieYear !== options.targetYear) {
      yearOk = false;
    }
  } else if (options?.yearFrom || options?.yearTo) {
    const movieYear = extractMovieYear(movie);
    if (movieYear > 0) {
      if (options.yearFrom && movieYear < options.yearFrom) yearOk = false;
      if (options.yearTo && movieYear > options.yearTo) yearOk = false;
    }
  }

  const effectiveTypeSlug = options?.targetTypeSlug || options?.expectedTypeSlug;
  let typeOk = true;
  if (effectiveTypeSlug) {
    typeOk = isMovieOfType(movie, effectiveTypeSlug);
  }

  // Nếu người dùng có các ràng buộc rõ ràng (Genre, Country, Year, Type), BẮT BUỘC phải thỏa mãn đồng thời
  if (requestedGenreSlugs.length > 0 && !genreOk) {
    return { relevant: false, score: 0, reason: `Không khớp thể loại yêu cầu (${requestedGenreSlugs.join(", ")})` };
  }
  if (options?.targetCountrySlug && !countryOk) {
    return { relevant: false, score: 0, reason: `Không khớp quốc gia yêu cầu (${options.targetCountrySlug})` };
  }
  if ((options?.targetYear || options?.yearFrom || options?.yearTo) && !yearOk) {
    return { relevant: false, score: 0, reason: `Không khớp năm phát hành yêu cầu` };
  }
  if (effectiveTypeSlug && !typeOk) {
    return { relevant: false, score: 0, reason: `Không khớp định dạng phim yêu cầu (${effectiveTypeSlug})` };
  }

  if (requestedGenreSlugs.length > 0 || options?.targetCountrySlug || options?.targetYear || options?.yearFrom || options?.yearTo || effectiveTypeSlug) {
    let matchScore = 75 + genreBonus;
    if (options?.targetCountrySlug && countryOk) matchScore += 10;
    if ((options?.targetYear || options?.yearFrom || options?.yearTo) && yearOk) matchScore += 10;
    if (effectiveTypeSlug && typeOk) matchScore += 10;
    return { relevant: true, score: matchScore, reason: "Thỏa mãn đầy đủ các ràng buộc tìm kiếm" };
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
