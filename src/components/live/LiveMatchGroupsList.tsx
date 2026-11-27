"use client";

import React from "react";
import { Search } from "lucide-react";
import type { FootballMatch } from "@/services/live/football/service";
import type { LiveMatchScore } from "@/services/live/football/types";
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
  isLoading?: boolean;
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
  isLoading = false,
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
    <div className="space-y-4 sm:space-y-6">
      {/* NHÓM ĐANG PHÁT TRỰC TIẾP */}
      {liveMatchesList.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Đang phát trực tiếp
              </h2>
            </div>
            <span className="text-[11px] sm:text-xs font-medium font-sans tabular-nums px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
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

      {/* NHÓM SẮP DIỄN RA */}
      {upcomingMatchesList.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-zinc-300">
              Sắp diễn ra
            </h2>
            <span className="text-[11px] sm:text-xs font-medium font-sans tabular-nums px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">
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

      {/* TRẠNG THÁI ĐANG TẢI HOẶC RỖNG */}
      {filteredCount === 0 && isLoading && !hasActiveFilters ? (
        <div
          aria-busy="true"
          aria-label="Đang tải danh sách trận đấu"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5 animate-pulse"
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-zinc-900/70 p-3 sm:p-3.5 flex flex-col justify-between gap-3 min-h-[160px]"
            >
              <div className="flex items-center justify-between gap-2 pb-2">
                <div className="w-24 h-3 rounded bg-zinc-800/80" />
                <div className="w-10 h-3 rounded bg-zinc-800/80" />
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-zinc-800/80" />
                  <div className="w-16 h-3 rounded bg-zinc-800/70" />
                </div>
                <div className="flex flex-col items-center gap-1 px-1">
                  <div className="w-8 h-4 rounded bg-zinc-800/80" />
                  <div className="w-12 h-3 rounded bg-zinc-800/60" />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-full bg-zinc-800/80" />
                  <div className="w-16 h-3 rounded bg-zinc-800/70" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="w-20 h-2.5 rounded bg-zinc-800/60" />
                <div className="w-12 h-2.5 rounded bg-zinc-800/60" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        filteredCount === 0 && (
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
        )
      )}
    </div>
  );
}

