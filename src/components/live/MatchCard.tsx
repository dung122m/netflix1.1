"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Play, Flame, Mic, Radio, Trophy } from "lucide-react";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { FootballMatch } from "@/services/liveFootballService";
import { LiveMatchScore } from "@/services/live/football-score/types";
import {
  getTeamAsset,
  getTeamInitials,
  resolveEsportsTeam,
} from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";
import {
  resolveMatchDisplayStatus,
  resolveMatchTimeInfo,
} from "@/services/live/football-score/liveStatus";
import { resolveCanonicalTournament } from "@/services/live/football-score/canonicalLeagues";
import { isFeaturedMatch } from "@/services/live/football/featuredMatch";
import { toCanonicalSourceUrl } from "@/services/live/shared/streamUrlHelper";
import { isOffensiveCommentatorName } from "@/services/live/football/service";
import { CountryFlag } from "./CountryFlag";

interface MatchCardProps {
  match: FootballMatch;
  isSelected: boolean;
  onSelect: (match: FootballMatch) => void;
  score?: LiveMatchScore | null;
  compact?: boolean;
}

/** Fallback hiển thị chữ viết tắt của CLB / ĐTQG: tròn trịa, tối giản, KHÔNG VIỀN cứng */
function TeamLogoFallback({
  initials,
  compact = false,
}: {
  initials: string;
  compact?: boolean;
  color?: "rose" | "sky";
}) {
  const displayInitials = initials && initials.trim() ? initials.trim().slice(0, 3) : "⚽";
  if (compact) {
    return (
      <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold select-none bg-zinc-800 text-zinc-300 shrink-0">
        <span className="text-[8.5px] font-bold tracking-tighter leading-none">
          {displayInitials}
        </span>
      </div>
    );
  }

  return (
    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold select-none bg-zinc-800/80 text-zinc-300 shrink-0">
      <span className="text-xs sm:text-sm tracking-tight font-semibold">
        {displayInitials}
      </span>
    </div>
  );
}

function sanitizeDisplayName(name?: string): string {
  if (!name) return "";
  return name.toWellFormed().replace(/\uFFFD+/g, " ").trim();
}

/**
 * Định dạng phút thi đấu chuẩn:
 * - "26" hoặc "26'" -> "26′"
 * - "90+3" hoặc "90'+3'" -> "90′+3"
 * - "LIVE", "HT", "FT" giữ nguyên
 */
