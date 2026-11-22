import { movieApi } from "@/services/movies/service";
import { generateFastAiChat } from "@/services/aiProviderService";
import { getActorFilmographyFromTmdb, searchTmdbPerson } from "@/services/tmdbService";
import { normalizeSinoVietnameseVariants } from "@/services/tmdb/personService";
import { cacheService } from "@/lib/cache";
import { normalizeForMatch } from "@/lib/stringUtils";
import { getHistoricalArtistBySlug, findHistoricalArtist } from "@/data/history/historicalArtistsBirthdays";
import {
  hasExplicitActorPrefix,
  isAmbiguousShortActorKeyword,
  cleanActorQuery,
  toVietnameseTitleCase,
  type ActorSynonymResult,
  getActorSynonyms,
  ACTOR_AI_CACHE,
  CACHE_7_DAYS,
  ACTOR_FILM_CACHE,
  setBoundedCache,
} from "./actor/actorAliasResolver";
import {
  isAsianScript,
  extractItemActorsAndDirectors,
  matchesActorAliases,
  slimActorMovieItem,
  fetchMoviesByTitles,
  type FetchMoviesOptions,
} from "./actor/actorFilmMatcher";

export type { EnhancedActorProfile, ActorProfile } from "@/types/actor";
export * from "./actor/actorAliasResolver";
export {
  isAsianScript,
  extractItemActorsAndDirectors,
  matchesActorAliases,
  slimActorMovieItem,
  fetchMoviesByTitles,
};
export type { FetchMoviesOptions };

