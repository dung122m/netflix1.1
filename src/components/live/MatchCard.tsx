"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Play, Clock, Star } from "lucide-react";
import { FootballMatch } from "@/services/liveFootballService";
import { LiveMatchScore } from "@/services/live/football-score/types";
import {
  getTeamAsset,
  getTeamInitials,
} from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";
import {
  resolveMatchDisplayStatus,
} from "@/services/live/football-score/liveStatus";
import { resolveCanonicalTournament } from "@/services/live/football-score/canonicalLeagues";
import { isFeaturedMatch } from "@/services/live/football/featuredMatch";
import { toCanonicalSourceUrl } from "./LivePlayer";
import { isOffensiveCommentatorName } from "@/services/live/football/service";

interface MatchCardProps {
  match: FootballMatch;
  isSelected: boolean;
  onSelect: (match: FootballMatch) => void;
  score?: LiveMatchScore | null;
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
 * Hiển thị cờ quốc gia dạng đồ họa vector Twemoji chuẩn quốc tế
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
        className={`w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-sm select-none inline-block ${className}`}
        onError={() => setImgError(true)}
        loading="lazy"
        crossOrigin="anonymous"
      />
    );
  }

  return (
    <span className={`text-lg sm:text-xl select-none leading-none drop-shadow-sm ${className}`}>
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
      className={`w-full h-full rounded-lg flex items-center justify-center font-extrabold select-none border transition-all ${
        isSky
          ? "bg-sky-950/70 border-sky-500/30 text-sky-300"
          : "bg-rose-950/70 border-rose-500/30 text-rose-300"
      }`}
    >
      <span className="text-[10px] sm:text-[11px] tracking-tight">
        {displayInitials}
      </span>
    </div>
  );
}

function sanitizeDisplayName(name?: string): string {
  if (!name) return "";
  return name.toWellFormed().replace(/\uFFFD+/g, " ").trim();
}

