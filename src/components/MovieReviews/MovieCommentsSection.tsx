"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  LogIn,
  Loader2,
  Flame,
  Star,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/modals/AuthModal";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { MovieComment, CommentReactionType } from "@/types/comment";
import {
  subscribeMovieComments,
  addMovieComment,
  updateMovieComment,
  setCommentReaction,
  deleteMovieComment,
  calculateMovieRatingStats,
  reportCommentViolation,
} from "@/services/commentService";
import { checkContentModeration, detectSpoiler } from "@/lib/contentModeration";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { StarRating } from "./StarRating";
import { CommentItem } from "./CommentItem";
import { CommentReviewForm } from "./CommentReviewForm";

interface MovieCommentsSectionProps {
  movieSlug: string;
  movieTitle: string;
  currentEpisodeSlug?: string;
  currentEpisodeName?: string;
  hideOuterCard?: boolean;
}

const MovieCommentsSectionContent: React.FC<MovieCommentsSectionProps> = ({
  movieSlug,
  movieTitle,
  currentEpisodeSlug,
  currentEpisodeName,
  hideOuterCard = false,
}) => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasCommentDeepLink = Boolean(
    searchParams?.get("highlightComment") ||
    (typeof window !== "undefined" && window.location.hash.startsWith("#comment-")),
  );
  const [isCommentsActivated, setIsCommentsActivated] = useState<boolean>(hasCommentDeepLink);

  useEffect(() => {
    if (isCommentsActivated) return;
    if (hasCommentDeepLink) {
      setIsCommentsActivated(true);
      return;
    }
    const target = sectionRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      setIsCommentsActivated(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsCommentsActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [isCommentsActivated, hasCommentDeepLink, movieSlug]);

  useEffect(() => {
    setUserProfile(null);
    setHasInitializedForm(false);
    if (!user?.uid) {
      return;
    }
    if (!isCommentsActivated) return;
    const unsub = subscribeUserProfile(user.uid, (p) => {
      setUserProfile(p);
    });
    return () => unsub();
  }, [user?.uid, isCommentsActivated]);

  const effectiveAvatar = userProfile?.customAvatar || userProfile?.photoURL || user?.photoURL || "";
  const effectiveDisplayName = userProfile?.displayName || user?.displayName || "Thành viên Nanaflix";

  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, []);

  // Hàm cuộn mượt và chính xác tới comment mục tiêu (hỗ trợ thử lại nhiều lần nếu DOM/Replies đang tải)
  const scrollToTargetComment = useCallback((targetId: string) => {
    if (!targetId || typeof document === "undefined") return;
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    let attempts = 0;
    const maxAttempts = 35; // 35 x 100ms = 3.5s
    const interval = setInterval(() => {
      attempts++;
      const el = document.getElementById(`comment-${targetId}`);
      if (el) {
        clearInterval(interval);
        if (scrollIntervalRef.current === interval) scrollIntervalRef.current = null;
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        if (scrollIntervalRef.current === interval) scrollIntervalRef.current = null;
        // Fallback: nếu không tìm thấy comment cụ thể, cuộn đến khu vực bình luận
        const section = document.getElementById("section-reviews");
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 100);
    scrollIntervalRef.current = interval;
  }, []);

  // Lấy ID comment cần highlight từ query params (?highlightComment=xxx) hoặc URL hash (#comment-xxx) hoặc event
  useEffect(() => {
    const paramHighlight = searchParams?.get("highlightComment");
    if (paramHighlight) {
      setHighlightId(paramHighlight);
      scrollToTargetComment(paramHighlight);
    } else if (typeof window !== "undefined" && window.location.hash.startsWith("#comment-")) {
      const hashId = window.location.hash.replace("#comment-", "");
      setHighlightId(hashId);
      scrollToTargetComment(hashId);
    }

    const handleHighlightEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ commentId?: string }>;
      if (customEv.detail?.commentId) {
        const id = customEv.detail.commentId;
        setHighlightId(id);
        scrollToTargetComment(id);
      }
    };
    window.addEventListener("nanaflix-highlight-comment", handleHighlightEvent);
    return () => {
      window.removeEventListener("nanaflix-highlight-comment", handleHighlightEvent);
    };
  }, [searchParams, scrollToTargetComment]);

  // Khi danh sách bình luận (comments) tải xong hoặc cập nhật, nếu có highlightId thì kích hoạt cuộn
  useEffect(() => {
    if (highlightId && comments.length > 0) {
      scrollToTargetComment(highlightId);
    }
  }, [comments.length, highlightId, scrollToTargetComment]);

  // Tự động gỡ highlightId sau khi hiệu ứng sáng Facebook hoàn tất (2.8s) và làm sạch URL
  useEffect(() => {
    if (!highlightId) return;
    const timer = setTimeout(() => {
      setHighlightId(null);
      if (typeof window !== "undefined") {
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has("highlightComment") || url.hash) {
            url.searchParams.delete("highlightComment");
            window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
          }
        } catch { }
      }
    }, 2800);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // Tìm bài viết mục tiêu (có thể là root comment hoặc reply)
  const targetComment = useMemo(() => {
    if (!highlightId) return null;
    return comments.find((c) => c.id === highlightId) || null;
  }, [comments, highlightId]);

  // Nếu mục tiêu là một reply con, xác định ID bài comment cha chứa nó
  const targetParentId = useMemo(() => {
    if (!targetComment) return null;
    return targetComment.parentId || null;
  }, [targetComment]);

  // Form states
  const [rating, setRating] = useState<number>(0);
  const [content, setContent] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [scopeEpisode, setScopeEpisode] = useState<"all" | "episode">("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitializedForm, setHasInitializedForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Filter / Sort states
  const [sortBy, setSortBy] = useState<"newest" | "topLikes" | "onlyFiveStar">("newest");
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset comments and form state when movieSlug changes
  useEffect(() => {
    setComments([]);
    setHasInitializedForm(false);
    setContent("");
    setRating(0);
    setIsSpoiler(false);
    setScopeEpisode("all");
    const hasDeepLink = Boolean(
      searchParams?.get("highlightComment") ||
      (typeof window !== "undefined" && window.location.hash.startsWith("#comment-")),
    );
    setIsCommentsActivated(hasDeepLink);
  }, [movieSlug, searchParams]);

  // Subscribe to real-time comments from Supabase + LocalStorage (lazy when scrolled into view)
  useEffect(() => {
    if (!isCommentsActivated) return;
    setLoading(true);
    setLoadError(null);
    const unsubscribe = subscribeMovieComments(
      movieSlug,
      (data) => {
        setComments(data);
        setLoading(false);
        setLoadError(null);
      },
      (error) => {
        console.warn("Lỗi tải bình luận:", error);
        setLoadError(error.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [movieSlug, isCommentsActivated]);

  // Tìm bài đánh giá đã có của chính người dùng hiện tại (chỉ tính đánh giá gốc của đúng movieSlug này, không tính reply)
  const myExistingReview = useMemo(() => {
    if (!user?.uid) return null;
    return comments.find((c) => !c.parentId && c.userId === user.uid && (!c.movieSlug || c.movieSlug === movieSlug)) || null;
  }, [comments, user?.uid, movieSlug]);

  // Tự động điền dữ liệu đánh giá cũ vào form khi tải xong
  useEffect(() => {
    if (myExistingReview && !hasInitializedForm) {
      setRating(myExistingReview.rating || 0);
      setContent(myExistingReview.content || "");
      setIsSpoiler(Boolean(myExistingReview.isSpoiler));
      if (myExistingReview.episodeSlug) {
        setScopeEpisode("episode");
      }
      setHasInitializedForm(true);
    } else if (!myExistingReview && hasInitializedForm) {
      setContent("");
      setRating(0);
      setIsSpoiler(false);
      setHasInitializedForm(false);
    }
  }, [myExistingReview, hasInitializedForm]);

  // Khi click nút sửa trên bài đánh giá ở danh sách bên dưới
  const handleEditReview = (item: MovieComment) => {
    setRating(item.rating || 0);
    setContent(item.content || "");
    setIsSpoiler(Boolean(item.isSpoiler));
    if (item.episodeSlug) {
      setScopeEpisode("episode");
    }
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Calculate rating statistics (đã khử trùng lặp theo từng user)
  const stats = useMemo(() => calculateMovieRatingStats(comments), [comments]);

  // Filter & sort comments - CHỈ hiển thị top-level comments (không phải replies)
  const sortedComments = useMemo(() => {
    let result = comments.filter((c) => !c.parentId); // Lọc bỏ replies

    if (sortBy === "onlyFiveStar") {
      result = result.filter((c) => c.rating === 5);
    }

    result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (sortBy === "topLikes") {
        return (b.likes || 0) - (a.likes || 0);
      }
      return b.createdAt - a.createdAt;
    });

    // Bổ sung replyCount từ danh sách replies trong bộ nhớ
    const replyCountMap = new Map<string, number>();
    comments.forEach((c) => {
      if (c.parentId) {
        replyCountMap.set(c.parentId, (replyCountMap.get(c.parentId) || 0) + 1);
      }
    });
    return result.map((c) => ({
      ...c,
      replyCount: replyCountMap.get(c.id) || c.replyCount || 0,
    }));
  }, [comments, sortBy]);

  const [visibleCommentsCount, setVisibleCommentsCount] = useState(10);

  // Reset số lượng bình luận hiển thị khi đổi tập phim hoặc đổi bộ lọc sắp xếp
  useEffect(() => {
    setVisibleCommentsCount(10);
  }, [currentEpisodeSlug, sortBy]);

  // Submit or Update review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập nội dung bình luận!");
      return;
    }

    // 1. Kiểm tra từ ngữ cấm & spam
    const modCheck = checkContentModeration(trimmed);
    if (!modCheck.isAllowed) {
      // Báo cáo vi phạm cho Admin
      reportCommentViolation({
        userId: user.uid,
        userName: user.displayName || "Thành viên Nanaflix",
        userEmail: user.email || undefined,
        userAvatar: user.photoURL || undefined,
        movieSlug,
        movieTitle,
        attemptedContent: trimmed,
        reason: modCheck.reason || "Sử dụng từ ngữ không phù hợp thuần phong mỹ tục",
        violations: modCheck.violations,
        isSpam: modCheck.isSpam,
      }).catch(() => { });

      toast.error(
        modCheck.reason || "Bình luận chứa từ ngữ không phù hợp thuần phong mỹ tục. Hành vi cố ý spam sẽ bị khóa tài khoản!"
      );
      return;
    }

    // Tự động nhận diện Spoiler nếu người dùng chưa tích chọn
    const autoSpoiler = detectSpoiler(trimmed);
    const finalIsSpoiler = isSpoiler || autoSpoiler;
    if (autoSpoiler && !isSpoiler) {
      setIsSpoiler(true);
      toast.info("Đã tự động bật cảnh báo Spoiler do bình luận chứa tình tiết/kết phim!");
    }

    setIsSubmitting(true);

    // Timeout 10s: tránh UI bị kẹt "Đang lưu..." vô hạn nếu kết nối máy chủ chậm
    const timeoutId = setTimeout(() => {
      setIsSubmitting(false);
      toast.error("Kết nối máy chủ bị gián đoạn. Vui lòng thử lại!");
    }, 10000);

    try {
      if (myExistingReview) {
        const updatePayload = {
          rating,
          content: trimmed,
          episodeSlug:
            scopeEpisode === "episode" && currentEpisodeSlug ? currentEpisodeSlug : undefined,
          episodeName:
            scopeEpisode === "episode" && currentEpisodeName ? currentEpisodeName : undefined,
          isSpoiler: finalIsSpoiler,
        };

        const previousComments = comments;
        // 1. Optimistic update local state ngay lập tức
        setComments((prev) =>
          prev.map((c) =>
            c.id === myExistingReview.id
              ? {
                ...c,
                ...updatePayload,
                isEdited: true,
                editedAt: Date.now(),
                updatedAt: Date.now(),
              }
              : c
          )
        );

        // 2. Ghi vào database Supabase
        try {
          await updateMovieComment(myExistingReview.id, updatePayload, movieSlug);
          toast.success(rating > 0 ? "Đã cập nhật đánh giá của bạn thành công!" : "Đã cập nhật bình luận thành công!");
        } catch (updateErr) {
          setComments(previousComments);
          throw updateErr;
        }
      } else {
        // Tạo đánh giá mới (lần đầu)
        const createdId = await addMovieComment({
          movieSlug,
          movieTitle: movieTitle || undefined,
          userId: user.uid,
          userName: effectiveDisplayName,
          userAvatar: effectiveAvatar || undefined,
          userEmail: user.email || undefined,
          rating,
          content: trimmed,
          episodeSlug:
            scopeEpisode === "episode" && currentEpisodeSlug ? currentEpisodeSlug : undefined,
          episodeName:
            scopeEpisode === "episode" && currentEpisodeName ? currentEpisodeName : undefined,
          isSpoiler: finalIsSpoiler,
        });
        setComments((prev) => [
          {
            id: createdId,
            movieSlug,
            movieTitle: movieTitle || undefined,
            userId: user.uid,
            userName: effectiveDisplayName,
            userAvatar: effectiveAvatar || undefined,
            userEmail: user.email || undefined,
            rating,
            content: trimmed,
            episodeSlug:
              scopeEpisode === "episode" && currentEpisodeSlug ? currentEpisodeSlug : undefined,
            episodeName:
              scopeEpisode === "episode" && currentEpisodeName ? currentEpisodeName : undefined,
            isSpoiler: finalIsSpoiler,
            likes: 0,
            dislikes: 0,
            likedBy: [],
            dislikedBy: [],
            reactions: {},
            replies: [],
            replyCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          ...prev.filter((c) => c.id !== createdId),
        ]);
        setContent("");
        setRating(0);
        setIsSpoiler(false);
        setScopeEpisode("all");
        toast.success(rating > 0 ? "Đã đăng bình luận và đánh giá thành công!" : "Đã đăng bình luận thành công!");
      }
      clearTimeout(timeoutId);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorMsg =
        err instanceof Error ? err.message : "Không thể lưu đánh giá. Vui lòng thử lại!";
      console.error("Lỗi khi lưu đánh giá:", err);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thả cảm xúc đa dạng (Facebook Reactions)
  const handleReact = async (
    commentId: string,
    reactionType: CommentReactionType | null,
    prevReactionType?: CommentReactionType | null,
  ) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // 0ms Optimistic UI update cho bình luận
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const currentLikedBy = Array.isArray(c.likedBy) ? c.likedBy : [];
        let newLikedBy = currentLikedBy;
        let newLikes = c.likes || 0;
        if (reactionType !== null) {
          if (!newLikedBy.includes(user.uid)) {
            newLikedBy = [...newLikedBy, user.uid];
            newLikes += 1;
          }
        } else {
          newLikedBy = newLikedBy.filter((id) => id !== user.uid);
          newLikes = Math.max(0, newLikes - 1);
        }
        const updatedReactions: Record<string, CommentReactionType> = { ...(c.reactions || {}) };
        if (reactionType) {
          updatedReactions[user.uid] = reactionType;
        } else {
          delete updatedReactions[user.uid];
        }
        const tally: Partial<Record<CommentReactionType, number>> = {};
        Object.values(updatedReactions).forEach((t) => {
          tally[t] = (tally[t] || 0) + 1;
        });
        return {
          ...c,
          likes: newLikes,
          likedBy: newLikedBy,
          reactions: updatedReactions,
          reactionCounts: tally,
        };
      })
    );

    try {
      await setCommentReaction(commentId, user.uid, reactionType, prevReactionType);
    } catch (err) {
      console.warn("Lỗi khi thả cảm xúc bình luận:", err);
    }
  };

  // Delete Comment
  const handleDeleteComment = async (commentId: string) => {
    const confirmed = await showConfirmDialog({
      title: "Xóa bình luận",
      message: "Bạn có chắc chắn muốn xóa bình luận này không? Bình luận đã xóa sẽ không thể phục hồi.",
      confirmText: "Xóa bình luận",
      cancelText: "Hủy",
      variant: "danger",
    });

    if (!confirmed) return;

    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== commentId));

    try {
      await deleteMovieComment(commentId, { movieSlug, userId: user?.uid });
      toast.info("Đã xóa bình luận.");
    } catch (err) {
      setComments(previous);
      console.error("Lỗi khi xóa bình luận:", err);
      const msg = err instanceof Error ? err.message : "Không thể xóa bình luận!";
      toast.error(msg);
    }
  };

  const handleTogglePinComment = (commentId: string, isPinned: boolean) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, isPinned } : c))
    );
  };

  return (
    <section
      ref={sectionRef}
      id="comments"
      className={
        hideOuterCard
          ? "space-y-6"
          : "mt-8 sm:mt-12 bg-zinc-950/80 rounded-2xl sm:rounded-3xl  p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-2xl"
      }
    >
      {/* Title & Section Header: Chỉ render khi dùng độc lập (!hideOuterCard) hoặc hiện widget điểm khi bọc trong MovieReviewsContainer */}
      {!hideOuterCard ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-5 sm:pb-6 border-b border-white/[0.08]">
          <div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <span>Đánh Giá &amp; Bình Luận Cộng Đồng</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                {sortedComments.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 sm:line-clamp-none">
              Cùng trao đổi, chấm điểm và thảo luận về các tình tiết trong &quot;{movieTitle}&quot;.
            </p>
          </div>

          {/* Aggregate Score Card */}
          {stats.totalReviews > 0 && (
            <div className="flex items-center gap-3 sm:gap-4 bg-zinc-900/90 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shrink-0 self-start sm:self-auto">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                  <span>{stats.averageRating}</span>
                  <span className="text-sm font-normal text-zinc-400">/5</span>
                </div>
                <div className="text-[10px] text-zinc-500">
                  {stats.totalReviews} lượt đánh giá
                </div>
              </div>
              <div className="h-8 w-[1px] bg-white/10" />
              <div className="flex flex-col gap-0.5">
                <StarRating value={Math.round(stats.averageRating)} readOnly size="sm" />
                <span className="text-[11px] text-zinc-400 font-medium">
                  {stats.averageRating >= 4.5
                    ? "Tuyệt tác được yêu thích"
                    : stats.averageRating >= 3.5
                      ? "Đánh giá tích cực"
                      : "Đánh giá hỗn hợp"}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : stats.totalReviews > 0 ? (
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-300">Tổng quan đánh giá:</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
              {sortedComments.length} bình luận
            </span>
          </div>

          <div className="flex items-center gap-2.5 bg-zinc-900/80 rounded-xl px-3 py-1.5 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-base font-black text-amber-400">{stats.averageRating}</span>
              <span className="text-xs text-zinc-400">/5</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10" />
            <StarRating value={Math.round(stats.averageRating)} readOnly size="sm" />
            <span className="text-[11px] text-zinc-400 hidden min-[380px]:inline">
              ({stats.totalReviews} lượt)
            </span>
          </div>
        </div>
      ) : null}

      {/* Main Review Form */}
      <div className="mt-6">
        {user ? (
          <CommentReviewForm
            formRef={formRef}
            rating={rating}
            setRating={setRating}
            content={content}
            setContent={setContent}
            isSpoiler={isSpoiler}
            setIsSpoiler={setIsSpoiler}
            scopeEpisode={scopeEpisode}
            setScopeEpisode={setScopeEpisode}
            currentEpisodeName={currentEpisodeName}
            isSubmitting={isSubmitting}
            myExistingReview={myExistingReview}
            effectiveAvatar={effectiveAvatar}
            effectiveDisplayName={effectiveDisplayName}
            onSubmit={handleSubmit}
            onDeleteReview={handleDeleteComment}
          />
        ) : (
          /* Login Banner */
          <div className="relative overflow-hidden bg-zinc-900/60 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left w-full sm:w-auto">
              <LogIn className="w-6 h-6 text-netflix-red shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm sm:text-base">
                  Đăng nhập để bình luận và chấm điểm phim
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 sm:line-clamp-none">
                  Đăng nhập bằng Google để gửi đánh giá và thảo luận về bộ phim.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-black hover:bg-zinc-200 transition-all active:scale-95 shrink-0 shadow-lg w-full sm:w-auto justify-center cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-red-600" />
              <span>Đăng nhập</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Comments List */}
      <div className="mt-8">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            <span className="text-xs text-zinc-400">Đang tải bình luận...</span>
          </div>
        ) : loadError ? (
          <div className="py-8 text-center bg-zinc-900/40 rounded-2xl p-4 text-xs text-zinc-400">
            <p className="font-semibold text-rose-400 mb-1">Không thể tải danh sách bình luận</p>
            <p className="text-zinc-500">Vui lòng thử lại sau.</p>
          </div>
        ) : sortedComments.length > 0 ? (
          <>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08] flex-wrap gap-y-2">
              <div className="text-sm font-semibold text-zinc-300 font-sans tabular-nums">
                Tất cả bình luận ({sortedComments.length})
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 bg-black/40 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setSortBy("newest")}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${sortBy === "newest"
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  Mới nhất
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("topLikes")}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${sortBy === "topLikes"
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="hidden sm:inline">Nhiều thích nhất</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy("onlyFiveStar")}
                  className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${sortBy === "onlyFiveStar"
                    ? "bg-zinc-800 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                    }`}
                >
                  <span>5 sao</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                </button>
              </div>
            </div>

            {/* Comments Feed */}
            <div className="mt-4 divide-y divide-white/[0.08]">
              {sortedComments.slice(0, visibleCommentsCount).map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.uid}
                  currentUserName={effectiveDisplayName}
                  currentUserAvatar={effectiveAvatar || undefined}
                  currentUserEmail={user?.email || undefined}
                  onReact={handleReact}
                  onDelete={handleDeleteComment}
                  onEdit={handleEditReview}
                  onTogglePin={handleTogglePinComment}
                  onRequireAuth={() => setShowAuthModal(true)}
                  highlightCommentId={highlightId}
                  targetReplyId={targetParentId === comment.id ? highlightId : undefined}
                />
              ))}
            </div>

            {/* Nút Xem thêm bình luận (Lazy Load) */}
            {sortedComments.length > visibleCommentsCount && (
              <div className="pt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCommentsCount((prev) => prev + 10)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-xs sm:text-sm font-semibold text-white transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <span>
                    Xem thêm {Math.min(10, sortedComments.length - visibleCommentsCount)} bình luận
                  </span>
                  <span className="text-xs text-zinc-400 font-sans tabular-nums">
                    ({visibleCommentsCount} / {sortedComments.length})
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State khi chưa có bình luận nào: Tinh gọn, không lặp tiêu đề thừa */
          <div className="py-12 px-4 text-center rounded-2xl bg-zinc-900/30">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <MessageSquare className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="font-semibold text-zinc-200 text-sm sm:text-base">
              Chưa có bình luận nào cho bộ phim này
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              Hãy là người đầu tiên để lại cảm nghĩ và chấm điểm cho{" "}
              <span className="text-zinc-200 font-semibold inline-block">
                &ldquo;{movieTitle}&rdquo;
              </span>!
            </p>
          </div>
        )}
      </div>

      {/* Auth Modal Trigger */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </section>
  );
};

export const MovieCommentsSection: React.FC<MovieCommentsSectionProps> = (props) => {
  return (
    <React.Suspense fallback={null}>
      <MovieCommentsSectionContent {...props} />
    </React.Suspense>
  );
};
