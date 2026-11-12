"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MessageSquare,
  Film,
  Play,
  ExternalLink,
  Star,
  Clock,
  Heart,
  Loader2,
  Trash2,
} from "lucide-react";
import { MovieComment } from "@/types/comment";
import { toOptimizedCardPosterUrl, toFastCdnImageUrl } from "@/lib/movieMedia";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState } from "@/components/ui/EmptyState";
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
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-netflix-red" />
          <span>Tất cả nhận xét & đánh giá ({userComments.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {userComments.map((c) => {
          const poster = moviePosterMap[c.movieSlug];
          const movieTitle = c.movieTitle || c.movieSlug.replace(/-/g, " ");

          return (
            <div
              key={c.id}
              className="group relative flex flex-col sm:flex-row gap-3.5 sm:gap-4 p-4 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 hover:from-zinc-900 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-black/70 overflow-hidden"
            >
              {/* POSTER THUMBNAIL */}
              <Link
                href={`/movies/${c.movieSlug}`}
                className="relative w-full sm:w-20 md:w-24 h-36 sm:h-auto sm:aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800/80 shrink-0 group-hover:scale-[1.02] transition-transform duration-300 shadow-md block"
              >
                {poster ? (
                  <Image
                    src={toFastCdnImageUrl(toOptimizedCardPosterUrl(poster, 200))}
                    alt={movieTitle}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 96px"
                    className="object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full min-h-[100px] flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-zinc-800 to-zinc-950">
                    <Film className="w-6 h-6 text-netflix-red/60 mb-1" />
                    <span className="text-[10px] text-zinc-400 font-bold line-clamp-2 leading-tight">
                      {movieTitle}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1.5">
                  <span className="text-[10px] font-bold text-white flex items-center gap-1">
                    <Play className="w-3 h-3 fill-white text-white" />
                    Xem phim
                  </span>
                </div>
              </Link>

              {/* CONTENT DETAILS */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  {/* HEADER: TITLE + RATING */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/movies/${c.movieSlug}#comments`}
                        className="text-sm sm:text-base font-extrabold text-white hover:text-netflix-red transition-colors inline-flex items-center gap-1.5 group/title truncate max-w-full"
                      >
                        <span className="truncate">{movieTitle}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover/title:text-netflix-red shrink-0" />
                      </Link>

                      {c.episodeName && (
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-netflix-red/15 text-netflix-red text-[11px] font-bold">
                            {c.episodeName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* STAR RATING */}
                    {c.rating > 0 && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 shrink-0">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={11}
                              className={
                                star <= c.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-zinc-700 text-zinc-700"
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs font-black text-amber-300 ml-0.5">
                          {c.rating}/5
                        </span>
                      </div>
                    )}
                  </div>

                  {/* REVIEW QUOTE BODY */}
                  <div className="relative mt-2.5 p-3 rounded-xl bg-white/[0.04]">
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed italic line-clamp-3 whitespace-pre-line">
                      {`"${c.content}"`}
                    </p>
                  </div>
                </div>

                {/* FOOTER: TIME + LIKES + ACTIONS */}
                <div className="flex items-center justify-between text-xs text-zinc-400 pt-2.5 mt-2 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <Tooltip content={new Date(c.createdAt).toLocaleString("vi-VN")} side="top">
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{formatCommentDate(c.createdAt)}</span>
                      </span>
                    </Tooltip>

                    {c.likes > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full">
                        <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                        <span>{c.likes}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/movies/${c.movieSlug}#comments`}
                      className="text-[11px] font-semibold text-zinc-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/5"
                    >
                      Chi tiết
                    </Link>
                    <button
                      type="button"
                      disabled={deletingCommentId === c.id}
                      onClick={() => onDeleteComment(c.id, c.movieSlug)}
                      className="flex items-center gap-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                    >
                      {deletingCommentId === c.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

