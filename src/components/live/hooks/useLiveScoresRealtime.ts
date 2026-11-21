"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { FootballMatch } from "@/services/live/football/service";
import type { LiveMatchScore } from "@/services/live/football-score/types";
import { shouldRefreshOnTabFocus } from "@/services/live/football-score/matchCenterRealtime";
import { isVerifiedScoreboardMatch } from "@/services/live/football-score/canonicalLeagues";
import {
  fetchDirectScoreboardEvents,
  extractActiveLeagueSlugs,
} from "@/services/live/football-score/espnDirectClient";
import { buildScoresMap } from "@/services/live/football-score/matcher";

export interface UseLiveScoresRealtimeOptions {
  initialMatches: FootballMatch[];
  initialScores?: Record<string, LiveMatchScore> | null;
  isActive: boolean;
  isTheaterMode?: boolean;
}

/**
 * Manages live football match list polling (every 5m + tab-focus refresh),
 * live score polling (every 30s list / 60s theater when live, 5m idle + tab-focus refresh),
 * and the 60s kickoff wall-clock tick.
 */
export function useLiveScoresRealtime({
  initialMatches,
  initialScores,
  isActive,
  isTheaterMode = false,
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

    // Nếu đã có danh sách trận từ SSR, không cần fetch lại sau 5s; chỉ fetch nếu danh sách rỗng hoặc sau 5 phút
    const initialDelay = setTimeout(
      refreshMatches,
      initialMatches.length === 0 ? 3000 : 5 * 60 * 1000,
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
      // Khôi phục tức thì từ sessionStorage (0ms) để hiển thị ngay khi F5 reload mà không cần chờ mạng
      if (typeof window !== "undefined") {
        try {
          const saved = sessionStorage.getItem("nanaflix_live_scores_cache");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === "object") {
              Object.assign(initialMap, parsed);
            }
          }
        } catch {}
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
        // 1. Thử gọi trực tiếp ESPN CDN từ Client Browser (0ms CPU Vercel, bảo vệ 100% quota 4 giờ)
        const activeSlugs = extractActiveLeagueSlugs(liveMatches);
        if (activeSlugs.length > 0) {
          const directEvents = await fetchDirectScoreboardEvents(activeSlugs);
          if (directEvents.length > 0 && liveMatches.length > 0) {
            const directScores = buildScoresMap(liveMatches, directEvents);
            if (isEffectActive && Object.keys(directScores).length > 0) {
              lastFetchedScoresTimeRef.current = Date.now();
              setScoresMap((prev) => {
                const next = {
                  ...prev,
                  ...directScores,
                };
                if (typeof window !== "undefined") {
                  try {
                    sessionStorage.setItem("nanaflix_live_scores_cache", JSON.stringify(next));
                  } catch {}
                }
                return next;
              });
              return;
            }
          }
        }

        // 2. Fallback: Nếu mạng client chặn ESPN CDN thì mới gọi về Vercel API nội bộ
        const timeoutSignal = AbortSignal.timeout(5000);
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
          setScoresMap((prev) => {
            const next = {
              ...prev,
              ...json.data.scores,
            };
            if (typeof window !== "undefined") {
              try {
                sessionStorage.setItem("nanaflix_live_scores_cache", JSON.stringify(next));
              } catch {}
            }
            return next;
          });
        }
      } catch {
        // Giữ nguyên dữ liệu cũ nếu fetch thất bại hoặc bị hủy
      } finally {
        isScoresFetchingRef.current = false;
      }
    };

    // Khi có trận giải lớn đang Live:
    // - Bình thường ngoài danh sách: 30s.
    // - Khi đang mở Player xem trận đấu (isTheaterMode): giãn ra 90s vì trận đang xem đã được MatchCenter cập nhật riêng, tiết kiệm tối đa CPU Vercel.
    // Khi hôm nay có trận giải lớn nhưng CHƯA ĐÁ / ĐÃ XONG: polling 60s để nhận diện ngay khi bóng lăn.
    // Khi hôm nay HOÀN TOÀN KHÔNG CÓ trận giải lớn nào: TẮT HẲN polling (null).
    const livePollInterval = isTheaterMode ? 90_000 : 30_000;
    const pollIntervalMs = hasActiveScoreboardMatches
      ? livePollInterval
      : hasScoreboardMatchesToday
        ? 60_000
        : null;

    const isFirstMount = lastFetchedScoresTimeRef.current === 0;
    const isReturningFromInactive = !wasActiveScoresRef.current;
    wasActiveScoresRef.current = true;

    // Luôn fetch ngay khi component mount lần đầu HOẶC khi tab quay lại từ inactive (nếu hôm nay có trận giải lớn)
    if ((isFirstMount || isReturningFromInactive) && hasScoreboardMatchesToday) {
      fetchScores();
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
        const cooldown = hasActiveScoreboardMatches ? (isTheaterMode ? 30_000 : 10_000) : 300_000;
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
  }, [isActive, hasActiveScoreboardMatches, hasScoreboardMatchesToday, isTheaterMode]);

  return {
    liveMatches,
    scoresMap,
    now,
  };
}

