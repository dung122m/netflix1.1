import { AthleteProfile } from "@/services/live/football-score/types";

/**
 * Bộ nhớ đệm phía client dùng chung giữa TacticalLineup và DualTeamPitch
 * để tránh fetch lại hồ sơ cầu thủ khi đóng/mở thẻ hoặc re-render.
 */
const clientAthleteCache = new Map<string, AthleteProfile>();
const clientAthletePromises = new Map<string, Promise<AthleteProfile | null>>();

export function getCachedAthleteProfile(id: string): AthleteProfile | null {
  return clientAthleteCache.get(id) || null;
}

export async function fetchAthleteProfileClient(
  id: string,
  name?: string
): Promise<AthleteProfile | null> {
  const cached = clientAthleteCache.get(id);
  if (cached) return cached;
  const inFlight = clientAthletePromises.get(id);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const url = `/api/live-football/athlete?id=${encodeURIComponent(id)}${
        name ? `&name=${encodeURIComponent(name)}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const profileData = json?.data || json;
      if (profileData && profileData.id) {
        clientAthleteCache.set(id, profileData);
        return profileData as AthleteProfile;
      }
      return null;
    } catch {
      return null;
    } finally {
      clientAthletePromises.delete(id);
    }
  })();

  clientAthletePromises.set(id, promise);
  return promise;
}

export function formatBirthDate(isoDate?: string): string | null {
  if (!isoDate) return null;
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return isoDate;
}

