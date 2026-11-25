"use client";

import React, { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpRight, ChevronDown } from "lucide-react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";
import { SoccerBallIcon } from "../MatchTimelineSidebar";
import {
  FotmobSoccerBallIcon,
  FotmobYellowCardIcon,
  FotmobRedCardIcon,
  FotmobCaptainBadge,
  FotmobSubInIcon,
} from "../icons/FotmobPitchIcons";
import {
  calculateTacticalCoordinates,
  getShortDisplayName,
  translatePosition,
  DualPlayerEventSummary,
  TeamInfo,
} from "./pitchMath";
import {
  TokenDisplayMode,
  VectorJerseyToken,
  CircularBadgeToken,
  PhotoToken,
  InlinePlayerDetailCard,
  YellowCardIcon,
  RedCardIcon,
} from "./PlayerCardModal";

// ============================================================================
// 1. TEAM PITCH COLUMN (TACTICAL 2D PITCH)
// ============================================================================

export interface TeamPitchColumnProps {
  team: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
    formation?: string;
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

export function TeamPitchColumn({
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
  const formation = roster?.formation || team.formation;

  const positionedStarters = useMemo(() => {
    return calculateTacticalCoordinates(starters, formation);
  }, [starters, formation]);

  const hasStarters = starters.length > 0;

  return (
    <div className="flex flex-col space-y-2.5 min-w-0">
      <div className="rounded-2xl overflow-hidden bg-zinc-950 shadow-xl flex flex-col relative">
        {showHeader && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/90 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHome ? "bg-rose-500 shadow-sm shadow-rose-500/50" : "bg-sky-400 shadow-sm shadow-sky-500/50"}`} />
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {team.displayName}
              </span>
            </div>
            {formation && (
              <span
                className={`text-xs font-sans tabular-nums font-bold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap shadow-sm ${
                  isHome ? "bg-red-500/15 text-red-300 " : "bg-sky-500/15 text-sky-300 "
                }`}
              >
                {formation}
              </span>
            )}
          </div>
        )}

        {!hasStarters ? (
          <div className="p-5 sm:p-8 text-center space-y-2 bg-gradient-to-b from-[#0a2315] to-[#071a10]">
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
              background: "linear-gradient(180deg, #0e271a 0%, #0a1e13 100%)",
            }}
            className="relative w-full pb-[88%] sm:pb-[90%] select-none overflow-hidden rounded-2xl shadow-[inset_0_0_35px_rgba(0,0,0,0.7)]"
          >
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 24px, transparent 24px, transparent 48px)",
              }}
            />

            <svg
              className="absolute inset-0 w-full h-full pointer-events-none p-2.5 sm:p-3.5"
              viewBox="0 0 100 130"
              preserveAspectRatio="none"
            >
              <rect x="2" y="2" width="96" height="126" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <line x1="2" y1="65" x2="98" y2="65" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <circle cx="50" cy="65" r="13" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <circle cx="50" cy="65" r="1" fill="rgba(255,255,255,0.6)" />

              <rect x="22" y="2" width="56" height="22" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <rect x="36" y="2" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <circle cx="50" cy="15" r="0.8" fill="rgba(255,255,255,0.5)" />
              <path d="M 40 24 A 10 10 0 0 0 60 24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />

              <rect x="22" y="106" width="56" height="22" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <rect x="36" y="120" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <circle cx="50" cy="115" r="0.8" fill="rgba(255,255,255,0.5)" />
              <path d="M 40 106 A 10 10 0 0 1 60 106" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />

              <path d="M 2 6 A 4 4 0 0 0 6 2" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <path d="M 94 2 A 4 4 0 0 0 98 6" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <path d="M 2 124 A 4 4 0 0 1 6 128" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <path d="M 94 128 A 4 4 0 0 1 98 124" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
            </svg>

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
                  aria-label={`${player.jersey ? `#${player.jersey} ` : ""}${player.displayName} (${player.position})`}
                  style={{
                    left: `${x}%`,
                    top: isGK ? "84.5%" : `${y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center cursor-pointer active:scale-95 focus:outline-none z-20 ${
                    isSelected ? "z-30" : "hover:z-30"
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-zinc-950/90 backdrop-blur-md text-[10px] min-[360px]:text-[10.5px] sm:text-[11px] font-sans font-medium tracking-tight shadow-[0_4px_14px_rgba(0,0,0,0.85)] z-40 transition-all duration-150 ${
                      isSelected
                        ? "opacity-100 scale-100 text-amber-300 shadow-amber-400/25"
                        : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-focus:opacity-100 group-focus:scale-100 text-zinc-100 "
                    }`}
                  >
                    <span>
                      {player.jersey ? `#${player.jersey} · ` : ""}
                      {shortName} · {roleAbbr}
                    </span>
                  </div>

                  <div
                    className={`relative rounded-full transition-all duration-150 group-hover:ring-2 group-hover:ring-white/80 ${
                      isSelected ? "ring-[2.5px] ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-md" : ""
                    }`}
                  >
                    {tokenDisplayMode === "jersey" ? (
                      <VectorJerseyToken number={player.jersey} roleAbbr={roleAbbr} isHome={isHome} isGK={isGK} />
                    ) : tokenDisplayMode === "badge" ? (
                      <CircularBadgeToken number={player.jersey} roleAbbr={roleAbbr} isHome={isHome} isGK={isGK} />
                    ) : (
                      <PhotoToken
                        player={player}
                        isHome={isHome}
                        hasValidPhoto={hasValidPhoto}
                        roleAbbr={roleAbbr}
                        onImageError={onImageError}
                      />
                    )}

                    {tokenDisplayMode === "photo" && player.jersey && (
                      <span className="absolute -bottom-1 -right-1 font-sans tabular-nums text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-black text-white shadow-sm leading-none">
                        {player.jersey}
                      </span>
                    )}

                    {!isMatchScheduled && player.subbedOut && (
                      <span
                        aria-label={`Rời sân: ${player.subClock || ""}`}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md z-30"
                      >
                        <ArrowDown className="w-2 h-2 min-[360px]:w-2.5 min-[360px]:h-2.5 stroke-[3]" />
                      </span>
                    )}
                    {!isMatchScheduled && player.subbedIn && !player.subbedOut && (
                      <span
                        aria-label={`Vào sân: ${player.subClock || ""}`}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md z-30"
                      >
                        <ArrowUp className="w-2 h-2 min-[360px]:w-2.5 min-[360px]:h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-col items-center justify-center pointer-events-none select-none">
                    <span
                      className={`font-sans font-semibold text-[10.5px] min-[360px]:text-[11px] sm:text-[11.5px] text-white/95 whitespace-nowrap text-center tracking-normal drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] select-none overflow-hidden text-ellipsis transition-colors ${
                        isCrowdedLine
                          ? "max-w-[62px] min-[360px]:max-w-[70px] sm:max-w-[80px]"
                          : isMediumLine
                            ? "max-w-[70px] min-[360px]:max-w-[78px] sm:max-w-[88px]"
                            : "max-w-[78px] min-[360px]:max-w-[86px] sm:max-w-[96px]"
                      }`}
                    >
                      {shortName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

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
              key={selectedPlayer.id}
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

      {bench.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/60 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <h5 className="text-xs sm:text-sm font-bold text-white whitespace-nowrap truncate">
                Cầu thủ dự bị ({bench.length})
              </h5>
            </div>
            <span className="text-[11px] sm:text-xs text-zinc-400 font-medium shrink-0 whitespace-nowrap">Bấm xem chỉ số</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:max-h-[380px] sm:overflow-y-auto pr-1 scrollbar-thin">
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
                      ? "bg-white/[0.14] shadow-sm"
                      : "bg-white/[0.04] hover:bg-white/[0.09]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center font-sans tabular-nums text-xs sm:text-[13px] font-bold text-zinc-200 shadow-sm">
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
                      aria-label={`Vào sân thay người: ${player.subClock || ""}`}
                      className="flex items-center gap-1 text-[10.5px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md shrink-0"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{player.subClock || "Vào sân"}</span>
                    </span>
                  ) : tokenDisplayMode === "photo" && hasValidPhoto ? (
                    <span className="font-sans tabular-nums text-xs font-bold text-zinc-400 bg-white/5 rounded-md px-1.5 py-0.5 shrink-0">
                      #{player.jersey || "-"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. TEAM LIST COLUMN (COMPACT ROSTER LIST)
// ============================================================================

export interface TeamListColumnProps {
  team: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
    formation?: string;
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

export function TeamListColumn({
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
  const formation = roster?.formation || team.formation;

  return (
    <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isHome ? "bg-netflix-red" : "bg-sky-400"}`} />
          <h5 className="text-xs sm:text-sm font-black text-white truncate">
            {team.displayName}
          </h5>
        </div>
        {formation && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
            {formation}
          </span>
        )}
      </div>

      {selectedPlayer && (
        <InlinePlayerDetailCard
          key={selectedPlayer.id}
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
        <p className="text-xs sm:text-[13px] font-bold text-zinc-200">
          Đá chính ({starters.length})
        </p>
        {starters.map((p, i) => {
          const isSelected = selectedPlayer?.id === p.id;
          return (
            <div
              key={p.id || i}
              onClick={() => onSelectPlayer(p)}
              className={`flex items-center justify-between gap-2.5 py-2 px-3 rounded-xl cursor-pointer text-xs sm:text-sm transition ${
                isSelected ? "bg-white/[0.12]" : "bg-white/[0.03] hover:bg-white/[0.08]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="font-sans tabular-nums text-zinc-400 min-w-[24px] font-bold text-xs sm:text-sm">
                  #{p.jersey || i + 1}
                </span>
                <span className="text-zinc-100 font-semibold truncate text-xs sm:text-sm">{p.displayName || p.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isMatchScheduled && p.subbedOut && (
                  <span className="text-xs text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded">
                    <ArrowDown className="w-3 h-3 stroke-[2.5]" />
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
        <div className="space-y-1.5 pt-2">
          <p className="text-xs sm:text-[13px] font-bold text-zinc-400">
            Dự bị ({bench.length})
          </p>
          <div className="sm:max-h-[260px] sm:overflow-y-auto pr-0.5 scrollbar-thin space-y-1">
            {bench.map((p, i) => {
              const isSelected = selectedPlayer?.id === p.id;
              return (
                <div
                  key={p.id || i}
                  onClick={() => onSelectPlayer(p)}
                  className={`flex items-center justify-between gap-2.5 py-2 px-3 rounded-xl text-xs sm:text-sm cursor-pointer transition ${
                    isSelected
                      ? "bg-white/[0.12] text-white"
                      : "hover:bg-white/[0.05] text-zinc-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-sans tabular-nums text-zinc-500 min-w-[24px] font-semibold text-xs sm:text-sm">#{p.jersey || "-"}</span>
                    <span className="text-zinc-300 truncate text-xs sm:text-sm">{p.displayName || p.name}</span>
                  </div>
                  {!isMatchScheduled && p.subbedIn ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
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

// ============================================================================
// 3. FOTMOB SUBSTITUTES & BENCH SECTION (AUTHENTIC BORDERLESS 2-COLUMN DESIGN)
// ============================================================================

export interface FotmobSubstitutesSectionProps {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeBench: MatchRosterPlayer[];
  awayBench: MatchRosterPlayer[];
  selectedPlayerId?: string;
  onSelectPlayer: (player: MatchRosterPlayer, isHome: boolean) => void;
  getPlayerEventBadges: (player: MatchRosterPlayer) => DualPlayerEventSummary;
}

export function FotmobSubstitutesSection({
  homeTeam: _homeTeam,
  awayTeam: _awayTeam,
  homeBench = [],
  awayBench = [],
  selectedPlayerId,
  onSelectPlayer,
  getPlayerEventBadges,
}: FotmobSubstitutesSectionProps) {
  // Tách riêng cầu thủ đã vào sân thay người (Substitutes) và cầu thủ còn trên ghế dự bị (Unused Bench)
  const homeSubbedIn = useMemo(
    () => homeBench.filter((p) => Boolean(p.subbedIn || p.subClock)),
    [homeBench]
  );
  const awaySubbedIn = useMemo(
    () => awayBench.filter((p) => Boolean(p.subbedIn || p.subClock)),
    [awayBench]
  );

  const homeUnused = useMemo(
    () => homeBench.filter((p) => !p.subbedIn && !p.subClock),
    [homeBench]
  );
  const awayUnused = useMemo(
    () => awayBench.filter((p) => !p.subbedIn && !p.subClock),
    [awayBench]
  );

  const hasSubbedInPlayers = homeSubbedIn.length > 0 || awaySubbedIn.length > 0;
  const totalUnused = homeUnused.length + awayUnused.length;

  // Nếu chưa có ai vào sân thay người (vd trận chưa diễn ra hoặc hiệp 1 chưa thay ai), mặc định mở danh sách dự bị
  const [showUnused, setShowUnused] = useState<boolean>(!hasSubbedInPlayers);

  // Render một hàng cầu thủ chuẩn phong cách FotMob (ảnh/số áo bên trái, tên & vị trí, phút + mũi tên xanh lá bên phải)
  const renderPlayerRow = (
    player: MatchRosterPlayer,
    isHome: boolean,
    isSubIn: boolean
  ) => {
    const isSelected = selectedPlayerId === player.id;
    const eventsInfo = getPlayerEventBadges(player);
    const isCaptain = Boolean(player.captain);

    return (
      <button
        key={`${isHome ? "h" : "a"}-${player.id}`}
        type="button"
        onClick={() => onSelectPlayer(player, isHome)}
        className={`w-full flex items-center justify-between py-2 px-2.5 sm:px-3 border-b border-white/[0.04] transition-colors text-left cursor-pointer group ${
          isSelected
            ? "bg-white/[0.08]"
            : "hover:bg-white/[0.03]"
        }`}
      >
        {/* CỘT TRÁI: SỐ ÁO/AVATAR, TÊN VÀ VỊ TRÍ */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 pr-2">
          {/* Avatar hoặc vòng tròn số áo gọn gàng */}
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-sans font-bold tabular-nums text-xs shrink-0 shadow-sm transition-all ${
              isHome
                ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30"
                : "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30"
            }`}
          >
            <span>{player.jersey || "-"}</span>
          </div>

          {/* Tên cầu thủ (In đậm trắng) & Vị trí (Xám nhạt phía dưới) */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors truncate font-sans">
                {player.displayName || player.name}
              </span>
              {isCaptain && (
                <FotmobCaptainBadge className="w-3.5 h-3.5 shrink-0" />
              )}
            </div>
            <span className="text-[10.5px] sm:text-[11px] text-zinc-400 font-sans block truncate leading-tight mt-0.5">
              {translatePosition(player.position)}
            </span>
          </div>
        </div>

        {/* CỘT PHẢI: BÀN THẮNG, THẺ PHẠT, PHÚT VÀO SÂN & MŨI TÊN XANH CHUẨN FOTMOB */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Huy hiệu Bàn thắng (quà bóng FotMob) */}
          {eventsInfo.goals > 0 && (
            <span
              className="inline-flex items-center -space-x-1 shrink-0"
              title={`${eventsInfo.goals} bàn thắng`}
            >
              {Array.from({ length: Math.min(eventsInfo.goals, 3) }).map((_, idx) => (
                <span key={idx} style={{ zIndex: 10 + idx }} className="shrink-0">
                  <FotmobSoccerBallIcon className="w-3.5 h-3.5" />
                </span>
              ))}
              {eventsInfo.goals > 3 && (
                <span className="text-[9px] font-black text-amber-400 font-sans tabular-nums pl-0.5">
                  +{eventsInfo.goals - 3}
                </span>
              )}
            </span>
          )}

          {/* Thẻ phạt */}
          {eventsInfo.yellowCards > 0 && (
            <FotmobYellowCardIcon className="w-2.5 h-3.5 shrink-0" />
          )}
          {eventsInfo.redCards > 0 && (
            <FotmobRedCardIcon className="w-2.5 h-3.5 shrink-0" />
          )}

          {/* Phút vào sân và mũi tên xanh lá chuẩn FotMob */}
          {isSubIn && (
            <div className="flex items-center gap-1.5 shrink-0">
              {player.subClock && (
                <span className="text-xs sm:text-[13px] font-sans tabular-nums font-bold text-emerald-400">
                  {player.subClock}&apos;
                </span>
              )}
              <FotmobSubInIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="rounded-2xl bg-zinc-950/70 p-3.5 sm:p-5 shadow-sm space-y-3">
      {/* TIÊU ĐỀ SECTION CHÍNH GIỮA */}
      <h3 className="text-center font-sans font-bold text-sm sm:text-base text-white tracking-wide">
        Thay người
      </h3>

      {/* DANH SÁCH CẦU THỦ THAY NGƯỜI (2 CỘT: ĐỘI NHÀ & ĐỘI KHÁCH) */}
      {hasSubbedInPlayers ? (
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-white/[0.06] gap-x-6">
          {/* Cột trái: Đội nhà */}
          <div className="space-y-0.5">
            {homeSubbedIn.map((p) => renderPlayerRow(p, true, true))}
          </div>

          {/* Cột phải: Đội khách */}
          <div className="space-y-0.5 md:pl-6 pt-2 md:pt-0">
            {awaySubbedIn.map((p) => renderPlayerRow(p, false, true))}
          </div>
        </div>
      ) : null}

      {/* NÚT THU GỌN / MỞ RỘNG DANH SÁCH DỰ BỊ CHƯA VÀO SÂN (BENCH / UNUSED PLAYERS) */}
      {hasSubbedInPlayers && totalUnused > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowUnused(!showUnused)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white transition cursor-pointer select-none group border-t border-white/[0.04]"
          >
            <span>Dự bị & Cầu thủ vắng mặt</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                showUnused ? "rotate-180 text-white" : "text-zinc-500 group-hover:text-white"
              }`}
            />
          </button>
        </div>
      )}

      {/* DANH SÁCH CẦU THỦ TRÊN BĂNG GHẾ DỰ BỊ */}
      {showUnused && totalUnused > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-white/[0.06] gap-x-6 pt-1">
          {/* Đội nhà */}
          <div className="space-y-0.5">
            {homeUnused.map((p) => renderPlayerRow(p, true, false))}
          </div>

          {/* Đội khách */}
          <div className="space-y-0.5 md:pl-6 pt-2 md:pt-0">
            {awayUnused.map((p) => renderPlayerRow(p, false, false))}
          </div>
        </div>
      )}

      {!hasSubbedInPlayers && totalUnused === 0 && (
        <p className="text-center py-6 text-xs text-zinc-500 font-sans">
          Chưa có danh sách đăng ký dự bị
        </p>
      )}
    </div>
  );
}

export function DualBenchColumn({
  teamName: _teamName,
  bench: _bench,
  isHome: _isHome,
  selectedPlayerId: _selectedPlayerId,
  onSelectPlayer: _onSelectPlayer,
  getPlayerEventBadges: _getPlayerEventBadges,
}: {
  teamName: string;
  bench: MatchRosterPlayer[];
  isHome: boolean;
  selectedPlayerId?: string;
  onSelectPlayer: (player: MatchRosterPlayer, isHome: boolean) => void;
  getPlayerEventBadges: (player: MatchRosterPlayer) => DualPlayerEventSummary;
}) {
  return null;
}

// ============================================================================
// 4. DUAL MOBILE ROSTER VIEW (MOBILE TABS VIEW)
// ============================================================================

interface DualMobileRosterViewProps {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeStarters: MatchRosterPlayer[];
  homeBench: MatchRosterPlayer[];
  awayStarters: MatchRosterPlayer[];
  awayBench: MatchRosterPlayer[];
  mobileTeamTab: "home" | "away";
  onChangeTab: (tab: "home" | "away") => void;
  getPlayerEventBadges: (player: MatchRosterPlayer) => DualPlayerEventSummary;
  onSelectPlayer?: (player: MatchRosterPlayer, isHome: boolean) => void;
}

export function DualMobileRosterView({
  homeTeam,
  awayTeam,
  homeStarters,
  homeBench,
  awayStarters,
  awayBench,
  mobileTeamTab,
  onChangeTab,
  getPlayerEventBadges,
  onSelectPlayer,
}: DualMobileRosterViewProps) {
  const isCurrentHome = mobileTeamTab === "home";
  const currentTeam = isCurrentHome ? homeTeam : awayTeam;
  const currentStarters = isCurrentHome ? homeStarters : awayStarters;
  const currentBench = isCurrentHome ? homeBench : awayBench;

  return (
    <div className="block md:hidden space-y-3">
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-900/90 shadow-sm">
        <button
          type="button"
          onClick={() => onChangeTab("home")}
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
          onClick={() => onChangeTab("away")}
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

      <div className="rounded-2xl bg-zinc-950/80 p-3 space-y-2 shadow-sm">
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="font-semibold text-white flex items-center gap-1.5">
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
                onClick={() => onSelectPlayer?.(player, isCurrentHome)}
                className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] active:bg-white/[0.1] transition cursor-pointer select-none"
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
                        <FotmobCaptainBadge className="w-3.5 h-3.5" />
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
                      <ArrowDown className="w-2.5 h-2.5 stroke-[2.5]" />
                      <span>{player.subClock ? `${player.subClock}'` : "Ra sân"}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-950/80 p-3 space-y-2 shadow-sm">
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="font-semibold text-white flex items-center gap-1.5">
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
                  onClick={() => onSelectPlayer?.(player, isCurrentHome)}
                  className="flex items-center justify-between gap-2.5 py-2 px-1 border-b border-white/[0.04] hover:bg-white/[0.04] active:bg-white/[0.08] transition cursor-pointer select-none rounded-lg"
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
                          <FotmobCaptainBadge className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-sans block truncate">
                        {translatePosition(player.position)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {eventsInfo.goals > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs">
                        <FotmobSoccerBallIcon className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {eventsInfo.yellowCards > 0 && <FotmobYellowCardIcon className="w-2.5 h-3.5" />}
                    {eventsInfo.redCards > 0 && <FotmobRedCardIcon className="w-2.5 h-3.5" />}
                    {player.subbedIn && (
                      <div className="flex items-center gap-1 shrink-0">
                        {player.subClock && (
                          <span className="text-[11px] font-sans tabular-nums font-bold text-emerald-400">
                            {player.subClock}&apos;
                          </span>
                        )}
                        <FotmobSubInIcon className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {currentTeam.coach && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/40 text-xs font-sans">
          <span className="text-zinc-400">HLV:</span>
          <span className="font-bold text-white truncate max-w-[200px]">{currentTeam.coach}</span>
        </div>
      )}
    </div>
  );
}
