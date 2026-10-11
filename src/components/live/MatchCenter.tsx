"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Activity,
  BarChart2,
  Clock,
  Users,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  UserCheck,
  ArrowUpDown,
  Shield,
} from "lucide-react";
import { NormalizedMatchSummary, MatchStatItem } from "@/services/live/football-score/types";
import {
  calculateMatchCenterPollInterval,
  shouldRefreshOnTabFocus,
  shouldSkipDuplicateRequest,
} from "@/services/live/football-score/matchCenterRealtime";

interface MatchCenterProps {
  leagueSlug?: string;
  eventId?: string;
  matchTitle: string;
  team1?: string;
  team2?: string;
  isLive?: boolean;
}

type TabType = "overview" | "stats" | "timeline" | "lineups" | "commentary";

export const MatchCenter: React.FC<MatchCenterProps> = ({
  leagueSlug,
  eventId,
  matchTitle,
  team1,
  team2,
  isLive,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [summary, setSummary] = useState<NormalizedMatchSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Thứ tự hiển thị bình luận: mặc định "newest" để luôn thấy thời gian hiện tại ở đầu
  const [commentaryOrder, setCommentaryOrder] = useState<"newest" | "oldest">("newest");
  const commentaryScrollRef = useRef<HTMLDivElement>(null);

  // Danh sách bình luận
  const displayedCommentary = useMemo(() => {
    if (!summary?.commentary) return [];
    const list = [...summary.commentary];
    if (commentaryOrder === "newest") {
      return list.reverse();
    }
    return list;
  }, [summary?.commentary, commentaryOrder]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const lastFetchedKeyRef = useRef<string>("");
  const lastFetchedTimeRef = useRef<number>(0);
  const summaryRef = useRef<NormalizedMatchSummary | null>(null);

  summaryRef.current = summary;

  const fetchSummary = async (force: boolean = false, isBackground: boolean = false) => {
    if (!leagueSlug || !eventId) {
      setSummary(null);
      return;
    }

    const currentKey = `${leagueSlug}:${eventId}`;

    if (
      shouldSkipDuplicateRequest({
        currentKey,
        lastFetchedKey: lastFetchedKeyRef.current,
        lastFetchedTime: lastFetchedTimeRef.current,
        inFlight: inFlightRef.current,
        force,
      })
    ) {
      return;
    }

    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    inFlightRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = `/api/live-football/summary?league=${encodeURIComponent(leagueSlug)}&event=${encodeURIComponent(eventId)}`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Chưa có dữ liệu chi tiết cho trận đấu này.");
        }
        throw new Error("Không thể tải thông tin trận đấu lúc này.");
      }

      const json = await res.json();
      if (!json.status || !json.data) {
        throw new Error(json.error || "Dữ liệu trận đấu không khả dụng.");
      }

      setSummary(json.data);
      lastFetchedKeyRef.current = currentKey;
      lastFetchedTimeRef.current = Date.now();
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (!summaryRef.current) {
        setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const currentKey = leagueSlug && eventId ? `${leagueSlug}:${eventId}` : "";

    if (currentKey !== lastFetchedKeyRef.current) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setSummary(null);
      setError(null);
      lastFetchedKeyRef.current = "";
      lastFetchedTimeRef.current = 0;
    }

    if (isOpen && leagueSlug && eventId) {
      fetchSummary(true, false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leagueSlug, eventId]);

  useEffect(() => {
    if (!isOpen || !leagueSlug || !eventId) {
      return;
    }

    const pollInterval = calculateMatchCenterPollInterval(summary?.status, isLive);

    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      fetchSummary(true, true);
    }, pollInterval);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (shouldRefreshOnTabFocus(lastFetchedTimeRef.current, pollInterval)) {
          fetchSummary(true, true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leagueSlug, eventId, summary?.status, isLive]);

  useEffect(() => {
    if (activeTab === "commentary" && commentaryScrollRef.current) {
      if (commentaryOrder === "newest") {
        commentaryScrollRef.current.scrollTop = 0;
      } else {
        commentaryScrollRef.current.scrollTop = commentaryScrollRef.current.scrollHeight;
      }
    }
  }, [activeTab, commentaryOrder]);

  const displayTitle = useMemo(() => {
    if (team1 && team2) return `${team1} vs ${team2}`;
    return matchTitle;
  }, [team1, team2, matchTitle]);

  // Helper tính phần trăm cho thanh so sánh thống kê Sofascore
  const calculateStatPercentage = (homeVal: string | number, awayVal: string | number) => {
    const h = parseFloat(String(homeVal).replace("%", "")) || 0;
    const a = parseFloat(String(awayVal).replace("%", "")) || 0;
    const total = h + a;
    if (total === 0) return { homePct: 50, awayPct: 50 };
    return {
      homePct: Math.round((h / total) * 100),
      awayPct: Math.round((a / total) * 100),
    };
  };

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-zinc-950/90 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* 1. HEADER MATCH CENTER */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 sm:p-5 cursor-pointer hover:bg-white/[0.03] transition-colors select-none border-b border-white/5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-2xl bg-netflix-red/15 text-netflix-red border border-netflix-red/30 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {displayTitle}
              </h3>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 animate-pulse shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>Trực Tiếp</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              Diễn biến thời gian thực, đội hình, bình luận và thống kê chuyên sâu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fetchSummary(true, false);
              }}
              disabled={loading || isRefreshing}
              title="Làm mới dữ liệu"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading || isRefreshing ? "animate-spin text-netflix-red" : ""
                }`}
              />
            </button>
          )}

          <div className="p-2 rounded-xl bg-white/5 text-gray-400 border border-white/10">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* 2. NỘI DUNG MATCH CENTER */}
      {isOpen && (
        <div className="p-3.5 sm:p-6 space-y-4">
          {/* A. SCOREBOARD CARD LỚN (SOFASCORE ARENA HERO) */}
          {summary && (
            <div className="rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-white/10 p-4 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                {/* ĐỘI NHÀ */}
                <div className="flex-1 flex flex-col items-center sm:items-end text-center sm:text-right min-w-0">
                  {summary.homeTeam.logo ? (
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-2 shrink-0 drop-shadow-md">
                      <Image
                        src={summary.homeTeam.logo}
                        alt={summary.homeTeam.name}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mb-2 rounded-2xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center font-black text-rose-300 text-lg shadow-inner">
                      {summary.homeTeam.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate w-full">
                    {summary.homeTeam.displayName}
                  </h4>
                  {summary.homeRoster.formation && (
                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                      Sơ đồ: {summary.homeRoster.formation}
                    </span>
                  )}
                </div>

                {/* TỶ SỐ TRUNG TÂM & ĐỒNG HỒ */}
                <div className="flex flex-col items-center px-2 sm:px-6 py-1 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-4 font-mono text-3xl sm:text-5xl font-black text-white tracking-wider">
                    <span>{summary.homeTeam.score ?? "-"}</span>
                    <span className="text-gray-500 text-2xl sm:text-3xl font-light">:</span>
                    <span>{summary.awayTeam.score ?? "-"}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${
                        summary.status === "live"
                          ? "bg-red-600/20 text-red-400 border-red-500/40 animate-pulse"
                          : summary.status === "finished"
                            ? "bg-zinc-800 text-gray-300 border-white/10"
                            : "bg-sky-500/20 text-sky-400 border-sky-500/30"
                      }`}
                    >
                      {summary.displayClock || summary.statusText}
                    </span>
                  </div>
                </div>

                {/* ĐỘI KHÁCH */}
                <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
                  {summary.awayTeam.logo ? (
                    <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-2 shrink-0 drop-shadow-md">
                      <Image
                        src={summary.awayTeam.logo}
                        alt={summary.awayTeam.name}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mb-2 rounded-2xl bg-sky-950/60 border border-sky-500/30 flex items-center justify-center font-black text-sky-300 text-lg shadow-inner">
                      {summary.awayTeam.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate w-full">
                    {summary.awayTeam.displayName}
                  </h4>
                  {summary.awayRoster.formation && (
                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                      Sơ đồ: {summary.awayRoster.formation}
                    </span>
                  )}
                </div>
              </div>

              {/* Thông tin sân & trọng tài */}
              {summary.gameInfo && (
                <div className="w-full mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
                  {summary.gameInfo.venue?.name && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-netflix-red shrink-0" />
                      <span>{summary.gameInfo.venue.name}</span>
                    </div>
                  )}
                  {summary.gameInfo.referee && (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Trọng tài: {summary.gameInfo.referee}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* B. THANH ĐIỀU HƯỚNG TAB CHỨC NĂNG */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-white/10">
            {[
              { id: "overview", label: "Tổng quan", icon: Clock },
              { id: "stats", label: "Thống kê", icon: BarChart2 },
              { id: "timeline", label: "Diễn biến", icon: Activity },
              { id: "lineups", label: "Đội hình", icon: Users },
              { id: "commentary", label: "Bình luận", icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-md shadow-red-950/60 scale-[1.02]"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* C. LOADING SKELETON */}
          {loading && !summary && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <RefreshCw className="w-7 h-7 animate-spin text-netflix-red" />
              <p className="text-xs sm:text-sm font-semibold">Đang kết nối trung tâm dữ liệu trận đấu...</p>
            </div>
          )}

          {/* D. ERROR STATE */}
          {error && !summary && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-red-950/20 rounded-2xl border border-red-500/20 p-6">
              <AlertCircle className="w-7 h-7 text-red-400" />
              <p className="text-xs sm:text-sm text-red-300 max-w-md font-medium">{error}</p>
              <button
                type="button"
                onClick={() => fetchSummary(true)}
                className="px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* E. EMPTY STATE */}
          {!loading && !error && !summary && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-400 rounded-2xl bg-zinc-900/30 border border-white/5 p-6">
              <Activity className="w-8 h-8 text-gray-500 mb-1" />
              <p className="text-sm font-bold text-gray-300">Chưa có thông tin chi tiết cho trận đấu này</p>
              <p className="text-xs text-gray-500">Dữ liệu từ ban tổ chức sẽ tự động cập nhật khi trận đấu diễn ra.</p>
            </div>
          )}

          {/* F. NỘI DUNG TỪNG TAB */}
          {summary && (
            <div className="space-y-4">
              {/* TAB 1: TỔNG QUAN (OVERVIEW) */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Cột trái: Thống kê nổi bật */}
                  <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 space-y-3">
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-netflix-red" />
                      <span>Chỉ số trận đấu</span>
                    </h5>
                    {summary.stats.length > 0 ? (
                      <div className="space-y-3">
                        {summary.stats.slice(0, 6).map((stat) => {
                          const { homePct, awayPct } = calculateStatPercentage(
                            stat.homeValue,
                            stat.awayValue,
                          );
                          return (
                            <div key={stat.name} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-white">{stat.homeValue}</span>
                                <span className="text-gray-400 text-[11px] font-semibold">{stat.label}</span>
                                <span className="font-extrabold text-white">{stat.awayValue}</span>
                              </div>
                              <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5 gap-1">
                                <div
                                  className="bg-netflix-red rounded-l-full transition-all duration-500"
                                  style={{ width: `${homePct}%` }}
                                />
                                <div
                                  className="bg-white/40 rounded-r-full transition-all duration-500"
                                  style={{ width: `${awayPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 py-4 text-center">Chưa có số liệu thống kê trận đấu</p>
                    )}
                  </div>

                  {/* Cột phải: Diễn biến quan trọng */}
                  <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 space-y-3">
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sự kiện then chốt</span>
                    </h5>
                    {summary.events.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {summary.events.map((ev, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-3 p-2 rounded-xl text-xs border ${
                              ev.homeAway === "home"
                                ? "bg-red-500/5 border-red-500/20"
                                : ev.homeAway === "away"
                                  ? "bg-sky-500/5 border-sky-500/20"
                                  : "bg-white/[0.02] border-white/10"
                            }`}
                          >
                            <span className="font-mono font-black text-amber-400 min-w-[28px] text-center">
                              {ev.clock}&apos;
                            </span>
                            <span className="text-sm">
                              {ev.type === "goal"
                                ? "⚽"
                                : ev.type === "yellow-card"
                                  ? "🟨"
                                  : ev.type === "red-card"
                                    ? "🟥"
                                    : ev.type === "substitution"
                                      ? "🔄"
                                      : "⚡"}
                            </span>
                            <div className="min-w-0 flex-1 truncate">
                              <span className="font-bold text-white">
                                {ev.playerName ||
                                  (ev.subInPlayer ? `Vào: ${ev.subInPlayer}` : ev.text)}
                              </span>
                              {ev.subOutPlayer && (
                                <span className="text-[10px] text-gray-400 ml-1.5">
                                  (Ra: {ev.subOutPlayer})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 py-4 text-center">Chưa có sự kiện nổi bật nào</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: THỐNG KÊ CHI TIẾT (STATS - SOFASCORE BARS) */}
              {activeTab === "stats" && (
                <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                    <span className="font-extrabold text-netflix-red">{summary.homeTeam.displayName}</span>
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">Chỉ số so sánh</span>
                    <span className="font-extrabold text-white">{summary.awayTeam.displayName}</span>
                  </div>

                  {summary.stats.length > 0 ? (
                    <div className="space-y-4">
                      {summary.stats.map((stat: MatchStatItem) => {
                        const { homePct, awayPct } = calculateStatPercentage(
                          stat.homeValue,
                          stat.awayValue,
                        );
                        return (
                          <div key={stat.name} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs sm:text-sm">
                              <span className="font-mono font-black text-white">{stat.homeValue}</span>
                              <span className="text-gray-400 text-xs font-semibold">{stat.label}</span>
                              <span className="font-mono font-black text-white">{stat.awayValue}</span>
                            </div>
                            <div className="flex h-2 rounded-full overflow-hidden bg-white/5 gap-1 shadow-inner">
                              <div
                                className="bg-gradient-to-r from-red-600 to-netflix-red rounded-l-full transition-all duration-500"
                                style={{ width: `${homePct}%` }}
                              />
                              <div
                                className="bg-gradient-to-r from-zinc-400 to-white rounded-r-full transition-all duration-500"
                                style={{ width: `${awayPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 py-8 text-center">Chưa có số liệu thống kê trận đấu</p>
                  )}
                </div>
              )}

              {/* TAB 3: DIỄN BIẾN (TIMELINE) */}
              {activeTab === "timeline" && (
                <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 sm:p-6 space-y-3">
                  <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">
                    Dòng thời gian sự kiện trận đấu
                  </h5>

                  {summary.events.length > 0 ? (
                    <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-2">
                      {summary.events.map((ev, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                            ev.homeAway === "home"
                              ? "bg-red-950/20 border-red-500/30 text-left"
                              : ev.homeAway === "away"
                                ? "bg-sky-950/20 border-sky-500/30 text-left"
                                : "bg-white/[0.02] border-white/10"
                          }`}
                        >
                          <span className="font-mono text-xs sm:text-sm font-black text-amber-400 min-w-[32px] text-center shrink-0">
                            {ev.clock}&apos;
                          </span>
                          <span className="text-base sm:text-lg shrink-0">
                            {ev.type === "goal"
                              ? "⚽"
                              : ev.type === "yellow-card"
                                ? "🟨"
                                : ev.type === "red-card"
                                  ? "🟥"
                                  : ev.type === "substitution"
                                    ? "🔄"
                                    : "⚡"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                              {ev.playerName ||
                                (ev.subInPlayer ? `Vào: ${ev.subInPlayer}` : ev.text)}
                            </p>
                            {ev.subOutPlayer && (
                              <p className="text-[11px] text-gray-400">Ra: {ev.subOutPlayer}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 py-8 text-center">Chưa có sự kiện nào trong trận</p>
                  )}
                </div>
              )}

              {/* TAB 4: ĐỘI HÌNH (LINEUPS) */}
              {activeTab === "lineups" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Đội hình Đội nhà */}
                  <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-netflix-red" />
                        <h5 className="text-xs sm:text-sm font-black text-white">
                          {summary.homeTeam.displayName}
                        </h5>
                      </div>
                      {summary.homeRoster.formation && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                          {summary.homeRoster.formation}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Ra sân chính thức</p>
                      {summary.homeRoster.starters.length > 0 ? (
                        summary.homeRoster.starters.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white/[0.02] text-xs">
                            <span className="font-mono text-gray-400 min-w-[20px] font-bold">{p.jersey || (i + 1)}</span>
                            <span className="text-white font-semibold flex-1 truncate">{p.name}</span>
                            {p.position && <span className="text-[10px] text-gray-500 uppercase">{p.position}</span>}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 py-2">Đang cập nhật danh sách ra sân</p>
                      )}
                    </div>
                  </div>

                  {/* Đội hình Đội khách */}
                  <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-sky-400" />
                        <h5 className="text-xs sm:text-sm font-black text-white">
                          {summary.awayTeam.displayName}
                        </h5>
                      </div>
                      {summary.awayRoster.formation && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                          {summary.awayRoster.formation}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Ra sân chính thức</p>
                      {summary.awayRoster.starters.length > 0 ? (
                        summary.awayRoster.starters.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white/[0.02] text-xs">
                            <span className="font-mono text-gray-400 min-w-[20px] font-bold">{p.jersey || (i + 1)}</span>
                            <span className="text-white font-semibold flex-1 truncate">{p.name}</span>
                            {p.position && <span className="text-[10px] text-gray-500 uppercase">{p.position}</span>}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 py-2">Đang cập nhật danh sách ra sân</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BÌNH LUẬN TRỰC TIẾP (COMMENTARY) */}
              {activeTab === "commentary" && (
                <div className="rounded-2xl bg-zinc-900/50 border border-white/10 p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-netflix-red" />
                      <span>Diễn biến trực tiếp từ sân cỏ</span>
                    </h5>

                    <button
                      type="button"
                      onClick={() => setCommentaryOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>{commentaryOrder === "newest" ? "Mới nhất trước" : "Cũ nhất trước"}</span>
                    </button>
                  </div>

                  {displayedCommentary.length > 0 ? (
                    <div
                      ref={commentaryScrollRef}
                      className="space-y-2 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin"
                    >
                      {displayedCommentary.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition text-xs"
                        >
                          <span className="font-mono text-amber-400 font-extrabold shrink-0 min-w-[32px] pt-0.5">
                            {c.time ? `${c.time}'` : "•"}
                          </span>
                          <p className="text-gray-200 leading-relaxed flex-1">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 py-8 text-center">Chưa có dòng bình luận trực tiếp nào</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchCenter;
