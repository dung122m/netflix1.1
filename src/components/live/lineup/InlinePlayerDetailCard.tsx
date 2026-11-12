"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Trophy,
  Calendar,
  Globe,
  Ruler,
  MapPin,
  User,
} from "lucide-react";
import { AthleteProfile, MatchRosterPlayer } from "@/services/live/football-score/types";
import {
  fetchAthleteProfileClient,
  formatBirthDate,
  getCachedAthleteProfile,
} from "./athleteProfileClient";
import { translatePosition, translateStatName } from "./lineupTranslators";

/**
 * Card chi tiết cầu thủ hiển thị inline ngay dưới sân cỏ, không mở modal che video
 */
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

  // Guard chống rò rỉ state giữa các cầu thủ: nếu profile chưa khớp ID hiện tại thì dùng cache hoặc null ngay lập tức
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

  const espnPhotoValid = Boolean(player.photoUrl && hasValidPhoto);
  const fallbackPhotoUrl =
    !espnPhotoValid && currentProfile?.photoUrl && !fallbackPhotoFailed ? currentProfile.photoUrl : null;
  const activePhotoSrc = espnPhotoValid ? player.photoUrl : fallbackPhotoUrl;
  const isCommonsPhoto = !espnPhotoValid && currentProfile?.photoSource === "wikimedia";

  const hasBio = Boolean(
    currentProfile &&
      (currentProfile.citizenship ||
        currentProfile.dateOfBirth ||
        currentProfile.age ||
        currentProfile.height ||
        currentProfile.weight ||
        currentProfile.birthPlace)
  );

  const isDrawer = variant === "drawer" || variant === "bottom-sheet";

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        isDrawer
          ? "relative w-full max-h-full sm:max-h-[92%] flex flex-col rounded-2xl  bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          : "relative rounded-2xl bg-zinc-900/95  p-3.5 sm:p-4 shadow-xl backdrop-blur-md animate-in fade-in duration-150"
      }
    >
      {/* Header cố định với nút đóng to rõ */}
      <div className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 ${isDrawer ? "bg-zinc-900/95   shrink-0" : ""}`}>
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-zinc-800  overflow-hidden flex items-center justify-center font-sans tabular-nums font-black text-base shrink-0 shadow-inner">
            {activePhotoSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={`${player.id}-${activePhotoSrc}`}
                src={activePhotoSrc}
                alt={player.displayName}
                onError={() => {
                  if (espnPhotoValid) {
                    onImageError(player.id);
                  } else {
                    setFallbackPhotoFailed(true);
                  }
                }}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center text-white/80 ${
                  isHome
                    ? "bg-gradient-to-b from-red-600/40 to-red-950/80"
                    : "bg-gradient-to-b from-sky-500/40 to-sky-950/80"
                }`}
              >
                <User className="w-6 h-6 text-white/70" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-white truncate">
                {player.displayName}
              </h4>
              <span className="font-sans tabular-nums text-xs font-bold text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded shrink-0">
                #{player.jersey || "-"}
              </span>
            </div>
            <p className="text-xs text-zinc-300 font-medium mt-0.5 truncate">
              {translatePosition(player.position)}
            </p>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  player.starter ? "bg-emerald-500/20 text-emerald-400 " : "bg-zinc-800 text-zinc-300 "
                }`}
              >
                {player.starter ? "Đá chính" : "Dự bị"}
              </span>

              {!isMatchScheduled && player.subbedIn && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" />
                  <span>Vào sân {player.subClock ? `(${player.subClock})` : ""}</span>
                </span>
              )}
              {!isMatchScheduled && player.subbedOut && (
                <span className="text-[10px] font-bold text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3" />
                  <span>Ra sân {player.subClock ? `(${player.subClock})` : ""}</span>
                </span>
              )}

              {isCommonsPhoto && currentProfile?.photoLicense && (
                <span
                  className="text-[9.5px] font-medium text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1"
                  aria-label={currentProfile.photoLicenseUrl || `Giấy phép: ${currentProfile.photoLicense}`}
                >
                  <span>Ảnh: Commons ({currentProfile.photoLicense})</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nút đóng to rõ */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông tin cầu thủ"
          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 touch-manipulation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Khung nội dung: cuộn bên trong độc lập */}
      <div className={isDrawer ? "flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-3.5 space-y-3 scrollbar-thin" : "space-y-3"}>
        {/* Hồ sơ & Tiểu sử cầu thủ (Enriched từ ESPN Core + Wikidata) */}
        {loadingProfile ? (
          <div className="mt-3 pt-2.5 animate-pulse space-y-1.5">
            <div className="h-3 w-28 bg-white/10 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <div className="h-10 bg-white/5 rounded-lg" />
              <div className="h-10 bg-white/5 rounded-lg" />
            </div>
          </div>
        ) : hasBio && currentProfile ? (
          <div className="mt-3 pt-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                <span>Hồ sơ cầu thủ</span>
              </div>
              <span className="text-[9.5px] font-sans tabular-nums text-zinc-400/80">
                {currentProfile.provenance?.source === "espn-wikidata-hybrid"
                  ? "Nguồn: ESPN + Wikidata"
                  : currentProfile.provenance?.source === "wikidata"
                    ? "Nguồn: Wikidata"
                    : "Nguồn: ESPN Core"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {currentProfile.citizenship && (
                <div className="p-1.5 px-2 rounded-lg bg-black/40 flex items-center gap-2">
                  {currentProfile.flagUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={currentProfile.flagUrl}
                      alt={currentProfile.citizenship}
                      className="w-4 h-3 object-cover rounded-xs shrink-0"
                    />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[9.5px] text-zinc-400 leading-none">Quốc tịch</p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">{currentProfile.citizenship}</p>
                  </div>
                </div>
              )}

              {currentProfile.dateOfBirth && (
                <div className="p-1.5 px-2 rounded-lg bg-black/40 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9.5px] text-zinc-400 leading-none">Ngày sinh</p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">
                      {formatBirthDate(currentProfile.dateOfBirth)}
                      {currentProfile.age ? ` (${currentProfile.age}t)` : ""}
                    </p>
                  </div>
                </div>
              )}

              {(currentProfile.height || currentProfile.weight) && (
                <div className="p-1.5 px-2 rounded-lg bg-black/40 flex items-center gap-2">
                  <Ruler className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9.5px] text-zinc-400 leading-none">Thể hình</p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">
                      {currentProfile.height || "-"}
                      {currentProfile.weight ? ` • ${currentProfile.weight}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {currentProfile.birthPlace && (
                <div className="p-1.5 px-2 rounded-lg bg-black/40 flex items-center gap-2 col-span-2 sm:col-span-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9.5px] text-zinc-400 leading-none">Nơi sinh</p>
                    <p className="text-[11px] font-bold text-white truncate mt-0.5">{currentProfile.birthPlace}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Thống kê thực tế trong trận */}
        {player.stats && player.stats.length > 0 ? (
          <div className="mt-3 pt-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400">
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Thống kê thực tế trong trận</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {player.stats.map((st, idx) => (
                <div key={idx} className="p-1.5 px-2 rounded-lg bg-black/40 flex items-center justify-between">
                  <span className="text-[10.5px] text-zinc-400 truncate pr-1">
                    {translateStatName(st.displayName)}
                  </span>
                  <span className="font-sans tabular-nums text-xs font-bold text-white shrink-0">
                    {st.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-2.5 pt-2 text-[11px] text-zinc-400 italic">
            {isMatchScheduled
              ? "Trận đấu chưa bắt đầu, thông số cá nhân sẽ cập nhật khi có bóng lăn"
              : "Chưa có thêm thống kê sự kiện của cầu thủ này"}
          </div>
        )}
      </div>
    </div>
  );
}

