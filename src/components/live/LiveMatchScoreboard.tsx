"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Clock, Trophy, MapPin, Users } from "lucide-react";
import type { FootballMatch, StreamServer } from "@/services/live/football/service";
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
import { FotmobSoccerBallIcon } from "./icons/FotmobPitchIcons";

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

  const homeAsset = useMemo(() => getTeamAsset(homeTeamStr, match?.sport), [homeTeamStr, match?.sport]);
  const awayAsset = useMemo(() => getTeamAsset(awayTeamStr, match?.sport), [awayTeamStr, match?.sport]);

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
    <div className="relative rounded-2xl sm:rounded-3xl bg-zinc-950/90 backdrop-blur-xl px-4 py-3.5 sm:px-6 sm:py-5 md:px-8 md:py-6 shadow-2xl shadow-black/80 overflow-hidden w-full min-w-0">
      {isEvent ||
      !team1 ||
      !team2 ||
      team1.trim().toLowerCase() === team2.trim().toLowerCase() ? (
        <div className="relative z-10 w-full flex flex-col items-center justify-center text-center py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/15 px-3 py-1 rounded-full">
              Kênh / Sự kiện
            </span>
            {time && time !== "Trực tiếp" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-300 bg-white/10 px-2.5 py-1 rounded-full tabular-nums">
                <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>{time}</span>
              </span>
            )}
          </div>
          <h2 className="mt-2 text-base sm:text-xl md:text-2xl font-black text-white tracking-tight">
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

          // Phân tích số bàn thắng từ danh sách người ghi bàn đã parse
          const parsedHomeGoals = homeGoalScorers.reduce((acc, g) => acc + (g.times?.length || 1), 0);
          const parsedAwayGoals = awayGoalScorers.reduce((acc, g) => acc + (g.times?.length || 1), 0);

          const sHome = summary?.homeTeam?.score;
          const sAway = summary?.awayTeam?.score;
          const cHome = currentScore?.team1Score;
          const cAway = currentScore?.team2Score;

          // Luôn lấy tỷ số cao nhất/mới nhất giữa summary, currentScore và số bàn thắng đã ghi nhận từ sự kiện
          // Khắc phục triệt để lỗi tỷ số nhảy chậm hơn người ghi bàn
          const homeScoreVal = Math.max(
            typeof sHome === "number" && !isNaN(sHome) ? sHome : 0,
            typeof cHome === "number" && !isNaN(cHome) ? cHome : 0,
            parsedHomeGoals
          );

          const awayScoreVal = Math.max(
            typeof sAway === "number" && !isNaN(sAway) ? sAway : 0,
            typeof cAway === "number" && !isNaN(cAway) ? cAway : 0,
            parsedAwayGoals
          );

          const hasScore =
            (timeInfo.state === "live" ||
              timeInfo.state === "ht" ||
              timeInfo.state === "ft" ||
              isFinished ||
              homeScoreVal > 0 ||
              awayScoreVal > 0) &&
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
            <div className="relative z-10 flex flex-col gap-2 sm:gap-3 md:gap-3.5 w-full min-w-0">
              {/* HÀNG TRÊN: GIẢI ĐẤU (CĂN GIỮA THOÁNG ĐÃNG, KHÔNG LÀM HẸP KHÔNG GIAN 2 ĐỘI) */}
              {displayTournament && (
                <div className="flex items-center justify-center gap-1.5 pb-0.5 select-none text-center">
                  <span className="inline-flex items-center gap-1.5 text-zinc-400 text-xs sm:text-[13px] font-semibold">
                    <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>{displayTournament}</span>
                  </span>
                </div>
              )}

              {/* HÀNG CHÍNH: BẢNG TỶ SỐ CHUẨN TRUYỀN HÌNH - ĐỐI XỨNG CÂN ĐỐI TUYỆT ĐỐI 50/50 */}
              <div className="flex items-center justify-between w-full min-w-0">
                {/* ĐỘI NHÀ (CỘT TRÁI - 50% CHIỀU RỘNG TRỪ PHẦN TỶ SỐ) */}
                <div className="flex-1 min-w-0 flex items-center justify-end gap-2 sm:gap-3 md:gap-4 pr-3 sm:pr-4 md:pr-6 text-right">
                  <span
                    className="text-xs sm:text-base md:text-lg lg:text-xl font-black text-white tracking-tight truncate block"
                    title={homeDisplayName}
                  >
                    {homeDisplayName}
                  </span>

                  <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center shrink-0">
                    {homeFlagEmoji ? (
                      <CountryFlag
                        emoji={homeFlagEmoji}
                        className="w-7 h-7 sm:w-9 sm:h-9"
                      />
                    ) : homeLogoSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={homeLogoSrc}
                        src={homeLogoSrc}
                        alt={homeDisplayName}
                        className="w-full h-full object-contain filter drop-shadow select-none"
                        onError={handleHomeImgError}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs sm:text-sm font-bold select-none">
                        {getTeamInitials(team1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* TỶ SỐ / VS: CHÍNH GIỮA TUYỆT ĐỐI (50.0%) */}
                <div className="shrink-0 flex flex-col items-center justify-center min-w-[76px] sm:min-w-[100px] md:min-w-[120px] select-none px-1 sm:px-2">
                  {hasScore ? (
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 font-sans text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-wider tabular-nums leading-none drop-shadow-sm">
                      <span>{homeScoreVal}</span>
                      <span className="text-zinc-600 font-light select-none px-0.5">
                        :
                      </span>
                      <span>{awayScoreVal}</span>
                    </div>
                  ) : (
                    <span className="text-xs sm:text-base md:text-lg font-bold uppercase tracking-widest text-zinc-400 leading-none select-none">
                      VS
                    </span>
                  )}

                  <div className="mt-2 sm:mt-2.5 flex items-center justify-center gap-1.5 text-center leading-none">
                    {timeInfo.state === "live" ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          <span>{timeInfo.clockBadge}</span>
                        </span>
                        {kickoffTime && (
                          <span className="text-zinc-400 text-[10px] sm:text-[11px] font-sans tabular-nums hidden sm:inline">
                            • {kickoffTime}
                          </span>
                        )}
                      </>
                    ) : timeInfo.state === "ht" ? (
                      <span className="text-[10.5px] sm:text-xs font-bold text-amber-300">
                        HT
                      </span>
                    ) : timeInfo.state === "ft" ? (
                      <span className="text-[10.5px] sm:text-xs font-bold text-zinc-400">
                        FT
                      </span>
                    ) : timeInfo.state === "upcoming" ? (
                      <span className="text-[11px] sm:text-xs font-sans font-bold text-amber-400 tabular-nums">
                        {kickoffTime || "Sắp đá"}
                      </span>
                    ) : timeInfo.state === "special" ? (
                      <span className="text-[10.5px] sm:text-xs font-bold text-amber-300">
                        {timeInfo.clockBadge}
                      </span>
                    ) : (
                      kickoffTime && (
                        <span className="text-[10.5px] sm:text-xs font-sans text-zinc-400 font-medium tabular-nums">
                          {kickoffTime}
                        </span>
                      )
                    )}

                    {timeInfo.state === "live" &&
                      currentScore?.statusDetail &&
                      currentScore.statusDetail !== currentScore.displayClock &&
                      currentScore.statusDetail !== "In Progress" && (
                        <span className="text-[9.5px] sm:text-[10px] text-amber-300/90 font-medium hidden sm:inline-block">
                          • {currentScore.statusDetail}
                        </span>
                      )}
                  </div>
                </div>

                {/* ĐỘI KHÁCH (CỘT PHẢI - 50% CHIỀU RỘNG TRỪ PHẦN TỶ SỐ) */}
                <div className="flex-1 min-w-0 flex items-center justify-start gap-2.5 sm:gap-3.5 md:gap-4 pl-3 sm:pl-4 md:pl-6 text-left">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center shrink-0">
                    {awayFlagEmoji ? (
                      <CountryFlag
                        emoji={awayFlagEmoji}
                        className="w-7 h-7 sm:w-9 sm:h-9"
                      />
                    ) : awayLogoSrc ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={awayLogoSrc}
                        src={awayLogoSrc}
                        alt={awayDisplayName}
                        className="w-full h-full object-contain filter drop-shadow select-none"
                        onError={handleAwayImgError}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs sm:text-sm font-bold select-none">
                        {getTeamInitials(team2)}
                      </span>
                    )}
                  </div>

                  <span
                    className="text-xs sm:text-base md:text-lg lg:text-xl font-black text-white tracking-tight truncate block"
                    title={awayDisplayName}
                  >
                    {awayDisplayName}
                  </span>
                </div>
              </div>

              {/* DẢI NGƯỜI GHI BÀN - ĐỐI XỨNG CÂN ĐỐI TUYỆT ĐỐI */}
              {hasGoalScorers && (
                <div className="flex items-center justify-between w-full min-w-0 pt-2 sm:pt-2.5 text-[10.5px] sm:text-xs text-zinc-300">
                  <div className="flex-1 min-w-0 flex items-center justify-end pr-3 sm:pr-4 md:pr-6 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 min-w-0">
                      {homeGoalScorers.map((scorer, idx) => (
                        <span
                          key={`h-${idx}`}
                          className="inline-flex items-center gap-1.5 text-zinc-200"
                        >
                          <FotmobSoccerBallIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 opacity-80" />
                          <span
                            className="font-medium text-white truncate max-w-[120px] sm:max-w-[180px]"
                            title={scorer.playerName}
                          >
                            {scorer.playerName}
                          </span>
                          <span className="font-sans tabular-nums font-semibold text-amber-400 text-[10.5px] sm:text-xs shrink-0">
                            {scorer.times.join(", ")}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-center min-w-[76px] sm:min-w-[100px] md:min-w-[120px]">
                    {homeGoalScorers.length > 0 && awayGoalScorers.length > 0 ? (
                      <span className="text-zinc-700 select-none text-xs leading-none">
                        |
                      </span>
                    ) : (
                      <span className="w-2" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex items-center justify-start pl-3 sm:pl-4 md:pl-6 text-left">
                    <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 min-w-0">
                      {awayGoalScorers.map((scorer, idx) => (
                        <span
                          key={`a-${idx}`}
                          className="inline-flex items-center gap-1.5 text-zinc-200"
                        >
                          <FotmobSoccerBallIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0 opacity-80" />
                          <span
                            className="font-medium text-white truncate max-w-[120px] sm:max-w-[180px]"
                            title={scorer.playerName}
                          >
                            {scorer.playerName}
                          </span>
                          <span className="font-sans tabular-nums font-semibold text-amber-400 text-[10.5px] sm:text-xs shrink-0">
                            {scorer.times.join(", ")}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DẢI THÔNG TIN SÂN VẬN ĐỘNG, TRỌNG TÀI & KHÁN GIẢ (METADATA STRIP) */}
              {(() => {
                const effectiveVenue = venueName || summary?.gameInfo?.venue?.name;
                const effectiveReferee = refereeName || summary?.gameInfo?.referee;
                const attendance = summary?.gameInfo?.attendance;

                if (!effectiveVenue && !effectiveReferee && (!attendance || attendance <= 0)) {
                  return null;
                }

                return (
                  <div className="flex items-center justify-center gap-x-4 gap-y-1.5 text-[10.5px] sm:text-[11.5px] text-zinc-400 font-sans pt-2 sm:pt-2.5 border-t border-white/[0.04] mt-1 sm:mt-1.5 flex-wrap">
                    {effectiveVenue && (
                      <span className="inline-flex items-center gap-1.5 truncate max-w-[220px] sm:max-w-[320px]">
                        <MapPin className="w-3.5 h-3.5 text-rose-400/80 shrink-0" />
                        <span className="truncate text-zinc-300 font-medium">{effectiveVenue}</span>
                      </span>
                    )}
                    {effectiveReferee && (
                      <span className="inline-flex items-center gap-1">
                        {effectiveVenue && <span className="text-zinc-600 hidden sm:inline">•</span>}
                        <span className="text-zinc-400">
                          Trọng tài: <strong className="text-zinc-200 font-semibold">{effectiveReferee}</strong>
                        </span>
                      </span>
                    )}
                    {attendance && attendance > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-zinc-600 hidden sm:inline">•</span>
                        <Users className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
                        <span className="font-sans tabular-nums text-zinc-300">
                          {attendance.toLocaleString("vi-VN")} CĐV
                        </span>
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()
      )}
    </div>
  );
}

