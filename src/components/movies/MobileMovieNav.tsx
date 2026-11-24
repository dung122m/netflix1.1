"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Film, Info, MessageSquare, Compass } from "lucide-react";

interface MobileMovieNavProps {
  isSeries?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

export function MobileMovieNav({ isSeries = true }: MobileMovieNavProps) {
  const [activeSection, setActiveSection] = useState<string>("section-episodes");
  const isClickScrollingRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sections: NavSection[] = React.useMemo(() => [
    {
      id: "section-episodes",
      label: isSeries ? "Tập phim" : "Nguồn phát",
      icon: Film,
    },
    {
      id: "section-info",
      label: "Thông tin",
      icon: Info,
    },
    {
      id: "section-reviews",
      label: "Bình luận",
      icon: MessageSquare,
    },
    {
      id: "section-recommendations",
      label: "Đề xuất",
      icon: Compass,
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
      const stickyPlayerHeight = 32 + Math.min(window.innerWidth * 0.5625, window.innerHeight * 0.38);
      const willBeSticky = isPlayerSticky || window.innerWidth < 1024;
      const navOffset = willBeSticky
        ? (56 + stickyPlayerHeight + 44)
        : (56 + 46);
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
      className="mobile-movie-nav-sticky lg:hidden sticky top-[calc(var(--navbar-height,56px)-1px)] z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 bg-zinc-950 backdrop-blur-xl border-t border-b border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-[background-color,border-color,box-shadow] duration-200 mb-3 sm:mb-4"
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
        {sections.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => scrollToSection(id)}
              className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2 px-2.5 sm:px-3 rounded-xl text-xs sm:text-[13px] font-semibold min-h-[38px] transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white/15 text-white shadow-sm font-bold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              <Icon
                size={13}
                className={isActive ? "text-netflix-red shrink-0" : "text-zinc-400 shrink-0"}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MobileMovieNav;
