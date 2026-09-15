"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Pencil,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Reply,
  Sparkles,
  Pin,
} from "lucide-react";
import { MovieComment, CommentReactionType } from "@/types/comment";
import { StarRating } from "./StarRating";
import { ReactionPicker } from "./ReactionPicker";
import {
  subscribeCommentReplies,
  addReplyComment,
  setCommentReaction,
  deleteMovieComment,
  reportCommentViolation,
  togglePinComment,
} from "@/services/commentService";
import { isUserAdmin } from "@/lib/adminConfig";
import { checkContentModeration } from "@/lib/contentModeration";
import { toast } from "@/components/Toast";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";

interface CommentItemProps {
  comment: MovieComment;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserEmail?: string;
  onLike?: (commentId: string, hasLiked: boolean) => void;
  onReact?: (commentId: string, reactionType: CommentReactionType | null, prevReactionType?: CommentReactionType | null) => void;
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

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Vừa xong";
  const diff = Math.max(0, Date.now() - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  const date = new Date(timestamp);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function renderCommentContent(text: string) {
  const parts = text.split(/(@[^\s@]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="text-blue-400 font-semibold inline-block mr-0.5">
          {part}
        </span>
      );
    }
    return part;
  });
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
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [comment.userAvatar]);

  // --- Highlight & Scroll state ---
  const isTarget = Boolean(highlightCommentId && comment.id === highlightCommentId);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // --- Reply form state ---
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyTargetUser, setReplyTargetUser] = useState<{ userId: string; userName: string } | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // --- Replies list state ---
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<MovieComment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesUnsubscribe, setRepliesUnsubscribe] = useState<(() => void) | null>(null);

  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const isAuthor = Boolean(currentUserId && currentUserId === comment.userId);

  // Tổng số replies (từ realtime hoặc từ replyCount field)
  const totalReplies = showReplies ? replies.length : (comment.replyCount || 0);

  // Tự động mở replies nếu có reply con trong thread này được chỉ định highlight
  useEffect(() => {
    if (targetReplyId && !showReplies && !isReply) {
      setShowReplies(true);
      setLoadingReplies(true);
      const unsub = subscribeCommentReplies(
        comment.id,
        (data) => {
          setReplies(data);
          setLoadingReplies(false);
        },
        () => setLoadingReplies(false),
      );
      setRepliesUnsubscribe(() => unsub);
    }
  }, [targetReplyId, showReplies, isReply, comment.id]);

  // Tự động cuộn tới vị trí comment và kích hoạt hiệu ứng phát sáng (highlight)
  useEffect(() => {
    if (isTarget) {
      setIsHighlighted(true);
      const scrollTimer = setTimeout(() => {
        if (itemRef.current) {
          itemRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 350);

      const unhighlightTimer = setTimeout(() => {
        setIsHighlighted(false);
      }, 5000);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(unhighlightTimer);
      };
    }
  }, [isTarget]);

  const handleToggleReplies = () => {
    if (showReplies) {
      if (repliesUnsubscribe) {
        repliesUnsubscribe();
        setRepliesUnsubscribe(null);
      }
      setShowReplies(false);
      setReplies([]);
      return;
    }

    setShowReplies(true);
    setLoadingReplies(true);
    const unsub = subscribeCommentReplies(
      comment.id,
      (data) => {
        setReplies(data);
        setLoadingReplies(false);
      },
      () => setLoadingReplies(false),
    );
    setRepliesUnsubscribe(() => unsub);
  };

  const handleReplyClick = (targetUserId?: string, targetUserName?: string) => {
    if (!currentUserId) {
      onRequireAuth?.();
      return;
    }
    if (targetUserId && targetUserName && targetUserId !== comment.userId) {
      setReplyTargetUser({ userId: targetUserId, userName: targetUserName });
      setReplyContent(`@${targetUserName} `);
    } else {
      setReplyTargetUser(null);
      if (!replyContent || replyContent.startsWith("@")) {
        setReplyContent("");
      }
    }
    setShowReplyForm(true);
    setTimeout(() => {
      if (replyInputRef.current) {
        replyInputRef.current.focus();
        replyInputRef.current.selectionStart = replyInputRef.current.value.length;
        replyInputRef.current.selectionEnd = replyInputRef.current.value.length;
      }
    }, 100);
  };

  const handleSubmitReply = async () => {
    if (!currentUserId || !currentUserName) {
      onRequireAuth?.();
      return;
    }
    const trimmed = replyContent.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập nội dung trả lời!");
      return;
    }

    // 1. Kiểm tra từ ngữ cấm & spam
    const modCheck = checkContentModeration(trimmed);
    if (!modCheck.isAllowed) {
      reportCommentViolation({
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        movieSlug: comment.movieSlug,
        movieTitle: comment.movieTitle,
        attemptedContent: trimmed,
        reason: modCheck.reason || "Sử dụng từ ngữ không phù hợp thuần phong mỹ tục",
        violations: modCheck.violations,
        isSpam: modCheck.isSpam,
        commentId: comment.id,
      }).catch(() => {});

      toast.error(
        modCheck.reason || "Nội dung chứa từ ngữ không phù hợp thuần phong mỹ tục. Hành vi cố ý spam sẽ bị khóa tài khoản!"
      );
      return;
    }

    setIsSubmittingReply(true);
    try {
      const createdId = await addReplyComment({
        parentId: comment.id,
        parentOwnerId: comment.userId,
        parentOwnerName: comment.userName,
        replyToUserId: replyTargetUser?.userId,
        replyToUserName: replyTargetUser?.userName,
        movieSlug: comment.movieSlug,
        movieTitle: comment.movieTitle,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        content: trimmed,
      });

      const newReplyItem: MovieComment = {
        id: createdId || `reply_${Date.now()}`,
        parentId: comment.id,
        parentOwnerId: comment.userId,
        replyToUserId: replyTargetUser?.userId,
        replyToUserName: replyTargetUser?.userName,
        movieSlug: comment.movieSlug,
        movieTitle: comment.movieTitle,
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        content: trimmed,
        rating: 0,
        likes: 0,
        likedBy: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setReplies((prev) => [...prev.filter((r) => r.id !== newReplyItem.id), newReplyItem]);
      setReplyContent("");
      setReplyTargetUser(null);
      setShowReplyForm(false);
      setShowReplies(true);
      toast.success("Đã gửi trả lời!");
    } catch (err) {
      console.error("Lỗi gửi reply:", err);
      toast.error("Không thể gửi trả lời. Vui lòng thử lại!");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    const confirmed = await showConfirmDialog({
      title: "Xóa trả lời",
      message: "Bạn có chắc muốn xóa trả lời này không?",
      confirmText: "Xóa",
      cancelText: "Hủy",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
      await deleteMovieComment(replyId);
      toast.info("Đã xóa trả lời.");
    } catch {
      toast.error("Không thể xóa trả lời!");
    }
  };

  const handleReplyReact = async (
    replyId: string,
    reactionType: CommentReactionType | null,
    prevReactionType?: CommentReactionType | null
  ) => {
    if (!currentUserId) {
      onRequireAuth?.();
      return;
    }

    // 0ms Optimistic UI update cho danh sách reply
    setReplies((prev) =>
      prev.map((r) => {
        if (r.id !== replyId) return r;
        const currentLikedBy = Array.isArray(r.likedBy) ? r.likedBy : [];
        let newLikedBy = currentLikedBy;
        let newLikes = r.likes || 0;
        if (reactionType !== null) {
          if (!newLikedBy.includes(currentUserId)) {
            newLikedBy = [...newLikedBy, currentUserId];
            newLikes += 1;
          }
        } else {
          newLikedBy = newLikedBy.filter((id) => id !== currentUserId);
          newLikes = Math.max(0, newLikes - 1);
        }
        const updatedReactions: Record<string, CommentReactionType> = { ...(r.reactions || {}) };
        if (reactionType) {
          updatedReactions[currentUserId] = reactionType;
        } else {
          delete updatedReactions[currentUserId];
        }
        return {
          ...r,
          likes: newLikes,
          likedBy: newLikedBy,
          reactions: updatedReactions,
        };
      })
    );

    try {
      await setCommentReaction(replyId, currentUserId, reactionType, prevReactionType);
    } catch (err) {
      console.warn("Lỗi thả cảm xúc reply:", err);
    }
  };

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
        await setCommentReaction(comment.id, currentUserId, reactionType, prevReaction);
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
      const isPinnedNow = await togglePinComment(comment.id, Boolean(comment.isPinned), currentUserEmail);
      onTogglePin?.(comment.id, isPinnedNow);
      toast.success(isPinnedNow ? "Đã ghim bình luận lên đầu!" : "Đã bỏ ghim bình luận.");
    } catch {
      onTogglePin?.(comment.id, Boolean(comment.isPinned));
      toast.error("Không thể ghim/bỏ ghim bình luận!");
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <div
      ref={itemRef}
      id={`comment-${comment.id}`}
      className={`group relative ${
        isHighlighted
          ? "ring-2 ring-red-500 shadow-[0_0_35px_rgba(229,9,20,0.65)] bg-red-950/40 border-red-500/80"
          : comment.isPinned
          ? "bg-gradient-to-r from-amber-950/30 via-zinc-900/90 to-zinc-950/90 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30"
          : isReply
          ? "bg-zinc-900/40 hover:bg-zinc-900/60 border-white/5"
          : "bg-zinc-900/60 hover:bg-zinc-900/90 border-white/5 hover:border-white/10"
      } ${
        isReply
          ? "p-2.5 sm:p-3.5 rounded-xl border"
          : "p-3 sm:p-4 md:p-5 rounded-2xl border"
      } transition-all duration-500`}
    >
      {/* BADGE BÌNH LUẬN ĐÃ GHIM BỞI ADMIN */}
      {comment.isPinned && (
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-xl border border-amber-500/40 w-fit shadow-md">
          <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />
          <span>📌 Bình luận quan trọng được ghim bởi Quản trị viên</span>
        </div>
      )}

      {/* BADGE THÔNG BÁO KHI ĐƯỢC CHỌN TỪ POPUP / THÔNG BÁO */}
      {isHighlighted && (
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold text-red-300 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/30 w-fit animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Bình luận bạn vừa chọn từ thông báo</span>
        </div>
      )}

      {/* HEADER: AVATAR & USER INFO & ACTIONS */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* User Avatar + Meta */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div
            className={`relative ${
              isReply ? "w-7 h-7 sm:w-8 sm:h-8 text-xs" : "w-8 h-8 sm:w-10 sm:h-10 text-sm"
            } rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center font-bold text-white shrink-0 border border-white/10 shadow-sm`}
          >
            {comment.userAvatar && !avatarError ? (
              <Image
                src={comment.userAvatar}
                alt={comment.userName}
                fill
                sizes={isReply ? "32px" : "40px"}
                className="object-cover"
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
              />
            ) : (
              (comment.userName || "U").charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span
                className={`font-semibold text-zinc-100 truncate ${
                  isReply ? "text-xs sm:text-sm" : "text-xs sm:text-sm md:text-base"
                }`}
              >
                {comment.userName}
              </span>

              {/* BỘ DANH HIỆU VIP SỞ HỮU HIỂN THỊ TRÊN BÌNH LUẬN */}
              {(() => {
                const badgesToRender =
                  comment.userBadges && comment.userBadges.length > 0
                    ? comment.userBadges
                    : ["🍿 Mọt Phim Đêm"];

                return badgesToRender.slice(0, 2).map((badgeLabel, bIdx) => (
                  <span
                    key={bIdx}
                    className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9.5px] sm:text-[11px] font-black bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/40 animate-in fade-in ${
                      bIdx >= 1 ? "hidden sm:inline-flex" : ""
                    }`}
                  >
                    <span>{badgeLabel}</span>
                  </span>
                ));
              })()}

              {isAuthor && !isReply && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Đánh giá của bạn
                </span>
              )}

              {isAuthor && isReply && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Bạn
                </span>
              )}

              {comment.episodeName && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  {comment.episodeName}
                </span>
              )}

              {comment.isSpoiler && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  Spoil
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {!isReply && comment.rating > 0 && (
                <StarRating value={comment.rating} readOnly size="sm" />
              )}
              <span className="text-[10px] sm:text-xs text-zinc-500">
                {formatRelativeTime(comment.createdAt)}
                {comment.updatedAt && comment.createdAt && comment.updatedAt - comment.createdAt > 3000 ? " (đã sửa)" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Actions (Edit / Delete if author) */}
        {isAuthor && (
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {!isReply && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(comment)}
                className="text-zinc-400 hover:text-amber-400 transition-all p-1 sm:p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                title="Chỉnh sửa đánh giá của bạn"
              >
                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => (isReply ? handleDeleteReply(comment.id) : onDelete(comment.id))}
              className="text-zinc-400 hover:text-red-400 transition-all p-1 sm:p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>

      {/* CONTENT: FULL WIDTH ON MOBILE (NO EXCESSIVE PL-13) */}
      <div className={`mt-2 sm:mt-2.5 ${isReply ? "sm:pl-10" : "sm:pl-12"}`}>
        {comment.isSpoiler && !showSpoiler ? (
          <div className="relative rounded-xl overflow-hidden bg-black/40 border border-amber-500/20 p-3 sm:p-4">
            <p className="filter blur-md select-none text-zinc-400 text-xs sm:text-sm line-clamp-2">
              {comment.content}
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 text-center">
              <button
                type="button"
                onClick={() => setShowSpoiler(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors shadow-lg"
              >
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span>Nội dung có tiết lộ tình tiết. Bấm xem</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <p className="text-zinc-200 text-xs sm:text-sm md:text-[15px] leading-relaxed whitespace-pre-line break-words">
              {renderCommentContent(comment.content)}
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

        {/* BOTTOM ACTIONS: FACEBOOK MULTI-REACTION PICKER & REPLY */}
        <div className="flex items-center gap-2 sm:gap-3 mt-2.5 sm:mt-3 flex-wrap">
          {/* Reaction Picker (Like / Love / Haha / Wow / Sad / Angry) */}
          <ReactionPicker
            comment={comment}
            currentUserId={currentUserId}
            onReact={handleSelfReact}
            onRequireAuth={onRequireAuth}
            isCompact={isReply}
          />

          {/* Reply button */}
          <button
            type="button"
            onClick={() => {
              if (isReply) {
                onReplyTo?.(comment.userId, comment.userName);
              } else {
                handleReplyClick();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Trả lời</span>
          </button>

          {/* Admin Pin Button */}
          {isAdmin && !isReply && (
            <button
              type="button"
              disabled={isPinning}
              onClick={handleTogglePin}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
                comment.isPinned
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-white/5 text-zinc-400 hover:text-amber-300 border-white/10 hover:border-amber-500/30"
              }`}
              title={comment.isPinned ? "Bỏ ghim bình luận này" : "Ghim bình luận quan trọng lên đầu"}
            >
              <Pin className={`w-3.5 h-3.5 ${comment.isPinned ? "fill-amber-300 text-amber-300" : ""}`} />
              <span>{comment.isPinned ? "Bỏ ghim" : "Ghim"}</span>
            </button>
          )}

          {/* Toggle view replies button (chỉ hiển thị ở root comment) */}
          {!isReply && ((comment.replyCount || 0) > 0 || replies.length > 0) ? (
            <button
              type="button"
              onClick={handleToggleReplies}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer py-1 px-1.5 rounded-lg hover:bg-white/5"
            >
              {showReplies ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>
                {showReplies
                  ? "Ẩn phản hồi"
                  : `Xem ${totalReplies > 0 ? totalReplies : ""} phản hồi`}
              </span>
            </button>
          ) : null}
        </div>

        {/* REPLY FORM: OPTIMIZED RESPONSIVE LAYOUT */}
        {showReplyForm && !isReply && (
          <div className="mt-3 p-2.5 sm:p-3.5 bg-zinc-950/80 border border-white/10 rounded-xl sm:rounded-2xl animate-in fade-in zoom-in-98 duration-150">
            {replyTargetUser && (
              <div className="flex items-center justify-between mb-2 px-1 text-xs text-blue-400 font-medium">
                <span className="flex items-center gap-1 truncate">
                  <span>Đang trả lời</span>
                  <strong className="text-blue-300">@{replyTargetUser.userName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTargetUser(null);
                    setReplyContent((prev) =>
                      prev.replace(new RegExp(`^@${replyTargetUser.userName}\\s*`), "")
                    );
                  }}
                  className="text-[11px] text-zinc-400 hover:text-white cursor-pointer hover:underline flex-shrink-0 ml-2"
                >
                  Hủy chỉ định
                </button>
              </div>
            )}

            <div className="flex gap-2 sm:gap-2.5 items-start">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center font-bold text-white text-[10px] sm:text-xs shrink-0 overflow-hidden relative border border-white/10 mt-0.5">
                {currentUserAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUserAvatar}
                    alt="Avatar"
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  (currentUserName || "U").charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 min-w-0">
                <textarea
                  ref={replyInputRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={
                    replyTargetUser
                      ? `Trả lời @${replyTargetUser.userName}...`
                      : `Trả lời ${comment.userName}...`
                  }
                  rows={2}
                  maxLength={500}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmitReply();
                    }
                  }}
                  className="w-full bg-black/80 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-none transition-all"
                />
                <div className="flex items-center justify-between mt-1.5 gap-2 flex-wrap">
                  <span className="text-[10px] text-zinc-500">
                    {replyContent.length}/500 · <span className="hidden sm:inline">Ctrl+Enter để gửi</span>
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyContent("");
                        setReplyTargetUser(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitReply}
                      disabled={isSubmittingReply || !replyContent.trim()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shadow-md shadow-blue-900/30"
                    >
                      {isSubmittingReply ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Gửi</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPLIES LIST: COMPACT RESPONSIVE NESTING */}
        {showReplies && !isReply && (
          <div className="mt-3 space-y-2 border-l-2 border-white/10 ml-1 sm:ml-2 pl-2 sm:pl-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-2">
              <CornerDownRight className="w-3 h-3 text-blue-400" />
              <span>{replies.length} phản hồi</span>
            </div>
            {loadingReplies ? (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
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
