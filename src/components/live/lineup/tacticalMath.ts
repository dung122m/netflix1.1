import { MatchRosterPlayer } from "@/services/live/football-score/types";

export interface PositionedPlayer {
  player: MatchRosterPlayer;
  x: number; // Tọa độ X tính bằng % (0 - 100%)
  y: number; // Tọa độ Y tính bằng % (0 - 100%)
  roleAbbr: string;
  totalInLine?: number;
}

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
  if (p.includes("attacking midfielder left") || /\b(am-l|lam)\b/.test(p)) return "AM-L";
  if (p.includes("attacking midfielder right") || /\b(am-r|ram)\b/.test(p)) return "AM-R";
  if (p.includes("attacking midfielder") || /\b(am|cam)\b/.test(p)) return "AM";
  if (p.includes("center left midfielder") || /\b(cm-l|lcm)\b/.test(p)) return "CM-L";
  if (p.includes("center right midfielder") || /\b(cm-r|rcm)\b/.test(p)) return "CM-R";
  if (p.includes("left midfielder") || /\blm\b/.test(p)) return "LM";
  if (p.includes("right midfielder") || /\brm\b/.test(p)) return "RM";
  if (p.includes("center midfielder") || p.includes("centre midfielder") || p.includes("central midfielder") || /\bcm\b/.test(p)) return "CM";
  if (p.includes("midfielder") || /\b(mf|m)\b/.test(p)) return "MF";

  // Tiền đạo trung tâm / Tiền đạo cắm (ưu tiên kiểm tra trước tiền đạo cánh để tránh các biến thể Center Left/Right Forward bị khớp nhầm vào Left/Right Forward)
  if (
    p.includes("center left forward") ||
    p.includes("center right forward") ||
    p.includes("center forward") ||
    p.includes("striker") ||
    /\b(cf-l|cf-r|st-l|st-r|cf|st)\b/.test(p)
  ) {
    return "ST";
  }

  // Tiền đạo cánh
  if (p.includes("left wing") || p.includes("left winger") || /\blw\b/.test(p) || p.includes("left forward") || /\blf\b/.test(p)) return "LW";
  if (p.includes("right wing") || p.includes("right winger") || /\brw\b/.test(p) || p.includes("right forward") || /\brf\b/.test(p)) return "RW";

  if (p.includes("forward") || /\b(fw|f)\b/.test(p)) return "FW";
  return "PL";
}

/**
 * Suy luận điểm trục ngang dựa trên quy chuẩn vị trí formationPlace của ESPN/Bóng đá quốc tế
 * Khi dữ liệu position chỉ là nhãn chung (Defender, Midfielder)
 */
function getHorizontalScoreFromFormationPlace(fp: number): number {
  switch (fp) {
    case 3: // Left Back
    case 11: // Left Winger / Left Attacking Midfielder
      return -2;
    case 6: // Center Left Back
    case 4: // Left Pivot / LDM / LM
      return -1;
    case 1: // GK
    case 10: // CAM / Playmaker trung tâm
    case 9: // ST / Tiền đạo cắm
      return 0;
    case 5: // Center Right Back
    case 8: // Right Pivot / RDM / RM
      return 1;
    case 2: // Right Back
    case 7: // Right Winger / Right Attacking Midfielder
      return 2;
    default:
      return 0;
  }
}

/**
 * Suy luận điểm độ sâu trục dọc từ formationPlace khi position chỉ là nhãn chung
 */
function getDepthScoreFromFormationPlace(fp: number): number {
  switch (fp) {
    case 1:
      return 0; // GK
    case 2:
    case 3:
    case 5:
    case 6:
      return 1; // Hàng thủ
    case 4:
    case 8:
      return 2.2; // Double pivot / Tuyến tiền vệ phòng ngự
    case 7:
    case 10:
    case 11:
      return 3.2; // Tuyến tiền vệ tấn công / hộ công / 2 cánh
    case 9:
      return 4; // Tiền đạo cắm
    default:
      return 2.5;
  }
}

/**
 * Tính điểm vị trí theo chiều ngang (Left = âm, Center = 0, Right = dương)
 */
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

  // Fallback theo quy chuẩn formationPlace nếu tên vị trí chung chung
  if (p.formationPlace) {
    return getHorizontalScoreFromFormationPlace(p.formationPlace);
  }
  return 0;
}

