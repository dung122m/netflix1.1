"use client";

import React, { useMemo, useState } from "react";
import { VietnamTodayCard, getEventTabBadge, getCleanEventTitle } from "./VietnamTodayCard";
import { VietnamFlagIcon } from "./VietnamFlagIcon";
import { getVietnamTodayEvent, VietnamTodayInfo } from "@/lib/vietnamCalendar";

export function VietnamTodaySection() {
  // Compute event based on current Vietnam date
  const info: VietnamTodayInfo = useMemo(() => {
    return getVietnamTodayEvent();
  }, []);

  const events = useMemo(() => {
    return info.allEventsToday && info.allEventsToday.length > 0
      ? info.allEventsToday
      : [info.event];
  }, [info]);

  const [selectedEventId, setSelectedEventId] = useState<string>(info.event.id);

  const handleOpenModal = (eventId?: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-vietnam-today-modal", {
          detail: { tab: "holiday", eventId: eventId || selectedEventId },
        })
      );
    }
  };

  return (
    <section
      aria-label="Hôm Nay Có Gì Đặc Biệt"
      className="my-5 sm:my-7 relative z-10 w-full"
    >
      {/* SECTION HEADER: Title & Event Selector Tabs together on the left, Date info on the right */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-2.5 sm:mb-3 px-0.5">
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 flex-shrink-0">
            <VietnamFlagIcon className="w-5 h-3.5 shadow" />
            <span>Hôm Nay Có Gì Đặc Biệt</span>
          </h2>

          {/* EVENT SELECTOR TABS placed directly next to the title */}
          {events.length > 1 && (
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 px-1 max-w-full">
              {events.map((ev) => {
                const isSelected = ev.id === (selectedEventId || events[0].id);
                const { label, emoji } = getEventTabBadge(ev);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    tabIndex={0}
                    onClick={() => setSelectedEventId(ev.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedEventId(ev.id);
                      }
                    }}
                    aria-selected={isSelected}
                    aria-label={`Chọn sự kiện ${getCleanEventTitle(ev.title)}`}
                    className={`flex-none inline-flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-amber-400 select-none ${
                      isSelected
                        ? "bg-zinc-800 text-amber-300 font-semibold border border-amber-400/40 shadow-sm shadow-amber-950/30 backdrop-blur-md"
                        : "bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-white/10 backdrop-blur-sm"
                    }`}
                  >
                    <span className="text-sm">{emoji}</span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Real-time date indicator in Vietnam */}
        <div className="text-xs text-zinc-400 font-medium hidden md:flex items-center gap-2 flex-shrink-0 ml-auto pl-2">
          <span>{info.solarDateFormatted}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-amber-300/80">{info.lunarDateFormatted}</span>
        </div>
      </div>

      {/* FEATURE CARD */}
      <VietnamTodayCard
        info={info}
        selectedEventId={selectedEventId}
        onOpenModal={handleOpenModal}
      />
    </section>
  );
}

