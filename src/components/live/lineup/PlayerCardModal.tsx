"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Users,
  Calendar,
  Ruler,
  MapPin,
  Globe,
  Trophy,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Shield,
  Activity,
  User,
} from "lucide-react";
import { AthleteProfile, MatchRosterPlayer } from "@/services/live/football-score/types";
import { SoccerBallIcon } from "../MatchTimelineSidebar";
import { BaseModal } from "@/components/ui/BaseModal";
import {
  DualPlayerEventSummary,
  translatePosition,
  translateStatName,
} from "./pitchMath";

// ============================================================================
// 1. EVENT BADGES (YELLOW & RED CARDS)
// ============================================================================

export function YellowCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return (
    <span
      className={`rounded-[1.5px] bg-amber-400 shadow-sm inline-block shrink-0 ${className}`}
      aria-label="Thẻ vàng"
    />
  );
}

export function RedCardIcon({ className = "w-2.5 h-3.5" }: { className?: string }) {
  return (
    <span
      className={`rounded-[1.5px] bg-red-600 shadow-sm inline-block shrink-0 ${className}`}
      aria-label="Thẻ đỏ"
    />
  );
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
// 5. PLAYER DETAIL MODAL (FULL DIALOG VIEW)
// ============================================================================

export interface PlayerDetailModalProps {
  player: MatchRosterPlayer;
  isHome: boolean;
  teamName: string;
  onClose: () => void;
  eventsInfo: DualPlayerEventSummary;
  matchClock?: string;
  matchStatus?: string;
}

export function PlayerDetailModal({
  player,
  isHome,
  teamName,
  onClose,
  eventsInfo,
  matchClock,
  matchStatus,
}: PlayerDetailModalProps) {
  const [profile, setProfile] = useState<AthleteProfile | null>(() => getCachedAthleteProfile(player.id));
  const [loadingProfile, setLoadingProfile] = useState<boolean>(() => !getCachedAthleteProfile(player.id));
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
      setLoadingProfile(false);
    });

    return () => {
      active = false;
    };
  }, [player.id, player.displayName]);

  const photoUrl = !imgError && (player.photoUrl || currentProfile?.photoUrl);

  const estimatedMinutes = useMemo(() => {
    if (player.starter) {
      if (player.subbedOut && player.subClock) {
        return player.subClock.replace(/[^0-9+]/g, "") + "'";
      }
      return matchStatus === "finished" ? "90'" : matchClock || "Đang đá";
    }
    if (player.subbedIn) {
      if (player.subClock) {
        return `Từ phút ${player.subClock}`;
      }
      return "Đã vào sân";
    }
    return "Chưa ra sân";
  }, [player.starter, player.subbedIn, player.subbedOut, player.subClock, matchClock, matchStatus]);

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
    <BaseModal
      isOpen={true}
      onClose={onClose}
      size="5xl"
      bodyClassName="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto"
      showCloseButton={false}
    >
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${
              isHome ? "bg-[#dc2626]" : "bg-[#0284c7]"
            }`}
          />
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-white font-sans truncate tracking-tight">
              {player.displayName}
            </h3>
            <span className="font-sans tabular-nums text-xs font-black text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full shrink-0">
              #{player.jersey || "-"}
            </span>
            {player.captain && (
              <span className="text-[10px] font-black text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-md font-sans shrink-0">
                Đội trưởng (C)
              </span>
            )}
            <span className="text-xs text-zinc-500 font-sans hidden sm:inline">•</span>
            <span className="text-xs text-zinc-300 font-semibold font-sans hidden sm:inline">
              {translatePosition(player.position)}
            </span>
            <span className="text-xs text-zinc-500 font-sans hidden sm:inline">•</span>
            <span className={`text-xs font-bold font-sans hidden sm:inline ${isHome ? "text-rose-400" : "text-sky-400"}`}>
              {teamName}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông tin cầu thủ"
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden flex items-center justify-center font-sans font-black tabular-nums text-xl shrink-0 shadow-lg ${
                isHome
                  ? "bg-gradient-to-br from-rose-600 to-red-950 text-white"
                  : "bg-gradient-to-br from-sky-500 to-sky-950 text-white"
              }`}
            >
              {photoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photoUrl}
                  alt={player.displayName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="flex flex-col items-center">
                  <span>#{player.jersey || "-"}</span>
                  <span className="text-[10px] font-bold opacity-75">
                    {player.position ? player.position.slice(0, 3).toUpperCase() : ""}
                  </span>
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white font-sans truncate">
                {translatePosition(player.position)}
              </p>
              <p className={`text-[11px] font-bold font-sans truncate mt-0.5 ${isHome ? "text-rose-400" : "text-sky-400"}`}>
                {teamName}
              </p>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-sans ${
                    player.starter
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {player.starter ? "Đá chính" : "Dự bị"}
                </span>
                {player.subbedIn && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                    <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>Vào sân {player.subClock ? `(${player.subClock})` : ""}</span>
                  </span>
                )}
                {player.subbedOut && (
                  <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full flex items-center gap-1 font-sans">
                    <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>Rời sân {player.subClock ? `(${player.subClock})` : ""}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-sky-400" />
              <span>Hồ sơ tuyển thủ</span>
            </span>

            {loadingProfile ? (
              <div className="grid grid-cols-2 gap-1.5 animate-pulse">
                <div className="h-10 bg-white/5 rounded-xl" />
                <div className="h-10 bg-white/5 rounded-xl" />
              </div>
            ) : hasBio && currentProfile ? (
              <div className="grid grid-cols-2 gap-1.5 text-xs font-sans">
                {currentProfile.citizenship && (
                  <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
                    <span className="text-[9.5px] text-zinc-400">Quốc tịch</span>
                    <div className="flex items-center gap-1.5 font-bold text-white truncate text-[11px]">
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
                  <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
                    <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5 text-zinc-400" />
                      <span>Ngày sinh / Tuổi</span>
                    </span>
                    <span className="font-bold text-white truncate tabular-nums text-[11px]">
                      {formatBirthDate(currentProfile.dateOfBirth)}
                      {currentProfile.age ? ` (${currentProfile.age}t)` : ""}
                    </span>
                  </div>
                )}

                {(currentProfile.height || currentProfile.weight) && (
                  <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
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
                  <div className="p-2 rounded-xl bg-black/40 flex flex-col gap-0.5">
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
              <div className="p-2 rounded-xl bg-black/40 text-[11px] text-zinc-400">
                <span>CLB: <strong className="text-white">{teamName}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-netflix-red" />
            <span>Hiệu suất trong trận đấu</span>
          </span>

          <div className="grid grid-cols-3 gap-2 text-xs font-sans">
            <div className="p-2.5 rounded-xl bg-black/40 flex flex-col gap-1">
              <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                <span>Thời gian</span>
              </span>
              <span className="font-bold text-white tabular-nums text-sm truncate">
                {estimatedMinutes}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 flex flex-col gap-1">
              <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                <SoccerBallIcon className="w-3 h-3" />
                <span>Bàn thắng</span>
              </span>
              <span className="font-bold text-white tabular-nums text-sm">
                {eventsInfo.goals > 0 ? (
                  <span className="text-amber-300 font-black">{eventsInfo.goals}</span>
                ) : (
                  "0"
                )}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 flex flex-col gap-1">
              <span className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-zinc-400" />
                <span>Thẻ phạt</span>
              </span>
              <div className="flex items-center gap-1 font-bold text-white text-sm">
                {eventsInfo.redCards > 0 ? (
                  <span className="inline-flex items-center gap-1 text-rose-400 text-xs">
                    <RedCardIcon className="w-2.5 h-3.5" />
                    <span>Đỏ</span>
                  </span>
                ) : eventsInfo.yellowCards > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-300 text-xs">
                    <YellowCardIcon className="w-2.5 h-3.5" />
                    <span>{eventsInfo.yellowCards} Vàng</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 font-normal text-xs">0</span>
                )}
              </div>
            </div>
          </div>

          {eventsInfo.goalMinutes.length > 0 && (
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-300 text-xs flex items-center gap-2 font-sans">
              <SoccerBallIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Ghi bàn phút: <strong className="tabular-nums font-black">{eventsInfo.goalMinutes.join("', ")}&apos;</strong></span>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-black/40 text-[11px] text-zinc-300 font-sans flex items-center justify-between">
            <span className="text-zinc-400">Trạng thái thi đấu:</span>
            <span className="font-bold text-white">
              {player.starter
                ? player.subbedOut
                  ? `Đá chính (Ra phút ${player.subClock || ""})`
                  : "Đang đá chính"
                : player.subbedIn
                  ? `Vào sân (Phút ${player.subClock || ""})`
                  : "Dự bị chưa vào sân"}
            </span>
          </div>
        </div>

        <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Chỉ số chi tiết trận đấu</span>
            </div>
            <span className="text-[9.5px] font-sans text-zinc-500">ESPN Core</span>
          </div>

          {player.stats && player.stats.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5 max-h-[175px] overflow-y-auto pr-1 scrollbar-thin">
              {player.stats.map((st, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-black/40 flex items-center justify-between gap-1 text-xs"
                >
                  <span className="text-[10.5px] text-zinc-400 truncate leading-tight pr-1">
                    {translateStatName(st.displayName)}
                  </span>
                  <span className="font-sans font-bold tabular-nums text-xs text-white leading-tight shrink-0">
                    {st.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center text-zinc-500 text-xs italic font-sans">
              <span>{matchStatus === "scheduled" ? "Sẽ cập nhật khi trận đấu bắt đầu" : "Chưa có thêm chỉ số chi tiết"}</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer font-sans"
          >
            Đóng (Esc)
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