/**
 * Tính điểm độ sâu vị trí theo trục dọc (Thủ môn: 0, Hậu vệ: 1, Tiền vệ: 2, Tiền đạo: 3-4)
 */
function getVerticalDepthScore(p: MatchRosterPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (pos.includes("goalkeeper") || /\b(g|gk)\b/.test(pos) || p.formationPlace === 1) return 0;
  if (pos.includes("defender") || pos.includes("back") || /\b(cb|df|d)\b/.test(pos)) return 1;

  // 1. Tiền đạo cánh / Tiền đạo lệch / Vệ tinh hỗ trợ (CF-L, CF-R, LF, RF, LW, RW, AM-L, AM-R)
  const isWingerOrSideForward =
    pos.includes("wing") ||
    /\b(lw|rw|lf|rf)\b/.test(pos) ||
    pos.includes("center left") ||
    pos.includes("center right") ||
    /\b(cf-l|cf-r|am-l|am-r|lam|ram)\b/.test(pos);

  if (isWingerOrSideForward) return 3.6;

  // 2. Tiền đạo trung tâm / cắm (ST, CF trung tâm, F, hoặc formationPlace === 9 chuẩn quốc tế)
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

  // 3. Tiền vệ tấn công / Hộ công (kiểm tra trước midfielder)
  if (pos.includes("attacking") || /\b(am|cam)\b/.test(pos)) return 3.2;

  // 4. Tiền vệ phòng ngự (kiểm tra trước midfielder)
  if (pos.includes("defensive") || /\b(dm|cdm)\b/.test(pos)) return 2.1;

  // 5. Tiền vệ cánh (LM, RM)
  if (pos.includes("left midfielder") || pos.includes("right midfielder") || /\b(lm|rm)\b/.test(pos)) return 2.8;

  // 6. Tiền vệ trung tâm hoặc chung
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

/**
 * Suy luận mã viết tắt vị trí thông minh từ ngữ cảnh tọa độ trên sân cỏ
 * khi API chỉ trả về nhãn chung chung (DF, MF, PL)
 */
export function inferContextualRole(
  baseRole: string,
  x: number,
  y: number,
  totalInLine: number
): string {
  // Nếu đã là mã vị trí đặc thù (LB, RB, CB, DM, AM, ST, LW, RW, GK, v.v.) thì giữ nguyên
  if (baseRole !== "DF" && baseRole !== "MF" && baseRole !== "FW" && baseRole !== "PL") {
    return baseRole;
  }

  // Tuyến Hậu vệ (y >= 65 hoặc baseRole là DF)
  if (baseRole === "DF" || (baseRole === "PL" && y >= 65)) {
    if (x <= 25) return "LB";
    if (x >= 75) return "RB";
    return totalInLine >= 4 ? (x < 50 ? "CB-L" : "CB-R") : "CB";
  }

  // Tuyến Tiền vệ (y từ 30 đến 65 hoặc baseRole là MF)
  if (baseRole === "MF" || (baseRole === "PL" && y >= 30 && y < 65)) {
    if (y > 45) {
      // Tuyến tiền vệ lùi sâu / Pivot phòng ngự
      if (x <= 36) return "DM";
      if (x >= 64) return "DM";
      return totalInLine === 1 ? "DM" : "CM";
    } else {
      // Tuyến tiền vệ tấn công / Hộ công
      if (x <= 28) return "LW";
      if (x >= 72) return "RW";
      return "AM";
    }
  }

  // Tuyến Tiền đạo dâng cao nhất (y < 30 hoặc baseRole là FW)
  if (baseRole === "FW" || y < 30) {
    if (x <= 28) return "LW";
    if (x >= 72) return "RW";
    return totalInLine === 1 ? "ST" : "FW";
  }

  return baseRole;
}

/**
 * Phân bổ tọa độ X đối xứng trên chiều rộng sân cho N cầu thủ trong 1 hàng ngang
 */
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

/**
 * Bố trí 11 cầu thủ lên sân cỏ dựa trên sơ đồ chiến thuật thực tế và vị trí thi đấu
 */
export function calculateTacticalCoordinates(
  starters: MatchRosterPlayer[],
  formation?: string
): PositionedPlayer[] {
  if (!starters || starters.length === 0) return [];

  // 1. Tách thủ môn (Goalkeeper)
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

  // Fallback 1: Tìm theo số áo 1, 13, 12 nếu không mang nhãn tiền đạo/tiền vệ
  if (gkIndex === -1) {
    gkIndex = starters.findIndex((p) => {
      const j = String(p.jersey || "").trim();
      const pos = (p.position || "").toLowerCase();
      const isAttacker = /forward|striker|winger|tiền đạo|midfielder|tiền vệ/i.test(pos);
      return (j === "1" || j === "13" || j === "12") && !isAttacker;
    });
  }

  // Fallback 2: Tìm cầu thủ tuyến thấp nhất (hậu vệ thấp nhất), tuyệt đối không chọn tiền đạo làm thủ môn
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

  // Vị trí thủ môn cố định ở cầu môn nhà (dưới đáy sân)
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

  // 2. Parse số cầu thủ từng tuyến từ formation (ví dụ "4-3-3" -> [4, 3, 3]; "4-2-3-1" -> [4, 2, 3, 1])
  const parsedLines = (formation || "")
    .split("-")
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);

  const isMatchingFormation =
    parsedLines.length >= 2 &&
    parsedLines.reduce((acc, n) => acc + n, 0) === outfielders.length;

  let linesOfPlayers: MatchRosterPlayer[][] = [];

  if (isMatchingFormation) {
    // Sắp xếp các cầu thủ tuyến ngoài theo độ sâu từ phòng ngự lên tấn công
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
    // Fallback nếu không có formation hoặc số lượng không chuẩn 10: nhóm theo 3 tuyến (Hậu vệ, Tiền vệ, Tiền đạo)
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

    // Trường hợp tất cả dồn vào 1 nhóm
    if (linesOfPlayers.length === 0) {
      linesOfPlayers = [outfielders];
    }
  }

  // 3. Tính toán tọa độ (X, Y) cho từng tuyến
  const lineCount = linesOfPlayers.length;

  // Tọa độ Y theo số tuyến:
  // Hậu vệ: ~72% (gần khung thành nhà)
  // Tiền đạo cao nhất: ~16% (gần khung thành đối phương)
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

    // Sắp xếp cầu thủ trong tuyến từ Trái sang Phải (Left Back -> Center -> Right Back)
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

/**
 * Trích xuất họ / tên thi đấu gọn gàng theo chuẩn FotMob / Sofascore
 * - Ưu tiên họ/tên thi đấu, loại bỏ tiền tố chữ cái đầu (ví dụ: "H. Çalhanoğlu" -> "Çalhanoğlu", "A. Diouf" -> "Diouf")
 * - Giữ nguyên tên đơn / biệt danh ("Rodri", "Pedri", "Alisson", "Casemiro", "Neymar Jr")
 * - Giữ nguyên họ ghép phổ biến ("van Dijk", "De Bruyne", "Alexander-Arnold")
 * - Tự động bổ sung chữ cái đầu nếu phát hiện 2 cầu thủ trong danh sách trùng họ
 */
export function getShortDisplayName(
  p: MatchRosterPlayer,
  allPlayers?: MatchRosterPlayer[]
): string {
  if (!p) return "";

  const extractSurname = (rawName: string): string => {
    const trimmed = (rawName || "").trim();
    if (!trimmed) return "";

    // 1. Kiểm tra tiền tố chữ cái tắt có dấu chấm: "H. Çalhanoğlu", "A. Diouf", "V. van Dijk"
    const dotInitialMatch = trimmed.match(/^[A-Za-zÀ-ỹĐđ]\.\s*(.+)$/);
    if (dotInitialMatch && dotInitialMatch[1]) {
      return dotInitialMatch[1].trim();
    }

    // 2. Tách theo khoảng trắng
    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) return parts[0] || trimmed;

    // 3. Xử lý các tiền tố họ ghép phổ biến (Dutch, Spanish, French, Italian, Portuguese)
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

    // 4. Mặc định lấy từ cuối cùng (họ)
    return parts[parts.length - 1];
  };

  const candidate = p.shortName || p.displayName || p.name || "";
  const surname = extractSurname(candidate) || extractSurname(p.displayName || "") || candidate;

  // Nếu có danh sách toàn đội, kiểm tra xem có bị trùng họ với cầu thủ khác không
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

