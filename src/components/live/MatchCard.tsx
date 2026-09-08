"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
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
  const { isReminded, addReminder, removeReminder } = useMatchReminders();

  const isFhd = match.quality.includes("FHD");
  const reminded = isReminded(match.id);
  const isUpcoming = match.timeline !== "live" || match.timestamp > Date.now();

  const validHomeLogo =
    Boolean(match.homeLogo) &&
    !match.homeLogo?.includes("tinhlagi.pro/logo.jpg") &&
    !homeError;

  const validAwayLogo =
    Boolean(match.awayLogo) &&
    !match.awayLogo?.includes("tinhlagi.pro/logo.jpg") &&
    !awayError;

  return (
    <div
      onClick={() => onSelect(match)}
      className={`group relative rounded-2xl sm:rounded-3xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
        isSelected
          ? "bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border-netflix-red shadow-xl shadow-red-950/60 ring-2 ring-netflix-red/60 scale-[1.02]"
          : "bg-gradient-to-b from-zinc-900/90 to-zinc-950/80 border-white/10 hover:border-white/35 hover:bg-zinc-900 hover:shadow-xl hover:shadow-black/70 hover:-translate-y-1"
      }`}
    >
      {/* 1. HEADER: KÊNH, THỜI GIAN & HUY HIỆU CHẤT LƯỢNG (FHD / HD) */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {match.timeline === "live" ? (
            <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] flex items-center gap-1.5 shadow-md shadow-red-950/60 tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>ĐANG ĐÁ</span>
            </span>
          ) : null}

          <span className="px-2.5 py-0.5 rounded-full bg-netflix-red/15 border border-netflix-red/30 text-rose-400 font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-netflix-red" />
            <span>{match.group}</span>
          </span>

          {match.tournament && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black text-[10px] tracking-wide shadow-sm">
              🏆 {match.tournament}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* HUY HIỆU CHẤT LƯỢNG NỔI BẬT */}
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${
              isFhd
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-950/40"
                : "bg-sky-500/15 border-sky-500/40 text-sky-400 shadow-sky-950/40"
            }`}
          >
            {match.quality}
          </span>

          <span className="text-[11px] text-gray-400 font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
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
              className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                reminded
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                  : "bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white border-white/10"
              }`}
            >
              <Bell
                className={`w-3 h-3 ${
                  reminded ? "fill-amber-400 text-amber-400 animate-pulse" : ""
                }`}
              />
              <span className="hidden sm:inline">
                {reminded ? "Đã hẹn" : "Nhắc tôi"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KHU VỰC LOGO & ĐỐI ĐẦU (DUAL CLUB SCOREBOARD - CHUẨN ĐỈNH CAO) */}
      <div className="my-2.5 p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-black/70 to-zinc-950/90 border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* ĐỘI NHÀ (TEAM 1) */}
          <div className="flex-1 flex flex-col items-center text-center group/team">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-zinc-850 to-zinc-950 border-2 border-white/15 p-2.5 flex items-center justify-center shadow-xl mb-2 overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-netflix-red/60 group-hover:shadow-red-950/40">
              {validHomeLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={match.homeLogo}
                  alt={match.team1}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={() => setHomeError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-xl sm:text-2xl font-black text-rose-400 tracking-wider">
                    {getTeamInitials(match.team1)}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">
                    CLB
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 leading-tight group-hover:text-rose-400 transition min-h-[2rem] flex items-center justify-center">
              {match.team1}
            </span>
          </div>

          {/* HUY HIỆU VS TRUNG TÂM */}
          <div className="flex flex-col items-center flex-shrink-0 px-1 -mt-5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-800/90 border border-white/20 flex items-center justify-center shadow-inner">
              <span className="text-[11px] sm:text-xs font-black text-rose-400 tracking-wider">
                VS
              </span>
            </div>
          </div>

          {/* ĐỘI KHÁCH (TEAM 2) */}
          <div className="flex-1 flex flex-col items-center text-center group/team">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-zinc-850 to-zinc-950 border-2 border-white/15 p-2.5 flex items-center justify-center shadow-xl mb-2 overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-netflix-red/60 group-hover:shadow-red-950/40">
              {validAwayLogo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={match.awayLogo}
                  alt={match.team2}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={() => setAwayError(true)}
                  loading="lazy"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-xl sm:text-2xl font-black text-sky-400 tracking-wider">
                    {getTeamInitials(match.team2)}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">
                    CLB
                  </span>
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 leading-tight group-hover:text-rose-400 transition min-h-[2rem] flex items-center justify-center">
              {match.team2 || "Đối thủ"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FOOTER: BLV TIẾNG VIỆT & SỐ LƯỢNG MÁY CHỦ */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
        {match.blv ? (
          <span className="text-rose-400 font-bold flex items-center gap-1 truncate">
            <span>🎙️</span>
            <span className="truncate">{match.blv}</span>
          </span>
        ) : (
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <span>⚽</span>
            <span>Bình luận TV</span>
          </span>
        )}

        <span className="text-gray-400 flex items-center gap-1 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{match.servers.length} máy chủ</span>
        </span>
      </div>
    </div>
  );
}

export const MatchCard = React.memo(MatchCardInner);
export default MatchCard;
