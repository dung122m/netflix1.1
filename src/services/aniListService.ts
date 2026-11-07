import { cacheService } from "@/lib/cache";

const ANILIST_GRAPHQL_ENDPOINT = "https://graphql.anilist.co";

interface AniListPosterResult {
  posterUrl: string | null;
  backdropUrl: string | null;
}

interface AniListMemoryCacheEntry extends AniListPosterResult {
  expireAt: number;
}

const ANILIST_MEMORY_CACHE = new Map<string, AniListMemoryCacheEntry>();

/**
 * Tầng 2: Tra cứu poster Hoạt hình / Anime / Donghua từ AniList GraphQL
 * - Miễn phí 100%, không cần API Key
 * - CDN: s4.anilist.co (nhanh, ổn định, không bị chặn bởi ISP Việt Nam)
 * - Chuyên trị 10% Anime/Donghua còn lại nếu TMDb không tìm thấy
 * - 100% In-Memory Cache (0 Redis commands)
 */
export async function searchAniListPoster(
  title: string,
  originName?: string,
  alternativeNames?: string[]
): Promise<AniListPosterResult> {
  const queryCandidates = [
    originName && originName !== title ? originName : null,
    title,
    ...(alternativeNames || []),
  ]
    .filter((q): q is string => Boolean(q && typeof q === "string" && q.trim().length >= 2))
    .map((q) => q.trim());

  if (queryCandidates.length === 0) {
    return { posterUrl: null, backdropUrl: null };
  }

  const primaryKey = (originName || title).toLowerCase().trim();
  const now = Date.now();
  const memHit = ANILIST_MEMORY_CACHE.get(primaryKey);
  if (memHit && memHit.expireAt > now) {
    return { posterUrl: memHit.posterUrl, backdropUrl: memHit.backdropUrl };
  }

  // Kiểm tra L2 Redis DB 3 (Aux / Metadata - ai:anilist:poster:...)
  const cleanKey = primaryKey.replace(/[^a-z0-9_]/g, "_").slice(0, 80);
  const kvKey = `ai:anilist:poster:${cleanKey}`;
  try {
    const cached = await cacheService.get<AniListPosterResult>(kvKey);
    if (cached) {
      ANILIST_MEMORY_CACHE.set(primaryKey, {
        posterUrl: cached.posterUrl,
        backdropUrl: cached.backdropUrl,
        expireAt: now + 24 * 3600 * 1000,
      });
      return cached;
    }
  } catch {}

  const graphQuery = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        coverImage {
          extraLarge
          large
          medium
        }
        bannerImage
      }
    }
  `;

  let matchedResult: AniListPosterResult | null = null;

  for (const candidate of queryCandidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: graphQuery,
          variables: { search: candidate },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const json = await res.json();
      const media = json?.data?.Media;
      const cover =
        media?.coverImage?.extraLarge ||
        media?.coverImage?.large ||
        media?.coverImage?.medium ||
        null;
      const banner = media?.bannerImage || null;

      if (cover) {
        matchedResult = {
          posterUrl: cover,
          backdropUrl: banner || cover,
        };
        break;
      }
    } catch {
      // Bỏ qua và thử ứng viên tiếp theo
    }
  }

  const finalRes = matchedResult || { posterUrl: null, backdropUrl: null };
  ANILIST_MEMORY_CACHE.set(primaryKey, {
    posterUrl: finalRes.posterUrl,
    backdropUrl: finalRes.backdropUrl,
    expireAt: now + 24 * 3600 * 1000, // 24h in-memory
  });

  // Lưu vào Redis DB 3 với TTL 30 ngày (2592000s)
  cacheService.set(kvKey, finalRes, 30 * 86400).catch(() => {});

  return finalRes;
}
