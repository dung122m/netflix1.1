"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Shield,
  Users,
  X,
  Shirt,
  ArrowUpRight,
  ArrowDownLeft,
  LayoutGrid,
  Trophy,
  Calendar,
  Globe,
  Ruler,
  MapPin,
  CircleDot,
} from "lucide-react";
import { MatchRosterPlayer, AthleteProfile } from "@/services/live/football-score/types";

export interface TacticalLineupProps {
  homeTeam: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
  };
  homeRoster?: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  } | null;
  awayRoster?: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  } | null;
  matchStatus?: "live" | "finished" | "scheduled" | string;
}

interface PositionedPlayer {
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

/**
 * Tính điểm vị trí theo chiều ngang (Left = âm, Center = 0, Right = dương)
 */
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
  if (pos.includes("goalkeeper") || /\b(g|gk)\b/.test(pos)) return 0;
  if (pos.includes("defender") || pos.includes("back") || /\b(cb|df|d)\b/.test(pos)) return 1;

  // Tiền đạo trung tâm / cắm
  if (pos.includes("striker") || pos.includes("center forward") || /\b(st|cf)\b/.test(pos)) return 4;
  // Tiền đạo cánh / Chạy cánh dâng cao
  if (pos.includes("wing") || /\b(lw|rw|lf|rf)\b/.test(pos)) return 3.6;
  // Tiền đạo chung
  if (pos.includes("forward") || /\b(fw|f)\b/.test(pos)) return 3.8;

  // Tiền vệ tấn công / Hộ công (kiểm tra trước midfielder)
  if (pos.includes("attacking") || /\b(am|cam|lam|ram|am-l|am-r)\b/.test(pos)) return 3.2;

  // Tiền vệ phòng ngự (kiểm tra trước midfielder)
  if (pos.includes("defensive") || /\b(dm|cdm)\b/.test(pos)) return 2.1;

  // Tiền vệ cánh (LM, RM)
  if (pos.includes("left midfielder") || pos.includes("right midfielder") || /\b(lm|rm)\b/.test(pos)) return 2.8;

  // Tiền vệ trung tâm hoặc chung
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
  const gkIndex = starters.findIndex((p) => {
    const pos = (p.position || "").toLowerCase();
    return pos.includes("goalkeeper") || pos === "g" || pos === "gk" || p.formationPlace === 1;
  });

  const gk = gkIndex !== -1 ? starters[gkIndex] : starters[0];
  const outfielders = starters.filter((_, idx) => idx !== (gkIndex !== -1 ? gkIndex : 0));

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

export type TokenDisplayMode = "jersey" | "badge" | "photo";

/**
 * Áo đấu tối giản hiện đại (Minimalist Kit Node) phong cách Sofascore / FotMob
 */
export function VectorJerseyToken({
  number,
  roleAbbr,
  isHome,
  isGK,
}: {
  number?: string;
  roleAbbr: string;
  isHome: boolean;
  isGK: boolean;
}) {
  const rawNum = number && number.trim() ? number.trim() : "";
  const displayNumber = rawNum || roleAbbr;
  const fillColor = isGK ? "#eab308" : isHome ? "#dc2626" : "#0284c7";
  const textColor = isGK ? "#09090b" : "#ffffff";

  return (
    <div className="relative w-[26px] h-[26px] min-[360px]:w-[28px] min-[360px]:h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center select-none">
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 5 L13 8 C14 8.8 18 8.8 19 8 L23 5 L29 9 L26.5 14 L23.5 12.5 V27 C23.5 28 22.5 28.5 21.5 28.5 H10.5 C9.5 28.5 8.5 28 8.5 27 V12.5 L5.5 14 L3 9 L9 5 Z"
          fill={fillColor}
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M13 8 C14 9.5 18 9.5 19 8"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <text
          x="16"
          y="21.5"
          textAnchor="middle"
          fill={textColor}
          fontSize="10.5"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          {displayNumber}
        </text>
      </svg>
    </div>
  );
}

/**
 * Huy hiệu số áo tròn phong cách Sofascore / FotMob hiện đại
 * Thiết kế Flat Matte tinh gọn, viền trắng mảnh 1.5px, số áo sans-serif sắc nét, không bóng kính Web 2.0
 */
export function CircularBadgeToken({
  number,
  roleAbbr,
  isHome,
  isGK,
}: {
  number?: string;
  roleAbbr: string;
  isHome: boolean;
  isGK: boolean;
}) {
  const rawNum = number && number.trim() ? number.trim() : "";
  const displayNumber = rawNum || roleAbbr;

  return (
    <div
      className={`relative w-[26px] h-[26px] min-[360px]:w-[28px] min-[360px]:h-[28px] sm:w-[32px] sm:h-[32px] rounded-full flex items-center justify-center font-sans font-bold text-[10px] min-[360px]:text-[11px] sm:text-xs select-none transition-shadow duration-150 ${
        isGK
          ? "bg-[#eab308] text-zinc-950 border-[1.5px] border-white/95 shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
          : isHome
          ? "bg-[#dc2626] text-white border-[1.5px] border-white/95 shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
          : "bg-[#0284c7] text-white border-[1.5px] border-white/95 shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
      }`}
    >
      {/* Số áo in sắc nét ở trung tâm */}
      <span className="relative z-10 leading-none tracking-tight">
        {displayNumber}
      </span>
    </div>
  );
}


/**
 * Avatar ảnh chụp khuôn mặt cầu thủ (fallback sang số áo nếu không có ảnh)
 */
/**
 * Bộ nhớ đệm phía client để tránh fetch lại hồ sơ cầu thủ khi đóng/mở thẻ hoặc re-render
 */
const clientAthleteCache = new Map<string, AthleteProfile>();
const clientAthletePromises = new Map<string, Promise<AthleteProfile | null>>();

async function fetchAthleteProfileClient(id: string, name?: string): Promise<AthleteProfile | null> {
  const cached = clientAthleteCache.get(id);
  if (cached) return cached;
  const inFlight = clientAthletePromises.get(id);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const url = `/api/live-football/athlete?id=${encodeURIComponent(id)}${name ? `&name=${encodeURIComponent(name)}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      const profileData = json?.data || json;
      if (profileData && profileData.id) {
        clientAthleteCache.set(id, profileData);
        return profileData as AthleteProfile;
      }
      return null;
    } catch {
      return null;
    } finally {
      clientAthletePromises.delete(id);
    }
  })();

  clientAthletePromises.set(id, promise);
  return promise;
}

