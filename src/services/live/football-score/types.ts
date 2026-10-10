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
