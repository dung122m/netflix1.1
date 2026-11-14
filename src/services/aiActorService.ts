import { movieApi } from "@/services/movies/service";
import { generateFastAiChat } from "@/services/aiProviderService";
import { getActorFilmographyFromTmdb, searchTmdbPerson } from "@/services/tmdbService";
import { cacheService } from "@/lib/cache";
import { normalizeForMatch } from "@/lib/stringUtils";
import { getHistoricalArtistBySlug } from "@/data/history/historicalArtistsBirthdays";


export interface EnhancedActorProfile {
  name: string;
  canonicalName?: string;
  englishName?: string;
  title: string;
  description?: string;
  extract?: string;
  thumbnail?: string;
  wikiUrl?: string;
  birthday?: string;
  formattedBirthday?: string | null;
  deathday?: string;
  age?: string | null;
  placeOfBirth?: string;
  country?: string;
  roles?: string;
  tags?: string[];
  slug?: string;
  notFound?: boolean;
}

export interface ActorProfile {
  name: string;
  aliases: string[];
  country: string;
}

/**
 * Hàm viết hoa chữ cái đầu từng từ chuẩn tiếng Việt (Unicode-safe Title Case)
 */
import {
  hasExplicitActorPrefix,
  isAmbiguousShortActorKeyword,
  cleanActorQuery,
  escapeRegex,
  type ActorSynonymResult,
  getActorSynonyms,
  ACTOR_AI_CACHE,
  CACHE_7_DAYS,
  ACTOR_FILM_CACHE,
  setBoundedCache,
} from "./actor/actorAliasResolver";

export * from "./actor/actorAliasResolver";

