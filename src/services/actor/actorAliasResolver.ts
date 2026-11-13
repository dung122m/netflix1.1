import { normalizeForMatch, normalizeVietnameseVowels } from "@/lib/stringUtils";
import {
  type ActorProfile,
  GOLDEN_ACTOR_INDEX,
  ACTOR_CANONICAL_MAP,
  ACTOR_SLUG_MAP,
} from "@/data/actors/goldenActors";

export type { ActorProfile };
export { GOLDEN_ACTOR_INDEX, ACTOR_CANONICAL_MAP, ACTOR_SLUG_MAP };

export function toVietnameseTitleCase(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export const ACTOR_AI_CACHE = new Map<
  string,
  { actorName: string; country?: string; aliases: string[]; isActor: boolean; expireAt: number }
>();
export const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache cho danh sách phim đã tìm thấy từ kho (TTL: 12h fresh, 48h stale SWR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number; staleUntil: number }>();

export function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V, max = 500) {
  if (map.size >= max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

export { normalizeForMatch };

/**
 * Kiểm tra xem từ khóa có tiền tố chỉ định rõ ràng là tìm kiếm DIỄN VIÊN / ĐẠO DIỄN hay không.
 */
export function hasExplicitActorPrefix(query: string): boolean {
  const q = (query || "").trim();
  return /^(?:diễn\s+viên|dien\s+vien|đạo\s+diễn|dao\s+dien|phim\s+của|phim\s+cua|tuyển\s+tập\s+(?:phim\s+)?(?:của\s+)?|tuyen\s+tap\s+(?:phim\s+)?(?:cua\s+)?|actor\s*:\s*)/i.test(q);
}

// Tập hợp các từ khóa ngắn/từ đơn thông dụng dễ trùng tên phim hoặc từ thông dụng tiếng Việt
const COMMON_AMBIGUOUS_SHORT_WORDS = new Set([
  "mai", "an", "anh", "em", "nam", "hoa", "tam", "binh", "long", "ha",
  "linh", "dung", "phuc", "dat", "duc", "thao", "trang", "huong", "ngoc",
  "minh", "khoa", "thang", "quan", "hung", "son", "tuan", "hai", "vu",
  "bao", "cuong", "phong", "hieu", "huy", "giang", "thanh", "thuy", "yen",
  "thu", "quyen", "tien", "trieu", "viet", "khanh", "kien", "phuong",
  "nga", "loan", "diep", "sen", "truc", "dao", "cuc", "nhi", "lan",
  "bac", "trung", "do", "den", "xanh", "vang", "nha", "pho",
  "me", "cha", "con", "vo", "chong", "ba", "ong", "co", "chu"
]);

/**
 * Kiểm tra xem từ khóa có phải là từ ngắn/từ đơn mơ hồ (dễ là tên phim) mà không có tiền tố diễn viên rõ ràng hay không.
 */
export function isAmbiguousShortActorKeyword(query: string): boolean {
  const trimmed = (query || "").trim();
  if (!trimmed) return true;
  // Nếu có tiền tố rõ ràng như "diễn viên Mai", "phim của Mai" -> không bị coi là ambiguous
  if (hasExplicitActorPrefix(trimmed)) return false;

  const cleanNorm = normalizeForMatch(trimmed).toLowerCase();
  if (COMMON_AMBIGUOUS_SHORT_WORDS.has(cleanNorm)) return true;

  // Từ đơn (chỉ có 1 từ) và độ dài <= 4 ký tự (ví dụ: Mai, An, Anh, Ha, Nam...)
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 && trimmed.length <= 4) return true;

  return false;
}

export function cleanActorQuery(query: string): string {
  return (query || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^phim\s+cua\s+/gi, "")
    .replace(/^tuyen\s+tap\s+(?:phim\s+)?(?:cua\s+)?/gi, "")
    .replace(/^dien\s+vien\s+/gi, "")
    .replace(/^dao\s+dien\s+/gi, "")
    .replace(/^actor\s*:\s*/gi, "")
    .replace(/\s+dong$/gi, "")
    .replace(/\s+dien\s+xuat$/gi, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 1. BẢNG QUY ĐỔI ĐỒNG NGHĨA (MAPPING TABLE / SYNONYM DICTIONARY)
 * Tra cứu mọi từ khóa (tiếng Việt có dấu, không dấu, tên tiếng Anh, nghệ danh, slug)
 * và trích xuất TOÀN BỘ các biến thể tên của diễn viên đó để thực hiện truy vấn đa biến thể.
 * Ví dụ: 'Thành Long' -> ['thành long', 'thanh long', 'jackie chan', 'chan kong sang', 'sing lung']
 */
export interface ActorSynonymResult {
  isMatched: boolean;
  slug: string;
  canonicalName: string;
  country?: string;
  variants: string[]; // Toàn bộ biến thể tên (Việt có dấu, không dấu, Anh/gốc, nghệ danh)
  englishName?: string;
}

export function getActorSynonyms(query: string): ActorSynonymResult {
  if (!query || query.trim().length < 2) {
    return { isMatched: false, slug: "", canonicalName: "", variants: [] };
  }

  const cleanRaw = query.trim().toLowerCase();
  const normalizedQuery = normalizeForMatch(query);
  const vowelNormQuery = normalizeVietnameseVowels(query);
  const cleanedActorQ = cleanActorQuery(query);
  const cleanedActorQVowel = normalizeVietnameseVowels(cleanedActorQ);

  // 1. Tra cứu trực tiếp trong ACTOR_CANONICAL_MAP (Bí danh -> Tên chuẩn duy nhất trong Database)
  let canonicalDirect =
    ACTOR_CANONICAL_MAP[cleanRaw] ||
    ACTOR_CANONICAL_MAP[normalizedQuery] ||
    ACTOR_CANONICAL_MAP[cleanedActorQ] ||
    ACTOR_CANONICAL_MAP[vowelNormQuery] ||
    ACTOR_CANONICAL_MAP[cleanedActorQVowel];

  if (!canonicalDirect) {
    for (const [key, target] of Object.entries(ACTOR_CANONICAL_MAP)) {
      if (normalizeVietnameseVowels(key) === vowelNormQuery || normalizeVietnameseVowels(key) === cleanedActorQVowel) {
        canonicalDirect = target;
        break;
      }
    }
  }

  if (canonicalDirect) {
    const linkedAliases = Object.entries(ACTOR_CANONICAL_MAP)
      .filter(([, target]) => target.toLowerCase() === canonicalDirect.toLowerCase())
      .map(([key]) => key);

    const preset = GOLDEN_ACTOR_INDEX.find(
      (p) =>
        normalizeForMatch(p.name) === normalizeForMatch(canonicalDirect) ||
        p.aliases.some((pa) => normalizeForMatch(pa) === normalizeForMatch(canonicalDirect))
    );

    const allVariants = Array.from(
      new Set([
        canonicalDirect,
        canonicalDirect.toLowerCase(),
        normalizeForMatch(canonicalDirect),
        cleanRaw,
        normalizedQuery,
        ...linkedAliases,
        ...(preset?.aliases || []),
        ...(preset?.name ? [preset.name] : []),
      ].filter(Boolean))
    );

    const englishName = allVariants.find(
      (a) => !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(a) && a.includes(" ")
    ) || canonicalDirect;

    const slug = normalizeForMatch(canonicalDirect).replace(/\s+/g, "-");

    return {
      isMatched: true,
      slug,
      canonicalName: canonicalDirect,
      country: preset?.country,
      variants: allVariants,
      englishName,
    };
  }

  // 2. Đối chiếu qua ACTOR_SLUG_MAP
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    const normSlug = normalizeForMatch(slug.replace(/-/g, " "));
    const vowelSlug = normalizeVietnameseVowels(slug.replace(/-/g, " "));
    const isSlugMatch =
      normalizedQuery === normSlug ||
      cleanRaw === slug ||
      vowelNormQuery === vowelSlug;
    const isAliasMatch = aliases.some((a) => {
      const normA = normalizeForMatch(a);
      const vowelA = normalizeVietnameseVowels(a);
      return (
        normA === normalizedQuery ||
        cleanRaw === a.toLowerCase() ||
        vowelA === vowelNormQuery ||
        vowelA === cleanedActorQVowel
      );
    });

    if (isSlugMatch || isAliasMatch) {
      const preset = GOLDEN_ACTOR_INDEX.find(
        (p) =>
          normalizeForMatch(p.name) === normalizedQuery ||
          p.aliases.some((pa) => normalizeForMatch(pa) === normalizedQuery) ||
          normalizeForMatch(p.name) === normSlug
      );

      const allVariants = Array.from(
        new Set([
          query.trim().toLowerCase(),
          normalizedQuery,
          slug.replace(/-/g, " "),
          ...aliases,
          ...(preset?.aliases || []),
          preset?.name?.toLowerCase(),
        ].filter((s): s is string => Boolean(s && s.trim().length >= 2)).map((s) => s.trim().toLowerCase()))
      );

      // Tìm tên tiếng Anh gốc (alias chữ Latinh không chứa dấu tiếng Việt và có dấu cách)
      const englishName = aliases.find(
        (a) => !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(a) && a.includes(" ")
      ) || aliases[2];

      const canonicalName = preset?.name || (aliases[0] ? toVietnameseTitleCase(aliases[0]) : toVietnameseTitleCase(query.trim()));

      return {
        isMatched: true,
        slug,
        canonicalName,
        country: preset?.country,
        variants: allVariants,
        englishName,
      };
    }
  }

  // 3. Đối chiếu qua GOLDEN_ACTOR_INDEX nếu chưa có trong ACTOR_SLUG_MAP
  for (const preset of GOLDEN_ACTOR_INDEX) {
    const normPName = normalizeForMatch(preset.name);
    const vowelPName = normalizeVietnameseVowels(preset.name);
    const isMatch =
      normPName === normalizedQuery ||
      vowelPName === vowelNormQuery ||
      preset.aliases.some((a) => {
        const normA = normalizeForMatch(a);
        const vowelA = normalizeVietnameseVowels(a);
        return (
          normA === normalizedQuery ||
          cleanRaw === a.toLowerCase() ||
          vowelA === vowelNormQuery ||
          vowelA === cleanedActorQVowel
        );
      });
    if (isMatch) {
      const allVariants = Array.from(
        new Set([
          query.trim().toLowerCase(),
          normalizedQuery,
          preset.name.toLowerCase(),
          ...preset.aliases.map((a) => a.toLowerCase()),
        ].filter(Boolean))
      );
      return {
        isMatched: true,
        slug: normalizeForMatch(preset.name).replace(/\s+/g, "-"),
        canonicalName: preset.name,
        country: preset.country,
        variants: allVariants,
      };
    }
  }

  return {
    isMatched: false,
    slug: "",
    canonicalName: query.trim(),
    variants: [query.trim().toLowerCase(), normalizedQuery].filter(Boolean),
  };
}
