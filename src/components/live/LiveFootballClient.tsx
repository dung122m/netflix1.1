"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  FootballMatch,
  LiveFootballData,
} from "@/services/liveFootballService";
import { useBodyScrollLock } from "@/lib/scrollLock";
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
import { resolveCanonicalTournament, isGenericSportTournament } from "@/services/live/football-score/canonicalLeagues";
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
  selectedSport?: string;
  onSportChange?: (sport: string) => void;
  onMatchesCountChange?: (count: number) => void;
  onMatchSelectedChange?: (hasMatch: boolean) => void;
}

export function LiveFootballClient({
  initialData,
  hideHeader = false,
  isActive = true,
  selectedSport,
  onSportChange,
  onMatchesCountChange,
  onMatchSelectedChange,
}: LiveFootballClientProps) {
  const searchParams = useSearchParams();
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>(
    initialData.matches,
  );
  const [activeSection, setActiveSection] = useState<
    "matches" | "match-center" | "standings"
  >("matches");
  const [sidePanelTab, setSidePanelTab] = useState<"match-center" | "matches">("matches");
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

  // Đồng bộ khi dữ liệu từ server thay đổi hoặc khi lọc kênh
  useEffect(() => {
    setLiveMatches(initialData.matches);
  }, [initialData.matches]);

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

  const [sportFilter, setSportFilter] = useState<string>(() => {
    if (selectedSport) return selectedSport;
    const s = searchParams.get("sport");
    if (s && s.trim()) return s.trim();
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

  const playerRef = useRef<HTMLDivElement>(null);
  const railContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollToPlayerRef = useRef<boolean>(false);

  // Cuộn mượt mà đưa người dùng về khu vực player, tự động trừ bù chiều cao Navbar
  const scrollToPlayerArea = useCallback(() => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      if (playerRef.current) {
        const rect = playerRef.current.getBoundingClientRect();
        const navbarHeight = window.innerWidth >= 640 ? 76 : 68;
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

  // Đồng bộ trạng thái khi người dùng nhấn nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const url = new URL(window.location.href);
        setOnlyFhd(url.searchParams.get("fhd") === "1");
        setOnlyWithStream(url.searchParams.get("stream") === "1");
        const s = url.searchParams.get("sport");
        setSportFilter(s && s.trim() ? s.trim() : "all");
        const status = url.searchParams.get("status");
        if (status === "live" || status === "upcoming" || status === "finished") {
          setSelectedStatus(status);
        } else {
          setSelectedStatus("all");
        }

        // Đồng bộ trận đấu đang chọn từ URL khi Back/Forward
        const matchId = url.searchParams.get("match");
        if (matchId) {
          const foundMatch = liveMatches.find((m) => m.id === matchId);
          if (foundMatch) {
            setSelectedMatch(foundMatch);
            pendingScrollToPlayerRef.current = true;
          }
        } else {
          setSelectedMatch(null);
        }
      } catch {}
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [liveMatches]);

  // Cân bằng chiều cao Side Panel chuẩn xác theo khung Video Player trên Desktop (>=1024px)
  const [sidePanelHeight, setSidePanelHeight] = useState<number | undefined>(undefined);

  const handleVideoHeightChange = useCallback((height: number) => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024 && height > 0) {
      setSidePanelHeight(height);
    }
  }, []);

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
        sport?: string | null;
      },
      pushHistory = false,
    ) => {
      try {
        const url = new URL(window.location.href);
        const currentTab = url.searchParams.get("tab");
        if (currentTab !== "tv") {
          url.searchParams.set("tab", "sports");
        }
        url.searchParams.delete("channel");

        if (updates.sport !== undefined) {
          if (updates.sport && updates.sport !== "all") {
            url.searchParams.set("sport", updates.sport);
          } else {
            url.searchParams.delete("sport");
          }
        }

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
    const currentTime = now || Date.now();
    return liveMatches.map((m) => {
      const liveScore = scoresMap[m.id] || m.score;
      const matchTimestamp = liveScore?.kickoffTimestamp || m.timestamp;
      const displayStatus = resolveMatchDisplayStatus({
        timestamp: matchTimestamp,
        score: liveScore,
        sourceStatus: m.sourceStatus,
        now: currentTime,
      });

      const hasStream = Boolean(
        Array.isArray(m.servers) &&
          m.servers.length > 0 &&
          m.servers.some((s) => s.url && s.url.trim().length > 0),
      );

      const hasValidTimestamp =
        matchTimestamp !== undefined &&
        matchTimestamp !== null &&
        matchTimestamp > 0 &&
        matchTimestamp !== Number.MAX_SAFE_INTEGER;

      // Phân nhóm trạng thái thực tế: live, upcoming, finished
      let realStatus: "live" | "upcoming" | "finished" = "upcoming";
      if (
        displayStatus.statusType === "finished" ||
        m.timeline === "finished" ||
        m.sourceStatus === "finished" ||
        liveScore?.status === "finished" ||
        (hasValidTimestamp && currentTime > matchTimestamp + 140 * 60 * 1000)
      ) {
        realStatus = "finished";
      } else if (
        displayStatus.isConfirmedLive ||
        liveScore?.status === "live" ||
        m.timeline === "live" ||
        m.realStatus === "live" ||
        m.sourceStatus === "live" ||
        m.isLive === true ||
        (Boolean(m.group) && /trực tiếp/i.test(m.group) && hasStream) ||
        (hasValidTimestamp &&
          currentTime >= matchTimestamp &&
          currentTime - matchTimestamp < 140 * 60 * 1000 &&
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

  // DANH SÁCH TRẬN HỢP LỆ ĐƯỢC PHÉP HIỂN THỊ TRÊN /LIVE:
  // 1. Loại bỏ các trận đã kết thúc
  // 2. Không nhầm các trận ở quá xa thời điểm hiện tại (> 2 giờ tới) vào danh sách
  const validMatches = useMemo(() => {
    const currentTime = now || Date.now();
    return enrichedMatches.filter((m) => {
      // 1. Trận đã kết thúc: loại bỏ khỏi danh sách
      if (m.realStatus === "finished") return false;

      // 2. Trận đang diễn ra: hợp lệ
      if (m.realStatus === "live") return true;

      // 3. Trận sắp diễn ra: chỉ giữ nếu trong khung giờ cho phép (<= 2 giờ tới)
      if (m.realStatus === "upcoming") {
        const matchTimestamp = (scoresMap[m.id] || m.score)?.kickoffTimestamp || m.timestamp;
        const hasValidTimestamp =
          matchTimestamp !== undefined &&
          matchTimestamp !== null &&
          matchTimestamp > 0 &&
          matchTimestamp !== Number.MAX_SAFE_INTEGER;

        if (hasValidTimestamp) {
          return matchTimestamp <= currentTime + 2 * 60 * 60 * 1000;
        }
        return m.timeline === "upcoming" || m.sourceStatus === "upcoming";
      }

      return false;
    });
  }, [enrichedMatches, now, scoresMap]);

  // Đồng bộ số trận hợp lệ hiển thị lên badge Thể Thao tại LiveHubClient
  useEffect(() => {
    onMatchesCountChange?.(validMatches.length);
  }, [validMatches.length, onMatchesCountChange]);

  const counts = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let withStream = 0;

    validMatches.forEach((m) => {
      if (m.realStatus === "live") live++;
      else if (m.realStatus === "upcoming") upcoming++;
      if (m.hasStream) withStream++;
    });

    return {
      live,
      upcoming,
      finished: 0,
      withStream,
      total: validMatches.length,
    };
  }, [validMatches]);

  const availableSports = useMemo(() => {
    const SPORT_CONFIG: Record<string, { label: string; icon: string }> = {
      football: { label: "Bóng đá", icon: "⚽" },
      basketball: { label: "Bóng rổ", icon: "🏀" },
      tennis: { label: "Quần vợt", icon: "🎾" },
      volleyball: { label: "Bóng chuyền", icon: "🏐" },
      esports: { label: "Thể thao điện tử", icon: "🎮" },
      badminton: { label: "Cầu lông", icon: "🏸" },
      f1: { label: "Đua xe F1", icon: "🏎️" },
      motorsport: { label: "Đua xe", icon: "🏍️" },
      boxing: { label: "Quyền anh", icon: "🥊" },
      billiards: { label: "Bida", icon: "🎱" },
      other: { label: "Thể thao khác", icon: "🏆" },
    };

    const sportCounts: Record<string, number> = {};
    for (const m of validMatches) {
      const s = m.sport || "football";
      sportCounts[s] = (sportCounts[s] || 0) + 1;
    }

    const priorityOrder = [
      "football",
      "basketball",
      "tennis",
      "volleyball",
      "esports",
      "badminton",
      "f1",
      "motorsport",
      "boxing",
      "billiards",
      "other",
    ];

    const sportsWithData: { key: string; label: string; icon: string; count: number }[] = [];

    for (const key of priorityOrder) {
      const count = sportCounts[key] || 0;
      if (count > 0) {
        const cfg = SPORT_CONFIG[key] || { label: key, icon: "🏆" };
        sportsWithData.push({
          key,
          label: cfg.label,
          icon: cfg.icon,
          count,
        });
      }
    }

    for (const [key, count] of Object.entries(sportCounts)) {
      if (count > 0 && !priorityOrder.includes(key)) {
        sportsWithData.push({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          icon: "🏆",
          count,
        });
      }
    }

    return sportsWithData;
  }, [validMatches]);

  const availableTournaments = useMemo(() => {
    const tourMap: Record<string, number> = {};
    let specificTournamentCount = 0;

    validMatches.forEach((m) => {
      // Bỏ qua giải đấu không thuộc bộ môn đang lọc
      if (sportFilter !== "all") {
        const matchSport = m.sport || "football";
        if (matchSport !== sportFilter) return;
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
        // Loại bỏ tên bộ môn thể thao chung (không đại diện cho giải đấu độc lập)
        if (isGenericSportTournament(canonicalName) && canonicalName !== "Giải Đấu Khác") {
          return;
        }

        if (canonicalName !== "Giải Đấu Khác") {
          specificTournamentCount++;
        }

        tourMap[canonicalName] = (tourMap[canonicalName] || 0) + 1;
      }
    });

    // Chỉ hiển thị hàng lọc giải đấu khi có ít nhất 1 giải đấu cụ thể độc lập hữu ích
    if (specificTournamentCount === 0) {
      return [];
    }

    return Object.entries(tourMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        if (a.name === "Giải Đấu Khác") return 1;
        if (b.name === "Giải Đấu Khác") return -1;
        return b.count - a.count;
      });
  }, [validMatches, scoresMap, sportFilter]);

  // Tự động reset bộ lọc giải đấu nếu giải đấu đã chọn không còn khả dụng
  useEffect(() => {
    if (selectedTournament !== "all") {
      const exists = availableTournaments.some((t) => t.name === selectedTournament);
      if (!exists) {
        setSelectedTournament("all");
      }
    }
  }, [availableTournaments, selectedTournament]);

  const filteredMatches = useMemo(() => {
    return validMatches.filter((m) => {
      // 0. Lọc theo bộ môn thể thao chính xác (không gán ngầm non-basketball thành football)
      if (sportFilter !== "all") {
        const matchSport = m.sport || "football";
        if (matchSport !== sportFilter) {
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
    validMatches,
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
      if (scrollHeight <= clientHeight) {
        e.preventDefault();
        return;
      }

      const isAtTop = scrollTop <= 0;
      const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 1;

      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [sidePanelTab, filteredMatches.length]);

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

  const handleSelectMatchFromSheet = useCallback(
    (match: FootballMatch) => {
      handleSelectMatch(match);
      setIsMobileSheetOpen(false);
    },
    [handleSelectMatch],
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

  const handleSportChange = useCallback(
    (sport: string) => {
      setSportFilter(sport);
      setSelectedTournament("all");
      onSportChange?.(sport);
      updateUrl({ sport: sport === "all" ? null : sport, tournament: null });
    },
    [onSportChange, updateUrl],
  );

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
      sport: null,
    });
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
          ? selectedMatch
            ? "space-y-2 sm:space-y-2.5"
            : "space-y-4"
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
                <span>Nana Sports Live</span>
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

      {/* THANH ĐIỀU HƯỚNG PHÂN VÙNG THỂ THAO (Ẩn khi đang xem trận trong Cinema Mode) */}
      {!selectedMatch && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1 rounded-xl bg-zinc-950/60 border border-white/10 backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-1 w-full sm:flex sm:w-auto sm:items-center sm:gap-1">
            {/* Nút Trực Tiếp & Match Center */}
            <button
              type="button"
              onClick={() => setActiveSection("matches")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/30 shrink-0 ${
                activeSection === "matches" || activeSection === "match-center"
                  ? "bg-zinc-800 text-white border border-white/20 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Radio className={`w-3.5 h-3.5 shrink-0 ${activeSection === "matches" || activeSection === "match-center" ? "text-red-400 animate-pulse" : "text-zinc-400"}`} />
              <span className="sm:hidden">Trận Đấu</span>
              <span className="hidden sm:inline">Trực Tiếp & Match Center</span>
              <span
                className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeSection === "matches" || activeSection === "match-center"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                {liveMatchesList.length + upcomingMatchesList.length}
              </span>
            </button>

            {/* Nút Bảng Xếp Hạng */}
            <button
              type="button"
              onClick={() => setActiveSection("standings")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/30 shrink-0 ${
                activeSection === "standings"
                  ? "bg-zinc-800 text-white border border-white/20 shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 shrink-0 ${activeSection === "standings" ? "text-amber-400" : "text-zinc-400"}`} />
              <span className="sm:hidden">Bảng Xếp Hạng</span>
              <span className="hidden sm:inline">Bảng Xếp Hạng Giải Đấu</span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                BXH
              </span>
            </button>
          </div>

          {/* Live Match Counter Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/5 text-xs font-medium text-zinc-400 shrink-0">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>
              {liveMatchesList.length} đang diễn ra • {upcomingMatchesList.length} sắp diễn ra
            </span>
          </div>
        </div>
      )}

      {/* KHU VỰC 1: SÂN CỎ TRỰC TIẾP & MATCH DISCOVERY / MATCH CENTER */}
      {(activeSection === "matches" || activeSection === "match-center") && (
        <div className="space-y-6">
          {/* ============================================================ */}
          {/* TRƯỜNG HỢP 1: KHI ĐÃ CHỌN TRẬN ĐẤU (THEATER WATCH & DETAILS) */}
          {/* ============================================================ */}
          {selectedMatch ? (
            <div className="space-y-2.5 sm:space-y-3 pb-16 lg:pb-0">
              {/* THANH ĐIỀU HƯỚNG QUAY LẠI DANH SÁCH & TIÊU ĐỀ TRẬN (BREADCRUMB COMPACT ~32-36PX) */}
              <div className="flex items-center justify-between gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-950/90 border border-white/10 backdrop-blur-xl text-xs shadow-md">
                <button
                  type="button"
                  onClick={handleClosePlayer}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white text-xs font-bold transition cursor-pointer shrink-0 active:scale-95 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Danh sách</span>
                </button>

                <div className="flex items-center gap-2 min-w-0 flex-1 justify-start overflow-hidden px-1">
                  <span className="text-zinc-600 text-xs shrink-0 select-none">/</span>
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                    <span className="font-bold text-white text-xs sm:text-sm truncate">
                      {selectedMatch.title}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-netflix-red/20 text-rose-300 border border-netflix-red/30 shrink-0">
                    {selectedMatch.quality || "FHD"}
                  </span>
                </div>
              </div>

              {/* BỐ CỤC THEATER STUDIO 2 CỘT (DESKTOP) / XẾP CHỒNG (MOBILE) */}
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 items-start pb-2 sm:pb-3">
                {/* CỘT TRÁI (COL 1-7/8 TRÊN DESKTOP): LIVE PLAYER */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-3 flex flex-col justify-start">
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
                      onVideoHeightChange={handleVideoHeightChange}
                    />

                    {/* Thanh thông tin và điều khiển nhanh dưới player */}
                    <div className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-950/80 border border-white/10 text-xs shadow-md">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-gray-300 truncate text-[11px] sm:text-xs block">
                            Đang phát: <strong className="text-white font-black">{selectedMatch.title}</strong>
                          </span>
                        </div>
                      </div>

                      {/* NÚT ĐỔI TRẬN TRÊN MOBILE: BẤM ĐỂ MỞ BOTTOM SHEET */}
                      <button
                        type="button"
                        onClick={() => setIsMobileSheetOpen(true)}
                        aria-label={`Đổi trận đấu (${filteredMatches.length} trận khả dụng)`}
                        className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-netflix-red hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-950/50 transition cursor-pointer active:scale-95 shrink-0"
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Đổi trận</span>
                        <span className="bg-black/40 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                          {filteredMatches.length}
                        </span>
                      </button>

                      <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-netflix-red/20 text-rose-300 border border-netflix-red/30 shrink-0 whitespace-nowrap">
                        Tín hiệu HD
                      </span>
                    </div>

                    {/* KHỐI MATCH CENTER TRÊN MOBILE: THÔNG TIN TRẬN ĐẤU & LUỒNG PHÁT CUỘN TỰ NHIÊN */}
                    <div className="lg:hidden pt-1">
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
                        initialScore={scoresMap[selectedMatch.id] || selectedMatch.score}
                      />
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI (COL 8-12 TRÊN DESKTOP): SIDE PANEL VỚI MATCH CENTER & ĐỔI TRẬN */}
                <div
                  style={{
                    height: sidePanelHeight ? `${Math.max(sidePanelHeight, 540)}px` : "min(580px, calc(100vh - 200px))",
                    maxHeight: sidePanelHeight ? `${Math.max(sidePanelHeight, 640)}px` : "min(680px, calc(100vh - 160px))",
                  }}
                  className="hidden lg:flex lg:col-span-5 xl:col-span-4 min-w-0 flex-col rounded-2xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 overflow-hidden"
                >
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
                      <span className="truncate">Chi tiết trận</span>
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
                      <span className="truncate">Đổi trận ({filteredMatches.length})</span>
                    </button>
                  </div>

                  {/* TAB 1: MATCH CENTER & DIỄN BIẾN THỜI GIAN THỰC */}
                  {sidePanelTab === "match-center" && (
                    <div
                      style={{ overscrollBehavior: "contain" }}
                      className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-0.5 space-y-2 scrollbar-thin"
                    >
                      <div className="space-y-2 pt-0.5">
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
                          initialScore={scoresMap[selectedMatch.id] || selectedMatch.score}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ĐỔI TRẬN ĐẤU - DANH SÁCH THU GỌN VỚI TÌM KIẾM */}
                  {sidePanelTab === "matches" && (
                    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
                      {/* Ô tìm kiếm nhanh trong side panel */}
                      <div className="relative w-full shrink-0">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm trận đấu, giải đấu, bình luận viên..."
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
                        style={{ overscrollBehavior: "contain" }}
                        className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-1.5 px-0.5 py-0.5 pr-1 scrollbar-thin touch-pan-y"
                      >
                        {filteredMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            score={scoresMap[match.id] || match.score}
                            isSelected={selectedMatch?.id === match.id}
                            onSelect={handleSelectMatch}
                            compact={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* THANH ĐIỀU HƯỚNG NỔI TIỆN LỢI CHO MOBILE (BOTTOM FLOATING COMMAND BAR) */}
              <div
                className="fixed bottom-3 inset-x-3 z-40 lg:hidden flex items-center justify-between gap-2 p-1.5 px-2.5 rounded-2xl bg-zinc-950/95 border border-white/15 backdrop-blur-2xl shadow-2xl safe-area-bottom pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              >
                {/* Nút quay lại danh sách */}
                <button
                  type="button"
                  onClick={handleClosePlayer}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Danh sách</span>
                </button>

                {/* Tiêu đề trận thu gọn + cuộn lên player */}
                <button
                  type="button"
                  onClick={scrollToPlayerArea}
                  className="flex items-center gap-1.5 min-w-0 px-2 py-1.5 rounded-xl hover:bg-white/5 transition cursor-pointer text-left truncate flex-1"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-bold text-zinc-300 truncate">
                    {selectedMatch.title}
                  </span>
                </button>

                {/* Nút Đổi trận (Mở Bottom Sheet) */}
                <button
                  type="button"
                  onClick={() => setIsMobileSheetOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-950/50 transition cursor-pointer active:scale-95 shrink-0"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Đổi trận</span>
                  <span className="bg-black/40 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {filteredMatches.length}
                  </span>
                </button>
              </div>

              {/* ============================================================ */}
              {/* MOBILE BOTTOM SHEET: DANH SÁCH ĐỔI TRẬN ĐẤU (CHỈ DÀNH CHO MOBILE) */}
              {/* ============================================================ */}
              {isMobileSheetOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Danh sách đổi trận đấu"
                  className="fixed inset-0 z-[60] lg:hidden flex flex-col justify-end"
                >
                  {/* Backdrop làm mờ tối */}
                  <div
                    onClick={() => setIsMobileSheetOpen(false)}
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
                  />

                  {/* Khay Bottom Sheet */}
                  <div
                    style={{ overscrollBehavior: "contain" }}
                    className="relative z-10 w-full h-[78dvh] max-h-[85dvh] flex flex-col rounded-t-3xl border-t border-white/15 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overscroll-contain animate-in slide-in-from-bottom duration-300 ease-out"
                  >
                    {/* Vùng tay nắm kéo (Drag handle) & Header cố định */}
                    <div
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      className="shrink-0 pt-2.5 pb-2 px-4 border-b border-white/10 select-none cursor-grab active:cursor-grabbing"
                    >
                      {/* Thanh gạt tay nắm */}
                      <div className="w-10 h-1.5 rounded-full bg-white/25 mx-auto mb-2" />

                      {/* Tiêu đề & nút đóng */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-4 h-4 text-netflix-red shrink-0" />
                          <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">
                            Đổi Trận Đấu
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 shrink-0">
                            {filteredMatches.length} trận
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsMobileSheetOpen(false)}
                          aria-label="Đóng danh sách đổi trận"
                          className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Ô tìm kiếm cố định */}
                    <div className="shrink-0 p-3 pb-2 border-b border-white/5">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm trận đấu, giải đấu, BLV..."
                          className="w-full pl-9 pr-14 py-2 rounded-xl bg-zinc-900 border border-white/15 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner font-medium"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => handleSearchChange("")}
                            title="Xóa tìm kiếm"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hàng nút lọc nhanh trạng thái trong Bottom Sheet */}
                    <div className="shrink-0 px-3 py-1.5 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x">
                      <button
                        type="button"
                        onClick={() => handleStatusChange("all")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border cursor-pointer ${
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
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border cursor-pointer ${
                            selectedStatus === "live"
                              ? "bg-red-600 text-white border-red-500 shadow-sm"
                              : "bg-zinc-900 text-rose-300 border-red-500/20 hover:text-white"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          <span>Đang live ({counts.live})</span>
                        </button>
                      )}
                      {counts.upcoming > 0 && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange("upcoming")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition border cursor-pointer ${
                            selectedStatus === "upcoming"
                              ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                              : "bg-zinc-900 text-sky-300 border-white/10 hover:text-white"
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          <span>Sắp đá ({counts.upcoming})</span>
                        </button>
                      )}
                    </div>

                    {/* Vùng danh sách thẻ trận cuộn dọc độc lập */}
                    <div
                      style={{ overscrollBehavior: "contain" }}
                      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-2 space-y-1.5 scrollbar-thin touch-pan-y pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                    >
                      {filteredMatches.length > 0 ? (
                        filteredMatches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            score={scoresMap[match.id] || match.score}
                            isSelected={selectedMatch?.id === match.id}
                            onSelect={handleSelectMatchFromSheet}
                            compact={true}
                          />
                        ))
                      ) : (
                        <div className="py-12 text-center text-zinc-400 space-y-2">
                          <Search className="w-6 h-6 mx-auto text-zinc-500" />
                          <p className="text-xs font-bold text-white">Không tìm thấy trận đấu nào</p>
                          <p className="text-[11px] text-zinc-500">
                            {searchQuery ? `Thử tìm kiếm với từ khóa khác` : "Chưa có trận nào trong danh sách"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                      placeholder="Tìm trận đấu, giải đấu, bình luận viên..."
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
                        <span>Đang diễn ra ({counts.live})</span>
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
                        <span>Sắp diễn ra ({counts.upcoming})</span>
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
                        <span>Đã kết thúc ({counts.finished})</span>
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

                {/* Hàng 2: Bộ lọc các môn thể thao dạng cuộn ngang */}
                <ScrollablePillsRow innerClassName="flex items-center gap-1 sm:gap-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() => handleSportChange("all")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                      sportFilter === "all"
                        ? "bg-white text-black border-white shadow-sm font-extrabold"
                        : "bg-zinc-900/90 text-zinc-400 border-white/10 hover:text-white"
                    }`}
                  >
                    <span>Tất cả</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        sportFilter === "all"
                          ? "bg-black/20 text-black font-black"
                          : "bg-white/10 text-zinc-400"
                      }`}
                    >
                      {validMatches.length}
                    </span>
                  </button>

                  {availableSports.map((sp) => {
                    const isSelected = sportFilter === sp.key;
                    return (
                      <button
                        key={sp.key}
                        type="button"
                        onClick={() => handleSportChange(sp.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-gradient-to-r from-netflix-red to-netflix-red/85 text-white border-netflix-red shadow-md shadow-[var(--accent-glow,rgba(229,9,20,0.4))] scale-[1.02]"
                            : "bg-zinc-900/90 text-zinc-300 border-white/10 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span>{sp.icon}</span>
                        <span>{sp.label}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? "bg-black/40 text-white font-black"
                              : "bg-white/10 text-zinc-400"
                          }`}
                        >
                          {sp.count}
                        </span>
                      </button>
                    );
                  })}
                </ScrollablePillsRow>

                {/* Hàng 3: Bộ lọc các giải đấu nổi bật dạng cuộn ngang */}
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
                      Tất cả giải ({sportFilter === "all" ? validMatches.length : (availableSports.find((s) => s.key === sportFilter)?.count || 0)})
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
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
                          Sắp Diễn Ra
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
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
