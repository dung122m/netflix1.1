"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  FootballMatch,
  LiveFootballData,
  getMatchTimeline,
  getStreamHealthStatus,
} from "@/services/liveFootballService";
import { clearProbeQueue } from "@/services/live/football/clientSourceProbe";
import { isRawNumericOrArtifactTournament } from "@/data/live/teamAssets";
import { LivePlayer, toCanonicalSourceUrl } from "./LivePlayer";
import { MatchCard } from "./MatchCard";
import { MatchCenter } from "./MatchCenter";
import { LeagueStandings } from "./LeagueStandings";
import { LiveMatchScore } from "@/services/live/football-score/types";
import { isValidKickoffTimestamp } from "@/services/live/football-score/liveStatus";
import {
  Search,
  Radio,
  X,
  Clock,
  Zap,
  Activity,
  Trophy,
} from "lucide-react";

interface LiveFootballClientProps {
  initialData: LiveFootballData;
  hideHeader?: boolean;
  isActive?: boolean;
  onMatchesCountChange?: (count: number) => void;
}

export function LiveFootballClient({
  initialData,
  hideHeader = false,
  isActive = true,
  onMatchesCountChange,
}: LiveFootballClientProps) {
  const { channels } = initialData;
  const searchParams = useSearchParams();
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>(
    initialData.matches,
  );
  const [activeSection, setActiveSection] = useState<
    "matches" | "match-center" | "standings"
  >("matches");

  // Đồng bộ khi dữ liệu từ server thay đổi hoặc khi lọc kênh
  useEffect(() => {
    setLiveMatches(initialData.matches);
  }, [initialData.matches]);

  useEffect(() => {
    onMatchesCountChange?.(liveMatches.length);
  }, [liveMatches.length, onMatchesCountChange]);

  const isMatchesFetchingRef = useRef(false);
  const wasActiveMatchesRef = useRef(isActive);

  // TỰ ĐỘNG LÀM MỚI DANH SÁCH TRẬN ĐẤU MỖI 3 PHÚT (không cần F5)
  useEffect(() => {
    if (!isActive) {
      wasActiveMatchesRef.current = false;
      return;
    }

    let isEffectActive = true;
    const abortController = new AbortController();

    const refreshMatches = async () => {
      if (isMatchesFetchingRef.current) return;
      isMatchesFetchingRef.current = true;
      try {
        const timeoutSignal = AbortSignal.timeout(8000);
        const signal =
          typeof AbortSignal.any === "function"
            ? AbortSignal.any([abortController.signal, timeoutSignal])
            : abortController.signal;

        const res = await fetch("/api/live-football/matches", {
          signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (
          isEffectActive &&
          json.status &&
          Array.isArray(json.data?.matches) &&
          json.data.matches.length > 0
        ) {
          setLiveMatches(json.data.matches);
        }
      } catch {
        // Giữ nguyên dữ liệu cũ nếu fetch thất bại hoặc bị hủy
      } finally {
        isMatchesFetchingRef.current = false;
      }
    };

    const isReturningFromInactive = !wasActiveMatchesRef.current;
    wasActiveMatchesRef.current = true;

    // Khi quay lại tab sau khi inactive: làm mới sau 5s thay vì đợi 3 phút
    const initialDelay = setTimeout(
      refreshMatches,
      isReturningFromInactive ? 5000 : 30_000,
    );
    const interval = setInterval(refreshMatches, 3 * 60 * 1000);

    return () => {
      isEffectActive = false;
      abortController.abort();
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isActive]);

  // Bản đồ tỷ số livescore được làm mới mỗi 60s
  const [scoresMap, setScoresMap] = useState<Record<string, LiveMatchScore>>(() => {
    const initialMap: Record<string, LiveMatchScore> = {};
    if (initialData?.matches) {
      for (const m of initialData.matches) {
        if (m.score) {
          initialMap[m.id] = m.score;
        }
      }
    }
    return initialMap;
  });

  // TỰ ĐỘNG CẬP NHẬT TỶ SỐ LIVESCORE: 15S KHI CÓ TRẬN LIVE, 60S KHI KHÔNG CÓ TRẬN LIVE
  const hasLiveMatches = useMemo(() => {
    return (
      liveMatches.some((m) => m.timeline === "live") ||
      Object.values(scoresMap).some((s) => s.status === "live")
    );
  }, [liveMatches, scoresMap]);

  const isScoresFetchingRef = useRef(false);
  const wasActiveScoresRef = useRef(isActive);

  useEffect(() => {
    if (!isActive) {
      wasActiveScoresRef.current = false;
      return;
    }

    let isEffectActive = true;
    const abortController = new AbortController();

    const fetchScores = async () => {
      if (isScoresFetchingRef.current) return;
      isScoresFetchingRef.current = true;
      try {
        const timeoutSignal = AbortSignal.timeout(6000);
        const signal =
          typeof AbortSignal.any === "function"
            ? AbortSignal.any([abortController.signal, timeoutSignal])
            : abortController.signal;

        const res = await fetch("/api/live-football/scores", {
          signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (isEffectActive && json.status && json.data?.scores) {
          setScoresMap((prev) => ({
            ...prev,
            ...json.data.scores,
          }));
        }
      } catch {
        // Giữ nguyên dữ liệu cũ nếu fetch thất bại hoặc bị hủy
      } finally {
        isScoresFetchingRef.current = false;
      }
    };

    const pollIntervalMs = hasLiveMatches ? 15_000 : 60_000;
    const isReturningFromInactive = !wasActiveScoresRef.current;
    wasActiveScoresRef.current = true;

    let initialTimer: NodeJS.Timeout | null = null;
    if (isReturningFromInactive) {
      // Khi tab bóng đá active trở lại: fetch ngay lập tức để cập nhật tỷ số mới nhất
      fetchScores();
    } else {
      // Khi vừa mount ban đầu: chờ 3s để nhường luồng tải ban đầu cho player
      initialTimer = setTimeout(fetchScores, 3000);
    }

    const interval = setInterval(fetchScores, pollIntervalMs);

    return () => {
      isEffectActive = false;
      abortController.abort();
      if (initialTimer) clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isActive, hasLiveMatches]);

  const initialMatch = useMemo(() => {
    const matchParam = searchParams.get("match");
    if (matchParam) {
      const found = liveMatches.find(
        (m) =>
          m.id === matchParam ||
          m.title.toLowerCase().includes(matchParam.toLowerCase()),
      );
      if (found) return found;
    }
    return null;
  }, [liveMatches, searchParams]);

  // Đồng hồ cập nhật sau mount phục vụ phân loại cửa sổ thời gian trước kickoff
  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    if (!isActive) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(timer);
  }, [isActive]);

  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(initialMatch);

  useEffect(() => {
    setSelectedMatch(initialMatch);
  }, [initialMatch]);

  // Khôi phục trận đấu đã lưu từ localStorage sau khi mount
  useEffect(() => {
    const matchParam = searchParams.get("match");
    if (!matchParam) {
      try {
        const savedId = localStorage.getItem("nanaflix_live_match_id");
        if (savedId) {
          const found = liveMatches.find(
            (m) =>
              m.id === savedId ||
              m.title.toLowerCase().includes(savedId.toLowerCase()),
          );
          if (found) {
            setSelectedMatch(found);
          }
        }
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Đồng bộ selectedMatch với bản ghi mới nhất
  useEffect(() => {
    if (!selectedMatch) return;
    const updated = liveMatches.find((m) => m.id === selectedMatch.id);
    if (!updated) return;

    const isServersChanged =
      (updated.servers?.length || 0) !== (selectedMatch.servers?.length || 0) ||
      updated.servers?.some(
        (s, i) =>
          toCanonicalSourceUrl(s.url) !==
            toCanonicalSourceUrl(selectedMatch.servers?.[i]?.url) ||
          s.name !== selectedMatch.servers?.[i]?.name
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
        if (!prev) return updated;
        return {
          ...updated,
          servers: prev.servers,
        };
      });
    }
  }, [liveMatches, selectedMatch]);

  const [selectedFootballGroup, setSelectedFootballGroup] = useState<string>(
    () => searchParams.get("group") || "all",
  );
  const [selectedTournament, setSelectedTournament] = useState<string>(
    () => searchParams.get("tournament") || "all",
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    () => searchParams.get("q") || "",
  );
  const [onlyFhd, setOnlyFhd] = useState<boolean>(
    () => searchParams.get("fhd") === "1",
  );
  const [showMatchRail, setShowMatchRail] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);

  const updateUrl = useCallback(
    (
      updates: {
        match?: string | null;
        tournament?: string | null;
        group?: string | null;
        q?: string | null;
        fhd?: boolean | null;
      },
      pushHistory = false,
    ) => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "football");
        url.searchParams.delete("channel");

        if (updates.match !== undefined) {
          if (updates.match) url.searchParams.set("match", updates.match);
          else url.searchParams.delete("match");
        }

        if (updates.tournament !== undefined) {
          if (updates.tournament && updates.tournament !== "all") {
            url.searchParams.set("tournament", updates.tournament);
          } else {
            url.searchParams.delete("tournament");
          }
        }

        if (updates.group !== undefined) {
          if (updates.group && updates.group !== "all") {
            url.searchParams.set("group", updates.group);
          } else {
            url.searchParams.delete("group");
          }
        }

        if (updates.q !== undefined) {
          if (updates.q && updates.q.trim()) {
            url.searchParams.set("q", updates.q.trim());
          } else {
            url.searchParams.delete("q");
          }
        }

        if (updates.fhd !== undefined) {
          if (updates.fhd) {
            url.searchParams.set("fhd", "1");
          } else {
            url.searchParams.delete("fhd");
          }
        }

        if (pushHistory) {
          window.history.pushState(null, "", url.toString());
        } else {
          window.history.replaceState(null, "", url.toString());
        }
      } catch { }
    },
    [],
  );

  const enrichedMatches = useMemo(() => {
    return liveMatches.map((m) => {
      if (now === 0) {
        const isLive = m.timeline === "live";
        const isUpcoming2h = m.timeline === "upcoming";
        let sectionState: "live" | "upcoming_2h" | "hidden" = "hidden";
        if (isLive) sectionState = "live";
        else if (isUpcoming2h) sectionState = "upcoming_2h";
        return {
          ...m,
          sectionState,
        };
      }

      const hasReliableTimestamp =
        m.timestamp !== undefined &&
        m.timestamp !== null &&
        m.timestamp > 0 &&
        m.timestamp !== Number.MAX_SAFE_INTEGER;

      const timeline = getMatchTimeline(
        m.timestamp,
        m.sourceStatus,
        m.servers &&
          m.servers.length > 0 &&
          m.servers.some((s) => getStreamHealthStatus(s.url) === "alive")
          ? "alive"
          : m.servers &&
              m.servers.length > 0 &&
              m.servers.every((s) => getStreamHealthStatus(s.url) === "dead")
            ? "dead"
            : "unknown",
        now,
      );

      const liveScoreStatus = scoresMap[m.id]?.status;
      const isConfirmedLive = liveScoreStatus === "live" || timeline === "live";

      const hasKickoffValid = isValidKickoffTimestamp(m.timestamp);
      const isUpcoming2h =
        timeline === "upcoming" &&
        hasKickoffValid &&
        hasReliableTimestamp &&
        m.timestamp! >= now - 5 * 60 * 1000 &&
        m.timestamp! <= now + 2 * 60 * 60 * 1000;

      let sectionState: "live" | "upcoming_2h" | "hidden" = "hidden";
      if (isConfirmedLive) {
        sectionState = "live";
      } else if (isUpcoming2h) {
        sectionState = "upcoming_2h";
      }

      return {
        ...m,
        sectionState,
      };
    });
  }, [liveMatches, now, scoresMap]);

  const availableTournaments = useMemo(() => {
    const tourMap: Record<string, number> = {};
    enrichedMatches.forEach((m) => {
      if (m.sectionState === "hidden") return;
      if (
        m.tournament &&
        m.tournament !== "Kênh Thể Thao 24/7" &&
        !isRawNumericOrArtifactTournament(m.tournament)
      ) {
        const cleanName = m.tournament.toWellFormed().replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s🔴🟢🟡⚪🟠⚽🏀🏐🏸🎾🎱🥊🏎️🏆]+/u, "").trim();
        if (cleanName) {
          tourMap[cleanName] = (tourMap[cleanName] || 0) + 1;
        }
      }
    });

    return Object.entries(tourMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [enrichedMatches]);

  const allVisibleMatches = useMemo(() => {
    return enrichedMatches.filter((m) => m.sectionState !== "hidden");
  }, [enrichedMatches]);

  const liveMatchesList = useMemo(() => {
    return enrichedMatches.filter((m) => {
      if (m.sectionState !== "live") return false;

      if (
        selectedFootballGroup !== "all" &&
        m.group !== selectedFootballGroup &&
        !m.groups?.includes(selectedFootballGroup)
      ) {
        return false;
      }

      if (selectedTournament !== "all") {
        const cleanTournament = m.tournament?.toWellFormed().replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s🔴🟢🟡⚪🟠⚽🏀🏐🏸🎾🎱🥊🏎️🏆]+/u, "").trim();
        if (cleanTournament !== selectedTournament) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = m.title.toLowerCase().includes(q);
        const inBLV = m.blv ? m.blv.toLowerCase().includes(q) : false;
        const inTournament = m.tournament
          ? m.tournament.toLowerCase().includes(q)
          : false;
        if (!inTitle && !inBLV && !inTournament) return false;
      }

      if (onlyFhd) {
        const isFhd =
          m.quality?.includes("FHD") ||
          m.quality?.includes("1080p") ||
          m.servers?.some(
            (s) => s.name.includes("FHD") || s.name.includes("1080p"),
          );
        if (!isFhd) return false;
      }

      return true;
    });
  }, [
    enrichedMatches,
    selectedFootballGroup,
    selectedTournament,
    searchQuery,
    onlyFhd,
  ]);

  const upcomingMatchesList = useMemo(() => {
    return enrichedMatches.filter((m) => {
      if (m.sectionState !== "upcoming_2h") return false;

      if (
        selectedFootballGroup !== "all" &&
        m.group !== selectedFootballGroup &&
        !m.groups?.includes(selectedFootballGroup)
      ) {
        return false;
      }

      if (selectedTournament !== "all") {
        const cleanTournament = m.tournament?.toWellFormed().replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s🔴🟢🟡⚪🟠⚽🏀🏐🏸🎾🎱🥊🏎️🏆]+/u, "").trim();
        if (cleanTournament !== selectedTournament) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = m.title.toLowerCase().includes(q);
        const inBLV = m.blv ? m.blv.toLowerCase().includes(q) : false;
        const inTournament = m.tournament
          ? m.tournament.toLowerCase().includes(q)
          : false;
        if (!inTitle && !inBLV && !inTournament) return false;
      }

      if (onlyFhd) {
        const isFhd =
          m.quality?.includes("FHD") ||
          m.quality?.includes("1080p") ||
          m.servers?.some(
            (s) => s.name.includes("FHD") || s.name.includes("1080p"),
          );
        if (!isFhd) return false;
      }

      return true;
    });
  }, [
    enrichedMatches,
    selectedFootballGroup,
    selectedTournament,
    searchQuery,
    onlyFhd,
  ]);

  const handleSelectMatch = useCallback(
    (match: FootballMatch) => {
      clearProbeQueue();
      setSelectedMatch(match);
      try {
        localStorage.setItem("nanaflix_live_match_id", match.id);
      } catch {}
      updateUrl({ match: match.id }, true);
      if (window.innerWidth < 1024 && playerRef.current) {
        playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [updateUrl],
  );

  const handleTournamentChange = useCallback(
    (tournament: string) => {
      setSelectedTournament(tournament);
      updateUrl({ tournament: tournament === "all" ? null : tournament });
    },
    [updateUrl],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      updateUrl({ q: query.trim() || null });
    },
    [updateUrl],
  );

  const handleFhdToggle = useCallback(() => {
    setOnlyFhd((prev) => {
      const next = !prev;
      updateUrl({ fhd: next });
      return next;
    });
  }, [updateUrl]);

  const handleResetFilters = useCallback(() => {
    setSelectedFootballGroup("all");
    setSelectedTournament("all");
    setSearchQuery("");
    setOnlyFhd(false);
    updateUrl({ group: null, tournament: null, q: null, fhd: null });
  }, [updateUrl]);

  const hasActiveFilters =
    selectedFootballGroup !== "all" ||
    selectedTournament !== "all" ||
    searchQuery.trim() !== "" ||
    onlyFhd;

  return (
    <div
      className={
        hideHeader
          ? "space-y-4"
          : "max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 pt-20 pb-16 space-y-4"
      }
    >
      {/* TIÊU ĐỀ TRANG (CHỈ HIỆN KHI KHÔNG NHÚNG TRONG HUB) */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-xs font-bold animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>NANA SPORTS LIVE</span>
              </span>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Full HD 1080p • Tốc độ cao
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">
              Trực Tiếp Bóng Đá & Thể Thao
            </h1>
          </div>
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG PHÂN VÙNG THỂ THAO (SPORTS HUB NAVIGATION) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {/* Nút Sân Cỏ Trực Tiếp & Match Center */}
          <button
            type="button"
            onClick={() => setActiveSection("matches")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red shrink-0 ${
              activeSection === "matches" || activeSection === "match-center"
                ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-lg shadow-red-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Sân Cỏ Trực Tiếp & Match Center</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeSection === "matches" || activeSection === "match-center"
                  ? "bg-black/50 text-white"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {liveMatchesList.length + upcomingMatchesList.length}
            </span>
          </button>

          {/* Nút Bảng Xếp Hạng */}
          <button
            type="button"
            onClick={() => setActiveSection("standings")}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0 ${
              activeSection === "standings"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Bảng Xếp Hạng Giải Đấu</span>
            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              BXH
            </span>
          </button>
        </div>

        {/* Live Match Counter Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-gray-300 shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>
            {liveMatchesList.length} trận đang đá • {upcomingMatchesList.length} sắp phát
          </span>
        </div>
      </div>

      {/* KHU VỰC 1: SÂN CỎ TRỰC TIẾP & MATCH CENTER */}
      {(activeSection === "matches" || activeSection === "match-center") && (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* DESKTOP (>= lg): BỐ CỤC THEATER STUDIO 2 CỘT (65% / 35%)     */}
          {/* ============================================================ */}
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 items-start">
            {/* CỘT TRÁI (COL 1-8 TRÊN DESKTOP, TOÀN BỘ CHIỀU RỘNG TRÊN MOBILE): LIVE PLAYER & MATCH CENTER */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* KHUNG PHÁT VIDEO CHÍNH (DUY NHẤT 1 INSTANCE PLAYER) */}
              {selectedMatch ? (
                <div ref={playerRef} className="space-y-3">
                  <LivePlayer
                    match={selectedMatch}
                    title={selectedMatch.title}
                    servers={selectedMatch.servers}
                    blv={selectedMatch.blv}
                    time={selectedMatch.time}
                    score={scoresMap[selectedMatch.id] || selectedMatch.score}
                    matchOptions={
                      allVisibleMatches.length > 0 ? allVisibleMatches : [selectedMatch]
                    }
                    onSelectMatch={handleSelectMatch}
                    showMatchRail={showMatchRail}
                    onToggleMatchRail={() => setShowMatchRail((prev) => !prev)}
                    onCloseMatchRail={() => setShowMatchRail(false)}
                    isActive={isActive}
                  />

                  {/* Thanh thông tin nhanh dưới player */}
                  <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-zinc-950/80 border border-white/10 text-xs shadow-md">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-gray-300 truncate">
                        Đang phát: <strong className="text-white font-black">{selectedMatch.title}</strong>
                        {selectedMatch.blv && (
                          <span className="ml-1.5 text-orange-400 font-semibold">• BLV {selectedMatch.blv}</span>
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-netflix-red/20 text-rose-300 border border-netflix-red/30 shrink-0">
                      Tín hiệu chuẩn HD
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900/90 via-zinc-950/80 to-zinc-900/90 p-8 xl:p-12 text-center text-gray-400 shadow-2xl backdrop-blur-xl">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-netflix-red/10 border border-netflix-red/30 flex items-center justify-center text-netflix-red shadow-lg shadow-red-950/50">
                      <Radio className="w-7 h-7 animate-pulse" />
                    </div>
                    <h3 className="text-lg xl:text-xl font-black text-white">
                      Chọn một trận đấu bên danh sách để phát sóng trực tiếp
                    </h3>
                    <p className="text-xs xl:text-sm text-gray-400 leading-relaxed">
                      Phát sóng đầy đủ các trận cầu tâm điểm với bình luận viên Tiếng Việt, nhiều máy chủ tốc độ cao và số liệu trực tiếp Match Center.
                    </p>
                    {liveMatchesList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectMatch(liveMatchesList[0])}
                        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-black transition shadow-xl shadow-red-950/60 cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Xem ngay: {liveMatchesList[0].title}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TRÊN DESKTOP (>= lg): TRUNG TÂM THÔNG SỐ MATCH CENTER (TÍCH HỢP NGAY DƯỚI VIDEO) */}
              {selectedMatch && (
                <div className="hidden lg:block space-y-2 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-netflix-red" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Trung Tâm Trận Đấu & Diễn Biến Thời Gian Thực
                      </h3>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                      Tự động đồng bộ số liệu
                    </span>
                  </div>

                  <MatchCenter
                    leagueSlug={
                      (scoresMap[selectedMatch.id] || selectedMatch.score)?.leagueSlug
                    }
                    eventId={
                      (scoresMap[selectedMatch.id] || selectedMatch.score)?.eventId
                    }
                    matchTitle={selectedMatch.title}
                    team1={selectedMatch.team1}
                    team2={selectedMatch.team2}
                    isLive={
                      (scoresMap[selectedMatch.id] || selectedMatch.score)?.status === "live" ||
                      selectedMatch.timeline === "live"
                    }
                  />
                </div>
              )}

              {/* TRÊN MOBILE (< lg): SUB-TABS [TRẬN ĐẤU] / [MATCH CENTER] */}
              <div className="lg:hidden space-y-4 pt-1">
                {/* SUB-TABS TRÊN MOBILE */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveSection("matches")}
                    className={`py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
                      activeSection === "matches"
                        ? "bg-netflix-red text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>Danh Sách Trận ({allVisibleMatches.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection("match-center")}
                    className={`py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
                      activeSection === "match-center"
                        ? "bg-netflix-red text-white shadow-md"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <span>Match Center</span>
                  </button>
                </div>

                {/* NỘI DUNG MOBILE: DANH SÁCH TRẬN */}
                {activeSection === "matches" && (
                  <div className="space-y-4">
                    {/* Search & Filter Mobile */}
                    <div className="space-y-2">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm đội, BLV, giải đấu..."
                          className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => handleSearchChange("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Tournament Filter Pills Mobile */}
                      {availableTournaments.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
                          <button
                            type="button"
                            onClick={() => handleTournamentChange("all")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border shrink-0 ${
                              selectedTournament === "all"
                                ? "bg-white text-black border-white shadow-sm"
                                : "bg-zinc-900 text-gray-300 border-white/10"
                            }`}
                          >
                            Tất cả
                          </button>
                          {availableTournaments.map((t) => (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => handleTournamentChange(t.name)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border shrink-0 ${
                                selectedTournament === t.name
                                  ? "bg-netflix-red text-white border-netflix-red"
                                  : "bg-zinc-900 text-gray-300 border-white/10"
                              }`}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Danh sách trận đang phát */}
                    {liveMatchesList.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span>Đang phát trực tiếp ({liveMatchesList.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {liveMatchesList.map((match) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              score={scoresMap[match.id] || match.score}
                              isSelected={selectedMatch?.id === match.id}
                              onSelect={handleSelectMatch}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Danh sách trận sắp phát */}
                    {upcomingMatchesList.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <h3 className="text-xs font-black uppercase text-sky-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Sắp phát sóng ({upcomingMatchesList.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {upcomingMatchesList.map((match) => (
                            <MatchCard
                              key={match.id}
                              match={match}
                              score={scoresMap[match.id] || match.score}
                              isSelected={selectedMatch?.id === match.id}
                              onSelect={handleSelectMatch}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* NỘI DUNG MOBILE: MATCH CENTER */}
                {activeSection === "match-center" && (
                  <div>
                    {selectedMatch ? (
                      <MatchCenter
                        leagueSlug={
                          (scoresMap[selectedMatch.id] || selectedMatch.score)?.leagueSlug
                        }
                        eventId={
                          (scoresMap[selectedMatch.id] || selectedMatch.score)?.eventId
                        }
                        matchTitle={selectedMatch.title}
                        team1={selectedMatch.team1}
                        team2={selectedMatch.team2}
                        isLive={
                          (scoresMap[selectedMatch.id] || selectedMatch.score)?.status === "live" ||
                          selectedMatch.timeline === "live"
                        }
                      />
                    ) : (
                      <div className="p-8 text-center text-gray-400 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-2">
                        <Activity className="w-8 h-8 mx-auto text-gray-500" />
                        <p className="text-sm font-bold text-white">Chưa chọn trận đấu nào</p>
                        <p className="text-xs text-gray-400">Chọn một trận trong danh sách để xem chi tiết</p>
                        <button
                          type="button"
                          onClick={() => setActiveSection("matches")}
                          className="px-4 py-2 rounded-xl bg-netflix-red text-white text-xs font-bold"
                        >
                          Xem danh sách trận
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CỘT PHẢI (CHỈ HIỂN THỊ TRÊN DESKTOP >= lg): LIVE MATCH GUIDE RAIL STICKY */}
            <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 sticky top-20 max-h-[calc(100vh-120px)] flex-col rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-netflix-red" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Lịch Trực Tiếp Hôm Nay
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleFhdToggle}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                      onlyFhd
                        ? "bg-emerald-600 text-white border-emerald-400"
                        : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>⚡ FHD</span>
                  </button>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                    {allVisibleMatches.length} trận
                  </span>
                </div>
              </div>

              {/* Ô TÌM KIẾM TRẬN & BLV TRONG RAIL */}
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Tìm đội, BLV, giải đấu..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* TABS CHỌN GIẢI ĐẤU DẠNG CUỘN NGANG NHỎ GỌN */}
              {availableTournaments.length > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTournamentChange("all")}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                      selectedTournament === "all"
                        ? "bg-white text-black border-white shadow-sm font-extrabold"
                        : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                    }`}
                  >
                    Tất cả
                  </button>
                  {availableTournaments.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleTournamentChange(t.name)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                        selectedTournament === t.name
                          ? "bg-netflix-red text-white border-netflix-red shadow-sm"
                          : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                      }`}
                    >
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* DANH SÁCH MATCH CARDS TRONG RAIL CUỘN DỌC */}
              <div className="flex-1 overflow-y-auto space-y-2.5 px-1 py-1 pr-1.5 scrollbar-thin max-h-[calc(100vh-320px)]">
                {/* NHÓM 🔴 ĐANG PHÁT */}
                {liveMatchesList.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-1 text-[11px] font-black uppercase text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Đang phát trực tiếp ({liveMatchesList.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {liveMatchesList.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          score={scoresMap[match.id] || match.score}
                          isSelected={selectedMatch?.id === match.id}
                          onSelect={handleSelectMatch}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* NHÓM 🕐 SẮP DIỄN RA */}
                {upcomingMatchesList.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center gap-1.5 px-1 text-[11px] font-black uppercase text-sky-400">
                      <Clock className="w-3 h-3" />
                      <span>Sắp phát sóng ({upcomingMatchesList.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {upcomingMatchesList.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          score={scoresMap[match.id] || match.score}
                          isSelected={selectedMatch?.id === match.id}
                          onSelect={handleSelectMatch}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* TRẠNG THÁI RỖNG */}
                {liveMatchesList.length === 0 && upcomingMatchesList.length === 0 && (
                  <div className="p-6 text-center text-gray-400 space-y-2 rounded-xl bg-zinc-900/50 border border-white/5">
                    <Clock className="w-6 h-6 mx-auto text-gray-500" />
                    <p className="text-xs font-semibold text-gray-300">Không có trận đấu nào phù hợp</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-[11px] text-netflix-red hover:underline font-bold"
                      >
                        Đặt lại bộ lọc
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KHU VỰC 2: BẢNG XẾP HẠNG BÓNG ĐÁ (FULL SCREEN TOÀN DIỆN) */}
      {activeSection === "standings" && (
        <div className="pt-1">
          <LeagueStandings
            initialLeague={
              (selectedMatch && (scoresMap[selectedMatch.id] || selectedMatch.score)?.leagueSlug) ||
              "eng.1"
            }
            defaultOpen={true}
          />
        </div>
      )}

    </div>
  );
}

export default LiveFootballClient;
