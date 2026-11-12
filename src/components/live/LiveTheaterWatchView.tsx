"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import type { FootballMatch } from "@/services/live/football/service";
import type { LiveMatchScore, NormalizedMatchSummary } from "@/services/live/football-score/types";
import { useBodyScrollLock } from "@/lib/scrollLock";
import { LivePlayer } from "./LivePlayer";
import { MatchCenter } from "./MatchCenter";
import { LiveMatchSidePanel } from "./LiveMatchSidePanel";
import { LiveMobileMatchSheet } from "./LiveMobileMatchSheet";
import type { LiveFilterCounts } from "./LiveFilterCommandBar";
import type { MatchStatusFilter } from "./hooks/useLiveFootballFilters";

export interface LiveTheaterWatchViewProps {
  selectedMatch: FootballMatch;
  selectedMatchTournament: string;
  currentMatchScore: LiveMatchScore | null;
  matchSummary: NormalizedMatchSummary | null;
  isSummaryLoading: boolean;
  hasTimelineEvents: boolean;
  sidePanelTab: "timeline" | "matches";
  onSidePanelTabChange: (tab: "timeline" | "matches") => void;
  sidePanelHeight?: number;
  filteredMatches: FootballMatch[];
  liveMatchesList: FootballMatch[];
  upcomingMatchesList: FootballMatch[];
  scoresMap: Record<string, LiveMatchScore>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: MatchStatusFilter;
  onStatusChange: (status: MatchStatusFilter) => void;
  counts: LiveFilterCounts;
  isActive: boolean;
  playerHeaderRef: React.RefObject<HTMLDivElement | null>;
  railContainerRef: React.RefObject<HTMLDivElement | null>;
  onClosePlayer: () => void;
  onSelectMatch: (match: FootballMatch) => void;
  onSummaryChange: (summary: NormalizedMatchSummary | null) => void;
  onLoadingChange: (loading: boolean) => void;
  onVideoHeightChange: (height: number) => void;
}

/**
 * Renders Theater Watch Mode when a sports match is active: compact breadcrumb
 * navigation, 2-column player + MatchCenter + desktop side panel, and the
 * swipeable mobile match switcher bottom sheet.
 */
