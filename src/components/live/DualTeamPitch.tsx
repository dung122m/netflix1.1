"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ArrowDownLeft } from "lucide-react";
import { MatchRosterPlayer, MatchKeyEvent } from "@/services/live/football-score/types";
import { SoccerBallIcon } from "./MatchTimelineSidebar";
import { getShortDisplayName } from "./lineup/tacticalMath";
import {
  TeamInfo,
  buildPlayerEventsMap,
  getPlayerEventBadges,
  calculateDualPitchPlayers,
} from "./lineup/dualPitchMath";
import { YellowCardIcon, RedCardIcon } from "./lineup/PitchEventIcons";
import { DualMobileRosterView } from "./lineup/DualMobileRosterView";
import { DualBenchColumn } from "./lineup/DualBenchColumn";
import { PlayerDetailModal } from "./lineup/PlayerDetailModal";

export interface DualTeamPitchProps {
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

  const playerEventsMap = useMemo(() => buildPlayerEventsMap(events), [events]);

  const resolvePlayerEventBadges = useCallback(
    (player: MatchRosterPlayer) => getPlayerEventBadges(player, playerEventsMap),
    [playerEventsMap]
  );

  // Tính tọa độ chiến thuật cho SÂN CỎ NẰM NGANG (Horizontal Pitch)
  const horizontalPositionedPlayers = useMemo(
    () =>
      calculateDualPitchPlayers({
        homeTeam,
        awayTeam,
        homeStarters,
        awayStarters,
        playerEventsMap,
      }),
    [homeTeam, awayTeam, homeStarters, awayStarters, playerEventsMap]
  );

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