function formatDisplayMinute(rawBadge?: string | null): string {
  if (!rawBadge) return "LIVE";
  const trimmed = rawBadge.trim();
  if (
    trimmed === "LIVE" ||
    trimmed === "HT" ||
    trimmed === "FT" ||
    trimmed === "ET" ||
    trimmed === "PEN"
  ) {
    return trimmed;
  }
  const stoppage = trimmed.match(/^(\d+)['′]?\s*\+\s*(\d+)['′]?$/);
  if (stoppage) {
    return `${stoppage[1]}′+${stoppage[2]}`;
  }
  const minute = trimmed.match(/^(\d+)['′]?$/);
  if (minute) {
    return `${minute[1]}′`;
  }
  return trimmed;
}

function MatchCardInner({ match, isSelected, onSelect, score, compact }: MatchCardProps) {
  const currentScore = score || match.score || null;
  const matchTimestamp = currentScore?.kickoffTimestamp || match.timestamp;
  const hasValidTimestamp =
    matchTimestamp !== undefined &&
    matchTimestamp !== null &&
    matchTimestamp > 0 &&
    matchTimestamp !== Number.MAX_SAFE_INTEGER;
  const currentTime = Date.now();
  const isKickoffInFuture = hasValidTimestamp && currentTime < matchTimestamp - 5 * 60 * 1000;

  const displayStatus = useMemo(
    () =>
      resolveMatchDisplayStatus({
        timestamp: matchTimestamp,
        score: currentScore,
        sourceStatus: match.sourceStatus,
        now: currentTime,
      }),
    [matchTimestamp, currentScore, match.sourceStatus, currentTime],
  );

  const isConfirmedLive =
    !isKickoffInFuture &&
    (displayStatus.isConfirmedLive ||
      match.realStatus === "live" ||
      (match.timeline === "live" && (!hasValidTimestamp || currentTime >= matchTimestamp)) ||
      (match.sourceStatus === "live" && (!hasValidTimestamp || currentTime >= matchTimestamp)) ||
      (match.isLive === true && (!hasValidTimestamp || currentTime >= matchTimestamp)));

  const isFinished =
    displayStatus.statusType === "finished" ||
    match.timeline === "finished" ||
    match.realStatus === "finished" ||
    match.sourceStatus === "finished";

  const specialStatusLabel =
    displayStatus.statusType === "postponed" ||
    displayStatus.statusType === "canceled" ||
    displayStatus.statusType === "suspended"
      ? displayStatus.badgeLabel
      : null;

  const kickoffTime =
    currentScore?.kickoffTime ||
    displayStatus.kickoffTime ||
    (match.time && match.time !== "Trực tiếp" && match.time !== "24/7" ? match.time : null);

  const timeInfo = useMemo(() => {
    return resolveMatchTimeInfo({
      score: currentScore,
      displayStatus,
      kickoffTime,
      isConfirmedLive,
      isFinished,
      specialStatusLabel,
    });
  }, [
    currentScore,
    displayStatus,
    kickoffTime,
    isConfirmedLive,
    isFinished,
    specialStatusLabel,
  ]);

  const shouldShowScore = useMemo(() => {
    return (
      (timeInfo.state === "live" ||
        timeInfo.state === "ht" ||
        timeInfo.state === "ft" ||
        isFinished) &&
      currentScore?.team1Score !== undefined &&
      currentScore?.team2Score !== undefined
    );
  }, [timeInfo.state, isFinished, currentScore?.team1Score, currentScore?.team2Score]);

  const [homeTriedAsset, setHomeTriedAsset] = useState(false);
  const [homeFailed, setHomeFailed] = useState(false);
  const [awayTriedAsset, setAwayTriedAsset] = useState(false);
  const [awayFailed, setAwayFailed] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setHomeTriedAsset(false);
    setHomeFailed(false);
    setAwayTriedAsset(false);
    setAwayFailed(false);
    setLogoError(false);
  }, [match.id, match.logo, match.homeLogo, match.awayLogo]);

  const _isFhd = useMemo(() => {
    return Boolean(
      match.quality?.toUpperCase().includes("FHD") ||
        match.servers?.some(
          (s) => s.quality?.toUpperCase().includes("FHD") || s.name?.toUpperCase().includes("FHD")
        )
    );
  }, [match.quality, match.servers]);

  const displayTeam1 = useMemo(() => sanitizeDisplayName(match.team1), [match.team1]);
  const displayTeam2 = useMemo(() => sanitizeDisplayName(match.team2), [match.team2]);
  const isTwoTeamMatch = Boolean(displayTeam1 && displayTeam2);

  const isEsports = match.sport === "esports";
  const homeAsset = useMemo(
    () => (displayTeam1 ? getTeamAsset(displayTeam1, match.sport) : null),
    [displayTeam1, match.sport],
  );
  const awayAsset = useMemo(
    () => (displayTeam2 ? getTeamAsset(displayTeam2, match.sport) : null),
    [displayTeam2, match.sport],
  );

  const espHome = useMemo(() => resolveEsportsTeam(displayTeam1), [displayTeam1]);
  const espAway = useMemo(() => resolveEsportsTeam(displayTeam2), [displayTeam2]);

  // Chỉ ưu tiên cờ quốc gia khi thực sự là Đội tuyển quốc gia (isCountry: true) VÀ KHÔNG PHẢI Esports
  const homeFlagEmoji = !isEsports && !espHome && homeAsset?.isCountry && homeAsset?.emoji ? homeAsset.emoji : null;
  const awayFlagEmoji = !isEsports && !espAway && awayAsset?.isCountry && awayAsset?.emoji ? awayAsset.emoji : null;

  const rawHome =
    match.homeLogo &&
    match.homeLogo !== "https://img.gavang.net/placeholder.png" &&
    !match.homeLogo.includes("tinhlagi.pro/logo.jpg")
      ? match.homeLogo
      : null;
  const assetHome = espHome?.logo || homeAsset?.logo || null;
  const preferredHome = assetHome || rawHome;

  let homeLogoSrc: string | null = null;
  if (!homeFlagEmoji && !homeFailed) {
    if (preferredHome && !homeTriedAsset) {
      homeLogoSrc = toDarkModeLogoUrl(preferredHome);
    } else if (rawHome && preferredHome !== rawHome) {
      homeLogoSrc = toDarkModeLogoUrl(rawHome);
    }
  }

  const handleHomeImgError = useCallback(() => {
    if (preferredHome && !homeTriedAsset && rawHome && preferredHome !== rawHome) {
      setHomeTriedAsset(true);
    } else {
      setHomeFailed(true);
    }
  }, [preferredHome, homeTriedAsset, rawHome]);

  const rawAway =
    match.awayLogo &&
    match.awayLogo !== "https://img.gavang.net/placeholder.png" &&
    !match.awayLogo.includes("tinhlagi.pro/logo.jpg")
      ? match.awayLogo
      : null;
  const assetAway = espAway?.logo || awayAsset?.logo || null;
  const preferredAway = assetAway || rawAway;

  let awayLogoSrc: string | null = null;
  if (!awayFlagEmoji && !awayFailed) {
    if (preferredAway && !awayTriedAsset) {
      awayLogoSrc = toDarkModeLogoUrl(preferredAway);
    } else if (rawAway && preferredAway !== rawAway) {
      awayLogoSrc = toDarkModeLogoUrl(rawAway);
    }
  }

  const handleAwayImgError = useCallback(() => {
    if (preferredAway && !awayTriedAsset && rawAway && preferredAway !== rawAway) {
      setAwayTriedAsset(true);
    } else {
      setAwayFailed(true);
    }
  }, [preferredAway, awayTriedAsset, rawAway]);

  const displayGroups =
    match.groups && match.groups.length > 0
      ? match.groups.map((g: string) => (g ? g.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim() : "")).filter(Boolean)
      : match.group
      ? [match.group.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim()]
      : [];

  const primaryGroup = displayGroups[0] || match.group || "";

  const tournamentName = useMemo(() => {
    return resolveCanonicalTournament({
      tournament: match.tournament,
      title: match.title,
      sport: match.sport,
      team1: match.team1,
      team2: match.team2,
      category: match.category,
      gender: match.gender,
      score: currentScore,
    });
  }, [match.tournament, match.title, match.sport, match.team1, match.team2, match.category, match.gender, currentScore]);

  const validUniqueServersCount = useMemo(() => {
    if (!match.servers || !Array.isArray(match.servers)) return 0;
    const uniqueUrls = new Set<string>();
    for (const s of match.servers) {
      if (s?.url) {
        const canonical = toCanonicalSourceUrl(s.url);
        if (canonical) {
          uniqueUrls.add(canonical);
        }
      }
    }
    return uniqueUrls.size;
  }, [match.servers]);

  const featured = useMemo(() => {
    return isFeaturedMatch({
      title: match.title,
      tournament: tournamentName,
      team1: displayTeam1,
      team2: displayTeam2,
      sport: match.sport,
      category: match.category,
      gender: match.gender,
      score: currentScore,
      validServersCount: validUniqueServersCount,
      servers: match.servers,
    });
  }, [
    match.title,
    tournamentName,
    displayTeam1,
    displayTeam2,
    match.sport,
    match.category,
    match.gender,
    currentScore,
    validUniqueServersCount,
    match.servers,
  ]);

  // GIAO DIỆN COMPACT: Dành riêng cho thanh bên (Sidebar / Rail) khi đang xem player
  if (compact) {
    return (
      <div
        id={`match-card-${match.id}`}
        data-match-id={match.id}
        data-selected={isSelected ? "true" : "false"}
        tabIndex={0}
        onClick={() => onSelect(match)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(match);
          }
        }}
        className={`group relative rounded-xl cursor-pointer transition-all duration-150 p-2 sm:p-2.5 flex flex-col gap-1.5 overflow-hidden outline-none select-none scroll-mt-12 ${
          isSelected
            ? "bg-gradient-to-r from-netflix-red/10 via-zinc-900/95 to-zinc-900/95 ring-1 ring-inset ring-netflix-red/75 shadow-md shadow-black/50"
            : isConfirmedLive
            ? "bg-zinc-900/80 hover:bg-zinc-800/80 shadow-sm"
            : "bg-zinc-900/55 hover:bg-zinc-800/75 shadow-sm"
        }`}
      >
        {/* DÒNG 1: HEADER MINI */}
        <div className="flex items-center justify-between text-[10.5px] text-zinc-400 gap-1.5 pb-1">
          <span className="truncate font-medium min-w-0 flex-1">
            <span className="truncate">{tournamentName}</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0 font-sans tabular-nums">
            {timeInfo.state === "live" ? (
              <>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>{formatDisplayMinute(timeInfo.clockBadge)}</span>
                </span>
                {kickoffTime && (
                  <span className="text-[10px] font-sans text-zinc-400 tabular-nums">
                    {kickoffTime}
                  </span>
                )}
              </>
            ) : timeInfo.state === "ht" ? (
              <>
                <span className="text-[10px] font-bold text-amber-400 leading-none">
                  HT
                </span>
                {kickoffTime && (
                  <span className="text-[10px] font-sans text-zinc-400 tabular-nums">
                    {kickoffTime}
                  </span>
                )}
              </>
            ) : timeInfo.state === "ft" ? (
              <>
                <span className="text-[10px] text-zinc-400 font-semibold leading-none">
                  FT
                </span>
                {kickoffTime && (
                  <span className="text-[10px] font-sans text-zinc-400 tabular-nums">
                    {kickoffTime}
                  </span>
                )}
              </>
            ) : timeInfo.state === "special" ? (
              <>
                <span className="text-[10px] font-bold text-amber-400 leading-none">
                  {timeInfo.clockBadge}
                </span>
                {kickoffTime && (
                  <span className="text-[10px] font-sans text-zinc-400 tabular-nums">
                    {kickoffTime}
                  </span>
                )}
              </>
            ) : (
              /* Chưa bắt đầu (Upcoming) */
              kickoffTime && (
                <span className="font-sans text-xs font-semibold text-zinc-300 tabular-nums">
                  {kickoffTime}
                </span>
              )
            )}
            {/* Huy hiệu Tâm điểm: Frosted Glass Capsule với Netflix Red Flame */}
            {featured.isFeatured && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 border border-white/10 text-[9px] font-medium tracking-wide shrink-0 shadow-sm backdrop-blur-md"
                aria-label={featured.badgeLabel || "Trận cầu tâm điểm"}
              >
                <Flame size={9} className="text-netflix-red fill-netflix-red shrink-0" />
                {!isSelected && <span>{featured.badgeLabel || "Tâm điểm"}</span>}
              </span>
            )}

            {/* Huy hiệu Đang xem: Glassmorphism kính mờ, chữ nhỏ, sóng âm nhẹ nhàng */}
            {isSelected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md text-[9.5px] font-medium text-zinc-200 shadow-sm shrink-0">
                <PlayingEqualizer className="h-2.5 !px-0" barColor="bg-netflix-red" />
                <span>Đang xem</span>
              </span>
            )}
          </div>
        </div>

        {/* DÒNG 2: 2 ĐỘI BÓNG DẠNG SCOREBOARD MINI */}
        {isTwoTeamMatch ? (
          <div className="space-y-1 py-0.5">
            {/* Đội Nhà */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                  {homeFlagEmoji ? (
                    <CountryFlag emoji={homeFlagEmoji} className="w-4 h-4" />
                  ) : homeLogoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={homeLogoSrc}
                      alt=""
                      className="w-full h-full object-contain filter drop-shadow-sm"
                      onError={handleHomeImgError}
                      loading="lazy"
                    />
                  ) : (
                    <TeamLogoFallback initials={getTeamInitials(displayTeam1)} compact={true} />
                  )}
                </div>
                <span
                  className={`text-xs line-clamp-2 leading-tight break-words ${
                    isSelected
                      ? "text-white font-bold"
                      : "text-zinc-200 font-medium group-hover:text-white"
                  }`}
                >
                  {displayTeam1}
                </span>
              </div>
              {shouldShowScore && currentScore?.team1Score !== undefined && (
                <span className="font-sans text-xs font-bold text-white tabular-nums shrink-0 px-1">
                  {currentScore.team1Score}
                </span>
              )}
            </div>

            {/* Đội Khách */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                  {awayFlagEmoji ? (
                    <CountryFlag emoji={awayFlagEmoji} className="w-4 h-4" />
                  ) : awayLogoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={awayLogoSrc}
                      alt=""
                      className="w-full h-full object-contain filter drop-shadow-sm"
                      onError={handleAwayImgError}
                      loading="lazy"
                    />
                  ) : (
                    <TeamLogoFallback initials={getTeamInitials(displayTeam2)} compact={true} />
                  )}
                </div>
                <span
                  className={`text-xs line-clamp-2 leading-tight break-words ${
                    isSelected
                      ? "text-white font-bold"
                      : "text-zinc-200 font-medium group-hover:text-white"
                  }`}
                >
                  {displayTeam2}
                </span>
              </div>
              {shouldShowScore && currentScore?.team2Score !== undefined && (
                <span className="font-sans text-xs font-bold text-white tabular-nums shrink-0 px-1">
                  {currentScore.team2Score}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-xs font-bold truncate flex-1 text-white">
              {match.title || match.team1}
            </span>
          </div>
        )}

        {/* DÒNG 3: FOOTER MINI (BLV & SỐ NGUỒN) */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1.5">
          {isSelected ? (
            <span className="text-[11px] font-medium text-zinc-400 tabular-nums flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-zinc-500 shrink-0" />
              <span>{match.servers.length} nguồn khả dụng</span>
            </span>
          ) : (
            <span className="truncate flex items-center gap-1.5 min-w-0 flex-1">
              <Mic className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                {match.blv
                  ? `BLV ${match.blv.split(",")[0].trim().replace(/^(?:blv|bình luận viên)\s+/i, "")}`
                  : primaryGroup || "Trực tiếp"}
              </span>
            </span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isSelected && (
              <span className="text-[10.5px] font-medium text-zinc-500 tabular-nums">
                {match.servers.length} nguồn
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GIAO DIỆN FULL: Dành cho Lưới chính ngoài trang /live
  return (
    <div
      id={`match-card-${match.id}`}
      data-match-id={match.id}
      data-selected={isSelected ? "true" : "false"}
      tabIndex={0}
      onClick={() => onSelect(match)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(match);
        }
      }}
      className={`group relative rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden outline-none select-none ${
        isSelected
          ? "bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950 ring-2 ring-netflix-red shadow-2xl shadow-black/80"
          : isConfirmedLive
          ? "bg-zinc-900/80 hover:bg-zinc-850/90 shadow-md shadow-black/30"
          : "bg-zinc-900/60 hover:bg-zinc-850/80 shadow-sm"
      }`}
    >
      {/* Top Crown Rim tinh tế khi được chọn */}
      <div
        className={`absolute top-0 inset-x-0 h-[2px] pointer-events-none transition-all duration-300 ${
          isSelected
            ? "bg-gradient-to-r from-transparent via-netflix-red to-transparent opacity-100"
            : "opacity-0"
        }`}
      />

      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2 sm:gap-2.5">
        {/* 1. HEADER: GIẢI ĐẤU & HUY HIỆU TINH GỌN (KHÔNG VIỀN HỘP THÔ CỨNG) */}
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-white/[0.06] text-xs">
          {/* Tên giải đấu */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-zinc-400 group-hover:text-zinc-300 font-medium text-[11px] sm:text-xs truncate transition-colors">
              <span className="truncate">{tournamentName}</span>
            </span>
          </div>

          {/* Góc phải Header: Trạng thái & Huy hiệu (Typography thuần khiết) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isConfirmedLive && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span>LIVE</span>
              </span>
            )}

            {/* Huy hiệu Tâm điểm: Frosted Glass Capsule với Netflix Red Flame */}
            {featured.isFeatured && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.08] text-zinc-200 border border-white/10 text-[10px] font-medium tracking-wide shadow-sm backdrop-blur-md shrink-0 select-none"
                aria-label={featured.badgeLabel || "Trận cầu tâm điểm"}
              >
                <Flame size={10} className="text-netflix-red fill-netflix-red shrink-0" />
                {!isSelected && <span>{featured.badgeLabel || "Tâm điểm"}</span>}
              </span>
            )}

            {/* Huy hiệu Đang xem: Glassmorphism kính mờ, chữ nhỏ, sóng âm nhẹ nhàng */}
            {isSelected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md text-[10px] font-medium text-zinc-200 shadow-sm shrink-0">
                <PlayingEqualizer className="h-2.5 !px-0" barColor="bg-netflix-red" />
                <span>Đang xem</span>
              </span>
            )}

            {/* 1080p subtly indicated in player */}
          </div>
        </div>

        {/* 2. BODY: BỐ CỤC 3 CỘT CÂN ĐỐI TUYỆT ĐỐI (ROW-LOCK CHO LOGO VÀ TÊN ĐỘI) */}
        {isTwoTeamMatch ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-3 py-1">
            {/* CỘT TRÁI: ĐỘI NHÀ */}
            <div className="flex flex-col items-center text-center min-w-0">
              {/* Khu vực Logo cố định chiều cao h-12 (48px) để đồng trục 100% với Score và Logo Đội khách */}
              <div className="h-12 w-full flex items-center justify-center">
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                  {homeFlagEmoji ? (
                    <CountryFlag emoji={homeFlagEmoji} className="w-8 h-8 sm:w-9 sm:h-9" />
                  ) : homeLogoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={homeLogoSrc}
                      src={homeLogoSrc}
                      alt=""
                      className="w-full h-full object-contain filter drop-shadow-md select-none"
                      onError={handleHomeImgError}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <TeamLogoFallback initials={getTeamInitials(displayTeam1)} />
                  )}
                </div>
              </div>

              {/* Khu vực Tên đội: cố định min-height 2 dòng để dù 1 dòng hay 2 dòng thì baseline vẫn thẳng tắp */}
              <div className="min-h-[34px] sm:min-h-[36px] flex items-start justify-center mt-1.5 w-full">
                <span
                  className={`text-xs sm:text-[13px] line-clamp-2 leading-tight transition-colors text-center max-w-[110px] sm:max-w-[130px] md:max-w-[150px] ${
                    isSelected
                      ? "text-white font-black"
                      : "text-zinc-200 font-semibold group-hover:text-white"
                  }`}
                  title={displayTeam1}
                >
                  {displayTeam1}
                </span>
              </div>
            </div>

            {/* CỘT GIỮA: TRỌNG TÂM THỊ GIÁC (TỶ SỐ & THỜI GIAN THUẦN KHIẾT) */}
            <div className="flex flex-col items-center min-w-[76px] sm:min-w-[88px] shrink-0 text-center select-none">
              {/* Khu vực Tỷ số hoặc VS: cố định h-12 thẳng hàng ngang tuyệt đối với Logo 2 bên */}
              <div className="h-12 flex items-center justify-center">
                {shouldShowScore ? (
                  <span className="font-sans text-2xl sm:text-3xl font-black tracking-wider tabular-nums text-white leading-none drop-shadow-md">
                    {currentScore?.team1Score} - {currentScore?.team2Score}
                  </span>
                ) : (
                  <span className="font-sans tabular-nums text-xs sm:text-sm font-semibold tracking-wider text-zinc-400 select-none">
                    VS
                  </span>
                )}
              </div>

              {/* Khu vực Thời gian bên dưới: cố định min-h, thẳng hàng với dòng tên đội bóng */}
              <div className="min-h-[34px] sm:min-h-[36px] flex flex-col items-center justify-start mt-1.5 gap-1">
                {/* Phút thi đấu hoặc trạng thái hiệp (chỉ hiển thị khi có phút cụ thể hoặc HT/FT) */}
                {timeInfo.state === "live" && timeInfo.clockBadge && timeInfo.clockBadge !== "LIVE" ? (
                  <span className="inline-flex items-center gap-1 font-sans tabular-nums text-[11px] sm:text-xs font-bold text-rose-400 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                    <span>{formatDisplayMinute(timeInfo.clockBadge)}</span>
                  </span>
                ) : timeInfo.state === "ht" ? (
                  <span className="font-sans tabular-nums text-[11px] sm:text-xs font-bold text-amber-400 leading-none">
                    HT
                  </span>
                ) : timeInfo.state === "ft" ? (
                  <span className="font-sans tabular-nums text-[11px] sm:text-xs font-semibold text-zinc-400 leading-none">
                    FT
                  </span>
                ) : timeInfo.state === "special" ? (
                  <span className="font-sans tabular-nums text-[11px] font-bold text-amber-400 leading-none">
                    {timeInfo.clockBadge}
                  </span>
                ) : null}

                {/* Giờ bắt đầu */}
                {kickoffTime && (
                  <span className="font-sans tabular-nums text-[11px] sm:text-xs leading-none font-medium text-zinc-400">
                    {kickoffTime}
                  </span>
                )}
              </div>
            </div>

            {/* CỘT PHẢI: ĐỘI KHÁCH */}
            <div className="flex flex-col items-center text-center min-w-0">
              {/* Khu vực Logo cố định chiều cao h-12 (48px) đồng trục tuyệt đối */}
              <div className="h-12 w-full flex items-center justify-center">
                <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
                  {awayFlagEmoji ? (
                    <CountryFlag emoji={awayFlagEmoji} className="w-8 h-8 sm:w-9 sm:h-9" />
                  ) : awayLogoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      key={awayLogoSrc}
                      src={awayLogoSrc}
                      alt=""
                      className="w-full h-full object-contain filter drop-shadow-md select-none"
                      onError={handleAwayImgError}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <TeamLogoFallback initials={getTeamInitials(displayTeam2)} />
                  )}
                </div>
              </div>

              {/* Khu vực Tên đội: cố định min-height 2 dòng */}
              <div className="min-h-[34px] sm:min-h-[36px] flex items-start justify-center mt-1.5 w-full">
                <span
                  className={`text-xs sm:text-[13px] line-clamp-2 leading-tight transition-colors text-center max-w-[110px] sm:max-w-[130px] md:max-w-[150px] ${
                    isSelected
                      ? "text-white font-black"
                      : "text-zinc-200 font-semibold group-hover:text-white"
                  }`}
                  title={displayTeam2}
                >
                  {displayTeam2}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* KÈO SỰ KIỆN ĐƠN (HOẶC ĐUA XE / QUẦN VỢT / KÊNH 24/7) */
          <div className="flex items-center justify-between gap-2.5 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                {match.logo && !logoError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={toDarkModeLogoUrl(match.logo)}
                    alt=""
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Trophy className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <strong className="text-xs sm:text-[13px] line-clamp-2 flex-1 leading-tight text-white font-bold">
                {match.title || match.team1}
              </strong>
            </div>

            {kickoffTime && (
              <span className="font-sans text-xs sm:text-[13px] font-semibold text-zinc-300 tabular-nums shrink-0">
                {kickoffTime}
              </span>
            )}
          </div>
        )}

        {/* 3. FOOTER: BLV & NGUỒN PHÁT + NÚT PLAY (KHÔNG VIỀN HỘP) */}
        <div className="flex items-center justify-between gap-2 pt-2 text-[11px] text-zinc-400">
          {/* Tên BLV / Nguồn phát bên trái */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <Mic className="w-3 h-3 shrink-0 text-zinc-500" />
            <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium truncate">
              {(() => {
                if (!match.blv) {
                  return /^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup)
                    ? primaryGroup
                    : "Bình luận trực tiếp";
                }
                const rawBlvs = match.blv
                  .split(",")
                  .map((b: string) => b.trim().replace(/^(?:blv|bình luận viên)\s+/i, ""))
                  .filter((b: string) => Boolean(b) && !isOffensiveCommentatorName(b));
                if (rawBlvs.length === 0) {
                  return /^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup)
                    ? primaryGroup
                    : "BLV Trực Tiếp";
                }
                if (rawBlvs.length <= 2) return `BLV ${rawBlvs.join(", ")}`;
                return `BLV ${rawBlvs.slice(0, 2).join(", ")} (+${rawBlvs.length - 2})`;
              })()}
            </span>
          </div>

          {/* Số lượng nguồn phát & Nút Play bên phải */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-medium tabular-nums text-zinc-400">
              {match.servers.length} nguồn
            </span>

            {isSelected ? (
              <span className="w-6 h-6 rounded-full bg-netflix-red/15 text-netflix-red flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse" />
              </span>
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm bg-white/[0.06] group-hover:bg-netflix-red text-zinc-400 group-hover:text-white">
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
