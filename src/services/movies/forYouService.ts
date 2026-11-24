import { normalizeMovie, formatGenreName } from "@/lib/movieMedia";
import { movieApi } from "@/services/movies/service";
import { cacheService } from "@/lib/cache";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";

/**
 * For-You Personalized Recommendation Engine
 * - Xây dựng UserTasteProfile đa chiều (thể loại, quốc gia, loại phim, định dạng live-action/animation)
 * - Watch Depth & Recency Decay (khống chế click dở, ưu tiên phim xem sâu gần đây)
 * - L1 In-Memory RAM Cache (SWR 15 phút)
 * - Guest Theme Fallback cho người dùng mới
 */

// L1 In-Memory RAM Cache (15 phút để phản hồi tức thì 0ms, tiết kiệm 100% CPU)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FOR_YOU_L1_CACHE = new Map<string, { data: any; expireAt: number }>();
export const L1_TTL_MS = 15 * 60 * 1000;

// Bảng ánh xạ slug thể loại chuẩn của hệ thống
export const CATEGORY_MAP: Record<string, { slug: string; name: string }> = {
  "hanh-dong": { slug: "hanh-dong", name: "Hành Động" },
  "tinh-cam": { slug: "tinh-cam", name: "Tình Cảm" },
  "co-trang": { slug: "co-trang", name: "Cổ Trang" },
  "tam-ly": { slug: "tam-ly", name: "Tâm Lý" },
  "hai-huoc": { slug: "hai-huoc", name: "Hài Hước" },
  "hoat-hinh": { slug: "hoat-hinh", name: "Hoạt Hình" },
  "kinh-di": { slug: "kinh-di", name: "Kinh Dị" },
  "vien-tuong": { slug: "vien-tuong", name: "Viễn Tưởng" },
  "vo-thuat": { slug: "vo-thuat", name: "Võ Thuật" },
  "phieu-luu": { slug: "phieu-luu", name: "Phiêu Lưu" },
  "hinh-su": { slug: "hinh-su", name: "Hình Sự" },
  "chien-tranh": { slug: "chien-tranh", name: "Chiến Tranh" },
  "tai-lieu": { slug: "tai-lieu", name: "Tài Liệu" },
  "bi-an": { slug: "bi-an", name: "Bí Ẩn" },
  "hoc-duong": { slug: "hoc-duong", name: "Học Đường" },
  "gia-dinh": { slug: "gia-dinh", name: "Gia Đình" },
  "am-nhac": { slug: "am-nhac", name: "Âm Nhạc" },
  "the-thao": { slug: "the-thao", name: "Thể Thao" },
  "khoa-hoc": { slug: "khoa-hoc", name: "Khoa Học" },
  "than-thoai": { slug: "than-thoai", name: "Thần Thoại" },
};

// Bảng ánh xạ quốc gia chuẩn
export const COUNTRY_MAP: Record<string, { slug: string; name: string }> = {
  "han-quoc": { slug: "han-quoc", name: "Hàn Quốc" },
  "trung-quoc": { slug: "trung-quoc", name: "Trung Quốc" },
  "au-my": { slug: "au-my", name: "Âu Mỹ" },
  "nhat-ban": { slug: "nhat-ban", name: "Nhật Bản" },
  "viet-nam": { slug: "viet-nam", name: "Việt Nam" },
  "thai-lan": { slug: "thai-lan", name: "Thái Lan" },
  "hong-kong": { slug: "hong-kong", name: "Hồng Kông" },
  "dai-loan": { slug: "dai-loan", name: "Đài Loan" },
  "an-do": { slug: "an-do", name: "Ấn Độ" },
  "anh": { slug: "anh", name: "Anh" },
  "phap": { slug: "phap", name: "Pháp" },
};

// Bảng ánh xạ loại phim chuẩn
export const TYPE_MAP: Record<string, { slug: string; name: string }> = {
  "phim-le": { slug: "phim-le", name: "Phim Lẻ" },
  "phim-bo": { slug: "phim-bo", name: "Phim Bộ" },
  "hoat-hinh": { slug: "hoat-hinh", name: "Hoạt Hình" },
  "tv-shows": { slug: "tv-shows", name: "TV Shows" },
};

export interface WatchHistoryInputItem {
  slug?: string;
  title?: string;
  category?: unknown;
  categories?: unknown;
  country?: string;
  type?: string;
  type_name?: string;
  episodeName?: string;
  episodeSlug?: string;
  progressSeconds?: number;
  durationSeconds?: number;
  updatedAt?: number;
  raw?: unknown;
  [key: string]: unknown;
}

export type MovieFormat = "live_action" | "animation" | "unknown";
export type FormatPreference = "live_action_preferred" | "animation_preferred" | "mixed";

export interface ScoredEntity {
  slug: string;
  name: string;
  score: number;
}

export interface UserTasteProfile {
  genres: ScoredEntity[];
  countries: ScoredEntity[];
  types: ScoredEntity[];
  formatPreference: FormatPreference;
  liveActionScore: number;
  animationScore: number;
  historySlugs: Set<string>;
  isGuest: boolean;
}

// Hàm làm sạch chuỗi và chuẩn hoá tiếng Việt không dấu
export function cleanText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

