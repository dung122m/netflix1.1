"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Loader2,
  Upload,
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
  levelInfo?: ReturnType<typeof getWatchLevelInfo>;
  watchMins?: number;
  watchHours: string;
  progressPct?: number;
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
  levelInfo: _levelInfo,
  watchMins: _watchMins,
  watchHours,
  progressPct: _progressPct,
  isUploadingAvatar,
  onTriggerAvatarUpload,
  watchHistoryCount,
  watchlistCount,
  collectionsCount,
  commentsCount,
  onOpenCommentsTab,
}: ProfileHeroCardProps) {
  return (
    <div className="relative rounded-2xl bg-zinc-900/70 p-4 sm:p-6 shadow-xl overflow-hidden space-y-5">
      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-5 text-center sm:text-left">
        {/* Avatar with edit prompt */}
        <div className="relative group shrink-0">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-2 ring-white/10 group-hover:ring-white/25 transition-all duration-300 overflow-hidden shadow-xl">
            <UserAvatar
              src={effectiveAvatar || undefined}
              name={effectiveDisplayName}
              sizeClassName="w-full h-full text-2xl sm:text-3xl font-black"
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
              className="p-1.5 sm:p-2 rounded-full bg-zinc-800 hover:bg-netflix-red text-white ring-2 ring-zinc-950 shadow-lg transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* User Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate max-w-sm">
              {effectiveDisplayName}
            </h1>

            {isUserAdmin(email) && (
              <Link
                href="/admin"
                prefetch={false}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 text-[11px] font-semibold transition"
              >
                <ShieldCheck className="w-3 h-3 text-zinc-300" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          <p className="text-xs text-zinc-400 font-medium truncate">{email}</p>

          {profile?.bio && (
            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl line-clamp-2 pt-0.5">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* 3. QUICK STATS BAR */}
      <div className="grid grid-cols-6 sm:grid-cols-5 gap-2 pt-4 border-t border-white/[0.08]">
        <Link
          href="/my-list?tab=history"
          prefetch={false}
          className="col-span-2 sm:col-span-1 py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition flex flex-col items-center justify-center text-center"
        >
          <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-tight">{watchHistoryCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap mt-0.5">Đã xem</span>
        </Link>

        <div className="col-span-2 sm:col-span-1 py-2.5 px-2 rounded-xl bg-white/[0.04] flex flex-col items-center justify-center text-center">
          <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-tight">{watchHours}h</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap mt-0.5">Thời lượng</span>
        </div>

        <Link
          href="/my-list?tab=watchlist"
          prefetch={false}
          className="col-span-2 sm:col-span-1 py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition flex flex-col items-center justify-center text-center"
        >
          <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-tight">{watchlistCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap mt-0.5">Đã lưu</span>
        </Link>

        <Link
          href="/my-list?tab=collections"
          prefetch={false}
          className="col-span-3 sm:col-span-1 py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition flex flex-col items-center justify-center text-center"
        >
          <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-tight">{collectionsCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap mt-0.5">Bộ sưu tập</span>
        </Link>

        <button
          type="button"
          onClick={onOpenCommentsTab}
          className="col-span-3 sm:col-span-1 py-2.5 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition flex flex-col items-center justify-center text-center cursor-pointer"
        >
          <span className="text-base sm:text-lg font-bold text-white tabular-nums leading-tight">{commentsCount}</span>
          <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap mt-0.5">Đánh giá</span>
        </button>
      </div>
    </div>
  );
}

