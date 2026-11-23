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
    const handleScroll = () => {
      if (isClickScrollingRef.current) return;

      const isPlayerSticky = typeof document !== "undefined" && document.documentElement.dataset.playerSticky === "true";
      const navbarHeight = typeof window !== "undefined"
        ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--navbar-height")) || 56)
        : 56;
      const cssStickyPlayerH = typeof window !== "undefined"
        ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sticky-player-height"))
        : 0;
      const stickyPlayerHeight = (cssStickyPlayerH > 0)
        ? cssStickyPlayerH
        : (32 + Math.min(window.innerWidth * 0.5625, window.innerHeight * 0.38));
      const navHeight = 46;
      const triggerOffset = isPlayerSticky
        ? (navbarHeight + stickyPlayerHeight + navHeight + 10)
        : (navbarHeight + navHeight + 15);

      // Sắp xếp các section theo vị trí top thực tế trên viewport
      const foundSections = sections
        .map((sec) => {
          const el = document.getElementById(sec.id);
          return el ? { id: sec.id, top: el.getBoundingClientRect().top } : null;
        })
        .filter((item): item is { id: string; top: number } => item !== null)
        .sort((a, b) => a.top - b.top);

      if (foundSections.length === 0) return;

      // Tìm section cuối cùng đã vượt qua triggerOffset (đang hiển thị trong tầm nhìn)
      const pastTrigger = foundSections.filter((item) => item.top <= triggerOffset);
      if (pastTrigger.length > 0) {
        setActiveSection(pastTrigger[pastTrigger.length - 1].id);
      } else {
        setActiveSection(foundSections[0].id);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
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
      const navbarHeight = typeof window !== "undefined"
        ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--navbar-height")) || 56)
        : 56;
      const cssStickyPlayerH = typeof window !== "undefined"
        ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sticky-player-height"))
        : 0;
      const stickyPlayerHeight = (cssStickyPlayerH > 0)
        ? cssStickyPlayerH
        : (32 + Math.min(window.innerWidth * 0.5625, window.innerHeight * 0.38));
      const navHeight = 46;
      // Trên mobile (< 1024px), khi nhảy tới bất kỳ section nội dung nào bên dưới, player chắc chắn sẽ ở trạng thái sticky
      const willBeSticky = isPlayerSticky || window.innerWidth < 1024;
      const navOffset = willBeSticky
        ? (navbarHeight + stickyPlayerHeight + navHeight)
        : (navbarHeight + navHeight);
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
      className="mobile-movie-nav-sticky lg:hidden sticky top-[calc(var(--navbar-height,56px)-1px)] z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 bg-zinc-950/95 backdrop-blur-xl border-t border-b border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-[background-color,border-color,box-shadow] duration-200 mb-3 sm:mb-4"
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
