"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
   * Tỷ lệ cuộn mặc định theo chiều rộng container (mặc định: 0.85 nếu không tìm thấy card con)
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
  /**
   * Thời gian hiệu ứng trượt mượt mà (ms, mặc định: 520ms)
   */
  duration?: number;
}

export function useCarouselScroll<T extends HTMLElement = HTMLDivElement>(
  options: UseCarouselScrollOptions = {}
) {
  const {
    resetTrigger,
    watchTrigger,
    defaultStepRatio = 0.85,
    cardSelector = ".snap-start",
    boundaryThreshold = 8,
    duration = 520,
  } = options;

  const scrollRef = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);

  // Trạng thái hiển thị mũi tên trái / phải
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Quản lý animation mượt mà
  const isAnimatingRef = useRef(false);
  const animationTargetRef = useRef<number | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const originalStylesRef = useRef<{ snapType: string; scrollBehavior: string } | null>(null);

  /**
   * Khôi phục thuộc tính CSS gốc của container sau khi trượt xong
   */
  const restoreOriginalStyles = useCallback((el: HTMLElement) => {
    if (originalStylesRef.current) {
      el.style.scrollSnapType = originalStylesRef.current.snapType;
      el.style.scrollBehavior = originalStylesRef.current.scrollBehavior;
      originalStylesRef.current = null;
    }
    isAnimatingRef.current = false;
    animationTargetRef.current = null;
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
  }, []);

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
      const el = scrollRef.current;
      restoreOriginalStyles(el);
      el.scrollLeft = 0;
    }
    checkScroll();
  }, [resetTrigger, checkScroll, restoreOriginalStyles]);

  // 2. Tự động kiểm tra biên khi watchTrigger thay đổi (ví dụ danh sách items hoàn tất tải)
  useEffect(() => {
    checkScroll();
  }, [watchTrigger, checkScroll]);

  // 3. Toàn diện Observer: ResizeObserver, MutationObserver & Scroll Event
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

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

    // Lắng nghe sự kiện scroll thủ công của người dùng
    const onScroll = () => {
      if (!isAnimatingRef.current) {
        checkScroll();
      }
    };

    // Khi người dùng chạm hoặc lăn chuột thì ngắt ngay animation mượt đang chạy để tránh xung đột
    const onUserInteraction = () => {
      if (isAnimatingRef.current && el) {
        restoreOriginalStyles(el);
        checkScroll();
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("scrollend", checkScroll, { passive: true });
    el.addEventListener("touchstart", onUserInteraction, { passive: true });
    el.addEventListener("wheel", onUserInteraction, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    // Kiểm tra định kỳ sau khi ảnh và fonts định hình layout
    const t1 = setTimeout(checkScroll, 80);
    const t2 = setTimeout(checkScroll, 250);
    const t3 = setTimeout(checkScroll, 700);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      restoreOriginalStyles(el);
      if (resizeObserver) resizeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("scrollend", checkScroll);
      el.removeEventListener("touchstart", onUserInteraction);
      el.removeEventListener("wheel", onUserInteraction);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [checkScroll, restoreOriginalStyles]);

  /**
   * Hiệu ứng trượt cinema mượt mà, căn chỉnh chuẩn thẻ phim (Pixel-Perfect Card Snap)
   */
  const handleScroll = useCallback(
    (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const maxScroll = Math.max(0, scrollWidth - clientWidth);
      if (maxScroll <= 0) return;

      // Danh sách thẻ con trong carousel
      const cards = cardSelector
        ? Array.from(el.querySelectorAll<HTMLElement>(cardSelector))
        : [];

      // Điểm mốc tính toán: nếu người dùng bấm liên tiếp (chaining), lấy mục tiêu đang chạy
      const currentBase =
        isAnimatingRef.current && animationTargetRef.current !== null
          ? animationTargetRef.current
          : scrollLeft;

      let targetScroll = currentBase;

      if (cards.length > 0) {
        const containerRect = el.getBoundingClientRect();
        const paddingLeft =
          typeof window !== "undefined"
            ? parseFloat(window.getComputedStyle(el).paddingLeft) || 16
            : 16;

        // Tính toạ độ tuyệt đối (absolute scroll offset) của từng thẻ
        // Không phụ thuộc vào vị trí cuộn tạm thời của container
        const cardOffsets = cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return Math.round(rect.left - containerRect.left + scrollLeft - paddingLeft);
        });

        if (direction === "right") {
          // Tìm thẻ đầu tiên nằm vượt ngoài khung nhìn hiện tại (tính từ currentBase)
          const targetOffsetThreshold = currentBase + clientWidth - 32;
          const nextCardOffset = cardOffsets.find((offset) => offset >= targetOffsetThreshold);

          if (nextCardOffset !== undefined) {
            targetScroll = Math.min(maxScroll, nextCardOffset);
          } else {
            targetScroll = maxScroll;
          }
        } else {
          // Cuộn ngược sang trái: mục tiêu lùi lại xấp xỉ 1 chiều rộng khung nhìn
          const targetOffsetThreshold = Math.max(0, currentBase - (clientWidth - paddingLeft - 24));

          if (targetOffsetThreshold <= boundaryThreshold) {
            targetScroll = 0;
          } else {
            // Tìm thẻ có toạ độ gần nhất với targetOffsetThreshold
            let closestOffset = 0;
            let minDiff = Infinity;
            for (const offset of cardOffsets) {
              if (offset <= currentBase - 32) {
                const diff = Math.abs(offset - targetOffsetThreshold);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestOffset = offset;
                }
              }
            }
            targetScroll = Math.max(0, closestOffset);
          }
        }
      } else {
        const step = clientWidth * defaultStepRatio;
        targetScroll =
          direction === "right"
            ? Math.min(maxScroll, currentBase + step)
            : Math.max(0, currentBase - step);
      }

      // Giới hạn trong phạm vi cho phép
      targetScroll = Math.max(0, Math.min(maxScroll, Math.round(targetScroll)));

      // Nếu chênh lệch quá nhỏ (dưới 2px) thì không cần chạy animation
      if (Math.abs(targetScroll - scrollLeft) < 2) {
        checkScroll();
        return;
      }

      animationTargetRef.current = targetScroll;

      // Hỗ trợ người dùng bật chế độ giảm chuyển động (prefers-reduced-motion)
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        el.scrollLeft = targetScroll;
        checkScroll();
        return;
      }

      // Hủy animation cũ nếu có
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }

      // Tạm thời vô hiệu hóa scroll-snap và CSS scroll-smooth để tránh giật lag / khựng hình
      if (!isAnimatingRef.current) {
        originalStylesRef.current = {
          snapType: el.style.scrollSnapType,
          scrollBehavior: el.style.scrollBehavior,
        };
        el.style.scrollSnapType = "none";
        el.style.scrollBehavior = "auto";
        isAnimatingRef.current = true;
      }

      const startX = el.scrollLeft;
      const distance = targetScroll - startX;
      let startTime: number | null = null;

      // Easing Curve cao cấp: Quintic Ease-Out (1 - (1 - t)^4)
      // Cho cảm giác lướt tức thì khi bấm và hãm phanh êm ái như phòng chiếu rạp
      const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

      const stepAnimation = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeOutQuart(progress);

        el.scrollLeft = Math.round(startX + distance * eased);

        if (progress < 1) {
          animationIdRef.current = requestAnimationFrame(stepAnimation);
        } else {
          el.scrollLeft = targetScroll;
          restoreOriginalStyles(el);
          checkScroll();
        }
      };

      animationIdRef.current = requestAnimationFrame(stepAnimation);
    },
    [cardSelector, defaultStepRatio, duration, boundaryThreshold, checkScroll, restoreOriginalStyles]
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
