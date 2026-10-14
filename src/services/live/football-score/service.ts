import {
  LiveScoreboardEvent,
  ScoreboardCache,
  NormalizedMatchSummary,
  MatchStatItem,
  MatchKeyEvent,
  MatchRosterPlayer,
  PlayerMatchStat,
  MatchCommentaryItem,
  MatchGameInfo,
  NormalizedLeagueStandings,
  StandingGroup,
  StandingEntry,
  NormalizedLeagueFixtures,
  NormalizedFixtureItem,
  FixtureCompetitor,
  FixtureStatus,
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
  "usa.1", // Major League Soccer (MLS)
  "eng.fa", // English FA Cup
  "eng.league_cup", // English Carabao Cup
  "esp.copa_del_rey", // Spanish Copa del Rey
  "uefa.champions", // UEFA Champions League (Cúp C1)
  "uefa.europa", // UEFA Europa League (Cúp C2)
  "uefa.europa.conf", // UEFA Conference League (Cúp C3)
] as const;

export type LeagueSlug = (typeof VERIFIED_SCOREBOARD_LEAGUES)[number];

const ESPN_CDN_API_URL = "https://site.api.espn.com";
const BASE_API_URL = process.env.LIVESCORE_API_URL || "https://worldcup26.ir";
const CACHE_TTL_LIVE_MS = 15 * 1000; // 15s cache TTL khi có trận đang live
const CACHE_TTL_DEFAULT_MS = 60 * 1000; // 60s cache TTL khi không có trận live
const STALE_TTL_MS = 45 * 1000; // 45s stale grace period
const REQUEST_TIMEOUT_MS = 4000; // 4s timeout mỗi request

// Cache cấu hình cho Match Center Summary (P2)
const SUMMARY_TTL_LIVE_MS = 15 * 1000; // 15s cho trận đang diễn ra
const SUMMARY_TTL_FINISHED_MS = 300 * 1000; // 5 phút cho trận đã kết thúc
const SUMMARY_TTL_SCHEDULED_MS = 60 * 1000; // 60s cho trận sắp diễn ra

// Cache cấu hình cho Bảng xếp hạng bóng đá (P3: Standings)
const STANDINGS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 phút cache TTL phía server
const STANDINGS_REQUEST_TIMEOUT_MS = 5000; // 5s timeout khi fetch standings

// Cache cấu hình cho Lịch thi đấu & Kết quả (P4: Fixtures & Results)
const FIXTURES_CACHE_TTL_MS = 10 * 60 * 1000; // 10 phút cache TTL phía server
const FIXTURES_REQUEST_TIMEOUT_MS = 5000; // 5s timeout khi fetch fixtures

interface SummaryCacheEntry {
  data: NormalizedMatchSummary;
  expireAt: number;
}

interface StandingsCacheEntry {
  data: NormalizedLeagueStandings | null;
  isCupOrNoStandings: boolean;
  expireAt: number;
}

interface FixturesCacheEntry {
  data: NormalizedLeagueFixtures | null;
  expireAt: number;
}

const summaryMemoryCache = new Map<string, SummaryCacheEntry>();
const summaryInFlight = new Map<string, Promise<NormalizedMatchSummary | null>>();

const standingsMemoryCache = new Map<string, StandingsCacheEntry>();
const standingsInFlight = new Map<
  string,
  Promise<{ data: NormalizedLeagueStandings | null; isCupOrNoStandings: boolean }>
>();

