"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { MovieComment, CommentReactionType } from "@/types/comment";
import {
  subscribeCommentReplies,
  addReplyComment,
  setCommentReaction,
  deleteMovieComment,
  reportCommentViolation,
} from "@/services/commentService";
import { checkContentModeration, detectSpoiler } from "@/lib/contentModeration";
import { toast } from "@/components/ui/Toast";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface UseCommentRepliesOptions {
  comment: MovieComment;
  currentUserId?: string | null;
  currentUserName?: string;
  currentUserAvatar?: string;
  isReply: boolean;
  targetReplyId?: string | null;
  onRequireAuth?: () => void;
}

/**
 * Manages reply thread subscription, reply composer state, moderation checks,
 * optimistic reply deletion, and reply reactions for a root MovieComment.
 */
export function useCommentReplies({
  comment,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  isReply,
  targetReplyId,
  onRequireAuth,
}: UseCommentRepliesOptions) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyTargetUser, setReplyTargetUser] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<MovieComment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const repliesUnsubRef = useRef<(() => void) | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const startRepliesSubscription = useCallback(() => {
    if (repliesUnsubRef.current) return;
    setLoadingReplies(true);
    repliesUnsubRef.current = subscribeCommentReplies(
      comment.id,
      (data) => {
        setReplies(data);
        setLoadingReplies(false);
      },
      () => setLoadingReplies(false),
    );
  }, [comment.id]);

  useEffect(() => {
    return () => {
      if (repliesUnsubRef.current) {
        repliesUnsubRef.current();
        repliesUnsubRef.current = null;
      }
    };
  }, []);

  // Tự động mở replies nếu có reply con trong thread này được chỉ định highlight
  useEffect(() => {
    if (targetReplyId && !showReplies && !isReply) {
      setShowReplies(true);
      startRepliesSubscription();
    }
  }, [targetReplyId, showReplies, isReply, startRepliesSubscription]);

  const handleToggleReplies = useCallback(() => {
    if (showReplies) {
      if (repliesUnsubRef.current) {
        repliesUnsubRef.current();
        repliesUnsubRef.current = null;
      }
      setShowReplies(false);
      setReplies([]);
      return;
    }

    setShowReplies(true);
    startRepliesSubscription();
  }, [showReplies, startRepliesSubscription]);

  const handleReplyClick = useCallback(
    (targetUserId?: string, targetUserName?: string) => {
      if (!currentUserId) {
        onRequireAuth?.();
        return;
      }
      if (targetUserId && targetUserName && targetUserId !== comment.userId) {
        setReplyTargetUser({ userId: targetUserId, userName: targetUserName });
        setReplyContent(`@${targetUserName} `);
      } else {
        setReplyTargetUser(null);
        setReplyContent((prev) => (!prev || prev.startsWith("@") ? "" : prev));
      }
      setShowReplyForm(true);
      setTimeout(() => {
        if (replyInputRef.current) {
          replyInputRef.current.focus();
          replyInputRef.current.selectionStart =
            replyInputRef.current.value.length;
          replyInputRef.current.selectionEnd = replyInputRef.current.value.length;
        }
      }, 100);
    },
    [currentUserId, onRequireAuth, comment.userId],
  );

  const handleCancelReplyForm = useCallback(() => {
    setShowReplyForm(false);
    setReplyContent("");
    setReplyTargetUser(null);
  }, []);

  const handleClearReplyTarget = useCallback(() => {
    if (!replyTargetUser) return;
    const escapedName = replyTargetUser.userName.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    setReplyTargetUser(null);
    setReplyContent((prev) =>
      prev.replace(new RegExp(`^@${escapedName}\\s*`), ""),
    );
  }, [replyTargetUser]);

  const handleSubmitReply = useCallback(async () => {
    if (!currentUserId || !currentUserName) {
      onRequireAuth?.();
      return;
    }
    const trimmed = replyContent.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập nội dung trả lời!");
      return;
    }

    const modCheck = checkContentModeration(trimmed);
    if (!modCheck.isAllowed) {
      reportCommentViolation({
        userId: currentUserId,
        userName: currentUserName,
        userAvatar: currentUserAvatar,
        movieSlug: comment.movieSlug,
        movieTitle: comment.movieTitle,
        attemptedContent: trimmed,
        reason:
          modCheck.reason || "Sử dụng từ ngữ không phù hợp thuần phong mỹ tục",
        violations: modCheck.violations,
        isSpam: modCheck.isSpam,
        commentId: comment.id,
      }).catch(() => {});

      toast.error(
        modCheck.reason ||
          "Nội dung chứa từ ngữ không phù hợp thuần phong mỹ tục. Hành vi cố ý spam sẽ bị khóa tài khoản!",
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

      setReplies((prev) => [
        ...prev.filter((r) => r.id !== newReplyItem.id),
        newReplyItem,
      ]);
      setReplyContent("");
      setReplyTargetUser(null);
      setShowReplyForm(false);
      setShowReplies(true);

      startRepliesSubscription();
      toast.success("Đã gửi trả lời!");
    } catch (err) {
      console.error("Lỗi gửi reply:", err);
      toast.error("Không thể gửi trả lời. Vui lòng thử lại!");
    } finally {
      setIsSubmittingReply(false);
    }
  }, [
    currentUserId,
    currentUserName,
    currentUserAvatar,
    onRequireAuth,
    replyContent,
    comment.movieSlug,
    comment.movieTitle,
    comment.id,
    comment.userId,
    comment.userName,
    replyTargetUser,
    startRepliesSubscription,
  ]);

  const handleDeleteReply = useCallback(
    async (replyId: string) => {
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
        await deleteMovieComment(replyId, {
          movieSlug: comment.movieSlug,
          userId: currentUserId || undefined,
        });
        toast.info("Đã xóa trả lời.");
      } catch (err) {
        setReplies(previous);
        const msg =
          err instanceof Error ? err.message : "Không thể xóa trả lời!";
        toast.error(msg);
      }
    },
    [replies, comment.movieSlug, currentUserId],
  );

  const handleReplyReact = useCallback(
    async (
      replyId: string,
      reactionType: CommentReactionType | null,
      prevReactionType?: CommentReactionType | null,
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
          const updatedReactions: Record<string, CommentReactionType> = {
            ...(r.reactions || {}),
          };
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
        }),
      );

      try {
        await setCommentReaction(
          replyId,
          currentUserId,
          reactionType,
          prevReactionType,
        );
      } catch (err) {
        console.warn("Lỗi thả cảm xúc reply:", err);
      }
    },
    [currentUserId, onRequireAuth],
  );

  return {
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
  };
}

