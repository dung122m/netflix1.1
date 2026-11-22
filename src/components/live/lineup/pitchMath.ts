import { MatchKeyEvent, MatchRosterPlayer } from "@/services/live/football-score/types";

// ============================================================================
// 1. DATA TYPES & INTERFACES
// ============================================================================

export interface PositionedPlayer {
  player: MatchRosterPlayer;
  x: number; // Tọa độ X tính bằng % (0 - 100%)
  y: number; // Tọa độ Y tính bằng % (0 - 100%)
  roleAbbr: string;
  totalInLine?: number;
}

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

// ============================================================================
// 2. DỊCH THUẬT VỊ TRÍ & CHỈ SỐ THI ĐẤU
// ============================================================================

/**
 * Dịch vị trí thi đấu bóng đá sang Tiếng Việt chuẩn xác
 */
export function translatePosition(pos?: string): string {
  if (!pos) return "Cầu thủ";
  const p = pos.trim().toLowerCase();

  // Thủ môn
  if (/\b(goalkeeper|gk|g)\b/.test(p)) return "Thủ môn";

  // Hậu vệ
  if (p.includes("center left defender") || /\bcd-l|cb-l\b/.test(p)) return "Trung vệ lệch trái";
  if (p.includes("center right defender") || /\bcd-r|cb-r\b/.test(p)) return "Trung vệ lệch phải";
  if (p.includes("center defender") || p.includes("centre-back") || p.includes("centre back") || /\bcb\b/.test(p)) return "Trung vệ";
  if (p.includes("left wing back") || /\blwb\b/.test(p)) return "Hậu vệ biên trái";
  if (p.includes("right wing back") || /\brwb\b/.test(p)) return "Hậu vệ biên phải";
  if (p.includes("left back") || /\blb\b/.test(p)) return "Hậu vệ cánh trái";
  if (p.includes("right back") || /\brb\b/.test(p)) return "Hậu vệ cánh phải";
  if (p.includes("wing back") || /\bwb\b/.test(p)) return "Hậu vệ biên";
  if (p.includes("defender") || /\bd\b/.test(p)) return "Hậu vệ";

  // Tiền vệ
  if (p.includes("defensive midfielder") || /\b(dm|cdm)\b/.test(p)) return "Tiền vệ phòng ngự";
  if (p.includes("attacking midfielder left") || /\bam-l|lam\b/.test(p)) return "Tiền vệ tấn công lệch trái";
  if (p.includes("attacking midfielder right") || /\bam-r|ram\b/.test(p)) return "Tiền vệ tấn công lệch phải";
  if (p.includes("attacking midfielder") || /\b(am|cam)\b/.test(p)) return "Tiền vệ tấn công";
  if (p.includes("center left midfielder") || /\b(cm-l|lcm)\b/.test(p)) return "Tiền vệ lệch trái";
  if (p.includes("center right midfielder") || /\b(cm-r|rcm)\b/.test(p)) return "Tiền vệ lệch phải";
  if (p.includes("left midfielder") || /\blm\b/.test(p)) return "Tiền vệ cánh trái";
  if (p.includes("right midfielder") || /\brm\b/.test(p)) return "Tiền vệ cánh phải";
  if (p.includes("center midfielder") || p.includes("centre midfielder") || p.includes("central midfielder") || /\bcm\b/.test(p)) return "Tiền vệ trung tâm";
  if (p.includes("midfielder") || /\bm\b/.test(p)) return "Tiền vệ";

  // Tiền đạo
  if (p.includes("second striker") || /\bss\b/.test(p)) return "Hộ công";
  if (p.includes("center left forward") || /\b(cf-l|st-l)\b/.test(p)) return "Tiền đạo trung tâm";
  if (p.includes("center right forward") || /\b(cf-r|st-r)\b/.test(p)) return "Tiền đạo trung tâm";
  if (p.includes("center forward") || /\bcf\b/.test(p)) return "Tiền đạo trung tâm";
  if (p.includes("striker") || /\bst\b/.test(p)) return "Tiền đạo cắm";
  if (p.includes("left wing") || p.includes("left winger") || /\blw\b/.test(p)) return "Tiền đạo cánh trái";
  if (p.includes("right wing") || p.includes("right winger") || /\brw\b/.test(p)) return "Tiền đạo cánh phải";
  if (p.includes("left forward") || /\blf\b/.test(p)) return "Tiền đạo cánh trái";
  if (p.includes("right forward") || /\brf\b/.test(p)) return "Tiền đạo cánh phải";
  if (p.includes("forward") || /\bfw|f\b/.test(p)) return "Tiền đạo";

  return pos;
}

