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
  year?: string | number;
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
  year,
  tmdbId,
  preferBackdrop = false,
  fallbackSrc = "/default-poster.jpg",
  className,
  ...rest
}: MoviePosterImageProps) {
  const rawSrc = src ? String(src).trim() : "";
  const isTmdb = Boolean(rawSrc && rawSrc.includes("image.tmdb.org"));
  const isSlow = isSlowProviderSourceUrl(rawSrc);

  const { displaySrc } = useMoviePosterFallback({
    slug,
    title,
    year,
    tmdbId,
    initialSrc: rawSrc,
    preferBackdrop,
    enabled: isSlow && !isTmdb,
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
    // Chỉ kích hoạt R2 proxy khi TMDb thất bại và ảnh gốc (phimimg/nguonc) bị lỗi/chặn
    if (
      currentSrc &&
      (currentSrc.includes("phimimg.com") || currentSrc.includes("nguonc.com") || currentSrc.includes("/cache/")) &&
      !currentSrc.includes("/api/media/r2-proxy")
    ) {
      const proxyUrl = `/api/media/r2-proxy?url=${encodeURIComponent(currentSrc)}&title=${encodeURIComponent(title || alt || "")}&slug=${encodeURIComponent(slug || "")}`;
      setCurrentSrc(proxyUrl);
      return;
    }
    setHasError(true);
  }, [currentSrc, title, alt, slug]);

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
