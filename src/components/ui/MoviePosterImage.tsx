"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image, { ImageProps } from "next/image";
import { useMoviePosterFallback } from "@/hooks/useMoviePosterFallback";
import { isSlowProviderSourceUrl } from "@/lib/movieMedia";

export interface MoviePosterImageProps extends Omit<ImageProps, "src" | "alt"> {
  src?: string | null;
  alt: string;
  slug?: string;
  title?: string;
  origin_name?: string;
  year?: string | number;
  type?: string;
  tmdbId?: string | number;
  preferBackdrop?: boolean;
  fallbackSrc?: string;
}

/**
 * Component hiển thị Poster / Backdrop chuẩn thống nhất cho toàn dự án:
 * 1. Ưu tiên tuyệt đối TMDb CDN chính hãng (`image.tmdb.org`) siêu nhẹ (~35KB WebP, 0ms CPU, 0đ R2).
 * 2. Nếu là nguồn phimimg/nguonc, tự động kích hoạt tra cứu TMDb qua `useMoviePosterFallback`.
 * 3. CHỈ KHI TMDb hoàn toàn không có ảnh và ảnh gốc gặp lỗi (`onError`), mới dùng R2 proxy làm cứu cánh cuối cùng.
 */
export function MoviePosterImage({
  src,
  alt,
  slug,
  title,
  origin_name,
  year,
  type,
  tmdbId,
  preferBackdrop = false,
  fallbackSrc = "/default-poster.jpg",
  className,
  ...rest
}: MoviePosterImageProps) {
  const rawSrc = src ? String(src).trim() : "";
  const isBrokenOrEmpty = !rawSrc || rawSrc.includes("/default-");
  const isSlow = isSlowProviderSourceUrl(rawSrc);

  const { displaySrc, triggerFallback } = useMoviePosterFallback({
    slug,
    title,
    origin_name,
    year,
    type,
    tmdbId,
    initialSrc: rawSrc,
    preferBackdrop,
    enabled: isBrokenOrEmpty || isSlow,
    upgradePhimimg: true,
  });

  const [hasError, setHasError] = useState(false);
  const targetSrc = displaySrc || rawSrc || fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState<string>(targetSrc);

  useEffect(() => {
    if (displaySrc && displaySrc !== currentSrc) {
      setCurrentSrc(displaySrc);
      setHasError(false);
    }
  }, [displaySrc, currentSrc]);

  const handleImageError = useCallback(() => {
    // 1. Nếu ảnh lỗi và chưa gọi TMDb fallback, kích hoạt fallback
    if (!isBrokenOrEmpty && displaySrc === rawSrc) {
      triggerFallback();
      return;
    }

    setHasError(true);
  }, [isBrokenOrEmpty, displaySrc, rawSrc, triggerFallback]);

  const finalSrc = hasError || !currentSrc ? fallbackSrc : currentSrc;

  return (
    <Image
      src={finalSrc}
      alt={alt}
      className={className}
      onError={handleImageError}
      {...rest}
    />
  );
}
