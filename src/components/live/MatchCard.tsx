"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Play } from "lucide-react";
import { FootballMatch } from "@/services/liveFootballService";
import { LiveMatchScore } from "@/services/live/football-score/types";
import {
  getTeamAsset,
  getTeamInitials,
  isRawNumericOrArtifactTournament,
} from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";

interface MatchCardProps {
  match: FootballMatch;
  isSelected: boolean;
  onSelect: (match: FootballMatch) => void;
  score?: LiveMatchScore | null;
}

function formatKickoffTime(timestamp?: number | null): string | null {
  if (
    timestamp === undefined ||
    timestamp === null ||
    timestamp <= 0 ||
    timestamp === Number.MAX_SAFE_INTEGER
  ) {
    return null;
  }
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(d);
  } catch {
    return null;
  }
}

function getSportIcon(sport?: string): string {
  if (sport === "basketball") return "🏀";
  if (sport === "tennis") return "🎾";
  if (sport === "f1" || sport === "motorsport") return "🏎️";
  if (sport === "boxing") return "🥊";
  if (sport === "esports") return "🎮";
  if (sport === "billiards") return "🎱";
  if (sport === "volleyball") return "🏐";
  if (sport === "badminton") return "🏸";
  if (sport === "football") return "⚽";
  return "🏆";
}

/**
 * Hiển thị cờ quốc gia dạng đồ họa vector chuẩn quốc tế
 * Giải quyết triệt để vấn đề Windows hiển thị ký tự mã ISO (SD, SS, TZ...) thay vì cờ
 * Có fallback tự động về emoji text gốc
 */