/**
 * Dịch nhãn thống kê thi đấu của cầu thủ sang Tiếng Việt
 */
export function translateStatName(name?: string): string {
  if (!name) return "";
  const key = name.trim().toLowerCase();

  const statDict: Record<string, string> = {
    appearances: "Số trận ra sân",
    "fouls committed": "Phạm lỗi",
    "fouls suffered": "Bị phạm lỗi",
    "own goals": "Phản lưới nhà",
    "red cards": "Thẻ đỏ",
    "substitute appearances": "Vào sân dự bị",
    "yellow cards": "Thẻ vàng",
    "goals against": "Bàn thua",
    "shots faced": "Cú sút phải đối mặt",
    assists: "Kiến tạo",
    offsides: "Việt vị",
    "shots on goal": "Sút trúng đích",
    "shots on target": "Sút trúng đích",
    "total goals": "Bàn thắng",
    goals: "Bàn thắng",
    shots: "Tổng cú sút",
    "total shots": "Tổng cú sút",
    passes: "Đường chuyền",
    "total passes": "Đường chuyền",
    "pass accuracy": "Chính xác đường chuyền",
    "passing accuracy": "Chính xác đường chuyền",
    tackles: "Tranh chấp / Tắc bóng",
    interceptions: "Cắt bóng",
    clearances: "Phá bóng",
    saves: "Cứu thua",
    "minutes played": "Số phút thi đấu",
    "key passes": "Đường chuyền quyết định",
    dribbles: "Rê bóng",
    "aerial duels won": "Không chiến thành công",
    crosses: "Tạt bóng",
    touches: "Chạm bóng",
    corners: "Phạt góc",
  };

  return statDict[key] || name;
}

// ============================================================================
// 3. TOÁN HỌC TỌA ĐỘ VỊ TRÍ CHIẾN THUẬT (TACTICAL COORDINATES)
// ============================================================================

/**
 * Rút gọn tên vị trí thành mã viết tắt 2-3 ký tự dễ đọc trên sân
 */
export function getPositionAbbreviation(pos: string): string {
  const p = (pos || "").trim().toLowerCase();
  if (/\b(goalkeeper|gk|g)\b/.test(p)) return "GK";
  if (p.includes("center left defender") || /\b(cd-l|cb-l)\b/.test(p)) return "CB-L";
  if (p.includes("center right defender") || /\b(cd-r|cb-r)\b/.test(p)) return "CB-R";
  if (p.includes("center defender") || p.includes("centre-back") || /\bcb\b/.test(p)) return "CB";
  if (p.includes("left back") || /\blb\b/.test(p)) return "LB";
  if (p.includes("right back") || /\brb\b/.test(p)) return "RB";
  if (p.includes("wing back") || /\bwb\b/.test(p)) return "WB";
  if (p.includes("defender") || /\b(df|d)\b/.test(p)) return "DF";

  if (p.includes("defensive midfielder") || /\b(dm|cdm)\b/.test(p)) return "DM";
  if (p.includes("attacking midfielder left") || /\bam-l|lam\b/.test(p)) return "AM-L";
  if (p.includes("attacking midfielder right") || /\bam-r|ram\b/.test(p)) return "AM-R";
  if (p.includes("attacking midfielder") || /\b(am|cam)\b/.test(p)) return "AM";
  if (p.includes("center left midfielder") || /\b(cm-l|lcm)\b/.test(p)) return "CM-L";
  if (p.includes("center right midfielder") || /\b(cm-r|rcm)\b/.test(p)) return "CM-R";
  if (p.includes("left midfielder") || /\blm\b/.test(p)) return "LM";
  if (p.includes("right midfielder") || /\brm\b/.test(p)) return "RM";
  if (p.includes("center midfielder") || p.includes("centre midfielder") || p.includes("central midfielder") || /\bcm\b/.test(p)) return "CM";
  if (p.includes("midfielder") || /\b(mf|m)\b/.test(p)) return "MF";

  if (
    p.includes("center left forward") ||
    p.includes("center right forward") ||
    p.includes("center forward") ||
    p.includes("striker") ||
    /\b(cf-l|cf-r|st-l|st-r|cf|st)\b/.test(p)
  ) {
    return "ST";
  }

  if (p.includes("left wing") || p.includes("left winger") || /\blw\b/.test(p) || p.includes("left forward") || /\blf\b/.test(p)) return "LW";
  if (p.includes("right wing") || p.includes("right winger") || /\brw\b/.test(p) || p.includes("right forward") || /\brf\b/.test(p)) return "RW";

  if (p.includes("forward") || /\b(fw|f)\b/.test(p)) return "FW";
  return "PL";
}

