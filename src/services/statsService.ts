import { auth } from "@/lib/firebase";
import { getWatchHistory, WatchHistoryItem } from "@/lib/watchHistory";
import { StatsTimeRange } from "@/app/api/user/stats/route";

export interface RankedItem {
  name: string;
  count: number;
  percent: number;
}

export interface UserStatsData {
  totalMovies: number;
  totalEpisodes: number;
  totalHours: number;
  totalMinutes: number;
  completedCount: number;
  topGenres: RankedItem[];
  topCountries: RankedItem[];
  topTypes: RankedItem[];
  topActors: RankedItem[];
  timeSlots: {
    morning: number;
    afternoon: number;
    evening: number;
    night: number;
  };
  peakTimeSlot: string;
  monthlyBreakdown: Record<string, { movies: number; minutes: number }>;
}

export interface NanaflixWrappedData {
  totalMovies: number;
  totalEpisodes: number;
  totalHours: number;
  totalMinutes: number;
  completedCount: number;
  topGenre: string;
  topCountry: string;
  topActor: string | null;
  topType: string;
  peakTimeSlot: string;
  peakTimeKey: "morning" | "afternoon" | "evening" | "night";
  personaTitle: string;
  personaQuote: string;
  year: number;
}

export interface StatsResponse {
  success: boolean;
  range: StatsTimeRange;
  stats: UserStatsData;
  wrapped: NanaflixWrappedData;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}
  return headers;
}

export async function fetchUserStats(
  range: StatsTimeRange = "all",
  customHistory?: WatchHistoryItem[]
): Promise<StatsResponse | null> {
  try {
    const headers = await getAuthHeaders();
    const history = customHistory || getWatchHistory();

    const res = await fetch("/api/user/stats", {
      method: "POST",
      headers,
      body: JSON.stringify({
        range,
        items: history,
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    if (json.success) {
      return json as StatsResponse;
    }
    return null;
  } catch (err) {
    console.warn("Lỗi tải thống kê:", err);
    return null;
  }
}
