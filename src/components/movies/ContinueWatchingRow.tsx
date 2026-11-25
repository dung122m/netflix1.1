"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
  useMemo,
} from "react";
import Link from "next/link";
import { X, Film, Play } from "lucide-react";
import {
  getWatchHistory,
  removeWatchHistoryItem,
  autoHydrateWatchHistory,
  updateWatchHistoryPoster,
  WatchHistoryItem,
} from "@/lib/watchHistory";
import {
  pickBestMoviePoster,
  pickBestMovieThumb,
  toOptimizedCardPosterUrl,
  toFastCdnImageUrl,
} from "@/lib/movieMedia";
import { formatEpisodeName, isFullEpisodeLabel } from "@/lib/formatEpisode";
import { CarouselContainer } from "@/components/ui/CarouselContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  useMoviePosterFallback,
  isPhimimgSourceUrl,
  GLOBAL_POSTER_CACHE,
} from "@/hooks/useMoviePosterFallback";

export const MAX_CONTINUE_WATCHING_DISPLAY = 15;

const CW_THUMB_KEY = "nfx_cw_thumb_cache_v2";
function initContinueWatchingThumbCache(): Map<string, string> {
  const map = new Map<string, string>();
  if (typeof window === "undefined") return map;
  try {
    const raw = localStorage.getItem(CW_THUMB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string" && v) map.set(k, v);
        }
      }
    }
  } catch {}
  return map;
}

const continueWatchingThumbCache = initContinueWatchingThumbCache();

function persistContinueWatchingThumb(slug: string, url: string) {
  if (typeof window === "undefined" || !slug || !url) return;
  if (continueWatchingThumbCache.get(slug) === url) return;
  continueWatchingThumbCache.set(slug, url);
  try {
    const raw = localStorage.getItem(CW_THUMB_KEY);
    const obj: Record<string, string> = raw ? JSON.parse(raw) : {};
    obj[slug] = url;
    const keys = Object.keys(obj);
    if (keys.length > 200) delete obj[keys[0]];
    localStorage.setItem(CW_THUMB_KEY, JSON.stringify(obj));
  } catch {}
}

// Persist loaded poster URLs trong localStorage để reload trang hiển thị ngay 0ms không bị chớp trắng
const SESSION_KEY = "nfx_cw_loaded_posters_v2";
function buildLoadedPostersCache(): Set<string> {
  try {
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
        : null;
    if (raw) return new Set<string>(JSON.parse(raw) as string[]);
  } catch {}
  return new Set<string>();
}

function persistLoadedPoster(url: string) {
  if (!url || loadedPostersCache.has(url)) return;
  loadedPostersCache.add(url);
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    const arr: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!arr.includes(url)) {
      arr.push(url);
      if (arr.length > 300) arr.splice(0, arr.length - 300);
      localStorage.setItem(SESSION_KEY, JSON.stringify(arr));
    }
  } catch {}
}

const loadedPostersCache = buildLoadedPostersCache();

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
  // 1. Ưu tiên TMDb poster CDN nếu đã có sẵn trong item
  if (item.poster && item.poster.includes("image.tmdb.org")) {
    return toFastCdnImageUrl(toOptimizedCardPosterUrl(item.poster));
  }
  if (item.thumb && item.thumb.includes("image.tmdb.org")) {
    return toFastCdnImageUrl(toOptimizedCardPosterUrl(item.thumb));
  }

  // 2. Tra cứu tức thì từ GLOBAL_POSTER_CACHE (0ms RAM/LocalStorage)
  if (item.slug && GLOBAL_POSTER_CACHE.has(item.slug)) {
    return toFastCdnImageUrl(toOptimizedCardPosterUrl(GLOBAL_POSTER_CACHE.get(item.slug)!));
  }
  const cleanType = item.type || "movie";
  if (item.tmdbId && GLOBAL_POSTER_CACHE.has(`v3:tmdb:${item.tmdbId}:${cleanType}`)) {
    return toFastCdnImageUrl(toOptimizedCardPosterUrl(GLOBAL_POSTER_CACHE.get(`v3:tmdb:${item.tmdbId}:${cleanType}`)!));
  }
  const legacyKey = `${item.title || ""}_${item.year || ""}`.trim();
  if (legacyKey && GLOBAL_POSTER_CACHE.has(legacyKey)) {
    return toFastCdnImageUrl(toOptimizedCardPosterUrl(GLOBAL_POSTER_CACHE.get(legacyKey)!));
  }

  // 3. Tra cứu từ continueWatchingThumbCache
  if (item.slug && continueWatchingThumbCache.has(item.slug)) {
    return toFastCdnImageUrl(continueWatchingThumbCache.get(item.slug)!);
  }

  // 4. Chọn poster dọc tối ưu nhất
  const bestPoster = pickBestMoviePoster({ poster_url: item.poster, thumb_url: item.thumb }, "");
  if (bestPoster && !bestPoster.includes("/default-")) {
    return toFastCdnImageUrl(toOptimizedCardPosterUrl(bestPoster));
  }

  // 5. Dự phòng thumb ngang nếu chưa có poster
  const bestThumb = pickBestMovieThumb({ poster_url: item.poster, thumb_url: item.thumb }, "");
  if (bestThumb && !bestThumb.includes("/default-")) {
    return toFastCdnImageUrl(toOptimizedCardPosterUrl(bestThumb));
  }
  return "";
}