// Bóc tách danh sách thể loại từ chuỗi bất kỳ (category, title, slug)
export function extractGenresFromText(text: string): Array<{ slug: string; name: string }> {
  if (!text) return [];
  const clean = cleanText(text);
  const found: Array<{ slug: string; name: string }> = [];
  const seen = new Set<string>();

  const add = (slug: string) => {
    if (CATEGORY_MAP[slug] && !seen.has(slug)) {
      seen.add(slug);
      found.push(CATEGORY_MAP[slug]);
    }
  };

  if (clean.includes("hoat hinh") || clean.includes("anime") || clean.includes("manga")) add("hoat-hinh");
  if (clean.includes("hanh dong") || clean.includes("action")) add("hanh-dong");
  if (clean.includes("tinh cam") || clean.includes("lang man") || clean.includes("romance")) add("tinh-cam");
  if (clean.includes("co trang") || clean.includes("kiem hiep")) add("co-trang");
  if (clean.includes("tam ly") || clean.includes("drama")) add("tam-ly");
  if (clean.includes("hai huoc") || clean.includes("comedy")) add("hai-huoc");
  if (clean.includes("kinh di") || clean.includes("horror") || clean.includes("ma")) add("kinh-di");
  if (clean.includes("vien tuong") || clean.includes("sci-fi") || clean.includes("khoa hoc vien tuong")) add("vien-tuong");
  if (clean.includes("vo thuat") || clean.includes("kungfu") || clean.includes("martial arts")) add("vo-thuat");
  if (clean.includes("phieu luu") || clean.includes("adventure")) add("phieu-luu");
  if (clean.includes("hinh su") || clean.includes("crime") || clean.includes("trinh tham")) add("hinh-su");
  if (clean.includes("chien tranh") || clean.includes("war")) add("chien-tranh");
  if (clean.includes("tai lieu") || clean.includes("documentary")) add("tai-lieu");
  if (clean.includes("bi an") || clean.includes("mystery")) add("bi-an");
  if (clean.includes("hoc duong") || clean.includes("school")) add("hoc-duong");
  if (clean.includes("gia dinh") || clean.includes("family")) add("gia-dinh");
  if (clean.includes("am nhac") || clean.includes("music")) add("am-nhac");
  if (clean.includes("the thao") || clean.includes("sport")) add("the-thao");
  if (clean.includes("khoa hoc") || clean.includes("science")) add("khoa-hoc");
  if (clean.includes("than thoai") || clean.includes("mythology")) add("than-thoai");

  return found;
}

// Bóc tách danh sách quốc gia từ chuỗi
export function extractCountriesFromText(text: string): Array<{ slug: string; name: string }> {
  if (!text) return [];
  const clean = cleanText(text);
  const found: Array<{ slug: string; name: string }> = [];
  const seen = new Set<string>();

  const add = (slug: string) => {
    if (COUNTRY_MAP[slug] && !seen.has(slug)) {
      seen.add(slug);
      found.push(COUNTRY_MAP[slug]);
    }
  };

  if (clean.includes("han quoc") || clean.includes("korea")) add("han-quoc");
  if (clean.includes("trung quoc") || clean.includes("china")) add("trung-quoc");
  if (clean.includes("au my") || clean.includes("my") || clean.includes("us") || clean.includes("usa") || clean.includes("hollywood")) add("au-my");
  if (clean.includes("nhat ban") || clean.includes("japan")) add("nhat-ban");
  if (clean.includes("viet nam") || clean.includes("vietnam")) add("viet-nam");
  if (clean.includes("thai lan") || clean.includes("thailand")) add("thai-lan");
  if (clean.includes("hong kong") || clean.includes("hongkong")) add("hong-kong");
  if (clean.includes("dai loan") || clean.includes("taiwan")) add("dai-loan");
  if (clean.includes("an do") || clean.includes("india")) add("an-do");
  if (clean.includes("anh") || clean.includes("uk") || clean.includes("british")) add("anh");
  if (clean.includes("phap") || clean.includes("france")) add("phap");

  return found;
}

// Bóc tách loại phim từ chuỗi
export function extractTypeFromText(text: string): { slug: string; name: string } | null {
  if (!text) return null;
  const clean = cleanText(text);
  if (clean.includes("hoat hinh") || clean.includes("anime")) return TYPE_MAP["hoat-hinh"];
  if (clean.includes("phim bo") || clean.includes("series") || clean.includes("tap ")) return TYPE_MAP["phim-bo"];
  if (clean.includes("phim le") || clean.includes("movie") || clean.includes("chieu rap")) return TYPE_MAP["phim-le"];
  if (clean.includes("tv show") || clean.includes("tvshow") || clean.includes("truyen hinh")) return TYPE_MAP["tv-shows"];
  return null;
}

