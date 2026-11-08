"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Tv, Trophy, RefreshCw } from "lucide-react";
import { LiveFootballData, LiveMatchScore, evaluateEventLifecycle } from "@/services/liveFootballService";
import { LiveTvData } from "@/services/liveTvService";
import { LiveFootballClient } from "./LiveFootballClient";
import { LiveTvClient } from "./LiveTvClient";
import { LiveTvSkeleton } from "./LiveTvSkeleton";

interface LiveHubClientProps {
  footballData: LiveFootballData;
  tvData?: LiveTvData | null;
  initialScores?: Record<string, LiveMatchScore> | null;
}

export function LiveHubClient({ footballData, tvData: initialTvData, initialScores }: LiveHubClientProps) {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialTab: "sports" | "tv" = initialTabParam === "tv" ? "tv" : "sports";
  const [activeTab, setActiveTab] = useState<"sports" | "tv">(initialTab);
  const [hasMountedSports, setHasMountedSports] = useState<boolean>(initialTab === "sports");
  const [hasMountedTv, setHasMountedTv] = useState<boolean>(initialTab === "tv");

  // Lazy-load state cho Live TV data
  const [tvData, setTvData] = useState<LiveTvData | null>(initialTvData || null);
  const [isTvLoading, setIsTvLoading] = useState<boolean>(false);
  const [tvError, setTvError] = useState<string | null>(null);
  const isTvFetchingRef = useRef(false);

  const loadTvChannels = useCallback(async () => {
    if (isTvFetchingRef.current) return;
    isTvFetchingRef.current = true;
    setIsTvLoading(true);
    setTvError(null);
    try {
      const res = await fetch("/api/live-tv/channels");
      if (!res.ok) {
        throw new Error(`Lỗi tải kênh (${res.status})`);
      }
      const json = await res.json();
      const payload: LiveTvData | null =
        json?.data && Array.isArray(json.data.channels)
          ? json.data
          : json && Array.isArray(json.channels)
            ? json
            : null;

      if (!payload) {
        throw new Error("Dữ liệu kênh truyền hình không hợp lệ");
      }
      setTvData(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tải danh sách kênh truyền hình";
      setTvError(message);
    } finally {
      setIsTvLoading(false);
      isTvFetchingRef.current = false;
    }
  }, []);

  // Nếu người dùng truy cập trực tiếp bằng URL có tab=tv, tự động tải TV channels
  useEffect(() => {
    if (initialTab === "tv" && (!tvData || !tvData.channels)) {
      loadTvChannels();
    }
  }, [initialTab, tvData, loadTvChannels]);

  const initialValidCount = useMemo(() => {
    const now = Date.now();
    return footballData.matches.filter((m) => {
      const liveScore = (initialScores && initialScores[m.id]) || m.score;
      const effectiveTs = liveScore?.kickoffTimestamp || m.timestamp;
      const hasStream = Boolean(
        Array.isArray(m.servers) &&
          m.servers.length > 0 &&
          m.servers.some((s) => s.url && s.url.trim().length > 0),
      );
      if (!hasStream) return false;

      const evalResult = evaluateEventLifecycle({
        timestamp: effectiveTs,
        score: liveScore,
        sourceStatus: m.sourceStatus,
        streamHealth: "unknown",
        now,
        sport: m.sport,
        isEvent: m.isEvent,
      });
      if (evalResult.displayTimeline === "finished") return false;
      if (evalResult.displayTimeline === "live") return true;
      if (evalResult.displayTimeline === "upcoming") {
        return evalResult.isLiveInWindow;
      }
      return false;
    }).length;
  }, [footballData.matches, initialScores]);

  const [sportsMatchesCount, setSportsMatchesCount] = useState<number>(initialValidCount);
  const [hasActiveMatch, setHasActiveMatch] = useState<boolean>(false);

  // Sync tab từ URL khi có external navigation (back/forward)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tv") {
      setHasMountedTv(true);
      if (activeTab !== "tv") setActiveTab("tv");
      if (!tvData || !tvData.channels) loadTvChannels();
    } else {
      setHasMountedSports(true);
      if (activeTab !== "sports") setActiveTab("sports");
    }
  }, [searchParams, activeTab, tvData, loadTvChannels]);

  const handleTabChange = useCallback(
    (tab: "sports" | "tv") => {
      try {
        const url = new URL(window.location.href);

        if (tab === "tv") {
          setHasMountedTv(true);
          setActiveTab("tv");
          if (!tvData || !tvData.channels) {
            loadTvChannels();
          }
          url.searchParams.set("tab", "tv");
          url.searchParams.delete("sport");
          url.searchParams.delete("match");
          url.searchParams.delete("tournament");
          const savedTvChannelId =
            typeof window !== "undefined"
              ? localStorage.getItem("nanaflix_live_channel_id")
              : null;
          if (savedTvChannelId) {
            url.searchParams.set("channel", savedTvChannelId);
          }
        } else {
          setHasMountedSports(true);
          setActiveTab("sports");
          url.searchParams.set("tab", "sports");
          url.searchParams.delete("channel");
        }

        window.history.replaceState(null, "", url.toString());
      } catch {}
    },
    [tvData, loadTvChannels],
  );

  const isSportsCinema = hasActiveMatch && activeTab === "sports";
  const isTvCinema = activeTab === "tv";

  const tvChannelCount = tvData?.channels?.length ?? null;
  const tvBadgeCount = tvChannelCount !== null ? tvChannelCount : isTvLoading ? "..." : "100+";

  return (
    <div
      className={`max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 transition-all duration-200 ${
        isTvCinema
          ? "pt-14 sm:pt-[64px] pb-4 space-y-2 sm:space-y-2.5"
          : isSportsCinema
            ? "pt-16 sm:pt-[72px] pb-3 sm:pb-4 space-y-2.5 sm:space-y-3"
            : "pt-16 sm:pt-20 pb-12 space-y-3 sm:space-y-4"
      }`}
    >
      {/* 1. NANAFLIX LIVE STUDIO COMMAND BAR (Cụm 2 nút Thể thao / Truyền hình tinh gọn) */}
      {!isSportsCinema || isTvCinema ? (
        <header className="flex items-center justify-start py-1.5 sm:py-2">
          {/* CỤM CHUYỂN ĐỔI TAB (THỂ THAO / TRUYỀN HÌNH) */}
          <div
            role="tablist"
            aria-label="Lựa chọn luồng trực tiếp"
            className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "sports"}
              onClick={() => handleTabChange("sports")}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition cursor-pointer outline-none shrink-0 whitespace-nowrap ${
                activeTab === "sports"
                  ? "bg-zinc-800 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Trophy
                className={`w-3.5 h-3.5 shrink-0 ${activeTab === "sports" ? "text-amber-400" : "text-zinc-400"}`}
                aria-hidden="true"
              />
              <span>Thể thao</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                  activeTab === "sports"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-black/40 text-zinc-400"
                }`}
              >
                {sportsMatchesCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "tv"}
              onClick={() => handleTabChange("tv")}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold transition cursor-pointer outline-none shrink-0 whitespace-nowrap ${
                activeTab === "tv"
                  ? "bg-zinc-800 text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Tv
                className={`w-3.5 h-3.5 shrink-0 ${activeTab === "tv" ? "text-sky-400" : "text-zinc-400"}`}
                aria-hidden="true"
              />
              <span>Truyền hình</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                  activeTab === "tv"
                    ? "bg-sky-500/20 text-sky-300"
                    : "bg-white/5 text-zinc-400"
                }`}
              >
                {tvBadgeCount}
              </span>
            </button>
          </div>
        </header>
      ) : null}

      {/* 2. NỘI DUNG THEO TAB - Trì hoãn mount tab chưa mở để triệt tiêu SSR payload & hydration dư thừa, giữ nguyên trong DOM sau khi mở */}
      {hasMountedSports && (
        <div className={activeTab === "sports" ? "block" : "hidden"}>
          <LiveFootballClient
            initialData={footballData}
            initialScores={initialScores}
            hideHeader
            isActive={activeTab === "sports"}
            onMatchesCountChange={setSportsMatchesCount}
            onMatchSelectedChange={setHasActiveMatch}
          />
        </div>
      )}
      {hasMountedTv && (
        <div className={activeTab === "tv" ? "block" : "hidden"}>
          {isTvLoading && (!tvData || !tvData.channels) ? (
            <LiveTvSkeleton />
          ) : tvError && (!tvData || !tvData.channels) ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8 text-center my-6">
              <p className="text-sm font-semibold text-red-400 mb-4">{tvError}</p>
              <button
                type="button"
                onClick={loadTvChannels}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-950/50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : tvData && Array.isArray(tvData.channels) ? (
            <LiveTvClient
              initialData={tvData}
              isActive={activeTab === "tv"}
            />
          ) : (
            <LiveTvSkeleton />
          )}
        </div>
      )}
    </div>
  );
}

export default LiveHubClient;
