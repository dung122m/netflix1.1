"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MessageSquareQuote, Star, ExternalLink, User } from "lucide-react";
import type { TmdbReview } from "@/services/tmdbService";

interface TmdbAudienceReviewsProps {
  tmdbId?: string | number | null;
  tmdbType?: string | null;
}

export const TmdbAudienceReviews: React.FC<TmdbAudienceReviewsProps> = React.memo(
  function TmdbAudienceReviews({ tmdbId, tmdbType }) {
    const [reviews, setReviews] = useState<TmdbReview[]>([]);
    const [loading, setLoading] = useState(Boolean(tmdbId));

    useEffect(() => {
      if (!tmdbId || String(tmdbId) === "0") {
        setReviews([]);
        setLoading(false);
        return;
      }

      let isMounted = true;
      const cleanType = tmdbType === "tv" || tmdbType === "series" ? "tv" : "movie";
      const cacheKey = `nanaflix_tmdb_rev_${cleanType}_${tmdbId}`;

      // 1. Kiểm tra cache trong sessionStorage (0ms)
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setReviews(parsed);
            setLoading(false);
            return;
          }
        }
      } catch {}

      setLoading(true);

      // 2. Fetch ngầm không block trang chính
      fetch(`/api/movies/tmdb-reviews?tmdbId=${encodeURIComponent(tmdbId)}&type=${cleanType}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isMounted) return;
          const items: TmdbReview[] = data?.reviews || [];
          setReviews(items);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(items));
          } catch {}
        })
        .catch(() => {
          if (isMounted) setReviews([]);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }, [tmdbId, tmdbType]);

    // Không có review hoặc đang nạp -> không hiển thị gì để tránh layout shift
    if (loading || reviews.length === 0) {
      return null;
    }

    // Hiển thị 2-3 review tiêu biểu nhất
    const displayReviews = reviews.slice(0, 3);

    return (
      <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-400 shrink-0" />
            <span>Khán giả nói gì?</span>
            <span className="text-[11px] font-normal text-zinc-400">({reviews.length} đánh giá quốc tế)</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayReviews.map((rev) => {
            const formattedDate = (() => {
              try {
                return new Date(rev.created_at).toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
              } catch {
                return "";
              }
            })();

            return (
              <div
                key={rev.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-3 sm:p-3.5 transition flex flex-col justify-between overflow-hidden shadow-sm backdrop-blur-sm"
              >
                <div className="space-y-2">
                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {rev.author_avatar ? (
                          <Image
                            src={rev.author_avatar}
                            alt={rev.author}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <User className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-gray-200 truncate block">
                          {rev.author}
                        </span>
                        {formattedDate && (
                          <span className="text-[10px] text-zinc-500 block leading-tight">
                            {formattedDate}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating if available */}
                    {rev.rating !== null && rev.rating !== undefined && rev.rating > 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10.5px] font-extrabold shrink-0">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        <span>{rev.rating}/10</span>
                      </span>
                    )}
                  </div>

                  {/* Review Content Clamped */}
                  <p className="text-xs text-zinc-300/90 leading-relaxed line-clamp-3 break-words whitespace-pre-line">
                    {rev.content}
                  </p>
                </div>

                {/* View on TMDB Link */}
                {rev.url && (
                  <div className="pt-2 mt-2 border-t border-white/5 flex justify-end">
                    <a
                      href={rev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white transition"
                    >
                      <span>Xem toàn văn trên TMDB</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

export default TmdbAudienceReviews;
