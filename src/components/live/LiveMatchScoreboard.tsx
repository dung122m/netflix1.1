"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Clock, Mic, Trophy } from "lucide-react";
import type { FootballMatch, StreamServer } from "@/services/liveFootballService";
import type {
  LiveMatchScore,
  NormalizedMatchSummary,
} from "@/services/live/football-score/types";
import type { GroupedGoalScorer } from "@/services/live/football-score/goalScorersParser";
import type { resolveMatchTimeInfo } from "@/services/live/football-score/liveStatus";
import { resolveCanonicalTournament } from "@/services/live/football-score/canonicalLeagues";
import { parseServerDisplayLabel } from "@/services/live/shared/serverSelectionHelper";
import {
  getTeamAsset,
  getTeamInitials,
  resolveEsportsTeam,
} from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";
import { Tooltip } from "@/components/ui/Tooltip";
import { CountryFlag } from "./CountryFlag";

export interface LiveMatchScoreboardProps {
  match?: FootballMatch;
  title: string;
  blv?: string;
  time?: string;
  team1?: string;
  team2?: string;
  isEvent?: boolean;
  homeLogo?: string;
  awayLogo?: string;
  currentScore: LiveMatchScore | null;
  summary?: NormalizedMatchSummary | null;
  timeInfo: ReturnType<typeof resolveMatchTimeInfo>;
  isFinished: boolean;
  kickoffTime: string | null;
  homeDisplayName?: string;
  awayDisplayName?: string;
  venueName?: string;
  refereeName?: string;
  homeGoalScorers: GroupedGoalScorer[];
  awayGoalScorers: GroupedGoalScorer[];
  currentServer: StreamServer | null;
  currentAvailableIdx: number;
  selectedServerIndex: number;
}

/**
 * Renders the broadcast-style live match scoreboard with tournament metadata,
 * club/country badges, live score & clock badge, commentator tag, and goal scorers.
 */
