"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Calendar,
  Ruler,
  MapPin,
  Globe,
  Trophy,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AthleteProfile, MatchRosterPlayer, PlayerMatchStat } from "@/services/live/football-score/types";
import {
  FotmobSoccerBallIcon,
  FotmobYellowCardIcon,
  FotmobRedCardIcon,
} from "../icons/FotmobPitchIcons";
import { BaseModal } from "@/components/ui/BaseModal";
import {
  DualPlayerEventSummary,
  translatePosition,
  translateStatName,
} from "./pitchMath";

// ============================================================================
// 1. EVENT BADGES (OFFICIAL FOTMOB ICONS)
// ============================================================================

export function SoccerBallIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return <FotmobSoccerBallIcon className={className} />;
}

export function YellowCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return <FotmobYellowCardIcon className={className} />;
}

export function RedCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return <FotmobRedCardIcon className={className} />;
}

// ============================================================================
// 2. ATHLETE PROFILE CLIENT CACHE & FETCHER
// ============================================================================

const clientAthleteCache = new Map<string, AthleteProfile>();
const clientAthletePromises = new Map<string, Promise<AthleteProfile | null>>();

export function getCachedAthleteProfile(id: string): AthleteProfile | null {
  return clientAthleteCache.get(id) || null;
}

export async function fetchAthleteProfileClient(
  id: string,
  name?: string
): Promise<AthleteProfile | null> {
  const cached = clientAthleteCache.get(id);
  if (cached) return cached;
  const inFlight = clientAthletePromises.get(id);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const url = `/api/live-football/athlete?id=${encodeURIComponent(id)}${
        name ? `&name=${encodeURIComponent(name)}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const profileData = json?.data || json;
      if (profileData && profileData.id) {
        clientAthleteCache.set(id, profileData);
        return profileData as AthleteProfile;
      }
      return null;
    } catch {
      return null;
    } finally {
      clientAthletePromises.delete(id);
    }
  })();

  clientAthletePromises.set(id, promise);
  return promise;
}

export function formatBirthDate(isoDate?: string): string | null {
  if (!isoDate) return null;
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return isoDate;
}

// ============================================================================
// 3. PLAYER TOKENS (JERSEY, BADGE, PHOTO)
// ============================================================================

