"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MessageSquare,
  Star,
  Users,
  Film,
  AlertTriangle,
  RefreshCw,
  Home,
  Bot,
  Flag,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { AdminMetrics } from "../adminUtils";

interface AdminHeaderProps {
  userEmail?: string | null;
  isManualRefreshing: boolean;
  isSyncingEmbeddings: boolean;
  onManualRefresh: () => void;
  onSyncEmbeddings: () => void;
}

export function AdminHeader({
  userEmail,
  isManualRefreshing,
  isSyncingEmbeddings,
  onManualRefresh,
  onSyncEmbeddings,
}: AdminHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 sm:pb-6 border-b border-white/[0.08]">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 shadow-md flex-shrink-0">
            <ShieldCheck size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2 flex-wrap min-w-0">
            <span className="truncate">Nanaflix Admin</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold flex-shrink-0">
              Super Admin
            </span>
          </h1>
        </div>
        <p className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
          <span className="truncate max-w-[260px] sm:max-w-none">
            Đăng nhập: <strong className="text-white">{userEmail}</strong>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Supabase Connected
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onManualRefresh}
          disabled={isManualRefreshing}
          className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-netflix-red/20 hover:bg-netflix-red/30 text-red-300 hover:text-white text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={13} className={isManualRefreshing ? "animate-spin" : ""} />
          <span>{isManualRefreshing ? "Đang tải..." : "Làm Mới"}</span>
        </button>
        <Tooltip content="Đồng bộ 30 phim vào bảng movie_embeddings để tìm kiếm AI dưới 50ms" side="bottom">
          <button
            type="button"
            onClick={onSyncEmbeddings}
            disabled={isSyncingEmbeddings}
            aria-label="Đồng bộ 30 phim vào bảng movie_embeddings để tìm kiếm AI dưới 50ms"
            className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Bot size={13} className={isSyncingEmbeddings ? "animate-spin" : ""} />
            <span>{isSyncingEmbeddings ? "Đang đồng bộ..." : "Đồng bộ tìm kiếm AI"}</span>
          </button>
        </Tooltip>
        <Link
          href="/"
          className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
        >
          <Home size={13} />
          <span>Về Trang Chủ</span>
        </Link>
      </div>
    </div>
  );
}

interface AdminMetricsGridProps {
  metrics: AdminMetrics;
  totalMemberCount: number | null;
}

export function AdminMetricsGrid({
  metrics,
  totalMemberCount,
}: AdminMetricsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
      {/* Card 1: Total Comments */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-medium truncate">Tổng Bình Luận</span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
            <MessageSquare size={14} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left tabular-nums">
          {metrics.totalComments}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 truncate">Bình luận & phản hồi</p>
      </div>

      {/* Card 2: Average Score */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-medium truncate">Điểm Đánh Giá</span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
            <Star size={14} className="sm:w-4 sm:h-4 fill-amber-400" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-baseline gap-1 group-hover:scale-105 transition-transform origin-left tabular-nums">
          <span>{metrics.avgScore}</span>
          <span className="text-[11px] sm:text-xs font-normal text-zinc-400">/ 5.0</span>
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 truncate">{metrics.totalRatingReviews} lượt chấm sao</p>
      </div>

      {/* Card 3: Unique Users / Members */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-medium truncate">Thành Viên</span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
            <Users size={14} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left tabular-nums">
          {totalMemberCount === null ? (
            <span className="text-zinc-500 animate-pulse text-lg font-sans tabular-nums">—</span>
          ) : (
            metrics.uniqueUsers
          )}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 truncate">Thành viên ghi nhận</p>
      </div>

      {/* Card 4: Unique Movies */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-medium truncate">Phim Đánh Giá</span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-purple-500/10 text-purple-400 flex-shrink-0">
            <Film size={14} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-white group-hover:scale-105 transition-transform origin-left tabular-nums">
          {metrics.uniqueMovies}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 truncate">Phim có bình luận</p>
      </div>

      {/* Card 5: Flagged & Moderation */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-medium truncate">Vi Phạm / Cờ</span>
          <div className={`p-1 sm:p-1.5 rounded-lg flex-shrink-0 ${metrics.flaggedCount > 0 ? "bg-red-500/20 text-red-400" : "bg-zinc-800 text-zinc-400"}`}>
            <Flag size={14} className={`sm:w-4 sm:h-4 ${metrics.flaggedCount > 0 ? "text-red-400" : ""}`} />
          </div>
        </div>
        <div className={`text-xl sm:text-2xl font-black tabular-nums ${metrics.flaggedCount > 0 ? "text-red-400" : "text-white"} group-hover:scale-105 transition-transform origin-left`}>
          {metrics.flaggedCount}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 truncate">Cần Admin xét duyệt</p>
      </div>

      {/* Card 6: Spoilers */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/80 transition backdrop-blur-sm relative overflow-hidden group">
        <div className="flex items-center justify-between text-zinc-400 mb-1.5 sm:mb-2">
          <span className="text-[11px] sm:text-xs font-medium truncate">Cảnh Báo Spoil</span>
          <div className="p-1 sm:p-1.5 rounded-lg bg-rose-500/10 text-rose-400 flex-shrink-0">
            <AlertTriangle size={14} className="sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-rose-400 group-hover:scale-105 transition-transform origin-left tabular-nums">
          {metrics.spoilerCount}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1 truncate">Cảnh báo nội dung</p>
      </div>
    </div>
  );
}

