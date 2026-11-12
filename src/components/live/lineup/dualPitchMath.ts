import { MatchKeyEvent, MatchRosterPlayer } from "@/services/live/football-score/types";
import { calculateTacticalCoordinates } from "./tacticalMath";

export interface TeamInfo {
  id: string;
  name: string;
  displayName: string;
  logo?: string;
  formation?: string;
  coach?: string;
}

export interface DualPlayerEventSummary {
  goals: number;
  goalMinutes: string[];
  yellowCards: number;
  redCards: number;
  subClock?: string;
}

export interface PositionedDualPlayer {
  player: MatchRosterPlayer;
  x: number; // Tọa độ X trên sân ngang (0 - 100%)
  y: number; // Tọa độ Y trên sân ngang (0 - 100%)
  roleAbbr: string;
  isHome: boolean;
  goals: number;
  goalMinutes: string[];
  yellowCards: number;
  redCards: number;
  isSubbedOut: boolean;
  isSubbedIn: boolean;
  subClock?: string;
}

export function buildPlayerEventsMap(
  events: MatchKeyEvent[]
): Map<string, DualPlayerEventSummary> {
  const map = new Map<string, DualPlayerEventSummary>();

  events.forEach((ev) => {
    if (!ev) return;
    const name = (ev.playerName || "").trim().toLowerCase();
    if (!name) return;

    const current = map.get(name) || {
      goals: 0,
      goalMinutes: [],
      yellowCards: 0,
      redCards: 0,
      subClock: undefined,
    };

    if (ev.type === "goal" && !ev.isOwnGoal) {
      current.goals += 1;
      if (ev.clock) current.goalMinutes.push(ev.clock);
    } else if (ev.type === "yellow-card") {
      current.yellowCards += 1;
    } else if (ev.type === "red-card") {
      current.redCards += 1;
    } else if (ev.type === "substitution") {
      current.subClock = ev.clock;
    }
    map.set(name, current);
  });

  return map;
}

export function getPlayerEventBadges(
  player: MatchRosterPlayer,
  playerEventsMap: Map<string, DualPlayerEventSummary>
): DualPlayerEventSummary {
  const nameKey = (player.displayName || player.name || "").trim().toLowerCase();
  const shortKey = (player.shortName || "").trim().toLowerCase();
  return (
    playerEventsMap.get(nameKey) ||
    playerEventsMap.get(shortKey) || {
      goals: 0,
      goalMinutes: [],
      yellowCards: 0,
      redCards: 0,
      subClock: player.subClock,
    }
  );
}

/**
 * Chuyển đổi tọa độ chiến thuật dọc sang tọa độ sân cỏ nằm ngang cho 2 đội
 * (Đội nhà nửa sân trái, đội khách nửa sân phải đảo cánh đối xứng theo truyền hình).
 */
export function calculateDualPitchPlayers({
  homeTeam,
  awayTeam,
  homeStarters,
  awayStarters,
  playerEventsMap,
}: {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeStarters: MatchRosterPlayer[];
  awayStarters: MatchRosterPlayer[];
  playerEventsMap: Map<string, DualPlayerEventSummary>;
}): PositionedDualPlayer[] {
  const list: PositionedDualPlayer[] = [];

  const appendTeamPlayers = (
    starters: MatchRosterPlayer[],
    formation: string | undefined,
    isHome: boolean
  ) => {
    if (starters.length === 0) return;
    const coords = calculateTacticalCoordinates(starters, formation);

    coords.forEach(({ player, x, y, roleAbbr }) => {
      const isGK =
        roleAbbr === "GK" ||
        Boolean(player.position && /goalkeeper|gk|thủ môn|thủ thành/i.test(player.position)) ||
        player.formationPlace === 1;

      let pitchX: number;
      let pitchY: number;

      if (isGK) {
        pitchX = isHome ? 7.5 : 92.5;
        pitchY = 50;
      } else {
        // Đảo cánh đối xứng cho đội khách theo góc nhìn truyền hình
        pitchY = isHome ? 16 + (x / 100) * 68 : 16 + ((100 - x) / 100) * 68;
        const normDepth = Math.max(16, Math.min(74, y));
        pitchX = isHome
          ? 43.5 - ((normDepth - 16) / 58) * 25.5
          : 56.5 + ((normDepth - 16) / 58) * 25.5;
      }

      const eventsInfo = getPlayerEventBadges(player, playerEventsMap);

      list.push({
        player,
        x: pitchX,
        y: pitchY,
        roleAbbr,
        isHome,
        goals: eventsInfo.goals,
        goalMinutes: eventsInfo.goalMinutes,
        yellowCards: eventsInfo.yellowCards,
        redCards: eventsInfo.redCards,
        isSubbedOut: Boolean(player.subbedOut),
        isSubbedIn: Boolean(player.subbedIn),
        subClock: player.subClock || eventsInfo.subClock,
      });
    });
  };

  appendTeamPlayers(homeStarters, homeTeam.formation, true);
  appendTeamPlayers(awayStarters, awayTeam.formation, false);

  return list;
}

