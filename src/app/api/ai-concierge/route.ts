import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { movieApi } from "@/services/movieApi";
import { sanitizeImageUrl } from "@/lib/movieMedia";
import { searchMoviesBySemantic } from "@/services/aiVectorService";

export const maxDuration = 15;

interface SuggestionCard {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  rating?: string | number;
  category?: string;
  country?: string;
  actors?: string[];
  reason?: string;
}

interface UserIntent {
  category?: string;
  country?: string;
  countryName?: string;
  actor?: string;
  type?: string;
  moodLabel: string;
  defaultAnalysis: string;
  reasons: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafePoster(item: any): string {
  if (!item) return "/default-poster.svg";
  const poster = sanitizeImageUrl(item.poster_url || item.posterUrl || "");
  if (poster) return poster;
  const thumb = sanitizeImageUrl(item.thumb_url || item.thumbUrl || "");
  if (thumb) return thumb;
  return "/default-poster.svg";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeActors(item: any): string[] {
  if (Array.isArray(item?.actor)) {
    return item.actor.map(String).map((s: string) => s.trim()).filter(Boolean);
  }
  if (typeof item?.actor === "string" && item.actor.trim()) {
    return item.actor.split(",").map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TITLE_LOOKUP_CACHE = new Map<string, { item: any; expireAt: number }>();

// Helper chuẩn hóa chuỗi tiếng Việt để so sánh độ tương đồng chính xác
function cleanNormalizedString(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Thuật toán chấm điểm để tìm bộ phim khớp nhất trong danh sách kết quả tìm kiếm
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findBestMatchMovie(items: any[], query: string, originalQuery?: string): any {
  if (!items || items.length === 0) return null;
  const cleanQ = cleanNormalizedString(query || "");
  const cleanOq = cleanNormalizedString(originalQuery || "");

  let bestItem = null;
  let bestScore = -999;

  for (const it of items) {
    const name = cleanNormalizedString(it.name || it.title || "");
    const orig = cleanNormalizedString(it.origin_name || "");
    const slug = cleanNormalizedString(it.slug || "");

    let score = 0;

    // 1. Khớp chính xác tên tiếng Việt hoặc tên gốc -> Ưu tiên hàng đầu (+100)
    if (name === cleanQ || (cleanOq && (name === cleanOq || orig === cleanOq))) {
      score += 100;
    } else if (slug === cleanQ.replace(/\s+/g, "-") || (cleanOq && slug === cleanOq.replace(/\s+/g, "-"))) {
      score += 90;
    } else if (name.startsWith(cleanQ) || (cleanOq && (name.startsWith(cleanOq) || orig.startsWith(cleanOq)))) {
      score += 70;
    } else if (name.includes(cleanQ) || (cleanOq && (name.includes(cleanOq) || orig.includes(cleanOq)))) {
      score += 50;
    } else {
      // Khớp theo tập hợp từ (ví dụ: "Vây Hãm: Kẻ Trừng Phạt" khớp với "Vây Hãm 4: Kẻ Trừng Phạt")
      const qWords = cleanQ.split(" ").filter((w) => w.length > 1);
      if (qWords.length > 1) {
        const matchWords = qWords.filter((w) => name.includes(w) || (orig && orig.includes(w)));
        const ratio = matchWords.length / qWords.length;
        if (ratio >= 0.6) score += Math.round(ratio * 45);
      }
    }

    // 2. Phạt nếu độ dài chênh lệch quá nhiều (tránh nhầm phim gốc với ngoại truyện/phim hoạt hình ăn theo)
    const lenDiff = Math.abs(name.length - cleanQ.length);
    score -= Math.min(20, lenDiff * 1.2);

    // 3. Ưu tiên phim có ảnh bìa
    if (it.thumb_url || it.poster_url) score += 10;

    if (score > bestScore) {
      bestScore = score;
      bestItem = it;
    }
  }

  return bestScore > 10 ? bestItem : (items[0] || null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryPhimApiDirect(keyword: string, originalKeyword?: string): Promise<any> {
  if (!keyword?.trim()) return null;
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}&limit=6`,
      { signal: AbortSignal.timeout(2000), next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const items = json?.data?.items || [];
    if (items.length > 0) {
      const best = findBestMatchMovie(items, keyword, originalKeyword);
      if (!best) return null;

      const imageDomain = (json.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com/").replace(/\/+$/, "");
      const formatImg = (p?: string) => {
        if (!p) return "";
        if (p.startsWith("http://") || p.startsWith("https://")) return p;
        return `${imageDomain}/${p.replace(/^\/+/, "")}`;
      };
      return {
        ...best,
        thumb_url: formatImg(best.thumb_url) || formatImg(best.poster_url),
        poster_url: formatImg(best.poster_url) || formatImg(best.thumb_url),
      };
    }
  } catch {}
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchSingleMovieFast(title: string, originalTitle: string): Promise<any> {
  const cleanTitle = (title || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const cleanOriginal = (originalTitle || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const key = `${cleanTitle}__${cleanOriginal}`.toLowerCase();

  const cached = TITLE_LOOKUP_CACHE.get(key);
  if (cached && Date.now() < cached.expireAt) return cached.item;

  let foundItem = null;

  // 1. Tìm trực tiếp trên PhimAPI qua tên tiếng Việt với thuật toán so khớp thông minh (cực nhanh ~200ms)
  if (cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanTitle, cleanOriginal);
  }

  // 2. Tìm trực tiếp trên PhimAPI qua tên gốc nếu chưa thấy
  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanOriginal, cleanTitle);
  }

  // 3. Fallback qua movieApi.getMovies (VSMOV + PhimAPI) với timeout an toàn 2.5s
  if (!foundItem && cleanTitle) {
    try {
      const res1 = await Promise.race([
        movieApi.getMovies({ keyword: cleanTitle, page: 1, limit: 5 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
      ]);
      if (res1?.items && res1.items.length > 0) {
        foundItem = findBestMatchMovie(res1.items, cleanTitle, cleanOriginal);
      }
    } catch {}
  }

  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    try {
      const res2 = await Promise.race([
        movieApi.getMovies({ keyword: cleanOriginal, page: 1, limit: 5 }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (res2?.items && res2.items.length > 0) {
        foundItem = findBestMatchMovie(res2.items, cleanOriginal, cleanTitle);
      }
    } catch {}
  }

  // Chỉ cache 24h nếu tìm thấy phim. Nếu null thì chỉ cache 30s để tránh vĩnh viễn mất ảnh do timeout mạng!
  if (foundItem) {
    TITLE_LOOKUP_CACHE.set(key, { item: foundItem, expireAt: Date.now() + 1000 * 60 * 60 * 24 });
  } else {
    TITLE_LOOKUP_CACHE.set(key, { item: null, expireAt: Date.now() + 1000 * 30 });
  }

  return foundItem;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSafeCountry(item: any): string {
  if (Array.isArray(item?.country) && item.country.length > 0) {
    return item.country[0]?.name || item.country[0]?.slug || "";
  }
  if (typeof item?.country === "string") return item.country;
  return "";
}

// BỘ NHẬN DIỆN Ý ĐỊNH & NGỮ NGHĨA TỰ NHIÊN ĐA CHIỀU (QUỐC GIA + THỂ LOẠI + CHỦ ĐỀ)
function parseUserIntent(prompt: string): UserIntent {
  const p = prompt.toLowerCase();

  // 1. Nhận diện Quốc gia (Country)
  let country = "";
  let countryName = "";
  if (
    p.includes("trung quốc") ||
    p.includes("trung quoc") ||
    p.includes("trung hoa") ||
    p.includes("phim trung") ||
    p.includes("hoa ngữ") ||
    p.includes("cbiz") ||
    p.includes("đại lục")
  ) {
    country = "trung-quoc";
    countryName = "Trung Hoa 🇨🇳";
  } else if (
    p.includes("hàn quốc") ||
    p.includes("han quoc") ||
    p.includes("phim hàn") ||
    p.includes("hàn xẻng") ||
    p.includes("xứ kim chi") ||
    p.includes("kbiz") ||
    p.includes("k-drama") ||
    p.includes("kdrama")
  ) {
    country = "han-quoc";
    countryName = "Hàn Quốc 🇰🇷";
  } else if (
    p.includes("âu mỹ") ||
    p.includes("au my") ||
    p.includes("phim mỹ") ||
    p.includes("hollywood") ||
    p.includes("us-uk") ||
    p.includes("usuk") ||
    p.includes("phương tây")
  ) {
    country = "au-my";
    countryName = "Hollywood & Âu Mỹ 🇺🇸";
  } else if (
    p.includes("nhật bản") ||
    p.includes("nhat ban") ||
    p.includes("phim nhật") ||
    p.includes("j-drama")
  ) {
    country = "nhat-ban";
    countryName = "Nhật Bản 🇯🇵";
  } else if (
    p.includes("thái lan") ||
    p.includes("thai lan") ||
    p.includes("phim thái")
  ) {
    country = "thai-lan";
    countryName = "Thái Lan 🇹🇭";
  } else if (
    p.includes("việt nam") ||
    p.includes("viet nam") ||
    p.includes("phim việt") ||
    p.includes("vbiz")
  ) {
    country = "viet-nam";
    countryName = "Việt Nam 🇻🇳";
  } else if (
    p.includes("hồng kông") ||
    p.includes("hong kong") ||
    p.includes("tvb")
  ) {
    country = "hong-kong";
    countryName = "Hồng Kông 🇭🇰";
  } else if (p.includes("ấn độ") || p.includes("an do") || p.includes("bollywood")) {
    country = "an-do";
    countryName = "Ấn Độ 🇮🇳";
  }

  // 2. Nhận diện Hình thức (Type)
  let type = "";
  if (p.includes("chiếu rạp") || p.includes("bom tấn") || p.includes("rạp")) {
    type = "phim-chieu-rap";
  } else if (p.includes("phim bộ") || p.includes("nhiều tập") || p.includes("series")) {
    type = "phim-bo";
  } else if (p.includes("phim lẻ") || p.includes("một tập") || p.includes("điện ảnh")) {
    type = "phim-le";
  }

  // 3. Nhận diện Diễn Viên nổi tiếng chính xác (Actor)
  let actor = "";
  const FAMOUS_ACTORS: Array<{
    keywords: string[];
    name: string;
    country?: string;
    countryName?: string;
    category?: string;
  }> = [
    { keywords: ["thành long", "jackie chan"], name: "Thành Long", country: "hong-kong", countryName: "Hồng Kông 🇭🇰", category: "vo-thuat" },
    { keywords: ["châu tinh trì", "stephen chow"], name: "Châu Tinh Trì", country: "hong-kong", countryName: "Hồng Kông 🇭🇰", category: "hai-huoc" },
    { keywords: ["chân tử đan", "donnie yen"], name: "Chân Tử Đan", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "vo-thuat" },
    { keywords: ["lý liên kiệt", "jet li"], name: "Lý Liên Kiệt", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "vo-thuat" },
    { keywords: ["ngô kinh", "wu jing"], name: "Ngô Kinh", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "hanh-dong" },
    { keywords: ["lưu diệc phi", "crystal liu"], name: "Lưu Diệc Phi", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "co-trang" },
    { keywords: ["dương mịch", "yang mi"], name: "Dương Mịch", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "co-trang" },
    { keywords: ["triệu lệ dĩnh", "zhao liying"], name: "Triệu Lệ Dĩnh", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "co-trang" },
    { keywords: ["tiêu chiến", "xiao zhan"], name: "Tiêu Chiến", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "co-trang" },
    { keywords: ["vương nhất bác", "wang yibo"], name: "Vương Nhất Bác", country: "trung-quoc", countryName: "Trung Quốc 🇨🇳", category: "co-trang" },
    { keywords: ["song joong ki", "song joong-ki"], name: "Song Joong Ki", country: "han-quoc", countryName: "Hàn Quốc 🇰🇷", category: "tinh-cam" },
    { keywords: ["lee min ho", "lee min-ho"], name: "Lee Min Ho", country: "han-quoc", countryName: "Hàn Quốc 🇰🇷", category: "tinh-cam" },
    { keywords: ["hyun bin"], name: "Hyun Bin", country: "han-quoc", countryName: "Hàn Quốc 🇰🇷", category: "tinh-cam" },
    { keywords: ["park seo joon", "park seo-joon"], name: "Park Seo Joon", country: "han-quoc", countryName: "Hàn Quốc 🇰🇷", category: "tinh-cam" },
    { keywords: ["ma dong seok", "don lee"], name: "Ma Dong Seok", country: "han-quoc", countryName: "Hàn Quốc 🇰🇷", category: "hanh-dong" },
    { keywords: ["tom cruise"], name: "Tom Cruise", country: "au-my", countryName: "Hollywood 🇺🇸", category: "hanh-dong" },
    { keywords: ["leonardo dicaprio", "dicaprio"], name: "Leonardo DiCaprio", country: "au-my", countryName: "Hollywood 🇺🇸", category: "tam-ly" },
    { keywords: ["keanu reeves", "john wick"], name: "Keanu Reeves", country: "au-my", countryName: "Hollywood 🇺🇸", category: "hanh-dong" },
    { keywords: ["robert downey", "iron man"], name: "Robert Downey Jr", country: "au-my", countryName: "Hollywood 🇺🇸", category: "vien-tuong" },
    { keywords: ["dwayne johnson", "the rock"], name: "Dwayne Johnson", country: "au-my", countryName: "Hollywood 🇺🇸", category: "hanh-dong" },
    { keywords: ["trấn thành", "tran thanh"], name: "Trấn Thành", country: "viet-nam", countryName: "Việt Nam 🇻🇳", category: "tam-ly" },
    { keywords: ["thái hòa", "thai hoa"], name: "Thái Hòa", country: "viet-nam", countryName: "Việt Nam 🇻🇳", category: "hai-huoc" },
  ];

  for (const act of FAMOUS_ACTORS) {
    if (act.keywords.some((kw) => p.includes(kw))) {
      actor = act.name;
      if (!country && act.country) {
        country = act.country;
        countryName = act.countryName || "";
      }
      break;
    }
  }

  // 3. Nhận diện Chủ đề đặc thù (Visual / Diễn viên)
  const isFemaleBeauty =
    p.includes("nữ đẹp") ||
    p.includes("diễn viên nữ") ||
    p.includes("nữ chính") ||
    p.includes("gái xinh") ||
    p.includes("mỹ nhân") ||
    p.includes("xinh gái") ||
    p.includes("xinh đẹp") ||
    p.includes("nữ thần") ||
    p.includes("hot girl") ||
    p.includes("tuyệt sắc");

  const isMaleBeauty =
    p.includes("nam đẹp") ||
    p.includes("diễn viên nam") ||
    p.includes("nam chính") ||
    p.includes("trai đẹp") ||
    p.includes("soái ca") ||
    p.includes("nam thần") ||
    p.includes("đẹp trai");

  const isFamily =
    p.includes("gia đình") ||
    p.includes("mẹ") ||
    p.includes("cha") ||
    p.includes("bố") ||
    p.includes("con cái") ||
    p.includes("tình thân") ||
    p.includes("chữa lành");

  // 4. Nhận diện Thể loại chính (Category)
  let category = "";
  let moodLabel = "";
  let defaultAnalysis = "";
  let reasons: string[] = [];

  // 4.1 VÕ THUẬT (Võ thuật, kungfu, chưởng, đánh võ, quyền cước, diệp vấn...)
  if (
    p.includes("võ thuật") ||
    p.includes("vo thuat") ||
    p.includes("kungfu") ||
    p.includes("kung fu") ||
    p.includes("võ") ||
    p.includes("đánh võ") ||
    p.includes("chưởng") ||
    p.includes("võ lâm") ||
    p.includes("tinh võ") ||
    p.includes("thiếu lâm") ||
    p.includes("quyền cước") ||
    p.includes("diệp vấn") ||
    p.includes("lý tiểu long") ||
    p.includes("thành long") ||
    p.includes("chân tử đan") ||
    p.includes("ngô kinh")
  ) {
    category = "vo-thuat";
    if (country === "trung-quoc") {
      moodLabel = "Võ Thuật & Tinh Hoa Công Phu Trung Hoa 🥋🇨🇳";
      defaultAnalysis =
        "Tuyển tập những siêu phẩm võ thuật Trung Quốc đỉnh cao với những màn thế võ chân thực, công phu điêu luyện và mãn nhãn:";
      reasons = [
        "Những thế võ công phu chân thực, động tác dứt khoát mãn nhãn",
        "Kịch bản kịch tính tôn vinh tinh thần thượng võ truyền thống",
        "Dàn cao thủ võ thuật thực lực phô diễn những màn tỷ thí để đời",
        "Âm thanh va chạm sống động, nhịp độ dồn dập nghẹt thở",
      ];
    } else {
      moodLabel = countryName
        ? `Võ Thuật & Quyền Cước ${countryName} 🥋`
        : "Võ Thuật & Tinh Hoa Đối Kháng 🥋";
      defaultAnalysis =
        "Thưởng thức những trận thư hùng đỉnh cao với những đòn thế võ thuật uy lực và tinh thần thượng võ rực lửa:";
      reasons = [
        "Những pha ra đòn uy lực, kỹ thuật thượng thừa",
        "Nhịp phim dồn dập, những pha giao tranh nghẹt thở",
        "Mãn nhãn từng khung hình với các thế võ đỉnh cao",
      ];
    }
  }
  // 4.2 CỔ TRANG & KIẾM HIỆP
  else if (
    p.includes("cổ trang") ||
    p.includes("kiếm hiệp") ||
    p.includes("tiên hiệp") ||
    p.includes("cung đấu") ||
    p.includes("hoàng cung") ||
    p.includes("triều đình") ||
    p.includes("dã sử")
  ) {
    category = "co-trang";
    moodLabel = country === "trung-quoc"
      ? "Cổ Trang & Kiếm Hiệp Kỳ Ảo Trung Hoa 🏯🇨🇳"
      : "Cổ Trang & Dã Sử Kỳ Ảo 🏯";
    defaultAnalysis =
      "Bước vào thế giới cung đình diễm lệ, giang hồ nghĩa hiệp hoặc tiên hiệp huyền ảo đầy mê hoặc:";
    reasons = [
      "Bối cảnh tráng lệ, tạo hình nhân vật cổ phong tuyệt mỹ",
      "Ân oán tình thù giang hồ khắc cốt ghi tâm",
      "Kỹ xảo tiên hiệp huyền ảo mãn nhãn từng phân cảnh",
    ];
  }
  // 4.3 DIỄN VIÊN NỮ ĐẸP / MỸ NHÂN
  else if (isFemaleBeauty) {
    category = "tinh-cam";
    moodLabel = countryName
      ? `Nữ Thần & Mỹ Nhân Màn Ảnh ${countryName} ✨`
      : "Nữ Thần & Mỹ Nhân Màn Ảnh Tuyệt Sắc ✨";
    defaultAnalysis =
      "Dành riêng cho bạn những tác phẩm quy tụ dàn nữ chính sở hữu visual cực phẩm, thần thái cuốn hút và diễn xuất đỉnh chóp:";
    reasons = [
      "Nữ chính sở hữu nhan sắc cực phẩm, thần thái hút hồn từng khung hình",
      "Tạo hình thời thượng, khí chất ngút ngàn và nụ cười tỏa nắng",
      "Nhan sắc mãn nhãn đi cùng cốt truyện lôi cuốn không thể rời mắt",
      "Tương tác ngọt ngào đốn tim người hâm mộ",
    ];
  }
  // 4.4 DIỄN VIÊN NAM ĐẸP / SOÁI CA
  else if (isMaleBeauty) {
    category = "tinh-cam";
    moodLabel = countryName
      ? `Nam Thần & Soái Ca Màn Ảnh ${countryName} ⭐`
      : "Nam Thần & Soái Ca Màn Ảnh ⭐";
    defaultAnalysis =
      "Tuyển tập những bộ phim có dàn nam chính visual đỉnh cao, phong thái lịch lãm đốn tim hàng triệu khán giả:";
    reasons = [
      "Nam thần visual cực phẩm, góc nghiêng thần thánh",
      "Hình tượng soái ca thâm tình, quyến rũ khó cưỡng",
      "Tương tác bùng nổ phản ứng hóa học cực kỳ cuốn hút",
    ];
  }
  // 4.5 HOẠT HÌNH / ANIME
  else if (
    p.includes("hoạt hình") ||
    p.includes("anime") ||
    p.includes("manga") ||
    p.includes("thiếu nhi") ||
    p.includes("tuổi thơ") ||
    p.includes("ghibli")
  ) {
    category = "hoat-hinh";
    moodLabel = country === "nhat-ban"
      ? "Anime & Hoạt Hình Nhật Bản Diệu Kỳ 🎨🇯🇵"
      : "Thế Giới Hoạt Hình & Anime Diệu Kỳ 🎨";
    defaultAnalysis =
      "Tìm lại sự trong trẻo, mộng mơ hoặc bước vào những thế giới hoạt hình diệu kỳ, giàu cảm xúc:";
    reasons = [
      "Nét vẽ tuyệt đẹp cùng những thông điệp nhân văn lay động lòng người",
      "Âm nhạc du dương, giàu chất thơ và chữa lành tâm hồn",
      "Chuyến phiêu lưu đầy màu sắc vượt qua giới hạn tưởng tượng",
    ];
  }
  // 4.6 KINH DỊ & MA QUỶ
  else if (
    p.includes("kinh dị") ||
    p.includes("ma") ||
    p.includes("quỷ") ||
    p.includes("rùng rợn") ||
    p.includes("lạnh gáy") ||
    p.includes("tâm linh") ||
    p.includes("bùa ngải") ||
    p.includes("zombie") ||
    p.includes("xác sống") ||
    p.includes("ám ảnh")
  ) {
    category = "kinh-di";
    moodLabel = country === "thai-lan"
      ? "Kinh Dị & Tâm Linh Xứ Chùa Vàng 👻🇹🇭"
      : "Hồi Hộp & Lạnh Gáy Rùng Rợn 👻";
    defaultAnalysis =
      "Nếu bạn muốn thử thách lòng dũng cảm trong bóng tối, hãy chuẩn bị tinh thần cho những thước phim rùng rợn này:";
    reasons = [
      "Bầu không khí u ám, giật gân nghẹt thở",
      "Cốt truyện tâm linh bí ẩn khơi dậy nỗi sợ sâu thẳm",
      "Cú jumpscare chất lượng cao làm tim bạn đập loạn nhịp",
    ];
  }
  // 4.7 HÀI HƯỚC & XẢ STRESS
  else if (
    p.includes("hài") ||
    p.includes("cười") ||
    p.includes("stress") ||
    p.includes("vui") ||
    p.includes("lầy") ||
    p.includes("giải trí")
  ) {
    category = "hai-huoc";
    moodLabel = "Hài Hước & Giải Tỏa Stress 🤣";
    defaultAnalysis =
      "Cười thả ga để xua tan mọi áp lực! Dưới đây là những bộ phim hài hước duyên dáng giúp bạn nạp đầy năng lượng tích cực:";
    reasons = [
      "Những tình huống dở khóc dở cười cực kỳ duyên dáng",
      "Nhẹ nhàng, thư giãn tuyệt đối cho ngày dài mệt mỏi",
      "Dàn diễn viên dí dỏm với những màn đối đáp đỉnh chóp",
    ];
  }
  // 4.8 GIA ĐÌNH & CHỮA LÀNH
  else if (isFamily) {
    category = "tinh-cam";
    moodLabel = "Gia Đình & Tình Thân Chữa Lành 👨‍👩‍👧";
    defaultAnalysis =
      "Tình cảm gia đình và những khoảnh khắc đời thường ấm áp sẽ mang lại sự bình yên và nhiều xúc cảm cho bạn:";
    reasons = [
      "Tình thân gia đình sâu sắc chạm đến trái tim người xem",
      "Những bài học cuộc sống giản dị mà thấm thía",
      "Cốt truyện ấm áp, kết thúc trọn vẹn chữa lành tâm hồn",
    ];
  }
  // 4.9 PHIM BUỒN, LẤY NƯỚC MẮT & BI KỊCH
  else if (
    p.includes("buồn") ||
    p.includes("khóc") ||
    p.includes("nước mắt") ||
    p.includes("bi kịch") ||
    p.includes("đau lòng") ||
    p.includes("chia ly") ||
    p.includes("thương tâm") ||
    p.includes("mất mát") ||
    p.includes("tang thương")
  ) {
    category = "tam-ly";
    moodLabel = "Đẫm Nước Mắt & Bi Kịch Cảm Động 💧😭";
    defaultAnalysis =
      "Những thước phim giàu xúc cảm, lấy đi bao nước mắt và chạm đến những góc khuất sâu lắng nhất trong tâm hồn bạn:";
    reasons = [
      "Cốt truyện bi kịch xúc động lấy đi bao nước mắt của khán giả",
      "Những phân cảnh chia ly nghẹn ngào, đau đáu khôn nguôi",
      "Diễn xuất xuất thần chạm đến sâu thẳm trái tim người xem",
    ];
  }
  // 4.10 TÌNH CẢM & LÃNG MẠN / NGÔN TÌNH
  else if (
    p.includes("tình cảm") ||
    p.includes("yêu") ||
    p.includes("lãng mạn") ||
    p.includes("ngôn tình") ||
    p.includes("ngọt ngào") ||
    p.includes("thanh xuân") ||
    p.includes("học đường")
  ) {
    category = "tinh-cam";
    moodLabel = country === "han-quoc"
      ? "Lãng Mạn & Ngôn Tình Xứ Hàn 💖🇰🇷"
      : (country === "trung-quoc"
          ? "Ngôn Tình & Lãng Mạn Trung Hoa 💖🇨🇳"
          : "Lãng Mạn & Ngọt Ngào 💖");
    defaultAnalysis =
      "Một chút ngọt ngào và rung động sẽ xoa dịu tâm hồn bạn. Đây là những tác phẩm tình cảm đắt giá nhất dành cho bạn:";
    reasons = [
      "Câu chuyện tình yêu đầy cảm xúc chạm đến trái tim",
      "Phản ứng hóa học bùng nổ giữa các nhân vật chính",
      "Hình ảnh thơ mộng, âm nhạc lắng đọng đi vào lòng người",
    ];
  }
  // 4.10 HÀNH ĐỘNG & KỊCH TÍNH
  else if (
    p.includes("hành động") ||
    p.includes("đánh đấm") ||
    p.includes("bắn súng") ||
    p.includes("sát thủ") ||
    p.includes("rượt đuổi") ||
    p.includes("điệp viên") ||
    p.includes("xã hội đen")
  ) {
    category = "hanh-dong";
    moodLabel = country === "au-my"
      ? "Bom Tấn Hành Động Hollywood 💥🇺🇸"
      : "Máu Lửa & Hành Động Kịch Tính 💥";
    defaultAnalysis =
      "Tăng lượng adrenaline với những pha hành động mãn nhãn, kỹ xảo đỉnh cao và rượt đuổi nghẹt thở:";
    reasons = [
      "Các pha giao tranh đỉnh cao, mãn nhãn từng khung hình",
      "Nhịp phim dồn dập không cho bạn rời mắt",
      "Kịch bản gay cấn với những cú lật bàn bất ngờ",
    ];
  }
  // 4.11 VIỄN TƯỞNG & VŨ TRỤ
  else if (
    p.includes("viễn tưởng") ||
    p.includes("vũ trụ") ||
    p.includes("du hành") ||
    p.includes("tương lai") ||
    p.includes("robot") ||
    p.includes("siêu anh hùng")
  ) {
    category = "vien-tuong";
    moodLabel = "Vũ Trụ & Khám Phá Viễn Tưởng 🛸";
    defaultAnalysis =
      "Mở rộng trí tưởng tượng vượt qua không - thời gian với những kỳ quan vũ trụ và tương lai công nghệ:";
    reasons = [
      "Thế giới viễn tưởng kỳ vĩ với kỹ xảo choáng ngợp",
      "Những giả thuyết khoa học và triết học sâu sắc",
      "Trải nghiệm thị giác vượt qua giới hạn thực tế",
    ];
  }
  // 4.12 TRINH THÁM & ĐẤU TRÍ
  else if (
    p.includes("hack não") ||
    p.includes("trinh thám") ||
    p.includes("đấu trí") ||
    p.includes("bí ẩn") ||
    p.includes("tâm lý") ||
    p.includes("hình sự") ||
    p.includes("phá án") ||
    p.includes("twist")
  ) {
    category = "tam-ly";
    moodLabel = "Căng Não & Trinh Thám Đấu Trí 🧠";
    defaultAnalysis =
      "Dành cho những bộ não thích suy luận và bóc tách từng lớp bí mật. Những cú 'plot-twist' này sẽ làm bạn ngỡ ngàng:";
    reasons = [
      "Kịch bản trinh thám tầng tầng lớp lớp cực kỳ tinh vi",
      "Cú lật mặt kinh điển không thể đoán trước",
      "Chiều sâu tâm lý nhân vật được khắc họa xuất sắc",
    ];
  }
  // 4.13 PHIM CHIẾU RẠP / BOM TẤN
  else if (type === "phim-chieu-rap") {
    moodLabel = "Bom Tấn Chiếu Rạp 🎬";
    defaultAnalysis =
      "Thưởng thức chuẩn trải nghiệm điện ảnh rạp chiếu với các bom tấn có kinh phí khủng và dàn sao hạng A:";
    reasons = [
      "Quy mô sản xuất khủng, âm thanh hình ảnh đạt chuẩn rạp",
      "Từng làm mưa làm gió tại các phòng vé toàn cầu",
      "Trải nghiệm giải trí trọn vẹn từng phút giây",
    ];
  }
  // 4.14 NẾU CÓ DIỄN VIÊN ĐÍCH DANH
  else if (actor) {
    moodLabel = `Tuyển Tập Siêu Phẩm Của ${actor} ⭐`;
    defaultAnalysis = `Tuyển chọn những tác phẩm điện ảnh xuất sắc và được yêu thích nhất của ${actor}:`;
    reasons = [
      `Diễn xuất xuất thần và phong thái đặc trưng của ${actor}`,
      `Những thước phim gắn liền với tên tuổi và sự nghiệp đỉnh cao`,
      `Cốt truyện lôi cuốn và nhận được vô số đánh giá tích cực`,
    ];
  }
  // 4.15 MẶC ĐỊNH: NẾU CHỈ CÓ QUỐC GIA MÀ KHÔNG CÓ THỂ LOẠI
  else if (country) {
    moodLabel = `Siêu Phẩm Điện Ảnh ${countryName} ⭐`;
    defaultAnalysis = `Dưới đây là những tác phẩm điện ảnh xuất sắc nhất của nền điện ảnh ${countryName} được khán giả yêu thích:`;
    reasons = [
      "Đậm đà bản sắc văn hóa và phong cách điện ảnh đặc trưng",
      "Diễn xuất thực lực cùng cốt truyện lay động lòng người",
      "Tác phẩm ăn khách hàng đầu với lượng đánh giá cao",
    ];
  }
  // 4.16 MẶC ĐỊNH TOÀN DIỆN
  else {
    moodLabel = "Tác Phẩm Đặc Sắc Thịnh Hành ⭐";
    defaultAnalysis =
      "Dưới đây là những siêu phẩm điện ảnh được đông đảo khán giả yêu thích và đánh giá cao nhất hiện nay:";
    reasons = [
      "Tác phẩm có điểm đánh giá xuất sắc và lượt xem kỷ lục",
      "Cốt truyện lôi cuốn, giữ chân người xem từ đầu đến cuối",
      "Dàn diễn viên chất lượng cùng kịch bản xuất sắc",
    ];
  }

  return {
    category,
    country,
    countryName,
    actor,
    type,
    moodLabel,
    defaultAnalysis,
    reasons,
  };
}

interface RawMovieItem {
  slug?: string;
  name?: string;
  title?: string;
  poster_url?: string;
  thumb_url?: string;
  year?: number | string;
  quality?: string;
  category?: Array<{ name?: string }>;
}

interface CacheEntry {
  reply: string;
  mood: string;
  movies: SuggestionCard[];
  provider: string;
  cachedAt: number;
}

// BỘ NHỚ ĐỆM TIẾT KIỆM 100% TOKEN CHO CÁC CÂU HỎI TRÙNG LẶP (TTL: 2 GIỜ)
const AI_RESPONSE_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;

function normalizeQuery(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, "")
    .replace(/\s+/g, " ");
}

// BỘ CHỐNG SPAM / BOT ĐỐT TOKEN (TỐI ĐA 25 REQUESTS/PHÚT MỖI IP)
const ipRequestMap = new Map<string, { count: number; expiresAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestMap.get(ip);
  if (!record || record.expiresAt < now) {
    ipRequestMap.set(ip, { count: 1, expiresAt: now + 60_000 });
    return true;
  }
  if (record.count >= 25) {
    return false;
  }
  record.count += 1;
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParseAiJson(rawText: string): any {
  if (!rawText) return null;
  let cleaned = rawText.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    try {
      const sanitized = cleaned
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/[\u0000-\u001F]+/g, " ");
      return JSON.parse(sanitized);
    } catch {
      console.warn("[ai-concierge] standard JSON parse failed, falling back to regex extraction:", e1);
      const analysisMatch = cleaned.match(/"analysis"\s*:\s*"((?:\\.|[^"\\])*)"/);
      const moodMatch = cleaned.match(/"mood"\s*:\s*"((?:\\.|[^"\\])*)"/);
      const genreMatch = cleaned.match(/"genre_slug"\s*:\s*"((?:\\.|[^"\\])*)"/);
      const countryMatch = cleaned.match(/"country_slug"\s*:\s*"((?:\\.|[^"\\])*)"/);

      const movies: Array<{ title: string; original_title?: string; reason?: string }> = [];
      const movieRegex = /\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"(?:[^{}]*?"original_title"\s*:\s*"((?:\\.|[^"\\])*)")?(?:[^{}]*?"reason"\s*:\s*"((?:\\.|[^"\\])*)")?\s*\}/g;
      let m;
      while ((m = movieRegex.exec(cleaned)) !== null) {
        movies.push({
          title: m[1] || "",
          original_title: m[2] || "",
          reason: m[3] || "",
        });
      }

      if (movies.length > 0 || analysisMatch) {
        return {
          analysis: analysisMatch ? analysisMatch[1] : "",
          mood: moodMatch ? moodMatch[1] : "",
          genre_slug: genreMatch ? genreMatch[1] : "",
          country_slug: countryMatch ? countryMatch[1] : "",
          movies,
        };
      }
      return null;
    }
  }
}

export async function GET() {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return NextResponse.json({
    hasServerKey: hasKey,
    activeModel: "Google Gemini 2.0 Flash",
    status: hasKey ? "ready" : "fallback_only",
    cacheSize: AI_RESPONSE_CACHE.size,
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Kiểm tra giới hạn tần suất (Rate Limiting) để chống hao hụt quota
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous_client";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: "Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ 30 giây rồi thử lại để bảo vệ hệ thống.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const prompt: string = body.prompt?.trim() || "";
    const userApiKey: string = body.apiKey?.trim() || "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Vui lòng nhập tâm trạng hoặc sở thích phim của bạn." },
        { status: 400 }
      );
    }

    const intent = parseUserIntent(prompt);

    // 2. KIỂM TRA BỘ NHỚ ĐỆM (CACHE HIT -> TIẾT KIỆM 100% TOKEN)
    const cacheKey = normalizeQuery(prompt);
    const cachedItem = AI_RESPONSE_CACHE.get(cacheKey);
    if (cachedItem && Date.now() - cachedItem.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        reply: cachedItem.reply,
        mood: cachedItem.mood,
        movies: cachedItem.movies,
        provider: cachedItem.provider || "Nana AI",
        cached: true,
      });
    }

    // 2.5 TĂNG TỐC BẰNG SUPABASE PGVECTOR (< 80ms)
    if (!intent.actor && prompt.trim().length >= 3) {
      try {
        const vectorPicks = await searchMoviesBySemantic(prompt, 8, 0.42, userApiKey);
        if (vectorPicks && vectorPicks.length >= 3) {
          const cards: SuggestionCard[] = vectorPicks.map((vp) => ({
            slug: vp.id,
            title: vp.title,
            poster: vp.posterUrl || "/default-poster.jpg",
            year: vp.year,
            quality: vp.quality || "HD",
            category: vp.category || "Phim Hay",
            reason: vp.description ? vp.description.slice(0, 90) + "..." : "Khớp đúng với cảm xúc bạn đang tìm kiếm",
          }));

          const fastPayload = {
            reply: `Nana đã tìm thấy ${cards.length} tác phẩm xuất sắc phù hợp đúng với cảm xúc "${prompt}" của bạn! Chúc bạn thưởng thức vui vẻ nhé ✨`,
            mood: intent.category || "Gợi ý thông minh",
            movies: cards,
            provider: "Supabase Vector Engine",
          };

          AI_RESPONSE_CACHE.set(cacheKey, { ...fastPayload, cachedAt: Date.now() });
          return NextResponse.json(fastPayload);
        }
      } catch (vecErr) {
        console.warn("[ai-concierge] Vector search bypass:", vecErr);
      }
    }

    // Hỗ trợ danh sách nhiều Key phân tách bằng dấu phẩy để tự động xoay vòng khi hết Quota
    const envKeys = (process.env.GEMINI_API_KEY || "")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 5);

    const candidateKeys = Array.from(
      new Set(
        [...envKeys, userApiKey?.trim()].filter(
          (k): k is string => Boolean(k && k.length > 5)
        )
      )
    );

    // 3. NẾU CÓ GEMINI API KEY -> GỌI GEMINI VỚI CÁC MODEL CHUẨN CỦA GOOGLE
    if (candidateKeys.length > 0) {
      try {
        const intentHints: string[] = [];
        if (intent.actor) intentHints.push(`- BẮT BUỘC: Diễn viên chính phải là "${intent.actor}".`);
        if (intent.country) intentHints.push(`- BẮT BUỘC: Phim phải thuộc quốc gia "${intent.countryName || intent.country}".`);
        if (intent.category) intentHints.push(`- Thể loại trọng tâm: "${intent.category}".`);
        const intentInstruction = intentHints.length > 0 ? `\nLƯU Ý ĐẶC BIỆT TỪ YÊU CẦU:\n${intentHints.join("\n")}\n` : "";

        const systemPrompt = `Bạn là Trợ lý Nana (Nana Concierge) - chuyên gia gợi ý phim am hiểu điện ảnh của Nanaflix.
Người dùng: "${prompt}".${intentInstruction}
HÃY GỢI Ý 6 ĐẾN 8 BỘ PHIM XUẤT SẮC, NỔI TIẾNG, CÓ THẬT VÀ PHỔ BIẾN TRÊN CÁC TRANG PHIM VIỆT NAM (PhimAPI, Ophim, Netflix).

QUY TẮC BẮT BUỘC ĐỂ ĐẠT ĐỘ CHÍNH XÁC CAO NHẤT:
1. ĐÚNG 100% YÊU CẦU:
   - Nếu hỏi diễn viên: 100% phim phải do diễn viên đó đóng chính.
   - Nếu hỏi quốc gia: 100% phim phải đúng quốc gia đó.
   - Nếu hỏi thể loại/tâm trạng: chọn đúng tuyệt đối theo cảm xúc người dùng cần.
2. TÊN PHIM CHUẨN ĐỂ TÌM KIẾM:
   - "title": Tên tiếng Việt chính xác và phổ biến nhất (ví dụ: "Ký Sinh Trùng", "Hạ Cánh Nơi Anh", "Người Sắt", "Thần Thoại"). KHÔNG ghi năm hay ngoặc đơn phụ đề vào title.
   - "original_title": Tên gốc chuẩn quốc tế (tiếng Anh/Hàn/Trung, ví dụ: "Parasite", "Crash Landing on You", "Iron Man", "The Myth").
3. LÝ DO GỢI Ý:
   - "reason": 1 câu ngắn gọn, súc tích (dưới 18 từ) chỉ ra điểm đặc sắc nhất.

Trả về DUY NHẤT chuỗi JSON hợp lệ:
{
  "analysis": "1-2 câu ấm áp xưng Nana chia sẻ lý do chọn nhóm phim này cho bạn",
  "mood": "Tên chủ đề hoặc cảm xúc ngắn (ví dụ: Cười Xả Stress, Tình Yêu Lãng Mạn, Hồi Hộp Thót Tim)",
  "actor": "${intent.actor || ""}",
  "genre_slug": "hanh-dong, tinh-cam, hai-huoc, kinh-di, tam-ly, vien-tuong, hoat-hinh, vo-thuat, co-trang",
  "country_slug": "trung-quoc, han-quoc, au-my, nhat-ban, thai-lan, viet-nam, hong-kong, an-do",
  "movies": [
    {
      "title": "Tên tiếng Việt",
      "original_title": "Tên gốc",
      "reason": "Điểm cuốn hút nhất"
    }
  ]
}`;

        const MODELS = [
          "gemini-3.6-flash",
          "gemini-3.5-flash",
        ];

        let geminiText: string | null = null;

        // Tự động xoay vòng Key và thử tuần tự từng Model để tiết kiệm tối đa Quota Free Tier
        keyLoop: for (const currentKey of candidateKeys) {
          try {
            const ai = new GoogleGenAI({ apiKey: currentKey, vertexai: false });
            for (const model of MODELS) {
              try {
                const is35 = model.includes("3.5");
                const res = await Promise.race([
                  ai.models.generateContent({
                    model,
                    contents: systemPrompt,
                    config: {
                      responseMimeType: "application/json",
                      temperature: 0.35,
                      maxOutputTokens: 500,
                      ...(is35
                        ? { thinkingConfig: { thinkingBudget: 0 } }
                        : { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }),
                    },
                  }),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`${model} timeout 10s`)), 10000)
                  ),
                ]);

                const text = res.text?.trim();
                if (text) {
                  geminiText = text;
                  break keyLoop;
                }
              } catch (modelErr) {
                console.warn(
                  `[ai-concierge] ${model} failed with key ${currentKey.slice(0, 10)}...:`,
                  modelErr instanceof Error ? modelErr.message : modelErr
                );
              }
            }
          } catch (keyErr) {
            console.warn(
              "[ai-concierge] Key failed, trying fallback key:",
              keyErr instanceof Error ? keyErr.message : keyErr
            );
          }
        }

        if (geminiText) {
          const parsed = safeParseAiJson(geminiText);
          if (!parsed) throw new Error("Could not parse Gemini JSON response");

          // Hỗ trợ cả 2 định dạng: mảng movies [{title, original_title, reason}] hoặc mảng movie_titles
          type SuggestedItem = { title: string; original_title?: string; reason?: string };
          let suggestedItems: SuggestedItem[] = [];

          if (Array.isArray(parsed.movies) && parsed.movies.length > 0) {
            suggestedItems = parsed.movies.map((m: Record<string, string>) => ({
              title: m.title || "",
              original_title: m.original_title || "",
              reason: m.reason || "",
            }));
          } else if (Array.isArray(parsed.movie_titles) && parsed.movie_titles.length > 0) {
            suggestedItems = parsed.movie_titles.map((t: string, idx: number) => ({
              title: t,
              reason: parsed.reasons?.[idx] || "",
            }));
          }

          const genreSlug: string = parsed.genre_slug || "";
          const countrySlug: string = parsed.country_slug || "";
          const cards: SuggestionCard[] = [];
          const seenSlugs = new Set<string>();

          // Tìm kiếm song song nhanh gọn (tối đa 8 phim)
          const searchTasks = suggestedItems.slice(0, 8).map(async (itemObj) => {
            const cleanTitle = (itemObj.title || "").trim();
            const cleanOriginal = (itemObj.original_title || "").trim();
            const foundItem = await searchSingleMovieFast(cleanTitle, cleanOriginal);

            return {
              item: foundItem,
              fallbackTitle: cleanTitle || cleanOriginal,
              reason: itemObj.reason,
            };
          });

          const searchResults = await Promise.all(searchTasks);

          // 1. Đưa các phim tìm thấy thật sự trong cơ sở dữ liệu lên trước
          for (const r of searchResults) {
            if (r.item && r.item.slug && !seenSlugs.has(r.item.slug)) {
              seenSlugs.add(r.item.slug);
              cards.push({
                slug: r.item.slug,
                title: r.item.name || r.item.title || r.fallbackTitle,
                poster: toSafePoster(r.item),
                year: r.item.year || 2024,
                quality: r.item.quality || "FHD",
                category: r.item.category?.[0]?.name || genreSlug || "Đặc sắc",
                country: toSafeCountry(r.item) || countrySlug || "Quốc tế",
                actors: toSafeActors(r.item),
                reason: r.reason || "Được Nana AI chọn lọc đặc biệt cho bạn",
              });
            }
          }

          // 2. Nếu sau khi tìm kiếm còn ít hơn 6 phim (do một số phim không có trên kho), tự động bổ sung phim hay nhất cùng thể loại/quốc gia/diễn viên
          if (cards.length < 6) {
            try {
              const supplementRes = await movieApi.getMovies({
                keyword: intent.actor || undefined,
                category: genreSlug || intent.category,
                country: countrySlug || intent.country,
                limit: 10,
              });
              if (supplementRes?.items?.length) {
                for (const sItem of supplementRes.items) {
                  if (cards.length >= 8) break;
                  if (sItem.slug && !seenSlugs.has(sItem.slug)) {
                    seenSlugs.add(sItem.slug);
                    cards.push({
                      slug: sItem.slug,
                      title: sItem.name || sItem.title || "Phim Hay",
                      poster: toSafePoster(sItem),
                      year: sItem.year || 2024,
                      quality: sItem.quality || "FHD",
                      category: sItem.category?.[0]?.name || genreSlug || "Đặc sắc",
                      country: toSafeCountry(sItem) || countrySlug || "Quốc tế",
                      actors: toSafeActors(sItem),
                      reason: intent.actor
                        ? `Tác phẩm tiêu biểu có sự tham gia của ${intent.actor} được yêu thích hàng đầu`
                        : "Tác phẩm tiêu biểu cùng thể loại được cộng đồng đánh giá rất cao",
                    });
                  }
                }
              }
            } catch {}
          }

          if (cards.length > 0) {
            const finalPayload = {
              reply:
                parsed.analysis ||
                "Dưới đây là các tác phẩm được Nana AI tuyển chọn kỹ lưỡng dành riêng cho bạn:",
              mood: parsed.mood || "Gợi Ý Cho Bạn",
              movies: cards.slice(0, 14),
              provider: "Nana AI",
            };

            // Lưu vào bộ nhớ đệm để các truy vấn tương tự sau này tốn 0 token
            if (AI_RESPONSE_CACHE.size >= MAX_CACHE_ENTRIES) {
              const oldestKey = AI_RESPONSE_CACHE.keys().next().value;
              if (oldestKey) AI_RESPONSE_CACHE.delete(oldestKey);
            }
            AI_RESPONSE_CACHE.set(cacheKey, { ...finalPayload, cachedAt: Date.now() });

            return NextResponse.json(finalPayload);
          }
        }
      } catch (geminiError) {
        console.warn("Gemini API error, falling back to Semantic Engine:", geminiError);
      }
    }

    // 2. NẾU KHÔNG CÓ GEMINI HOẶC GEMINI QUÁ TẢI (503) -> DÙNG NANAFLIX NEURAL ENGINE (0 TOKEN)
    let movieList: RawMovieItem[] = [];

    // Kiểm tra xem prompt có phải tên phim cụ thể (Avatar, Doraemon, Conan, Naruto) hay câu miêu tả
    const lowerPrompt = prompt.toLowerCase();
    const isDescriptive =
      lowerPrompt.includes("phim") ||
      lowerPrompt.includes("muốn") ||
      lowerPrompt.includes("thích") ||
      lowerPrompt.includes("gợi ý") ||
      lowerPrompt.includes("có ") ||
      lowerPrompt.includes("đẹp") ||
      lowerPrompt.includes("hay") ||
      lowerPrompt.includes("nào") ||
      lowerPrompt.includes("buồn") ||
      lowerPrompt.includes("vui") ||
      lowerPrompt.includes("võ") ||
      lowerPrompt.includes("trung quốc") ||
      lowerPrompt.includes("hàn quốc") ||
      lowerPrompt.includes("xem");



    // ƯU TIÊN 2: Nếu không phải diễn viên và không phải câu miêu tả chung chung, thử tìm theo tên phim
    if (movieList.length === 0 && !isDescriptive && prompt.trim().length > 1) {
      const directSearch = await movieApi.getMovies({
        keyword: prompt.trim(),
        page: 1,
        limit: 8,
      });
      if (directSearch?.items && directSearch.items.length > 0) {
        movieList = directSearch.items as RawMovieItem[];
      }
    }

    // Lọc theo kết hợp Category + Country + Type
    if (movieList.length === 0) {
      const queryParams: Record<string, string | number> = {
        sort: "rating",
        page: 1,
        limit: 16,
      };
      if (intent.category) queryParams.category = intent.category;
      if (intent.country) queryParams.country = intent.country;
      if (intent.type) queryParams.type = intent.type;

      const res = await movieApi.getMovies(queryParams);
      movieList = (res?.items || []) as RawMovieItem[];
    }

    // Nếu kết hợp cả category + country trả về ít hơn 4 phim, nới lỏng tìm theo category
    if (movieList.length < 6 && intent.category) {
      const resCat = await movieApi.getMovies({
        category: intent.category,
        sort: "rating",
        page: 1,
        limit: 14,
      });
      for (const item of (resCat?.items || []) as RawMovieItem[]) {
        if (!movieList.some((m) => m.slug === item.slug)) {
          movieList.push(item);
        }
        if (movieList.length >= 14) break;
      }
    }

    // Nếu vẫn trống, nới lỏng tìm theo country
    if (movieList.length < 6 && intent.country) {
      const resCountry = await movieApi.getMovies({
        country: intent.country,
        sort: "rating",
        page: 1,
        limit: 14,
      });
      for (const item of (resCountry?.items || []) as RawMovieItem[]) {
        if (!movieList.some((m) => m.slug === item.slug)) {
          movieList.push(item);
        }
        if (movieList.length >= 14) break;
      }
    }

    // Bảo đảm luôn có phim gợi ý thịnh hành
    if (movieList.length === 0) {
      const fallbackRes = await movieApi.getMovies({
        sort: "rating",
        page: 1,
        limit: 16,
      });
      movieList = (fallbackRes?.items || []) as RawMovieItem[];
    }

    // Trộn ngẫu nhiên và lấy lên tới 14 phim gợi ý
    const shuffled = movieList.sort(() => 0.5 - Math.random()).slice(0, 14);

    const cards: SuggestionCard[] = shuffled.map((item: RawMovieItem, idx: number) => ({
      slug: item.slug || "",
      title: item.name || item.title || "Phim Hay",
      poster: toSafePoster(item),
      year: item.year || 2024,
      quality: item.quality || "FHD",
      category: item.category?.[0]?.name || "Đặc sắc",
      country: toSafeCountry(item) || intent.country || "",
      actors: toSafeActors(item),
      reason:
        intent.reasons[idx % intent.reasons.length] ||
        "Tác phẩm có cốt truyện hấp dẫn và đánh giá cao",
    }));

    const fallbackPayload = {
      reply: `${intent.defaultAnalysis}`,
      mood: intent.moodLabel,
      movies: cards,
      provider: "Nana AI",
    };

    if (cards.length > 0) {
      AI_RESPONSE_CACHE.set(cacheKey, { ...fallbackPayload, cachedAt: Date.now() });
    }

    return NextResponse.json(fallbackPayload);
  } catch (error) {
    console.error("Lỗi AI Concierge:", error);
    return NextResponse.json(
      {
        reply:
          "Rất tiếc, đã có sự gián đoạn kết nối. Nhưng bạn có thể thử các thể loại phổ biến trên thanh điều hướng nhé!",
        mood: "Gợi ý",
        movies: [],
      },
      { status: 500 }
    );
  }
}
