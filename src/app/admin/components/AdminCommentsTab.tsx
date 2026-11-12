"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Trash2,
  Search,
  Flag,
  Star,
  AlertTriangle,
  ArrowUpDown,
  MessageSquare,
  Film,
  ExternalLink,
  Heart,
  ShieldCheck,
  Ban,
  Clock,
  X,
} from "lucide-react";
import { MovieComment } from "@/types/comment";
import { MemberWithStats } from "@/types/user";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { StarRating } from "@/components/MovieReviews/StarRating";
import { Tooltip } from "@/components/ui/Tooltip";

export type SortOption = "newest" | "oldest" | "highest_rating" | "lowest_rating" | "most_liked";

export interface AdminCommentsTabProps {
  filteredComments: MovieComment[];
  totalCommentsCount: number;
  loadingData: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  starFilter: number | "all";
  setStarFilter: (star: number | "all") => void;
  spoilerFilter: "all" | "spoiler" | "no_spoiler";
  setSpoilerFilter: (filter: "all" | "spoiler" | "no_spoiler") => void;
  flaggedFilter: "all" | "flagged" | "clean";
  setFlaggedFilter: (filter: "all" | "flagged" | "clean") => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  flaggedCount: number;
  isCleaning: boolean;
  allMembers: MemberWithStats[];
  onAutoCleanComments: () => void;
  onPurgeAllFlagged: () => void;
  onUnflagComment: (comment: MovieComment) => void;
  onToggleUserCommentBan: (member: MemberWithStats) => void;
  onDeleteComment: (comment: MovieComment) => void;
  formatDate: (timestamp?: number) => string;
}

