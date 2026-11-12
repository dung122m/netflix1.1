"use client";

import React from "react";
import {
  Search,
  ArrowUpDown,
  Users,
  Check,
  Copy,
  Ban,
  MessageSquare,
  Star,
  Clock,
  Film,
  AlertOctagon,
  Eye,
  ShieldCheck,
  Trash2,
  Crown,
  X,
} from "lucide-react";
import { MemberWithStats } from "@/types/user";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Tooltip } from "@/components/ui/Tooltip";

export interface AdminMembersTabProps {
  memberSearchQuery: string;
  setMemberSearchQuery: (query: string) => void;
  memberFilter: "all" | "admin" | "has_comments";
  setMemberFilter: (filter: "all" | "admin" | "has_comments") => void;
  totalMemberCount: number | null;
  memberSortBy: "recent" | "watch_time" | "comments" | "name";
  setMemberSortBy: (sort: "recent" | "watch_time" | "comments" | "name") => void;
  filteredMembers: MemberWithStats[];
  copiedUid: string | null;
  copyToClipboard: (text: string, id: string) => void;
  formatDate: (timestamp?: number) => string;
  formatWatchMinutes: (minutes?: number) => string;
  onOpenMemberDetails: (member: MemberWithStats) => void;
  onToggleUserCommentBan: (member: MemberWithStats) => void;
  onDeleteAllUserComments: (member: MemberWithStats) => void;
}