export function LiveMatchScoreboard({
  match,
  title,
  blv,
  time,
  team1,
  team2,
  isEvent,
  homeLogo,
  awayLogo,
  currentScore,
  summary,
  timeInfo,
  isFinished,
  kickoffTime,
  homeDisplayName,
  awayDisplayName,
  venueName,
  refereeName,
  homeGoalScorers,
  awayGoalScorers,
  currentServer,
  currentAvailableIdx,
  selectedServerIndex,
}: LiveMatchScoreboardProps) {
  const [homeTriedAsset, setHomeTriedAsset] = useState(false);
  const [homeFailed, setHomeFailed] = useState(false);
  const [awayTriedAsset, setAwayTriedAsset] = useState(false);
  const [awayFailed, setAwayFailed] = useState(false);

  useEffect(() => {
    setHomeTriedAsset(false);
    setHomeFailed(false);
    setAwayTriedAsset(false);
    setAwayFailed(false);
  }, [match?.id, homeLogo, awayLogo]);

  const isEsports = match?.sport === "esports";
  const homeTeamStr =
    summary?.homeTeam?.name || summary?.homeTeam?.displayName || team1;
  const awayTeamStr =
    summary?.awayTeam?.name || summary?.awayTeam?.displayName || team2;

  const homeAsset = useMemo(() => getTeamAsset(homeTeamStr), [homeTeamStr]);
  const awayAsset = useMemo(() => getTeamAsset(awayTeamStr), [awayTeamStr]);

  const espHome = useMemo(() => resolveEsportsTeam(homeTeamStr), [homeTeamStr]);
  const espAway = useMemo(() => resolveEsportsTeam(awayTeamStr), [awayTeamStr]);

  const homeFlagEmoji =
    !isEsports && !espHome && homeAsset?.isCountry && homeAsset?.emoji
      ? homeAsset.emoji
      : null;
  const awayFlagEmoji =
    !isEsports && !espAway && awayAsset?.isCountry && awayAsset?.emoji
      ? awayAsset.emoji
      : null;

  const assetHome = espHome?.logo || homeAsset?.logo || null;
  const rawHome =
    (Boolean(summary?.homeTeam?.logo) &&
    !summary?.homeTeam?.logo?.includes("tinhlagi.pro/logo.jpg")
      ? summary?.homeTeam?.logo
      : null) ||
    (Boolean(homeLogo) && !homeLogo?.includes("tinhlagi.pro/logo.jpg")
      ? homeLogo
      : null) ||
    assetHome ||
    null;

  let homeLogoSrc: string | null = null;
  if (!homeFlagEmoji && !homeFailed) {
    if (rawHome && !homeTriedAsset) {
      homeLogoSrc = toDarkModeLogoUrl(rawHome);
    } else if (assetHome) {
      homeLogoSrc = toDarkModeLogoUrl(assetHome);
    }
  }

  const handleHomeImgError = useCallback(() => {
    if (rawHome && !homeTriedAsset && assetHome && assetHome !== rawHome) {
      setHomeTriedAsset(true);
    } else {
      setHomeFailed(true);
    }
  }, [rawHome, homeTriedAsset, assetHome]);

  const assetAway = espAway?.logo || awayAsset?.logo || null;
  const rawAway =
    (Boolean(summary?.awayTeam?.logo) &&
    !summary?.awayTeam?.logo?.includes("tinhlagi.pro/logo.jpg")
      ? summary?.awayTeam?.logo
      : null) ||
    (Boolean(awayLogo) && !awayLogo?.includes("tinhlagi.pro/logo.jpg")
      ? awayLogo
      : null) ||
    assetAway ||
    null;

  let awayLogoSrc: string | null = null;
  if (!awayFlagEmoji && !awayFailed) {
    if (rawAway && !awayTriedAsset) {
      awayLogoSrc = toDarkModeLogoUrl(rawAway);
    } else if (assetAway) {
      awayLogoSrc = toDarkModeLogoUrl(assetAway);
    }
  }

  const handleAwayImgError = useCallback(() => {
    if (rawAway && !awayTriedAsset && assetAway && assetAway !== rawAway) {
      setAwayTriedAsset(true);
    } else {
      setAwayFailed(true);
    }
  }, [rawAway, awayTriedAsset, assetAway]);

  return (
    <div className="relative rounded-2xl sm:rounded-3xl bg-zinc-950/90 backdrop-blur-xl px-3.5 py-2.5 sm:px-6 sm:py-3.5 shadow-2xl shadow-black/80 overflow-hidden w-full min-w-0">
      {isEvent ||
      !team1 ||
      !team2 ||
      team1.trim().toLowerCase() === team2.trim().toLowerCase() ? (
        <div className="relative z-10 w-full flex flex-col items-center justify-center text-center py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-full">
              Kênh / Sự kiện
            </span>
            {time && time !== "Trực tiếp" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-300 bg-white/10 px-2 py-0.5 rounded-full tabular-nums">
                <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>{time}</span>
              </span>
            )}
          </div>
          <h2 className="mt-1 text-base sm:text-xl font-black text-white tracking-tight">
            {title}
          </h2>
        </div>
      ) : (
        (() => {
          const displayTournament = resolveCanonicalTournament({
            tournament: match?.tournament,
            title: title || match?.title,
            sport: match?.sport,
            team1: match?.team1,
            team2: match?.team2,
            category: match?.category,
            gender: match?.gender,
            score: currentScore,
          });

          const homeScoreVal =
            currentScore?.team1Score ?? summary?.homeTeam?.score;
          const awayScoreVal =
            currentScore?.team2Score ?? summary?.awayTeam?.score;
          const hasScore =
            (timeInfo.state === "live" ||
              timeInfo.state === "ht" ||
              timeInfo.state === "ft" ||
              isFinished) &&
            typeof homeScoreVal === "number" &&
            typeof awayScoreVal === "number" &&
            !isNaN(homeScoreVal) &&
            !isNaN(awayScoreVal);

          const hasGoalScorers =
            homeGoalScorers.length > 0 || awayGoalScorers.length > 0;

          const blvLabel = (() => {
            if (currentServer) {
              const displayLabel = parseServerDisplayLabel(
                currentServer,
                currentAvailableIdx !== -1
                  ? currentAvailableIdx
                  : selectedServerIndex,
              );
              if (displayLabel) {
                const parts = displayLabel.split(/[·•\-|–—]/);
                const firstPart = parts[0]?.trim();
                if (firstPart && !/^Nguồn\s+\d+$/i.test(firstPart)) {
                  return firstPart;
                }
              }
            }
            const raw = (blv || match?.blv || "").replace(
              /^(?:blv|bình luận viên)\s+/i,
              "",
            );
            const parts = raw
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean);
            if (parts.length === 0) return "BLV Trực Tiếp";
            return `BLV ${parts[0]}`;
          })();

          return (
            <div className="relative z-10 flex flex-col gap-1.5 sm:gap-2 w-full min-w-0">
              {/* HÀNG TRÊN (MOBILE): GIẢI ĐẤU & BLV RÚT GỌN */}
              <div className="flex md:hidden items-center justify-between gap-2 pb-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] text-zinc-300 text-[10.5px] font-semibold truncate max-w-[180px] min-w-0">
                  <Trophy className="w-3 h-3 shrink-0 text-amber-400" />
                  <span className="truncate">{displayTournament}</span>
                </span>

                {(blv || match?.blv || currentServer) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 text-[10px] font-semibold truncate max-w-[150px] min-w-0">
                    <Mic className="w-3 h-3 shrink-0" />
                    <span className="truncate">{blvLabel}</span>
                  </span>
                )}
              </div>

              {/* HÀNG CHÍNH: BẢNG TỶ SỐ CHUẨN TRUYỀN HÌNH */}
              <div className="flex items-center justify-between gap-3 sm:gap-4 w-full min-w-0">
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  <Tooltip
                    content={`${displayTournament}${venueName ? ` • Sân: ${venueName}` : ""}${refereeName ? ` • Trọng tài: ${refereeName}` : ""}`}
                    side="top"
                  >
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-semibold truncate max-w-[190px] lg:max-w-[240px] transition">
                      <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span className="truncate">{displayTournament}</span>
                    </span>
                  </Tooltip>
                </div>

                {/* TRUNG TÂM */}
                <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4 md:gap-5 min-w-0 w-full max-w-3xl mx-auto">
                  {/* ĐỘI NHÀ */}
                  <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0 flex-1 text-right">
                    <span
                      className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-tight truncate block"
                      title={homeDisplayName}
                    >
                      {homeDisplayName}
                    </span>

                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-white/[0.06] p-1.5 flex items-center justify-center shadow-md shrink-0 relative overflow-hidden">
                      {homeFlagEmoji ? (
                        <CountryFlag
                          emoji={homeFlagEmoji}
                          className="w-6 h-6 relative z-10"
                        />
                      ) : homeLogoSrc ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={homeLogoSrc}
                          src={homeLogoSrc}
                          alt={homeDisplayName}
                          className="w-full h-full object-contain filter drop-shadow relative z-10"
                          onError={handleHomeImgError}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[11px] font-black text-rose-400">
                          {getTeamInitials(team1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TỶ SỐ / VS */}
                  <div className="flex flex-col items-center justify-center px-3 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/[0.05] shadow-inner shrink-0 min-w-[70px] sm:min-w-[84px]">
                    {hasScore ? (
                      <div className="flex items-center justify-center gap-1.5 font-sans text-xl sm:text-2xl md:text-3xl font-black text-white tracking-wider tabular-nums leading-none">
                        <span>{homeScoreVal}</span>
                        <span className="text-zinc-500 font-light select-none">
                          :
                        </span>
                        <span>{awayScoreVal}</span>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-zinc-400 leading-none select-none">
                        VS
                      </span>
                    )}

                    <div className="mt-1 flex items-center justify-center gap-1.5 text-center leading-none">
                      {timeInfo.state === "live" ? (
                        <>
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span>{timeInfo.clockBadge}</span>
                          </span>
                          {kickoffTime && (
                            <span className="text-zinc-500 text-[10px] sm:text-[10.5px] font-sans tabular-nums hidden sm:inline">
                              • {kickoffTime}
                            </span>
                          )}
                        </>
                      ) : timeInfo.state === "ht" ? (
                        <span className="text-[10px] sm:text-[11px] font-bold text-amber-300">
                          HT
                        </span>
                      ) : timeInfo.state === "ft" ? (
                        <span className="text-[10px] sm:text-[11px] font-bold text-zinc-400">
                          FT
                        </span>
                      ) : timeInfo.state === "upcoming" ? (
                        <span className="text-[11px] sm:text-xs font-sans font-bold text-amber-400 tabular-nums">
                          {kickoffTime || "Sắp đá"}
                        </span>
                      ) : timeInfo.state === "special" ? (
                        <span className="text-[10px] font-bold text-amber-300">
                          {timeInfo.clockBadge}
                        </span>
                      ) : (
                        kickoffTime && (
                          <span className="text-[10px] sm:text-[11px] font-sans text-zinc-400 font-medium tabular-nums">
                            {kickoffTime}
                          </span>
                        )
                      )}

                      {timeInfo.state === "live" &&
                        currentScore?.statusDetail &&
                        currentScore.statusDetail !== currentScore.displayClock &&
                        currentScore.statusDetail !== "In Progress" && (
                          <span className="text-[8.5px] text-amber-300 font-semibold hidden sm:inline-block">
                            • {currentScore.statusDetail}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* ĐỘI KHÁCH */}
                  <div className="flex items-center justify-start gap-2 sm:gap-3 min-w-0 flex-1 text-left">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-white/[0.06] p-1.5 flex items-center justify-center shadow-md shrink-0 relative overflow-hidden">
                      {awayFlagEmoji ? (
                        <CountryFlag
                          emoji={awayFlagEmoji}
                          className="w-6 h-6 relative z-10"
                        />
                      ) : awayLogoSrc ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={awayLogoSrc}
                          src={awayLogoSrc}
                          alt={awayDisplayName}
                          className="w-full h-full object-contain filter drop-shadow relative z-10"
                          onError={handleAwayImgError}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[11px] font-black text-sky-400">
                          {getTeamInitials(team2)}
                        </span>
                      )}
                    </div>

                    <span
                      className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-tight truncate block"
                      title={awayDisplayName}
                    >
                      {awayDisplayName}
                    </span>
                  </div>
                </div>

                {/* DESKTOP CÁNH PHẢI: BLV */}
                <div className="hidden md:flex items-center gap-2 shrink-0">
                  {(blv || match?.blv || currentServer) && (
                    <Tooltip content={`BLV: ${blvLabel}`} side="top">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 text-xs font-semibold truncate max-w-[170px] lg:max-w-[220px] transition">
                        <Mic className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{blvLabel}</span>
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* DẢI NGƯỜI GHI BÀN */}
              {hasGoalScorers && (
                <div className="flex items-center justify-between gap-2 sm:gap-3 w-full min-w-0 pt-1 text-[9.5px] sm:text-[10.5px] text-zinc-300">
                  <div className="flex-1 flex items-center justify-end min-w-0 text-right">
                    <div className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5 min-w-0">
                      {homeGoalScorers.map((scorer, idx) => (
                        <span
                          key={`h-${idx}`}
                          className="inline-flex items-baseline gap-1 text-zinc-200"
                        >
                          <span
                            className="font-medium text-white truncate max-w-[110px] sm:max-w-[160px]"
                            title={scorer.playerName}
                          >
                            {scorer.playerName}
                          </span>
                          <span className="font-sans tabular-nums font-semibold text-amber-400 text-[10px] sm:text-[11px] shrink-0">
                            {scorer.times.join(", ")}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-center min-w-[14px] sm:min-w-[20px]">
                    {homeGoalScorers.length > 0 && awayGoalScorers.length > 0 ? (
                      <span className="text-zinc-600 select-none text-xs leading-none">
                        |
                      </span>
                    ) : (
                      <span className="w-1.5" />
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-start min-w-0 text-left">
                    <div className="flex flex-wrap items-baseline justify-start gap-x-2 gap-y-0.5 min-w-0">
                      {awayGoalScorers.map((scorer, idx) => (
                        <span
                          key={`a-${idx}`}
                          className="inline-flex items-baseline gap-1 text-zinc-200"
                        >
                          <span
                            className="font-medium text-white truncate max-w-[110px] sm:max-w-[160px]"
                            title={scorer.playerName}
                          >
                            {scorer.playerName}
                          </span>
                          <span className="font-sans tabular-nums font-semibold text-amber-400 text-[10px] sm:text-[11px] shrink-0">
                            {scorer.times.join(", ")}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}

