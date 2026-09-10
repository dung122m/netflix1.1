export interface ActorProfile {
  name: string;
  title: string;
  description?: string;
  extract?: string;
  thumbnail?: string;
  wikiUrl?: string;
  birthYear?: string;
}

const wikiCache = new Map<string, ActorProfile | null>();

export async function fetchActorProfile(actorName: string): Promise<ActorProfile | null> {
  const cleanName = actorName.trim();
  if (!cleanName) return null;

  if (wikiCache.has(cleanName)) {
    return wikiCache.get(cleanName) || null;
  }

  try {
    // 1. Thử Wikipedia Tiếng Việt trước
    let res = await fetch(
      `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`,
      {
        headers: { "User-Agent": "Nanaflix/2.0 (contact@nanaflix.tv)" },
        next: { revalidate: 86400 }, // Cache 24h
        signal: AbortSignal.timeout(3500),
      }
    );

    // 2. Nếu tiếng Việt không thấy, thử tìm kiếm Wikipedia Tiếng Anh
    if (!res.ok) {
      res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanName)}`,
        {
          headers: { "User-Agent": "Nanaflix/2.0 (contact@nanaflix.tv)" },
          next: { revalidate: 86400 },
          signal: AbortSignal.timeout(3500),
        }
      );
    }

    if (res.ok) {
      const data = await res.json();
      if (data.type === "disambiguation" || data.title === "Not found.") {
        wikiCache.set(cleanName, null);
        return null;
      }

      const profile: ActorProfile = {
        name: cleanName,
        title: data.title || cleanName,
        description: data.description || "Nghệ sĩ / Diễn viên điện ảnh",
        extract: data.extract || undefined,
        thumbnail: data.thumbnail?.source || undefined,
        wikiUrl: data.content_urls?.desktop?.page || `https://vi.wikipedia.org/wiki/${encodeURIComponent(cleanName)}`,
      };

      wikiCache.set(cleanName, profile);
      return profile;
    }
  } catch (err) {
    console.error("Lỗi lấy thông tin diễn viên từ Wikipedia:", err);
  }

  wikiCache.set(cleanName, null);
  return null;
}
