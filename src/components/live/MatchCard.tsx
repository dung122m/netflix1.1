"use client";

import React, { useState } from "react";
import { Bell, Play, Zap } from "lucide-react";
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
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 220px" }}
      className={`group relative rounded-2xl sm:rounded-3xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden transform-gpu will-change-transform ${
        isSelected
          ? "football-match-active bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border-netflix-red shadow-2xl shadow-red-950/70 ring-2 ring-netflix-red/60 scale-[1.02]"
          : "football-match-card bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-white/10 hover:border-white/35 hover:bg-zinc-850 hover:shadow-xl hover:shadow-black/80 hover:-translate-y-1"
      }`}
    >
      {/* Glow viền ambient khi đang đá (Live) */}
      {isLive && (
        <div className="pointer-events-none absolute -top-12 -right-12 w-32 h-32 bg-red-600/20 rounded-full blur-2xl group-hover:bg-red-600/30 transition-all" />
      )}

      {/* 1. HEADER ROW: TRẠNG THÁI / NGUỒN PHÁT (TRÁI) & THỜI GIAN / CHẤT LƯỢNG / NHẮC HẸN (PHẢI) */}
      <div className="flex items-center justify-between gap-1.5 mb-2.5 relative z-10 w-full min-w-0">
        {/* TRÁI: ĐANG ĐÁ HOẶC NGUỒN PHÁT */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isLive ? (
            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10.5px] flex items-center gap-1.5 shadow-md shadow-red-950/60 tracking-wider animate-pulse whitespace-nowrap flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>ĐANG ĐÁ</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-gray-300 font-bold text-[10.5px] truncate whitespace-nowrap">
              {primaryGroup}
            </span>
          )}
        </div>

        {/* PHẢI: CHẤT LƯỢNG + GIỜ ĐÁ + NHẮC HẸN */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm flex items-center gap-0.5 whitespace-nowrap ${
              isFhd
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-950/40"
                : "bg-sky-500/15 border-sky-500/40 text-sky-400 shadow-sky-950/40"
            }`}
          >
            <Zap className="w-2.5 h-2.5 fill-current" />
            <span>{isFhd ? "1080P" : "720P"}</span>
          </span>

          <span className="text-[11px] text-gray-300 font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-md whitespace-nowrap">
            {match.time || "Trực tiếp"}
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
              className={`p-1 rounded-md text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer border whitespace-nowrap ${
                reminded
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                  : "bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white border-white/10"
              }`}
            >
              <Bell
                className={`w-3.5 h-3.5 ${
                  reminded ? "fill-amber-400 text-amber-400 animate-pulse" : ""
                }`}
              />
            </button>
          )}
        </div>
      </div>

      {/* 2. KHU VỰC LOGO & ĐỐI ĐẦU HOẶC SỰ KIỆN THỂ THAO */}
      {match.isEvent ? (
        <div className="football-scoreboard my-1.5 sm:my-2 p-2 sm:p-3 rounded-2xl bg-gradient-to-b from-black/80 to-zinc-950 border border-white/10 relative z-10 flex flex-col justify-between">
          {validEventLogo ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-zinc-900 mb-1.5 sm:mb-2 shadow-inner group/poster">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={match.logo || match.homeLogo}
                alt={match.title}
                className="w-full h-full object-cover object-center transform group-hover/poster:scale-105 transition-transform duration-500"
                onError={() => setLogoError(true)}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/15 text-[9.5px] font-black text-rose-300 uppercase tracking-wider">
                {match.group === "Sự Kiện FPT Play" ? "FPT Play" : "Sự kiện"}
              </div>
              <div className="absolute inset-0 bg-black/20 group-hover/poster:bg-black/0 transition-colors flex items-center justify-center">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-netflix-red/90 text-white flex items-center justify-center shadow-lg shadow-black/80 transform scale-90 group-hover/poster:scale-100 transition-transform">
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white ml-0.5" />
                </div>
              </div>
            </div>
          ) : (
            <div className="my-1.5 sm:my-2 min-h-[70px] sm:min-h-[90px] p-2 sm:p-3 rounded-xl bg-gradient-to-br from-red-950/30 via-zinc-950 to-black border border-red-500/20 flex flex-col items-center justify-center text-center">
              <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-[0.16em] text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30 mb-1">
                {match.group === "Sự Kiện FPT Play" ? "FPT Play Event" : "Sự kiện thể thao"}
              </span>
              <strong className="text-xs sm:text-sm font-black text-white line-clamp-2 leading-tight">
                {match.title || match.team1}
              </strong>
            </div>
          )}

          <div className="flex flex-col gap-1 px-1">
            <strong className="text-xs sm:text-sm font-black text-white line-clamp-1 leading-snug group-hover:text-rose-400 transition">
              {match.title || match.team1}
            </strong>
            {match.blv && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-[10.5px] font-bold text-gray-300 bg-white/10 px-1.5 sm:px-2 py-0.5 rounded-md truncate max-w-full">
                  🎙️ {match.blv}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="football-scoreboard my-1.5 sm:my-2 p-2 sm:p-3.5 rounded-2xl bg-gradient-to-b from-black/70 to-zinc-950/90 border border-white/10 backdrop-blur-sm relative z-10">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3">
            {/* ĐỘI NHÀ (TEAM 1) */}
            <div className="flex-1 flex flex-col items-center text-center group/team min-w-0">
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/15 sm:border-2 p-1 sm:p-2 flex items-center justify-center shadow-xl mb-1 sm:mb-1.5 overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-netflix-red/60 group-hover:shadow-red-950/40">
                {validHomeLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={match.homeLogo}
                    alt={match.team1}
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={() => setHomeError(true)}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-xs sm:text-xl font-black text-rose-400 tracking-wider">
                      {getTeamInitials(match.team1)}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[11px] sm:text-sm font-extrabold text-white line-clamp-2 leading-tight group-hover:text-rose-400 transition min-h-[1.75rem] sm:min-h-[2rem] flex items-center justify-center text-center">
                {match.team1}
              </span>
            </div>

            {/* HUY HIỆU VS TRUNG TÂM */}
            <div className="flex flex-col items-center flex-shrink-0 px-0.5 sm:px-1 -mt-2 sm:-mt-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-zinc-800/90 border border-white/20 flex items-center justify-center shadow-inner">
                <span className="text-[9px] sm:text-[11px] font-black text-rose-400 tracking-wider">
                  VS
                </span>
              </div>
            </div>

            {/* ĐỘI KHÁCH (TEAM 2) */}
            <div className="flex-1 flex flex-col items-center text-center group/team min-w-0">
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 border border-white/15 sm:border-2 p-1 sm:p-2 flex items-center justify-center shadow-xl mb-1 sm:mb-1.5 overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-sky-500/60 group-hover:shadow-sky-950/40">
                {validAwayLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={match.awayLogo}
                    alt={match.team2}
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={() => setAwayError(true)}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-xs sm:text-xl font-black text-sky-400 tracking-wider">
                      {getTeamInitials(match.team2)}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[11px] sm:text-sm font-extrabold text-white line-clamp-2 leading-tight group-hover:text-rose-400 transition min-h-[1.75rem] sm:min-h-[2rem] flex items-center justify-center text-center">
                {match.team2 || "Đối thủ"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. FOOTER: BLV TIẾNG VIỆT & DANH SÁCH NGUỒN PHÁT */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] relative z-10">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {match.blv ? (
            <span
              className="text-rose-400 font-bold flex items-center gap-1 truncate"
              title={`BLV ${match.blv}`}
            >
              <span>🎙️</span>
              <span className="truncate">{match.blv}</span>
            </span>
          ) : (
            <span className="text-gray-400 font-medium flex items-center gap-1 truncate">
              <span>⚽</span>
              <span className="truncate">{primaryGroup}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-gray-400 flex items-center gap-1 text-[10.5px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{match.servers.length} nguồn</span>
          </span>

          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-netflix-red text-white p-1 rounded-full shadow-md">
            <Play className="w-2.5 h-2.5 fill-current" />
          </span>
        </div>
      </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
