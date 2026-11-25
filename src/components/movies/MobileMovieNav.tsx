"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

interface MobileMovieNavProps {
  isSeries?: boolean;
}

interface NavSection {
  id: string;
  label: string;
}

export function MobileMovieNav({ isSeries = true }: MobileMovieNavProps) {
  const [activeSection, setActiveSection] = useState<string>("section-episodes");
  const isClickScrollingRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sections: NavSection[] = React.useMemo(() => [
    {
      id: "section-episodes",
      label: isSeries ? "Tập phim" : "Nguồn phát",
    },
    {
      id: "section-info",
      label: "Thông tin",
    },
    {
      id: "section-reviews",
      label: "Bình luận",
    },
    {
      id: "section-recommendations",
      label: "Đề xuất",
    },
  ], [isSeries]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sectionElements = sections
      .map((sec) => document.getElementById(sec.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sectionElements.length === 0) return;

    let rafId: number | null = null;
    let isScheduled = false;

    // Cache offset để không gọi getComputedStyle trên luồng scroll
    let cachedTriggerOffset = 180;
    const updateCachedOffset = () => {
      const isPlayerSticky = document.documentElement.dataset.playerSticky === "true";
      const navHeight = 56;
      const stickyPlayerHeight = 32 + Math.min(window.innerWidth * 0.5625, window.innerHeight * 0.38);
      cachedTriggerOffset = isPlayerSticky
        ? (navHeight + stickyPlayerHeight + 46 + 10)
        : (navHeight + 46 + 15);
    };
    updateCachedOffset();

    const evaluateActiveSection = () => {
      isScheduled = false;
      if (isClickScrollingRef.current) return;

      const offset = cachedTriggerOffset;
      let currentActive = sections[0].id;

      for (let i = 0; i < sectionElements.length; i++) {
        const el = sectionElements[i];
        if (el.getBoundingClientRect().top <= offset) {
          currentActive = el.id;
        } else {
          break;
        }
      }

      setActiveSection((prev) => (prev !== currentActive ? currentActive : prev));
    };

    const handleScroll = () => {
      if (isClickScrollingRef.current || isScheduled) return;
      isScheduled = true;
      rafId = requestAnimationFrame(evaluateActiveSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateCachedOffset, { passive: true });
    evaluateActiveSection();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateCachedOffset);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, [sections]);

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    isClickScrollingRef.current = true;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

    const element = document.getElementById(id);
    if (element) {
      const isPlayerSticky =
        typeof document !== "undefined" &&
        document.documentElement.dataset.playerSticky === "true";
      const stickyPlayerHeight = 28 + Math.min(window.innerWidth * 0.5625, window.innerHeight * 0.38);
      const willBeSticky = isPlayerSticky || window.innerWidth < 1024;
      const navOffset = willBeSticky
        ? (56 + stickyPlayerHeight + 48)
        : (56 + 48);
      const targetY = element.getBoundingClientRect().top + window.scrollY - navOffset;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "smooth",
      });
    }

    clickTimeoutRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 700);
  }, []);

  return (
    <div
      role="tablist"
      aria-label="Điều hướng nhanh nội dung phim"
      className="mobile-movie-nav-sticky lg:hidden sticky top-[calc(var(--navbar-height,56px)-1px)] z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 bg-zinc-950/95 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-[background-color,border-color,box-shadow] duration-200 mb-3 sm:mb-4"
    >
      <div className="grid grid-cols-4 w-full">
        {sections.map(({ id, label }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => scrollToSection(id)}
              className={`relative flex items-center justify-center py-2.5 px-1 text-xs font-semibold min-h-[42px] transition-colors duration-200 active:opacity-75 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-white font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="truncate">{label}</span>
              {isActive && (
                <span className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-netflix-red" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MobileMovieNav;