function getHorizontalScoreFromFormationPlace(fp: number): number {
  switch (fp) {
    case 3:
    case 11:
      return -2;
    case 6:
    case 4:
      return -1;
    case 1:
    case 10:
    case 9:
      return 0;
    case 5:
    case 8:
      return 1;
    case 2:
    case 7:
      return 2;
    default:
      return 0;
  }
}

function getDepthScoreFromFormationPlace(fp: number): number {
  switch (fp) {
    case 1:
      return 0;
    case 2:
    case 3:
    case 5:
    case 6:
      return 1;
    case 4:
    case 8:
      return 2.2;
    case 7:
    case 10:
    case 11:
      return 3.2;
    case 9:
      return 4;
    default:
      return 2.5;
  }
}

function getHorizontalScore(p: MatchRosterPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (
    pos.includes("left") ||
    /\b(lb|lm|lw|lf|cd-l|cb-l|am-l|lam)\b/.test(pos)
  ) {
    return pos.includes("center left") || pos.includes("cd-l") || pos.includes("cb-l") ? -1 : -2;
  }
  if (
    pos.includes("right") ||
    /\b(rb|rm|rw|rf|cd-r|cb-r|am-r|ram)\b/.test(pos)
  ) {
    return pos.includes("center right") || pos.includes("cd-r") || pos.includes("cb-r") ? 1 : 2;
  }
  if (pos.includes("center") || /\b(cb|cm|am|cf|st)\b/.test(pos)) {
    return 0;
  }

  if (p.formationPlace) {
    return getHorizontalScoreFromFormationPlace(p.formationPlace);
  }
  return 0;
}

function getVerticalDepthScore(p: MatchRosterPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (pos.includes("goalkeeper") || /\b(g|gk)\b/.test(pos) || p.formationPlace === 1) return 0;
  if (pos.includes("defender") || pos.includes("back") || /\b(cb|df|d)\b/.test(pos)) return 1;

  const isWingerOrSideForward =
    pos.includes("wing") ||
    /\b(lw|rw|lf|rf)\b/.test(pos) ||
    pos.includes("center left") ||
    pos.includes("center right") ||
    /\b(cf-l|cf-r|am-l|am-r|lam|ram)\b/.test(pos);

  if (isWingerOrSideForward) return 3.6;

  if (
    p.formationPlace === 9 ||
    pos.includes("striker") ||
    pos.includes("center forward") ||
    /\b(st|cf)\b/.test(pos) ||
    pos.includes("forward") ||
    /\b(fw|f)\b/.test(pos)
  ) {
    return 4.2;
  }

  if (pos.includes("attacking") || /\b(am|cam)\b/.test(pos)) return 3.2;
  if (pos.includes("defensive") || /\b(dm|cdm)\b/.test(pos)) return 2.1;
  if (pos.includes("left midfielder") || pos.includes("right midfielder") || /\b(lm|rm)\b/.test(pos)) return 2.8;

  if (pos.includes("midfielder") || /\b(cm|mf|m)\b/.test(pos)) {
    if (p.formationPlace) {
      return getDepthScoreFromFormationPlace(p.formationPlace);
    }
    return 2.5;
  }

  if (p.formationPlace) {
    return getDepthScoreFromFormationPlace(p.formationPlace);
  }
  return 2.5;
}

