"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  FootballMatch,
  LiveFootballData,
  evaluateEventLifecycle,
} from "@/services/live/football/service";
import { useBodyScrollLock } from "@/lib/scrollLock";
import { clearProbeQueue, getServerProbeStatus } from "@/services/live/football/clientSourceProbe";
import { LivePlayer, toCanonicalSourceUrl } from "./LivePlayer";
import { MatchCard } from "./MatchCard";
import { MatchCenter } from "./MatchCenter";
import { Tooltip } from "@/components/ui/Tooltip";
import { MatchTimelineSidebar } from "./MatchTimelineSidebar";
import { LeagueStandings } from "./LeagueStandings";
import { ScrollablePillsRow } from "@/components/ui/ScrollablePillsRow";
import { LiveMatchScore, NormalizedMatchSummary } from "@/services/live/football-score/types";
import { shouldRefreshOnTabFocus } from "@/services/live/football-score/matchCenterRealtime";
import {
  resolveMatchDisplayStatus,
} from "@/services/live/football-score/liveStatus";
import { resolveCanonicalTournament, isGenericSportTournament } from "@/services/live/football-score/canonicalLeagues";
import { isFeaturedMatch } from "@/services/live/football/featuredMatch";
import {
  Search,
  Radio,
  X,
  Clock,
  Zap,
    Trophy,
  Check,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  Flame,
  Activity,
} from "lucide-react";

