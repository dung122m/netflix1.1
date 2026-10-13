"use client";

import React, { useMemo, useState } from "react";
import { VietnamTodayCard, getEventTabBadge, getCleanEventTitle } from "./VietnamTodayCard";
import { VietnamFlagIcon } from "./VietnamFlagIcon";
import { getVietnamTodayEvent, VietnamTodayInfo } from "@/lib/vietnamCalendar";
import { ScrollFadeContainer } from "@/components/ui/ScrollFadeContainer";

export function VietnamTodaySection() {
  // Aggregate today's events from GitHub History, Hardcoded Events, and Actor Birthdays
  const info: VietnamTodayInfo = useMemo(() => {
    return getVietnamTodayEvent();
  }, []);

  const events = useMemo(() => {
    const list =
      info.allEventsToday && info.allEventsToday.length > 0
        ? info.allEventsToday
        : [info.event];
    // Keep all historical events for today
    return list;
  }, [info]);

  const [selectedEventId, setSelectedEventId] = useState<string>(info.event.id);

  const handleOpenModal = (eventId?: string) => {
    const targetId = eventId || selectedEventId;
    const targetEvent = events.find((e) => e.id === targetId) || info.event;
    const isHistorical =
      Boolean(targetEvent.isHistoricalOnly) ||
      (targetEvent.id.startsWith("hist-") && !targetEvent.meaning && !targetEvent.bannerDescription) ||
      (targetEvent.id.startsWith("he-") && !targetEvent.meaning);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-vietnam-today-modal", {
          detail: {
            tab: isHistorical ? "history" : "holiday",
            eventId: targetId,
          },
        })
      );
    }
  };

  // Định dạng ngày tháng nhỏ gọn, tinh tế chuẩn Apple/Netflix style: "12/10 • 02/09 Âm lịch"
  const solarCompact = info.todaySolar
    ? `${String(info.todaySolar.day).padStart(2, "0")}/${String(info.todaySolar.month).padStart(2, "0")}`
    : "";
  const lunarCompact = info.todayLunar
    ? `${String(info.todayLunar.lunarDay).padStart(2, "0")}/${String(info.todayLunar.lunarMonth).padStart(2, "0")} Âm lịch`
    : "";

  return (
    <section
      aria-label="Hôm Nay Có Gì Đặc Biệt"
      className="my-5 sm:my-7 relative z-10 w-full"
    >
      {/* SECTION HEADER: Chuẩn Netflix/Apple style với 2 tầng rõ ràng */}
      <div className="space-y-2 mb-2.5 sm:mb-3 px-0.5">
        {/* TẦNG 1: Tiêu đề & Ngày tháng song hành (hiển thị cả mobile lẫn desktop không rớt dòng) */}
        <div className="flex items-center justify-between gap-2">
          {/* Bên trái: 🇻🇳 Hôm Nay Có Gì Đặc Biệt */}
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 shrink-0">
            <VietnamFlagIcon className="w-5 h-3.5 shadow shrink-0" />
            <span className="truncate">Hôm Nay Có Gì Đặc Biệt</span>
          </h2>

          {/* Bên phải: 12/10 • 02/09 Âm lịch (font nhỏ gọn, tinh tế màu vàng nhạt/xám bạc) */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium shrink-0 ml-auto whitespace-nowrap">
            <span className="text-zinc-400 font-medium">{solarCompact}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-amber-300/90 font-semibold">{lunarCompact}</span>
          </div>
        </div>

        {/* TẦNG 2: Dải sự kiện full chiều ngang 100%, vuốt ngang mượt mà, không cắt chữ */}
        {events.length > 1 && (
          <ScrollFadeContainer
            className="w-full"
            scrollClassName="gap-1.5 sm:gap-2 py-0.5 px-0.5"
            activeChildTrigger={selectedEventId}
          >
            {events.map((ev) => {
              const isSelected = ev.id === (selectedEventId || events[0].id);
              const { label, emoji } = getEventTabBadge(ev);
              return (
                <button
                  key={ev.id}
                  type="button"
                  role="tab"
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
                  className={`flex-none inline-flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer outline-none focus:ring-2 focus:ring-amber-400 select-none whitespace-nowrap ${
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
          </ScrollFadeContainer>
        )}
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

