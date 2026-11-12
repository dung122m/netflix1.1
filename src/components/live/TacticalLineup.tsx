"use client";

import React, { useState, useEffect } from "react";
import { Users, Shirt, LayoutGrid, CircleDot } from "lucide-react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";
import {
  getPositionAbbreviation,
  inferContextualRole,
  calculateTacticalCoordinates,
  getShortDisplayName,
} from "./lineup/tacticalMath";
import { translatePosition, translateStatName } from "./lineup/lineupTranslators";
import {
  TokenDisplayMode,
  VectorJerseyToken,
  CircularBadgeToken,
  PhotoToken,
} from "./lineup/PlayerTokens";
import { InlinePlayerDetailCard } from "./lineup/InlinePlayerDetailCard";
import { TeamPitchColumn } from "./lineup/TeamPitchColumn";
import { TeamListColumn } from "./lineup/TeamListColumn";

// Barrel re-exports bảo toàn tương thích cho unit tests (tacticalLineup.test.ts) và các caller
export {
  getPositionAbbreviation,
  inferContextualRole,
  calculateTacticalCoordinates,
  getShortDisplayName,
  translatePosition,
  translateStatName,
  VectorJerseyToken,
  CircularBadgeToken,
  PhotoToken,
  InlinePlayerDetailCard,
};
export type { TokenDisplayMode };

export interface TacticalLineupProps {
  homeTeam: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
    formation?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
    formation?: string;
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
      <div className="rounded-3xl bg-zinc-900/40 p-5 sm:p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-zinc-500">
          <Users className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-white">Chưa có đội hình</h4>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          Đội hình sẽ được công bố trước giờ thi đấu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* 1. THANH CHỌN ĐỘI BÓNG: MATCHDAY DUEL BANNER ĐỐI XỨNG */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-900/90 backdrop-blur-md">
        <button
          type="button"
          onClick={() => handleTeamChange("home")}
          aria-label={`${homeTeam.displayName} (${homeRoster?.formation || "Chưa rõ sơ đồ"})`}
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none truncate ${
            teamFilter === "home"
              ? "bg-gradient-to-r from-red-600/90 to-red-800/90 text-white shadow-md shadow-black/50  font-black"
              : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]  font-medium"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <div className={`w-2 h-2 rounded-full shrink-0 ${teamFilter === "home" ? "bg-white " : "bg-red-500"}`} />
            <span className="truncate">{homeTeam.displayName}</span>
          </div>
          {homeRoster?.formation && (
            <span
              className={`text-[9.5px] font-sans tabular-nums font-black px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap ml-1 ${
                teamFilter === "home" ? "bg-black/50 text-white  shadow-sm" : "bg-white/5 text-zinc-400"
              }`}
            >
              {homeRoster.formation}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTeamChange("away")}
          aria-label={`${awayTeam.displayName} (${awayRoster?.formation || "Chưa rõ sơ đồ"})`}
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none truncate ${
            teamFilter === "away"
              ? "bg-gradient-to-r from-sky-600/90 to-sky-800/90 text-white shadow-md shadow-black/50  font-black"
              : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08]  font-medium"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <div className={`w-2 h-2 rounded-full shrink-0 ${teamFilter === "away" ? "bg-white " : "bg-sky-400"}`} />
            <span className="truncate">{awayTeam.displayName}</span>
          </div>
          {awayRoster?.formation && (
            <span
              className={`text-[9.5px] font-sans tabular-nums font-black px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap ml-1 ${
                teamFilter === "away" ? "bg-black/50 text-white  shadow-sm" : "bg-white/5 text-zinc-400"
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
        <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-900/80" role="group" aria-label="Chế độ hiển thị đội hình">
          <button
            type="button"
            onClick={() => setViewMode("pitch")}
            aria-label="Xem sơ đồ sân cỏ"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "pitch" ? "bg-white/15 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            <Shirt className="w-3.5 h-3.5" />
            <span>Sân cỏ</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-label="Xem danh sách bảng"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              viewMode === "list" ? "bg-white/15 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Danh sách</span>
          </button>
        </div>

        {/* Micro Toggle: Số tròn / Áo đấu (chỉ hiện khi xem Sân cỏ) */}
        {viewMode === "pitch" ? (
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-zinc-900/80" role="group" aria-label="Kiểu hiển thị trên sân">
            <button
              type="button"
              onClick={() => setTokenDisplayMode("badge")}
              aria-label="Hiện số áo tròn Flat Matte"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tokenDisplayMode === "badge"
                  ? "bg-white/20 text-white shadow-sm font-black"
                  : "text-zinc-400 hover:text-white font-medium"
              }`}
            >
              <CircleDot className="w-3.5 h-3.5" />
              <span>Số tròn</span>
            </button>

            <button
              type="button"
              onClick={() => setTokenDisplayMode("jersey")}
              aria-label="Hiện áo đấu vector"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tokenDisplayMode === "jersey"
                  ? "bg-white/20 text-white shadow-sm font-black"
                  : "text-zinc-400 hover:text-white font-medium"
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
