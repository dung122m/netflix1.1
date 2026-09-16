"use client";

import React, { useState } from "react";
import { Bell, Play } from "lucide-react";
import { FootballMatch } from "@/services/liveFootballService";
import { useMatchReminders } from "@/hooks/useMatchReminders";

interface MatchCardProps {
  match: FootballMatch;
  isSelected: boolean;
  onSelect: (match: FootballMatch) => void;
}

function getTeamInitials(teamName: string): string {
  if (!teamName) return "⚽";
  const clean = teamName
    .replace(/^CLB\s+/i, "")
    .replace(/^FC\s+/i, "")
    .replace(/^SSC\s+/i, "")
    .replace(/^U\d+\s+/i, "")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function MatchCardInner({ match, isSelected, onSelect }: MatchCardProps) {
  const [homeError, setHomeError] = useState(false);
  const [awayError, setAwayError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { isReminded, addReminder, removeReminder } = useMatchReminders();

  const isFhd = match.quality.includes("FHD");
  const isLive = match.timeline === "live";
  const reminded = isReminded(match.id);
  const isUpcoming = !isLive || match.timestamp > Date.now();

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

  // Tổng hợp tên các đài phát (COLA TV, Gà Vàng...)
  const displayGroups =
    match.groups && match.groups.length > 0
      ? match.groups.map((g) => g.replace(/^[🔴🟢🟡⚪🟠\s]+/, "").trim())
      : [match.group.replace(/^[🔴🟢🟡⚪🟠\s]+/, "").trim()];

  const primaryGroup = displayGroups[0] || match.group;

  return (
    <div
      onClick={() => onSelect(match)}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 90px" }}
      className={`group relative rounded-xl sm:rounded-2xl border p-2.5 sm:p-3 cursor-pointer transition-all duration-200 flex flex-col justify-between overflow-hidden transform-gpu will-change-transform ${
        isSelected
          ? "football-match-active bg-zinc-900 border-netflix-red shadow-lg shadow-red-950/50 ring-1 ring-netflix-red/50"
          : "football-match-card bg-zinc-900/80 border-white/10 hover:border-white/25 hover:bg-zinc-850/90 hover:shadow-md hover:shadow-black/60"
      }`}
    >
      {/* Ambient glow khi trận đang diễn ra (Live) */}
      {isLive && (
        <div className="pointer-events-none absolute -top-6 -right-6 w-20 h-20 bg-red-600/15 rounded-full blur-xl group-hover:bg-red-600/25 transition-all" />
      )}

      {/* 1. HEADER ROW: TRẠNG THÁI & GIẢI ĐẤU + CHẤT LƯỢNG / THỜI GIAN */}
      <div className="flex items-center justify-between gap-1.5 mb-2 relative z-10 w-full min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isLive ? (
            <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[8.5px] sm:text-[9.5px] flex items-center gap-1 shadow-sm shadow-red-950/40 tracking-wider animate-pulse whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="text-[9px] sm:text-[10px] text-sky-400 font-bold bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
              ⏰ {match.time || "Trực tiếp"}
            </span>
          )}

          {match.tournament && match.tournament !== "Kênh Thể Thao 24/7" && (
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium truncate">
              {match.tournament}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider border ${
              isFhd
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : "bg-sky-500/15 border-sky-500/30 text-sky-400"
            }`}
          >
            {isFhd ? "1080P" : "720P"}
          </span>

          {isUpcoming && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (reminded) removeReminder(match.id);
                else addReminder(match);
              }}
              title={
                reminded
                  ? "Đã hẹn thông báo (Bấm để hủy)"
                  : "Nhận thông báo khi trận đấu bắt đầu"
              }
              className={`p-1 rounded text-[9px] transition cursor-pointer border ${
                reminded
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white border-white/10"
              }`}
            >
              <Bell
                className={`w-3 h-3 ${
                  reminded ? "fill-amber-400 text-amber-400 animate-pulse" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* 2. MATCH CONTENT: ĐỐI ĐẦU 2 ĐỘI (THANH NGANG HIỆN ĐẠI) HOẶC SỰ KIỆN */}
      {match.isEvent ? (
        <div className="flex items-center gap-2.5 my-1 relative z-10">
          {validEventLogo ? (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-zinc-800 border border-white/10 overflow-hidden shrink-0 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={match.logo || match.homeLogo}
                alt={match.title}
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0 text-rose-400 text-sm">
              🎙️
            </div>
          )}
          <div className="min-w-0 flex-1">
            <strong className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-rose-400 transition leading-snug">
              {match.title || match.team1}
            </strong>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {match.group}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 my-1.5 relative z-10">
          {/* ĐỘI NHÀ */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-zinc-800 border border-white/10 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              {validHomeLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={match.homeLogo}
                  alt={match.team1}
                  className="w-full h-full object-contain"
                  onError={() => setHomeError(true)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-[9px] sm:text-[10px] font-black text-rose-400">
                  {getTeamInitials(match.team1)}
                </span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-rose-400 transition">
              {match.team1}
            </span>
          </div>

          {/* VS BADGE */}
          <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[8px] sm:text-[8.5px] font-black text-rose-400 font-mono">
            VS
          </span>

          {/* ĐỘI KHÁCH */}
          <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
            <span className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-sky-400 transition">
              {match.team2 || "Đối thủ"}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-zinc-800 border border-white/10 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              {validAwayLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={match.awayLogo}
                  alt={match.team2}
                  className="w-full h-full object-contain"
                  onError={() => setAwayError(true)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-[9px] sm:text-[10px] font-black text-sky-400">
                  {getTeamInitials(match.team2)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. FOOTER: BLV & SỐ LƯỢNG NGUỒN PHÁT */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 mt-1 border-t border-white/5 text-[9.5px] sm:text-[10px] relative z-10 text-gray-400">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {match.blv ? (
            <span
              className="text-rose-400 font-medium flex items-center gap-1 truncate"
              title={`BLV ${match.blv}`}
            >
              <span>🎙️</span>
              <span className="truncate">{match.blv}</span>
            </span>
          ) : (
            <span className="text-gray-400 flex items-center gap-1 truncate">
              <span>⚽</span>
              <span className="truncate">{primaryGroup}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-gray-400 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
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