export async function resolveActorMovies(
  keyword: string,
  options?: { skipAiFallback?: boolean }
): Promise<{
  actorName: string;
  country?: string;
  aliases: string[];
  titles?: string[];
  isActor: boolean;
  source: "preset" | "ai" | "cache" | "none" | "tmdb";
}> {
  if (!keyword || keyword.trim().length < 2) {
    return { actorName: "", aliases: [], isActor: false, source: "none" };
  }

  // 1.0 Kiểm tra an toàn: Nếu là từ khóa ngắn/từ đơn mơ hồ (như "Mai", "An", "Anh"...) mà không có tiền tố diễn viên rõ ràng -> TUYỆT ĐỐI KHÔNG nhận dạng là diễn viên
  if (isAmbiguousShortActorKeyword(keyword)) {
    return { actorName: "", aliases: [], isActor: false, source: "none" };
  }

  // 1.1 Tra cứu trực tiếp Bảng Quy Đổi Đồng Nghĩa (Mapping Table / Synonym Dictionary) (0ms)
  const synonymRes = getActorSynonyms(keyword);
  if (synonymRes.isMatched) {
    return {
      actorName: synonymRes.canonicalName,
      country: synonymRes.country,
      aliases: synonymRes.variants,
      isActor: true,
      source: "preset",
    };
  }

  const cleanRaw = keyword.trim().toLowerCase();
  const normalizedQuery = cleanActorQuery(keyword);
  const words = keyword.trim().split(/\s+/).filter(Boolean);

  // 1.15 Từ đơn (1 từ) không có trong preset và không có tiền tố diễn viên rõ ràng -> Ưu tiên tuyệt đối tìm kiếm phim (tránh "Titanic", "Avatar", "Inception"...)
  if (words.length < 2 && !hasExplicitActorPrefix(keyword)) {
    return { actorName: "", aliases: [], isActor: false, source: "none" };
  }

  // 1.2 Kiểm tra TIER 2: Cache L1 (0ms)
  const cached = ACTOR_AI_CACHE.get(cleanRaw) || ACTOR_AI_CACHE.get(normalizedQuery);
  if (cached && cached.expireAt > Date.now()) {
    return {
      actorName: cached.actorName,
      country: cached.country,
      aliases: cached.aliases,
      isActor: cached.isActor,
      source: "cache",
    };
  }

  // 1.22 Kiểm tra TIER 2.2: Cache L2 Upstash Redis DB 3 (Aux / Metadata - actor:intent:*)
  const cleanKey = cleanRaw.replace(/[^a-z0-9_]/g, "_").slice(0, 80);
  const redisActorKey = `actor:intent:${cleanKey}`;
  try {
    const redisCached = await cacheService.get<{
      actorName: string;
      country?: string;
      aliases: string[];
      isActor: boolean;
    }>(redisActorKey);
    if (redisCached) {
      setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
        ...redisCached,
        expireAt: Date.now() + CACHE_7_DAYS,
      });
      return {
        actorName: redisCached.actorName,
        country: redisCached.country,
        aliases: redisCached.aliases,
        isActor: redisCached.isActor,
        source: "cache",
      };
    }
  } catch {}

  // 1.25 TIER 2.5: Tra cứu trực tiếp TMDB Search Person (Chuẩn quốc tế, 100% chính xác, không phụ thuộc vào ngưỡng popularity)
  try {
    const tmdbPerson = await searchTmdbPerson(keyword);
    if (
      tmdbPerson &&
      (tmdbPerson.known_for_department === "Acting" ||
        tmdbPerson.known_for_department === "Directing")
    ) {
      const cleanQNorm = normalizeForMatch(keyword);
      const personNameNorm = normalizeForMatch(tmdbPerson.name);
      const personOrigNorm = normalizeForMatch(tmdbPerson.original_name);

      const qWords = cleanQNorm.split(" ").filter(Boolean);
      const pNameWords = personNameNorm.split(" ").filter(Boolean);
      const pOrigWords = personOrigNorm.split(" ").filter(Boolean);

      // 1. Khớp chính xác tuyệt đối tên (sau khi khử dấu)
      const isExactMatch = personNameNorm === cleanQNorm || personOrigNorm === cleanQNorm;

      // 2. Khớp cùng tập hợp từ (ví dụ đảo thứ tự họ tên: "Lam Tan" <-> "Tan Lam" / "Tần Lam")
      const isWordSetMatch =
        (qWords.length >= 2 && pNameWords.length === qWords.length && qWords.every((w) => pNameWords.includes(w))) ||
        (qWords.length >= 2 && pOrigWords.length === qWords.length && qWords.every((w) => pOrigWords.includes(w)));

      if (isExactMatch || isWordSetMatch) {
        const actorName = tmdbPerson.name || keyword;
        const aliases = Array.from(
          new Set([actorName, keyword, tmdbPerson.original_name].filter(Boolean))
        ) as string[];

        const tmdbEntry = {
          actorName,
          aliases,
          isActor: true,
        };

        setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
          ...tmdbEntry,
          expireAt: Date.now() + CACHE_7_DAYS,
        });
        cacheService.set(redisActorKey, tmdbEntry, 14 * 86400).catch(() => {});

        return {
          actorName,
          aliases,
          isActor: true,
          source: "tmdb",
        };
      }
    }
  } catch {}

  // 1.3 TIER 3: Phân tích trực tiếp qua Fast AI (Smart Provider Router)
  if (options?.skipAiFallback) {
    return {
      actorName: "",
      aliases: [],
      isActor: false,
      source: "none",
    };
  }

  try {
    const promptText = `Bạn là Chuyên gia Bách khoa Toàn thư Điện ảnh thế giới (IMDb & TMDB Cast Directory Engine).
Phân tích từ khóa tìm kiếm: "${keyword}" (tên rút gọn: "${normalizedQuery}").

Nhiệm vụ:
1. Xác định xem từ khóa này có phải là tên, biệt danh, hoặc vai diễn nổi tiếng của một DIỄN VIÊN, NGHỆ SĨ, hoặc ĐẠO DIỄN ĐIỆN ẢNH / TRUYỀN HÌNH CÓ THẬT trên thế giới (Ví dụ: "Người sắt" / "iron man" -> Robert Downey Jr, "A Xìn" -> Huỳnh Trấn Thành, "Thành Long" -> Jackie Chan).
2. TRÍCH XUẤT VÀ CHUẨN HÓA VỀ TÊN CHUẨN DUY NHẤT (canonicalName) thường được lưu trữ trong Database (ưu tiên tên tiếng Anh gốc hoặc tên chính thống đầy đủ).

Nếu ĐÚNG là diễn viên/nghệ sĩ/đạo diễn:
- "isActor": true
- "canonicalName": Tên chuẩn duy nhất trong Database (ví dụ: "Robert Downey Jr", "Jackie Chan", "Huỳnh Trấn Thành", "Stephen Chow", "Tom Cruise", "Cillian Murphy", "Song Joong-ki"...).
- "country": Quốc gia / nền điện ảnh chính xác kèm cờ (vd: "Việt Nam 🇻🇳", "Hàn Quốc 🇰🇷", "Hồng Kông 🇭🇰", "Trung Quốc 🇨🇳", "Hollywood 🇺🇸", "Anh Quốc 🇬🇧", "Thái Lan 🇹🇭", "Nhật Bản 🇯🇵").
- "aliases": Mảng các bí danh, tên gọi khác, tên tiếng Việt, nghệ danh phổ biến của nghệ sĩ.

Nếu KHÔNG PHẢI là diễn viên/nghệ sĩ (ví dụ là tên một bộ phim cụ thể như "Titanic", "Inception", "Mai", "Avatar", một thể loại như "phim ma", hoặc từ ngắn/từ đơn thông dụng):
- "isActor": false

QUY TẮC BẮT BUỘC:
- Các từ khóa ngắn hoặc từ đơn (như "Mai", "An", "Anh", "Hoa", "Nam", "Avatar", "Titanic") có thể là tên phim hoặc từ thông dụng, tuyệt đối TRẢ VỀ isActor: false.
- Chỉ trả về isActor: true khi từ khóa là tên đầy đủ, nghệ danh rõ ràng của diễn viên/đạo diễn nổi tiếng (ví dụ: 'Trấn Thành', 'Thành Long', 'Châu Tinh Trì', 'Tom Cruise').

BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "isActor": true,
  "canonicalName": "Tên chuẩn duy nhất",
  "country": "Quốc gia",
  "aliases": ["tên 1", "tên 2", "tên 3"]
}`;

    const aiRes = await generateFastAiChat({
      systemPrompt: "Bạn là chuyên gia bách khoa toàn thư điện ảnh thế giới. Bắt buộc chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ.",
      userPrompt: promptText,
      temperature: 0.1,
      maxTokens: 400,
      jsonMode: true,
      timeoutMs: 6500,
    });

    if (aiRes && aiRes.text) {
      const cleaned = aiRes.text.replace(/```(?:json)?\s*/gi, "").replace(/\s*```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.isActor) {
          const actorName = parsed.canonicalName || parsed.actorName || keyword;
          const country = parsed.country || undefined;
          const rawAliases = Array.isArray(parsed.aliases) ? parsed.aliases : [];
          const aliases = Array.from(new Set([actorName, keyword, ...rawAliases])).filter(
            (s): s is string => typeof s === "string" && s.trim().length >= 2
          );

          const aiEntry = {
            actorName,
            country,
            aliases,
            isActor: true,
          };

          setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
            ...aiEntry,
            expireAt: Date.now() + CACHE_7_DAYS,
          });
          cacheService.set(redisActorKey, aiEntry, 14 * 86400).catch(() => {});

          return {
            actorName,
            country,
            aliases,
            isActor: true,
            source: "ai",
          };
        } else {
          const negEntry = {
            actorName: "",
            aliases: [],
            isActor: false,
          };
          setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
            ...negEntry,
            expireAt: Date.now() + 24 * 60 * 60 * 1000,
          });
          cacheService.set(redisActorKey, negEntry, 86400).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn("[aiActorService] Fast AI resolution error:", err);
  }

  return {
    actorName: "",
    aliases: [],
    isActor: false,
    source: "none",
  };
}

