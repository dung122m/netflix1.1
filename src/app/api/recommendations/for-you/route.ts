import { NextRequest, NextResponse } from "next/server";
import { generateFastAiChat } from "@/services/aiProviderService";
import { fetchMoviesByTitles } from "@/services/aiActorService";
import { normalizeMovie } from "@/lib/movieMedia";
import { movieApi } from "@/services/movieApi";
import { kvCache } from "@/services/kvCacheService";

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

interface TargetCatalogQuery {
  category?: string;
  type?: string;
  displayName: string;
}

// Chuyển đổi tên thể loại (kèm emoji hoặc không dấu) sang slug chuẩn của catalog
function resolveTargetFromGenre(raw: string): TargetCatalogQuery | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (clean.includes("chieu rap") || clean.includes("phim le")) {
    return { type: "phim-le", displayName: "Phim Lẻ Chiếu Rạp" };
  }
  if (clean.includes("phim bo") || clean.includes("series")) {
    return { type: "phim-bo", displayName: "Phim Bộ Đặc Sắc" };
  }
  if (clean.includes("tv show") || clean.includes("truyen hinh")) {
    return { type: "tv-shows", displayName: "TV Shows Thịnh Hành" };
  }

  if (clean.includes("hanh dong") || clean.includes("action")) {
    return { category: "hanh-dong", displayName: "Hành Động" };
  }
  if (clean.includes("hoat hinh") || clean.includes("anime") || clean.includes("manga")) {
    return { category: "hoat-hinh", displayName: "Hoạt Hình / Anime" };
  }
  if (clean.includes("tinh cam") || clean.includes("lang man") || clean.includes("romance")) {
    return { category: "tinh-cam", displayName: "Tình Cảm Lãng Mạn" };
  }
  if (clean.includes("kinh di") || clean.includes("horror") || clean.includes("ma qui") || clean.includes("quy")) {
    return { category: "kinh-di", displayName: "Kinh Dị Kịch Tính" };
  }
  if (clean.includes("vien tuong") || clean.includes("sci fi") || clean.includes("gia tuong")) {
    return { category: "vien-tuong", displayName: "Khoa Học Viễn Tưởng" };
  }
  if (clean.includes("vo thuat") || clean.includes("kungfu") || clean.includes("kiem hiep")) {
    return { category: "vo-thuat", displayName: "Võ Thuật & Kiếm Hiệp" };
  }
  if (clean.includes("hai huoc") || clean.includes("comedy") || clean.includes("phim hai")) {
    return { category: "hai-huoc", displayName: "Hài Hước Giải Trí" };
  }
  if (clean.includes("co trang") || clean.includes("hoang cung")) {
    return { category: "co-trang", displayName: "Cổ Trang Dã Sử" };
  }
  if (clean.includes("hinh su") || clean.includes("trinh tham") || clean.includes("crime") || clean.includes("pha an")) {
    return { category: "hinh-su", displayName: "Trinh Thám & Hình Sự" };
  }
  if (clean.includes("tam ly") || clean.includes("drama")) {
    return { category: "tam-ly", displayName: "Tâm Lý Xã Hội" };
  }
  if (clean.includes("phieu luu") || clean.includes("adventure")) {
    return { category: "phieu-luu", displayName: "Phiêu Lưu Thám Hiểm" };
  }
  if (clean.includes("chien tranh") || clean.includes("war")) {
    return { category: "chien-tranh", displayName: "Chiến Tranh Khốc Liệt" };
  }
  if (clean.includes("tai lieu") || clean.includes("documentary")) {
    return { category: "tai-lieu", displayName: "Phim Tài Liệu" };
  }
  if (clean.includes("bi an") || clean.includes("mystery")) {
    return { category: "bi-an", displayName: "Bí Ẩn Ly Kỳ" };
  }
  if (clean.includes("hoc duong") || clean.includes("school")) {
    return { category: "hoc-duong", displayName: "Học Đường Tuổi Trẻ" };
  }
  if (clean.includes("gia dinh") || clean.includes("family")) {
    return { category: "gia-dinh", displayName: "Gia Đình Ấm Áp" };
  }
  if (clean.includes("am nhac") || clean.includes("music")) {
    return { category: "am-nhac", displayName: "Âm Nhạc" };
  }
  if (clean.includes("the thao") || clean.includes("sport")) {
    return { category: "the-thao", displayName: "Thể Thao Kịch Tính" };
  }
  if (clean.includes("khoa hoc") || clean.includes("science")) {
    return { category: "khoa-hoc", displayName: "Khoa Học Khám Phá" };
  }
  if (clean.includes("than thoai") || clean.includes("mythology")) {
    return { category: "than-thoai", displayName: "Thần Thoại Huyền Bí" };
  }

  const slug = clean.replace(/\s+/g, "-");
  if (CATEGORY_MAP[slug]) {
    return { category: slug, displayName: CATEGORY_MAP[slug].name };
  }

  return null;
}

