import { NextRequest, NextResponse } from "next/server";
import { normalizeMovie } from "@/lib/movieMedia";
import { movieApi } from "@/services/movieApi";
import { cacheService } from "@/lib/cache";

export const maxDuration = 20;

// Bảng ánh xạ slug thể loại chuẩn của hệ thống
const CATEGORY_MAP: Record<string, { slug: string; name: string }> = {
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
const COUNTRY_MAP: Record<string, { slug: string; name: string }> = {
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
const TYPE_MAP: Record<string, { slug: string; name: string }> = {
  "phim-le": { slug: "phim-le", name: "Phim Lẻ" },
  "phim-bo": { slug: "phim-bo", name: "Phim Bộ" },
  "hoat-hinh": { slug: "hoat-hinh", name: "Hoạt Hình" },
  "tv-shows": { slug: "tv-shows", name: "TV Shows" },
};

interface WatchHistoryInputItem {
  slug: string;
  title?: string;
  category?: string;
  country?: string;
  type?: string;
  episodeName?: string;
  episodeSlug?: string;
  progressSeconds?: number;
  durationSeconds?: number;
  updatedAt?: number;
}

export type MovieFormat = "live_action" | "animation" | "unknown";
export type FormatPreference = "live_action_preferred" | "animation_preferred" | "mixed";

interface ScoredEntity {
  slug: string;
  name: string;
  score: number;
}

interface UserTasteProfile {
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
function cleanText(raw: string): string {
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
function extractGenresFromText(text: string): Array<{ slug: string; name: string }> {
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

  if (clean.includes("hanh dong") || clean.includes("action") || clean.includes("sat thu") || clean.includes("john wick")) add("hanh-dong");
  if (clean.includes("vo thuat") || clean.includes("kungfu") || clean.includes("kung fu") || clean.includes("diep van") || clean.includes("kiem hiep")) add("vo-thuat");
  if (clean.includes("hinh su") || clean.includes("trinh tham") || clean.includes("crime") || clean.includes("pha an") || clean.includes("toi pham") || clean.includes("canh sat")) add("hinh-su");
  if (clean.includes("kinh di") || clean.includes("horror") || clean.includes("ma qui") || clean.includes("quy") || clean.includes("zombie")) add("kinh-di");
  if (clean.includes("vien tuong") || clean.includes("sci fi") || clean.includes("gia tuong") || clean.includes("vu tru")) add("vien-tuong");
  if (clean.includes("tinh cam") || clean.includes("lang man") || clean.includes("romance") || clean.includes("hen ho")) add("tinh-cam");
  if (clean.includes("hai huoc") || clean.includes("comedy") || clean.includes("phim hai")) add("hai-huoc");
  if (clean.includes("tam ly") || clean.includes("drama") || clean.includes("xa hoi")) add("tam-ly");
  if (clean.includes("hoat hinh") || clean.includes("anime") || clean.includes("manga")) add("hoat-hinh");
  if (clean.includes("co trang") || clean.includes("hoang cung") || clean.includes("da su")) add("co-trang");
  if (clean.includes("phieu luu") || clean.includes("adventure") || clean.includes("tham hiem")) add("phieu-luu");
  if (clean.includes("chien tranh") || clean.includes("war")) add("chien-tranh");
  if (clean.includes("bi an") || clean.includes("mystery") || clean.includes("ly ky")) add("bi-an");
  if (clean.includes("hoc duong") || clean.includes("school") || clean.includes("thanh xuan")) add("hoc-duong");
  if (clean.includes("gia dinh") || clean.includes("family")) add("gia-dinh");

  // Kiểm tra trực tiếp theo slug danh mục chuẩn
  const words = clean.split(/\s+/);
  for (const w of words) {
    if (CATEGORY_MAP[w]) add(w);
  }

  return found;
}

// Bóc tách quốc gia từ chuỗi (country, category, title, slug)
function extractCountriesFromText(text: string): Array<{ slug: string; name: string }> {
  if (!text) return [];
  const clean = cleanText(text);
  const words = new Set(clean.split(/\s+/));
  const found: Array<{ slug: string; name: string }> = [];
  const seen = new Set<string>();

  const add = (slug: string) => {
    if (COUNTRY_MAP[slug] && !seen.has(slug)) {
      seen.add(slug);
      found.push(COUNTRY_MAP[slug]);
    }
  };

  if (clean.includes("han quoc") || clean.includes("korea") || clean.includes("k-drama") || clean.includes("kdrama")) add("han-quoc");
  if (clean.includes("trung quoc") || clean.includes("china") || clean.includes("hoa ngu") || clean.includes("c-drama")) add("trung-quoc");
  if (clean.includes("nhat ban") || clean.includes("japan")) add("nhat-ban");
  if (clean.includes("au my") || clean.includes("hollywood") || clean.includes("marvel") || words.has("my") || words.has("us") || clean.includes("hoa ky")) add("au-my");
  if (clean.includes("hong kong") || clean.includes("tvb")) add("hong-kong");
  if (clean.includes("viet nam") || clean.includes("vietnam")) add("viet-nam");
  if (clean.includes("thai lan") || clean.includes("thailand")) add("thai-lan");
  if (clean.includes("dai loan") || clean.includes("taiwan")) add("dai-loan");
  if (/(?:^|\s)an do(?:\s|$)/.test(clean) || clean.includes("india") || clean.includes("bollywood")) add("an-do");
  // Tuyệt đối không dùng words.has("anh") vì "anh" rất phổ biến trong tiếng Việt (Anh Hùng, Điện Ảnh, Tinh Võ...)
  if (
    clean === "anh" ||
    clean.includes("nuoc anh") ||
    clean.includes("vuong quoc anh") ||
    clean.includes("united kingdom") ||
    clean.includes("great britain") ||
    clean.includes("england") ||
    words.has("uk")
  ) {
    add("anh");
  }
  if (clean === "phap" || clean.includes("nuoc phap") || clean.includes("phim phap") || clean.includes("france")) add("phap");

  return found;
}

// Bóc tách loại phim (phim lẻ / phim bộ / hoạt hình / tv-shows)
function extractTypeFromText(text: string): { slug: string; name: string } | null {
  if (!text) return null;
  const clean = cleanText(text);
  if (clean.includes("phim bo") || clean.includes("series") || clean.includes("tap ") || clean.includes("season")) {
    return TYPE_MAP["phim-bo"];
  }
  if (clean.includes("phim le") || clean.includes("chieu rap") || clean.includes("movie")) {
    return TYPE_MAP["phim-le"];
  }
  if (clean.includes("hoat hinh") || clean.includes("anime")) {
    return TYPE_MAP["hoat-hinh"];
  }
  if (clean.includes("tv show") || clean.includes("truyen hinh")) {
    return TYPE_MAP["tv-shows"];
  }
  return null;
}

// Phân loại định dạng phim (Live-action vs Hoạt hình/Anime) độc lập với Thể loại (Genre)
function detectMovieFormat(item: {
  type?: string;
  category?: unknown;
  categories?: unknown[];
  title?: string;
  slug?: string;
  type_name?: string;
  raw?: Record<string, unknown>;
  episodeName?: string;
  episodeSlug?: string;
  durationSeconds?: number;
}): MovieFormat {
  const rawType = typeof item.raw?.type === "string" ? item.raw.type : "";
  const typeStr = cleanText(item.type || item.type_name || rawType || "").replace(/[-_]/g, " ");
  if (typeStr === "hoathinh" || typeStr === "hoat hinh" || typeStr === "anime") {
    return "animation";
  }
  if (
    typeStr === "phim le" ||
    typeStr === "phim bo" ||
    typeStr === "tv shows" ||
    typeStr === "tv show" ||
    typeStr === "single" ||
    typeStr === "series" ||
    typeStr === "phim rap"
  ) {
    return "live_action";
  }

  // Fallback kiểm tra category và title
  const catNames: string[] = [];
  if (typeof item.category === "string") catNames.push(item.category);
  else if (Array.isArray(item.category)) {
    for (const c of item.category) {
      if (typeof c === "string") {
        catNames.push(c);
      } else if (c && typeof c === "object") {
        const obj = c as { name?: string; slug?: string };
        catNames.push(obj.name || obj.slug || "");
      }
    }
  }
  if (Array.isArray(item.categories)) {
    for (const c of item.categories) {
      if (typeof c === "string") {
        catNames.push(c);
      } else if (c && typeof c === "object") {
        const obj = c as { name?: string; slug?: string };
        catNames.push(obj.name || obj.slug || "");
      }
    }
  }
  if (Array.isArray(item.raw?.category)) {
    for (const c of item.raw.category) {
      if (typeof c === "string") {
        catNames.push(c);
      } else if (c && typeof c === "object") {
        const obj = c as { name?: string; slug?: string };
        catNames.push(obj.name || obj.slug || "");
      }
    }
  }

  const catText = cleanText(catNames.join(" "));
  const titleText = cleanText(`${item.title || ""} ${item.slug || ""}`);

  if (
    catText.includes("hoat hinh") ||
    catText.includes("anime") ||
    catText.includes("manga") ||
    titleText.includes("hoat hinh") ||
    titleText.includes("anime")
  ) {
    return "animation";
  }

  if (
    catText.includes("phim bo") ||
    catText.includes("phim le") ||
    catText.includes("truyen hinh") ||
    catText.includes("tv shows") ||
    catText.includes("chieu rap")
  ) {
    return "live_action";
  }

  // Tín hiệu bổ sung cho các mục lịch sử xem cũ chưa kịp lưu trường type:
  // Nếu không chứa từ khóa hoạt hình / anime:
  // 1. Có tập phim (episodeName / episodeSlug) hoặc thời lượng >= 30 phút (tập phim người đóng thường dài 40-90 phút)
  const durationSec = typeof item.durationSeconds === "number" ? item.durationSeconds : 0;
  if (durationSec >= 1800 || item.episodeName || item.episodeSlug) {
    return "live_action";
  }

  // 2. Có các danh mục đặc trưng của phim người đóng
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

// Xây dựng UserTasteProfile đa chiều từ lịch sử xem và hồ sơ người dùng
function buildUserTasteProfile(
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
        engagementWeight = 2.0; // >= 80% -> weight 2.0
      } else if (ratio >= 0.5) {
        engagementWeight = 1.25; // >= 50% -> weight 1.25
      } else if (ratio >= 0.1) {
        engagementWeight = 1.0; // 10–49% -> weight 1.0
      } else {
        engagementWeight = 0.25; // < 10% -> weight 0.25 (short click không làm lệch format)
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

    // Trích xuất tín hiệu quốc gia (ưu tiên metadata country chính thức từ catalog)
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
      cur.score += 2.0; // Trọng số cao cho sở thích người dùng chủ động chọn
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
      score: Math.round((item.score / maxScore) * 100) / 100, // Thang điểm 0..1
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
const GUEST_THEMES = [
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      genres = [],
      historyItems = [],
      watchedSlugs = [],
      refreshSeed = 0,
      currentSlugs = [],
    } = body || {};

    const seed = Number(refreshSeed) || 0;

    // 1. TẠO USER TASTE PROFILE ĐA CHIỀU
    const profile = buildUserTasteProfile(historyItems, genres, watchedSlugs);

    // Tập hợp 100% slug phim cần loại bỏ (toàn bộ lịch sử + phim đang hiện)
    const watchedSet = new Set<string>([
      ...Array.from(profile.historySlugs),
      ...((currentSlugs as string[]) || []).map((s: string) => s.toLowerCase().trim()),
    ]);

    // 2. XÂY DỰNG TASTE FINGERPRINT & KIỂM TRA KV CACHE
    // Phân định rõ ràng giữa guest (theo theme seed) và user có profile (theo các chiều gu chuẩn hóa)
    // để đảm bảo không bị collision giữa các profile khác nhau.
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
    const kvForYouKey = `foryou:taste:${tasteHash}:p${pageOffset}`;

    // Thử lấy từ Cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedPool = await cacheService.get<{ context: string; movies: any[] }>(kvForYouKey);
    if (cachedPool && Array.isArray(cachedPool.movies) && cachedPool.movies.length >= 10) {
      const filtered = cachedPool.movies.filter(
        (m) => m && m.slug && !watchedSet.has(m.slug.toLowerCase().trim())
      );
      if (filtered.length >= 8) {
        return NextResponse.json({
          success: true,
          context: cachedPool.context,
          items: filtered.slice(0, 16),
          cached: true,
        });
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
          })
        );
      } else if (topCountry) {
        queryPromises.push(
          movieApi.getMovies({
            country: topCountry.slug,
            limit: 24,
            page: pageOffset,
            sort: "views",
          })
        );
      } else {
        queryPromises.push(
          movieApi.getMovies({
            category: topGenre.slug,
            limit: 24,
            page: pageOffset + 1,
            sort: "rating",
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
          })
        );
      } else if (prefType) {
        queryPromises.push(
          movieApi.getMovies({
            type: prefType.slug,
            limit: 20,
            page: (seed % 3) + 1,
            sort: "latest",
          })
        );
      } else {
        queryPromises.push(
          movieApi.getMovies({
            limit: 20,
            page: (seed % 3) + 1,
            sort: "views",
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
        })
      );
      queryPromises.push(
        movieApi.getMovies({
          category: guestTheme.genres[1] || "hanh-dong",
          limit: 24,
          page: pageOffset,
          sort: "rating",
        })
      );
      queryPromises.push(
        movieApi.getMovies({
          country: guestTheme.country,
          limit: 20,
          page: (seed % 2) + 1,
          sort: "views",
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

      // BẮT BUỘC: Loại bỏ triệt để 100% phim đã có trong lịch sử xem
      if (watchedSet.has(cleanSlug) || seenSlugs.has(cleanSlug)) {
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

      // 8. TẠO MATCH REASON CHÂN THỰC (ĐÚNG TÍN HIỆU THỰC TẾ, KHÔNG TỰ BỊA "BẠN THÍCH HOẠT HÌNH")
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
            // Mixed
            if (matchedTopGenre) {
              matchReason = `Hoạt hình/Anime ${topGenre.name} dựa trên lịch sử xem của bạn`;
            } else {
              matchReason = "Khớp dòng hoạt hình/anime bạn từng xem";
            }
          }
        } else {
          // Live action or unknown with mixed preference
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

      // 9. GENRE HIỂN THỊ TRÊN CARD (GIỮ NGUYÊN METADATA THẬT CỦA CANDIDATE)
      // Tuyệt đối KHÔNG dùng displayGenreName = topGenre.name để ghi đè thể loại gốc
      let displayGenreName = norm.genre || "Đề Xuất";
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

    // LOGGING DEV (Chỉ log server-side trong development để audit)
    if (process.env.NODE_ENV !== "production") {
      console.log("[for-you recommendations] Taste Profile:", {
        topGenres: profile.genres.map((g) => `${g.name} (${g.score})`),
        topCountries: profile.countries.map((c) => `${c.name} (${c.score})`),
        topTypes: profile.types.map((t) => `${t.name} (${t.score})`),
        formatPreference: profile.formatPreference,
        liveActionScore: profile.liveActionScore,
        animationScore: profile.animationScore,
      });

      if (scoredCandidates.length > 0) {
        console.log(
          "[for-you recommendations] Candidates sample:",
          scoredCandidates.slice(0, 8).map((c) => ({
            title: c.norm.title,
            format: c.candidateFormat,
            genreScore: c.genreScore,
            countryScore: c.countryScore,
            formatAdj: c.formatAdjustment,
            finalScore: c.score,
            matchPercentage: c.matchPercentage,
            displayGenre: c.displayGenreName,
          }))
        );
      }
    }

    // 6. DIVERSITY RE-RANKING (CHỐNG LẶP THỂ LOẠI / QUỐC GIA LIÊN TIẾP)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedFinalMovies: any[] = [];
    const remainingCandidates = [...scoredCandidates];
    let lastGenre = "";

    while (remainingCandidates.length > 0 && selectedFinalMovies.length < 16) {
      // Tìm ứng viên có điểm cao nhất nhưng không trùng lặp liên tiếp thể loại hiển thị
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
        year: picked.norm.year,
        quality: picked.norm.quality || "Full HD",
        category: [{ name: picked.displayGenreName }],
        matchPercentage: picked.matchPercentage,
        matchReason: picked.matchReason,
      });
    }

    // 7. BACKFILL BẢO VỆ CAROUSEL LUÔN ĐẦY ĐỦ >= 12 PHIM NẾU THIẾU
    if (selectedFinalMovies.length < 12) {
      try {
        const fallbackRes = await movieApi.getMovies({
          page: 1,
          limit: 20,
          sort: "views",
        });
        for (const raw of fallbackRes?.items || []) {
          const norm = normalizeMovie(raw);
          if (!norm.slug || watchedSet.has(norm.slug.toLowerCase().trim()) || seenSlugs.has(norm.slug.toLowerCase().trim())) {
            continue;
          }
          seenSlugs.add(norm.slug.toLowerCase().trim());
          selectedFinalMovies.push({
            slug: norm.slug,
            name: norm.title,
            title: norm.title,
            origin_name: norm.origin_name,
            poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
            thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
            year: norm.year,
            quality: norm.quality || "Full HD",
            category: [{ name: norm.genre || "Đề Xuất" }],
            matchPercentage: 88,
            matchReason: "Siêu phẩm thịnh hành được yêu thích nhất",
          });
          if (selectedFinalMovies.length >= 16) break;
        }
      } catch (backfillErr) {
        console.warn("[for-you recommendations] Backfill error:", backfillErr);
      }
    }

    // TẠO CONTEXT HIỂN THỊ CHÂN THỰC
    let matchContext = "Tuyển tập siêu phẩm thịnh hành được đánh giá cao nhất";
    if (!profile.isGuest) {
      if (topCountry && topGenre) {
        matchContext = `Tuyển tập phim ${topCountry.name} & ${topGenre.name} chuẩn gu của bạn`;
      } else if (topGenre && secondGenre) {
        matchContext = `Tuyển tập ${topGenre.name} & ${secondGenre.name} tuyển chọn riêng cho bạn`;
      } else if (topGenre) {
        matchContext = `Tuyển tập đỉnh cao ${topGenre.name} dựa trên lịch sử xem`;
      }
    }

    // 8. LƯU VÀO CACHE VỚI TTL 2 GIỜ (7200s)
    if (selectedFinalMovies.length >= 8) {
      cacheService.set(
        kvForYouKey,
        {
          context: matchContext,
          movies: selectedFinalMovies,
        },
        7200
      ).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      context: matchContext,
      items: selectedFinalMovies,
      cached: false,
    });
  } catch (err) {
    console.error("[for-you recommendations] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}
