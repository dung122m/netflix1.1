"use client";

import React from "react";
import { ArrowLeftRight, Clock, Flame, Activity, Search, X } from "lucide-react";
import { FootballMatch } from "@/services/live/football/service";
import { LiveMatchScore } from "@/services/live/football-score/types";
import { MatchTimelineSidebar } from "./MatchTimelineSidebar";
import { MatchCard } from "./MatchCard";

export interface LiveMatchSidePanelProps {
  sidePanelHeight?: number;
  hasTimelineEvents: boolean;
  sidePanelTab: "timeline" | "matches";
  onTabChange: (tab: "timeline" | "matches") => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matchSummary?: any;
  isSummaryLoading?: boolean;
  selectedMatch: FootballMatch;
  currentMatchScore?: LiveMatchScore | null;
  filteredMatches: FootballMatch[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: "all" | "live" | "upcoming" | "finished") => void;
  counts: { total: number; live: number; upcoming: number; finished: number };
  liveMatchesList: FootballMatch[];
  upcomingMatchesList: FootballMatch[];
  scoresMap: Record<string, LiveMatchScore>;
  onSelectMatch: (m: FootballMatch) => void;
  railContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function LiveMatchSidePanel({
  sidePanelHeight,
  hasTimelineEvents,
  sidePanelTab,
  onTabChange,
  matchSummary,
  isSummaryLoading,
  selectedMatch,
  currentMatchScore,
  filteredMatches,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  counts,
  liveMatchesList,
  upcomingMatchesList,
  scoresMap,
  onSelectMatch,
  railContainerRef,
}: LiveMatchSidePanelProps) {
  return (
    <div
      style={{
        height: sidePanelHeight ? `${Math.max(sidePanelHeight, 540)}px` : "min(580px, calc(100vh - 200px))",
        maxHeight: sidePanelHeight ? `${Math.max(sidePanelHeight, 640)}px` : "min(680px, calc(100vh - 160px))",
      }}
      className="hidden lg:flex lg:col-span-5 xl:col-span-4 min-w-0 flex-col rounded-2xl bg-zinc-950/95 border border-white/5 shadow-2xl p-3 space-y-2.5 overflow-hidden"
    >
      {/* SUB-TABS TRÊN SIDE PANEL */}
      {hasTimelineEvents ? (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 shrink-0">
          <button
            type="button"
            onClick={() => onTabChange("timeline")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
              sidePanelTab === "timeline"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span className="truncate">Diễn biến</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("matches")}
            className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
              sidePanelTab === "matches"
                ? "bg-netflix-red text-white shadow-md shadow-black/50"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="truncate">Đổi trận ({filteredMatches.length})</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowLeftRight className="w-3.5 h-3.5 text-netflix-red shrink-0" />
            <span className="text-xs font-black text-white truncate">
              Đổi trận
            </span>
          </div>
          {isSummaryLoading && (
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium shrink-0">
              <Activity className="w-3 h-3 animate-spin text-netflix-red" />
              <span>Đang kiểm tra...</span>
            </span>
          )}
        </div>
      )}

      {/* TAB 1: DIỄN BIẾN SỰ KIỆN THỜI GIAN THỰC (TIMELINE DỌC THEO PLAYER) */}
      {hasTimelineEvents && sidePanelTab === "timeline" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <MatchTimelineSidebar
            events={matchSummary?.events}
            commentary={matchSummary?.commentary}
            stats={matchSummary?.stats}
            homeTeamName={selectedMatch.team1}
            awayTeamName={selectedMatch.team2}
            homeTeamLogo={matchSummary?.homeTeam?.logo || selectedMatch.homeLogo || selectedMatch.logo}
            awayTeamLogo={matchSummary?.awayTeam?.logo || selectedMatch.awayLogo}
            isLive={
              currentMatchScore?.status === "live" ||
              selectedMatch.timeline === "live"
            }
            displayClock={currentMatchScore?.displayClock}
            statusText={
              currentMatchScore?.status === "live" || selectedMatch.timeline === "live"
                ? "Trực tiếp"
                : selectedMatch.time
            }
            loading={isSummaryLoading}
          />
        </div>
      )}

      {/* TAB 2: ĐỔI TRẬN ĐẤU - DANH SÁCH THU GỌN VỚI TÌM KIẾM */}
      {sidePanelTab === "matches" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Ô tìm kiếm nhanh trong side panel */}
          <div className="relative w-full shrink-0 mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm trận, giải, BLV..."
              className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-zinc-900 text-xs text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  title="Xóa tìm kiếm"
                  className="text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                {filteredMatches.length}
              </span>
            </div>
          </div>

          {/* Hàng nút lọc nhanh trạng thái trong side panel */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 pb-2 pt-0.5 border-b border-white/5 bg-zinc-950">
            <button
              type="button"
              onClick={() => onStatusChange("all")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedStatus === "all"
                  ? "bg-netflix-red text-white shadow-sm font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
            >
              Tất cả ({counts.total})
            </button>
            {counts.live > 0 && (
              <button
                type="button"
                onClick={() => onStatusChange("live")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedStatus === "live"
                    ? "bg-netflix-red text-white shadow-sm"
                    : "bg-zinc-900 text-zinc-300 hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>Đang live ({counts.live})</span>
              </button>
            )}
            {counts.upcoming > 0 && (
              <button
                type="button"
                onClick={() => onStatusChange("upcoming")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedStatus === "upcoming"
                    ? "bg-netflix-red text-white shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <span>Sắp đá ({counts.upcoming})</span>
              </button>
            )}
          </div>

          {/* Danh sách thẻ trận cuộn dọc */}
          <div
            ref={railContainerRef}
            style={{ overscrollBehavior: "contain" }}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-0.5 pt-0 pb-3 pr-1 scrollbar-thin touch-pan-y scroll-pt-12"
          >
            {filteredMatches.length > 0 ? (
              <div className="space-y-2">
                {/* KHỐI TRẬN ĐANG TRỰC TIẾP */}
                {liveMatchesList.length > 0 && (
                  <div>
                    <div className="sticky top-0 z-20 -mx-0.5 -mr-1 px-3 py-2 bg-zinc-950 border-b border-netflix-red/30 flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-xs font-bold text-netflix-red">
                          Đang trực tiếp
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-netflix-red/15 text-netflix-red border border-netflix-red/30">
                        {liveMatchesList.length} trận
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1.5">
                      {liveMatchesList.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          score={scoresMap[match.id] || match.score}
                          isSelected={selectedMatch?.id === match.id}
                          onSelect={onSelectMatch}
                          compact={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* KHỐI TRẬN SẮP DIỄN RA */}
                {upcomingMatchesList.length > 0 && (
                  <div className="mt-2.5">
                    <div className="sticky top-0 z-20 -mx-0.5 -mr-1 px-3 py-2 bg-zinc-950 border-b border-white/10 flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs font-bold text-zinc-300">
                          Sắp diễn ra
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold tabular-nums px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                        {upcomingMatchesList.length} trận
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1.5">
                      {upcomingMatchesList.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          score={scoresMap[match.id] || match.score}
                          isSelected={selectedMatch?.id === match.id}
                          onSelect={onSelectMatch}
                          compact={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-zinc-400 space-y-2">
                <Search className="w-6 h-6 mx-auto text-zinc-500" />
                <p className="text-xs font-bold text-white">Không tìm thấy trận</p>
                <p className="text-[11px] text-zinc-500">
                  {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Chưa có trận nào"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
