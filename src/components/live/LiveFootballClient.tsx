"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  FootballMatch,
  LiveFootballData,
} from "@/services/liveFootballService";
import { clearProbeQueue } from "@/services/live/football/clientSourceProbe";
import { LivePlayer, toCanonicalSourceUrl } from "./LivePlayer";
import { MatchCard } from "./MatchCard";
import { MatchCenter } from "./MatchCenter";
import { LeagueStandings } from "./LeagueStandings";
import { ScrollablePillsRow } from "./ScrollablePillsRow";
import { LiveMatchScore, NormalizedMatchSummary } from "@/services/live/football-score/types";
import { shouldRefreshOnTabFocus } from "@/services/live/football-score/matchCenterRealtime";
import {
  resolveMatchDisplayStatus,
} from "@/services/live/football-score/liveStatus";
import { resolveCanonicalTournament } from "@/services/live/football-score/canonicalLeagues";
import {
  Search,
  Radio,
  X,
  Clock,
  Zap,
  Activity,
  Trophy,
  Check,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";

interface LiveFootballClientProps {
  initialData: LiveFootballData;
  hideHeader?: boolean;
  isActive?: boolean;
  selectedSport?: "all" | "football" | "basketball";
  onSportChange?: (sport: "all" | "football" | "basketball") => void;
  onMatchesCountChange?: (count: number) => void;
}

export function LiveFootballClient({
  initialData,
  hideHeader = false,
  isActive = true,
  selectedSport,
  onSportChange,
  onMatchesCountChange,
}: LiveFootballClientProps) {
  const searchParams = useSearchParams();
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>(
    initialData.matches,
  );
  const [activeSection, setActiveSection] = useState<
    "matches" | "match-center" | "standings"
  >("matches");
  const [sidePanelTab, setSidePanelTab] = useState<"match-center" | "matches">("match-center");

  // Đồng bộ khi dữ liệu từ server thay đổi hoặc khi lọc kênh
  useEffect(() => {
    setLiveMatches(initialData.matches);
  }, [initialData.matches]);

  useEffect(() => {
    onMatchesCountChange?.(liveMatches.length);
  }, [liveMatches.length, onMatchesCountChange]);

  const isMatchesFetchingRef = useRef(false);
  const wasActiveMatchesRef = useRef(isActive);
  const lastFetchedMatchesTimeRef = useRef<number>(Date.now());

  // TỰ ĐỘNG LÀM MỚI DANH SÁCH TRẬN ĐẤU MỖI 3 PHÚT (không cần F5)
  useEffect(() => {
    if (!isActive) {
      wasActiveMatchesRef.current = false;
      return;
    }

    let isEffectActive = true;
    const abortController = new AbortController();

    const refreshMatches = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
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
        lastFetchedMatchesTimeRef.current = Date.now();
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
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      refreshMatches();
    }, 3 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (
          shouldRefreshOnTabFocus(
            lastFetchedMatchesTimeRef.current,
            3 * 60 * 1000,
          )
        ) {
          refreshMatches();
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isEffectActive = false;
      abortController.abort();
      clearTimeout(initialDelay);
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
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
  const lastFetchedScoresTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      wasActiveScoresRef.current = false;
      return;
    }

    let isEffectActive = true;
    const abortController = new AbortController();

    const fetchScores = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
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
        lastFetchedScoresTimeRef.current = Date.now();
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
    } else if (lastFetchedScoresTimeRef.current === 0) {
      // Khi vừa mount ban đầu: chờ 3s để nhường luồng tải ban đầu cho player
      initialTimer = setTimeout(fetchScores, 3000);
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchScores();
    }, pollIntervalMs);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (
          shouldRefreshOnTabFocus(
            lastFetchedScoresTimeRef.current,
            pollIntervalMs,
          )
        ) {
          fetchScores();
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isEffectActive = false;
      abortController.abort();
      if (initialTimer) clearTimeout(initialTimer);
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
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

  const hasUserSelectedRef = useRef(false);
  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(initialMatch);
  const [matchSummary, setMatchSummary] = useState<NormalizedMatchSummary | null>(null);

  useEffect(() => {
    setMatchSummary(null);
  }, [selectedMatch?.id]);

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
    const updated = liveMatches.find((m) => m.id === selectedMatch.id);
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

  const [sportFilter, setSportFilter] = useState<"all" | "football" | "basketball">(() => {
    if (selectedSport) return selectedSport;
    const s = searchParams.get("sport");
    if (s === "basketball" || s === "football") return s;
    return "all";
  });

  useEffect(() => {
    if (selectedSport) {
      setSportFilter((prev) => (selectedSport !== prev ? selectedSport : prev));
    }
  }, [selectedSport]);

  const [selectedFootballGroup, setSelectedFootballGroup] = useState<string>(
    () => searchParams.get("group") || "all",
  );
  const [selectedTournament, setSelectedTournament] = useState<string>(
    () => searchParams.get("tournament") || "all",
  );
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "live" | "upcoming" | "finished"
  >(() => {
    const s = searchParams.get("status");
    if (s === "live" || s === "upcoming" || s === "finished") return s;
    return "all";
  });
  const [onlyWithStream, setOnlyWithStream] = useState<boolean>(
    () => searchParams.get("stream") === "1",
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    () => searchParams.get("q") || "",
  );
  const [onlyFhd, setOnlyFhd] = useState<boolean>(
    () => searchParams.get("fhd") === "1",
  );
  const [showMatchRail, setShowMatchRail] = useState(false);

  // Đồng bộ trạng thái khi người dùng nhấn nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const url = new URL(window.location.href);
        setOnlyFhd(url.searchParams.get("fhd") === "1");
        setOnlyWithStream(url.searchParams.get("stream") === "1");
      } catch {}
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const playerRef = useRef<HTMLDivElement>(null);
  const railContainerRef = useRef<HTMLDivElement>(null);

  const updateUrl = useCallback(
    (
      updates: {
        match?: string | null;
        tournament?: string | null;
        group?: string | null;
        status?: string | null;
        stream?: boolean | null;
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

        if (updates.status !== undefined) {
          if (updates.status && updates.status !== "all") {
            url.searchParams.set("status", updates.status);
          } else {
            url.searchParams.delete("status");
          }
        }

        if (updates.stream !== undefined) {
          if (updates.stream) {
            url.searchParams.set("stream", "1");
          } else {
            url.searchParams.delete("stream");
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

  const handleClosePlayer = useCallback(() => {
    hasUserSelectedRef.current = true;
    setSelectedMatch(null);
    updateUrl({ match: null }, false);
  }, [updateUrl]);

  const enrichedMatches = useMemo(() => {
    return liveMatches.map((m) => {
      const liveScore = scoresMap[m.id] || m.score;
      const displayStatus = resolveMatchDisplayStatus({
        timestamp: liveScore?.kickoffTimestamp || m.timestamp,
        score: liveScore,
        sourceStatus: m.sourceStatus,
        now: now || Date.now(),
      });

      const hasStream = Boolean(
        Array.isArray(m.servers) &&
          m.servers.length > 0 &&
          m.servers.some((s) => s.url && s.url.trim().length > 0),
      );

      // Phân nhóm trạng thái thực tế: live, upcoming, finished
      let realStatus: "live" | "upcoming" | "finished" = "upcoming";
      if (
        displayStatus.statusType === "finished" ||
        m.timeline === "finished" ||
        m.sourceStatus === "finished" ||
        liveScore?.status === "finished"
      ) {
        realStatus = "finished";
      } else if (
        displayStatus.isConfirmedLive ||
        m.timeline === "live" ||
        m.realStatus === "live" ||
        m.sourceStatus === "live" ||
        m.isLive === true ||
        (Boolean(m.group) && /trực tiếp/i.test(m.group) && hasStream) ||
        (m.timestamp &&
          (now || Date.now()) >= m.timestamp &&
          (now || Date.now()) - m.timestamp < 135 * 60 * 1000 &&
          hasStream)
      ) {
        realStatus = "live";
      } else {
        realStatus = "upcoming";
      }

      return {
        ...m,
        realStatus,
        hasStream,
        displayStatus,
      };
    });
  }, [liveMatches, now, scoresMap]);

  const counts = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let finished = 0;
    let withStream = 0;

    enrichedMatches.forEach((m) => {
      if (m.realStatus === "live") live++;
      else if (m.realStatus === "upcoming") upcoming++;
      else if (m.realStatus === "finished") finished++;
      if (m.hasStream) withStream++;
    });

    return {
      live,
      upcoming,
      finished,
      withStream,
      total: enrichedMatches.length,
    };
  }, [enrichedMatches]);

  const availableTournaments = useMemo(() => {
    const tourMap: Record<string, number> = {};
    enrichedMatches.forEach((m) => {
      // Bỏ qua giải đấu không thuộc bộ môn đang lọc
      if (sportFilter !== "all") {
        if (sportFilter === "basketball" && m.sport !== "basketball") return;
        if (sportFilter === "football" && m.sport === "basketball") return;
      }

      const liveScore = scoresMap[m.id] || m.score;
      const canonicalName = resolveCanonicalTournament({
        tournament: m.tournament,
        title: m.title,
        sport: m.sport,
        team1: m.team1,
        team2: m.team2,
        score: liveScore,
      });
      if (canonicalName) {
        tourMap[canonicalName] = (tourMap[canonicalName] || 0) + 1;
      }
    });

    return Object.entries(tourMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === "Giải Đấu Khác") return 1;
        if (b.name === "Giải Đấu Khác") return -1;
        return b.count - a.count;
      });
  }, [enrichedMatches, scoresMap, sportFilter]);

  const filteredMatches = useMemo(() => {
    return enrichedMatches.filter((m) => {
      // 0. Lọc theo bộ môn thể thao (Bóng đá / Bóng rổ)
      if (sportFilter !== "all") {
        if (sportFilter === "basketball" && m.sport !== "basketball") {
          return false;
        }
        if (sportFilter === "football" && m.sport === "basketball") {
          return false;
        }
      }

      // 1. Lọc theo trạng thái thực tế
      if (selectedStatus !== "all" && m.realStatus !== selectedStatus) {
        return false;
      }

      // 2. Lọc theo nhóm kênh
      if (
        selectedFootballGroup !== "all" &&
        m.group !== selectedFootballGroup &&
        !m.groups?.includes(selectedFootballGroup)
      ) {
        return false;
      }

      // 3. Lọc theo giải đấu
      if (selectedTournament !== "all") {
        const liveScore = scoresMap[m.id] || m.score;
        const canonicalTournament = resolveCanonicalTournament({
          tournament: m.tournament,
          title: m.title,
          sport: m.sport,
          team1: m.team1,
          team2: m.team2,
          score: liveScore,
        });
        if (canonicalTournament !== selectedTournament) {
          return false;
        }
      }

      // 4. Lọc "Có nguồn xem"
      if (onlyWithStream && !m.hasStream) {
        return false;
      }

      // 5. Lọc chất lượng FHD
      if (onlyFhd) {
        const isFhd =
          m.quality?.includes("FHD") ||
          m.quality?.includes("1080p") ||
          m.servers?.some(
            (s) => s.name.includes("FHD") || s.name.includes("1080p"),
          );
        if (!isFhd) return false;
      }

      // 6. Tìm kiếm thông minh theo tên đội, giải đấu, BLV, nhóm kênh
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = m.title ? m.title.toLowerCase().includes(q) : false;
        const inTeam1 = m.team1 ? m.team1.toLowerCase().includes(q) : false;
        const inTeam2 = m.team2 ? m.team2.toLowerCase().includes(q) : false;
        const inBLV = m.blv ? m.blv.toLowerCase().includes(q) : false;
        const inTournament = m.tournament
          ? m.tournament.toLowerCase().includes(q)
          : false;
        const inGroup = m.group ? m.group.toLowerCase().includes(q) : false;
        const inGroups = m.groups
          ? m.groups.some((g) => g.toLowerCase().includes(q))
          : false;

        if (
          !inTitle &&
          !inTeam1 &&
          !inTeam2 &&
          !inBLV &&
          !inTournament &&
          !inGroup &&
          !inGroups
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    enrichedMatches,
    sportFilter,
    scoresMap,
    selectedStatus,
    selectedFootballGroup,
    selectedTournament,
    onlyWithStream,
    onlyFhd,
    searchQuery,
  ]);

  const liveMatchesList = useMemo(() => {
    return filteredMatches.filter((m) => m.realStatus === "live");
  }, [filteredMatches]);

  const upcomingMatchesList = useMemo(() => {
    return filteredMatches.filter((m) => m.realStatus === "upcoming");
  }, [filteredMatches]);

  const finishedMatchesList = useMemo(() => {
    return filteredMatches.filter((m) => m.realStatus === "finished");
  }, [filteredMatches]);

  const allVisibleMatches = filteredMatches;

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

      // Cuộn thanh bên xuống trận đấu đang phát (đưa trận lên đầu thanh bên với đệm 8px),
      // thay vì để danh sách hiển thị từ trên đỉnh (0px) hoặc căn giữa làm trận ở nửa dưới
      const targetScrollTop = Math.max(0, relativeTop - 8);

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

  // Ngăn chặn hiện tượng cuộn chuột lan (scroll chaining) từ danh sách trận ra toàn bộ trang bên ngoài
  useEffect(() => {
    const el = railContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight) return;

      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleSelectMatch = useCallback(
    (match: FootballMatch) => {
      hasUserSelectedRef.current = true;
      clearProbeQueue();
      setSelectedMatch(match);
      setSidePanelTab("match-center");
      try {
        localStorage.setItem("nanaflix_live_match_id", match.id);
      } catch {}
      updateUrl({ match: match.id }, false);
      if (window.innerWidth < 1024 && playerRef.current) {
        playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        setTimeout(() => scrollToActiveMatch(true), 50);
      }
    },
    [updateUrl, scrollToActiveMatch],
  );

  const handleStatusChange = useCallback(
    (status: "all" | "live" | "upcoming" | "finished") => {
      setSelectedStatus(status);
      updateUrl({ status: status === "all" ? null : status });
    },
    [updateUrl],
  );

  const handleStreamToggle = useCallback(() => {
    const next = !onlyWithStream;
    setOnlyWithStream(next);
    updateUrl({ stream: next });
  }, [onlyWithStream, updateUrl]);

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
    const next = !onlyFhd;
    setOnlyFhd(next);
    updateUrl({ fhd: next });
  }, [onlyFhd, updateUrl]);

  const handleResetFilters = useCallback(() => {
    setSelectedFootballGroup("all");
    setSelectedTournament("all");
    setSelectedStatus("all");
    setOnlyWithStream(false);
    setSearchQuery("");
    setOnlyFhd(false);
    setSportFilter("all");
    onSportChange?.("all");
    updateUrl({
      group: null,
      tournament: null,
      status: null,
      stream: null,
      q: null,
      fhd: null,
    });
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("sport");
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }, [onSportChange, updateUrl]);

  const hasActiveFilters =
    selectedFootballGroup !== "all" ||
    selectedTournament !== "all" ||
    selectedStatus !== "all" ||
    sportFilter !== "all" ||
    onlyWithStream ||
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 p-1 sm:p-1.5 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-1 w-full sm:flex sm:w-auto sm:items-center sm:gap-1.5 overflow-x-auto scrollbar-none">
          {/* Nút Sân Cỏ Trực Tiếp & Match Center */}
          <button
            type="button"
            onClick={() => setActiveSection("matches")}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red shrink-0 ${
              activeSection === "matches" || activeSection === "match-center"
                ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-lg shadow-red-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Trận Đấu</span>
            <span className="hidden sm:inline">Sân Cỏ Trực Tiếp & Match Center</span>
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
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shrink-0 ${
              activeSection === "standings"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Bảng Xếp Hạng</span>
            <span className="hidden sm:inline">Bảng Xếp Hạng Giải Đấu</span>
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

      {/* KHU VỰC 1: SÂN CỎ TRỰC TIẾP & MATCH DISCOVERY / MATCH CENTER */}
      {(activeSection === "matches" || activeSection === "match-center") && (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 1: KHI ĐÃ CHỌN TRẬN ĐẤU (THEATER WATCH & DETAILS) */}
          {/* ============================================================ */}
          {selectedMatch ? (
            <div className="space-y-6">
              {/* THANH ĐIỀU HƯỚNG QUAY LẠI DANH SÁCH & TIÊU ĐỀ TRẬN */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl shadow-lg">
                <button
                  type="button"
                  onClick={handleClosePlayer}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition cursor-pointer shrink-0 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Danh sách trận</span>
                </button>

                <div className="flex items-center gap-2 min-w-0 flex-1 justify-center px-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-xs sm:text-sm font-black text-white truncate text-center">
                    {selectedMatch.title}
                  </span>
                  {selectedMatch.blv && (
                    <span className="hidden sm:inline-block text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                      BLV {selectedMatch.blv}
                    </span>
                  )}
                </div>

                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-netflix-red/20 text-rose-300 border border-netflix-red/30 shrink-0">
                  {selectedMatch.quality || "FHD"}
                </span>
              </div>

              {/* BỐ CỤC THEATER STUDIO 2 CỘT (DESKTOP) / XẾP CHỒNG (MOBILE) */}
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 items-start">
                {/* CỘT TRÁI (COL 1-7/8 TRÊN DESKTOP): LIVE PLAYER */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-3">
                  <div ref={playerRef} className="space-y-3">
                    <LivePlayer
                      match={selectedMatch}
                      title={selectedMatch.title}
                      servers={selectedMatch.servers}
                      blv={selectedMatch.blv}
                      time={selectedMatch.time}
                      score={scoresMap[selectedMatch.id] || selectedMatch.score}
                      summary={matchSummary}
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
                </div>

                {/* CỘT PHẢI (COL 8-12 TRÊN DESKTOP): SIDE PANEL VỚI MATCH CENTER & ĐỔI TRẬN */}
                <div className="lg:col-span-5 xl:col-span-4 min-w-0 flex flex-col rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-100px)] lg:overflow-hidden">
                  {/* SUB-TABS TRÊN SIDE PANEL */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSidePanelTab("match-center")}
                      className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
                        sidePanelTab === "match-center"
                          ? "bg-netflix-red text-white shadow-md shadow-red-950/50"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span className="truncate">CHI TIẾT TRẬN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSidePanelTab("matches")}
                      className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
                        sidePanelTab === "matches"
                          ? "bg-netflix-red text-white shadow-md shadow-red-950/50"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span className="truncate">ĐỔI TRẬN ({filteredMatches.length})</span>
                    </button>
                  </div>

                  {/* TAB 1: MATCH CENTER & DIỄN BIẾN THỜI GIAN THỰC */}
                  {sidePanelTab === "match-center" && (
                    <div className="flex-1 min-h-0 lg:overflow-y-auto pr-0.5 space-y-2 lg:overscroll-y-contain lg:[overscroll-behavior-y:contain] scrollbar-thin">
                      <div className="space-y-2 pt-0.5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 px-0.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {matchSummary ? (
                              <Activity className="w-4 h-4 text-netflix-red shrink-0" />
                            ) : (
                              <Radio className="w-4 h-4 text-netflix-red animate-pulse shrink-0" />
                            )}
                            <h3 className="text-xs font-black uppercase tracking-wider text-white truncate">
                              {matchSummary
                                ? "Trung Tâm Trận Đấu & Diễn Biến"
                                : "Thông Tin Trận Đấu & Luồng Phát"}
                            </h3>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">
                            {matchSummary ? "Tự động đồng bộ số liệu" : "Tiếp sóng trực tiếp"}
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
                          tournament={selectedMatch.tournament}
                          team1={selectedMatch.team1}
                          team2={selectedMatch.team2}
                          team1Logo={selectedMatch.homeLogo || selectedMatch.logo}
                          team2Logo={selectedMatch.awayLogo}
                          isLive={
                            (scoresMap[selectedMatch.id] || selectedMatch.score)?.status === "live" ||
                            selectedMatch.timeline === "live"
                          }
                          time={selectedMatch.time}
                          blv={selectedMatch.blv}
                          group={selectedMatch.group}
                          serversCount={selectedMatch.servers?.length}
                          quality={selectedMatch.quality}
                          onSummaryChange={setMatchSummary}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ĐỔI TRẬN ĐẤU - DANH SÁCH THU GỌN VỚI TÌM KIẾM */}
                  {sidePanelTab === "matches" && (
                    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 lg:overflow-hidden">
                      {/* Ô tìm kiếm nhanh trong side panel */}
                      <div className="relative w-full">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm đội (MU, Real...), giải đấu, BLV..."
                          className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-zinc-900 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => handleSearchChange("")}
                              title="Xóa tìm kiếm"
                              className="text-gray-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-gray-300">
                            {filteredMatches.length}
                          </span>
                        </div>
                      </div>

                      {/* Danh sách thẻ trận cuộn dọc */}
                      <div
                        ref={railContainerRef}
                        className="flex-1 min-h-0 max-h-[380px] lg:max-h-none overflow-y-auto space-y-1.5 px-0.5 py-0.5 pr-1 scrollbar-thin lg:overscroll-y-contain lg:[overscroll-behavior-y:contain] touch-pan-y"
                      >
                        {filteredMatches.map((match) => (
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
              </div>

              {/* KHU VỰC KHÁM PHÁ CÁC TRẬN ĐẤU KHÁC (BÊN DƯỚI PLAYER) */}
              <div className="pt-6 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-netflix-red" />
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      Các Trận Đấu Trực Tiếp & Sắp Diễn Ra Khác
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleClosePlayer}
                    className="text-xs font-bold text-netflix-red hover:underline cursor-pointer"
                  >
                    Xem tất cả ({counts.total}) →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {allVisibleMatches
                    .filter((m) => m.id !== selectedMatch.id)
                    .slice(0, 8)
                    .map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        score={scoresMap[match.id] || match.score}
                        isSelected={false}
                        onSelect={handleSelectMatch}
                      />
                    ))}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* TRƯỜNG HỢP 2: KHI VỪA VÀO TRANG (MATCH DISCOVERY FIRST)      */
            /* ============================================================ */
            <div className="space-y-4 sm:space-y-6">
              {/* THANH BỘ LỌC TÌM KIẾM TOÀN DIỆN & TIỆN LỢI */}
              <div className="rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl p-2.5 sm:p-4 space-y-2.5 sm:space-y-3.5 shadow-2xl">
                {/* Hàng 1: Ô tìm kiếm & Bộ lọc trạng thái */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
                  {/* Ô tìm kiếm thông minh */}
                  <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Tìm đội bóng, giải đấu, BLV..."
                      className="w-full pl-9 pr-14 py-2 sm:py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner font-medium"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => handleSearchChange("")}
                          title="Xóa tìm kiếm"
                          className="text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                        {filteredMatches.length}
                      </span>
                    </div>
                  </div>

                  {/* Cụm nút lọc trạng thái trận đấu */}
                  <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 touch-pan-x">
                    <button
                      type="button"
                      onClick={() => handleStatusChange("all")}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                        selectedStatus === "all"
                          ? "bg-white text-black border-white shadow-sm font-extrabold"
                          : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                      }`}
                    >
                      Tất cả ({counts.total})
                    </button>
                    {counts.live > 0 && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("live")}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                          selectedStatus === "live"
                            ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-950/50"
                            : "bg-zinc-900 text-rose-300 border-red-500/20 hover:text-white"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="sm:hidden">Đang đá ({counts.live})</span>
                        <span className="hidden sm:inline">Đang diễn ra ({counts.live})</span>
                      </button>
                    )}
                    {counts.upcoming > 0 && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("upcoming")}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                          selectedStatus === "upcoming"
                            ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                            : "bg-zinc-900 text-sky-300 border-white/10 hover:text-white"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>Sắp đá ({counts.upcoming})</span>
                      </button>
                    )}
                    {counts.finished > 0 && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange("finished")}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                          selectedStatus === "finished"
                            ? "bg-zinc-700 text-white border-zinc-600 shadow-sm"
                            : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span className="sm:hidden">Xong ({counts.finished})</span>
                        <span className="hidden sm:inline">Đã kết thúc ({counts.finished})</span>
                      </button>
                    )}

                    <div className="h-3.5 sm:h-4 w-px bg-white/15 shrink-0 mx-0.5" />

                    <button
                      type="button"
                      onClick={handleStreamToggle}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                        onlyWithStream
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                          : "bg-zinc-900 text-emerald-400/90 border-white/10 hover:text-emerald-300"
                      }`}
                    >
                      <span>📶 Có nguồn ({counts.withStream})</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleFhdToggle}
                      className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                        onlyFhd
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                          : "bg-zinc-900 text-zinc-400 border-white/10 hover:text-white"
                      }`}
                    >
                      <span>⚡ FHD</span>
                    </button>
                  </div>
                </div>

                {/* Hàng 2: Bộ lọc các giải đấu nổi bật dạng cuộn ngang */}
                {availableTournaments.length > 0 && (
                  <ScrollablePillsRow innerClassName="flex items-center gap-1 sm:gap-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => handleTournamentChange("all")}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                        selectedTournament === "all"
                          ? "bg-white/20 text-white border-white/30"
                          : "bg-zinc-900/80 text-zinc-400 border-white/5 hover:text-white"
                      }`}
                    >
                      Tất cả giải ({counts.total})
                    </button>
                    {availableTournaments.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => handleTournamentChange(t.name)}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                          selectedTournament === t.name
                            ? "bg-netflix-red text-white border-netflix-red shadow-sm"
                            : "bg-zinc-900/80 text-zinc-400 border-white/5 hover:text-white"
                        }`}
                      >
                        <span>{t.name}</span>
                        <span className="ml-1 opacity-70 text-[9.5px] sm:text-[10px]">({t.count})</span>
                      </button>
                    ))}
                  </ScrollablePillsRow>
                )}

                {/* Thanh Reset filter khi có áp dụng */}
                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t border-white/5 text-[11px] sm:text-xs">
                    <span className="text-zinc-400">
                      Hiển thị <strong className="text-white font-bold">{filteredMatches.length}</strong>/{counts.total} trận
                    </span>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-netflix-red hover:text-red-400 font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Đặt lại bộ lọc</span>
                    </button>
                  </div>
                )}
              </div>

              {/* LƯỚI TRẬN ĐẤU RESPONSIVE DISCOVERY GRID (3 CỘT TRÊN DESKTOP, 1 CỘT TRÊN MOBILE) */}
              <div className="space-y-6">
                {/* NHÓM 🔴 ĐANG PHÁT TRỰC TIẾP */}
                {liveMatchesList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                          Đang Phát Trực Tiếp
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                        {liveMatchesList.length} trận
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                      {liveMatchesList.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          score={scoresMap[match.id] || match.score}
                          isSelected={false}
                          onSelect={handleSelectMatch}
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
                        <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-zinc-300">
                          Sắp Phát Sóng
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                        {upcomingMatchesList.length} trận
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                      {upcomingMatchesList.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          score={scoresMap[match.id] || match.score}
                          isSelected={false}
                          onSelect={handleSelectMatch}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* NHÓM 🏁 ĐÃ KẾT THÚC */}
                {finishedMatchesList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-zinc-400 shrink-0" />
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-zinc-400">
                          Đã Kết Thúc
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
                        {finishedMatchesList.length} trận
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
                      {finishedMatchesList.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          score={scoresMap[match.id] || match.score}
                          isSelected={false}
                          onSelect={handleSelectMatch}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* TRẠNG THÁI RỖNG KHI TÌM KIẾM KHÔNG CÓ TRẬN */}
                {filteredMatches.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 space-y-3 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-xl">
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
                        onClick={handleResetFilters}
                        className="px-4 py-2 rounded-xl bg-netflix-red text-white text-xs font-bold cursor-pointer hover:bg-red-700 transition"
                      >
                        Đặt lại bộ lọc
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
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
