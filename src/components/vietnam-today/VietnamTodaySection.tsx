"use client";

import React, { useMemo } from "react";
import { VietnamTodayCard } from "./VietnamTodayCard";
import { VietnamFlagIcon } from "./VietnamFlagIcon";
import { getVietnamTodayEvent, VietnamTodayInfo } from "@/lib/vietnamCalendar";

export function VietnamTodaySection() {
  // Compute event based on current Vietnam date
  const info: VietnamTodayInfo = useMemo(() => {
    return getVietnamTodayEvent();
  }, []);

  const handleOpenModal = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-vietnam-today-modal", {
          detail: { tab: "holiday" },
        })
      );
    }
  };

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
        onOpenModal={handleOpenModal}
      />
    </section>
  );
}
