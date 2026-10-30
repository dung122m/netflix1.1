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
import {
  pickBestMoviePoster,
  pickBestMovieThumb,
  toOptimizedCardPosterUrl,
} from "@/lib/movieMedia";
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

function getInitialPoster(item: WatchHistoryItem): string {
  if (item.slug && continueWatchingThumbCache.has(item.slug)) {
    return continueWatchingThumbCache.get(item.slug)!;
  }
  // 1. Ưu tiên TMDb poster CDN nếu đã có sẵn
  if (item.poster && item.poster.includes("image.tmdb.org")) {
    return toOptimizedCardPosterUrl(item.poster);
  }
  if (item.thumb && item.thumb.includes("image.tmdb.org")) {
    return toOptimizedCardPosterUrl(item.thumb);
  }
  // 2. Chọn poster dọc tối ưu nhất trực tiếp từ CDN (không bọc proxy /api/img-thumb)
  const bestPoster = pickBestMoviePoster({ poster_url: item.poster, thumb_url: item.thumb }, "");
  if (bestPoster && !bestPoster.includes("/default-")) {
    return toOptimizedCardPosterUrl(bestPoster);
  }
  // 3. Dự phòng thumb ngang nếu chưa có poster
  const bestThumb = pickBestMovieThumb({ poster_url: item.poster, thumb_url: item.thumb }, "");
  if (bestThumb && !bestThumb.includes("/default-")) {
    return toOptimizedCardPosterUrl(bestThumb);
  }
  return "";
}

