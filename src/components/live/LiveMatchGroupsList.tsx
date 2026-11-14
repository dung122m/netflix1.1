"use client";

import React from "react";
import { Clock, Radio, Search } from "lucide-react";
import type { FootballMatch } from "@/services/live/football/service";
import type { LiveMatchScore } from "@/services/live/football-score/types";
import { LeagueStandings } from "./LeagueStandings";
import { MatchCard } from "./MatchCard";

export interface LiveMatchGroupsListProps {
  activeSection: "matches" | "match-center" | "standings";
  liveMatchesList: FootballMatch[];
  upcomingMatchesList: FootballMatch[];
  filteredCount: number;
  scoresMap: Record<string, LiveMatchScore>;
  searchQuery: string;
  hasActiveFilters: boolean;
  onCloseStandings: () => void;
  onSelectMatch: (match: FootballMatch) => void;
  onResetFilters: () => void;
}

/**
 * Renders either the League Standings panel or the grouped Live / Upcoming
 * sports match discovery grids and empty-filter state.
 */
export function LiveMatchGroupsList({
  activeSection,
  liveMatchesList,
  upcomingMatchesList,
  filteredCount,
  scoresMap,
  searchQuery,
  hasActiveFilters,
  onCloseStandings,
  onSelectMatch,
  onResetFilters,
}: LiveMatchGroupsListProps) {
  if (activeSection === "standings") {
    return (
      <div className="pt-1">
        <LeagueStandings
          initialLeague="eng.1"
          defaultOpen={true}
          onClose={onCloseStandings}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NHÓM 🔴 ĐANG PHÁT TRỰC TIẾP */}
      {liveMatchesList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-netflix-red shrink-0" />
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Đang phát trực tiếp
              </h2>
            </div>
            <span className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-netflix-red/15 text-netflix-red">
              {liveMatchesList.length} trận
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
            {liveMatchesList.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                score={scoresMap[match.id] || match.score}
                isSelected={false}
                onSelect={onSelectMatch}
              />
            ))}
          </div>
        </div>
      )}

      {/* NHÓM 🕐 SẮP DIỄN RA */}
      {upcomingMatchesList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-200">
                Sắp diễn ra
              </h2>
            </div>
            <span className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-300">
              {upcomingMatchesList.length} trận
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
            {upcomingMatchesList.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                score={scoresMap[match.id] || match.score}
                isSelected={false}
                onSelect={onSelectMatch}
              />
            ))}
          </div>
        </div>
      )}

      {/* TRẠNG THÁI RỖNG KHI TÌM KIẾM KHÔNG CÓ TRẬN */}
      {filteredCount === 0 && (
        <div className="p-6 sm:p-12 text-center text-zinc-400 space-y-3 rounded-2xl bg-zinc-950/80 shadow-xl">
          <Search className="w-8 h-8 mx-auto text-zinc-500" />
          <p className="text-sm font-bold text-white">Không tìm thấy trận đấu nào</p>
          <p className="text-xs text-zinc-400">
            {searchQuery
              ? `Không có trận nào khớp với từ khóa "${searchQuery}"`
              : "Không có trận nào phù hợp với bộ lọc đang chọn"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 rounded-xl bg-netflix-red text-white text-xs font-bold cursor-pointer hover:brightness-110 active:brightness-95 transition"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      )}
    </div>
  );
}