interface LiveFootballClientProps {
  initialData: LiveFootballData;
  initialScores?: Record<string, LiveMatchScore> | null;
  hideHeader?: boolean;
  isActive?: boolean;
  selectedSport?: string;
  onSportChange?: (sport: string) => void;
  onMatchesCountChange?: (count: number) => void;
  onMatchSelectedChange?: (hasMatch: boolean) => void;
}

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
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>(
    initialData.matches,
  );
  const [activeSection, setActiveSection] = useState<
    "matches" | "match-center" | "standings"
  >("matches");
  const [sidePanelTab, setSidePanelTab] = useState<"timeline" | "matches">("matches");
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

  // Bản đồ tỷ số livescore được làm mới mỗi 15-60s (khởi tạo ngay lập tức từ SSR)
  const [scoresMap, setScoresMap] = useState<Record<string, LiveMatchScore>>(() => {
    const initialMap: Record<string, LiveMatchScore> = { ...(initialScores || {}) };
    if (initialData?.matches) {
      for (const m of initialData.matches) {
        if (m.score && !initialMap[m.id]) {
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

    if (isReturningFromInactive) {
      // Khi tab bóng đá active trở lại: fetch ngay lập tức để cập nhật tỷ số mới nhất
      fetchScores();
    } else if (lastFetchedScoresTimeRef.current === 0) {
      // Đã nạp initialScores từ SSR -> ghi nhận timestamp, loại bỏ độ trễ 3s không cần thiết
      lastFetchedScoresTimeRef.current = Date.now();
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
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [isActive, hasLiveMatches]);

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
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);

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

  // Xác định trạng thái trận tâm điểm cho trận đấu đang chọn
  const _selectedMatchFeatured = useMemo(() => {
    if (!selectedMatch) return null;
    const tName = resolveCanonicalTournament({
      tournament: selectedMatch.tournament,
      title: selectedMatch.title,
      sport: selectedMatch.sport,
      team1: selectedMatch.team1,
      team2: selectedMatch.team2,
      category: selectedMatch.category,
      gender: selectedMatch.gender,
      score: currentMatchScore,
    });
    return isFeaturedMatch({
      title: selectedMatch.title,
      tournament: tName,
      team1: selectedMatch.team1,
      team2: selectedMatch.team2,
      sport: selectedMatch.sport,
      category: selectedMatch.category,
      gender: selectedMatch.gender,
      score: currentMatchScore,
      validServersCount: selectedMatch.servers?.length || 0,
      servers: selectedMatch.servers,
    });
  }, [selectedMatch, currentMatchScore]);

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

  useEffect(() => {
    setMatchSummary(null);
    setIsSummaryLoading(Boolean(currentMatchScore?.eventId && currentMatchScore?.leagueSlug));
  }, [selectedMatch?.id, currentMatchScore?.eventId, currentMatchScore?.leagueSlug]);

  const hasTimelineEvents = Boolean(matchSummary?.events && matchSummary.events.length > 0);
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
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(
    () => searchParams.get("featured") === "1",
  );
  const [showMatchRail, setShowMatchRail] = useState(false);
  const [isTournamentDropdownOpen, setIsTournamentDropdownOpen] = useState(false);
  const [tournamentSearch, setTournamentSearch] = useState("");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const tournamentDropdownRef = useRef<HTMLDivElement>(null);

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

  // Đồng bộ trạng thái khi người dùng nhấn nút Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const url = new URL(window.location.href);
        setOnlyFhd(url.searchParams.get("fhd") === "1");
        setOnlyWithStream(url.searchParams.get("stream") === "1");
        setOnlyFeatured(url.searchParams.get("featured") === "1");
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
          let foundMatch = liveMatches.find((m) => m.id === matchId);
          if (!foundMatch) {
            const baseId = matchId.replace(/_\d{6,10}$/, "");
            if (baseId && baseId.length > 8) {
              foundMatch = liveMatches.find((m) => m.id.startsWith(baseId));
            }
          }
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
        featured?: boolean | null;
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

        if (updates.featured !== undefined) {
          if (updates.featured) {
            url.searchParams.set("featured", "1");
          } else {
            url.searchParams.delete("featured");
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

  // Tự động chuẩn hóa URL nếu URL mang ID cũ bị lệch đuôi thời gian so với ID thực tế
  useEffect(() => {
    if (!selectedMatch) return;
    const matchParam = searchParams.get("match");
    if (matchParam && matchParam !== selectedMatch.id) {
      const baseParam = matchParam.replace(/_\d{6,10}$/, "");
      if (baseParam && baseParam.length > 8 && selectedMatch.id.startsWith(baseParam)) {
        updateUrl({ match: selectedMatch.id }, false);
      }
    }
  }, [selectedMatch, searchParams, updateUrl]);

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

      const workingServers = (m.servers || []).filter((s) => {
        if (!s.url) return false;
        return getServerProbeStatus(s.url) !== "dead";
      });
      const hasStream = workingServers.length > 0;
      const hasAliveServer = workingServers.some((s) => getServerProbeStatus(s.url) === "alive");
      const streamHealth: "alive" | "dead" | "unknown" =
        workingServers.length === 0
          ? "dead"
          : hasAliveServer
          ? "alive"
          : "unknown";

      const hasValidTimestamp =
        matchTimestamp !== undefined &&
        matchTimestamp !== null &&
        matchTimestamp > 0 &&
        matchTimestamp !== Number.MAX_SAFE_INTEGER;

      const isKickoffInFuture = hasValidTimestamp && currentTime < matchTimestamp;

      const lifecycle = evaluateEventLifecycle({
        timestamp: matchTimestamp,
        score: liveScore,
        sourceStatus: m.sourceStatus,
        streamHealth,
        now: currentTime,
        sport: m.sport,
        isEvent: m.isEvent,
      });

      // Phân nhóm trạng thái thực tế dựa trên Adaptive Hybrid Event Lifecycle Engine
      let realStatus: "live" | "upcoming" | "finished" = lifecycle.displayTimeline;
      if (lifecycle.eventStatus === "FINISHED" || displayStatus.statusType === "finished") {
        realStatus = "finished";
      } else if (isKickoffInFuture && !lifecycle.isLiveInWindow) {
        realStatus = "upcoming";
      }

      const enrichedDisplayStatus = lifecycle.statusBadge
        ? {
            ...displayStatus,
            badgeLabel: lifecycle.statusBadge,
            isConfirmedLive: realStatus === "live",
          }
        : displayStatus;

      return {
        ...m,
        realStatus,
        statusBadge: lifecycle.statusBadge,
        lifecycle,
        hasStream,
        displayStatus: enrichedDisplayStatus,
        isFeatured: isFeaturedMatch({
          title: m.title,
          tournament: resolveCanonicalTournament({
            tournament: m.tournament,
            title: m.title,
            sport: m.sport,
            team1: m.team1,
            team2: m.team2,
            score: liveScore,
          }),
          team1: m.team1,
          team2: m.team2,
          sport: m.sport,
          category: m.category,
          gender: m.gender,
          score: liveScore,
          validServersCount: new Set(
            (m.servers || [])
              .map((s) => s.url?.trim().toLowerCase())
              .filter(Boolean),
          ).size,
          servers: m.servers,
        }).isFeatured,
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
    let featured = 0;

    validMatches.forEach((m) => {
      if (m.realStatus === "live") live++;
      else if (m.realStatus === "upcoming") upcoming++;
      if (m.hasStream) withStream++;
      if (m.isFeatured) featured++;
    });

    return {
      live,
      upcoming,
      finished: 0,
      withStream,
      featured,
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

  const filteredTournaments = useMemo(() => {
    if (!tournamentSearch.trim()) return availableTournaments;
    const q = tournamentSearch.toLowerCase().trim();
    return availableTournaments.filter((t) => t.name.toLowerCase().includes(q));
  }, [availableTournaments, tournamentSearch]);

  useEffect(() => {
    if (!isTournamentDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tournamentDropdownRef.current && !tournamentDropdownRef.current.contains(e.target as Node)) {
        setIsTournamentDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsTournamentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTournamentDropdownOpen]);

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

      // 4B. Lọc "Trận tâm điểm"
      if (onlyFeatured && !m.isFeatured) {
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
    onlyFeatured,
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

  const handleFeaturedToggle = useCallback(() => {
    const next = !onlyFeatured;
    setOnlyFeatured(next);
    updateUrl({ featured: next });
  }, [onlyFeatured, updateUrl]);

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
    setOnlyFeatured(false);
    setSearchQuery("");
    setOnlyFhd(false);
    setSportFilter("all");
    setIsTournamentDropdownOpen(false);
    setTournamentSearch("");
    onSportChange?.("all");
    updateUrl({
      group: null,
      tournament: null,
      status: null,
      stream: null,
      featured: null,
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
    onlyFeatured ||
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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/20 text-netflix-red text-xs font-bold animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>Nana Sports Live</span>
              </span>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1 rounded-xl bg-zinc-950/40 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-1 w-full sm:flex sm:w-auto sm:items-center sm:gap-1">
            {/* Nút Trực Tiếp & Match Center */}
            <button
              type="button"
              onClick={() => setActiveSection("matches")}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/30 shrink-0 ${
                activeSection === "matches" || activeSection === "match-center"
                  ? "bg-zinc-800 text-white  shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 "
              }`}
            >
              <Radio className={`w-3.5 h-3.5 shrink-0 ${activeSection === "matches" || activeSection === "match-center" ? "text-red-500 animate-pulse" : "text-zinc-400"}`} />
              <span className="sm:hidden">Trận Đấu</span>
              <span className="hidden sm:inline">Trực Tiếp & Match Center</span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold leading-none tabular-nums ${
                  activeSection === "matches" || activeSection === "match-center"
                    ? "bg-red-500/20 text-red-300 "
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
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-lg text-xs font-bold transition-all cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-white/30 shrink-0 ${
                activeSection === "standings"
                  ? "bg-zinc-800 text-white  shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5 "
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 shrink-0 ${activeSection === "standings" ? "text-amber-400" : "text-zinc-400"}`} />
              <span className="sm:hidden">Bảng Xếp Hạng</span>
              <span className="hidden sm:inline">Bảng Xếp Hạng Giải Đấu</span>
              <span className="inline-flex items-center justify-center h-5 px-1.5 text-[11px] uppercase font-bold rounded bg-amber-500/15 text-amber-300 leading-none">
                BXH
              </span>
            </button>
          </div>

          {/* Live Match Counter Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 text-xs font-medium text-zinc-400 shrink-0">
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
              <div
                id="live-player-header"
                ref={playerRef}
                className="flex items-center justify-between gap-2.5 px-1 py-1 text-xs"
              >
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
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Đổi trận</span>
                    <span className="bg-black/35 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
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
                        allVisibleMatches.length > 0 ? allVisibleMatches : [selectedMatch]
                      }
                      onSelectMatch={handleSelectMatch}
                      showMatchRail={showMatchRail}
                      onToggleMatchRail={() => setShowMatchRail((prev) => !prev)}
                      onCloseMatchRail={() => setShowMatchRail(false)}
                      isActive={isActive}
                      onVideoHeightChange={handleVideoHeightChange}
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
                        onSummaryChange={setMatchSummary}
                        onLoadingChange={setIsSummaryLoading}
                        initialScore={currentMatchScore}
                      />
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI (COL 8-12 TRÊN DESKTOP): SIDE PANEL VỚI DIỄN BIẾN & ĐỔI TRẬN */}
                <div
                  style={{
                    height: sidePanelHeight ? `${Math.max(sidePanelHeight, 540)}px` : "min(580px, calc(100vh - 200px))",
                    maxHeight: sidePanelHeight ? `${Math.max(sidePanelHeight, 640)}px` : "min(680px, calc(100vh - 160px))",
                  }}
                  className="hidden lg:flex lg:col-span-5 xl:col-span-4 min-w-0 flex-col rounded-2xl bg-zinc-950/90 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 overflow-hidden"
                >
                  {/* SUB-TABS TRÊN SIDE PANEL */}
                  {hasTimelineEvents ? (
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSidePanelTab("timeline")}
                        className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
                          sidePanelTab === "timeline"
                            ? "bg-netflix-red text-white shadow-md shadow-black/50"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-300" />
                        <span className="truncate">
                          Diễn biến{matchSummary?.events ? ` (${matchSummary.events.length})` : ""}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSidePanelTab("matches")}
                        className={`flex items-center justify-center gap-1.5 py-2 text-xs font-black rounded-lg transition text-center cursor-pointer ${
                          sidePanelTab === "matches"
                            ? "bg-netflix-red text-white shadow-md shadow-black/50"
                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span className="truncate">Đổi trận ({filteredMatches.length})</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-netflix-red shrink-0" />
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
                        homeTeamName={selectedMatch.team1}
                        awayTeamName={selectedMatch.team2}
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
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm trận, giải, BLV..."
                          className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-zinc-900 text-xs text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => handleSearchChange("")}
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
                          onClick={() => handleStatusChange("all")}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedStatus === "all"
                              ? "bg-zinc-700/90 text-white shadow-sm font-bold"
                              : "bg-zinc-900 text-zinc-400 hover:text-white"
                          }`}
                        >
                          Tất cả ({counts.total})
                        </button>
                        {counts.live > 0 && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange("live")}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                              selectedStatus === "live"
                                ? "bg-netflix-red text-white shadow-sm"
                                : "bg-zinc-900 text-rose-300 hover:text-white"
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
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                              selectedStatus === "upcoming"
                                ? "bg-sky-600 text-white shadow-sm"
                                : "bg-zinc-900 text-sky-300 hover:text-white"
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            <span>Sắp đá ({counts.upcoming})</span>
                          </button>
                        )}
                      </div>

                      {/* Danh sách thẻ trận cuộn dọc */}
                      <div
                        ref={railContainerRef}
                        style={{ overscrollBehavior: "contain" }}
                        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-0.5 pt-0 pb-3 pr-1 scrollbar-thin touch-pan-y"
                      >
                        {filteredMatches.length > 0 ? (
                          <div className="space-y-2">
                            {/* KHỐI TRẬN ĐANG TRỰC TIẾP */}
                            {liveMatchesList.length > 0 && (
                              <div>
                                <div className="sticky top-0 z-20 -mx-0.5 -mr-1 px-3 py-2 bg-zinc-950 border-b border-red-500/30 flex items-center justify-between shadow-md">
                                  <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                                    </span>
                                    <span className="text-[11px] font-black uppercase tracking-wider text-red-400">
                                      Đang trực tiếp
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
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
                                      onSelect={handleSelectMatch}
                                      compact={true}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* KHỐI TRẬN SẮP DIỄN RA */}
                            {upcomingMatchesList.length > 0 && (
                              <div className="mt-2.5">
                                <div className="sticky top-0 z-20 -mx-0.5 -mr-1 px-3 py-2 bg-zinc-950 border-b border-sky-500/30 flex items-center justify-between shadow-md">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                    <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
                                      Sắp diễn ra
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-black tabular-nums px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
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
                                      onSelect={handleSelectMatch}
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
              </div>

              

              {/* ============================================================ */}
              {/* MOBILE BOTTOM SHEET: DANH SÁCH ĐỔI TRẬN ĐẤU (CHỈ DÀNH CHO MOBILE) */}
              {/* ============================================================ */}
              {isMobileSheetOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Danh sách đổi trận đấu"
                  className="fixed inset-0 z-[100000] lg:hidden flex flex-col justify-end"
                >
                  {/* Backdrop làm mờ tối */}
                  <div
                    onClick={() => setIsMobileSheetOpen(false)}
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
                  />

                  {/* Khay Bottom Sheet */}
                  <div
                    style={{ overscrollBehavior: "contain" }}
                    className="relative z-10 w-full h-[78dvh] max-h-[85dvh] flex flex-col rounded-t-3xl bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overscroll-contain animate-in slide-in-from-bottom duration-300 ease-out"
                  >
                    {/* Vùng tay nắm kéo (Drag handle) & Header cố định */}
                    <div
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      className="shrink-0 pt-2.5 pb-2 px-4 select-none cursor-grab active:cursor-grabbing"
                    >
                      {/* Thanh gạt tay nắm */}
                      <div className="w-10 h-1.5 rounded-full bg-white/25 mx-auto mb-2" />

                      {/* Tiêu đề & nút đóng */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="w-4 h-4 text-netflix-red shrink-0" />
                          <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">
                            Đổi trận
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 shrink-0">
                            {filteredMatches.length}
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
                    <div className="shrink-0 px-3 pt-3 pb-2">
                      <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm trận, giải, BLV..."
                          className="w-full pl-9 pr-14 py-2 rounded-xl bg-zinc-900 text-xs text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner font-medium"
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
                    <div className="shrink-0 px-3 pb-2 pt-0.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x border-b border-white/5 bg-zinc-950">
                      <button
                        type="button"
                        onClick={() => handleStatusChange("all")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                          selectedStatus === "all"
                            ? "bg-zinc-700/90 text-white shadow-sm font-bold"
                            : "bg-zinc-900 text-zinc-400 hover:text-white"
                        }`}
                      >
                        Tất cả ({counts.total})
                      </button>
                      {counts.live > 0 && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange("live")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedStatus === "live"
                              ? "bg-netflix-red text-white shadow-sm"
                              : "bg-zinc-900 text-rose-300 hover:text-white"
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
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                            selectedStatus === "upcoming"
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-zinc-900 text-sky-300 hover:text-white"
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
                      className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-0 scrollbar-thin touch-pan-y pb-[max(1.5rem,env(safe-area-inset-bottom))]"
                    >
                      {filteredMatches.length > 0 ? (
                        <div className="space-y-2.5">
                          {/* KHỐI TRẬN ĐANG TRỰC TIẾP */}
                          {liveMatchesList.length > 0 && (
                            <div>
                              <div className="sticky top-0 z-20 -mx-3 px-3.5 py-2.5 bg-zinc-950 border-b border-red-500/30 flex items-center justify-between shadow-md">
                                <div className="flex items-center gap-2">
                                  <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                                  </span>
                                  <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-red-200">
                                    Đang trực tiếp
                                  </span>
                                </div>
                                <span className="text-xs font-black tabular-nums px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-200 border border-red-500/30">
                                  {liveMatchesList.length} trận
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-2">
                                {liveMatchesList.map((match) => (
                                  <MatchCard
                                    key={match.id}
                                    match={match}
                                    score={scoresMap[match.id] || match.score}
                                    isSelected={selectedMatch?.id === match.id}
                                    onSelect={handleSelectMatchFromSheet}
                                    compact={true}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* KHỐI TRẬN SẮP DIỄN RA */}
                          {upcomingMatchesList.length > 0 && (
                            <div className="mt-3">
                              <div className="sticky top-0 z-20 -mx-3 px-3.5 py-2.5 bg-zinc-950 border-b border-sky-500/30 flex items-center justify-between shadow-md">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                  <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-sky-200">
                                    Sắp diễn ra
                                  </span>
                                </div>
                                <span className="text-xs font-black tabular-nums px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/30">
                                  {upcomingMatchesList.length} trận
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-2">
                                {upcomingMatchesList.map((match) => (
                                  <MatchCard
                                    key={match.id}
                                    match={match}
                                    score={scoresMap[match.id] || match.score}
                                    isSelected={selectedMatch?.id === match.id}
                                    onSelect={handleSelectMatchFromSheet}
                                    compact={true}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-zinc-400 space-y-2">
                          <Search className="w-6 h-6 mx-auto text-zinc-500" />
                          <p className="text-xs font-bold text-white">Không tìm thấy trận</p>
                          <p className="text-[11px] text-zinc-500">
                            {searchQuery ? `Thử tìm kiếm với từ khóa khác` : "Chưa có trận nào"}
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
              {/* THANH BỘ LỌC TÌM KIẾM TOÀN DIỆN & TINH GỌN (TỐI ĐA 2 HÀNG) */}
              <div className="relative z-30 rounded-xl sm:rounded-2xl bg-zinc-950/80 backdrop-blur-xl p-2 sm:p-4 space-y-2 sm:space-y-3 shadow-2xl">
                {/* HÀNG 1: Ô TÌM KIẾM, BỘ LỌC TRẠNG THÁI & CÔNG TẮC PHÁT (TOGGLES) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3">
                  {/* Ô tìm kiếm thông minh: Desktop luôn hiện, Mobile thu gọn thành icon khi trống */}
                  <div className="hidden lg:block relative w-72 xl:w-80 shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Tìm trận, giải đấu, bình luận viên..."
                      className="w-full pl-9 pr-9 py-2 sm:py-2.5 rounded-xl bg-zinc-900/90 text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus: focus:ring-1 focus:ring-netflix-red/50 transition font-medium shadow-inner"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => handleSearchChange("")}
                        title="Xóa tìm kiếm"
                        aria-label="Xóa tìm kiếm"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Thanh tìm kiếm bung rộng trên mobile khi kích hoạt */}
                  {(isMobileSearchOpen || searchQuery) && (
                    <div className="flex lg:hidden items-center gap-1.5 w-full">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                        <input
                          type="text"
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          placeholder="Tìm trận, giải đấu, BLV..."
                          className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-zinc-900 text-xs text-white placeholder-zinc-400 focus:outline-none shadow-inner min-h-[36px]"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => handleSearchChange("")}
                            title="Xóa tìm kiếm"
                            aria-label="Xóa tìm kiếm"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10 transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileSearchOpen(false);
                          if (searchQuery) handleSearchChange("");
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 text-xs font-semibold text-zinc-300 hover:text-white min-h-[36px] shrink-0"
                      >
                        Đóng
                      </button>
                    </div>
                  )}

                  {/* Cụm điều khiển bên phải: Trạng thái trận (Single-select) & Khối Toggles độc lập */}
                  <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto scrollbar-none py-0.5 touch-pan-x min-w-0">
                    {/* Nút tìm kiếm thu gọn trên Mobile khi chưa mở */}
                    {!isMobileSearchOpen && !searchQuery && (
                      <button
                        type="button"
                        onClick={() => setIsMobileSearchOpen(true)}
                        title="Tìm kiếm trận đấu"
                        aria-label="Tìm kiếm trận đấu"
                        className="lg:hidden flex items-center justify-center w-9 h-9 min-h-[36px] rounded-xl bg-zinc-900/90 text-zinc-400 hover:text-white hover: shrink-0 transition"
                      >
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* NHÓM TRẠNG THÁI TRẬN ĐẤU (SINGLE-SELECT) */}
                    <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStatusChange("all")}
                        className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[32px] sm:min-h-[38px] ${
                          selectedStatus === "all"
                            ? "bg-zinc-700/90 text-white font-bold  shadow-sm"
                            : "text-zinc-400 hover:text-white hover:bg-white/5 "
                        }`}
                      >
                        <span>
                          Tất cả <span className="opacity-60 tabular-nums font-normal">({counts.total})</span>
                        </span>
                      </button>

                      {counts.live > 0 && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange("live")}
                          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[32px] sm:min-h-[38px] ${
                            selectedStatus === "live"
                              ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                              : "text-rose-300/90 hover:text-white hover:bg-white/5 "
                          }`}
                        >
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                          <span className="xs:hidden">
                            Live <span className="opacity-80 tabular-nums font-normal">({counts.live})</span>
                          </span>
                          <span className="hidden xs:inline">
                            Đang diễn ra <span className="opacity-80 tabular-nums font-normal">({counts.live})</span>
                          </span>
                        </button>
                      )}

                      {counts.upcoming > 0 && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange("upcoming")}
                          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[32px] sm:min-h-[38px] ${
                            selectedStatus === "upcoming"
                              ? "bg-zinc-700/90 text-sky-200 font-bold  shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/5 "
                          }`}
                        >
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-sky-400" />
                          <span className="xs:hidden">
                            Sắp đá <span className="opacity-60 tabular-nums font-normal">({counts.upcoming})</span>
                          </span>
                          <span className="hidden xs:inline">
                            Sắp diễn ra <span className="opacity-60 tabular-nums font-normal">({counts.upcoming})</span>
                          </span>
                        </button>
                      )}

                      {counts.finished > 0 && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange("finished")}
                          className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[32px] sm:min-h-[38px] ${
                            selectedStatus === "finished"
                              ? "bg-zinc-700/90 text-zinc-200 font-bold  shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/5 "
                          }`}
                        >
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                          <span className="xs:hidden">
                            Xong <span className="opacity-60 tabular-nums font-normal">({counts.finished})</span>
                          </span>
                          <span className="hidden xs:inline">
                            Đã kết thúc <span className="opacity-60 tabular-nums font-normal">({counts.finished})</span>
                          </span>
                        </button>
                      )}
                    </div>

                    {/* NÚT LỌC TRẬN TÂM ĐIỂM (ĐỘC LẬP, CÂN ĐỐI) */}
                    <Tooltip content="Chỉ hiện các trận cầu tâm điểm / đại chiến hấp dẫn nhất" side="top">
                      <button
                        type="button"
                        onClick={handleFeaturedToggle}
                        aria-pressed={onlyFeatured}
                        aria-label="Chỉ hiện các trận cầu tâm điểm / đại chiến hấp dẫn nhất"
                        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[32px] sm:min-h-[38px] shrink-0 ${
                          onlyFeatured
                            ? "bg-gradient-to-r from-rose-600 to-red-600 text-white  shadow-md shadow-rose-950/60 font-bold"
                            : "bg-zinc-900/80 text-zinc-400  hover:text-rose-300 hover:"
                        }`}
                    >
                      <Flame
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform ${
                          onlyFeatured
                            ? "text-amber-200 fill-amber-300 scale-110"
                            : "text-rose-400 fill-rose-500/30"
                        }`}
                      />
                      <span>
                        Tâm điểm {counts.featured > 0 && <span className="opacity-75 tabular-nums font-normal">({counts.featured})</span>}
                      </span>
                    </button>
                  </Tooltip>
                  </div>
                </div>

                {/* HÀNG 2: BỘ LỌC MÔN THỂ THAO (TRÁI) & CONTROL CHỌN GIẢI ĐẤU (PHẢI) */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-3 pt-0.5">
                  {/* BÊN TRÁI: CÁC MÔN THỂ THAO CUỘN NGANG */}
                  <div className="min-w-0 flex-1 relative">
                    <ScrollablePillsRow innerClassName="flex items-center gap-1 sm:gap-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleSportChange("all")}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition  cursor-pointer shrink-0 min-h-[32px] sm:min-h-[38px] ${
                          sportFilter === "all"
                            ? "bg-zinc-700/90 text-white  shadow-sm font-bold"
                            : "bg-zinc-900/90 text-zinc-400  hover:text-white hover:"
                        }`}
                      >
                        <span className="whitespace-nowrap shrink-0 xs:hidden">
                          Tất cả <span className="opacity-60 tabular-nums font-normal">({validMatches.length})</span>
                        </span>
                        <span className="whitespace-nowrap shrink-0 hidden xs:inline">
                          Tất cả môn <span className="opacity-60 tabular-nums font-normal">({validMatches.length})</span>
                        </span>
                      </button>

                      {availableSports.map((sp) => {
                        const isSelected = sportFilter === sp.key;
                        return (
                          <button
                            key={sp.key}
                            type="button"
                            onClick={() => handleSportChange(sp.key)}
                            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition  cursor-pointer shrink-0 min-h-[32px] sm:min-h-[38px] ${
                              isSelected
                                ? "bg-zinc-700/90 text-white  shadow-sm font-bold"
                                : "bg-zinc-900/90 text-zinc-400  hover:text-white hover:"
                            }`}
                          >
                            <span className="shrink-0">{sp.icon}</span>
                            <span className="whitespace-nowrap shrink-0">
                              {sp.label} <span className="opacity-60 tabular-nums font-normal">({sp.count})</span>
                            </span>
                          </button>
                        );
                      })}
                    </ScrollablePillsRow>
                  </div>

                  {/* BÊN PHẢI: CONTROL CHỌN GIẢI ĐẤU DẠNG DROPDOWN/POPOVER NỔI */}
                  {availableTournaments.length > 0 && (
                    <div className="relative z-40 shrink-0 flex items-center justify-end" ref={tournamentDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsTournamentDropdownOpen((prev) => !prev)}
                        aria-expanded={isTournamentDropdownOpen}
                        aria-haspopup="listbox"
                        className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold transition  cursor-pointer shrink-0 min-h-[32px] sm:min-h-[38px] max-w-full ${
                          selectedTournament !== "all"
                            ? "bg-netflix-red/15 text-rose-300 /40  shadow-sm font-bold"
                            : isTournamentDropdownOpen
                            ? "bg-zinc-800 text-white "
                            : "bg-zinc-900/90 text-zinc-300  hover: hover:text-white"
                        }`}
                      >
                        <Trophy className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${selectedTournament !== "all" ? "text-amber-400" : "text-zinc-400"}`} />
                        <span className="truncate max-w-[65px] xs:max-w-[90px] sm:max-w-[170px]">
                          {selectedTournament === "all" ? (
                            <>
                              <span className="sm:hidden">Giải đấu</span>
                              <span className="hidden sm:inline">Tất cả giải đấu</span>
                            </>
                          ) : (
                            selectedTournament
                          )}
                        </span>
                        <span className="opacity-60 tabular-nums font-normal shrink-0">
                          ({selectedTournament === "all"
                            ? (sportFilter === "all"
                                ? validMatches.length
                                : (availableSports.find((s) => s.key === sportFilter)?.count || validMatches.length))
                            : (availableTournaments.find((t) => t.name === selectedTournament)?.count || 0)})
                        </span>
                        {selectedTournament !== "all" ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTournamentChange("all");
                            }}
                            title="Bỏ chọn giải đấu"
                            className="p-0.5 rounded-full hover:bg-white/20 text-rose-300 hover:text-white transition ml-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <ChevronDown
                            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                              isTournamentDropdownOpen ? "rotate-180 text-white" : "text-zinc-400"
                            }`}
                          />
                        )}
                      </button>

                      {/* POPOVER DROPDOWN GIẢI ĐẤU (Z-50, KHÔNG TRÀN MÉP VIEWPORT) */}
                      {isTournamentDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-24px)] rounded-2xl bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 flex flex-col">
                          <div className="flex items-center justify-between px-2 py-1 mb-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                              <Trophy className="w-3.5 h-3.5 text-amber-400" />
                              <span>Giải đấu nổi bật</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-sans tabular-nums">
                              {availableTournaments.length} giải
                            </span>
                          </div>

                          {availableTournaments.length > 5 && (
                            <div className="relative px-1 mb-1.5">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                              <input
                                type="text"
                                value={tournamentSearch}
                                onChange={(e) => setTournamentSearch(e.target.value)}
                                placeholder="Tìm tên giải đấu..."
                                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900 text-xs text-white placeholder-zinc-500 focus:outline-none focus:"
                              />
                              {tournamentSearch && (
                                <button
                                  type="button"
                                  onClick={() => setTournamentSearch("")}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}

                          <div className="overflow-y-auto max-h-60 scrollbar-thin space-y-0.5">
                            {/* Tùy chọn: Tất cả giải đấu */}
                            <button
                              type="button"
                              onClick={() => {
                                handleTournamentChange("all");
                                setIsTournamentDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                                selectedTournament === "all"
                                  ? "bg-zinc-800 text-white font-bold  shadow-sm"
                                  : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                              }`}
                            >
                              <span>Tất cả giải đấu</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-sans tabular-nums opacity-70">
                                  ({sportFilter === "all"
                                    ? validMatches.length
                                    : (availableSports.find((s) => s.key === sportFilter)?.count || validMatches.length)})
                                </span>
                                {selectedTournament === "all" && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                              </div>
                            </button>

                            {/* Danh sách từng giải */}
                            {filteredTournaments.map((t) => {
                              const isSelected = selectedTournament === t.name;
                              return (
                                <button
                                  key={t.name}
                                  type="button"
                                  onClick={() => {
                                    handleTournamentChange(t.name);
                                    setIsTournamentDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                                    isSelected
                                      ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                                  }`}
                                >
                                  <span className="truncate pr-2">{t.name}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] font-sans tabular-nums opacity-70">({t.count})</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Thanh Reset filter khi có áp dụng */}
                {hasActiveFilters && (
                  <div className="flex items-center justify-between pt-1.5 sm:pt-2 text-[11px] sm:text-xs">
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
                        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                          Đang Phát Trực Tiếp
                        </h2>
                      </div>
                      <span className="text-xs font-sans font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300">
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
                        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-zinc-300">
                          Sắp Diễn Ra
                        </h2>
                      </div>
                      <span className="text-xs font-sans font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-400">
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
                  <div className="p-12 text-center text-zinc-400 space-y-3 rounded-2xl bg-zinc-950/80 shadow-xl">
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
                        className="px-4 py-2 rounded-xl bg-netflix-red text-white text-xs font-bold cursor-pointer hover:brightness-110 active:brightness-95 transition"
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
