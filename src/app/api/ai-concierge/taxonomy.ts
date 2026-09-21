import { COUNTRY_SLUG_MAP, GENRE_SLUG_MAP } from "./constants";
import { ACTOR_SLUG_MAP } from "@/services/aiActorService";
import { cleanNormalizedString } from "@/lib/stringUtils";
import { CharacterProfile } from "./types";

export { cleanNormalizedString };

/**
 * Bảng ánh xạ chuẩn hóa nhân vật điện ảnh kinh điển (Character Taxonomy)
 * Dùng để chuẩn hóa bí danh, tên tiếng Việt, tên gốc và sửa lỗi gõ/typo dấu tiếng Việt
 */
export const CHARACTER_SLUG_MAP: Record<string, CharacterProfile> = {
  "tran-chan": {
    name: "Trần Chân",
    aliases: [
      "trần chân",
      "tran chan",
      "trẩn chân",
      "trấn chân",
      "trân chân",
      "trần trân",
      "chen zhen",
      "chenzhen",
      "chen zheng",
    ],
    searchKeywords: ["tran chan", "chen zhen", "tinh vo mon", "fist of fury", "huyen thoai tran chan"],
    defaultTitles: ["Huyền Thoại Trần Chân", "Tinh Võ Môn", "Tinh Võ Trần Chân", "Truyền Thuyết Chen Zhen"],
  },
  "ton-ngo-khong": {
    name: "Tôn Ngộ Không",
    aliases: [
      "tôn ngộ không",
      "ton ngo khong",
      "tôn ngộ ko",
      "ton ngo ko",
      "tề thiên đại thánh",
      "te thien dai thanh",
      "sun wukong",
      "monkey king",
      "wukong",
    ],
    searchKeywords: ["tay du ky", "ton ngo khong", "sun wukong", "monkey king"],
    defaultTitles: ["Tây Du Ký", "Ngộ Không Truyện", "Đại Náo Thiên Cung"],
  },
  "diep-van": {
    name: "Diệp Vấn",
    aliases: ["diệp vấn", "diep van", "ip man", "ipman"],
    searchKeywords: ["diep van", "ip man"],
    defaultTitles: ["Diệp Vấn", "Diệp Vấn 2", "Diệp Vấn 3", "Diệp Vấn 4"],
  },
  "hoang-phi-hong": {
    name: "Hoàng Phi Hồng",
    aliases: ["hoàng phi hồng", "hoang phi hong", "wong fei hung", "wong fei-hung"],
    searchKeywords: ["hoang phi hong", "wong fei hung"],
    defaultTitles: ["Hoàng Phi Hồng"],
  },
  "iron-man": {
    name: "Iron Man",
    aliases: ["iron man", "ironman", "tony stark", "người sắt", "nguoi sat"],
    searchKeywords: ["iron man", "nguoi sat", "avengers"],
    defaultTitles: ["Người Sắt", "Người Sắt 2", "Người Sắt 3", "Avengers: Hồi Kết"],
  },
  "spider-man": {
    name: "Spider-Man",
    aliases: ["spider man", "spiderman", "peter parker", "người nhện", "nguoi nhen"],
    searchKeywords: ["spider man", "nguoi nhen"],
    defaultTitles: ["Người Nhện: Không Còn Nhà", "Người Nhện Xa Nhà", "Người Nhện"],
  },
  "batman": {
    name: "Batman",
    aliases: ["batman", "bruce wayne", "người dơi", "nguoi doi", "kỵ sĩ bóng đêm"],
    searchKeywords: ["batman", "nguoi doi", "the dark knight"],
    defaultTitles: ["Kỵ Sĩ Bóng Đêm", "The Batman", "Người Dơi Bắt Đầu"],
  },
  "superman": {
    name: "Superman",
    aliases: ["superman", "clark kent", "người đàn ông thép", "nguoi dan ong thep", "man of steel", "super man"],
    searchKeywords: ["superman", "man of steel", "nguoi dan ong thep"],
    defaultTitles: ["Người Đàn Ông Thép", "Superman"],
  },
  "kamen-rider": {
    name: "Kamen Rider",
    aliases: [
      "kamen rider",
      "kamenrider",
      "siêu nhân dế",
      "sieu nhan de",
      "hiệp sĩ mặt nạ",
      "hiep si mat na",
      "masked rider",
    ],
    searchKeywords: ["kamen rider", "masked rider", "hiep si mat na"],
    defaultTitles: ["Kamen Rider", "Shin Kamen Rider", "Kamen Rider Geats", "Kamen Rider Build"],
  },
  "ultraman": {
    name: "Ultraman",
    aliases: [
      "ultraman",
      "siêu nhân điện quang",
      "sieu nhan dien quang",
      "ultra series",
      "shin ultraman",
    ],
    searchKeywords: ["ultraman", "sieu nhan dien quang", "shin ultraman"],
    defaultTitles: ["Ultraman", "Shin Ultraman", "Ultraman Trigger", "Ultraman Blazar"],
  },
  "super-sentai": {
    name: "Super Sentai",
    aliases: [
      "super sentai",
      "supersentai",
      "5 anh em siêu nhân",
      "5 anh em sieu nhan",
      "siêu nhân gao",
      "sieu nhan gao",
      "gaoranger",
      "power rangers",
    ],
    searchKeywords: ["super sentai", "sentai", "gaoranger", "power rangers"],
    defaultTitles: ["Gaoranger", "Super Sentai", "Power Rangers"],
  },
  "john-wick": {
    name: "John Wick",
    aliases: ["john wick", "baba yaga"],
    searchKeywords: ["john wick"],
    defaultTitles: ["Sát Thủ John Wick", "John Wick 2", "John Wick 3"],
  },
  "sherlock-holmes": {
    name: "Sherlock Holmes",
    aliases: ["sherlock holmes", "sherlock", "lục lạc tây"],
    searchKeywords: ["sherlock holmes", "sherlock"],
    defaultTitles: ["Sherlock Holmes"],
  },
  "conan": {
    name: "Conan",
    aliases: ["conan", "thám tử lừng danh conan", "tham tu lung danh conan", "edogawa conan", "kudo shinichi"],
    searchKeywords: ["tham tu lung danh conan", "conan"],
    defaultTitles: ["Thám Tử Lừng Danh Conan"],
  },
};

