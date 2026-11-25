"use client";

import React from "react";
import Link from "next/link";
import {
  Play,
  ExternalLink,
  Star,
  Clock,
  Heart,
  Loader2,
  Trash2,
} from "lucide-react";
import { MovieComment } from "@/types/comment";
import { MoviePosterImage } from "@/components/ui/MoviePosterImage";
import { Tooltip } from "@/components/ui/Tooltip";

export interface UserCommentsListProps {
  comments: MovieComment[];
  moviePosterMap: Record<string, string>;
  deletingCommentId: string | null;
  onDeleteComment: (commentId: string, movieSlug: string) => void;
  layout?: "list" | "grid";
  formatDate?: (timestamp: number) => string;
}

export const UserCommentsList: React.FC<UserCommentsListProps> = React.memo(
  function UserCommentsList({
    comments,
    moviePosterMap,
    deletingCommentId,
    onDeleteComment,
    layout = "list",
    formatDate = (ts: number) => new Date(ts).toLocaleDateString("vi-VN"),
  }) {
    const [visibleCount, setVisibleCount] = React.useState(8);

    const isGrid = layout === "grid";

    return (
      <>
        <div
          className={
            isGrid
              ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
              : "space-y-4 max-h-[70dvh] overflow-y-auto pr-1"
          }
        >
          {comments.slice(0, visibleCount).map((c) => {
            const poster = moviePosterMap[c.movieSlug];
            const movieTitle = c.movieTitle || c.movieSlug.replace(/-/g, " ");

            return (
              <div
                key={c.id}
                className={
                  isGrid
                    ? "group relative flex flex-col sm:flex-row gap-3.5 sm:gap-4 p-4 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 hover:from-zinc-900 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-black/70 overflow-hidden"
                    : "group relative flex flex-col sm:flex-row gap-3.5 sm:gap-4 p-4 rounded-2xl bg-zinc-900/75 hover:bg-zinc-900 transition-colors duration-200 shadow-lg overflow-hidden"
                }
              >
                <Link
                  href={`/movies/${c.movieSlug}`}
                  prefetch={false}
                  className="relative w-full sm:w-20 md:w-24 h-36 sm:h-auto sm:aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800/80 shrink-0 group-hover:scale-[1.02] transition-transform duration-300 shadow-md block"
                >
                  <MoviePosterImage
                    src={poster}
                    alt={movieTitle}
                    slug={c.movieSlug}
                    title={movieTitle}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 96px"
                    className="object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-1.5">
                    <span className="text-[10px] font-bold text-white flex items-center gap-1">
                      <Play className="w-3 h-3 fill-white text-white" />
                      Xem phim
                    </span>
                  </div>
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/movies/${c.movieSlug}#comments`}
                          prefetch={false}
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
                          <span className="text-xs font-black text-amber-300 ml-0.5 tabular-nums">
                            {c.rating}/5
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="relative mt-2.5 p-3 rounded-xl bg-white/[0.04]">
                      <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed italic line-clamp-3 whitespace-pre-line">
                        {`"${c.content}"`}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between text-xs text-zinc-400 pt-2.5 mt-2 border-t ${
                      isGrid ? "border-white/5" : "border-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Tooltip content={new Date(c.createdAt).toLocaleString("vi-VN")} side="top">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-400 tabular-nums">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{formatDate(c.createdAt)}</span>
                        </span>
                      </Tooltip>

                      {c.likes > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full tabular-nums">
                          <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                          <span>{c.likes}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/movies/${c.movieSlug}#comments`}
                        prefetch={false}
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

        {comments.length > visibleCount && (
          <div className={isGrid ? "pt-3 flex justify-center" : "pt-3 pb-2 flex justify-center"}>
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 8)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800/90 hover:bg-zinc-700/90 transition-all duration-200 cursor-pointer shadow-sm hover:shadow tabular-nums"
            >
              <span>Xem thêm nhận xét</span>
              <span className="text-zinc-500 font-normal">
                ({Math.min(visibleCount, comments.length)} / {comments.length})
              </span>
            </button>
          </div>
        )}
      </>
    );
  },
);