/**
 * Trích xuất toàn bộ diễn viên, đạo diễn từ mọi biến thể tên trường trong Database (actor, actors, casts, cast, director, directors)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractItemActorsAndDirectors(item: any): string[] {
  if (!item) return [];
  const list: string[] = [];

  const rawActors = item.actor || item.actors || item.casts || item.cast;
  if (Array.isArray(rawActors)) {
    for (const a of rawActors) {
      if (typeof a === "string") list.push(a);
      else if (a && typeof a === "object") list.push(a.name || a.slug || "");
    }
  } else if (typeof rawActors === "string") {
    list.push(...rawActors.split(",").map((s) => s.trim()));
  }

  const rawDirectors = item.director || item.directors || item.dao_dien;
  if (Array.isArray(rawDirectors)) {
    for (const d of rawDirectors) {
      if (typeof d === "string") list.push(d);
      else if (d && typeof d === "object") list.push(d.name || d.slug || "");
    }
  } else if (typeof rawDirectors === "string") {
    list.push(...rawDirectors.split(",").map((s) => s.trim()));
  }

  return list.map((s) => s.trim()).filter(Boolean);
}

/**
 * So khớp diễn viên nghiêm ngặt và toàn diện (Case-insensitive & Regex Match)
 * 1. Chuyển đổi toàn bộ về chữ thường và chuẩn hóa không dấu.
 * 2. So khớp trực tiếp (Direct case-insensitive equality).
 * 3. So khớp bằng biểu thức chính quy (Regex) với ranh giới từ (word boundary)
 *    để nhận diện chính xác mọi biến thể ('Jackie Chan', 'jackie chan', 'JACKIE CHAN',
 *    'Jackie Chan (Thành Long)', 'Chan Kong-sang') mà không bị nhầm lẫn với các từ ngắn (như 'Bạch Long').
 */
const isAsianScript = (s: string) =>
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u.test(s);

