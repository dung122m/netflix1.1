import { cleanNormalizedString } from "@/lib/stringUtils";
import {
  type SemanticConcept,
  SEMANTIC_CONCEPTS,
} from "@/data/movies/semanticConcepts";

export type { SemanticConcept };
export { SEMANTIC_CONCEPTS };

/**
 * Kiểm tra xem từ/cụm từ có xuất hiện trong chuỗi với ranh giới từ (word boundary) hay không
 */
export function hasWordMatch(text: string, word: string): boolean {
  if (!text || !word) return false;
  const cleanT = cleanNormalizedString(text);
  const cleanW = cleanNormalizedString(word);
  if (cleanT === cleanW) return true;
  const escaped = cleanW.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i");
  return regex.test(cleanT);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSafeActors(item: any): string[] {
  const result: string[] = [];
  if (Array.isArray(item?.actor)) {
    result.push(...item.actor.map(String).map((s: string) => s.trim()).filter(Boolean));
  } else if (typeof item?.actor === "string" && item.actor.trim()) {
    result.push(...item.actor.split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  if (Array.isArray(item?.actors)) {
    result.push(...item.actors.map(String).map((s: string) => s.trim()).filter(Boolean));
  } else if (typeof item?.actors === "string" && item.actors.trim()) {
    result.push(...item.actors.split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  if (Array.isArray(item?.director)) {
    result.push(...item.director.map(String).map((s: string) => s.trim()).filter(Boolean));
  } else if (typeof item?.director === "string" && item.director.trim()) {
    result.push(...item.director.split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  return Array.from(new Set(result));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSafeCategory(item: any): string {
  if (Array.isArray(item?.category) && item.category.length > 0) {
    return item.category[0]?.name || item.category[0]?.slug || "Điện Ảnh";
  }
  if (typeof item?.category === "string" && item.category.trim()) return item.category.trim();
  return "Điện Ảnh";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSafeCategories(item: any): string[] {
  const result: string[] = [];
  if (Array.isArray(item?.category)) {
    for (const c of item.category) {
      if (typeof c === "string" && c.trim()) result.push(c.trim());
      else if (c && typeof c === "object") {
        if (typeof c.name === "string" && c.name.trim()) result.push(c.name.trim());
        if (typeof c.slug === "string" && c.slug.trim()) result.push(c.slug.trim());
      }
    }
  } else if (typeof item?.category === "string" && item.category.trim()) {
    result.push(item.category.trim());
  }
  if (Array.isArray(item?.categories)) {
    for (const c of item.categories) {
      if (typeof c === "string" && c.trim()) result.push(c.trim());
      else if (c && typeof c === "object") {
        if (typeof c.name === "string" && c.name.trim()) result.push(c.name.trim());
        if (typeof c.slug === "string" && c.slug.trim()) result.push(c.slug.trim());
      }
    }
  } else if (typeof item?.categories === "string" && item.categories.trim()) {
    result.push(...item.categories.split(",").map((s: string) => s.trim()).filter(Boolean));
  }
  return Array.from(new Set(result.filter(Boolean)));
}

/**
 * Phân tích và phát hiện các khái niệm ngữ nghĩa (semantic concepts) từ câu truy vấn
 */
export function resolveConcepts(
  prompt?: string,
  aiConcepts?: string[]
): SemanticConcept[] {
  if (!prompt && (!aiConcepts || aiConcepts.length === 0)) return [];
  const cleanQ = cleanNormalizedString(prompt || "");
  const matched: SemanticConcept[] = [];

  // 1. Kiểm tra đối chiếu với danh mục các khái niệm chính thức
  for (const concept of SEMANTIC_CONCEPTS) {
    // Kiểm tra xem concept có đang bị phủ định / loại trừ trong câu truy vấn không
    const isNegated = concept.triggerPhrases.some((tp) => {
      const cleanTp = cleanNormalizedString(tp);
      const escaped = cleanTp.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const negRegex = new RegExp(`(?:không\\s+ưu\\s+tiên|khong\\s+uu\\s+tien|không\\s+cần|khong\\s+can|không\\s+thích|khong\\s+thich|không\\s+xem|khong\\s+xem|không|khong|chẳng|chang|ko|k|trừ|tru|loại trừ|loai tru|không phải|khong phai|không có|khong co|không lấy|khong lay)\\s+(?:yếu tố\\s+|yeu to\\s+)?${escaped}`, "i");
      return negRegex.test(cleanQ);
    });

    if (isNegated) {
      continue;
    }

    // A. Kiểm tra từ ID do AI trích xuất
    if (aiConcepts && aiConcepts.includes(concept.id)) {
      matched.push(concept);
      continue;
    }

    // B. Kiểm tra trigger phrases trong câu hỏi của người dùng với word boundary chính xác
    const hasTrigger = concept.triggerPhrases.some((tp) => {
      const cleanTp = cleanNormalizedString(tp);
      return hasWordMatch(cleanQ, cleanTp);
    });

    if (hasTrigger) {
      matched.push(concept);
    }
  }

  return matched;
}

/**
 * Đánh giá bằng chứng phân tầng (Evidence Hierarchy) của một bộ phim theo các concept ngữ nghĩa
 */
export function evaluateConceptEvidence(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  movie: any,
  concepts: SemanticConcept[]
): {
  relevant: boolean;
  score: number;
  evidence: string;
  evidenceType?: string;
} {
  if (!movie || concepts.length === 0) {
    return { relevant: false, score: 0, evidence: "Không có concept yêu cầu" };
  }

  const name = cleanNormalizedString(movie.name || movie.title || "");
  const orig = cleanNormalizedString(movie.origin_name || "");
  const slug = cleanNormalizedString(movie.slug || "");
  const desc = cleanNormalizedString(
    movie.content || movie.description || movie.overview || ""
  );
  const actors = toSafeActors(movie).map(cleanNormalizedString);

  for (const concept of concepts) {
    // 1. Kiểm tra bộ lọc loại trừ (Negative Phrases) để chặn false positives
    if (concept.negativePhrases && concept.negativePhrases.length > 0) {
      const hasNegative = concept.negativePhrases.some(
        (np) =>
          hasWordMatch(name, np) ||
          hasWordMatch(orig, np) ||
          slug.includes(np.replace(/\s+/g, "-"))
      );
      if (hasNegative) {
        return {
          relevant: false,
          score: 0,
          evidence: `Khớp cụm từ loại trừ của chủ đề ${concept.canonicalName}`,
        };
      }
    }

    let score = 0;
    let evidence = "";
    let evidenceType = "";

    // 2. TITLE_CONCEPT: Bằng chứng mạnh từ tựa đề (+80 điểm)
    const titleMatch = concept.strongTitleConcepts.find((tc) => {
      const tcSlug = tc.replace(/\s+/g, "-");
      if (tc.length <= 4) {
        return (
          hasWordMatch(name, tc) ||
          hasWordMatch(orig, tc) ||
          slug === tcSlug ||
          slug.startsWith(`${tcSlug}-`) ||
          slug.endsWith(`-${tcSlug}`)
        );
      }
      return name.includes(tc) || orig.includes(tc) || slug.includes(tcSlug);
    });

    if (titleMatch) {
      score += 80;
      evidence = `Tựa đề khớp khái niệm chủ đề "${titleMatch}"`;
      evidenceType = "TITLE_CONCEPT";
    }

    // 3. CHARACTER_CONCEPT: Bằng chứng từ nhân vật / diễn viên (+80 điểm)
    if (concept.characterEntities && concept.characterEntities.length > 0) {
      const charMatch = concept.characterEntities.find((ce) => {
        const cleanCe = cleanNormalizedString(ce);
        return (
          actors.some((a) => a && hasWordMatch(a, cleanCe)) ||
          hasWordMatch(name, cleanCe) ||
          hasWordMatch(orig, cleanCe) ||
          hasWordMatch(desc, cleanCe)
        );
      });

      if (charMatch) {
        score += 80;
        evidence = evidence
          ? `${evidence}, nhân vật ${charMatch}`
          : `Có nhân vật trung tâm ${charMatch}`;
        evidenceType = evidenceType || "CHARACTER_CONCEPT";
      }
    }

    // 4. SYNOPSIS_CONCEPT: Bằng chứng cốt truyện / tóm tắt (+70 điểm)
    const matchedSynopsis = concept.strongSynopsisConcepts.filter((sc) =>
      sc.length <= 4 ? hasWordMatch(desc, sc) : desc.includes(sc)
    );

    if (matchedSynopsis.length >= 1) {
      score += 70;
      evidence = evidence
        ? `${evidence} và tóm tắt đề cập [${matchedSynopsis.slice(0, 2).join(", ")}]`
        : `Cốt truyện xoay quanh [${matchedSynopsis.slice(0, 2).join(", ")}]`;
      evidenceType = evidenceType || "SYNOPSIS_CONCEPT";
    }

    // 5. CATEGORY_CONCEPT: Bằng chứng từ thể loại chính thức (+80 điểm cho martial arts concepts)
    const categoryStr = cleanNormalizedString(toSafeCategory(movie) || "");
    const categories = toSafeCategories(movie).map(cleanNormalizedString);
    if (
      (concept.id === "martial_arts_combat" || concept.id === "hong_kong_martial_arts") &&
      (categories.some((c) => c.includes("vo thuat") || c.includes("vo-thuat") || c.includes("martial")) ||
       categoryStr.includes("vo thuat") || categoryStr.includes("vo-thuat"))
    ) {
      score += 80;
      evidence = evidence ? `${evidence}, Thể loại chính thức Võ thuật` : "Thể loại chính thức Võ thuật";
      evidenceType = evidenceType || "CATEGORY_CONCEPT";
    }

    if (score >= 70) {
      return {
        relevant: true,
        score,
        evidence: `${concept.canonicalName}: ${evidence}`,
        evidenceType,
      };
    }
  }

  return {
    relevant: false,
    score: 0,
    evidence: "Không tìm thấy bằng chứng phù hợp với khái niệm",
  };
}
