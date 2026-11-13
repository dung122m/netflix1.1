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
