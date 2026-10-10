import {
  LiveScoreboardEvent,
  ScoreboardCache,
} from "./types";

export const VERIFIED_SCOREBOARD_LEAGUES = [
  "eng.1", // Premier League
  "esp.1", // LaLiga
  "ger.1", // Bundesliga
  "ita.1", // Serie A
  "fra.1", // Ligue 1
  "ksa.1", // Saudi Pro League
  "ned.1", // Eredivisie
  "por.1", // Liga Portugal
  "tur.1", // Super Lig
] as const;

export type LeagueSlug = (typeof VERIFIED_SCOREBOARD_LEAGUES)[number];

const BASE_API_URL = process.env.LIVESCORE_API_URL || "https://worldcup26.ir";
const CACHE_TTL_MS = 60 * 1000; // 60s cache TTL
const STALE_TTL_MS = 180 * 1000; // 3 phút stale grace period
const REQUEST_TIMEOUT_MS = 3000; // 3s timeout mỗi request

let memoryCache: ScoreboardCache | null = null;
let inFlightFetch: Promise<ScoreboardCache> | null = null;

function parseStatus(
  statusObj?: {
    type?: {
      name?: string;
      state?: string;
      description?: string;
      shortDetail?: string;
      detail?: string;
    };
    displayClock?: string;
  },
): {
  status: "live" | "finished" | "scheduled";
  statusText: string;
  statusDetail?: string;
  displayClock?: string;
} {
  const typeName = statusObj?.type?.name || "";
  const state = statusObj?.type?.state || "";
  const displayClock = statusObj?.displayClock || "";
  const detail = statusObj?.type?.shortDetail || statusObj?.type?.detail || "";

  if (
    state === "in" ||
    typeName === "STATUS_FIRST_HALF" ||
    typeName === "STATUS_SECOND_HALF" ||
    typeName === "STATUS_HALFTIME" ||
    typeName === "STATUS_IN_PROGRESS" ||
    typeName === "STATUS_OVERTIME" ||
    typeName === "STATUS_SHOOTOUT"
  ) {
    return {
      status: "live",
      statusText: typeName || "LIVE",
      statusDetail: detail || displayClock,
      displayClock: displayClock || (typeName === "STATUS_HALFTIME" ? "HT" : ""),
    };
  }

  if (
    state === "post" ||
    typeName === "STATUS_FULL_TIME" ||
    typeName === "STATUS_FINAL" ||
    typeName === "STATUS_FINAL_PEN" ||
    typeName === "STATUS_ABANDONED"
  ) {
    return {
      status: "finished",
      statusText: typeName || "FT",
      statusDetail: detail || "FT",
      displayClock: displayClock || "FT",
    };
  }

  return {
    status: "scheduled",
    statusText: typeName || "SCHEDULED",
    statusDetail: detail || "Scheduled",
    displayClock: "",
  };
}

/**
 * Lấy dữ liệu scoreboard cho 1 giải đấu cụ thể
 */
async function fetchLeagueScoreboard(
  leagueSlug: string,
): Promise<LiveScoreboardEvent[]> {
  try {
    const url = `${BASE_API_URL}/get/soccer/${leagueSlug}/scoreboard`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: "application/json",
        "User-Agent": "Nanaflix/1.0 (LiveScore Enrichment)",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.events)) {
      return [];
    }

    const events: LiveScoreboardEvent[] = [];

    for (const rawEvent of data.events) {
      if (!rawEvent || !rawEvent.id) continue;
      const comp = rawEvent.competitions?.[0];
      if (!comp || !Array.isArray(comp.competitors) || comp.competitors.length < 2) {
        continue;
      }

      const homeComp = comp.competitors.find(
        (c: { homeAway?: string }) => c.homeAway === "home",
      );
      const awayComp = comp.competitors.find(
        (c: { homeAway?: string }) => c.homeAway === "away",
      );

      if (!homeComp?.team || !awayComp?.team) continue;

      const homeScore = parseInt(homeComp.score || "0", 10) || 0;
      const awayScore = parseInt(awayComp.score || "0", 10) || 0;

      const { status, statusText, statusDetail, displayClock } = parseStatus(
        rawEvent.status,
      );

      events.push({
        id: String(rawEvent.id),
        leagueSlug,
        name: rawEvent.name || `${homeComp.team.name} vs ${awayComp.team.name}`,
        shortName: rawEvent.shortName,
        date: rawEvent.date || "",
        homeTeam: {
          id: String(homeComp.team.id || ""),
          name: homeComp.team.name || "",
          displayName: homeComp.team.displayName || homeComp.team.name || "",
          shortDisplayName: homeComp.team.shortDisplayName,
          abbreviation: homeComp.team.abbreviation,
        },
        awayTeam: {
          id: String(awayComp.team.id || ""),
          name: awayComp.team.name || "",
          displayName: awayComp.team.displayName || awayComp.team.name || "",
          shortDisplayName: awayComp.team.shortDisplayName,
          abbreviation: awayComp.team.abbreviation,
        },
        homeScore,
        awayScore,
        status,
        statusText,
        statusDetail,
        displayClock,
        period: rawEvent.status?.period,
      });
    }

    return events;
  } catch {
    // Fail-safe: lỗi timeout hoặc network trả về mảng rỗng, không làm sập luồng
    return [];
  }
}