export function LiveTheaterWatchView({
  selectedMatch,
  selectedMatchTournament,
  currentMatchScore,
  matchSummary,
  isSummaryLoading,
  hasTimelineEvents,
  sidePanelTab,
  onSidePanelTabChange,
  sidePanelHeight,
  filteredMatches,
  liveMatchesList,
  upcomingMatchesList,
  scoresMap,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  counts,
  isActive,
  playerHeaderRef,
  railContainerRef,
  onClosePlayer,
  onSelectMatch,
  onSummaryChange,
  onLoadingChange,
  onVideoHeightChange,
}: LiveTheaterWatchViewProps) {
  const [showMatchRail, setShowMatchRail] = useState(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const dragStartYRef = useRef<number | null>(null);

  // Khóa cuộn nền trang web chỉ trong thời gian khay Bottom Sheet đang mở
  useBodyScrollLock(isMobileSheetOpen);

  // Lắng nghe phím Escape để đóng Bottom Sheet
  useEffect(() => {
    if (!isMobileSheetOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileSheetOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileSheetOpen]);

  // Tự động đóng Bottom Sheet khi màn hình resize lên desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 1024 && isMobileSheetOpen) {
        setIsMobileSheetOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileSheetOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (dragStartYRef.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - dragStartYRef.current;
    if (deltaY > 50) {
      setIsMobileSheetOpen(false);
    }
    dragStartYRef.current = null;
  }, []);

  const handleSelectMatchFromSheet = useCallback(
    (match: FootballMatch) => {
      onSelectMatch(match);
      setIsMobileSheetOpen(false);
    },
    [onSelectMatch],
  );

  return (
    <div className="space-y-2.5 sm:space-y-3 pb-16 lg:pb-0">
      {/* THANH ĐIỀU HƯỚNG QUAY LẠI DANH SÁCH & TIÊU ĐỀ TRẬN (BREADCRUMB COMPACT ~32-36PX) */}
      <div
        id="live-player-header"
        ref={playerHeaderRef}
        className="flex items-center justify-between gap-2.5 px-1 py-1 text-xs"
      >
        <button
          type="button"
          onClick={onClosePlayer}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Danh sách</span>
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-start overflow-hidden px-1">
          <span className="text-zinc-600 text-xs shrink-0 select-none">/</span>
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-bold text-white text-xs sm:text-sm truncate">
              {selectedMatchTournament}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* NÚT ĐỔI TRẬN NHỎ GỌN TRÊN MOBILE: ĐẶT CÙNG HÀNG ĐIỀU HƯỚNG BREADCRUMB GỌN GÀNG, HỢP LÝ */}
          <button
            type="button"
            onClick={() => setIsMobileSheetOpen(true)}
            aria-label={`Đổi trận (${filteredMatches.length} trận khả dụng)`}
            className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-xs shadow-sm transition cursor-pointer active:scale-95"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
            <span>Đổi trận</span>
            <span className="bg-black/35 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums">
              {filteredMatches.length}
            </span>
          </button>
        </div>
      </div>

      {/* BỐ CỤC THEATER STUDIO 2 CỘT (DESKTOP) / XẾP CHỒNG (MOBILE) */}
      <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 items-start pb-2 sm:pb-3">
        {/* CỘT TRÁI (COL 1-7/8 TRÊN DESKTOP): LIVE PLAYER */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3 flex flex-col justify-start">
          <div className="space-y-3">
            <LivePlayer
              match={selectedMatch}
              title={selectedMatch.title}
              servers={selectedMatch.servers}
              blv={selectedMatch.blv}
              time={selectedMatch.time}
              score={currentMatchScore}
              summary={matchSummary}
              matchOptions={
                filteredMatches.length > 0 ? filteredMatches : [selectedMatch]
              }
              onSelectMatch={onSelectMatch}
              showMatchRail={showMatchRail}
              onToggleMatchRail={() => setShowMatchRail((prev) => !prev)}
              onCloseMatchRail={() => setShowMatchRail(false)}
              isActive={isActive}
              onVideoHeightChange={onVideoHeightChange}
            />

            {/* KHỐI MATCH CENTER TRÊN MOBILE: THÔNG TIN TRẬN ĐẤU & LUỒNG PHÁT CUỘN TỰ NHIÊN */}
            <div className="w-full pt-1 sm:pt-2">
              <MatchCenter
                leagueSlug={currentMatchScore?.leagueSlug}
                eventId={currentMatchScore?.eventId}
                matchTitle={selectedMatch.title}
                title="Trung tâm trận đấu"
                hideScoreboard={true}
                tournament={selectedMatch.tournament}
                team1={selectedMatch.team1}
                team2={selectedMatch.team2}
                team1Logo={selectedMatch.homeLogo || selectedMatch.logo}
                team2Logo={selectedMatch.awayLogo}
                isLive={
                  currentMatchScore?.status === "live" ||
                  selectedMatch.timeline === "live"
                }
                time={selectedMatch.time}
                blv={selectedMatch.blv}
                group={selectedMatch.group}
                serversCount={selectedMatch.servers?.length}
                quality={selectedMatch.quality}
                onSummaryChange={onSummaryChange}
                onLoadingChange={onLoadingChange}
                initialScore={currentMatchScore}
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (COL 8-12 TRÊN DESKTOP): SIDE PANEL VỚI DIỄN BIẾN & ĐỔI TRẬN */}
        <LiveMatchSidePanel
          sidePanelHeight={sidePanelHeight}
          hasTimelineEvents={hasTimelineEvents}
          sidePanelTab={sidePanelTab}
          onTabChange={onSidePanelTabChange}
          matchSummary={matchSummary}
          isSummaryLoading={isSummaryLoading}
          selectedMatch={selectedMatch}
          currentMatchScore={currentMatchScore}
          filteredMatches={filteredMatches}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedStatus={selectedStatus}
          onStatusChange={onStatusChange}
          counts={counts}
          liveMatchesList={liveMatchesList}
          upcomingMatchesList={upcomingMatchesList}
          scoresMap={scoresMap}
          onSelectMatch={onSelectMatch}
          railContainerRef={railContainerRef}
        />
      </div>

      <LiveMobileMatchSheet
        isOpen={isMobileSheetOpen}
        onClose={() => setIsMobileSheetOpen(false)}
        filteredMatches={filteredMatches}
        selectedMatch={selectedMatch}
        scoresMap={scoresMap}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        selectedStatus={selectedStatus}
        onStatusChange={onStatusChange}
        counts={counts}
        liveMatchesList={liveMatchesList}
        upcomingMatchesList={upcomingMatchesList}
        onSelectMatch={handleSelectMatchFromSheet}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}

