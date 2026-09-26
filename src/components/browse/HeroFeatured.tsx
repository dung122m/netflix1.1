"use client";
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  pickHeroBackdropImage,
  toHighResBackdropUrl,
} from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { clientSynopsisCache } from "./MediaCard";
import { fetchMovieSynopsisShared } from "@/services/synopsisService";
import TrailerModal from "@/components/TrailerModal";
import {
  extractYoutubeId,
  getYoutubeTrailerEmbedUrl,
  hasMinimum1080Quality,
  isDesktopWithHover,
  isYoutubeErrorMessage,
  isYoutubePlayingMessage,
  isYoutubeEndedMessage,
  isYoutubeQualityInfoMessage,
} from "@/lib/trailerHelper";

const AUTO_SLIDE_NORMAL_MS = 6000;
const AUTO_SLIDE_TRAILER_MS = 26000;

type HeroMovie = {
  slug?: string;
  name?: string;
  title?: string;
  content?: string;
  description?: string;
  thumb_url?: string;
  poster_url?: string;
  imageUrl?: string;
  backdrop_url?: string;
  backdropUrl?: string;
  banner_url?: string;
  bannerUrl?: string;
  backdrop_path?: string;
  backdropPath?: string;
  year?: string | number;
  status?: string;
  episode_current?: string;
  lang?: string;
  quality?: string;
  time?: string | number;
  origin_name?: string;
  category?: Array<{ name?: string }>;
  country?: Array<{ name?: string }>;
  director?: string[];
  trailer_url?: string;
  tmdb?: { id?: string | number; type?: string; vote_average?: string | number; vote_count?: number };
  [key: string]: unknown;
};

