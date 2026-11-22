"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { MatchRosterPlayer, MatchKeyEvent } from "@/services/live/football-score/types";
import {
  FotmobSoccerBallIcon,
  FotmobYellowCardIcon,
  FotmobRedCardIcon,
  FotmobCaptainBadge,
  FotmobSubOutIcon,
} from "./icons/FotmobPitchIcons";
import {
  TeamInfo,
  getShortDisplayName,
  buildPlayerEventsMap,
  getPlayerEventBadges,
  calculateDualPitchPlayers,
} from "./lineup/pitchMath";
import { PlayerDetailModal } from "./lineup/PlayerCardModal";
import { DualMobileRosterView, DualBenchColumn } from "./lineup/LineupViews";

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
        {/* 1. THANH TIÊU ĐỀ SA BÀN CHUẨN FOTMOB: LOGO, TÊN ĐỘI & SƠ ĐỒ CHIẾN THUẬT */}
        <div className="flex items-center justify-between py-1.5 px-2 text-xs select-none">
          {/* Đội nhà (Trái) */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {homeTeam.logo ? (
              <img src={homeTeam.logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] shrink-0" />
            )}
            <span className="text-white font-bold text-xs sm:text-sm truncate font-sans">
              {homeTeam.displayName}
            </span>
            {homeTeam.formation && (
              <span className="font-sans tabular-nums text-xs font-semibold text-zinc-300 shrink-0">
                {homeTeam.formation}
              </span>
            )}
          </div>

          {/* Ngăn cách tinh tế giữa 2 đội */}
          <div className="px-3 shrink-0 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
          </div>

          {/* Đội khách (Phải) */}
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
            {awayTeam.formation && (
              <span className="font-sans tabular-nums text-xs font-semibold text-zinc-300 shrink-0">
                {awayTeam.formation}
              </span>
            )}
            <span className="text-white font-bold text-xs sm:text-sm truncate font-sans">
              {awayTeam.displayName}
            </span>
            {awayTeam.logo ? (
              <img src={awayTeam.logo} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] shrink-0" />
            )}
          </div>
        </div>

        {/* 2. SA BÀN SÂN BÓNG ĐÁ CHUẨN FOTMOB (DARK CHARCOAL TỐI HIỆN ĐẠI, ĐƯỜNG KẺ MỜ TINH TẾ) */}
        <div className="w-full overflow-x-auto scrollbar-none touch-pan-x touch-pan-y">
          <div
            style={{
              background: "radial-gradient(ellipse at center, #202226 0%, #151618 100%)",
            }}
            className="relative w-full min-w-[540px] aspect-[16/10] select-none overflow-hidden rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] border border-white/[0.08]"
          >
            {/* Vạch kẻ sân bóng đá ngang chuẩn FotMob */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none p-2 sm:p-3"
              viewBox="0 0 160 100"
              preserveAspectRatio="none"
            >
              <rect x="4" y="4" width="152" height="92" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <line x1="80" y1="4" x2="80" y2="96" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <circle cx="80" cy="50" r="13.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <circle cx="80" cy="50" r="0.75" fill="rgba(255,255,255,0.4)" />

              {/* Khung thành trái & phải */}
              <rect x="1.8" y="42.5" width="2.2" height="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
              <rect x="156" y="42.5" width="2.2" height="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

              {/* Khu vực cầu môn đội nhà (Trái) */}
              <rect x="4" y="24" width="24" height="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <rect x="4" y="36" width="9" height="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <circle cx="18" cy="50" r="0.7" fill="rgba(255,255,255,0.4)" />
              <path d="M 28 38 A 12 12 0 0 1 28 62" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />

              {/* Khu vực cầu môn đội khách (Phải) */}
              <rect x="132" y="24" width="24" height="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <rect x="147" y="36" width="9" height="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <circle cx="142" cy="50" r="0.7" fill="rgba(255,255,255,0.4)" />
              <path d="M 132 38 A 12 12 0 0 0 132 62" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />

              {/* 4 Cung phạt góc */}
              <path d="M 4 8 A 4 4 0 0 0 8 4" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <path d="M 152 4 A 4 4 0 0 0 156 8" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <path d="M 156 92 A 4 4 0 0 0 152 96" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
              <path d="M 8 96 A 4 4 0 0 0 4 92" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.55" />
            </svg>

            {/* 22 CẦU THỦ TRÊN SÂN NẰM NGANG (CHUẨN FOTMOB) */}
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
                      {/* Vòng tròn đại diện cầu thủ: Số áo to rõ ràng ngay giữa thay cho ảnh mặt */}
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-sans font-black tabular-nums text-[11px] sm:text-xs md:text-[13px] shadow-[0_2px_8px_rgba(0,0,0,0.6)] ring-1.5 ring-white/15 transition-all ${
                          isGK
                            ? "bg-[#d97706] text-zinc-950"
                            : isHome
                              ? "bg-[#dc2626] text-white"
                              : "bg-[#0284c7] text-white"
                        } ${isSelected ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : ""} ${
                          isSubbedOut ? "opacity-60 saturate-50" : ""
                        }`}
                      >
                        <span>{player.jersey || (isGK ? "1" : "-")}</span>
                      </div>

                      {/* Huy hiệu Lúc ra sân: Mũi tên đỏ và phút thay ra trên góc trái chuẩn FotMob */}
                      {isSubbedOut && (
                        <span
                          className="absolute -top-3.5 -left-1 flex flex-col items-center z-20 pointer-events-none select-none"
                          aria-label={player.subClock ? `Rời sân phút ${player.subClock}` : "Đã rời sân"}
                          title={player.subClock ? `Rời sân phút ${player.subClock}` : "Đã rời sân"}
                        >
                          {player.subClock && (
                            <span className="text-[8px] sm:text-[8.5px] font-sans font-bold tabular-nums text-zinc-200 leading-none drop-shadow mb-0.5">
                              {player.subClock}&apos;
                            </span>
                          )}
                          <FotmobSubOutIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        </span>
                      )}

                      {/* Huy hiệu Thẻ: Thẻ vàng / đỏ đặt ở bên trái vòng tròn chuẩn FotMob */}
                      {redCards > 0 ? (
                        <span
                          className="absolute top-1/2 -left-2.5 -translate-y-1/2 z-20 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] -rotate-12"
                          aria-label="Thẻ đỏ"
                          title="Thẻ đỏ"
                        >
                          <FotmobRedCardIcon className="w-2.5 h-3.5 sm:w-3 sm:h-4" />
                        </span>
                      ) : yellowCards > 0 ? (
                        <span
                          className="absolute top-1/2 -left-2.5 -translate-y-1/2 z-20 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] -rotate-12 flex items-center"
                          aria-label={yellowCards > 1 ? "2 Thẻ vàng" : "Thẻ vàng"}
                          title={yellowCards > 1 ? "2 Thẻ vàng" : "Thẻ vàng"}
                        >
                          <FotmobYellowCardIcon className="w-2.5 h-3.5 sm:w-3 sm:h-4" />
                          {yellowCards > 1 && (
                            <span className="-ml-1.5 -mt-0.5">
                              <FotmobYellowCardIcon className="w-2.5 h-3.5 sm:w-3 sm:h-4 opacity-90" />
                            </span>
                          )}
                        </span>
                      ) : null}

                      {/* Huy hiệu Quả bóng: Chuẩn FotMob - hiện các quả bóng xếp chồng lớp ở góc dưới bên phải */}
                      {goals > 0 && (
                        <span
                          className="absolute -bottom-1 -right-2 flex items-center -space-x-1 sm:-space-x-1.5 z-20 pointer-events-none select-none"
                          aria-label={`${goals} bàn thắng`}
                          title={`${goals} bàn thắng`}
                        >
                          {Array.from({ length: Math.min(goals, 3) }).map((_, idx) => (
                            <span
                              key={idx}
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.9)] flex items-center justify-center shrink-0"
                              style={{ zIndex: 10 + idx }}
                            >
                              <FotmobSoccerBallIcon className="w-full h-full" />
                            </span>
                          ))}
                          {goals > 3 && (
                            <span className="text-[9px] font-black text-amber-400 font-sans tabular-nums pl-0.5 z-30 drop-shadow">
                              +{goals - 3}
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Tên cầu thủ & Biểu tượng Đội trưởng (C) chuẩn FotMob */}
                    <div
                      className={`mt-1 font-sans text-[9.5px] sm:text-[10px] md:text-[10.5px] font-semibold text-center leading-tight truncate max-w-[72px] sm:max-w-[88px] transition flex items-center justify-center gap-1 ${
                        isSelected
                          ? "bg-amber-400 text-zinc-950 font-bold px-1.5 py-0.5 rounded shadow-sm"
                          : isSubbedOut
                            ? "text-zinc-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
                            : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] group-hover:text-amber-200"
                      }`}
                    >
                      {isCaptain && !isSubbedOut && (
                        <FotmobCaptainBadge className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                      )}
                      <span className="truncate">{shortName}</span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* 3. THANH HUẤN LUYỆN VIÊN (COACH BAR) CHUẨN FOTMOB */}
        {(homeTeam.coach || awayTeam.coach) && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/[0.04] text-xs select-none">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                {homeTeam.coach ? homeTeam.coach.charAt(0) : "H"}
              </span>
              <span className="text-zinc-300 font-medium text-[11px] sm:text-xs truncate font-sans">
                {homeTeam.coach || "Đang cập nhật"}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0 px-2 font-sans">
              HLV
            </span>
            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
              <span className="text-zinc-300 font-medium text-[11px] sm:text-xs truncate font-sans">
                {awayTeam.coach || "Đang cập nhật"}
              </span>
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 border border-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                {awayTeam.coach ? awayTeam.coach.charAt(0) : "A"}
              </span>
            </div>
          </div>
        )}

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
