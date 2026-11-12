"use client";

import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import {
  MessageSquare,
  Compass,
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
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>Nhận xét & Đánh giá của bạn ({userComments.length})</span>
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
          <div className="space-y-4 max-h-[70dvh] overflow-y-auto pr-1">
            {userComments.map((c) => {
              const poster = moviePosterMap[c.movieSlug];
              const movieTitle = c.movieTitle || c.movieSlug.replace(/-/g, " ");

              return (
                <div
                  key={c.id}
                  className="group relative flex flex-col sm:flex-row gap-3.5 sm:gap-4 p-4 rounded-2xl bg-zinc-900/75 hover:bg-zinc-900 transition-colors duration-200 shadow-lg overflow-hidden"
                >
                  {/* POSTER THUMBNAIL */}
                  <Link
                    href={`/movies/${c.movieSlug}`}
                    className="relative w-full sm:w-20 md:w-24 h-36 sm:h-auto sm:aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800/80 shrink-0 group-hover:scale-[1.02] transition-transform duration-300 shadow-md block"
                  >
                    {poster ? (
                      <NextImage
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
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-2.5 mt-2 border-t border-white/[0.08]">
                      <div className="flex items-center gap-3">
                        <Tooltip content={new Date(c.createdAt).toLocaleString("vi-VN")}>
                          <span className="flex items-center gap-1 text-[11px] text-zinc-400 tabular-nums">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>{new Date(c.createdAt).toLocaleDateString("vi-VN")}</span>
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
                          onClick={() => handleDeleteComment(c.id, c.movieSlug)}
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
        )}
      </div>
    );
  }
);

