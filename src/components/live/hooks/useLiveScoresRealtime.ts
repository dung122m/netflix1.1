"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { FootballMatch } from "@/services/live/football/service";
import type { LiveMatchScore } from "@/services/live/football-score/types";
import { shouldRefreshOnTabFocus } from "@/services/live/football-score/matchCenterRealtime";

export interface UseLiveScoresRealtimeOptions {
  initialMatches: FootballMatch[];
  initialScores?: Record<string, LiveMatchScore> | null;
  isActive: boolean;
}

/**
 * Manages live football match list polling (every 3m + tab-focus refresh),
 * live score polling (every 8s when live / 30s idle + tab-focus refresh),
 * and the 60s kickoff wall-clock tick.
 */
export function useLiveScoresRealtime({
  initialMatches,
  initialScores,
  isActive,
}: UseLiveScoresRealtimeOptions) {
  const [liveMatches, setLiveMatches] =
    useState<FootballMatch[]>(initialMatches);

  useEffect(() => {
    setLiveMatches(initialMatches);
  }, [initialMatches]);

  const isMatchesFetchingRef = useRef(false);
  const wasActiveMatchesRef = useRef(isActive);
  const lastFetchedMatchesTimeRef = useRef<number>(Date.now());

  // Tự động làm mới danh sách trận đấu mỗi 3 phút
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

  const [scoresMap, setScoresMap] = useState<Record<string, LiveMatchScore>>(
    () => {
      const initialMap: Record<string, LiveMatchScore> = {
        ...(initialScores || {}),
      };
      for (const m of initialMatches) {
        if (m.score && !initialMap[m.id]) {
          initialMap[m.id] = m.score;
        }
      }
      return initialMap;
    },
  );

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

    const pollIntervalMs = hasLiveMatches ? 8_000 : 30_000;
    const isReturningFromInactive = !wasActiveScoresRef.current;
    wasActiveScoresRef.current = true;

    if (isReturningFromInactive) {
      fetchScores();
    } else if (lastFetchedScoresTimeRef.current === 0) {
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

  return {
    liveMatches,
    scoresMap,
    now,
  };
}

