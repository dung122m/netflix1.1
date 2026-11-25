"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Play, Mic, Radio, Trophy } from "lucide-react";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { FootballMatch } from "@/services/live/football/service";
import { LiveMatchScore } from "@/services/live/football/types";
import {
  getTeamAsset,
  getTeamInitials,
  resolveEsportsTeam,
} from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football/footballLogoService";
import {
  resolveMatchDisplayStatus,
  resolveMatchTimeInfo,
} from "@/services/live/football/liveStatus";
import { resolveCanonicalTournament } from "@/services/live/football/canonicalLeagues";
import { isFeaturedMatch } from "@/services/live/football/featuredMatch";
import { toCanonicalSourceUrl } from "@/services/live/shared/streamUrlHelper";
import { isOffensiveCommentatorName } from "@/services/live/football/service";
import { CountryFlag } from "./CountryFlag";

export interface MatchCardProps {
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
    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold select-none bg-zinc-800/90 text-zinc-300 shrink-0 shadow-sm">
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
  if (!rawBadge) return "";
  const trimmed = rawBadge.trim();
  if (trimmed === "LIVE") return "";
  if (trimmed === "HT" || trimmed === "FT" || trimmed === "ET" || trimmed === "PEN") {
    return trimmed;
  }
  const stoppage = trimmed.match(/^(\d+)['′]?\s*\+\s*(\d+)['′]?$/);
  if (stoppage) return `${stoppage[1]}′+${stoppage[2]}`;
  const minute = trimmed.match(/^(\d+)['′]?$/);
  if (minute) return `${minute[1]}′`;
  return trimmed;
}

function formatCommentators(blv?: string, primaryGroup?: string): string {
  if (!blv) {
    return /^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup || "")
      ? (primaryGroup as string)
      : "Bình luận trực tiếp";
  }
  const rawBlvs = blv
    .split(",")
    .map((b) => b.trim().replace(/^(?:blv|bình luận viên)\s+/i, ""))
    .filter((b) => Boolean(b) && !isOffensiveCommentatorName(b));
  if (rawBlvs.length === 0) {
    return /^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup || "")
      ? (primaryGroup as string)
      : "BLV Trực Tiếp";
  }
  if (rawBlvs.length <= 2) return `BLV ${rawBlvs.join(", ")}`;
  return `BLV ${rawBlvs.slice(0, 2).join(", ")} (+${rawBlvs.length - 2})`;
}

/** Tự quản lý fallback & dark-mode logo độc lập cho từng đội bóng */
function TeamLogo({
  teamName,
  sport,
  rawLogo,
  compact = false,
  isFeatured = false,
}: {
  teamName: string;
  sport?: string;
  rawLogo?: string | null;
  compact?: boolean;
  isFeatured?: boolean;
}) {
  const isEsports = sport === "esports";
  const teamAsset = useMemo(() => (teamName ? getTeamAsset(teamName, sport) : null), [teamName, sport]);
  const espTeam = useMemo(() => resolveEsportsTeam(teamName), [teamName]);
  const flagEmoji = !isEsports && !espTeam && teamAsset?.isCountry && teamAsset?.emoji ? teamAsset.emoji : null;

  const validRawLogo =
    rawLogo &&
    rawLogo !== "https://img.gavang.net/placeholder.png" &&
    !rawLogo.includes("tinhlagi.pro/logo.jpg")
      ? rawLogo
      : null;
  const assetLogo = espTeam?.logo || teamAsset?.logo || null;
  const primarySrc = assetLogo || validRawLogo;
  const fallbackSrc = assetLogo && validRawLogo && assetLogo !== validRawLogo ? validRawLogo : null;

  const [currentSrc, setCurrentSrc] = useState<string | null>(primarySrc ? toDarkModeLogoUrl(primarySrc) : null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(primarySrc ? toDarkModeLogoUrl(primarySrc) : null);
    setHasFailed(false);
  }, [primarySrc]);

  const handleError = useCallback(() => {
    if (fallbackSrc && currentSrc !== toDarkModeLogoUrl(fallbackSrc)) {
      setCurrentSrc(toDarkModeLogoUrl(fallbackSrc));
    } else {
      setHasFailed(true);
    }
  }, [fallbackSrc, currentSrc]);

  if (compact) {
    return (
      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0">
        {flagEmoji ? (
          <CountryFlag emoji={flagEmoji} className="w-4 h-4" />
        ) : currentSrc && !hasFailed ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentSrc}
            alt=""
            className="w-full h-full object-contain filter drop-shadow-sm"
            onError={handleError}
            loading="lazy"
          />
        ) : (
          <TeamLogoFallback initials={getTeamInitials(teamName)} compact />
        )}
      </div>
    );
  }

  const containerSize = isFeatured ? "w-12 h-12 sm:w-13 sm:h-13" : "w-11 h-11 sm:w-12 sm:h-12";
  const flagSize = isFeatured ? "w-9 h-9 sm:w-10 sm:h-10" : "w-8 h-8 sm:w-9 sm:h-9";

  return (
    <div className={`flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)] ${containerSize}`}>
      {flagEmoji ? (
        <CountryFlag emoji={flagEmoji} className={flagSize} />
      ) : currentSrc && !hasFailed ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={currentSrc}
          src={currentSrc}
          alt=""
          className="w-full h-full object-contain filter drop-shadow-md select-none"
          onError={handleError}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <TeamLogoFallback initials={getTeamInitials(teamName)} />
      )}
    </div>
  );
}

