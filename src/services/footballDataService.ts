export interface TeamStanding {
  rank: number;
  teamId: string;
  name: string;
  shortName?: string;
  logo?: string;
  gamesPlayed: number;
  wins: number;
  ties: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: string;
  points: number;
}

export interface LeagueInfo {
  id: string;
  name: string;
  vietnameseName: string;
  flag: string;
  season?: string;
}

export const POPULAR_LEAGUES: LeagueInfo[] = [
  {
    id: "eng.1",
    name: "Premier League",
    vietnameseName: "Ngoại Hạng Anh",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  {
    id: "uefa.champions",
    name: "UEFA Champions League",
    vietnameseName: "Cúp C1 Châu Âu",
    flag: "⭐",
  },
  {
    id: "esp.1",
    name: "La Liga",
    vietnameseName: "VĐQG Tây Ban Nha",
    flag: "🇪🇸",
  },
  {
    id: "ita.1",
    name: "Serie A",
    vietnameseName: "VĐQG Ý",
    flag: "🇮🇹",
  },
  {
    id: "ger.1",
    name: "Bundesliga",
    vietnameseName: "VĐQG Đức",
    flag: "🇩🇪",
  },
  {
    id: "fra.1",
    name: "Ligue 1",
    vietnameseName: "VĐQG Pháp",
    flag: "🇫🇷",
  },
  {
    id: "vnm.1",
    name: "V-League",
    vietnameseName: "V-League Việt Nam",
    flag: "🇻🇳",
  },
];

// Types for Live Scoreboard
export interface LiveScoreboardMatch {
  id: string;
  name: string;
  shortName: string;
  date: string;
  statusState: "pre" | "in" | "post";
  statusDetail: string;
  clock: string;
  isLive: boolean;
  leagueId: string;
  leagueName: string;
  homeTeam: {
    id: string;
    name: string;
    shortName?: string;
    logo?: string;
    score: number;
    winner?: boolean;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName?: string;
    logo?: string;
    score: number;
    winner?: boolean;
  };
  venue?: string;
}

// Types for Lineup & Match Detail Summary
export interface RosterPlayer {
  id: string;
  name: string;
  shortName: string;
  jersey: string;
  position: string;
  starter: boolean;
  subbedIn?: boolean;
  subbedOut?: boolean;
  headshot?: string;
}

export interface GroupedRoster {
  goalkeepers: RosterPlayer[];
  defenders: RosterPlayer[];
  midfielders: RosterPlayer[];
  forwards: RosterPlayer[];
  total: number;
}

export interface TeamLineup {
  teamId: string;
  teamName: string;
  logo?: string;
  formation?: string;
  isConfirmed?: boolean;
  starters: RosterPlayer[];
  bench: RosterPlayer[];
  grouped?: GroupedRoster;
}

export interface MatchKeyEvent {
  id: string;
  type: string;
  clock: string;
  text: string;
  teamName?: string;
  scoringPlay?: boolean;
  category?: "goal" | "card" | "sub" | "other";
}

export interface MatchStatItem {
  name: string;
  label: string;
  homeValue: string;
  awayValue: string;
  homePercent?: number;
  awayPercent?: number;
}

export interface MatchSummaryData {
  id: string;
  leagueId: string;
  leagueName: string;
  statusState: "pre" | "in" | "post";
  statusDetail: string;
  clock: string;
  isLive: boolean;
  isConfirmedLineup?: boolean;
  venue?: string;
  attendance?: number;
  homeTeam: {
    id: string;
    name: string;
    shortName?: string;
    logo?: string;
    score: number;
    formation?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName?: string;
    logo?: string;
    score: number;
    formation?: string;
  };
  lineups: {
    home: TeamLineup;
    away: TeamLineup;
  };
  keyEvents: MatchKeyEvent[];
  statistics: MatchStatItem[];
}

const standingsMemoryCache = new Map<string, { data: TeamStanding[]; expireAt: number }>();
const scoreboardMemoryCache = new Map<string, { data: LiveScoreboardMatch[]; expireAt: number }>();
const matchSummaryMemoryCache = new Map<string, { data: MatchSummaryData; expireAt: number }>();

// 1. Fetch League Standings
export async function fetchLeagueStandings(leagueId: string = "eng.1"): Promise<TeamStanding[]> {
  const now = Date.now();
  if (standingsMemoryCache.has(leagueId)) {
    const cached = standingsMemoryCache.get(leagueId)!;
    if (cached.expireAt > now) {
      return cached.data;
    }
  }

  try {
    const res = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/${leagueId}/standings`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const json = await res.json();
      const rawEntries = json.children?.[0]?.standings?.entries || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const standings: TeamStanding[] = rawEntries.map((e: any, index: number) => {
        const statsMap = Object.fromEntries(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e.stats || []).map((s: any) => [s.name, s.displayValue !== undefined ? s.displayValue : s.value])
        );

        return {
          rank: Number(statsMap.rank || index + 1),
          teamId: e.team?.id || String(index),
          name: e.team?.displayName || e.team?.name || "Đội bóng",
          shortName: e.team?.shortDisplayName || e.team?.abbreviation,
          logo: e.team?.logos?.[0]?.href || undefined,
          gamesPlayed: Number(statsMap.gamesPlayed || 0),
          wins: Number(statsMap.wins || 0),
          ties: Number(statsMap.ties || 0),
          losses: Number(statsMap.losses || 0),
          goalsFor: Number(statsMap.pointsFor || statsMap.goalsFor || 0),
          goalsAgainst: Number(statsMap.pointsAgainst || statsMap.goalsAgainst || 0),
          goalDifference: String(statsMap.pointDifferential || "0"),
          points: Number(statsMap.points || 0),
        };
      });

      if (standings.length > 0) {
        standingsMemoryCache.set(leagueId, {
          data: standings,
          expireAt: now + 30 * 60 * 1000,
        });
        return standings;
      }
    }
  } catch (error) {
    console.error(`Lỗi tải bảng xếp hạng ${leagueId}:`, error);
  }

  return [];
}

// 2. Fetch League Scoreboard (Live Scores)
export async function fetchLeagueScoreboard(leagueId: string = "eng.1"): Promise<LiveScoreboardMatch[]> {
  const now = Date.now();
  if (scoreboardMemoryCache.has(leagueId)) {
    const cached = scoreboardMemoryCache.get(leagueId)!;
    if (cached.expireAt > now) {
      return cached.data;
    }
  }

  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueId}/scoreboard`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const json = await res.json();
      const leagueName = json.leagues?.[0]?.name || "Bóng đá";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawEvents = json.events || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matches: LiveScoreboardMatch[] = rawEvents.map((ev: any) => {
        const comp = ev.competitions?.[0] || {};
        const homeComp = (comp.competitors || []).find((c: any) => c.homeAway === "home") || comp.competitors?.[0] || {};
        const awayComp = (comp.competitors || []).find((c: any) => c.homeAway === "away") || comp.competitors?.[1] || {};

        const state = ev.status?.type?.state as "pre" | "in" | "post" || "pre";
        const isLive = state === "in";

        return {
          id: ev.id,
          name: ev.name || `${homeComp.team?.displayName} vs ${awayComp.team?.displayName}`,
          shortName: ev.shortName || `${homeComp.team?.shortDisplayName} vs ${awayComp.team?.shortDisplayName}`,
          date: ev.date || "",
          statusState: state,
          statusDetail: ev.status?.type?.detail || (isLive ? "Đang đá" : state === "post" ? "Hết giờ" : "Sắp đá"),
          clock: ev.status?.displayClock || "",
          isLive,
          leagueId,
          leagueName,
          homeTeam: {
            id: homeComp.team?.id || "home",
            name: homeComp.team?.displayName || homeComp.team?.name || "Đội nhà",
            shortName: homeComp.team?.shortDisplayName || homeComp.team?.abbreviation,
            logo: homeComp.team?.logo || homeComp.team?.logos?.[0]?.href,
            score: Number(homeComp.score || 0),
            winner: homeComp.winner,
          },
          awayTeam: {
            id: awayComp.team?.id || "away",
            name: awayComp.team?.displayName || awayComp.team?.name || "Đội khách",
            shortName: awayComp.team?.shortDisplayName || awayComp.team?.abbreviation,
            logo: awayComp.team?.logo || awayComp.team?.logos?.[0]?.href,
            score: Number(awayComp.score || 0),
            winner: awayComp.winner,
          },
          venue: comp.venue?.fullName || comp.venue?.address?.city,
        };
      });

      scoreboardMemoryCache.set(leagueId, {
        data: matches,
        expireAt: now + 20 * 1000, // 20s cache
      });

      return matches;
    }
  } catch (error) {
    console.error(`Lỗi tải tỉ số live ${leagueId}:`, error);
  }

  return [];
}