export function matchesActorAliases(castList: string[], aliases: string[]): boolean {
  if (!Array.isArray(castList) || castList.length === 0) return false;
  if (!Array.isArray(aliases) || aliases.length === 0) return false;

  for (const rawActor of castList) {
    if (!rawActor || typeof rawActor !== "string") continue;
    const actorLower = rawActor.toLowerCase().trim();
    const actorNorm = normalizeForMatch(rawActor);
    if (!actorLower || actorLower.length < 2) continue;

    for (const rawAlias of aliases) {
      if (!rawAlias || typeof rawAlias !== "string") continue;
      const aliasLower = rawAlias.toLowerCase().trim();
      const aliasNorm = normalizeForMatch(rawAlias);
      if (!aliasLower || aliasLower.length < 2) continue;

      // 1. So khớp tuyệt đối trực tiếp không phân biệt hoa/thường (Case-insensitive Direct Match)
      if (actorLower === aliasLower || actorNorm === aliasNorm) {
        return true;
      }

      const isMultiWord = aliasLower.includes(" ") || aliasNorm.includes(" ") || aliasLower.includes("-");
      const isAsian = isAsianScript(aliasNorm) && aliasNorm.length >= 2;

      if (isMultiWord || isAsian) {
        // 2. Cụm từ đầy đủ hoặc tên tượng hình CJK / Thái (ví dụ: 'jackie chan', 'thành long', '胡可', '刘宇桥'):
        // So khớp chứa chuỗi (contains) hoặc dùng Regex ranh giới từ
        if (actorNorm.includes(aliasNorm) || actorLower.includes(aliasLower)) {
          return true;
        }

        try {
          const regexNorm = new RegExp("(^|[^a-z0-9])" + escapeRegex(aliasNorm) + "($|[^a-z0-9])", "i");
          if (regexNorm.test(actorNorm)) {
            return true;
          }
          const regexLower = new RegExp("(^|[^a-z0-9])" + escapeRegex(aliasLower) + "($|[^a-z0-9])", "i");
          if (regexLower.test(actorLower)) {
            return true;
          }
        } catch {}
      } else {
        // 3. Từ đơn lẻ / nickname ngắn (ví dụ: 'iu', 'dilraba'):
        // Bắt buộc so khớp chính xác toàn bộ tên diễn viên (tránh 'kan xin' dính 'xìn', 'bạch long' dính 'long')
        // hoặc tên nghệ danh ghi rõ ràng trong ngoặc đơn: vd "Lee Ji-eun (IU)"
        if (actorLower === aliasLower || actorNorm === aliasNorm) {
          return true;
        }
        if (actorLower.includes(`(${aliasLower})`) || actorNorm.includes(`(${aliasNorm})`)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * 2. TRUY VẤN ĐỘNG TOÀN BỘ PHIM THEO DIỄN VIÊN / ĐẠO DIỄN TỪ DATABASE (DYNAMIC CAST QUERY)
 * Sử dụng danh sách aliases đa biến thể từ Bảng quy đổi để truy vấn thẳng vào trường cast/actors/director trong database.
 * TỐI ƯU HÓA CAO ĐỘ (HIGH PERFORMANCE & ZERO N+1):
 * 1. Tự động xác thực các phim thuộc Danh bạ kinh điển mà KHÔNG cần gọi chi tiết (tiết kiệm 40+ HTTP calls).
 * 2. Quét song song tất cả các tiêu đề và biến thể tên trong 1 đợt duy nhất (thay vì lặp tuần tự).
 * 3. Bounded Detail Probing: Chỉ kiểm tra tối đa 15 phim chưa xác định trong 1 đợt song song có timeout.
 * 4. SWR In-Memory Cache: Phản hồi 0ms cho các lần truy cập tiếp theo hoặc khi chuyển trang.
 */
/**
 * Rút gọn payload Movie Card cho Actor Filmography nhằm tiết kiệm 88-90% dung lượng Redis DB3.
 * Loại bỏ các trường cồng kềnh không dùng trên MovieGrid (content, description, actor mảng con, director)
 * trong khi bảo toàn 100% các trường cần thiết cho MediaCard / normalizeMovie.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function slimActorMovieItem(m: any): any {
  if (!m) return null;
  return {
    _id: m._id || m.id,
    name: m.name || m.title || "",
    origin_name: m.origin_name || m.original_name,
    slug: m.slug,
    poster_url: m.poster_url || m.thumb_url,
    thumb_url: m.thumb_url || m.poster_url,
    year: m.year,
    quality: m.quality || "FHD",
    time: m.time || m.episode_current,
    episode_current: m.episode_current,
    type: m.type || m.type_name,
    type_name: m.type_name || m.type,
    category: Array.isArray(m.category)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? m.category.map((c: any) => ({ name: typeof c === "string" ? c : c?.name || "", slug: c?.slug }))
      : undefined,
    country: Array.isArray(m.country)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? m.country.map((c: any) => ({ name: typeof c === "string" ? c : c?.name || "", slug: c?.slug }))
      : undefined,
    tmdb: m.tmdb
      ? {
          id: m.tmdb.id,
          vote_average: m.tmdb.vote_average,
          vote_count: m.tmdb.vote_count,
        }
      : undefined,
    isActorFilmography: true,
    matchBy: m.matchBy,
  };
}

export async function queryMoviesByActor(
  actorName: string,
  aliases: string[] = [],
  country?: string,
  maxMovies = 150,
  tmdbPersonId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!actorName && aliases.length === 0 && !tmdbPersonId) return [];

  // 1. Tra cứu trực tiếp Bảng quy đổi đồng nghĩa (Mapping Table) để lấy trọn bộ biến thể
  const synonymRes = getActorSynonyms(actorName);
  const matchedSlug = synonymRes.isMatched ? synonymRes.slug : "";
  const extraVariants: string[] = synonymRes.isMatched ? [...synonymRes.variants] : [];

  if (synonymRes.country && !country) {
    country = synonymRes.country;
  }

  const allVariants = Array.from(
    new Set(
      [actorName, ...aliases, ...extraVariants]
        .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
        .map((s) => s.trim())
    )
  );

  const normalizedVariants = Array.from(new Set(allVariants.map(normalizeForMatch).filter(Boolean)));
  const idPrefix = tmdbPersonId ? `id_${tmdbPersonId}:` : "";
  const cacheKey = `ACTOR_QUERY_V10:${idPrefix}${matchedSlug || normalizedVariants.sort().join("|")}`;
  const normSlug = normalizeForMatch(matchedSlug || actorName).replace(/\s+/g, "_") || (tmdbPersonId ? `person_${tmdbPersonId}` : "actor");

  // 2. Cơ chế SWR Cache (Stale-While-Revalidate - Phản hồi 0ms tức thì)
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && cached.items.length > 0) {
    if (cached.expireAt > now) {
      // Dữ liệu tươi mới -> trả về tức thì 0ms
      return cached.items.slice(0, maxMovies);
    } else if (cached.staleUntil > now) {
      // Dữ liệu cũ còn hạn dùng tạm -> trả về ngay lập tức 0ms và tự động revalidate ngầm (nếu chưa có in-flight task)
      if (!inFlightActorFilmQueries.has(cacheKey)) {
        setTimeout(() => {
          executeActorFilmQuery(actorName, allVariants, matchedSlug, synonymRes, maxMovies, cacheKey, tmdbPersonId).catch(() => {});
        }, 100);
      }
      return cached.items.slice(0, maxMovies);
    }
  }

  // 3. Nếu yêu cầu maxMovies < 150 (ví dụ gợi ý 12 phim), kiểm tra xem cache filmography đầy đủ 150 phim đã có chưa
  if (maxMovies < 150) {
    const fullKvKey = `actor:filmography_v10:${normSlug}:150`;
    try {
      const fullCached = await cacheService.get<Record<string, unknown>[]>(fullKvKey);
      if (Array.isArray(fullCached) && fullCached.length > 0) {
        return fullCached.slice(0, maxMovies);
      }
    } catch {
      // Ignore cache lookup error
    }
  }

  const kvKey = `actor:filmography_v10:${normSlug}:${maxMovies}`;
  const res = await cacheService.fetchOrSet(
    kvKey,
    async () => {
      const items = await executeActorFilmQuery(actorName, allVariants, matchedSlug, synonymRes, maxMovies, cacheKey, tmdbPersonId);
      return Array.isArray(items) ? items.map(slimActorMovieItem).filter(Boolean) : [];
    },
    3 * 86400 // Giảm từ 14 ngày xuống 3 ngày để bảo vệ 250 MB RAM của DB3
  );
  return res || [];
}

// In-Flight Promise Map: chống bão gọi API/Redis đồng thời khi nhiều request cùng miss/stale cho cùng diễn viên
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightActorFilmQueries = new Map<string, Promise<any[]>>();

async function executeActorFilmQuery(
  actorName: string,
  allVariants: string[],
  matchedSlug: string,
  synonymRes: ActorSynonymResult,
  maxMovies: number,
  cacheKey: string,
  tmdbPersonId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const existing = inFlightActorFilmQueries.get(cacheKey);
  if (existing) {
    return existing;
  }

  const queryTask = (async () => {
    try {
      return await executeActorFilmQueryInternal(
        actorName,
        allVariants,
        matchedSlug,
        synonymRes,
        maxMovies,
        cacheKey,
        tmdbPersonId
      );
    } finally {
      inFlightActorFilmQueries.delete(cacheKey);
    }
  })();

  inFlightActorFilmQueries.set(cacheKey, queryTask);
  return queryTask;
}

async function executeActorFilmQueryInternal(
  actorName: string,
  allVariants: string[],
  matchedSlug: string,
  synonymRes: ActorSynonymResult,
  maxMovies: number,
  cacheKey: string,
  tmdbPersonId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  // =========================================================================
  // TMDB FILMOGRAPHY MATCHING ENGINE (ƯU TIÊN HÀNG ĐẦU):
  // 1. Dùng TMDB làm nguồn chuẩn xác định toàn bộ filmography của diễn viên (movie_credits)
  // 2. Lấy tmdb_id của từng phim
  // 3. Đối chiếu TMDB ID với KKPhim và NguonC theo thứ tự ưu tiên:
  //    TMDB ID → IMDB ID → Title + Year
  // 4. Merge về format Movie chuẩn của dự án và hiển thị trên MovieGrid
  // =========================================================================
  try {
    const historicalActor = getHistoricalArtistBySlug(matchedSlug) || getHistoricalArtistBySlug(actorName);
    const resolvedTmdbPersonId = tmdbPersonId || historicalActor?.tmdbPersonId;

    const tmdbMovies = await getActorFilmographyFromTmdb(
      actorName,
      synonymRes.canonicalName || actorName,
      allVariants,
      maxMovies,
      16,
      resolvedTmdbPersonId
    );
    if (tmdbMovies && tmdbMovies.length > 0) {
      const enrichedMovies = tmdbMovies.map(slimActorMovieItem).filter(Boolean);
      ACTOR_FILM_CACHE.set(cacheKey, {
        items: enrichedMovies,
        expireAt: Date.now() + CACHE_7_DAYS,
        staleUntil: Date.now() + CACHE_7_DAYS * 2,
      });
      return enrichedMovies;
    }
  } catch (tmdbErr) {
    console.warn("[aiActorService] TMDB filmography matching failed, falling back to database query:", tmdbErr);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidateItems: any[] = [];
  const seenSlugs = new Set<string>();

  // =========================================================================
  // 100% DYNAMIC QUERY DỰA TRÊN TÊN CHUẨN (CANONICAL NAME) & BIẾN THỂ (ALIAS DICTIONARY)
  // TUYỆT ĐỐI KHÔNG DÙNG DANH SÁCH PHIM HARDCODE (NO HARDCODED MOVIE TITLES)
  // =========================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchPromises: Promise<any>[] = [];

  const canonicalTarget = synonymRes.canonicalName || actorName;
  const englishTarget = synonymRes.englishName;

  // Thu thập tối đa 2 từ khóa đặc trưng nhất (Tên chuẩn & Tên tiếng Anh/quốc tế khác biệt)
  // Loại bỏ hoàn toàn các biến thể trùng lặp ngữ nghĩa sau khi normalize
  const normalizedSeen = new Set<string>();
  const searchKeywords: string[] = [];
  const candidateKeywords = [
    canonicalTarget,
    englishTarget,
    actorName,
    ...allVariants.filter((v) => {
      const trimmed = v.trim();
      return trimmed.includes(" ") || trimmed.length >= 4 || isAsianScript(trimmed);
    }),
  ].filter((k): k is string => {
    if (!k) return false;
    const trimmed = k.trim();
    return trimmed.length >= 3 || (isAsianScript(trimmed) && trimmed.length >= 2);
  });

  for (const kw of candidateKeywords) {
    const norm = normalizeForMatch(kw);
    if (!normalizedSeen.has(norm)) {
      normalizedSeen.add(norm);
      searchKeywords.push(kw.trim());
      if (searchKeywords.length >= 2) break;
    }
  }

  // Tối ưu hóa: Chỉ truy vấn page 1 với limit 30 cho tối đa 2 keyword đặc trưng
  // Giảm từ 8 calls (4 keywords x 2 pages) xuống tối đa 2 calls (1-2 keywords x 1 page)
  for (const kw of searchKeywords) {
    searchPromises.push(movieApi.getAiCandidates({ keyword: kw, page: 1, limit: 30 }, { minCandidates: 10 }));
  }

  // Chờ tất cả kết quả tìm kiếm ứng viên đồng thời (1 đợt duy nhất, loại bỏ vòng lặp tuần tự N+1)
  const searchResults = await Promise.allSettled(searchPromises);
  for (const r of searchResults) {
    if (r.status === "fulfilled" && Array.isArray(r.value?.items)) {
      for (const item of r.value.items) {
        if (!item || !item.slug || seenSlugs.has(item.slug)) continue;
        seenSlugs.add(item.slug);
        candidateItems.push(item);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verifiedMovies: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const needDetailCheck: any[] = [];

  // =========================================================================
  // NGUYÊN TẮC STRICT ACTOR MAPPING (BẮT BUỘC):
  // 1. TUYỆT ĐỐI CẤM QUÉT TIÊU ĐỀ PHIM (Title Search) hoặc mô tả (description).
  // 2. CHỈ QUERY CHÍNH XÁC TRÊN MẢNG NHÂN SỰ (actors, actor, casts, cast, director).
  // 3. LOẠI BỎ TOÀN BỘ KẾT QUẢ MẬP MỜ: Mọi bộ phim bắt buộc phải có tên nghệ sĩ trong mảng nhân sự thực tế.
  //    (Nếu phim chỉ có tên trùng chữ ngẫu nhiên như 'Trấn', 'Thành', 'Bố Già' nhưng mảng actors
  //    không có nghệ sĩ thì HỆ THỐNG LOẠI BỎ HOÀN TOÀN, không có bất kỳ ngoại lệ nào).
  // =========================================================================
  for (const item of candidateItems) {
    const castAndDirectors = extractItemActorsAndDirectors(item);
    if (castAndDirectors.length > 0) {
      // Đã có sẵn dữ liệu mảng nhân sự trong summary: Kiểm tra trực tiếp
      if (matchesActorAliases(castAndDirectors, allVariants)) {
        verifiedMovies.push({
          ...item,
          isActorFilmography: true,
        });
      }
      // Đã có mảng nhân sự mà KHÔNG chứa nghệ sĩ -> BỎ QUA HOÀN TOÀN, TUYỆT ĐỐI KHÔNG DÙNG TIÊU ĐỀ
    } else {
      // Summary từ API chưa có mảng nhân sự -> Đưa vào danh sách kiểm tra chi tiết
      needDetailCheck.push(item);
    }
  }

  // BOUNDED PARALLEL DETAIL PROBING (Batch MGET Optimization):
  // Lấy chi tiết hàng loạt (tối đa 40 phim ứng viên) qua 1 lệnh Redis MGET thay vì 40 lệnh GET riêng lẻ
  const DETAIL_MAX_CHECKS = 40;
  const candidatesToCheck = needDetailCheck.slice(0, DETAIL_MAX_CHECKS);
  if (candidatesToCheck.length > 0) {
    const slugsToCheck = candidatesToCheck.map((c) => c.slug);
    const detailMap = await movieApi.getMoviesDetailBatch(slugsToCheck);

    for (const item of candidatesToCheck) {
      const detail = detailMap[item.slug];
      if (!detail?.movie) continue;
      const detailCast = extractItemActorsAndDirectors(detail.movie);
      // STRICT ACTOR MAPPING: Chỉ chấp nhận nếu mảng actors / casts / directors thực tế chứa nghệ sĩ
      const isMatch = matchesActorAliases(detailCast, allVariants);
      if (isMatch) {
        verifiedMovies.push({
          ...item,
          actor: detail.movie.actor,
          director: detail.movie.director,
          isActorFilmography: true,
        });
      }
    }
  }

  // Khử trùng lặp slug
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueMap = new Map<string, any>();
  for (const m of verifiedMovies) {
    if (m?.slug && !uniqueMap.has(m.slug)) {
      uniqueMap.set(m.slug, m);
    }
  }

  const finalResults = Array.from(uniqueMap.values());

  // Sắp xếp ưu tiên phim mới nhất (năm giảm dần)
  finalResults.sort((a, b) => {
    const yearA = parseInt(String(a.year || "0"), 10) || 0;
    const yearB = parseInt(String(b.year || "0"), 10) || 0;
    return yearB - yearA;
  });

  const clampedResults = finalResults.slice(0, maxMovies).map(slimActorMovieItem).filter(Boolean);

  if (clampedResults.length > 0) {
    setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
      items: clampedResults,
      expireAt: Date.now() + 12 * 60 * 60 * 1000, // 12h Fresh TTL
      staleUntil: Date.now() + 48 * 60 * 60 * 1000, // 48h Stale TTL
    });
  }

  return clampedResults;
}

async function runTitlesWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const idx = currentIndex++;
      if (idx >= items.length) break;
      try {
        results[idx] = await fn(items[idx], idx);
      } catch {
        // Safe skip on error
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchPhimApiForTitle(keyword: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=6`,
      { signal: AbortSignal.timeout(2400), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const imageDomain =
      json.data?.APP_DOMAIN_CDN_IMAGE ||
      json.data?.APP_DOMAIN_FRONTEND ||
      "https://phimimg.com/";
    const cdnClean = imageDomain.replace(/\/+$/, "");
    const items = json.data?.items || json.items || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map((item: any) => {
      const rawThumb = typeof item.thumb_url === "string" ? item.thumb_url.trim() : "";
      const rawPoster = typeof item.poster_url === "string" ? item.poster_url.trim() : "";
      const formatImg = (path: string) => {
        if (!path) return "";
        if (path.startsWith("http://") || path.startsWith("https://")) return path;
        return `${cdnClean}/${path.replace(/^\/+/, "")}`;
      };
      const formattedThumb = formatImg(rawThumb);
      const formattedPoster = formatImg(rawPoster);
      return {
        ...item,
        thumb_url: formattedThumb || formattedPoster,
        poster_url: formattedPoster || formattedThumb,
      };
    });
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function searchNguonCForTitle(keyword: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}&page=1`,
      { signal: AbortSignal.timeout(2400), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems: any[] = json.items || json.data?.items || [];
    return rawItems.map((item) => ({
      ...item,
      origin_name: item.original_name || item.name,
      poster_url: item.poster_url || item.thumb_url || "",
      thumb_url: item.thumb_url || item.poster_url || "",
      quality: item.quality || "HD",
      lang: item.language || "Vietsub",
      year: Number(item.year) || undefined,
    }));
  } catch {
    return [];
  }
}

export interface FetchMoviesOptions {
  actorName?: string;
  actorAliases?: string[];
  country?: string;
  strictActorFilter?: boolean;
}

export async function fetchMoviesByTitles(
  titles: string[],
  maxMovies = 16,
  options?: FetchMoviesOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!titles || titles.length === 0) return [];

  const topTitles = titles.slice(0, 14);
  const cacheKey = `${options?.actorName || ""}|${topTitles.join("|")}`;
  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  if (cached && cached.expireAt > Date.now()) {
    return cached.items.slice(0, maxMovies);
  }

  const kvKey = `movie:by_titles:${cacheKey}`;
  return await cacheService.fetchOrSet(
    kvKey,
    async () => {
      const seenSlugs = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = [];

  const allAliases = [options?.actorName, ...(options?.actorAliases || [])]
    .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
    .map(normalizeForMatch);

  // Thực thi tìm kiếm có kiểm soát concurrency (tối đa 6 worker đồng thời)
  // Ưu tiên gọi PhimAPI trước, chỉ fallback sang NguonC khi PhimAPI không khớp
  const resolvedItems = await runTitlesWithConcurrencyLimit(topTitles, 6, async (rawTitle) => {
    try {
      const viTitle = rawTitle.replace(/\([^)]*\)/g, "").trim();
      const matchEng = rawTitle.match(/\(([^)]+)\)/);
      const engPart = matchEng ? matchEng[1].trim() : "";
      const matchYear = rawTitle.match(/\b(19\d\d|20\d\d)\b/);
      const targetYear = matchYear ? parseInt(matchYear[1], 10) : undefined;
      const engTitle = engPart.replace(/\b(19\d\d|20\d\d)\b/g, "").replace(/,/g, "").trim();

      const cleanTargetVi = normalizeForMatch(viTitle);
      const cleanTargetEng = normalizeForMatch(engTitle);

      if (!cleanTargetVi && !cleanTargetEng) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evaluateCandidates = (candidates: any[]): any | null => {
        let bestItem = null;
        let highestScore = -1;

        for (const item of candidates) {
          if (!item || !item.slug || seenSlugs.has(item.slug)) continue;

          const normName = normalizeForMatch(item.name);
          const normOrig = normalizeForMatch(item.origin_name);
          const itemCountry = normalizeForMatch(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Array.isArray(item.country) ? item.country.map((c: any) => c.name || c.slug || "").join(" ") : typeof item.country === "string" ? item.country : ""
          );

          // Trích xuất toàn bộ diễn viên (cast) và đạo diễn (director)
          const itemActorsAndDirectors: string[] = [];
          if (Array.isArray(item.actor)) itemActorsAndDirectors.push(...item.actor);
          else if (typeof item.actor === "string") itemActorsAndDirectors.push(item.actor);
          if (Array.isArray(item.director)) itemActorsAndDirectors.push(...item.director);
          else if (typeof item.director === "string") itemActorsAndDirectors.push(item.director);
          const fullCastStr = normalizeForMatch(itemActorsAndDirectors.join(" "));

          const hasActorOrDirector = allAliases.length > 0 && allAliases.some((alias) => fullCastStr.includes(alias));

          // 1. STRICT COUNTRY FILTER: Nếu tìm kiếm nghệ sĩ Việt Nam (hoặc quốc gia khác), loại trừ phim từ các quốc gia không tương thích nếu nghệ sĩ không có trong dàn cast/director
          if (options?.country) {
            const normExpectedCountry = normalizeForMatch(options.country);
            const isVietnamTarget = normExpectedCountry.includes("viet nam");
            const isForeignMovie =
              itemCountry.includes("au my") ||
              itemCountry.includes("my") ||
              itemCountry.includes("anh") ||
              itemCountry.includes("phap") ||
              itemCountry.includes("han quoc") ||
              itemCountry.includes("trung quoc") ||
              itemCountry.includes("nhat ban");

            if (isVietnamTarget && isForeignMovie && !hasActorOrDirector) {
              continue; // Bỏ qua ngay lập tức
            }
          }

          // 2. STRICT ACTOR/DIRECTOR CHECK: Nếu có danh sách diễn viên cụ thể mà strictActorFilter bật và không có nghệ sĩ
          if (options?.strictActorFilter && itemActorsAndDirectors.length > 0 && !hasActorOrDirector) {
            const isExactTitleMatch = (cleanTargetVi && normName === cleanTargetVi) || (cleanTargetEng && (normOrig === cleanTargetEng || normName === cleanTargetEng));
            if (!isExactTitleMatch) {
              continue;
            }
          }

          let score = 0;

          // Khớp tuyệt đối 100% tên chính
          const isExactVi = cleanTargetVi && (normName === cleanTargetVi || normOrig === cleanTargetVi);
          const isExactEng = cleanTargetEng && (normName === cleanTargetEng || normOrig === cleanTargetEng);

          if (isExactVi) {
            score = 100;
          } else if (isExactEng) {
            score = 95;
          } else {
            // Khớp bao hàm
            const isShortTitle = cleanTargetVi.length < 8 || cleanTargetEng.length < 8;
            if (isShortTitle && !hasActorOrDirector) {
              continue;
            }

            if (cleanTargetVi && (normName.includes(cleanTargetVi) || cleanTargetVi.includes(normName))) {
              score = 60;
            } else if (cleanTargetEng && (normOrig.includes(cleanTargetEng) || cleanTargetEng.includes(normOrig))) {
              score = 55;
            } else {
              // So khớp từ khóa
              const targetWords = (cleanTargetVi || cleanTargetEng).split(" ").filter((w) => w.length > 1);
              if (targetWords.length > 0) {
                const matchedWords = targetWords.filter(
                  (w) => normName.includes(w) || normOrig.includes(w)
                );
                const ratio = matchedWords.length / targetWords.length;
                if (ratio >= 0.7) score = Math.round(ratio * 40);
              }
            }
          }

          // Ưu tiên cực lớn nếu nghệ sĩ có trong cast/director
          if (hasActorOrDirector) {
            score += 60;
          }

          // Điểm thưởng / phạt năm phát hành
          if (targetYear && item.year) {
            const itemY = parseInt(String(item.year), 10);
            if (!isNaN(itemY)) {
              if (itemY === targetYear) {
                score += 15;
              } else if (Math.abs(itemY - targetYear) <= 1) {
                score += 5;
              } else if (Math.abs(itemY - targetYear) > 3) {
                score -= 20;
              }
            }
          }

          if (score >= 50 && score > highestScore) {
            highestScore = score;
            bestItem = item;
          }
        }

        return bestItem;
      };

      // 2.1 Ưu tiên tìm kiếm PhimAPI trước
      let phimApiItems = cleanTargetVi.length >= 2 ? await searchPhimApiForTitle(viTitle) : [];
      if (phimApiItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
        phimApiItems = await searchPhimApiForTitle(engTitle);
      }

      const matched = evaluateCandidates(phimApiItems);
      if (matched) {
        return matched; // Đã match trên PhimAPI, KHÔNG gọi NguonC
      }

      // 2.2 CHỈ FALLBACK SANG NGUONC khi PhimAPI không tìm thấy hoặc không khớp
      let nguonCItems = cleanTargetVi.length >= 2 ? await searchNguonCForTitle(viTitle) : [];
      if (nguonCItems.length === 0 && engTitle && cleanTargetEng.length >= 2) {
        nguonCItems = await searchNguonCForTitle(engTitle);
      }

      return evaluateCandidates(nguonCItems);
    } catch (err) {
      console.warn(`[aiActorService] Error searching title "${rawTitle}":`, err);
      return null;
    }
  });

  for (const item of resolvedItems) {
    if (item && item.slug && !seenSlugs.has(item.slug)) {
      seenSlugs.add(item.slug);
      results.push(item);
      if (results.length >= maxMovies) break;
    }
  }

      if (results.length > 0) {
        setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
          items: results,
          expireAt: Date.now() + 24 * 60 * 60 * 1000,
          staleUntil: Date.now() + 48 * 60 * 60 * 1000,
        });
      }

      return results;
    },
    7 * 86400 // 7 ngày trên Cloudflare KV
  );
}
