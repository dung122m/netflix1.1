"use client";

import React, { useState, useRef, useEffect, useId, useCallback } from "react";

export type TooltipSide = "top" | "bottom" | "left" | "right";
export type TooltipAlign = "center" | "start" | "end";

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  side?: TooltipSide;
  align?: TooltipAlign;
  delayMs?: number;
  disabled?: boolean;
  className?: string;
  wrapperClassName?: string;
  children: React.ReactNode;
}

/**
 * Unified Dark Cinema Tooltip component for Nanaflix.
 * Follows Netflix-grade visual taste with backdrop blur, subtle borders,
 * keyboard accessibility, hover delay, and touch friendliness.
 */
export function Tooltip({
  content,
  shortcut,
  side = "top",
  align = "center",
  delayMs = 150,
  disabled = false,
  className = "",
  wrapperClassName = "",
  children,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipId = useId();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (disabled || !content) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);
  }, [disabled, content, clearTimer, delayMs]);

  const handleMouseLeave = useCallback(() => {
    clearTimer();
    setIsOpen(false);
  }, [clearTimer]);

  const handleFocus = useCallback(() => {
    if (disabled || !content) return;
    clearTimer();
    setIsOpen(true);
  }, [disabled, content, clearTimer]);

  const handleBlur = useCallback(() => {
    clearTimer();
    setIsOpen(false);
  }, [clearTimer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  // Positioning logic
  let positionClass = "";
  let arrowClass = "";

  if (side === "top") {
    if (align === "start") {
      positionClass = "bottom-full mb-2 left-0";
      arrowClass = "-bottom-1 left-[18px] -translate-x-1/2";
    } else if (align === "end") {
      positionClass = "bottom-full mb-2 right-0";
      arrowClass = "-bottom-1 right-[18px] translate-x-1/2";
    } else {
      positionClass = "bottom-full mb-2 left-1/2 -translate-x-1/2";
      arrowClass = "-bottom-1 left-1/2 -translate-x-1/2";
    }
    arrowClass += " border-b border-r";
  } else if (side === "bottom") {
    if (align === "start") {
      positionClass = "top-full mt-2 left-0";
      arrowClass = "-top-1 left-[18px] -translate-x-1/2";
    } else if (align === "end") {
      positionClass = "top-full mt-2 right-0";
      arrowClass = "-top-1 right-[18px] translate-x-1/2";
    } else {
      positionClass = "top-full mt-2 left-1/2 -translate-x-1/2";
      arrowClass = "-top-1 left-1/2 -translate-x-1/2";
    }
    arrowClass += " border-t border-l";
  } else if (side === "left") {
    positionClass = "right-full mr-2 top-1/2 -translate-y-1/2";
    arrowClass = "-right-1 top-1/2 -translate-y-1/2 border-t border-r";
  } else if (side === "right") {
    positionClass = "left-full ml-2 top-1/2 -translate-y-1/2";
    arrowClass = "-left-1 top-1/2 -translate-y-1/2 border-b border-l";
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${wrapperClassName}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {children}

      {/* Tooltip Content Container */}
      <div
        id={tooltipId}
        role="tooltip"
        aria-hidden={!isOpen}
        className={`pointer-events-none select-none absolute z-50 whitespace-nowrap px-2.5 py-1 rounded-lg bg-zinc-900/95 backdrop-blur-md text-zinc-100 text-[11px] font-medium tracking-normal border border-white/15 shadow-[0_8px_20px_rgba(0,0,0,0.85)] transition-all duration-150 ease-out hidden sm:flex items-center gap-1.5 ${positionClass} ${
          isOpen
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 pointer-events-none " +
              (side === "top" ? "translate-y-1" : side === "bottom" ? "-translate-y-1" : "")
        } ${className}`}
      >
        <span>{content}</span>
        {shortcut && (
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-zinc-300 border border-white/10 leading-none">
            {shortcut}
          </kbd>
        )}
        {/* Micro Arrow */}
        <div
          className={`absolute w-2 h-2 rotate-45 bg-zinc-900 ${arrowClass} border-white/15`}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default Tooltip;
