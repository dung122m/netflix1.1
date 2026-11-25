"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare, Compass } from "lucide-react";
import { MovieComment } from "@/types/comment";
import { UserCommentsList } from "@/components/MovieReviews/UserCommentsList";

export interface ProfileCommentsTabProps {
  userComments: MovieComment[];
  moviePosterMap: Record<string, string>;
  deletingCommentId: string | null;
  handleDeleteComment: (commentId: string, movieSlug: string) => void;
}

export const ProfileCommentsTab: React.FC<ProfileCommentsTabProps> = React.memo(
  function ProfileCommentsTab({
    userComments,
    moviePosterMap,
    deletingCommentId,
    handleDeleteComment,
  }) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
          <h3 className="text-sm font-bold text-white">
            Nhận xét & Đánh giá của bạn ({userComments.length})
          </h3>
        </div>

        {userComments.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-white/[0.03] space-y-3">
            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto opacity-60" />
            <h4 className="text-base font-bold text-white">Bạn chưa đăng bình luận nào</h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Hãy ghé xem các bộ phim hot trên Nanaflix và để lại cảm nhận, đánh giá sao để lưu lại kỷ niệm xem phim nhé!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
            >
              <Compass className="w-3.5 h-3.5 text-zinc-300" />
              <span>Khám phá phim ngay</span>
            </Link>
          </div>
        ) : (
          <UserCommentsList
            comments={userComments}
            moviePosterMap={moviePosterMap}
            deletingCommentId={deletingCommentId}
            onDeleteComment={handleDeleteComment}
            layout="list"
          />
        )}
      </div>
    );
  }
);

