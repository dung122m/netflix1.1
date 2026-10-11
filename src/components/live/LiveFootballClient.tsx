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

  // Khôi phục trận đấu ban đầu từ URL hoặc localStorage (chỉ chạy khi chưa có thao tác chọn chủ động)
  useEffect(() => {
    if (hasUserSelectedRef.current) return;
    if (initialMatch) {
      setSelectedMatch(initialMatch);
      return;
    }
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
  }, [initialMatch, liveMatches, searchParams]);

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
                    tournament={selectedMatch.tournament}
                    team1={selectedMatch.team1}
                    team2={selectedMatch.team2}
                    team1Logo={selectedMatch.homeLogo || selectedMatch.logo}
                    team2Logo={selectedMatch.awayLogo}
                    isLive={
                      (scoresMap[selectedMatch.id] || selectedMatch.score)?.status === "live" ||
                      selectedMatch.timeline === "live"
                    }
                    onSummaryChange={setMatchSummary}
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
                  <div className="space-y-3.5">
                    {/* Search & Filters Mobile */}
                    <div className="space-y-2 bg-zinc-950/70 p-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
                      {/* Ô TÌM KIẾM NỔI BẬT */}
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm đội (MU, Real...), giải đấu, BLV..."
                          className="w-full pl-9 pr-16 py-2 rounded-xl bg-zinc-900 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => handleSearchChange("")}
                              title="Xóa tìm kiếm"
                              className="text-gray-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                            {filteredMatches.length}
                          </span>
                        </div>
                      </div>

                      {/* BỘ LỌC TRẠNG THÁI & TÍNH NĂNG NHANH */}
                      <ScrollablePillsRow innerClassName="flex items-center gap-1.5 py-0.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange("all")}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                            selectedStatus === "all"
                              ? "bg-white text-black border-white shadow-sm font-extrabold"
                              : "bg-zinc-900 text-gray-300 border-white/10 hover:text-white"
                          }`}
                        >
                          Tất cả ({counts.total})
                        </button>
                        {counts.live > 0 && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange("live")}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                              selectedStatus === "live"
                                ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-950/50"
                                : "bg-zinc-900 text-rose-300 border-red-500/20 hover:text-white"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span>Đang đá ({counts.live})</span>
                          </button>
                        )}
                        {counts.upcoming > 0 && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange("upcoming")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
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
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                              selectedStatus === "finished"
                                ? "bg-zinc-700 text-white border-zinc-600 shadow-sm"
                                : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Đã xong ({counts.finished})</span>
                          </button>
                        )}

                        <div className="h-4 w-px bg-white/15 shrink-0 mx-0.5" />

                        <button
                          type="button"
                          onClick={handleStreamToggle}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
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
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                            onlyFhd
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                              : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                          }`}
                        >
                          <span>⚡ FHD</span>
                        </button>
                      </ScrollablePillsRow>

                      {/* Tournament Filter Pills Mobile */}
                      {availableTournaments.length > 0 && (
                        <ScrollablePillsRow innerClassName="flex items-center gap-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleTournamentChange("all")}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                              selectedTournament === "all"
                                ? "bg-white/20 text-white border-white/30"
                                : "bg-zinc-900/80 text-gray-400 border-white/5 hover:text-white"
                            }`}
                          >
                            Tất cả giải
                          </button>
                          {availableTournaments.map((t) => (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => handleTournamentChange(t.name)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                                selectedTournament === t.name
                                  ? "bg-netflix-red text-white border-netflix-red shadow-sm"
                                  : "bg-zinc-900/80 text-gray-400 border-white/5 hover:text-white"
                              }`}
                            >
                              <span>{t.name}</span>
                              <span className="ml-1 opacity-70 text-[10px]">({t.count})</span>
                            </button>
                          ))}
                        </ScrollablePillsRow>
                      )}

                      {/* Reset filter bar nếu có filter active */}
                      {hasActiveFilters && (
                        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                          <span className="text-gray-400 text-[11px]">
                            Đang hiển thị <strong className="text-white font-bold">{filteredMatches.length}</strong>/{counts.total} trận
                          </span>
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-[11px] text-netflix-red hover:text-red-400 font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Đặt lại bộ lọc</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Danh sách trận đang phát */}
                    {liveMatchesList.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-red-950/90 via-red-900/40 to-zinc-900/90 border border-red-500/40 shadow-lg shadow-red-950/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-white truncate flex items-center gap-1.5">
                              <span>ĐANG PHÁT TRỰC TIẾP</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm shadow-red-950/60 shrink-0 border border-red-400/30">
                            🔴 {liveMatchesList.length} trận
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-sky-950/80 via-zinc-900/70 to-zinc-900/90 border border-sky-500/30 shadow-md shadow-sky-950/30">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                              <Clock className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-sky-100 truncate">
                              SẮP PHÁT SÓNG
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 shrink-0">
                            🕐 {upcomingMatchesList.length} trận
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

                    {/* Danh sách trận đã kết thúc */}
                    {finishedMatchesList.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/70 border border-white/10">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-white/10 text-zinc-400 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-300 truncate">
                              Đã kết thúc
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                            {finishedMatchesList.length} trận
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {finishedMatchesList.map((match) => (
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

                    {/* Trạng thái rỗng trên Mobile khi tìm kiếm/lọc không có kết quả */}
                    {filteredMatches.length === 0 && (
                      <div className="p-8 text-center text-gray-400 space-y-3 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                          <Search className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">Không tìm thấy trận đấu nào</p>
                          <p className="text-xs text-gray-400">
                            {searchQuery
                              ? `Không có trận nào khớp với từ khóa "${searchQuery}"`
                              : "Không có trận nào phù hợp với bộ lọc đang chọn"}
                          </p>
                        </div>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-lg shadow-red-950/50 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Đặt lại tất cả bộ lọc</span>
                          </button>
                        )}
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
                        tournament={selectedMatch.tournament}
                        team1={selectedMatch.team1}
                        team2={selectedMatch.team2}
                        team1Logo={selectedMatch.homeLogo || selectedMatch.logo}
                        team2Logo={selectedMatch.awayLogo}
                        isLive={
                          (scoresMap[selectedMatch.id] || selectedMatch.score)?.status === "live" ||
                          selectedMatch.timeline === "live"
                        }
                        onSummaryChange={setMatchSummary}
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
            <div
              className="hidden lg:flex lg:col-span-5 xl:col-span-4 sticky top-20 max-h-[calc(100vh-120px)] min-h-0 flex-col rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 overflow-hidden overscroll-y-contain [overscroll-behavior-y:contain]"
              style={{ overscrollBehaviorY: "contain" }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-netflix-red" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Lịch Trực Tiếp Hôm Nay
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                    {filteredMatches.length}/{counts.total} trận
                  </span>
                </div>
              </div>

              {/* Ô TÌM KIẾM TRẬN, ĐỘI & BLV NỔI BẬT */}
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

              {/* BỘ LỌC TRẠNG THÁI & TÍNH NĂNG NHANH */}
              <ScrollablePillsRow innerClassName="flex items-center gap-1 py-0.5">
                <button
                  type="button"
                  onClick={() => handleStatusChange("all")}
                  className={`px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                    selectedStatus === "all"
                      ? "bg-white text-black border-white shadow-sm font-extrabold"
                      : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                  }`}
                >
                  Tất cả ({counts.total})
                </button>
                {counts.live > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("live")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                      selectedStatus === "live"
                        ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-950/50"
                        : "bg-zinc-900 text-rose-300 border-red-500/20 hover:text-white"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>Đang đá ({counts.live})</span>
                  </button>
                )}
                {counts.upcoming > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("upcoming")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                      selectedStatus === "upcoming"
                        ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                        : "bg-zinc-900 text-sky-300 border-white/10 hover:text-white"
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>Sắp đá ({counts.upcoming})</span>
                  </button>
                )}
                {counts.finished > 0 && (
                  <button
                    type="button"
                    onClick={() => handleStatusChange("finished")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                      selectedStatus === "finished"
                        ? "bg-zinc-700 text-white border-zinc-600 shadow-sm"
                        : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                    <span>Đã xong ({counts.finished})</span>
                  </button>
                )}

                <div className="h-3.5 w-px bg-white/15 shrink-0 mx-0.5" />

                <button
                  type="button"
                  onClick={handleStreamToggle}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
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
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold whitespace-nowrap transition border shrink-0 cursor-pointer ${
                    onlyFhd
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                      : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
                  }`}
                >
                  <span>⚡ FHD</span>
                </button>
              </ScrollablePillsRow>

              {/* TABS CHỌN GIẢI ĐẤU DẠNG CUỘN NGANG NHỎ GỌN */}
              {availableTournaments.length > 0 && (
                <ScrollablePillsRow innerClassName="flex items-center gap-1 py-0.5">
                  <button
                    type="button"
                    onClick={() => handleTournamentChange("all")}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                      selectedTournament === "all"
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-zinc-900/80 text-gray-400 border-white/5 hover:text-white"
                    }`}
                  >
                    Tất cả giải
                  </button>
                  {availableTournaments.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => handleTournamentChange(t.name)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                        selectedTournament === t.name
                          ? "bg-netflix-red text-white border-netflix-red shadow-sm"
                          : "bg-zinc-900/80 text-gray-400 border-white/5 hover:text-white"
                      }`}
                    >
                      <span>{t.name}</span>
                      <span className="ml-1 opacity-70 text-[9px]">({t.count})</span>
                    </button>
                  ))}
                </ScrollablePillsRow>
              )}

              {/* THANH ĐẶT LẠI BỘ LỌC KHI ĐANG CÓ LỌC */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between px-1 text-[10.5px]">
                  <span className="text-gray-400">
                    Hiển thị <strong className="text-white font-bold">{filteredMatches.length}</strong>/{counts.total} trận
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-netflix-red hover:text-red-400 font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Đặt lại</span>
                  </button>
                </div>
              )}

              {/* DANH SÁCH MATCH CARDS TRONG RAIL CUỘN DỌC (CUỘN XUỐNG TRẬN ĐANG PHÁT) */}
              <div
                ref={railContainerRef}
                className="flex-1 min-h-0 overflow-y-auto space-y-2 px-0.5 py-0.5 pr-1 scrollbar-thin overscroll-y-contain [overscroll-behavior-y:contain] touch-pan-y max-h-[calc(100vh-320px)]"
                style={{ overscrollBehaviorY: "contain" }}
              >
                {/* NHÓM 🔴 ĐANG PHÁT */}
                {liveMatchesList.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-red-500/30">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-white truncate">
                          Đang phát trực tiếp
                        </span>
                      </div>
                      <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                        {liveMatchesList.length} trận
                      </span>
                    </div>
                    <div className="space-y-1">
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
                    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/10">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-300 truncate">
                          Sắp phát sóng
                        </span>
                      </div>
                      <span className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10 shrink-0">
                        {upcomingMatchesList.length} trận
                      </span>
                    </div>
                    <div className="space-y-1">
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

                {/* NHÓM 🏁 ĐÃ KẾT THÚC */}
                {finishedMatchesList.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-zinc-900/70 border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-4.5 h-4.5 rounded-md bg-white/10 text-zinc-400 flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 truncate">
                          Đã kết thúc
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                        {finishedMatchesList.length} trận
                      </span>
                    </div>
                    <div className="space-y-1">
                      {finishedMatchesList.map((match) => (
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
                {filteredMatches.length === 0 && (
                  <div className="p-6 text-center text-gray-400 space-y-2.5 rounded-xl bg-zinc-900/50 border border-white/5">
                    <Search className="w-5 h-5 mx-auto text-gray-500" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-white">Không tìm thấy trận đấu nào</p>
                      <p className="text-[11px] text-gray-400">
                        {searchQuery
                          ? `Không có trận nào khớp với "${searchQuery}"`
                          : "Không có trận nào phù hợp với bộ lọc đang chọn"}
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="text-[11px] text-netflix-red hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Đặt lại tất cả bộ lọc</span>
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
