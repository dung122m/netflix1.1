import type { SynopsisDetailPayload } from "@/app/api/synopsis/route";

// Dedup map cho các request synopsis đang in-flight theo movie slug
const inFlightSynopsisRequests = new Map<string, Promise<SynopsisDetailPayload | null>>();

/**
 * Lấy tóm tắt và thông tin phim qua /api/synopsis với cơ chế in-flight Promise deduplication.
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
      return (await res.json()) as SynopsisDetailPayload;
    } catch {
      return null;
    } finally {
      inFlightSynopsisRequests.delete(cleanSlug);
    }
  })();

  inFlightSynopsisRequests.set(cleanSlug, promise);
  return promise;
}

export type { SynopsisDetailPayload };
