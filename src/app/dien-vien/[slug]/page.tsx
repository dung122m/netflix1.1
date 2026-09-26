import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Clapperboard,
  Sparkles,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getActorBySlug, ACTORS_CATALOG } from "@/data/actorsCatalog";
import {
  getActorSynonyms,
  resolveActorMovies,
  queryMoviesByActor,
  GOLDEN_ACTOR_INDEX,
} from "@/services/aiActorService";
import { normalizeForMatch } from "@/lib/stringUtils";
import {
  searchTmdbPerson,
  getTmdbPersonDetail,
} from "@/services/tmdbService";
import { fetchActorProfile } from "@/services/wikipediaService";
import { ActorDetailClient } from "@/components/actors/ActorDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalogItem = getActorBySlug(slug);
  const rawQuery = slug.replace(/-/g, " ");
  const synonymRes = getActorSynonyms(rawQuery) || getActorSynonyms(slug);
  const actorName = catalogItem?.name || synonymRes?.canonicalName || rawQuery;

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
  const rawQuery = slug.replace(/-/g, " ");

  // 1. Phân giải danh tính nghệ sĩ (Chuẩn hóa 100% khớp với flow của /browse)
  const catalogItem = getActorBySlug(slug);
  const actorSynonyms = getActorSynonyms(rawQuery) || getActorSynonyms(slug);

  const actorRes = actorSynonyms?.isMatched
    ? {
        actorName: actorSynonyms.canonicalName,
        country: actorSynonyms.country,
        aliases: actorSynonyms.variants,
        isActor: true,
        source: "preset" as const,
      }
    : await resolveActorMovies(rawQuery);

  const canonicalName =
    catalogItem?.name ||
    (actorRes?.isActor ? actorRes.actorName : (actorSynonyms?.canonicalName || rawQuery));

  const actorAliases = Array.from(
    new Set([
      canonicalName,
      ...(catalogItem?.aliases || []),
      ...(actorSynonyms?.variants || []),
      ...(actorRes?.aliases || []),
      rawQuery,
    ])
  ).filter(Boolean);

  const matchedPreset = GOLDEN_ACTOR_INDEX.find(
    (p) => normalizeForMatch(p.name) === normalizeForMatch(canonicalName)
  );
  if (matchedPreset) {
    actorAliases.push(...matchedPreset.aliases);
  }

  const country =
    catalogItem?.country ||
    actorRes?.country ||
    actorSynonyms?.country ||
    matchedPreset?.country ||
    "";
  const englishName = catalogItem?.englishName || actorSynonyms?.englishName;

  if (!canonicalName || !canonicalName.trim()) {
    notFound();
  }

  // 2. Tối ưu: Sử dụng trực tiếp metadata hardcoded, chỉ gọi API phụ khi thiếu dữ liệu
  const hasLocalMetadata = Boolean(catalogItem?.avatarUrl && catalogItem?.bio);

  const tmdbDetailPromise = hasLocalMetadata
    ? Promise.resolve(null)
    : catalogItem?.tmdbPersonId
    ? getTmdbPersonDetail(catalogItem.tmdbPersonId)
    : searchTmdbPerson(canonicalName, canonicalName, actorAliases).then((p) =>
        p?.id ? getTmdbPersonDetail(p.id) : null
      );

  const wikiProfilePromise = hasLocalMetadata
    ? Promise.resolve(null)
    : fetchActorProfile(canonicalName);

  const [tmdbDetail, wikiProfile, movies] = await Promise.all([
    tmdbDetailPromise,
    wikiProfilePromise,
    queryMoviesByActor(canonicalName, actorAliases, country, 80),
  ]);

  // 3. Xác định avatar chất lượng tốt nhất
  const bestAvatar =
    catalogItem?.avatarUrl ||
    (tmdbDetail?.profile_path ? `https://image.tmdb.org/t/p/w500${tmdbDetail.profile_path}` : undefined) ||
    wikiProfile?.thumbnail;

  // 4. Xác định tiểu sử tốt nhất
  const bestBio =
    catalogItem?.bio ||
    wikiProfile?.extract ||
    tmdbDetail?.biography ||
    wikiProfile?.description;

  // 5. Trích xuất thông tin cá nhân thực tế (chỉ hiển thị khi có dữ liệu)
  const birthday = catalogItem?.birthday || tmdbDetail?.birthday;
  const deathday = catalogItem?.deathday || tmdbDetail?.deathday;
  const formattedBirthday = formatDate(birthday);
  const age = calculateAge(birthday, deathday);
  const placeOfBirth = catalogItem?.placeOfBirth || tmdbDetail?.place_of_birth;
  const knownRole =
    catalogItem?.roles ||
    (tmdbDetail?.known_for_department === "Acting"
      ? "Diễn viên điện ảnh"
      : tmdbDetail?.known_for_department === "Directing"
      ? "Đạo diễn điện ảnh"
      : "Nghệ sĩ điện ảnh");
  const wikiUrl = catalogItem?.wikiUrl || wikiProfile?.wikiUrl;

  // 6. Diễn viên cùng khu vực (Discovery)
  const relatedActors = ACTORS_CATALOG.filter(
    (a) =>
      a.slug !== slug &&
      catalogItem?.countryCode &&
      a.countryCode === catalogItem.countryCode
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 flex flex-col selection:bg-netflix-red selection:text-white font-sans antialiased overflow-x-hidden">
      <Navbar />

      {/* AMBIENT GLOW */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1800px] h-[550px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(229,9,20,0.15),rgba(0,0,0,0))] pointer-events-none -z-10" />

      <main className="flex-1 pt-24 sm:pt-28 pb-24 px-4 sm:px-6 md:px-10 lg:px-12 max-w-[1800px] mx-auto w-full space-y-12 sm:space-y-16">
        
        {/* ============================================================ */}
        {/* BREADCRUMB & BACK BUTTON */}
        {/* ============================================================ */}
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <Link
            href="/dien-vien"
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-full border border-white/[0.08]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tất cả diễn viên</span>
          </Link>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-300 truncate">{canonicalName}</span>
        </div>

        {/* ============================================================ */}
        {/* HERO SECTION: PORTRAIT + KEY FACTS */}
        {/* ============================================================ */}
        <section className="p-6 sm:p-8 md:p-10 rounded-3xl bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-zinc-950 border border-white/[0.1] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 md:gap-10">
            
            {/* PORTRAIT IMAGE */}
            <div className="relative w-40 h-52 sm:w-48 sm:h-64 md:w-56 md:h-72 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-white/20 shadow-2xl shrink-0 group ring-1 ring-white/10">
              {bestAvatar ? (
                <Image
                  src={bestAvatar}
                  alt={canonicalName}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 768px) 192px, 224px"
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-gray-400">
                  <User className="w-16 h-16 sm:w-20 sm:h-20" />
                </div>
              )}
            </div>

            {/* ACTOR DETAILS & FACTS */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              
              {/* COUNTRY & ROLES BADGES */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {country && (
                  <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-bold">
                    {country}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-gray-300 text-xs font-semibold">
                  {knownRole}
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold flex items-center gap-1">
                  <Clapperboard className="w-3 h-3" />
                  <span>{movies.length} Phim trên Nanaflix</span>
                </span>
              </div>

              {/* NAME */}
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {canonicalName}
                </h1>
                {englishName && englishName !== canonicalName && (
                  <p className="text-sm sm:text-base text-gray-400 font-medium">
                    Tên quốc tế: <span className="text-gray-200">{englishName}</span>
                  </p>
                )}
              </div>

              {/* PERSONAL FACTS GRID (CHỈ HIỂN THỊ KHI CÓ DỮ LIỆU ĐÁNG TIN CẬY) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-white/[0.08]">
                {formattedBirthday && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-left text-xs">
                      <div className="text-gray-400 text-[10px]">Ngày sinh</div>
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
                      <div className="text-gray-400 text-[10px]">Nơi sinh</div>
                      <div className="text-white font-bold truncate max-w-[180px]">
                        {placeOfBirth}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-left text-xs">
                    <div className="text-gray-400 text-[10px]">Độ phổ biến</div>
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

        {/* ============================================================ */}
        {/* RELATED ACTORS (DISCOVERY) */}
        {/* ============================================================ */}
        {relatedActors.length > 0 && (
          <section className="pt-10 border-t border-white/[0.08] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-netflix-red" />
                <span>Nghệ Sĩ Nổi Bật Cùng Khu Vực</span>
              </h2>
              <Link
                href="/dien-vien"
                className="text-xs text-netflix-red hover:underline font-semibold"
              >
                Xem tất cả
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
              {relatedActors.map((actor) => (
                <Link
                  key={`rel-${actor.slug}`}
                  href={`/dien-vien/${actor.slug}`}
                  className="group p-3 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900 border border-white/[0.06] hover:border-netflix-red/50 transition-all text-center space-y-2 shadow"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-zinc-800 mx-auto border border-white/10 group-hover:border-netflix-red group-hover:scale-105 transition-all flex items-center justify-center">
                    {actor.avatarUrl ? (
                      <Image
                        src={actor.avatarUrl}
                        alt={actor.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <User className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-netflix-red transition-colors truncate">
                      {actor.name}
                    </h3>
                    <p className="text-[10px] text-gray-400 truncate">{actor.country}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>

      <Footer />
    </div>
  );
}
