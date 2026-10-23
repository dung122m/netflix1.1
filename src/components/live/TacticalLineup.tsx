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
  Hash,
  Calendar,
  Globe,
  Ruler,
  MapPin,
  Sparkles,
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
  matchStatus?: "live" | "finished" | "scheduled" | string;
}

interface PositionedPlayer {
  player: MatchRosterPlayer;
  x: number; // Tọa độ X tính bằng % (0 - 100%)
  y: number; // Tọa độ Y tính bằng % (0 - 100%)
  roleAbbr: string;
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
      });
    });
  });

  return positioned;
}

/**
 * Trích xuất tên ngắn gọn của cầu thủ (ví dụ: "M. Hermansen" hoặc "Vardy")
 */
export function getShortDisplayName(p: MatchRosterPlayer): string {
  if (p.shortName) return p.shortName;
  const parts = p.displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1]; // Lấy họ cầu thủ
}

export type TokenDisplayMode = "jersey" | "badge" | "photo";

/**
 * Áo đấu Vector SVG kết hợp số áo tức thì (0ms mạng, sắc nét Retina)
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
  const fontSize = displayNumber.length >= 3 ? "11.5" : displayNumber.length === 2 ? "13.5" : "15.5";
  const gradId = isGK ? "jersey-grad-gk" : isHome ? "jersey-grad-home" : "jersey-grad-away";

  return (
    <svg
      viewBox="0 0 36 38"
      className="w-[24px] h-[24px] min-[360px]:w-[28px] min-[360px]:h-[28px] sm:w-[32px] sm:h-[32px] md:w-[34px] md:h-[34px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-200 group-hover:scale-110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Áo sân nhà - Đỏ rực rỡ */}
        <linearGradient id="jersey-grad-home" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="55%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        {/* Áo sân khách - Xanh lam sáng */}
        <linearGradient id="jersey-grad-away" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        {/* Áo thủ môn - Vàng hổ phách đặc trưng */}
        <linearGradient id="jersey-grad-gk" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Thân áo đấu bóng đá có tay áo và cổ áo */}
      <path
        d="M10 6 L14 9.5 C15.5 10.5 20.5 10.5 22 9.5 L26 6 L34.5 11 L31.5 17.5 L27 15.5 V34 C27 35 26 36 25 36 H11 C10 36 9 35 9 34 V15.5 L4.5 17.5 L1.5 11 L10 6 Z"
        fill={`url(#${gradId})`}
        stroke={isGK ? "rgba(254, 240, 138, 0.9)" : isHome ? "rgba(254, 202, 202, 0.7)" : "rgba(186, 230, 253, 0.7)"}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Viền cổ áo */}
      <path
        d="M14 9.5 C15.5 11.5 20.5 11.5 22 9.5"
        stroke={isGK ? "#000000" : "#ffffff"}
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Bo tay áo trái & phải */}
      <line
        x1="1.8"
        y1="11.2"
        x2="4.3"
        y2="17.2"
        stroke={isGK ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)"}
        strokeWidth="1"
        strokeLinecap="round"
      />
      <line
        x1="34.2"
        y1="11.2"
        x2="31.7"
        y2="17.2"
        stroke={isGK ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)"}
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Số áo in chính giữa ngực/lưng */}
      <text
        x="18"
        y="26"
        textAnchor="middle"
        fill={isGK ? "#18181b" : "#ffffff"}
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        letterSpacing="-0.5px"
      >
        {displayNumber}
      </text>
    </svg>
  );
}