function CountryFlag({ emoji, className = "" }: { emoji: string; className?: string }) {
  const [imgError, setImgError] = useState(false);

  const twemojiUrl = useMemo(() => {
    try {
      if (!emoji) return null;
      const cps: string[] = [];
      for (const char of emoji) {
        const cp = char.codePointAt(0);
        if (cp && cp !== 0xfe0f) {
          cps.push(cp.toString(16));
        }
      }
      const isFlag = cps.some((cp) => {
        const num = parseInt(cp, 16);
        return (num >= 0x1f1e6 && num <= 0x1f1ff) || num === 0x1f3f4;
      });
      if (!isFlag) return null;
      return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cps.join("-")}.svg`;
    } catch {
      return null;
    }
  }, [emoji]);

  if (twemojiUrl && !imgError) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={twemojiUrl}
        alt={emoji}
        className={`w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-md select-none inline-block ${className}`}
        onError={() => setImgError(true)}
        loading="lazy"
        crossOrigin="anonymous"
      />
    );
  }

  return (
    <span className={`text-2xl sm:text-3xl select-none leading-none drop-shadow-md ${className}`}>
      {emoji}
    </span>
  );
}

/** Fallback hiển thị chữ viết tắt của CLB / ĐTQG khi không có logo */
function TeamLogoFallback({
  initials,
  color = "rose",
}: {
  initials: string;
  color?: "rose" | "sky";
}) {
  const isSky = color === "sky";
  const displayInitials = initials && initials.trim() ? initials.trim() : "⚽";
  return (
    <div
      className={`w-full h-full rounded-xl flex items-center justify-center font-black select-none border transition-all ${
        isSky
          ? "bg-sky-950/60 border-sky-500/40 text-sky-300 shadow-sm"
          : "bg-rose-950/60 border-rose-500/40 text-rose-300 shadow-sm"
      }`}
    >
      <span
        className={`tracking-wider ${
          displayInitials.length > 2
            ? "text-[10px] sm:text-[11px]"
            : "text-xs sm:text-sm font-extrabold"
        }`}
      >
        {displayInitials}
      </span>
    </div>
  );
}

function MatchCardInner({ match, isSelected, onSelect, score }: MatchCardProps) {
  const currentScore = score || match.score || null;
  const hasScore = Boolean(
    currentScore &&
      (currentScore.status === "live" || currentScore.status === "finished"),
  );
  const [homeTriedAsset, setHomeTriedAsset] = useState(false);
  const [homeFailed, setHomeFailed] = useState(false);
  const [awayTriedAsset, setAwayTriedAsset] = useState(false);
  const [awayFailed, setAwayFailed] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Đặt lại trạng thái lỗi khi đổi trận đấu hoặc link logo
  useEffect(() => {
    setHomeTriedAsset(false);
    setHomeFailed(false);
    setAwayTriedAsset(false);
    setAwayFailed(false);
    setLogoError(false);
  }, [match.id, match.homeLogo, match.awayLogo, match.logo]);

  const isFhd = match.quality.includes("FHD");
  const isLive = match.timeline === "live";

  // Giờ đá chuẩn theo Asia/Ho_Chi_Minh (HH:mm)
  const kickoffTime = useMemo(
    () => formatKickoffTime(match.timestamp),
    [match.timestamp],
  );

  // Tự động phân giải 2 đội nếu match chưa tách team1, team2 hoặc isEvent bị đánh dấu nhầm
  const resolvedTeams = useMemo(() => {
    if (
      !match.isEvent &&
      match.team1 &&
      match.team2 &&
      match.team1.trim().toLowerCase() !== match.team2.trim().toLowerCase()
    ) {
      return { team1: match.team1.trim(), team2: match.team2.trim() };
    }

    const cleanT = (match.title || match.team1 || "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/^[🟢🔴⚪⚽🏀🎾🏐🏸🏒🥊🏎🏁🎱🎮\s]+/, "")
      .replace(/^\s*(?:(?:[012]?\d[:hH]\d{2}|\d{1,2})\s*)?(?:\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)?\s*/, "")
      .trim();

    const vsMatch = cleanT.match(/(.+?)\s+(?:vs|v|\bv\b)\s+(.+)/i);
    if (vsMatch) {
      const t1 = vsMatch[1].trim();
      const t2 = vsMatch[2].trim();
      if (t1 && t2 && t1.toLowerCase() !== t2.toLowerCase()) {
        return { team1: t1, team2: t2 };
      }
    }

    const hyphenMatch = cleanT.match(/(.+?)\s+-\s+(.+)/);
    if (hyphenMatch) {
      const t1 = hyphenMatch[1].trim();
      const t2 = hyphenMatch[2].trim();
      if (
        t1 &&
        t2 &&
        t1.toLowerCase() !== t2.toLowerCase() &&
        !t1.includes("TV") &&
        !t2.includes("TV") &&
        !t1.toLowerCase().includes("server") &&
        !t2.toLowerCase().includes("server")
      ) {
        return { team1: t1, team2: t2 };
      }
    }

    return null;
  }, [match.isEvent, match.team1, match.team2, match.title]);

  const isTwoTeamMatch = Boolean(resolvedTeams);
  const displayTeam1 = resolvedTeams?.team1 || match.team1 || "";
  const displayTeam2 = resolvedTeams?.team2 || match.team2 || "";

  // Tra cứu cờ quốc gia / logo CLB O(1) từ local mapping
  const homeAsset = useMemo(() => getTeamAsset(displayTeam1), [displayTeam1]);
  const awayAsset = useMemo(() => getTeamAsset(displayTeam2), [displayTeam2]);

  const validEventLogo =
    Boolean(match.logo || match.homeLogo) &&
    !match.logo?.includes("tinhlagi.pro/logo.jpg") &&
    !logoError;

  // Ưu tiên cờ quốc gia / emoji đặc thù (luôn hiển thị chuẩn, sắc nét, không bao giờ 404)
  const homeFlagEmoji = homeAsset?.emoji || null;
  const awayFlagEmoji = awayAsset?.emoji || null;

  // Chuỗi URL logo candidate:
  const rawHome =
    Boolean(match.homeLogo) &&
    !match.homeLogo?.includes("tinhlagi.pro/logo.jpg")
      ? match.homeLogo
      : null;
  const assetHome = homeAsset?.logo || null;

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

  const rawAway =
    Boolean(match.awayLogo) &&
    !match.awayLogo?.includes("tinhlagi.pro/logo.jpg")
      ? match.awayLogo
      : null;
  const assetAway = awayAsset?.logo || null;

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

  // Tổng hợp tên các đài phát (COLA TV, Gà Vàng...)
  const displayGroups =
    match.groups && match.groups.length > 0
      ? match.groups.map((g: string) => g.replace(/^[🔴🟢🟡⚪🟠\s]+/, "").trim())
      : [match.group.replace(/^[🔴🟢🟡⚪🟠\s]+/, "").trim()];

  const primaryGroup = displayGroups[0] || match.group;

  return (
    <div
      tabIndex={0}
      onClick={() => onSelect(match)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(match);
        }
      }}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 115px" }}
      className={`group relative rounded-xl sm:rounded-2xl border p-2 sm:p-2.5 md:p-3 cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden transform-gpu will-change-transform outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${isSelected
        ? "football-match-active bg-zinc-900 border-netflix-red shadow-lg shadow-red-950/60 ring-1 ring-netflix-red/50"
        : "football-match-card bg-zinc-900/90 border-white/10 hover:border-white/25 hover:bg-zinc-850/95 hover:shadow-lg hover:shadow-black/70"
        }`}
    >
      {/* Ambient glow khi trận đang diễn ra (Live) */}
      {isLive && (
        <div className="pointer-events-none absolute -top-8 -right-8 w-20 h-20 bg-red-600/15 rounded-full blur-2xl group-hover:bg-red-600/25 transition-all" />
      )}

      {/* 1. TOP HEADER: GIẢI ĐẤU & CHẤT LƯỢNG */}
      <div className="flex items-center justify-between gap-1.5 mb-1 sm:mb-1.5 relative z-10 w-full min-w-0">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium truncate flex items-center gap-1">
            <span>
              {match.tournament &&
              match.tournament !== "Kênh Thể Thao 24/7" &&
              !isRawNumericOrArtifactTournament(match.tournament)
                ? match.tournament
                : "🏆 Trực Tiếp Thể Thao"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`px-1.5 py-0.2 rounded text-[7.5px] sm:text-[8.5px] font-black uppercase tracking-wider border ${isFhd
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-sky-500/15 border-sky-500/30 text-sky-400"
              }`}
          >
            {isFhd ? "1080P" : "720P"}
          </span>
        </div>
      </div>

      {/* 2. MATCH ARENA: TRỰC QUAN 2 ĐỘI BÓNG ĐỐI ĐẦU HOẶC SỰ KIỆN */}
      {!isTwoTeamMatch ? (
        <div className="flex items-center gap-2 sm:gap-2.5 my-1 sm:my-1.5 relative z-10">
          {homeFlagEmoji ? (
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-zinc-800/90 border border-white/15 flex items-center justify-center shrink-0 shadow-md">
              <CountryFlag emoji={homeFlagEmoji} className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
          ) : validEventLogo ? (
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-b from-zinc-700/80 via-zinc-800/95 to-zinc-900 border border-white/20 overflow-hidden shrink-0 shadow-md p-1 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.16)_0%,_transparent_75%)] pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toDarkModeLogoUrl(match.logo || match.homeLogo)}
                alt=""
                className="w-full h-full object-contain filter drop-shadow-[0_0_1.5px_rgba(255,255,255,0.7)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] relative z-10"
                onError={() => setLogoError(true)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400 text-sm sm:text-base shadow-sm">
              {getSportIcon(match.sport)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              {hasScore && currentScore?.status === "live" ? (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[8px] sm:text-[8.5px] flex items-center gap-1 shadow-sm tracking-wider animate-pulse whitespace-nowrap shrink-0">
                  <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                  <span>{currentScore.displayClock ? `LIVE ${currentScore.displayClock}` : "LIVE"}</span>
                </span>
              ) : isLive ? (
                <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[8px] sm:text-[8.5px] flex items-center gap-1 shadow-sm tracking-wider animate-pulse whitespace-nowrap shrink-0">
                  <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                  <span>LIVE</span>
                </span>
              ) : hasScore && currentScore?.status === "finished" ? (
                <span className="px-1.5 py-0.2 rounded-full bg-zinc-700/80 border border-white/10 text-gray-300 font-bold text-[7.5px] sm:text-[8px] uppercase tracking-wider whitespace-nowrap shrink-0">
                  FT
                </span>
              ) : null}
              {hasScore && (
                <span className="text-[9px] sm:text-[9.5px] font-black font-mono px-1.5 py-0.2 rounded bg-zinc-800/90 border border-white/15 text-amber-400 whitespace-nowrap shrink-0 shadow-inner">
                  {currentScore?.team1Score} - {currentScore?.team2Score}
                </span>
              )}
              {kickoffTime && (
                <span className="text-[9px] sm:text-[9.5px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.2 rounded whitespace-nowrap shrink-0">
                  🕐 {kickoffTime}
                </span>
              )}
            </div>
            <strong className="text-[11px] sm:text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition leading-snug">
              {match.title || match.team1}
            </strong>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-1.5 my-1 sm:my-1.5 relative z-10 w-full min-w-0">
          {/* ĐỘI NHÀ (CỘT TRÁI - 50% CÂN ĐỐI) */}
          <div className="flex flex-col items-center justify-center text-center min-w-0 w-full group/team">
            <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-b from-zinc-700/80 via-zinc-800/95 to-zinc-900 border border-white/20 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.16)_0%,_transparent_75%)] pointer-events-none" />
              {homeFlagEmoji ? (
                <CountryFlag emoji={homeFlagEmoji} className="w-6 h-6 sm:w-8 sm:h-8 relative z-10" />
              ) : homeLogoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={homeLogoSrc}
                  src={homeLogoSrc}
                  alt=""
                  className="w-full h-full object-contain filter drop-shadow-[0_0_1.5px_rgba(255,255,255,0.7)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] relative z-10"
                  onError={handleHomeImgError}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <TeamLogoFallback initials={getTeamInitials(displayTeam1)} color="rose" />
              )}
            </div>
            <span
              className="mt-1 text-[10.5px] sm:text-xs font-extrabold text-white truncate leading-tight group-hover:text-rose-400 transition-colors duration-200 w-full px-0.5 block text-center"
              title={displayTeam1}
            >
              {displayTeam1}
            </span>
          </div>

          {/* TRUNG TÂM MATCHUP: TỶ SỐ HOẶC VS & GIỜ ĐÁ (CỘT GIỮA TRỤC TÂM) */}
          <div className="shrink-0 flex flex-col items-center justify-center px-0.5 text-center min-w-[50px] sm:min-w-[62px]">
            {hasScore ? (
              <>
                {currentScore?.status === "live" ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[7.5px] sm:text-[8.5px] flex items-center gap-0.5 shadow-md animate-pulse tracking-wider whitespace-nowrap shrink-0">
                    <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                    <span>{currentScore.displayClock ? `LIVE ${currentScore.displayClock}` : "LIVE"}</span>
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-700/80 border border-white/10 text-gray-300 font-bold text-[7px] sm:text-[8px] uppercase tracking-wider whitespace-nowrap shrink-0">
                    FT
                  </span>
                )}

                <span
                  className={`mt-0.5 px-1.5 py-0.2 rounded border font-mono tracking-wider text-[10px] sm:text-[11.5px] font-black shadow-inner whitespace-nowrap ${
                    currentScore?.status === "live"
                      ? "bg-zinc-800/90 border-red-500/30 text-amber-400"
                      : "bg-zinc-800/70 border-white/10 text-gray-200"
                  }`}
                >
                  {currentScore?.team1Score} - {currentScore?.team2Score}
                </span>

                {currentScore?.status === "live" &&
                currentScore.statusDetail &&
                currentScore.statusDetail !== currentScore.displayClock &&
                currentScore.statusDetail !== "In Progress" ? (
                  <span className="mt-0.5 text-[7px] sm:text-[8px] font-bold text-amber-300/90 tracking-tight whitespace-nowrap">
                    {currentScore.statusDetail}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                {isLive ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black text-[7.5px] sm:text-[8.5px] flex items-center gap-0.5 shadow-md animate-pulse tracking-wider whitespace-nowrap shrink-0">
                    <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                    <span>LIVE</span>
                  </span>
                ) : null}

                <span className="mt-0.5 px-1 py-0.2 rounded-full bg-white/5 border border-white/10 text-[7.5px] sm:text-[8.5px] font-black text-rose-400/90 font-mono tracking-widest">
                  VS
                </span>

                {kickoffTime && (
                  <span className="mt-0.5 px-1.5 py-0.2 rounded bg-white/10 border border-white/10 text-[8px] sm:text-[9px] font-bold text-gray-200 tracking-tight whitespace-nowrap">
                    🕐 {kickoffTime}
                  </span>
                )}
              </>
            )}
          </div>

          {/* ĐỘI KHÁCH (CỘT PHẢI - 50% CÂN ĐỐI) */}
          <div className="flex flex-col items-center justify-center text-center min-w-0 w-full group/team">
            <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-b from-zinc-700/80 via-zinc-800/95 to-zinc-900 border border-white/20 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.16)_0%,_transparent_75%)] pointer-events-none" />
              {awayFlagEmoji ? (
                <CountryFlag emoji={awayFlagEmoji} className="w-6 h-6 sm:w-8 sm:h-8 relative z-10" />
              ) : awayLogoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={awayLogoSrc}
                  src={awayLogoSrc}
                  alt=""
                  className="w-full h-full object-contain filter drop-shadow-[0_0_1.5px_rgba(255,255,255,0.7)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] relative z-10"
                  onError={handleAwayImgError}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <TeamLogoFallback initials={getTeamInitials(displayTeam2)} color="sky" />
              )}
            </div>
            <span
              className="mt-1 text-[10.5px] sm:text-xs font-extrabold text-white truncate leading-tight group-hover:text-sky-400 transition-colors duration-200 w-full px-0.5 block text-center"
              title={displayTeam2 || "Đối thủ"}
            >
              {displayTeam2 || "Đối thủ"}
            </span>
          </div>
        </div>
      )}

      {/* 3. FOOTER: BLV & SỐ LƯỢNG NGUỒN PHÁT */}
      <div className="flex items-center justify-between gap-1.5 pt-1 sm:pt-1.5 mt-0.5 border-t border-white/5 text-[9px] sm:text-[10px] relative z-10 text-gray-400">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {match.blv ? (
            <span
              className="text-rose-400 font-medium flex items-center gap-1 min-w-0 truncate"
              title={`BLV: ${match.blv}`}
            >
              <span className="shrink-0 text-[10px]">🎙️</span>
              <span className="truncate">
                {(() => {
                  const rawBlvs = match.blv
                    .split(",")
                    .map((b: string) => b.trim().replace(/^(?:blv|bình luận viên)\s+/i, ""))
                    .filter(Boolean);
                  if (rawBlvs.length === 0) return primaryGroup;
                  if (rawBlvs.length <= 2) return `BLV ${rawBlvs.join(", ")}`;
                  return `BLV ${rawBlvs.slice(0, 2).join(", ")} (+${rawBlvs.length - 2})`;
                })()}
              </span>
            </span>
          ) : (
            <span className="text-gray-400 flex items-center gap-1 min-w-0 truncate">
              <span className="shrink-0">{getSportIcon(match.sport)}</span>
              <span className="truncate">{primaryGroup}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-gray-300 font-semibold flex items-center gap-1 text-[9px] sm:text-[9.5px] bg-white/5 px-1.5 py-0.2 rounded border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{match.servers.length} nguồn</span>
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-netflix-red text-white p-0.5 rounded-full shadow-sm">
            <Play className="w-2 h-2 fill-current" />
          </span>
        </div>
      </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
