"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  MessageSquareQuote,
  Star,
  ExternalLink,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { TmdbReview } from "@/services/tmdbService";

interface TmdbAudienceReviewsProps {
  tmdbId?: string | number | null;
  tmdbType?: string | null;
}

export const TmdbAudienceReviews: React.FC<TmdbAudienceReviewsProps> = React.memo(
  function TmdbAudienceReviews({ tmdbId, tmdbType }) {
    const [reviews, setReviews] = useState<TmdbReview[]>([]);
    const [loading, setLoading] = useState(Boolean(tmdbId));
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

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

    // Lấy đúng 5 đánh giá
    const displayReviews = reviews.slice(0, 5);

    const toggleExpand = (id: string) => {
      setExpandedIds((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    };

    return (
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <MessageSquareQuote className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Khán giả quốc tế nói gì?</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                  {displayReviews.length} đánh giá TMDB
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Góc nhìn và cảm nhận trực tiếp từ cộng đồng người xem thế giới trên The Movie Database.
              </p>
            </div>
          </div>
        </div>

        {/* Danh sách 5 review từ trên xuống dưới (Vertical Feed) */}
        <div className="flex flex-col gap-3.5">
          {displayReviews.map((rev) => {
            const isExpanded = Boolean(expandedIds[rev.id]);
            const isLong = (rev.content || "").length > 280;

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
                className="w-full rounded-2xl border border-white/10 bg-white/[0.025] hover:bg-white/[0.04] p-4 sm:p-5 transition flex flex-col justify-between overflow-hidden shadow-sm backdrop-blur-sm"
              >
                <div className="space-y-3">
                  {/* Author Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {rev.author_avatar ? (
                          <Image
                            src={rev.author_avatar}
                            alt={rev.author}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm sm:text-base font-bold text-gray-100 truncate">
                            {rev.author}
                          </span>
                          <span className="text-[10.5px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-400 font-medium">
                            Khán giả quốc tế
                          </span>
                        </div>
                        {formattedDate && (
                          <span className="text-xs text-zinc-500 block leading-tight mt-0.5">
                            Đăng ngày {formattedDate}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating if available */}
                    {rev.rating !== null && rev.rating !== undefined && rev.rating > 0 && (
                      <div className="self-start sm:self-center shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{rev.rating}/10</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Review Content */}
                  <p
                    className={`text-xs sm:text-sm text-zinc-300 leading-relaxed break-words whitespace-pre-line ${
                      isExpanded ? "" : "line-clamp-4"
                    }`}
                  >
                    {rev.content}
                  </p>
                </div>

                {/* Footer Bar: Expand Button & View on TMDB Link */}
                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-3 text-xs text-zinc-400">
                  {isLong ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(rev.id)}
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold transition cursor-pointer"
                    >
                      <span>{isExpanded ? "Thu gọn nội dung" : "Đọc toàn bộ đánh giá"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <span />
                  )}

                  {rev.url && (
                    <a
                      href={rev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-white transition ml-auto font-medium"
                    >
                      <span>Xem review gốc trên TMDB</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

export default TmdbAudienceReviews;