function MatchCardInner({ match, isSelected, onSelect, score }: MatchCardProps) {
  const currentScore = score || match.score || null;
  const displayStatus = useMemo(
    () =>
      resolveMatchDisplayStatus({
        timestamp: currentScore?.kickoffTimestamp || match.timestamp,
        score: currentScore,
        sourceStatus: match.sourceStatus,
      }),
    [match.timestamp, currentScore, match.sourceStatus],
  );

  const isConfirmedLive =
    displayStatus.isConfirmedLive ||
    match.timeline === "live" ||
    match.realStatus === "live" ||
    match.sourceStatus === "live" ||
    match.isLive === true ||
    (Boolean(match.group) && /trực tiếp/i.test(match.group) && Boolean(match.servers && match.servers.length > 0));

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
  const liveBadgeLabel =
    displayStatus.isConfirmedLive && displayStatus.badgeLabel && !displayStatus.badgeLabel.includes(":")
      ? displayStatus.badgeLabel
      : (match.time && !match.time.includes(":") ? `${match.time}'` : "TRỰC TIẾP");

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

  const isFhd = useMemo(() => {
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

  const homeAsset = useMemo(
    () => (displayTeam1 ? getTeamAsset(displayTeam1) : null),
    [displayTeam1],
  );
  const awayAsset = useMemo(
    () => (displayTeam2 ? getTeamAsset(displayTeam2) : null),
    [displayTeam2],
  );

  const homeFlagEmoji = homeAsset?.emoji || null;
  const awayFlagEmoji = awayAsset?.emoji || null;

  const rawHome =
    match.homeLogo &&
    match.homeLogo !== "https://img.gavang.net/placeholder.png" &&
    !match.homeLogo.includes("tinhlagi.pro/logo.jpg")
      ? match.homeLogo
      : null;
  const assetHome = homeAsset?.logo || null;
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
  const assetAway = awayAsset?.logo || null;
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
      ? match.groups.map((g: string) => g.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim())
      : [match.group.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim()];

  const primaryGroup = displayGroups[0] || match.group;

  const tournamentName = useMemo(() => {
    return resolveCanonicalTournament({
      tournament: match.tournament,
      title: match.title,
      sport: match.sport,
      team1: match.team1,
      team2: match.team2,
      score: currentScore,
    });
  }, [match.tournament, match.title, match.sport, match.team1, match.team2, currentScore]);

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
    currentScore,
    validUniqueServersCount,
    match.servers,
  ]);

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
      className={`group relative rounded-xl border cursor-pointer transition-all duration-150 flex flex-col justify-between overflow-hidden outline-none select-none ${
        isSelected
          ? "bg-zinc-900/95 border-red-500/60 shadow-[0_4px_20px_rgba(229,9,20,0.2)] border-l-[3.5px] border-l-netflix-red"
          : featured.isFeatured
          ? "bg-gradient-to-br from-zinc-900/90 via-amber-950/15 to-zinc-900/80 hover:bg-zinc-850/95 border-amber-500/35 hover:border-amber-400/60 shadow-[0_2px_10px_rgba(245,158,11,0.06)]"
          : isConfirmedLive
          ? "bg-zinc-900/70 hover:bg-zinc-850/90 border-white/[0.08] hover:border-red-500/30 shadow-sm"
          : "bg-zinc-900/50 hover:bg-zinc-850/80 border-white/[0.06] hover:border-white/15"
      }`}
    >
      {/* Ambient glow nhẹ tinh tế khi đang chọn xem */}
      {isSelected && (
        <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full blur-2xl transition-all bg-red-600/15" />
      )}

      <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1 gap-1">
        {/* 1. HEADER: GIẢI ĐẤU, BADGE TÂM ĐIỂM & TRẠNG THÁI THỜI GIAN THỰC (TINH GỌN) */}
        <div className="flex items-center justify-between gap-1.5 pb-1 mb-1 border-b border-white/[0.06] text-xs">
          {/* Tên giải đấu & Badge Tâm Điểm */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-zinc-300 text-[11px] sm:text-xs font-medium truncate flex items-center gap-1">
              <span>{getSportIcon(match.sport)}</span>
              <span className="truncate">{tournamentName}</span>
            </span>

            {/* Badge Trận Cầu Tâm Điểm */}
            {featured.isFeatured && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm shrink-0"
                title={featured.badgeLabel || "Trận cầu tâm điểm"}
              >
                <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                <span>{featured.badgeLabel || "TÂM ĐIỂM"}</span>
              </span>
            )}
          </div>

          {/* Trạng thái trận & huy hiệu (luôn hiển thị chuẩn trạng thái thi đấu thực) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isConfirmedLive ? (
              <div className="flex items-center gap-1.5">
                {kickoffTime && (
                  <span className="text-[11px] sm:text-xs font-mono text-zinc-200 font-semibold">
                    {kickoffTime}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black uppercase bg-red-950/70 border border-red-500/40 text-red-300 shadow-sm tracking-wider whitespace-nowrap">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  <span>{liveBadgeLabel}</span>
                </span>
              </div>
            ) : isFinished ? (
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-white/15 text-zinc-300 font-bold text-[11px] sm:text-xs uppercase whitespace-nowrap">
                FT
              </span>
            ) : specialStatusLabel ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/35 text-amber-300 font-bold text-[11px] sm:text-xs whitespace-nowrap">
                {specialStatusLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/35 text-sky-300 font-bold text-[11px] sm:text-xs whitespace-nowrap shadow-sm">
                <Clock className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                <span>{kickoffTime || "Sắp phát"}</span>
              </span>
            )}

            {isFhd && (
              <span className="px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                1080P
              </span>
            )}
          </div>
        </div>

      {/* 2. BODY SCOREBOARD: 2 HÀNG ĐỘI BÓNG SIÊU NÉT, GỌN GÀNG */}
      {isTwoTeamMatch ? (
        <div className="space-y-1.5 py-0.5">
          {/* HÀNG 1: ĐỘI NHÀ */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Logo / Cờ đội nhà */}
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-zinc-800/90 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {homeFlagEmoji ? (
                  <CountryFlag emoji={homeFlagEmoji} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : homeLogoSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={homeLogoSrc}
                    src={homeLogoSrc}
                    alt=""
                    className="w-full h-full object-contain filter drop-shadow-sm"
                    onError={handleHomeImgError}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <TeamLogoFallback initials={getTeamInitials(displayTeam1)} color="rose" />
                )}
              </div>

              {/* Tên đội nhà */}
              <span
                className={`text-xs sm:text-[13px] truncate transition-colors ${
                  isSelected
                    ? "text-white font-black drop-shadow-sm"
                    : "text-zinc-100 font-bold group-hover:text-white"
                }`}
                title={displayTeam1}
              >
                {displayTeam1}
              </span>
            </div>

            {/* Tỷ số đội nhà */}
            {(isConfirmedLive || isFinished) && currentScore?.team1Score !== undefined ? (
              <span
                className={`font-mono text-[13px] sm:text-sm font-black px-2 py-0.5 rounded shrink-0 ${
                  isSelected
                    ? "text-amber-300 bg-amber-500/20 border border-amber-400/40 shadow-sm"
                    : isConfirmedLive
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    : "text-white bg-white/5"
                }`}
              >
                {currentScore.team1Score}
              </span>
            ) : null}
          </div>

          {/* HÀNG 2: ĐỘI KHÁCH */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {/* Logo / Cờ đội khách */}
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-zinc-800/90 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {awayFlagEmoji ? (
                  <CountryFlag emoji={awayFlagEmoji} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : awayLogoSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={awayLogoSrc}
                    src={awayLogoSrc}
                    alt=""
                    className="w-full h-full object-contain filter drop-shadow-sm"
                    onError={handleAwayImgError}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <TeamLogoFallback initials={getTeamInitials(displayTeam2)} color="sky" />
                )}
              </div>

              {/* Tên đội khách */}
              <span
                className={`text-xs sm:text-[13px] truncate transition-colors ${
                  isSelected
                    ? "text-white font-black drop-shadow-sm"
                    : "text-zinc-100 font-bold group-hover:text-white"
                }`}
                title={displayTeam2}
              >
                {displayTeam2}
              </span>
            </div>

            {/* Tỷ số đội khách */}
            {(isConfirmedLive || isFinished) && currentScore?.team2Score !== undefined ? (
              <span
                className={`font-mono text-[13px] sm:text-sm font-black px-2 py-0.5 rounded shrink-0 ${
                  isSelected
                    ? "text-amber-300 bg-amber-500/20 border border-amber-400/40 shadow-sm"
                    : isConfirmedLive
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    : "text-white bg-white/5"
                }`}
              >
                {currentScore.team2Score}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        /* KÈO SỰ KIỆN ĐƠN (HOẶC ĐUA XE / QUẦN VỢT / KÊNH 24/7) */
        <div className="flex items-center gap-2 py-1">
          <div className="w-5.5 h-5.5 rounded-lg bg-gradient-to-b from-zinc-700/80 to-zinc-800 border border-white/15 flex items-center justify-center shrink-0">
            {match.logo && !logoError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={toDarkModeLogoUrl(match.logo)}
                alt=""
                className="w-4 h-4 object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xs">{getSportIcon(match.sport)}</span>
            )}
          </div>
          <strong className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 flex-1">
            {match.title || match.team1}
          </strong>
        </div>
      )}

      {/* 3. FOOTER: BLV & SERVERS NGUỒN PHÁT (TINH GỌN, CHUẨN XEM TRỰC TIẾP) */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 mt-1 border-t border-white/[0.06] text-[11px] sm:text-xs text-zinc-300">
        <div className="flex items-center gap-1 min-w-0 flex-1 truncate">
          {match.blv ? (
            <span className="text-zinc-300 group-hover:text-white font-medium truncate flex items-center gap-1">
              <span className="shrink-0 text-amber-400/90">🎙️</span>
              <span className="truncate">
                {(() => {
                  const rawBlvs = match.blv
                    .split(",")
                    .map((b: string) => b.trim().replace(/^(?:blv|bình luận viên)\s+/i, ""))
                    .filter((b: string) => Boolean(b) && !isOffensiveCommentatorName(b));
                  if (rawBlvs.length === 0) {
                    const isTrusted = /^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup);
                    return isTrusted ? primaryGroup : "BLV";
                  }
                  if (rawBlvs.length <= 2) return `BLV ${rawBlvs.join(", ")}`;
                  return `BLV ${rawBlvs.slice(0, 2).join(", ")} (+${rawBlvs.length - 2})`;
                })()}
              </span>
            </span>
          ) : (
            <span className="text-zinc-400 group-hover:text-zinc-300 font-medium truncate flex items-center gap-1">
              <span className="shrink-0 text-amber-400/80">🎙️</span>
              <span className="truncate">
                {/^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup)
                  ? primaryGroup
                  : "BLV"}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-zinc-200 font-semibold flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 text-[11px] sm:text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{match.servers.length} nguồn</span>
          </span>

          {isSelected ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/45 text-red-300 font-bold text-[11px] sm:text-xs tracking-wide shrink-0"
              title="Đang phát trên player chính"
            >
              <span className="flex items-end gap-[1.5px] h-2.5 px-0.5 shrink-0">
                <span className="w-[1.5px] bg-red-400 rounded-full animate-bounce h-1" style={{ animationDuration: "600ms" }} />
                <span className="w-[1.5px] bg-red-400 rounded-full animate-bounce h-2.5" style={{ animationDuration: "800ms", animationDelay: "150ms" }} />
                <span className="w-[1.5px] bg-red-400 rounded-full animate-bounce h-1" style={{ animationDuration: "500ms", animationDelay: "300ms" }} />
              </span>
              <span>Đang xem</span>
            </span>
          ) : (
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                isConfirmedLive
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-white/10 text-zinc-300 group-hover:bg-white/20 group-hover:text-white"
              }`}
              title={isConfirmedLive ? "Xem trực tiếp" : "Xem nguồn phát sóng"}
            >
              <Play className="w-2 h-2 fill-current ml-0.5" />
            </span>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
