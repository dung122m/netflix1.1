"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Play, Clock } from "lucide-react";
import { FootballMatch } from "@/services/liveFootballService";
import { LiveMatchScore } from "@/services/live/football-score/types";
import {
  getTeamAsset,
  getTeamInitials,
  isRawNumericOrArtifactTournament,
} from "@/data/live/teamAssets";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";
import {
  resolveMatchDisplayStatus,
} from "@/services/live/football-score/liveStatus";

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
        timestamp: match.timestamp,
        score: currentScore,
        sourceStatus: match.sourceStatus,
      }),
    [match.timestamp, currentScore, match.sourceStatus],
  );

  const isConfirmedLive = displayStatus.isConfirmedLive;
  const isFinished = displayStatus.statusType === "finished";
  const specialStatusLabel =
    displayStatus.statusType === "postponed" ||
    displayStatus.statusType === "canceled" ||
    displayStatus.statusType === "suspended"
      ? displayStatus.badgeLabel
      : null;
  const kickoffTime = displayStatus.kickoffTime;

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
    match.homeLogo && match.homeLogo !== "https://img.gavang.net/placeholder.png"
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
    match.awayLogo && match.awayLogo !== "https://img.gavang.net/placeholder.png"
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

  const displayGroups =
    match.groups && match.groups.length > 0
      ? match.groups.map((g: string) => g.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim())
      : [match.group.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim()];

  const primaryGroup = displayGroups[0] || match.group;

  const tournamentName = useMemo(() => {
    let name = "Trực Tiếp Thể Thao";
    if (
      match.tournament &&
      match.tournament !== "Kênh Thể Thao 24/7" &&
      !isRawNumericOrArtifactTournament(match.tournament)
    ) {
      name = match.tournament;
    }
    // Loại bỏ emoji thể thao hoặc ký tự biểu tượng ở đầu tên giải nếu có, tránh bị lặp icon với getSportIcon()
    return (
      name
        .toWellFormed()
        .replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s🔴🟢🟡⚪🟠⚽🏀🏐🏸🎾🎱🥊🏎️🏆]+/u, "")
        .trim() || "Trực Tiếp Thể Thao"
    );
  }, [match.tournament]);

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
      className={`group relative rounded-2xl border p-2.5 sm:p-3 cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden outline-none select-none ${
        isSelected
          ? "bg-zinc-900/95 border-netflix-red shadow-md shadow-red-950/40 ring-1 ring-netflix-red"
          : "bg-zinc-900/80 hover:bg-zinc-850/90 border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/50"
      }`}
    >
      {/* Glow viền ambient khi trận đang diễn ra */}
      {isConfirmedLive && (
        <div className="pointer-events-none absolute -top-10 -right-10 w-28 h-28 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-all" />
      )}

      {/* 1. HEADER: GIẢI ĐẤU & TRẠNG THÁI THỜI GIAN THỰC (SOFASCORE STYLE) */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-white/[0.06] text-xs">
        {/* Tên giải đấu */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-zinc-400 text-[11px] font-medium truncate flex items-center gap-1">
            <span>{getSportIcon(match.sport)}</span>
            <span className="truncate">{tournamentName}</span>
          </span>
        </div>

        {/* Trạng thái trận & huy hiệu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isConfirmedLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-red-600 text-white shadow-sm tracking-wider animate-pulse whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span>{displayStatus.badgeLabel}</span>
            </span>
          ) : isFinished ? (
            <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-gray-300 font-bold text-[9.5px] uppercase whitespace-nowrap">
              FT
            </span>
          ) : specialStatusLabel ? (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-[9.5px] whitespace-nowrap">
              {specialStatusLabel}
            </span>
          ) : kickoffTime ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-sky-400 font-semibold text-[9.5px] whitespace-nowrap">
              <Clock className="w-3 h-3" />
              <span>{kickoffTime}</span>
            </span>
          ) : null}

          {isFhd && (
            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              1080P
            </span>
          )}
        </div>
      </div>

      {/* 2. BODY SCOREBOARD: 2 HÀNG ĐỘI BÓNG CHUẨN SOFASCORE & FOTMOB */}
      {isTwoTeamMatch ? (
        <div className="space-y-1.5 py-0.5">
          {/* HÀNG 1: ĐỘI NHÀ */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Logo / Cờ đội nhà */}
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-zinc-800/90 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {homeFlagEmoji ? (
                  <CountryFlag emoji={homeFlagEmoji} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
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
                    ? "text-white font-extrabold"
                    : "text-zinc-200 font-bold group-hover:text-white"
                }`}
                title={displayTeam1}
              >
                {displayTeam1}
              </span>
            </div>

            {/* Tỷ số đội nhà */}
            {(isConfirmedLive || isFinished) && currentScore?.team1Score !== undefined ? (
              <span
                className={`font-mono text-xs sm:text-sm font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                  isConfirmedLive
                    ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                    : "text-white bg-white/5"
                }`}
              >
                {currentScore.team1Score}
              </span>
            ) : null}
          </div>

          {/* HÀNG 2: ĐỘI KHÁCH */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Logo / Cờ đội khách */}
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-zinc-800/90 border border-white/15 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {awayFlagEmoji ? (
                  <CountryFlag emoji={awayFlagEmoji} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
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
                    ? "text-white font-extrabold"
                    : "text-zinc-200 font-bold group-hover:text-white"
                }`}
                title={displayTeam2}
              >
                {displayTeam2}
              </span>
            </div>

            {/* Tỷ số đội khách */}
            {(isConfirmedLive || isFinished) && currentScore?.team2Score !== undefined ? (
              <span
                className={`font-mono text-xs sm:text-sm font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                  isConfirmedLive
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
        <div className="flex items-center gap-2.5 py-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-b from-zinc-700/80 to-zinc-800 border border-white/15 flex items-center justify-center shrink-0">
            {match.logo && !logoError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={toDarkModeLogoUrl(match.logo)}
                alt=""
                className="w-5 h-5 object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span>{getSportIcon(match.sport)}</span>
            )}
          </div>
          <strong className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 flex-1">
            {match.title || match.team1}
          </strong>
        </div>
      )}

      {/* 3. FOOTER: BLV & SERVERS NGUỒN PHÁT (TINH GỌN, CHUẨN XEM TRỰC TIẾP) */}
      <div className="flex items-center justify-between gap-2 pt-1.5 mt-1.5 border-t border-white/[0.06] text-[10px] sm:text-[10.5px] text-zinc-400">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
          {match.blv ? (
            <span className="text-zinc-400 group-hover:text-zinc-300 font-medium truncate flex items-center gap-1">
              <span className="shrink-0 text-amber-400/90">🎙️</span>
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
            <span className="text-zinc-400 truncate flex items-center gap-1 font-medium">
              <span>📡</span>
              <span className="truncate">{primaryGroup}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-zinc-300 font-medium flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-[9.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{match.servers.length} nguồn</span>
          </span>

          <span
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? "bg-netflix-red text-white shadow-sm shadow-red-950/50"
                : "bg-white/10 group-hover:bg-netflix-red group-hover:text-white text-zinc-400"
            }`}
            title="Xem trực tiếp"
          >
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