  return (
    <div className="w-full space-y-3.5">
      {/* 1. CHẾ ĐỘ HIỂN THỊ DANH SÁCH TRÊN ĐIỆN THOẠI (MOBILE LIST VIEW - KHÔNG MODAL, KHÔNG CLICK) */}
      <DualMobileRosterView
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeStarters={homeStarters}
        homeBench={homeBench}
        awayStarters={awayStarters}
        awayBench={awayBench}
        mobileTeamTab={mobileTeamTab}
        onChangeTab={setMobileTeamTab}
        getPlayerEventBadges={resolvePlayerEventBadges}
      />

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
                  <span className="font-sans tabular-nums text-[10px] font-bold bg-rose-500/15 text-rose-300 px-1.5 py-0.5 rounded shrink-0">
                    {homeTeam.formation}
                  </span>
                )}
              </div>
              {homeTeam.coach && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-sans mt-0.5">
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">HLV: {homeTeam.coach}</span>
                </div>
              )}
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
                  <span className="font-sans tabular-nums text-[10px] font-bold bg-sky-500/15 text-sky-300 px-1.5 py-0.5 rounded shrink-0">
                    {awayTeam.formation}
                  </span>
                )}
                <span className="text-white font-bold text-xs sm:text-sm truncate font-sans">
                  {awayTeam.displayName}
                </span>
              </div>
              {awayTeam.coach && (
                <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-400 font-sans mt-0.5">
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">HLV: {awayTeam.coach}</span>
                </div>
              )}
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] shrink-0" />
          </div>
        </div>

        {/* 2. SÂN CỎ BÓNG ĐÁ BROADCAST CHÂU ÂU (TỰ NHIÊN, KHÔNG NEON, KHÔNG GLOW CHÓI) */}
        <div className="w-full overflow-x-auto scrollbar-none touch-pan-x touch-pan-y">
          <div
            style={{
              background: "linear-gradient(180deg, #0e271a 0%, #0a1e13 100%)",
            }}
            className="relative w-full min-w-[540px] aspect-[16/10] select-none overflow-hidden rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)]"
          >
            {/* Dải vân cỏ nhung cắt sọc dọc cực kỳ mờ, êm và tự nhiên */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 34px, transparent 34px, transparent 68px)",
              }}
            />

            {/* Vạch kẻ sân bóng đá ngang tinh tế */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none p-2 sm:p-3"
              viewBox="0 0 160 100"
              preserveAspectRatio="none"
            >
              <rect x="4" y="4" width="152" height="92" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <line x1="80" y1="4" x2="80" y2="96" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <circle cx="80" cy="50" r="13.5" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <circle cx="80" cy="50" r="0.9" fill="rgba(255,255,255,0.6)" />

              {/* Khung thành trái & phải */}
              <rect x="1.8" y="42.5" width="2.2" height="15" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
              <rect x="156" y="42.5" width="2.2" height="15" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />

              {/* Khu vực cầu môn đội nhà (Trái) */}
              <rect x="4" y="24" width="24" height="52" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <rect x="4" y="36" width="9" height="28" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <circle cx="18" cy="50" r="0.8" fill="rgba(255,255,255,0.6)" />
              <path d="M 28 38 A 12 12 0 0 1 28 62" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />

              {/* Khu vực cầu môn đội khách (Phải) */}
              <rect x="132" y="24" width="24" height="52" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <rect x="147" y="36" width="9" height="28" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <circle cx="142" cy="50" r="0.8" fill="rgba(255,255,255,0.6)" />
              <path d="M 132 38 A 12 12 0 0 0 132 62" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />

              {/* 4 Cung phạt góc */}
              <path d="M 4 8 A 4 4 0 0 0 8 4" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <path d="M 152 4 A 4 4 0 0 0 156 8" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <path d="M 156 92 A 4 4 0 0 0 152 96" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
              <path d="M 8 96 A 4 4 0 0 0 4 92" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.65" />
            </svg>

            {/* 22 CẦU THỦ TRÊN SÂN NẰM NGANG (MODERN BROADCAST MARKERS) */}
            {horizontalPositionedPlayers.map(
              ({ player, x, y, roleAbbr, isHome, goals, yellowCards, redCards, isSubbedOut }) => {
                const shortName = getShortDisplayName(player, isHome ? homeStarters : awayStarters);
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
                    aria-label={`${player.jersey ? `#${player.jersey} ` : ""}${player.displayName}${isCaptain ? " (Đội trưởng)" : ""} (${player.position})`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-transform duration-150 focus:outline-none ${
                      isSelected ? "scale-115 z-30" : "hover:scale-110 z-10"
                    }`}
                  >
                    <div className="relative">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-sans font-black tabular-nums text-[11px] sm:text-xs md:text-[13px] shadow-[0_2px_6px_rgba(0,0,0,0.5)] transition-all ${
                          isGK
                            ? "bg-[#d97706] text-zinc-950"
                            : isHome
                              ? "bg-[#dc2626] text-white"
                              : "bg-[#0284c7] text-white"
                        } ${isSelected ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : ""}`}
                      >
                        {player.jersey || (isGK ? "1" : "-")}
                      </div>

                      {isCaptain && !isSubbedOut && (
                        <span
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[8px] flex items-center justify-center shadow-sm z-20"
                          aria-label="Đội trưởng"
                        >
                          C
                        </span>
                      )}

                      {isSubbedOut && (
                        <span
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-sm z-20"
                          aria-label="Đã rời sân"
                        >
                          <ArrowDownLeft className="w-2 h-2 stroke-[2.5]" />
                        </span>
                      )}

                      {goals > 0 && (
                        <span
                          className="absolute -top-1 -right-1 flex items-center z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                          aria-label={`${goals} bàn thắng`}
                        >
                          <SoccerBallIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {goals > 1 && (
                            <span className="ml-0.5 -mt-1 px-1 rounded-full bg-amber-400 text-zinc-950 text-[8px] font-black font-sans tabular-nums leading-tight shadow-sm">
                              {goals}
                            </span>
                          )}
                        </span>
                      )}

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

                    <span
                      className={`mt-1 font-sans text-[9.5px] sm:text-[10px] md:text-[10.5px] font-semibold text-center leading-tight truncate max-w-[66px] sm:max-w-[80px] transition ${
                        isSelected
                          ? "bg-amber-400 text-zinc-950 font-bold px-1.5 py-0.5 rounded shadow-sm"
                          : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] group-hover:text-amber-200"
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

        {/* 3. DANH SÁCH CẦU THỦ DỰ BỊ PHÍA DƯỚI SA BÀN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <DualBenchColumn
            teamName={homeTeam.displayName}
            bench={homeBench}
            isHome={true}
            selectedPlayerId={selectedPlayer?.player.id}
            onSelectPlayer={handlePlayerClick}
            getPlayerEventBadges={resolvePlayerEventBadges}
          />
          <DualBenchColumn
            teamName={awayTeam.displayName}
            bench={awayBench}
            isHome={false}
            selectedPlayerId={selectedPlayer?.player.id}
            onSelectPlayer={handlePlayerClick}
            getPlayerEventBadges={resolvePlayerEventBadges}
          />
        </div>
      </div>

      {/* 4. MODAL THÔNG TIN CẦU THỦ ĐẲNG CẤP STUDIO THỂ THAO */}
      {selectedPlayer && (
        <PlayerDetailModal
          key={selectedPlayer.player.id}
          player={selectedPlayer.player}
          isHome={selectedPlayer.isHome}
          teamName={selectedPlayer.isHome ? homeTeam.displayName : awayTeam.displayName}
          onClose={() => setSelectedPlayer(null)}
          eventsInfo={resolvePlayerEventBadges(selectedPlayer.player)}
          matchClock={matchClock}
          matchStatus={matchStatus}
        />
      )}
    </div>
  );
};

export default DualTeamPitch;