const fixturesMemoryCache = new Map<string, FixturesCacheEntry>();
const fixturesInFlight = new Map<string, Promise<NormalizedLeagueFixtures | null>>();

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
  const candidateUrls = [
    `${ESPN_CDN_API_URL}/apis/site/v2/sports/soccer/${leagueSlug}/scoreboard`,
    `${BASE_API_URL}/get/soccer/${leagueSlug}/scoreboard`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          Accept: "application/json",
          "User-Agent": "Nanaflix/1.0 (LiveScore Enrichment)",
        },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!data || !Array.isArray(data.events)) continue;

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
      // Tiếp tục thử candidate URL tiếp theo
    }
  }

  return [];
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
  const hasLiveEvent = allEvents.some((e) => e.status === "live");
  const ttl = hasLiveEvent ? CACHE_TTL_LIVE_MS : CACHE_TTL_DEFAULT_MS;
  const expireAt = now + ttl;

  const cacheObj: ScoreboardCache = {
    events: allEvents,
    expireAt,
    staleUntil: expireAt + STALE_TTL_MS,
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
    summaryMemoryCache.clear();
    summaryInFlight.clear();
    standingsMemoryCache.clear();
    standingsInFlight.clear();
  },

  /**
   * Lấy chi tiết trận đấu (Match Center Summary) theo leagueSlug và eventId
   * Hỗ trợ bộ nhớ đệm server (30s live, 5m FT), in-flight deduplication và timeout an toàn
   */
  getMatchSummary: async (
    leagueSlug: string,
    eventId: string,
  ): Promise<{ data: NormalizedMatchSummary | null; cached: boolean }> => {
    // 1. Kiểm tra tính hợp lệ của tham số
    const cleanLeague = (leagueSlug || "").trim();
    const cleanEventId = (eventId || "").trim();

    if (
      !cleanLeague ||
      !cleanEventId ||
      !VERIFIED_SCOREBOARD_LEAGUES.includes(cleanLeague as LeagueSlug) ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(cleanEventId)
    ) {
      return { data: null, cached: false };
    }

    const cacheKey = `${cleanLeague}:${cleanEventId}`;
    const now = Date.now();

    // 2. Kiểm tra bộ nhớ đệm
    const cachedEntry = summaryMemoryCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expireAt > now) {
      return { data: cachedEntry.data, cached: true };
    }

    // 3. In-flight deduplication để tránh gọi nhiều lần cho cùng 1 trận
    if (summaryInFlight.has(cacheKey)) {
      const result = await summaryInFlight.get(cacheKey)!;
      return { data: result, cached: false };
    }

    const fetchPromise = (async (): Promise<NormalizedMatchSummary | null> => {
      const candidateUrls = [
        `${ESPN_CDN_API_URL}/apis/site/v2/sports/soccer/${cleanLeague}/summary?event=${cleanEventId}`,
        `${BASE_API_URL}/get/soccer/${cleanLeague}/summary?event=${cleanEventId}`,
      ];

      try {
        for (const url of candidateUrls) {
          try {
            const res = await fetch(url, {
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
              headers: {
                Accept: "application/json",
                "User-Agent": "Nanaflix/1.0 (Match Center)",
              },
              cache: "no-store",
            });

            if (!res.ok) continue;

            const raw = await res.json();
            if (!raw || typeof raw !== "object") continue;

            const normalized = parseRawSummary(cleanLeague, cleanEventId, raw);
            if (!normalized) continue;

            // Quyết định TTL theo trạng thái trận đấu
            let ttl = SUMMARY_TTL_SCHEDULED_MS;
            if (normalized.status === "live") {
              ttl = SUMMARY_TTL_LIVE_MS;
            } else if (normalized.status === "finished") {
              ttl = SUMMARY_TTL_FINISHED_MS;
            }

            summaryMemoryCache.set(cacheKey, {
              data: normalized,
              expireAt: Date.now() + ttl,
            });

            return normalized;
          } catch {
            // Thử tiếp candidate URL tiếp theo
          }
        }
        return null;
      } finally {
        summaryInFlight.delete(cacheKey);
      }
    })();

    summaryInFlight.set(cacheKey, fetchPromise);
    const result = await fetchPromise;
    return { data: result, cached: false };
  },

  /**
   * Lấy bảng xếp hạng giải đấu (P3: Standings) theo leagueSlug và season
   * Hỗ trợ bộ nhớ đệm server (10 phút), in-flight deduplication, xử lý giải cúp / giải không có vòng tròn
   */
  getStandings: async (
    leagueSlug: string,
    season?: number,
  ): Promise<{
    data: NormalizedLeagueStandings | null;
    isCupOrNoStandings: boolean;
    cached: boolean;
  }> => {
    const cleanLeague = (leagueSlug || "").trim();
    if (!cleanLeague || !VERIFIED_SCOREBOARD_LEAGUES.includes(cleanLeague as LeagueSlug)) {
      return { data: null, isCupOrNoStandings: false, cached: false };
    }

    const cleanSeason =
      typeof season === "number" && !isNaN(season) && season >= 2000 && season <= 2100
        ? season
        : undefined;
    const cacheKey = `${cleanLeague}:${cleanSeason || "current"}`;
    const now = Date.now();

    // 1. Kiểm tra bộ nhớ đệm
    const cachedEntry = standingsMemoryCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expireAt > now) {
      return {
        data: cachedEntry.data,
        isCupOrNoStandings: cachedEntry.isCupOrNoStandings,
        cached: true,
      };
    }

    // 2. In-flight deduplication
    if (standingsInFlight.has(cacheKey)) {
      const result = await standingsInFlight.get(cacheKey)!;
      return { ...result, cached: false };
    }

    // 3. Thực hiện fetch từ upstream
    const fetchPromise = (async () => {
      const candidateUrls = [
        `https://site.api.espn.com/apis/v2/sports/soccer/${cleanLeague}/standings${
          cleanSeason ? `?season=${cleanSeason}` : ""
        }`,
        `${BASE_API_URL}/get/soccer/${cleanLeague}/standings${
          cleanSeason ? `?season=${cleanSeason}` : ""
        }`,
      ];

      try {
        for (const url of candidateUrls) {
          try {
            const res = await fetch(url, {
              signal: AbortSignal.timeout(STANDINGS_REQUEST_TIMEOUT_MS),
              cache: "no-store",
              headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              },
            });

            if (!res.ok) {
              if (res.status === 404) {
                const resObj = { data: null, isCupOrNoStandings: true };
                standingsMemoryCache.set(cacheKey, {
                  ...resObj,
                  expireAt: now + STANDINGS_CACHE_TTL_MS,
                });
                return resObj;
              }
              continue;
            }

            const json = await res.json();
            if (!json || !Array.isArray(json.children) || json.children.length === 0) {
              const resObj = { data: null, isCupOrNoStandings: true };
              standingsMemoryCache.set(cacheKey, {
                ...resObj,
                expireAt: now + STANDINGS_CACHE_TTL_MS,
              });
              return resObj;
            }

            const normalized = normalizeStandings(json, cleanLeague);
            if (!normalized || normalized.groups.length === 0) {
              const resObj = { data: null, isCupOrNoStandings: true };
              standingsMemoryCache.set(cacheKey, {
                ...resObj,
                expireAt: now + STANDINGS_CACHE_TTL_MS,
              });
              return resObj;
            }

            const resObj = { data: normalized, isCupOrNoStandings: false };
            standingsMemoryCache.set(cacheKey, {
              ...resObj,
              expireAt: now + STANDINGS_CACHE_TTL_MS,
            });
            return resObj;
          } catch {
            // Thử URL tiếp theo
          }
        }
        return { data: null, isCupOrNoStandings: false };
      } finally {
        standingsInFlight.delete(cacheKey);
      }
    })();

    standingsInFlight.set(cacheKey, fetchPromise);
    const result = await fetchPromise;
    return { ...result, cached: false };
  },

  /**
   * P4: Lấy danh sách lịch thi đấu & kết quả (Fixtures & Results)
   * Tích hợp 10 phút memory cache và in-flight deduplication
   */
  async getFixtures(
    leagueSlug: string,
    options?: {
      status?: "all" | "pre" | "post" | "scheduled" | "finished" | "live";
      page?: number;
      limit?: number;
    }
  ): Promise<{ data: NormalizedLeagueFixtures | null; cached: boolean }> {
    const cleanLeague = (leagueSlug || "").trim();
    if (!cleanLeague || !VERIFIED_SCOREBOARD_LEAGUES.includes(cleanLeague as LeagueSlug)) {
      return { data: null, cached: false };
    }

    let upstreamStatus: "all" | "scheduled" | "live" | "finished" = "all";
    if (options?.status === "pre" || options?.status === "scheduled") {
      upstreamStatus = "scheduled";
    } else if (options?.status === "post" || options?.status === "finished") {
      upstreamStatus = "finished";
    } else if (options?.status === "live") {
      upstreamStatus = "live";
    }

    const cleanPage = typeof options?.page === "number" && options.page > 0 ? options.page : 1;
    const cleanLimit =
      typeof options?.limit === "number" && options.limit > 0 && options.limit <= 100
        ? options.limit
        : 100;

    const cacheKey = `${cleanLeague}:${upstreamStatus}:${cleanPage}:${cleanLimit}`;
    const now = Date.now();

    // 1. Kiểm tra cache trong bộ nhớ
    const cachedEntry = fixturesMemoryCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expireAt > now) {
      return {
        data: cachedEntry.data,
        cached: true,
      };
    }

    // 2. In-flight deduplication
    if (fixturesInFlight.has(cacheKey)) {
      const result = await fixturesInFlight.get(cacheKey)!;
      return { data: result, cached: false };
    }

    // 3. Thực hiện fetch từ upstream
    const fetchPromise = (async () => {
      const candidateUrls = [
        `${BASE_API_URL}/get/soccer/${cleanLeague}/fixtures?status=${upstreamStatus}&limit=${cleanLimit}&page=${cleanPage}`,
        `${ESPN_CDN_API_URL}/apis/site/v2/sports/soccer/${cleanLeague}/scoreboard`,
      ];

      try {
        for (const url of candidateUrls) {
          try {
            const res = await fetch(url, {
              signal: AbortSignal.timeout(FIXTURES_REQUEST_TIMEOUT_MS),
              cache: "no-store",
              headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
              },
            });

            if (!res.ok) continue;

            const json = await res.json();
            const normalized = normalizeFixtures(json, cleanLeague);
            if (!normalized) continue;

            if (upstreamStatus !== "all" && Array.isArray(normalized.events)) {
              normalized.events = normalized.events.filter((ev) => ev.status === upstreamStatus);
            }

            fixturesMemoryCache.set(cacheKey, {
              data: normalized,
              expireAt: now + FIXTURES_CACHE_TTL_MS,
            });
            return normalized;
          } catch {
            // Thử candidate URL tiếp theo
          }
        }
        return null;
      } finally {
        fixturesInFlight.delete(cacheKey);
      }
    })();

    fixturesInFlight.set(cacheKey, fetchPromise);
    const result = await fetchPromise;
    return { data: result, cached: false };
  },

  clearFixturesCache() {
    fixturesMemoryCache.clear();
    fixturesInFlight.clear();
  },
};

