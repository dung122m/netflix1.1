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

      const paddingLeft =
        typeof window !== "undefined"
          ? parseFloat(window.getComputedStyle(el).paddingLeft) || 0
          : 0;

      const cards = cardSelector
        ? Array.from(el.querySelectorAll<HTMLElement>(cardSelector))
        : [];

      let targetScroll: number;

      if (cards.length > 0) {
        // Toạ độ cuộn chuẩn để đưa thẻ snap vào mép trái container:
        const cardSnapOffsets = cards.map((card) => Math.max(0, card.offsetLeft - paddingLeft));

        if (direction === "right") {
          // Khi trượt sang phải: lướt qua các thẻ hiện tại, giữ lại 1 thẻ để tạo điểm tựa mắt (context)
          const targetThreshold = scrollLeft + clientWidth * 0.82;

          // Tìm thẻ đầu tiên nằm vượt ngoài khung nhìn hiện tại
          const nextCardOffset = cardSnapOffsets.find(
            (offset) => offset > scrollLeft + 24 && offset >= targetThreshold - 40
          );

          if (nextCardOffset !== undefined) {
            targetScroll = Math.min(maxScroll, nextCardOffset);
          } else {
            // Nếu không tìm thấy thẻ phù hợp ở ngưỡng 82%, tìm thẻ đầu tiên sau vị trí hiện tại
            const firstNext = cardSnapOffsets.find((offset) => offset > scrollLeft + 32);
            targetScroll = firstNext !== undefined ? Math.min(maxScroll, firstNext) : maxScroll;
          }
        } else {
          // Khi trượt sang trái: lùi lại khoảng 80% khung nhìn
          const targetThreshold = Math.max(0, scrollLeft - clientWidth * 0.82);

          if (targetThreshold <= boundaryThreshold) {
            targetScroll = 0;
          } else {
            // Tìm thẻ có toạ độ gần nhất với targetThreshold nhưng phải nhỏ hơn vị trí hiện tại
            const candidateOffsets = cardSnapOffsets.filter((offset) => offset < scrollLeft - 24);
            if (candidateOffsets.length === 0) {
              targetScroll = 0;
            } else {
              let closest = candidateOffsets[0];
              let minDiff = Math.abs(closest - targetThreshold);
              for (const offset of candidateOffsets) {
                const diff = Math.abs(offset - targetThreshold);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = offset;
                }
              }
              targetScroll = closest;
            }
          }
        }
      } else {
        const step = clientWidth * defaultStepRatio;
        targetScroll =
          direction === "right"
            ? Math.min(maxScroll, scrollLeft + step)
            : Math.max(0, scrollLeft - step);
      }

      // Giới hạn trong phạm vi cho phép
      targetScroll = Math.max(0, Math.min(maxScroll, Math.round(targetScroll)));

      // Trượt mượt mà bằng native GPU compositor của trình duyệt (120Hz/60Hz không giật lag)
      el.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });

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