export function inferContextualRole(
  baseRole: string,
  x: number,
  y: number,
  totalInLine: number
): string {
  if (baseRole !== "DF" && baseRole !== "MF" && baseRole !== "FW" && baseRole !== "PL") {
    return baseRole;
  }

  if (baseRole === "DF" || (baseRole === "PL" && y >= 65)) {
    if (x <= 25) return "LB";
    if (x >= 75) return "RB";
    return totalInLine >= 4 ? (x < 50 ? "CB-L" : "CB-R") : "CB";
  }

  if (baseRole === "MF" || (baseRole === "PL" && y >= 30 && y < 65)) {
    if (y > 45) {
      if (x <= 36) return "DM";
      if (x >= 64) return "DM";
      return totalInLine === 1 ? "DM" : "CM";
    } else {
      if (x <= 28) return "LW";
      if (x >= 72) return "RW";
      return "AM";
    }
  }

  if (baseRole === "FW" || y < 30) {
    if (x <= 28) return "LW";
    if (x >= 72) return "RW";
    return totalInLine === 1 ? "ST" : "FW";
  }

  return baseRole;
}

function getLineXCoordinates(count: number): number[] {
  if (count <= 1) return [50];
  if (count === 2) return [34, 66];
  if (count === 3) return [22, 50, 78];
  if (count === 4) return [16, 38, 62, 84];
  if (count === 5) return [13, 31, 50, 69, 87];
  const margin = 12;
  const span = 100 - margin * 2;
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(margin + i * step));
}

export function calculateTacticalCoordinates(
  starters: MatchRosterPlayer[],
  formation?: string
): PositionedPlayer[] {
  if (!starters || starters.length === 0) return [];

  let gkIndex = starters.findIndex((p) => {
    const pos = (p.position || "").toLowerCase();
    return (
      pos.includes("goalkeeper") ||
      pos === "gk" ||
      pos === "g" ||
      pos.includes("thủ môn") ||
      p.formationPlace === 1
    );
  });

  if (gkIndex === -1) {
    gkIndex = starters.findIndex((p) => {
      const j = String(p.jersey || "").trim();
      const pos = (p.position || "").toLowerCase();
      const isAttacker = /forward|striker|winger|tiền đạo|midfielder|tiền vệ/i.test(pos);
      return (j === "1" || j === "13" || j === "12") && !isAttacker;
    });
  }

  if (gkIndex === -1) {
    let minDepth = 999;
    let bestIdx = 0;
    starters.forEach((p, idx) => {
      const depth = getVerticalDepthScore(p);
      if (depth < minDepth) {
        minDepth = depth;
        bestIdx = idx;
      }
    });
    gkIndex = bestIdx;
  }

  const gk = starters[gkIndex];
  const outfielders = starters.filter((_, idx) => idx !== gkIndex);
  const positioned: PositionedPlayer[] = [];

  if (gk) {
    positioned.push({
      player: gk,
      x: 50,
      y: 89,
      roleAbbr: getPositionAbbreviation(gk.position),
      totalInLine: 1,
    });
  }

  if (outfielders.length === 0) return positioned;

  const parsedLines = (formation || "")
    .split("-")
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  const isMatchingFormation =
    parsedLines.length >= 2 &&
    parsedLines.reduce((acc, n) => acc + n, 0) === outfielders.length;

  let linesOfPlayers: MatchRosterPlayer[][] = [];

  if (isMatchingFormation) {
    const sortedOutfielders = [...outfielders].sort((a, b) => {
      const depthDiff = getVerticalDepthScore(a) - getVerticalDepthScore(b);
      if (depthDiff !== 0) return depthDiff;
      if (a.formationPlace && b.formationPlace) return a.formationPlace - b.formationPlace;
      return 0;
    });

    let cursor = 0;
    for (const count of parsedLines) {
      const line = sortedOutfielders.slice(cursor, cursor + count);
      linesOfPlayers.push(line);
      cursor += count;
    }
  } else {
    const defs: MatchRosterPlayer[] = [];
    const mids: MatchRosterPlayer[] = [];
    const fwds: MatchRosterPlayer[] = [];

    for (const p of outfielders) {
      const depth = getVerticalDepthScore(p);
      if (depth <= 1.5) defs.push(p);
      else if (depth <= 3.2) mids.push(p);
      else fwds.push(p);
    }

    if (defs.length > 0) linesOfPlayers.push(defs);
    if (mids.length > 0) linesOfPlayers.push(mids);
    if (fwds.length > 0) linesOfPlayers.push(fwds);

    if (linesOfPlayers.length === 0) {
      linesOfPlayers = [outfielders];
    }
  }

  const lineCount = linesOfPlayers.length;

  const getYCoordinate = (lineIndex: number, total: number) => {
    if (total <= 1) return 46;
    if (total === 2) return [66, 26][lineIndex];
    if (total === 3) return [70, 44, 18][lineIndex];
    if (total === 4) return [72, 54, 34, 16][lineIndex];
    if (total === 5) return [74, 59, 45, 31, 16][lineIndex];
    const topY = 16;
    const bottomY = 74;
    return Math.round(bottomY - (lineIndex / (total - 1)) * (bottomY - topY));
  };

  linesOfPlayers.forEach((line, lineIdx) => {
    const y = getYCoordinate(lineIdx, lineCount);

    const sortedLine = [...line].sort((a, b) => {
      const hA = getHorizontalScore(a);
      const hB = getHorizontalScore(b);
      if (hA !== hB) return hA - hB;
      if (a.formationPlace && b.formationPlace) return a.formationPlace - b.formationPlace;
      return 0;
    });

    const xCoords = getLineXCoordinates(sortedLine.length);

    sortedLine.forEach((player, playerIdx) => {
      const x = xCoords[playerIdx];
      const baseRole = getPositionAbbreviation(player.position);
      const roleAbbr = inferContextualRole(baseRole, x, y, sortedLine.length);

      positioned.push({
        player,
        x,
        y,
        roleAbbr,
        totalInLine: sortedLine.length,
      });
    });
  });

  return positioned;
}