function ContinueWatchingCard({ item, index = 0, onRemove }: ContinueWatchingCardProps) {
  const initialPoster = React.useMemo(() => getInitialPoster(item), [item]);
  const isBlockedByIsp = Boolean(
    initialPoster &&
    (initialPoster.includes("phimimg.com") ||
      initialPoster.includes("img.ophim.cc") ||
      initialPoster.includes("img.phimapi.com"))
  );
  const needsFallback =
    !initialPoster || initialPoster.includes("/default-") || isPhimimgSourceUrl(initialPoster);

  const { displaySrc, isLoading: isFallbackLoading, triggerFallback } = useMoviePosterFallback({
    slug: item.slug,
    title: item.title,
    origin_name: item.origin_name,
    year: item.year,
    type: item.type,
    tmdbId: item.tmdbId,
    initialSrc: initialPoster,
    enabled: needsFallback,
    upgradePhimimg: true,
  });

  const safeDisplaySrc = toFastCdnImageUrl(displaySrc);
  const targetInitialSrc = safeDisplaySrc || initialPoster;
  const [imgSrc, setImgSrc] = useState<string>(() => targetInitialSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => {
    return Boolean(
      targetInitialSrc &&
      !targetInitialSrc.includes("/default-") &&
      (!isBlockedByIsp || targetInitialSrc.includes("image.tmdb.org"))
    );
  });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const checkImageComplete = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node && node.complete && node.naturalWidth > 0) {
      const actualSrc = node.currentSrc || node.src || imgSrc;
      if (actualSrc) {
        loadedPostersCache.add(actualSrc);
        persistLoadedPoster(actualSrc);
        if (item.slug) {
          continueWatchingThumbCache.set(item.slug, actualSrc);
          persistContinueWatchingThumb(item.slug, actualSrc);
        }
      }
      setIsLoaded(true);
    }
  }, [imgSrc, item.slug]);

  useEffect(() => {
    const safeDisplay = toFastCdnImageUrl(displaySrc);
    if (safeDisplay && safeDisplay !== imgSrc) {
      setImgSrc(safeDisplay);
      setIsLoaded(true);
    }
  }, [displaySrc, imgSrc]);

  // Luôn đồng bộ vĩnh viễn poster TMDb vào localStorage watch history để các lần sau tải 0ms
  useEffect(() => {
    const bestTmdb =
      (displaySrc && displaySrc.includes("image.tmdb.org") ? displaySrc : "") ||
      (initialPoster && initialPoster.includes("image.tmdb.org") ? initialPoster : "");
    if (bestTmdb && item.slug && item.poster !== bestTmdb) {
      updateWatchHistoryPoster(item.slug, bestTmdb);
    }
  }, [displaySrc, initialPoster, item.slug, item.poster]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [imgSrc]);

  const handleImgError = useCallback(() => {
    // 1. Thử thumb ngang dự phòng nếu có và khác link đang lỗi
    const rawThumb = item.thumb ? toFastCdnImageUrl(toOptimizedCardPosterUrl(item.thumb)) : "";
    if (rawThumb && rawThumb !== imgSrc && !rawThumb.includes("/default-")) {
      setImgSrc(rawThumb);
      return;
    }

    // 2. Ưu tiên kích hoạt fallback TMDb chính hãng khi ảnh lỗi
    if (displaySrc && displaySrc !== imgSrc && !displaySrc.includes("/default-")) {
      setImgSrc(toFastCdnImageUrl(displaySrc));
      return;
    }
    triggerFallback();

    setIsLoaded(true);
  }, [imgSrc, item.thumb, displaySrc, triggerFallback]);

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
      className="group relative flex-none w-[134px] min-[380px]:w-[144px] sm:w-[155px] md:w-[172px] bg-zinc-950/90 rounded-xl overflow-hidden transition-transform duration-300 hover:scale-[1.03] motion-reduce:transform-none shadow-lg hover:shadow-black/60 transform-gpu will-change-transform flex flex-col snap-start select-none"
    >
      <Link href={href} prefetch={false} className="block flex-1 flex flex-col">
        {/* ẢNH POSTER DỌC (TỈ LỆ 2:3 CHUẨN ĐIỆN ẢNH) */}
        <div className="relative aspect-[2/3] w-full bg-zinc-900 overflow-hidden rounded-t-xl">
          {/* LỚP NỀN DỰ PHÒNG KHI ĐANG LOAD ẢNH HOẶC CHỜ THẺ ẢNH */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center p-3 text-center select-none overflow-hidden"
            aria-hidden="true"
          >
            {!isLoaded && isBlockedByIsp && (
              <div
                className="absolute inset-0 -translate-x-full poster-placeholder-shimmer bg-gradient-to-r from-transparent via-white/[0.05] to-transparent pointer-events-none"
                aria-hidden="true"
              />
            )}
            <Film className="w-7 h-7 text-zinc-600 mb-1.5 opacity-40" />
            <span className="text-[11px] font-semibold text-zinc-400 line-clamp-2 max-w-[90%] leading-tight">
              {item.title}
            </span>
          </div>

          {imgSrc && !imgSrc.includes("/default-") && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={checkImageComplete}
              src={toFastCdnImageUrl(imgSrc)}
              alt={item.title}
              className={`relative z-10 w-full h-full object-cover group-hover:scale-105 transition-[transform,opacity] duration-300 ease-out ${
                isFallbackLoading && isBlockedByIsp ? "opacity-0" : "opacity-100"
              }`}
              decoding="async"
              loading={index < 8 ? "eager" : "lazy"}
              fetchPriority={index < 4 ? "high" : "auto"}
              onLoad={() => {
                const safeLoaded = toFastCdnImageUrl(imgSrc);
                if (safeLoaded) {
                  loadedPostersCache.add(safeLoaded);
                  persistLoadedPoster(safeLoaded);
                  if (item.slug) {
                    continueWatchingThumbCache.set(item.slug, safeLoaded);
                    persistContinueWatchingThumb(item.slug, safeLoaded);
                  }
                }
                setIsLoaded(true);
              }}
              onError={handleImgError}
            />
          )}

          {/* GRADIENT OVERLAY BÓNG ĐỔ ĐÁY TINH TẾ */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none z-10" />

          {/* NÚT PLAY TRUNG TÂM KHI HOVER */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/85 border border-white/20 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
              <Play className="w-4 h-4 fill-white ml-0.5 text-white" />
            </div>
          </div>

          {/* NÚT XOÁ KHỎI TIẾP TỤC XEM */}
          <button
            type="button"
            onClick={(e) => onRemove(e, item.slug)}
            aria-label="Xoá khỏi danh sách tiếp tục xem"
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/85 text-zinc-400 hover:text-white hover:bg-red-600/90 transition-all duration-200 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer active:scale-90 shadow-md"
          >
            <X className="w-3 h-3" />
          </button>

          {/* THANH TIẾN ĐỘ PHÁT */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 backdrop-blur-sm z-20 overflow-hidden">
            <div
              className="h-full bg-netflix-red rounded-r-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* THÔNG TIN PHIM */}
        <div className="p-2.5 sm:p-3 bg-zinc-950/95 flex-1 flex flex-col justify-between gap-1.5">
          <h3
            title={item.title}
            className="text-zinc-100 text-xs sm:text-[13px] font-semibold truncate group-hover:text-netflix-red transition-colors leading-snug"
          >
            {item.title}
          </h3>

          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-netflix-red flex-shrink-0" />
              <span className="text-zinc-300 font-medium truncate">
                {item.episodeName && !isFullEpisodeLabel(item.episodeName)
                  ? formatEpisodeName(item.episodeName)
                  : "Xem tiếp"}
              </span>
            </div>
            {remainingMinutes && remainingMinutes > 0 && (
              <span className="text-[10px] text-zinc-500 font-medium flex-shrink-0 ml-1.5 font-sans tabular-nums">
                còn {remainingMinutes}p
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

// =========================================================================
// EXTERNAL STORE SUBSCRIPTION: Đồng bộ lịch sử xem tức thì không delay
// =========================================================================
const emptyArray: WatchHistoryItem[] = [];
let cachedSnapshot: WatchHistoryItem[] = [];
let cachedVersion = -1;
let currentVersion = 0;

function subscribeWatchHistory(callback: () => void) {
  const handleUpdate = () => {
    currentVersion++;
    callback();
  };
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "nanaflix_watch_history") {
      currentVersion++;
      callback();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("watch-history-updated", handleUpdate);
    window.addEventListener("watchHistoryUpdated", handleUpdate);
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("watch-history-updated", handleUpdate);
      window.removeEventListener("watchHistoryUpdated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getWatchHistorySnapshot(): WatchHistoryItem[] {
  if (typeof window === "undefined") return emptyArray;
  if (currentVersion !== cachedVersion) {
    cachedSnapshot = getWatchHistory().filter(isContinueWatchingItem);
    cachedVersion = currentVersion;
  }
  return cachedSnapshot;
}

function getServerSnapshot(): WatchHistoryItem[] {
  return emptyArray;
}

export interface ContinueWatchingRowProps {
  className?: string;
}

function ContinueWatchingRowInner({ className }: ContinueWatchingRowProps = {}) {
  const allItems = useSyncExternalStore(
    subscribeWatchHistory,
    getWatchHistorySnapshot,
    getServerSnapshot
  );

  const displayItems = useMemo(
    () => allItems.slice(0, MAX_CONTINUE_WATCHING_DISPLAY),
    [allItems]
  );
  const totalCount = allItems.length;

  useEffect(() => {
    // Chạy bù đắp metadata ngầm sau 2s delay, không block tải trang
    const timer = setTimeout(() => {
      autoHydrateWatchHistory().catch(() => {});
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleRemove = useCallback((e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    currentVersion++;
    removeWatchHistoryItem(slug);
  }, []);

  // Nếu người dùng không có lịch sử xem: Ẩn hoàn toàn (0px, không render skeleton gây giật trang)
  if (displayItems.length === 0) {
    return null;
  }

  return (
    <section className={`px-4 md:px-8 my-5 sm:my-7 relative z-30 w-full select-none ${className || ""}`}>
      <SectionHeader
        variant="compact"
        title="Tiếp tục xem"
        actions={
          <Link
            href="/my-list?tab=history"
            prefetch={false}
            className="text-xs sm:text-sm text-zinc-400 hover:text-white transition font-medium"
          >
            Xem tất cả ({totalCount})
          </Link>
        }
      />

      {/* KHUNG CAROUSEL CÓ NÚT ĐIỀU HƯỚNG TRÁI/PHẢI CHUẨN NETFLIX */}
      <CarouselContainer
        resetTrigger={displayItems}
        watchTrigger={displayItems}
        cardSelector=".snap-start"
        boundaryThreshold={8}
        navOffsetClass="top-[50%]"
        leftAriaLabel="Cuộn danh sách đang xem sang trái"
        rightAriaLabel="Cuộn danh sách đang xem sang phải"
        className="gap-3 sm:gap-4 px-3 sm:px-4 scroll-pl-3 sm:scroll-pl-4 py-3 sm:py-3.5"
      >
        {displayItems.map((item, idx) => (
          <ContinueWatchingCard key={item.slug} item={item} index={idx} onRemove={handleRemove} />
        ))}
      </CarouselContainer>
    </section>
  );
}

export const ContinueWatchingRow = React.memo(ContinueWatchingRowInner);
export default ContinueWatchingRow;
