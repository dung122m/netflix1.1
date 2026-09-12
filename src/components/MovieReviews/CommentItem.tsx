"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Heart,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  Pencil,
  MessageSquare,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
} from "lucide-react";
import { MovieComment } from "@/types/comment";
import { StarRating } from "./StarRating";
import {
  subscribeCommentReplies,
  addReplyComment,
  toggleLikeComment,
  deleteMovieComment,
} from "@/services/commentService";
import { toast } from "@/components/Toast";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";

interface CommentItemProps {
  comment: MovieComment;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserAvatar?: string;
  onLike: (commentId: string, hasLiked: boolean) => void;
  onDelete: (commentId: string) => void;
  onEdit?: (comment: MovieComment) => void;
  /** Nếu true: đây là reply (hiển thị nhỏ hơn) */
  isReply?: boolean;
  /** Callback để mở auth modal nếu user chưa đăng nhập */
  onRequireAuth?: () => void;
  /** Callback khi bấm trả lời một reply cụ thể trong thread */
  onReplyTo?: (targetUserId: string, targetUserName: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
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
  onLike,
  onDelete,
  onEdit,
  isReply = false,
  onRequireAuth,
  onReplyTo,
}) => {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  // --- Reply state ---
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

  const hasLiked = Boolean(currentUserId && comment.likedBy?.includes(currentUserId));
  const isAuthor = Boolean(currentUserId && currentUserId === comment.userId);

  // Tổng số replies (từ realtime hoặc từ replyCount field)
  const totalReplies = showReplies ? replies.length : (comment.replyCount || 0);

  const handleToggleReplies = () => {
    if (showReplies) {
      // Ẩn replies
      if (repliesUnsubscribe) {
        repliesUnsubscribe();
        setRepliesUnsubscribe(null);
      }
      setShowReplies(false);
      setReplies([]);
      return;
    }

    // Hiện replies và subscribe
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

    setIsSubmittingReply(true);
    try {
      await addReplyComment({
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
      setReplyContent("");
      setReplyTargetUser(null);
      setShowReplyForm(false);
      // Tự động mở replies để thấy reply vừa gửi
      if (!showReplies) {
        handleToggleReplies();
      }
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
      await deleteMovieComment(replyId);
      toast.info("Đã xóa trả lời.");
    } catch {
      toast.error("Không thể xóa trả lời!");
    }
  };

  const handleLikeReply = async (replyId: string, hasLikedReply: boolean) => {
    if (!currentUserId) {
      onRequireAuth?.();
      return;
    }
    try {
      await toggleLikeComment(replyId, currentUserId, hasLikedReply);
    } catch {
      console.warn("Lỗi like reply");
    }
  };

  return (
    <div className={`group ${isReply ? "bg-zinc-900/40" : "bg-zinc-900/60 hover:bg-zinc-900/90"} border border-white/5 hover:border-white/10 rounded-2xl p-4 md:p-5 transition-all duration-200`}>
      <div className="flex items-start justify-between gap-3">
        {/* User Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`relative ${isReply ? "w-8 h-8" : "w-10 h-10"} rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center font-bold text-white text-sm shrink-0 border border-white/10 shadow-sm`}>
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

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-semibold text-zinc-100 ${isReply ? "text-sm" : "text-sm md:text-base"}`}>
                {comment.userName}
              </span>

              {isAuthor && !isReply && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Đánh giá của bạn
                </span>
              )}

              {isAuthor && isReply && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Bạn
                </span>
              )}

              {comment.episodeName && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                  {comment.episodeName}
                </span>
              )}

              {comment.isSpoiler && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  Spoil
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {!isReply && comment.rating > 0 && (
                <StarRating value={comment.rating} readOnly size="sm" />
              )}
              <span className="text-xs text-zinc-500">
                {formatRelativeTime(comment.createdAt)}
                {comment.updatedAt ? " (đã sửa)" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Actions (Edit / Delete if author) */}
        {isAuthor && (
          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {!isReply && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(comment)}
                className="text-zinc-400 hover:text-amber-400 transition-all p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                title="Chỉnh sửa đánh giá của bạn"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => isReply ? handleDeleteReply(comment.id) : onDelete(comment.id)}
              className="text-zinc-400 hover:text-red-400 transition-all p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              title="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`mt-3.5 ${isReply ? "pl-11" : "pl-13"}`}>
        {comment.isSpoiler && !showSpoiler ? (
          <div className="relative rounded-xl overflow-hidden bg-black/40 border border-amber-500/20 p-4">
            <p className="filter blur-md select-none text-zinc-400 text-sm line-clamp-2">
              {comment.content}
            </p>
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setShowSpoiler(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors shadow-lg"
              >
                <Eye className="w-3.5 h-3.5" />
                Nội dung có tiết lộ tình tiết phim. Bấm để xem
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <p className="text-zinc-200 text-sm md:text-[15px] leading-relaxed whitespace-pre-line break-words">
              {renderCommentContent(comment.content)}
            </p>
            {comment.isSpoiler && (
              <button
                type="button"
                onClick={() => setShowSpoiler(false)}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
              >
                <EyeOff className="w-3 h-3" />
                Ẩn lại nội dung spoil
              </button>
            )}
          </div>
        )}

        {/* Bottom Actions: Like / Reply */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {/* Like */}
          <button
            type="button"
            onClick={() => onLike(comment.id, hasLiked)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all cursor-pointer ${
              hasLiked
                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform ${
                hasLiked ? "fill-red-500 text-red-500 scale-110" : ""
              }`}
            />
            <span>{comment.likes > 0 ? comment.likes : "Thích"}</span>
          </button>

          {/* Reply button (cho cả root comment và reply item) */}
          <button
            type="button"
            onClick={() => {
              if (isReply) {
                onReplyTo?.(comment.userId, comment.userName);
              } else {
                handleReplyClick();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Trả lời</span>
          </button>

          {/* Show/hide replies button */}
          {!isReply && ((comment.replyCount || 0) > 0 || replies.length > 0) ? (
            <button
              type="button"
              onClick={handleToggleReplies}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {showReplies ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>
                {showReplies
                  ? "Ẩn trả lời"
                  : `Xem ${totalReplies > 0 ? totalReplies : ""} trả lời`}
              </span>
            </button>
          ) : null}
        </div>

        {/* Reply Form */}
        {showReplyForm && !isReply && (
          <div className="mt-3 flex gap-2.5 items-start animate-in fade-in duration-150">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden relative border border-white/10">
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
            <div className="flex-1 relative">
              {replyTargetUser && (
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                    <span>Đang trả lời</span>
                    <strong className="text-blue-300">@{replyTargetUser.userName}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTargetUser(null);
                      setReplyContent((prev) => prev.replace(new RegExp(`^@${replyTargetUser.userName}\\s*`), ""));
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer hover:underline"
                  >
                    Hủy chỉ định
                  </button>
                </div>
              )}
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
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 resize-none transition-all"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-zinc-600">{replyContent.length}/500 · Ctrl+Enter để gửi</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyContent("");
                      setReplyTargetUser(null);
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReply}
                    disabled={isSubmittingReply || !replyContent.trim()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer"
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
        )}

        {/* Replies List */}
        {showReplies && !isReply && (
          <div className="mt-3 space-y-2 border-l-2 border-white/5 pl-3 sm:pl-4">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-2">
              <CornerDownRight className="w-3.5 h-3.5" />
              <span>{replies.length} trả lời</span>
            </div>
            {loadingReplies ? (
              <div className="flex items-center gap-2 text-zinc-500 text-xs py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải trả lời...</span>
              </div>
            ) : replies.length === 0 ? (
              <p className="text-xs text-zinc-600 py-1">Chưa có trả lời nào.</p>
            ) : (
              replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  currentUserAvatar={currentUserAvatar}
                  onLike={handleLikeReply}
                  onDelete={handleDeleteReply}
                  isReply={true}
                  onRequireAuth={onRequireAuth}
                  onReplyTo={(targetUserId, targetUserName) => {
                    handleReplyClick(targetUserId, targetUserName);
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
