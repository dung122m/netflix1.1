"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { VietnamTodayCard } from "./VietnamTodayCard";
import { VietnamFlagIcon } from "./VietnamFlagIcon";
import { getVietnamTodayEvent, VietnamTodayInfo } from "@/lib/vietnamCalendar";

// Lazy-load modal to keep initial bundle ultra-light
const LazyVietnamTodayModal = dynamic(
  () => import("./VietnamTodayModal").then((mod) => mod.VietnamTodayModal),
  { ssr: false }
);

export function VietnamTodaySection() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Compute event based on current Vietnam date
  const info: VietnamTodayInfo = useMemo(() => {
    return getVietnamTodayEvent();
  }, []);

  return (
    <section
      aria-label="Hôm Nay Tại Việt Nam"
      className="my-5 sm:my-7 relative z-10 w-full"
    >
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
          <VietnamFlagIcon className="w-5 h-3.5 shadow" />
          <span>Hôm Nay Tại Việt Nam</span>
        </h2>

        {/* Real-time date indicator in Vietnam */}
        <div className="text-xs text-zinc-400 font-medium hidden sm:flex items-center gap-2">
          <span>{info.solarDateFormatted}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-amber-300/80">{info.lunarDateFormatted}</span>
        </div>
      </div>

      {/* FEATURE CARD */}
      <VietnamTodayCard
        info={info}
        onOpenModal={() => setIsModalOpen(true)}
      />

      {/* LAZY LOADED POPUP MODAL */}
      {isModalOpen && (
        <LazyVietnamTodayModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          info={info}
        />
      )}
    </section>
  );
}
