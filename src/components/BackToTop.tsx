"use client";

import React, { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

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
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
      className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 lg:bottom-12 lg:right-8 z-40 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-zinc-900/90 border border-white/20 text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:bg-netflix-red hover:border-netflix-red hover:scale-110 active:scale-95 cursor-pointer animate-in fade-in zoom-in-90"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}

export default BackToTop;
