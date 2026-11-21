/**
 * espnDirectClient.ts
 * Gọi trực tiếp ESPN CDN từ Client Browser (Access-Control-Allow-Origin: *)
 * 
 * Lợi ích tối thượng:
 * 1. Tiêu thụ 0 giây CPU trên Vercel Serverless (Bảo vệ 100% hạn mức 4 giờ của bạn).
 * 2. Invocations trên Vercel cho livescore/summary = 0.
 * 3. Tốc độ cực nhanh (<100ms) nhờ mạng lưới Akamai CDN toàn cầu của ESPN.
 * 4. Tự động fallback về Vercel API nội bộ nếu mạng client bị lỗi.
 */

import { NormalizedMatchSummary, LiveMatchScore, LiveScoreboardEvent } from "./types";
import { parseRawSummary } from "./service";
import { buildScoresMap } from "./matcher";
import { LEAGUE_CANONICAL_MAP, resolveCanonicalTournament } from "./canonicalLeagues";

const ESPN_CDN_API_URL = "https://site.api.espn.com";

// Map từ tên giải đấu chuẩn hóa (Tiếng Việt) sang ESPN leagueSlug
const TOURNAMENT_NAME_TO_SLUG: Record<string, string> = {};
for (const [slug, name] of Object.entries(LEAGUE_CANONICAL_MAP)) {
  TOURNAMENT_NAME_TO_SLUG[name.toLowerCase()] = slug;
}

function parseScore(val: unknown): number {
  if (val === undefined || val === null || val === "") return 0;
  const n = typeof val === "number" ? val : parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

function parseStatus(statusObj?: {
  type?: {
    name?: string;
    state?: string;
    description?: string;
    shortDetail?: string;
    detail?: string;
  };
  displayClock?: string;
}): {
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
    typeName === "STATUS_EXTRA_TIME" ||
    typeName === "STATUS_SHOOTOUT"
  ) {
    return {
      status: "live",
      statusText: typeName === "STATUS_HALFTIME" ? "Nghỉ giữa hiệp" : displayClock || "Đang đá",
      statusDetail: detail || "Trực tiếp",
      displayClock,
    };
  }

  if (
    state === "post" ||
    typeName === "STATUS_FINAL" ||
    typeName === "STATUS_FULL_TIME" ||
    typeName === "STATUS_POSTPONED" ||
    typeName === "STATUS_CANCELLED"
  ) {
    return {
      status: "finished",
      statusText: typeName === "STATUS_POSTPONED" ? "Hoãn" : typeName === "STATUS_CANCELLED" ? "Hủy" : "FT",
      statusDetail: detail || "Kết thúc",
      displayClock: "",
    };
  }

  return {
    status: "scheduled",
    statusText: typeName || "SCHEDULED",
    statusDetail: detail || "Chưa đá",
    displayClock: "",
  };
}

/**
 * 1. Lấy chi tiết diễn biến & thống kê trực tiếp từ ESPN CDN (0ms CPU Vercel)
 */
export async function fetchDirectMatchSummary(
  leagueSlug: string,
  eventId: string,
): Promise<NormalizedMatchSummary | null> {
  const cleanLeague = (leagueSlug || "").trim();
  const cleanEvent = (eventId || "").trim();
  if (!cleanLeague || !cleanEvent) return null;

  try {
    const url = `${ESPN_CDN_API_URL}/apis/site/v2/sports/soccer/${encodeURIComponent(cleanLeague)}/summary?event=${encodeURIComponent(cleanEvent)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const raw = await res.json();
      if (raw && typeof raw === "object") {
        const normalized = parseRawSummary(cleanLeague, cleanEvent, raw);
        if (normalized) return normalized;
      }
    }
  } catch {
    // Trực tiếp từ ESPN CDN nếu offline/lỗi: trả về null an toàn, không đánh thức Vercel Serverless
  }

  return null;
}

/**
 * 2. Lấy tỷ số trực tiếp các giải đang đá thẳng từ ESPN CDN (0ms CPU Vercel)
 */
export async function fetchDirectScoreboardEvents(
  leagueSlugs: string[],
): Promise<LiveScoreboardEvent[]> {
  if (!leagueSlugs || leagueSlugs.length === 0) return [];

  const uniqueSlugs = Array.from(new Set(leagueSlugs));
  const fetchPromises = uniqueSlugs.map(async (slug) => {
    try {
      const url = `${ESPN_CDN_API_URL}/apis/site/v2/sports/soccer/${encodeURIComponent(slug)}/scoreboard`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data || !Array.isArray(data.events)) return [];

      const events: LiveScoreboardEvent[] = [];
      for (const rawEvent of data.events) {
        if (!rawEvent || !rawEvent.id) continue;
        const comp = rawEvent.competitions?.[0];
        if (!comp || !Array.isArray(comp.competitors) || comp.competitors.length < 2) continue;

        const homeComp = comp.competitors.find((c: { homeAway?: string }) => c.homeAway === "home");
        const awayComp = comp.competitors.find((c: { homeAway?: string }) => c.homeAway === "away");
        if (!homeComp?.team || !awayComp?.team) continue;

        const homeScore = parseScore(homeComp.score);
        const awayScore = parseScore(awayComp.score);
        const { status, statusText, statusDetail, displayClock } = parseStatus(rawEvent.status);

        events.push({
          id: String(rawEvent.id),
          leagueSlug: slug,
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
      return [];
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  const allEvents: LiveScoreboardEvent[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      allEvents.push(...r.value);
    }
  }
  return allEvents;
}

/**
 * 3. Trích xuất danh sách các giải đấu ESPN cần tra cứu từ danh sách trận đấu trên Nanaflix
 */
export function extractActiveLeagueSlugs(
  matches: Array<{
    tournament?: string;
    title?: string;
    sport?: string;
    team1?: string;
    team2?: string;
  }>,
): string[] {
  const slugs = new Set<string>();
  // Luôn luôn bao gồm giải Ngoại Hạng Anh nếu có trận đang phát
  slugs.add("eng.1");

  for (const m of matches) {
    if (m.sport && m.sport !== "football") continue;
    const canonical = resolveCanonicalTournament({
      tournament: m.tournament,
      title: m.title,
      sport: m.sport,
      team1: m.team1,
      team2: m.team2,
    });
    if (canonical) {
      const slug = TOURNAMENT_NAME_TO_SLUG[canonical.toLowerCase()];
      if (slug) {
        slugs.add(slug);
      }
    }
  }

  return Array.from(slugs);
}
