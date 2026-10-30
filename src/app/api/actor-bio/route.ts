import { NextRequest, NextResponse } from "next/server";
import { findCatalogActor } from "@/data/actorsCatalog";
import { getActorMatchTerms } from "@/lib/actorAlias";
import { fetchActorProfile, cleanBioExtract } from "@/services/wikipediaService";
import { searchTmdbPerson, getTmdbPersonDetail } from "@/services/tmdbService";
import { cacheService } from "@/lib/cache";
import { normalizeForMatch } from "@/lib/stringUtils";

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

function formatDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const cleanName = name.trim();
  const normKey = normalizeForMatch(cleanName);
  const cacheKey = `actor:bio:v5:${normKey}`;

  // 1. Kiểm tra L1 / L2 Cache
  try {
    const cached = await cacheService.get<EnhancedActorProfile>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      });
    }
  } catch {}

  try {
    // 2. Tra cứu danh mục diễn viên nội bộ (Actors Catalog)
    const catalogItem = findCatalogActor(cleanName);

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
    const rawBio =
      catalogItem?.bio ||
      wikiProfile?.extract ||
      tmdbDetail?.biography;

    const cleanedExtract = rawBio ? cleanBioExtract(rawBio) : undefined;

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
        ? `Diễn viên nổi bật tham gia nhiều tác phẩm điện ảnh và truyền hình đặc sắc. Khám phá các bộ phim có sự góp mặt của ${canonicalName} ngay trên Nanaflix!`
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

    // 8. Lưu vào Cache 7 ngày
    if (isFound) {
      cacheService.set(cacheKey, profile, 7 * 86400).catch(() => {});
    }

    return NextResponse.json(profile, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Actor bio API error:", error);
    return NextResponse.json(
      {
        name: cleanName,
        title: cleanName,
        description: "Nghệ sĩ / Diễn viên điện ảnh",
        extract: `Khám phá các tác phẩm điện ảnh có sự tham gia của ${cleanName} trên Nanaflix.`,
        notFound: true,
      },
      { status: 200 }
    );
  }
}
