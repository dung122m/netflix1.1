"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity,
  BarChart2,
  Users,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Radio,
  Trophy,
  Mic,
  Tv,
  Zap,
  Clock,
} from "lucide-react";
import { NormalizedMatchSummary, MatchStatItem, LiveMatchScore } from "@/services/live/football-score/types";
import {
  calculateMatchCenterPollInterval,
  shouldRefreshOnTabFocus,
  shouldSkipDuplicateRequest,
  mergeNormalizedSummaries,
} from "@/services/live/football-score/matchCenterRealtime";
import {
  resolveCanonicalTournament,
  resolveTournamentLogo,
} from "@/services/live/football-score/canonicalLeagues";
import { getTeamAsset, getTeamInitials, resolveEsportsTeam } from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";
import { TacticalLineup } from "./TacticalLineup";
import { DualTeamPitch } from "./DualTeamPitch";
import { CountryFlag } from "./CountryFlag";
import { Tooltip } from "@/components/ui/Tooltip";


export interface MatchCenterScoreProp {
  homeScore?: number;
  awayScore?: number;
  team1Score?: number;
  team2Score?: number;
  status?: string;
  displayClock?: string;
  statusDetail?: string;
}

interface MatchCenterProps {
  leagueSlug?: string;
  eventId?: string;
  matchTitle: string;
  title?: string;
  hideScoreboard?: boolean;
  team1?: string;
  team2?: string;
  tournament?: string;
  sport?: string;
  team1Logo?: string;
  team2Logo?: string;
  isLive?: boolean;
  time?: string;
  blv?: string;
  group?: string;
  serversCount?: number;
  quality?: string;
  onSummaryChange?: (summary: NormalizedMatchSummary | null) => void;
  onLoadingChange?: (loading: boolean) => void;
  initialScore?: MatchCenterScoreProp | null;
}

type TabType = "lineups" | "stats";

