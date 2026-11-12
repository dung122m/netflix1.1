"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Radio } from "lucide-react";
import type {
  FootballMatch,
  LiveFootballData,
} from "@/services/live/football/service";
import { clearProbeQueue } from "@/services/live/football/clientSourceProbe";
import { toCanonicalSourceUrl } from "@/services/live/shared/streamUrlHelper";
import type {
  LiveMatchScore,
  NormalizedMatchSummary,
} from "@/services/live/football-score/types";
import { mergeNormalizedSummaries } from "@/services/live/football-score/matchCenterRealtime";
import { resolveCanonicalTournament } from "@/services/live/football-score/canonicalLeagues";
import { useLiveScoresRealtime } from "./hooks/useLiveScoresRealtime";
import { useLiveFootballFilters } from "./hooks/useLiveFootballFilters";
import { LiveFilterCommandBar } from "./LiveFilterCommandBar";
import { LiveMatchGroupsList } from "./LiveMatchGroupsList";
import { LiveTheaterWatchView } from "./LiveTheaterWatchView";

export interface LiveFootballClientProps {
  initialData: LiveFootballData;
  initialScores?: Record<string, LiveMatchScore> | null;
  hideHeader?: boolean;
  isActive?: boolean;
  selectedSport?: string;
  onSportChange?: (sport: string) => void;
  onMatchesCountChange?: (count: number) => void;
  onMatchSelectedChange?: (hasMatch: boolean) => void;
}

/**
 * Top-level client orchestrator for the Live Sports hub: coordinates realtime
 * match/score polling, URL/filter state, Theater Watch mode, and match discovery.
 */
