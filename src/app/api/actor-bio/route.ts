import { NextRequest, NextResponse } from "next/server";
import { findHistoricalArtist } from "@/data/history/historicalArtistsBirthdays";
import { getActorMatchTerms } from "@/services/actor/actorAlias";
import { fetchActorProfile, cleanBioExtract } from "@/services/wikipediaService";
import { searchTmdbPerson, getTmdbPersonDetail } from "@/services/tmdbService";
import { selectBestBiography } from "@/services/actor/bioFormatter";
import { cacheService } from "@/lib/cache";
import { normalizeForMatch } from "@/lib/stringUtils";
import { calculateAgeVi as calculateAge, formatIsoDateToVn as formatDate } from "@/lib/dateFormatters";
import {
  enforceRateLimit,
  buildRateLimitResponse,
  RATE_LIMIT_PRESETS,
} from "@/lib/rateLimit";

import { type EnhancedActorProfile } from "@/services/aiActorService";
export type { EnhancedActorProfile };

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, RATE_LIMIT_PRESETS.PUBLIC_IN_MEMORY_READ);
  if (!rateLimit.allowed) {
    return buildRateLimitResponse(rateLimit);
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const cleanName = name.trim();
  const normKey = normalizeForMatch(cleanName);
  const cacheKey = `actor:bio:v6:${normKey}`;

  // 1. Kiểm tra L1 / L2 Cache
  try {
    const cached = await cacheService.get<EnhancedActorProfile>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          "CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          "Vercel-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      });
    }
  } catch {}

  try {
    // 2. Tra cứu dữ liệu nghệ sĩ lịch sử (nếu có sẵn)
    const catalogItem = findHistoricalArtist(cleanName);

    // 3. Tập hợp các từ khóa alias để đối chiếu đa nguồn
    const aliasTerms = Array.from(
      new Set([
        cleanName,
        catalogItem?.name,
        catalogItem?.englishName,
        ...(catalogItem?.aliases || []),
        ...getActorMatchTerms(cleanName),
      ].filter((t): t is string => Boolean(t && t.trim().length >= 2)))
    );

    const canonicalName = catalogItem?.name || cleanName;

    // 4. Quét đồng thời TMDb Person và Wikipedia theo tất cả alias đã gom
    const tmdbPersonPromise = catalogItem?.tmdbPersonId
      ? getTmdbPersonDetail(catalogItem.tmdbPersonId)
      : searchTmdbPerson(cleanName, canonicalName, aliasTerms).then((p) =>
          p?.id ? getTmdbPersonDetail(p.id) : null
        );

    const wikiProfilePromise = fetchActorProfile(canonicalName, aliasTerms);

    const [tmdbDetail, wikiProfile] = await Promise.all([
      tmdbPersonPromise.catch(() => null),
      wikiProfilePromise.catch(() => null),
    ]);

    // 5. Xác định ảnh đại diện sắc nét nhất
    const formatProfileUrl = (path?: string | null) => {
      if (!path) return undefined;
      if (path.startsWith("http")) return path;
      return `https://image.tmdb.org/t/p/w500${path.startsWith("/") ? "" : "/"}${path}`;
    };

    const bestThumbnail =
      catalogItem?.avatarUrl ||
      formatProfileUrl(tmdbDetail?.profile_path) ||
      wikiProfile?.thumbnail;

    // 6. Trích xuất và làm sạch tiểu sử tốt nhất
    const bestBio = selectBestBiography({
      historicalBio: catalogItem?.bio,
      wikiExtract: wikiProfile?.extract,
      tmdbBio: tmdbDetail?.biography,
      wikiDescription: wikiProfile?.description,
    });

    const cleanedExtract = bestBio ? cleanBioExtract(bestBio) : undefined;

    // 7. Trích xuất metadata bổ trợ
    const birthday = catalogItem?.birthday || tmdbDetail?.birthday || undefined;
    const deathday = catalogItem?.deathday || tmdbDetail?.deathday || undefined;
    const formattedBirthday = formatDate(birthday);
    const age = calculateAge(birthday, deathday);
    const placeOfBirth = catalogItem?.placeOfBirth || tmdbDetail?.place_of_birth || undefined;
    const country = catalogItem?.country || undefined;

    const roles =
      catalogItem?.roles ||
      (tmdbDetail?.known_for_department === "Acting"
        ? "Diễn viên điện ảnh"
        : tmdbDetail?.known_for_department === "Directing"
        ? "Đạo diễn điện ảnh"
        : wikiProfile?.description || "Nghệ sĩ / Diễn viên điện ảnh");

    const englishName =
      catalogItem?.englishName ||
      (tmdbDetail?.name && tmdbDetail.name.toLowerCase() !== canonicalName.toLowerCase()
        ? tmdbDetail.name
        : undefined);

    const wikiUrl =
      wikiProfile?.wikiUrl ||
      catalogItem?.wikiUrl ||
      (wikiProfile?.title
        ? `https://vi.wikipedia.org/wiki/${encodeURIComponent(wikiProfile.title)}`
        : undefined);

    const isFound = Boolean(catalogItem || wikiProfile || tmdbDetail);

    const profile: EnhancedActorProfile = {
      name: cleanName,
      canonicalName: canonicalName !== cleanName ? canonicalName : undefined,
      englishName,
      title: canonicalName,
      description: roles,
      extract: cleanedExtract || (isFound
        ? `Thông tin tiểu sử của ${canonicalName} đang được cập nhật. Bạn có thể xem các phim đã tham gia bên dưới.`
        : undefined),
      thumbnail: bestThumbnail,
      wikiUrl,
      birthday,
      formattedBirthday,
      deathday,
      age,
      placeOfBirth,
      country,
      roles,
      tags: catalogItem?.tags,
      slug: catalogItem?.slug,
      notFound: !isFound,
    };

    // 8. Lưu vào Cache (7 ngày nếu tìm thấy, 30 phút negative cache nếu không thấy)
    cacheService.set(cacheKey, profile, isFound ? 7 * 86400 : 1800).catch(() => {});

    return NextResponse.json(profile, {
      headers: isFound
        ? {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
            "CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
            "Vercel-CDN-Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          }
        : {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            "Vercel-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
    });
  } catch (error) {
    console.error("Actor bio API error:", error);
    return NextResponse.json(
      {
        name: cleanName,
        title: cleanName,
        description: "Nghệ sĩ / Diễn viên điện ảnh",
        extract: `Thông tin tiểu sử của ${cleanName} đang được cập nhật. Bạn có thể xem các phim đã tham gia bên dưới.`,
        notFound: true,
      },
      { status: 200 }
    );
  }
}