export const MatchCenter: React.FC<MatchCenterProps> = ({
  leagueSlug,
  eventId,
  matchTitle,
  title,
  hideScoreboard = false,
  team1,
  team2,
  tournament,
  sport,
  team1Logo,
  team2Logo,
  isLive,
  time,
  blv,
  group,
  serversCount,
  quality,
  onSummaryChange,
  onLoadingChange,
  initialScore,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("lineups");
  const [summary, setSummary] = useState<NormalizedMatchSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [homeImgFailed, setHomeImgFailed] = useState(false);
  const [awayImgFailed, setAwayImgFailed] = useState(false);

  useEffect(() => {
    setHomeImgFailed(false);
    setAwayImgFailed(false);
  }, [team1, team2, team1Logo, team2Logo]);

  useEffect(() => {
    onSummaryChange?.(summary);
  }, [summary, onSummaryChange]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  

  const abortControllerRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const lastFetchedKeyRef = useRef<string>("");
  const lastFetchedTimeRef = useRef<number>(0);
  const summaryRef = useRef<NormalizedMatchSummary | null>(null);

  summaryRef.current = summary;

  const fetchSummary = async (force: boolean = false, isBackground: boolean = false) => {
    if (!leagueSlug || !eventId) {
      setSummary(null);
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    const currentKey = `${leagueSlug}:${eventId}`;

    if (inFlightRef.current) {
      // Đang có một request chạy dở -> để request đó hoàn tất suôn sẻ, không hủy ngang làm mất kết quả
      return;
    }

    if (
      shouldSkipDuplicateRequest({
        currentKey,
        lastFetchedKey: lastFetchedKeyRef.current,
        lastFetchedTime: lastFetchedTimeRef.current,
        inFlight: inFlightRef.current,
        force,
      })
    ) {
      setLoading(false);
      onLoadingChange?.(false);
      return;
    }

    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }

    inFlightRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Giữ URL sạch để Cloudflare Edge Cache (4s) có thể phục vụ hàng ngàn người xem siêu tốc (<10ms)
      // mà không làm tăng hạn mức Redis hay gây tải cho Server
      const url = `/api/live-football/summary?league=${encodeURIComponent(leagueSlug)}&event=${encodeURIComponent(eventId)}`;
      const timeoutSignal = AbortSignal.timeout(4500);
      const signal = typeof AbortSignal.any === "function"
        ? AbortSignal.any([controller.signal, timeoutSignal])
        : controller.signal;

      const res = await fetch(url, {
        signal,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        if (res.status === 404) {
          // Trận đấu chưa có dữ liệu chi tiết API -> chỉ xóa summary nếu trước đó chưa có dữ liệu
          if (!summaryRef.current) {
            setSummary(null);
            setError(null);
          }
          return;
        }
        throw new Error("Không thể tải thông tin trận đấu lúc này.");
      }

      const json = await res.json();
      if (!json.status || !json.data) {
        throw new Error(json.error || "Dữ liệu trận đấu không khả dụng.");
      }

      setSummary((prev) => {
        if (!prev || prev.eventId !== json.data.eventId) {
          return json.data;
        }
        return mergeNormalizedSummaries(prev, json.data);
      });
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
    if (!leagueSlug || !eventId) {
      return;
    }
    const currentKey = `${leagueSlug}:${eventId}`;

    if (lastFetchedKeyRef.current && lastFetchedKeyRef.current !== currentKey) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setSummary(null);
      setError(null);
      lastFetchedTimeRef.current = 0;
    }
    lastFetchedKeyRef.current = currentKey;

    if (isOpen) {
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

  const homeDisplayName = summary?.homeTeam?.displayName || summary?.homeTeam?.name || team1 || "";
  const awayDisplayName = summary?.awayTeam?.displayName || summary?.awayTeam?.name || team2 || "";

  const espHome = useMemo(() => resolveEsportsTeam(homeDisplayName), [homeDisplayName]);
  const espAway = useMemo(() => resolveEsportsTeam(awayDisplayName), [awayDisplayName]);

  const homeAsset = useMemo(() => getTeamAsset(homeDisplayName), [homeDisplayName]);
  const awayAsset = useMemo(() => getTeamAsset(awayDisplayName), [awayDisplayName]);

  const homeLogoSrc = useMemo(() => {
    if (homeImgFailed) return null;
    const raw = espHome?.logo || summary?.homeTeam?.logo || team1Logo || homeAsset?.logo;
    return raw ? toDarkModeLogoUrl(raw) : null;
  }, [espHome, summary?.homeTeam?.logo, team1Logo, homeAsset, homeImgFailed]);

  const awayLogoSrc = useMemo(() => {
    if (awayImgFailed) return null;
    const raw = espAway?.logo || summary?.awayTeam?.logo || team2Logo || awayAsset?.logo;
    return raw ? toDarkModeLogoUrl(raw) : null;
  }, [espAway, summary?.awayTeam?.logo, team2Logo, awayAsset, awayImgFailed]);

  const displayTitle = useMemo(() => {
    if (title) return title;
    if (team1 && team2) return `${team1} vs ${team2}`;
    return matchTitle;
  }, [title, team1, team2, matchTitle]);

  const canonicalLeague = useMemo(() => {
    const slug = summary?.leagueSlug || leagueSlug;
    return resolveCanonicalTournament({
      score: slug ? ({ leagueSlug: slug } as unknown as LiveMatchScore) : null,
      tournament: tournament,
      title: matchTitle,
      team1,
      team2,
    });
  }, [leagueSlug, summary?.leagueSlug, tournament, matchTitle, team1, team2]);

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

  const effectiveHomeScore =
    summary?.homeTeam?.score !== undefined
      ? summary.homeTeam.score
      : (initialScore?.homeScore ?? initialScore?.team1Score);

  const effectiveAwayScore =
    summary?.awayTeam?.score !== undefined
      ? summary.awayTeam.score
      : (initialScore?.awayScore ?? initialScore?.team2Score);

  const hasValidScore =
    effectiveHomeScore !== undefined &&
    effectiveAwayScore !== undefined &&
    effectiveHomeScore !== null &&
    effectiveAwayScore !== null &&
    !isNaN(Number(effectiveHomeScore)) &&
    !isNaN(Number(effectiveAwayScore));

  const effectiveStatus =
    summary?.status ||
    initialScore?.status ||
    (isLive ? "live" : "scheduled");

  const effectiveClock =
    summary?.displayClock ||
    initialScore?.displayClock ||
    (isLive ? (time || "Đang đá") : (time || ""));

  const miniScoreboardMarkup = (
    <div className="rounded-xl bg-white/[0.04] p-3 sm:p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
        {/* Đội nhà: Tên (căn phải) + Logo */}
        <div className="flex items-center justify-end gap-2 sm:gap-3.5 min-w-0">
          <div className="flex flex-col items-end min-w-0 text-right">
            <h4
              className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight truncate w-full"
              title={homeDisplayName}
            >
              {homeDisplayName}
            </h4>
          </div>

          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-800/90 p-1.5 flex items-center justify-center shadow-md relative overflow-hidden shrink-0">
            {!espHome && homeAsset?.isCountry && homeAsset?.emoji ? (
              <CountryFlag emoji={homeAsset.emoji} className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
            ) : homeLogoSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={homeLogoSrc}
                alt={homeDisplayName}
                className="w-full h-full object-contain filter drop-shadow relative z-10"
                onError={() => setHomeImgFailed(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-rose-500/10 rounded-lg">
                <span className="text-xs sm:text-sm font-black text-rose-400">
                  {getTeamInitials(homeDisplayName)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cụm Tỷ số / VS trung tâm */}
        <div className="flex flex-col items-center px-2 sm:px-4 shrink-0">
          {hasValidScore ? (
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl bg-black/60 shadow-inner">
              <span className="text-xl sm:text-2xl md:text-3xl font-sans font-black tabular-nums text-white tracking-wider">
                {effectiveHomeScore}
              </span>
              <span className="text-sm sm:text-base font-bold text-zinc-500 select-none">-</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-sans font-black tabular-nums text-white tracking-wider">
                {effectiveAwayScore}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-zinc-900/90 shadow-sm">
              <span className="text-xs sm:text-sm font-black text-zinc-300 select-none">
                VS
              </span>
            </div>
          )}

          {/* Badge trạng thái / thời gian */}
          <span
            className={`mt-1.5 inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full tracking-wide whitespace-nowrap ${
              isLive || effectiveStatus === "live"
                ? "bg-red-950/60 text-red-400 shadow-sm"
                : effectiveStatus === "finished"
                  ? "bg-zinc-900 text-zinc-300"
                  : "bg-zinc-900 text-sky-400"
            }`}
          >
            {(isLive || effectiveStatus === "live") && (
              <span className="relative flex h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            )}
            <span>
              {isLive || effectiveStatus === "live" ? (
                effectiveClock || "Trực tiếp"
              ) : effectiveStatus === "finished" ? (
                "Hết giờ"
              ) : time && time !== "Trực tiếp" ? (
                <span className="inline-flex items-center gap-1 font-sans tabular-nums">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>{time}</span>
                </span>
              ) : (
                "Sắp diễn ra"
              )}
            </span>
          </span>
        </div>

        {/* Đội khách: Logo + Tên (căn trái) */}
        <div className="flex items-center justify-start gap-2 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-800/90 p-1.5 flex items-center justify-center shadow-md relative overflow-hidden shrink-0">
            {!espAway && awayAsset?.isCountry && awayAsset?.emoji ? (
              <CountryFlag emoji={awayAsset.emoji} className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
            ) : awayLogoSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={awayLogoSrc}
                alt={awayDisplayName}
                className="w-full h-full object-contain filter drop-shadow relative z-10"
                onError={() => setAwayImgFailed(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-sky-500/10 rounded-lg">
                <span className="text-xs sm:text-sm font-black text-sky-400">
                  {getTeamInitials(awayDisplayName)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start min-w-0 text-left">
            <h4
              className="text-xs sm:text-sm md:text-base font-black text-white tracking-tight truncate w-full"
              title={awayDisplayName}
            >
              {awayDisplayName}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );

  // CHỈ HIỂN THỊ TRUNG TÂM TRẬN ĐẤU KHI CÓ DỮ LIỆU THỰC TẾ (SUMMARY)
  if (!summary) {
    return null;
  }

  return (
    <div className="w-full rounded-2xl bg-zinc-900/50 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden">
      {/* 1. HEADER MATCH CENTER (COMPACT & RESPONSIVE) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer hover:bg-white/[0.03] transition-colors select-none gap-2"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 rounded-xl bg-netflix-red/15 text-netflix-red shrink-0">
            {summary ? <Activity className="w-4 h-4" /> : <Radio className="w-4 h-4 text-netflix-red" />}
          </div>
          <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-black text-white tracking-tight truncate max-w-[170px] min-[400px]:max-w-[240px] sm:max-w-none leading-snug">
              {displayTitle}
            </h3>
            {canonicalLeague && canonicalLeague !== "Giải Đấu Khác" && (
              <span className="px-1.5 py-0.5 rounded-md text-[9.5px] sm:text-[10px] font-bold bg-white/10 text-zinc-300 shrink-0 flex items-center gap-1.5">
                {resolveTournamentLogo(canonicalLeague, sport) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={toDarkModeLogoUrl(resolveTournamentLogo(canonicalLeague, sport))}
                    alt=""
                    className="w-3.5 h-3.5 object-contain shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate max-w-[110px] sm:max-w-none">{canonicalLeague}</span>
              </span>
            )}
            {(isLive || effectiveStatus === "live") && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600/20 text-red-400 animate-pulse shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Trực tiếp</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isOpen && (
            <Tooltip content="Làm mới dữ liệu" side="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchSummary(true, false);
                }}
                disabled={loading || isRefreshing}
                aria-label="Làm mới dữ liệu trận đấu"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loading || isRefreshing ? "animate-spin text-netflix-red" : ""
                  }`}
                />
              </button>
            </Tooltip>
          )}

          <div className="p-1.5 rounded-lg bg-white/5 text-zinc-400">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* 2. NỘI DUNG MATCH CENTER */}
      {isOpen && (
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-3.5">
          {/* C. LOADING SKELETON */}
          {loading && !summary && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw className="w-7 h-7 animate-spin text-netflix-red" />
              <p className="text-xs sm:text-sm font-semibold">Đang tải dữ liệu...</p>
            </div>
          )}

          {/* D. ERROR STATE */}
          {error && !summary && (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3 bg-red-950/20 rounded-2xl p-6">
              <AlertCircle className="w-7 h-7 text-red-400" />
              <p className="text-xs sm:text-sm text-red-300 max-w-md font-medium">{error}</p>
              <button
                type="button"
                onClick={() => fetchSummary(true)}
                className="px-4 py-2 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs font-bold transition shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {/* E. BẢNG ĐIỂM VÀ NỘI DUNG TRẬN ĐẤU */}
          {!loading && !error && (
            <>
              {/* BẢNG ĐIỂM MINI THỐNG NHẤT (Ẩn khi đã có bảng điểm trên player) */}
              {!hideScoreboard && miniScoreboardMarkup}

              {/* KHI CHƯA/KHÔNG CÓ DỮ LIỆU SUMMARY: HIỂN THỊ THÔNG TIN LUỒNG TIẾP SÓNG */}
              {!summary && (
                <div className="space-y-3 pt-1">
                  {/* Lưới thông tin luồng phát & Trận đấu */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Giải đấu */}
                    <div className="rounded-xl bg-white/[0.03] p-2.5 sm:p-3 flex flex-col gap-1 min-w-0">
                      <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                        <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Giải đấu</span>
                      </span>
                      <span className="font-bold text-white text-[11px] sm:text-xs line-clamp-2 break-words leading-tight">
                        {canonicalLeague || tournament || "Giải Đấu Khác"}
                      </span>
                    </div>

                    {/* Bình luận viên */}
                    <div className="rounded-xl bg-white/[0.03] p-2.5 sm:p-3 flex flex-col gap-1 min-w-0">
                      <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                        <Mic className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>Bình luận</span>
                      </span>
                      <span className="font-bold text-white text-[11px] sm:text-xs line-clamp-2 break-words leading-tight">
                        {blv || "BLV Tiếng Việt"}
                      </span>
                    </div>

                    {/* Kênh phát */}
                    <div className="rounded-xl bg-white/[0.03] p-2.5 sm:p-3 flex flex-col gap-1 min-w-0">
                      <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                        <Tv className="w-3 h-3 text-sky-400 shrink-0" />
                        <span>Kênh tiếp sóng</span>
                      </span>
                      <span className="font-bold text-white text-[11px] sm:text-xs line-clamp-2 break-words leading-tight">
                        {group || "Kênh Thể Thao"}
                      </span>
                    </div>

                    {/* Tín hiệu & Luồng */}
                    <div className="rounded-xl bg-white/[0.03] p-2.5 sm:p-3 flex flex-col gap-1 min-w-0">
                      <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Chất lượng</span>
                      </span>
                      <span className="font-bold text-emerald-400 text-[11px] sm:text-xs line-clamp-2 break-words leading-tight tabular-nums">
                        {quality || "HD Sắc Nét"} {serversCount ? `(${serversCount} nguồn)` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Thông báo tiếp sóng */}
                  <div className="rounded-xl bg-zinc-900/60 px-3 py-2.5 sm:p-3 flex items-center gap-2.5 text-xs text-zinc-400">
                    <div className="p-1.5 rounded-lg bg-white/5 text-zinc-300 shrink-0">
                      <Radio className="w-3.5 h-3.5 text-netflix-red animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1 text-[11px] sm:text-xs leading-relaxed text-zinc-300">
                      <span className="font-bold text-white">Đang tiếp sóng</span>
                      <span className="text-zinc-400 ml-1.5 hidden sm:inline">•</span>
                      <span className="text-zinc-400 block sm:inline mt-0.5 sm:mt-0 sm:ml-1.5">
                        Chưa có dữ liệu thống kê từ ban tổ chức.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* F. KHI CÓ DỮ LIỆU SUMMARY: HIỂN THỊ THANH 5 TAB CUỘN NGANG VÀ CHI TIẾT */}
              {summary && (
                <div className="space-y-3.5 pt-1">
                  {/* B. THANH ĐIỀU HƯỚNG TAB CHỨC NĂNG (SCROLLABLE PILLS) */}
                  <div
                    role="tablist"
                    aria-label="Điều hướng thông tin trận đấu"
                    className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 select-none -mx-1 px-1 sm:mx-0 sm:px-0"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    {[
                      { id: "lineups", label: "Đội hình", icon: Users },
                      { id: "stats", label: "Thống kê", icon: BarChart2 },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          role="tab"
                          id={`tab-${tab.id}`}
                          aria-selected={isActive}
                          aria-controls={`panel-${tab.id}`}
                          tabIndex={0}
                          type="button"
                          onClick={() => setActiveTab(tab.id as TabType)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer outline-none focus-visible:bg-white/10 min-h-[40px] sm:min-h-[44px] ${
                            isActive
                              ? "bg-gradient-to-r from-netflix-red to-netflix-red/85 text-white shadow-md shadow-black/50 font-black scale-[1.02]"
                              : "text-zinc-400 hover:text-white hover:bg-white/5 bg-zinc-900/70"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="whitespace-nowrap">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-4">
              {/* TAB 1: ĐỘI HÌNH & SA BÀN 2 ĐỘI TOÀN CẢNH (LINEUPS - TỈ LỆ VÀNG 3 CỘT) */}
              {activeTab === "lineups" && (
                <div className="space-y-3">
                  {summary.homeRoster?.starters &&
                  summary.homeRoster.starters.length > 0 &&
                  summary.awayRoster?.starters &&
                  summary.awayRoster.starters.length > 0 ? (
                    <DualTeamPitch
                      homeTeam={{
                        ...summary.homeTeam,
                        formation: summary.homeTeam.formation || summary.homeRoster?.formation,
                      }}
                      awayTeam={{
                        ...summary.awayTeam,
                        formation: summary.awayTeam.formation || summary.awayRoster?.formation,
                      }}
                      homeStarters={summary.homeRoster.starters}
                      homeBench={summary.homeRoster.bench}
                      awayStarters={summary.awayRoster.starters}
                      awayBench={summary.awayRoster.bench}
                      events={summary.events}
                      matchClock={effectiveClock}
                      matchStatus={effectiveStatus}
                    />
                  ) : (
                    <TacticalLineup
                      homeTeam={{
                        ...summary.homeTeam,
                        formation: summary.homeTeam.formation || summary.homeRoster?.formation,
                      }}
                      awayTeam={{
                        ...summary.awayTeam,
                        formation: summary.awayTeam.formation || summary.awayRoster?.formation,
                      }}
                      homeRoster={summary.homeRoster}
                      awayRoster={summary.awayRoster}
                      matchStatus={summary.status}
                    />
                  )}
                </div>
              )}

              {/* TAB 2: THỐNG KÊ CHI TIẾT (CHUẨN PHONG CÁCH FPT PLAY / SOFASCORE PHẲNG TINH GỌN) */}
              {activeTab === "stats" && (
                <div className="space-y-4 max-w-2xl mx-auto pt-1">
                  {/* TIÊU ĐỀ 2 ĐỘI CÂN ĐỐI (TRÁNH CHÈN CHỮ VÀ LỆCH HÀNG TRÊN MOBILE) */}
                  <div className="flex items-center justify-between text-xs pb-2.5 border-b border-white/[0.06] px-1">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-netflix-red shrink-0" />
                      <span className="font-black text-white text-xs sm:text-sm truncate">
                        {summary.homeTeam.displayName}
                      </span>
                    </div>

                    <span className="hidden sm:inline-block text-zinc-400 font-bold tracking-wider text-[11px] uppercase shrink-0 px-3">
                      Thống kê trận đấu
                    </span>

                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
                      <span className="font-black text-white text-xs sm:text-sm truncate">
                        {summary.awayTeam.displayName}
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                    </div>
                  </div>

                  {summary.stats.length > 0 ? (
                    <div className="space-y-3.5">
                      {summary.stats.map((stat: MatchStatItem) => {
                        const { homePct, awayPct } = calculateStatPercentage(
                          stat.homeValue,
                          stat.awayValue,
                        );

                        const isPossession = /kiểm soát|possession/i.test(stat.name) || /kiểm soát|possession/i.test(stat.label);
                        const homeNum = parseFloat(stat.homeValue) || 0;
                        const awayNum = parseFloat(stat.awayValue) || 0;
                        const homeLeading = homeNum > awayNum;

                        if (isPossession) {
                          return (
                            <div key={stat.name} className="space-y-1.5 py-1">
                              <p className="text-center text-xs font-medium text-zinc-400">
                                {stat.label}
                              </p>
                              <div className="flex justify-between items-center text-sm font-sans font-black tabular-nums px-1">
                                <span className="text-white">{stat.homeValue}</span>
                                <span className="text-white">{stat.awayValue}</span>
                              </div>
                              <div className="flex h-2.5 rounded-full overflow-hidden bg-white/5 gap-1 shadow-inner">
                                <div
                                  className="bg-netflix-red rounded-l-full transition-all duration-500"
                                  style={{ width: `${homePct}%` }}
                                />
                                <div
                                  className="bg-sky-500 rounded-r-full transition-all duration-500"
                                  style={{ width: `${awayPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={stat.name}
                            className="flex items-center justify-between py-1.5 text-xs sm:text-sm hover:bg-white/[0.02] transition px-2 rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-[50px] justify-start font-sans font-bold tabular-nums text-white">
                              {homeLeading && <span className="w-1 h-3.5 bg-netflix-red rounded-full shrink-0" />}
                              <span className={homeLeading ? "text-white text-sm" : "text-zinc-400"}>
                                {stat.homeValue}
                              </span>
                            </div>
                            <span className="text-zinc-300 text-xs sm:text-[13px] font-semibold text-center flex-1 px-4 truncate">
                              {stat.label}
                            </span>
                            <div className="flex items-center gap-2 min-w-[50px] justify-end font-sans font-bold tabular-nums text-white">
                              <span className={!homeLeading && homeNum !== awayNum ? "text-white text-sm" : "text-zinc-400"}>
                                {stat.awayValue}
                              </span>
                              {!homeLeading && homeNum !== awayNum && (
                                <span className="w-1 h-3.5 bg-sky-500 rounded-full shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 py-8 text-center">Chưa có số liệu thống kê trận đấu</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )}
  </div>
      )}
    </div>
  );
};

export default MatchCenter;
