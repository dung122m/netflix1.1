/**
 * Dynamic Taxonomy Service & Search Filter Tokenizer (Zero-AI, Zero-Hardcode)
 * - Tự động nạp danh mục thể loại và quốc gia động từ API PhimAPI/NguonC
 * - Cache 2 tầng: L1 In-Memory (24h) và L2 Upstash Redis (7 ngày)
 * - Bóc tách từ khóa tìm kiếm thành các bộ lọc: Năm, Loại phim, Thể loại, Quốc gia
 */

import { cacheService } from "@/lib/cache";
import { normalizeForMatch } from "@/lib/stringUtils";
import { DEFAULT_GENRES, DEFAULT_COUNTRIES } from "@/data/movies/taxonomy";

export interface TaxonomyItem {
  name: string;
  slug: string;
}

export interface DynamicTaxonomy {
  genres: TaxonomyItem[];
  countries: TaxonomyItem[];
  updatedAt: number;
}

export interface ParsedSearchIntent {
  hasFilter: boolean;
  filter: {
    category?: string;
    country?: string;
    year?: string;
    type?: string;
  };
  remainingQuery: string;
  detectedCategoryName?: string;
  detectedCountryName?: string;
  detectedTypeName?: string;
}

const TAXONOMY_CACHE_KEY = "taxonomy:dynamic:v2";
const TAXONOMY_REDIS_TTL = 7 * 86400; // 7 ngày
const TAXONOMY_MEMORY_TTL = 24 * 3600 * 1000; // 24 giờ

let memoryTaxonomyCache: { data: DynamicTaxonomy; expireAt: number } | null = null;
let inFlightTaxonomyPromise: Promise<DynamicTaxonomy> | null = null;

const API_PHIMAPI = (process.env.API_PHIMAPI || "https://phimapi.com").replace(/\/+$/, "");

/**
 * Lấy danh mục thể loại và quốc gia động từ API upstream (có cache L1 RAM + L2 Redis)
 * Đảm bảo Zero-Hardcode và thời gian phản hồi 0ms trên Vercel Serverless.
 */
