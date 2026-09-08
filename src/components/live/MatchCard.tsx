"use client";

import React, { useState } from "react";
import { FootballMatch } from "@/services/liveFootballService";
import { Play, Radio, Sparkles } from "lucide-react";

interface MatchCardProps {
  match: FootballMatch;
  isSelected: boolean;
  onSelect: (match: FootballMatch) => void;
}

export function MatchCard({ match, isSelected, onSelect }: MatchCardProps) {
  const [homeError, setHomeError] = useState(false);
  const [awayError, setAwayError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  const isFhd = match.quality.includes("FHD");

  const hasSeparateLogos =
    Boolean(match.homeLogo) &&
    Boolean(match.awayLogo) &&
    !match.awayLogo?.includes("tinhlagi.pro/logo.jpg");

  return (
    <div
      onClick={() => onSelect(match)}
      className={`group relative rounded-2xl border p-4 cursor-pointer transition-all duration-300 flex flex-col justify-between ${
        isSelected
          ? "bg-gradient-to-b from-zinc-900 via-zinc-900 to-zinc-950 border-netflix-red shadow-xl shadow-red-950/50 ring-2 ring-netflix-red/50 scale-[1.02]"
          : "bg-gradient-to-b from-zinc-900/90 to-zinc-950/80 border-white/10 hover:border-white/30 hover:bg-zinc-900 hover:shadow-lg hover:shadow-black/60 hover:-translate-y-1"
      }`}
    >
      {/* 1. HEADER: KÊNH, THỜI GIAN & HUY HIỆU CHẤT LƯỢNG (FHD / HD) */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="px-2.5 py-1 rounded-full bg-netflix-red/15 border border-netflix-red/30 text-rose-400 font-bold text-[11px] flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-netflix-red animate-ping" />
          <span>{match.group}</span>
        </span>

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
        </div>
      </div>

      {/* 2. KHU VỰC LOGO & ĐỐI ĐẦU (VISUAL MATCHUP SCOREBOARD) */}
      <div className="my-2 py-2 px-3 rounded-xl bg-black/40 border border-white/5">
        {hasSeparateLogos ? (
          /* TRÌNH BÀY 2 LOGO 2 ĐỘI TÁCH BIỆT */
          <div className="flex items-center justify-between gap-3">
            {/* ĐỘI 1 */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 p-1.5 flex items-center justify-center shadow-md mb-1.5 overflow-hidden">
                {!homeError && match.homeLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={match.homeLogo}
                    alt={match.team1}
                    className="w-full h-full object-contain"
                    onError={() => setHomeError(true)}
                  />
                ) : (
                  <span className="text-base font-bold text-gray-400">
                    {match.team1.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition">
                {match.team1}
              </span>
            </div>

            {/* HUY HIỆU VS Ở GIỮA */}
            <div className="flex flex-col items-center flex-shrink-0 px-2">
              <span className="px-2 py-1 rounded-full bg-zinc-800 border border-white/10 text-[10px] font-black text-rose-400 tracking-wider shadow-inner">
                VS
              </span>
            </div>

            {/* ĐỘI 2 */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 p-1.5 flex items-center justify-center shadow-md mb-1.5 overflow-hidden">
                {!awayError && match.awayLogo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={match.awayLogo}
                    alt={match.team2}
                    className="w-full h-full object-contain"
                    onError={() => setAwayError(true)}
                  />
                ) : (
                  <span className="text-base font-bold text-gray-400">
                    {match.team2.slice(0, 2).toUpperCase() || "⚽"}
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-white line-clamp-1 group-hover:text-rose-400 transition">
                {match.team2 || "Đối thủ"}
              </span>
            </div>
          </div>
        ) : (
          /* TRÌNH BÀY GRAPHIC MERGED LOGO CỦA M3U */
          <div className="flex items-center gap-3">
            {match.logo && !bannerError ? (
              <div className="w-16 h-12 flex-shrink-0 rounded-lg bg-zinc-900 border border-white/10 p-1 flex items-center justify-center overflow-hidden shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={match.logo}
                  alt={match.title}
                  className="w-full h-full object-contain"
                  onError={() => setBannerError(true)}
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-lg">
                ⚽
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition truncate leading-snug">
                {match.team1}
              </h3>
              <div className="text-[10px] text-gray-500 font-semibold my-0.5">
                vs
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition truncate leading-snug">
                {match.team2 || match.title}
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* 3. FOOTER: BLV TIẾNG VIỆT & SỐ LƯỢNG MÁY CHỦ */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
        <span className="truncate max-w-[150px] font-medium text-gray-300">
          {match.blv ? `🎙️ ${match.blv}` : "🎙️ BLV Tiếng Việt"}
        </span>

        <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-300 group-hover:text-white transition">
          <Play className="w-3.5 h-3.5 fill-current text-netflix-red" />
          <span>{match.servers.length} nguồn phát</span>
        </span>
      </div>
    </div>
  );
}

export default MatchCard;
