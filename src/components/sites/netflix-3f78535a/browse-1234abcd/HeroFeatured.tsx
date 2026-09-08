"use client";
import React, { useEffect, useMemo, useState } from "react";
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
} from "@/lib/movieMedia";
import { clientSynopsisCache } from "./MediaCard";

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
  tmdb?: { vote_average?: string | number; vote_count?: number };
};

export const HeroFeatured: React.FC<{ movies?: HeroMovie[] }> = ({
  movies = [],
}) => {
  const slides = useMemo(() => (movies || []).slice(0, 8), [movies]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(0);
  }, [slides.length]);

  const [isHeroVisible, setIsHeroVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsHeroVisible(window.scrollY < 700);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Chỉ tải trước ảnh của slide tiếp theo để không nghẽn băng thông
  useEffect(() => {
    if (slides.length <= 1) return;
    const nextIndex = (index + 1) % slides.length;
    const nextMovie = slides[nextIndex];
    if (nextMovie) {
      const nextUrl = pickBestMovieImage(nextMovie, "/default-hero.jpg");
      const img = new window.Image();
      img.src = nextUrl;
    }
  }, [index, slides]);

  useEffect(() => {
    if (slides.length <= 1 || paused || !isHeroVisible) return;
    const id = setInterval(() => {
      setDirection(1);
      setIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_SLIDE_MS);
    return () => clearInterval(id);
  }, [slides.length, paused, isHeroVisible]);

  const currentSlug = slides[index]?.slug;
  const [heroSynopsis, setHeroSynopsis] = useState<string>("");

  useEffect(() => {
    if (!currentSlug) return;
    if (clientSynopsisCache.has(currentSlug)) {
      setHeroSynopsis(clientSynopsisCache.get(currentSlug)!);
      return;
    }
    fetch(`/api/synopsis?slug=${encodeURIComponent(currentSlug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.content) {
          clientSynopsisCache.set(currentSlug, data.content);
          setHeroSynopsis(data.content);
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
  const descriptionClean = String(descriptionRaw).replace(/<[^>]*>/g, "");
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
    "Nội dung phim đang được cập nhật.";

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
          scale: 1.06,
        }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({
          x: dir > 0 ? -110 : 110,
          opacity: 0,
          scale: 1.08,
        }),
      };

  return (
    <section
      className="relative h-[84vh] min-h-[580px] w-full overflow-hidden bg-black"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
              opacity: { duration: 0.38, ease: "easeOut" },
              scale: { duration: 0.6, ease: "easeOut" },
            }}
            drag={slides.length > 1 ? "x" : false}
            dragElastic={0.08}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={onDragEnd}
            className="absolute inset-0 will-change-transform"
          >
            <Image
              src={pickBestMovieImage(featuredMovie, "/default-hero.jpg")}
              alt={title}
              fill
              priority
              quality={95}
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/55 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_28%,rgba(229,9,20,0.16),transparent_38%)]" />

      <motion.div
        key={`content-${index}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 flex h-full items-end"
      >
        <div className="w-full px-4 pb-6 md:px-10 md:pb-10">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-md md:p-8 shadow-2xl">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs md:text-sm">
                <span className="rounded-full border border-netflix-red/40 bg-gradient-to-r from-netflix-red/30 to-rose-600/20 text-rose-300 px-3 py-1 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                  <Sparkles size={12} className="text-netflix-red animate-pulse" />
                  <span>Đang nổi bật</span>
                </span>
                {featuredMovie?.year && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-gray-200">
                    <Calendar size={12} className="text-emerald-400" />
                    <span>{featuredMovie.year}</span>
                  </span>
                )}
                {featuredMovie?.quality && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-netflix-red/45 bg-netflix-red/90 px-3 py-1 font-bold text-white shadow-md shadow-red-950/50">
                    <Sparkles size={12} />
                    <span>{featuredMovie.quality}</span>
                  </span>
                )}
                {featuredMovie?.lang && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-gray-200">
                    <Globe2 size={12} className="text-sky-400" />
                    <span>{featuredMovie.lang}</span>
                  </span>
                )}
                {voteText && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-black/55 px-3 py-1 text-amber-300 font-semibold shadow-sm">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    <span>{voteText}</span>
                  </span>
                )}
                <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1 text-gray-300 text-xs font-medium">
                  {isTrailerOnly ? "🎬 Trailer" : "🍿 Full Movie"}
                </span>
              </div>

              <h1 className="mb-3 text-3xl font-extrabold leading-tight text-white md:text-6xl">
                {title}
              </h1>
              <p className="mb-6 max-w-2xl text-sm leading-relaxed text-gray-200 md:text-base line-clamp-3">
                {description}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-gray-200 md:text-base"
                  >
                    <Play size={20} fill="black" />
                    {isTrailerOnly ? "Xem trailer" : "Xem ngay"}
                  </Link>
                )}
                {featuredMovie?.slug && (
                  <Link
                    href={`/movies/${featuredMovie.slug}`}
                    className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20 md:text-base"
                  >
                    <Info size={20} />
                    Thông tin
                  </Link>
                )}
              </div>

              {slides.length > 1 && (
                <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    key={`progress-${index}-${paused ? "pause" : "play"}`}
                    initial={{ width: "0%" }}
                    animate={{ width: paused ? "0%" : "100%" }}
                    transition={
                      paused
                        ? { duration: 0 }
                        : { duration: AUTO_SLIDE_MS / 1000, ease: "linear" }
                    }
                    className="h-full rounded-full bg-netflix-red"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            aria-label="Slide trước"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/75 md:left-6 md:p-3"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={goNext}
            aria-label="Slide tiếp"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/45 p-2 text-white backdrop-blur transition hover:bg-black/75 md:right-6 md:p-3"
          >
            <ChevronRight size={22} />
          </button>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 md:bottom-4">
            {slides.map((_, i) => (
              <button
                key={i}
                aria-label={`Chuyển slide ${i + 1}`}
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={`h-2.5 rounded-full transition-all ${
                  i === index
                    ? "w-8 bg-white"
                    : "w-2.5 bg-white/45 hover:bg-white/85"
                }`}
              />
            ))}
          </div>

          <div className="absolute bottom-3 right-3 z-20 hidden items-center gap-2 rounded-xl border border-white/20 bg-black/45 p-2 backdrop-blur lg:flex">
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
                  className={`relative h-14 w-10 overflow-hidden rounded-md border transition ${
                    active
                      ? "scale-105 border-white ring-1 ring-white"
                      : "border-white/20 opacity-80 hover:opacity-100"
                  }`}
                  aria-label={`Xem phim ${movie.name || movie.title || i + 1}`}
                >
                  <Image
                    src={thumb}
                    alt={movie.name || movie.title || "thumb"}
                    fill
                    quality={88}
                    sizes="40px"
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
