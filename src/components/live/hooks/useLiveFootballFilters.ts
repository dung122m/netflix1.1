"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  type FootballMatch,
  evaluateEventLifecycle,
} from "@/services/live/football/service";
import { getServerProbeStatus } from "@/services/live/football/clientSourceProbe";
import type { LiveMatchScore } from "@/services/live/football-score/types";
import { resolveMatchDisplayStatus } from "@/services/live/football-score/liveStatus";
import {
  resolveCanonicalTournament,
  isGenericSportTournament,
} from "@/services/live/football-score/canonicalLeagues";
import { isFeaturedMatch } from "@/services/live/football/featuredMatch";

export type MatchStatusFilter = "all" | "live" | "upcoming" | "finished";

export interface UseLiveFootballFiltersOptions {
  liveMatches: FootballMatch[];
  scoresMap: Record<string, LiveMatchScore>;
  now: number;
  selectedSport?: string;
  onSportChange?: (sport: string) => void;
  onMatchesCountChange?: (count: number) => void;
  onActiveSectionChange?: (
    section: "matches" | "match-center" | "standings",
  ) => void;
  onPopstateMatchFound: (match: FootballMatch | null) => void;
}

/**
 * Manages sports/status/tournament/search/FHD/featured filtering,
 * match lifecycle enrichment & 2-hour upcoming window filtering, counts,
 * and URL query synchronization + browser Back/Forward state restoration.
 */
export function useLiveFootballFilters({
  liveMatches,
  scoresMap,
  now,
  selectedSport,
  onSportChange,
  onMatchesCountChange,
  onActiveSectionChange,
  onPopstateMatchFound,
}: UseLiveFootballFiltersOptions) {
  const searchParams = useSearchParams();

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
  const [selectedStatus, setSelectedStatus] = useState<MatchStatusFilter>(() => {
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
            onPopstateMatchFound(foundMatch);
          }
        } else {
          onPopstateMatchFound(null);
        }
      } catch {}
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [liveMatches, onPopstateMatchFound]);

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
      } catch {}
    },
    [],
  );

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
      const hasAliveServer = workingServers.some(
        (s) => getServerProbeStatus(s.url) === "alive",
      );
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

      const isKickoffInFuture =
        hasValidTimestamp && currentTime < matchTimestamp;

      const lifecycle = evaluateEventLifecycle({
        timestamp: matchTimestamp,
        score: liveScore,
        sourceStatus: m.sourceStatus,
        streamHealth,
        now: currentTime,
        sport: m.sport,
        isEvent: m.isEvent,
      });

      let realStatus: "live" | "upcoming" | "finished" =
        lifecycle.displayTimeline;
      if (
        lifecycle.eventStatus === "FINISHED" ||
        displayStatus.statusType === "finished"
      ) {
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
            category: m.category,
            gender: m.gender,
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

  const validMatches = useMemo(() => {
    const currentTime = now || Date.now();
    return enrichedMatches.filter((m) => {
      if (m.realStatus === "finished") return false;
      if (m.realStatus === "live") return true;
      if (m.realStatus === "upcoming") {
        const matchTimestamp =
          (scoresMap[m.id] || m.score)?.kickoffTimestamp || m.timestamp;
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

  const availableTournaments = useMemo(() => {
    const tourMap: Record<string, number> = {};
    let specificTournamentCount = 0;

    validMatches.forEach((m) => {
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
        category: m.category,
        gender: m.gender,
        score: liveScore,
      });

      if (canonicalName) {
        if (
          isGenericSportTournament(canonicalName) &&
          canonicalName !== "Giải Đấu Khác"
        ) {
          return;
        }

        if (canonicalName !== "Giải Đấu Khác") {
          specificTournamentCount++;
        }

        tourMap[canonicalName] = (tourMap[canonicalName] || 0) + 1;
      }
    });

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

  useEffect(() => {
    if (selectedTournament !== "all") {
      const exists = availableTournaments.some(
        (t) => t.name === selectedTournament,
      );
      if (!exists) {
        setSelectedTournament("all");
      }
    }
  }, [availableTournaments, selectedTournament]);

  const filteredMatches = useMemo(() => {
    return validMatches.filter((m) => {
      if (sportFilter !== "all") {
        const matchSport = m.sport || "football";
        if (matchSport !== sportFilter) {
          return false;
        }
      }

      if (selectedStatus !== "all" && m.realStatus !== selectedStatus) {
        return false;
      }

      if (
        selectedFootballGroup !== "all" &&
        m.group !== selectedFootballGroup &&
        !m.groups?.includes(selectedFootballGroup)
      ) {
        return false;
      }

      if (selectedTournament !== "all") {
        const liveScore = scoresMap[m.id] || m.score;
        const canonicalTournament = resolveCanonicalTournament({
          tournament: m.tournament,
          title: m.title,
          sport: m.sport,
          team1: m.team1,
          team2: m.team2,
          category: m.category,
          gender: m.gender,
          score: liveScore,
        });
        if (canonicalTournament !== selectedTournament) {
          return false;
        }
      }

      if (onlyWithStream && !m.hasStream) {
        return false;
      }

      if (onlyFeatured && !m.isFeatured) {
        return false;
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
    return filteredMatches
      .filter((m) => m.realStatus === "live")
      .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }, [filteredMatches]);

  const upcomingMatchesList = useMemo(() => {
    return filteredMatches
      .filter((m) => m.realStatus === "upcoming")
      .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }, [filteredMatches]);

  const handleStatusChange = useCallback(
    (status: MatchStatusFilter) => {
      onActiveSectionChange?.("matches");
      setSelectedStatus(status);
      updateUrl({ status: status === "all" ? null : status });
    },
    [onActiveSectionChange, updateUrl],
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      updateUrl({ q: query.trim() || null });
    },
    [updateUrl],
  );

  const handleFeaturedToggle = useCallback(() => {
    onActiveSectionChange?.("matches");
    const next = !onlyFeatured;
    setOnlyFeatured(next);
    updateUrl({ featured: next });
  }, [onActiveSectionChange, onlyFeatured, updateUrl]);

  const handleResetFilters = useCallback(() => {
    setSelectedFootballGroup("all");
    setSelectedTournament("all");
    setSelectedStatus("all");
    setOnlyWithStream(false);
    setOnlyFeatured(false);
    setSearchQuery("");
    setOnlyFhd(false);
    setSportFilter("all");
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

  return {
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
  };
}

