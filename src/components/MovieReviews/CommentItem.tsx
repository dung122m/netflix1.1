"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Pencil,
  Loader2,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Reply,
  Pin,
  ShieldCheck,
} from "lucide-react";
import type { MovieComment, CommentReactionType } from "@/types/comment";
import { StarRating } from "./StarRating";
import { ReactionPicker } from "./ReactionPicker";
import { setCommentReaction, togglePinComment } from "@/services/commentService";
import { isUserAdmin } from "@/lib/adminConfig";
import { toast } from "@/components/ui/Toast";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Tooltip } from "@/components/ui/Tooltip";
import { cleanBadgeText } from "@/services/userService";
import { formatRelativeTime, renderCommentContent } from "./commentFormatters";
import { useCommentReplies } from "./hooks/useCommentReplies";
import { CommentReplyForm } from "./CommentReplyForm";
import { CommentReplyCard } from "./CommentReplyCard";

export interface CommentItemProps {
  comment: MovieComment;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserEmail?: string;
  onLike?: (commentId: string, hasLiked: boolean) => void;
  onReact?: (
    commentId: string,
    reactionType: CommentReactionType | null,
    prevReactionType?: CommentReactionType | null,
  ) => void;
  onDelete: (commentId: string) => void;
  onEdit?: (comment: MovieComment) => void;
  onTogglePin?: (commentId: string, isPinned: boolean) => void;
  /** Nếu true: đây là reply (gọn hơn, lề phẳng trên mobile) */
  isReply?: boolean;
  /** Callback để mở auth modal nếu user chưa đăng nhập */
  onRequireAuth?: () => void;
  /** Callback khi bấm trả lời một reply cụ thể trong thread */
  onReplyTo?: (targetUserId: string, targetUserName: string) => void;
  /** ID của comment hoặc reply cần highlight và cuộn tới */
  highlightCommentId?: string | null;
  /** ID của reply con nằm trong thread này cần tự động mở */
  targetReplyId?: string | null;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserEmail,
  onReact,
  onDelete,
  onEdit,
  onTogglePin,
  isReply = false,
  onRequireAuth,
  onReplyTo,
  highlightCommentId,
  targetReplyId,
}) => {
  const [showSpoiler, setShowSpoiler] = useState(false);

  // --- Highlight & Scroll state ---
  const isTarget = Boolean(
    highlightCommentId && comment.id === highlightCommentId,
  );
  const [isHighlighted, setIsHighlighted] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const isAuthor = Boolean(currentUserId && currentUserId === comment.userId);
  const effectiveUserAvatar =
    isAuthor && currentUserAvatar ? currentUserAvatar : comment.userAvatar;
  const isCommentAuthorAdmin = Boolean(
    (comment.userEmail && isUserAdmin(comment.userEmail)) ||
      (isAuthor && isUserAdmin(currentUserEmail)) ||
      comment.userBadges?.some(
        (b) =>
          b.toLowerCase().includes("admin") ||
          b.toLowerCase().includes("quản trị"),
      ),
  );

  const {
    showReplyForm,
    replyContent,
    setReplyContent,
    replyTargetUser,
    isSubmittingReply,
    showReplies,
    replies,
    loadingReplies,
    replyInputRef,
    handleToggleReplies,
    handleReplyClick,
    handleCancelReplyForm,
    handleClearReplyTarget,
    handleSubmitReply,
    handleDeleteReply,
    handleReplyReact,
  } = useCommentReplies({
    comment,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    isReply,
    targetReplyId,
    onRequireAuth,
  });

  const handleOpenProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined") return;
    if (isAuthor) {
      window.dispatchEvent(new CustomEvent("open-user-profile-modal"));
    } else {
      window.dispatchEvent(
        new CustomEvent("open-public-profile", {
          detail: {
            userId: comment.userId,
            userName: comment.userName,
            userAvatar: comment.userAvatar,
            badges: comment.userBadges,
          },
        }),
      );
    }
  };

  // Tự động cuộn tới vị trí comment và kích hoạt hiệu ứng phát sáng (highlight)
  useEffect(() => {
    if (!isTarget) {
      setIsHighlighted(false);
      return;
    }

    setIsHighlighted(true);
    const scrollTimer = setTimeout(() => {
      itemRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 200);

    const fadeTimer = setTimeout(() => {
      setIsHighlighted(false);
    }, 2200);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(fadeTimer);
    };
  }, [isTarget]);

  const handleSelfReact = async (reactionType: CommentReactionType | null) => {
    if (!currentUserId) {
      onRequireAuth?.();
      return;
    }

    const prevReaction: CommentReactionType | null =
      (comment.reactions && comment.reactions[currentUserId]) ||
      (comment.likedBy?.includes(currentUserId) ? "like" : null);

    if (onReact) {
      onReact(comment.id, reactionType, prevReaction);
    } else {
      try {
        await setCommentReaction(
          comment.id,
          currentUserId,
          reactionType,
          prevReaction,
        );
      } catch (err) {
        console.warn("Lỗi thả cảm xúc comment:", err);
      }
    }
  };

  const isAdmin = isUserAdmin(currentUserEmail);
  const [isPinning, setIsPinning] = useState(false);

  const handleTogglePin = async () => {
    if (!isAdmin || !currentUserEmail) return;
    setIsPinning(true);
    const nextPinnedState = !comment.isPinned;
    onTogglePin?.(comment.id, nextPinnedState);
    try {
      const isPinnedNow = await togglePinComment(
        comment.id,
        Boolean(comment.isPinned),
        currentUserEmail,
      );
      onTogglePin?.(comment.id, isPinnedNow);
      toast.success(
        isPinnedNow
          ? "Đã ghim bình luận lên đầu!"
          : "Đã bỏ ghim bình luận.",
      );
    } catch {
      onTogglePin?.(comment.id, Boolean(comment.isPinned));
      toast.error("Không thể ghim/bỏ ghim bình luận!");
    } finally {
      setIsPinning(false);
    }
  };

  // Tổng số replies (từ realtime hoặc từ replyCount field)
  const totalReplies = Math.max(comment.replyCount || 0, replies.length);

  if (isReply) {
    return (
      <CommentReplyCard
        itemRef={itemRef}
        comment={comment}
        isHighlighted={isHighlighted}
        isAuthor={isAuthor}
        isCommentAuthorAdmin={isCommentAuthorAdmin}
        effectiveUserAvatar={effectiveUserAvatar || undefined}
        currentUserId={currentUserId}
        showSpoiler={showSpoiler}
        onShowSpoiler={() => setShowSpoiler(true)}
        onOpenProfile={handleOpenProfile}
        onDelete={onDelete}
        onReact={handleSelfReact}
        onRequireAuth={onRequireAuth}
        onReplyTo={onReplyTo}
      />
    );
  }

  return (
    <div
      ref={itemRef}
      id={`comment-${comment.id}`}
      className={`group relative py-4 sm:py-5 px-3 -mx-3 rounded-2xl transition-all duration-700 ease-out ${
        isHighlighted
          ? "bg-blue-500/15"
          : comment.isPinned
          ? "bg-amber-500/[0.06] pl-3.5 sm:pl-4"
          : "hover:bg-white/[0.015]"
      }`}
    >
      {/* BADGE BÌNH LUẬN ĐÃ GHIM BỞI ADMIN */}
      {comment.isPinned && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Đã ghim bởi Quản trị viên</span>
        </div>
      )}

      {/* HEADER: AVATAR & USER INFO & ACTIONS */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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
              onClick={handleOpenProfile}
              aria-label={
                isAuthor
                  ? "Xem & chỉnh sửa hồ sơ của bạn"
                  : `Xem trang cá nhân của ${comment.userName}`
              }
              className="cursor-pointer hover:ring-2 hover:ring-amber-400/60 hover:scale-105 transition-all rounded-full shrink-0"
            >
              <UserAvatar
                src={effectiveUserAvatar || undefined}
                name={comment.userName}
                seed={comment.userId || comment.userName}
                sizeClassName="w-8 h-8 sm:w-10 sm:h-10 text-sm"
                className="shadow-sm"
              />
            </button>
          </Tooltip>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
                  onClick={handleOpenProfile}
                  className="inline-flex items-center font-semibold text-zinc-100 hover:text-amber-300 hover:underline transition cursor-pointer text-left truncate leading-tight text-xs sm:text-sm md:text-base"
                >
                  {comment.userName}
                </button>
              </Tooltip>

              {isCommentAuthorAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-gradient-to-r from-netflix-red/30 to-netflix-red/15 text-netflix-red shadow-sm shadow-black/40 whitespace-nowrap shrink-0 leading-none animate-in fade-in">
                  <ShieldCheck className="w-3 h-3 text-netflix-red shrink-0" />
                  <span className="leading-none">Admin</span>
                </span>
              )}

              {comment.userBadges && comment.userBadges.length > 0
                ? comment.userBadges.slice(0, 2).map((badgeLabel, bIdx) => (
                    <span
                      key={bIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 shadow-sm shadow-black/40 whitespace-nowrap shrink-0 leading-none animate-in fade-in"
                    >
                      <span className="leading-none">
                        {cleanBadgeText(badgeLabel)}
                      </span>
                    </span>
                  ))
                : null}

              {isAuthor && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-300 whitespace-nowrap shrink-0 leading-none">
                  <span className="leading-none">Đánh giá của bạn</span>
                </span>
              )}

              {comment.episodeName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-netflix-red/10 text-netflix-red whitespace-nowrap shrink-0 leading-none">
                  <span className="leading-none">{comment.episodeName}</span>
                </span>
              )}

              {comment.isSpoiler && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-amber-500/10 text-amber-400 whitespace-nowrap shrink-0 leading-none">
                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="leading-none">Spoil</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {comment.rating > 0 && (
                <StarRating value={comment.rating} readOnly size="sm" />
              )}
              <span className="text-[10px] sm:text-xs text-zinc-500">
                {formatRelativeTime(comment.createdAt)}
                {comment.isEdited ? " (đã sửa)" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Actions (Edit / Delete if author) */}
        {isAuthor && (
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {onEdit && (
              <Tooltip content="Chỉnh sửa đánh giá" side="top">
                <button
                  type="button"
                  onClick={() => onEdit(comment)}
                  aria-label="Chỉnh sửa đánh giá của bạn"
                  className="text-zinc-400 hover:text-amber-400 transition-all p-1 sm:p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Xóa" side="top">
              <button
                type="button"
                onClick={() => onDelete(comment.id)}
                aria-label="Xóa"
                className="text-zinc-400 hover:text-red-400 transition-all p-1 sm:p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="mt-2 sm:mt-2.5 sm:pl-12">
        {comment.isSpoiler && !showSpoiler ? (
          <div className="relative rounded-xl overflow-hidden bg-black/40 p-3 sm:p-4">
            <p className="filter blur-md select-none text-zinc-400 text-xs sm:text-sm line-clamp-2">
              {comment.content}
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 text-center">
              <button
                type="button"
                onClick={() => setShowSpoiler(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors shadow-lg"
              >
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Nội dung có tiết lộ tình tiết. Bấm xem</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <p className="text-zinc-200 text-xs sm:text-sm md:text-[15px] leading-relaxed whitespace-pre-line break-words">
              {renderCommentContent(comment.content, comment.replyToUserName)}
            </p>
            {comment.isSpoiler && (
              <button
                type="button"
                onClick={() => setShowSpoiler(false)}
                className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
              >
                <EyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>Ẩn lại nội dung spoil</span>
              </button>
            )}
          </div>
        )}

        {/* BOTTOM ACTIONS */}
        <div className="flex items-center gap-2 sm:gap-3 mt-2.5 sm:mt-3 flex-wrap">
          <ReactionPicker
            comment={comment}
            currentUserId={currentUserId}
            onReact={handleSelfReact}
            onRequireAuth={onRequireAuth}
            isCompact={false}
          />

          <button
            type="button"
            onClick={() => handleReplyClick()}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-zinc-400 hover:text-netflix-red hover:bg-netflix-red/10 transition-all cursor-pointer active:scale-95"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Trả lời</span>
          </button>

          {isAdmin && (
            <Tooltip
              content={
                comment.isPinned
                  ? "Bỏ ghim bình luận này"
                  : "Ghim bình luận quan trọng lên đầu"
              }
              side="top"
            >
              <button
                type="button"
                disabled={isPinning}
                onClick={handleTogglePin}
                aria-label={
                  comment.isPinned
                    ? "Bỏ ghim bình luận này"
                    : "Ghim bình luận quan trọng lên đầu"
                }
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer active:scale-95 ${
                  comment.isPinned
                    ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    : "bg-white/5 text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                <Pin
                  className={`w-3.5 h-3.5 ${
                    comment.isPinned ? "fill-amber-300 text-amber-300" : ""
                  }`}
                />
                <span>{comment.isPinned ? "Bỏ ghim" : "Ghim"}</span>
              </button>
            </Tooltip>
          )}

          {(comment.replyCount || 0) > 0 || replies.length > 0 ? (
            <button
              type="button"
              onClick={handleToggleReplies}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-netflix-red hover:underline transition-colors cursor-pointer py-1 px-2.5 rounded-full hover:bg-netflix-red/10"
            >
              {showReplies ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>
                {showReplies
                  ? "Ẩn phản hồi"
                  : `Xem ${totalReplies > 0 ? totalReplies : ""} phản hồi`}
              </span>
            </button>
          ) : null}
        </div>

        {/* REPLY FORM */}
        {showReplyForm && (
          <CommentReplyForm
            commentUserName={comment.userName}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            replyContent={replyContent}
            onReplyContentChange={setReplyContent}
            replyTargetUser={replyTargetUser}
            isSubmittingReply={isSubmittingReply}
            replyInputRef={replyInputRef}
            onClearTarget={handleClearReplyTarget}
            onCancel={handleCancelReplyForm}
            onSubmit={handleSubmitReply}
          />
        )}

        {/* REPLIES LIST */}
        {showReplies && (
          <div className="mt-3.5 border-l border-white/[0.08] ml-2.5 sm:ml-3.5 pl-2 sm:pl-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-1 px-1">
              <CornerDownRight className="w-3.5 h-3.5 text-netflix-red shrink-0" />
              <span className="tabular-nums">{replies.length} phản hồi</span>
            </div>
            {loadingReplies ? (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-netflix-red" />
                <span>Đang tải danh sách phản hồi...</span>
              </div>
            ) : replies.length === 0 ? (
              <p className="text-xs text-zinc-500 py-1">Chưa có phản hồi nào.</p>
            ) : (
              replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  currentUserAvatar={currentUserAvatar}
                  currentUserEmail={currentUserEmail}
                  onReact={handleReplyReact}
                  onDelete={handleDeleteReply}
                  isReply={true}
                  onRequireAuth={onRequireAuth}
                  onReplyTo={(targetUserId, targetUserName) => {
                    handleReplyClick(targetUserId, targetUserName);
                  }}
                  highlightCommentId={highlightCommentId}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