// Suy luận thể loại trực tiếp từ lịch sử xem (titles & slugs) không cần gọi AI
function inferTargetFromHistory(titles: string[], slugs: string[]): TargetCatalogQuery | null {
  const combined = [...titles, ...slugs].join(" ").toLowerCase();

  if (/anime|hoat[- ]?hinh|manga|conan|doraemon|naruto|one piece|dragon ball|pokemon|ghibli|jujutsu|kimetsu|demon slayer|shin|attack on titan|spy x family/i.test(combined)) {
    return { category: "hoat-hinh", displayName: "Hoạt Hình / Anime" };
  }
  if (/vo[- ]?thuat|kung[- ]?fu|diep van|diệp vấn|chan tu dan|chân tử đan|ly lien kiet|lý liên kiệt|thanh long|thành long|ngo kinh|ngô kinh|sat pha lang|sát phá lang|thai cuc/i.test(combined)) {
    return { category: "vo-thuat", displayName: "Võ Thuật Đỉnh Cao" };
  }
  if (/hanh[- ]?dong|action|john wick|fast|sat thu|sát thủ|dac nhiem|đặc nhiệm|biet doi|biệt đội|ke huy diet|kẻ huỷ diệt|mission impossible|die hard|avengers|gladiator/i.test(combined)) {
    return { category: "hanh-dong", displayName: "Hành Động Kịch Tính" };
  }
  if (/vien[- ]?tuong|sci[- ]?fi|interstellar|inception|matrix|avatar|star wars|du hanh|vũ trụ|nguoi nhen|người nhện|iron man|batman/i.test(combined)) {
    return { category: "vien-tuong", displayName: "Khoa Học Viễn Tưởng" };
  }
  if (/kinh[- ]?di|horror|ma |qui |quỷ|ac mong|ác mộng|conjuring|insidious|annabelle|zombie|xac song|xác sống|train to busan|chuyen tau sinh tu|halloween/i.test(combined)) {
    return { category: "kinh-di", displayName: "Kinh Dị Rùng Rợn" };
  }
  if (/co[- ]?trang|hoang cung|tam quoc|tam quốc|kiem hiep|kiếm hiệp|tay du|tây du|than dieu|anh hung xa dieu/i.test(combined)) {
    return { category: "co-trang", displayName: "Cổ Trang & Kiếm Hiệp" };
  }
  if (/hai[- ]?huoc|phim hai|comedy|chau tinh tri|châu tinh trì|doi bong thieu lam|tuyet dinh kungfu|mr bean/i.test(combined)) {
    return { category: "hai-huoc", displayName: "Hài Hước Giải Trí" };
  }
  if (/tinh[- ]?cam|romance|ha canh noi anh|hạ cánh nơi anh|nang tho|nàng thơ|thanh xuan|ngot ngao|hen ho/i.test(combined)) {
    return { category: "tinh-cam", displayName: "Tình Cảm Lãng Mạn" };
  }
  if (/hinh[- ]?su|trinh[- ]?tham|pha an|phá án|toi pham|tội phạm|canh sat|cảnh sát|se7en|tham tu|thám tử|sherlock/i.test(combined)) {
    return { category: "hinh-su", displayName: "Trinh Thám & Hình Sự" };
  }
  if (/tam[- ]?ly|drama|parasite|ky sinh trung|ký sinh trùng|shawshank|bo gia|bố già|godfather|green book|forrest gump|titanic/i.test(combined)) {
    return { category: "tam-ly", displayName: "Tâm Lý Xã Hội" };
  }
  if (/chien[- ]?tranh|war|saving private ryan|1917|dunkirk/i.test(combined)) {
    return { category: "chien-tranh", displayName: "Chiến Tranh Khốc Liệt" };
  }

  return null;
}

