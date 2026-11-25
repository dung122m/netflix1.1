/**
 * Shared upstream keyword search helpers for PhimAPI and NguonC.
 * Single source of truth used by TMDb matching and actor filmography search.
 */

export interface UpstreamSearchOptions {
  limit?: number;
  timeoutMs?: number;
  normalizeImages?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchPhimApiByKeyword(keyword: string, options: UpstreamSearchOptions = {}): Promise<any[]> {
  const limit = options.limit ?? 6;
  const timeoutMs = options.timeoutMs ?? 2400;
  try {
    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=${limit}`,
      { signal: AbortSignal.timeout(timeoutMs), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = json.data?.items || json.items || [];
    if (!options.normalizeImages) return items;

    const imageDomain =
      json.data?.APP_DOMAIN_CDN_IMAGE ||
      json.data?.APP_DOMAIN_FRONTEND ||
      "https://phimimg.com/";
    const cdnClean = String(imageDomain).replace(/\/+$/, "");

    return items.map((item) => {
      const rawThumb = typeof item.thumb_url === "string" ? item.thumb_url.trim() : "";
      const rawPoster = typeof item.poster_url === "string" ? item.poster_url.trim() : "";
      const formatImg = (p: string) => {
        if (!p) return "";
        if (p.startsWith("http://") || p.startsWith("https://")) return p;
        return `${cdnClean}/${p.replace(/^\/+/, "")}`;
      };
      const formattedThumb = formatImg(rawThumb);
      const formattedPoster = formatImg(rawPoster);
      return {
        ...item,
        thumb_url: formattedThumb || formattedPoster,
        poster_url: formattedPoster || formattedThumb,
      };
    });
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function searchNguonCByKeyword(keyword: string, options: UpstreamSearchOptions = {}): Promise<any[]> {
  const timeoutMs = options.timeoutMs ?? 2400;
  try {
    const res = await fetch(
      `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}&page=1`,
      { signal: AbortSignal.timeout(timeoutMs), next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawItems: any[] = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json?.data?.items)
        ? json.data.items
        : [];
    return rawItems.map((item) => ({
      ...item,
      origin_name: item.original_name || item.name,
      poster_url: item.poster_url || item.thumb_url || "",
      thumb_url: item.thumb_url || item.poster_url || "",
      quality: item.quality || "HD",
      lang: item.language || "Vietsub",
      year: Number(item.year) || undefined,
    }));
  } catch {
    return [];
  }
}
