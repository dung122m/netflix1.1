"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Film, Info, MessageSquare, Sparkles } from "lucide-react";

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
      icon: Sparkles,
    },
  ], [isSeries]);

  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrollingRef.current) return;

      const triggerOffset = 130; // Pixel threshold dưới sticky bar

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
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
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
      className="lg:hidden sticky top-[52px] sm:top-[56px] z-30 -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 bg-zinc-950/90 backdrop-blur-xl border-y border-white/10 shadow-lg transition-all"
    >
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {sections.map(({ id, label, icon: Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => scrollToSection(id)}
              className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 py-1.5 sm:py-2 px-1 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white/15 text-white shadow-sm border border-white/20 font-bold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Icon
                size={13}
                className={isActive ? "text-netflix-red shrink-0" : "text-zinc-400 shrink-0"}
              />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MobileMovieNav;