// In-memory cache cho kết quả phân tích AI (tránh gọi LLM lặp lại cho cùng nhóm phim)
const AI_PREF_CACHE = new Map<string, TargetCatalogQuery>();

// AI chỉ phân tích gu phim thành 1 category/topic ngắn (dưới 80 tokens, không sinh danh sách phim)
async function analyzePreferencesWithAi(watchedTitles: string[]): Promise<TargetCatalogQuery | null> {
  if (!watchedTitles || watchedTitles.length === 0) return null;

  const cacheKey = watchedTitles.slice(0, 5).sort().join("|").toLowerCase();
  const memoryHit = AI_PREF_CACHE.get(cacheKey);
  if (memoryHit) return memoryHit;

  try {
    const systemPrompt = `Bạn là hệ thống phân loại gu điện ảnh Nanaflix.
Dựa vào phim người dùng đã xem, hãy chọn DUY NHẤT 1 thể loại phù hợp nhất từ danh sách:
[hanh-dong, tinh-cam, co-trang, tam-ly, hai-huoc, hoat-hinh, kinh-di, vien-tuong, vo-thuat, phieu-luu, hinh-su]
Chỉ trả về DUY NHẤT một chuỗi JSON theo định dạng:
{ "category": "slug_the_loai", "displayName": "Tên thể loại" }`;

    const userPrompt = `Lịch sử xem: ${watchedTitles.slice(0, 5).join(", ")}`;
    const aiRes = await generateFastAiChat({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
      maxTokens: 80,
      jsonMode: true,
      timeoutMs: 2500,
    });

    if (aiRes && aiRes.text) {
      const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.category && CATEGORY_MAP[parsed.category]) {
        const result: TargetCatalogQuery = {
          category: parsed.category,
          displayName: parsed.displayName || CATEGORY_MAP[parsed.category].name,
        };
        AI_PREF_CACHE.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn("[for-you recommendations] AI preference classification fallback:", err);
  }
  return null;
}

// Danh sách hạt giống các siêu phẩm điện ảnh kinh điển (dùng riêng cho fallback cũ)
const MASTERPIECE_BLOCKBUSTERS = [
  "Ký Sinh Trùng (Parasite, 2019)",
  "Hố Đen Tử Thần (Interstellar, 2014)",
  "Chuyến Tàu Sinh Tử (Train to Busan, 2016)",
  "Diệp Vấn (Ip Man, 2008)",
  "Đại Thoại Tây Du (A Chinese Odyssey, 1995)",
  "Đội Bóng Thiếu Lâm (Shaolin Soccer, 2001)",
  "Hạ Cánh Nơi Anh (Crash Landing on You, 2019)",
  "Thanh Gươm Diệt Quỷ: Chuyến Tàu Vô Tận (Demon Slayer: Mugen Train, 2020)",
  "Hoắc Nguyên Giáp (Fearless, 2006)",
  "Khởi Nguồn (Inception, 2010)",
  "Tuyệt Đỉnh Kungfu (Kung Fu Hustle, 2004)",
  "Sát Phá Lang (SPL: Kill Zone, 2005)",
  "Kỵ Sĩ Bóng Đêm (The Dark Knight, 2008)",
  "Vùng Đất Linh Hồn (Spirited Away, 2001)",
  "Avatar (2009)",
  "Titanic (1997)",
  "Bố Già (The Godfather, 1972)",
  "Cuộc Chiến Vô Cực (Avengers: Infinity War, 2018)",
  "Ma Trận (The Matrix, 1999)",
  "Võ Sĩ Giác Đấu (Gladiator, 2000)",
];

// Fallback cũ: Chỉ gọi khi flow catalog trực tiếp không đủ phim hoặc lỗi
async function executeLegacyAiTitlesFallback({
  targetTopic,
  matchContext,
  isBroadCurated,
  watchedSet,
  kvForYouKey,
}: {
  targetTopic: string;
  matchContext: string;
  isBroadCurated: boolean;
  watchedSet: Set<string>;
  kvForYouKey: string;
}) {
  let aiRecommendedTitles: Array<{ title: string; whyMatch: string; matchScore: number }> = [];

  try {
    const systemPrompt = `Bạn là Chuyên gia Tuyển chọn Điện ảnh Đẳng cấp Quốc tế (Master Cinema Curator) của Nanaflix.
Nhiệm vụ của bạn: Khi nhận được yêu cầu tuyển chọn, hãy đề xuất 16 đến 20 tác phẩm điện ảnh/truyền hình THỰC SỰ XUẤT SẮC, NỔI TIẾNG, ĐƯỢC KHÁN GIẢ ĐÁNH GIÁ CỰC CAO (IMDb cao, phim chiếu rạp kinh điển, siêu phẩm ăn khách) thuộc nhiều quốc gia (Việt Nam, Hàn Quốc, Hollywood, Hồng Kông...).
Tránh việc chỉ tập trung vào duy nhất 1 quốc gia hay 1 đạo diễn, hãy tạo danh sách phong phú, hấp dẫn.
Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "recommendations": [
    {
      "title": "Tên phim tiếng Việt kèm tên gốc tiếng Anh và năm phát hành trong ngoặc đơn (vd: Kẻ Đánh Cắp Giấc Mơ (Inception, 2010), Diệp Vấn (Ip Man, 2008))",
      "whyMatch": "Lý do ngắn gọn vì sao bộ phim này đáng xem (1 câu ngắn)",
      "matchScore": 98
    }
  ]
}`;

    const userPrompt = isBroadCurated
      ? `Hãy tuyển chọn 16-20 bộ phim xuất sắc và ăn khách nhất cho chủ đề: "${targetTopic}".`
      : `Người dùng quan tâm: "${targetTopic}". Hãy chọn ra 16-20 tác phẩm điện ảnh xuất sắc, đa dạng và hấp dẫn nhất.`;

    const aiRes = await generateFastAiChat({
      systemPrompt,
      userPrompt,
      temperature: 0.35,
      maxTokens: 1000,
      jsonMode: true,
      timeoutMs: 5000,
    });

    if (aiRes && aiRes.text) {
      const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
      if (Array.isArray(parsed.recommendations)) {
        aiRecommendedTitles = parsed.recommendations;
      }
    }
  } catch (err) {
    console.warn("[for-you recommendations] Legacy AI generation fallback err:", err);
  }

  if (aiRecommendedTitles.length < 12) {
    const existingTitles = new Set(aiRecommendedTitles.map((r) => r.title.toLowerCase()));
    for (const t of MASTERPIECE_BLOCKBUSTERS) {
      if (!existingTitles.has(t.toLowerCase())) {
        aiRecommendedTitles.push({
          title: t,
          whyMatch: "Siêu phẩm điện ảnh kinh điển được yêu thích nhất",
          matchScore: Math.floor(Math.random() * 5) + 94,
        });
        existingTitles.add(t.toLowerCase());
      }
      if (aiRecommendedTitles.length >= 20) break;
    }
  }

  const titlesToFetch = aiRecommendedTitles.map((r) => r.title).filter(Boolean);
  const resolvedRawMovies = await fetchMoviesByTitles(titlesToFetch, 20);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recommendedMovies: any[] = [];
  const seenSlugs = new Set<string>();

  for (const raw of resolvedRawMovies) {
    const norm = normalizeMovie(raw);
    if (!norm.slug || watchedSet.has(norm.slug.toLowerCase()) || seenSlugs.has(norm.slug.toLowerCase())) {
      continue;
    }
    seenSlugs.add(norm.slug.toLowerCase());

    const matchMeta = aiRecommendedTitles.find((r) => {
      const rt = (r.title || "").toLowerCase();
      const viOnly = rt.replace(/\([^)]*\)/g, "").trim();
      const matchParen = rt.match(/\(([^)]+)\)/);
      const engOnly = (matchParen ? matchParen[1] : "").toLowerCase().replace(/\b\d{4}\b/g, "").replace(/,/g, "").trim();
      const nt = (norm.title || "").toLowerCase();
      const no = (norm.origin_name || "").toLowerCase();

      return (
        (viOnly && (nt.includes(viOnly) || viOnly.includes(nt) || no.includes(viOnly) || viOnly.includes(no))) ||
        (engOnly && (nt.includes(engOnly) || engOnly.includes(nt) || no.includes(engOnly) || engOnly.includes(no)))
      );
    });

    recommendedMovies.push({
      slug: norm.slug,
      name: norm.title,
      title: norm.title,
      origin_name: norm.origin_name,
      poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
      thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
      year: norm.year,
      quality: norm.quality || "Full HD",
      category: [{ name: norm.genre || "Siêu Phẩm" }],
      matchPercentage: matchMeta?.matchScore || (Math.floor(Math.random() * 5) + 92),
      matchReason: matchMeta?.whyMatch || `Cùng đẳng cấp với ${targetTopic}`,
    });

    if (recommendedMovies.length >= 16) break;
  }

  if (recommendedMovies.length > 0) {
    kvCache.set(
      kvForYouKey,
      { context: matchContext, movies: recommendedMovies },
      6 * 3600
    ).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    context: matchContext,
    items: recommendedMovies,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      genres = [],
      watchedTitles = [],
      watchedSlugs = [],
      refreshSeed = 0,
      currentSlugs = [],
    } = body || {};

    const watchedSet = new Set<string>([
      ...watchedSlugs.map((s: string) => s.toLowerCase()),
      ...((currentSlugs as string[]) || []).map((s: string) => s.toLowerCase()),
    ]);

    const hasRichHistory = Array.isArray(watchedTitles) && watchedTitles.length >= 3;
    const hasFavoriteGenres = Array.isArray(genres) && genres.length > 0;
    const seed = Number(refreshSeed) || 0;

    let targetQuery: TargetCatalogQuery | null = null;
    let matchContext = "Tuyển tập siêu phẩm thịnh hành được đánh giá cao nhất";
    let isBroadCurated = false;

    // =========================================================================
    // 1. XÁC ĐỊNH GENRE / CATEGORY / TOPIC TỪ LỊCH SỬ XEM & HỒ SƠ
    // Không cho AI sinh danh sách titles, chỉ chọn category chuẩn để query catalog
    // =========================================================================
    if (hasRichHistory) {
      const seedMod = seed % 3;
      if (seedMod === 0) {
        // Ưu tiên 1: Tự động suy luận thể loại trực tiếp từ lịch sử xem
        targetQuery = inferTargetFromHistory(watchedTitles, watchedSlugs);
        if (!targetQuery && hasFavoriteGenres) {
          targetQuery = resolveTargetFromGenre(genres[seed % genres.length]);
        }
        if (!targetQuery) {
          targetQuery = await analyzePreferencesWithAi(watchedTitles);
        }
        matchContext = targetQuery
          ? `Tuyển tập ${targetQuery.displayName} chuẩn gu dựa trên lịch sử xem của bạn`
          : "Dựa trên các thể loại bạn quan tâm & lịch sử xem gần đây";
      } else if (seedMod === 1 && hasFavoriteGenres) {
        // Ưu tiên 2: Thể loại yêu thích đã chọn trong profile
        targetQuery = resolveTargetFromGenre(genres[seed % genres.length]);
        if (!targetQuery) {
          targetQuery = inferTargetFromHistory(watchedTitles, watchedSlugs);
        }
        matchContext = targetQuery
          ? `Tuyển tập đỉnh cao ${targetQuery.displayName} dành riêng cho bạn`
          : "Tuyển tập đỉnh cao theo sở thích của bạn";
      } else {
        // Ưu tiên 3: Phong cách tương đồng tác phẩm gần nhất
        targetQuery = inferTargetFromHistory(watchedTitles, watchedSlugs);
        if (!targetQuery) {
          targetQuery = await analyzePreferencesWithAi(watchedTitles);
        }
        if (!targetQuery && hasFavoriteGenres) {
          targetQuery = resolveTargetFromGenre(genres[seed % genres.length]);
        }
        matchContext = targetQuery
          ? `Khám phá các kiệt tác ${targetQuery.displayName} cùng phong cách bạn quan tâm`
          : "Khám phá các kiệt tác điện ảnh cùng phong cách bạn quan tâm";
      }
    } else if (hasFavoriteGenres) {
      targetQuery = resolveTargetFromGenre(genres[seed % genres.length]);
      matchContext = targetQuery
        ? `Tuyển tập đỉnh cao ${targetQuery.displayName} theo sở thích của bạn`
        : "Tuyển chọn chuẩn gu cho bạn";
    } else {
      isBroadCurated = true;
      const guestThemes: TargetCatalogQuery[] = [
        { type: "phim-le", displayName: "Siêu phẩm chiếu rạp & kiệt tác điện ảnh quốc tế" },
        { category: "hanh-dong", displayName: "Hành động & Võ thuật đỉnh cao kịch tính" },
        { category: "hinh-su", displayName: "Trinh thám hình sự & Bí ẩn ly kỳ" },
        { category: "vien-tuong", displayName: "Khoa học viễn tưởng & Hack não kinh điển" },
        { category: "hoat-hinh", displayName: "Hoạt hình, Anime & Chữa lành tâm hồn" },
      ];
      targetQuery = guestThemes[seed % guestThemes.length];
      matchContext = targetQuery.displayName;
    }

    // =========================================================================
    // 2. KIỂM TRA CLOUDFLARE KV CACHE
    // =========================================================================
    const topicKey = targetQuery?.category || targetQuery?.type || "trending";
    const page = (seed % 5) + 1;
    const kvForYouKey = `foryou:catalog:${topicKey}:p${page}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedPool = await kvCache.get<{ context: string; movies: any[] }>(kvForYouKey);
    if (cachedPool && Array.isArray(cachedPool.movies) && cachedPool.movies.length > 0) {
      const filtered = cachedPool.movies.filter(
        (m) => m && m.slug && !watchedSet.has(m.slug.toLowerCase())
      );
      if (filtered.length >= 8) {
        return NextResponse.json({
          success: true,
          context: cachedPool.context || matchContext,
          items: filtered.slice(0, 16),
          cached: true,
        });
      }
    }

    // =========================================================================
    // 3. QUERY TRỰC TIẾP TỪ CATALOG MOVIEAPI HIỆN CÓ
    // Chỉ 1 request tới PhimAPI/NguonC thay vì 14-28 request tìm từng tên phim
    // =========================================================================
    try {
      const catalogRes = await movieApi.getMovies({
        category: targetQuery?.category,
        type: targetQuery?.type,
        page,
        limit: 20,
        sort: "views",
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const catalogMovies: any[] = [];
      const seenSlugs = new Set<string>();

      for (const raw of catalogRes?.items || []) {
        const norm = normalizeMovie(raw);
        if (!norm.slug || watchedSet.has(norm.slug.toLowerCase()) || seenSlugs.has(norm.slug.toLowerCase())) {
          continue;
        }
        seenSlugs.add(norm.slug.toLowerCase());

        const matchScore = Math.floor(Math.random() * 5) + 94; // 94% - 98%
        const displayCategory = targetQuery?.displayName || norm.genre || "Đề Xuất";
        const matchReason = hasRichHistory
          ? `Chuẩn gu ${displayCategory} dựa trên phim bạn đã xem`
          : hasFavoriteGenres
          ? `Tuyển tập đỉnh cao ${displayCategory} chuẩn sở thích của bạn`
          : `Siêu phẩm ăn khách phù hợp xu hướng điện ảnh`;

        catalogMovies.push({
          slug: norm.slug,
          name: norm.title,
          title: norm.title,
          origin_name: norm.origin_name,
          poster_url: norm.posterUrl || norm.imageUrl || "/default-poster.jpg",
          thumb_url: norm.thumbUrl || norm.posterUrl || "/default-hero.jpg",
          year: norm.year,
          quality: norm.quality || "Full HD",
          category: [{ name: norm.genre || displayCategory }],
          matchPercentage: matchScore,
          matchReason,
        });

        if (catalogMovies.length >= 16) break;
      }

      if (catalogMovies.length >= 8) {
        kvCache.set(
          kvForYouKey,
          {
            context: matchContext,
            movies: catalogMovies,
          },
          6 * 3600
        ).catch(() => {});

        return NextResponse.json({
          success: true,
          context: matchContext,
          items: catalogMovies,
          cached: false,
        });
      }
    } catch (catalogErr) {
      console.warn("[for-you recommendations] Catalog query error, trying fallback:", catalogErr);
    }

    // =========================================================================
    // 4. FALLBACK: NẾU CATALOG KHÔNG ĐỦ KẾT QUẢ, DÙNG LOGIC RECOMMENDATION CŨ
    // Giữ nguyên tính năng, không làm mất chức năng của người dùng
    // =========================================================================
    return await executeLegacyAiTitlesFallback({
      targetTopic: targetQuery?.displayName || "Siêu phẩm điện ảnh xuất sắc",
      matchContext,
      isBroadCurated,
      watchedSet,
      kvForYouKey,
    });
  } catch (err) {
    console.error("[for-you recommendations] Error:", err);
    return NextResponse.json({ success: false, items: [] }, { status: 500 });
  }
}

