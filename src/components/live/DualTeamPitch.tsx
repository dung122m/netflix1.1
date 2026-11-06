"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  X,
  Users,
  Calendar,
  Ruler,
  MapPin,
  Globe,
  Trophy,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Shield,
  Activity,
} from "lucide-react";
import {
  MatchRosterPlayer,
  MatchKeyEvent,
  AthleteProfile,
} from "@/services/live/football-score/types";
import {
  calculateTacticalCoordinates,
  getShortDisplayName,
  translatePosition,
  translateStatName,
} from "./TacticalLineup";
import { SoccerBallIcon } from "./MatchTimelineSidebar";

interface TeamInfo {
  id: string;
  name: string;
  displayName: string;
  logo?: string;
  formation?: string;
  coach?: string;
}

interface DualTeamPitchProps {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeStarters: MatchRosterPlayer[];
  homeBench: MatchRosterPlayer[];
  awayStarters: MatchRosterPlayer[];
  awayBench: MatchRosterPlayer[];
  events?: MatchKeyEvent[];
  onSelectPlayer?: (player: MatchRosterPlayer, isHome: boolean) => void;
  matchClock?: string;
  matchStatus?: string;
}

interface PositionedDualPlayer {
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

/**
 * Thẻ Vàng thể thao phẳng chuẩn tỷ lệ 2:3
 */
function YellowCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return (
    <span
      className={`rounded-[1.5px] bg-amber-400 shadow-sm inline-block shrink-0 ${className}`}
      title="Thẻ vàng"
    />
  );
}

/**
 * Thẻ Đỏ thể thao phẳng chuẩn tỷ lệ 2:3
 */
function RedCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return (
    <span
      className={`rounded-[1.5px] bg-red-600 shadow-sm inline-block shrink-0 ${className}`}
      title="Thẻ đỏ"
    />
  );
}

// In-memory profile cache client-side
const athleteCache = new Map<string, AthleteProfile>();

