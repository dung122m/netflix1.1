"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  MessageSquare,
  Sparkles,
  Send,
  AlertTriangle,
  LogIn,
  Loader2,
  CheckCircle2,
  Film,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/Toast";
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
import { checkContentModeration } from "@/lib/contentModeration";
import { subscribeUserProfile } from "@/services/userService";
import { UserProfile } from "@/types/user";
import { StarRating } from "./StarRating";
import { CommentItem } from "./CommentItem";

interface MovieCommentsSectionProps {
  movieSlug: string;
  movieTitle: string;
  currentEpisodeSlug?: string;
  currentEpisodeName?: string;
}

const QUICK_TAGS = [
  "🔥 Siêu phẩm đáng xem",
  "❤️ Xúc động rơi nước mắt",
  "🍿 Giải trí cuối tuần",
  "🤣 Hài hước đau bụng",
  "👏 Diễn xuất 10/10",
  "🤯 Plot twist bất ngờ",
];

const MovieCommentsSectionContent: React.FC<MovieCommentsSectionProps> = ({
  movieSlug,
  movieTitle,
  currentEpisodeSlug,
  currentEpisodeName,
}) => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [comments, setComments] = useState<MovieComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    const unsub = subscribeUserProfile(user.uid, (p) => {
      if (p) setUserProfile(p);
    });
    return () => unsub();
  }, [user?.uid]);

  const effectiveAvatar = userProfile?.customAvatar || userProfile?.photoURL || user?.photoURL || "";
  const effectiveDisplayName = userProfile?.displayName || user?.displayName || "Thành viên Nanaflix";

  // Lấy ID comment cần highlight từ query params (?highlightComment=xxx) hoặc URL hash (#comment-xxx)
  useEffect(() => {
    const paramHighlight = searchParams?.get("highlightComment");
    if (paramHighlight) {
      setHighlightId(paramHighlight);
      return;
    }
    if (typeof window !== "undefined" && window.location.hash.startsWith("#comment-")) {
      setHighlightId(window.location.hash.replace("#comment-", ""));
    }
  }, [searchParams]);

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
  const [rating, setRating] = useState<number>(5);
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
    setRating(5);
    setIsSpoiler(false);
    setScopeEpisode("all");
  }, [movieSlug]);

  // Subscribe to real-time comments from Supabase + LocalStorage
  useEffect(() => {
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
  }, [movieSlug]);

  // Tìm bài đánh giá đã có của chính người dùng hiện tại (chỉ tính đánh giá gốc của đúng movieSlug này, không tính reply)
  const myExistingReview = useMemo(() => {
    if (!user?.uid) return null;
    return comments.find((c) => !c.parentId && c.userId === user.uid && (!c.movieSlug || c.movieSlug === movieSlug)) || null;
  }, [comments, user?.uid, movieSlug]);

  // Tự động điền dữ liệu đánh giá cũ vào form khi tải xong
  useEffect(() => {
    if (myExistingReview && !hasInitializedForm) {
      setRating(myExistingReview.rating || 5);
      setContent(myExistingReview.content || "");
      setIsSpoiler(Boolean(myExistingReview.isSpoiler));
      if (myExistingReview.episodeSlug) {
        setScopeEpisode("episode");
      }
      setHasInitializedForm(true);
    } else if (!myExistingReview && hasInitializedForm) {
      setContent("");
      setRating(5);
      setIsSpoiler(false);
      setHasInitializedForm(false);
    }
  }, [myExistingReview, hasInitializedForm]);

  // Khi click nút sửa trên bài đánh giá ở danh sách bên dưới
  const handleEditReview = (item: MovieComment) => {
    setRating(item.rating || 5);
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
      }).catch(() => {});

      toast.error(
        modCheck.reason || "Bình luận chứa từ ngữ không phù hợp thuần phong mỹ tục. Hành vi cố ý spam sẽ bị khóa tài khoản!"
      );
      return;
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
          isSpoiler,
        };

        // 1. Optimistic update local state ngay lập tức
        setComments((prev) =>
          prev.map((c) =>
            c.id === myExistingReview.id
              ? {
                  ...c,
                  ...updatePayload,
                  updatedAt: Date.now(),
                }
              : c
          )
        );

        // 2. Ghi vào database Supabase
        await updateMovieComment(myExistingReview.id, updatePayload, movieSlug);
        toast.success("Đã cập nhật đánh giá của bạn thành công!");
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
          isSpoiler,
        });
        setComments((prev) => [
          {
            id: createdId,
            movieSlug,
            movieTitle: movieTitle || undefined,
            userId: user.uid,
            userName: user.displayName || "Thành viên Nanaflix",
            userAvatar: user.photoURL || undefined,
            userEmail: user.email || undefined,
            rating,
            content: trimmed,
            episodeSlug:
              scopeEpisode === "episode" && currentEpisodeSlug ? currentEpisodeSlug : undefined,
            episodeName:
              scopeEpisode === "episode" && currentEpisodeName ? currentEpisodeName : undefined,
            isSpoiler,
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
        toast.success("Đã đăng bình luận và đánh giá thành công!");
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
        return {
          ...c,
          likes: newLikes,
          likedBy: newLikedBy,
          reactions: updatedReactions,
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

    try {
      await deleteMovieComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.info("Đã xóa bình luận.");
    } catch (err) {
      console.error("Lỗi khi xóa bình luận:", err);
      toast.error("Không thể xóa bình luận!");
    }
  };

  const handleTogglePinComment = (commentId: string, isPinned: boolean) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, isPinned } : c))
    );
  };

  return (
    <section id="comments" className="mt-8 sm:mt-12 bg-zinc-950/80 rounded-2xl sm:rounded-3xl border border-white/5 p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-2xl">
      {/* Title & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-5 sm:pb-6 border-b border-white/10">
        <div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 flex-shrink-0" />
            <span>Đánh Giá &amp; Bình Luận Cộng Đồng</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              {sortedComments.length}
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 sm:line-clamp-none">
            Cùng trao đổi, chấm điểm và thảo luận về các tình tiết trong &quot;{movieTitle}&quot;.
          </p>
        </div>

        {/* Aggregate Score Card */}
        {stats.totalReviews > 0 && (
          <div className="flex items-center gap-3 sm:gap-4 bg-zinc-900/90 border border-white/10 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shrink-0 self-start sm:self-auto">
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

      {/* Main Review Form */}
      <div className="mt-6">
        {user ? (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="bg-zinc-900/50 border border-white/10 rounded-2xl p-4 md:p-6 transition-all focus-within:border-red-500/40"
          >
            {/* Existing Review Notice Banner */}
            {myExistingReview && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-4 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Bạn đã đánh giá bộ phim này ({myExistingReview.rating} sao). Bạn có thể chỉnh sửa nhận xét bên dưới và bấm Cập nhật.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteComment(myExistingReview.id)}
                  className="text-zinc-400 hover:text-red-400 transition underline underline-offset-2 shrink-0 cursor-pointer self-end sm:self-auto"
                >
                  Xóa đánh giá
                </button>
              </div>
            )}

            {/* User Header & Star Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {effectiveAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={effectiveAvatar}
                      alt={effectiveDisplayName}
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    (effectiveDisplayName || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-zinc-200 block leading-tight">
                    {effectiveDisplayName}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {myExistingReview ? "Cập nhật số sao bạn muốn chấm:" : "Chọn số sao bạn muốn chấm:"}
                  </span>
                </div>
              </div>

              {/* Star Rating Interactive */}
              <div className="bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 inline-flex items-center">
                <StarRating
                  value={rating}
                  onChange={setRating}
                  size="md"
                  showLabel
                />
              </div>
            </div>

            {/* Quick Emoji / Tag chips */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span className="text-[11px] text-zinc-500 mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Gợi ý nhanh:
              </span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setContent((prev) =>
                      prev ? `${prev} ${tag}` : tag,
                    )
                  }
                  className="px-2.5 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 hover:border-white/15 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ cảm nghĩ của bạn về bộ phim... (Vui lòng không tiết lộ trước nội dung 🤫)"
                rows={3}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 resize-y transition-all"
                maxLength={1000}
              />
              <div className="text-[11px] text-zinc-600 text-right mt-1">
                {content.length}/1000 ký tự
              </div>
            </div>

            {/* Options Row: Episode scope, Spoil toggle, Submit button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Episode scope toggle */}
                {currentEpisodeName && (
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-xs">
                    <button
                      type="button"
                      onClick={() => setScopeEpisode("all")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        scopeEpisode === "all"
                          ? "bg-zinc-800 text-white shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Cả bộ phim
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeEpisode("episode")}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                        scopeEpisode === "episode"
                          ? "bg-red-600/30 text-red-400 border border-red-500/30"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Film className="w-3 h-3" />
                      {currentEpisodeName}
                    </button>
                  </div>
                )}

                {/* Spoiler checkbox */}
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={isSpoiler}
                    onChange={(e) => setIsSpoiler(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Bình luận có Spoil nội dung
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0 ${
                  myExistingReview
                    ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-amber-900/30"
                    : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-red-900/30"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{myExistingReview ? "Đang lưu..." : "Đang gửi..."}</span>
                  </>
                ) : myExistingReview ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cập nhật Đánh Giá</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Gửi Đánh Giá</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Login Banner */
          <div className="relative overflow-hidden bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-red-950/30 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left w-full sm:w-auto">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm sm:text-base">
                  Đăng nhập để bình luận và chấm điểm phim
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2 sm:line-clamp-none">
                  Đăng nhập nhanh 1 chạm bằng Google để chia sẻ cảm nghĩ cùng hàng ngàn khán giả khác.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-black hover:bg-zinc-200 transition-all active:scale-95 shrink-0 shadow-lg w-full sm:w-auto justify-center"
            >
              <LogIn className="w-4 h-4 text-red-600" />
              <span>Đăng nhập ngay</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Comments List */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 flex-wrap gap-y-2">
          <div className="text-sm font-semibold text-zinc-300">
            Tất cả bình luận ({sortedComments.length})
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
            <button
              type="button"
              onClick={() => setSortBy("newest")}
              className={`px-2 sm:px-3 py-1 rounded-lg font-medium transition-colors ${
                sortBy === "newest"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mới nhất
            </button>
            <button
              type="button"
              onClick={() => setSortBy("topLikes")}
              className={`px-2 sm:px-3 py-1 rounded-lg font-medium transition-colors ${
                sortBy === "topLikes"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="hidden sm:inline">Nhiều thích nhất </span>&#128293;
            </button>
            <button
              type="button"
              onClick={() => setSortBy("onlyFiveStar")}
              className={`px-2 sm:px-3 py-1 rounded-lg font-medium transition-colors ${
                sortBy === "onlyFiveStar"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              5 sao ⭐
            </button>
          </div>
        </div>

        {/* Comments Feed */}
        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-red-500" />
              <span className="text-xs">Đang tải bình luận cộng đồng...</span>
            </div>
          ) : loadError ? (
            <div className="py-8 text-center bg-red-950/20 border border-red-500/30 rounded-2xl p-4 text-xs text-red-400">
              <p className="font-semibold mb-1">Không thể tải bình luận máy chủ:</p>
              <p className="text-zinc-400">{loadError}</p>
            </div>
          ) : sortedComments.length > 0 ? (
            sortedComments.map((comment) => (
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
            ))
          ) : (
            <div className="py-12 text-center bg-zinc-900/30 rounded-2xl border border-dashed border-white/10 p-6">
              <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <div className="font-semibold text-zinc-300 text-sm">
                Chưa có bình luận nào cho bộ phim này
              </div>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Hãy là người đầu tiên để lại cảm nghĩ và chấm điểm cho &quot;{movieTitle}&quot;!
              </p>
            </div>
          )}
        </div>
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