export function categorizePlayers(players: RosterPlayer[]): GroupedRoster {
  const gks: RosterPlayer[] = [];
  const defs: RosterPlayer[] = [];
  const mids: RosterPlayer[] = [];
  const fwds: RosterPlayer[] = [];

  players.forEach((player) => {
    const pos = (player.position || "").toLowerCase();
    if (
      pos.includes("goal") ||
      pos.includes("keeper") ||
      pos === "gk" ||
      pos.includes("thủ môn")
    ) {
      gks.push(player);
    } else if (
      pos.includes("defen") ||
      pos.includes("back") ||
      pos.includes("center-back") ||
      pos.includes("fullback") ||
      pos.includes("hậu vệ") ||
      pos === "df" ||
      pos === "cb" ||
      pos === "lb" ||
      pos === "rb" ||
      pos === "rwb" ||
      pos === "lwb"
    ) {
      defs.push(player);
    } else if (
      pos.includes("mid") ||
      pos.includes("center") ||
      pos.includes("winger") ||
      pos.includes("tiền vệ") ||
      pos === "mf" ||
      pos === "cm" ||
      pos === "dm" ||
      pos === "am" ||
      pos === "lm" ||
      pos === "rm"
    ) {
      mids.push(player);
    } else {
      fwds.push(player);
    }
  });

  const sortByJersey = (list: RosterPlayer[]) => {
    return list.sort((a, b) => {
      const numA = parseInt(a.jersey, 10);
      const numB = parseInt(b.jersey, 10);
      if (isNaN(numA) && isNaN(numB)) return a.name.localeCompare(b.name);
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;
      return numA - numB;
    });
  };

  return {
    goalkeepers: sortByJersey(gks),
    defenders: sortByJersey(defs),
    midfielders: sortByJersey(mids),
    forwards: sortByJersey(fwds),
    total: players.length,
  };
}

