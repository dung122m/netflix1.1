"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
} from "lucide-react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";

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
  if (p.includes("center left defender") || /\bcd-l\b/.test(p)) return "CB-L";
  if (p.includes("center right defender") || /\bcd-r\b/.test(p)) return "CB-R";
  if (p.includes("center defender") || p.includes("centre-back") || /\bcb\b/.test(p)) return "CB";
  if (p.includes("left back") || /\blb\b/.test(p)) return "LB";
  if (p.includes("right back") || /\brb\b/.test(p)) return "RB";
  if (p.includes("wing back") || /\bwb\b/.test(p)) return "WB";
  if (p.includes("defensive midfielder") || /\bdm\b/.test(p)) return "DM";
  if (p.includes("attacking midfielder left") || /\bam-l\b/.test(p)) return "AM-L";
  if (p.includes("attacking midfielder right") || /\bam-r\b/.test(p)) return "AM-R";
  if (p.includes("attacking midfielder") || /\bam\b/.test(p)) return "AM";
  if (p.includes("center left midfielder") || /\bcm-l\b/.test(p)) return "CM-L";
  if (p.includes("center right midfielder") || /\bcm-r\b/.test(p)) return "CM-R";
  if (p.includes("left midfielder") || /\blm\b/.test(p)) return "LM";
  if (p.includes("right midfielder") || /\brm\b/.test(p)) return "RM";
  if (p.includes("center midfielder") || p.includes("midfielder") || /\bcm\b/.test(p)) return "CM";
  if (p.includes("left forward") || p.includes("left wing") || /\b(lf|lw)\b/.test(p)) return "LW";
  if (p.includes("right forward") || p.includes("right wing") || /\b(rf|rw)\b/.test(p)) return "RW";
  if (p.includes("center forward") || p.includes("striker") || /\b(cf|st)\b/.test(p)) return "ST";
  if (p.includes("forward") || /\bf\b/.test(p)) return "FW";
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
  if (p.includes("center forward") || /\bcf\b/.test(p)) return "Tiền đạo trung tâm";
  if (p.includes("striker") || /\bst\b/.test(p)) return "Tiền đạo cắm";
  if (p.includes("left forward") || /\blf\b/.test(p)) return "Tiền đạo lệch trái";
  if (p.includes("right forward") || /\brf\b/.test(p)) return "Tiền đạo lệch phải";
  if (p.includes("left wing") || p.includes("left winger") || /\blw\b/.test(p)) return "Tiền đạo cánh trái";
  if (p.includes("right wing") || p.includes("right winger") || /\brw\b/.test(p)) return "Tiền đạo cánh phải";
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
function getHorizontalScore(p: MatchRosterPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (pos.includes("left") || pos.includes("lb") || pos.includes("lm") || pos.includes("lw") || pos.includes("lf")) {
    return pos.includes("center left") ? -1 : -2;
  }
  if (pos.includes("right") || pos.includes("rb") || pos.includes("rm") || pos.includes("rw") || pos.includes("rf")) {
    return pos.includes("center right") ? 1 : 2;
  }
  return 0;
}

/**
 * Tính điểm độ sâu vị trí theo trục dọc (Thủ môn: 0, Hậu vệ: 1, Tiền vệ: 2, Tiền đạo: 3)
 */