export function LiveFootballClient({
  initialData,
  initialScores,
  hideHeader = false,
  isActive = true,
  selectedSport,
  onSportChange,
  onMatchesCountChange,
  onMatchSelectedChange,
}: LiveFootballClientProps) {
  const searchParams = useSearchParams();
  const { liveMatches, scoresMap, now } = useLiveScoresRealtime({
    initialMatches: initialData.matches,
    initialScores,
    isActive,
  });

  const [activeSection, setActiveSection] = useState<
    "matches" | "match-center" | "standings"
  >("matches");
  const [sidePanelTab, setSidePanelTab] = useState<"timeline" | "matches">("matches");

  const initialMatch = useMemo(() => {
    const matchParam = searchParams.get("match");
    if (matchParam) {
      // 1. Khớp chính xác ID
      const exact = liveMatches.find((m) => m.id === matchParam);
      if (exact) return exact;

      // 2. Khớp theo tiền tố ID bỏ phần đuôi thời gian (vd: URL mang _07000211 nhưng nguồn stream đổi thành _07250211)
      const paramBase = matchParam.replace(/_\d{6,10}$/, "");
      if (paramBase && paramBase.length > 8) {
        const fuzzy = liveMatches.find((m) => m.id.startsWith(paramBase));
        if (fuzzy) return fuzzy;
      }

      // 3. Khớp theo tiêu đề trận đấu
      const found = liveMatches.find((m) =>
        m.title.toLowerCase().includes(matchParam.toLowerCase()),
      );
      if (found) return found;
    }
    return null;
  }, [liveMatches, searchParams]);

  const hasUserSelectedRef = useRef(false);
  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(initialMatch);
  const [matchSummary, setMatchSummary] = useState<NormalizedMatchSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const matchSummaryMemoryRef = useRef<Map<string, NormalizedMatchSummary>>(new Map());

  const handleSummaryChange = useCallback(
    (newSummary: NormalizedMatchSummary | null) => {
      if (!newSummary) {
        return;
      }
      setMatchSummary((prev) => {
        const merged =
          !prev || prev.eventId !== newSummary.eventId
            ? newSummary
            : mergeNormalizedSummaries(prev, newSummary);

        if (selectedMatch?.id) {
          matchSummaryMemoryRef.current.set(selectedMatch.id, merged);
        }
        return merged;
      });
    },
    [selectedMatch?.id],
  );

  // Tra cứu tỷ số và định danh sự kiện livescore cho trận đang chọn (hỗ trợ fallback nếu ID bị đổi đuôi thời gian)
  const currentMatchScore = useMemo(() => {
    if (!selectedMatch) return null;
    if (scoresMap[selectedMatch.id]) return scoresMap[selectedMatch.id];
    if (selectedMatch.score) return selectedMatch.score;
    const baseId = selectedMatch.id.replace(/_\d{6,10}$/, "");
    if (baseId && baseId.length > 8) {
      const matchedKey = Object.keys(scoresMap).find((k) => k.startsWith(baseId));
      if (matchedKey) return scoresMap[matchedKey];
    }
    return null;
  }, [selectedMatch, scoresMap]);

  // Tên giải đấu chuẩn hóa của trận đang chọn cho thanh điều hướng
  const selectedMatchTournament = useMemo(() => {
    if (!selectedMatch) return "";
    return (
      resolveCanonicalTournament({
        tournament: selectedMatch.tournament,
        title: selectedMatch.title,
        sport: selectedMatch.sport,
        team1: selectedMatch.team1,
        team2: selectedMatch.team2,
        category: selectedMatch.category,
        gender: selectedMatch.gender,
        score: currentMatchScore,
      }) ||
      selectedMatch.tournament ||
      "Trực tiếp"
    );
  }, [selectedMatch, currentMatchScore]);

  const lastMatchIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedMatch?.id !== lastMatchIdRef.current) {
      lastMatchIdRef.current = selectedMatch?.id || null;
      const cached = selectedMatch?.id
        ? matchSummaryMemoryRef.current.get(selectedMatch.id)
        : null;
      if (cached) {
        setMatchSummary(cached);
        setIsSummaryLoading(false);
      } else {
        setMatchSummary(null);
        setIsSummaryLoading(
          Boolean(currentMatchScore?.eventId && currentMatchScore?.leagueSlug),
        );
      }
    }
  }, [selectedMatch?.id, currentMatchScore?.eventId, currentMatchScore?.leagueSlug]);

  // Fail-safe chống kẹt spinner loading diễn biến nếu upstream chậm hoặc mạng lỗi
  useEffect(() => {
    if (!isSummaryLoading) return;
    const timer = setTimeout(() => {
      setIsSummaryLoading(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [isSummaryLoading]);

  const hasTimelineEvents = Boolean(
    (matchSummary?.events && matchSummary.events.length > 0) ||
      (matchSummary?.commentary && matchSummary.commentary.length > 0) ||
      (matchSummary?.stats && matchSummary.stats.length > 0),
  );
  const prevMatchIdRef = useRef<string | null>(null);
  const prevHasEventsRef = useRef<boolean>(false);

  // Quản lý tab side panel: Trận không có dữ liệu diễn biến thì mặc định mở 'Đổi trận', có dữ liệu mới mở 'Diễn biến'
  useEffect(() => {
    const isNewMatch = prevMatchIdRef.current !== selectedMatch?.id;
    const justReceivedEvents = !prevHasEventsRef.current && hasTimelineEvents;

    prevMatchIdRef.current = selectedMatch?.id || null;
    prevHasEventsRef.current = hasTimelineEvents;

    if (isNewMatch) {
      setSidePanelTab(hasTimelineEvents ? "timeline" : "matches");
    } else if (justReceivedEvents) {
      setSidePanelTab("timeline");
    } else if (!hasTimelineEvents) {
      setSidePanelTab("matches");
    }
  }, [hasTimelineEvents, selectedMatch?.id]);

  // Đồng bộ trạng thái xem trận lên LiveHubClient để bật/tắt Cinema Mode
  useEffect(() => {
    onMatchSelectedChange?.(Boolean(selectedMatch));
  }, [selectedMatch, onMatchSelectedChange]);

  // Khôi phục trận đấu khi URL có param ?match= (nếu không có, giữ null để vào thẳng Match Discovery)
  useEffect(() => {
    if (hasUserSelectedRef.current) return;
    if (initialMatch) {
      setSelectedMatch(initialMatch);
    }
  }, [initialMatch]);

  // Đồng bộ selectedMatch với bản ghi mới nhất khi liveMatches cập nhật qua polling (không tự đổi trận khác)
  useEffect(() => {
    if (!selectedMatch) return;
    let updated = liveMatches.find((m) => m.id === selectedMatch.id);
    if (!updated) {
      const baseId = selectedMatch.id.replace(/_\d{6,10}$/, "");
      if (baseId && baseId.length > 8) {
        updated = liveMatches.find((m) => m.id.startsWith(baseId));
      }
    }
    if (!updated) return;

    const isServersChanged =
      (updated.servers?.length || 0) !== (selectedMatch.servers?.length || 0) ||
      updated.servers?.some(
        (s, i) =>
          toCanonicalSourceUrl(s.url) !==
            toCanonicalSourceUrl(selectedMatch.servers?.[i]?.url) ||
          s.name !== selectedMatch.servers?.[i]?.name,
      );

    const isMetadataChanged =
      updated.homeLogo !== selectedMatch.homeLogo ||
      updated.awayLogo !== selectedMatch.awayLogo ||
      updated.logo !== selectedMatch.logo ||
      updated.timeline !== selectedMatch.timeline ||
      updated.title !== selectedMatch.title ||
      updated.time !== selectedMatch.time;

    if (isServersChanged) {
      setSelectedMatch(updated);
    } else if (isMetadataChanged) {
      setSelectedMatch((prev) => {
        if (!prev || prev.id !== updated.id) return prev;
        return {
          ...updated,
          servers: prev.servers,
        };
      });
    }
  }, [liveMatches, selectedMatch]);

  const playerRef = useRef<HTMLDivElement>(null);
  const railContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollToPlayerRef = useRef<boolean>(false);

  // Cuộn mượt mà đưa người dùng về khu vực player, tự động trừ bù chiều cao Navbar
  const scrollToPlayerArea = useCallback(() => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      if (playerRef.current) {
        const rect = playerRef.current.getBoundingClientRect();
        const navbarHeight = window.innerWidth >= 640 ? 64 : 58;
        const targetY = Math.max(0, window.scrollY + rect.top - navbarHeight);
        window.scrollTo({ top: targetY, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, []);

  // Đồng bộ vị trí cuộn khi React đã mount player sau khi chọn trận
  useEffect(() => {
    if (!selectedMatch?.id || !pendingScrollToPlayerRef.current) return;
    pendingScrollToPlayerRef.current = false;
    const rafId = requestAnimationFrame(() => {
      scrollToPlayerArea();
    });
    return () => cancelAnimationFrame(rafId);
  }, [selectedMatch?.id, scrollToPlayerArea]);

  // Cân bằng chiều cao Side Panel chuẩn xác theo khung Video Player trên Desktop (>=1024px)
  const [sidePanelHeight, setSidePanelHeight] = useState<number | undefined>(
    undefined,
  );

  const handleVideoHeightChange = useCallback((height: number) => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth >= 1024 &&
      height > 0
    ) {
      setSidePanelHeight(height);
    }
  }, []);

  const handlePopstateMatchFound = useCallback((match: FootballMatch | null) => {
    if (match) {
      setSelectedMatch(match);
      pendingScrollToPlayerRef.current = true;
    } else {
      setSelectedMatch(null);
    }
  }, []);

  const {
    selectedStatus,
    searchQuery,
    onlyFeatured,
    counts,
    filteredMatches,
    liveMatchesList,
    upcomingMatchesList,
    hasActiveFilters,
    updateUrl,
    handleStatusChange,
    handleSearchChange,
    handleFeaturedToggle,
    handleResetFilters,
  } = useLiveFootballFilters({
    liveMatches,
    scoresMap,
    now,
    selectedSport,
    onSportChange,
    onMatchesCountChange,
    onActiveSectionChange: setActiveSection,
    onPopstateMatchFound: handlePopstateMatchFound,
  });

  const handleClosePlayer = useCallback(() => {
    hasUserSelectedRef.current = true;
    setSelectedMatch(null);
    updateUrl({ match: null }, false);
  }, [updateUrl]);

  // Tự động chuẩn hóa URL nếu URL mang ID cũ bị lệch đuôi thời gian so với ID thực tế
  useEffect(() => {
    if (!selectedMatch) return;
    const matchParam = searchParams.get("match");
    if (matchParam && matchParam !== selectedMatch.id) {
      const baseParam = matchParam.replace(/_\d{6,10}$/, "");
      if (
        baseParam &&
        baseParam.length > 8 &&
        selectedMatch.id.startsWith(baseParam)
      ) {
        updateUrl({ match: selectedMatch.id }, false);
      }
    }
  }, [selectedMatch, searchParams, updateUrl]);

  const scrollToActiveMatch = useCallback(
    (smooth = true) => {
      if (!railContainerRef.current || !selectedMatch?.id) return false;
      const container = railContainerRef.current;
      if (container.clientHeight === 0) return false;
      const targetCard = container.querySelector<HTMLElement>(
        `[data-match-id="${selectedMatch.id}"]`,
      );
      if (!targetCard || targetCard.clientHeight === 0) return false;

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetCard.getBoundingClientRect();
      const relativeTop =
        targetRect.top - containerRect.top + container.scrollTop;

      // Tìm thanh tiêu đề dính (sticky header "Đang trực tiếp" hoặc "Sắp diễn ra")
      const sectionContainer =
        targetCard.closest(".space-y-1\\.5")?.parentElement ||
        targetCard.parentElement;
      const stickyHeader =
        sectionContainer?.querySelector<HTMLElement>(".sticky") ||
        container.querySelector<HTMLElement>(".sticky");
      const stickyHeaderHeight = stickyHeader ? stickyHeader.offsetHeight : 38;

      // Trừ đi chiều cao sticky header + khoảng đệm an toàn 10px để card không bao giờ bị tiêu đề dính che khuất
      const targetScrollTop = Math.max(
        0,
        relativeTop - stickyHeaderHeight - 10,
      );

      container.scrollTo({
        top: targetScrollTop,
        behavior: smooth ? "smooth" : "auto",
      });
      return true;
    },
    [selectedMatch?.id],
  );

  useEffect(() => {
    if (!selectedMatch?.id) return;

    let attempts = 0;
    const maxAttempts = 8;
    let timer: NodeJS.Timeout | null = null;

    const runScroll = () => {
      const scrolled = scrollToActiveMatch(true);
      if (!scrolled && attempts < maxAttempts) {
        attempts++;
        timer = setTimeout(runScroll, 100);
      }
    };

    timer = setTimeout(runScroll, 100);

    // Căn chỉnh lại vị trí sau 600ms khi ảnh logo và font chữ đã render xong
    const finalTimer = setTimeout(() => {
      scrollToActiveMatch(false);
    }, 600);

    return () => {
      if (timer) clearTimeout(timer);
      clearTimeout(finalTimer);
    };
  }, [selectedMatch?.id, filteredMatches.length, scrollToActiveMatch]);


  const handleSelectMatch = useCallback(
    (match: FootballMatch) => {
      hasUserSelectedRef.current = true;
      clearProbeQueue();
      setSelectedMatch(match);
      try {
        localStorage.setItem("nanaflix_live_match_id", match.id);
      } catch {}
      updateUrl({ match: match.id }, true);
      pendingScrollToPlayerRef.current = true;
      scrollToPlayerArea();
      if (window.innerWidth >= 1024) {
        setTimeout(() => scrollToActiveMatch(true), 50);
      }
    },
    [updateUrl, scrollToPlayerArea, scrollToActiveMatch],
  );

  return (
    <div
      className={
        hideHeader
          ? selectedMatch
            ? "space-y-2 sm:space-y-2.5"
            : "space-y-4"
          : "max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 pt-20 pb-16 space-y-4"
      }
    >
      {/* TIÊU ĐỀ TRANG (CHỈ HIỆN KHI KHÔNG NHÚNG TRONG HUB) */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-3">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-netflix-red animate-pulse" />
            <span>Trực tiếp thể thao</span>
          </h1>
        </div>
      )}

      {/* KHU VỰC 1: SÂN CỎ TRỰC TIẾP & MATCH DISCOVERY / MATCH CENTER */}
      <div>
        <div className="space-y-6">
          {selectedMatch ? (
            <LiveTheaterWatchView
              selectedMatch={selectedMatch}
              selectedMatchTournament={selectedMatchTournament}
              currentMatchScore={currentMatchScore}
              matchSummary={matchSummary}
              isSummaryLoading={isSummaryLoading}
              hasTimelineEvents={hasTimelineEvents}
              sidePanelTab={sidePanelTab}
              onSidePanelTabChange={setSidePanelTab}
              sidePanelHeight={sidePanelHeight}
              filteredMatches={filteredMatches}
              liveMatchesList={liveMatchesList}
              upcomingMatchesList={upcomingMatchesList}
              scoresMap={scoresMap}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
              counts={counts}
              isActive={isActive}
              playerHeaderRef={playerRef}
              railContainerRef={railContainerRef}
              onClosePlayer={handleClosePlayer}
              onSelectMatch={handleSelectMatch}
              onSummaryChange={handleSummaryChange}
              onLoadingChange={setIsSummaryLoading}
              onVideoHeightChange={handleVideoHeightChange}
            />
          ) : (
            <>
              <LiveFilterCommandBar
                activeSection={activeSection}
                selectedStatus={selectedStatus}
                onlyFeatured={onlyFeatured}
                searchQuery={searchQuery}
                filteredCount={filteredMatches.length}
                counts={counts}
                hasActiveFilters={hasActiveFilters}
                onStatusChange={handleStatusChange}
                onFeaturedToggle={handleFeaturedToggle}
                onToggleStandings={() =>
                  setActiveSection((prev) =>
                    prev === "standings" ? "matches" : "standings",
                  )
                }
                onSearchChange={handleSearchChange}
                onResetFilters={handleResetFilters}
              />
              <LiveMatchGroupsList
                activeSection={activeSection}
                liveMatchesList={liveMatchesList}
                upcomingMatchesList={upcomingMatchesList}
                filteredCount={filteredMatches.length}
                scoresMap={scoresMap}
                searchQuery={searchQuery}
                hasActiveFilters={hasActiveFilters}
                onCloseStandings={() => setActiveSection("matches")}
                onSelectMatch={handleSelectMatch}
                onResetFilters={handleResetFilters}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
