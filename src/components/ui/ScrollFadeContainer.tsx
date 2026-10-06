"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface ScrollFadeContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  scrollClassName?: string;
  fadeColor?: string;
  showLeftFade?: boolean;
  showRightFade?: boolean;
  activeChildTrigger?: unknown;
}

export const ScrollFadeContainer: React.FC<ScrollFadeContainerProps> = ({
  children,
  className = "",
  scrollClassName = "",
  fadeColor = "from-black",
  showLeftFade = true,
  showRightFade = true,
  activeChildTrigger,
  ...props
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 3);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 3);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(checkScroll) : null;
    if (ro) ro.observe(el);

    window.addEventListener("resize", checkScroll);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, activeChildTrigger]);

  return (
    <div className={`relative w-full overflow-hidden ${className}`} {...props}>
      {/* LEFT FADE GRADIENT */}
      {showLeftFade && (
        <div
          className={`pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-r ${fadeColor} via-black/50 to-transparent z-10 transition-opacity duration-200 ${
            canScrollLeft ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      )}

      {/* SCROLLABLE VIEWPORT */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={`flex items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${scrollClassName}`}
      >
        {children}
      </div>

      {/* RIGHT FADE GRADIENT */}
      {showRightFade && (
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-10 bg-gradient-to-l ${fadeColor} via-black/50 to-transparent z-10 transition-opacity duration-200 ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default ScrollFadeContainer;
