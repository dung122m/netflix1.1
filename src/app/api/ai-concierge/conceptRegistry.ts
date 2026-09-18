import { cleanNormalizedString, hasWordMatch } from "./taxonomy";
import { toSafeActors } from "./movieFormatter";

export interface SemanticConcept {
  id: string;
  canonicalName: string;
  triggerPhrases: string[];
  discoveryKeywords: string[];
  strongTitleConcepts: string[];
  strongSynopsisConcepts: string[];
  characterEntities?: string[];
  negativePhrases?: string[];
}

export const SEMANTIC_CONCEPTS: SemanticConcept[] = [
  {
    id: "journey_to_west",
    canonicalName: "Tây Du Ký / Thầy trò Đường Tăng đi lấy kinh",
    triggerPhrases: [
      "thay tro di lay kinh",
      "di lay kinh",
      "thinh kinh",
      "di thinh kinh",
      "thay tro duong tang",
      "duong tam tang",
      "duong tang",
      "ton ngo khong",
      "tay du ky",
      "tru bat gioi",
      "sa tang",
      "bach long ma",
      "journey to the west",
      "monkey king",
    ],
    discoveryKeywords: [
      "Tây Du Ký",
      "Tôn Ngộ Không",
      "Đường Tăng",
      "Journey to the West",
      "Thỉnh Kinh",
    ],
    strongTitleConcepts: [
      "tay du ky",
      "ton ngo khong",
      "dai nao thien cung",
      "my hau vuong",
      "tay du",
      "journey to the west",
      "monkey king",
      "duong tang",
    ],
    strongSynopsisConcepts: [
      "thinh kinh",
      "lay kinh",
      "duong tang",
      "duong tam tang",
      "ton ngo khong",
      "tru bat gioi",
      "sa tang",
      "tay thien",
      "tay du ky",
      "journey to the west",
      "hoa qua son",
      "te thien dai thanh",
    ],
    characterEntities: [
      "Tôn Ngộ Không",
      "Đường Tăng",
      "Trư Bát Giới",
      "Sa Tăng",
      "Đường Tam Tạng",
    ],
    negativePhrases: [
      "thay giao",
      "onizuka",
      "thay hay tro gioi",
      "thay troi",
      "manh ho ngui tuong vi",
    ],
  },
  {
    id: "treasure_hunt",
    canonicalName: "Săn tìm kho báu",
    triggerPhrases: [
      "di tim kho bau",
      "tim kho bau",
      "san kho bau",
      "truy tim kho bau",
      "nhom nguoi di tim kho bau",
      "tim kiem kho bau",
      "treasure hunt",
    ],
    discoveryKeywords: [
      "truy tìm kho báu",
      "kho báu",
      "săn kho báu",
      "National Treasure",
      "Uncharted",
    ],
    strongTitleConcepts: [
      "kho bau",
      "truy tim kho bau",
      "san kho bau",
      "treasure",
      "one piece",
      "national treasure",
      "uncharted",
      "tomb raider",
      "indiana jones",
      "dao kho bau",
    ],
    strongSynopsisConcepts: [
      "kho bau",
      "ban do kho bau",
      "truy tim kho bau",
      "san tim kho bau",
      "hai tac",
      "lang mo",
      "co vat",
      "treasure",
      "kho vang",
    ],
    negativePhrases: ["tay du ky", "ton ngo khong", "thay tro"],
  },
  {
    id: "alien_extraterrestrial",
    canonicalName: "Người ngoài hành tinh / Khoa học viễn tưởng",
    triggerPhrases: [
      "nguoi ngoai hanh tinh",
      "sinh vat ngoai hanh tinh",
      "alien",
      "aliens",
      "ufo",
      "nguoi hanh tinh khac",
      "ngoai hanh tinh",
    ],
    discoveryKeywords: [
      "người ngoài hành tinh",
      "ngoài hành tinh",
      "alien",
      "sinh vật ngoài trái đất",
    ],
    strongTitleConcepts: [
      "nguoi ngoai hanh tinh",
      "alien",
      "aliens",
      "predator",
      "et",
      "venom",
      "ufo",
      "men in black",
      "avatar",
    ],
    strongSynopsisConcepts: [
      "nguoi ngoai hanh tinh",
      "ngoai hanh tinh",
      "sinh vat ngoai hanh tinh",
      "xam luoc trai dat",
      "tau vu tru",
      "alien",
      "extraterrestrial",
      "ufo",
    ],
    negativePhrases: ["tay du ky"],
  },
  {
    id: "time_travel",
    canonicalName: "Xuyên không / Du hành thời gian",
    triggerPhrases: [
      "xuyen khong",
      "xuyen ve qua khu",
      "du hanh thoi gian",
      "quay nguoc thoi gian",
      "co gai xuyen khong",
      "xuyen ve co dai",
      "time travel",
      "vong lap thoi gian",
    ],
    discoveryKeywords: [
      "xuyên không",
      "du hành thời gian",
      "time travel",
      "quay ngược thời gian",
    ],
    strongTitleConcepts: [
      "xuyen khong",
      "du hanh thoi gian",
      "time travel",
      "tro ve tuong lai",
      "cong thoi gian",
    ],
    strongSynopsisConcepts: [
      "xuyen khong",
      "xuyen ve",
      "du hanh thoi gian",
      "quay nguoc thoi gian",
      "dong thoi gian",
      "tuong lai",
      "qua khu",
      "co dai",
      "time travel",
      "timeloop",
      "vong lap thoi gian",
    ],
    negativePhrases: [],
  },
  {
    id: "culinary_cooking",
    canonicalName: "Ẩm thực / Đầu bếp / Nấu ăn / Làm bánh",
    triggerPhrases: [
      "dau bep",
      "bep truong",
      "nau an",
      "nau banh",
      "lam banh",
      "nuong banh",
      "tiem banh",
      "banh ngot",
      "am thuc",
      "mon an",
      "nha hang",
      "quan an",
      "chef",
      "cooking",
      "bakery",
      "culinary",
    ],
    discoveryKeywords: [
      "đầu bếp",
      "nấu ăn",
      "làm bánh",
      "ẩm thực",
      "nhà hàng",
      "chef",
    ],
    strongTitleConcepts: [
      "dau bep",
      "bep truong",
      "nau an",
      "lam banh",
      "tiem banh",
      "nha hang",
      "am thuc",
      "chef",
      "cooking",
      "bakery",
      "ratatouille",
      "culinary",
    ],
    strongSynopsisConcepts: [
      "dau bep",
      "bep truong",
      "nau an",
      "lam banh",
      "nuong banh",
      "mon an",
      "am thuc",
      "nha hang",
      "quan an",
      "chef",
      "culinary",
      "bakery",
      "cong thuc nau",
    ],
    negativePhrases: [],
  },
  {
    id: "zombie_apocalypse",
    canonicalName: "Xác sống / Đại dịch Zombie",
    triggerPhrases: ["zombie", "xac song", "dai dich zombie"],
    discoveryKeywords: ["zombie", "xác sống", "walking dead"],
    strongTitleConcepts: [
      "zombie",
      "xac song",
      "walking dead",
      "resident evil",
      "train to busan",
    ],
    strongSynopsisConcepts: [
      "zombie",
      "xac song",
      "dai dich zombie",
      "bien di",
      "can xe",
    ],
    negativePhrases: [],
  },
  {
    id: "vampire",
    canonicalName: "Ma cà rồng",
    triggerPhrases: ["ma ca rong", "vampire", "dracula"],
    discoveryKeywords: ["ma cà rồng", "vampire", "dracula"],
    strongTitleConcepts: ["ma ca rong", "vampire", "dracula", "twilight"],
    strongSynopsisConcepts: ["ma ca rong", "vampire", "hut mau", "dracula"],
    negativePhrases: [],
  },
];

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
    // A. Kiểm tra từ ID do AI trích xuất
    if (aiConcepts && aiConcepts.includes(concept.id)) {
      matched.push(concept);
      continue;
    }

    // B. Kiểm tra trigger phrases trong câu hỏi của người dùng
    const hasTrigger = concept.triggerPhrases.some((tp) => {
      const cleanTp = cleanNormalizedString(tp);
      return cleanQ.includes(cleanTp) || hasWordMatch(cleanQ, cleanTp);
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