const HeroFeaturedInner: React.FC<{ movies?: HeroMovie[] }> = ({
  movies = [],
}) => {
  const slides = useMemo(() => (movies || []).slice(0, 8), [movies]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const currentSlug = slides[index]?.slug;
  const [isHeroImageLoaded, setIsHeroImageLoaded] = useState(false);
  const isInitialSlideRef = useRef(true);
  const [heroSynopsis, setHeroSynopsis] = useState<string>("");
  const [failedHeroImages, setFailedHeroImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isInitialSlideRef.current) {
      isInitialSlideRef.current = false;
      return;
    }
    setIsHeroImageLoaded(false);
  }, [index, currentSlug]);

  // Trailer States (Desktop only, lazy-load 2s, fault-tolerant)
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeTrailerId, setActiveTrailerId] = useState<string | null>(null);
  const [isTrailerReady, setIsTrailerReady] = useState(false);
  const [isHeroMuted, setIsHeroMuted] = useState(true);
  const [failedTrailerMap, setFailedTrailerMap] = useState<Record<string, boolean>>({});
  const trailerUrlMapRef = useRef<Record<string, string>>({});
  const failedTrailerMapRef = useRef<Record<string, boolean>>({});
  const trailerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const trailerReadyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heroIframeRef = useRef<HTMLIFrameElement>(null);
  // Theo dõi trạng thái kiểm tra chất lượng: null = chưa check, true = đủ 1080p, false = không đủ
  const qualityCheckedRef = useRef<Record<string, boolean | null>>({});
  // Ghi lại thời điểm slide bắt đầu để tính thời gian còn lại khi fallback
  const slideStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        const desktop = isDesktopWithHover();
        setIsDesktop((prev) => (prev !== desktop ? desktop : prev));
      };
      handleResize();
      window.addEventListener("resize", handleResize, { passive: true });
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    setIndex((prev) => (prev >= slides.length && slides.length > 0 ? 0 : prev));
  }, [slides.length]);

  // Ghi lại thời điểm mỗi slide bắt đầu để tính remaining time khi fallback
  useEffect(() => {
    slideStartTimeRef.current = Date.now();
  }, [index]);


  const heroRef = useRef<HTMLElement>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const isUserActionRef = useRef(false);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroVisible(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goPrev = useCallback(() => {
    isUserActionRef.current = true;
    slideStartTimeRef.current = Date.now();
    setDirection(-1);
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => {
    isUserActionRef.current = true;
    slideStartTimeRef.current = Date.now();
    setDirection(1);
    setIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  // Touch Swipe Gesture (Mobile): Ngưỡng 45-50px, ưu tiên vuốt ngang, không chặn vertical scroll
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
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const deltaTime = Date.now() - touchStartTimeRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Giới hạn thời gian vuốt dứt khoát < 650ms
    if (deltaTime > 650) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Ngưỡng vuốt 45px và hướng ngang rõ rệt hơn hướng dọc (absX > absY * 1.3) để không cản vertical scroll
    if (absX >= 45 && absX > absY * 1.3) {
      if (deltaX < 0) {
        // Vuốt sang trái -> xem banner tiếp theo
        goNext();
      } else {
        // Vuốt sang phải -> xem banner trước
        goPrev();
      }
    }
  };

  // Keyboard navigation: Hỗ trợ phím mũi tên trái/phải khi banner đang hiển thị trong viewport
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

  // Auto-slide: Tự động chuyển slide; trailer không chặn auto-slide
  // Banner có trailer: preview 15–20s (18s: 2s xuất hiện + ~16s trailer) rồi tự chuyển
  // Banner không có trailer / trailer lỗi / chất lượng thấp / mobile: chuyển bình thường sau 6s
  useEffect(() => {
    if (slides.length <= 1 || paused || !isHeroVisible) return;

    const isTrailerSlide = isDesktop && Boolean(currentSlug && !failedTrailerMap[currentSlug]);

    let slideDuration: number;
    if (isTrailerSlide) {
      slideDuration = AUTO_SLIDE_TRAILER_MS;
    } else {
      // Fallback (không có trailer hoặc chất lượng thấp): tính thời gian còn lại
      // Dùng slideStartTimeRef để trừ đi thời gian đã chạy, giữ đúng mốc 6s từ đầu slide
      const elapsed = Date.now() - slideStartTimeRef.current;
      slideDuration = Math.max(500, AUTO_SLIDE_NORMAL_MS - elapsed);
    }

    const id = setTimeout(() => {
      isUserActionRef.current = false;
      setDirection(1);
      setIndex((prev) => (prev + 1) % slides.length);
    }, slideDuration);

    return () => clearTimeout(id);
  }, [index, slides.length, paused, isHeroVisible, isDesktop, currentSlug, failedTrailerMap]);


  // Fetch synopsis tóm tắt nội dung khi slide dừng
  useEffect(() => {
    if (!currentSlug) return;

    if (clientSynopsisCache.has(currentSlug)) {
      setHeroSynopsis(clientSynopsisCache.get(currentSlug)!);
      return;
    }

    setHeroSynopsis("");

    if (!paused && !isUserActionRef.current) {
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      fetchMovieSynopsisShared(currentSlug)
        .then((data) => {
          if (isCancelled) return;
          if (data?.content) {
            clientSynopsisCache.set(currentSlug, data.content);
            setHeroSynopsis(data.content);
          }
          if (data?.trailer_url) {
            trailerUrlMapRef.current[currentSlug] = data.trailer_url;
          }
        })
        .catch(() => {});
    }, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentSlug, paused]);

  // QUẢN LÝ TRAILER NỀN: Desktop only, trễ 2s sau khi slide ổn định, cleanup khi đổi slide
  useEffect(() => {
    if (trailerTimerRef.current) {
      clearTimeout(trailerTimerRef.current);
      trailerTimerRef.current = null;
    }
    if (trailerReadyTimerRef.current) {
      clearTimeout(trailerReadyTimerRef.current);
      trailerReadyTimerRef.current = null;
    }
    setActiveTrailerId(null);
    setIsTrailerReady(false);
    // Reset quality check state cho slide mới (luôn check lại mỗi lần slide thay đổi)
    if (currentSlug) {
      qualityCheckedRef.current[currentSlug] = null;
    }

    // Mobile / Touch hoặc Hero ra ngoài viewport -> Tuyệt đối không mount trailer
    if (!isDesktop || !isHeroVisible || !currentSlug) {
      return;
    }

    if (failedTrailerMapRef.current[currentSlug]) {
      return;
    }

    trailerTimerRef.current = setTimeout(async () => {
      if (failedTrailerMapRef.current[currentSlug]) return;

      const featured = slides[index];
      let rawTrailer = featured?.trailer_url || trailerUrlMapRef.current[currentSlug];

      if (!rawTrailer) {
        try {
          const data = await fetchMovieSynopsisShared(currentSlug);
          if (data?.trailer_url) {
            rawTrailer = data.trailer_url;
            trailerUrlMapRef.current[currentSlug] = data.trailer_url;
          }
        } catch {}
      }

      const ytId = rawTrailer ? extractYoutubeId(rawTrailer) : null;
      if (ytId && !failedTrailerMapRef.current[currentSlug]) {
        setActiveTrailerId(ytId);
        setIsTrailerReady(false);
      } else {
        // Phim không có trailer hoặc YouTube ID không hợp lệ / trailer lỗi -> đánh dấu ngay lập tức
        failedTrailerMapRef.current[currentSlug] = true;
        setFailedTrailerMap((prev) => ({ ...prev, [currentSlug]: true }));
      }
    }, 2000);

    return () => {
      if (trailerTimerRef.current) {
        clearTimeout(trailerTimerRef.current);
        trailerTimerRef.current = null;
      }
      if (trailerReadyTimerRef.current) {
        clearTimeout(trailerReadyTimerRef.current);
        trailerReadyTimerRef.current = null;
      }
    };
  }, [index, currentSlug, isDesktop, isHeroVisible, slides]);

  // Lắng nghe thông báo từ YouTube iframe: fade-in khi video sẵn sàng hoặc fallback khi có lỗi
  useEffect(() => {
    if (!activeTrailerId) return;

    const handleMessage = (e: MessageEvent) => {
      // 0. Kiểm tra chất lượng video: chỉ cho phép phát nếu có hd1080 trở lên
      //    YouTube gửi availableQualityLevels qua infoDelivery trước khi video PLAYING
      const qualityLevels = isYoutubeQualityInfoMessage(e.data);
      if (qualityLevels && currentSlug && qualityCheckedRef.current[currentSlug] === null) {
        const isHD = hasMinimum1080Quality(qualityLevels);
        qualityCheckedRef.current[currentSlug] = isHD;
        if (!isHD) {
          // Chất lượng không đạt 1080p → fallback poster ngay lập tức, đánh dấu failed
          if (trailerReadyTimerRef.current) {
            clearTimeout(trailerReadyTimerRef.current);
            trailerReadyTimerRef.current = null;
          }
          failedTrailerMapRef.current[currentSlug] = true;
          setFailedTrailerMap((prev) => ({ ...prev, [currentSlug]: true }));
          setActiveTrailerId(null);
          setIsTrailerReady(false);
          return;
        }
      }

      // 1. Video thực sự PLAYING -> hủy timer chờ và fade-in trailer ngay lập tức
      if (isYoutubePlayingMessage(e.data)) {
        if (trailerReadyTimerRef.current) {
          clearTimeout(trailerReadyTimerRef.current);
          trailerReadyTimerRef.current = null;
        }
        setIsTrailerReady(true);
        return;
      }

      // 2. Video gặp lỗi YouTube (100, 101, 150, 2, 5) -> Fallback poster ngay lập tức, không retry
      if (isYoutubeErrorMessage(e.data)) {
        if (trailerReadyTimerRef.current) {
          clearTimeout(trailerReadyTimerRef.current);
          trailerReadyTimerRef.current = null;
        }
        if (currentSlug) {
          failedTrailerMapRef.current[currentSlug] = true;
          setFailedTrailerMap((prev) => ({ ...prev, [currentSlug]: true }));
        }
        setActiveTrailerId(null);
        setIsTrailerReady(false);
        return;
      }

      // 3. Video phát hết (State 0 - ENDED) -> Tự động phát lại (loop) bằng API
      if (isYoutubeEndedMessage(e.data)) {
        try {
          heroIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
            "*"
          );
          heroIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: "" }),
            "*"
          );
        } catch {}
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (trailerReadyTimerRef.current) {
        clearTimeout(trailerReadyTimerRef.current);
        trailerReadyTimerRef.current = null;
      }
    };
  }, [activeTrailerId, currentSlug]);

  const activeTrailerEmbedUrl = useMemo(() => {
    if (!activeTrailerId) return null;
    return getYoutubeTrailerEmbedUrl(activeTrailerId, {
      muted: true,
      controls: false,
      loop: true,
    });
  }, [activeTrailerId]);

  const handleToggleHeroMute = () => {
    const nextMuted = !isHeroMuted;
    setIsHeroMuted(nextMuted);
    try {
      heroIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: nextMuted ? "mute" : "unMute",
          args: "",
        }),
        "*"
      );
    } catch {}
  };

  if (slides.length === 0) return null;

  const featuredMovie = slides[index];
  const title = featuredMovie?.name || featuredMovie?.title || "Featured";
  const isTrailerOnly =
    featuredMovie?.status === "trailer" ||
    featuredMovie?.episode_current === "Trailer";
  const descriptionRaw =
    featuredMovie?.content || featuredMovie?.description || "";
  const descriptionClean = cleanHtmlText(descriptionRaw);

  const genresList = Array.isArray(featuredMovie?.category)
    ? featuredMovie.category
        .map((c) => (typeof c === "string" ? c : c?.name))
        .filter((name): name is string => Boolean(name && !name.toLowerCase().includes("cập nhật")))
    : [];

  const rawEpisode = featuredMovie?.episode_current?.trim() || "";
  const isEpisodeUseful = Boolean(
    rawEpisode &&
    !["full", "trailer", "hd", "fhd", "4k", "cam", "sd", "đang cập nhật", "updating"].includes(rawEpisode.toLowerCase())
  );

  const cleanDuration = (() => {
    if (!featuredMovie?.time) return null;
    const raw = String(featuredMovie.time).trim().replace(/phút\/tập\s*phút/gi, "phút/tập").replace(/phút\s*phút/gi, "phút");
    if (!raw || raw.toLowerCase().includes("đang cập nhật")) return null;
    if (raw.toLowerCase().includes("phút") || raw.toLowerCase().includes("h")) return raw;
    return `${raw} phút`;
  })();

  // Clean Synopsis: only display if it is genuine story description
  const hasRealSynopsis = Boolean(
    (heroSynopsis && !heroSynopsis.startsWith("Tên gốc:") && heroSynopsis.trim().length > 10) ||
    (descriptionClean && !descriptionClean.startsWith("Tên gốc:") && descriptionClean.trim().length > 10)
  );
  const displaySynopsis = hasRealSynopsis ? (heroSynopsis || descriptionClean) : "";

  const heroCountry = featuredMovie?.country?.[0]?.name;
  const isSeries = Boolean(
    (featuredMovie?.episode_current && String(featuredMovie.episode_current).toLowerCase().includes("tập")) ||
    (featuredMovie?.time && String(featuredMovie.time).toLowerCase().includes("tập")) ||
    (genresList.some((g) => g.toLowerCase().includes("phim bộ")))
  );
  const heroType = isSeries ? "Phim Bộ" : "Phim Lẻ";

  const voteAverage = featuredMovie?.tmdb?.vote_average;
  const voteText =
    voteAverage !== undefined && voteAverage !== null && voteAverage !== ""
      ? Number(voteAverage).toFixed(1)
      : null;

  const slideVariants = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
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

  // Giữ targetWidth w1280 ổn định giữa SSR và client hydration để tránh trình duyệt mobile tải 2 lần ảnh (w1280 rồi w780)
  // w1280 là chuẩn kích thước vật lý 1:1 hoàn hảo cho màn hình Retina 2x/3x trên mobile hiện đại (390-430px x 3 = 1170-1290px)
  const targetWidth = "w1280";
  const backdropFromMovie = pickHeroBackdropImage(featuredMovie, "/default-hero.jpg", targetWidth);
  const heroImageSrc =
    (currentSlug && failedHeroImages[currentSlug])
      ? "/default-hero.jpg"
      : toHighResBackdropUrl(backdropFromMovie, targetWidth);

  return (
    <section
      ref={heroRef}
      className="hero-cinema-section keep-dark-cinema relative h-[58vh] sm:h-[75vh] md:h-[82vh] min-h-[460px] sm:min-h-[540px] max-h-[850px] w-full overflow-hidden bg-black select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. HÌNH NỀN HERO BANNER TOÀN MÀN HÌNH VỚI HIỆU ỨNG CHUYỂN SLIDE MƯỢT MÀ */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
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
            className="absolute inset-0 will-change-transform select-none"
          >
            {!isHeroImageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black animate-pulse pointer-events-none" />
            )}
            <Image
              src={heroImageSrc}
              alt={title}
              fill
              priority={index === 0}
              quality={80}
              unoptimized
              sizes="100vw"
              className={`object-cover object-[center_25%] transition-opacity duration-300 ${
                isHeroImageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setIsHeroImageLoaded(true)}
              onError={() => {
                setIsHeroImageLoaded(false);
                if (currentSlug && !failedHeroImages[currentSlug]) {
                  setFailedHeroImages((prev) => ({ ...prev, [currentSlug]: true }));
                }
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 1.1 TRAILER CHẠY NỀN TRÊN DESKTOP (LAZY-LOAD SAU 2S, TỰ ĐỘNG PHÁT MUTED, FADE-IN PHÍA TRÊN POSTER) */}
      {isDesktop && activeTrailerEmbedUrl && !failedTrailerMap[currentSlug || ""] && (
        <div
          className={`absolute inset-0 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 [container-type:size] ${
            isTrailerReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <iframe
            ref={heroIframeRef}
            src={activeTrailerEmbedUrl}
            style={{
              width: "max(100cqw, 177.78cqh)",
              height: "max(100cqh, 56.25cqw)",
              minWidth: "100%",
              minHeight: "100%",
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.12] max-w-none border-0 object-cover pointer-events-none select-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title={`Trailer ${title}`}
            onLoad={() => {
              try {
                heroIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "listening" }),
                  "*"
                );
              } catch {}
              if (trailerReadyTimerRef.current) clearTimeout(trailerReadyTimerRef.current);
              trailerReadyTimerRef.current = setTimeout(() => {
                setIsTrailerReady(true);
              }, 600);
            }}
          />
        </div>
      )}

      {/* 2. CÁC LỚP MÀNG GRADIENT ĐIỆN ẢNH SẮC NÉT (CINEMATIC FULL-BLEED GRADIENTS) */}
      {/* Gradient mờ bên trái che chữ, giữ bên phải ảnh sắc nét */}
      <div className="absolute inset-y-0 left-0 w-full sm:w-[60%] bg-gradient-to-r from-black/95 via-black/55 to-transparent pointer-events-none z-[1]" />
      {/* Gradient chân trang chuyển màu êm ái */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/45 to-transparent pointer-events-none z-[1]" />
      {/* Gradient mép trên thanh header */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-[1]" />

      {/* 3. NỘI DUNG CHÍNH (TYPOGRAPHY, BADGES & CTA BUTTONS) */}
      <motion.div
        key={`content-${index}`}
        initial={index === 0 ? false : { opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 flex h-full items-end"
      >
        <div className="w-full px-4 sm:px-8 md:px-14 pb-12 sm:pb-16 md:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-3.5 sm:space-y-4">
              {/* 3.1 TOP BADGE TINH GIẢN */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-netflix-red/40 bg-netflix-red/20 px-3 py-0.5 text-[11px] sm:text-xs font-bold text-white shadow-sm backdrop-blur-md">
                  <Sparkles size={12} className="text-netflix-red fill-netflix-red" />
                  <span>Nổi bật</span>
                </span>
                {heroType && (
                  <span className="text-[11px] sm:text-xs font-semibold text-zinc-400">
                    • {heroType}
                  </span>
                )}
              </div>

              {/* 3.2 TIÊU ĐỀ PHIM */}
              <h1
                style={{ color: "#ffffff" }}
                className="hero-cinema-title text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] text-white line-clamp-2 tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]"
              >
                {title}
              </h1>

              {/* 3.3 HÀNG THÔNG TIN TINH GỌN (1 DÒNG DUY NHẤT CHUẨN NETFLIX) */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm font-medium text-zinc-300">
                {voteText && (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span>{voteText}</span>
                  </span>
                )}

                {featuredMovie?.year && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-200">{featuredMovie.year}</span>
                  </>
                )}

                {isEpisodeUseful ? (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400 font-semibold">{rawEpisode}</span>
                  </>
                ) : cleanDuration ? (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300">{cleanDuration}</span>
                  </>
                ) : null}

                {featuredMovie?.quality && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="px-1.5 py-0.2 rounded border border-white/20 bg-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                      {featuredMovie.quality}
                    </span>
                  </>
                )}

                {featuredMovie?.lang && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-rose-300/90">{featuredMovie.lang}</span>
                  </>
                )}

                {heroCountry && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300">{heroCountry}</span>
                  </>
                )}
              </div>

              {/* 3.4 THỂ LOẠI (TỐI ĐA 3 THỂ LOẠI CHÍNH, NỐI BẰNG DẤU CHẤM) */}
              {genresList.length > 0 && (
                <p className="text-xs sm:text-sm text-zinc-400 font-medium line-clamp-1">
                  {genresList.slice(0, 4).join("  •  ")}
                </p>
              )}

              {/* 3.5 TÓM TẮT NỘI DUNG (HIỂN THỊ ĐẦY ĐỦ CỐT TRUYỆN ĐIỆN ẢNH) */}
              {displaySynopsis ? (
                <p
                  style={{ color: "#d1d5db" }}
                  className="hero-cinema-desc max-w-2xl sm:max-w-3xl text-xs sm:text-sm md:text-base leading-relaxed text-zinc-300 line-clamp-3 sm:line-clamp-4 md:line-clamp-5 lg:line-clamp-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
                >
                  {displaySynopsis}
                </p>
              ) : null}

              {/* 3.5 CỤM NÚT HÀNH ĐỘNG (CTA) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-netflix-red to-red-600 hover:from-red-600 hover:to-rose-600 text-white px-7 sm:px-9 py-3.5 sm:py-4 text-xs sm:text-sm md:text-base font-black transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_10px_30px_-5px_rgba(229,9,20,0.7)] hover:shadow-[0_15px_35px_-5px_rgba(229,9,20,0.9)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105"
                  >
                    <Play size={19} fill="white" className="ml-0.5" />
                    <span>{isTrailerOnly ? "Xem Trailer" : "Xem Ngay"}</span>
                  </Link>
                )}

                {featuredMovie?.trailer_url && (
                  <TrailerModal
                    trailerUrl={featuredMovie.trailer_url}
                    title={title}
                  />
                )}
              </div>

              {/* 3.6 THANH TIẾN TRÌNH AUTO-SLIDE */}
              {slides.length > 1 && (
                <div className="pt-3 max-w-sm">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <motion.div
                      key={`progress-${index}-${paused ? "pause" : "play"}-${isDesktop && currentSlug && !failedTrailerMap[currentSlug] ? "trailer" : "normal"}`}
                      initial={{ width: "0%" }}
                      animate={{ width: paused ? "0%" : "100%" }}
                      transition={
                        paused
                          ? { duration: 0 }
                          : {
                              duration:
                                (isDesktop && currentSlug && !failedTrailerMap[currentSlug]
                                  ? AUTO_SLIDE_TRAILER_MS
                                  : AUTO_SLIDE_NORMAL_MS) / 1000,
                              ease: "linear",
                            }
                      }
                      className="h-full rounded-full bg-netflix-red shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. NÚT ĐIỀU HƯỚNG TRÁI/PHẢI */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Banner trước"
            className="hidden sm:flex absolute left-4 md:left-8 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 hover:bg-netflix-red hover:border-netflix-red p-3.5 text-white backdrop-blur-xl transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Banner tiếp theo"
            className="hidden sm:flex absolute right-4 md:right-8 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 hover:bg-netflix-red hover:border-netflix-red p-3.5 text-white backdrop-blur-xl transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <ChevronRight size={22} />
          </button>

          {/* CHẤM CHỈ SỐ PHÂN TRANG (DOTS VỚI TOUCH TARGET CHUẨN 44x44PX) */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Chuyển slide ${i + 1}`}
                onClick={() => {
                  isUserActionRef.current = true;
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className="w-11 h-11 flex items-center justify-center cursor-pointer touch-manipulation focus:outline-none"
              >
                <span
                  className={`h-2 rounded-full transition-all duration-300 block ${
                    i === index
                      ? "w-8 bg-netflix-red shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                      : "w-2 bg-white/40 hover:bg-white/80"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* NÚT BẬT/TẮT TIẾNG TRAILER HERO TRÊN DESKTOP */}
          {isDesktop && activeTrailerEmbedUrl && isTrailerReady && (
            <button
              type="button"
              onClick={handleToggleHeroMute}
              aria-label={isHeroMuted ? "Bật âm thanh trailer" : "Tắt âm thanh trailer"}
              className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-20 hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-black/75 hover:bg-black text-white text-xs font-bold backdrop-blur-xl transition-all shadow-2xl hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isHeroMuted ? (
                <>
                  <VolumeX size={15} className="text-gray-300" />
                  <span>Bật tiếng</span>
                </>
              ) : (
                <>
                  <Volume2 size={15} className="text-netflix-red animate-pulse" />
                  <span>Tắt tiếng</span>
                </>
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
};

export const HeroFeatured = React.memo(HeroFeaturedInner);
export default HeroFeatured;
