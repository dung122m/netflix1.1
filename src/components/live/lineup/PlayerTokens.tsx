"use client";

import React from "react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";
import { getCachedAthleteProfile } from "./athleteProfileClient";

export type TokenDisplayMode = "jersey" | "badge" | "photo";

/**
 * Áo đấu tối giản hiện đại (Minimalist Kit Node) phong cách Sofascore / FotMob
 */
export function VectorJerseyToken({
  number,
  roleAbbr,
  isHome,
  isGK,
}: {
  number?: string;
  roleAbbr: string;
  isHome: boolean;
  isGK: boolean;
}) {
  const rawNum = number && number.trim() ? number.trim() : "";
  const displayNumber = rawNum || roleAbbr;
  const fillColor = isGK ? "#eab308" : isHome ? "#dc2626" : "#0284c7";
  const textColor = isGK ? "#09090b" : "#ffffff";

  return (
    <div className="relative w-[26px] h-[26px] min-[360px]:w-[28px] min-[360px]:h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center select-none">
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 5 L13 8 C14 8.8 18 8.8 19 8 L23 5 L29 9 L26.5 14 L23.5 12.5 V27 C23.5 28 22.5 28.5 21.5 28.5 H10.5 C9.5 28.5 8.5 28 8.5 27 V12.5 L5.5 14 L3 9 L9 5 Z"
          fill={fillColor}
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M13 8 C14 9.5 18 9.5 19 8"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <text
          x="16"
          y="21.5"
          textAnchor="middle"
          fill={textColor}
          fontSize="10.5"
          fontWeight="700"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        >
          {displayNumber}
        </text>
      </svg>
    </div>
  );
}

/**
 * Huy hiệu số áo tròn phong cách Sofascore / FotMob hiện đại
 * Thiết kế Flat Matte tinh gọn, viền trắng mảnh 1.5px, số áo sans-serif sắc nét, không bóng kính Web 2.0
 */
export function CircularBadgeToken({
  number,
  roleAbbr,
  isHome,
  isGK,
}: {
  number?: string;
  roleAbbr: string;
  isHome: boolean;
  isGK: boolean;
}) {
  const rawNum = number && number.trim() ? number.trim() : "";
  const displayNumber = rawNum || roleAbbr;

  return (
    <div
      className={`relative w-[26px] h-[26px] min-[360px]:w-[28px] min-[360px]:h-[28px] sm:w-[32px] sm:h-[32px] rounded-full flex items-center justify-center font-sans font-bold text-[10px] min-[360px]:text-[11px] sm:text-xs select-none transition-shadow duration-150 ${
        isGK
          ? "bg-[#eab308] text-zinc-950  shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
          : isHome
            ? "bg-[#dc2626] text-white  shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
            : "bg-[#0284c7] text-white  shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
      }`}
    >
      {/* Số áo in sắc nét ở trung tâm */}
      <span className="relative z-10 leading-none tracking-tight">
        {displayNumber}
      </span>
    </div>
  );
}

/**
 * Avatar ảnh chụp khuôn mặt cầu thủ (fallback sang số áo nếu không có ảnh)
 */
export function PhotoToken({
  player,
  isHome,
  hasValidPhoto,
  roleAbbr,
  onImageError,
}: {
  player: MatchRosterPlayer;
  isHome: boolean;
  hasValidPhoto: boolean;
  roleAbbr: string;
  onImageError: (id: string) => void;
}) {
  const cachedPhoto = !player.photoUrl ? getCachedAthleteProfile(player.id)?.photoUrl : null;
  const displayPhoto = hasValidPhoto && player.photoUrl ? player.photoUrl : cachedPhoto;

  return (
    <div
      className={`w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] md:w-[34px] md:h-[34px] rounded-full flex items-center justify-center overflow-hidden transition-all shadow-md ${
        isHome
          ? "bg-zinc-900  shadow-black/50   group-hover:ring-white/50"
          : "bg-zinc-900  shadow-black/50   group-hover:ring-white/50"
      }`}
    >
      {displayPhoto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={displayPhoto}
          alt={player.displayName}
          loading="lazy"
          onError={() => onImageError(player.id)}
          className="w-full h-full object-cover object-top"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-sans tabular-nums font-black text-[10px] sm:text-[11.5px] md:text-xs ${
            isHome
              ? "bg-gradient-to-b from-red-600 to-red-900 text-white"
              : "bg-gradient-to-b from-sky-500 to-sky-800 text-white"
          }`}
        >
          <span>{player.jersey || roleAbbr}</span>
        </div>
      )}
    </div>
  );
}