/**
 * Kiểm tra xem câu hỏi có chứa ý định tìm kiếm nhân vật hay không
 */
export function detectCharacterIntent(query?: string): boolean {
  if (!query) return false;
  const lower = query.toLowerCase();
  if (
    /(?:có|co)\s+(?:nhân\s+vật|nhan\s+vat)/i.test(lower) ||
    /(?:nhân\s+vật|nhan\s+vat)\s+(?:tên\s+là|tên|trong\s+phim)/i.test(lower) ||
    /(?:vai\s+diễn|vai\s+dien|đóng\s+vai|dong\s+vai)/i.test(lower) ||
    /(?:xuất\s+hiện|xuat\s+hien)\s+(?:trong\s+)?phim/i.test(lower)
  ) {
    return true;
  }
  return Boolean(resolveCharacter(query));
}

/**
 * Kiểm tra xem từ/cụm từ có xuất hiện trong chuỗi với ranh giới từ (word boundary) hay không
 */
export function hasWordMatch(text: string, word: string): boolean {
  if (!text || !word) return false;
  const cleanT = cleanNormalizedString(text);
  const cleanW = cleanNormalizedString(word);
  if (cleanT === cleanW) return true;
  // Với từ ngắn <= 4 ký tự (như anh, my, y, uc, duc): Bắt buộc phải là từ độc lập
  if (cleanW.length <= 4) {
    const escaped = cleanW.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i");
    return regex.test(cleanT);
  }
  return cleanT.includes(cleanW);
}

