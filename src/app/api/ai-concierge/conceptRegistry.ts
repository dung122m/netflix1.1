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
  {
    id: "japanese_tokusatsu",
    canonicalName: "Tokusatsu / Siêu nhân Nhật Bản / Anh hùng biến hình",
    triggerPhrases: [
      "sieu nhan nhat ban",
      "sieu nhan nhat",
      "anh hung bien hinh nhat",
      "anh hung bien hinh",
      "tokusatsu",
      "phim tokusatsu",
      "phim kieu kamen rider",
      "kamen rider",
      "sieu nhan de",
      "hiep si mat na",
      "ultraman",
      "sieu nhan dien quang",
      "5 anh em sieu nhan",
      "sieu nhan gao",
      "super sentai",
      "sentai",
      "metal hero",
      "kaiju",
      "quai vat nhat",
      "quai vat nhat ban",
      "quai vat khong lo nhat",
      "godzilla",
    ],
    discoveryKeywords: [
      "siêu nhân",
      "tokusatsu",
      "Kamen Rider",
      "Ultraman",
      "Super Sentai",
      "Gaoranger",
      "siêu nhân Gao",
      "5 anh em siêu nhân",
      "hiệp sĩ mặt nạ",
      "Godzilla",
    ],
    strongTitleConcepts: [
      "kamen rider",
      "ultraman",
      "sentai",
      "gaoranger",
      "power rangers",
      "super sentai",
      "tokusatsu",
      "shin ultraman",
      "shin kamen rider",
      "godzilla",
      "gamera",
    ],
    strongSynopsisConcepts: [
      "tokusatsu",
      "kamen rider",
      "ultraman",
      "sentai",
      "gaoranger",
      "bien hinh",
      "quai vat khong lo",
      "kaiju",
      "anh hung bien hinh",
      "sieu nhan",
      "chong lai quai vat",
      "chien doi",
    ],
    characterEntities: [
      "Kamen Rider",
      "Ultraman",
      "Super Sentai",
      "Gaoranger",
      "Godzilla",
    ],
    negativePhrases: [
      "superman",
      "clark kent",
      "batman",
      "bruce wayne",
      "iron man",
      "tony stark",
      "avengers",
      "justice league",
      "nguoi dan ong thep",
    ],
  },
  {
    id: "western_superhero",
    canonicalName: "Siêu anh hùng Âu Mỹ (Marvel / DC)",
    triggerPhrases: [
      "sieu anh hung my",
      "sieu anh hung au my",
      "sieu anh hung marvel",
      "sieu anh hung dc",
      "superhero",
      "avengers",
      "justice league",
      "marvel",
      "dc comics",
    ],
    discoveryKeywords: [
      "siêu anh hùng",
      "Spider-Man",
      "Batman",
      "Superman",
      "Iron Man",
      "Avengers",
      "Justice League",
    ],
    strongTitleConcepts: [
      "spider-man",
      "spiderman",
      "batman",
      "superman",
      "iron man",
      "avengers",
      "justice league",
      "thor",
      "captain america",
      "black panther",
      "doctor strange",
      "aquaman",
      "wonder woman",
      "flash",
      "deadpool",
      "wolverine",
      "x-men",
    ],
    strongSynopsisConcepts: [
      "sieu anh hung",
      "marvel",
      "dc comics",
      "avengers",
      "justice league",
      "cuu the gioi",
      "superhero",
    ],
    characterEntities: [
      "Spider-Man",
      "Batman",
      "Superman",
      "Iron Man",
      "Thor",
      "Captain America",
    ],
    negativePhrases: [
      "kamen rider",
      "ultraman",
      "sentai",
      "gaoranger",
      "tokusatsu",
    ],
  },
  {
    id: "hong_kong_martial_arts",
    canonicalName: "Võ thuật / Phim chưởng Hồng Kông",
    triggerPhrases: [
      "vo thuat hong kong",
      "vo thuat hk",
      "phim chuong hong kong",
      "phim chuong",
      "kiem hiep hong kong",
      "kungfu hong kong",
      "kung fu hong kong",
      "phim vo thuat hong kong",
    ],
    discoveryKeywords: [
      "võ thuật",
      "kiếm hiệp",
      "phim chưởng",
      "kung fu",
      "Hồng Kông",
      "kungfu",
    ],
    strongTitleConcepts: [
      "vo thuat",
      "kiem hiep",
      "kung fu",
      "kungfu",
      "diep van",
      "hoang phi hong",
      "tinh vo",
      "thieu lam",
      "thai cuc",
      "tuy quyen",
    ],
    strongSynopsisConcepts: [
      "vo thuat",
      "kiem hiep",
      "kung fu",
      "kungfu",
      "mon phai",
      "thieu lam",
      "giang ho",
      "danh vo",
      "ti vo",
      "chieu thuc",
      "hong kong",
    ],
    characterEntities: [
      "Diệp Vấn",
      "Hoàng Phi Hồng",
      "Trần Chân",
      "Lý Tiểu Long",
      "Thành Long",
      "Chân Tử Đan",
      "Lý Liên Kiệt",
    ],
    negativePhrases: [],
  },
  {
    id: "police_crime_investigation",
    canonicalName: "Cảnh sát / Hình sự / Phá án / Điều tra",
    triggerPhrases: [
      "canh sat pha an",
      "canh sat hinh su",
      "dieu tra pha an",
      "phim pha an",
      "phim canh sat",
      "truy bat toi pham",
      "canh sat dieu tra",
      "dac nhiem",
      "hinh su pha an",
    ],
    discoveryKeywords: [
      "cảnh sát",
      "hình sự",
      "phá án",
      "điều tra",
      "trinh thám",
      "thanh tra",
      "tội phạm",
    ],
    strongTitleConcepts: [
      "canh sat",
      "hinh su",
      "pha an",
      "dieu tra",
      "trinh tham",
      "thanh tra",
      "dac vu",
      "toi pham",
      "truy tim",
      "mat vu",
      "bang dang",
    ],
    strongSynopsisConcepts: [
      "canh sat",
      "hinh su",
      "pha an",
      "dieu tra",
      "thanh tra",
      "toi pham",
      "truy bat",
      "giet nguoi",
      "hung thu",
      "manh moi",
      "vu an",
      "chuyen an",
    ],
    negativePhrases: [],
  },
  {
    id: "medical_doctor",
    canonicalName: "Y khoa / Bác sĩ / Bệnh viện",
    triggerPhrases: [
      "bac si",
      "y khoa",
      "benh vien",
      "nganh y",
      "y te",
      "phau thuat",
      "doctor",
      "hospital",
    ],
    discoveryKeywords: [
      "bác sĩ",
      "y khoa",
      "bệnh viện",
      "y tế",
      "phẫu thuật",
      "cấp cứu",
    ],
    strongTitleConcepts: [
      "bac si",
      "y khoa",
      "benh vien",
      "doctor",
      "hospital",
      "medical",
    ],
    strongSynopsisConcepts: [
      "bac si",
      "y khoa",
      "benh vien",
      "phau thuat",
      "cuu nguoi",
      "benh nhan",
      "y te",
    ],
    negativePhrases: [],
  },
  {
    id: "legal_lawyer",
    canonicalName: "Luật sư / Tòa án / Công lý",
    triggerPhrases: [
      "luat su",
      "toa an",
      "phap dinh",
      "tranh tung",
      "xu an",
      "cong ly",
      "lawyer",
      "attorney",
      "court",
    ],
    discoveryKeywords: [
      "luật sư",
      "pháp luật",
      "tòa án",
      "tranh tụng",
      "xử án",
      "công lý",
    ],
    strongTitleConcepts: [
      "luat su",
      "toa an",
      "phap dinh",
      "lawyer",
      "court",
      "justice",
    ],
    strongSynopsisConcepts: [
      "luat su",
      "toa an",
      "tranh tung",
      "bao chua",
      "than chu",
      "cong ly",
      "phap luat",
    ],
    negativePhrases: [],
  },
  {
    id: "kiem_hiep",
    canonicalName: "Kiếm Hiệp / Võ Hiệp / Giang Hồ",
    triggerPhrases: [
      "kiem hiep",
      "kiếm hiệp",
      "vo hiep",
      "võ hiệp",
      "giang ho",
      "giang hồ",
      "vo lam",
      "võ lâm",
      "hiep khach",
      "hiệp khách",
      "mon phai",
      "môn phái",
      "kim dung",
      "co long",
      "cổ long",
      "wuxia",
    ],
    discoveryKeywords: [
      "kiếm hiệp",
      "võ hiệp",
      "giang hồ",
      "võ lâm",
      "Kim Dung",
      "Cổ Long",
      "Tiếu Ngạo Giang Hồ",
      "Anh Hùng Xạ Điêu",
      "Thiên Long Bát Bộ",
    ],
    strongTitleConcepts: [
      "kiem hiep",
      "vo hiep",
      "giang ho",
      "vo lam",
      "hiep khach",
      "kiem",
      "dao",
      "tieu ngao",
      "xa dieu",
      "thien long",
      "y thien",
      "than dieu",
      "luc tieu phung",
      "so luu huong",
    ],
    strongSynopsisConcepts: [
      "kiem hiep",
      "vo hiep",
      "giang ho",
      "vo lam",
      "mon phai",
      "kiem phap",
      "tuyet ky",
      "chieu thuc",
      "kim dung",
      "co long",
      "hiep khach",
      "vo cong",
      "chuong mon",
      "hiep nghia",
    ],
    negativePhrases: ["cung dau", "hau cung", "dien hi cong luoc", "nhu y truyen"],
  },
  {
    id: "tra_thu",
    canonicalName: "Trả Thù / Báo Thù / Báo Oán",
    triggerPhrases: [
      "tra thu",
      "trả thù",
      "bao thu",
      "báo thù",
      "phuc thu",
      "phục thù",
      "bao oan",
      "báo oán",
      "revenge",
      "vengeance",
    ],
    discoveryKeywords: [
      "trả thù",
      "báo thù",
      "phục thù",
      "Revenge",
      "John Wick",
      "Oldboy",
      "The Glory",
    ],
    strongTitleConcepts: [
      "tra thu",
      "bao thu",
      "revenge",
      "vengeance",
      " retribution",
      "sat thu",
    ],
    strongSynopsisConcepts: [
      "tra thu",
      "bao thu",
      "phuc thu",
      "sat hai",
      "oan han",
      "ke thu",
      "ke giet",
      "truy sat",
      "thanh toan",
      "tra gia",
    ],
    negativePhrases: [],
  },
  {
    id: "tong_tai",
    canonicalName: "Tổng Tài / Ngôn Tình Bá Đạo",
    triggerPhrases: [
      "tong tai",
      "tổng tài",
      "tong tai ba dao",
      "tổng tài bá đạo",
      "tong tai lanh lung",
      "tổng tài lạnh lùng",
      "chu tich",
      "chủ tịch",
      "ceo",
      "ngon tinh tong tai",
    ],
    discoveryKeywords: [
      "tổng tài",
      "tổng tài bá đạo",
      "chủ tịch",
      "CEO",
      "ngôn tình tổng tài",
      "tập đoàn",
    ],
    strongTitleConcepts: [
      "tong tai",
      "chu tich",
      "ceo",
      "ba dao",
      "boss",
    ],
    strongSynopsisConcepts: [
      "tong tai",
      "chu tich",
      "tap doan",
      "giam doc",
      "ceo",
      "ba dao",
      "ngon tinh",
      "hop dong hon nhan",
      "hao mon",
    ],
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
