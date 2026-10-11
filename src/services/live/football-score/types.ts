export interface LiveScoreboardEvent {
  id: string;
  leagueSlug: string;
  name: string;
  shortName?: string;
  date: string;
  homeTeam: {
    id: string;
    name: string;
    displayName: string;
    shortDisplayName?: string;
    abbreviation?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    displayName: string;
    shortDisplayName?: string;
    abbreviation?: string;
  };
  homeScore: number;
  awayScore: number;
  status: "live" | "finished" | "scheduled";
  statusText: string;
  statusDetail?: string;
  displayClock?: string;
  period?: number;
}

export interface LiveMatchScore {
  eventId: string;
  leagueSlug: string;
  team1Score: number;
  team2Score: number;
  homeScore: number;
  awayScore: number;
  isReversed: boolean;
  status: "live" | "finished" | "scheduled";
  statusDetail?: string;
  displayClock?: string;
  period?: number;
  updatedAt: string;
  cached?: boolean;
}

export interface ScoreboardCache {
  events: LiveScoreboardEvent[];
  expireAt: number;
  staleUntil: number;
  updatedAt: string;
}

export interface MatchSummaryTeam {
  id: string;
  name: string;
  displayName: string;
  score?: number;
  homeAway: "home" | "away";
  logo?: string;
  formation?: string;
  abbreviation?: string;
  winner?: boolean;
  form?: string;
}

export interface MatchStatItem {
  name: string;
  label: string;
  homeValue: string;
  awayValue: string;
  homeNumeric?: number;
  awayNumeric?: number;
}

export interface MatchKeyEvent {
  id: string;
  type: "goal" | "yellow-card" | "red-card" | "substitution" | "other";
  typeText: string;
  text: string;
  clock: string;
  minute: number;
  period?: number;
  teamId?: string;
  homeAway?: "home" | "away";
  playerName?: string;
  subInPlayer?: string;
  subOutPlayer?: string;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

export interface MatchRosterPlayer {
  id: string;
  name: string;
  displayName: string;
  shortName?: string;
  jersey: string;
  position: string;
  starter: boolean;
  formationPlace?: number;
  subbedIn?: boolean;
  subbedOut?: boolean;
  subClock?: string;
}

export interface MatchCommentaryItem {
  sequence: number;
  time: string;
  text: string;
}

export interface MatchGameInfo {
  venue?: {
    name: string;
    city?: string;
    country?: string;
  };
  attendance?: number;
  referee?: string;
}

export interface NormalizedMatchSummary {
  eventId: string;
  leagueSlug: string;
  status: "live" | "finished" | "scheduled";
  statusText: string;
  displayClock?: string;
  homeTeam: MatchSummaryTeam;
  awayTeam: MatchSummaryTeam;
  stats: MatchStatItem[];
  events: MatchKeyEvent[];
  homeRoster: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  };
  awayRoster: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  };
  gameInfo: MatchGameInfo;
  commentary: MatchCommentaryItem[];
  updatedAt: string;
}

export interface StandingEntry {
  rank: number;
  team: {
    id: string;
    name: string;
    displayName: string;
    shortDisplayName?: string;
    abbreviation?: string;
    logo?: string;
  };
  gamesPlayed: number;
  wins: number;
  ties: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  points: number;
  note?: {
    color?: string;
    description?: string;
    rank?: number;
  };
}

export interface StandingGroup {
  name: string;
  entries: StandingEntry[];
}

export interface NormalizedLeagueStandings {
  leagueSlug: string;
  leagueName: string;
  season: number;
  groups: StandingGroup[];
  updatedAt: string;
}

export interface StandingsApiResponse {
  status: boolean;
  data?: NormalizedLeagueStandings | null;
  isCupOrNoStandings?: boolean;
  message?: string;
  error?: string;
  cached?: boolean;
}

// ---------------------------------------------------------------------------
// P4: Lịch thi đấu & Kết quả bóng đá (Fixtures & Results)
// ---------------------------------------------------------------------------

export interface FixtureCompetitor {
  id: string;
  name: string;
  displayName: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
  homeAway: "home" | "away";
  score?: number;
  winner?: boolean;
  shootout?: boolean;
}

export type FixtureStatus = "scheduled" | "live" | "finished" | "postponed" | "canceled";

export interface NormalizedFixtureItem {
  id: string;
  name: string;
  shortName?: string;
  date: string; // ISO 8601 UTC
  kickoffTimeUtc7: string; // HH:mm (Asia/Ho_Chi_Minh)
  kickoffDateUtc7: string; // YYYY-MM-DD (Asia/Ho_Chi_Minh)
  formattedDateUtc7: string; // "Thứ X, DD/MM/YYYY" (Asia/Ho_Chi_Minh)
  status: FixtureStatus;
  statusText: string;
  displayClock?: string;
  homeTeam: FixtureCompetitor;
  awayTeam: FixtureCompetitor;
  venue?: string;
}

export interface NormalizedLeagueFixtures {
  leagueSlug: string;
  leagueName: string;
  seasonYear?: number;
  count: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  events: NormalizedFixtureItem[];
  availableDates: string[]; // Danh sách các ngày kickoffDateUtc7 duy nhất đã sort
  updatedAt: string;
}

export interface FixturesApiResponse {
  status: boolean;
  data?: NormalizedLeagueFixtures | null;
  message?: string;
  error?: string;
  cached?: boolean;
}

