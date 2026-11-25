import { cache } from "react";
import { cacheService } from "@/lib/cache";
import { setBoundedMap } from "@/lib/boundedMap";
import {
  getActorSynonyms,
  resolveActorMovies,
  toVietnameseTitleCase,
  GOLDEN_ACTOR_INDEX,
} from "@/services/aiActorService";
import { getHistoricalArtistBySlug } from "@/data/history/historicalArtistsBirthdays";
import { normalizeForMatch, cleanCountryName, isAsianScript } from "@/lib/stringUtils";
import { normalizeSinoVietnameseVariants } from "@/services/tmdb/personService";
import {
  searchTmdbPerson,
  getTmdbPersonDetail,
} from "@/services/tmdbService";

/**
 * Phân tích slug để trích xuất TMDb Person ID (nếu có) và tên diễn viên.
 * Hỗ trợ các định dạng URL tĩnh tối ưu cho ISR / Edge Cache:
 * 1. /dien-vien/115440-sydney-sweeney (Tiền tố ID chuẩn)
 * 2. /dien-vien/sydney-sweeney-115440 (Hậu tố ID)
 * 3. /dien-vien/115440 (Chỉ có ID)
 * 4. /dien-vien/sydney-sweeney (Chỉ có slug tên)
 */
export function parseActorIdentifier(slug: string): {
  personId?: number;
  rawName: string;
} {
  let decoded = (slug || "").trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // fallback if malformed
  }
  let personId: number | undefined = undefined;
  let cleanSlug = decoded;
  const prefixMatch = cleanSlug.match(/^(\d+)(?:-(.*))?$/);
  if (prefixMatch) {
    personId = parseInt(prefixMatch[1], 10);
    cleanSlug = prefixMatch[2] || "";
  } else {
    const suffixMatch = cleanSlug.match(/^(.*?)-(\d+)$/);
    if (suffixMatch) {
      personId = parseInt(suffixMatch[2], 10);
      cleanSlug = suffixMatch[1];
    }
  }

  const rawName = toVietnameseTitleCase(cleanSlug.replace(/-/g, " ").trim());
  return { personId, rawName };
}

export { calculateAgeVi as calculateAge, formatIsoDateToVn as formatDate } from "@/lib/dateFormatters";

export interface ResolvedActorProfile {
  rawName: string;
  tmdbPersonId?: number;
  canonicalName: string;
  englishName?: string;
  actorAliases: string[];
  historicalItem?: ReturnType<typeof getHistoricalArtistBySlug>;
  actorSynonyms?: ReturnType<typeof getActorSynonyms> | null;
  actorRes: Awaited<ReturnType<typeof resolveActorMovies>> | null;
  matchedPreset?: (typeof GOLDEN_ACTOR_INDEX)[number];
  tmdbDetail: Awaited<ReturnType<typeof getTmdbPersonDetail>> | null;
  isCachedNotFound?: boolean;
}

const hasVietnameseDiacritics = (str: string) =>
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);

/**
 * Trích xuất tên quốc tế / phiên âm chuẩn mực (International Name / Romanization)
 * - Ưu tiên 1: Tên quốc tế chính thức từ TMDb tmdbDetail.english_name hoặc tmdbDetail.name (nếu là chữ Latin)
 * - Ưu tiên 2: Tên tiếng Anh đã duyệt từ historicalArtists (historicalItem.englishName)
 * - Ưu tiên 3: Tên bí danh quốc tế trong actorSynonyms
 * - Ưu tiên 4: also_known_as từ TMDb (kho tàng tên Latin / Pinyin / Romanized của các nghệ sĩ châu Á)
 * - Ưu tiên 5: Trích xuất từ tiểu sử Wikipedia / TMDb (theo mẫu "Koo Kyo-hwan (Korean: 구교환; born...")
 */