/**
 * Tìm kiếm và chuẩn hóa nhân vật từ query hoặc tên thô
 */
export function resolveCharacter(
  rawQueryOrName?: string
): (CharacterProfile & { slug: string }) | null {
  if (!rawQueryOrName) return null;
  const raw = rawQueryOrName.trim();
  const cleanQ = cleanNormalizedString(raw);

  // 1. So khớp trực tiếp toàn bộ chuỗi với alias (đã qua cleanNormalizedString khử dấu thanh)
  for (const [slug, profile] of Object.entries(CHARACTER_SLUG_MAP)) {
    for (const alias of profile.aliases) {
      if (cleanQ === cleanNormalizedString(alias)) {
        return { slug, ...profile };
      }
    }
  }

  // 2. Trích xuất tên nhân vật từ các mẫu câu tìm kiếm phổ biến
  const patterns = [
    /(?:phim\s+)?(?:có|co)\s+(?:nhân\s+vật|nhan\s+vat)\s+([^\.,\?!]+)/i,
    /(?:nhân\s+vật|nhan\s+vat)\s+([^\.,\?!]+)/i,
    /(?:phim\s+về|phim\s+ve)\s+([^\.,\?!]+)/i,
    /(.+?)\s+(?:xuất\s+hiện|xuat\s+hien)\s+(?:trong\s+)?phim\s+nào/i,
    /(?:phim\s+có|phim\s+co)\s+([^\.,\?!]+)/i,
    /^phim\s+([^\.,\?!]+)$/i,
  ];

  for (const p of patterns) {
    const match = raw.match(p);
    if (match && match[1]) {
      const extractedClean = cleanNormalizedString(match[1]);
      for (const [slug, profile] of Object.entries(CHARACTER_SLUG_MAP)) {
        for (const alias of profile.aliases) {
          const cleanAlias = cleanNormalizedString(alias);
          if (
            extractedClean === cleanAlias ||
            hasWordMatch(extractedClean, cleanAlias)
          ) {
            return { slug, ...profile };
          }
        }
      }
    }
  }

  // 3. Quét kiểm tra substring toàn câu nếu alias có độ dài >= 4 ký tự
  // Bỏ qua nếu câu có dấu hiệu rõ ràng là tìm kiếm diễn viên ("phim của ...", "... đóng chính")
  const lower = raw.toLowerCase();
  const isActorPattern =
    lower.includes("phim của") ||
    lower.includes("phim cua") ||
    lower.includes("đóng chính") ||
    lower.includes("dong chinh");

  if (!isActorPattern) {
    for (const [slug, profile] of Object.entries(CHARACTER_SLUG_MAP)) {
      for (const alias of profile.aliases) {
        const cleanAlias = cleanNormalizedString(alias);
        if (cleanAlias.length >= 4 && hasWordMatch(cleanQ, cleanAlias)) {
          return { slug, ...profile };
        }
      }
    }
  }

  return null;
}

/**
 * Chuẩn hóa query dùng cho cache key
 */
export function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Sửa các lỗi chính tả phổ biến trong tiếng Việt trước khi gửi AI
 */
export function normalizeTypos(prompt: string): string {
  const res = prompt
    .replace(/\bzoombie[s]?\b/gi, "zombie")
    .replace(/\bhành đọng\b/gi, "hành động")
    .replace(/\bhanh dong\b/gi, "hành động")
    .replace(/\btình cãm\b/gi, "tình cảm")
    .replace(/\btinh cam\b/gi, "tình cảm")
    .replace(/\bhoat hinh\b/gi, "hoạt hình")
    .replace(/\bhai huoc\b/gi, "hài hước")
    .replace(/\bkinh di\b/gi, "kinh dị")
    .replace(/\bviễn tuởng\b/gi, "viễn tưởng")
    .replace(/\bvien tuong\b/gi, "viễn tưởng")
    .replace(/\btrinh tham\b/gi, "trinh thám")
    .replace(/\btrẩn chân\b/gi, "Trần Chân")
    .replace(/\bton ngo ko\b/gi, "Tôn Ngộ Không")
    .replace(/\btôn ngộ ko\b/gi, "Tôn Ngộ Không");

  return res;
}

