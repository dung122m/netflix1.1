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
  const posClass = isLeft ? "left-2 sm:left-3 md:left-4" : "right-2 sm:right-3 md:right-4";

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      aria-hidden={!isInteractive}
      aria-label={ariaLabel || defaultAria}
      className={`group/btn hidden sm:flex absolute ${posClass} ${topOffsetClass} -translate-y-1/2 z-30 w-11 h-11 md:w-12 md:h-12 rounded-full items-center justify-center cursor-pointer outline-none select-none ${
        isInteractive
          ? "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 scale-95 group-hover/row:scale-100 pointer-events-none group-hover/row:pointer-events-auto focus-visible:pointer-events-auto"
          : "opacity-0 pointer-events-none scale-75 invisible"
      } bg-gradient-to-b from-zinc-900/90 via-zinc-950/90 to-black/95 hover:from-zinc-800/95 hover:via-zinc-900/95 hover:to-zinc-950 text-white border border-white/20 hover:border-white/50 active:border-white/80 backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.9),0_0_20px_rgba(229,9,20,0.3),inset_0_1px_2px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-90 transition-all duration-300 ease-out focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black motion-reduce:transform-none ${className}`}
    >
      {/* Subtle radial sheen effect */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/5 to-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"
        aria-hidden="true"
      />

      {isLeft ? (
        <ChevronLeft
          strokeWidth={2.5}
          className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transform group-hover/btn:-translate-x-0.5 transition-transform duration-200"
        />
      ) : (
        <ChevronRight
          strokeWidth={2.5}
          className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transform group-hover/btn:translate-x-0.5 transition-transform duration-200"
        />
      )}
    </button>
  );
}

export default CarouselNavButton;