function ContinueWatchingCard({ item, index = 0, onRemove }: ContinueWatchingCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(() => getInitialPoster(item));
  const [isLoaded, setIsLoaded] = useState(false);
  const fallbackTriedRef = useRef(false);

  // Tự động nâng cấp ảnh lên TMDb CDN siêu nhanh (30ms) nếu ảnh hiện tại là nguồn ngoài (phimimg) hoặc rỗng
  useEffect(() => {
    const isFastTmdb = imgSrc && imgSrc.includes("image.tmdb.org");
    if (!isFastTmdb && !fallbackTriedRef.current) {
      fallbackTriedRef.current = true;
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      if (item.slug) params.set("slug", item.slug);
      if (item.year) params.set("year", String(item.year));

      fetch(`/api/movie-poster-fallback?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = data?.posterUrl || data?.backdropUrl;
          if (resolved) {
            const opt = toOptimizedCardPosterUrl(resolved);
            continueWatchingThumbCache.set(item.slug, opt);
            setImgSrc(opt);
            if (typeof window !== "undefined") {
              try {
                const list = getWatchHistory();
                const target = list.find((i) => i.slug === item.slug);
                if (target) {
                  target.poster = opt;
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
    // Bước 1: Nếu link poster dọc bị lỗi, thử dùng thumb ngang
    const rawThumb = item.thumb ? toOptimizedCardPosterUrl(item.thumb) : "";
    if (rawThumb && rawThumb !== imgSrc) {
      setImgSrc(rawThumb);
      setIsLoaded(false);
      return;
    }

    // Bước 2: Gọi fallback API nếu chưa thử
    if (!fallbackTriedRef.current) {
      fallbackTriedRef.current = true;
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      if (item.slug) params.set("slug", item.slug);
      if (item.year) params.set("year", String(item.year));

      fetch(`/api/movie-poster-fallback?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const resolved = data?.posterUrl || data?.backdropUrl;
          if (resolved && resolved !== imgSrc) {
            const opt = toOptimizedCardPosterUrl(resolved);
            continueWatchingThumbCache.set(item.slug, opt);
            setImgSrc(opt);
            setIsLoaded(false);
            if (typeof window !== "undefined") {
              try {
                const list = getWatchHistory();
                const target = list.find((i) => i.slug === item.slug);
                if (target) {
                  target.poster = opt;
                  localStorage.setItem("nanaflix_watch_history", JSON.stringify(list));
                }
              } catch {}
            }
          } else {
            setImgSrc("");
            setIsLoaded(true);
          }
        })
        .catch(() => {
          setImgSrc("");
          setIsLoaded(true);
        });
    } else {
      setImgSrc("");
      setIsLoaded(true);
    }
  }, [imgSrc, item.title, item.slug, item.year, item.thumb]);

  const href = item.episodeSlug
    ? `/movies/${item.slug}?ep=${item.episodeSlug}`
    : `/movies/${item.slug}`;

  const progressPercent =
    item.durationSeconds && item.durationSeconds > 0 && typeof item.progressSeconds === "number"
      ? Math.min(100, Math.max(0, Math.round((item.progressSeconds / item.durationSeconds) * 100)))
      : 0;

  const remainingMinutes =
    item.durationSeconds && item.durationSeconds > 0 && typeof item.progressSeconds === "number"
      ? Math.max(1, Math.round((item.durationSeconds - item.progressSeconds) / 60))
      : null;

  return (
    <div
      className="group relative flex-none w-[130px] xs:w-[140px] sm:w-[155px] md:w-[172px] bg-zinc-950/90 rounded-xl overflow-hidden border border-white/[0.08] hover:border-red-500/40 transition-all duration-300 hover:scale-[1.03] shadow-lg hover:shadow-[0_12px_28px_rgba(229,9,20,0.18)] transform-gpu will-change-transform flex flex-col"
    >
      <Link href={href} className="block flex-1 flex flex-col">
        {/* ẢNH POSTER DỌC (TỈ LỆ 2:3 CHUẨN ĐIỆN ẢNH) */}
        <div className="relative aspect-[2/3] w-full bg-zinc-900 overflow-hidden rounded-t-xl">
          {/* SKELETON SHIMMER KHI ẢNH ĐANG TẢI */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-850 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center p-3 text-center z-0 animate-pulse pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1.5 shadow-inner">
                <Film className="w-5 h-5 text-rose-500/70" />
              </div>
              <span className="text-[11px] font-semibold text-zinc-400 line-clamp-2 max-w-[90%] leading-tight">
                {item.title}
              </span>
            </div>
          )}

          {imgSrc && !imgSrc.includes("/default-") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imgSrc}
              alt={item.title}
              className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
              decoding="async"
              loading={index < 8 ? "eager" : "lazy"}
              onLoad={() => setIsLoaded(true)}
              onError={handleImgError}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-rose-950/20 to-zinc-950 flex flex-col items-center justify-center p-3 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(229,9,20,0.18),transparent_70%)]" />
              <Film className="w-8 h-8 text-rose-500/60 mb-2 relative z-10 animate-pulse" />
              <span className="text-[11px] font-semibold text-zinc-300 line-clamp-3 max-w-[95%] relative z-10 leading-tight">
                {item.title}
              </span>
            </div>
          )}

          {/* GRADIENT OVERLAY BÓNG ĐỔ ĐÁY TINH TẾ */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none" />

          {/* HUY HIỆU TẬP PHIM / CHẤT LƯỢNG GỌN GÀNG TRÁNH CHE CHỮ POSTER */}
          <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1 pointer-events-none max-w-[80%]">
            {item.episodeName && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[9.5px] font-bold bg-black/80 backdrop-blur-md text-amber-300 border border-amber-400/30 truncate shadow-md">
                {formatEpisodeName(item.episodeName)}
              </span>
            )}
            {item.quality && !item.episodeName && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[9px] sm:text-[9.5px] font-bold backdrop-blur-md border shadow-md w-fit ${
                  item.quality.toUpperCase().includes("CAM")
                    ? "bg-amber-950/90 text-amber-300 border-amber-500/40"
                    : "bg-black/80 border-white/20 text-zinc-100"
                }`}
              >
                {item.quality}
              </span>
            )}
          </div>

          {/* NÚT XOÁ KHỎI TIẾP TỤC XEM */}
          <button
            type="button"
            onClick={(e) => onRemove(e, item.slug)}
            aria-label="Xoá khỏi danh sách tiếp tục xem"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-zinc-400 hover:text-white hover:bg-red-600/90 backdrop-blur-md transition-all duration-200 z-20 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer active:scale-90 shadow-md"
          >
            <X className="w-3 h-3" />
          </button>

          {/* NÚT PLAY TRÒN NỔI BẬT KHI HOVER */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="w-11 h-11 rounded-full bg-white/95 text-black flex items-center justify-center shadow-2xl backdrop-blur-md transform group-hover:scale-110 transition-all duration-300 group-hover:bg-red-600 group-hover:text-white">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
          </div>

          {/* THANH TIẾN ĐỘ GRADIENT ĐỎ SANG TRỌNG Ở ĐÁY POSTER */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 backdrop-blur-sm z-10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-500 rounded-r-full transition-all duration-500 shadow-[0_0_8px_rgba(229,9,20,0.9)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* THÔNG TIN PHIM */}
        <div className="p-2.5 sm:p-3 bg-zinc-950/95 flex-1 flex flex-col justify-between gap-1.5">
          <h3 className="text-zinc-100 text-xs sm:text-[13px] font-semibold truncate group-hover:text-rose-400 transition-colors leading-snug">
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse shadow-[0_0_6px_#EF4444]" />
              <span className="text-zinc-300 font-medium truncate">
                {item.episodeName ? formatEpisodeName(item.episodeName) : "Xem tiếp"}
              </span>
            </div>
            {remainingMinutes && remainingMinutes > 0 && (
              <span className="text-[10px] text-zinc-500 font-medium flex-shrink-0 ml-1.5">
                còn {remainingMinutes}p
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