// 3. Fetch Full Match Summary & Lineups
export async function fetchMatchSummary(eventId: string): Promise<MatchSummaryData | null> {
  const now = Date.now();
  if (matchSummaryMemoryCache.has(eventId)) {
    const cached = matchSummaryMemoryCache.get(eventId)!;
    if (cached.expireAt > now) {
      return cached.data;
    }
  }

  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${eventId}`, {
      next: { revalidate: 20 },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const comp = data.header?.competitions?.[0] || {};
      const homeComp = (comp.competitors || []).find((c: any) => c.homeAway === "home") || comp.competitors?.[0] || {};
      const awayComp = (comp.competitors || []).find((c: any) => c.homeAway === "away") || comp.competitors?.[1] || {};

      const state = data.header?.status?.type?.state as "pre" | "in" | "post" || "pre";
      const isLive = state === "in";

      // Rosters & Lineups
      const homeRosterRaw = data.rosters?.[0] || {};
      const awayRosterRaw = data.rosters?.[1] || {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsePlayer = (p: any): RosterPlayer => ({
        id: p.athlete?.id || Math.random().toString(),
        name: p.athlete?.displayName || p.athlete?.name || "Cầu thủ",
        shortName: p.athlete?.shortName || p.athlete?.displayName || "Cầu thủ",
        jersey: p.jersey || "",
        position: p.position?.name || p.position?.displayName || p.position?.abbreviation || "",
        starter: Boolean(p.starter),
        subbedIn: Boolean(p.subbedIn),
        subbedOut: Boolean(p.subbedOut),
        headshot: p.athlete?.headshot?.href || undefined,
      });

      const homeRosterList = homeRosterRaw.roster || [];
      const awayRosterList = awayRosterRaw.roster || [];

      const homeLineup: TeamLineup = {
        teamId: homeRosterRaw.team?.id || homeComp.team?.id || "home",
        teamName: homeRosterRaw.team?.displayName || homeComp.team?.displayName || "Đội nhà",
        logo: homeRosterRaw.team?.logo || homeComp.team?.logo,
        formation: homeRosterRaw.formation,
        starters: homeRosterList.filter((p: any) => p.starter).map(parsePlayer),
        bench: homeRosterList.filter((p: any) => !p.starter).map(parsePlayer),
      };

      const awayLineup: TeamLineup = {
        teamId: awayRosterRaw.team?.id || awayComp.team?.id || "away",
        teamName: awayRosterRaw.team?.displayName || awayComp.team?.displayName || "Đội khách",
        logo: awayRosterRaw.team?.logo || awayComp.team?.logo,
        formation: awayRosterRaw.formation,
        starters: awayRosterList.filter((p: any) => p.starter).map(parsePlayer),
        bench: awayRosterList.filter((p: any) => !p.starter).map(parsePlayer),
      };

      let isConfirmedLineup = homeLineup.starters.length > 0 || awayLineup.starters.length > 0;
      homeLineup.isConfirmed = isConfirmedLineup;
      awayLineup.isConfirmed = isConfirmedLineup;

      const homeTeamId = homeComp.team?.id || homeRosterRaw.team?.id;
      const awayTeamId = awayComp.team?.id || awayRosterRaw.team?.id;
      const leagueHint = data.header?.league?.id;

      // Helper lấy danh sách cầu thủ mùa 2026/27 từ ESPN
      const fetchClubRoster = async (teamId: string): Promise<RosterPlayer[]> => {
        if (!teamId) return [];

        const candidateSlugs = [
          leagueHint && !/^\d+$/.test(leagueHint) ? leagueHint : null,
          "eng.1",
          "uefa.champions",
          "esp.1",
          "ita.1",
          "ger.1",
          "fra.1",
          "vnm.1",
          "uefa.europa",
          "eng.fa",
          "eng.league_cup",
        ].filter(Boolean) as string[];

        const espnPromises = candidateSlugs.map(async (slug) => {
          try {
            const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${teamId}/roster`, {
              next: { revalidate: 1800 },
              signal: AbortSignal.timeout(3500),
            });
            if (res.ok) {
              const json = await res.json();
              if (json.athletes && json.athletes.length > 0) {
                return json.athletes;
              }
            }
          } catch {}
          return null;
        });

        const espnResults = await Promise.all(espnPromises);
        const espnAthletes = espnResults.find(Boolean);

        if (espnAthletes && espnAthletes.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return espnAthletes.map((a: any) => ({
            id: a.id || Math.random().toString(),
            name: a.displayName || a.name || "Cầu thủ",
            shortName: a.shortName || a.displayName || "Cầu thủ",
            jersey: a.jersey || "-",
            position: a.position?.displayName || a.position?.name || "Cầu thủ",
            starter: false,
            headshot: a.headshot?.href || undefined,
          }));
        }

        return [];
      };

      if (isConfirmedLineup) {
        homeLineup.grouped = categorizePlayers([...homeLineup.starters, ...homeLineup.bench]);
        awayLineup.grouped = categorizePlayers([...awayLineup.starters, ...awayLineup.bench]);
      } else {
        try {
          const [homeRoster, awayRoster] = await Promise.all([
            fetchClubRoster(homeTeamId),
            fetchClubRoster(awayTeamId),
          ]);

          if (homeRoster.length > 0) {
            homeLineup.bench = homeRoster;
            homeLineup.grouped = categorizePlayers(homeRoster);
          }
          if (awayRoster.length > 0) {
            awayLineup.bench = awayRoster;
            awayLineup.grouped = categorizePlayers(awayRoster);
          }
        } catch {}
      }

      // Key Events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const keyEvents: MatchKeyEvent[] = (data.keyEvents || []).map((e: any, idx: number) => {
        const typeText = e.type?.text?.toLowerCase() || "";
        let category: "goal" | "card" | "sub" | "other" = "other";
        if (typeText.includes("goal") || e.scoringPlay) category = "goal";
        else if (typeText.includes("card")) category = "card";
        else if (typeText.includes("substitution")) category = "sub";

        return {
          id: e.id || String(idx),
          type: e.type?.text || "Sự kiện",
          clock: e.clock?.displayValue || "",
          text: e.text || "",
          teamName: e.team?.displayName || "",
          scoringPlay: Boolean(e.scoringPlay),
          category,
        };
      });

      // Statistics
      const homeStats = data.boxscore?.teams?.[0]?.statistics || [];
      const awayStats = data.boxscore?.teams?.[1]?.statistics || [];

      // Map labels
      const statLabelMap: Record<string, string> = {
        possession: "Kiểm soát bóng",
        shots: "Tổng số cú sút",
        shotsOnTarget: "Sút trúng đích",
        fouls: "Phạm lỗi",
        yellowCards: "Thẻ vàng",
        redCards: "Thẻ đỏ",
        offsides: "Việt vị",
        cornerKicks: "Phạt góc",
        saves: "Cứu thua",
        passCompletion: "Chuyền chính xác (%)",
        accuratePasses: "Số đường chuyền chuẩn",
      };

      const statistics: MatchStatItem[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      homeStats.forEach((hs: any) => {
        const statName = hs.name || hs.label;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const as = awayStats.find((s: any) => (s.name || s.label) === statName);
        const homeValStr = hs.displayValue || String(hs.value || "0");
        const awayValStr = as ? as.displayValue || String(as.value || "0") : "0";

        const numHome = parseFloat(homeValStr.replace("%", "")) || 0;
        const numAway = parseFloat(awayValStr.replace("%", "")) || 0;
        const total = numHome + numAway;

        let homePercent = 50;
        let awayPercent = 50;
        if (total > 0) {
          homePercent = Math.round((numHome / total) * 100);
          awayPercent = 100 - homePercent;
        }

        const label = statLabelMap[statName] || hs.label || statName;

        // Chỉ đưa vào các thống kê quan trọng
        if (
          statName.toLowerCase().includes("possession") ||
          statName.toLowerCase().includes("shot") ||
          statName.toLowerCase().includes("foul") ||
          statName.toLowerCase().includes("card") ||
          statName.toLowerCase().includes("corner") ||
          statName.toLowerCase().includes("save") ||
          statName.toLowerCase().includes("offside") ||
          statName.toLowerCase().includes("pass")
        ) {
          statistics.push({
            name: statName,
            label,
            homeValue: homeValStr,
            awayValue: awayValStr,
            homePercent,
            awayPercent,
          });
        }
      });

      const result: MatchSummaryData = {
        id: data.header?.id || eventId,
        leagueId: data.header?.league?.id || "soccer",
        leagueName: data.header?.league?.name || "Bóng đá",
        statusState: state,
        statusDetail: data.header?.status?.type?.detail || (isLive ? "Đang đá" : state === "post" ? "Hết giờ" : "Sắp đá"),
        clock: data.header?.status?.displayClock || "",
        isLive,
        isConfirmedLineup,
        venue: data.gameInfo?.venue?.fullName || comp.venue?.fullName,
        attendance: data.gameInfo?.attendance,
        homeTeam: {
          id: homeComp.team?.id || "home",
          name: homeComp.team?.displayName || homeComp.team?.name || "Đội nhà",
          shortName: homeComp.team?.shortDisplayName || homeComp.team?.abbreviation,
          logo: homeComp.team?.logo || homeComp.team?.logos?.[0]?.href,
          score: Number(homeComp.score || 0),
          formation: homeLineup.formation,
        },
        awayTeam: {
          id: awayComp.team?.id || "away",
          name: awayComp.team?.displayName || awayComp.team?.name || "Đội khách",
          shortName: awayComp.team?.shortDisplayName || awayComp.team?.abbreviation,
          logo: awayComp.team?.logo || awayComp.team?.logos?.[0]?.href,
          score: Number(awayComp.score || 0),
          formation: awayLineup.formation,
        },
        lineups: {
          home: homeLineup,
          away: awayLineup,
        },
        keyEvents,
        statistics,
      };

      matchSummaryMemoryCache.set(eventId, {
        data: result,
        expireAt: now + 15 * 1000, // 15s cache
      });

      return result;
    }
  } catch (error) {
    console.error(`Lỗi tải chi tiết trận đấu ${eventId}:`, error);
  }

  return null;
}