function formatBirthDate(isoDate?: string): string | null {
  if (!isoDate) return null;
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return isoDate;
}

/**
 * Avatar ảnh chụp khuôn mặt cầu thủ (fallback sang số áo nếu không có ảnh)
 */
export function PhotoToken({
  player,
  isHome,
  hasValidPhoto,
  roleAbbr,
  onImageError,
}: {
  player: MatchRosterPlayer;
  isHome: boolean;
  hasValidPhoto: boolean;
  roleAbbr: string;
  onImageError: (id: string) => void;
}) {
  const cachedPhoto = !player.photoUrl ? clientAthleteCache.get(player.id)?.photoUrl : null;
  const displayPhoto = hasValidPhoto && player.photoUrl ? player.photoUrl : cachedPhoto;

  return (
    <div
      className={`w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] md:w-[34px] md:h-[34px] rounded-full flex items-center justify-center overflow-hidden transition-all shadow-md ${
        isHome
          ? "bg-zinc-900 border-[1.5px] border-netflix-red shadow-red-950/60 ring-1 ring-netflix-red/30 group-hover:border-white group-hover:ring-white/50"
          : "bg-zinc-900 border-[1.5px] border-sky-400 shadow-sky-950/60 ring-1 ring-sky-400/30 group-hover:border-white group-hover:ring-white/50"
      }`}
    >
      {displayPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={displayPhoto}
          alt={player.displayName}
          loading="lazy"
          onError={() => onImageError(player.id)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-mono font-black text-[10px] sm:text-[11.5px] md:text-xs ${
            isHome
              ? "bg-gradient-to-b from-red-600 to-red-900 text-white"
              : "bg-gradient-to-b from-sky-500 to-sky-800 text-white"
          }`}
        >
          <span>{player.jersey || roleAbbr}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Card chi tiết cầu thủ hiển thị inline ngay dưới sân cỏ, không mở modal che video
 */
export function InlinePlayerDetailCard({
  player,
  isHome,
  onClose,
  hasValidPhoto,
  onImageError,
  matchStatus,
  variant = "inline",
}: {
  player: MatchRosterPlayer;
  isHome: boolean;
  onClose: () => void;
  hasValidPhoto: boolean;
  onImageError: (id: string) => void;
  matchStatus?: "live" | "finished" | "scheduled" | string;
  variant?: "inline" | "bottom-sheet" | "drawer";
}) {
  const isMatchScheduled = matchStatus === "scheduled";
  const [profile, setProfile] = useState<AthleteProfile | null>(() => clientAthleteCache.get(player.id) || null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !clientAthleteCache.has(player.id));
  const [fallbackPhotoFailed, setFallbackPhotoFailed] = useState<boolean>(false);

  // Guard chống rò rỉ state giữa các cầu thủ: nếu profile chưa khớp ID hiện tại thì dùng cache hoặc null ngay lập tức
  const currentProfile = profile?.id === player.id ? profile : (clientAthleteCache.get(player.id) || null);

  useEffect(() => {
    let active = true;
    const cached = clientAthleteCache.get(player.id);
    setProfile(cached || null);
    setLoadingProfile(!cached);
    setFallbackPhotoFailed(false);

    if (cached) return;

    fetchAthleteProfileClient(player.id, player.displayName).then((p) => {
      if (active && p?.id === player.id) {
        setProfile(p);
        setLoadingProfile(false);
      }
    });

    return () => {
      active = false;
    };
  }, [player.id, player.displayName]);

  const espnPhotoValid = Boolean(player.photoUrl && hasValidPhoto);
  const fallbackPhotoUrl =
    !espnPhotoValid && currentProfile?.photoUrl && !fallbackPhotoFailed ? currentProfile.photoUrl : null;
  const activePhotoSrc = espnPhotoValid ? player.photoUrl : fallbackPhotoUrl;
  const isCommonsPhoto = !espnPhotoValid && currentProfile?.photoSource === "wikimedia";

  const hasBio = Boolean(
    currentProfile &&
      (currentProfile.citizenship ||
        currentProfile.dateOfBirth ||
        currentProfile.age ||
        currentProfile.height ||
        currentProfile.weight ||
        currentProfile.birthPlace)
  );

  const isDrawer = variant === "drawer" || variant === "bottom-sheet";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        isDrawer
          ? "relative w-full max-h-full sm:max-h-[92%] flex flex-col rounded-2xl border border-white/20 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          : "relative rounded-2xl bg-zinc-900/95 border border-white/15 p-3.5 sm:p-4 shadow-xl backdrop-blur-md animate-in fade-in duration-150"
      }
    >
      {/* Header cố định với nút đóng to rõ */}
      <div className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 ${isDrawer ? "bg-zinc-900/95 border-b border-white/10 shrink-0" : ""}`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        <div
          className={`w-12 h-12 rounded-xl bg-zinc-800 border-2 overflow-hidden flex items-center justify-center font-mono font-black text-base shrink-0 shadow-inner ${
            isHome ? "border-netflix-red/60" : "border-sky-400/60"
          }`}
        >
          {activePhotoSrc ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`${player.id}-${activePhotoSrc}`}
              src={activePhotoSrc}
              alt={player.displayName}
              onError={() => {
                if (espnPhotoValid) {
                  onImageError(player.id);
                } else {
                  setFallbackPhotoFailed(true);
                }
              }}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-white ${
                isHome
                  ? "bg-gradient-to-b from-red-600 to-red-900"
                  : "bg-gradient-to-b from-sky-500 to-sky-800"
              }`}
            >
              <span>#{player.jersey || "?"}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm sm:text-base font-black text-white truncate">
              {player.displayName}
            </h4>
            <span className="font-mono text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.2 rounded shrink-0">
              #{player.jersey || "-"}
            </span>
          </div>
          <p className="text-xs text-zinc-300 font-medium mt-0.5 truncate">
            {translatePosition(player.position)}
          </p>
          <div className="flex items-center flex-wrap gap-2 mt-1">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                player.starter
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-zinc-800 text-zinc-300 border border-white/10"
              }`}
            >
              {player.starter ? "Đá chính" : "Dự bị"}
            </span>

            {!isMatchScheduled && player.subbedIn && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>Vào sân {player.subClock ? `(${player.subClock})` : ""}</span>
              </span>
            )}
            {!isMatchScheduled && player.subbedOut && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3" />
                <span>Ra sân {player.subClock ? `(${player.subClock})` : ""}</span>
              </span>
            )}

            {isCommonsPhoto && currentProfile?.photoLicense && (
              <span
                className="text-[9.5px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded flex items-center gap-1"
                title={currentProfile.photoLicenseUrl || `Giấy phép: ${currentProfile.photoLicense}`}
              >
                <span>Ảnh: Commons ({currentProfile.photoLicense})</span>
              </span>
            )}
          </div>
        </div>
      </div>

        {/* Nút đóng to rõ */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông tin cầu thủ"
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 touch-manipulation border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Khung nội dung: cuộn bên trong độc lập */}
      <div className={isDrawer ? "flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-3.5 space-y-3 scrollbar-thin" : "space-y-3"}>

      {/* Hồ sơ & Tiểu sử cầu thủ (Enriched từ ESPN Core + Wikidata) */}
      {loadingProfile ? (
        <div className="mt-3 pt-2.5 border-t border-white/10 animate-pulse space-y-1.5">
          <div className="h-3 w-28 bg-white/10 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <div className="h-10 bg-white/5 rounded-lg border border-white/5" />
            <div className="h-10 bg-white/5 rounded-lg border border-white/5" />
          </div>
        </div>
      ) : hasBio && currentProfile ? (
        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Hồ sơ cầu thủ</span>
            </div>
            <span className="text-[9.5px] font-mono text-zinc-400/80">
              {currentProfile.provenance?.source === "espn-wikidata-hybrid"
                ? "Nguồn: ESPN + Wikidata"
                : currentProfile.provenance?.source === "wikidata"
                ? "Nguồn: Wikidata"
                : "Nguồn: ESPN Core"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {currentProfile.citizenship && (
              <div className="p-1.5 px-2 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2">
                {currentProfile.flagUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={currentProfile.flagUrl}
                    alt={currentProfile.citizenship}
                    className="w-4 h-3 object-cover rounded-xs shrink-0"
                  />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[9.5px] text-zinc-400 leading-none">Quốc tịch</p>
                  <p className="text-[11px] font-bold text-white truncate mt-0.5">{currentProfile.citizenship}</p>
                </div>
              </div>
            )}

            {currentProfile.dateOfBirth && (
              <div className="p-1.5 px-2 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9.5px] text-zinc-400 leading-none">Ngày sinh</p>
                  <p className="text-[11px] font-bold text-white truncate mt-0.5">
                    {formatBirthDate(currentProfile.dateOfBirth)}
                    {currentProfile.age ? ` (${currentProfile.age}t)` : ""}
                  </p>
                </div>
              </div>
            )}

            {(currentProfile.height || currentProfile.weight) && (
              <div className="p-1.5 px-2 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9.5px] text-zinc-400 leading-none">Thể hình</p>
                  <p className="text-[11px] font-bold text-white truncate mt-0.5">
                    {currentProfile.height || "-"}
                    {currentProfile.weight ? ` • ${currentProfile.weight}` : ""}
                  </p>
                </div>
              </div>
            )}

            {currentProfile.birthPlace && (
              <div className="p-1.5 px-2 rounded-lg bg-black/40 border border-white/5 flex items-center gap-2 col-span-2 sm:col-span-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9.5px] text-zinc-400 leading-none">Nơi sinh</p>
                  <p className="text-[11px] font-bold text-white truncate mt-0.5">{currentProfile.birthPlace}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

        {/* Thống kê thực tế trong trận */}
        {player.stats && player.stats.length > 0 ? (
          <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Thống kê thực tế trong trận</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {player.stats.map((st, idx) => (
                <div
                  key={idx}
                  className="p-1.5 px-2 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between"
                >
                  <span className="text-[10.5px] text-zinc-400 truncate pr-1">
                    {translateStatName(st.displayName)}
                  </span>
                  <span className="font-mono text-xs font-bold text-white shrink-0">
                    {st.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2.5 pt-2 border-t border-white/5 text-[11px] text-zinc-400 italic">
            {isMatchScheduled
              ? "Trận đấu chưa bắt đầu, thông số cá nhân sẽ cập nhật khi có bóng lăn"
              : "Chưa có thêm thống kê sự kiện của cầu thủ này"}
          </div>
        )}
      </div>
    </div>
  );
}

interface TeamPitchColumnProps {
  team: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
  };
  roster?: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  } | null;
  isHome: boolean;
  tokenDisplayMode: TokenDisplayMode;
  imageErrors: Record<string, boolean>;
  onImageError: (id: string) => void;
  onSelectPlayer: (player: MatchRosterPlayer) => void;
  selectedPlayer?: MatchRosterPlayer | null;
  onCloseSelectedPlayer?: () => void;
  showHeader?: boolean;
  matchStatus?: "live" | "finished" | "scheduled" | string;
}

function TeamPitchColumn({
  team,
  roster,
  isHome,
  tokenDisplayMode,
  imageErrors,
  onImageError,
  onSelectPlayer,
  selectedPlayer,
  onCloseSelectedPlayer,
  showHeader = true,
  matchStatus,
}: TeamPitchColumnProps) {
  const isMatchScheduled = matchStatus === "scheduled";
  const starters = useMemo(() => roster?.starters || [], [roster?.starters]);
  const bench = useMemo(() => roster?.bench || [], [roster?.bench]);
  const formation = roster?.formation;

  const positionedStarters = useMemo(() => {
    return calculateTacticalCoordinates(starters, formation);
  }, [starters, formation]);

  const hasStarters = starters.length > 0;

  return (
    <div className="flex flex-col space-y-2.5 min-w-0">
      {/* KHỐI SÂN CỎ CHIẾN THUẬT */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-xl flex flex-col relative">
        {/* Header đội bóng & sơ đồ (chỉ hiển thị khi xem song song 2 đội) */}
        {showHeader && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/90 border-b border-white/10 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHome ? "bg-netflix-red shadow-sm shadow-red-500/50" : "bg-sky-400 shadow-sm shadow-sky-500/50"}`} />
              <Shield className={`w-4 h-4 shrink-0 ${isHome ? "text-netflix-red" : "text-sky-400"}`} />
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {team.displayName}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-zinc-400 shrink-0">
                ({isHome ? "Chủ nhà" : "Đội khách"})
              </span>
            </div>
            {formation && (
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap shadow-sm ${
                  isHome
                    ? "bg-red-500/15 text-red-300 border-red-500/30"
                    : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                }`}
              >
                {formation}
              </span>
            )}
          </div>
        )}

        {/* Khung sân cỏ */}
        {!hasStarters ? (
          <div className="p-8 text-center space-y-2 bg-gradient-to-b from-[#0a2315] to-[#071a10]">
            <p className="text-xs font-semibold text-zinc-400">Chưa có danh sách ra sân</p>
          </div>
        ) : (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && selectedPlayer) {
                onCloseSelectedPlayer?.();
              }
            }}
            style={{
              background: "radial-gradient(ellipse 90% 70% at 50% 50%, #155e38 0%, #0f4528 55%, #0a2e1b 100%)",
            }}
            className="relative w-full pb-[88%] sm:pb-[90%] select-none overflow-hidden rounded-2xl shadow-[inset_0_0_35px_rgba(0,0,0,0.7)] border border-emerald-700/30"
          >
            {/* Đèn pha sân vận động (Stadium Spotlight Floods) */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(52,211,153,0.13)_0%,transparent_60%)]" />
            <div className="absolute top-0 inset-x-0 h-1/4 pointer-events-none bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.09)_0%,transparent_70%)]" />
            <div className="absolute bottom-0 inset-x-0 h-1/4 pointer-events-none bg-[radial-gradient(ellipse_at_50%_100%,rgba(16,185,129,0.09)_0%,transparent_70%)]" />

            {/* Sọc cỏ cắt nhung xen kẽ */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 24px, transparent 24px, transparent 48px)",
              }}
            />

            {/* SVG vạch kẻ sân bóng đá */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none p-2.5 sm:p-3.5"
              viewBox="0 0 100 130"
              preserveAspectRatio="none"
            >
              {/* Outer touchlines */}
              <rect
                x="2"
                y="2"
                width="96"
                height="126"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
                rx="2"
              />
              {/* Halfway line */}
              <line
                x1="2"
                y1="65"
                x2="98"
                y2="65"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />
              {/* Center circle & spot */}
              <circle
                cx="50"
                cy="65"
                r="13"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />
              <circle cx="50" cy="65" r="1" fill="rgba(255,255,255,0.6)" />

              {/* Attacking Goal Area (Top) */}
              <rect
                x="22"
                y="2"
                width="56"
                height="22"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />
              <rect
                x="36"
                y="2"
                width="28"
                height="8"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />
              <circle cx="50" cy="15" r="0.8" fill="rgba(255,255,255,0.5)" />
              <path
                d="M 40 24 A 10 10 0 0 0 60 24"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />

              {/* Defending Goal Area (Bottom) */}
              <rect
                x="22"
                y="106"
                width="56"
                height="22"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />
              <rect
                x="36"
                y="120"
                width="28"
                height="8"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />
              <circle cx="50" cy="115" r="0.8" fill="rgba(255,255,255,0.5)" />
              <path
                d="M 40 106 A 10 10 0 0 1 60 106"
                fill="none"
                stroke="rgba(255,255,255,0.32)"
                strokeWidth="0.75"
              />

              {/* 4 Corner arcs */}
              <path d="M 2 6 A 4 4 0 0 0 6 2" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <path d="M 94 2 A 4 4 0 0 0 98 6" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <path d="M 2 124 A 4 4 0 0 1 6 128" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <path d="M 94 128 A 4 4 0 0 1 98 124" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
            </svg>

            {/* 11 Cầu thủ trên sân */}
            {positionedStarters.map(({ player, x, y, roleAbbr, totalInLine }) => {
              const hasValidPhoto = Boolean(player.photoUrl && !imageErrors[player.id]);
              const shortName = getShortDisplayName(player, starters);
              const isGK =
                roleAbbr === "GK" ||
                Boolean(player.position && /goalkeeper|gk|thủ môn/i.test(player.position)) ||
                player.formationPlace === 1;
              const isSelected = selectedPlayer?.id === player.id;
              const isCrowdedLine = (totalInLine || 1) >= 5;
              const isMediumLine = (totalInLine || 1) === 4;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelectPlayer(player)}
                  title={`${player.jersey ? `#${player.jersey} ` : ""}${player.displayName} (${player.position})`}
                  style={{
                    left: `${x}%`,
                    top: isGK ? "84.5%" : `${y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-pointer active:scale-95 focus:outline-none z-20 ${
                    isSelected ? "z-30" : "hover:z-30"
                  }`}
                >
                  {/* Tooltip nổi duy nhất khi hover hoặc chọn: e.g. #71 · Wiafe · CM */}
                  <div
                    className={`pointer-events-none absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-zinc-950/90 backdrop-blur-md text-[10px] min-[360px]:text-[10.5px] sm:text-[11px] font-sans font-medium tracking-tight border shadow-[0_4px_14px_rgba(0,0,0,0.85)] z-40 transition-all duration-150 ${
                      isSelected
                        ? "opacity-100 scale-100 text-amber-300 border-amber-400/50 shadow-amber-400/25"
                        : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-focus:opacity-100 group-focus:scale-100 text-zinc-100 border-white/20"
                    }`}
                  >
                    <span>
                      {player.jersey ? `#${player.jersey} · ` : ""}
                      {shortName} · {roleAbbr}
                    </span>
                  </div>

                  {/* Token cầu thủ trên sân */}
                  <div
                    className={`relative rounded-full transition-all duration-150 group-hover:ring-2 group-hover:ring-white group-hover:shadow-[0_0_10px_rgba(255,255,255,0.45)] ${
                      isSelected
                        ? "ring-[2.5px] ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_14px_rgba(251,191,36,0.55)]"
                        : ""
                    }`}
                  >
                    {tokenDisplayMode === "jersey" ? (
                      <VectorJerseyToken
                        number={player.jersey}
                        roleAbbr={roleAbbr}
                        isHome={isHome}
                        isGK={isGK}
                      />
                    ) : tokenDisplayMode === "badge" ? (
                      <CircularBadgeToken
                        number={player.jersey}
                        roleAbbr={roleAbbr}
                        isHome={isHome}
                        isGK={isGK}
                      />
                    ) : (
                      <PhotoToken
                        player={player}
                        isHome={isHome}
                        hasValidPhoto={hasValidPhoto}
                        roleAbbr={roleAbbr}
                        onImageError={onImageError}
                      />
                    )}

                    {/* Huy hiệu số áo góc dưới chỉ hiển thị khi ở chế độ xem ảnh mặt */}
                    {tokenDisplayMode === "photo" && player.jersey && (
                      <span
                        className={`absolute -bottom-1 -right-1 font-mono text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.2 rounded-full border shadow-sm leading-none ${
                          isHome
                            ? "bg-black text-white border-netflix-red/80"
                            : "bg-black text-white border-sky-400/80"
                        }`}
                      >
                        {player.jersey}
                      </span>
                    )}

                    {/* Rời sân / Thay người (Micro-badge tinh tế góc trên phải không che số áo) */}
                    {!isMatchScheduled && player.subbedOut && (
                      <span
                        title={`Rời sân: ${player.subClock || ""}`}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md border border-white/80 z-30"
                      >
                        <ArrowDownLeft className="w-2 h-2 min-[360px]:w-2.5 min-[360px]:h-2.5 stroke-[2.5]" />
                      </span>
                    )}
                    {!isMatchScheduled && player.subbedIn && !player.subbedOut && (
                      <span
                        title={`Vào sân: ${player.subClock || ""}`}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md border border-white/80 z-30"
                      >
                        <ArrowUpRight className="w-2 h-2 min-[360px]:w-2.5 min-[360px]:h-2.5 stroke-[2.5]" />
                      </span>
                    )}
                  </div>

                  {/* Tên cầu thủ trực tiếp trên mặt cỏ: Sans-serif, ~11px, trắng nhẹ, font-semibold, shadow mềm */}
                  <div className="mt-1 flex flex-col items-center justify-center pointer-events-none select-none">
                    <span
                      className={`font-sans font-semibold text-[10.5px] min-[360px]:text-[11px] sm:text-[11.5px] text-white/95 whitespace-nowrap text-center tracking-normal drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] select-none overflow-hidden text-ellipsis transition-colors ${
                        isCrowdedLine
                          ? "max-w-[62px] min-[360px]:max-w-[70px] sm:max-w-[80px]"
                          : isMediumLine
                          ? "max-w-[70px] min-[360px]:max-w-[78px] sm:max-w-[88px]"
                          : "max-w-[78px] min-[360px]:max-w-[86px] sm:max-w-[96px]"
                      }`}
                      title={player.displayName}
                    >
                      {shortName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* OVERLAY PANEL THÔNG TIN CẦU THỦ NỔI TRÊN SÂN CỎ */}
        {selectedPlayer && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onCloseSelectedPlayer?.();
              }
            }}
            className="absolute inset-0 z-40 bg-black/60 backdrop-blur-md flex flex-col justify-end sm:justify-center p-2 sm:p-3 animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-label={`Thông tin cầu thủ ${selectedPlayer.displayName}`}
          >
            <InlinePlayerDetailCard
              player={selectedPlayer}
              isHome={isHome}
              onClose={onCloseSelectedPlayer || (() => {})}
              hasValidPhoto={Boolean(selectedPlayer.photoUrl && !imageErrors[selectedPlayer.id])}
              onImageError={onImageError}
              matchStatus={matchStatus}
              variant="drawer"
            />
          </div>
        )}
      </div>

      {/* CẦU THỦ DỰ BỊ */}
      {bench.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-zinc-300 shrink-0" />
              <h5 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider whitespace-nowrap truncate">
                Cầu thủ dự bị ({bench.length})
              </h5>
            </div>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-medium shrink-0 whitespace-nowrap">Bấm xem chỉ số</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
            {bench.map((player) => {
              const hasValidPhoto = Boolean(player.photoUrl && !imageErrors[player.id]);
              const isSelected = selectedPlayer?.id === player.id;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelectPlayer(player)}
                  className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                    isSelected
                      ? "bg-white/[0.12] border-amber-400/70 ring-1 ring-amber-400/40 shadow-sm"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center font-mono text-xs sm:text-[13px] font-bold text-zinc-200 shadow-sm">
                      {tokenDisplayMode === "photo" && hasValidPhoto ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={player.photoUrl}
                          alt=""
                          loading="lazy"
                          onError={() => onImageError(player.id)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={isHome ? "text-red-400 font-black" : "text-sky-400 font-black"}>
                          {player.jersey || "?"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-white truncate">
                        {player.displayName || player.name || "Cầu thủ"}
                      </p>
                      <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
                        {translatePosition(player.position)}
                      </p>
                    </div>
                  </div>

                  {!isMatchScheduled && player.subbedIn ? (
                    <span
                      title={`Vào sân thay người: ${player.subClock || ""}`}
                      className="flex items-center gap-1 text-[10.5px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{player.subClock || "Vào sân"}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-bold text-zinc-400 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 shrink-0">
                      #{player.jersey || "-"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface TeamListColumnProps {
  team: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
  };
  roster?: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  } | null;
  isHome: boolean;
  onSelectPlayer: (player: MatchRosterPlayer) => void;
  selectedPlayer?: MatchRosterPlayer | null;
  onCloseSelectedPlayer?: () => void;
  imageErrors?: Record<string, boolean>;
  onImageError?: (id: string) => void;
  matchStatus?: "live" | "finished" | "scheduled" | string;
}

function TeamListColumn({
  team,
  roster,
  isHome,
  onSelectPlayer,
  selectedPlayer,
  onCloseSelectedPlayer,
  imageErrors = {},
  onImageError = () => {},
  matchStatus,
}: TeamListColumnProps) {
  const isMatchScheduled = matchStatus === "scheduled";
  const starters = roster?.starters || [];
  const bench = roster?.bench || [];
  const formation = roster?.formation;

  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${isHome ? "text-netflix-red" : "text-sky-400"}`} />
          <h5 className="text-xs sm:text-sm font-black text-white truncate">
            {team.displayName}
          </h5>
          <span className="text-[10px] sm:text-xs font-medium text-zinc-400">
            ({isHome ? "Chủ nhà" : "Đội khách"})
          </span>
        </div>
        {formation && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
            {formation}
          </span>
        )}
      </div>

      {/* Card chi tiết cầu thủ nếu được chọn (trong chế độ danh sách) */}
      {selectedPlayer && (
        <InlinePlayerDetailCard
          player={selectedPlayer}
          isHome={isHome}
          onClose={onCloseSelectedPlayer || (() => {})}
          hasValidPhoto={Boolean(selectedPlayer.photoUrl && !imageErrors[selectedPlayer.id])}
          onImageError={onImageError}
          matchStatus={matchStatus}
          variant="inline"
        />
      )}

      <div className="space-y-1.5">
        <p className="text-xs sm:text-[13px] font-extrabold text-gray-300 uppercase tracking-wider">
          Ra sân chính thức ({starters.length})
        </p>
        {starters.map((p, i) => {
          const isSelected = selectedPlayer?.id === p.id;
          return (
            <div
              key={p.id || i}
              onClick={() => onSelectPlayer(p)}
              className={`flex items-center justify-between gap-2.5 py-2 px-3 rounded-xl cursor-pointer text-xs sm:text-sm transition ${
                isSelected
                  ? "bg-white/[0.12] border border-amber-400/60 ring-1 ring-amber-400/30"
                  : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="font-mono text-zinc-400 min-w-[24px] font-bold text-xs sm:text-sm">
                  #{p.jersey || i + 1}
                </span>
                <span className="text-zinc-100 font-semibold truncate text-xs sm:text-sm">{p.displayName || p.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isMatchScheduled && p.subbedOut && (
                  <span className="text-xs text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>{p.subClock || "Ra sân"}</span>
                  </span>
                )}
                {p.position && (
                  <span className="text-xs text-zinc-400 font-medium">
                    {translatePosition(p.position)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {bench.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-white/5">
          <p className="text-xs sm:text-[13px] font-extrabold text-zinc-400 uppercase tracking-wider">
            Dự bị ({bench.length})
          </p>
          <div className="max-h-[260px] overflow-y-auto pr-0.5 scrollbar-thin space-y-1">
            {bench.map((p, i) => {
              const isSelected = selectedPlayer?.id === p.id;
              return (
                <div
                  key={p.id || i}
                  onClick={() => onSelectPlayer(p)}
                  className={`flex items-center justify-between gap-2.5 py-2 px-3 rounded-xl text-xs sm:text-sm cursor-pointer transition ${
                    isSelected
                      ? "bg-white/[0.12] border border-amber-400/60 ring-1 ring-amber-400/30"
                      : "hover:bg-white/[0.05] border border-transparent hover:border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-mono text-zinc-500 min-w-[24px] font-semibold text-xs sm:text-sm">#{p.jersey || "-"}</span>
                    <span className="text-zinc-300 truncate text-xs sm:text-sm">{p.displayName || p.name}</span>
                  </div>
                  {!isMatchScheduled && p.subbedIn ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{p.subClock || "Vào sân"}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      {translatePosition(p.position)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TacticalLineup({
  homeTeam,
  awayTeam,
  homeRoster,
  awayRoster,
  matchStatus,
}: TacticalLineupProps) {
  const [teamFilter, setTeamFilter] = useState<"home" | "away">("home");
  const [viewMode, setViewMode] = useState<"pitch" | "list">("pitch");
  const [tokenDisplayMode, setTokenDisplayMode] = useState<TokenDisplayMode>("badge");
  const [selectedPlayer, setSelectedPlayer] = useState<MatchRosterPlayer | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Lắng nghe phím Escape để hủy chọn cầu thủ
  useEffect(() => {
    if (!selectedPlayer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPlayer(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPlayer]);

  const hasLineupData = Boolean(
    (homeRoster?.starters && homeRoster.starters.length > 0) ||
    (awayRoster?.starters && awayRoster.starters.length > 0)
  );

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const handleTeamChange = (team: "home" | "away") => {
    setTeamFilter(team);
    setSelectedPlayer(null);
  };

  if (!hasLineupData) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-8 sm:p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
          <Users className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">Chưa có dữ liệu đội hình ra sân</h4>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          Ban tổ chức giải đấu sẽ công bố đội hình chính thức trước giờ bóng lăn khoảng 30 - 60 phút.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* 1. THANH CHỌN ĐỘI BÓNG: MATCHDAY DUEL BANNER ĐỐI XỨNG */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleTeamChange("home")}
          title={`${homeTeam.displayName} (${homeRoster?.formation || "Chưa rõ sơ đồ"})`}
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none truncate ${
            teamFilter === "home"
              ? "bg-gradient-to-r from-red-600/90 to-red-800/90 text-white shadow-md shadow-red-950/60 border border-red-400/40 font-black"
              : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-transparent font-medium"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <div className={`w-2 h-2 rounded-full shrink-0 ${teamFilter === "home" ? "bg-white ring-2 ring-red-400/50" : "bg-red-500"}`} />
            <span className="truncate">{homeTeam.displayName}</span>
          </div>
          {homeRoster?.formation && (
            <span
              className={`text-[9.5px] font-mono font-black px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap ml-1 ${
                teamFilter === "home"
                  ? "bg-black/50 text-white border border-white/20 shadow-sm"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              {homeRoster.formation}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTeamChange("away")}
          title={`${awayTeam.displayName} (${awayRoster?.formation || "Chưa rõ sơ đồ"})`}
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none truncate ${
            teamFilter === "away"
              ? "bg-gradient-to-r from-sky-600/90 to-sky-800/90 text-white shadow-md shadow-sky-950/60 border border-sky-400/40 font-black"
              : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-transparent font-medium"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <div className={`w-2 h-2 rounded-full shrink-0 ${teamFilter === "away" ? "bg-white ring-2 ring-sky-400/50" : "bg-sky-400"}`} />
            <span className="truncate">{awayTeam.displayName}</span>
          </div>
          {awayRoster?.formation && (
            <span
              className={`text-[9.5px] font-mono font-black px-1.5 py-0.2 rounded-md shrink-0 whitespace-nowrap ml-1 ${
                teamFilter === "away"
                  ? "bg-black/50 text-white border border-white/20 shadow-sm"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              {awayRoster.formation}
            </span>
          )}
        </button>
      </div>

      {/* 2. CỤM ĐIỀU KHIỂN CHẾ ĐỘ XEM THỐNG NHẤT (UNIFIED CONTROL BAR) */}
      <div className="flex items-center justify-between gap-1.5 px-0.5">
        {/* Segmented Control chính: Sân cỏ / Danh sách */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-900/80 border border-white/10" role="group" aria-label="Chế độ hiển thị đội hình">
          <button
            type="button"
            onClick={() => setViewMode("pitch")}
            aria-label="Xem sơ đồ sân cỏ"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "pitch"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Sân cỏ</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-label="Xem danh sách bảng"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-white/15 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Danh sách</span>
          </button>
        </div>

        {/* Micro Toggle: Số tròn / Áo đấu (chỉ hiện khi xem Sân cỏ) */}
        {viewMode === "pitch" ? (
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-900/80 border border-white/10" role="group" aria-label="Kiểu hiển thị trên sân">
            <button
              type="button"
              onClick={() => setTokenDisplayMode("badge")}
              aria-label="Hiện số áo tròn Flat Matte"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tokenDisplayMode === "badge"
                  ? "bg-white/20 text-white shadow-sm border border-white/20 font-black"
                  : "text-zinc-400 hover:text-white border border-transparent font-medium"
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>Số tròn</span>
            </button>

            <button
              type="button"
              onClick={() => setTokenDisplayMode("jersey")}
              aria-label="Hiện áo đấu vector"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tokenDisplayMode === "jersey"
                  ? "bg-white/20 text-white shadow-sm border border-white/20 font-black"
                  : "text-zinc-400 hover:text-white border border-transparent font-medium"
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Áo đấu</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* 3. KHU VỰC HIỂN THỊ CHÍNH (SÂN CỎ HOẶC DANH SÁCH) */}
      {viewMode === "pitch" ? (
        /* CHẾ ĐỘ 1: SÂN CỎ CHIẾN THUẬT (TACTICAL PITCH) */
        <div className="max-w-2xl mx-auto w-full">
          <TeamPitchColumn
            team={teamFilter === "home" ? homeTeam : awayTeam}
            roster={teamFilter === "home" ? homeRoster : awayRoster}
            isHome={teamFilter === "home"}
            tokenDisplayMode={tokenDisplayMode}
            imageErrors={imageErrors}
            onImageError={handleImageError}
            onSelectPlayer={setSelectedPlayer}
            selectedPlayer={selectedPlayer}
            onCloseSelectedPlayer={() => setSelectedPlayer(null)}
            showHeader={false}
            matchStatus={matchStatus}
          />
        </div>
      ) : (
        /* CHẾ ĐỘ 2: DANH SÁCH BẢNG TRUYỀN THỐNG (LIST VIEW) */
        <div className="max-w-xl mx-auto">
          <TeamListColumn
            team={teamFilter === "home" ? homeTeam : awayTeam}
            roster={teamFilter === "home" ? homeRoster : awayRoster}
            isHome={teamFilter === "home"}
            onSelectPlayer={setSelectedPlayer}
            selectedPlayer={selectedPlayer}
            onCloseSelectedPlayer={() => setSelectedPlayer(null)}
            imageErrors={imageErrors}
            onImageError={handleImageError}
            matchStatus={matchStatus}
          />
        </div>
      )}
    </div>
  );
}