/** Huy hiệu thời gian và tỉ số dùng chung */
function MatchTimeBadge({
  timeInfo,
  kickoffTime,
  compact = false,
}: {
  timeInfo: ReturnType<typeof resolveMatchTimeInfo>;
  kickoffTime: string | null;
  compact?: boolean;
}) {
  const displayMin = formatDisplayMinute(timeInfo.clockBadge);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 leading-none">
        {timeInfo.state === "live" && displayMin && (
          <span className="text-[10px] font-bold text-rose-400 leading-none inline-flex items-center">{displayMin}</span>
        )}
        {timeInfo.state === "ht" && (
          <span className="text-[10px] font-bold text-amber-400 leading-none inline-flex items-center">HT</span>
        )}
        {timeInfo.state === "ft" && (
          <span className="text-[10px] text-zinc-400 font-semibold leading-none inline-flex items-center">FT</span>
        )}
        {timeInfo.state === "special" && (
          <span className="text-[10px] font-bold text-amber-400 leading-none inline-flex items-center">{timeInfo.clockBadge}</span>
        )}
        {kickoffTime && (
          <span
            className={`tabular-nums leading-none inline-flex items-center ${
              timeInfo.state === "upcoming"
                ? "font-sans text-[11px] font-semibold text-zinc-300"
                : "text-[10px] font-sans text-zinc-400"
            }`}
          >
            {kickoffTime}
          </span>
        )}
      </div>
    );
  }

  if (timeInfo.state === "live" && displayMin) {
    return <span className="font-sans tabular-nums text-xs font-bold text-rose-400 leading-none">{displayMin}</span>;
  }
  if (timeInfo.state === "ht") {
    return <span className="font-sans tabular-nums text-xs font-bold text-amber-400 leading-none">HT</span>;
  }
  if (timeInfo.state === "ft") {
    return <span className="font-sans tabular-nums text-xs font-semibold text-zinc-400 leading-none">FT</span>;
  }
  if (timeInfo.state === "special") {
    return <span className="font-sans tabular-nums text-xs font-bold text-amber-400 leading-none">{timeInfo.clockBadge}</span>;
  }
  if (kickoffTime) {
    return <span className="font-sans tabular-nums text-xs font-medium text-zinc-400 leading-none">{kickoffTime}</span>;
  }
  return null;
}

/** Tách toàn bộ logic nghiệp vụ tính toán match model */
function useMatchCardState(match: FootballMatch, score?: LiveMatchScore | null) {
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

  const shouldShowScore =
    (timeInfo.state === "live" || timeInfo.state === "ht" || timeInfo.state === "ft" || isFinished) &&
    currentScore?.team1Score !== undefined &&
    currentScore?.team2Score !== undefined;

  const displayTeam1 = useMemo(() => sanitizeDisplayName(match.team1), [match.team1]);
  const displayTeam2 = useMemo(() => sanitizeDisplayName(match.team2), [match.team2]);
  const isTwoTeamMatch = Boolean(displayTeam1 && displayTeam2);

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
        if (canonical) uniqueUrls.add(canonical);
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

  const primaryGroup =
    match.groups?.[0]?.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim() ||
    match.group?.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim() ||
    "";

  return {
    currentScore,
    timeInfo,
    kickoffTime,
    isConfirmedLive,
    shouldShowScore,
    displayTeam1,
    displayTeam2,
    isTwoTeamMatch,
    tournamentName,
    featured,
    primaryGroup,
  };
}

