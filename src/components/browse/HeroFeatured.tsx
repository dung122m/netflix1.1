"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { toast } from "@/components/ui/Toast";
import { computeHeroMovieMeta, type HeroMovie } from "./heroMovieHelpers";
import { useHeroTrailerPlayer } from "./hooks/useHeroTrailerPlayer";
import { HeroContentOverlay } from "./HeroContentOverlay";

export type { HeroMovie };

const HeroFeaturedInner: React.FC<{ movies?: HeroMovie[] }> = ({
  movies: initialMovies = [],
}) => {
  const [heroMovies, setHeroMovies] = useState<HeroMovie[]>(() => initialMovies);

  // Đồng bộ khi initialMovies từ Server Component thay đổi
  useEffect(() => {
    if (initialMovies && initialMovies.length > 0) {
      setHeroMovies(initialMovies);
    }
  }, [initialMovies]);

  // Luôn đảm bảo Hero Banner lấy từ Top phim thịnh hành TMDB
  useEffect(() => {
    let isCancelled = false;

    // 1. Thử đọc nhanh từ localStorage (0ms) nếu TmdbTopTrending hoặc phiên trước đã lưu
    try {
      const rawCache = localStorage.getItem("nanaflix_tmdb_ranking_cache_v8");
      if (rawCache) {
        const parsed = JSON.parse(rawCache);
        if (Array.isArray(parsed?.week) && parsed.week.length >= 3) {
          const cachedTrending = parsed.week.slice(0, 8).map((m: HeroMovie) => ({
            ...m,
            isTrending: true,
          }));
          setHeroMovies((prev) => {
            const currentIsTrending = prev.some((m) => m?.isTrending);
            if (!currentIsTrending || cachedTrending[0]?.slug !== prev[0]?.slug) {
              return cachedTrending;
            }
            return prev;
          });
        }
      }
    } catch { }

    // 2. Fetch SWR /api/trending-tmdb?type=week&limit=8 để cập nhật danh sách phim mới nhất
    const fetchTrendingHero = async () => {
      try {
        const res = await fetch("/api/trending-tmdb?type=week&limit=8");
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled) return;
        if (Array.isArray(data?.items) && data.items.length >= 3) {
          const trendingList = data.items.slice(0, 8).map((m: HeroMovie) => ({
            ...m,
            isTrending: true,
          }));
          setHeroMovies(trendingList);
        }
      } catch { }
    };

    fetchTrendingHero();

    // 3. Lắng nghe event khi TmdbTopTrending cập nhật dữ liệu
    const handleTrendingUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ week?: HeroMovie[] }>;
      if (Array.isArray(customEvent.detail?.week) && customEvent.detail.week.length >= 3) {
        const trendingList = customEvent.detail.week.slice(0, 8).map((m) => ({
          ...m,
          isTrending: true,
        }));
        setHeroMovies(trendingList);
      }
    };

    window.addEventListener("nanaflix_tmdb_trending_updated", handleTrendingUpdated);
    return () => {
      isCancelled = true;
      window.removeEventListener("nanaflix_tmdb_trending_updated", handleTrendingUpdated);
    };
  }, []);

  const slides = useMemo(() => (heroMovies || []).slice(0, 8), [heroMovies]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const currentSlug = slides[index]?.slug;
  const [failedHeroImages, setFailedHeroImages] = useState<
    Record<string, boolean>
  >({});

  // Preload backdrop images của tất cả slides để khi chuyển slide, ảnh luôn có sẵn tức thì trong browser cache
  useEffect(() => {
    if (typeof window === "undefined" || !slides.length) return;
    slides.forEach((slide) => {
      if (!slide) return;
      const slideMeta = computeHeroMovieMeta(slide, slide.slug, {}, {});
      if (slideMeta.heroImageSrc && slideMeta.heroImageSrc !== "/default-hero.jpg") {
        const img = new window.Image();
        img.src = slideMeta.heroImageSrc;
      }
    });
  }, [slides]);

  useEffect(() => {
    setIndex((prev) => (prev >= slides.length && slides.length > 0 ? 0 : prev));
  }, [slides.length]);

  const [inWatchlist, setInWatchlist] = useState(false);
  useEffect(() => {
    if (currentSlug) {
      setInWatchlist(isInWatchlist(currentSlug));
    }
    const handleSync = () => {
      if (currentSlug) {
        setInWatchlist(isInWatchlist(currentSlug));
      }
    };
    window.addEventListener("watchlist-updated", handleSync);
    return () => window.removeEventListener("watchlist-updated", handleSync);
  }, [currentSlug]);

  const {
    synopsisMap,
    isDesktop,
    isHeroVisible,
    activeTrailerId,
    activeTrailerEmbedUrl,
    isTrailerReady,
    isHeroMuted,
    failedTrailerMap,
    heroIframeRef,
    handleTrailerIframeLoad,
    handleToggleHeroMute,
    goPrev,
    goNext,
    goToSlide,
  } = useHeroTrailerPlayer({
    slides,
    index,
    setIndex,
    setDirection,
    paused,
    heroRef,
  });

  // Touch Swipe Gesture (Mobile)
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (slides.length <= 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const deltaTime = Date.now() - touchStartTimeRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (deltaTime > 650) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX >= 45 && absX > absY * 1.3) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isHeroVisible || slides.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isHeroVisible, slides.length, goNext, goPrev]);

  if (slides.length === 0) return null;

  const featuredMovie = slides[index];
  const meta = computeHeroMovieMeta(
    featuredMovie,
    currentSlug,
    synopsisMap,
    failedHeroImages,
  );

  const slideVariants = reduceMotion
    ? {
      enter: { opacity: 0, x: 0, scale: 1 },
      center: { opacity: 1, x: 0, scale: 1 },
      exit: { opacity: 0, x: 0, scale: 1 },
    }
    : {
      enter: (dir: number) => ({
        x: dir > 0 ? 120 : -120,
        opacity: 0,
        scale: 1.05,
      }),
      center: { x: 0, opacity: 1, scale: 1 },
      exit: (dir: number) => ({
        x: dir > 0 ? -110 : 110,
        opacity: 0,
        scale: 1.05,
      }),
    };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!featuredMovie || !featuredMovie.slug) return;
    const added = toggleWatchlist({
      slug: featuredMovie.slug,
      title: meta.title,
      imageUrl:
        featuredMovie.imageUrl ||
        featuredMovie.poster_url ||
        featuredMovie.thumb_url ||
        "/default-poster.jpg",
      year: featuredMovie.year,
      genre: meta.genresList.join(", "),
      time: meta.cleanDuration || undefined,
    });
    setInWatchlist(added);
    if (added) {
      toast.success(`Đã thêm "${meta.title}" vào Danh sách của tôi!`);
    } else {
      toast.info("Đã xóa khỏi Danh sách của tôi.");
    }
  };

  return (
    <section
      ref={heroRef}
      className="hero-cinema-section keep-dark-cinema relative h-[68dvh] sm:h-[75dvh] md:h-[82dvh] min-h-[460px] sm:min-h-[540px] max-h-[850px] w-full overflow-hidden bg-black select-none group/hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. HÌNH NỀN HERO BANNER */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants}
            initial={index === 0 ? false : "enter"}
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 115, damping: 22, mass: 0.75 },
              opacity: { duration: 0.45, ease: "easeOut" },
              scale: { duration: 0.75, ease: "easeOut" },
            }}
            className="absolute inset-0 will-change-transform select-none bg-zinc-950"
          >
            <Image
              src={meta.heroImageSrc}
              alt={meta.title}
              fill
              priority={index === 0}
              decoding="async"
              quality={80}
              unoptimized
              sizes="100vw"
              className="object-cover object-[center_25%]"
              onError={() => {
                if (currentSlug && !failedHeroImages[currentSlug]) {
                  setFailedHeroImages((prev) => ({
                    ...prev,
                    [currentSlug]: true,
                  }));
                }
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 1.1 TRAILER CHẠY NỀN TRÊN DESKTOP */}
      {isDesktop &&
        activeTrailerEmbedUrl &&
        !failedTrailerMap[currentSlug || ""] && (
          <div
            translate="no"
            className={`notranslate absolute inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 [container-type:size] ${isTrailerReady ? "opacity-100" : "opacity-0"
              }`}
          >
            <iframe
              key={`hero-trailer-${activeTrailerId}`}
              ref={heroIframeRef}
              src={activeTrailerEmbedUrl}
              translate="no"
              style={{
                width: "max(100cqw, 177.78cqh)",
                height: "max(100cqh, 56.25cqw)",
                minWidth: "100%",
                minHeight: "100%",
                transform: "translate3d(-50%, -50%, 0) scale(1.12)",
                WebkitTransform: "translate3d(-50%, -50%, 0) scale(1.12)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                outline: "none",
              }}
              className="notranslate absolute top-1/2 left-1/2 max-w-none border-0 object-cover pointer-events-none select-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={`Trailer ${meta.title}`}
              onLoad={handleTrailerIframeLoad}
            />
          </div>
        )}

      {/* 2. CÁC LỚP MÀNG GRADIENT ĐIỆN ẢNH */}
      <div className="hidden sm:block absolute inset-y-0 left-0 w-[60%] bg-gradient-to-r from-black/95 via-black/55 to-transparent pointer-events-none z-[1]" />
      <div className="absolute inset-x-0 bottom-0 h-80 sm:h-52 bg-gradient-to-t from-black via-black/90 sm:via-black/50 via-50% to-transparent pointer-events-none z-[1]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-[1]" />

      {/* 3 & 4. NỘI DUNG & ĐIỀU HƯỚNG SLIDE */}
      <HeroContentOverlay
        slides={slides}
        index={index}
        paused={paused}
        featuredMovie={featuredMovie}
        currentSlug={currentSlug}
        meta={meta}
        inWatchlist={inWatchlist}
        isDesktop={isDesktop}
        failedTrailerMap={failedTrailerMap}
        activeTrailerEmbedUrl={activeTrailerEmbedUrl}
        isTrailerReady={isTrailerReady}
        isHeroMuted={isHeroMuted}
        onToggleWatchlist={handleToggleWatchlist}
        onGoPrev={goPrev}
        onGoNext={goNext}
        onGoToSlide={goToSlide}
        onToggleHeroMute={handleToggleHeroMute}
      />
    </section>
  );
};

export const HeroFeatured = React.memo(HeroFeaturedInner);
export default HeroFeatured;
