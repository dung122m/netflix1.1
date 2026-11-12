"use client";

import React from "react";
import Link from "next/link";
import {
  Award,
  ShieldCheck,
  Loader2,
  Upload,
  History,
  Flame,
  Bookmark,
  FolderHeart,
  MessageSquare,
} from "lucide-react";
import { UserProfile } from "@/types/user";
import { getWatchLevelInfo } from "@/services/userService";
import { isUserAdmin } from "@/lib/adminConfig";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Tooltip } from "@/components/ui/Tooltip";

interface ProfileHeroCardProps {
  email?: string | null;
  profile: UserProfile | null;
  effectiveAvatar: string;
  effectiveDisplayName: string;
  levelInfo: ReturnType<typeof getWatchLevelInfo>;
  watchMins: number;
  watchHours: string;
  progressPct: number;
  isUploadingAvatar: boolean;
  onTriggerAvatarUpload: () => void;
  watchHistoryCount: number;
  watchlistCount: number;
  collectionsCount: number;
  commentsCount: number;
  onOpenCommentsTab: () => void;
}

export function ProfileHeroCard({
  email,
  profile,
  effectiveAvatar,
  effectiveDisplayName,
  levelInfo,
  watchMins,
  watchHours,
  progressPct,
  isUploadingAvatar,
  onTriggerAvatarUpload,
  watchHistoryCount,
  watchlistCount,
  collectionsCount,
  commentsCount,
  onOpenCommentsTab,
}: ProfileHeroCardProps) {
  return (
    <div className="relative rounded-3xl bg-zinc-900/70 p-5 sm:p-7 shadow-2xl overflow-hidden space-y-6">
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-6 text-center md:text-left">
        {/* Avatar with edit prompt */}
        <div className="relative group shrink-0">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/10 group-hover:ring-netflix-red/60 transition-all duration-300 overflow-hidden shadow-2xl">
            <UserAvatar
              src={effectiveAvatar || undefined}
              name={effectiveDisplayName}
              sizeClassName="w-full h-full text-3xl font-black"
            />
          </div>
          <Tooltip
            content={isUploadingAvatar ? "Đang tải ảnh..." : "Đổi ảnh đại diện"}
            side="top"
            wrapperClassName="absolute bottom-0 right-0 z-10"
          >
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={onTriggerAvatarUpload}
              aria-label={isUploadingAvatar ? "Đang tải ảnh..." : "Đổi ảnh đại diện"}
              className="p-2 rounded-full bg-netflix-red hover:brightness-110 active:brightness-90 text-white shadow-lg transition-transform duration-200 hover:scale-110 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* User Details */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate max-w-sm">
              {effectiveDisplayName}
            </h1>

            {/* Rank Pill */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-netflix-red/20 text-netflix-red">
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>{levelInfo.levelName}</span>
            </span>

            {isUserAdmin(email) && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quản trị viên</span>
              </Link>
            )}
          </div>

          <p className="text-xs text-zinc-400 font-medium truncate">{email}</p>

          {profile?.bio && (
            <p className="text-xs sm:text-sm text-zinc-300 italic max-w-xl line-clamp-2 pt-0.5">
              &ldquo;{profile.bio}&rdquo;
            </p>
          )}

          {/* Level Progress Bar */}
          <div className="pt-2 space-y-1.5 max-w-md mx-auto md:mx-0">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300">
                {levelInfo.nextLevelName ? `Tiến độ lên ${levelInfo.nextLevelName}:` : "Đã đạt cấp tối đa!"}
              </span>
              <span className="tabular-nums font-medium text-amber-400">
                {watchMins} {levelInfo.nextMinMinutes ? `/ ${levelInfo.nextMinMinutes} phút` : "phút"}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-netflix-red rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(4, progressPct))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3 pt-4 border-t border-white/[0.08]">
        <Link
          href="/my-list?tab=history"
          className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition flex flex-col items-center justify-center text-center group"
        >
          <History className="w-4 h-4 text-zinc-400 group-hover:text-white mb-1 group-hover:scale-110 transition-all" />
          <span className="text-base sm:text-lg font-black text-white tabular-nums">{watchHistoryCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Lịch sử xem</span>
        </Link>

        <div className="p-3 rounded-xl bg-white/[0.03] flex flex-col items-center justify-center text-center">
          <Flame className="w-4 h-4 text-zinc-400 mb-1" />
          <span className="text-base sm:text-lg font-black text-white tabular-nums">{watchHours}h</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Thời gian cày</span>
        </div>

        <Link
          href="/my-list?tab=watchlist"
          className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition flex flex-col items-center justify-center text-center group"
        >
          <Bookmark className="w-4 h-4 text-zinc-400 group-hover:text-white mb-1 group-hover:scale-110 transition-all" />
          <span className="text-base sm:text-lg font-black text-white tabular-nums">{watchlistCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Phim đã lưu</span>
        </Link>

        <Link
          href="/my-list?tab=collections"
          className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition flex flex-col items-center justify-center text-center group"
        >
          <FolderHeart className="w-4 h-4 text-zinc-400 group-hover:text-white mb-1 group-hover:scale-110 transition-all" />
          <span className="text-base sm:text-lg font-black text-white tabular-nums">{collectionsCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">Bộ sưu tập</span>
        </Link>

        <button
          type="button"
          onClick={onOpenCommentsTab}
          className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition flex flex-col items-center justify-center text-center group cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-zinc-400 group-hover:text-white mb-1 group-hover:scale-110 transition-all" />
          <span className="text-base sm:text-lg font-black text-white tabular-nums">{commentsCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">
            <span className="sm:hidden">Đánh giá</span>
            <span className="hidden sm:inline">Đánh giá & Review</span>
          </span>
        </button>
      </div>
    </div>
  );
}