/**
 * Chuẩn hóa raw JSON từ upstream ESPN/worldcup26.ir thành cấu trúc NormalizedMatchSummary an toàn
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseRawSummary(
  leagueSlug: string,
  eventId: string,
  raw: any,
): NormalizedMatchSummary | null {
  try {
    const competition = raw.header?.competitions?.[0];
    if (!competition) return null;

    const competitors: any[] = competition.competitors || [];
    const homeComp = competitors.find((c: any) => c.homeAway === "home") || competitors[0];
    const awayComp = competitors.find((c: any) => c.homeAway === "away") || competitors[1];

    if (!homeComp || !awayComp) return null;

    // Trạng thái trận
    const statusParsed = parseStatus(competition.status);

    // Thông tin 2 đội
    const parseScore = (val: any): number | undefined => {
      if (val === undefined || val === null || val === "") return undefined;
      const n = typeof val === "number" ? val : parseInt(String(val), 10);
      return isNaN(n) ? undefined : n;
    };

    const resolveTeamLogo = (teamObj: any): string => {
      if (!teamObj) return "";
      if (typeof teamObj.logo === "string" && teamObj.logo.trim()) {
        return teamObj.logo.trim();
      }
      if (Array.isArray(teamObj.logos) && teamObj.logos.length > 0) {
        const first = teamObj.logos[0];
        if (first && typeof first.href === "string" && first.href.trim()) {
          return first.href.trim();
        }
      }
      return "";
    };

    const homeTeam = {
      id: String(homeComp.id || homeComp.team?.id || ""),
      name: homeComp.team?.displayName || homeComp.team?.name || "Đội nhà",
      displayName: homeComp.team?.displayName || homeComp.team?.name || "Đội nhà",
      abbreviation: homeComp.team?.abbreviation || "",
      logo: resolveTeamLogo(homeComp.team),
      score: parseScore(homeComp.score),
      homeAway: "home" as const,
      winner: homeComp.winner === true,
      form: homeComp.form || "",
    };

    const awayTeam = {
      id: String(awayComp.id || awayComp.team?.id || ""),
      name: awayComp.team?.displayName || awayComp.team?.name || "Đội khách",
      displayName: awayComp.team?.displayName || awayComp.team?.name || "Đội khách",
      abbreviation: awayComp.team?.abbreviation || "",
      logo: resolveTeamLogo(awayComp.team),
      score: parseScore(awayComp.score),
      homeAway: "away" as const,
      winner: awayComp.winner === true,
      form: awayComp.form || "",
    };

    // 1. Thống kê (Boxscore stats)
    const stats: MatchStatItem[] = [];
    const boxscoreTeams: any[] = raw.boxscore?.teams || [];
    const homeBox = boxscoreTeams.find((b: any) => String(b.team?.id) === homeTeam.id) || boxscoreTeams[0];
    const awayBox = boxscoreTeams.find((b: any) => String(b.team?.id) === awayTeam.id) || boxscoreTeams[1];

    const homeStatsMap = new Map<string, any>();
    if (homeBox && Array.isArray(homeBox.statistics)) {
      for (const st of homeBox.statistics) {
        if (st.name) homeStatsMap.set(st.name, st);
      }
    }

    const awayStatsMap = new Map<string, any>();
    if (awayBox && Array.isArray(awayBox.statistics)) {
      for (const st of awayBox.statistics) {
        if (st.name) awayStatsMap.set(st.name, st);
      }
    }

    // Danh mục các chỉ số quan trọng hiển thị chuẩn
    const STAT_DEFINITIONS: Array<{ key: string; label: string }> = [
      { key: "possessionPct", label: "Kiểm soát bóng (%)" },
      { key: "totalShots", label: "Tổng số cú sút" },
      { key: "shotsOnTarget", label: "Sút trúng đích" },
      { key: "wonCorners", label: "Phạt góc" },
      { key: "foulsCommitted", label: "Phạm lỗi" },
      { key: "saves", label: "Cứu thua" },
      { key: "yellowCards", label: "Thẻ vàng" },
      { key: "redCards", label: "Thẻ đỏ" },
      { key: "offsides", label: "Việt vị" },
      { key: "passPct", label: "Tỷ lệ chuyền chính xác (%)" },
      { key: "totalPasses", label: "Tổng số đường chuyền" },
      { key: "effectiveTackles", label: "Tắc bóng thành công" },
      { key: "totalClearance", label: "Phá bóng giải nguy" },
    ];

    for (const def of STAT_DEFINITIONS) {
      const hStat = homeStatsMap.get(def.key);
      const aStat = awayStatsMap.get(def.key);
      if (hStat || aStat) {
        const hValStr = hStat?.displayValue ?? "-";
        const aValStr = aStat?.displayValue ?? "-";
        const hNum = hStat?.value ?? (hStat?.displayValue ? parseFloat(hStat.displayValue) : undefined);
        const aNum = aStat?.value ?? (aStat?.displayValue ? parseFloat(aStat.displayValue) : undefined);

        stats.push({
          name: def.key,
          label: def.label,
          homeValue: hValStr,
          awayValue: aValStr,
          homeNumeric: typeof hNum === "number" && !isNaN(hNum) ? hNum : undefined,
          awayNumeric: typeof aNum === "number" && !isNaN(aNum) ? aNum : undefined,
        });
      }
    }

    // 2. Diễn biến trận đấu (Key Events)
    const events: MatchKeyEvent[] = [];
    if (Array.isArray(raw.keyEvents)) {
      for (const ev of raw.keyEvents) {
        const typeRaw = ev.type?.type || ev.type?.text || "";
        const typeId = String(ev.type?.id || "");
        let eventType: MatchKeyEvent["type"] = "other";

        // Nhận diện theo typeId/typeRaw
        if (typeId === "70" || typeRaw.toLowerCase().includes("goal") || ev.scoringPlay === true) {
          eventType = "goal";
        } else if (typeId === "94" || typeRaw.toLowerCase().includes("yellow")) {
          eventType = "yellow-card";
        } else if (typeId === "95" || typeRaw.toLowerCase().includes("red")) {
          eventType = "red-card";
        } else if (typeId === "76" || typeRaw.toLowerCase().includes("substitution")) {
          eventType = "substitution";
        }

        // Bỏ qua kickoff/halftime/end period để timeline sạch và tập trung vào diễn biến thực tế
        if (eventType === "other" && ["kickoff", "halftime", "end-of-half", "fulltime"].some(k => typeRaw.toLowerCase().includes(k))) {
          continue;
        }

        const clockDisplay = ev.clock?.displayValue || "";
        const minuteMatch = clockDisplay.match(/(\d+)/);
        const minute = minuteMatch ? parseInt(minuteMatch[1], 10) : (ev.period?.number ? ev.period.number * 45 : 0);

        const isPenalty = ev.text?.toLowerCase().includes("penalty") || ev.type?.text?.toLowerCase().includes("penalty");
        const isOwnGoal = ev.text?.toLowerCase().includes("own goal");

        // Xác định cầu thủ & cầu thủ thay người
        const participants = ev.participants || [];
        const mainPlayer = participants[0]?.athlete?.displayName || "";
        const subOutPlayer = participants[1]?.athlete?.displayName || "";

        // Xác định teamId nếu có
        let teamId: string | undefined = undefined;
        let homeAway: "home" | "away" | undefined = undefined;
        if (ev.team?.id) {
          teamId = String(ev.team.id);
          homeAway = teamId === homeTeam.id ? "home" : "away";
        } else if (ev.text) {
          // Đoán team theo tên đội trong văn bản
          if (ev.text.includes(homeTeam.name)) homeAway = "home";
          else if (ev.text.includes(awayTeam.name)) homeAway = "away";
        }

        events.push({
          id: String(ev.id || `${minute}-${eventType}-${events.length}`),
          type: eventType,
          typeText: ev.type?.text || ev.type?.type || "Event",
          text: ev.text || "",
          clock: clockDisplay,
          minute,
          period: ev.period?.number,
          teamId,
          homeAway,
          playerName: mainPlayer,
          subInPlayer: eventType === "substitution" ? mainPlayer : undefined,
          subOutPlayer: eventType === "substitution" ? subOutPlayer : undefined,
          isPenalty,
          isOwnGoal,
        });
      }

      // Sắp xếp sự kiện tăng dần theo phút
      events.sort((a, b) => a.minute - b.minute);
    }

    // 3. Đội hình thi đấu (Rosters)
    const rosters: any[] = raw.rosters || [];
    const homeRosterRaw = rosters.find((r: any) => String(r.team?.id) === homeTeam.id || r.homeAway === "home") || rosters[0];
    const awayRosterRaw = rosters.find((r: any) => String(r.team?.id) === awayTeam.id || r.homeAway === "away") || rosters[1];

    const parseRosterPlayers = (rosterList: any[] = []) => {
      const starters: MatchRosterPlayer[] = [];
      const bench: MatchRosterPlayer[] = [];

      for (const p of rosterList) {
        const photoUrl = typeof p.athlete?.headshot?.href === "string" ? p.athlete.headshot.href : undefined;
        const jerseyImageUrl =
          Array.isArray(p.athlete?.jerseyImages)
            ? p.athlete.jerseyImages.find((j: any) => j.rel?.includes("dark") || j.rel?.includes("default"))?.href ||
              p.athlete.jerseyImages[0]?.href
            : undefined;

        const stats: PlayerMatchStat[] | undefined = Array.isArray(p.stats)
          ? p.stats
              .filter((s: any) => s && (s.value !== undefined || s.displayValue !== undefined))
              .map((s: any) => ({
                name: String(s.name || ""),
                displayName: String(s.displayName || s.shortDisplayName || s.name || ""),
                value: s.displayValue !== undefined ? s.displayValue : s.value,
              }))
          : undefined;

        const isScheduled = statusParsed.status === "scheduled";

        // Parse an toàn subbedIn / subbedOut vì ESPN trả về:
        // - boolean: false | true
        // - hoặc object: { didSub: false } | { didSub: true } (Boolean({ didSub: false }) === true trong JS)
        // Khi trận chưa diễn ra (scheduled), tuyệt đối không có việc thay người
        const parseDidSub = (val: any): boolean => {
          if (isScheduled) return false;
          if (typeof val === "boolean") return val;
          if (val && typeof val === "object") {
            if (typeof val.didSub === "boolean") return val.didSub;
            if (typeof val.value === "boolean") return val.value;
          }
          return false;
        };

        const subbedIn = parseDidSub(p.subbedIn);
        const subbedOut = parseDidSub(p.subbedOut);

        let subClock: string | undefined = undefined;
        if (!isScheduled && (subbedIn || subbedOut)) {
          if (Array.isArray(p.plays)) {
            const subPlay = p.plays.find((pl: any) => pl.substitution === true || pl.clock);
            if (subPlay?.clock?.displayValue) {
              subClock = subPlay.clock.displayValue;
            }
          }
          if (!subClock && typeof p.subbedIn === "object" && p.subbedIn?.clock?.displayValue) {
            subClock = p.subbedIn.clock.displayValue;
          }
          if (!subClock && typeof p.subbedOut === "object" && p.subbedOut?.clock?.displayValue) {
            subClock = p.subbedOut.clock.displayValue;
          }
        }

        const item: MatchRosterPlayer = {
          id: String(p.athlete?.id || p.id || Math.random().toString()),
          name: p.athlete?.fullName || p.athlete?.displayName || "Cầu thủ",
          displayName: p.athlete?.displayName || p.athlete?.fullName || "Cầu thủ",
          shortName: p.athlete?.shortName,
          jersey: String(p.jersey || ""),
          position: p.position?.displayName || p.position?.name || p.position?.abbreviation || "",
          starter: Boolean(p.starter),
          formationPlace: p.formationPlace ? parseInt(p.formationPlace, 10) : undefined,
          subbedIn,
          subbedOut,
          subClock,
          photoUrl,
          jerseyImageUrl,
          stats: stats && stats.length > 0 ? stats : undefined,
        };

        if (item.starter) {
          starters.push(item);
        } else {
          bench.push(item);
        }
      }

      return { starters, bench };
    };

    const homeRosterParsed = parseRosterPlayers(homeRosterRaw?.roster);
    const awayRosterParsed = parseRosterPlayers(awayRosterRaw?.roster);

    // 4. Thông tin sân vận động và trọng tài (Game Info)
    const venueRaw = raw.gameInfo?.venue;
    const officialsRaw = raw.gameInfo?.officials || [];
    const referee = officialsRaw.find((o: any) => o.position?.name?.toLowerCase().includes("referee"))?.displayName || officialsRaw[0]?.displayName;

    const gameInfo: MatchGameInfo = {
      venue: venueRaw ? {
        name: venueRaw.fullName || venueRaw.name || "Chưa cập nhật sân",
        city: venueRaw.address?.city,
        country: venueRaw.address?.country,
      } : undefined,
      attendance: raw.gameInfo?.attendance ? parseInt(raw.gameInfo.attendance, 10) : undefined,
      referee,
    };

    // 5. Bình luận diễn biến chi tiết (Commentary)
    const commentary: MatchCommentaryItem[] = [];
    if (Array.isArray(raw.commentary)) {
      // Giữ tối đa 100 tin bình luận mới nhất / đầy đủ
      for (const c of raw.commentary) {
        if (!c.text) continue;
        commentary.push({
          sequence: typeof c.sequence === "number" ? c.sequence : commentary.length,
          time: c.time?.displayValue || "",
          text: c.text,
        });
      }
    }

    return {
      eventId,
      leagueSlug,
      status: statusParsed.status,
      statusText: statusParsed.statusText,
      displayClock: statusParsed.displayClock || competition.status?.displayClock,
      homeTeam,
      awayTeam,
      stats,
      events,
      homeRoster: {
        formation: homeRosterRaw?.formation,
        starters: homeRosterParsed.starters,
        bench: homeRosterParsed.bench,
      },
      awayRoster: {
        formation: awayRosterRaw?.formation,
        starters: awayRosterParsed.starters,
        bench: awayRosterParsed.bench,
      },
      gameInfo,
      commentary,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Chuẩn hóa raw JSON từ upstream ESPN/worldcup26.ir thành cấu trúc NormalizedLeagueStandings an toàn
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeStandings(raw: any, leagueSlug: string): NormalizedLeagueStandings | null {
  try {
    const leagueName = raw.name || raw.abbreviation || leagueSlug.toUpperCase();
    const season = typeof raw.season === "number" ? raw.season : new Date().getFullYear();
    const groups: StandingGroup[] = [];

    for (const child of raw.children || []) {
      const groupName = child.name || child.abbreviation || "Bảng xếp hạng";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entriesRaw: any[] = child.standings?.entries || [];
      const entries: StandingEntry[] = [];

      for (let i = 0; i < entriesRaw.length; i++) {
        const e = entriesRaw[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const statsList: any[] = Array.isArray(e.stats) ? e.stats : [];
        const statsMap = new Map<string, number>();

        for (const s of statsList) {
          const key = s.name || s.type || "";
          const val = parseInt(s.displayValue || s.value || "0", 10);
          if (key) {
            statsMap.set(key, isNaN(val) ? 0 : val);
          }
        }

        const rank = typeof e.rank === "number" ? e.rank : statsMap.get("rank") || i + 1;
        const teamRaw = e.team || {};

        const entry: StandingEntry = {
          rank,
          team: {
            id: String(teamRaw.id || ""),
            name: teamRaw.name || teamRaw.displayName || "Đội bóng",
            displayName: teamRaw.displayName || teamRaw.name || "Đội bóng",
            shortDisplayName: teamRaw.shortDisplayName,
            abbreviation: teamRaw.abbreviation,
            logo: teamRaw.logo || (Array.isArray(teamRaw.logos) && teamRaw.logos[0]?.href) || undefined,
          },
          gamesPlayed: statsMap.get("gamesPlayed") ?? 0,
          wins: statsMap.get("wins") ?? 0,
          ties: statsMap.get("ties") ?? 0,
          losses: statsMap.get("losses") ?? 0,
          pointsFor: statsMap.get("pointsFor") ?? 0,
          pointsAgainst: statsMap.get("pointsAgainst") ?? 0,
          pointDifferential: statsMap.get("pointDifferential") ?? 0,
          points: statsMap.get("points") ?? 0,
          note: e.note
            ? {
                color: e.note.color,
                description: e.note.description,
                rank: e.note.rank,
              }
            : undefined,
        };

        entries.push(entry);
      }

      // Sắp xếp các đội theo rank tăng dần
      entries.sort((a, b) => a.rank - b.rank);

      if (entries.length > 0) {
        groups.push({
          name: groupName,
          entries,
        });
      }
    }

    if (groups.length === 0) return null;

    return {
      leagueSlug,
      leagueName,
      season,
      groups,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Chuyển đổi timestamp ISO UTC sang ngày giờ theo chuẩn múi giờ Việt Nam (Asia/Ho_Chi_Minh - UTC+7)
 */
