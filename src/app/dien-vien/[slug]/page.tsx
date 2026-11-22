import React, { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheService } from "@/lib/cache";

/**
 * ISR / Edge Cache: Cho phép CDN Cloudflare và Vercel Edge cache response HTML 24 giờ.
 * Tăng từ 1h → 24h: Trang diễn viên không thay đổi theo giờ, giảm ISR cold start 90%+.
 * Ngăn chặn crawler bot kích hoạt lại SSR và giảm 90%+ Redis DB3 commands.
 */
export const dynamic = "force-static";
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  // 50 diễn viên phổ biến nhất (tăng từ 15 → 50 để pre-build nhiều trang hơn, giảm cold SSR on-demand)
  const topSlugs = [
    // Việt Nam
    "tran-thanh",
    "truong-giang",
    "thai-hoa",
    "ly-hai",
    "nhat-cuong",
    "hoai-linh",
    "chi-tai",
    "thu-trang",
    "kieu-minh-tuan",
    "cat-phuong",
    // Hồng Kông / Trung Quốc
    "thanh-long",
    "chau-tinh-tri",
    "chan-tu-dan",
    "ly-lien-kiet",
    "ngo-kinh",
    "luu-duc-hoa",
    "luong-trieu-vy",
    "co-thien-lac",
    "hong-kim-bao",
    "truong-man-ngoc",
    "chow-yun-fat",
    "tony-leung",
    "andy-lau",
    "jackie-chan",
    // Trung Quốc đại lục
    "duong-mich",
    "trieu-le-dinh",
    "dilraba-dilmurat",
    "tiiao-tieu-chan",
    "ly-dich-phong",
    "vuong-nhat-bo",
    "nguyen-kinh-thien",
    "ly-hien",
    // Hàn Quốc
    "lee-min-ho",
    "park-seo-joon",
    "song-joong-ki",
    "hyun-bin",
    "jun-ji-hyun",
    "song-hye-kyo",
    "kim-soo-hyun",
    "lee-jong-suk",
    "park-bo-gum",
    "bae-suzy",
    // Nhật Bản
    "takuya-kimura",
    "ken-watanabe",
    // Hollywood
    "dwayne-johnson",
    "tom-cruise",
    "keanu-reeves",
    "robert-downey-jr",
    "scarlett-johansson",
  ];
  return topSlugs.map((slug) => ({ slug }));
}
import {
  Calendar,
  MapPin,
  Clapperboard,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  getActorSynonyms,
  resolveActorMovies,
  queryMoviesByActor,
  toVietnameseTitleCase,
  GOLDEN_ACTOR_INDEX,
} from "@/services/aiActorService";
import { getHistoricalArtistBySlug } from "@/data/history/historicalArtistsBirthdays";
import { normalizeForMatch, cleanCountryName, isAsianScript } from "@/lib/stringUtils";
import {
  searchTmdbPerson,
  getTmdbPersonDetail,
} from "@/services/tmdbService";
import { fetchActorProfile, type ActorProfile } from "@/services/wikipediaService";
import { selectBestBiography } from "@/lib/bioFormatter";
import { ActorDetailClient } from "@/components/actors/ActorDetailClient";
import { ActorAvatar } from "@/components/actors/ActorAvatar";
import { FavoriteActorButton } from "@/components/actors/FavoriteActorButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { CountryBadge } from "@/components/ui/CountryBadge";
import { enrichMovieListPosters } from "@/services/movies/posterEnrichment";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Phân tích slug để trích xuất TMDb Person ID (nếu có) và tên diễn viên.
 * Hỗ trợ các định dạng URL tĩnh tối ưu cho ISR / Edge Cache:
 * 1. /dien-vien/115440-sydney-sweeney (Tiền tố ID chuẩn)
 * 2. /dien-vien/sydney-sweeney-115440 (Hậu tố ID)
 * 3. /dien-vien/115440 (Chỉ có ID)
 * 4. /dien-vien/sydney-sweeney (Chỉ có slug tên)
 */
function parseActorIdentifier(slug: string): {
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

/**
 * TÍNH TUỔI TỪ NGÀY SINH (VD: "1962-06-22" -> 64)
 */
function calculateAge(birthdayStr?: string, deathdayStr?: string): string | null {
  if (!birthdayStr) return null;
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return null;

  const endDate = deathdayStr ? new Date(deathdayStr) : new Date();
  if (isNaN(endDate.getTime())) return null;

  let age = endDate.getFullYear() - birthDate.getFullYear();
  const m = endDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age <= 0 || age > 120) return null;
  return deathdayStr ? `${age} tuổi (đã mất)` : `${age} tuổi`;
}

