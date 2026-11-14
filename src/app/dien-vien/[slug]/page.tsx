import React, { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * ISR / Edge Cache: Cho phép CDN Cloudflare và Vercel Edge cache response HTML 24 giờ.
 * Ngăn chặn crawler bot kích hoạt lại SSR và giảm 90%+ Redis DB3 commands.
 */
export const dynamic = "force-static";
export const revalidate = 86400;
import {
  Calendar,
  MapPin,
  Clapperboard,
  TrendingUp,
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
import { normalizeForMatch } from "@/lib/stringUtils";
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
  actorAliases: string[];
  historicalItem?: ReturnType<typeof getHistoricalArtistBySlug>;
  actorSynonyms?: ReturnType<typeof getActorSynonyms> | null;
  actorRes: Awaited<ReturnType<typeof resolveActorMovies>> | null;
  matchedPreset?: (typeof GOLDEN_ACTOR_INDEX)[number];
  tmdbDetail: Awaited<ReturnType<typeof getTmdbPersonDetail>> | null;
  isCachedNotFound?: boolean;
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
const MAX_ACTOR_PAGE_RAM_ENTRIES = 2000;

/**
 * Request-scoped memoized actor profile resolver (React cache).
 * Loại bỏ hoàn toàn Double GET giữa generateMetadata() và ActorDetailPage() trong cùng 1 request SSR.
 */
const resolveActorProfile = cache(async (slug: string): Promise<ResolvedActorProfile> => {
  const cachedPage = ACTOR_PAGE_RAM_CACHE.get(slug);
  if (cachedPage && cachedPage.expireAt > Date.now()) {
    if (cachedPage.isNotFound) {
      return {
        rawName: slug.replace(/-/g, " "),
        tmdbPersonId: undefined,
        canonicalName: "",
        actorAliases: [],
        historicalItem: undefined,
        actorSynonyms: null,
        actorRes: null,
        matchedPreset: undefined,
        tmdbDetail: null,
        isCachedNotFound: true,
      };
    }
    if (cachedPage.profile) {
      return cachedPage.profile;
    }
  }

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

  return {
    rawName: toVietnameseTitleCase(rawName),
    tmdbPersonId: tmdbPersonId || tmdbDetail?.id,
    canonicalName: toVietnameseTitleCase(canonicalName || rawName),
    actorAliases: deduplicatedAliases,
    historicalItem,
    actorSynonyms,
    actorRes,
    matchedPreset,
    tmdbDetail,
  };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await resolveActorProfile(slug);
  const actorName = toVietnameseTitleCase(profile.canonicalName || profile.rawName);

  return {
    title: `Phim của ${actorName} - Tiểu sử & Danh sách phim | Nanaflix`,
    description: `Khám phá hồ sơ tiểu sử, vai diễn nổi bật và trọn bộ tuyển tập phim của nghệ sĩ ${actorName} chất lượng cao trên Nanaflix.`,
    openGraph: {
      title: `${actorName} - Hồ sơ nghệ sĩ & Danh sách phim | Nanaflix`,
      description: `Xem trọn bộ phim của ${actorName} phụ đề Vietsub và Thuyết minh chất lượng cao tại Nanaflix.`,
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

  const [wikiProfile, movies] = cachedPage && cachedPage.expireAt > now
    ? [cachedPage.wikiProfile, cachedPage.movies]
    : await Promise.all([wikiProfilePromise, moviesPromise]);

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

  if (!cachedPage || cachedPage.expireAt <= now) {
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

  const country =
    historicalItem?.country ||
    actorRes?.country ||
    actorSynonyms?.country ||
    matchedPreset?.country ||
    "";
  // Xác định Tên quốc tế chuẩn mực (International Name)
  // Ưu tiên 1: Tên quốc tế chính thức từ TMDb Person API (ví dụ: "Sammo Hung", "Huang Zitao", "Jackie Chan")
  // Ưu tiên 2: Tên quốc tế đã duyệt trong historicalArtists (historicalItem.englishName)
  // Ưu tiên 3: Tên bí danh quốc tế trong actorSynonyms
  const resolveEnglishName = () => {
    // Nghệ sĩ Việt Nam không sử dụng trường "Tên quốc tế"
    if (country && country.includes("Việt Nam")) {
      return undefined;
    }

    const normCanonical = normalizeForMatch(canonicalName);
    const hasVietnameseDiacritics = (str: string) =>
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);

    const isValidInternationalName = (candidate?: string | null) => {
      if (!candidate || !candidate.trim()) return false;
      // Không được chứa dấu tiếng Việt (vì là tên quốc tế Latin/English/Pinyin)
      if (hasVietnameseDiacritics(candidate)) return false;
      const normCandidate = normalizeForMatch(candidate);
      // Không được trùng với tên canonical bỏ dấu (tránh "hong kim bao", "hoang tu thao")
      if (normCandidate === normCanonical) return false;
      return true;
    };

    if (tmdbDetail?.name && isValidInternationalName(tmdbDetail.name)) {
      return toVietnameseTitleCase(tmdbDetail.name);
    }

    if (historicalItem?.englishName && isValidInternationalName(historicalItem.englishName)) {
      return toVietnameseTitleCase(historicalItem.englishName);
    }

    if (actorSynonyms?.englishName && isValidInternationalName(actorSynonyms.englishName)) {
      return toVietnameseTitleCase(actorSynonyms.englishName);
    }

    return undefined;
  };

  const englishName = resolveEnglishName();

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
          breadcrumbs={[{ label: canonicalName }]}
        />

        {/* ============================================================ */}
        {/* HERO SECTION: PORTRAIT + KEY FACTS */}
        {/* ============================================================ */}
        <section className="p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-zinc-900/40 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-8 md:gap-10">
            
            {/* PORTRAIT IMAGE */}
            <div className="relative w-36 h-48 sm:w-48 sm:h-64 md:w-56 md:h-72 rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl shrink-0 group">
              <ActorAvatar
                name={canonicalName}
                avatarUrl={bestAvatar}
                shape="card"
                priority
                imageClassName="group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 192px, 224px"
              />
            </div>

            {/* ACTOR DETAILS & FACTS */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              
              {/* COUNTRY & ROLES BADGES */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {country && (
                  <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-300 text-xs font-bold">
                    {country}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-white/[0.06] text-zinc-300 text-xs font-semibold">
                  {knownRole}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center gap-1">
                  <Clapperboard className="w-3 h-3" />
                  <span>{movies.length} Phim trên Nanaflix</span>
                </span>
                {historicalItem?.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-300 text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* NAME & ACTIONS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                    {canonicalName}
                  </h1>
                  {englishName && normalizeForMatch(englishName) !== normalizeForMatch(canonicalName) && (
                    <p className="text-sm sm:text-base text-zinc-400 font-medium">
                      Tên quốc tế: <span className="text-zinc-200">{englishName}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-center sm:justify-start shrink-0">
                  <FavoriteActorButton
                    id={profile.tmdbPersonId || slug}
                    name={canonicalName}
                    slug={slug}
                    avatarUrl={bestAvatar}
                    country={country}
                    roles={knownRole}
                    totalMovies={movies.length}
                  />
                </div>
              </div>

              {/* PERSONAL FACTS GRID (CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU ĐÁNG TIN CẬY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-white/[0.08]">
                {formattedBirthday && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04]">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-left text-xs">
                      <div className="text-zinc-400 text-[10px]">Ngày sinh</div>
                      <div className="text-white font-bold">
                        {formattedBirthday} {age ? `(${age})` : ""}
                      </div>
                    </div>
                  </div>
                )}

                {placeOfBirth && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04]">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="text-left text-xs">
                      <div className="text-zinc-400 text-[10px]">Nơi sinh</div>
                      <div className="text-white font-bold truncate max-w-[180px]">
                        {placeOfBirth}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04]">
                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-left text-xs">
                    <div className="text-zinc-400 text-[10px]">Độ phổ biến</div>
                    <div className="text-white font-bold">
                      {tmdbDetail?.popularity ? `Top ${Math.round(tmdbDetail.popularity)} TMDB` : "Nghệ sĩ nổi tiếng"}
                    </div>
                  </div>
                </div>
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
          actorName={canonicalName}
        />

      </main>

      <Footer />
    </div>
  );
}
