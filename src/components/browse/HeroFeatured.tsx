"use client";
import React, { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Play,
  Star,
  Calendar,
  Globe2,
  Sparkles,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  type PanInfo,
  useReducedMotion,
} from "framer-motion";
import {
  buildMovieDescriptionFallback,
  pickBestMovieImage,
  pickHeroBackdropImage,
} from "@/lib/movieMedia";
import { cleanHtmlText } from "@/lib/cleanHtml";
import { clientSynopsisCache } from "./MediaCard";
import TrailerModal from "@/components/TrailerModal";

const AUTO_SLIDE_MS = 5500;

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

export const HeroFeatured: React.FC<{ movies?: HeroMovie[] }> = ({
  movies = [],
}) => {
  const slides = useMemo(() => (movies || []).slice(0, 8), [movies]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const currentSlug = slides[index]?.slug;
  const [heroSynopsis, setHeroSynopsis] = useState<string>("");
  const [heroBackdropMap, setHeroBackdropMap] = useState<Record<string, string>>({});
  const [failedHeroImages, setFailedHeroImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIndex(0);
  }, [slides.length]);

  const heroRef = useRef<HTMLElement>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

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

  // Chỉ tải trước ảnh của slide tiếp theo để không nghẽn băng thông
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextIndex = (index + 1) % slides.length;
    const nextMovie = slides[nextIndex];
    if (nextMovie) {
      const nextUrl =
        (nextMovie.slug && heroBackdropMap[nextMovie.slug]) ||
        pickHeroBackdropImage(nextMovie, "/default-hero.jpg");
      const img = new window.Image();
      img.src = nextUrl;
    }
  }, [index, slides, heroBackdropMap]);

  useEffect(() => {
    if (slides.length <= 1 || paused || !isHeroVisible) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [slides.length, paused, isHeroVisible]);

  useEffect(() => {
    if (!currentSlug) return;
    if (clientSynopsisCache.has(currentSlug)) {
      setHeroSynopsis(clientSynopsisCache.get(currentSlug)!);
    }
    fetch(`/api/synopsis?slug=${encodeURIComponent(currentSlug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.content) {
          clientSynopsisCache.set(currentSlug, data.content);
          setHeroSynopsis(data.content);
        }
        if (data?.backdrop_url) {
          setHeroBackdropMap((prev) => ({ ...prev, [currentSlug]: data.backdrop_url }));
        }
      })
      .catch(() => {});
  }, [currentSlug]);

  if (slides.length === 0) return null;

  const featuredMovie = slides[index];
  const title = featuredMovie?.name || featuredMovie?.title || "Featured";
  const isTrailerOnly =
    featuredMovie?.status === "trailer" ||
    featuredMovie?.episode_current === "Trailer";
  const descriptionRaw =
    featuredMovie?.content || featuredMovie?.description || "";
  const descriptionClean = cleanHtmlText(descriptionRaw);
  const description =
    heroSynopsis ||
    descriptionClean ||
    buildMovieDescriptionFallback({
      origin_name: featuredMovie?.origin_name,
      year: featuredMovie?.year,
      time: featuredMovie?.time,
      lang: featuredMovie?.lang,
      quality: featuredMovie?.quality,
      category: featuredMovie?.category,
      country: featuredMovie?.country,
      director: featuredMovie?.director,
    }) ||
    "";

  const heroCountry = featuredMovie?.country?.[0]?.name;
  const isSeries = Boolean(
    (featuredMovie?.episode_current && String(featuredMovie.episode_current).toLowerCase().includes("tập")) ||
    (featuredMovie?.time && String(featuredMovie.time).toLowerCase().includes("tập"))
  );
  const heroType = isSeries ? "Phim Bộ" : "Phim Lẻ";

  const voteAverage = featuredMovie?.tmdb?.vote_average;
  const voteText =
    voteAverage !== undefined && voteAverage !== null && voteAverage !== ""
      ? Number(voteAverage).toFixed(1)
      : null;

  const goPrev = () => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goNext = () => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % slides.length);
  };

  const onDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 85;
    if (info.offset.x <= -threshold) goNext();
    if (info.offset.x >= threshold) goPrev();
  };

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

  const fallbackHeroImage = pickHeroBackdropImage(featuredMovie, "/default-hero.jpg");
  const lowResFallback = pickBestMovieImage(featuredMovie, "/default-hero.jpg");
  const heroImageSrc =
    (currentSlug && failedHeroImages[currentSlug])
      ? lowResFallback
      : (currentSlug && heroBackdropMap[currentSlug]) || fallbackHeroImage;

  return (
    <section
      ref={heroRef}
      className="hero-cinema-section keep-dark-cinema relative h-[58vh] sm:h-[75vh] md:h-[82vh] min-h-[460px] sm:min-h-[540px] max-h-[850px] w-full overflow-hidden bg-black select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 1. HÌNH NỀN HERO BANNER TOÀN MÀN HÌNH VỚI HIỆU ỨNG CHUYỂN SLIDE MƯỢT MÀ */}
      <div className="absolute inset-0">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 115, damping: 22, mass: 0.75 },
              opacity: { duration: 0.45, ease: "easeOut" },
              scale: { duration: 0.75, ease: "easeOut" },
            }}
            drag={slides.length > 1 ? "x" : false}
            dragElastic={0.08}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={onDragEnd}
            className="absolute inset-0 will-change-transform"
          >
            <Image
              src={heroImageSrc}
              alt={title}
              fill
              priority
              quality={90}
              unoptimized
              sizes="100vw"
              className="object-cover object-[center_25%]"
              onError={() => {
                if (currentSlug && !failedHeroImages[currentSlug]) {
                  setFailedHeroImages((prev) => ({ ...prev, [currentSlug]: true }));
                }
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. CÁC LỚP MÀNG GRADIENT ĐIỆN ẢNH SẮC NÉT (CINEMATIC FULL-BLEED GRADIENTS) */}
      {/* Gradient mờ bên trái che chữ, giữ bên phải ảnh sắc nét */}
      <div className="absolute inset-y-0 left-0 w-full sm:w-[60%] bg-gradient-to-r from-black/95 via-black/55 to-transparent pointer-events-none z-[1]" />
      {/* Gradient chân trang chuyển màu êm ái */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/45 to-transparent pointer-events-none z-[1]" />
      {/* Gradient mép trên thanh header */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-[1]" />
      {/* Ambient glow đỏ tinh tế */}
      <div className="absolute -left-20 bottom-1/4 w-[450px] h-[450px] bg-rose-600/10 rounded-full blur-[130px] pointer-events-none z-[1]" />

      {/* 3. NỘI DUNG CHÍNH (TYPOGRAPHY, BADGES & CTA BUTTONS) */}
      <motion.div
        key={`content-${index}`}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 flex h-full items-end"
      >
        <div className="w-full px-4 sm:px-8 md:px-14 pb-12 sm:pb-16 md:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl space-y-4 sm:space-y-5">
              {/* BADGES METADATA */}
              <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                <span className="rounded-full border border-netflix-red/50 bg-gradient-to-r from-netflix-red/35 via-rose-600/25 to-transparent text-white px-3.5 py-1 font-black text-[11px] sm:text-xs flex items-center gap-1.5 shadow-[0_0_18px_rgba(229,9,20,0.45)]">
                  <Sparkles size={13} className="text-netflix-red fill-netflix-red animate-pulse" />
                  <span>Nana Tuyển Chọn • {heroType}</span>
                </span>

                {voteText && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs font-black text-amber-300 shadow-sm">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span>{voteText}</span>
                  </span>
                )}

                {featuredMovie?.year && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs text-gray-200 font-bold">
                    <Calendar size={12} className="text-emerald-400" />
                    <span>{featuredMovie.year}</span>
                  </span>
                )}

                {featuredMovie?.quality && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/15 backdrop-blur-md px-2.5 py-1 text-[11px] sm:text-xs font-black text-white shadow-sm uppercase tracking-wider">
                    <span>{featuredMovie.quality}</span>
                  </span>
                )}

                {heroCountry && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs font-semibold text-gray-300">
                    <Globe2 size={12} className="text-sky-400" />
                    <span>{heroCountry}</span>
                  </span>
                )}

                {featuredMovie?.lang && (
                  <span className="inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 backdrop-blur-md px-3 py-1 text-[11px] sm:text-xs text-rose-300 font-semibold">
                    <span>{featuredMovie.lang}</span>
                  </span>
                )}
              </div>

              {/* TIÊU ĐỀ PHIM ĐỈNH CAO */}
              <h1
                style={{ color: "#ffffff" }}
                className="hero-cinema-title text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] text-white line-clamp-2 tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]"
              >
                {title}
              </h1>

              {/* TÓM TẮT NỘI DUNG */}
              <p
                style={{ color: "#e2e8f0" }}
                className="hero-cinema-desc max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-zinc-300 line-clamp-2 sm:line-clamp-3 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
              >
                {description}
              </p>

              {/* CỤM NÚT HÀNH ĐỘNG (CTA) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-netflix-red to-red-600 hover:from-red-600 hover:to-rose-600 text-white px-7 sm:px-9 py-3.5 sm:py-4 text-xs sm:text-sm md:text-base font-black transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_10px_30px_-5px_rgba(229,9,20,0.7)] hover:shadow-[0_15px_35px_-5px_rgba(229,9,20,0.9)] cursor-pointer"
                  >
                    <Play size={19} fill="white" className="ml-0.5" />
                    <span>{isTrailerOnly ? "Xem trailer" : "Xem ngay"}</span>
                  </Link>
                )}

                {featuredMovie?.trailer_url && (
                  <TrailerModal trailerUrl={featuredMovie.trailer_url} title={title} />
                )}

                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm md:text-base font-bold text-white backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-lg hover:border-white/35"
                  >
                    <Info size={19} />
                    <span>Chi tiết phim</span>
                  </Link>
                )}
              </div>

              {/* THANH TIẾN TRÌNH AUTO-SLIDE */}
              {slides.length > 1 && (
                <div className="pt-3 max-w-sm">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                    <motion.div
                      key={`progress-${index}-${paused ? "pause" : "play"}`}
                      initial={{ width: "0%" }}
                      animate={{ width: paused ? "0%" : "100%" }}
                      transition={
                        paused
                          ? { duration: 0 }
                          : { duration: AUTO_SLIDE_MS / 1000, ease: "linear" }
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
            onClick={goPrev}
            aria-label="Slide trước"
            className="hidden sm:flex absolute left-4 md:left-8 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 hover:bg-netflix-red hover:border-netflix-red p-3.5 text-white backdrop-blur-xl transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 items-center justify-center cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={goNext}
            aria-label="Slide tiếp"
            className="hidden sm:flex absolute right-4 md:right-8 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 hover:bg-netflix-red hover:border-netflix-red p-3.5 text-white backdrop-blur-xl transition-all duration-300 shadow-2xl hover:scale-110 active:scale-95 items-center justify-center cursor-pointer"
          >
            <ChevronRight size={22} />
          </button>

          {/* CHẤM CHỈ SỐ PHÂN TRANG (DOTS) */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Chuyển slide ${i + 1}`}
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? "w-8 bg-netflix-red shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                    : "w-2 bg-white/40 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

          {/* DOCK CHUYỂN NHANH POSTER THUMBNAIL Ở GÓC PHẢI DƯỚI */}
          <div className="absolute bottom-6 right-8 z-20 hidden items-center gap-2.5 rounded-2xl border border-white/15 bg-black/60 p-2 backdrop-blur-2xl shadow-2xl lg:flex">
            {slides.slice(0, 5).map((movie, i) => {
              const thumb = pickBestMovieImage(movie, "/default-poster.jpg");
              const active = i === index;
              return (
                <button
                  key={`${movie.slug || i}-thumb`}
                  onClick={() => {
                    setDirection(i > index ? 1 : -1);
                    setIndex(i);
                  }}
                  className={`relative h-16 w-11 overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                    active
                      ? "scale-110 border-netflix-red shadow-[0_0_18px_rgba(229,9,20,0.7)] ring-2 ring-red-500/40 z-10"
                      : "border-white/15 opacity-65 hover:opacity-100 hover:scale-105 hover:border-white/40"
                  }`}
                  aria-label={`Xem phim ${movie.name || movie.title || i + 1}`}
                >
                  <Image
                    src={thumb}
                    alt={movie.name || movie.title || "thumb"}
                    fill
                    unoptimized
                    quality={88}
                    sizes="44px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
