import { COUNTRY_SLUG_MAP, COUNTRY_DISPLAY_NAMES, GENRE_SLUG_MAP } from "./constants";
import { ACTOR_SLUG_MAP } from "@/services/aiActorService";
import { cleanNormalizedString } from "@/lib/stringUtils";
import { CharacterProfile } from "./types";

export { cleanNormalizedString, ACTOR_SLUG_MAP, COUNTRY_DISPLAY_NAMES };

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
  const escaped = cleanW.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i");
  return regex.test(cleanT);
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
 * Bóc tách từ khóa tìm kiếm sạch (loại bỏ tiền tố 'tìm phim', 'xem phim', 'gợi ý phim', ...)
 */
export function extractCleanSearchKeywords(query: string): string {
  if (!query) return "";
  let cleaned = query.trim();
  cleaned = cleaned
    .replace(/^(?:tìm|tim|xem|cho\s+tôi\s+xem|cho\s+toi\s+xem|gợi\s+ý|goi\s+y|có|co)\s+(?:phim\s+lẻ\s+về|phim\s+le\s+ve|phim\s+bộ\s+về|phim\s+bo\s+ve|phim\s+về|phim\s+ve|phim\s+lẻ|phim\s+le|phim\s+bộ|phim\s+bo|phim)\s+/gi, "")
    .replace(/^(?:tìm|tim|xem|gợi\s+ý|goi\s+y)\s+/gi, "")
    .replace(/^(?:phim\s+lẻ\s+về|phim\s+le\s+ve|phim\s+bộ\s+về|phim\s+bo\s+ve|phim\s+về|phim\s+ve|phim\s+lẻ|phim\s+le|phim\s+bộ|phim\s+bo|phim)\s+/gi, "")
    .trim();
  return cleaned || query.trim();
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
 * Lấy tên hiển thị tiếng Việt của quốc gia từ slug
 */
export function getCountryDisplayName(countrySlug?: string): string {
  if (!countrySlug) return "Quốc Tế";
  return COUNTRY_DISPLAY_NAMES[countrySlug] || "Quốc Tế";
}

/**
 * Kiểm tra đạo diễn của phim có khớp với tên / slug đạo diễn mục tiêu hay không
 */
export function matchesDirector(
  directorMetadata: unknown,
  personNameOrSlug: string
): boolean {
  if (!directorMetadata || !personNameOrSlug) return false;
  const cleanTarget = cleanNormalizedString(personNameOrSlug);
  if (!cleanTarget || cleanTarget.length < 2) return false;

  const aliases = getActorAliases(personNameOrSlug).map(cleanNormalizedString);
  if (!aliases.includes(cleanTarget)) aliases.push(cleanTarget);

  const directorList: string[] = Array.isArray(directorMetadata)
    ? directorMetadata.map((d) => (typeof d === "string" ? d : (d as { name?: string })?.name || ""))
    : typeof directorMetadata === "string"
    ? directorMetadata.split(/[,;\/]/)
    : [];

  const cleanDirectors = directorList
    .map(cleanNormalizedString)
    .filter(Boolean);

  return cleanDirectors.some((d) =>
    aliases.some((a) => a && (d === a || hasWordMatch(d, a) || (a.split(" ").length >= 2 && d.includes(a))))
  );
}

/**
 * Trích xuất tổng số tập thực tế từ metadata phim (hỗ trợ cả number, "10 Tập", "Full", etc.)
 */
export function extractEpisodeTotal(item: unknown): number | null {
  if (!item || typeof item !== "object") return null;
  const it = item as Record<string, unknown>;

  const raw =
    it.episode_total ||
    it.total_episodes ||
    it.episodes_total ||
    it.episode_current ||
    it.episodes ||
    it.quality ||
    it.time;

  if (typeof raw === "number" && !isNaN(raw)) return raw;

  if (typeof raw === "string") {
    const cleanRaw = cleanNormalizedString(raw).toLowerCase();
    const m =
      cleanRaw.match(/(\d+)\s*(?:tap|ep|chuong)/i) ||
      cleanRaw.match(/(?:tap|ep)\s*(\d+)/i) ||
      cleanRaw.match(/(\d+)\/(\d+)/) ||
      cleanRaw.match(/\b(\d+)\b/);
    if (m) {
      const parsed = parseInt(m[2] || m[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (/full|hoan tat|tron bo|hoan thanh/i.test(cleanRaw)) {
      if (it.type === "single" || it.type === "phim-le") return 1;
    }
  }

  const name = typeof it.name === "string" ? it.name : typeof it.title === "string" ? it.title : "";
  if (name) {
    const epMatch = name.match(/(\d+)\s*(?:tap|ep)/i) || name.match(/(?:tap|ep)\s*(\d+)/i);
    if (epMatch) {
      const parsed = parseInt(epMatch[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  if (it.type === "single" || it.type === "phim-le") return 1;

  // Nếu là phim bộ nhưng không có số tập cụ thể
  return null;
}

/**
 * Trích xuất ràng buộc số tập từ prompt (dưới 10 tập vs tối đa 10 tập, yêu cầu phim bộ/series)
 */
export function parseEpisodeConstraint(prompt: string): {
  maxEpisodes?: number;
  strictLessThan?: number;
  requireSeries?: boolean;
} | null {
  if (!prompt) return null;
  const clean = cleanNormalizedString(prompt).toLowerCase();

  const requireSeries = /(?:phim\s+bo|series|truyen\s+hinh|nhieu\s+tap|phim\s+ngan\s+tap)/i.test(clean);

  // "dưới X tập", "ít hơn X tập", "nhỏ hơn X tập", "< X tập"
  const lessThanMatch = clean.match(/(?:duoi|it\s+hon|nho\s+hon|<\s*)\s*(\d+)\s*(?:tap|ep)/i);
  if (lessThanMatch) {
    const num = parseInt(lessThanMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return {
        maxEpisodes: num - 1,
        strictLessThan: num,
        requireSeries,
      };
    }
  }

  // "tối đa X tập", "không quá X tập", "<= X tập", "X tập trở xuống"
  const maxNumMatch =
    clean.match(/(?:toi\s+da|khong\s+qua|<=\s*)\s*(\d+)\s*(?:tap|ep)/i) ||
    clean.match(/(?:tu\s+)?(\d+)\s*(?:tap|ep)\s*tro\s*xuong/i);
  if (maxNumMatch) {
    const num = parseInt(maxNumMatch[1], 10);
    if (!isNaN(num) && num > 0) {
      return {
        maxEpisodes: num,
        requireSeries,
      };
    }
  }

  return null;
}

/**
 * Tìm kiếm slug quốc gia chuẩn hóa
 */
export function resolveCountrySlug(rawCountry?: string): string {
  if (!rawCountry) return "";
  const clean = cleanNormalizedString(rawCountry);
  
  // Exact match check
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    if (aliases.some((a) => clean === cleanNormalizedString(a))) {
      return slug;
    }
  }

  // Multi-word / longer phrase matches first (length >= 4)
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    const multiWordAliases = aliases.filter((a) => cleanNormalizedString(a).length >= 4);
    if (multiWordAliases.some((a) => hasWordMatch(clean, cleanNormalizedString(a)))) {
      return slug;
    }
  }

  // Single word / short alias matches
  for (const [slug, aliases] of Object.entries(COUNTRY_SLUG_MAP)) {
    const shortAliases = aliases.filter((a) => cleanNormalizedString(a).length < 4);
    if (shortAliases.some((a) => hasWordMatch(clean, cleanNormalizedString(a)))) {
      return slug;
    }
  }
  return "";
}

// Thứ tự ưu tiên thể loại chuyên biệt/hẹp hơn trước thể loại chung
export const GENRE_SPECIFICITY_WEIGHT: Record<string, number> = {
  "vo-thuat": 100,
  "co-trang": 90,
  "kinh-di": 85,
  "hai-huoc": 80,
  "hoat-hinh": 80,
  "hinh-su": 75,
  "vien-tuong": 75,
  "chien-tranh": 70,
  "tai-lieu": 70,
  "phieu-luu": 65,
  "tinh-cam": 60,
  "bi-an": 60,
  "hanh-dong": 40,
  "tam-ly": 30,
};

function isNegatedInPrompt(cleanPrompt: string, cleanAlias: string): boolean {
  const negationPrefixes = [
    `khong uu tien ${cleanAlias}`,
    `khong thich ${cleanAlias}`,
    `khong phai ${cleanAlias}`,
    `khong muon ${cleanAlias}`,
    `khong co ${cleanAlias}`,
    `khong xem ${cleanAlias}`,
    `khong can ${cleanAlias}`,
    `tranh ${cleanAlias}`,
    `loai tru ${cleanAlias}`,
    `tru ${cleanAlias}`,
    `dung goi y ${cleanAlias}`,
    `dung ${cleanAlias}`,
  ];
  return negationPrefixes.some((prefix) => cleanPrompt.includes(prefix));
}

/**
 * Trích xuất danh sách tất cả các slug thể loại chuẩn hóa từ danh sách hoặc câu prompt
 * Ưu tiên các thể loại chuyên biệt/hẹp hơn (ví dụ: 'vo-thuat' trước 'hanh-dong')
 */
export function resolveGenreSlugs(rawGenres?: string | string[], fullPrompt?: string): string[] {
  const resultSlugs: string[] = [];
  const addSlug = (slug: string) => {
    if (slug && !resultSlugs.includes(slug)) {
      resultSlugs.push(slug);
    }
  };

  const cleanPrompt = fullPrompt ? cleanNormalizedString(fullPrompt) : "";

  // 1. Phân tích các chuỗi đầu vào từ rawGenres (nếu có)
  const rawList = Array.isArray(rawGenres) ? rawGenres : rawGenres ? [rawGenres] : [];
  for (const raw of rawList) {
    if (!raw) continue;
    const clean = cleanNormalizedString(raw);
    for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
      if (aliases.some((a) => {
        const cleanA = cleanNormalizedString(a);
        if (cleanPrompt && isNegatedInPrompt(cleanPrompt, cleanA)) return false;
        return clean === cleanA || hasWordMatch(clean, cleanA);
      })) {
        addSlug(slug);
      }
    }
  }

  // 2. Quét thêm từ fullPrompt (nếu có)
  if (cleanPrompt) {
    for (const [slug, aliases] of Object.entries(GENRE_SLUG_MAP)) {
      if (aliases.some((a) => {
        const cleanA = cleanNormalizedString(a);
        if (isNegatedInPrompt(cleanPrompt, cleanA)) return false;
        return hasWordMatch(cleanPrompt, cleanA);
      })) {
        addSlug(slug);
      }
    }
  }

  // Sắp xếp thứ tự ưu tiên thể loại hẹp/chuyên biệt lên trước
  resultSlugs.sort((a, b) => (GENRE_SPECIFICITY_WEIGHT[b] || 50) - (GENRE_SPECIFICITY_WEIGHT[a] || 50));

  return resultSlugs;
}

/**
 * Tìm kiếm slug thể loại chuẩn hóa (ưu tiên thể loại hẹp nếu có nhiều thể loại)
 */
export function resolveGenreSlug(rawGenre?: string, fullPrompt?: string): string {
  const slugs = resolveGenreSlugs(rawGenre, fullPrompt);
  if (slugs.length > 0) {
    return slugs[0];
  }
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
 * Kiểm tra xem người dùng có yêu cầu cụ thể "tất cả các phần", "các mùa", "toàn bộ phần phim" hay không
 */
export function isExplicitAllPartsRequest(prompt?: string): boolean {
  if (!prompt) return false;
  const p = cleanNormalizedString(prompt).toLowerCase();
  return (
    p.includes("tat ca cac phan") ||
    p.includes("tat ca phan") ||
    p.includes("toan bo cac phan") ||
    p.includes("toan bo phan") ||
    p.includes("moi phan") ||
    p.includes("cac phan") ||
    p.includes("cac season") ||
    p.includes("tat ca season") ||
    p.includes("toan bo season") ||
    p.includes("tat ca tap") ||
    p.includes("cac mua") ||
    p.includes("all parts") ||
    p.includes("all seasons")
  );
}

const KNOWN_FRANCHISE_PREFIXES: Array<{ prefix: string; franchise: string }> = [
  { prefix: "diep-van", franchise: "diep-van" },
  { prefix: "ip-man", franchise: "diep-van" },
  { prefix: "kung-fu-panda", franchise: "kung-fu-panda" },
  { prefix: "kung-fu-gau-truc", franchise: "kung-fu-panda" },
  { prefix: "dreamworks-nhung-bi-mat-tuyet-voi-cua-gau-truc-kung-fu", franchise: "kung-fu-panda" },
  { prefix: "sat-thu-john-wick", franchise: "john-wick" },
  { prefix: "john-wick", franchise: "john-wick" },
  { prefix: "sat-pha-lang", franchise: "sat-pha-lang" },
  { prefix: "vuot-nguc", franchise: "vuot-nguc" },
  { prefix: "prison-break", franchise: "vuot-nguc" },
  { prefix: "cobra-kai", franchise: "cobra-kai" },
  { prefix: "qua-nhanh-qua-nguy-hiem", franchise: "fast-and-furious" },
  { prefix: "fast-and-furious", franchise: "fast-and-furious" },
  { prefix: "nhiem-vu-bat-kha-thi", franchise: "mission-impossible" },
  { prefix: "mission-impossible", franchise: "mission-impossible" },
];

/**
 * Chuẩn hóa khóa nhận diện franchise/series để gom nhóm các season/phần phim
 */
export function extractFranchiseKey(slug: string, title?: string): string {
  if (!slug) return "";
  let baseSlug = slug.toLowerCase().trim();

  for (const item of KNOWN_FRANCHISE_PREFIXES) {
    if (baseSlug === item.prefix || baseSlug.startsWith(`${item.prefix}-`) || baseSlug.startsWith(item.prefix)) {
      return item.franchise;
    }
  }

  // Xóa bỏ các đuôi phần/season: -season-\d+, -phan-\d+, -part-\d+, -chap-\d+, -chapter-\d+, -tap-\d+, -\d+$
  baseSlug = baseSlug
    .replace(/-(?:season|phan|part|chapter|chap|tap|ss|s)-?\d+.*$/i, "")
    .replace(/-(?:season|phan|part|chapter|chap|tap|ss|s)$/i, "")
    .replace(/-\d+$/i, "")
    .replace(/-(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i, "");

  return baseSlug || slug.toLowerCase().trim();
}

/**
 * Chuẩn hóa loại phim / định dạng phim (Movie Type / Format)
 * Ánh xạ chuẩn sang các định dạng catalog hỗ trợ: phim-bo, phim-le, hoat-hinh, tv-shows, phim-chieu-rap
 */
export function resolveTypeSlug(rawType?: string, prompt?: string): string {
  const p = (prompt || "").toLowerCase();
  const raw = (rawType || "").toLowerCase();

  // 0. Xử lý các mẫu câu phủ định rõ ràng (ví dụ: "không muốn phim bộ", "không phải phim lẻ")
  const isNoSeries = /(?:khong\s+muon|không\s+muốn|khong\s+phai|không\s+phải|ko\s+phai|tru|trừ|loai\s+tru|loại\s+trừ)\s+(?:phim\s+)?(?:bo|bộ|series|drama)/i.test(p);
  const isNoSingle = /(?:khong\s+muon|không\s+muốn|khong\s+phai|không\s+phải|ko\s+phai|tru|trừ|loai\s+tru|loại\s+trừ)\s+(?:phim\s+)?(?:le|lẻ|single|movie)/i.test(p);
  const isNoAnime = /(?:khong\s+muon|không\s+muốn|khong\s+phai|không\s+phải|tru|trừ)\s+(?:hoat\s+hinh|hoạt\s+hình|anime)/i.test(p);

  // 1. Phim lẻ (ưu tiên nếu có yêu cầu phim lẻ rõ ràng hoặc loại trừ phim bộ)
  if (
    (!isNoSingle && /(?:phim\s+le|phim\s+lẻ|dien\s+anh|điện\s+ảnh|\bmovie\b|\bsingle\b)/i.test(p)) ||
    (isNoSeries && !isNoSingle) ||
    raw === "single" ||
    raw === "phim-le"
  ) {
    return "phim-le";
  }

  // 2. TV Shows
  if (
    /(?:tv\s*shows?|truyen\s+hinh\s+thuc\s+te|truyền\s+hình\s+thực\s+tế|\bshow\b)/i.test(p) ||
    raw === "tvshows" ||
    raw === "tv-shows"
  ) {
    return "tv-shows";
  }

  // 3. Hoạt hình & Anime
  if (
    (!isNoAnime && /(?:hoat\s+hinh|hoạt\s+hình|anime|animation|manga)/i.test(p)) ||
    raw === "anime" ||
    raw === "hoat-hinh" ||
    raw === "hoathinh"
  ) {
    return "hoat-hinh";
  }

  // 4. Chiếu rạp
  if (
    /(?:chieu\s+rap|chiếu\s+rạp|dien\s+anh\s+chieu\s+rap)/i.test(p) ||
    raw === "phim-chieu-rap"
  ) {
    return "phim-chieu-rap";
  }

  // 5. Phim bộ
  if (
    (!isNoSeries && /(?:phim\s+bo|phim\s+bộ|\bseries\b|\bdrama\b|truyen\s+hinh|truyền\s+hình|nhieu\s+tap|nhiều\s+tập)/i.test(p)) ||
    (isNoSingle && !isNoSeries) ||
    raw === "series" ||
    raw === "phim-bo"
  ) {
    return "phim-bo";
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