export function getShortDisplayName(
  p: MatchRosterPlayer,
  allPlayers?: MatchRosterPlayer[]
): string {
  if (!p) return "";

  const extractSurname = (rawName: string): string => {
    const trimmed = (rawName || "").trim();
    if (!trimmed) return "";

    const dotInitialMatch = trimmed.match(/^[A-Za-zÀ-ỹĐđ]\.\s*(.+)$/);
    if (dotInitialMatch && dotInitialMatch[1]) {
      return dotInitialMatch[1].trim();
    }

    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) return parts[0] || trimmed;

    if (parts.length >= 2) {
      const secondLast = parts[parts.length - 2].toLowerCase();
      const compoundPrefixes = new Set([
        "van",
        "de",
        "der",
        "den",
        "von",
        "di",
        "da",
        "dos",
        "das",
        "del",
        "della",
        "la",
        "le",
        "al",
        "el",
      ]);
      if (compoundPrefixes.has(secondLast)) {
        return `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
      }
    }

    return parts[parts.length - 1];
  };

  const candidate = p.shortName || p.displayName || p.name || "";
  const surname = extractSurname(candidate) || extractSurname(p.displayName || "") || candidate;

  if (allPlayers && allPlayers.length > 1) {
    const duplicateCount = allPlayers.filter((other) => {
      if (other.id === p.id) return false;
      const otherCandidate = other.shortName || other.displayName || other.name || "";
      const otherSurname = extractSurname(otherCandidate) || extractSurname(other.displayName || "");
      return otherSurname.toLowerCase() === surname.toLowerCase();
    }).length;

    if (duplicateCount > 0) {
      if (p.shortName && /^[A-Za-zÀ-ỹĐđ]\.\s*/.test(p.shortName)) {
        return p.shortName;
      }
      const initial = (p.displayName || p.name || "").trim().charAt(0).toUpperCase();
      return initial ? `${initial}. ${surname}` : surname;
    }
  }

  return surname;
}

// ============================================================================
// 4. TOÁN HỌC SÂN NẰM NGANG 2 ĐỘI (DUAL PITCH COORDINATES)
// ============================================================================

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
