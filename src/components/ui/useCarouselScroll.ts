"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Easing: ease-out cubic — bắt đầu nhanh, decelerate cuối — cảm giác responsive, tự nhiên
 */
function easeInOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Custom smooth scroll bằng RAF — không phụ thuộc browser native smooth scroll
 * Kiểm soát hoàn toàn duration và easing, nhất quán trên mọi browser/OS
 */
function smoothScrollTo(el: HTMLElement, targetLeft: number, duration = 300): void {
  const startLeft = el.scrollLeft;
  const distance = targetLeft - startLeft;
  if (Math.abs(distance) < 1) return;

  // Tắt snap trong lúc animate để không bị override
  const prevSnap = el.style.scrollSnapType;
  el.style.scrollSnapType = "none";

  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    el.scrollLeft = startLeft + distance * eased;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.scrollLeft = targetLeft;
      // Bật lại snap sau khi animation xong
      el.style.scrollSnapType = prevSnap;
    }
  }

  requestAnimationFrame(step);
}

export interface UseCarouselScrollOptions {
  /**
   * Tùy chọn reset cuộn về 0 khi trigger thay đổi (ví dụ: đổi tab hoặc danh mục)
   */
  resetTrigger?: unknown;
  /**
   * Tùy chọn theo dõi dữ liệu thay đổi để kiểm tra lại biên cuộn mà không reset về 0 (ví dụ: items tải xong)
   */
  watchTrigger?: unknown;
  /**
   * Tỷ lệ cuộn mặc định theo chiều rộng container (mặc định: 0.82 nếu không tìm thấy card con)
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
    watchTrigger,
    defaultStepRatio = 0.82,
    cardSelector = ".snap-start",
    boundaryThreshold = 8,
  } = options;

  const scrollRef = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);

  // Trạng thái hiển thị mũi tên trái / phải
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  /**
   * Kiểm tra chính xác container có thể cuộn sang trái / sang phải hay không
   */
  const checkScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);

      // Nếu chiều dài nội dung chưa tràn container (hoặc đang tải rỗng)
      if (maxScroll <= 4) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }

      const isAtStart = scrollLeft <= boundaryThreshold;
      const isAtEnd = scrollLeft >= maxScroll - boundaryThreshold;

      setCanScrollLeft(!isAtStart);
      setCanScrollRight(!isAtEnd);
    });
  }, [boundaryThreshold]);

  // 1. Reset scroll về đầu khi resetTrigger thay đổi (ví dụ đổi tab danh mục)
  useEffect(() => {
    if (resetTrigger !== undefined && scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
    checkScroll();
  }, [resetTrigger, checkScroll]);

  // 2. Tự động kiểm tra biên khi watchTrigger thay đổi (ví dụ danh sách items hoàn tất tải)
  useEffect(() => {
    checkScroll();
  }, [watchTrigger, checkScroll]);

  // 3. Toàn diện Observer: ResizeObserver, MutationObserver & Scroll Event
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Promote scroll container lên GPU layer để scroll paint mượt hơn
    el.style.willChange = "scroll-position";

    checkScroll();

    // ResizeObserver: Bắt kịp thay đổi kích thước màn hình / container
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });
      resizeObserver.observe(el);
    }

    // MutationObserver: Tự động cập nhật nút mũi tên khi phim tải xong / DOM thay đổi
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        checkScroll();
      });
      mutationObserver.observe(el, { childList: true, subtree: false });
    }

    // Lắng nghe sự kiện scroll của người dùng
    const onScroll = () => {
      checkScroll();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    // Kiểm tra định kỳ sau khi ảnh và fonts định hình layout
    const t1 = setTimeout(checkScroll, 80);
    const t2 = setTimeout(checkScroll, 250);
    const t3 = setTimeout(checkScroll, 700);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [checkScroll]);

  /**
   * Hiệu ứng trượt cinema mượt mà, căn chỉnh chuẩn thẻ phim (Pixel-Perfect Card Snap)
   * Sử dụng Native GPU Compositor Scroll mượt mà 60/120fps, không khựng hình hay giật lag.
   */
  const handleScroll = useCallback(
    (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);
      if (maxScroll <= 0) return;

      const standardStep = Math.max(200, Math.floor(clientWidth * (defaultStepRatio || 0.75)));

      const cards = cardSelector
        ? Array.from(el.querySelectorAll<HTMLElement>(cardSelector))
        : [];

      let targetScroll = scrollLeft;

      if (cards.length > 0) {
        // Dùng offsetLeft thay getBoundingClientRect() — không gây forced reflow
        const paddingLeft = 16; // px-4 mặc định
        const cardPositions = cards
          .map((card) => Math.round(card.offsetLeft - paddingLeft))
          .filter((pos) => !isNaN(pos) && pos >= 0);

        if (direction === "right") {
          // Khi trượt sang phải: lướt qua khoảng 75% màn hình và đáp nhẹ vào thẻ gần nhất
          const targetThreshold = scrollLeft + standardStep;
          const forwardCards = cardPositions.filter((pos) => pos > scrollLeft + 24);

          if (forwardCards.length > 0) {
            let best = forwardCards[0];
            let minDiff = Math.abs(best - targetThreshold);
            for (const pos of forwardCards) {
              const diff = Math.abs(pos - targetThreshold);
              if (diff < minDiff) {
                minDiff = diff;
                best = pos;
              }
            }
            targetScroll = best;
          } else {
            targetScroll = maxScroll;
          }
        } else {
          // Khi trượt sang trái: lùi lại standardStep
          const targetThreshold = Math.max(0, scrollLeft - standardStep);
          const backwardCards = cardPositions.filter((pos) => pos < scrollLeft - 24);

          if (targetThreshold <= boundaryThreshold || backwardCards.length === 0) {
            targetScroll = 0;
          } else {
            let best = backwardCards[backwardCards.length - 1];
            let minDiff = Math.abs(best - targetThreshold);
            for (const pos of backwardCards) {
              const diff = Math.abs(pos - targetThreshold);
              if (diff < minDiff) {
                minDiff = diff;
                best = pos;
              }
            }
            targetScroll = best;
          }
        }
      } else {
        targetScroll =
          direction === "right"
            ? Math.min(maxScroll, scrollLeft + standardStep)
            : Math.max(0, scrollLeft - standardStep);
      }

      // Giới hạn trong phạm vi cho phép
      targetScroll = Math.max(0, Math.min(maxScroll, Math.round(targetScroll)));

      // Custom smooth scroll — ease-out cubic 300ms, không phụ thuộc browser native
      smoothScrollTo(el, targetScroll, 300);

      // Tự động kiểm tra cập nhật lại trạng thái mũi tên
      setTimeout(checkScroll, 350);
      setTimeout(checkScroll, 600);
    },
    [cardSelector, defaultStepRatio, boundaryThreshold, checkScroll]
  );

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    handleScroll,
  };
}

export default useCarouselScroll;