/**
 * Lấy toàn bộ sự kiện tỷ số từ tất cả các giải đấu đã xác minh
 */
async function fetchAllScoreboards(): Promise<ScoreboardCache> {
  const fetchPromises = VERIFIED_SCOREBOARD_LEAGUES.map((slug) =>
    fetchLeagueScoreboard(slug),
  );

  const results = await Promise.allSettled(fetchPromises);
  const allEvents: LiveScoreboardEvent[] = [];

  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      allEvents.push(...r.value);
    }
  }

  const now = Date.now();
  const cacheObj: ScoreboardCache = {
    events: allEvents,
    expireAt: now + CACHE_TTL_MS,
    staleUntil: now + STALE_TTL_MS,
    updatedAt: new Date(now).toISOString(),
  };

  memoryCache = cacheObj;
  return cacheObj;
}

export const footballScoreService = {
  /**
   * Lấy danh sách sự kiện livescore với bộ nhớ đệm (60s TTL) và chống thundering herd
   */
  getScoreboardEvents: async (): Promise<{
    events: LiveScoreboardEvent[];
    updatedAt: string;
    cached: boolean;
  }> => {
    const now = Date.now();

    // 1. Kiểm tra cache còn hạn
    if (memoryCache) {
      if (memoryCache.expireAt > now) {
        return {
          events: memoryCache.events,
          updatedAt: memoryCache.updatedAt,
          cached: true,
        };
      }

      // 2. Cache đã quá 60s nhưng còn trong thời gian stale (stale-while-revalidate)
      if (memoryCache.staleUntil > now) {
        // Tái xác thực ngầm
        footballScoreService.revalidateScoreboards().catch(() => {});
        return {
          events: memoryCache.events,
          updatedAt: memoryCache.updatedAt,
          cached: true,
        };
      }
    }

    // 3. Gom các request đồng thời bằng inFlightFetch
    if (inFlightFetch) {
      const data = await inFlightFetch;
      return {
        events: data.events,
        updatedAt: data.updatedAt,
        cached: false,
      };
    }

    inFlightFetch = fetchAllScoreboards();
    try {
      const data = await inFlightFetch;
      return {
        events: data.events,
        updatedAt: data.updatedAt,
        cached: false,
      };
    } catch {
      // Fail-safe tối đa: nếu có cache cũ thì trả lại, không thì trả rỗng
      return {
        events: memoryCache ? memoryCache.events : [],
        updatedAt: memoryCache ? memoryCache.updatedAt : new Date().toISOString(),
        cached: Boolean(memoryCache),
      };
    } finally {
      inFlightFetch = null;
    }
  },

  /**
   * Tái xác thực dữ liệu nền không chặn luồng chính
   */
  revalidateScoreboards: async (): Promise<void> => {
    if (inFlightFetch) return;
    inFlightFetch = fetchAllScoreboards();
    try {
      await inFlightFetch;
    } catch {
      // Bỏ qua lỗi ngầm, giữ lại cache trước đó
    } finally {
      inFlightFetch = null;
    }
  },

  /**
   * Lấy dữ liệu cache tức thì (đồng bộ, 0ms latency)
   */
  getCachedEventsSync: (): LiveScoreboardEvent[] | null => {
    return memoryCache ? memoryCache.events : null;
  },

  /**
   * Xóa cache (hữu ích cho unit test)
   */
  clearCacheForTesting: () => {
    memoryCache = null;
    inFlightFetch = null;
  },
};
