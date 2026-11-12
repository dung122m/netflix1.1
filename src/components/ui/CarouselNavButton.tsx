"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CarouselNavButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  topOffsetClass?: string;
  visible?: boolean;
  disabled?: boolean;
}

export function CarouselNavButton({
  direction,
  onClick,
  ariaLabel,
  className = "",
  topOffsetClass = "top-[40%]",
  visible = true,
  disabled = false,
}: CarouselNavButtonProps) {
  const isLeft = direction === "left";
  const isInteractive = visible && !disabled;
  const defaultAria = isLeft ? "Cuộn danh sách sang trái" : "Cuộn danh sách sang phải";
  const posClass = isLeft ? "left-2 md:left-3" : "right-2 md:right-3";

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      aria-hidden={!isInteractive}
      aria-label={ariaLabel || defaultAria}
      className={`group/btn hidden md:flex max-md:!hidden max-md:!pointer-events-none absolute ${posClass} ${topOffsetClass} -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full items-center justify-center cursor-pointer outline-none select-none ${
        isInteractive
          ? "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 scale-95 group-hover/row:scale-100 pointer-events-none group-hover/row:pointer-events-auto focus-visible:pointer-events-auto"
          : "opacity-0 pointer-events-none scale-75 invisible"
      } bg-zinc-950/90 hover:bg-zinc-900 text-white backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.75)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.9)] hover:scale-105 active:scale-95 transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transform-none ${className}`}
    >
      {/* Subtle radial sheen effect */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/5 to-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
        aria-hidden="true"
      />

      {isLeft ? (
        <ChevronLeft
          strokeWidth={2.5}
          className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transform group-hover/btn:-translate-x-0.5 transition-transform duration-200"
        />
      ) : (
        <ChevronRight
          strokeWidth={2.5}
          className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transform group-hover/btn:translate-x-0.5 transition-transform duration-200"
        />
      )}
    </button>
  );
}

export default CarouselNavButton;
