"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AthleteProfile, MatchRosterPlayer } from "@/services/live/football-score/types";
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
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider">
            Tiểu sử tuyển thủ
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
                    {currentProfile.flagUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={currentProfile.flagUrl} alt={currentProfile.citizenship} className="w-3.5 h-2.5 object-cover rounded-xs shrink-0" />
                    )}
                    <span className="truncate">{currentProfile.citizenship}</span>
                  </div>
                </div>
              )}

              {currentProfile.dateOfBirth && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-zinc-400">Ngày sinh</span>
                  <span className="font-bold text-white truncate tabular-nums text-[11px]">
                    {formatBirthDate(currentProfile.dateOfBirth)}
                    {currentProfile.age ? ` (${currentProfile.age}t)` : ""}
                  </span>
                </div>
              )}

              {(currentProfile.height || currentProfile.weight) && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-zinc-400">Thể hình</span>
                  <span className="font-bold text-white truncate tabular-nums text-[11px]">
                    {currentProfile.height || "-"} • {currentProfile.weight || "-"}
                  </span>
                </div>
              )}

              {currentProfile.birthPlace && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[9.5px] text-zinc-400">Nơi sinh</span>
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
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider">
              Thống kê thi đấu
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
// 5. PLAYER DETAIL MODAL (AUTHENTIC ZERO-MOCK REAL DATA ONLY)
// ============================================================================

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
  teamName,
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
  const handlePrevRef = React.useRef(handlePrevPlayer);
  const handleNextRef = React.useRef(handleNextPlayer);
  useEffect(() => {
    handlePrevRef.current = handlePrevPlayer;
    handleNextRef.current = handleNextPlayer;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrevRef.current();
      if (e.key === "ArrowRight") handleNextRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const photoUrl = !imgError && (player.photoUrl || currentProfile?.photoUrl);

  const posAbbr = getFotmobPositionAbbr(player.position);
  const countryName = currentProfile?.citizenship || "";
  const playerAge = currentProfile?.age
    ? currentProfile.age
    : currentProfile?.dateOfBirth
      ? new Date().getFullYear() - new Date(currentProfile.dateOfBirth).getFullYear()
      : null;

  const posTitle = translatePosition(player.position);

  const hasEvents =
    eventsInfo.goals > 0 ||
    eventsInfo.yellowCards > 0 ||
    eventsInfo.redCards > 0 ||
    player.subbedIn ||
    player.subbedOut;

  const hasProfileBio = Boolean(
    currentProfile &&
      (currentProfile.height ||
        currentProfile.weight ||
        currentProfile.dateOfBirth ||
        currentProfile.birthPlace ||
        currentProfile.citizenship)
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      size="lg"
      bodyClassName="!p-0 !max-h-[90vh] overflow-y-auto scrollbar-thin bg-[#121212]"
      showCloseButton={false}
      className="!bg-[#121212] !rounded-3xl border border-white/[0.08] shadow-2xl"
    >
      {/* 1. HEADER SECTION (FOTMOB STYLE HEADER) */}
      <div className="bg-gradient-to-b from-[#112a1a] via-[#101b13] to-[#121212] px-4 pt-4 pb-3.5 relative">
        {/* Điều hướng Trước / Sau */}
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

        {/* Center: Avatar, Team Crest, Name, 3 Columns Info */}
        <div className="flex flex-col items-center -mt-3">
          <div className="relative">
            {/* Điểm rating chỉ hiện nếu có từ nguồn thật */}
            {player.rating && (
              <span className="absolute -top-1.5 -right-2.5 z-10 bg-emerald-500 text-zinc-950 font-black text-xs font-sans tabular-nums px-2 py-0.5 rounded-full shadow-md">
                {player.rating}
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

          {/* Tên cầu thủ */}
          <h3 className="font-sans font-black text-base sm:text-lg text-white mt-2 text-center tracking-tight">
            {player.displayName}
          </h3>

          {/* 3 Cột: Vị trí, Quốc gia, Tuổi */}
          <div className="grid grid-cols-3 gap-6 sm:gap-10 text-center mt-2 pt-1 font-sans">
            <div>
              <p className="text-white font-bold text-xs sm:text-sm" title={posTitle}>
                {posAbbr}
              </p>
              <p className="text-[11px] text-zinc-400 font-medium">Vị trí</p>
            </div>
            <div>
              <p className="text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 truncate max-w-[120px]">
                {currentProfile?.flagUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={currentProfile.flagUrl} alt="" className="w-3.5 h-2.5 object-cover rounded-xs shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
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

      {/* 2. NỘI DUNG (DỮ LIỆU THẬT 100% TỪ ESPN & TRẬN ĐẤU) */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* KHỐI 1: DIỄN BIẾN TRONG TRẬN ĐẤU */}
        <div className="rounded-2xl bg-white/[0.03] p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
              <span>Diễn biến trong trận</span>
            </span>
            <span
              className={`text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full ${
                player.starter
                  ? "bg-emerald-500/15 text-emerald-400"
                  : player.subbedIn
                    ? "bg-sky-500/15 text-sky-400"
                    : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {player.starter
                ? "Đá chính"
                : player.subbedIn
                  ? `Vào sân ${player.subClock ? `(${player.subClock}')` : ""}`
                  : "Dự bị"}
            </span>
          </div>

          <div className="space-y-1.5 text-xs sm:text-[13px] font-sans">
            {/* Vào sân / Rời sân */}
            {player.subbedOut && (
              <div className="flex items-center justify-between py-1 px-1 border-b border-white/[0.04]">
                <span className="text-zinc-400">Rời sân</span>
                <span className="text-amber-300 font-bold tabular-nums">
                  {player.subClock ? `Phút ${player.subClock}'` : "Đã thay ra"}
                </span>
              </div>
            )}

            {/* Bàn thắng */}
            {eventsInfo.goals > 0 && (
              <div className="flex items-center justify-between py-1 px-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <FotmobSoccerBallIcon className="w-3.5 h-3.5" />
                  <span>Bàn thắng</span>
                </span>
                <span className="text-emerald-400 font-bold tabular-nums">
                  {eventsInfo.goals} bàn{" "}
                  {eventsInfo.goalMinutes.length > 0 && `(${eventsInfo.goalMinutes.join("', ")}')`}
                </span>
              </div>
            )}

            {/* Thẻ phạt */}
            {eventsInfo.yellowCards > 0 && (
              <div className="flex items-center justify-between py-1 px-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <FotmobYellowCardIcon className="w-2.5 h-3.5" />
                  <span>Thẻ vàng</span>
                </span>
                <span className="text-amber-400 font-bold tabular-nums">
                  {eventsInfo.yellowCards} thẻ vàng
                </span>
              </div>
            )}

            {eventsInfo.redCards > 0 && (
              <div className="flex items-center justify-between py-1 px-1 border-b border-white/[0.04]">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <FotmobRedCardIcon className="w-2.5 h-3.5" />
                  <span>Thẻ đỏ</span>
                </span>
                <span className="text-rose-400 font-bold tabular-nums">
                  {eventsInfo.redCards} thẻ đỏ
                </span>
              </div>
            )}

            {!hasEvents && (
              <p className="text-zinc-500 italic text-xs py-1">
                Chưa có diễn biến thẻ phạt hoặc bàn thắng cá nhân trong trận này.
              </p>
            )}
          </div>
        </div>

        {/* KHỐI 2: THỐNG KÊ CHI TIẾT TRẬN ĐẤU (THẬT TỪ ESPN) */}
        <div className="rounded-2xl bg-white/[0.03] p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white font-sans">
              Thống kê thi đấu
            </span>
            <span className="text-[10.5px] font-sans text-zinc-500">Dữ liệu ESPN</span>
          </div>

          {player.stats && player.stats.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {player.stats.map((st, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-white/[0.04] flex items-center justify-between gap-2"
                >
                  <span className="text-[11px] text-zinc-400 truncate font-sans">
                    {translateStatName(st.displayName || st.name)}
                  </span>
                  <span className="font-sans font-bold tabular-nums text-xs text-white shrink-0">
                    {st.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/[0.02] text-center text-xs text-zinc-500 italic font-sans">
              Chưa có thêm số liệu thống kê chi tiết cho cầu thủ này trong trận.
            </div>
          )}
        </div>

        {/* KHỐI 3: TIỂU SỬ TUYỂN THỦ (DỮ LIỆU THẬT NẾU CÓ TỪ ESPN) */}
        {hasProfileBio && currentProfile && (
          <div className="rounded-2xl bg-white/[0.03] p-3.5 sm:p-4 space-y-2.5">
            <span className="text-xs font-bold text-white font-sans">Hồ sơ cầu thủ</span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
              {currentProfile.dateOfBirth && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-400">
                    Ngày sinh
                  </span>
                  <span className="font-bold text-white truncate tabular-nums text-xs">
                    {formatBirthDate(currentProfile.dateOfBirth)}
                  </span>
                </div>
              )}

              {(currentProfile.height || currentProfile.weight) && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-400">
                    Thể hình
                  </span>
                  <span className="font-bold text-white truncate tabular-nums text-xs">
                    {currentProfile.height || "-"} • {currentProfile.weight || "-"}
                  </span>
                </div>
              )}

              {currentProfile.birthPlace && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-400">
                    Nơi sinh
                  </span>
                  <span className="font-bold text-white truncate text-xs" title={currentProfile.birthPlace}>
                    {currentProfile.birthPlace}
                  </span>
                </div>
              )}

              {currentProfile.citizenship && (
                <div className="p-2 rounded-xl bg-white/[0.04] flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-400">
                    Quốc tịch
                  </span>
                  <span className="font-bold text-white truncate text-xs" title={currentProfile.citizenship}>
                    {currentProfile.citizenship}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. FOOTER BAR (THÔNG TIN ĐỘI & NÚT XONG) */}
        <div className="border-t border-white/[0.08] pt-3.5 mt-2 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium font-sans">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-300 font-semibold">{teamName}</span>
            <span>•</span>
            <span className="tabular-nums">Số áo #{player.jersey || "-"}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm px-4 py-1.5 rounded-xl transition cursor-pointer select-none font-sans"
          >
            Xong
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