/**
 * Trích xuất năm an toàn (xử lý cả '1995', '1995-12-01', 1995)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMovieYear(item: any): number {
  if (!item) return 0;
  const raw = item.year || item.movie?.year || item.release_date || item.publish_date || item.created_at || "";
  const match = String(raw).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Tìm kiếm slug diễn viên dựa trên bảng ánh xạ ACTOR_SLUG_MAP dùng chung
 * KHÔNG BAO GIỜ match actor nếu câu hỏi đang là Character Search Intent!
 */
export function resolveActorSlug(rawActor?: string, fullPrompt?: string): string {
  if (!rawActor && !fullPrompt) return "";
  if (fullPrompt && detectCharacterIntent(fullPrompt)) {
    return "";
  }
  const target = rawActor || fullPrompt || "";
  const clean = cleanNormalizedString(target);
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    if (clean.length >= 6 && aliases.some((a) => clean.includes(cleanNormalizedString(a)))) {
      return slug;
    }
  }
  return "";
}

/**
 * Lấy danh sách bí danh của một diễn viên theo slug
 */
export function getActorAliases(actorSlug: string): string[] {
  return ACTOR_SLUG_MAP[actorSlug] || [actorSlug.replace(/-/g, " ")];
}

/**
 * Kiểm tra mảng diễn viên của phim có khớp với diễn viên mục tiêu hay không
 */
export function matchesActor(itemActors: string[], actorSlug: string): boolean {
  if (!actorSlug || !itemActors || itemActors.length === 0) return false;
  const aliases = getActorAliases(actorSlug).map(cleanNormalizedString);
  const cleanActors = itemActors.map(cleanNormalizedString);
  return cleanActors.some((act) =>
    aliases.some((alias) => act === alias || (alias.split(" ").length >= 2 && act.includes(alias)))
  );
}

/**
 * Tìm kiếm slug quốc gia chuẩn hóa
 */
export function resolveCountrySlug(rawCountry?: string): string {
  if (!rawCountry) return "";
  const clean = cleanNormalizedString(rawCountry);
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => hasWordMatch(clean, cleanNormalizedString(a)))) {
      return slug;
    }
  }
  return "";
}

/**
 * Tìm kiếm slug thể loại chuẩn hóa
 */
export function resolveGenreSlug(rawGenre?: string): string {
  if (!rawGenre) return "";
  const clean = cleanNormalizedString(rawGenre);
  for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }
  for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
    if (aliases.some((a) => hasWordMatch(clean, cleanNormalizedString(a)))) {
      return slug;
    }
  }
  return "";
}

/**
 * Kiểm tra chuỗi quốc gia của phim có khớp với slug mục tiêu không
 */
export function matchesCountry(itemCountryStr: string, targetCountrySlug: string): boolean {
  if (!targetCountrySlug || !itemCountryStr) return true;
  const cleanItem = cleanNormalizedString(itemCountryStr);
  const targetAliases = COUNTRY_SLUG_MAP[targetCountrySlug] || [targetCountrySlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
}

/**
 * Kiểm tra chuỗi thể loại của phim có khớp với slug mục tiêu không
 */
export function matchesGenre(itemCategoryStr: string, targetGenreSlug: string): boolean {
  if (!targetGenreSlug || !itemCategoryStr) return true;
  const cleanItem = cleanNormalizedString(itemCategoryStr);
  const targetAliases = GENRE_SLUG_MAP[targetGenreSlug] || [targetGenreSlug];
  return targetAliases.some((alias) => cleanItem.includes(cleanNormalizedString(alias)));
}
