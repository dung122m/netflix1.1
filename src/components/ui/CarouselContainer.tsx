"use client";

import React, { useCallback } from "react";
import { CarouselNavButton } from "@/components/ui/CarouselNavButton";
import { useCarouselScroll, UseCarouselScrollOptions } from "@/components/ui/useCarouselScroll";

export interface CarouselContainerProps extends UseCarouselScrollOptions {
  children: React.ReactNode;
  /** ClassName cho container cuộn (track) bên trong */
  className?: string;
  /** ClassName cho wrapper ngoài cùng (chứa cả 2 nút điều hướng) */
  wrapperClassName?: string;
  /** Inline style cho track cuộn (ví dụ: opacity khi đang fading) */
  style?: React.CSSProperties;
  /** Vị trí theo chiều dọc của nút điều hướng (mặc định: 'top-[40%]') */
  navOffsetClass?: string;
  /** Nhãn Aria cho nút cuộn trái/phải */
  leftAriaLabel?: string;
  rightAriaLabel?: string;
  /** Tùy chọn ẩn nút điều hướng (ví dụ trên layout đặc thù) */
  showNavButtons?: boolean;
  /** Callback tùy chọn khi container cuộn */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function CarouselContainer({
  children,
  className = "",
  wrapperClassName = "",
  style,
  navOffsetClass = "top-[40%]",
  leftAriaLabel = "Cuộn danh sách sang trái",
  rightAriaLabel = "Cuộn danh sách sang phải",
  showNavButtons = true,
  onScroll,
  resetTrigger,
  watchTrigger,
  defaultStepRatio = 0.82,
  cardSelector = ".snap-start",
  boundaryThreshold = 8,
}: CarouselContainerProps) {
  const {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    checkScroll,
    handleScroll,
  } = useCarouselScroll<HTMLDivElement>({
    resetTrigger,
    watchTrigger,
    defaultStepRatio,
    cardSelector,
    boundaryThreshold,
  });

  const handleCombinedScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      checkScroll();
      if (onScroll) onScroll(e);
    },
    [checkScroll, onScroll]
  );

  return (
    <div className={`relative group/row ${wrapperClassName}`}>
      {showNavButtons && (
        <>
          <CarouselNavButton
            direction="left"
            onClick={() => handleScroll("left")}
            visible={canScrollLeft}
            ariaLabel={leftAriaLabel}
            topOffsetClass={navOffsetClass}
          />
          <CarouselNavButton
            direction="right"
            onClick={() => handleScroll("right")}
            visible={canScrollRight}
            ariaLabel={rightAriaLabel}
            topOffsetClass={navOffsetClass}
          />
        </>
      )}

      <div
        ref={scrollRef}
        onScroll={handleCombinedScroll}
        className={`flex overflow-x-auto overflow-y-hidden scrollbar-none snap-x snap-mandatory md:snap-proximity [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${className}`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default CarouselContainer;
