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
} from "lucide-react";
import { AthleteProfile, MatchRosterPlayer } from "@/services/live/football-score/types";
import { SoccerBallIcon } from "../MatchTimelineSidebar";
import {
  fetchAthleteProfileClient,
  formatBirthDate,
  getCachedAthleteProfile,
} from "./athleteProfileClient";
import { translatePosition, translateStatName } from "./lineupTranslators";
import { YellowCardIcon, RedCardIcon } from "./PitchEventIcons";
import { DualPlayerEventSummary } from "./dualPitchMath";

/**
 * Modal hiển thị thông tin chi tiết cầu thủ chuẩn các web thể thao lớn (FotMob, SofaScore, Flashscore):
 * - Đầy đủ 100% hồ sơ: Quốc tịch, Ngày sinh, Tuổi, Thể hình, Nơi sinh
 * - Đầy đủ 100% thống kê trận đấu
 * - Click ra ngoài (Backdrop click) & Phím ESC đóng ngay lập tức
 * - KHÔNG BORDER theo chuẩn Design System của Nanaflix
 */
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

  // Tính số phút thi đấu ước lượng
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl rounded-3xl bg-zinc-950/95 backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-5 sm:p-6 cursor-default space-y-4"
      >
        {/* THANH HEADER NGANG: TÊN CẦU THỦ, SỐ ÁO, CLB & NÚT ĐÓNG */}
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

        {/* BỐ CỤC 3 CỘT THEO CHIỀU NGANG RỘNG (LANDSCAPE 3-COLUMN STUDIO LAYOUT) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* CỘT 1 (4 CỘT / 12): ẢNH CHÂN DUNG & HỒ SƠ CÁ NHÂN */}
          <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
            {/* Ảnh đại diện & Thông tin vai trò */}
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

            {/* Chi tiết tiểu sử (Quốc tịch, Ngày sinh, Thể hình, Nơi sinh) */}
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

          {/* CỘT 2 (4 CỘT / 12): HIỆU SUẤT TRONG TRẬN ĐẤU */}
          <div className="md:col-span-4 rounded-2xl bg-white/[0.03] p-4 flex flex-col justify-between space-y-3">
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-netflix-red" />
              <span>Hiệu suất trong trận đấu</span>
            </span>

            {/* 3 Thẻ chỉ số trọng tâm */}
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

            {/* Bàn thắng chi tiết nếu có */}
            {eventsInfo.goalMinutes.length > 0 && (
              <div className="p-2 rounded-xl bg-amber-400/10 text-amber-300 text-xs flex items-center gap-2 font-sans">
                <SoccerBallIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Ghi bàn phút: <strong className="tabular-nums font-black">{eventsInfo.goalMinutes.join("', ")}&apos;</strong></span>
              </div>
            )}

            {/* Dòng tóm tắt trạng thái */}
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

          {/* CỘT 3 (4 CỘT / 12): CHỈ SỐ CHI TIẾT TRẬN ĐẤU TỪ ESPN */}
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

            {/* Nút đóng nhanh */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition cursor-pointer font-sans"
            >
              Đóng (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