export function formatUtc7Date(isoDateString?: string): {
  kickoffDateUtc7: string;
  kickoffTimeUtc7: string;
  formattedDateUtc7: string;
} {
  if (!isoDateString) {
    return {
      kickoffDateUtc7: "",
      kickoffTimeUtc7: "--:--",
      formattedDateUtc7: "Chưa xác định",
    };
  }

  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) {
    return {
      kickoffDateUtc7: "",
      kickoffTimeUtc7: "--:--",
      formattedDateUtc7: "Chưa xác định",
    };
  }

  try {
    const dtfDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const kickoffDateUtc7 = dtfDate.format(date);

    const dtfTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const kickoffTimeUtc7 = dtfTime.format(date);

    const dtfWeekday = new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const formattedDateUtc7 = dtfWeekday.format(date);

    return {
      kickoffDateUtc7,
      kickoffTimeUtc7,
      formattedDateUtc7,
    };
  } catch {
    return {
      kickoffDateUtc7: "",
      kickoffTimeUtc7: "--:--",
      formattedDateUtc7: "Chưa xác định",
    };
  }
}

/**
 * Phân tích trạng thái trận đấu trong fixtures
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseFixtureStatus(statusObj?: any): {
  status: FixtureStatus;
  statusText: string;
  displayClock?: string;
  completed: boolean;
} {
  if (!statusObj) {
    return { status: "scheduled", statusText: "Sắp diễn ra", completed: false };
  }

  const state = statusObj.type?.state?.toLowerCase();
  const name = statusObj.type?.name?.toUpperCase() || "";
  const displayClock = statusObj.displayClock || "";

  if (name.includes("POSTPONED")) {
    return { status: "postponed", statusText: "Hoãn", displayClock, completed: false };
  }
  if (name.includes("CANCEL")) {
    return { status: "canceled", statusText: "Hủy", displayClock, completed: false };
  }
  if (state === "post" || statusObj.type?.completed === true) {
    const isPen = name.includes("PEN") || statusObj.type?.detail?.toLowerCase().includes("penalt");
    return {
      status: "finished",
      statusText: isPen ? "FT (Pen)" : "FT",
      displayClock,
      completed: true,
    };
  }
  if (state === "in") {
    return {
      status: "live",
      statusText: displayClock || "Trực tiếp",
      displayClock,
      completed: false,
    };
  }

  return { status: "scheduled", statusText: "Sắp diễn ra", displayClock, completed: false };
}

/**
 * Chuẩn hóa raw JSON fixtures từ upstream thành NormalizedLeagueFixtures
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeFixtures(raw: any, leagueSlug: string): NormalizedLeagueFixtures | null {
  try {
    if (!raw || !Array.isArray(raw.events)) {
      return null;
    }

    const leagueName = raw.league?.name || leagueSlug.toUpperCase();
    const seasonYear =
      typeof raw.league?.season?.year === "number" ? raw.league.season.year : undefined;
    const count = typeof raw.count === "number" ? raw.count : raw.events.length;
    const pageIndex = typeof raw.pageIndex === "number" ? raw.pageIndex : 1;
    const pageSize = typeof raw.pageSize === "number" ? raw.pageSize : 100;
    const pageCount = typeof raw.pageCount === "number" ? raw.pageCount : 1;

    const events: NormalizedFixtureItem[] = [];
    const dateSet = new Set<string>();

    for (const ev of raw.events) {
      if (!ev || !ev.id) continue;

      const dateIso = ev.date || "";
      const { kickoffDateUtc7, kickoffTimeUtc7, formattedDateUtc7 } = formatUtc7Date(dateIso);

      if (kickoffDateUtc7) {
        dateSet.add(kickoffDateUtc7);
      }

      const competition = ev.competitions?.[0] || {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const competitorsRaw: any[] = competition.competitors || [];
      const homeComp =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        competitorsRaw.find((c: any) => c.homeAway === "home") || competitorsRaw[0] || {};
      const awayComp =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        competitorsRaw.find((c: any) => c.homeAway === "away") || competitorsRaw[1] || {};

      const statusParsed = parseFixtureStatus(ev.status || competition.status);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parseScore = (val: any): number | undefined => {
        if (val === undefined || val === null || val === "") return undefined;
        const n = typeof val === "number" ? val : parseInt(String(val), 10);
        return isNaN(n) ? undefined : n;
      };

      const homeTeam: FixtureCompetitor = {
        id: String(homeComp.id || homeComp.team?.id || ""),
        name: homeComp.team?.name || homeComp.team?.displayName || "Đội nhà",
        displayName: homeComp.team?.displayName || homeComp.team?.name || "Đội nhà",
        shortDisplayName: homeComp.team?.shortDisplayName,
        abbreviation: homeComp.team?.abbreviation,
        logo:
          homeComp.team?.logo ||
          (Array.isArray(homeComp.team?.logos) && homeComp.team?.logos[0]?.href) ||
          undefined,
        homeAway: "home",
        score: statusParsed.status === "scheduled" ? undefined : parseScore(homeComp.score),
        winner: homeComp.winner === true,
        shootout: homeComp.shootout === true,
      };

      const awayTeam: FixtureCompetitor = {
        id: String(awayComp.id || awayComp.team?.id || ""),
        name: awayComp.team?.name || awayComp.team?.displayName || "Đội khách",
        displayName: awayComp.team?.displayName || awayComp.team?.name || "Đội khách",
        shortDisplayName: awayComp.team?.shortDisplayName,
        abbreviation: awayComp.team?.abbreviation,
        logo:
          awayComp.team?.logo ||
          (Array.isArray(awayComp.team?.logos) && awayComp.team?.logos[0]?.href) ||
          undefined,
        homeAway: "away",
        score: statusParsed.status === "scheduled" ? undefined : parseScore(awayComp.score),
        winner: awayComp.winner === true,
        shootout: awayComp.shootout === true,
      };

      const venueName = competition.venue?.fullName || competition.venue?.name;

      events.push({
        id: String(ev.id),
        name: ev.name || `${homeTeam.displayName} vs ${awayTeam.displayName}`,
        shortName: ev.shortName,
        date: dateIso,
        kickoffTimeUtc7,
        kickoffDateUtc7,
        formattedDateUtc7,
        status: statusParsed.status,
        statusText: statusParsed.statusText,
        displayClock: statusParsed.displayClock,
        homeTeam,
        awayTeam,
        venue: venueName,
      });
    }

    const availableDates = Array.from(dateSet).sort();

    return {
      leagueSlug,
      leagueName,
      seasonYear,
      count,
      pageIndex,
      pageSize,
      pageCount,
      events,
      availableDates,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Lọc fixtures theo ngày (YYYY-MM-DD theo giờ UTC+7)
 */
export function filterFixturesByDate(
  events: NormalizedFixtureItem[],
  dateUtc7?: string
): NormalizedFixtureItem[] {
  if (!dateUtc7) return events;
  return events.filter((e) => e.kickoffDateUtc7 === dateUtc7);
}