// Nhận diện định dạng format (Live-Action vs Animation) của 1 mục lịch sử xem
export function detectMovieFormat(item: WatchHistoryInputItem): MovieFormat {
  const catText = cleanText(
    typeof item.category === "string"
      ? item.category
      : Array.isArray(item.category)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (item.category as any[]).map((c) => c?.name || c?.slug || "").join(" ")
        : Array.isArray(item.categories)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (item.categories as any[]).map((c) => c?.name || c?.slug || "").join(" ")
          : ""
  );
  const titleText = cleanText(item.title || "");
  const slugText = cleanText(item.slug || "");
  const typeText = cleanText(item.type || item.type_name || "");

  // 1. Dấu hiệu chắc chắn của Hoạt hình / Anime
  if (
    typeText.includes("hoat-hinh") ||
    typeText.includes("hoathinh") ||
    catText.includes("hoat hinh") ||
    catText.includes("anime") ||
    titleText.includes("anime") ||
    slugText.includes("anime") ||
    slugText.includes("hoat-hinh")
  ) {
    return "animation";
  }

  const durationSec = typeof item.durationSeconds === "number" ? item.durationSeconds : 0;
  if (durationSec >= 1800 || item.episodeName || item.episodeSlug) {
    return "live_action";
  }

  if (
    catText.includes("chinh kich") ||
    catText.includes("tam ly") ||
    catText.includes("hinh su") ||
    catText.includes("vo thuat") ||
    catText.includes("co trang") ||
    catText.includes("chien tranh") ||
    catText.includes("tai lieu")
  ) {
    return "live_action";
  }

  return "unknown";
}

// Xây dựng UserTasteProfile đa chiều từ lịch sử xem và sở thích thể loại
export function buildUserTasteProfile(
  historyItems: WatchHistoryInputItem[],
  favoriteGenres: string[] = [],
  watchedSlugs: string[] = []
): UserTasteProfile {
  const genreScoreMap = new Map<string, { name: string; score: number }>();
  const countryScoreMap = new Map<string, { name: string; score: number }>();
  const typeScoreMap = new Map<string, { name: string; score: number }>();

  const historySlugsSet = new Set<string>();

  let liveActionScore = 0;
  let animationScore = 0;

  // 1. Phân tích từng mục lịch sử xem (có tính Watch Depth & Recency Decay)
  const now = Date.now();
  for (const item of historyItems) {
    if (item.slug) {
      historySlugsSet.add(item.slug.toLowerCase().trim());
    }

    // TÍNH WATCH DEPTH (Khống chế chặt các lượt click xem dở vài giây)
    let engagementWeight = 1.0;
    if (item.durationSeconds && item.durationSeconds > 0 && item.progressSeconds !== undefined) {
      const ratio = item.progressSeconds / item.durationSeconds;
      if (ratio >= 0.8) {
        engagementWeight = 2.0;
      } else if (ratio >= 0.5) {
        engagementWeight = 1.25;
      } else if (ratio >= 0.1) {
        engagementWeight = 1.0;
      } else {
        engagementWeight = 0.25;
      }
    } else if (item.progressSeconds !== undefined) {
      if (item.progressSeconds >= 3600) engagementWeight = 2.0;
      else if (item.progressSeconds >= 1800) engagementWeight = 1.25;
      else if (item.progressSeconds >= 300) engagementWeight = 1.0;
      else engagementWeight = 0.25;
    }

    // TÍNH RECENCY DECAY
    const daysSinceWatch = Math.max(
      0,
      (now - (item.updatedAt || now)) / (1000 * 60 * 60 * 24)
    );
    const recentWeight = 1 / (1 + daysSinceWatch * 0.15);

    const finalItemWeight = engagementWeight * recentWeight;

    // TÍNH FORMAT TỪ LỊCH SỬ XEM
    const itemFormat = detectMovieFormat(item);
    if (itemFormat === "live_action") {
      liveActionScore += finalItemWeight;
    } else if (itemFormat === "animation") {
      animationScore += finalItemWeight;
    }

    // Trích xuất tín hiệu thể loại
    const combinedText = `${item.category || ""} ${item.title || ""} ${item.slug || ""}`;
    const detectedGenres = extractGenresFromText(combinedText);
    for (const g of detectedGenres) {
      const cur = genreScoreMap.get(g.slug) || { name: g.name, score: 0 };
      cur.score += finalItemWeight * 1.5;
      genreScoreMap.set(g.slug, cur);
    }

    // Trích xuất tín hiệu quốc gia
    const detectedCountries: Array<{ slug: string; name: string }> = [];
    if (item.country) {
      const fromMeta = extractCountriesFromText(item.country);
      for (const c of fromMeta) {
        if (!detectedCountries.some((existing) => existing.slug === c.slug)) {
          detectedCountries.push(c);
        }
      }
    }
    const fromText = extractCountriesFromText(combinedText);
    for (const c of fromText) {
      if (!detectedCountries.some((existing) => existing.slug === c.slug)) {
        detectedCountries.push(c);
      }
    }
    for (const c of detectedCountries) {
      const cur = countryScoreMap.get(c.slug) || { name: c.name, score: 0 };
      cur.score += finalItemWeight * 1.2;
      countryScoreMap.set(c.slug, cur);
    }

    // Trích xuất tín hiệu loại phim
    const typeSource = `${item.type || ""} ${item.episodeName || ""} ${item.episodeSlug || ""} ${combinedText}`;
    const detectedType = extractTypeFromText(typeSource);
    if (detectedType) {
      const cur = typeScoreMap.get(detectedType.slug) || { name: detectedType.name, score: 0 };
      cur.score += finalItemWeight * 1.0;
      typeScoreMap.set(detectedType.slug, cur);
    }
  }

  // Bổ sung các slug từ watchedSlugs nếu chưa có
  for (const s of watchedSlugs) {
    if (s) historySlugsSet.add(s.toLowerCase().trim());
  }

  // 2. Bổ sung các thể loại yêu thích đã chọn trong Profile người dùng
  for (const fav of favoriteGenres) {
    const extracted = extractGenresFromText(fav);
    for (const g of extracted) {
      const cur = genreScoreMap.get(g.slug) || { name: g.name, score: 0 };
      cur.score += 2.0;
      genreScoreMap.set(g.slug, cur);
    }
  }

  // 3. Chuẩn hoá điểm số và trích xuất TOP sở thích
  const normalizeList = (map: Map<string, { name: string; score: number }>, topN: number): ScoredEntity[] => {
    const arr = Array.from(map.entries()).map(([slug, val]) => ({
      slug,
      name: val.name,
      score: val.score,
    }));
    arr.sort((a, b) => b.score - a.score);
    if (arr.length === 0) return [];
    const maxScore = arr[0].score || 1;
    return arr.slice(0, topN).map((item) => ({
      ...item,
      score: Math.round((item.score / maxScore) * 100) / 100,
    }));
  };

  const topGenres = normalizeList(genreScoreMap, 3);
  const topCountries = normalizeList(countryScoreMap, 2);
  const topTypes = normalizeList(typeScoreMap, 2);

  // 4. XÁC ĐỊNH FORMAT PREFERENCE CỦA NGƯỜI DÙNG
  const totalFormatWeight = liveActionScore + animationScore;
  let formatPreference: FormatPreference = "mixed";
  if (totalFormatWeight >= 0.5) {
    const animationRatio = animationScore / totalFormatWeight;
    if (animationRatio < 0.25) {
      formatPreference = "live_action_preferred";
    } else if (animationRatio >= 0.45) {
      formatPreference = "animation_preferred";
    } else {
      formatPreference = "mixed";
    }
  }

  const isGuest = topGenres.length === 0 && historySlugsSet.size === 0;

  return {
    genres: topGenres,
    countries: topCountries,
    types: topTypes,
    formatPreference,
    liveActionScore: Math.round(liveActionScore * 100) / 100,
    animationScore: Math.round(animationScore * 100) / 100,
    historySlugs: historySlugsSet,
    isGuest,
  };
}