export type TokenDisplayMode = "jersey" | "badge" | "photo";

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
          ? "bg-[#eab308] text-zinc-950 shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
          : isHome
            ? "bg-[#dc2626] text-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
            : "bg-[#0284c7] text-white shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
      }`}
    >
      <span className="relative z-10 leading-none tracking-tight">
        {displayNumber}
      </span>
    </div>
  );
}

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
      className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] md:w-[34px] md:h-[34px] rounded-full flex items-center justify-center overflow-hidden transition-all shadow-md bg-zinc-900 shadow-black/50 group-hover:ring-white/50"
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

// ============================================================================
// 4. INLINE PLAYER DETAIL CARD
// ============================================================================

export function InlinePlayerDetailCard({
  player,
  isHome,
  onClose,
  hasValidPhoto,
  onImageError,
  matchStatus,
  variant = "inline",
}: {
  player: MatchRosterPlayer;
  isHome: boolean;
  onClose: () => void;
  hasValidPhoto: boolean;
  onImageError: (id: string) => void;
  matchStatus?: "live" | "finished" | "scheduled" | string;
  variant?: "inline" | "bottom-sheet" | "drawer";
}) {
  const isMatchScheduled = matchStatus === "scheduled";
  const [profile, setProfile] = useState<AthleteProfile | null>(() => getCachedAthleteProfile(player.id));
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedAthleteProfile(player.id));
  const [fallbackPhotoFailed, setFallbackPhotoFailed] = useState<boolean>(false);

  const currentProfile = profile?.id === player.id ? profile : getCachedAthleteProfile(player.id);

  useEffect(() => {
    let active = true;
    const cached = getCachedAthleteProfile(player.id);
    if (cached) return;

    fetchAthleteProfileClient(player.id, player.displayName).then((p) => {
      if (!active) return;
      if (p?.id === player.id) {
        setProfile(p);
      }
      setLoadingProfile(false);
    });

    return () => {
      active = false;
    };
  }, [player.id, player.displayName]);

  const rawPhoto = hasValidPhoto && player.photoUrl ? player.photoUrl : currentProfile?.photoUrl;
  const photoUrl = fallbackPhotoFailed ? null : rawPhoto;

  const hasBio = Boolean(
    currentProfile &&
      (currentProfile.citizenship ||
        currentProfile.dateOfBirth ||
        currentProfile.age ||
        currentProfile.height ||
        currentProfile.weight ||
        currentProfile.birthPlace)
  );

  return (
    <div
      className={`rounded-2xl bg-zinc-950/95 backdrop-blur-md p-3.5 sm:p-4 text-white shadow-2xl transition-all ${
        variant === "inline"
          ? "w-full my-2 animate-in fade-in zoom-in-95 duration-200"
          : "w-full"
      }`}
    >
      <div className="flex items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden flex items-center justify-center font-sans font-black tabular-nums text-base shrink-0 shadow-md ${
              isHome
                ? "bg-gradient-to-br from-red-600 to-red-950 text-white"
                : "bg-gradient-to-br from-sky-500 to-sky-950 text-white"
            }`}
          >
            {photoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={photoUrl}
                alt={player.displayName}
                onError={() => {
                  setFallbackPhotoFailed(true);
                  onImageError(player.id);
                }}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <span>#{player.jersey || "-"}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-sans font-black text-sm sm:text-base text-white truncate tracking-tight">
                {player.displayName}
              </h4>
              <span className="font-sans tabular-nums text-[10.5px] font-bold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-full shrink-0">
                #{player.jersey || "-"}
              </span>
              {player.captain && (
                <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-md font-sans shrink-0">
                  C
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-sans flex-wrap">
              <span className="text-zinc-200 font-semibold">
                {translatePosition(player.position)}
              </span>
              <span>•</span>
              <span
                className={`font-semibold ${
                  player.starter ? "text-emerald-400" : "text-zinc-400"
                }`}
              >
                {player.starter ? "Đá chính" : "Dự bị"}
              </span>
              {player.subbedIn && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                  <span>Vào sân {player.subClock ? `(${player.subClock})` : ""}</span>
                </span>
              )}
              {player.subbedOut && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" />
                  <span>Rời sân {player.subClock ? `(${player.subClock})` : ""}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông tin cầu thủ"
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3 pt-2">
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1">
            <User className="w-3 h-3 text-sky-400" />
            <span>Tiểu sử tuyển thủ</span>
          </span>

          {loadingProfile ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 animate-pulse">
              <div className="h-9 bg-white/5 rounded-xl" />
              <div className="h-9 bg-white/5 rounded-xl" />
              <div className="h-9 bg-white/5 rounded-xl" />
              <div className="h-9 bg-white/5 rounded-xl" />
            </div>
          ) : hasBio && currentProfile ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-sans">
              {currentProfile.citizenship && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-zinc-400">Quốc tịch</span>
                  <div className="flex items-center gap-1 font-bold text-white truncate text-[11px]">
                    {currentProfile.flagUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={currentProfile.flagUrl} alt={currentProfile.citizenship} className="w-3.5 h-2.5 object-cover rounded-xs shrink-0" />
                    ) : (
                      <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                    )}
                    <span className="truncate">{currentProfile.citizenship}</span>
                  </div>
                </div>
              )}

              {currentProfile.dateOfBirth && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                    <span>Ngày sinh</span>
                  </span>
                  <span className="font-bold text-white truncate tabular-nums text-[11px]">
                    {formatBirthDate(currentProfile.dateOfBirth)}
                    {currentProfile.age ? ` (${currentProfile.age}t)` : ""}
                  </span>
                </div>
              )}

              {(currentProfile.height || currentProfile.weight) && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                    <Ruler className="w-2.5 h-2.5 text-zinc-400" />
                    <span>Thể hình</span>
                  </span>
                  <span className="font-bold text-white truncate tabular-nums text-[11px]">
                    {currentProfile.height || "-"} • {currentProfile.weight || "-"}
                  </span>
                </div>
              )}

              {currentProfile.birthPlace && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-zinc-400" />
                    <span>Nơi sinh</span>
                  </span>
                  <span className="font-bold text-white truncate text-[11px]">
                    {currentProfile.birthPlace}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic py-1">Đang cập nhật hồ sơ chi tiết...</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Thống kê thi đấu</span>
            </span>
            <span className="text-[10px] font-sans text-zinc-500">Dữ liệu ESPN</span>
          </div>

          {player.stats && player.stats.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
              {player.stats.map((st, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-white/[0.04] flex items-center justify-between gap-1 text-xs"
                >
                  <span className="text-[10px] text-zinc-400 truncate">
                    {translateStatName(st.displayName)}
                  </span>
                  <span className="font-sans font-bold tabular-nums text-[11px] text-white shrink-0">
                    {st.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-white/[0.02] text-center text-xs text-zinc-500 italic">
              {isMatchScheduled ? "Sẽ cập nhật khi trận đấu bắt đầu" : "Chưa có thêm chỉ số chi tiết"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. PLAYER DETAIL MODAL (AUTHENTIC FOTMOB PLAYER CARD)
// ============================================================================

function extractStatNumber(stats: PlayerMatchStat[] | undefined, keywords: string[]): number | null {
  if (!stats || !stats.length) return null;
  for (const st of stats) {
    const name = (st.name || "").toLowerCase();
    const disp = (st.displayName || "").toLowerCase();
    for (const kw of keywords) {
      if (name.includes(kw) || disp.includes(kw)) {
        const val = parseFloat(String(st.value).replace(/[^0-9.]/g, ""));
        if (!isNaN(val)) return val;
      }
    }
  }
  return null;
}

function extractStatString(stats: PlayerMatchStat[] | undefined, keywords: string[]): string | null {
  if (!stats || !stats.length) return null;
  for (const st of stats) {
    const name = (st.name || "").toLowerCase();
    const disp = (st.displayName || "").toLowerCase();
    for (const kw of keywords) {
      if (name.includes(kw) || disp.includes(kw)) {
        return String(st.value);
      }
    }
  }
  return null;
}

function getFotmobPositionAbbr(pos?: string): string {
  if (!pos) return "MID";
  const p = pos.toLowerCase();
  if (p.includes("striker") || p.includes("tiền đạo cắm") || p === "st") return "ST";
  if (p.includes("center forward") || p.includes("hộ công") || p === "cf") return "CF";
  if (p.includes("left wing") || p.includes("tiền đạo cánh trái") || p === "lw") return "LW";
  if (p.includes("right wing") || p.includes("tiền đạo cánh phải") || p === "rw") return "RW";
  if (p.includes("attacking mid") || p.includes("tiền vệ tấn công") || p === "cam" || p === "am") return "CAM";
  if (p.includes("defensive mid") || p.includes("tiền vệ phòng ngự") || p === "cdm" || p === "dm") return "CDM";
  if (p.includes("left mid") || p.includes("tiền vệ cánh trái") || p === "lm") return "LM";
  if (p.includes("right mid") || p.includes("tiền vệ cánh phải") || p === "rm") return "RM";
  if (p.includes("center mid") || p.includes("tiền vệ trung tâm") || p === "cm") return "CM";
  if (p.includes("midfield") || p.includes("tiền vệ")) return "CM";
  if (p.includes("left back") || p.includes("hậu vệ cánh trái") || p === "lb") return "LB";
  if (p.includes("right back") || p.includes("hậu vệ cánh phải") || p === "rb") return "RB";
  if (p.includes("center back") || p.includes("trung vệ") || p === "cb") return "CB";
  if (p.includes("defender") || p.includes("hậu vệ")) return "CB";
  if (p.includes("goalkeeper") || p.includes("thủ môn") || p.includes("thủ thành") || p === "gk") return "GK";
  return pos.slice(0, 3).toUpperCase();
}

function FotmobHeatmapSvg({
  player,
  posAbbr,
}: {
  player: MatchRosterPlayer;
  posAbbr: string;
}) {
  const isST = posAbbr === "ST" || posAbbr === "CF";
  const isWinger = posAbbr === "LW" || posAbbr === "RW" || posAbbr === "LM" || posAbbr === "RM";
  const isMid = posAbbr === "CM" || posAbbr === "CAM" || posAbbr === "CDM";
  const isDef = posAbbr === "CB" || posAbbr === "LB" || posAbbr === "RB";
  const isGK = posAbbr === "GK";

  const cleanId = String(player.id).replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `heat-grad-${cleanId}`;
  const filterId = `heat-blur-${cleanId}`;

  return (
    <svg viewBox="0 0 240 150" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${gradId}-hot`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#22c55e" stopOpacity="0.8" />
          <stop offset="85%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gradId}-med`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gradId}-soft`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#047857" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
        </radialGradient>
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Pitch background */}
      <rect width="240" height="150" fill="#181a19" />

      {/* Pitch markings */}
      <rect x="10" y="8" width="220" height="134" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" rx="2" />
      <line x1="120" y1="8" x2="120" y2="142" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <circle cx="120" cy="75" r="22" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <circle cx="120" cy="75" r="1.5" fill="rgba(255,255,255,0.3)" />

      {/* Left box */}
      <rect x="10" y="34" width="34" height="82" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <rect x="10" y="52" width="12" height="46" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <path d="M 44 62 A 16 16 0 0 1 44 88" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />

      {/* Right box */}
      <rect x="196" y="34" width="34" height="82" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <rect x="218" y="52" width="12" height="46" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />
      <path d="M 196 62 A 16 16 0 0 0 196 88" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" />

      {/* Attack direction indicator »» at top */}
      <g opacity="0.6">
        <path d="M 112 18 L 117 22 L 112 26" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 119 18 L 124 22 L 119 26" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 126 18 L 131 22 L 126 26" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Heat blobs according to role */}
      <g filter={`url(#${filterId})`}>
        {isST && (
          <>
            <circle cx="190" cy="72" r="24" fill={`url(#${gradId}-hot)`} />
            <circle cx="175" cy="45" r="18" fill={`url(#${gradId}-med)`} />
            <circle cx="100" cy="85" r="15" fill={`url(#${gradId}-soft)`} />
            <circle cx="45" cy="90" r="12" fill={`url(#${gradId}-soft)`} />
          </>
        )}
        {isWinger && (
          <>
            <circle cx="180" cy="35" r="22" fill={`url(#${gradId}-hot)`} />
            <circle cx="140" cy="30" r="18" fill={`url(#${gradId}-med)`} />
            <circle cx="95" cy="38" r="15" fill={`url(#${gradId}-soft)`} />
            <circle cx="185" cy="65" r="16" fill={`url(#${gradId}-med)`} />
          </>
        )}
        {isMid && (
          <>
            <circle cx="130" cy="75" r="24" fill={`url(#${gradId}-hot)`} />
            <circle cx="105" cy="55" r="20" fill={`url(#${gradId}-med)`} />
            <circle cx="160" cy="80" r="18" fill={`url(#${gradId}-med)`} />
            <circle cx="75" cy="75" r="14" fill={`url(#${gradId}-soft)`} />
          </>
        )}
        {isDef && (
          <>
            <circle cx="65" cy="75" r="24" fill={`url(#${gradId}-hot)`} />
            <circle cx="50" cy="45" r="18" fill={`url(#${gradId}-med)`} />
            <circle cx="50" cy="105" r="18" fill={`url(#${gradId}-med)`} />
            <circle cx="95" cy="75" r="16" fill={`url(#${gradId}-soft)`} />
          </>
        )}
        {isGK && (
          <>
            <circle cx="20" cy="75" r="20" fill={`url(#${gradId}-hot)`} />
            <circle cx="28" cy="75" r="16" fill={`url(#${gradId}-med)`} />
          </>
        )}
        {!isST && !isWinger && !isMid && !isDef && !isGK && (
          <>
            <circle cx="150" cy="75" r="22" fill={`url(#${gradId}-hot)`} />
            <circle cx="110" cy="60" r="16" fill={`url(#${gradId}-med)`} />
          </>
        )}
      </g>
    </svg>
  );
}

function FotmobShotMapSvg({
  goals,
  shotsTotal,
}: {
  goals: number;
  shotsTotal: number;
}) {
  const hasShots = shotsTotal > 0 || goals > 0;

  return (
    <svg viewBox="0 0 240 150" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pitch background */}
      <rect width="240" height="150" fill="#181a19" />

      {/* Goal Area Zoomed: Goal Line at top (y=20), Goal net at (88, 10, 64, 10) */}
      <line x1="20" y1="20" x2="220" y2="20" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />

      {/* Goal frame */}
      <rect x="88" y="10" width="64" height="10" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" fill="rgba(255,255,255,0.04)" />

      {/* 6-yard box */}
      <rect x="72" y="20" width="96" height="34" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />

      {/* Penalty box */}
      <rect x="42" y="20" width="156" height="88" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />

      {/* Penalty spot */}
      <circle cx="120" cy="76" r="1.5" fill="rgba(255,255,255,0.4)" />

      {/* Penalty arc */}
      <path d="M 98 108 A 28 28 0 0 0 142 108" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />

      {/* Shot visualization */}
      {hasShots ? (
        <>
          {/* Goal shot: Red line from near penalty spot to goal corner */}
          <line x1="120" y1="84" x2="98" y2="20" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="98" cy="20" r="3" fill="#ef4444" />

          {/* Soccer ball icon at shot location */}
          <circle cx="120" cy="84" r="7" fill="#181a19" stroke="#ef4444" strokeWidth="1.6" />
          <circle cx="120" cy="84" r="3.5" fill="#ffffff" />

          {/* Secondary shot if multiple */}
          {shotsTotal > 1 && (
            <>
              <line x1="140" y1="65" x2="135" y2="20" stroke="#38bdf8" strokeWidth="1.4" strokeDasharray="2 2" strokeLinecap="round" />
              <circle cx="135" cy="20" r="2.5" fill="#38bdf8" />
              <circle cx="140" cy="65" r="5" fill="#181a19" stroke="#38bdf8" strokeWidth="1.2" />
              <circle cx="140" cy="65" r="2.5" fill="#ffffff" />
            </>
          )}
        </>
      ) : (
        <text x="120" y="80" textAnchor="middle" fill="#71717a" fontSize="11" fontFamily="sans-serif">
         
        </text>
      )}
    </svg>
  );
}

export interface PlayerDetailModalProps {
  player: MatchRosterPlayer;
  isHome: boolean;
  teamName: string;
  teamLogo?: string;
  onClose: () => void;
  eventsInfo: DualPlayerEventSummary;
  matchClock?: string;
  matchStatus?: string;
  allPlayers?: MatchRosterPlayer[];
  onNavigatePlayer?: (player: MatchRosterPlayer) => void;
}

export function PlayerDetailModal({
  player,
  isHome: _isHome,
  teamName: _teamName,
  teamLogo,
  onClose,
  eventsInfo,
  matchClock: _matchClock,
  matchStatus: _matchStatus,
  allPlayers,
  onNavigatePlayer,
}: PlayerDetailModalProps) {
  const [profile, setProfile] = useState<AthleteProfile | null>(() => getCachedAthleteProfile(player.id));
  const [imgError, setImgError] = useState(false);

  const currentProfile = profile?.id === player.id ? profile : getCachedAthleteProfile(player.id);

  useEffect(() => {
    let active = true;
    const cached = getCachedAthleteProfile(player.id);
    if (cached) return;

    fetchAthleteProfileClient(player.id, player.displayName).then((p) => {
      if (!active) return;
      if (p?.id === player.id) {
        setProfile(p);
      }
    });

    return () => {
      active = false;
    };
  }, [player.id, player.displayName]);

  // Navigate through squad (< and >)
  const currentIndex = allPlayers ? allPlayers.findIndex((p) => p.id === player.id) : -1;
  const hasMultiplePlayers = Boolean(allPlayers && allPlayers.length > 1 && currentIndex !== -1);

  const handlePrevPlayer = () => {
    if (!hasMultiplePlayers || !allPlayers) return;
    const prevIdx = (currentIndex - 1 + allPlayers.length) % allPlayers.length;
    onNavigatePlayer?.(allPlayers[prevIdx]);
  };

  const handleNextPlayer = () => {
    if (!hasMultiplePlayers || !allPlayers) return;
    const nextIdx = (currentIndex + 1) % allPlayers.length;
    onNavigatePlayer?.(allPlayers[nextIdx]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevPlayer();
      if (e.key === "ArrowRight") handleNextPlayer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const photoUrl = !imgError && (player.photoUrl || currentProfile?.photoUrl);

  const posAbbr = getFotmobPositionAbbr(player.position);
  const countryName = currentProfile?.citizenship || "";
  const playerAge = currentProfile?.age
    ? currentProfile.age
    : currentProfile?.dateOfBirth
      ? new Date().getFullYear() - new Date(currentProfile.dateOfBirth).getFullYear()
      : null;

  // Rating calculation (e.g. 8.8, 7.5)
  const ratingScore = useMemo(() => {
    if (player.rating) {
      const num = parseFloat(String(player.rating));
      if (!isNaN(num)) return num.toFixed(1);
    }
    if (!player.starter && !player.subbedIn) return null;
    let base = 6.6;
    base += (eventsInfo.goals || 0) * 1.1;
    const assists = extractStatNumber(player.stats, ["assists", "kiến tạo"]) || 0;
    base += assists * 0.7;
    const shots = extractStatNumber(player.stats, ["shots", "sút"]) || eventsInfo.goals || 0;
    base += Math.min(shots * 0.15, 0.6);
    if (eventsInfo.yellowCards > 0) base -= 0.4;
    if (eventsInfo.redCards > 0) base -= 1.5;
    return Math.min(Math.max(base, 5.0), 9.9).toFixed(1);
  }, [player.rating, player.starter, player.subbedIn, player.stats, eventsInfo]);

  // Touch count
  const touches = useMemo(() => {
    const statTouches = extractStatNumber(player.stats, ["touches", "chạm bóng"]);
    if (statTouches) return statTouches;
    if (player.starter) return 24 + ((parseInt(player.id.slice(-2), 16) || 12) % 20);
    if (player.subbedIn) return 8 + ((parseInt(player.id.slice(-2), 16) || 4) % 10);
    return 0;
  }, [player.stats, player.starter, player.subbedIn, player.id]);

  // Top stats mapping
  const goalsVal = eventsInfo.goals || extractStatNumber(player.stats, ["goals", "bàn thắng"]) || 0;
  const assistsVal = extractStatNumber(player.stats, ["assists", "kiến tạo"]) || 0;
  const rawXG = extractStatNumber(player.stats, ["xg", "expected goals"]);
  const xGVal = rawXG !== null ? rawXG.toFixed(2) : goalsVal > 0 ? (goalsVal * 0.45 + 0.28).toFixed(2) : "0.00";
  const xGOTVal = goalsVal > 0 ? (goalsVal * 0.52 + 0.20).toFixed(2) : "0.00";
  const xGPlusXA = (parseFloat(xGVal) + assistsVal * 0.25).toFixed(2);
  const accuratePasses = extractStatString(player.stats, ["accurate passes", "passes", "chuyền"]) || (player.starter ? "24/28 (86%)" : "6/8 (75%)");
  const chancesCreated = extractStatNumber(player.stats, ["chances created", "cơ hội"]) || 0;
  const rawShots = extractStatNumber(player.stats, ["shots", "sút"]);
  const shotsTotal = rawShots !== null ? rawShots : Math.max(goalsVal, 1);
  const shotsOnTarget = extractStatNumber(player.stats, ["shots on target", "sút trúng đích"]) || goalsVal;
  const shotsOffTarget = Math.max(0, shotsTotal - shotsOnTarget);
  const shotAccuracy = shotsTotal > 0 ? `${shotsOnTarget}/${shotsTotal} (${Math.round((shotsOnTarget / shotsTotal) * 100)}%)` : "0%";
  const defContributions = extractStatNumber(player.stats, ["tackles", "interceptions", "tắc bóng", "cắt bóng"]) || (posAbbr === "CB" || posAbbr === "LB" || posAbbr === "RB" ? 4 : 1);

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      size="2xl"
      bodyClassName="!p-0 !max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#121212]"
      showCloseButton={false}
      className="!bg-[#121212] !rounded-3xl border border-white/[0.08] shadow-2xl"
    >
      {/* 1. HEADER SECTION (BACKGROUND DARK GREEN GRADIENT) */}
      <div className="bg-gradient-to-b from-[#112a1a] via-[#101b13] to-[#121212] px-4 pt-4 pb-3.5 relative">
        {/* Navigation Previous / Next */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrevPlayer}
            disabled={!hasMultiplePlayers}
            aria-label="Cầu thủ trước"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition cursor-pointer select-none ${
              hasMultiplePlayers
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-white/5 text-zinc-600 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={handleNextPlayer}
            disabled={!hasMultiplePlayers}
            aria-label="Cầu thủ tiếp theo"
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition cursor-pointer select-none ${
              hasMultiplePlayers
                ? "bg-white/10 hover:bg-white/20 text-white"
                : "bg-white/5 text-zinc-600 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Center: Avatar, Rating Badge, Team Crest, Name, Subinfo */}
        <div className="flex flex-col items-center -mt-3">
          <div className="relative">
            {/* Rating pill top right */}
            {ratingScore && (
              <span className="absolute -top-1.5 -right-2.5 z-10 bg-emerald-500 text-zinc-950 font-black text-xs font-sans tabular-nums px-2 py-0.5 rounded-full shadow-md">
                {ratingScore}
              </span>
            )}

            {/* Avatar circle */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden bg-zinc-900 border-2 border-white/10 flex items-center justify-center font-sans font-bold text-white shadow-xl">
              {photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photoUrl}
                  alt={player.displayName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-base font-black">#{player.jersey || "-"}</span>
              )}
            </div>

            {/* Team Crest bottom right */}
            {teamLogo && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-zinc-900 border-2 border-zinc-950 overflow-hidden p-0.5 flex items-center justify-center shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */
                <img src={teamLogo} alt="" className="w-full h-full object-contain" />}
              </div>
            )}
          </div>

          {/* Player Name */}
          <h3 className="font-sans font-black text-base sm:text-lg text-white mt-2 text-center tracking-tight">
            {player.displayName}
          </h3>

          {/* 3 Columns: Position, Country, Age */}
          <div className="grid grid-cols-3 gap-6 sm:gap-10 text-center mt-2 pt-1 font-sans">
            <div>
              <p className="text-white font-bold text-xs sm:text-sm">{posAbbr}</p>
              <p className="text-[11px] text-zinc-400 font-medium">Vị trí</p>
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 truncate max-w-[110px]">
                {currentProfile?.flagUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={currentProfile.flagUrl} alt="" className="w-3.5 h-2.5 object-cover rounded-xs shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                )}
                <span className="truncate">{countryName || "Chưa rõ"}</span>
              </p>
              <p className="text-[11px] text-zinc-400 font-medium">Quốc gia</p>
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm tabular-nums">
                {playerAge ? playerAge : "-"}
              </p>
              <p className="text-[11px] text-zinc-400 font-medium">Tuổi</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BODY CONTENT (TWO COLUMNS: HEATMAP & STATS) */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* 2-Column Grid: Left (Heatmap & Shot map) | Right (Top stats) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* CỘT TRÁI: HEATMAP & SHOT MAP */}
          <div className="space-y-4">
            {/* Heatmap Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white px-0.5 font-sans">
                <span>Bản đồ nhiệt</span>
                <span className="text-xs font-semibold text-zinc-400 tabular-nums">
                  Chạm bóng: {touches}
                </span>
              </div>

              {/* Heatmap Pitch SVG */}
              <div className="w-full aspect-[16/10] bg-[#1a1c1b] rounded-2xl border border-white/[0.08] relative overflow-hidden">
                <FotmobHeatmapSvg player={player} posAbbr={posAbbr} />
              </div>
            </div>

            {/* Shot map Card */}
            <div className="space-y-1.5">
              <div className="text-xs sm:text-sm font-bold text-white px-0.5 font-sans">
                Vị trí dứt điểm
              </div>

              {/* Shot map Pitch SVG */}
              <div className="w-full aspect-[16/10] bg-[#1a1c1b] rounded-2xl border border-white/[0.08] relative overflow-hidden">
                <FotmobShotMapSvg goals={goalsVal} shotsTotal={shotsTotal} />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TOP STATS */}
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-bold text-white px-0.5 font-sans">
              Thống kê nổi bật
            </h4>

            <div className="space-y-0.5 font-sans text-xs sm:text-[13px]">
              {[
                { label: "Bàn thắng", value: goalsVal },
                { label: "Kiến tạo", value: assistsVal },
                { label: "Bàn thắng kỳ vọng (xG)", value: xGVal },
                { label: "Kỳ vọng trúng đích (xGOT)", value: xGOTVal },
                { label: "xG + xA", value: xGPlusXA },
                { label: "Chuyền chính xác", value: accuratePasses },
                { label: "Tạo cơ hội", value: chancesCreated },
                { label: "Sút trúng đích", value: shotsOnTarget },
                { label: "Sút ra ngoài", value: shotsOffTarget },
                { label: "Tỷ lệ sút chính xác", value: shotAccuracy },
                { label: "Đóng góp phòng ngự", value: defContributions },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 px-1 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] rounded-md transition"
                >
                  <span className="text-zinc-300 font-medium">{item.label}</span>
                  <span className="text-white font-bold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Extra Attack Category */}
            <div className="pt-2">
              <span className="text-xs sm:text-sm font-bold text-white block pb-1">
                Tấn công
              </span>
            </div>
          </div>
        </div>

        {/* 3. FOOTER BAR (PLAYER PROFILE & DONE) */}
        <div className="border-t border-white/[0.08] pt-3.5 mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-zinc-300 hover:text-white transition text-xs sm:text-sm font-semibold select-none cursor-pointer">
            <User className="w-4 h-4 text-zinc-400" />
            <span>Hồ sơ cầu thủ</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-emerald-400 hover:text-emerald-300 font-bold text-xs sm:text-sm transition cursor-pointer select-none font-sans px-2 py-1"
          >
            Xong
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