export const DualTeamPitch: React.FC<DualTeamPitchProps> = ({
  homeTeam,
  awayTeam,
  homeStarters = [],
  homeBench = [],
  awayStarters = [],
  awayBench = [],
  events = [],
  onSelectPlayer,
  matchClock,
  matchStatus,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<{
    player: MatchRosterPlayer;
    isHome: boolean;
  } | null>(null);
  const [mobileTeamTab, setMobileTeamTab] = useState<"home" | "away">("home");

  // Đóng modal khi nhấn Escape
  useEffect(() => {
    if (!selectedPlayer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedPlayer(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlayer]);

  // Map các sự kiện (bàn thắng, thẻ phạt, thay người) theo tên cầu thủ
  const playerEventsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        goals: number;
        goalMinutes: string[];
        yellowCards: number;
        redCards: number;
        subClock?: string;
      }
    >();

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
  }, [events]);

  const getPlayerEventBadges = useCallback((player: MatchRosterPlayer) => {
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
  }, [playerEventsMap]);

  // Tính tọa độ chiến thuật cho SÂN CỎ NẰM NGANG (Horizontal Pitch)
  const horizontalPositionedPlayers = useMemo(() => {
    const list: PositionedDualPlayer[] = [];

    // 1. ĐỘI NHÀ (Home - Nửa sân bên TRÁI)
    if (homeStarters.length > 0) {
      const homeCoords = calculateTacticalCoordinates(
        homeStarters,
        homeTeam.formation
      );

      homeCoords.forEach(({ player, x, y, roleAbbr }) => {
        const isGK =
          roleAbbr === "GK" ||
          Boolean(player.position && /goalkeeper|gk|thủ môn|thủ thành/i.test(player.position)) ||
          player.formationPlace === 1;

        let pitchX: number;
        let pitchY: number;

        if (isGK) {
          pitchX = 7.5;
          pitchY = 50;
        } else {
          // Trục Y của sân ngang: cánh trái -> cánh phải (16% đến 84%)
          pitchY = 16 + (x / 100) * 68;

          // Trục X của sân ngang: độ sâu từ hậu vệ (18%) đến tiền đạo (43.5%)
          const normDepth = Math.max(16, Math.min(74, y));
          pitchX = 43.5 - ((normDepth - 16) / 58) * 25.5;
        }

        const eventsInfo = getPlayerEventBadges(player);

        list.push({
          player,
          x: pitchX,
          y: pitchY,
          roleAbbr,
          isHome: true,
          goals: eventsInfo.goals,
          goalMinutes: eventsInfo.goalMinutes,
          yellowCards: eventsInfo.yellowCards,
          redCards: eventsInfo.redCards,
          isSubbedOut: Boolean(player.subbedOut),
          isSubbedIn: Boolean(player.subbedIn),
          subClock: player.subClock || eventsInfo.subClock,
        });
      });
    }

    // 2. ĐỘI KHÁCH (Away - Nửa sân bên PHẢI)
    if (awayStarters.length > 0) {
      const awayCoords = calculateTacticalCoordinates(
        awayStarters,
        awayTeam.formation
      );

      awayCoords.forEach(({ player, x, y, roleAbbr }) => {
        const isGK =
          roleAbbr === "GK" ||
          Boolean(player.position && /goalkeeper|gk|thủ môn|thủ thành/i.test(player.position)) ||
          player.formationPlace === 1;

        let pitchX: number;
        let pitchY: number;

        if (isGK) {
          pitchX = 92.5;
          pitchY = 50;
        } else {
          // Đảo cánh đối xứng theo góc nhìn truyền hình
          pitchY = 16 + ((100 - x) / 100) * 68;

          // Trục X của sân ngang: độ sâu từ tiền đạo (56.5%) đến hậu vệ (82%)
          const normDepth = Math.max(16, Math.min(74, y));
          pitchX = 56.5 + ((normDepth - 16) / 58) * 25.5;
        }

        const eventsInfo = getPlayerEventBadges(player);

        list.push({
          player,
          x: pitchX,
          y: pitchY,
          roleAbbr,
          isHome: false,
          goals: eventsInfo.goals,
          goalMinutes: eventsInfo.goalMinutes,
          yellowCards: eventsInfo.yellowCards,
          redCards: eventsInfo.redCards,
          isSubbedOut: Boolean(player.subbedOut),
          isSubbedIn: Boolean(player.subbedIn),
          subClock: player.subClock || eventsInfo.subClock,
        });
      });
    }

    return list;
  }, [homeStarters, awayStarters, homeTeam.formation, awayTeam.formation, getPlayerEventBadges]);

  const handlePlayerClick = (p: MatchRosterPlayer, isHome: boolean) => {
    // Không mở modal trên điện thoại theo yêu cầu người dùng
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return;
    }
    if (selectedPlayer?.player.id === p.id) {
      setSelectedPlayer(null);
    } else {
      setSelectedPlayer({ player: p, isHome });
      onSelectPlayer?.(p, isHome);
    }
  };

  const currentTeam = mobileTeamTab === "home" ? homeTeam : awayTeam;
  const currentStarters = mobileTeamTab === "home" ? homeStarters : awayStarters;
  const currentBench = mobileTeamTab === "home" ? homeBench : awayBench;
  const isCurrentHome = mobileTeamTab === "home";

  return (
    <div className="w-full space-y-3.5">
      {/* 1. CHẾ ĐỘ HIỂN THỊ DANH SÁCH TRÊN ĐIỆN THOẠI (MOBILE LIST VIEW - KHÔNG MODAL, KHÔNG CLICK) */}
      <div className="block md:hidden space-y-3">
        {/* THANH CHUYỂN ĐỔI 2 ĐỘI BÓNG */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-900/90 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileTeamTab("home")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs transition cursor-pointer whitespace-nowrap min-w-0 ${
              mobileTeamTab === "home"
                ? "bg-[#dc2626] text-white font-black shadow-md"
                : "text-zinc-400 hover:text-white font-semibold"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white shrink-0" />
            <span className="truncate">{homeTeam.displayName}</span>
            {homeTeam.formation && (
              <span className="font-sans tabular-nums text-[10px] opacity-85 shrink-0">
                ({homeTeam.formation})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTeamTab("away")}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs transition cursor-pointer whitespace-nowrap min-w-0 ${
              mobileTeamTab === "away"
                ? "bg-[#0284c7] text-white font-black shadow-md"
                : "text-zinc-400 hover:text-white font-semibold"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white shrink-0" />
            <span className="truncate">{awayTeam.displayName}</span>
            {awayTeam.formation && (
              <span className="font-sans tabular-nums text-[10px] opacity-85 shrink-0">
                ({awayTeam.formation})
              </span>
            )}
          </button>
        </div>

        {/* DANH SÁCH ĐỘI HÌNH CHÍNH (STARTERS) */}
        <div className="rounded-2xl bg-zinc-950/80 p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between pb-1 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCurrentHome ? "bg-[#dc2626]" : "bg-[#0284c7]"}`} />
              <span>Đội hình xuất phát</span>
            </span>
            <span className="font-sans tabular-nums font-bold text-zinc-400 text-[11px]">
              {currentStarters.length} cầu thủ
            </span>
          </div>

          <div className="space-y-1">
            {currentStarters.map((player) => {
              const eventsInfo = getPlayerEventBadges(player);
              const isGK =
                Boolean(player.position && /goalkeeper|gk|thủ môn|thủ thành/i.test(player.position)) ||
                player.formationPlace === 1;

              return (
                <div
                  key={`m-starter-${player.id}`}
                  className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] select-none pointer-events-none cursor-default"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-sans font-black tabular-nums text-xs shrink-0 shadow-sm ${
                        isGK
                          ? "bg-amber-500/20 text-amber-300"
                          : isCurrentHome
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      {player.jersey || (isGK ? "1" : "-")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white font-bold text-xs truncate font-sans">
                          {player.displayName || player.name}
                        </span>
                        {player.captain && (
                          <span
                            className="w-3.5 h-3.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[8px] flex items-center justify-center shrink-0"
                            title="Đội trưởng"
                          >
                            C
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-sans block truncate">
                        {translatePosition(player.position)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {eventsInfo.goals > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 text-[10px] font-bold font-sans">
                        <SoccerBallIcon className="w-3 h-3" />
                        {eventsInfo.goalMinutes.length > 0 && (
                          <span className="tabular-nums">{eventsInfo.goalMinutes.join("', ")}&apos;</span>
                        )}
                      </span>
                    )}
                    {eventsInfo.yellowCards > 0 && <YellowCardIcon className="w-2.5 h-3.5" />}
                    {eventsInfo.redCards > 0 && <RedCardIcon className="w-2.5 h-3.5" />}
                    {player.subbedOut && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[9.5px] font-bold font-sans">
                        <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>{player.subClock ? `${player.subClock}'` : "Ra sân"}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* DANH SÁCH DỰ BỊ (BENCH) */}
        <div className="rounded-2xl bg-zinc-950/80 p-3 space-y-2 shadow-sm">
          <div className="flex items-center justify-between pb-1 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span>Dự bị</span>
            </span>
            <span className="font-sans tabular-nums font-bold text-zinc-400 text-[11px]">
              {currentBench.length} cầu thủ
            </span>
          </div>

          {currentBench.length === 0 ? (
            <p className="text-xs text-zinc-500 py-3 text-center font-sans">Chưa có danh sách dự bị</p>
          ) : (
            <div className="space-y-1">
              {currentBench.map((player) => {
                const eventsInfo = getPlayerEventBadges(player);

                return (
                  <div
                    key={`m-bench-${player.id}`}
                    className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] select-none pointer-events-none cursor-default"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-sans font-bold tabular-nums text-xs shrink-0 shadow-sm">
                        {player.jersey || "-"}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-zinc-200 font-semibold text-xs truncate font-sans">
                            {player.displayName || player.name}
                          </span>
                          {player.captain && (
                            <span className="text-[9px] font-bold text-amber-400">
                              (C)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-sans block truncate">
                          {translatePosition(player.position)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {eventsInfo.goals > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 text-[10px] font-bold font-sans">
                          <SoccerBallIcon className="w-3 h-3" />
                        </span>
                      )}
                      {eventsInfo.yellowCards > 0 && <YellowCardIcon className="w-2.5 h-3.5" />}
                      {eventsInfo.redCards > 0 && <RedCardIcon className="w-2.5 h-3.5" />}
                      {player.subbedIn && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9.5px] font-bold font-sans">
                          <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                          <span>Vào sân {player.subClock ? `(${player.subClock}')` : ""}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* THÔNG TIN HLV (NẾU CÓ) */}
        {currentTeam.coach && (
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-900/40 text-xs font-sans">
            <span className="text-zinc-400">Huấn luyện viên trưởng:</span>
            <span className="font-bold text-white truncate max-w-[200px]">{currentTeam.coach}</span>
          </div>
        )}
      </div>

      {/* 2. BỐ CỤC SA BÀN SÂN CỎ TOÀN CẢNH TRÊN DESKTOP (HORIZONTAL PITCH) */}
      <div className="hidden md:block space-y-3.5">
        {/* 1. THANH TIÊU ĐỀ BROADCAST: TÊN 2 ĐỘI, SƠ ĐỒ CHIẾN THUẬT & SỐ CẦU THỦ XUẤT PHÁT */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-zinc-900/60 shadow-sm">
        {/* Đội nhà (Trái) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-white font-bold text-xs sm:text-sm truncate font-sans">
                {homeTeam.displayName}
              </span>
              {homeTeam.formation && (
                <span className="font-sans tabular-nums text-[10px] font-bold bg-rose-500/15 text-rose-300 px-1.5 py-0.2 rounded shrink-0">
                  {homeTeam.formation}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-sans mt-0.5">
              <span>{homeStarters.length || 11} chính thức</span>
              {homeTeam.coach && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">HLV: {homeTeam.coach}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Ngăn cách tinh tế giữa 2 đội */}
        <div className="px-3 shrink-0 flex items-center justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
        </div>

        {/* Đội khách (Phải) */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 justify-end flex-wrap">
              {awayTeam.formation && (
                <span className="font-sans tabular-nums text-[10px] font-bold bg-sky-500/15 text-sky-300 px-1.5 py-0.2 rounded shrink-0">
                  {awayTeam.formation}
                </span>
              )}
              <span className="text-white font-bold text-xs sm:text-sm truncate font-sans">
                {awayTeam.displayName}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] text-zinc-400 font-sans mt-0.5">
              {awayTeam.coach && (
                <>
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">HLV: {awayTeam.coach}</span>
                  <span>•</span>
                </>
              )}
              <span>{awayStarters.length || 11} chính thức</span>
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] shrink-0" />
        </div>
      </div>

      {/* 2. SÂN CỎ BÓNG ĐÁ BROADCAST CHÂU ÂU (TỰ NHIÊN, KHÔNG NEON, KHÔNG GLOW CHÓI) */}
      <div className="w-full overflow-x-auto scrollbar-none touch-pan-x">
        <div
          style={{
            background: "linear-gradient(180deg, #0e271a 0%, #0a1e13 100%)",
          }}
          className="relative w-full min-w-[540px] aspect-[16/10] select-none overflow-hidden rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
        >
          {/* Dải vân cỏ nhung cắt sọc dọc cực kỳ mờ, êm và tự nhiên (chỉ 2.5% opacity) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 34px, transparent 34px, transparent 68px)",
            }}
          />

          {/* Vạch kẻ sân bóng đá ngang tinh tế, mảnh dẻ, không chói lóa */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none p-2 sm:p-3"
            viewBox="0 0 160 100"
            preserveAspectRatio="none"
          >
            {/* Vạch biên bao quanh sân (vuông góc 90° chuẩn luật bóng đá FIFA) */}
            <rect
              x="4"
              y="4"
              width="152"
              height="92"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />

            {/* Vạch giữa sân */}
            <line
              x1="80"
              y1="4"
              x2="80"
              y2="96"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />

            {/* Vòng tròn trung tâm & Điểm giao bóng */}
            <circle
              cx="80"
              cy="50"
              r="13.5"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />
            <circle cx="80" cy="50" r="0.9" fill="rgba(255,255,255,0.6)" />

            {/* Khung thành nhô nhẹ ngoài biên trái */}
            <rect
              x="1.8"
              y="42.5"
              width="2.2"
              height="15"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="0.6"
            />

            {/* Khung thành nhô nhẹ ngoài biên phải */}
            <rect
              x="156"
              y="42.5"
              width="2.2"
              height="15"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="0.6"
            />

            {/* KHU VỰC CẦU MÔN ĐỘI NHÀ (BÊN TRÁI) */}
            <rect
              x="4"
              y="24"
              width="24"
              height="52"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />
            <rect
              x="4"
              y="36"
              width="9"
              height="28"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />
            <circle cx="18" cy="50" r="0.8" fill="rgba(255,255,255,0.6)" />
            <path
              d="M 28 38 A 12 12 0 0 1 28 62"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />

            {/* KHU VỰC CẦU MÔN ĐỘI KHÁCH (BÊN PHẢI) */}
            <rect
              x="132"
              y="24"
              width="24"
              height="52"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />
            <rect
              x="147"
              y="36"
              width="9"
              height="28"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />
            <circle cx="142" cy="50" r="0.8" fill="rgba(255,255,255,0.6)" />
            <path
              d="M 132 38 A 12 12 0 0 0 132 62"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="0.65"
            />

            {/* 4 Cung phạt góc (uốn cong mượt mà 90° vào trong sân từ 4 cột cờ góc) */}
            <path d="M 4 8 A 4 4 0 0 0 8 4" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
            <path d="M 152 4 A 4 4 0 0 0 156 8" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
            <path d="M 156 92 A 4 4 0 0 0 152 96" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
            <path d="M 8 96 A 4 4 0 0 0 4 92" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
          </svg>

          {/* 22 CẦU THỦ TRÊN SÂN NẰM NGANG (MODERN BROADCAST MARKERS) */}
          {horizontalPositionedPlayers.map(
            ({ player, x, y, roleAbbr, isHome, goals, yellowCards, redCards, isSubbedOut }) => {
              const shortName = getShortDisplayName(
                player,
                isHome ? homeStarters : awayStarters
              );
              const isGK =
                roleAbbr === "GK" ||
                Boolean(player.position && /goalkeeper|gk|thủ môn|thủ thành/i.test(player.position)) ||
                player.formationPlace === 1;

              const isSelected = selectedPlayer?.player.id === player.id;
              const isCaptain = Boolean(player.captain);

              return (
                <button
                  key={`${isHome ? "h" : "a"}-${player.id}`}
                  type="button"
                  onClick={() => handlePlayerClick(player, isHome)}
                  title={`${player.jersey ? `#${player.jersey} ` : ""}${player.displayName}${isCaptain ? " (Đội trưởng)" : ""} (${player.position})`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform duration-150 focus:outline-none ${
                    isSelected ? "scale-115 z-30" : "hover:scale-110 z-10"
                  }`}
                >
                  {/* Marker cầu thủ tròn gọn gàng, phẳng sạch chuẩn broadcast */}
                  <div className="relative">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-sans font-black tabular-nums text-[11px] sm:text-xs md:text-[13px] shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition-all ${
                        isGK
                          ? "bg-[#d97706] text-zinc-950"
                          : isHome
                            ? "bg-[#dc2626] text-white"
                            : "bg-[#0284c7] text-white"
                      } ${isSelected ? "scale-115 drop-shadow-[0_0_12px_rgba(255,255,255,0.45)]" : ""}`}
                    >
                      {player.jersey || (isGK ? "1" : "-")}
                    </div>

                    {/* 1. Huy hiệu Đội trưởng 'C' (Góc TRÊN TRÁI nếu không rời sân) */}
                    {isCaptain && !isSubbedOut && (
                      <span
                        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[8px] flex items-center justify-center shadow-sm z-20"
                        title="Đội trưởng"
                      >
                        C
                      </span>
                    )}

                    {/* 2. Huy hiệu rời sân thay ra (Mũi tên đỏ góc TRÊN TRÁI) */}
                    {isSubbedOut && (
                      <span
                        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm z-20"
                        title="Đã rời sân"
                      >
                        <ArrowDownLeft className="w-2 h-2 stroke-[2.5]" />
                      </span>
                    )}

                    {/* 3. Huy hiệu bàn thắng ⚽ (Góc TRÊN PHẢI) */}
                    {goals > 0 && (
                      <span
                        className="absolute -top-1 -right-1 flex items-center z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                        title={`${goals} bàn thắng`}
                      >
                        <SoccerBallIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        {goals > 1 && (
                          <span className="ml-0.5 -mt-1 px-1 rounded-full bg-amber-400 text-zinc-950 text-[8px] font-black font-sans tabular-nums leading-tight shadow-sm">
                            {goals}
                          </span>
                        )}
                      </span>
                    )}

                    {/* 4. Huy hiệu thẻ phạt (Góc DƯỚI PHẢI) */}
                    {redCards > 0 ? (
                      <span className="absolute -bottom-1 -right-1 shadow-sm z-20">
                        <RedCardIcon className="w-2 h-3" />
                      </span>
                    ) : yellowCards > 0 ? (
                      <span className="absolute -bottom-1 -right-1 shadow-sm z-20">
                        <YellowCardIcon className="w-2 h-3" />
                      </span>
                    ) : null}
                  </div>

                  {/* Tên cầu thủ dưới marker: font-sans nét gọn, bọc capsule mờ không border */}
                  <span
                    className={`mt-1 font-sans text-[9.5px] sm:text-[10px] md:text-[10.5px] font-semibold text-center leading-tight truncate max-w-[66px] sm:max-w-[80px] px-1.5 py-0.5 rounded transition shadow-sm ${
                      isSelected
                        ? "bg-amber-400 text-zinc-950 font-bold"
                        : "bg-black/60 backdrop-blur-xs text-zinc-100 group-hover:text-white"
                    }`}
                  >
                    {shortName}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* 3. DANH SÁCH CẦU THỦ DỰ BỊ PHÍA DƯỚI SA BÀN (CĂN CỘT THẲNG HÀNG 100%, KHÔNG THÒ THỤT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* CỘT DỰ BỊ ĐỘI NHÀ */}
        <div className="rounded-2xl bg-zinc-950/80 p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="flex items-center justify-between pb-2.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#dc2626] shrink-0" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider truncate font-sans">
                Dự bị: {homeTeam.displayName}
              </h5>
            </div>
            <span className="text-xs font-sans tabular-nums font-bold text-zinc-400 shrink-0">
              ({homeBench.length})
            </span>
          </div>

          {homeBench.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center font-sans">Chưa có danh sách dự bị</p>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[320px] pr-1 scrollbar-thin">
              {homeBench.map((p) => {
                const eventsInfo = getPlayerEventBadges(p);
                const isSelected = selectedPlayer?.player.id === p.id;
                const isCaptain = Boolean(p.captain);
                return (
                  <button
                    key={`hb-${p.id}`}
                    type="button"
                    onClick={() => handlePlayerClick(p, true)}
                    className={`w-full flex items-center px-2 py-1.5 rounded-xl transition text-left cursor-pointer group ${
                      isSelected
                        ? "bg-rose-500/20 text-white"
                        : "bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300"
                    }`}
                  >
                    {/* Cột 1: Số áo cố định w-6 */}
                    <span className="w-6 h-6 rounded-lg bg-rose-500/15 text-rose-300 flex items-center justify-center font-sans font-bold tabular-nums text-xs shrink-0 mr-2">
                      {p.jersey || "-"}
                    </span>

                    {/* Cột 2: Tên & Vị trí flex-1 */}
                    <div className="min-w-0 flex-1 pr-2 truncate">
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate font-sans leading-snug">
                        {p.displayName || p.name}
                        {isCaptain && (
                          <span className="text-[10px] font-bold text-amber-400 ml-1">(C)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate font-sans leading-snug">
                        {translatePosition(p.position)}
                      </p>
                    </div>

                    {/* Cột 3: Cột Sự kiện (Bàn thắng & Thẻ phạt) cố định w-12 */}
                    <div className="w-12 shrink-0 flex items-center justify-center gap-1.5">
                      {eventsInfo.goals > 0 && (
                        <span title={`${eventsInfo.goals} Bàn thắng`}>
                          <SoccerBallIcon className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      )}
                      {eventsInfo.yellowCards > 0 && <YellowCardIcon className="shrink-0" />}
                      {eventsInfo.redCards > 0 && <RedCardIcon className="shrink-0" />}
                    </div>

                    {/* Cột 4: Cột Trạng thái Vào Sân cố định w-20 căn phải */}
                    <div className="w-20 shrink-0 flex items-center justify-end">
                      {p.subbedIn && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-sans text-[10px] font-bold shrink-0">
                          <ArrowUpRight className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                          <span>Vào sân</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT DỰ BỊ ĐỘI KHÁCH */}
        <div className="rounded-2xl bg-zinc-950/80 p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-sm">
          <div className="flex items-center justify-between pb-2.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#0284c7] shrink-0" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider truncate font-sans">
                Dự bị: {awayTeam.displayName}
              </h5>
            </div>
            <span className="text-xs font-sans tabular-nums font-bold text-zinc-400 shrink-0">
              ({awayBench.length})
            </span>
          </div>

          {awayBench.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center font-sans">Chưa có danh sách dự bị</p>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[320px] pr-1 scrollbar-thin">
              {awayBench.map((p) => {
                const eventsInfo = getPlayerEventBadges(p);
                const isSelected = selectedPlayer?.player.id === p.id;
                const isCaptain = Boolean(p.captain);
                return (
                  <button
                    key={`ab-${p.id}`}
                    type="button"
                    onClick={() => handlePlayerClick(p, false)}
                    className={`w-full flex items-center px-2 py-1.5 rounded-xl transition text-left cursor-pointer group ${
                      isSelected
                        ? "bg-sky-500/20 text-white"
                        : "bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300"
                    }`}
                  >
                    {/* Cột 1: Số áo cố định w-6 */}
                    <span className="w-6 h-6 rounded-lg bg-sky-500/15 text-sky-300 flex items-center justify-center font-sans font-bold tabular-nums text-xs shrink-0 mr-2">
                      {p.jersey || "-"}
                    </span>

                    {/* Cột 2: Tên & Vị trí flex-1 */}
                    <div className="min-w-0 flex-1 pr-2 truncate">
                      <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate font-sans leading-snug">
                        {p.displayName || p.name}
                        {isCaptain && (
                          <span className="text-[10px] font-bold text-amber-400 ml-1">(C)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate font-sans leading-snug">
                        {translatePosition(p.position)}
                      </p>
                    </div>

                    {/* Cột 3: Cột Sự kiện (Bàn thắng & Thẻ phạt) cố định w-12 */}
                    <div className="w-12 shrink-0 flex items-center justify-center gap-1.5">
                      {eventsInfo.goals > 0 && (
                        <span title={`${eventsInfo.goals} Bàn thắng`}>
                          <SoccerBallIcon className="w-3.5 h-3.5 shrink-0" />
                        </span>
                      )}
                      {eventsInfo.yellowCards > 0 && <YellowCardIcon className="shrink-0" />}
                      {eventsInfo.redCards > 0 && <RedCardIcon className="shrink-0" />}
                    </div>

                    {/* Cột 4: Cột Trạng thái Vào Sân cố định w-20 căn phải */}
                    <div className="w-20 shrink-0 flex items-center justify-end">
                      {p.subbedIn && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-sans text-[10px] font-bold shrink-0">
                          <ArrowUpRight className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                          <span>Vào sân</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* ĐÓNG BỐ CỤC DESKTOP */}
      </div>

      {/* 4. MODAL THÔNG TIN CẦU THỦ ĐẲNG CẤP STUDIO THỂ THAO */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer.player}
          isHome={selectedPlayer.isHome}
          teamName={selectedPlayer.isHome ? homeTeam.displayName : awayTeam.displayName}
          onClose={() => setSelectedPlayer(null)}
          eventsInfo={getPlayerEventBadges(selectedPlayer.player)}
          matchClock={matchClock}
          matchStatus={matchStatus}
        />
      )}
    </div>
  );
};

/**
 * Modal hiển thị thông tin chi tiết cầu thủ chuẩn các web thể thao lớn (FotMob, SofaScore, Flashscore):
 * - Đầy đủ 100% hồ sơ: Quốc tịch, Ngày sinh, Tuổi, Thể hình, Nơi sinh
 * - Đầy đủ 100% thống kê trận đấu (dù có hoặc chưa có ESPN stats thì vẫn tổng hợp trực quan từ sự kiện và vai trò)
 * - Click ra ngoài (Backdrop click) đóng ngay lập tức
 * - Phím ESC đóng ngay lập tức
 * - Nút X bo tròn tinh tế góc trên bên phải
 * - KHÔNG BORDER theo chuẩn Design System của Nanaflix
 */
interface PlayerDetailModalProps {
  player: MatchRosterPlayer;
  isHome: boolean;
  teamName: string;
  onClose: () => void;
  eventsInfo: {
    goals: number;
    goalMinutes: string[];
    yellowCards: number;
    redCards: number;
    subClock?: string;
  };
  matchClock?: string;
  matchStatus?: string;
}

function PlayerDetailModal({
  player,
  isHome,
  teamName,
  onClose,
  eventsInfo,
  matchClock,
  matchStatus,
}: PlayerDetailModalProps) {
  const [profile, setProfile] = useState<AthleteProfile | null>(() => athleteCache.get(player.id) || null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !athleteCache.has(player.id));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let active = true;
    const cached = athleteCache.get(player.id);
    if (cached) {
      setProfile(cached);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    fetch(`/api/live-football/athlete?id=${encodeURIComponent(player.id)}&name=${encodeURIComponent(player.displayName)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        const profileData = json?.data || json;
        if (profileData && profileData.id) {
          athleteCache.set(player.id, profileData);
          setProfile(profileData);
        }
        setLoadingProfile(false);
      })
      .catch(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [player.id, player.displayName]);

  const photoUrl = !imgError && (player.photoUrl || profile?.photoUrl);

  const formatBirthDate = (isoDate?: string): string | null => {
    if (!isoDate) return null;
    const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return `${d}/${m}/${y}`;
    }
    return isoDate;
  };

  // Tính số phút thi đấu ước lượng
  const estimatedMinutes = useMemo(() => {
    if (player.starter) {
      if (player.subbedOut && player.subClock) {
        return player.subClock.replace(/[^0-9+]/g, "") + "'";
      }
      return matchStatus === "finished" ? "90'" : (matchClock || "Đang đá");
    }
    if (player.subbedIn) {
      if (player.subClock) {
        return `Từ phút ${player.subClock}`;
      }
      return "Đã vào sân";
    }
    return "Chưa ra sân";
  }, [player.starter, player.subbedIn, player.subbedOut, player.subClock, matchClock, matchStatus]);

  const hasBio = Boolean(
    profile &&
      (profile.citizenship ||
        profile.dateOfBirth ||
        profile.age ||
        profile.height ||
        profile.weight ||
        profile.birthPlace)
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl rounded-3xl bg-zinc-950/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-5 sm:p-6 cursor-default space-y-4"
      >
        {/* THANH HEADER NGANG: TÊN CẦU THỦ, SỐ ÁO, CLB & NÚT ĐÓNG */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${
                isHome ? "bg-[#dc2626]" : "bg-[#0284c7]"
              }`}
            />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="text-lg sm:text-xl font-black text-white font-sans truncate tracking-tight">
                {player.displayName}
              </h3>
              <span className="font-sans tabular-nums text-xs font-black text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full shrink-0">
                #{player.jersey || "-"}
              </span>
              {player.captain && (
                <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-md font-sans shrink-0">
                  Đội trưởng (C)
                </span>
              )}
              <span className="text-xs text-zinc-500 font-sans hidden sm:inline">•</span>
              <span className="text-xs text-zinc-300 font-semibold font-sans hidden sm:inline">
                {translatePosition(player.position)}
              </span>
              <span className="text-xs text-zinc-500 font-sans hidden sm:inline">•</span>
              <span className={`text-xs font-bold font-sans hidden sm:inline ${isHome ? "text-rose-400" : "text-sky-400"}`}>
                {teamName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thông tin cầu thủ"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BỐ CỤC 3 CỘT THEO CHIỀU NGANG RỘNG (LANDSCAPE 3-COLUMN STUDIO LAYOUT) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* CỘT 1 (4 CỘT / 12): ẢNH CHÂN DUNG & HỒ SƠ CÁ NHÂN */}
          <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
            {/* Ảnh đại diện & Thông tin vai trò */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden flex items-center justify-center font-sans font-black tabular-nums text-xl shrink-0 shadow-lg ${
                  isHome
                    ? "bg-gradient-to-br from-rose-600 to-red-950 text-white"
                    : "bg-gradient-to-br from-sky-500 to-sky-950 text-white"
                }`}
              >
                {photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoUrl}
                    alt={player.displayName}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="flex flex-col items-center">
                    <span>#{player.jersey || "-"}</span>
                    <span className="text-[10px] font-bold opacity-75">
                      {player.position ? player.position.slice(0, 3).toUpperCase() : ""}
                    </span>
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white font-sans truncate">
                  {translatePosition(player.position)}
                </p>
                <p className={`text-[11px] font-bold font-sans truncate mt-0.5 ${isHome ? "text-rose-400" : "text-sky-400"}`}>
                  {teamName}
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans ${
                      player.starter
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {player.starter ? "Đá chính" : "Dự bị"}
                  </span>
                  {player.subbedIn && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                      <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                      <span>Vào sân {player.subClock ? `(${player.subClock})` : ""}</span>
                    </span>
                  )}
                  {player.subbedOut && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                      <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" />
                      <span>Rời sân {player.subClock ? `(${player.subClock})` : ""}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Chi tiết tiểu sử (Quốc tịch, Ngày sinh, Thể hình, Nơi sinh) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1">
                <Users className="w-3 h-3 text-sky-400" />
                <span>Hồ sơ tuyển thủ</span>
              </span>

              {loadingProfile ? (
                <div className="grid grid-cols-2 gap-1.5 animate-pulse">
                  <div className="h-10 bg-white/5 rounded-xl" />
                  <div className="h-10 bg-white/5 rounded-xl" />
                </div>
              ) : hasBio && profile ? (
                <div className="grid grid-cols-2 gap-1.5 text-xs font-sans">
                  {profile.citizenship && (
                    <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
                      <span className="text-[9.5px] text-zinc-400">Quốc tịch</span>
                      <div className="flex items-center gap-1.5 font-bold text-white truncate text-[11px]">
                        {profile.flagUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={profile.flagUrl} alt={profile.citizenship} className="w-3.5 h-2.5 object-cover rounded-xs shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                        )}
                        <span className="truncate">{profile.citizenship}</span>
                      </div>
                    </div>
                  )}

                  {profile.dateOfBirth && (
                    <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
                      <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                        <span>Ngày sinh / Tuổi</span>
                      </span>
                      <span className="font-bold text-white truncate tabular-nums text-[11px]">
                        {formatBirthDate(profile.dateOfBirth)}
                        {profile.age ? ` (${profile.age}t)` : ""}
                      </span>
                    </div>
                  )}

                  {(profile.height || profile.weight) && (
                    <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
                      <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                        <Ruler className="w-2.5 h-2.5 text-zinc-400" />
                        <span>Thể hình</span>
                      </span>
                      <span className="font-bold text-white truncate tabular-nums text-[11px]">
                        {profile.height || "-"} • {profile.weight || "-"}
                      </span>
                    </div>
                  )}

                  {profile.birthPlace && (
                    <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
                      <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-zinc-400" />
                        <span>Nơi sinh</span>
                      </span>
                      <span className="font-bold text-white truncate text-[11px]">
                        {profile.birthPlace}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-black/40 text-[11px] text-zinc-400">
                  <span>CLB: <strong className="text-white">{teamName}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* CỘT 2 (4 CỘT / 12): HIỆU SUẤT TRONG TRẬN ĐẤU */}
          <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-netflix-red" />
              <span>Hiệu suất trong trận đấu</span>
            </span>

            {/* 3 Thẻ chỉ số trọng tâm */}
            <div className="grid grid-cols-3 gap-2 text-xs font-sans">
              <div className="p-2.5 rounded-xl bg-black/40 flex flex-col gap-1">
                <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>Thời gian</span>
                </span>
                <span className="font-bold text-white tabular-nums text-sm truncate">
                  {estimatedMinutes}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 flex flex-col gap-1">
                <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                  <SoccerBallIcon className="w-3 h-3" />
                  <span>Bàn thắng</span>
                </span>
                <span className="font-bold text-white tabular-nums text-sm">
                  {eventsInfo.goals > 0 ? (
                    <span className="text-amber-300 font-black">
                      {eventsInfo.goals}
                    </span>
                  ) : (
                    "0"
                  )}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 flex flex-col gap-1">
                <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-zinc-400" />
                  <span>Thẻ phạt</span>
                </span>
                <div className="flex items-center gap-1 font-bold text-white text-sm">
                  {eventsInfo.redCards > 0 ? (
                    <span className="inline-flex items-center gap-1 text-rose-400 text-xs">
                      <RedCardIcon className="w-2.5 h-3.5" />
                      <span>Đỏ</span>
                    </span>
                  ) : eventsInfo.yellowCards > 0 ? (
                    <span className="inline-flex items-center gap-1 text-amber-300 text-xs">
                      <YellowCardIcon className="w-2.5 h-3.5" />
                      <span>{eventsInfo.yellowCards} Vàng</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-normal text-xs">0</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bàn thắng chi tiết nếu có */}
            {eventsInfo.goalMinutes.length > 0 && (
              <div className="p-2 rounded-xl bg-amber-400/10 text-amber-300 text-xs flex items-center gap-2 font-sans">
                <SoccerBallIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Ghi bàn phút: <strong className="tabular-nums font-black">{eventsInfo.goalMinutes.join("', ")}&apos;</strong></span>
              </div>
            )}

            {/* Dòng tóm tắt trạng thái */}
            <div className="p-2.5 rounded-xl bg-black/40 text-[11px] text-zinc-300 font-sans flex items-center justify-between">
              <span className="text-zinc-400">Trạng thái thi đấu:</span>
              <span className="font-bold text-white">
                {player.starter
                  ? (player.subbedOut ? `Đá chính (Ra phút ${player.subClock || ""})` : "Đang đá chính")
                  : (player.subbedIn ? `Vào sân (Phút ${player.subClock || ""})` : "Dự bị chưa vào sân")}
              </span>
            </div>
          </div>

          {/* CỘT 3 (4 CỘT / 12): CHỈ SỐ CHI TIẾT TRẬN ĐẤU TỪ ESPN */}
          <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Chỉ số chi tiết trận đấu</span>
              </div>
              <span className="text-[9.5px] font-sans text-zinc-500">ESPN Core</span>
            </div>

            {player.stats && player.stats.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5 max-h-[175px] overflow-y-auto pr-1 scrollbar-thin">
                {player.stats.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-black/40 flex items-center justify-between gap-1 text-xs"
                  >
                    <span className="text-[10.5px] text-zinc-400 truncate leading-tight pr-1">
                      {translateStatName(st.displayName)}
                    </span>
                    <span className="font-sans font-bold tabular-nums text-xs text-white leading-tight shrink-0">
                      {st.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center text-zinc-500 text-xs italic font-sans">
                <span>{matchStatus === "scheduled" ? "Sẽ cập nhật khi trận đấu bắt đầu" : "Chưa có thêm chỉ số chi tiết"}</span>
              </div>
            )}

            {/* Nút đóng nhanh */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer font-sans"
            >
              Đóng (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DualTeamPitch;
