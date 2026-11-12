"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { subscribeUserComments, deleteMovieComment } from "@/services/commentService";
import { MovieComment } from "@/types/comment";
import { getWatchlist, WatchlistItem } from "@/lib/watchlist";
import { getWatchHistory, WatchHistoryItem } from "@/lib/watchHistory";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";

const EMPTY_COMMENTS: MovieComment[] = [];

interface UseUserMovieCommentsOptions {
  userId?: string | null;
  watchlist?: WatchlistItem[];
  history?: WatchHistoryItem[];
}

export function useUserMovieComments({
  userId,
  watchlist,
  history,
}: UseUserMovieCommentsOptions) {
  const [rawComments, setRawComments] = useState<MovieComment[]>([]);
  const [moviePosterMap, setMoviePosterMap] = useState<Record<string, string>>({});
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const fetchedSlugsRef = useRef<Set<string>>(new Set());

  const userComments = userId ? rawComments : EMPTY_COMMENTS;

  // Lắng nghe bình luận của người dùng theo thời gian thực
  useEffect(() => {
    if (!userId) return;

    const unsub = subscribeUserComments(userId, (items) => {
      setRawComments(items);
    });

    return () => unsub();
  }, [userId]);

  // Đồng bộ hóa danh mục ảnh bìa từ Watchlist và Lịch sử xem
  useEffect(() => {
    try {
      const wl = watchlist ?? getWatchlist();
      const hi = history ?? getWatchHistory();
      const map: Record<string, string> = {};
      for (const item of wl) {
        const poster = item.poster || item.imageUrl;
        if (poster && item.slug) map[item.slug] = poster;
      }
      for (const item of hi) {
        const poster = item.poster || item.thumb;
        if (poster && item.slug) map[item.slug] = poster;
      }
      if (Object.keys(map).length > 0) {
        setMoviePosterMap((prev) => ({ ...map, ...prev }));
      }
    } catch {}
  }, [watchlist, history]);

  // Tự động tải ảnh bìa cho các bình luận chưa có poster
  useEffect(() => {
    if (userComments.length === 0) return;
    const missingSlugs = userComments
      .map((c) => c.movieSlug)
      .filter((slug) => slug && !moviePosterMap[slug] && !fetchedSlugsRef.current.has(slug));

    if (missingSlugs.length === 0) return;
    const uniqueSlugs = Array.from(new Set(missingSlugs)).slice(0, 20);
    uniqueSlugs.forEach((s) => fetchedSlugsRef.current.add(s));

    fetch(`/api/movies/meta?slugs=${encodeURIComponent(uniqueSlugs.join(","))}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.movies) {
          setMoviePosterMap((prev) => {
            const updated = { ...prev };
            for (const [s, meta] of Object.entries(data.movies)) {
              const m = meta as { poster?: string; thumb?: string };
              if (m.poster || m.thumb) {
                updated[s] = m.poster || m.thumb || "";
              }
            }
            return updated;
          });
        }
      })
      .catch(() => {});
  }, [userComments, moviePosterMap]);

  const handleDeleteComment = useCallback(
    async (commentId: string, movieSlug?: string) => {
      const confirmed = await showConfirmDialog({
        title: "Xóa bình luận",
        message: "Bạn có chắc chắn muốn xóa nhận xét này? Bình luận sẽ bị gỡ vĩnh viễn khỏi bộ phim.",
        confirmText: "Xóa bình luận",
        cancelText: "Giữ lại",
        variant: "danger",
      });

      if (!confirmed) return;

      // Cập nhật giao diện 0ms tức thì, sẵn sàng khôi phục nếu máy chủ gặp sự cố
      const previous = rawComments;
      setRawComments((prev) => prev.filter((c) => c.id !== commentId));
      setDeletingCommentId(commentId);

      try {
        await deleteMovieComment(commentId, { movieSlug, userId: userId ?? undefined });
        toast.success("Đã xóa bình luận thành công!");
      } catch (err: unknown) {
        console.error("Lỗi xóa bình luận:", err);
        setRawComments(previous);
        const msg = err instanceof Error ? err.message : "Không thể xóa bình luận lúc này!";
        toast.error(msg);
      } finally {
        setDeletingCommentId(null);
      }
    },
    [rawComments, userId]
  );

  return {
    userComments,
    moviePosterMap,
    deletingCommentId,
    handleDeleteComment,
  };
}

