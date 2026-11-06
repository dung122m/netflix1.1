import React, { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * ISR / Edge Cache: Cho phép CDN Cloudflare và Vercel Edge cache response HTML 24 giờ.
 * Ngăn chặn crawler bot kích hoạt lại SSR và giảm 90%+ Redis DB3 commands.
 */
export const revalidate = 86400;
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clapperboard,
  Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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
import { fetchActorProfile } from "@/services/wikipediaService";
import { selectBestBiography } from "@/lib/bioFormatter";
import { ActorDetailClient } from "@/components/actors/ActorDetailClient";
import { ActorAvatar } from "@/components/actors/ActorAvatar";

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
  let personId: number | undefined = undefined;
  let cleanSlug = (slug || "").trim();
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

  const rawName = cleanSlug.replace(/-/g, " ").trim();
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

/**
 * Request-scoped memoized actor profile resolver (React cache).
 * Loại bỏ hoàn toàn Double GET giữa generateMetadata() và ActorDetailPage() trong cùng 1 request SSR.
 */
const resolveActorProfile = cache(async (slug: string) => {
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
    (actorRes?.isActor ? actorRes.actorName : (actorSynonyms?.canonicalName || (rawName ? toVietnameseTitleCase(rawName) : "")));

  const actorAliases = Array.from(
    new Set([
      canonicalName,
      ...(historicalItem?.aliases || []),
      ...(actorSynonyms?.variants || []),
      ...(actorRes?.aliases || []),
      rawName,
    ])
  ).filter(Boolean);

  const matchedPreset = GOLDEN_ACTOR_INDEX.find(
    (p) => normalizeForMatch(p.name) === normalizeForMatch(canonicalName)
  );
  if (matchedPreset) {
    actorAliases.push(...matchedPreset.aliases);
  }

  // 2. Tra cứu chi tiết diễn viên từ TMDb Person API theo ID hoặc Search có ngưỡng khớp chặt chẽ
  let tmdbDetail = null;
  if (tmdbPersonId) {
    try {
      tmdbDetail = await getTmdbPersonDetail(tmdbPersonId);
      if (tmdbDetail?.name) {
        canonicalName = tmdbDetail.name;
      }
    } catch {
      // Ignored
    }
  } else if (canonicalName) {
    try {
      const matchedPerson = await searchTmdbPerson(canonicalName, canonicalName, actorAliases);
      if (matchedPerson?.id) {
        tmdbPersonId = matchedPerson.id;
        tmdbDetail = await getTmdbPersonDetail(matchedPerson.id);
        if (tmdbDetail?.name) {
          canonicalName = tmdbDetail.name;
        }
      }
    } catch {
      // Ignored
    }
  }

  return {
    rawName,
    tmdbPersonId,
    canonicalName,
    actorAliases,
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
  const actorName = profile.canonicalName || profile.rawName;

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
  const {
    canonicalName,
    actorAliases,
    historicalItem,
    actorSynonyms,
    actorRes,
    matchedPreset,
    tmdbDetail,
  } = await resolveActorProfile(slug);

  // 3. Tra cứu thông tin bổ trợ từ Wikipedia và Danh sách phim
  const wikiProfilePromise = canonicalName ? fetchActorProfile(canonicalName) : Promise.resolve(null);
  const moviesPromise = canonicalName
    ? queryMoviesByActor(canonicalName, actorAliases, historicalItem?.country || actorRes?.country || actorSynonyms?.country || "", 150)
    : Promise.resolve([]);

  const [wikiProfile, movies] = await Promise.all([wikiProfilePromise, moviesPromise]);

  // Nếu không tìm thấy thông tin trên TMDb, Wikipedia và cũng không có phim nào trên hệ thống -> 404 Not Found
  if (!tmdbDetail && !wikiProfile && (!movies || movies.length === 0)) {
    notFound();
  }

  const country =
    historicalItem?.country ||
    actorRes?.country ||
    actorSynonyms?.country ||
    matchedPreset?.country ||
    "";
  const englishName = historicalItem?.englishName || actorSynonyms?.englishName || tmdbDetail?.name;

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
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1800px] h-[550px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(var(--accent-rgb),0.15),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-24 sm:pt-28 pb-24 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1800px] mx-auto w-full space-y-12 sm:space-y-16">
        
        {/* ============================================================ */}
        {/* BREADCRUMB & BACK BUTTON */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-full border border-white/[0.08]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Khám phá phim</span>
          </Link>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300 truncate">{canonicalName}</span>
        </div>

        {/* ============================================================ */}
        {/* HERO SECTION: PORTRAIT + KEY FACTS */}
        {/* ============================================================ */}
        <section className="p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-zinc-900/40 border border-white/[0.08] backdrop-blur-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 md:gap-10">
            
            {/* PORTRAIT IMAGE */}
            <div className="relative w-40 h-52 sm:w-48 sm:h-64 md:w-56 md:h-72 rounded-2xl overflow-hidden bg-zinc-900 border-2 shadow-2xl shrink-0 group">
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
                <span className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-zinc-300 text-xs font-semibold">
                  {knownRole}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center gap-1">
                  <Clapperboard className="w-3 h-3" />
                  <span>{movies.length} Phim trên Nanaflix</span>
                </span>
                {historicalItem?.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 text-xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* NAME */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {canonicalName}
                </h1>
                {englishName && englishName !== canonicalName && (
                  <p className="text-sm sm:text-base text-zinc-400 font-medium">
                    Tên quốc tế: <span className="text-zinc-200">{englishName}</span>
                  </p>
                )}
              </div>

              {/* PERSONAL FACTS GRID (CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU ĐÁNG TIN CẬY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-white/[0.08]">
                {formattedBirthday && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
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
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="text-left text-xs">
                      <div className="text-zinc-400 text-[10px]">Nơi sinh</div>
                      <div className="text-white font-bold truncate max-w-[180px]">
                        {placeOfBirth}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
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
