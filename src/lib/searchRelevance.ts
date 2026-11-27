/**
 * Search relevance evaluation and matching helpers.
 */

export function cleanNormalizedForMatch(str: string): string {
  return (str || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type TitleEvidence = { score: number; matched: boolean };

export function getTitleEvidence(
  movie: { name?: unknown; title?: unknown; origin_name?: unknown; slug?: unknown },
  query: string
): TitleEvidence {
  const cleanQuery = cleanNormalizedForMatch(query);
  if (!cleanQuery) return { score: 0, matched: false };

  const name = cleanNormalizedForMatch(String(movie.name || movie.title || ""));
  const original = cleanNormalizedForMatch(String(movie.origin_name || ""));
  const slug = cleanNormalizedForMatch(String(movie.slug || ""));
  const slugQuery = cleanQuery.replace(/\s+/g, "-");

  if (name === cleanQuery || original === cleanQuery || slug === cleanQuery || slug === slugQuery) {
    return { score: 100, matched: true };
  }

  const escapedCleanQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWordRegex = new RegExp(`^${escapedCleanQuery}(?:$|\\s)`, "i");
  const startsWithSlugRegex = new RegExp(`^${slugQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|-)`, "i");
  if (startsWithWordRegex.test(name) || startsWithWordRegex.test(original) || startsWithSlugRegex.test(slug)) {
    return { score: 85, matched: true };
  }

  const phrasePattern = new RegExp(
    `(?:^|\\s)${cleanQuery.split(" ").map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\\\$&")).join("\\\\s+")}(?=$|\\s)`
  );
  if (phrasePattern.test(name) || phrasePattern.test(original) || phrasePattern.test(slug)) {
    return { score: 70, matched: true };
  }

  return { score: 0, matched: false };
}

export interface SearchRelevanceResult {
  score: number;
  matchType: "title" | "actor" | "content";
  matchSnippet?: string;
}

export function evaluateSearchRelevance(
  movie: { name?: unknown; title?: unknown; origin_name?: unknown; slug?: unknown; content?: unknown; description?: unknown },
  query: string
): SearchRelevanceResult {
  if (!query || !query.trim()) return { score: 100, matchType: "title" };
  const rawKw = query.trim().toLowerCase();
  const normKw = cleanNormalizedForMatch(query);
  if (!normKw) return { score: 0, matchType: "title" };

  const rawTitle = String(movie.name || movie.title || "").trim().toLowerCase();
  const rawOrig = String(movie.origin_name || "").trim().toLowerCase();
  const slug = String(movie.slug || "").trim().toLowerCase();

  const normTitle = cleanNormalizedForMatch(rawTitle);
  const normOrig = cleanNormalizedForMatch(rawOrig);
  const normSlug = slug.replace(/-/g, " ");

  const escapedNormKw = normKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedRawKw = rawKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const userHasDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(query);

  // 1. EXACT FULL MATCH
  const slugKw = normKw.replace(/\s+/g, "-");
  if (rawTitle === rawKw || rawOrig === rawKw || slug === slugKw) {
    return { score: 100, matchType: "title" };
  }
  if (!userHasDiacritics && (normTitle === normKw || normOrig === normKw || normSlug === normKw)) {
    return { score: 95, matchType: "title" };
  }

  // 2. STARTS WITH FULL PHRASE
  const startsWithRawRegex = new RegExp(`^${escapedRawKw}(?:$|\\s)`, "i");
  if (startsWithRawRegex.test(rawTitle) || startsWithRawRegex.test(rawOrig)) {
    return { score: 90, matchType: "title" };
  }
  if (!userHasDiacritics) {
    const startsWithNormRegex = new RegExp(`^${escapedNormKw}(?:$|\\s)`, "i");
    if (startsWithNormRegex.test(normTitle) || startsWithNormRegex.test(normOrig) || startsWithNormRegex.test(normSlug)) {
      return { score: 85, matchType: "title" };
    }
  }

  // 3. CONTAINS FULL PHRASE
  const containsRawRegex = new RegExp(`(?:^|\\s)${escapedRawKw}(?:$|\\s)`, "i");
  const containsNormRegex = new RegExp(`(?:^|\\s)${escapedNormKw}(?:$|\\s)`, "i");
  if (containsRawRegex.test(rawTitle) || containsRawRegex.test(rawOrig)) {
    return { score: 85, matchType: "title" };
  }
  if (!userHasDiacritics) {
    if (containsNormRegex.test(normTitle) || containsNormRegex.test(normOrig) || containsNormRegex.test(normSlug)) {
      return { score: 80, matchType: "title" };
    }
  }

  // 4. DIACRITIC-AWARE MULTI-WORD / SINGLE-WORD MATCHING
  const kwWords = rawKw.split(/\s+/).filter((w) => w.length > 0);

  if (userHasDiacritics) {
    if (kwWords.length > 1) {
      const titleTokens = rawTitle.split(/[^\w\u00C0-\u1EF9]+/).filter(Boolean);
      const origTokens = rawOrig.split(/[^\w\u00C0-\u1EF9]+/).filter(Boolean);
      const allTokens = new Set([...titleTokens, ...origTokens]);

      const allWordsPresent = kwWords.every((qw) => allTokens.has(qw));
      if (allWordsPresent) return { score: 75, matchType: "title" };
    } else {
      const singleWordRegex = new RegExp(`(?:^|\\s)${escapedRawKw}(?:$|\\s)`, "i");
      if (singleWordRegex.test(rawTitle) || singleWordRegex.test(rawOrig)) {
        return { score: 75, matchType: "title" };
      }
    }
  } else {
    // 5. UNACCENTED TOKEN MATCH (giữ lại chữ số phần phim như "2", "3", "7" và token đơn khi cụm ngắn <= 2 từ)
    const allNormWords = normKw.split(/\s+/).filter(Boolean);
    const normKwTokens = allNormWords.filter(
      (w) => w.length > 1 || /^\d+$/.test(w) || allNormWords.length <= 2
    );
    if (normKwTokens.length > 1) {
      const titleTokens = new Set(normTitle.split(/\s+/).filter(Boolean));
      const origTokens = new Set(normOrig.split(/\s+/).filter(Boolean));
      const slugTokens = new Set(normSlug.split(/\s+/).filter(Boolean));

      const matchedTokensCount = normKwTokens.filter(
        (tok) => titleTokens.has(tok) || origTokens.has(tok) || slugTokens.has(tok)
      ).length;

      if (matchedTokensCount === normKwTokens.length) {
        return { score: 65, matchType: "title" };
      }
      if (matchedTokensCount / normKwTokens.length >= 0.75) {
        return { score: 45, matchType: "title" };
      }
    } else if (normKwTokens.length === 1) {
      // 6. SINGLE-WORD UNACCENTED SEARCH
      const singleWord = normKwTokens[0];
      const wordRegex = new RegExp(`(?:^|\\s)${singleWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\s)`, "i");
      if (wordRegex.test(normTitle) || wordRegex.test(normOrig) || wordRegex.test(normSlug)) {
        return { score: 70, matchType: "title" };
      }
    }
  }

  // 7. CONTENT / SYNOPSIS MATCH (giữ nghiêm ngặt dấu tiếng Việt khi người dùng gõ có dấu)
  const rawDesc = String(movie.content || movie.description || "").trim().toLowerCase();
  if (rawDesc) {
    if (userHasDiacritics) {
      if (containsRawRegex.test(rawDesc)) {
        return { score: 30, matchType: "content" };
      }
    } else {
      const desc = cleanNormalizedForMatch(rawDesc);
      if (desc && containsNormRegex.test(desc)) {
        return { score: 30, matchType: "content" };
      }
    }
  }

  return { score: 0, matchType: "title" };
}
