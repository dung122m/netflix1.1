export interface SynopsisDetailPayload {
  content: string;
  origin_name?: string;
  trailer_url?: string;
  actor?: string[];
  director?: string[];
  country?: string[];
  category?: string[];
  episode_current?: string;
  time?: string;
  year?: string | number;
  backdrop_url?: string;
  poster_url?: string;
  thumb_url?: string;
}

/**
 * Bộ nhớ đệm tóm tắt nội dung phim phía client (0ms response) chia sẻ giữa các UI components (MediaCard, HeroFeatured...)
 */
export const clientSynopsisCache = new Map<string, string>();

// Dedup map cho các request synopsis đang in-flight theo movie slug
const inFlightSynopsisRequests = new Map<string, Promise<SynopsisDetailPayload | null>>();

/**
 * Lấy tóm tắt và thông tin phim qua /api/synopsis với cơ chế in-flight Promise deduplication và client cache.
 * Khi nhiều component (HeroFeatured, MediaCard, ...) cùng gọi một slug tại cùng thời điểm,
 * chỉ có đúng 1 request HTTP được gửi đi; các caller còn lại sẽ chia sẻ Promise đang in-flight.
 */
export async function fetchMovieSynopsisShared(slug: string): Promise<SynopsisDetailPayload | null> {
  if (!slug) return null;
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return null;

  const existing = inFlightSynopsisRequests.get(cleanSlug);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/synopsis?slug=${encodeURIComponent(cleanSlug)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as SynopsisDetailPayload;
      if (data && typeof data.content === "string") {
        clientSynopsisCache.set(cleanSlug, data.content);
      }
      return data;
    } catch {
      return null;
    } finally {
      inFlightSynopsisRequests.delete(cleanSlug);
    }
  })();

  inFlightSynopsisRequests.set(cleanSlug, promise);
  return promise;
}
