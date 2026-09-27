"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  MessageSquareQuote,
  Star,
  ExternalLink,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

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

    const checkScroll = () => {
      const el = scrollRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    useEffect(() => {
      checkScroll();
      const el = scrollRef.current;
      if (el) {
        el.addEventListener("scroll", checkScroll, { passive: true });
        window.addEventListener("resize", checkScroll);
        return () => {
          el.removeEventListener("scroll", checkScroll);
          window.removeEventListener("resize", checkScroll);
        };
      }
    }, [reviews]);

    const handleScroll = (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;
      const scrollAmount = direction === "left" ? -400 : 400;
      el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    // Không có review hoặc đang nạp -> không hiển thị gì để tránh layout shift
    if (loading || reviews.length === 0) {
      return null;
    }

    const toggleExpand = (id: string) => {
      setExpandedIds((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    };

    return (
      <div className="space-y-4">
        {/* Header Bar with Title & Navigation Arrows */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <MessageSquareQuote className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Khán giả quốc tế nói gì?</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                  {reviews.length} đánh giá
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Góc nhìn và cảm nhận trực tiếp từ cộng đồng người xem thế giới trên TMDB.
              </p>
            </div>
          </div>

          {/* Prev/Next Buttons (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              className={`p-2 rounded-xl border border-white/10 transition ${
                canScrollLeft
                  ? "bg-white/5 hover:bg-white/15 text-white cursor-pointer"
                  : "bg-white/[0.02] text-zinc-600 cursor-not-allowed opacity-50"
              }`}
              aria-label="Cuộn sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              className={`p-2 rounded-xl border border-white/10 transition ${
                canScrollRight
                  ? "bg-white/5 hover:bg-white/15 text-white cursor-pointer"
                  : "bg-white/[0.02] text-zinc-600 cursor-not-allowed opacity-50"
              }`}
              aria-label="Cuộn sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1-Row Horizontal Slider Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {reviews.map((rev) => {
            const isExpanded = Boolean(expandedIds[rev.id]);
            const isLong = (rev.content || "").length > 220;

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
                className="w-[300px] sm:w-[380px] shrink-0 snap-start rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] p-4 transition flex flex-col justify-between overflow-hidden shadow-sm backdrop-blur-sm group"
              >
                <div className="space-y-3">
                  {/* Author Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-8 h-8 rounded-full bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {rev.author_avatar ? (
                          <Image
                            src={rev.author_avatar}
                            alt={rev.author}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-gray-200 truncate block">
                          {rev.author}
                        </span>
                        {formattedDate && (
                          <span className="text-[11px] text-zinc-500 block leading-tight">
                            {formattedDate}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating if available */}
                    {rev.rating !== null && rev.rating !== undefined && rev.rating > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black shrink-0">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{rev.rating}/10</span>
                      </span>
                    )}
                  </div>

                  {/* Review Content */}
                  <p
                    className={`text-xs sm:text-sm text-zinc-300/90 leading-relaxed break-words whitespace-pre-line ${
                      isExpanded ? "" : "line-clamp-4"
                    }`}
                  >
                    {rev.content}
                  </p>
                </div>

                {/* Footer Bar: Expand Button & View on TMDB Link */}
                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2 text-xs text-zinc-400">
                  {isLong ? (
                    <button
                      type="button"
                      onClick={() => toggleExpand(rev.id)}
                      className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold transition cursor-pointer"
                    >
                      <span>{isExpanded ? "Thu gọn" : "Đọc tiếp"}</span>
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
                      className="inline-flex items-center gap-1 hover:text-white transition ml-auto font-medium"
                    >
                      <span>Xem trên TMDB</span>
                      <ExternalLink className="w-3 h-3" />
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