// Danh sách hạt giống siêu phẩm cho người dùng mới
export const GUEST_THEMES = [
  {
    genres: ["hanh-dong", "vo-thuat"],
    country: "au-my",
    name: "Siêu Phẩm Chiếu Rạp & Hành Động Kịch Tính",
  },
  {
    genres: ["vien-tuong", "bi-an"],
    country: "au-my",
    name: "Khoa Học Viễn Tưởng & Bí Ẩn Kinh Điển",
  },
  {
    genres: ["tinh-cam", "tam-ly"],
    country: "han-quoc",
    name: "Tình Cảm Lãng Mạn & Tâm Lý Sâu Sắc",
  },
  {
    genres: ["hoat-hinh", "hai-huoc"],
    country: "nhat-ban",
    name: "Hoạt Hình, Anime & Giải Trí Đỉnh Cao",
  },
  {
    genres: ["hinh-su", "tam-ly"],
    country: "han-quoc",
    name: "Trinh Thám Hình Sự & Phá Án Ly Kỳ",
  },
];

export interface RecommendationInput {
  genres?: string[];
  historyItems?: WatchHistoryInputItem[];
  watchedSlugs?: string[];
  refreshSeed?: number;
  currentSlugs?: string[];
}

export interface RecommendationResult {
  success: boolean;
  context: string;
  items: unknown[];
  cached?: boolean;
}

