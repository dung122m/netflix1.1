"use client";

import React, { useState, useMemo } from "react";
import { Play } from "lucide-react";
import { FootballMatch } from "@/services/liveFootballService";
import {
  getTeamAsset,
  getTeamInitials,
  isRawNumericOrArtifactTournament,
} from "@/data/live/teamAssets";

interface MatchCardProps {
  match: FootballMatch;
  isSelected: boolean;
  onSelect: (match: FootballMatch) => void;
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

function MatchCardInner({ match, isSelected, onSelect }: MatchCardProps) {
  const [homeError, setHomeError] = useState(false);
  const [awayError, setAwayError] = useState(false);
  const [logoError, setLogoError] = useState(false);

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

  const validHomeLogo =
    Boolean(match.homeLogo) &&
    !match.homeLogo?.includes("tinhlagi.pro/logo.jpg") &&
    !homeError;

  const validAwayLogo =
    Boolean(match.awayLogo) &&
    !match.awayLogo?.includes("tinhlagi.pro/logo.jpg") &&
    !awayError;

  const validEventLogo =
    Boolean(match.logo || match.homeLogo) &&
    !match.logo?.includes("tinhlagi.pro/logo.jpg") &&
    !logoError;

  // Ưu tiên cờ quốc gia / emoji đặc thù (luôn hiển thị chuẩn, sắc nét, không 404)
  const homeFlagEmoji = homeAsset?.emoji || null;
  const awayFlagEmoji = awayAsset?.emoji || null;

  // Logo ảnh: Ưu tiên logo từ API; nếu lỗi hoặc không có thì thử logo từ dictionary; nếu không có thì fallback sang initials
  const homeLogoSrc = !homeFlagEmoji
    ? (validHomeLogo ? match.homeLogo : (homeAsset?.logo ? homeAsset.logo : null))
    : null;
  const awayLogoSrc = !awayFlagEmoji
    ? (validAwayLogo ? match.awayLogo : (awayAsset?.logo ? awayAsset.logo : null))
    : null;

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
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 140px" }}
      className={`group relative rounded-2xl border p-3 sm:p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden transform-gpu will-change-transform outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-[1.02] ${isSelected
        ? "football-match-active bg-zinc-900 border-netflix-red shadow-lg shadow-red-950/60 ring-1 ring-netflix-red/50"
        : "football-match-card bg-zinc-900/90 border-white/10 hover:border-white/25 hover:bg-zinc-850/95 hover:shadow-lg hover:shadow-black/70"
        }`}
    >
      {/* Ambient glow khi trận đang diễn ra (Live) */}
      {isLive && (
        <div className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 bg-red-600/15 rounded-full blur-2xl group-hover:bg-red-600/25 transition-all" />
      )}

      {/* 1. TOP HEADER: GIẢI ĐẤU & CHẤT LƯỢNG / THÔNG BÁO */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10 w-full min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] sm:text-[11px] text-gray-400 font-semibold truncate flex items-center gap-1">
            <span>
              {match.tournament &&
              match.tournament !== "Kênh Thể Thao 24/7" &&
              !isRawNumericOrArtifactTournament(match.tournament)
                ? match.tournament
                : "🏆 Trực Tiếp Thể Thao"}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider border ${isFhd
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
        <div className="flex items-center gap-3 my-2 relative z-10">
          {homeFlagEmoji ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-800/90 border border-white/15 flex items-center justify-center shrink-0 shadow-md">
              <CountryFlag emoji={homeFlagEmoji} />
            </div>
          ) : validEventLogo ? (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 shadow-md p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={match.logo || match.homeLogo}
                alt=""
                className="w-full h-full object-contain filter drop-shadow-sm"
                onError={() => setLogoError(true)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400 text-lg shadow-sm">
              {getSportIcon(match.sport)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              {isLive ? (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] flex items-center gap-1 shadow-sm shadow-red-950/40 tracking-wider animate-pulse whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>LIVE</span>
                </span>
              ) : null}
              {kickoffTime && (
                <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                  🕐 {kickoffTime}
                </span>
              )}
            </div>
            <strong className="text-xs sm:text-sm font-bold text-white line-clamp-2 group-hover:text-rose-400 transition leading-snug">
              {match.title || match.team1}
            </strong>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1 sm:gap-2 my-2 relative z-10 w-full min-w-0">
          {/* ĐỘI NHÀ (CỘT TRÁI) */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0 group/team">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-800/90 border border-white/15 p-1.5 sm:p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200">
              {homeFlagEmoji ? (
                <CountryFlag emoji={homeFlagEmoji} />
              ) : homeLogoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={homeLogoSrc}
                  src={homeLogoSrc}
                  alt=""
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    setHomeError(true);
                    e.currentTarget.style.display = "none";
                  }}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <TeamLogoFallback initials={getTeamInitials(displayTeam1)} color="rose" />
              )}
            </div>
            <span
              className="mt-1.5 text-xs sm:text-[13px] font-extrabold text-white truncate leading-snug group-hover:text-rose-400 transition-colors duration-200 w-full px-0.5 block text-center"
              title={displayTeam1}
            >
              {displayTeam1}
            </span>
          </div>

          {/* TRUNG TÂM MATCHUP: VS, STATUS & GIỜ ĐÁ (CỘT GIỮA) */}
          <div className="shrink-0 flex flex-col items-center justify-center px-1 text-center min-w-[65px] sm:min-w-[75px]">
            {isLive ? (
              <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[8px] sm:text-[9px] flex items-center gap-1 shadow-md shadow-red-950/60 animate-pulse tracking-wider whitespace-nowrap shrink-0">
                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                <span>LIVE</span>
              </span>
            ) : null}

            <span className="mt-1 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] sm:text-[9px] font-black text-rose-400/90 font-mono tracking-widest shadow-sm">
              VS
            </span>

            {kickoffTime && (
              <span className="mt-1 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-[9px] sm:text-[10px] font-bold text-gray-200 tracking-tight whitespace-nowrap shadow-sm">
                🕐 {kickoffTime}
              </span>
            )}
          </div>

          {/* ĐỘI KHÁCH (CỘT PHẢI) */}
          <div className="flex-1 flex flex-col items-center text-center min-w-0 group/team">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-800/90 border border-white/15 p-1.5 sm:p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200">
              {awayFlagEmoji ? (
                <CountryFlag emoji={awayFlagEmoji} />
              ) : awayLogoSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={awayLogoSrc}
                  src={awayLogoSrc}
                  alt=""
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    setAwayError(true);
                    e.currentTarget.style.display = "none";
                  }}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <TeamLogoFallback initials={getTeamInitials(displayTeam2)} color="sky" />
              )}
            </div>
            <span
              className="mt-1.5 text-xs sm:text-[13px] font-extrabold text-white truncate leading-snug group-hover:text-sky-400 transition-colors duration-200 w-full px-0.5 block text-center"
              title={displayTeam2 || "Đối thủ"}
            >
              {displayTeam2 || "Đối thủ"}
            </span>
          </div>
        </div>
      )}

      {/* 3. FOOTER: BLV & SỐ LƯỢNG NGUỒN PHÁT */}
      <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-white/5 text-[10px] sm:text-[11px] relative z-10 text-gray-400">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {match.blv ? (
            <span
              className="text-rose-400 font-medium flex items-center gap-1 min-w-0 truncate"
              title={`BLV: ${match.blv}`}
            >
              <span className="shrink-0">🎙️</span>
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

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-gray-300 font-semibold flex items-center gap-1 text-[10px] sm:text-[11px] bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{match.servers.length} nguồn</span>
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-netflix-red text-white p-1 rounded-full shadow-sm">
            <Play className="w-2.5 h-2.5 fill-current" />
          </span>
        </div>
      </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