/**
 * FORMAT NGÀY SINH (VD: "1962-06-22" -> "22/06/1962")
 */
function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

interface ResolvedActorProfile {
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

// In-Memory RAM Cache cho trang diễn viên (0ms, 0 Redis commands cho các request lặp lại trên cùng instance)
interface ActorPageRamCacheEntry {
  profile: ResolvedActorProfile | null;
  wikiProfile: ActorProfile | null;
  movies: unknown[];
  isNotFound?: boolean;
  expireAt: number;
}
const ACTOR_PAGE_RAM_CACHE = new Map<string, ActorPageRamCacheEntry>();
const ACTOR_PROFILE_RAM_CACHE = new Map<string, { profile: ResolvedActorProfile; expireAt: number }>();
const MAX_ACTOR_PAGE_RAM_ENTRIES = 2000;
const ACTOR_PAGE_REDIS_TTL_SEC = 7 * 24 * 60 * 60; // 7 ngày trong Redis DB 3 (Aux)

/**
 * Request-scoped memoized actor profile resolver (React cache).
 * Loại bỏ hoàn toàn Double GET giữa generateMetadata() và ActorDetailPage() trong cùng 1 request SSR.
 */
const resolveActorProfile = cache(async (slug: string): Promise<ResolvedActorProfile> => {
  const cachedProf = ACTOR_PROFILE_RAM_CACHE.get(slug);
  if (cachedProf && cachedProf.expireAt > Date.now()) {
    if (cachedProf.profile.isCachedNotFound) {
      return cachedProf.profile;
    }
    if (cachedProf.profile.canonicalName) {
      return cachedProf.profile;
    }
  }

  // 1. Kiểm tra L2 Redis DB 3 (Aux) để tận dụng cache phân tán giữa các Serverless instances
  try {
    const redisCached = await cacheService.get<ResolvedActorProfile>(`actor:profile:v1:${slug}`);
    if (redisCached && redisCached.canonicalName) {
      if (ACTOR_PROFILE_RAM_CACHE.size >= MAX_ACTOR_PAGE_RAM_ENTRIES) {
        const oldest = ACTOR_PROFILE_RAM_CACHE.keys().next().value;
        if (oldest) ACTOR_PROFILE_RAM_CACHE.delete(oldest);
      }
      ACTOR_PROFILE_RAM_CACHE.set(slug, {
        profile: redisCached,
        expireAt: Date.now() + 7200000,
      });
      return redisCached;
    }
  } catch {}

  const { personId: explicitPersonId, rawName } = parseActorIdentifier(slug);

  // 1. Phân giải danh tính nghệ sĩ On-Demand
  const historicalItem = getHistoricalArtistBySlug(slug) || (rawName ? getHistoricalArtistBySlug(rawName) : undefined);
  const actorSynonyms = getActorSynonyms(rawName) || getActorSynonyms(slug);

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
  }

  let canonicalName =
    historicalItem?.name ||
    actorSynonyms?.canonicalName ||
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

    if (candidateNames.some((c) => c === normDetailName || c.includes(normDetailName) || normDetailName.includes(c))) {
      return true;
    }

    if (Array.isArray(detail.also_known_as)) {
      const akaList = detail.also_known_as.map((a: string) => normalizeForMatch(a));
      if (candidateNames.some((c) => akaList.some((aka: string) => aka === c || aka.includes(c) || c.includes(aka)))) {
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
        if (!historicalItem?.name && !actorSynonyms?.canonicalName && detailCandidate.name) {
          canonicalName = toVietnameseTitleCase(detailCandidate.name);
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
          if (!historicalItem?.name && !actorSynonyms?.canonicalName && detailCandidate.name) {
            canonicalName = toVietnameseTitleCase(detailCandidate.name);
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

  if (ACTOR_PROFILE_RAM_CACHE.size >= MAX_ACTOR_PAGE_RAM_ENTRIES) {
    const oldest = ACTOR_PROFILE_RAM_CACHE.keys().next().value;
    if (oldest) ACTOR_PROFILE_RAM_CACHE.delete(oldest);
  }
  ACTOR_PROFILE_RAM_CACHE.set(slug, {
    profile: resolved,
    expireAt: Date.now() + 7200000,
  });

  cacheService.set(`actor:profile:v1:${slug}`, resolved, ACTOR_PAGE_REDIS_TTL_SEC).catch(() => {});

  return resolved;
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await resolveActorProfile(slug);
  const actorName = toVietnameseTitleCase(profile.canonicalName || profile.rawName);
  const intlName = profile.englishName;
  const isAsian = isAsianScript(actorName);
  const displayTitleName = intlName && isAsian ? `${actorName} (${intlName})` : actorName;

  return {
    title: `Phim của ${displayTitleName} - Tiểu sử & Danh sách phim | Nanaflix`,
    description: `Khám phá hồ sơ tiểu sử, vai diễn nổi bật và trọn bộ tuyển tập phim của nghệ sĩ ${displayTitleName} chất lượng cao trên Nanaflix.`,
    openGraph: {
      title: `${displayTitleName} - Hồ sơ nghệ sĩ & Danh sách phim | Nanaflix`,
      description: `Xem trọn bộ phim của ${displayTitleName} phụ đề Vietsub và Thuyết minh chất lượng cao tại Nanaflix.`,
    },
  };
}

export default async function ActorDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const now = Date.now();
  const cachedPage = ACTOR_PAGE_RAM_CACHE.get(slug);
  if (cachedPage && cachedPage.expireAt > now) {
    if (cachedPage.isNotFound) {
      notFound();
    }
  }

  const profile = await resolveActorProfile(slug);
  if (profile.isCachedNotFound) {
    notFound();
  }

  const {
    canonicalName: rawCanonical,
    actorAliases,
    historicalItem,
    actorSynonyms,
    actorRes,
    matchedPreset,
    tmdbDetail,
  } = profile;

  const canonicalName = toVietnameseTitleCase(rawCanonical || profile.rawName);

  // 3. Tra cứu thông tin bổ trợ từ Wikipedia và Danh sách phim
  // Chỉ gọi Wikipedia khi TMDb thiếu tiểu sử hoặc thiếu ảnh (tiết kiệm 100% lệnh Redis wiki:* cho các diễn viên TMDB đầy đủ)
  const needsWiki = !historicalItem?.bio && (!tmdbDetail?.biography || !tmdbDetail?.profile_path);
  const wikiProfilePromise = (needsWiki && canonicalName) ? fetchActorProfile(canonicalName) : Promise.resolve(null);
  const moviesPromise = canonicalName
    ? queryMoviesByActor(
        canonicalName,
        actorAliases,
        historicalItem?.country || actorRes?.country || actorSynonyms?.country || "",
        150,
        profile.tmdbPersonId
      )
    : Promise.resolve([]);

  let wikiProfile = (cachedPage?.movies && cachedPage.movies.length > 0) ? cachedPage.wikiProfile : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let movies: any[] = (cachedPage?.movies as any[]) ?? [];

  if (!cachedPage || cachedPage.expireAt <= now || !Array.isArray(movies) || movies.length === 0) {
    try {
      const redisFull = await cacheService.get<{ wikiProfile: ActorProfile | null; movies: unknown[] }>(
        `actor:full_page:v3:${slug}`
      );
      if (redisFull && Array.isArray(redisFull.movies) && redisFull.movies.length > 0) {
        wikiProfile = redisFull.wikiProfile;
        movies = redisFull.movies;
      }
    } catch {}

    if (!movies || movies.length === 0) {
      [wikiProfile, movies] = await Promise.all([wikiProfilePromise, moviesPromise]);
      if (movies && movies.length > 0) {
        await enrichMovieListPosters(movies, { budgetMs: 0, stripProxyUrls: true });
        cacheService
          .set(`actor:full_page:v3:${slug}`, { wikiProfile, movies }, ACTOR_PAGE_REDIS_TTL_SEC)
          .catch(() => {});
      }
    } else {
      await enrichMovieListPosters(movies, { budgetMs: 0, stripProxyUrls: true });
    }
  } else if (movies && movies.length > 0) {
    await enrichMovieListPosters(movies, { budgetMs: 0, stripProxyUrls: true });
  }

  // Nếu không tìm thấy thông tin trên TMDb, Wikipedia và cũng không có phim nào trên hệ thống -> 404 Not Found
  if (!tmdbDetail && !wikiProfile && (!movies || movies.length === 0)) {
    if (ACTOR_PAGE_RAM_CACHE.size >= MAX_ACTOR_PAGE_RAM_ENTRIES) {
      const oldest = ACTOR_PAGE_RAM_CACHE.keys().next().value;
      if (oldest) ACTOR_PAGE_RAM_CACHE.delete(oldest);
    }
    ACTOR_PAGE_RAM_CACHE.set(slug, {
      profile: null,
      wikiProfile: null,
      movies: [],
      isNotFound: true,
      expireAt: Date.now() + 3600000, // 1h negative RAM cache
    });
    notFound();
  }

  if (movies && movies.length > 0) {
    if (ACTOR_PAGE_RAM_CACHE.size >= MAX_ACTOR_PAGE_RAM_ENTRIES) {
      const oldest = ACTOR_PAGE_RAM_CACHE.keys().next().value;
      if (oldest) ACTOR_PAGE_RAM_CACHE.delete(oldest);
    }
    ACTOR_PAGE_RAM_CACHE.set(slug, {
      profile,
      wikiProfile,
      movies,
      expireAt: Date.now() + 7200000, // 2h RAM cache
    });
  }

  const rawCountry =
    historicalItem?.country ||
    actorRes?.country ||
    actorSynonyms?.country ||
    matchedPreset?.country ||
    "";
  const country = cleanCountryName(rawCountry);

  const formatProfileUrl = (path?: string | null) => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `https://image.tmdb.org/t/p/w500${path.startsWith("/") ? "" : "/"}${path}`;
  };

  // 4. Xác định avatar chất lượng tốt nhất
  const bestAvatar =
    historicalItem?.avatarUrl ||
    formatProfileUrl(tmdbDetail?.profile_path) ||
    wikiProfile?.thumbnail;

  // 5. Đánh giá chất lượng đa nguồn & xác định tiểu sử hoàn thiện nhất
  const bestBio = selectBestBiography({
    historicalBio: historicalItem?.bio,
    wikiExtract: wikiProfile?.extract,
    tmdbBio: tmdbDetail?.biography,
    wikiDescription: wikiProfile?.description,
  });

  const isAsian = isAsianScript(canonicalName);
  const englishName =
    profile.englishName ||
    resolveActorInternationalName({
      canonicalName,
      country,
      tmdbDetail,
      historicalItem,
      actorSynonyms,
      actorAliases,
      bioText: bestBio,
    });

  const fullDisplayName = englishName && isAsian ? `${canonicalName} (${englishName})` : canonicalName;

  // 6. Trích xuất thông tin cá nhân thực tế (chỉ hiển thị khi có dữ liệu)
  const birthday = historicalItem?.birthday || tmdbDetail?.birthday;
  const deathday = historicalItem?.deathday || tmdbDetail?.deathday;
  const formattedBirthday = formatDate(birthday);
  const age = calculateAge(birthday, deathday);
  const placeOfBirth = historicalItem?.placeOfBirth || tmdbDetail?.place_of_birth;
  const knownRole =
    historicalItem?.roles ||
    (tmdbDetail?.known_for_department === "Acting"
      ? "Diễn viên điện ảnh"
      : tmdbDetail?.known_for_department === "Directing"
      ? "Đạo diễn điện ảnh"
      : "Nghệ sĩ điện ảnh");
  const wikiUrl = historicalItem?.wikiUrl || wikiProfile?.wikiUrl;

  // Trích xuất thể loại tiêu biểu và thời kỳ hoạt động từ dữ liệu phim CÓ SẴN trong props (0ms, tuyệt đối không query DB)
  const { topGenres, careerSpan } = (() => {
    const genreCount: Record<string, number> = {};
    const years: number[] = [];

    for (const m of movies || []) {
      if (m.year) {
        const y = typeof m.year === "number" ? m.year : parseInt(String(m.year), 10);
        if (!isNaN(y) && y >= 1950 && y <= 2030) years.push(y);
      }
      const rawCats = m.category || m.categories || [];
      if (Array.isArray(rawCats)) {
        for (const cat of rawCats) {
          const name = typeof cat === "string" ? cat : cat?.name;
          if (name && typeof name === "string" && name.trim()) {
            const clean = name.trim();
            genreCount[clean] = (genreCount[clean] || 0) + 1;
          }
        }
      }
    }

    const sortedGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 3);

    let span: string | null = null;
    if (years.length > 0) {
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      span = minYear === maxYear ? `${minYear}` : `${minYear} – ${maxYear}`;
    }

    return { topGenres: sortedGenres, careerSpan: span };
  })();

  return (
    <div className="min-h-dvh bg-[#050505] text-zinc-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-clip">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1800px] h-[550px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(var(--accent-rgb),0.15),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-20 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1800px] mx-auto w-full space-y-8 sm:space-y-16">
        
        {/* ============================================================ */}
        {/* BREADCRUMB & BACK BUTTON DÙNG CHUNG */}
        {/* ============================================================ */}
        <PageHeader
          backHref="/browse"
          backLabel="Khám phá phim"
          breadcrumbs={[{ label: fullDisplayName }]}
        />

        {/* ============================================================ */}
        {/* HERO SECTION: PORTRAIT + CINEMATIC METADATA (NO CLUNKY NESTED CARDS) */}
        {/* ============================================================ */}
        <section className="relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 md:gap-10">
            
            {/* 1. PORTRAIT IMAGE */}
            <div className="relative w-36 h-48 sm:w-44 sm:h-60 md:w-52 md:h-72 rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl ring-1 ring-white/10 shrink-0 group">
              <ActorAvatar
                name={canonicalName}
                avatarUrl={bestAvatar}
                shape="card"
                priority
                imageClassName="group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 176px, 208px"
              />
            </div>

            {/* 2. ACTOR MAIN DETAILS */}
            <div className="flex-1 space-y-4 text-center sm:text-left min-w-0 w-full">
              
              {/* COUNTRY & ROLES BADGES */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {country && (
                  <CountryBadge
                    country={country}
                    className="px-3 py-1 bg-red-500/10 text-red-300 border-red-500/20 text-xs font-bold"
                  />
                )}
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-zinc-300 text-xs font-semibold">
                  {knownRole}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center gap-1.5 tabular-nums">
                  <Clapperboard className="w-3.5 h-3.5" />
                  <span>{movies.length} tác phẩm</span>
                </span>
                {careerSpan && (
                  <span className="px-3 py-1 rounded-full bg-white/[0.06] text-zinc-400 text-xs font-medium tabular-nums">
                    {careerSpan}
                  </span>
                )}
                {historicalItem?.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-300 text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* NAME & INTERNATIONAL NAME */}
              <div className="space-y-1.5 min-w-0">
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                  {canonicalName}
                  {englishName && isAsian && (
                    <span className="text-xl sm:text-3xl md:text-4xl text-zinc-400 font-normal ml-3 inline-block">
                      ({englishName})
                    </span>
                  )}
                </h1>
                {englishName && (
                  <p className="text-sm sm:text-base text-zinc-400 font-medium">
                    {isAsian ? "Tên quốc tế / Phiên âm:" : "Tên quốc tế:"}{" "}
                    <span className="text-zinc-200 font-semibold">{englishName}</span>
                  </p>
                )}
              </div>

              {/* PERSONAL FACTS (NGÀY SINH, NƠI SINH) - DẠNG INLINE THOÁNG MẮT */}
              {(formattedBirthday || placeOfBirth) && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-zinc-400 pt-1">
                  {formattedBirthday && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <span className="text-zinc-500">Ngày sinh:</span>{" "}
                        <span className="text-zinc-200 font-medium tabular-nums">
                          {formattedBirthday} {age ? `(${age})` : ""}
                        </span>
                      </span>
                    </div>
                  )}
                  {placeOfBirth && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        <span className="text-zinc-500">Nơi sinh:</span>{" "}
                        <span className="text-zinc-200 font-medium">{placeOfBirth}</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* DÒNG PHIM NỔI BẬT */}
              {topGenres.length > 0 && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                  <span className="text-xs text-zinc-400 font-medium mr-1">Thể loại tiêu biểu:</span>
                  {topGenres.map((genre) => (
                    <span
                      key={genre}
                      className="px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300 text-xs font-medium"
                    >
                      #{genre}
                    </span>
                  ))}
                </div>
              )}

              {/* ACTION BUTTONS (FAVORITE) - TRỰC TIẾP TRÊN CẢ DESKTOP LẪN MOBILE */}
              <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                <FavoriteActorButton
                  id={profile.tmdbPersonId || slug}
                  name={fullDisplayName}
                  slug={slug}
                  avatarUrl={bestAvatar}
                  country={country}
                  roles={knownRole}
                  totalMovies={movies.length}
                />
              </div>
            </div>

          </div>
        </section>

        {/* ============================================================ */}
        {/* BIOGRAPHY & FILMOGRAPHY CLIENT INTERACTION */}
        {/* ============================================================ */}
        <ActorDetailClient
          movies={movies}
          bioText={bestBio}
          wikiUrl={wikiUrl}
          actorName={fullDisplayName}
        />

      </main>

      <Footer />
    </div>
  );
}