export function resolveActorInternationalName(params: {
  canonicalName: string;
  country?: string;
  tmdbDetail?: Awaited<ReturnType<typeof getTmdbPersonDetail>> | null;
  historicalItem?: ReturnType<typeof getHistoricalArtistBySlug>;
  actorSynonyms?: ReturnType<typeof getActorSynonyms> | null;
  actorAliases?: string[];
  bioText?: string;
}): string | undefined {
  const {
    canonicalName,
    country,
    tmdbDetail,
    historicalItem,
    actorSynonyms,
    actorAliases = [],
    bioText,
  } = params;

  // Nghệ sĩ Việt Nam không hiển thị trường "Tên quốc tế"
  if (country && country.includes("Việt Nam")) {
    return undefined;
  }

  const normCanonical = normalizeForMatch(canonicalName);
  const hasVietnameseDiacritics = (str: string) =>
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);

  const isValidInternationalName = (candidate?: string | null): boolean => {
    if (!candidate || !candidate.trim()) return false;
    const trimmed = candidate.trim();
    // Tuyệt đối không chứa ký tự chữ tượng hình châu Á (Hanzi, Hangul, Kana, Thai)
    if (isAsianScript(trimmed)) return false;
    // Không chứa dấu tiếng Việt
    if (hasVietnameseDiacritics(trimmed)) return false;
    // Phải có chữ cái Latin và độ dài hợp lý
    if (!/[a-zA-Z]/.test(trimmed) || trimmed.length < 2 || trimmed.length > 50) return false;
    // Không chứa ký tự lạ
    if (!/^[a-zA-Z0-9\s\-'.]+$/.test(trimmed)) return false;
    const normCandidate = normalizeForMatch(trimmed);
    // Nếu canonicalName là chữ Latin thì không trùng với chính nó bỏ dấu
    if (!isAsianScript(canonicalName) && normCandidate === normCanonical) return false;
    return true;
  };

  // 1. Tên quốc tế chính thức từ tmdbDetail.english_name
  if (tmdbDetail?.english_name && isValidInternationalName(tmdbDetail.english_name)) {
    return toVietnameseTitleCase(tmdbDetail.english_name);
  }

  // 2. Tên chính từ TMDb nếu là Latin
  if (tmdbDetail?.name && isValidInternationalName(tmdbDetail.name)) {
    return toVietnameseTitleCase(tmdbDetail.name);
  }

  // 3. Tên tiếng Anh đã duyệt từ historicalArtists
  if (historicalItem?.englishName && isValidInternationalName(historicalItem.englishName)) {
    return toVietnameseTitleCase(historicalItem.englishName);
  }

  // 4. Tên bí danh quốc tế trong actorSynonyms
  if (actorSynonyms?.englishName && isValidInternationalName(actorSynonyms.englishName)) {
    return toVietnameseTitleCase(actorSynonyms.englishName);
  }

  // 5. Tìm trong also_known_as của TMDb (kho tàng tên Latin/Pinyin/Romanization chuẩn)
  if (Array.isArray(tmdbDetail?.also_known_as)) {
    const latinAka = tmdbDetail.also_known_as.filter((a) => isValidInternationalName(a));
    if (latinAka.length > 0) {
      // Ưu tiên tên có khoảng trắng (tên đầy đủ "Họ Tên") trước tên đơn
      const fullName = latinAka.find((a) => a.trim().includes(" ")) || latinAka[0];
      return toVietnameseTitleCase(fullName);
    }
  }

  // 6. Tìm trong actorAliases
  const latinAlias = actorAliases.find((a) => isValidInternationalName(a));
  if (latinAlias) {
    return toVietnameseTitleCase(latinAlias);
  }

  // 7. Trích xuất từ tiểu sử (TMDb / Wikipedia) theo cú pháp chuẩn:
  // "Koo Kyo-hwan (Korean: 구교환; born December 14, 1982)..."
  if (bioText) {
    const match = bioText.match(/^([a-zA-Z\s\-'.]{2,40})\s*\((?:[a-zA-Z\s]+:\s*)?[^)]+\)\s*(?:is|was|born)/i);
    if (match && isValidInternationalName(match[1])) {
      return toVietnameseTitleCase(match[1]);
    }
  }

  return undefined;
}

const ACTOR_PROFILE_RAM_CACHE = new Map<string, { profile: ResolvedActorProfile; expireAt: number }>();
const MAX_ACTOR_PROFILE_RAM_ENTRIES = 2000;
const ACTOR_PROFILE_REDIS_TTL_SEC = 7 * 24 * 60 * 60; // 7 ngày trong Redis DB 3 (Aux)

/**
 * Request-scoped memoized actor profile resolver (React cache).
 * Loại bỏ hoàn toàn Double GET giữa generateMetadata() và ActorDetailPage() trong cùng 1 request SSR.
 */
export const resolveActorProfile = cache(async (slug: string): Promise<ResolvedActorProfile> => {
  const cachedProf = ACTOR_PROFILE_RAM_CACHE.get(slug);
  if (cachedProf && cachedProf.expireAt > Date.now()) {
    if (cachedProf.profile.isCachedNotFound) {
      return cachedProf.profile;
    }
    if (cachedProf.profile.canonicalName) {
      return cachedProf.profile;
    }
  }

  const { personId: explicitPersonId, rawName } = parseActorIdentifier(slug);

  // 1. Kiểm tra L2 Redis DB 3 (Aux) để tận dụng cache phân tán giữa các Serverless instances
  try {
    const redisCached = await cacheService.get<ResolvedActorProfile>(`actor:profile:v2:${slug}`);
    if (redisCached && redisCached.canonicalName && (redisCached.tmdbPersonId || explicitPersonId)) {
      if (ACTOR_PROFILE_RAM_CACHE.size >= MAX_ACTOR_PROFILE_RAM_ENTRIES) {
        const oldest = ACTOR_PROFILE_RAM_CACHE.keys().next().value;
        if (oldest) ACTOR_PROFILE_RAM_CACHE.delete(oldest);
      }
      ACTOR_PROFILE_RAM_CACHE.set(slug, {
        profile: redisCached,
        expireAt: Date.now() + 7200000,
      });
      return redisCached;
    }
  } catch { }

  // 1. Phân giải danh tính nghệ sĩ On-Demand
  const historicalItem = getHistoricalArtistBySlug(slug) || (rawName ? getHistoricalArtistBySlug(rawName) : undefined);
  const rawSyn = rawName ? getActorSynonyms(rawName) : null;
  const slugSyn = slug ? getActorSynonyms(slug) : null;
  const actorSynonyms = (rawSyn?.isMatched ? rawSyn : null) || (slugSyn?.isMatched ? slugSyn : null);

  let tmdbPersonId = explicitPersonId || historicalItem?.tmdbPersonId;

  // Nếu đã có tmdbPersonId rõ ràng, bỏ qua resolveActorMovies để triệt tiêu gọi AI/LLM thừa
  let actorRes = null;
  if (actorSynonyms?.isMatched) {
    actorRes = {
      actorName: actorSynonyms.canonicalName,
      country: actorSynonyms.country,
      aliases: actorSynonyms.variants,
      isActor: true,
      source: "preset" as const,
    };
  } else if (!tmdbPersonId && rawName) {
    actorRes = await resolveActorMovies(rawName, { skipAiFallback: true });
    if (actorRes?.tmdbPersonId) {
      tmdbPersonId = actorRes.tmdbPersonId;
    }
  }

  let canonicalName =
    historicalItem?.name ||
    (actorSynonyms?.isMatched ? actorSynonyms.canonicalName : "") ||
    (actorRes?.isActor && actorRes.actorName ? toVietnameseTitleCase(actorRes.actorName) : "") ||
    toVietnameseTitleCase(rawName);

  const actorAliases = Array.from(
    new Set([
      canonicalName,
      ...(historicalItem?.aliases || []),
      ...(actorSynonyms?.variants || []),
      ...(actorRes?.aliases || []),
      rawName,
    ])
  ).filter(Boolean);

  // 2. Tra cứu chi tiết diễn viên từ TMDb Person API theo ID hoặc Search có ngưỡng khớp chặt chẽ
  let tmdbDetail: Awaited<ReturnType<typeof getTmdbPersonDetail>> | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDetailMatchingExpectedArtist = (detail: any) => {
    if (!detail?.name) return false;
    const normDetailName = normalizeForMatch(detail.name);
    const sinoDetailName = normalizeSinoVietnameseVariants(normDetailName);
    const candidateNames = [
      canonicalName,
      historicalItem?.name,
      historicalItem?.englishName,
      actorSynonyms?.canonicalName,
      actorSynonyms?.englishName,
      rawName,
      ...actorAliases,
    ]
      .filter((n): n is string => Boolean(n))
      .map(normalizeForMatch);

    if (
      candidateNames.some(
        (c) =>
          c === normDetailName ||
          c.includes(normDetailName) ||
          normDetailName.includes(c) ||
          normalizeSinoVietnameseVariants(c) === sinoDetailName
      )
    ) {
      return true;
    }

    if (Array.isArray(detail.also_known_as)) {
      const akaList = detail.also_known_as.map((a: string) => normalizeForMatch(a));
      if (
        candidateNames.some((c) =>
          akaList.some(
            (aka: string) =>
              aka === c ||
              aka.includes(c) ||
              c.includes(aka) ||
              normalizeSinoVietnameseVariants(c) === normalizeSinoVietnameseVariants(aka)
          )
        )
      ) {
        return true;
      }
    }
    return false;
  };

  if (tmdbPersonId) {
    try {
      const detailCandidate = await getTmdbPersonDetail(tmdbPersonId);
      if (detailCandidate && isDetailMatchingExpectedArtist(detailCandidate)) {
        tmdbDetail = detailCandidate;
        const candidateHasVietnamese = hasVietnameseDiacritics(detailCandidate.name || "");
        const currentHasVietnamese = hasVietnameseDiacritics(canonicalName);
        if (!historicalItem?.name && detailCandidate.name) {
          if (candidateHasVietnamese || !currentHasVietnamese) {
            canonicalName = toVietnameseTitleCase(detailCandidate.name);
          }
        }
      } else {
        // ID bị sai lệch hoặc không khớp người thật -> vô hiệu hóa ID để tìm kiếm lại theo tên chuẩn
        tmdbPersonId = undefined;
      }
    } catch {
      // Ignored
    }
  }

  if (!tmdbDetail && canonicalName) {
    try {
      const matchedPerson = await searchTmdbPerson(canonicalName, canonicalName, actorAliases);
      if (matchedPerson?.id) {
        tmdbPersonId = matchedPerson.id;
        const detailCandidate = await getTmdbPersonDetail(matchedPerson.id);
        if (detailCandidate) {
          tmdbDetail = detailCandidate;
          const candidateHasVietnamese = hasVietnameseDiacritics(detailCandidate.name || "");
          const currentHasVietnamese = hasVietnameseDiacritics(canonicalName);
          if (!historicalItem?.name && detailCandidate.name) {
            if (candidateHasVietnamese || !currentHasVietnamese) {
              canonicalName = toVietnameseTitleCase(detailCandidate.name);
            }
          }
        }
      }
    } catch {
      // Ignored
    }
  }

  // Bổ sung đầy đủ các biến thể tên từ TMDb (also_known_as: tên gốc CJK, phiên âm Pinyin, tên tiếng Việt...)
  if (tmdbDetail) {
    if (tmdbDetail.name) {
      actorAliases.push(tmdbDetail.name);
    }
    if (Array.isArray(tmdbDetail.also_known_as)) {
      actorAliases.push(...tmdbDetail.also_known_as);
    }
  }

  const matchedPreset = GOLDEN_ACTOR_INDEX.find(
    (p) =>
      normalizeForMatch(p.name) === normalizeForMatch(canonicalName) ||
      actorAliases.some((alias) => normalizeForMatch(p.name) === normalizeForMatch(alias))
  );
  if (matchedPreset) {
    actorAliases.push(...matchedPreset.aliases);
  }

  const deduplicatedAliases = Array.from(
    new Set(actorAliases.map((a) => (a || "").trim()).filter(Boolean))
  );

  const rawCountry =
    historicalItem?.country ||
    actorSynonyms?.country ||
    actorRes?.country ||
    matchedPreset?.country ||
    "";
  const country = cleanCountryName(rawCountry);

  const finalCanonicalName = toVietnameseTitleCase(canonicalName || rawName);
  const englishName = resolveActorInternationalName({
    canonicalName: finalCanonicalName,
    country,
    tmdbDetail,
    historicalItem,
    actorSynonyms,
    actorAliases: deduplicatedAliases,
    bioText: tmdbDetail?.biography,
  });

  const resolved: ResolvedActorProfile = {
    rawName: toVietnameseTitleCase(rawName),
    tmdbPersonId: tmdbPersonId || tmdbDetail?.id,
    canonicalName: finalCanonicalName,
    englishName,
    actorAliases: deduplicatedAliases,
    historicalItem,
    actorSynonyms,
    actorRes,
    matchedPreset,
    tmdbDetail,
  };

  setBoundedMap(ACTOR_PROFILE_RAM_CACHE, slug, {
    profile: resolved,
    expireAt: Date.now() + 7200000,
  }, MAX_ACTOR_PROFILE_RAM_ENTRIES);

  cacheService.set(`actor:profile:v2:${slug}`, resolved, ACTOR_PROFILE_REDIS_TTL_SEC).catch(() => { });

  return resolved;
});
