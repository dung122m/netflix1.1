"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Play, Clock, Flame, Mic, Trophy, Sparkles } from "lucide-react";
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
  compact?: boolean;
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

function MatchCardInner({ match, isSelected, onSelect, score, compact }: MatchCardProps) {
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
      : (match.time && !match.time.includes(":") ? `${match.time}'` : "Trực tiếp");

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

  // GIAO DIỆN COMPACT: Dành riêng cho thanh bên (Sidebar / Rail) khi đang xem player
  // Thiết kế dạng Scoreboard List tiện quét mắt tìm trận, thấy ngay giờ đá, tỉ số, đổi kênh tức thì
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
        className={`group relative rounded-xl border cursor-pointer transition-all duration-150 p-2 sm:p-2.5 flex flex-col gap-1.5 overflow-hidden outline-none select-none ${
          isSelected
            ? "bg-zinc-900/95 border-netflix-red ring-1 ring-netflix-red/40 shadow-md"
            : featured.isFeatured
            ? "bg-gradient-to-b from-rose-950/40 to-zinc-900/90 border-rose-500/50 hover:border-rose-500/70 shadow-[0_0_14px_rgba(225,29,72,0.15)] ring-1 ring-rose-500/20"
            : isConfirmedLive
            ? "bg-zinc-900/70 hover:bg-zinc-850/90 border-white/[0.08] hover:border-white/20"
            : "bg-zinc-900/50 hover:bg-zinc-850/80 border-white/[0.05] hover:border-white/15"
        }`}
      >
        {/* DÒNG 1: HEADER MINI (GIẢI ĐẤU, GIỜ ĐÁ & TRẠNG THÁI) */}
        <div className="flex items-center justify-between text-[10.5px] text-zinc-400 gap-1.5 border-b border-white/[0.05] pb-1">
          <span className="truncate font-medium flex items-center gap-1 min-w-0 flex-1">
            <span className="text-[11px] shrink-0">{getSportIcon(match.sport)}</span>
            <span className="truncate">{tournamentName}</span>
          </span>

          <div className="flex items-center gap-1.5 shrink-0 font-mono">
            {/* Giờ đá luôn hiện rõ nét */}
            {kickoffTime && (
              <span className="text-zinc-200 font-bold bg-white/5 px-1 rounded">{kickoffTime}</span>
            )}
            {isConfirmedLive ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>LIVE</span>
              </span>
            ) : isFinished ? (
              <span className="text-[9px] text-zinc-400 font-bold uppercase">FT</span>
            ) : null}
            {featured.isFeatured && (
              <span className="text-[9px] font-black text-white bg-gradient-to-r from-rose-600 to-red-600 px-1.5 py-0.2 rounded-full uppercase tracking-wider shadow-sm">
                TÂM ĐIỂM
              </span>
            )}
          </div>
        </div>

        {/* DÒNG 2: 2 ĐỘI BÓNG DẠNG SCOREBOARD MINI (DỄ QUÉT MẮT TÌM TRẬN NHẤT) */}
        {isTwoTeamMatch ? (
          <div className="space-y-1 py-0.5">
            {/* Đội Nhà */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="w-4.5 h-4.5 rounded bg-zinc-800 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                  {homeFlagEmoji ? (
                    <CountryFlag emoji={homeFlagEmoji} className="w-3.5 h-3.5" />
                  ) : homeLogoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={homeLogoSrc}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={handleHomeImgError}
                      loading="lazy"
                    />
                  ) : (
                    <TeamLogoFallback initials={getTeamInitials(displayTeam1)} color="rose" />
                  )}
                </div>
                <span
                  className={`text-xs truncate ${
                    isSelected ? "text-white font-bold" : "text-zinc-200 font-medium group-hover:text-white"
                  }`}
                >
                  {displayTeam1}
                </span>
              </div>
              {currentScore?.team1Score !== undefined && (
                <span className="font-mono text-xs font-bold text-zinc-200 tabular-nums shrink-0 px-1 rounded bg-white/5">
                  {currentScore.team1Score}
                </span>
              )}
            </div>

            {/* Đội Khách */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="w-4.5 h-4.5 rounded bg-zinc-800 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                  {awayFlagEmoji ? (
                    <CountryFlag emoji={awayFlagEmoji} className="w-3.5 h-3.5" />
                  ) : awayLogoSrc ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={awayLogoSrc}
                      alt=""
                      className="w-full h-full object-contain"
                      onError={handleAwayImgError}
                      loading="lazy"
                    />
                  ) : (
                    <TeamLogoFallback initials={getTeamInitials(displayTeam2)} color="sky" />
                  )}
                </div>
                <span
                  className={`text-xs truncate ${
                    isSelected ? "text-white font-bold" : "text-zinc-200 font-medium group-hover:text-white"
                  }`}
                >
                  {displayTeam2}
                </span>
              </div>
              {currentScore?.team2Score !== undefined && (
                <span className="font-mono text-xs font-bold text-zinc-200 tabular-nums shrink-0 px-1 rounded bg-white/5">
                  {currentScore.team2Score}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="text-xs text-white font-bold truncate flex-1">{match.title || match.team1}</span>
          </div>
        )}

        {/* DÒNG 3: FOOTER MINI (BLV & SỐ NGUỒN) */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-white/[0.04]">
          <span className="truncate flex items-center gap-1 min-w-0 flex-1">
            <Mic className="w-2.5 h-2.5 text-zinc-500 shrink-0" />
            <span className="truncate">
              {match.blv
                ? `BLV ${match.blv.split(",")[0].trim().replace(/^(?:blv|bình luận viên)\s+/i, "")}`
                : primaryGroup || "Trực tiếp"}
            </span>
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <span>{match.servers.length} nguồn</span>
            {isSelected && (
              <span className="text-red-400 font-bold text-[9px] ml-1">Đang xem</span>
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
      className={`group relative rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden outline-none select-none backdrop-blur-md ${
        isSelected
          ? "bg-zinc-900/95 border-netflix-red/90 ring-1 ring-netflix-red/40 shadow-[0_4px_24px_rgba(229,9,20,0.25)]"
          : featured.isFeatured
          ? "bg-gradient-to-b from-rose-950/40 via-zinc-900/90 to-zinc-950 border-rose-500/60 hover:border-rose-500/90 shadow-[0_0_24px_rgba(225,29,72,0.22)] ring-1 ring-rose-500/30 hover:bg-zinc-850/90"
          : isConfirmedLive
          ? "bg-zinc-900/80 hover:bg-zinc-850/90 border-white/[0.08] hover:border-white/20 shadow-sm"
          : "bg-zinc-900/60 hover:bg-zinc-850/80 border-white/[0.06] hover:border-white/15"
      }`}
    >
      {/* Dải sáng trên đỉnh thẻ (Top Crown Rim) cho trận Tâm điểm hoặc Đang chọn */}
      <div
        className={`absolute top-0 inset-x-0 h-[2px] pointer-events-none transition-opacity ${
          isSelected
            ? "bg-gradient-to-r from-transparent via-netflix-red to-transparent opacity-100"
            : featured.isFeatured
            ? "bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-100"
            : "opacity-0"
        }`}
      />

      {/* Ambient glow nhẹ tinh tế khi đang chọn xem */}
      {isSelected && (
        <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-all bg-red-600/20" />
      )}

      {/* Ánh sáng ruby spotlight khuếch tán cho trận Tâm điểm */}
      {featured.isFeatured && !isSelected && (
        <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-20 bg-rose-500/25 blur-2xl transition-all" />
      )}

      <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1 gap-2">
        {/* 1. HEADER: GIẢI ĐẤU & GIỜ ĐÁ + TRẠNG THÁI NỔI BẬT */}
        <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-white/[0.06] text-xs">
          {/* Tên giải đấu */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span
              className={`transition-colors text-[11px] font-medium truncate flex items-center gap-1.5 ${
                featured.isFeatured ? "text-rose-200/90 font-semibold" : "text-zinc-400 group-hover:text-zinc-300"
              }`}
            >
              <span className="text-xs shrink-0">{getSportIcon(match.sport)}</span>
              <span className="truncate">{tournamentName}</span>
            </span>
          </div>

          {/* Góc phải Header: CÁC HUY HIỆU TRẠNG THÁI TINH GỌN */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Trạng thái LIVE nếu đang đá */}
            {isConfirmedLive && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 border border-rose-500/35 text-rose-400">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                </span>
                <span>LIVE</span>
              </span>
            )}

            {/* Huy hiệu Tâm Điểm: Rực rỡ, cao cấp, nổi bật chuẩn Spotlight */}
            {featured.isFeatured && (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold tracking-wider bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-[0_2px_12px_rgba(225,29,72,0.5)] border border-rose-400/40 shrink-0"
                title={featured.badgeLabel || "Trận cầu tâm điểm"}
              >
                <Flame size={10} className="text-amber-200 shrink-0 fill-amber-300" />
                <span>{featured.badgeLabel || "Tâm điểm"}</span>
              </span>
            )}

            {isFhd && (
              <span className="text-[9.5px] font-semibold uppercase tracking-wider text-zinc-400">
                1080P
              </span>
            )}
          </div>
        </div>

        {/* 2. BODY: BỐ CỤC ĐỐI XỨNG GỌN GÀNG (ĐỘI NHÀ — TRUNG TÂM — ĐỘI KHÁCH) */}
        {isTwoTeamMatch ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-2 py-0.5">
            {/* CỘT TRÁI: ĐỘI NHÀ */}
            <div className="flex flex-col items-center text-center min-w-0 px-0.5">
              {/* Logo Đội Nhà */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl p-1 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
                  featured.isFeatured
                    ? "bg-rose-950/50 border border-rose-500/40 shadow-[0_0_12px_rgba(225,29,72,0.25)]"
                    : "bg-zinc-800/80 border border-white/10 shadow-sm"
                }`}
              >
                {homeFlagEmoji ? (
                  <CountryFlag emoji={homeFlagEmoji} className="w-5 h-5 sm:w-6 sm:h-6" />
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

              {/* Tên Đội Nhà */}
              <span
                className={`text-xs font-semibold line-clamp-2 leading-tight transition-colors mt-1.5 max-w-[95px] sm:max-w-[110px] text-center ${
                  isSelected
                    ? "text-white font-bold drop-shadow-sm"
                    : featured.isFeatured
                    ? "text-white font-bold drop-shadow-sm"
                    : "text-zinc-200 group-hover:text-white"
                }`}
                title={displayTeam1}
              >
                {displayTeam1}
              </span>
            </div>

            {/* CỘT GIỮA: TRỌNG TÂM THỊ GIÁC (CHỮ VS VÀ GIỜ ĐÁ / TỶ SỐ) */}
            <div className="flex flex-col items-center justify-center gap-1 px-1 min-w-[64px] sm:min-w-[76px] shrink-0 text-center">
              {isConfirmedLive ? (
                <>
                  {/* Tỷ số lớn (hoặc VS tinh tế nếu chưa có tỷ số) */}
                  {currentScore?.team1Score !== undefined && currentScore?.team2Score !== undefined ? (
                    <>
                      <div
                        className={`font-mono text-lg sm:text-xl font-black tracking-wider tabular-nums px-2.5 py-0.5 rounded-lg border ${
                          isSelected
                            ? "text-amber-300 bg-amber-500/15 border-amber-400/30"
                            : featured.isFeatured
                            ? "text-white bg-rose-500/15 border-rose-500/35 shadow-[0_0_10px_rgba(225,29,72,0.2)]"
                            : "text-white bg-white/[0.08] border-white/10"
                        }`}
                      >
                        {currentScore.team1Score} - {currentScore.team2Score}
                      </div>
                      {kickoffTime && (
                        <span className="font-mono text-[10.5px] font-bold text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/10 tabular-nums leading-none">
                          {kickoffTime}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span
                        className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${
                          featured.isFeatured
                            ? "text-rose-200 bg-rose-500/20 border border-rose-500/35 shadow-sm"
                            : "text-zinc-400 bg-white/[0.06] border border-white/10"
                        }`}
                      >
                        VS
                      </span>
                      {kickoffTime && (
                        <span className="font-mono text-[11px] font-bold text-zinc-200 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 tabular-nums leading-none">
                          {kickoffTime}
                        </span>
                      )}
                    </>
                  )}
                </>
              ) : isFinished ? (
                <>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase mb-0.5">
                    FT
                  </span>
                  {currentScore?.team1Score !== undefined && currentScore?.team2Score !== undefined ? (
                    <div className="font-mono text-base sm:text-lg font-bold text-zinc-300 tabular-nums px-2 py-0.5 rounded bg-white/[0.04]">
                      {currentScore.team1Score} - {currentScore.team2Score}
                    </div>
                  ) : null}
                  {kickoffTime && (
                    <span className="font-mono text-[10px] text-zinc-400 tabular-nums mt-0.5">
                      {kickoffTime}
                    </span>
                  )}
                </>
              ) : specialStatusLabel ? (
                <>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px] whitespace-nowrap">
                    {specialStatusLabel}
                  </span>
                  {kickoffTime && (
                    <span className="font-mono text-[10.5px] font-bold text-zinc-300 tabular-nums mt-0.5">
                      {kickoffTime}
                    </span>
                  )}
                </>
              ) : (
                /* Trận sắp diễn ra: Chữ VS ở trên, Giờ đá ở dưới */
                <>
                  <span
                    className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded ${
                      featured.isFeatured
                        ? "text-rose-200 bg-rose-500/20 border border-rose-500/30"
                        : "text-zinc-400 bg-white/[0.05] border border-white/[0.08]"
                    }`}
                  >
                    VS
                  </span>
                  {kickoffTime && (
                    <span className="font-mono text-[11px] font-bold text-zinc-200 bg-black/40 px-1.5 py-0.5 rounded border border-white/10 tabular-nums leading-none">
                      {kickoffTime}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* CỘT PHẢI: ĐỘI KHÁCH */}
            <div className="flex flex-col items-center text-center min-w-0 px-0.5">
              {/* Logo Đội Khách */}
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl p-1 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-200 group-hover:scale-105 ${
                  featured.isFeatured
                    ? "bg-rose-950/50 border border-rose-500/40 shadow-[0_0_12px_rgba(225,29,72,0.25)]"
                    : "bg-zinc-800/80 border border-white/10 shadow-sm"
                }`}
              >
                {awayFlagEmoji ? (
                  <CountryFlag emoji={awayFlagEmoji} className="w-5 h-5 sm:w-6 sm:h-6" />
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

              {/* Tên Đội Khách */}
              <span
                className={`text-xs font-semibold line-clamp-2 leading-tight transition-colors mt-1.5 max-w-[95px] sm:max-w-[110px] text-center ${
                  isSelected
                    ? "text-white font-bold drop-shadow-sm"
                    : featured.isFeatured
                    ? "text-white font-bold drop-shadow-sm"
                    : "text-zinc-200 group-hover:text-white"
                }`}
                title={displayTeam2}
              >
                {displayTeam2}
              </span>
            </div>
          </div>
        ) : (
          /* KÈO SỰ KIỆN ĐƠN (HOẶC ĐUA XE / QUẦN VỢT / KÊNH 24/7) */
          <div className="flex items-center justify-between gap-2.5 py-1.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/15 flex items-center justify-center shrink-0 shadow-sm">
                {match.logo && !logoError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={toDarkModeLogoUrl(match.logo)}
                    alt=""
                    className="w-5 h-5 object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <span className="text-sm">{getSportIcon(match.sport)}</span>
                )}
              </div>
              <strong className="text-xs sm:text-[13px] font-bold text-white line-clamp-2 flex-1 leading-tight">
                {match.title || match.team1}
              </strong>
            </div>

            {kickoffTime && (
              <span className="font-mono text-xs font-bold text-zinc-300 px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 shrink-0">
                {kickoffTime}
              </span>
            )}
          </div>
        )}

        {/* 3. FOOTER: BLV & NGUỒN PHÁT (TINH GỌN, THANH MẢNH) */}
        <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/[0.06] text-[11px] text-zinc-400">
          {/* Tên BLV */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <Mic className="w-3 h-3 text-zinc-500 shrink-0" />
            {match.blv ? (
              <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium truncate">
                {(() => {
                  const rawBlvs = match.blv
                    .split(",")
                    .map((b: string) => b.trim().replace(/^(?:blv|bình luận viên)\s+/i, ""))
                    .filter((b: string) => Boolean(b) && !isOffensiveCommentatorName(b));
                  if (rawBlvs.length === 0) {
                    const isTrusted = /^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup);
                    return isTrusted ? primaryGroup : "BLV Trực Tiếp";
                  }
                  if (rawBlvs.length <= 2) return `BLV ${rawBlvs.join(", ")}`;
                  return `BLV ${rawBlvs.slice(0, 2).join(", ")} (+${rawBlvs.length - 2})`;
                })()}
              </span>
            ) : (
              <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors font-medium truncate">
                {/^(?:TV360|FPT Play|VTVcab|SCTV|K\+|HTV|VTV)\b/i.test(primaryGroup)
                  ? primaryGroup
                  : "Bình luận trực tiếp"}
              </span>
            )}
          </div>

          {/* Số nguồn & Hành động */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-zinc-400 text-[10px]">
              {match.servers.length} nguồn
            </span>

            {isSelected ? (
              <span className="text-red-400 font-bold text-[10px] tracking-wide">
                Đang xem
              </span>
            ) : (
              <Play className="w-2.5 h-2.5 text-zinc-500 group-hover:text-zinc-300 fill-current transition-colors" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
