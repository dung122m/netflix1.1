"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselNavButtonProps {
  direction: "left" | "right";
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
  topOffsetClass?: string;
  visible?: boolean;
}

export function CarouselNavButton({
  direction,
  onClick,
  ariaLabel,
  className = "",
  topOffsetClass = "top-[38%]",
  visible = true,
}: CarouselNavButtonProps) {
  if (!visible) return null;

  const isLeft = direction === "left";
  const defaultAria = isLeft ? "Cuộn sang trái" : "Cuộn sang phải";
  const posClass = isLeft ? "left-2 sm:left-3" : "right-2 sm:right-3";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || defaultAria}
      className={`hidden sm:flex absolute ${posClass} ${topOffsetClass} -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-zinc-950/80 hover:bg-zinc-900 text-white items-center justify-center border border-white/20 backdrop-blur-md shadow-2xl opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transform-none ${className}`}
    >
      {isLeft ? (
        <ChevronLeft className="w-5 h-5 text-white" />
      ) : (
        <ChevronRight className="w-5 h-5 text-white" />
      )}
    </button>
  );
}

export default CarouselNavButton;
