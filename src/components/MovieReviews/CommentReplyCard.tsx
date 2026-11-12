"use client";

import React from "react";
import { Eye, Reply, ShieldCheck, Trash2 } from "lucide-react";
import type { MovieComment, CommentReactionType } from "@/types/comment";
import { ReactionPicker } from "./ReactionPicker";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { cleanBadgeText } from "@/services/userService";
import { formatRelativeTime, renderCommentContent } from "./commentFormatters";

export interface CommentReplyCardProps {
  itemRef: React.RefObject<HTMLDivElement | null>;
  comment: MovieComment;
  isHighlighted: boolean;
  isAuthor: boolean;
  isCommentAuthorAdmin: boolean;
  effectiveUserAvatar?: string;
  currentUserId?: string | null;
  showSpoiler: boolean;
  onShowSpoiler: () => void;
  onOpenProfile: (e: React.MouseEvent) => void;
  onDelete: (commentId: string) => void;
  onReact: (reactionType: CommentReactionType | null) => void;
  onRequireAuth?: () => void;
  onReplyTo?: (targetUserId: string, targetUserName: string) => void;
}

/**
 * Renders a compact nested reply row inside a comment thread.
 */
export function CommentReplyCard({
  itemRef,
  comment,
  isHighlighted,
  isAuthor,
  isCommentAuthorAdmin,
  effectiveUserAvatar,
  currentUserId,
  showSpoiler,
  onShowSpoiler,
  onOpenProfile,
  onDelete,
  onReact,
  onRequireAuth,
  onReplyTo,
}: CommentReplyCardProps) {
  return (
    <div
      ref={itemRef}
      id={`comment-${comment.id}`}
      className={`group relative flex items-start gap-2.5 sm:gap-3 py-1.5 px-2.5 sm:px-3 rounded-xl transition-all duration-700 ease-out ${
        isHighlighted ? "bg-blue-500/15" : "hover:bg-white/[0.03]"
      }`}
    >
      {/* User Avatar */}
      <Tooltip
        content={
          isAuthor
            ? "Xem & chỉnh sửa hồ sơ của bạn"
            : `Xem trang cá nhân của ${comment.userName}`
        }
        side="top"
      >
        <button
          type="button"
          onClick={onOpenProfile}
          aria-label={
            isAuthor
              ? "Xem & chỉnh sửa hồ sơ của bạn"
              : `Xem trang cá nhân của ${comment.userName}`
          }
          className="cursor-pointer hover:ring-2 hover:ring-amber-400/60 hover:scale-105 transition-all rounded-full shrink-0 mt-0.5"
        >
          <UserAvatar
            src={effectiveUserAvatar || undefined}
            name={comment.userName}
            seed={comment.userId || comment.userName}
            sizeClassName="w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-xs"
            className="shadow-sm"
          />
        </button>
      </Tooltip>

      {/* Reply Body */}
      <div className="flex-1 min-w-0">
        {/* Header Row: Tên + Huy hiệu + Thời gian + Nút xóa */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tooltip
              content={
                isAuthor
                  ? "Xem & chỉnh sửa hồ sơ của bạn"
                  : `Xem trang cá nhân của ${comment.userName}`
              }
              side="top"
            >
              <button
                type="button"
                onClick={onOpenProfile}
                className="font-semibold text-xs sm:text-[13px] text-zinc-200 hover:text-amber-300 hover:underline transition cursor-pointer text-left truncate leading-tight"
              >
                {comment.userName}
              </button>
            </Tooltip>

            {isCommentAuthorAdmin && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-netflix-red/20 text-netflix-red whitespace-nowrap shrink-0 leading-none">
                <ShieldCheck className="w-2.5 h-2.5 text-netflix-red shrink-0" />
                <span>Admin</span>
              </span>
            )}

            {comment.userBadges && comment.userBadges.length > 0
              ? comment.userBadges.slice(0, 2).map((badgeLabel, bIdx) => (
                  <span
                    key={bIdx}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/5 text-amber-300 whitespace-nowrap shrink-0 leading-none"
                  >
                    <span className="leading-none">
                      {cleanBadgeText(badgeLabel)}
                    </span>
                  </span>
                ))
              : null}

            {isAuthor && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-netflix-red/15 text-netflix-red whitespace-nowrap shrink-0 leading-none">
                Bạn
              </span>
            )}

            <span className="text-[10px] sm:text-[11px] text-zinc-500 whitespace-nowrap">
              • {formatRelativeTime(comment.createdAt)}
              {comment.isEdited ? " (đã sửa)" : ""}
            </span>
          </div>

          {isAuthor && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Tooltip content="Xóa phản hồi" side="top">
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  aria-label="Xóa phản hồi"
                  className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Reply Content */}
        <div className="mt-1">
          {comment.isSpoiler && !showSpoiler ? (
            <div className="relative rounded-lg overflow-hidden bg-black/40 p-2 sm:p-2.5">
              <p className="filter blur-md select-none text-zinc-400 text-xs line-clamp-2">
                {comment.content}
              </p>
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-1 text-center">
                <button
                  type="button"
                  onClick={onShowSpoiler}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors"
                >
                  <Eye className="w-2.5 h-2.5 shrink-0" />
                  <span>Spoil. Bấm xem</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-zinc-200 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line break-words">
              {renderCommentContent(comment.content, comment.replyToUserName)}
            </p>
          )}
        </div>

        {/* Reply Actions: Reactions + Trả lời */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <ReactionPicker
            comment={comment}
            currentUserId={currentUserId}
            onReact={onReact}
            onRequireAuth={onRequireAuth}
            isCompact={true}
          />

          <button
            type="button"
            onClick={() => onReplyTo?.(comment.userId, comment.userName)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 px-2 py-0.5 rounded transition cursor-pointer active:scale-95"
          >
            <Reply className="w-3 h-3" />
            <span>Trả lời</span>
          </button>
        </div>
      </div>
    </div>
  );
}

