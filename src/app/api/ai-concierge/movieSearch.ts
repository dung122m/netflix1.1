import { movieApi } from "@/services/movieApi";
import { MatchOptions } from "./types";
import {
  cleanNormalizedString,
  extractMovieYear,
  matchesCountry,
  matchesGenre,
  matchesActor,
} from "./taxonomy";
import { toSafeCountry, toSafeCategory, toSafeActors } from "./movieFormatter";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TITLE_LOOKUP_CACHE = new Map<string, { item: any; expireAt: number }>();

/**
 * Tìm kiếm bộ phim phù hợp nhất trong danh sách dựa trên tiêu đề và bộ lọc mềm
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function findBestMatchMovie(items: any[], query: string, originalQuery?: string, options?: MatchOptions): any {
  if (!items || items.length === 0) return null;
  const cleanQ = cleanNormalizedString(query || "");
  const cleanOq = cleanNormalizedString(originalQuery || "");

  let bestItem = null;
  let bestScore = -999;

  for (const it of items) {
    const name = cleanNormalizedString(it.name || it.title || "");
    const orig = cleanNormalizedString(it.origin_name || "");
    const slug = cleanNormalizedString(it.slug || "");
    const country = toSafeCountry(it);
    const category = toSafeCategory(it);
    const itemYear = extractMovieYear(it);
    const itemActors = toSafeActors(it);

    // 1. Kiểm tra loại trừ quốc gia/thể loại bị cấm (Hard negative constraint)
    if (options?.excludedCountries && options.excludedCountries.length > 0) {
      if (options.excludedCountries.some((ex) => matchesCountry(country, ex))) {
        continue;
      }
    }
    if (options?.excludedGenres && options.excludedGenres.length > 0) {
      if (options.excludedGenres.some((ex) => matchesGenre(category, ex))) {
        continue;
      }
    }

    // 2. Hard filter khi người dùng tìm phim mới nhất (2025-2026)
    if (options?.isLatest) {
      const curYear = new Date().getFullYear();
      if (itemYear > 0 && itemYear < curYear - 1) {
        continue; // Tuyệt đối không lấy phim cũ khi người dùng yêu cầu mới nhất
      }
    }

    let score = 0;

    // So khớp tiêu đề (Title Match)
    const isExact = name === cleanQ || (cleanOq && (name === cleanOq || orig === cleanOq));
    if (isExact) {
      score += 100;
    } else if (slug === cleanQ.replace(/\s+/g, "-") || (cleanOq && slug === cleanOq.replace(/\s+/g, "-"))) {
      score += 90;
    } else if (name.startsWith(cleanQ) || (cleanOq && (name.startsWith(cleanOq) || orig.startsWith(cleanOq)))) {
      score += 75;
    } else if (name.includes(cleanQ) || (cleanOq && (name.includes(cleanOq) || orig.includes(cleanOq)))) {
      score += 55;
    } else {
      const qWords = (cleanOq || cleanQ).split(" ").filter((w) => w.length > 1);
      if (qWords.length > 1) {
        const matchWords = qWords.filter((w) => name.includes(w) || (orig && orig.includes(w)));
        const ratio = matchWords.length / qWords.length;
        if (ratio >= 0.5) score += Math.round(ratio * 50);
      }
    }

    const lenDiff = Math.abs(name.length - cleanQ.length);
    score -= Math.min(20, lenDiff * 1.2);

    if (it.thumb_url || it.poster_url) score += 10;

    // SCORING: Điểm thưởng & Phạt mềm thay vì Hard AND Drop
    if (options?.expectedCountry) {
      if (matchesCountry(country, options.expectedCountry)) {
        score += 30;
      } else if (country && !matchesCountry(country, options.expectedCountry)) {
        score -= 25; // Phạt vừa phải nếu lệch quốc gia
      }
    }

    if (options?.expectedGenre) {
      if (matchesGenre(category, options.expectedGenre)) {
        score += 20;
      }
    }

    // Kiểm tra diễn viên nếu expectedActorSlug được chỉ định (Field Separation)
    if (options?.expectedActorSlug) {
      const hasActor = matchesActor(itemActors, options.expectedActorSlug);
      if (hasActor) {
        score += 50;
      } else if (itemActors.length > 0) {
        // Có danh sách diễn viên cụ thể nhưng không có diễn viên cần tìm
        // Nếu tiêu đề khớp tuyệt đối 100% thì trừ điểm nhẹ, nếu tiêu đề chỉ khớp lỏng thì loại bỏ
        if (!isExact) {
          continue;
        } else {
          score -= 30;
        }
      } else {
        // Database phim không có thông tin mảng diễn viên
        score -= 10;
      }
    }

    // Kiểm tra năm theo khoảng
    if (itemYear > 0 && options?.yearFrom && options?.yearTo) {
      if (itemYear >= options.yearFrom && itemYear <= options.yearTo) {
        score += 30;
      } else if (Math.abs(itemYear - options.yearFrom) <= 3 || Math.abs(itemYear - options.yearTo) <= 3) {
        score += 10; // Gần đúng thập niên
      } else {
        score -= 25; // Lệch xa thập niên thì trừ điểm
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = it;
    }
  }

  return bestScore >= 40 ? bestItem : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PHIMAPI_DIRECT_CACHE = new Map<string, { item: any; expireAt: number }>();

/**
 * Tra cứu trực tiếp trên PhimAPI (phimapi.com) với timeout ngắn và RAM cache
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryPhimApiDirect(keyword: string, originalKeyword?: string, options?: MatchOptions): Promise<any> {
  if (!keyword?.trim()) return null;
  const cacheKey = `${keyword.trim()}__${originalKeyword?.trim() || ""}__${options?.expectedCountry || ""}__${options?.expectedGenre || ""}`.toLowerCase();
  const cached = PHIMAPI_DIRECT_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expireAt) return cached.item;

  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword.trim())}&limit=8`,
      { signal: AbortSignal.timeout(1800), next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      PHIMAPI_DIRECT_CACHE.set(cacheKey, { item: null, expireAt: Date.now() + 1000 * 60 * 10 });
      return null;
    }
    const json = await res.json();
    const items = json?.data?.items || [];
    if (items.length > 0) {
      const best = findBestMatchMovie(items, keyword, originalKeyword, options);
      if (!best) {
        PHIMAPI_DIRECT_CACHE.set(cacheKey, { item: null, expireAt: Date.now() + 1000 * 60 * 10 });
        return null;
      }

      const imageDomain = (json.data?.APP_DOMAIN_CDN_IMAGE || "https://phimimg.com/").replace(/\/+$/, "");
      const formatImg = (p?: string) => {
        if (!p) return "";
        if (p.startsWith("http://") || p.startsWith("https://")) return p;
        return `${imageDomain}/${p.replace(/^\/+/, "")}`;
      };
      const formatted = {
        ...best,
        thumb_url: formatImg(best.thumb_url) || formatImg(best.poster_url),
        poster_url: formatImg(best.poster_url) || formatImg(best.thumb_url),
      };
      PHIMAPI_DIRECT_CACHE.set(cacheKey, { item: formatted, expireAt: Date.now() + 1000 * 60 * 60 * 2 });
      return formatted;
    }
  } catch {}

  PHIMAPI_DIRECT_CACHE.set(cacheKey, { item: null, expireAt: Date.now() + 1000 * 60 * 5 });
  return null;
}

/**
 * Tìm kiếm nhanh một bộ phim duy nhất qua nhiều nguồn kết hợp bộ nhớ đệm
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchSingleMovieFast(title: string, originalTitle?: string, options?: MatchOptions): Promise<any> {
  const cleanTitle = (title || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  const cleanOriginal = (originalTitle || "").replace(/\([^)]*\)/g, "").replace(/\[[^\]]*\]/g, "").trim();
  if (!cleanTitle && !cleanOriginal) return null;

  const key = `${cleanTitle}__${cleanOriginal}__${options?.expectedCountry || ""}__${options?.expectedGenre || ""}__${options?.yearFrom || ""}`.toLowerCase();
  const cached = TITLE_LOOKUP_CACHE.get(key);
  if (cached && Date.now() < cached.expireAt) return cached.item;

  let foundItem = null;

  // 1. Tìm trên PhimAPI với tiêu đề tiếng Việt
  if (cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanTitle, cleanOriginal, options);
  }

  // 2. Nếu chưa thấy, thử tiếp tên gốc tiếng Anh/Quốc tế
  if (!foundItem && cleanOriginal && cleanOriginal !== cleanTitle) {
    foundItem = await queryPhimApiDirect(cleanOriginal, cleanTitle, options);
  }

  // 3. Nếu PhimAPI không có, fallback tìm kiếm trong catalog nội bộ (chạy song song tiêu đề và tên gốc với timeout ngắn 1.2s)
  if (!foundItem && (cleanTitle || cleanOriginal)) {
    try {
      const fallbackTasks = [];
      if (cleanTitle) {
        fallbackTasks.push(
          Promise.race([
            movieApi.getMovies({ keyword: cleanTitle, page: 1, limit: 6 }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
          ]).catch(() => null)
        );
      }
      if (cleanOriginal && cleanOriginal !== cleanTitle) {
        fallbackTasks.push(
          Promise.race([
            movieApi.getMovies({ keyword: cleanOriginal, page: 1, limit: 6 }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
          ]).catch(() => null)
        );
      }

      const settled = await Promise.allSettled(fallbackTasks);
      for (const res of settled) {
        if (res.status === "fulfilled" && res.value?.items && res.value.items.length > 0) {
          const match = findBestMatchMovie(
            res.value.items,
            cleanTitle || cleanOriginal,
            cleanOriginal,
            options
          );
          if (match) {
            foundItem = match;
            break;
          }
        }
      }
    } catch {}
  }

  if (foundItem) {
    TITLE_LOOKUP_CACHE.set(key, { item: foundItem, expireAt: Date.now() + 1000 * 60 * 60 * 24 });
  } else {
    TITLE_LOOKUP_CACHE.set(key, { item: null, expireAt: Date.now() + 1000 * 60 * 10 });
  }

  return foundItem;
}