export async function generateForYouRecommendations(
  input: RecommendationInput
): Promise<RecommendationResult> {
  try {
    const {
      genres = [],
      historyItems = [],
      watchedSlugs = [],
      refreshSeed = 0,
      currentSlugs = [],
    } = input || {};

    const seed = Number(refreshSeed) || 0;
    const isRefresh = seed > 0;

    // 1. TẠO USER TASTE PROFILE ĐA CHIỀU (Tích hợp lịch sử + Profile)
    const profile = buildUserTasteProfile(historyItems, genres, watchedSlugs);

    // BẮT BUỘC 100%: Phim đã có trong lịch sử xem không bao giờ gợi ý lại
    const watchedHistorySet = new Set<string>(profile.historySlugs);

    // Phim đang hiển thị trên màn hình: CHỈ loại bỏ khi người dùng chủ động bấm 'Đổi gợi ý' (seed > 0)
    // Khi tải trang / reload (seed === 0), tuyệt đối KHÔNG loại bỏ để luôn hiển thị danh sách đầy đủ, tối ưu nhất
    const currentOnScreenSet = new Set<string>(
      isRefresh ? ((currentSlugs as string[]) || []).map((s: string) => s.toLowerCase().trim()) : []
    );

    let tasteHash: string;
    if (profile.isGuest) {
      tasteHash = `guest-${seed % GUEST_THEMES.length}`;
    } else {
      const gPart = profile.genres.map((g) => g.slug).join(",");
      const cPart = profile.countries.map((c) => c.slug).join(",");
      const tPart = profile.types.map((t) => t.slug).join(",");
      tasteHash = `g:${gPart}|c:${cPart}|t:${tPart}|f:${profile.formatPreference}`;
    }

    const pageOffset = (seed % 4) + 1;
    const kvForYouKey = `foryou:taste:v9:${tasteHash}:p${pageOffset}`;

    // 0. Thử lấy từ L1 In-Memory RAM Cache (0ms, 0 Redis calls, 0 CPU)
    const l1Cached = FOR_YOU_L1_CACHE.get(kvForYouKey);
    if (l1Cached && l1Cached.expireAt > Date.now()) {
      return l1Cached.data as RecommendationResult;
    }

    // 1. Thử lấy từ L2 Redis Cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedPool = await cacheService.get<{ context: string; movies: any[] }>(kvForYouKey);
    if (cachedPool && Array.isArray(cachedPool.movies) && cachedPool.movies.length >= 14) {
      const filtered = cachedPool.movies.filter(
        (m) =>
          m &&
          m.slug &&
          !watchedHistorySet.has(m.slug.toLowerCase().trim()) &&
          (!isRefresh || !currentOnScreenSet.has(m.slug.toLowerCase().trim()))
      );
      // Chỉ dùng cache nếu còn đủ số lượng phong phú (>= 14 phim)
      if (filtered.length >= 14) {
        const payload = {
          success: true,
          context: cachedPool.context,
          items: filtered.slice(0, 36),
          cached: true,
        };
        FOR_YOU_L1_CACHE.set(kvForYouKey, { data: payload, expireAt: Date.now() + L1_TTL_MS });
        return payload;
      }
    }

    // 3. MULTI-SIGNAL CANDIDATE RETRIEVAL (2-3 TRUY VẤN SONG SONG TỪ CATALOG)
    const topGenre = profile.genres[0];
    const secondGenre = profile.genres[1];
    const thirdGenre = profile.genres[2];
    const topCountry = profile.countries[0];
    const prefType = profile.types[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryPromises: Promise<any>[] = [];

    if (!profile.isGuest && topGenre) {
      // Query 1: Top Genre theo lượt xem cao nhất
      queryPromises.push(
        movieApi.getMovies({
          category: topGenre.slug,
          limit: 24,
          page: pageOffset,
          sort: "views",
          posterEnrichmentBudgetMs: 0,
        })
      );

      // Query 2: Thể loại thứ hai HOẶC Quốc gia yêu thích
      if (secondGenre) {
        queryPromises.push(
          movieApi.getMovies({
            category: secondGenre.slug,
            limit: 24,
            page: pageOffset,
            sort: "views",
            posterEnrichmentBudgetMs: 0,
          })
        );
      } else if (topCountry) {
        queryPromises.push(
          movieApi.getMovies({
            country: topCountry.slug,
            limit: 24,
            page: pageOffset,
            sort: "views",
            posterEnrichmentBudgetMs: 0,
          })
        );
      } else {
        queryPromises.push(
          movieApi.getMovies({
            category: topGenre.slug,
            limit: 24,
            page: pageOffset + 1,
            sort: "rating",
            posterEnrichmentBudgetMs: 0,
          })
        );
      }

      // Query 3: Thể loại thứ ba HOẶC Định dạng yêu thích (phim lẻ / phim bộ) HOẶC Phim mới phát hành
      if (thirdGenre) {
        queryPromises.push(
          movieApi.getMovies({
            category: thirdGenre.slug,
            limit: 20,
            page: (seed % 2) + 1,
            sort: "views",
            posterEnrichmentBudgetMs: 0,
          })
        );
      } else if (prefType) {
        queryPromises.push(
          movieApi.getMovies({
            type: prefType.slug,
            limit: 20,
            page: (seed % 3) + 1,
            sort: "latest",
            posterEnrichmentBudgetMs: 0,
          })
        );
      } else {
        queryPromises.push(
          movieApi.getMovies({
            limit: 20,
            page: (seed % 3) + 1,
            sort: "views",
            posterEnrichmentBudgetMs: 0,
          })
        );
      }
    } else {
      // Người dùng mới / Guest: Lấy theo bộ chủ đề chất lượng xoay vòng theo seed
      const guestTheme = GUEST_THEMES[seed % GUEST_THEMES.length];
      queryPromises.push(
        movieApi.getMovies({
          category: guestTheme.genres[0],
          limit: 24,
          page: pageOffset,
          sort: "views",
          posterEnrichmentBudgetMs: 0,
        })
      );
      queryPromises.push(
        movieApi.getMovies({
          category: guestTheme.genres[1] || "hanh-dong",
          limit: 24,
          page: pageOffset,
          sort: "rating",
          posterEnrichmentBudgetMs: 0,
        })
      );
      queryPromises.push(
        movieApi.getMovies({
          country: guestTheme.country,
          limit: 20,
          page: (seed % 2) + 1,
          sort: "views",
          posterEnrichmentBudgetMs: 0,
        })
      );
    }

    // Thực thi song song và chống sập nếu 1 query lỗi
    const settledResults = await Promise.allSettled(queryPromises);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidateRawPool: any[] = [];
    for (const res of settledResults) {
      if (res.status === "fulfilled" && res.value?.items && Array.isArray(res.value.items)) {
        candidateRawPool.push(...res.value.items);
      }
    }

    // 4. LỌC PHIM ĐÃ XEM VÀ KHỬ TRÙNG LẶP
    const seenSlugs = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidateNormalized: any[] = [];

    for (const raw of candidateRawPool) {
      const norm = normalizeMovie(raw);
      if (!norm.slug) continue;
      const cleanSlug = norm.slug.toLowerCase().trim();

      // BẮT BUỘC 100%: Loại bỏ triệt để phim đã có trong lịch sử xem của người dùng
      if (watchedHistorySet.has(cleanSlug) || seenSlugs.has(cleanSlug)) {
        continue;
      }
      // Khi người dùng chủ động nhấn 'Đổi gợi ý' (isRefresh), ưu tiên phim mới chưa có trên màn hình
      if (isRefresh && currentOnScreenSet.has(cleanSlug)) {
        continue;
      }
      seenSlugs.add(cleanSlug);
      candidateNormalized.push(norm);
    }

    // 5. CHẤM ĐIỂM CÁ NHÂN HOÁ (RULE-BASED DETERMINISTIC SCORING)
    const scoredCandidates = candidateNormalized.map((norm) => {
      let score = 0;
      const matchedAspects: string[] = [];

      // Bóc tách toàn bộ thể loại của phim từ categories, raw category, genre, title, slug
      const rawCatNames = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(norm.categories?.map((c: any) => c.name) || []),
        ...(Array.isArray(norm.raw?.category)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? norm.raw.category.map((c: any) => (typeof c === "string" ? c : c?.name || ""))
          : []),
        norm.genre || "",
      ].filter(Boolean);

      const candidateGenreSlugs = new Set<string>();
      for (const catName of rawCatNames) {
        const extracted = extractGenresFromText(catName);
        for (const g of extracted) {
          candidateGenreSlugs.add(g.slug);
        }
      }
      const titleExtracted = extractGenresFromText(`${norm.title} ${norm.slug}`);
      for (const g of titleExtracted) {
        candidateGenreSlugs.add(g.slug);
      }

      // 1. GENRE MATCHING (Không double-count, chỉ lấy mức cao nhất + multi-genre bonus nhỏ)
      let genreScore = 0;
      let matchedTopGenre = false;
      let matchedSecondGenre = false;
      let matchedThirdGenre = false;

      if (topGenre && candidateGenreSlugs.has(topGenre.slug)) {
        genreScore = 50;
        matchedTopGenre = true;
        matchedAspects.push(topGenre.name);
      } else if (secondGenre && candidateGenreSlugs.has(secondGenre.slug)) {
        genreScore = 20;
        matchedSecondGenre = true;
        matchedAspects.push(secondGenre.name);
      } else if (thirdGenre && candidateGenreSlugs.has(thirdGenre.slug)) {
        genreScore = 10;
        matchedThirdGenre = true;
        matchedAspects.push(thirdGenre.name);
      }

      // Multi-genre intersection bonus: Tối đa +5 nếu vừa match Top 1 vừa match thêm Top 2 hoặc Top 3
      if (
        matchedTopGenre &&
        ((secondGenre && candidateGenreSlugs.has(secondGenre.slug)) ||
          (thirdGenre && candidateGenreSlugs.has(thirdGenre.slug)))
      ) {
        genreScore += 5;
      }
      score += genreScore;

      // 2. COUNTRY MATCHING (Top: +20, Second: +10)
      let countryScore = 0;
      const rawCountryNames = [
        norm.country || "",
        ...(Array.isArray(norm.raw?.country)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? norm.raw.country.map((c: any) => (typeof c === "string" ? c : c?.name || ""))
          : []),
      ].filter(Boolean);

      const candidateCountrySlugs = new Set<string>();
      for (const cName of rawCountryNames) {
        const extracted = extractCountriesFromText(cName);
        for (const c of extracted) {
          candidateCountrySlugs.add(c.slug);
        }
      }

      let matchedCountryName = "";
      if (topCountry && candidateCountrySlugs.has(topCountry.slug)) {
        countryScore = 20;
        matchedCountryName = topCountry.name;
        matchedAspects.push(`phim ${topCountry.name}`);
      } else if (profile.countries[1] && candidateCountrySlugs.has(profile.countries[1].slug)) {
        countryScore = 10;
        matchedCountryName = profile.countries[1].name;
      }
      score += countryScore;

      // 3. PREFERRED TYPE (Phim bộ / Phim lẻ: +10)
      let typeScore = 0;
      let matchedTypeName = "";
      if (prefType) {
        const isPhimBo =
          norm.type_name === "Phim bộ" || (norm.time && String(norm.time).toLowerCase().includes("tập"));
        const isPhimLe = norm.type_name === "Phim lẻ" || norm.type_name === "Phim rạp";
        const isHoatHinh = norm.type_name === "Hoạt hình" || candidateGenreSlugs.has("hoat-hinh");

        const typeMatched =
          (prefType.slug === "phim-bo" && isPhimBo) ||
          (prefType.slug === "phim-le" && isPhimLe) ||
          (prefType.slug === "hoat-hinh" && isHoatHinh) ||
          (prefType.slug === "tv-shows" && norm.type_name === "TV Shows");

        if (typeMatched) {
          typeScore = 10;
          matchedTypeName = prefType.name;
          matchedAspects.push(prefType.name);
        }
      }
      score += typeScore;

      // 4. RATING (0..8 điểm, clamp, 0 nếu không có rating)
      let ratingScore = 0;
      const numScore = Number(norm.score);
      if (!isNaN(numScore) && numScore > 0) {
        ratingScore = Math.min(8, Math.max(0, Math.round(numScore * 0.8 * 10) / 10));
      }
      score += ratingScore;

      // 5. RECENCY (2026: +5, 2025: +4, 2024: +3, 2023: +1, older: 0)
      let recencyScore = 0;
      const yr = Number(norm.year);
      if (!isNaN(yr) && yr > 0) {
        if (yr >= 2026) recencyScore = 5;
        else if (yr === 2025) recencyScore = 4;
        else if (yr === 2024) recencyScore = 3;
        else if (yr === 2023) recencyScore = 1;
      }
      score += recencyScore;

      // 6. FORMAT ADJUSTMENT (-25 -> +15)
      const candidateFormat = detectMovieFormat({
        type: norm.raw?.type || norm.type,
        type_name: norm.type_name,
        category: norm.raw?.category,
        categories: norm.categories,
        title: norm.title,
        slug: norm.slug,
        raw: norm.raw,
      });

      let formatAdjustment = 0;
      if (profile.formatPreference === "live_action_preferred") {
        if (candidateFormat === "animation") {
          formatAdjustment = -25;
        } else if (candidateFormat === "live_action") {
          formatAdjustment = 5;
        }
      } else if (profile.formatPreference === "animation_preferred") {
        if (candidateFormat === "animation") {
          formatAdjustment = 15;
        } else if (candidateFormat === "live_action") {
          formatAdjustment = -5;
        }
      }
      score += formatAdjustment;

      // 7. MATCH PERCENTAGE PHẢN ÁNH ĐIỂM TỔNG & FORMAT: clamp(round(70 + (score / 100) * 28), 72, 98)
      const matchPercentage = Math.min(
        98,
        Math.max(72, Math.round(70 + (Math.max(0, score) / 100) * 28))
      );

      // 8. TẠO MATCH REASON CHÂN THỰC
      let matchReason = "Siêu phẩm thịnh hành được đánh giá cao";
      if (!profile.isGuest) {
        if (profile.formatPreference === "live_action_preferred" && candidateFormat === "live_action") {
          if (matchedTopGenre && matchedCountryName) {
            matchReason = `Phù hợp với gu ${topGenre.name}, phim ${matchedCountryName} và ưu tiên phim người đóng của bạn`;
          } else if (matchedTopGenre) {
            matchReason = `Khớp gu ${topGenre.name} và ưu tiên phim người đóng của bạn`;
          } else if (matchedSecondGenre) {
            matchReason = `Phim người đóng thể loại ${secondGenre.name} phù hợp với bạn`;
          } else if (matchedCountryName) {
            matchReason = `Phim ${matchedCountryName} người đóng thịnh hành dành cho bạn`;
          } else {
            matchReason = "Phim người đóng thịnh hành phù hợp với bạn";
          }
        } else if (candidateFormat === "animation") {
          if (profile.formatPreference === "animation_preferred") {
            if (matchedTopGenre) {
              matchReason = `Hoạt hình/Anime thể loại ${topGenre.name} chuẩn gu của bạn`;
            } else {
              matchReason = "Khớp dòng hoạt hình/anime bạn yêu thích";
            }
          } else if (profile.formatPreference === "live_action_preferred") {
            if (matchedTopGenre) {
              matchReason = `Tác phẩm hoạt hình thể loại ${topGenre.name} có thể bạn muốn đổi gió`;
            } else {
              matchReason = "Tác phẩm hoạt hình thịnh hành";
            }
          } else {
            if (matchedTopGenre) {
              matchReason = `Hoạt hình/Anime ${topGenre.name} dựa trên lịch sử xem của bạn`;
            } else {
              matchReason = "Khớp dòng hoạt hình/anime bạn từng xem";
            }
          }
        } else {
          if (matchedTopGenre && matchedCountryName && matchedTypeName) {
            matchReason = `Phù hợp với gu ${topGenre.name}, phim ${matchedCountryName} và ${matchedTypeName} của bạn`;
          } else if (matchedTopGenre && matchedCountryName) {
            matchReason = `Phù hợp với gu phim ${matchedCountryName} và ${topGenre.name} của bạn`;
          } else if (matchedTopGenre && (matchedSecondGenre || matchedThirdGenre)) {
            const secondName = matchedSecondGenre ? secondGenre?.name : thirdGenre?.name;
            matchReason = `Kết hợp giữa ${topGenre.name} & ${secondName} đúng sở thích`;
          } else if (matchedTopGenre) {
            matchReason = `Cùng thể loại ${topGenre.name} mà bạn thường xem`;
          } else if (matchedSecondGenre && matchedCountryName) {
            matchReason = `Mang màu sắc ${matchedCountryName} và thể loại ${secondGenre?.name} mà bạn cũng hay xem`;
          } else if (matchedSecondGenre) {
            matchReason = `Thuộc thể loại ${secondGenre?.name} mà bạn thỉnh thoảng xem`;
          } else if (matchedThirdGenre) {
            matchReason = `Thuộc thể loại ${thirdGenre?.name} trong sở thích của bạn`;
          } else if (matchedCountryName) {
            matchReason = `Tác phẩm phim ${matchedCountryName} nổi bật được quan tâm gần đây`;
          } else {
            matchReason = "Bộ phim thịnh hành có thể bạn sẽ quan tâm";
          }
        }
      }

      // 9. GENRE HIỂN THỊ TRÊN CARD
      let displayGenreName = formatGenreName(norm.genre) || norm.type_name || "Đề Xuất";
      if (candidateFormat === "animation") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasHoatHinhCat = norm.categories?.some((c: any) =>
          c.name?.toLowerCase().includes("hoạt hình")
        );
        if (hasHoatHinhCat || norm.type_name === "Hoạt hình") {
          displayGenreName = "Hoạt Hình";
        }
      }

      return {
        norm,
        score,
        genreScore,
        countryScore,
        candidateFormat,
        formatAdjustment,
        matchPercentage,
        matchReason,
        displayGenreName,
      };
    });

    // Sắp xếp ứng viên theo điểm số giảm dần
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 6. DIVERSITY RE-RANKING (CHỐNG LẶP THỂ LOẠI / QUỐC GIA LIÊN TIẾP)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedFinalMovies: any[] = [];
    const remainingCandidates = [...scoredCandidates];
    let lastGenre = "";

    while (remainingCandidates.length > 0 && selectedFinalMovies.length < 36) {
      let pickIdx = remainingCandidates.findIndex(
        (c) => (c.displayGenreName || c.norm.genre || "") !== lastGenre
      );
      if (pickIdx === -1) pickIdx = 0;

      const [picked] = remainingCandidates.splice(pickIdx, 1);
      lastGenre = picked.displayGenreName || picked.norm.genre || "";

      selectedFinalMovies.push({
        slug: picked.norm.slug,
        name: picked.norm.title,
        title: picked.norm.title,
        origin_name: picked.norm.origin_name,
        poster_url: picked.norm.posterUrl || picked.norm.imageUrl || "/default-poster.jpg",
        thumb_url: picked.norm.thumbUrl || picked.norm.posterUrl || "/default-hero.jpg",
        tmdbId: picked.norm.tmdbId,
        itemType: picked.norm.itemType,
        year: picked.norm.year,
        quality: picked.norm.quality || "Full HD",
        category: [{ name: picked.displayGenreName }],
        matchPercentage: picked.matchPercentage,
        matchReason: picked.matchReason,
      });
    }

    // 7. BACKFILL BẢO VỆ CAROUSEL LUÔN ĐẦY ĐỦ >= 24 PHIM NẾU THIẾU
    if (selectedFinalMovies.length < 24) {
      try {
        const backfillPages = [1, 2];
        for (const p of backfillPages) {
          if (selectedFinalMovies.length >= 36) break;
          const fallbackRes = await movieApi.getMovies({
            page: p,
            limit: 24,
            sort: p === 1 ? "views" : "rating",
            posterEnrichmentBudgetMs: 0,
          });
          for (const raw of fallbackRes?.items || []) {
            const norm = normalizeMovie(raw);
            if (!norm.slug) continue;
            const cleanSlug = norm.slug.toLowerCase().trim();
            if (watchedHistorySet.has(cleanSlug) || seenSlugs.has(cleanSlug)) {
              continue;
            }
            seenSlugs.add(cleanSlug);
            selectedFinalMovies.push({
              slug: norm.slug,
              name: norm.title,
              title: norm.title,
              origin_name: norm.origin_name,
              poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
              thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
              tmdbId: norm.tmdbId,
              itemType: norm.itemType,
              year: norm.year,
              quality: norm.quality || "Full HD",
              category: [{ name: formatGenreName(norm.genre) || norm.type_name || "Đề Xuất" }],
              matchPercentage: 88,
              matchReason: "Siêu phẩm thịnh hành được yêu thích nhất",
            });
            if (selectedFinalMovies.length >= 36) break;
          }
        }
      } catch (backfillErr) {
        console.warn("[for-you recommendations] Backfill error:", backfillErr);
      }
    }

    // TẠO CONTEXT HIỂN THỊ CHÂN THỰC
    let matchContext = "Phim thịnh hành được đánh giá cao";
    if (!profile.isGuest) {
      if (topCountry && topGenre) {
        matchContext = `Phim ${topCountry.name} & ${topGenre.name} hợp gu bạn`;
      } else if (topGenre && secondGenre) {
        matchContext = `Phim ${topGenre.name} & ${secondGenre.name} tuyển chọn cho bạn`;
      } else if (topGenre) {
        matchContext = `Phim ${topGenre.name} hợp gu bạn`;
      }
    }

    // Nạp sẵn poster TMDb từ RAM/Redis cache vào danh sách gợi ý
    if (selectedFinalMovies.length > 0) {
      await enrichMovieListPosters(selectedFinalMovies, { budgetMs: 400, stripProxyUrls: true });
    }

    // 8. LƯU VÀO CACHE VỚI TTL 2 GIỜ (7200s) CHỈ KHI ĐẠT ĐỦ >= 14 PHIM
    if (selectedFinalMovies.length >= 14) {
      cacheService.set(
        kvForYouKey,
        {
          context: matchContext,
          movies: selectedFinalMovies,
        },
        7200
      ).catch(() => {});
    }

    const finalPayload: RecommendationResult = {
      success: true,
      context: matchContext,
      items: selectedFinalMovies,
      cached: false,
    };
    FOR_YOU_L1_CACHE.set(kvForYouKey, { data: finalPayload, expireAt: Date.now() + L1_TTL_MS });

    return finalPayload;
  } catch (err) {
    console.error("[generateForYouRecommendations] Error:", err);
    return { success: false, context: "Tuyển chọn chuẩn gu cho bạn", items: [] };
  }
}

