"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Play, X, Clock, Film } from "lucide-react";
import {
  getWatchHistory,
  removeWatchHistoryItem,
  autoHydrateWatchHistory,
  WatchHistoryItem,
} from "@/lib/watchHistory";
import { pickBestMovieThumb, toOptimizedPhimimgUrl } from "@/lib/movieMedia";
import { formatEpisodeName } from "@/lib/formatEpisode";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";

export const MAX_CONTINUE_WATCHING_DISPLAY = 15;

const continueWatchingThumbCache = new Map<string, string>();

export function isContinueWatchingItem(item: WatchHistoryItem): boolean {
  if (item.durationSeconds && item.durationSeconds > 0 && typeof item.progressSeconds === "number") {
    const percent = (item.progressSeconds / item.durationSeconds) * 100;
    return percent < 95;
  }
  return true;
}

interface ContinueWatchingCardProps {
  item: WatchHistoryItem;
  index?: number;
  onRemove: (e: React.MouseEvent, slug: string) => void;
}

function ContinueWatchingCard({ item, index = 0, onRemove }: ContinueWatchingCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(() => {
    if (item.slug && continueWatchingThumbCache.has(item.slug)) {
      return continueWatchingThumbCache.get(item.slug)!;
    }
    // 1. Ưu tiên tuyệt đối ảnh TMDb CDN siêu nhanh (30ms) nếu đã có sẵn trong item
    if (item.thumb && item.thumb.includes("image.tmdb.org")) {
      return item.thumb;
    }
    if (item.poster && item.poster.includes("image.tmdb.org")) {
      return item.poster;
    }
    // 2. Nếu có ảnh khác (phimimg), bọc qua toOptimizedPhimimgUrl để nạp bản WebP 20KB thay vì ảnh gốc JPEG 3MB
    const best = pickBestMovieThumb({ poster_url: item.poster, thumb_url: item.thumb }, "");
    if (best && !best.includes("/default-")) {
      return toOptimizedPhimimgUrl(best, 320);
    }
    if (item.poster && !item.poster.includes("/default-")) {
      return toOptimizedPhimimgUrl(item.poster, 320);
    }
    return "";
  });
  const fallbackTriedRef = useRef(false);

  useEffect(() => {
    // Nếu ảnh hiện tại chưa phải là TMDb CDN siêu tốc (hoặc đang rỗng), tự động truy vấn TMDb để nâng cấp ảnh
    const isFastTmdb = imgSrc.includes("image.tmdb.org");
    if (!isFastTmdb && !fallbackTriedRef.current) {
      fallbackTriedRef.current = true;
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      if (item.slug) params.set("slug", item.slug);
      if (item.year) params.set("year", String(item.year));

      fetch(`/api/movie-poster-fallback?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = data?.backdropUrl || data?.posterUrl;
          if (resolved) {
            continueWatchingThumbCache.set(item.slug, resolved);
            setImgSrc(resolved);
            // Ghi đè vĩnh viễn ảnh TMDb CDN vào LocalStorage để lần sau vào lại trang load 0ms!
            if (typeof window !== "undefined") {
              try {
                const list = getWatchHistory();
                const target = list.find((i) => i.slug === item.slug);
                if (target) {
                  target.thumb = resolved;
                  if (!target.poster || target.poster.includes("phimimg.com") || target.poster.includes("default-")) {
                    target.poster = data?.posterUrl || resolved;
                  }
                  localStorage.setItem("nanaflix_watch_history", JSON.stringify(list));
                }
              } catch {}
            }
          }
        })
        .catch(() => {});
    }
  }, [imgSrc, item.title, item.slug, item.year]);

  const handleImgError = useCallback(() => {
    if (!fallbackTriedRef.current) {
      fallbackTriedRef.current = true;
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      if (item.slug) params.set("slug", item.slug);
      if (item.year) params.set("year", String(item.year));

      fetch(`/api/movie-poster-fallback?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = data?.backdropUrl || data?.posterUrl;
          if (resolved) {
            continueWatchingThumbCache.set(item.slug, resolved);
            setImgSrc(resolved);
            if (typeof window !== "undefined") {
              try {
                const list = getWatchHistory();
                const target = list.find((i) => i.slug === item.slug);
                if (target) {
                  target.thumb = resolved;
                  if (!target.poster || target.poster.includes("phimimg.com") || target.poster.includes("default-")) {
                    target.poster = data?.posterUrl || resolved;
                  }
                  localStorage.setItem("nanaflix_watch_history", JSON.stringify(list));
                }
              } catch {}
            }
          } else {
            setImgSrc("");
          }
        })
        .catch(() => {
          setImgSrc("");
        });
    } else {
      setImgSrc("");
    }
  }, [item.title, item.slug, item.year]);

  const href = item.episodeSlug
    ? `/movies/${item.slug}?ep=${item.episodeSlug}`
    : `/movies/${item.slug}`;

  const progressPercent =
    item.durationSeconds && item.durationSeconds > 0 && typeof item.progressSeconds === "number"
      ? Math.min(100, Math.max(0, Math.round((item.progressSeconds / item.durationSeconds) * 100)))
      : 0;

  return (
    <div
      className="group relative flex-none w-[190px] sm:w-[240px] md:w-[270px] bg-zinc-950 rounded-xl overflow-hidden border border-white/10 hover:border-white/25 transition-all duration-300 hover:scale-[1.03] shadow-md hover:shadow-xl transform-gpu will-change-transform"
    >
      <Link href={href} className="block">
        {/* ẢNH THUMBNAIL (16:9, ưu tiên thumb ngang / TMDb backdrop) */}
        <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
          {imgSrc && !imgSrc.includes("/default-") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgSrc}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              decoding="async"
              loading={index < 4 ? "eager" : "lazy"}
              onError={handleImgError}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-rose-950/25 to-zinc-950 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(229,9,20,0.22),transparent_70%)]" />
              <Film className="w-7 h-7 text-rose-500/60 mb-1.5 relative z-10 animate-pulse" />
              <span className="text-[11px] font-bold text-zinc-300 line-clamp-2 max-w-[90%] relative z-10 leading-tight">
                {item.title}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

          {/* NÚT PLAY Ở GIỮA */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-netflix-red text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>

          {/* THANH TIẾN ĐỘ THỰC TẾ ĐANG XEM DỞ */}
          <div className="absolute bottom-0 left-0 right-0 h-[3.5px] bg-black/75 z-10 overflow-hidden">
            <div
              className="h-full bg-netflix-red rounded-r-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* NÚT XOÁ KHỎI TIẾP TỤC XEM */}
          <button
            type="button"
            onClick={(e) => onRemove(e, item.slug)}
            aria-label="Xoá khỏi danh sách tiếp tục xem"
            className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-zinc-300 hover:text-white hover:bg-black/90 backdrop-blur-sm transition z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* THÔNG TIN PHIM */}
        <div className="p-2.5 sm:p-3 bg-zinc-950 relative z-10 -mt-[1px]">
          <h3 className="text-white text-xs sm:text-[13px] font-semibold truncate group-hover:text-rose-400 transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 mt-1">
            <span className="text-rose-400 font-medium flex items-center gap-1 text-[10.5px] sm:text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>{item.episodeName ? formatEpisodeName(item.episodeName) : "Đang xem dở"}</span>
            </span>
            {item.quality && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold backdrop-blur-md border ${
                  item.quality.toUpperCase().includes("CAM")
                    ? "bg-amber-950/90 text-amber-300 border-amber-500/40"
                    : "bg-black/80 border-white/20 text-zinc-100"
                }`}
              >
                {item.quality}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

function ContinueWatchingRowInner() {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const checkScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      if (!rowRef.current) return;
      const el = rowRef.current;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const firstCard = el.querySelector<HTMLElement>(".group");
      const isAtStart =
        scrollLeft <= 8 ||
        (firstCard ? firstCard.getBoundingClientRect().left >= el.getBoundingClientRect().left - 2 : scrollLeft <= 8);
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 8;
      setCanScrollLeft(!isAtStart);
      setCanScrollRight(!isAtEnd);
    });
  }, []);

  useEffect(() => {
    setIsClient(true);
    const loadItems = () => {
      const historyItems = getWatchHistory().filter(isContinueWatchingItem);
      setItems(historyItems);
    };
    loadItems();

    // Chạy bù đắp metadata ngầm sau khi trang đã render mượt mà (1.5s delay), không block tải trang
    const timer = setTimeout(() => {
      autoHydrateWatchHistory().catch(() => {});
    }, 1500);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "nanaflix_watch_history") {
        loadItems();
      }
    };
    const handleCustomSync = () => {
      loadItems();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("watch-history-updated", handleCustomSync);
    window.addEventListener("watchHistoryUpdated", handleCustomSync);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("watch-history-updated", handleCustomSync);
      window.removeEventListener("watchHistoryUpdated", handleCustomSync);
    };
  }, []);

  useEffect(() => {
    if (!isClient) return;
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => {
      window.removeEventListener("resize", checkScroll);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [items, isClient, checkScroll]);

  if (!isClient || items.length === 0) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const { clientWidth } = rowRef.current;
    const scrollAmount = direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
    rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    setTimeout(checkScroll, 150);
    setTimeout(checkScroll, 400);
  };

  const handleRemove = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeWatchHistoryItem(slug);
  };

  return (
    <section className="relative z-10 w-full select-none">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-netflix-red" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
            Tiếp tục xem
          </h2>
        </div>
        <Link
          href="/my-list?tab=history"
          className="text-xs sm:text-sm text-zinc-400 hover:text-white transition font-medium"
        >
          Xem tất cả ({items.length})
        </Link>
      </div>

      {/* KHUNG CAROUSEL CÓ NÚT ĐIỀU HƯỚNG TRÁI/PHẢI CHUẨN NETFLIX */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI / PHẢI: FLOATING GLASS CHUẨN ĐỒNG BỘ */}
        <CarouselNavButton
          direction="left"
          onClick={() => handleScroll("left")}
          visible={canScrollLeft}
          ariaLabel="Cuộn danh sách đang xem sang trái"
          topOffsetClass="top-[50%]"
        />

        <CarouselNavButton
          direction="right"
          onClick={() => handleScroll("right")}
          visible={canScrollRight}
          ariaLabel="Cuộn danh sách đang xem sang phải"
          topOffsetClass="top-[50%]"
        />

        {/* MOBILE SUBTLE GRADIENT FADE AFFORDANCE */}
        {canScrollLeft && (
          <div
            className="sm:hidden absolute left-0 top-3 bottom-3 w-6 bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none z-20 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}
        {canScrollRight && (
          <div
            className="sm:hidden absolute right-0 top-3 bottom-3 w-8 bg-gradient-to-l from-black via-black/60 to-transparent pointer-events-none z-20 transition-opacity duration-200"
            aria-hidden="true"
          />
        )}

        {/* DANH SÁCH THẺ PHIM ĐÃ XEM */}
        <div
          ref={rowRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto px-3 sm:px-4 scroll-pl-3 sm:scroll-pl-4 py-3 sm:py-3.5 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.slice(0, MAX_CONTINUE_WATCHING_DISPLAY).map((item, idx) => (
            <ContinueWatchingCard key={item.slug} item={item} index={idx} onRemove={handleRemove} />
          ))}
        </div>
      </div>
    </section>
  );
}

export const ContinueWatchingRow = React.memo(ContinueWatchingRowInner);
export default ContinueWatchingRow;