export async function getDynamicTaxonomy(): Promise<DynamicTaxonomy> {
  const now = Date.now();
  if (memoryTaxonomyCache && memoryTaxonomyCache.expireAt > now) {
    return memoryTaxonomyCache.data;
  }

  if (inFlightTaxonomyPromise) {
    return await inFlightTaxonomyPromise;
  }

  inFlightTaxonomyPromise = (async () => {
    try {
      // 1. Kiểm tra L2 Redis Cache
      const cached = await cacheService.get<DynamicTaxonomy>(TAXONOMY_CACHE_KEY);
      if (cached && Array.isArray(cached.genres) && cached.genres.length > 0 && Array.isArray(cached.countries) && cached.countries.length > 0) {
        memoryTaxonomyCache = {
          data: cached,
          expireAt: now + TAXONOMY_MEMORY_TTL,
        };
        return cached;
      }

      // 2. Fetch song song từ upstream API với timeout an toàn 2500ms
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const [genresRes, countriesRes] = await Promise.allSettled([
        fetch(`${API_PHIMAPI}/the-loai`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          next: { revalidate: 86400 },
        }).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API_PHIMAPI}/quoc-gia`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          next: { revalidate: 86400 },
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

      clearTimeout(timeoutId);

      const rawGenres =
        genresRes.status === "fulfilled" && genresRes.value?.data?.items
          ? (genresRes.value.data.items as Array<{ name?: string; slug?: string }>)
          : [];

      const rawCountries =
        countriesRes.status === "fulfilled" && countriesRes.value?.data?.items
          ? (countriesRes.value.data.items as Array<{ name?: string; slug?: string }>)
          : [];

      const genres: TaxonomyItem[] = rawGenres
        .filter((g) => Boolean(g.name && g.slug))
        .map((g) => ({ name: String(g.name).trim(), slug: String(g.slug).trim() }));

      const countries: TaxonomyItem[] = rawCountries
        .filter((c) => Boolean(c.name && c.slug))
        .map((c) => ({ name: String(c.name).trim(), slug: String(c.slug).trim() }));

      // 3. Fallback an toàn nếu API ngoài trục trặc
      const finalGenres = genres.length > 0 ? genres : DEFAULT_GENRES;
      const finalCountries = countries.length > 0 ? countries : DEFAULT_COUNTRIES;

      // Đảm bảo thể loại "Hoạt Hình" luôn hiện diện trong bảng tra thể loại
      if (!finalGenres.some((g) => g.slug === "hoat-hinh")) {
        finalGenres.push({ name: "Hoạt Hình", slug: "hoat-hinh" });
      }

      const dynamicData: DynamicTaxonomy = {
        genres: finalGenres,
        countries: finalCountries,
        updatedAt: Date.now(),
      };

      // Lưu vào L1 RAM & L2 Redis
      memoryTaxonomyCache = {
        data: dynamicData,
        expireAt: Date.now() + TAXONOMY_MEMORY_TTL,
      };

      await cacheService.set(TAXONOMY_CACHE_KEY, dynamicData, TAXONOMY_REDIS_TTL).catch(() => {});

      return dynamicData;
    } catch {
      // Fallback không làm gãy luồng
      const fallbackData: DynamicTaxonomy = {
        genres: DEFAULT_GENRES,
        countries: DEFAULT_COUNTRIES,
        updatedAt: Date.now(),
      };
      return fallbackData;
    } finally {
      inFlightTaxonomyPromise = null;
    }
  })();

  return await inFlightTaxonomyPromise;
}

/**
 * Nhận diện loại phim cơ bản (phim chiếu rạp, hoạt hình, phim lẻ, phim bộ, tv-shows)
 */
const TYPE_INTENT_PATTERNS: Array<{
  type: string;
  label: string;
  regex: RegExp;
}> = [
  { type: "phim-chieu-rap", label: "Phim Chiếu Rạp", regex: /\b(phim\s+)?chieu\s+rap\b/i },
  { type: "hoat-hinh", label: "Hoạt Hình & Anime", regex: /\b(phim\s+)?(hoat\s+hinh|anime)\b/i },
  { type: "phim-bo", label: "Phim Bộ", regex: /\b(phim\s+bo|series|truyen\s+hinh\s+tap)\b/i },
  { type: "phim-le", label: "Phim Lẻ", regex: /\b(phim\s+le|dien\s+anh)\b/i },
  { type: "tv-shows", label: "TV Shows", regex: /\b(tv\s*shows?|show\s+truyen\s+hinh|game\s*show)\b/i },
];

/**
 * Tầng 1 — Smart Filter Tokenizer: Bóc tách bộ lọc động từ câu truy vấn
 * - Tách năm (4 chữ số từ 1950 đến năm hiện tại + 2)
 * - Tách loại phim (chiếu rạp, hoạt hình, phim bộ, phim lẻ, tv-shows)
 * - Tách thể loại (khớp động với dynamic genres)
 * - Tách quốc gia (khớp động với dynamic countries)
 * - Làm sạch các từ đệm vô nghĩa (phim, bộ phim, xem phim, full, vietsub...)
 */
export function parseSearchFilterIntent(
  rawQuery: string,
  taxonomy: DynamicTaxonomy
): ParsedSearchIntent {
  if (!rawQuery || typeof rawQuery !== "string") {
    return {
      hasFilter: false,
      filter: {},
      remainingQuery: "",
    };
  }

  let workingQuery = normalizeForMatch(rawQuery);
  if (!workingQuery) {
    return {
      hasFilter: false,
      filter: {},
      remainingQuery: "",
    };
  }

  const detectedFilter: ParsedSearchIntent["filter"] = {};
  let detectedCategoryName: string | undefined;
  let detectedCountryName: string | undefined;
  let detectedTypeName: string | undefined;

  // 1. BÓC TÁCH NĂM PHÁT HÀNH (4 chữ số 1950 - 2030)
  const currentYear = new Date().getFullYear();
  const yearMatch = workingQuery.match(/\b(19[5-9]\d|20[0-3]\d)\b/);
  if (yearMatch) {
    const matchedYear = parseInt(yearMatch[1], 10);
    if (matchedYear >= 1950 && matchedYear <= currentYear + 2) {
      detectedFilter.year = String(matchedYear);
      workingQuery = workingQuery.replace(new RegExp(`\\b${matchedYear}\\b`, "g"), " ").trim();
    }
  }

  // 2. BÓC TÁCH LOẠI PHIM (TYPE)
  for (const item of TYPE_INTENT_PATTERNS) {
    if (item.regex.test(workingQuery)) {
      detectedFilter.type = item.type;
      detectedTypeName = item.label;
      workingQuery = workingQuery.replace(item.regex, " ").trim();
      break;
    }
  }

  // 3. BÓC TÁCH THỂ LOẠI (GENRE - Khớp động từ dynamic taxonomy)
  // Sắp xếp các thể loại theo độ dài tên giảm dần để ưu tiên match cụm từ dài trước (tránh nuốt từ)
  const sortedGenres = [...(taxonomy.genres || [])].sort((a, b) => b.name.length - a.name.length);
  for (const genre of sortedGenres) {
    const normName = normalizeForMatch(genre.name);
    const normSlug = normalizeForMatch(genre.slug.replace(/-/g, " "));

    // Tạo regex tìm nguyên cụm từ độc lập
    const patterns = [normName, normSlug].filter(Boolean);
    let matched = false;

    for (const pat of patterns) {
      // Chỉ match khi từ khóa là cụm từ có nghĩa (độ dài >= 2)
      if (pat.length < 2) continue;
      const regex = new RegExp(`(^|\\s)${pat}(\\s|$)`, "i");
      if (regex.test(workingQuery)) {
        detectedFilter.category = genre.slug;
        detectedCategoryName = genre.name;
        workingQuery = workingQuery.replace(regex, " ").trim();
        matched = true;
        break;
      }
    }

    if (matched) break;
  }

  // 4. BÓC TÁCH QUỐC GIA (COUNTRY - Khớp động từ dynamic taxonomy)
  // Bảo vệ các từ quốc gia 1 âm tiết dễ trùng tên phim tiếng Việt ("Anh", "Mỹ", "Nga", "Đức", "Pháp", "Thái", "Ấn", "Ý")
  // Chỉ nhận diện làm bộ lọc quốc gia khi có ngữ cảnh lọc rõ ràng (có "phim"/"nước"/"quốc gia" hoặc đã có năm/loại/thể loại)
  const AMBIGUOUS_SINGLE_WORD_COUNTRIES = new Set([
    "anh",
    "my",
    "nga",
    "duc",
    "phap",
    "thai",
    "an",
    "y",
  ]);
  const hasFilterContextSoFar = Boolean(
    detectedFilter.year ||
    detectedFilter.type ||
    detectedFilter.category ||
    /\b(?:phim|nuoc|quoc gia|san xuat)\b/i.test(workingQuery)
  );

  // Sắp xếp các quốc gia theo độ dài tên giảm dần (ưu tiên "Hàn Quốc", "Trung Quốc", "Hồng Kông", "Đài Loan"...)
  const sortedCountries = [...(taxonomy.countries || [])].sort((a, b) => b.name.length - a.name.length);
  for (const country of sortedCountries) {
    const normName = normalizeForMatch(country.name);
    const normSlug = normalizeForMatch(country.slug.replace(/-/g, " "));

    const patterns = [normName, normSlug].filter(Boolean);
    // Bổ sung các biến thể phổ biến của quốc gia nếu có
    if (country.slug === "au-my") {
      patterns.push("my", "hoa ky", "us", "usa");
    } else if (country.slug === "han-quoc") {
      patterns.push("korea", "kr");
    } else if (country.slug === "trung-quoc") {
      patterns.push("china", "cn");
    } else if (country.slug === "nhat-ban") {
      patterns.push("japan", "jp");
    } else if (country.slug === "viet-nam") {
      patterns.push("vn", "vietnam");
    }

    let matched = false;
    for (const pat of patterns) {
      if (pat.length < 2) continue;
      if (AMBIGUOUS_SINGLE_WORD_COUNTRIES.has(pat) && !hasFilterContextSoFar) continue;
      const regex = new RegExp(`(^|\\s)${pat}(\\s|$)`, "i");
      if (regex.test(workingQuery)) {
        detectedFilter.country = country.slug;
        detectedCountryName = country.name;
        workingQuery = workingQuery.replace(regex, " ").trim();
        matched = true;
        break;
      }
    }

    if (matched) break;
  }

  const hasFilter = Boolean(
    detectedFilter.category ||
    detectedFilter.country ||
    detectedFilter.year ||
    detectedFilter.type
  );

  // 5. LÀM SẠCH TỪ ĐỆM VÔ NGHĨA (chỉ làm sạch khi thực sự tách được bộ lọc)
  if (hasFilter) {
    const fillerRegex = /\b(phim|bo phim|xem phim|xem|tap|tron bo|full hd|vietsub|thuyet minh|long tieng|moi nhat|hay nhat|hd)\b/gi;
    workingQuery = workingQuery.replace(fillerRegex, " ").replace(/\s+/g, " ").trim();
  }

  return {
    hasFilter,
    filter: detectedFilter,
    remainingQuery: workingQuery,
    detectedCategoryName,
    detectedCountryName,
    detectedTypeName,
  };
}
