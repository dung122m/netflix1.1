"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Pin,
  ShieldCheck,
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
import { checkContentModeration, detectSpoiler } from "@/lib/contentModeration";
import { toast } from "@/components/Toast";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Tooltip } from "@/components/ui/Tooltip";

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

function renderCommentContent(text: string, replyToUserName?: string) {
  if (replyToUserName && text.startsWith(`@${replyToUserName}`)) {
    const mention = `@${replyToUserName}`;
    const rest = text.slice(mention.length);
    return (
      <>
        <span className="text-netflix-red font-semibold inline-block mr-1">
          {mention}
        </span>
        {rest}
      </>
    );
  }
  const parts = text.split(/(@[^\s@]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span key={index} className="text-netflix-red font-semibold inline-block mr-0.5">
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
  const effectiveUserAvatar = isAuthor && currentUserAvatar ? currentUserAvatar : comment.userAvatar;
  const isCommentAuthorAdmin = Boolean(
    (comment.userEmail && isUserAdmin(comment.userEmail)) ||
    (isAuthor && isUserAdmin(currentUserEmail)) ||
    comment.userBadges?.some(
      (b) =>
        b.toLowerCase().includes("admin") ||
        b.toLowerCase().includes("quản trị")
    )
  );

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
        })
      );
    }
  };

  // Tổng số replies (từ realtime hoặc từ replyCount field)
  const totalReplies = Math.max(comment.replyCount || 0, replies.length);

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
        isSpoiler: detectSpoiler(trimmed),
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

      // Nếu chưa kích hoạt lắng nghe replies của comment này, kết nối realtime ngay lập tức
      if (!repliesUnsubscribe) {
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
    const previous = replies;
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    try {
      await deleteMovieComment(replyId, { movieSlug: comment.movieSlug, userId: currentUserId || undefined });
      toast.info("Đã xóa trả lời.");
    } catch (err) {
      setReplies(previous);
      const msg = err instanceof Error ? err.message : "Không thể xóa trả lời!";
      toast.error(msg);
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
        const tally: Partial<Record<CommentReactionType, number>> = {};
        Object.values(updatedReactions).forEach((t) => {
          tally[t] = (tally[t] || 0) + 1;
        });
        return {
          ...r,
          likes: newLikes,
          likedBy: newLikedBy,
          reactions: updatedReactions,
          reactionCounts: tally,
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

  // --- GIAO DIỆN PHẢN HỒI (REPLY) DẠNG THREAD PHẲNG LIỀN MẠCH (YOUTUBE / THREADS STYLE) ---
  if (isReply) {
    return (
      <div
        ref={itemRef}
        id={`comment-${comment.id}`}
        className={`group relative flex items-start gap-2.5 sm:gap-3 py-1.5 px-2 sm:px-2.5 rounded-xl transition-all duration-200 ${
          isHighlighted
            ? "bg-netflix-red/15 ring-1 ring-netflix-red/40 shadow-[0_0_20px_var(--accent-glow)]"
            : "hover:bg-white/[0.03]"
        }`}
      >
        {/* User Avatar */}
        <Tooltip content={isAuthor ? "Xem & chỉnh sửa hồ sơ của bạn" : `Xem trang cá nhân của ${comment.userName}`} side="top">
          <button
            type="button"
            onClick={handleOpenProfile}
            aria-label={isAuthor ? "Xem & chỉnh sửa hồ sơ của bạn" : `Xem trang cá nhân của ${comment.userName}`}
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
              <button
                type="button"
                onClick={handleOpenProfile}
                title={isAuthor ? "Xem & chỉnh sửa hồ sơ của bạn" : `Xem trang cá nhân của ${comment.userName}`}
                className="font-semibold text-xs sm:text-[13px] text-zinc-200 hover:text-amber-300 hover:underline transition cursor-pointer text-left truncate leading-tight"
              >
                {comment.userName}
              </button>

              {/* HUY HIỆU ADMIN */}
              {isCommentAuthorAdmin && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-netflix-red/30 to-netflix-red/15 text-netflix-red border border-netflix-red/30 whitespace-nowrap shrink-0 leading-none">
                  <ShieldCheck className="w-2.5 h-2.5 text-netflix-red shrink-0" />
                  <span>Admin</span>
                </span>
              )}

              {/* DANH HIỆU USER */}
              {comment.userBadges && comment.userBadges.length > 0 ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/5 text-amber-300 border border-amber-500/20 whitespace-nowrap shrink-0 leading-none">
                  {comment.userBadges[0]}
                </span>
              ) : null}

              {isAuthor && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-netflix-red/15 text-netflix-red border border-netflix-red/30 whitespace-nowrap shrink-0 leading-none">
                  Bạn
                </span>
              )}

              <span className="text-[10px] sm:text-[11px] text-zinc-500 whitespace-nowrap">
                • {formatRelativeTime(comment.createdAt)}
                {comment.isEdited ? " (đã sửa)" : ""}
              </span>
            </div>

            {/* Nút xóa nhanh cho tác giả reply */}
            {isAuthor && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Tooltip content="Xóa phản hồi" side="top">
                  <button
                    type="button"
                    onClick={() => handleDeleteReply(comment.id)}
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
                    onClick={() => setShowSpoiler(true)}
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
              onReact={handleSelfReact}
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

  return (
    <div
      ref={itemRef}
      id={`comment-${comment.id}`}
      className={`group relative py-4 sm:py-5 transition-all duration-300 ${
        isHighlighted
          ? "bg-netflix-red/10 border-l-2 border-netflix-red pl-3.5 sm:pl-4 rounded-r-xl shadow-[0_0_25px_var(--accent-glow)]"
          : comment.isPinned
          ? "border-l-2 border-amber-400/80 bg-amber-500/[0.04] pl-3.5 sm:pl-4 rounded-r-xl"
          : "hover:bg-white/[0.015]"
      }`}
    >
      {/* BADGE BÌNH LUẬN ĐÃ GHIM BỞI ADMIN */}
      {comment.isPinned && (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
          <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>📌 Đã ghim bởi Quản trị viên</span>
        </div>
      )}

      {/* HEADER: AVATAR & USER INFO & ACTIONS */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* User Avatar + Meta */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Tooltip content={isAuthor ? "Xem & chỉnh sửa hồ sơ của bạn" : `Xem trang cá nhân của ${comment.userName}`} side="top">
            <button
              type="button"
              onClick={handleOpenProfile}
              aria-label={isAuthor ? "Xem & chỉnh sửa hồ sơ của bạn" : `Xem trang cá nhân của ${comment.userName}`}
              className="cursor-pointer hover: hover:ring-amber-400/60 hover:scale-105 transition-all rounded-full shrink-0"
            >
              <UserAvatar
                src={effectiveUserAvatar || undefined}
                name={comment.userName}
                seed={comment.userId || comment.userName}
                sizeClassName={isReply ? "w-7 h-7 sm:w-8 sm:h-8 text-xs" : "w-8 h-8 sm:w-10 sm:h-10 text-sm"}
                className="shadow-sm"
              />
            </button>
          </Tooltip>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenProfile}
                title={isAuthor ? "Xem & chỉnh sửa hồ sơ của bạn" : `Xem trang cá nhân của ${comment.userName}`}
                className={`inline-flex items-center font-semibold text-zinc-100 hover:text-amber-300 hover:underline transition cursor-pointer text-left truncate leading-tight ${
                  isReply ? "text-xs sm:text-sm" : "text-xs sm:text-sm md:text-base"
                }`}
              >
                {comment.userName}
              </button>

              {/* HUY HIỆU QUẢN TRỊ VIÊN (ADMIN) */}
              {isCommentAuthorAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-gradient-to-r from-netflix-red/30 to-netflix-red/15 text-netflix-red shadow-sm shadow-black/40 whitespace-nowrap shrink-0 leading-none animate-in fade-in">
                  <ShieldCheck className="w-3 h-3 text-netflix-red shrink-0" />
                  <span className="leading-none">Admin</span>
                </span>
              )}

              {/* BỘ DANH HIỆU SỞ HỮU HIỂN THỊ TRÊN BÌNH LUẬN */}
              {comment.userBadges && comment.userBadges.length > 0 ? (
                comment.userBadges.slice(0, 2).map((badgeLabel, bIdx) => (
                  <span
                    key={bIdx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 shadow-sm shadow-black/40 whitespace-nowrap shrink-0 leading-none animate-in fade-in ${
                      bIdx >= 1 ? "hidden sm:inline-flex" : ""
                    }`}
                  >
                    <span className="leading-none">{badgeLabel}</span>
                  </span>
                ))
              ) : null}

              {isAuthor && !isReply && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/15 text-amber-300 whitespace-nowrap shrink-0 leading-none">
                  <span className="leading-none">Đánh giá của bạn</span>
                </span>
              )}

              {isAuthor && isReply && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-netflix-red/15 text-netflix-red border border-netflix-red/30 whitespace-nowrap shrink-0 leading-none">
                  <span className="leading-none">Bạn</span>
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
              {!isReply && comment.rating > 0 && (
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
            {!isReply && onEdit && (
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
                onClick={() => (isReply ? handleDeleteReply(comment.id) : onDelete(comment.id))}
                aria-label="Xóa"
                className="text-zinc-400 hover:text-red-400 transition-all p-1 sm:p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* CONTENT: FULL WIDTH ON MOBILE (NO EXCESSIVE PL-13) */}
      <div className={`mt-2 sm:mt-2.5 ${isReply ? "sm:pl-10" : "sm:pl-12"}`}>
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
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-zinc-400 hover:text-netflix-red hover:bg-netflix-red/10 border border-transparent hover:border-netflix-red/20 transition-all cursor-pointer active:scale-95"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Trả lời</span>
          </button>

          {/* Admin Pin Button */}
          {isAdmin && !isReply && (
            <Tooltip content={comment.isPinned ? "Bỏ ghim bình luận này" : "Ghim bình luận quan trọng lên đầu"} side="top">
              <button
                type="button"
                disabled={isPinning}
                onClick={handleTogglePin}
                aria-label={comment.isPinned ? "Bỏ ghim bình luận này" : "Ghim bình luận quan trọng lên đầu"}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
                  comment.isPinned
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-white/5 text-zinc-400 hover:text-amber-300 border-white/10 hover:border-amber-400/30"
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${comment.isPinned ? "fill-amber-300 text-amber-300" : ""}`} />
                <span>{comment.isPinned ? "Bỏ ghim" : "Ghim"}</span>
              </button>
            </Tooltip>
          )}

          {/* Toggle view replies button (chỉ hiển thị ở root comment) */}
          {!isReply && ((comment.replyCount || 0) > 0 || replies.length > 0) ? (
            <button
              type="button"
              onClick={handleToggleReplies}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-netflix-red hover:underline transition-colors cursor-pointer py-1 px-2.5 rounded-full hover:bg-netflix-red/10"
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
          <div className="mt-3 p-2.5 sm:p-3.5 bg-zinc-950/80 rounded-xl sm:rounded-2xl animate-in fade-in zoom-in-98 duration-150">
            {replyTargetUser && (
              <div className="flex items-center justify-between mb-2 px-1 text-xs text-netflix-red font-medium">
                <span className="flex items-center gap-1 truncate">
                  <span>Đang trả lời</span>
                  <strong className="text-netflix-red">@{replyTargetUser.userName}</strong>
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
              <UserAvatar
                src={currentUserAvatar || undefined}
                name={currentUserName}
                seed={currentUserId || currentUserName}
                sizeClassName="w-6 h-6 sm:w-7 sm:h-7 text-[10px] sm:text-xs"
                className="mt-0.5"
              />

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
                  className="w-full bg-black/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-netflix-red/60 focus:ring-1 focus:ring-netflix-red/30 resize-none transition-all"
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
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shadow-md shadow-black/40"
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
          <div className="mt-3.5 border-l-2 border-white/10 ml-2.5 sm:ml-3.5 pl-2 sm:pl-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mb-1 px-1">
              <CornerDownRight className="w-3.5 h-3.5 text-netflix-red shrink-0" />
              <span>{replies.length} phản hồi</span>
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
