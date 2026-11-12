"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let lastState = false;
    const handleScroll = () => {
      const isVisible = window.scrollY > 400;
      if (isVisible !== lastState) {
        lastState = isVisible;
        setVisible(isVisible);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:bottom-24 sm:right-6 lg:bottom-8 lg:right-6 z-40 pointer-events-auto">
      <Tooltip content="Cuộn lên đầu trang" side="left">
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Cuộn lên đầu trang"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-zinc-900/95 text-white shadow-[0_8px_24px_rgba(0,0,0,0.7)] backdrop-blur-md flex items-center justify-center transition-all duration-300 hover:bg-netflix-red hover:scale-110 active:scale-95 cursor-pointer animate-in fade-in zoom-in-90"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      </Tooltip>
    </div>
  );
}

export default BackToTop;