export async function resolveActorMovies(
  keyword: string,
  options?: { skipAiFallback?: boolean }
): Promise<{
  actorName: string;
  englishName?: string;
  country?: string;
  aliases: string[];
  titles?: string[];
  isActor: boolean;
  tmdbPersonId?: number;
  avatarUrl?: string;
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
    let tmdbPersonId: number | undefined;
    let avatarUrl: string | undefined;
    try {
      const tmdbPerson = await searchTmdbPerson(
        synonymRes.englishName || synonymRes.canonicalName,
        synonymRes.canonicalName,
        synonymRes.variants
      );
      if (tmdbPerson?.id) {
        tmdbPersonId = tmdbPerson.id;
        avatarUrl = tmdbPerson.profile_path
          ? (tmdbPerson.profile_path.startsWith("http")
              ? tmdbPerson.profile_path
              : `https://image.tmdb.org/t/p/w500${tmdbPerson.profile_path}`)
          : undefined;
      }
    } catch {}

    return {
      actorName: synonymRes.canonicalName,
      englishName: synonymRes.englishName,
      country: synonymRes.country,
      aliases: synonymRes.variants,
      isActor: true,
      tmdbPersonId,
      avatarUrl,
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
      englishName: cached.englishName,
      country: cached.country,
      aliases: cached.aliases,
      isActor: cached.isActor,
      source: "cache",
    };
  }

  // 1.22 Kiểm tra TIER 2.2: Cache L2 Upstash Redis DB 3 (Aux / Metadata - actor:intent:*)
  const cleanKey = cleanRaw.replace(/[^a-z0-9_]/g, "_").slice(0, 80);
  const redisActorKey = `actor:intent:v6:${cleanKey}`;
  try {
    const redisCached = await cacheService.get<{
      actorName: string;
      englishName?: string;
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
        englishName: redisCached.englishName,
        country: redisCached.country,
        aliases: redisCached.aliases,
        isActor: redisCached.isActor,
        source: "cache",
      };
    }
  } catch {}

  // 1.25 TIER 2.5: Tra cứu trực tiếp TMDB Search Person
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
      const sinoQNorm = normalizeSinoVietnameseVariants(cleanQNorm);
      const sinoPersonName = normalizeSinoVietnameseVariants(personNameNorm);

      const qWords = cleanQNorm.split(" ").filter(Boolean);
      const pNameWords = personNameNorm.split(" ").filter(Boolean);
      const pOrigWords = personOrigNorm.split(" ").filter(Boolean);

      const isExactMatch =
        personNameNorm === cleanQNorm ||
        personOrigNorm === cleanQNorm ||
        sinoPersonName === sinoQNorm;

      const isWordSetMatch =
        (qWords.length >= 2 && pNameWords.length === qWords.length && qWords.every((w) => pNameWords.includes(w))) ||
        (qWords.length >= 2 && pOrigWords.length === qWords.length && qWords.every((w) => pOrigWords.includes(w)));

      const isFuzzyMatch = (() => {
        const s1 = cleanQNorm.replace(/[\s\-'.]+/g, "");
        const s2 = personNameNorm.replace(/[\s\-'.]+/g, "");
        if (s1 === s2) return true;
        const r1 = s1.replace(/(.)\1+/g, "$1");
        const r2 = s2.replace(/(.)\1+/g, "$1");
        return r1 === r2;
      })();

      const akaList = Array.isArray(tmdbPerson.also_known_as)
        ? tmdbPerson.also_known_as.map((a: string) => normalizeForMatch(a))
        : [];

      const isAkaMatch = akaList.some(
        (aka) =>
          aka === cleanQNorm ||
          normalizeSinoVietnameseVariants(aka) === sinoQNorm ||
          (qWords.length >= 2 && qWords.every((w) => aka.split(" ").includes(w)))
      );

      if (isExactMatch || isWordSetMatch || isFuzzyMatch || isAkaMatch) {
        const hasVietnameseMarks = (s: string) =>
          /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s);

        // 1. Kiểm tra bảng đồng nghĩa trước tiên (ưu tiên tên chuẩn nếu đã có trong hệ thống)
        const synFromKeyword = getActorSynonyms(keyword);
        const synFromName = tmdbPerson.name ? getActorSynonyms(tmdbPerson.name) : null;
        const resolvedSyn = synFromKeyword.isMatched ? synFromKeyword : (synFromName?.isMatched ? synFromName : null);

        let actorName = "";
        let englishName: string | undefined = undefined;

        if (resolvedSyn) {
          actorName = resolvedSyn.canonicalName;
          englishName = resolvedSyn.englishName || (tmdbPerson.name !== resolvedSyn.canonicalName ? tmdbPerson.name : undefined);
        } else if (tmdbPerson.name && hasVietnameseMarks(tmdbPerson.name)) {
          // TMDb đã lưu tên tiếng Việt chuẩn mực (vd: "Chu Tỉ Lợi", "Châu Tinh Trì"...)
          actorName = toVietnameseTitleCase(tmdbPerson.name);
          if (tmdbPerson.original_name && tmdbPerson.original_name !== tmdbPerson.name && !hasVietnameseMarks(tmdbPerson.original_name) && !isAsianScript(tmdbPerson.original_name)) {
            englishName = toVietnameseTitleCase(tmdbPerson.original_name);
          }
        } else if (hasVietnameseMarks(keyword)) {
          actorName = toVietnameseTitleCase(keyword);
          if (tmdbPerson.name && tmdbPerson.name !== keyword) {
            englishName = tmdbPerson.name;
          }
        } else if (tmdbPerson.original_name && hasVietnameseMarks(tmdbPerson.original_name)) {
          actorName = toVietnameseTitleCase(tmdbPerson.original_name);
          englishName = tmdbPerson.name;
        } else {
          actorName = tmdbPerson.name ? toVietnameseTitleCase(tmdbPerson.name) : toVietnameseTitleCase(keyword);
        }

        const aliases = Array.from(
          new Set([actorName, keyword, englishName, tmdbPerson.name, tmdbPerson.original_name].filter(Boolean))
        ) as string[];

        const tmdbEntry = {
          actorName,
          englishName,
          aliases,
          isActor: true,
          tmdbPersonId: tmdbPerson.id,
          avatarUrl: tmdbPerson.profile_path
            ? (tmdbPerson.profile_path.startsWith("http")
                ? tmdbPerson.profile_path
                : `https://image.tmdb.org/t/p/w500${tmdbPerson.profile_path}`)
            : undefined,
        };

        setBoundedCache(ACTOR_AI_CACHE, cleanRaw, {
          ...tmdbEntry,
          expireAt: Date.now() + CACHE_7_DAYS,
        });
        cacheService.set(redisActorKey, tmdbEntry, 14 * 86400).catch(() => {});

        return {
          actorName,
          englishName,
          aliases,
          isActor: true,
          tmdbPersonId: tmdbPerson.id,
          avatarUrl: tmdbEntry.avatarUrl,
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
- "country": Quốc gia / nền điện ảnh chính xác (vd: "Việt Nam", "Hàn Quốc", "Hồng Kông", "Trung Quốc", "Mỹ", "Anh Quốc", "Thái Lan", "Nhật Bản").
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
          const cleanQNorm = normalizeForMatch(keyword);
          const rawAliases = Array.isArray(parsed.aliases) ? parsed.aliases : [];
          const canonicalNorm = normalizeForMatch(parsed.canonicalName || parsed.actorName || "");
          const sinoQNorm = normalizeSinoVietnameseVariants(cleanQNorm);
          const sinoCanonicalNorm = normalizeSinoVietnameseVariants(canonicalNorm);

          let hasVerifiedMatch = false;
          if (cleanQNorm === canonicalNorm || sinoQNorm === sinoCanonicalNorm) {
            hasVerifiedMatch = true;
          } else {
            const qWords = cleanQNorm.split(" ").filter((w) => w.length > 1);
            const cWords = canonicalNorm.split(" ").filter((w) => w.length > 1);
            if (
              qWords.length >= 2 &&
              cWords.length >= 2 &&
              qWords.every((w) => cWords.includes(w))
            ) {
              hasVerifiedMatch = true;
            }
          }

          if (!hasVerifiedMatch) {
            const negEntry = { actorName: "", aliases: [], isActor: false };
            setBoundedCache(ACTOR_AI_CACHE, cleanRaw, { ...negEntry, expireAt: Date.now() + 86400000 });
            cacheService.set(redisActorKey, negEntry, 86400).catch(() => {});
            return { actorName: "", aliases: [], isActor: false, source: "none" };
          }

          const hasVietnameseMarks = (s: string) =>
            /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s);

          let actorName = parsed.canonicalName || parsed.actorName || keyword;
          let englishName: string | undefined = undefined;

          if (hasVietnameseMarks(keyword)) {
            actorName = keyword;
            if (parsed.canonicalName && parsed.canonicalName !== keyword) {
              englishName = parsed.canonicalName;
            }
          } else {
            const viAlias = rawAliases.find((a: string) => typeof a === "string" && hasVietnameseMarks(a));
            if (viAlias) {
              englishName = parsed.canonicalName;
              actorName = viAlias;
            } else if (parsed.canonicalName && parsed.canonicalName !== keyword) {
              englishName = parsed.canonicalName;
            }
          }

          const country = parsed.country || undefined;
          const aliases = Array.from(new Set([actorName, keyword, englishName, ...rawAliases])).filter(
            (s): s is string => typeof s === "string" && s.trim().length >= 2
          );

          const aiEntry = {
            actorName,
            englishName,
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
            englishName,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inFlightActorFilmQueries = new Map<string, Promise<any[]>>();

export async function queryMoviesByActor(
  actorName: string,
  aliases: string[] = [],
  country?: string,
  maxMovies = 150,
  tmdbPersonId?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (!actorName && aliases.length === 0 && !tmdbPersonId) return [];

  const synonymRes = getActorSynonyms(actorName);
  const matchedSlug = synonymRes.isMatched ? synonymRes.slug : "";
  const extraVariants: string[] = synonymRes.isMatched ? [...synonymRes.variants] : [];

  if (synonymRes.country && !country) {
    country = synonymRes.country;
  }

  let effectiveTmdbPersonId = tmdbPersonId;
  if (!effectiveTmdbPersonId) {
    const hist = findHistoricalArtist(actorName) || (matchedSlug ? getHistoricalArtistBySlug(matchedSlug) : undefined);
    if (hist?.tmdbPersonId) {
      effectiveTmdbPersonId = hist.tmdbPersonId;
    }
  }

  const allVariants = Array.from(
    new Set(
      [actorName, ...aliases, ...extraVariants]
        .filter((s): s is string => typeof s === "string" && s.trim().length >= 2)
        .map((s) => s.trim())
    )
  );

  const normalizedVariants = Array.from(new Set(allVariants.map(normalizeForMatch).filter(Boolean)));
  const idPrefix = effectiveTmdbPersonId ? `id_${effectiveTmdbPersonId}:` : "";
  const cacheKey = `ACTOR_QUERY_V14:${idPrefix}${matchedSlug || normalizedVariants.sort().join("|")}`;
  const normSlug = normalizeForMatch(matchedSlug || actorName).replace(/\s+/g, "_") || (effectiveTmdbPersonId ? `person_${effectiveTmdbPersonId}` : "actor");

  const cached = ACTOR_FILM_CACHE.get(cacheKey);
  const now = Date.now();
  if (cached && cached.items.length > 0) {
    if (cached.expireAt > now) {
      return cached.items.slice(0, maxMovies);
    } else if (cached.staleUntil > now) {
      if (!inFlightActorFilmQueries.has(cacheKey)) {
        setTimeout(() => {
          executeActorFilmQuery(actorName, allVariants, matchedSlug, synonymRes, maxMovies, cacheKey, effectiveTmdbPersonId).catch(() => {});
        }, 100);
      }
      return cached.items.slice(0, maxMovies);
    }
  }

  if (maxMovies < 150) {
    const fullKvKey = `actor:filmography_v14:${normSlug}:150`;
    try {
      const fullCached = await cacheService.get<Record<string, unknown>[]>(fullKvKey);
      if (Array.isArray(fullCached) && fullCached.length > 0) {
        return fullCached.slice(0, maxMovies);
      }
    } catch {}
  }

  const kvKey = `actor:filmography_v14:${normSlug}:${maxMovies}`;
  const res = await cacheService.fetchOrSet(
    kvKey,
    async () => {
      const items = await executeActorFilmQuery(actorName, allVariants, matchedSlug, synonymRes, maxMovies, cacheKey, effectiveTmdbPersonId);
      return Array.isArray(items) ? items.map(slimActorMovieItem).filter(Boolean) : [];
    },
    3 * 86400
  );

  if (!res || res.length === 0) {
    const freshItems = await executeActorFilmQuery(actorName, allVariants, matchedSlug, synonymRes, maxMovies, cacheKey, effectiveTmdbPersonId);
    if (freshItems && freshItems.length > 0) {
      const enriched = freshItems.map(slimActorMovieItem).filter(Boolean);
      cacheService.set(kvKey, enriched, 3 * 86400).catch(() => {});
      return enriched;
    }
  }

  return res || [];
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchPromises: Promise<any>[] = [];

  const canonicalTarget = synonymRes.canonicalName || actorName;
  const englishTarget = synonymRes.englishName;

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

  for (const kw of searchKeywords) {
    searchPromises.push(movieApi.getAiCandidates({ keyword: kw, page: 1, limit: 30 }, { minCandidates: 10, skipRelevanceScoring: true }));
  }

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

  for (const item of candidateItems) {
    const castAndDirectors = extractItemActorsAndDirectors(item);
    if (castAndDirectors.length > 0) {
      if (matchesActorAliases(castAndDirectors, allVariants)) {
        verifiedMovies.push({
          ...item,
          isActorFilmography: true,
        });
      }
    } else {
      needDetailCheck.push(item);
    }
  }

  const DETAIL_MAX_CHECKS = 40;
  const candidatesToCheck = needDetailCheck.slice(0, DETAIL_MAX_CHECKS);
  if (candidatesToCheck.length > 0) {
    const slugsToCheck = candidatesToCheck.map((c) => c.slug);
    const detailMap = await movieApi.getMoviesDetailBatch(slugsToCheck);

    for (const item of candidatesToCheck) {
      const detail = detailMap[item.slug];
      if (!detail?.movie) continue;
      const detailCast = extractItemActorsAndDirectors(detail.movie);
      const isMatch = matchesActorAliases(detailCast, allVariants);
      if (isMatch) {
        verifiedMovies.push({
          ...item,
          ...detail.movie,
          actor: detail.movie.actor || item.actor,
          director: detail.movie.director || item.director,
          isActorFilmography: true,
        });
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueMap = new Map<string, any>();
  for (const m of verifiedMovies) {
    if (m?.slug && !uniqueMap.has(m.slug)) {
      uniqueMap.set(m.slug, m);
    }
  }

  const finalResults = Array.from(uniqueMap.values());

  finalResults.sort((a, b) => {
    const yearA = parseInt(String(a.year || "0"), 10) || 0;
    const yearB = parseInt(String(b.year || "0"), 10) || 0;
    return yearB - yearA;
  });

  const clampedResults = finalResults.slice(0, maxMovies).map(slimActorMovieItem).filter(Boolean);

  if (clampedResults.length > 0) {
    setBoundedCache(ACTOR_FILM_CACHE, cacheKey, {
      items: clampedResults,
      expireAt: Date.now() + 12 * 60 * 60 * 1000,
      staleUntil: Date.now() + 48 * 60 * 60 * 1000,
    });
  }

  return clampedResults;
}