function getVerticalDepthScore(p: MatchRosterPlayer): number {
  const pos = (p.position || "").toLowerCase();
  if (pos.includes("goalkeeper") || pos === "g" || pos === "gk") return 0;
  if (pos.includes("defender") || pos.includes("back") || pos.includes("cb")) return 1;
  if (pos.includes("defensive") || pos.includes("dm")) return 2;
  if (pos.includes("midfielder") || pos.includes("cm") || pos.includes("lm") || pos.includes("rm")) return 2.5;
  if (pos.includes("attacking") || pos.includes("am")) return 3;
  if (pos.includes("forward") || pos.includes("striker") || pos.includes("wing") || pos.includes("cf") || pos.includes("st")) return 4;
  return 2;
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
      positioned.push({
        player,
        x: xCoords[playerIdx],
        y,
        roleAbbr: getPositionAbbreviation(player.position),
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
  const fontSize = displayNumber.length >= 3 ? "10" : displayNumber.length === 2 ? "12.5" : "14";
  const gradId = isGK ? "jersey-grad-gk" : isHome ? "jersey-grad-home" : "jersey-grad-away";

  return (
    <svg
      viewBox="0 0 36 38"
      className="w-7 h-7 sm:w-8.5 sm:h-8.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)] transition-transform duration-200 group-hover:scale-110"
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
      className={`w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center font-mono font-black text-xs sm:text-[13px] shadow-lg transition-transform duration-200 group-hover:scale-110 border-2 ${
        isGK
          ? "bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-zinc-950 border-white/90 ring-2 ring-amber-400/50 shadow-amber-950/60"
          : isHome
          ? "bg-gradient-to-b from-red-500 via-red-600 to-red-800 text-white border-white/90 ring-2 ring-red-500/50 shadow-red-950/60"
          : "bg-gradient-to-b from-sky-400 via-sky-500 to-sky-700 text-white border-white/90 ring-2 ring-sky-400/50 shadow-sky-950/60"
      }`}
    >
      <span className="leading-none drop-shadow-sm">{displayNumber}</span>
    </div>
  );
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
  return (
    <div
      className={`w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center overflow-hidden transition-all shadow-md ${
        isHome
          ? "bg-zinc-900 border-[1.5px] border-netflix-red shadow-red-950/60 ring-1 ring-netflix-red/30 group-hover:border-white group-hover:ring-white/50"
          : "bg-zinc-900 border-[1.5px] border-sky-400 shadow-sky-950/60 ring-1 ring-sky-400/30 group-hover:border-white group-hover:ring-white/50"
      }`}
    >
      {hasValidPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={player.photoUrl}
          alt={player.displayName}
          loading="lazy"
          onError={() => onImageError(player.id)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-mono font-black text-[10px] sm:text-xs ${
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
}

function TeamPitchColumn({
  team,
  roster,
  isHome,
  tokenDisplayMode,
  imageErrors,
  onImageError,
  onSelectPlayer,
}: TeamPitchColumnProps) {
  const positionedStarters = useMemo(() => {
    return calculateTacticalCoordinates(roster.starters, roster.formation);
  }, [roster.starters, roster.formation]);

  const hasStarters = roster.starters.length > 0;

  return (
    <div className="flex flex-col space-y-3 min-w-0">
      {/* KHỐI SÂN CỎ CHIẾN THUẬT */}
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 shadow-xl flex flex-col">
        {/* Header đội bóng & sơ đồ */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-900/90 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${isHome ? "bg-netflix-red" : "bg-sky-400"}`} />
            <Shield className={`w-3.5 h-3.5 shrink-0 ${isHome ? "text-netflix-red" : "text-sky-400"}`} />
            <span className="text-xs sm:text-sm font-black text-white truncate">
              {team.displayName}
            </span>
            <span className="text-[10px] font-semibold text-zinc-400 shrink-0">
              ({isHome ? "Chủ nhà" : "Đội khách"})
            </span>
          </div>
          {roster.formation && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                isHome
                  ? "bg-red-500/15 text-red-300 border-red-500/30"
                  : "bg-sky-500/15 text-sky-300 border-sky-500/30"
              }`}
            >
              {roster.formation}
            </span>
          )}
        </div>

        {/* Khung sân cỏ */}
        {!hasStarters ? (
          <div className="p-8 text-center space-y-2 bg-gradient-to-b from-[#0b1d12] to-[#08170e]">
            <p className="text-xs font-semibold text-zinc-400">Chưa có danh sách ra sân</p>
          </div>
        ) : (
          <div className="relative w-full pb-[118%] sm:pb-[115%] select-none overflow-hidden bg-gradient-to-b from-[#0b1d12] via-[#0e2719] to-[#08170e]">
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
                stroke="rgba(255,255,255,0.22)"
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
                  className="absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-pointer transition-all hover:scale-115 active:scale-95 focus:outline-none z-20"
                >
                  {/* Token cầu thủ trên sân */}
                  <div className="relative">
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
                        className={`absolute -bottom-1 -right-1 font-mono text-[7px] sm:text-[8px] font-black px-1 py-0.2 rounded-full border shadow-sm leading-none ${
                          isHome
                            ? "bg-black text-white border-netflix-red/80"
                            : "bg-black text-white border-sky-400/80"
                        }`}
                      >
                        {player.jersey}
                      </span>
                    )}

                    {/* Rời sân */}
                    {player.subbedOut && (
                      <span
                        title={`Rời sân: ${player.subClock || ""}`}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center text-[7px] shadow-md border border-white/40"
                      >
                        <ArrowDownLeft className="w-2 h-2" />
                      </span>
                    )}
                  </div>

                  {/* Tên & vị trí */}
                  <div className="mt-0.5 flex flex-col items-center max-w-[56px] sm:max-w-[72px] pointer-events-none">
                    <span className="text-[8px] sm:text-[9.5px] font-bold text-white truncate w-full text-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                      {shortName}
                    </span>
                    <span className="text-[6.5px] sm:text-[7.5px] font-bold tracking-wider text-zinc-300 uppercase px-1 rounded bg-black/60 border border-white/10 leading-tight">
                      {roleAbbr}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* CẦU THỦ DỰ BỊ */}
      {roster.bench.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 p-3 sm:p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <h5 className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">
                Cầu thủ dự bị ({roster.bench.length})
              </h5>
            </div>
            <span className="text-[9.5px] text-zinc-500 font-medium">Bấm xem chỉ số</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[240px] overflow-y-auto pr-0.5 scrollbar-thin">
            {roster.bench.map((player) => {
              const hasValidPhoto = Boolean(player.photoUrl && !imageErrors[player.id]);

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelectPlayer(player)}
                  className="flex items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/15 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-zinc-800 border border-white/15 overflow-hidden shrink-0 flex items-center justify-center font-mono text-[9px] font-bold text-zinc-300">
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
                      <p className="text-[11px] sm:text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {player.name}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-zinc-500 truncate">
                        {translatePosition(player.position)}
                      </p>
                    </div>
                  </div>

                  {player.subbedIn ? (
                    <span
                      title={`Vào sân thay người: ${player.subClock || ""}`}
                      className="flex items-center gap-0.5 text-[8.5px] sm:text-[9.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded shrink-0"
                    >
                      <ArrowUpRight className="w-2.5 h-2.5" />
                      <span>{player.subClock || "Vào"}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold text-zinc-500 shrink-0">
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
}

function TeamListColumn({
  team,
  roster,
  isHome,
  onSelectPlayer,
}: TeamListColumnProps) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${isHome ? "text-netflix-red" : "text-sky-400"}`} />
          <h5 className="text-xs sm:text-sm font-black text-white truncate">
            {team.displayName}
          </h5>
          <span className="text-[10px] font-medium text-zinc-400">
            ({isHome ? "Chủ nhà" : "Đội khách"})
          </span>
        </div>
        {roster.formation && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
            {roster.formation}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
          Ra sân chính thức ({roster.starters.length})
        </p>
        {roster.starters.map((p, i) => (
          <div
            key={p.id || i}
            onClick={() => onSelectPlayer(p)}
            className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] cursor-pointer text-xs transition"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-gray-400 min-w-[20px] font-bold">
                {p.jersey || i + 1}
              </span>
              <span className="text-white font-semibold truncate">{p.name}</span>
            </div>
            {p.position && (
              <span className="text-[10px] text-gray-400 font-medium">
                {translatePosition(p.position)}
              </span>
            )}
          </div>
        ))}
      </div>

      {roster.bench.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-white/5">
          <p className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-wider">
            Dự bị ({roster.bench.length})
          </p>
          <div className="max-h-[240px] overflow-y-auto pr-0.5 scrollbar-thin space-y-1">
            {roster.bench.map((p, i) => (
              <div
                key={p.id || i}
                onClick={() => onSelectPlayer(p)}
                className="flex items-center justify-between gap-2 py-1 px-2.5 rounded-lg text-xs hover:bg-white/[0.04] cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono text-zinc-500 min-w-[20px]">{p.jersey || "-"}</span>
                  <span className="text-zinc-300 truncate">{p.name}</span>
                </div>
                {p.subbedIn && (
                  <span className="text-[9.5px] text-emerald-400">
                    ↑ {p.subClock || "Vào sân"}
                  </span>
                )}
              </div>
            ))}
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
}: TacticalLineupProps) {
  const [teamFilter, setTeamFilter] = useState<"both" | "home" | "away">("both");
  const [viewMode, setViewMode] = useState<"pitch" | "list">("pitch");
  const [tokenDisplayMode, setTokenDisplayMode] = useState<TokenDisplayMode>("jersey");
  const [activePlayerModal, setActivePlayerModal] = useState<MatchRosterPlayer | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Bảo toàn vị trí cuộn trang và lắng nghe phím Escape khi mở modal thông tin cầu thủ
  useEffect(() => {
    if (!activePlayerModal) return;
    const initialScrollY = typeof window !== "undefined" ? window.scrollY : 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActivePlayerModal(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // Đảm bảo không bị nhảy trang về đầu khi đóng modal
      if (typeof window !== "undefined" && window.scrollY !== initialScrollY) {
        window.scrollTo({ top: initialScrollY, behavior: "instant" });
      }
    };
  }, [activePlayerModal]);

  const hasLineupData = homeRoster.starters.length > 0 || awayRoster.starters.length > 0;

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-4">
      {/* 1. THANH ĐIỀU KHIỂN & CHỌN CHẾ ĐỘ XEM */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
        {/* Lọc đội bóng: [Cả hai đội] | [Đội nhà] | [Đội khách] */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5 flex-1 sm:flex-initial overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setTeamFilter("both")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
              teamFilter === "both"
                ? "bg-white/20 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Cả hai đội</span>
          </button>

          <button
            type="button"
            onClick={() => setTeamFilter("home")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
              teamFilter === "home"
                ? "bg-netflix-red text-white shadow-md shadow-red-950/50"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[140px]">{homeTeam.displayName}</span>
            {homeRoster.formation && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-300">
                {homeRoster.formation}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTeamFilter("away")}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0 ${
              teamFilter === "away"
                ? "bg-sky-500 text-white shadow-md shadow-sky-950/50"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-sky-300 shrink-0" />
            <span className="truncate max-w-[110px] sm:max-w-[140px]">{awayTeam.displayName}</span>
            {awayRoster.formation && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-zinc-300">
                {awayRoster.formation}
              </span>
            )}
          </button>
        </div>

        {/* Nhóm điều khiển chế độ hiển thị & dạng xem */}
        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto shrink-0">
          {viewMode === "pitch" && (
            <div className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-black/40 border border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 px-1 hidden md:inline">Hiển thị:</span>
              <button
                type="button"
                onClick={() => setTokenDisplayMode("jersey")}
                title="Hiện áo đấu vector & số áo tức thì (0ms tải)"
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                title="Hiện huy hiệu số áo tròn phong cách Sofascore"
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  tokenDisplayMode === "badge"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Số tròn</span>
              </button>
            </div>
          )}

          {/* Toggle Chế độ xem: [Sân cỏ] | [Danh sách] */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/5">
            <button
              type="button"
              onClick={() => setViewMode("pitch")}
              title="Sơ đồ chiến thuật trên sân cỏ"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              title="Danh sách đội hình truyền thống"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
      </div>

      {/* 2. KHU VỰC HIỂN THỊ CHÍNH (SÂN CỎ HOẶC DANH SÁCH) */}
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
        <div
          className={
            teamFilter === "both"
              ? "grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4"
              : "max-w-xl mx-auto"
          }
        >
          {(teamFilter === "both" || teamFilter === "home") && (
            <TeamPitchColumn
              team={homeTeam}
              roster={homeRoster}
              isHome={true}
              tokenDisplayMode={tokenDisplayMode}
              imageErrors={imageErrors}
              onImageError={handleImageError}
              onSelectPlayer={setActivePlayerModal}
            />
          )}

          {(teamFilter === "both" || teamFilter === "away") && (
            <TeamPitchColumn
              team={awayTeam}
              roster={awayRoster}
              isHome={false}
              tokenDisplayMode={tokenDisplayMode}
              imageErrors={imageErrors}
              onImageError={handleImageError}
              onSelectPlayer={setActivePlayerModal}
            />
          )}
        </div>
      ) : (
        /* CHẾ ĐỘ 2: DANH SÁCH BẢNG TRUYỀN THỐNG (LIST VIEW) */
        <div
          className={
            teamFilter === "both"
              ? "grid grid-cols-1 md:grid-cols-2 gap-4"
              : "max-w-xl mx-auto"
          }
        >
          {(teamFilter === "both" || teamFilter === "home") && (
            <TeamListColumn
              team={homeTeam}
              roster={homeRoster}
              isHome={true}
              onSelectPlayer={setActivePlayerModal}
            />
          )}

          {(teamFilter === "both" || teamFilter === "away") && (
            <TeamListColumn
              team={awayTeam}
              roster={awayRoster}
              isHome={false}
              onSelectPlayer={setActivePlayerModal}
            />
          )}
        </div>
      )}

      {/* 4. MODAL CHI TIẾT CẦU THỦ & THỐNG KÊ TRONG TRẬN (SỬ DỤNG CREATEPORTAL VÀ CĂN GIỮA VIEWPORT) */}
      {isMounted &&
        activePlayerModal &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-modal-title"
            onClick={() => setActivePlayerModal(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm sm:max-w-md rounded-3xl bg-zinc-900 border border-white/15 shadow-2xl relative flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden"
            >
              {/* Nút đóng */}
              <button
                type="button"
                onClick={() => setActivePlayerModal(null)}
                aria-label="Đóng"
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Vùng cuộn riêng cho nội dung modal */}
              <div className="p-5 space-y-4 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/20">
                {/* Header cầu thủ */}
                <div className="flex items-center gap-3.5 pr-8">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 border-2 border-white/20 overflow-hidden flex items-center justify-center font-mono font-black text-lg text-white shrink-0 shadow-inner">
                    {activePlayerModal.photoUrl && !imageErrors[activePlayerModal.id] ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activePlayerModal.photoUrl}
                        alt={activePlayerModal.displayName}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-white font-mono font-black text-lg">
                        <span>#{activePlayerModal.jersey || "?"}</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 id="player-modal-title" className="text-base font-black text-white truncate">
                      {activePlayerModal.displayName}
                    </h4>
                    <p className="text-xs text-zinc-400 font-medium mt-0.5">
                      {translatePosition(activePlayerModal.position)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-white/10 text-white">
                        Số áo: #{activePlayerModal.jersey || "Chưa rõ"}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        {activePlayerModal.starter ? "Đá chính" : "Dự bị"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thông tin thay người nếu có */}
                {(activePlayerModal.subbedIn || activePlayerModal.subbedOut) && (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
                    {activePlayerModal.subbedIn && (
                      <p className="text-emerald-400 flex items-center gap-1 font-medium">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Vào sân thay người: phút {activePlayerModal.subClock || "trong trận"}</span>
                      </p>
                    )}
                    {activePlayerModal.subbedOut && (
                      <p className="text-red-400 flex items-center gap-1 font-medium">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Rời sân thay người: phút {activePlayerModal.subClock || "trong trận"}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Chỉ số cá nhân thực tế trong trận (Real match stats) */}
                {activePlayerModal.stats && activePlayerModal.stats.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thống kê thực tế trong trận</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {activePlayerModal.stats.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                        >
                          <span className="text-[11px] text-zinc-400 truncate pr-1">
                            {translateStatName(st.displayName)}
                          </span>
                          <span className="font-mono text-xs font-black text-white">
                            {st.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-zinc-500">
                    Chưa có dữ liệu thống kê sự kiện chi tiết của cầu thủ này
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