function MatchCardInner({ match, isSelected, onSelect, score, compact }: MatchCardProps) {
  const {
    currentScore,
    timeInfo,
    kickoffTime,
    isConfirmedLive,
    shouldShowScore,
    displayTeam1,
    displayTeam2,
    isTwoTeamMatch,
    tournamentName,
    featured,
    primaryGroup,
  } = useMatchCardState(match, score);

  const [singleLogoFailed, setSingleLogoFailed] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(match);
    }
  };

  // GIAO DIỆN COMPACT: Dành riêng cho thanh bên (Sidebar / Rail) khi đang xem player
  if (compact) {
    return (
      <div
        id={`match-card-${match.id}`}
        data-match-id={match.id}
        data-selected={isSelected ? "true" : "false"}
        tabIndex={0}
        onClick={() => onSelect(match)}
        onKeyDown={handleKeyDown}
        className={`group relative rounded-xl cursor-pointer transition-all duration-150 p-2 sm:p-2.5 flex flex-col gap-1.5 overflow-hidden outline-none select-none scroll-mt-12 ${
          isSelected
            ? "bg-zinc-850 ring-1 ring-inset ring-white/30 shadow-md shadow-black/50"
            : isConfirmedLive
              ? "bg-zinc-900/80 hover:bg-zinc-800/80 shadow-sm"
              : "bg-zinc-900/55 hover:bg-zinc-800/75 shadow-sm"
        }`}
      >
        {/* DÒNG 1: HEADER MINI */}
        <div className="flex items-center justify-between text-[10.5px] text-zinc-400 gap-1.5 pb-1 leading-none">
          <span className="truncate font-medium min-w-0 flex-1 leading-none">
            <span className="truncate">{tournamentName}</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0 font-sans tabular-nums leading-none">
            <MatchTimeBadge timeInfo={timeInfo} kickoffTime={kickoffTime} compact />

            {/* Nhãn Tâm điểm */}
            {featured.isFeatured && !isSelected && (
              <span
                className="text-[10px] font-bold text-rose-400 shrink-0 select-none font-sans leading-none inline-flex items-center"
                aria-label={featured.badgeLabel || "Trận cầu tâm điểm"}
              >
                {featured.badgeLabel || "Tâm điểm"}
              </span>
            )}

            {/* Huy hiệu Đang xem */}
            {isSelected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md text-[9.5px] font-medium text-zinc-200 shadow-sm shrink-0 leading-none">
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
                <TeamLogo teamName={displayTeam1} sport={match.sport} rawLogo={match.homeLogo} compact />
                <span
                  className={`text-xs line-clamp-2 leading-tight break-words ${
                    isSelected ? "text-white font-bold" : "text-zinc-200 font-medium group-hover:text-white"
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
                <TeamLogo teamName={displayTeam2} sport={match.sport} rawLogo={match.awayLogo} compact />
                <span
                  className={`text-xs line-clamp-2 leading-tight break-words ${
                    isSelected ? "text-white font-bold" : "text-zinc-200 font-medium group-hover:text-white"
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
      onKeyDown={handleKeyDown}
      className={`group relative rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden outline-none select-none ${
        isSelected
          ? "bg-zinc-850 ring-1 ring-white/30 shadow-2xl shadow-black/80"
          : isConfirmedLive
            ? "bg-zinc-900/80 hover:bg-zinc-850/90 shadow-md shadow-black/30"
            : "bg-zinc-900/60 hover:bg-zinc-850/80 shadow-sm"
      }`}
    >
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 gap-2 sm:gap-2.5">
        {/* 1. HEADER: GIẢI ĐẤU & HUY HIỆU */}
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-white/[0.06] text-xs">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`text-[11px] sm:text-xs truncate transition-colors ${
                featured.isFeatured ? "text-zinc-300 font-semibold" : "text-zinc-400 group-hover:text-zinc-300 font-medium"
              }`}
            >
              <span className="truncate">{tournamentName}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {featured.isFeatured && !isSelected && (
              <span
                className="text-[10px] sm:text-[10.5px] font-bold text-rose-400 shrink-0 select-none font-sans"
                aria-label={featured.badgeLabel || "Trận cầu tâm điểm"}
              >
                {featured.badgeLabel || "Tâm điểm"}
              </span>
            )}

            {isSelected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.08] backdrop-blur-md text-[10px] font-medium text-zinc-200 shadow-sm shrink-0">
                <PlayingEqualizer className="h-2.5 !px-0" barColor="bg-netflix-red" />
                <span>Đang xem</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. BODY: BỐ CỤC 3 CỘT (ĐỘI NHÀ - TỶ SỐ/THỜI GIAN - ĐỘI KHÁCH) */}
        {isTwoTeamMatch ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-3 py-1">
            {/* CỘT TRÁI: ĐỘI NHÀ */}
            <div className="flex flex-col items-center text-center min-w-0">
              <div className="h-12 w-full flex items-center justify-center">
                <TeamLogo
                  teamName={displayTeam1}
                  sport={match.sport}
                  rawLogo={match.homeLogo}
                  isFeatured={featured.isFeatured}
                />
              </div>

              <div className="min-h-[34px] sm:min-h-[36px] flex items-start justify-center mt-1.5 w-full">
                <span
                  className={`text-xs sm:text-[13px] line-clamp-2 leading-tight transition-colors text-center max-w-[125px] sm:max-w-[140px] md:max-w-[160px] ${
                    isSelected
                      ? "text-white font-black"
                      : featured.isFeatured
                        ? "text-white font-bold tracking-tight text-[13px] sm:text-[13.5px]"
                        : "text-zinc-200 font-semibold group-hover:text-white"
                  }`}
                  title={displayTeam1}
                >
                  {displayTeam1}
                </span>
              </div>
            </div>

            {/* CỘT GIỮA: TỶ SỐ & THỜI GIAN */}
            <div className="flex flex-col items-center min-w-[76px] sm:min-w-[88px] shrink-0 text-center select-none">
              <div className="h-12 flex items-center justify-center">
                {shouldShowScore ? (
                  <span className="font-sans text-2xl sm:text-3xl font-black tracking-wider tabular-nums text-white leading-none drop-shadow-md">
                    {currentScore?.team1Score} - {currentScore?.team2Score}
                  </span>
                ) : (
                  <span
                    className={`font-sans tabular-nums text-sm sm:text-base font-bold tracking-widest select-none ${
                      featured.isFeatured ? "text-zinc-200 font-extrabold" : "text-zinc-400"
                    }`}
                  >
                    VS
                  </span>
                )}
              </div>

              <div className="min-h-[34px] sm:min-h-[36px] flex flex-col items-center justify-start mt-1">
                <MatchTimeBadge timeInfo={timeInfo} kickoffTime={kickoffTime} />
              </div>
            </div>

            {/* CỘT PHẢI: ĐỘI KHÁCH */}
            <div className="flex flex-col items-center text-center min-w-0">
              <div className="h-12 w-full flex items-center justify-center">
                <TeamLogo
                  teamName={displayTeam2}
                  sport={match.sport}
                  rawLogo={match.awayLogo}
                  isFeatured={featured.isFeatured}
                />
              </div>

              <div className="min-h-[34px] sm:min-h-[36px] flex items-start justify-center mt-1.5 w-full">
                <span
                  className={`text-xs sm:text-[13px] line-clamp-2 leading-tight transition-colors text-center max-w-[125px] sm:max-w-[140px] md:max-w-[160px] ${
                    isSelected
                      ? "text-white font-black"
                      : featured.isFeatured
                        ? "text-white font-bold tracking-tight text-[13px] sm:text-[13.5px]"
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
          /* SỰ KIỆN ĐƠN */
          <div className="flex items-center justify-between gap-2.5 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                {match.logo && !singleLogoFailed ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={toDarkModeLogoUrl(match.logo)}
                    alt=""
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={() => setSingleLogoFailed(true)}
                  />
                ) : (
                  <Trophy className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <strong
                className={`text-xs sm:text-[13px] line-clamp-2 flex-1 leading-tight ${
                  featured.isFeatured ? "text-white font-extrabold" : "text-white font-bold"
                }`}
              >
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

        {/* 3. FOOTER: BLV & NGUỒN PHÁT + NÚT PLAY */}
        <div className="flex items-center justify-between gap-2 pt-2 text-[11px] text-zinc-400">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <Mic className={`w-3 h-3 shrink-0 ${featured.isFeatured ? "text-netflix-red" : "text-zinc-500"}`} />
            <span
              className={`transition-colors font-medium truncate ${
                featured.isFeatured ? "text-zinc-200 font-semibold" : "text-zinc-400 group-hover:text-zinc-300"
              }`}
            >
              {formatCommentators(match.blv, primaryGroup)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[11px] font-medium tabular-nums ${featured.isFeatured ? "text-zinc-300" : "text-zinc-400"}`}>
              {match.servers.length} nguồn
            </span>

            {isSelected ? (
              <span className="w-6 h-6 rounded-full bg-netflix-red/15 text-netflix-red flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-netflix-red animate-pulse" />
              </span>
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center transition-all bg-white/[0.06] group-hover:bg-white/[0.12] text-zinc-400 group-hover:text-white">
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
