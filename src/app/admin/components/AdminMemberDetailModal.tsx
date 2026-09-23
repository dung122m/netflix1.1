"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Ban,
  Bookmark,
  ExternalLink,
  History,
  MessageSquare,
  ShieldCheck,
  Trash2,
  X,
  Clock,
  Film,
} from "lucide-react";
import { MemberWithStats } from "@/types/user";
import { MovieComment } from "@/types/comment";
import { WatchHistoryItem } from "@/lib/watchHistory";
import { WatchlistItem } from "@/lib/watchlist";
import { StarRating } from "@/components/MovieReviews/StarRating";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface AdminMemberDetailModalProps {
  selectedMember: MemberWithStats | null;
  onClose: () => void;
  comments: MovieComment[];
  memberHistory: WatchHistoryItem[];
  memberWatchlist: WatchlistItem[];
  loadingMemberDetails: boolean;
  onToggleCommentBan: (member: MemberWithStats) => void;
  onDeleteComment: (comment: MovieComment) => void;
  onUnflagComment: (comment: MovieComment) => void;
  formatDate: (timestamp?: number) => string;
}

export const AdminMemberDetailModal: React.FC<AdminMemberDetailModalProps> = React.memo(
  function AdminMemberDetailModal({
    selectedMember,
    onClose,
    comments,
    memberHistory,
    memberWatchlist,
    loadingMemberDetails,
    onToggleCommentBan,
    onDeleteComment,
    onUnflagComment,
    formatDate,
  }) {
    const [memberDetailTab, setMemberDetailTab] = useState<"comments" | "history" | "watchlist">("comments");

    if (!selectedMember) return null;

    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="max-w-2xl w-full bg-zinc-950 border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 sm:pb-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-start justify-between sm:justify-start gap-3 min-w-0 w-full sm:w-auto">
              <UserAvatar
                src={selectedMember.photoURL || undefined}
                name={selectedMember.displayName}
                seed={selectedMember.uid || selectedMember.displayName}
                sizeClassName="w-10 h-10 sm:w-12 sm:h-12 text-sm sm:text-base font-bold"
                rounded="2xl"
                className="border border-white/15 shadow-md"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-[160px] sm:max-w-none">
                    {selectedMember.displayName}
                  </h2>
                  {selectedMember.role === "admin" && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex-shrink-0">
                      👑 Admin
                    </span>
                  )}
                  {selectedMember.isWatchingNow ? (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Đang xem
                    </span>
                  ) : selectedMember.isOnline ? (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Online
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-800 text-gray-400 border border-white/5 flex-shrink-0">
                      Ngoại tuyến
                    </span>
                  )}
                  {selectedMember.isCommentRestricted && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30 flex items-center gap-1 flex-shrink-0">
                      <Ban size={10} />
                      <span>Bị khóa cmt</span>
                    </span>
                  )}
                  {selectedMember.violationsCount && selectedMember.violationsCount > 0 ? (
                    <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex-shrink-0">
                      ⚠️ {selectedMember.violationsCount} vi phạm
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] sm:text-xs text-gray-400 truncate mt-0.5">{selectedMember.email || "Chưa có email"}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-0.5 truncate max-w-[200px] sm:max-w-none">UID: {selectedMember.uid}</p>
              </div>

              {/* Close Button on Mobile */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:hidden rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onToggleCommentBan(selectedMember)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedMember.isCommentRestricted
                    ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30"
                }`}
              >
                {selectedMember.isCommentRestricted ? <ShieldCheck size={14} /> : <Ban size={14} />}
                <span>{selectedMember.isCommentRestricted ? "Mở khóa bình luận" : "Khóa quyền bình luận"}</span>
              </button>

              {/* Close Button on Desktop */}
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Quick Member Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-xs flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={14} className="text-emerald-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 block">Tổng cày phim</span>
                <span className="font-bold text-white truncate block">
                  {selectedMember.watchTimeMinutes
                    ? selectedMember.watchTimeMinutes >= 60
                      ? `${Math.floor(selectedMember.watchTimeMinutes / 60)}h ${selectedMember.watchTimeMinutes % 60}m`
                      : `${selectedMember.watchTimeMinutes} phút`
                    : "0 phút"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare size={14} className="text-blue-400 flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 block">Lần cuối hoạt động</span>
                <span className="font-semibold text-gray-300 truncate block">
                  {formatDate(selectedMember.lastActiveAt || selectedMember.lastLoginAt)}
                </span>
              </div>
            </div>

            {selectedMember.isWatchingNow && selectedMember.currentWatching ? (
              <div className="flex items-center gap-2 min-w-0">
                <Film size={14} className="text-amber-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 block">Đang xem</span>
                  <span className="font-bold text-amber-300 truncate block">
                    {selectedMember.currentWatching.movieTitle} ({selectedMember.currentWatching.progressPercent}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <Bookmark size={14} className="text-purple-400 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-gray-400 block">Tham gia ngày</span>
                  <span className="font-semibold text-gray-300 truncate block">
                    {formatDate(selectedMember.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Modal Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-2 flex-shrink-0 overflow-x-auto no-scrollbar scrollbar-none">
            <button
              type="button"
              onClick={() => setMemberDetailTab("comments")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
                memberDetailTab === "comments"
                  ? "bg-netflix-red text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <MessageSquare size={13} />
              <span>Bình luận ({selectedMember.commentsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMemberDetailTab("history")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
                memberDetailTab === "history"
                  ? "bg-netflix-red text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <History size={13} />
              <span>Lịch sử ({memberHistory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMemberDetailTab("watchlist")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
                memberDetailTab === "watchlist"
                  ? "bg-netflix-red text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Bookmark size={13} />
              <span>Đã lưu ({memberWatchlist.length})</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {loadingMemberDetails ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-netflix-red border-t-transparent animate-spin mx-auto mb-2" />
                <p className="text-xs text-gray-400">Đang tải dữ liệu đám mây của thành viên...</p>
              </div>
            ) : memberDetailTab === "comments" ? (
              (() => {
                const userComms = comments.filter((c) => c.userId === selectedMember.uid);
                if (userComms.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-gray-500">
                      Thành viên này chưa để lại bình luận nào trên hệ thống.
                    </div>
                  );
                }
                return (
                  <div className="space-y-2.5">
                    {userComms.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/movies/${c.movieSlug}`}
                              target="_blank"
                              className="font-bold text-red-400 hover:underline flex items-center gap-1"
                            >
                              <span>{c.movieTitle || c.movieSlug}</span>
                              <ExternalLink size={11} />
                            </Link>
                            {c.episodeName && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-gray-400">
                                {c.episodeName}
                              </span>
                            )}
                            {c.isSpoiler && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">
                                Spoil
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500">{formatDate(c.createdAt)}</span>
                        </div>

                        {c.isFlagged && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                            <ShieldCheck size={13} className="flex-shrink-0 text-amber-400" />
                            <span>Bình luận này đã bị báo cáo vi phạm.</span>
                          </div>
                        )}

                        {c.rating > 0 && <StarRating value={c.rating} size="sm" readOnly />}

                        <p className="text-gray-300 bg-black/40 p-2.5 rounded-lg border border-white/5">
                          &ldquo;{c.content}&rdquo;
                        </p>

                        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                          <span className="text-[10px] text-gray-500">
                            {c.likes > 0 ? `${c.likes} lượt thích` : "0 lượt thích"}
                          </span>
                          <div className="flex items-center gap-3">
                            {c.isFlagged && (
                              <button
                                type="button"
                                onClick={() => onUnflagComment(c)}
                                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-medium"
                              >
                                <ShieldCheck size={12} />
                                <span>Gỡ cờ</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onDeleteComment(c)}
                              className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Xóa bình luận này</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : memberDetailTab === "history" ? (
              memberHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Chưa có lịch sử xem phim đồng bộ trên Cloud.
                </div>
              ) : (
                <div className="space-y-2">
                  {memberHistory.map((item, idx) => (
                    <div
                      key={item.slug || idx}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{item.title || item.slug}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {item.episodeName ? `Đang xem: ${item.episodeName}` : "Đã xem"} •{" "}
                          {formatDate(item.updatedAt)}
                        </p>
                      </div>
                      <Link
                        href={`/movies/${item.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink size={12} />
                        <span>Mở</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )
            ) : (
              memberWatchlist.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Thành viên chưa lưu bộ phim nào vào danh sách yêu thích.
                </div>
              ) : (
                <div className="space-y-2">
                  {memberWatchlist.map((item, idx) => (
                    <div
                      key={item.slug || idx}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{item.title || item.slug}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Đã lưu vào danh sách • {formatDate(item.addedAt)}
                        </p>
                      </div>
                      <Link
                        href={`/movies/${item.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center gap-1 text-[11px]"
                      >
                        <ExternalLink size={12} />
                        <span>Xem</span>
                      </Link>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }
);
