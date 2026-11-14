"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { FootballMatch } from "@/services/live/football/service";
import type { LiveMatchScore } from "@/services/live/football-score/types";
import { shouldRefreshOnTabFocus } from "@/services/live/football-score/matchCenterRealtime";
import { isVerifiedScoreboardMatch } from "@/services/live/football-score/canonicalLeagues";

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
    }, 5 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (
          shouldRefreshOnTabFocus(
            lastFetchedMatchesTimeRef.current,
            5 * 60 * 1000,
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

  // Kiểm tra xem danh sách trận đấu hôm nay có bất kỳ trận nào thuộc 16 giải đấu lớn có tỷ số ESPN hay không
  const hasScoreboardMatchesToday = useMemo(() => {
    return liveMatches.some((m) => isVerifiedScoreboardMatch(m));
  }, [liveMatches]);

  // Kiểm tra xem hiện tại có trận giải lớn nào đang LIVE hoặc trong khung giờ thi đấu (10m trước kickoff -> 2.5h sau kickoff)
  const hasActiveScoreboardMatches = useMemo(() => {
    if (Object.values(scoresMap).some((s) => s.status === "live")) {
      return true;
    }

    const currentTs = now > 0 ? now : Date.now();

    return liveMatches.some((m) => {
      if (!isVerifiedScoreboardMatch(m)) return false;

      // 1. Luồng stream đã gắn mác Live
      if (m.timeline === "live") return true;

      // 2. Điểm số có trạng thái Live
      const score = scoresMap[m.id] || m.score;
      if (score?.status === "live") return true;

      // 3. Khung giờ bóng lăn: từ 10 phút trước kickoff tới 2.5 tiếng sau kickoff
      if (m.timestamp && m.timestamp > 0 && m.timestamp !== Number.MAX_SAFE_INTEGER) {
        const diffMs = m.timestamp - currentTs;
        if (diffMs <= 10 * 60 * 1000 && diffMs >= -2.5 * 60 * 60 * 1000) {
          if (score?.status === "finished" || m.timeline === "finished") {
            return false;
          }
          return true;
        }
      }

      return false;
    });
  }, [liveMatches, scoresMap, now]);

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

    // Khi có trận giải lớn đang Live: cập nhật 30s.
    // Khi hôm nay có trận giải lớn nhưng CHƯA ĐÁ / ĐÃ XONG: ngủ đông thông minh 5 phút (300,000ms).
    // Khi hôm nay HOÀN TOÀN KHÔNG CÓ trận giải lớn nào (chỉ có tennis, bóng rổ, giải phong trào...): TẮT HẲN polling (null) để tiết kiệm 100% tài nguyên!
    const pollIntervalMs = hasActiveScoreboardMatches
      ? 30_000
      : hasScoreboardMatchesToday
        ? 300_000
        : null;

    const isReturningFromInactive = !wasActiveScoresRef.current;
    wasActiveScoresRef.current = true;

    // Chỉ fetch ngay khi vào/quay lại tab nếu hôm nay thực sự có trận thuộc các giải lớn
    if (isReturningFromInactive && hasScoreboardMatchesToday) {
      fetchScores();
    } else if (lastFetchedScoresTimeRef.current === 0) {
      lastFetchedScoresTimeRef.current = Date.now();
    }

    let interval: NodeJS.Timeout | null = null;
    if (pollIntervalMs !== null) {
      interval = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        fetchScores();
      }, pollIntervalMs);
    }

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (!hasScoreboardMatchesToday) return;
        const cooldown = hasActiveScoreboardMatches ? 10_000 : 300_000;
        if (
          shouldRefreshOnTabFocus(
            lastFetchedScoresTimeRef.current,
            cooldown,
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
      if (interval) clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [isActive, hasActiveScoreboardMatches, hasScoreboardMatchesToday]);

  return {
    liveMatches,
    scoresMap,
    now,
  };
}

