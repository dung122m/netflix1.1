import { cacheService } from "@/lib/cache";
import { fetchVsmovList } from "./client";
import { adaptVsmovMovieItem } from "./adapter";
import { deduplicateMovieItems } from "@/services/movies/service";
import { normalizeForMatch } from "@/lib/stringUtils";

export interface VsmovCatalogFeed {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exclusiveItems: any[];
  updatedAt: number;
  totalFetched: number;
}

const CATALOG_CACHE_KEY = "vsmov:catalog:feed:v1";
const CATALOG_TTL_SECONDS = 14400; // 4 giờ
const STALE_REFRESH_THRESHOLD_MS = 3600 * 1000; // Làm mới ngầm sau 1 giờ

// L1 Memory Cache cho Feed VSMOV (0ms access)
let memCatalogFeed: VsmovCatalogFeed | null = null;
let memCatalogExpireAt = 0;
let inFlightIngestion: Promise<VsmovCatalogFeed | null> | null = null;

/**
 * Trích xuất danh sách phim độc quyền VSMOV bằng cách đối chiếu 4 cấp độ với Primary Catalog
 */
export function filterVsmovExclusives(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vsmovItems: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  primaryItems: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any[] {
  const seenTmdb = new Set<string>();
  const seenImdb = new Set<string>();
  const seenSlug = new Set<string>();
  const seenTitleYear = new Set<string>();

  for (const item of primaryItems) {
    if (!item) continue;
    if (item.tmdb?.id) seenTmdb.add(String(item.tmdb.id).trim());
    if (item.imdb?.id) seenImdb.add(String(item.imdb.id).trim().toLowerCase());
    if (item.slug) seenSlug.add(String(item.slug).trim().toLowerCase());
    const normName = item.name ? normalizeForMatch(String(item.name)) : "";
    const year = item.year ? String(item.year).trim() : "";
    if (normName && year) seenTitleYear.add(`${normName}_${year}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exclusives: any[] = [];
  for (const item of vsmovItems) {
    if (!item) continue;
    const tmdbId = item.tmdb?.id ? String(item.tmdb.id).trim() : "";
    const imdbId = item.imdb?.id ? String(item.imdb.id).trim().toLowerCase() : "";
    const slug = item.slug ? String(item.slug).trim().toLowerCase() : "";
    const year = item.year ? String(item.year).trim() : "";
    const normName = item.name ? normalizeForMatch(String(item.name)) : "";
    const titleYearKey = normName && year ? `${normName}_${year}` : "";

    const isMatch =
      (tmdbId && seenTmdb.has(tmdbId)) ||
      (imdbId && seenImdb.has(imdbId)) ||
      (slug && seenSlug.has(slug)) ||
      (titleYearKey && seenTitleYear.has(titleYearKey));

    if (!isMatch) {
      exclusives.push({
        ...item,
        isVsmovExclusive: true,
      });
    }
  }

  return exclusives;
}

/**
 * Thực hiện Ingestion danh sách phim VSMOV mới nhất chạy ngầm (Non-blocking)
 */
export async function performVsmovCatalogIngestion(): Promise<VsmovCatalogFeed | null> {
  if (inFlightIngestion) {
    return inFlightIngestion;
  }

  inFlightIngestion = (async () => {
    try {
      // 1. Fetch 2 trang mới nhất của VSMOV (tối đa ~48 phim) với bounded timeout 4000ms
      const [resP1, resP2] = await Promise.all([
        fetchVsmovList(1, 4000),
        fetchVsmovList(2, 4000),
      ]);

      const rawItems = [
        ...(resP1?.items || []),
        ...(resP2?.items || []),
      ];

      if (rawItems.length === 0) {
        return memCatalogFeed;
      }

      // 2. Chuyển đổi sang canonical format Nanaflix
      const adaptedItems = rawItems
        .map((r) => adaptVsmovMovieItem(r))
        .filter(Boolean);

      const uniqueVsmov = deduplicateMovieItems(adaptedItems);

      // 3. Lấy mẫu catalog chính từ PhimAPI + NguonC để xác định độc quyền
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let primaryItems: any[] = [];
      try {
        const [phimApiRes, nguonCRes] = await Promise.all([
          fetch("https://phimapi.com/v1/api/danh-sach/phim-moi-cap-nhat?page=1", {
            signal: AbortSignal.timeout(3000),
          }).then((r) => r.json()).catch(() => null),
          fetch("https://phim.nguonc.com/api/films/phim-moi-cap-nhat?page=1", {
            signal: AbortSignal.timeout(3000),
          }).then((r) => r.json()).catch(() => null),
        ]);

        primaryItems = [
          ...(phimApiRes?.data?.items || []),
          ...(nguonCRes?.items || []),
        ];
      } catch {
        // Fallback an toàn nếu không gọi được primary API
      }

      const exclusiveItems = filterVsmovExclusives(uniqueVsmov, primaryItems);

      const newFeed: VsmovCatalogFeed = {
        items: uniqueVsmov,
        exclusiveItems,
        updatedAt: Date.now(),
        totalFetched: uniqueVsmov.length,
      };

      // 4. Lưu đồng thời vào Memory L1 (0ms) và Redis L2 (4h TTL)
      memCatalogFeed = newFeed;
      memCatalogExpireAt = Date.now() + CATALOG_TTL_SECONDS * 1000;

      await cacheService.set(CATALOG_CACHE_KEY, newFeed, CATALOG_TTL_SECONDS).catch(() => {});

      return newFeed;
    } catch (err) {
      console.warn("[VSMOV Ingestion] Catalog background refresh failed:", err);
      return memCatalogFeed;
    } finally {
      inFlightIngestion = null;
    }
  })();

  return inFlightIngestion;
}

/**
 * Lấy VSMOV Catalog Feed từ Memory/Redis với cơ chế Stale-While-Revalidate
 */
export async function getVsmovCatalogFeed(): Promise<VsmovCatalogFeed | null> {
  const now = Date.now();

  // 1. Kiểm tra L1 Memory Cache (0ms)
  if (memCatalogFeed && memCatalogExpireAt > now) {
    if (now - memCatalogFeed.updatedAt > STALE_REFRESH_THRESHOLD_MS) {
      // Trigger background refresh không block
      performVsmovCatalogIngestion().catch(() => {});
    }
    return memCatalogFeed;
  }

  // 2. Kiểm tra L2 Redis Cache
  try {
    const cached = await cacheService.get<VsmovCatalogFeed>(CATALOG_CACHE_KEY);
    if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
      memCatalogFeed = cached;
      memCatalogExpireAt = now + 1800 * 1000; // 30 phút trong RAM
      return cached;
    }
  } catch {}

  // 3. Nếu chưa có cache: kích hoạt ingestion
  return await performVsmovCatalogIngestion();
}

/**
 * Lấy nhanh VSMOV Catalog Feed từ RAM đồng bộ (0ms, hoàn toàn không async/network I/O)
 */
export function getVsmovCatalogFeedSync(): VsmovCatalogFeed | null {
  return memCatalogFeed;
}