export const AdminCommentsTab: React.FC<AdminCommentsTabProps> = React.memo(
  function AdminCommentsTab({
    filteredComments,
    totalCommentsCount,
    loadingData,
    searchQuery,
    setSearchQuery,
    starFilter,
    setStarFilter,
    spoilerFilter,
    setSpoilerFilter,
    flaggedFilter,
    setFlaggedFilter,
    sortBy,
    setSortBy,
    flaggedCount,
    isCleaning,
    allMembers,
    onAutoCleanComments,
    onPurgeAllFlagged,
    onUnflagComment,
    onToggleUserCommentBan,
    onDeleteComment,
    formatDate,
  }) {
    return (
      <div className="space-y-4">
        {/* AUTO CLEAN & PURGE CONTROL BAR */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-amber-950/30 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-red-500/15 text-red-400 shadow-inner flex-shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert size={18} className="sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-white">Lọc bình luận rác</h3>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                Tự động nhận diện và xóa vĩnh viễn ngôn từ xúc phạm, 18+, cờ bạc, scam và spam.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 sm:gap-2.5 flex-shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onAutoCleanComments}
              disabled={isCleaning}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-black/50 active:scale-95 disabled:opacity-50"
            >
              <ShieldAlert size={14} className={isCleaning ? "animate-spin" : ""} />
              <span>{isCleaning ? "Đang quét..." : "Quét & Xóa Rác Tự Động"}</span>
            </button>

            {flaggedCount > 0 && (
              <button
                type="button"
                onClick={onPurgeAllFlagged}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Trash2 size={13} />
                <span>Xóa Sạch Cờ ({flaggedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-3">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên người dùng, email, phim, nội dung..."
              className="w-full bg-black/60 rounded-xl pl-9 pr-8 py-2 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa từ khóa tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scrollbar-none -mx-1 px-1 flex-nowrap">
            {/* Moderation / Flagged Filter */}
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setFlaggedFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  flaggedFilter === "all" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFlaggedFilter("flagged")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  flaggedFilter === "flagged"
                    ? "bg-red-500/25 text-red-400 font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Flag size={11} className={flaggedCount > 0 ? "text-red-400" : ""} />
                <span>Vi phạm</span>
                {flaggedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold">
                    {flaggedCount}
                  </span>
                )}
              </button>
            </div>

            {/* Star Filter */}
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl text-xs flex-shrink-0">
              <span className="text-[11px] text-zinc-400 px-1.5 flex items-center gap-1">
                <Star size={11} className="text-amber-400 fill-amber-400" />
                <span>Sao:</span>
              </span>
              {(["all", 5, 4, 3, 2, 1] as const).map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarFilter(star)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    starFilter === star
                      ? "bg-amber-500 text-black font-bold shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {star === "all" ? (
                    "Tất cả"
                  ) : (
                    <span className="inline-flex items-center gap-0.5 font-sans tabular-nums">
                      {star}
                      <Star size={10} className="fill-current" />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Spoiler Filter */}
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setSpoilerFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  spoilerFilter === "all" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setSpoilerFilter("spoiler")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  spoilerFilter === "spoiler" ? "bg-rose-500/20 text-rose-400 font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                <AlertTriangle size={11} />
                <span>Spoil</span>
              </button>
              <button
                type="button"
                onClick={() => setSpoilerFilter("no_spoiler")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  spoilerFilter === "no_spoiler" ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Không Spoil
              </button>
            </div>

            {/* Sort Option */}
            <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1.5 rounded-xl text-xs flex-shrink-0">
              <ArrowUpDown size={11} className="text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-zinc-300 text-base sm:text-xs focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-zinc-900 text-white">Mới nhất</option>
                <option value="oldest" className="bg-zinc-900 text-white">Cũ nhất</option>
                <option value="highest_rating" className="bg-zinc-900 text-white">Điểm cao nhất</option>
                <option value="lowest_rating" className="bg-zinc-900 text-white">Điểm thấp nhất</option>
                <option value="most_liked" className="bg-zinc-900 text-white">Nhiều tim nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* COUNT HEADER */}
        <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
          <span>
            Hiển thị <strong className="text-white">{filteredComments.length}</strong> / {totalCommentsCount} bình luận
          </span>
          {(searchQuery || starFilter !== "all" || spoilerFilter !== "all" || flaggedFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStarFilter("all");
                setSpoilerFilter("all");
                setFlaggedFilter("all");
              }}
              className="text-netflix-red hover:underline cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* COMMENTS LIST */}
        {loadingData ? (
          <div className="p-6 sm:p-12 text-center rounded-2xl bg-zinc-900/40">
            <div className="w-8 h-8 rounded-full border-2 border-netflix-red border-t-transparent animate-spin mx-auto mb-2" />
            <p className="text-xs text-zinc-400">Đang đồng bộ danh sách bình luận...</p>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="p-6 sm:p-12 text-center rounded-2xl bg-zinc-900/40">
            <MessageSquare size={36} className="text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-300">Không tìm thấy bình luận nào phù hợp</p>
            <p className="text-xs text-zinc-500 mt-1">Hãy thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredComments.map((item) => {
              const itemUser = allMembers.find((m) => m.uid === item.userId);
              const isUserRestricted = Boolean(itemUser?.isCommentRestricted);

              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-5 rounded-2xl transition backdrop-blur-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 group ${
                    item.isFlagged
                      ? "bg-red-950/30 ring-1 ring-inset ring-red-500/45 shadow-md shadow-black/50"
                      : "bg-zinc-900/70 hover:bg-zinc-900/90 shadow-md shadow-black/40"
                  }`}
                >
                  {/* Left: User & Content */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                      <UserAvatar
                        src={item.userAvatar || undefined}
                        name={item.userName}
                        seed={item.userId || item.userName}
                        sizeClassName="w-8 h-8 text-xs font-bold"
                        className=""
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{item.userName}</span>
                          {item.userEmail && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-sans tabular-nums truncate max-w-[160px] sm:max-w-[200px]">
                              {item.userEmail}
                            </span>
                          )}
                          {isUserRestricted && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold flex items-center gap-1 flex-shrink-0">
                              <Ban size={10} />
                              <span>Bị cấm cmt</span>
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1 flex-shrink-0">
                            <Clock size={11} />
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                      </div>

                      {item.rating > 0 && (
                        <div className="w-full sm:w-auto sm:ml-auto">
                          <StarRating value={item.rating} size="sm" readOnly />
                        </div>
                      )}
                    </div>

                    {/* Movie tag & Episode info */}
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
                      <span className="text-zinc-400 text-[11px]">Phim:</span>
                      <Link
                        href={`/movies/${item.movieSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-netflix-red/15 text-red-300 hover:text-white hover:bg-netflix-red/25 transition text-xs font-semibold max-w-[240px] truncate"
                      >
                        <Film size={12} className="flex-shrink-0" />
                        <span className="truncate">{item.movieTitle || item.movieSlug}</span>
                        <ExternalLink size={11} className="opacity-70 flex-shrink-0" />
                      </Link>

                      {item.episodeName && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-zinc-300">
                          {item.episodeName}
                        </span>
                      )}

                      {item.isFlagged && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/30 text-[10px] text-red-300 font-bold animate-pulse">
                          <Flag size={11} className="fill-red-400 text-red-400" />
                          <span>Vi phạm</span>
                        </span>
                      )}

                      {item.isSpoiler && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-[10px] text-rose-400 font-bold">
                          <AlertTriangle size={11} />
                          <span>Spoil</span>
                        </span>
                      )}

                      {item.parentId ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-[10px] text-blue-300 font-medium">
                          <MessageSquare size={10} />
                          <span>Trả lời</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-[10px] text-amber-300 font-medium">
                          <Star size={10} className="fill-current" />
                          <span>Đánh giá</span>
                        </span>
                      )}

                      {item.likes > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-medium">
                          <Heart size={11} className="fill-rose-500 text-rose-500" />
                          <span>{item.likes}</span>
                        </span>
                      )}
                    </div>

                    {/* Moderation Warning Banner */}
                    {item.isFlagged && (
                      <div className="p-3 rounded-xl bg-red-950/40 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 text-red-400 font-bold">
                          <ShieldAlert size={14} className="text-red-400 flex-shrink-0" />
                          <span className="text-[11px] sm:text-xs">Phát hiện nội dung nhạy cảm / không đúng thuần phong mỹ tục</span>
                        </div>
                        <p className="text-red-200/90 text-[11px]">
                          <strong className="text-red-300">Lý do:</strong> {item.flagReason || "Chứa từ cấm hoặc hành vi spam"}
                        </p>
                        {item.flaggedKeywords && item.flaggedKeywords.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] text-red-300 font-medium">Từ khóa:</span>
                            {item.flaggedKeywords.map((kw, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-red-900/80 text-red-100 text-[10px] font-sans tabular-nums font-bold"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="text-xs text-zinc-200 leading-relaxed bg-black/40 p-3 rounded-xl whitespace-pre-wrap font-sans break-words">
                      &ldquo;{item.content}&rdquo;
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-col items-stretch sm:items-end gap-2 pt-2 sm:pt-0 flex-shrink-0 w-full sm:w-auto">
                    <Link
                      href={`/movies/${item.movieSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink size={13} />
                      <span>Xem phim</span>
                    </Link>

                    {item.isFlagged && (
                      <Tooltip content="Gỡ cờ & duyệt bình luận này hợp lệ" side="top">
                        <button
                          type="button"
                          onClick={() => onUnflagComment(item)}
                          aria-label="Gỡ cờ & duyệt bình luận này hợp lệ"
                          className="w-full px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 transition cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <ShieldCheck size={13} />
                          <span>Gỡ cờ</span>
                        </button>
                      </Tooltip>
                    )}

                    {itemUser && (
                      <Tooltip
                        content={isUserRestricted ? "Mở lại quyền bình luận" : "Khóa quyền bình luận thành viên"}
                        side="top"
                      >
                        <button
                          type="button"
                          onClick={() => onToggleUserCommentBan(itemUser)}
                          aria-label={isUserRestricted ? "Mở lại quyền bình luận" : "Khóa quyền bình luận thành viên"}
                          className={`w-full px-3 py-2 sm:py-1.5 rounded-xl transition cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                            isUserRestricted
                              ? "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300"
                              : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {isUserRestricted ? <ShieldCheck size={13} /> : <Ban size={13} />}
                          <span>{isUserRestricted ? "Mở cmt" : "Khóa cmt"}</span>
                        </button>
                      </Tooltip>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteComment(item)}
                      className={`px-3 py-2 sm:py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${
                        !item.isFlagged && !itemUser ? "col-span-2 sm:col-span-1" : ""
                      }`}
                    >
                      <Trash2 size={13} />
                      <span>Xóa bỏ</span>
                    </button>
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

