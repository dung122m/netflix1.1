"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { MovieComment } from "@/types/comment";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserCommentsList } from "@/components/MovieReviews/UserCommentsList";
import { formatCommentDate } from "./myListFormatters";

interface MyListCommentsTabProps {
  userComments: MovieComment[];
  moviePosterMap: Record<string, string>;
  deletingCommentId: string | null;
  onDeleteComment: (commentId: string, movieSlug?: string) => void;
}

export function MyListCommentsTab({
  userComments,
  moviePosterMap,
  deletingCommentId,
  onDeleteComment,
}: MyListCommentsTabProps) {
  if (userComments.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquare className="h-9 w-9 text-netflix-red" />}
        title="Bạn chưa viết bình luận nào"
        description="Mỗi đánh giá và nhận xét của bạn giúp cộng đồng Nanaflix tìm được bộ phim hay nhất!"
        action={
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-netflix-red px-6 py-3 text-sm sm:text-base font-bold text-white transition hover:brightness-110 shadow-lg"
          >
            Xem phim & Đánh giá ngay
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-b from-zinc-900/40 to-transparent p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-base font-bold text-white">
          Tất cả nhận xét & đánh giá ({userComments.length})
        </h3>
      </div>

      <UserCommentsList
        comments={userComments}
        moviePosterMap={moviePosterMap}
        deletingCommentId={deletingCommentId}
        onDeleteComment={(commentId, movieSlug) => onDeleteComment(commentId, movieSlug)}
        layout="grid"
        formatDate={formatCommentDate}
      />
    </div>
  );
}

