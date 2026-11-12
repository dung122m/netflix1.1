"use client";

import React, { useMemo } from "react";
import { Shield, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";
import { calculateTacticalCoordinates, getShortDisplayName } from "./tacticalMath";
import { translatePosition } from "./lineupTranslators";
import {
  TokenDisplayMode,
  VectorJerseyToken,
  CircularBadgeToken,
  PhotoToken,
} from "./PlayerTokens";
import { InlinePlayerDetailCard } from "./InlinePlayerDetailCard";

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
      {/* KHỐI SÂN CỎ CHIẾN THUẬT */}
      <div className="rounded-2xl overflow-hidden bg-zinc-950 shadow-xl flex flex-col relative">
        {/* Header đội bóng & sơ đồ (chỉ hiển thị khi xem song song 2 đội) */}
        {showHeader && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900/90 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHome ? "bg-netflix-red shadow-sm shadow-red-500/50" : "bg-sky-400 shadow-sm shadow-sky-500/50"}`} />
              <Shield className={`w-4 h-4 shrink-0 ${isHome ? "text-netflix-red" : "text-sky-400"}`} />
              <span className="text-xs sm:text-sm font-black text-white truncate">
                {team.displayName}
              </span>
            </div>
            {formation && (
              <span
                className={`text-xs font-sans tabular-nums font-bold px-2 py-0.5 rounded-md  shrink-0 whitespace-nowrap shadow-sm ${
                  isHome ? "bg-red-500/15 text-red-300 " : "bg-sky-500/15 text-sky-300 "
                }`}
              >
                {formation}
              </span>
            )}
          </div>
        )}

        {/* Khung sân cỏ */}
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
              <rect x="2" y="2" width="96" height="126" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              {/* Halfway line */}
              <line x1="2" y1="65" x2="98" y2="65" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              {/* Center circle & spot */}
              <circle cx="50" cy="65" r="13" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <circle cx="50" cy="65" r="1" fill="rgba(255,255,255,0.6)" />

              {/* Attacking Goal Area (Top) */}
              <rect x="22" y="2" width="56" height="22" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <rect x="36" y="2" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <circle cx="50" cy="15" r="0.8" fill="rgba(255,255,255,0.5)" />
              <path d="M 40 24 A 10 10 0 0 0 60 24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />

              {/* Defending Goal Area (Bottom) */}
              <rect x="22" y="106" width="56" height="22" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <rect x="36" y="120" width="28" height="8" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />
              <circle cx="50" cy="115" r="0.8" fill="rgba(255,255,255,0.5)" />
              <path d="M 40 106 A 10 10 0 0 1 60 106" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="0.75" />

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
                  aria-label={`${player.jersey ? `#${player.jersey} ` : ""}${player.displayName} (${player.position})`}
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
                    className={`pointer-events-none absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-zinc-950/90 backdrop-blur-md text-[10px] min-[360px]:text-[10.5px] sm:text-[11px] font-sans font-medium tracking-tight  shadow-[0_4px_14px_rgba(0,0,0,0.85)] z-40 transition-all duration-150 ${
                      isSelected
                        ? "opacity-100 scale-100 text-amber-300  shadow-amber-400/25"
                        : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-focus:opacity-100 group-focus:scale-100 text-zinc-100 "
                    }`}
                  >
                    <span>
                      {player.jersey ? `#${player.jersey} · ` : ""}
                      {shortName} · {roleAbbr}
                    </span>
                  </div>

                  {/* Token cầu thủ trên sân */}
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

                    {/* Huy hiệu số áo góc dưới chỉ hiển thị khi ở chế độ xem ảnh mặt */}
                    {tokenDisplayMode === "photo" && player.jersey && (
                      <span className="absolute -bottom-1 -right-1 font-sans tabular-nums text-[7.5px] sm:text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-black text-white shadow-sm leading-none">
                        {player.jersey}
                      </span>
                    )}

                    {/* Rời sân / Thay người (Micro-badge tinh tế góc trên phải không che số áo) */}
                    {!isMatchScheduled && player.subbedOut && (
                      <span
                        aria-label={`Rời sân: ${player.subClock || ""}`}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md z-30"
                      >
                        <ArrowDownLeft className="w-2 h-2 min-[360px]:w-2.5 min-[360px]:h-2.5 stroke-[2.5]" />
                      </span>
                    )}
                    {!isMatchScheduled && player.subbedIn && !player.subbedOut && (
                      <span
                        aria-label={`Vào sân: ${player.subClock || ""}`}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 min-[360px]:w-3.5 min-[360px]:h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md z-30"
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

      {/* CẦU THỦ DỰ BỊ */}
      {bench.length > 0 && (
        <div className="rounded-2xl bg-zinc-900/60 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-zinc-300 shrink-0" />
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