// 4. Search and Auto-Match Current Game across ESPN scoreboards
export interface MatchSearchResult {
  found: boolean;
  eventId?: string;
  matchName?: string;
  status?: string;
  leagueId?: string;
}

const matchSearchCache = new Map<string, { data: MatchSearchResult; expireAt: number }>();

export async function searchMatchByTeams(
  team1: string,
  team2: string,
  title?: string
): Promise<MatchSearchResult> {
  const cacheKey = `${team1}___${team2}___${title || ""}`.toLowerCase();
  const now = Date.now();
  if (matchSearchCache.has(cacheKey)) {
    const cached = matchSearchCache.get(cacheKey)!;
    if (cached.expireAt > now) {
      return cached.data;
    }
  }

  const normalize = (str: string) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, " ")
      .trim();

  const clean = (s: string) => {
    let t = normalize(s);
    t = t.replace(/\b(fc|clb|cf|sc|afc|club|ssc|the thao|u\d+)\b/g, "").replace(/\s+/g, " ").trim();
    return t;
  };

  const aliasMap: Record<string, string> = {
    "mu": "manchester united",
    "man utd": "manchester united",
    "mancity": "manchester city",
    "man city": "manchester city",
    "mc": "manchester city",
    "chelsea": "chelsea",
    "arsenal": "arsenal",
    "liverpool": "liverpool",
    "tottenham": "tottenham hotspur",
    "spurs": "tottenham hotspur",
    "barca": "barcelona",
    "barcelona": "barcelona",
    "real": "real madrid",
    "real madrid": "real madrid",
    "atletico": "atletico madrid",
    "bayern": "bayern munich",
    "dortmund": "borussia dortmund",
    "psg": "paris saint germain",
    "juve": "juventus",
    "juventus": "juventus",
    "inter": "inter milan",
    "ac milan": "ac milan",
    "roma": "as roma",
    "viettel": "the cong viettel",
    "the cong": "the cong viettel",
    "cahn": "cong an ha noi",
  };

  let q1 = clean(team1);
  let q2 = clean(team2);

  if (aliasMap[q1]) q1 = aliasMap[q1];
  if (aliasMap[q2]) q2 = aliasMap[q2];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEvents: any[] = [];
  try {
    const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard", {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.events) {
        allEvents.push(...data.events);
      }
    }
  } catch {}

  const matchTeam = (query: string, teamName: string) => {
    if (!query || !teamName) return false;
    const t = clean(teamName);
    if (t === query || t.includes(query) || query.includes(t)) return true;

    const qWords = query.split(" ").filter((w) => w.length >= 3);
    const tWords = t.split(" ").filter((w) => w.length >= 3);
    if (qWords.length > 0 && qWords.every((w) => t.includes(w))) return true;
    if (tWords.length > 0 && tWords.every((w) => query.includes(w))) return true;
    if (qWords.length > 1 && qWords.some((w) => tWords.includes(w))) return true;
    return false;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let found = allEvents.find((ev: any) => {
    const comp = ev.competitions?.[0];
    const h = comp?.competitors?.[0]?.team?.displayName || "";
    const a = comp?.competitors?.[1]?.team?.displayName || "";
    return (matchTeam(q1, h) && matchTeam(q2, a)) || (matchTeam(q2, h) && matchTeam(q1, a));
  });

  // If not found in today's global list, check major leagues
  if (!found) {
    const leagues = ["eng.1", "uefa.champions", "esp.1", "ita.1", "ger.1", "fra.1"];
    await Promise.all(
      leagues.map(async (l) => {
        try {
          const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l}/scoreboard`, {
            next: { revalidate: 60 },
            signal: AbortSignal.timeout(3500),
          });
          if (res.ok) {
            const data = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (data.events && !found) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const matchInLeague = data.events.find((ev: any) => {
                const comp = ev.competitions?.[0];
                const h = comp?.competitors?.[0]?.team?.displayName || "";
                const a = comp?.competitors?.[1]?.team?.displayName || "";
                return (matchTeam(q1, h) && matchTeam(q2, a)) || (matchTeam(q2, h) && matchTeam(q1, a));
              });
              if (matchInLeague) found = matchInLeague;
            }
          }
        } catch {}
      })
    );
  }

  const result: MatchSearchResult = found
    ? {
        found: true,
        eventId: found.id,
        matchName: found.name,
        status: found.status?.type?.detail,
      }
    : { found: false };

  matchSearchCache.set(cacheKey, {
    data: result,
    expireAt: now + (found ? 30 * 1000 : 15 * 1000),
  });

  return result;
}