/**
 * Huy hiệu số áo tròn phong cách Sofascore / FotMob
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
      className={`w-[24px] h-[24px] min-[360px]:w-[28px] min-[360px]:h-[28px] sm:w-[32px] sm:h-[32px] md:w-[34px] md:h-[34px] rounded-full flex items-center justify-center font-mono font-black text-[9px] min-[360px]:text-[10px] sm:text-[11.5px] md:text-xs shadow-md transition-transform duration-200 group-hover:scale-110 border-[1.5px] ${
        isGK
          ? "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-zinc-950 border-white/90 ring-1 ring-amber-400/50 shadow-amber-950/60"
          : isHome
          ? "bg-gradient-to-b from-red-500 via-red-600 to-red-800 text-white border-white/90 ring-1 ring-red-500/50 shadow-red-950/60"
          : "bg-gradient-to-b from-sky-400 via-sky-500 to-sky-700 text-white border-white/90 ring-1 ring-sky-400/50 shadow-sky-950/60"
      }`}
    >
      <span className="leading-none drop-shadow-sm">{displayNumber}</span>
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
  variant?: "inline" | "bottom-sheet";
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

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        variant === "bottom-sheet"
          ? "absolute inset-x-0 bottom-0 z-40 max-h-[52%] sm:max-h-[50%] flex flex-col rounded-t-2xl border-t border-x border-white/20 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-3 sm:p-3.5 overflow-hidden animate-in slide-in-from-bottom duration-200"
          : "relative rounded-2xl bg-zinc-900/95 border border-white/15 p-3.5 sm:p-4 shadow-xl backdrop-blur-md animate-in fade-in duration-150"
      }
    >
      {/* Nút đóng */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng thông tin cầu thủ"
        className={`absolute ${
          variant === "bottom-sheet" ? "top-2.5 right-2.5 p-1.5" : "top-3.5 right-3.5 p-1.5"
        } rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer z-10 touch-manipulation`}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Thanh grab handle nhỏ khi ở dạng Bottom Sheet */}
      {variant === "bottom-sheet" && (
        <div className="w-8 h-1 rounded-full bg-white/25 mx-auto mb-1.5 shrink-0 select-none" />
      )}

      {/* Khung nội dung: cuộn bên trong nếu là Bottom Sheet */}
      <div className={variant === "bottom-sheet" ? "flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin pr-0.5 space-y-2.5" : "space-y-3"}>
        {/* Header cầu thủ */}
        <div className="flex items-center gap-3 pr-8">
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
  roster: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  };
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
  const positionedStarters = useMemo(() => {
    return calculateTacticalCoordinates(roster.starters, roster.formation);
  }, [roster.starters, roster.formation]);

  const hasStarters = roster.starters.length > 0;

  return (
    <div className="flex flex-col space-y-2.5 min-w-0">
      {/* KHỐI SÂN CỎ CHIẾN THUẬT */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-xl flex flex-col">
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
            {roster.formation && (
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 whitespace-nowrap shadow-sm ${
                  isHome
                    ? "bg-red-500/15 text-red-300 border-red-500/30"
                    : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                }`}
              >
                {roster.formation}
              </span>
            )}
          </div>
        )}

        {/* Khung sân cỏ */}
        {!hasStarters ? (
          <div className="p-8 text-center space-y-2 bg-gradient-to-b from-[#0b1d12] to-[#08170e]">
            <p className="text-xs font-semibold text-zinc-400">Chưa có danh sách ra sân</p>
          </div>
        ) : (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && selectedPlayer) {
                onCloseSelectedPlayer?.();
              }
            }}
            className="relative w-full pb-[88%] sm:pb-[90%] select-none overflow-hidden bg-gradient-to-b from-[#0b1d12] via-[#0e2719] to-[#08170e]"
          >
            {/* Sọc cỏ cắt */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 28px, transparent 28px, transparent 56px)",
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
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.8"
                rx="2"
              />
              {/* Halfway line */}
              <line
                x1="2"
                y1="65"
                x2="98"
                y2="65"
                stroke="rgba(255,255,225,0.22)"
                strokeWidth="0.8"
              />
              {/* Center circle & spot */}
              <circle
                cx="50"
                cy="65"
                r="13"
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="0.8"
              />
              <circle cx="50" cy="65" r="0.9" fill="rgba(255,255,255,0.5)" />

              {/* Attacking Goal Area (Top) */}
              <rect
                x="22"
                y="2"
                width="56"
                height="22"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.8"
              />
              <rect
                x="36"
                y="2"
                width="28"
                height="8"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.8"
              />
              <circle cx="50" cy="15" r="0.8" fill="rgba(255,255,255,0.4)" />
              <path
                d="M 40 24 A 10 10 0 0 0 60 24"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.8"
              />

              {/* Defending Goal Area (Bottom) */}
              <rect
                x="22"
                y="106"
                width="56"
                height="22"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.8"
              />
              <rect
                x="36"
                y="120"
                width="28"
                height="8"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.8"
              />
              <circle cx="50" cy="115" r="0.8" fill="rgba(255,255,255,0.4)" />
              <path
                d="M 40 106 A 10 10 0 0 1 60 106"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.8"
              />

              {/* 4 Corner arcs */}
              <path d="M 2 6 A 4 4 0 0 0 6 2" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
              <path d="M 94 2 A 4 4 0 0 0 98 6" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
              <path d="M 2 124 A 4 4 0 0 1 6 128" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
              <path d="M 94 128 A 4 4 0 0 1 98 124" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
            </svg>

            {/* 11 Cầu thủ trên sân */}
            {positionedStarters.map(({ player, x, y, roleAbbr }) => {
              const hasValidPhoto = Boolean(player.photoUrl && !imageErrors[player.id]);
              const shortName = getShortDisplayName(player);
              const isGK =
                roleAbbr === "GK" ||
                Boolean(player.position && /goalkeeper|gk|thủ môn/i.test(player.position)) ||
                player.formationPlace === 1;
              const isSelected = selectedPlayer?.id === player.id;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelectPlayer(player)}
                  title={`${player.jersey ? `#${player.jersey} ` : ""}${player.displayName} (${player.position})`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                  className={`absolute -translate-x-1/2 ${
                    isGK ? "-translate-y-[92%]" : "-translate-y-1/2"
                  } group flex flex-col items-center cursor-pointer transition-all hover:scale-115 active:scale-95 focus:outline-none z-20 ${
                    isSelected ? "scale-115 z-30" : ""
                  }`}
                >
                  {/* Token cầu thủ trên sân */}
                  <div
                    className={`relative rounded-full transition-all ${
                      isSelected
                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-lg shadow-amber-400/50"
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

                    {/* Rời sân (chỉ hiển thị khi trận đang đá hoặc đã kết thúc) */}
                    {!isMatchScheduled && player.subbedOut && (
                      <span
                        title={`Rời sân: ${player.subClock || ""}`}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[7.5px] shadow-md border border-white/50 z-30"
                      >
                        <ArrowDownLeft className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Tên & vị trí */}
                  <div className="mt-0.5 min-[360px]:mt-1 flex flex-col items-center max-w-[56px] min-[380px]:max-w-[68px] sm:max-w-[82px] md:max-w-[94px] pointer-events-none leading-none">
                    <span className="text-[8px] min-[380px]:text-[9px] sm:text-[10.5px] md:text-[11px] font-bold text-white truncate w-full text-center drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.98)] tracking-normal">
                      {shortName}
                    </span>
                    <span className="text-[6.5px] min-[380px]:text-[7px] sm:text-[8px] md:text-[8.5px] font-extrabold tracking-wider text-zinc-200 uppercase px-1 min-[380px]:px-1.5 py-0.5 rounded bg-black/85 border border-white/20 leading-none mt-0.5 shadow-sm">
                      {roleAbbr}
                    </span>
                  </div>
                </button>
              );
            })}
            {/* BOTTOM SHEET NỔI PHỦ ĐÁY SÂN CỎ KHI CHỌN CẦU THỦ */}
            {selectedPlayer && (
              <InlinePlayerDetailCard
                player={selectedPlayer}
                isHome={isHome}
                onClose={onCloseSelectedPlayer || (() => {})}
                hasValidPhoto={Boolean(selectedPlayer.photoUrl && !imageErrors[selectedPlayer.id])}
                onImageError={onImageError}
                matchStatus={matchStatus}
                variant="bottom-sheet"
              />
            )}
          </div>
        )}
      </div>

      {/* CẦU THỦ DỰ BỊ */}
      {roster.bench.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-zinc-300 shrink-0" />
              <h5 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider whitespace-nowrap truncate">
                Cầu thủ dự bị ({roster.bench.length})
              </h5>
            </div>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-medium shrink-0 whitespace-nowrap">Bấm xem chỉ số</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
            {roster.bench.map((player) => {
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
  roster: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  };
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
        {roster.formation && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
            {roster.formation}
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
          Ra sân chính thức ({roster.starters.length})
        </p>
        {roster.starters.map((p, i) => {
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

      {roster.bench.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-white/5">
          <p className="text-xs sm:text-[13px] font-extrabold text-zinc-400 uppercase tracking-wider">
            Dự bị ({roster.bench.length})
          </p>
          <div className="max-h-[260px] overflow-y-auto pr-0.5 scrollbar-thin space-y-1">
            {roster.bench.map((p, i) => {
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
  const [tokenDisplayMode, setTokenDisplayMode] = useState<TokenDisplayMode>("jersey");
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

  const hasLineupData = homeRoster.starters.length > 0 || awayRoster.starters.length > 0;

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  const handleTeamChange = (team: "home" | "away") => {
    setTeamFilter(team);
    setSelectedPlayer(null);
  };

  return (
    <div className="space-y-2">
      {/* 1. THANH CHỌN ĐỘI BÓNG: 50% - 50% FULL-WIDTH CÂN ĐỐI HOÀN HẢO */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900/80 border border-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleTeamChange("home")}
          title={`${homeTeam.displayName} (${homeRoster.formation || "Chưa rõ sơ đồ"})`}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all cursor-pointer select-none truncate ${
            teamFilter === "home"
              ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-950/60 border border-red-500/60 font-black"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent font-medium"
          }`}
        >
          <div className={`w-2 h-2 rounded-full shrink-0 ${teamFilter === "home" ? "bg-white" : "bg-red-500"}`} />
          <span className="truncate">{homeTeam.displayName}</span>
          {homeRoster.formation && (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 whitespace-nowrap ${
                teamFilter === "home"
                  ? "bg-black/40 text-red-100 border border-white/15"
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
          title={`${awayTeam.displayName} (${awayRoster.formation || "Chưa rõ sơ đồ"})`}
          className={`flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all cursor-pointer select-none truncate ${
            teamFilter === "away"
              ? "bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-md shadow-sky-950/60 border border-sky-400/60 font-black"
              : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent font-medium"
          }`}
        >
          <div className={`w-2 h-2 rounded-full shrink-0 ${teamFilter === "away" ? "bg-white" : "bg-sky-400"}`} />
          <span className="truncate">{awayTeam.displayName}</span>
          {awayRoster.formation && (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 whitespace-nowrap ${
                teamFilter === "away"
                  ? "bg-black/40 text-sky-100 border border-white/15"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              {awayRoster.formation}
            </span>
          )}
        </button>
      </div>

      {/* 2. CỤM ĐIỀU KHIỂN CHẾ ĐỘ XEM & KIỂU SỐ (ĐỐI XỨNG 2 BÊN) */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        {/* Bên trái: Toggle Số áo / Số tròn (chỉ khi xem Sân cỏ) */}
        {viewMode === "pitch" ? (
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/70 border border-white/10" role="group" aria-label="Kiểu hiển thị số áo trên sân">
            <button
              type="button"
              onClick={() => setTokenDisplayMode("jersey")}
              title="Hiện áo đấu vector & số áo"
              aria-label="Hiện áo đấu vector & số áo"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tokenDisplayMode === "jersey"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Shirt className="w-3.5 h-3.5" />
              <span>Số áo</span>
            </button>

            <button
              type="button"
              onClick={() => setTokenDisplayMode("badge")}
              title="Hiện huy hiệu số tròn"
              aria-label="Hiện huy hiệu số tròn"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                tokenDisplayMode === "badge"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Số tròn</span>
            </button>
          </div>
        ) : <div />}

        {/* Bên phải: Toggle Sân cỏ / Danh sách */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/70 border border-white/10 ml-auto" role="group" aria-label="Chế độ hiển thị đội hình">
          <button
            type="button"
            onClick={() => setViewMode("pitch")}
            title="Xem sơ đồ sân cỏ"
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
            title="Xem danh sách bảng"
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
      </div>

      {/* 3. KHU VỰC HIỂN THỊ CHÍNH (SÂN CỎ HOẶC DANH SÁCH) */}
      {!hasLineupData ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">Chưa có dữ liệu đội hình ra sân</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Ban tổ chức giải đấu sẽ công bố đội hình chính thức trước giờ bóng lăn khoảng 30 - 60 phút.
          </p>
        </div>
      ) : viewMode === "pitch" ? (
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