export const AdminMembersTab: React.FC<AdminMembersTabProps> = React.memo(
  function AdminMembersTab({
    memberSearchQuery,
    setMemberSearchQuery,
    memberFilter,
    setMemberFilter,
    totalMemberCount,
    memberSortBy,
    setMemberSortBy,
    filteredMembers,
    copiedUid,
    copyToClipboard,
    formatDate,
    formatWatchMinutes,
    onOpenMemberDetails,
    onToggleUserCommentBan,
    onDeleteAllUserComments,
  }) {
    return (
      <div className="space-y-4">
        {/* Toolbar for members */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-3">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Tìm thành viên theo tên, email hoặc UID..."
              className="w-full bg-black/60 rounded-xl pl-9 pr-8 py-2 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red transition"
            />
            {memberSearchQuery && (
              <button
                type="button"
                onClick={() => setMemberSearchQuery("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-none -mx-1 px-1 flex-nowrap">
            {/* Filter role */}
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setMemberFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  memberFilter === "all" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tất cả ({totalMemberCount !== null ? totalMemberCount : "—"})
              </button>
              <button
                type="button"
                onClick={() => setMemberFilter("admin")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  memberFilter === "admin"
                    ? "bg-amber-500/20 text-amber-300 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Crown size={11} />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setMemberFilter("has_comments")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  memberFilter === "has_comments"
                    ? "bg-blue-500/20 text-blue-300 font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Đã bình luận
              </button>
            </div>

            {/* Sort members */}
            <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1.5 rounded-xl text-xs flex-shrink-0">
              <ArrowUpDown size={11} className="text-zinc-400" />
              <select
                value={memberSortBy}
                onChange={(e) => setMemberSortBy(e.target.value as "recent" | "watch_time" | "comments" | "name")}
                className="bg-transparent text-zinc-300 text-base sm:text-xs focus:outline-none cursor-pointer"
              >
                <option value="recent" className="bg-zinc-900 text-white">Hoạt động mới nhất</option>
                <option value="watch_time" className="bg-zinc-900 text-white">Cày phim nhiều nhất</option>
                <option value="comments" className="bg-zinc-900 text-white">Nhiều bình luận nhất</option>
                <option value="name" className="bg-zinc-900 text-white">Tên (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* COUNT HEADER */}
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>
            Hiển thị <strong className="text-white">{filteredMembers.length}</strong> / {totalMemberCount !== null ? totalMemberCount : "—"} thành viên
          </span>
        </div>

        {/* MEMBERS GRID */}
        {filteredMembers.length === 0 ? (
          <div className="p-6 sm:p-12 text-center rounded-2xl bg-zinc-900/40">
            <Users size={36} className="text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-300">Không tìm thấy thành viên nào phù hợp</p>
            <p className="text-xs text-zinc-500 mt-1">Hãy thử từ khóa tìm kiếm khác.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredMembers.map((m) => {
              const isSuperAdmin = m.role === "admin";
              return (
                <div
                  key={m.uid}
                  className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 transition backdrop-blur-sm flex flex-col justify-between space-y-3 sm:space-y-4 group"
                >
                  <div>
                    {/* Member Header */}
                    <div className="flex items-start gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                      <UserAvatar
                        src={m.photoURL || undefined}
                        name={m.displayName}
                        seed={m.uid || m.displayName}
                        sizeClassName="w-10 h-10 sm:w-11 sm:h-11 text-sm font-bold"
                        rounded="2xl"
                        className="shadow-md"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                            {m.displayName}
                          </h3>
                          {isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold flex-shrink-0">
                              <Crown size={10} />
                              <span>Admin</span>
                            </span>
                          )}
                          {m.isWatchingNow ? (
                            <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1 flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Đang xem
                            </span>
                          ) : m.isOnline ? (
                            <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1 flex-shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Online
                            </span>
                          ) : m.lastActiveAt && Date.now() - m.lastActiveAt <= 15 * 60 * 1000 ? (
                            <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium flex-shrink-0">
                              Vừa online
                            </span>
                          ) : (
                            <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 flex-shrink-0">
                              Ngoại tuyến
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">
                          {m.email || "Chưa có email"}
                        </p>
                      </div>
                    </div>

                    {/* UID badge */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 text-[11px] mb-2.5 sm:mb-3">
                      <span className="text-zinc-500 font-sans tabular-nums truncate max-w-[160px] sm:max-w-[190px]">
                        UID: {m.uid}
                      </span>
                      <Tooltip content="Sao chép UID" side="top">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(m.uid, m.uid)}
                          aria-label="Sao chép UID"
                          className="text-zinc-400 hover:text-white p-1 rounded transition cursor-pointer flex-shrink-0"
                        >
                          {copiedUid === m.uid ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </Tooltip>
                    </div>

                    {/* Member restriction status */}
                    {m.isCommentRestricted && (
                      <div className="p-2 rounded-xl bg-red-500/15 text-[11px] text-red-300 flex items-center gap-1.5 font-medium mb-2.5 sm:mb-3">
                        <Ban size={13} className="text-red-400 flex-shrink-0" />
                        <span className="truncate">Đang bị khóa quyền bình luận</span>
                      </div>
                    )}

                    {/* Member stats chips */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-white/[0.03] min-w-0">
                        <span className="text-[10px] text-zinc-400 block truncate">Bình luận</span>
                        <span className="font-bold text-white flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs truncate">
                          <MessageSquare size={12} className="text-blue-400 flex-shrink-0" />
                          <span className="truncate">{m.commentsCount} bài</span>
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white/[0.03] min-w-0">
                        <span className="text-[10px] text-zinc-400 block truncate">Đánh giá</span>
                        <span className="font-bold text-amber-400 flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs tabular-nums truncate">
                          <Star size={12} className="fill-amber-400 flex-shrink-0" />
                          <span className="truncate">{m.avgRatingGiven > 0 ? m.avgRatingGiven : "0"}</span>
                        </span>
                      </div>

                      <div className="p-2 rounded-xl bg-white/[0.03] min-w-0">
                        <span className="text-[10px] text-zinc-400 block truncate">Cày phim</span>
                        <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs truncate">
                          <Clock size={12} className="text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{formatWatchMinutes(m.watchTimeMinutes)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Live Watching Preview if active */}
                    {m.isWatchingNow && m.currentWatching && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-xs text-zinc-300 space-y-1 mt-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-emerald-300 font-semibold truncate flex items-center gap-1 min-w-0">
                            <Film size={12} className="text-emerald-400 flex-shrink-0" />
                            <span className="truncate">{m.currentWatching.movieTitle}</span>
                            {m.currentWatching.episodeName && (
                              <span className="text-zinc-400 truncate">({m.currentWatching.episodeName})</span>
                            )}
                          </span>
                          <span className="text-emerald-400 font-sans tabular-nums text-[10px] font-bold flex-shrink-0 ml-1">
                            {m.currentWatching.progressPercent}%
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                          <span className="truncate max-w-[140px]">{m.currentWatching.deviceName || "Thiết bị"}</span>
                          <span className="font-sans tabular-nums text-emerald-400/80 flex-shrink-0">Đang phát</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2.5 text-[10px] text-zinc-500 flex-wrap gap-1.5">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>Lần cuối: {formatDate(m.lastActiveAt || m.lastLoginAt)}</span>
                      </span>
                      {m.violationsCount && m.violationsCount > 0 ? (
                        <span className="text-red-400 font-semibold flex items-center gap-1">
                          <AlertOctagon size={11} />
                          <span>{m.violationsCount} vi phạm</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-white/[0.08] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenMemberDetails(m)}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye size={13} />
                      <span>Chi Tiết</span>
                    </button>

                    <Tooltip
                      content={m.isCommentRestricted ? "Mở khóa quyền bình luận" : "Khóa quyền bình luận thành viên"}
                      side="top"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleUserCommentBan(m)}
                        aria-label={m.isCommentRestricted ? "Mở khóa quyền bình luận" : "Khóa quyền bình luận thành viên"}
                        className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center flex-shrink-0 ${
                          m.isCommentRestricted
                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                        }`}
                      >
                        {m.isCommentRestricted ? <ShieldCheck size={14} /> : <Ban size={14} />}
                      </button>
                    </Tooltip>

                    {m.commentsCount > 0 && (
                      <Tooltip content="Xóa tất cả bình luận của thành viên này" side="top">
                        <button
                          type="button"
                          onClick={() => onDeleteAllUserComments(m)}
                          aria-label="Xóa tất cả bình luận của thành viên này"
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

