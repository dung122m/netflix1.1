"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Clock, Calendar } from "lucide-react";
import type { FootballMatch, StreamServer } from "@/services/live/football/service";
import type {
  LiveMatchScore,
  NormalizedMatchSummary,
} from "@/services/live/football-score/types";
import type { GroupedGoalScorer } from "@/services/live/football-score/goalScorersParser";
import type { resolveMatchTimeInfo } from "@/services/live/football-score/liveStatus";
import {
  getTeamAsset,
  getTeamInitials,
  resolveEsportsTeam,
} from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";
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
function StadiumIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="6" width="20" height="12" rx="6" />
      <path d="M7 6v12M17 6v12M2 12h20" opacity="0.45" />
    </svg>
  );
}

function formatMatchDateTime(
  ts?: number,
  kickoffTime?: string | null,
  timeStr?: string
): string | null {
  if (ts && !isNaN(ts) && ts > 0 && ts < Number.MAX_SAFE_INTEGER) {
    try {
      const d = new Date(ts);
      const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const dayOfWeek = days[d.getDay()];
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${dayOfWeek}, ${day} tháng ${month}, ${hours}:${mins}`;
    } catch {
      // fallback
    }
  }
  if (kickoffTime) {
    return kickoffTime;
  }
  if (timeStr && timeStr !== "Trực tiếp") {
    return timeStr;
  }
  return null;
}

export function LiveMatchScoreboard({
  match,
  title,
  blv: _blv,
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
  refereeName: _refereeName,
  homeGoalScorers,
  awayGoalScorers,
  currentServer: _currentServer,
  currentAvailableIdx: _currentAvailableIdx,
  selectedServerIndex: _selectedServerIndex,
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

  const effectiveVenue = venueName || summary?.gameInfo?.venue?.name;
  const matchDateStr = useMemo(
    () => formatMatchDateTime(match?.timestamp, kickoffTime, time),
    [match?.timestamp, kickoffTime, time]
  );

  const homeRedCards =
    summary?.events?.filter(
      (e) =>
        e.type === "red-card" &&
        (e.homeAway === "home" || (summary.homeTeam?.id && e.teamId === summary.homeTeam.id))
    ).length || 0;

  const awayRedCards =
    summary?.events?.filter(
      (e) =>
        e.type === "red-card" &&
        (e.homeAway === "away" || (summary.awayTeam?.id && e.teamId === summary.awayTeam.id))
    ).length || 0;

  return (
    <div className="relative rounded-2xl bg-zinc-950/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/80 overflow-hidden w-full min-w-0">
      {isEvent ||
      !team1 ||
      !team2 ||
      team1.trim().toLowerCase() === team2.trim().toLowerCase() ? (
        <div className="relative z-10 w-full flex flex-col items-center justify-center text-center py-3 px-4">
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
          <h2 className="mt-1.5 text-base sm:text-xl md:text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
        </div>
      ) : (
        (() => {
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

          return (
            <div className="relative z-10 flex flex-col w-full min-w-0">
              {/* 1. THANH HEADER: NGÀY GIỜ & SÂN VẬN ĐỘNG (CHUẨN THEO THIẾT KẾ MẪU) */}
              {(matchDateStr || effectiveVenue) && (
                <div className="flex items-center justify-center gap-4 sm:gap-6 py-2 px-3 sm:px-6 text-xs text-zinc-400 font-sans border-b border-white/[0.08] select-none text-center">
                  {matchDateStr && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{matchDateStr}</span>
                    </span>
                  )}
                  {effectiveVenue && (
                    <span className="inline-flex items-center gap-1.5">
                      <StadiumIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{effectiveVenue}</span>
                    </span>
                  )}
                </div>
              )}

              {/* 2. PHẦN CHÍNH BẢNG TỶ SỐ: ĐỘI NHÀ -> LOGO -> TỶ SỐ -> LOGO -> ĐỘI KHÁCH */}
              <div className="py-2.5 px-3 sm:py-3.5 sm:px-6 flex flex-col gap-1.5 w-full min-w-0">
                <div className="flex items-center justify-between w-full min-w-0">
                  {/* ĐỘI NHÀ (CỘT TRÁI - 50% CHIỀU RỘNG TRỪ PHẦN TỶ SỐ) */}
                  <div className="flex-1 min-w-0 flex items-center justify-end gap-2.5 sm:gap-3 md:gap-4 pr-3 sm:pr-4 md:pr-6 text-right">
                    <span
                      className="text-xs sm:text-base md:text-lg lg:text-xl font-bold text-white tracking-tight truncate block"
                      title={homeDisplayName}
                    >
                      {homeDisplayName}
                    </span>

                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center shrink-0">
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
                        <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs sm:text-sm font-bold select-none">
                          {getTeamInitials(team1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TỶ SỐ / VS: CHÍNH GIỮA (ĐỐI XỨNG CÂN BẰNG TUYỆT ĐỐI QUANH DẤU -) */}
                  <div className="shrink-0 flex flex-col items-center justify-center min-w-[90px] sm:min-w-[110px] md:min-w-[130px] select-none px-1 sm:px-2">
                    {hasScore ? (
                      <div className="flex items-center justify-center w-full font-sans text-2xl sm:text-3xl md:text-4xl font-bold text-white tabular-nums leading-none">
                        {/* Điểm đội nhà + thẻ đỏ (Căn phải sát dấu -) */}
                        <div className="flex-1 min-w-[38px] sm:min-w-[46px] flex items-center justify-end gap-1.5">
                          {homeRedCards > 0 && (
                            <span
                              title={`${homeRedCards} thẻ đỏ`}
                              className="w-1.5 h-2.5 sm:w-2 sm:h-3 rounded-[1px] bg-[#e03a3e] shrink-0 inline-block drop-shadow-sm"
                            />
                          )}
                          <span>{homeScoreVal}</span>
                        </div>

                        {/* Dấu gạch ngang: NẰM CHÍNH GIỮA 50.0% */}
                        <span className="shrink-0 text-zinc-400 font-light select-none px-1.5 sm:px-2 text-center">
                          -
                        </span>

                        {/* Điểm đội khách + thẻ đỏ (Căn trái sát dấu -) */}
                        <div className="flex-1 min-w-[38px] sm:min-w-[46px] flex items-center justify-start gap-1.5">
                          <span>{awayScoreVal}</span>
                          {awayRedCards > 0 && (
                            <span
                              title={`${awayRedCards} thẻ đỏ`}
                              className="w-1.5 h-2.5 sm:w-2 sm:h-3 rounded-[1px] bg-[#e03a3e] shrink-0 inline-block drop-shadow-sm"
                            />
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-base md:text-lg font-bold uppercase tracking-widest text-zinc-400 leading-none select-none">
                        VS
                      </span>
                    )}

                    {/* DÒNG PHÚT/TRẠNG THÁI: NẰM CHÍNH GIỮA 50.0% THẲNG HÀNG DƯỚI DẤU - */}
                    <div className="mt-1 sm:mt-1.5 flex items-center justify-center text-center w-full leading-none">
                      {timeInfo.state === "live" ? (
                        <span className="text-xs sm:text-[13px] font-bold text-emerald-400 font-sans tabular-nums text-center">
                          {timeInfo.clockBadge}
                        </span>
                      ) : timeInfo.state === "ht" ? (
                        <span className="text-xs sm:text-[13px] font-bold text-amber-300 font-sans text-center">
                          HT
                        </span>
                      ) : timeInfo.state === "ft" ? (
                        <span className="text-xs sm:text-[13px] font-bold text-zinc-400 font-sans text-center">
                          FT
                        </span>
                      ) : timeInfo.state === "upcoming" ? (
                        <span className="text-xs sm:text-[13px] font-semibold text-zinc-400 font-sans tabular-nums text-center">
                          {kickoffTime || "Sắp đá"}
                        </span>
                      ) : timeInfo.state === "special" ? (
                        <span className="text-xs sm:text-[13px] font-bold text-amber-300 font-sans text-center">
                          {timeInfo.clockBadge}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-[13px] font-semibold text-zinc-400 font-sans tabular-nums text-center">
                          {kickoffTime || ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ĐỘI KHÁCH (CỘT PHẢI - 50% CHIỀU RỘNG TRỪ PHẦN TỶ SỐ) */}
                  <div className="flex-1 min-w-0 flex items-center justify-start gap-2.5 sm:gap-3 md:gap-4 pl-3 sm:pl-4 md:pl-6 text-left">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center shrink-0">
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
                        <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs sm:text-sm font-bold select-none">
                          {getTeamInitials(team2)}
                        </span>
                      )}
                    </div>

                    <span
                      className="text-xs sm:text-base md:text-lg lg:text-xl font-bold text-white tracking-tight truncate block"
                      title={awayDisplayName}
                    >
                      {awayDisplayName}
                    </span>
                  </div>
                </div>

                {/* DẢI NGƯỜI GHI BÀN GỌN GÀNG (NẾU CÓ) */}
                {hasGoalScorers && (
                  <div className="flex items-center justify-between w-full min-w-0 pt-1.5 text-[10.5px] sm:text-xs text-zinc-300 border-t border-white/[0.04] mt-1">
                    <div className="flex-1 min-w-0 flex items-center justify-end pr-3 sm:pr-4 md:pr-6 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-x-2.5 sm:gap-x-3 gap-y-0.5 min-w-0">
                        {homeGoalScorers.map((scorer, idx) => (
                          <span
                            key={`h-${idx}`}
                            className="inline-flex items-center gap-1 text-zinc-200"
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
                      <div className="flex flex-wrap items-center justify-start gap-x-2.5 sm:gap-x-3 gap-y-0.5 min-w-0">
                        {awayGoalScorers.map((scorer, idx) => (
                          <span
                            key={`a-${idx}`}
                            className="inline-flex items-center gap-1 text-zinc-200"
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
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

