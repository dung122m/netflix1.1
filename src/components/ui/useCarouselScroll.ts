"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface UseCarouselScrollOptions {
  /**
   * Tùy chọn reset cuộn về 0 khi trigger thay đổi (ví dụ: đổi tab hoặc đổi danh sách)
   */
  resetTrigger?: unknown;
  /**
   * Tỷ lệ cuộn mặc định theo chiều rộng container (mặc định: 0.75 nếu không tìm thấy card con)
   */
  defaultStepRatio?: number;
  /**
   * Class selector của thẻ con để tính bước nhảy scroll chính xác (mặc định: '.snap-start')
   */
  cardSelector?: string;
  /**
   * Khoảng đệm phát hiện chạm biên (mặc định: 8px)
   */
  boundaryThreshold?: number;
}

export function useCarouselScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseCarouselScrollOptions = {}
) {
  const {
    resetTrigger,
    defaultStepRatio = 0.75,
    cardSelector = ".snap-start",
    boundaryThreshold = 8,
  } = options;

  const scrollRef = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const firstCard = cardSelector ? el.querySelector<HTMLElement>(cardSelector) : null;
      const isAtStart =
        scrollLeft <= boundaryThreshold ||
        (firstCard
          ? firstCard.getBoundingClientRect().left >= el.getBoundingClientRect().left - 2
          : scrollLeft <= boundaryThreshold);
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - boundaryThreshold;

      setCanScrollLeft(!isAtStart);
      setCanScrollRight(!isAtEnd);
    });
  }, [boundaryThreshold, cardSelector]);

  // Reset scroll về đầu khi resetTrigger thay đổi (ví dụ đổi tab)
  useEffect(() => {
    if (resetTrigger !== undefined && scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    checkScroll();
  }, [resetTrigger, checkScroll]);

  // Lắng nghe sự kiện scrollend và window resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    const onScrollEnd = () => checkScroll();
    el.addEventListener("scrollend", onScrollEnd, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      el.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const handleScroll = useCallback(
    (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;

      const cardEl = cardSelector ? el.querySelector<HTMLElement>(cardSelector) : null;
      const step = cardEl
        ? (cardEl.offsetWidth + 16) *
          Math.max(1, Math.floor(el.clientWidth / (cardEl.offsetWidth + 16)))
        : el.clientWidth * defaultStepRatio;

      el.scrollBy({
        left: direction === "left" ? -step : step,
        behavior: "smooth",
      });

      // Kiểm tra lại trạng thái sau hiệu ứng cuộn
      setTimeout(checkScroll, 150);
      setTimeout(checkScroll, 400);
    },
    [cardSelector, defaultStepRatio, checkScroll]
  );

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    handleScroll,
  };
}

