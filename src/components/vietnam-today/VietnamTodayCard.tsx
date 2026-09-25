"use client";

import React, { useState } from "react";
import { ArrowRight, Sparkles, Calendar } from "lucide-react";
import { VietnamTodayInfo } from "@/lib/vietnamCalendar";
import { VietnamEvent } from "@/data/events/types";
import { VietnamEventEffect } from "./VietnamEventEffect";
import { VietnamFlagIcon } from "./VietnamFlagIcon";

function getEventActionLabel(event: VietnamEvent): string {
  switch (event.nature) {
    case "official-holiday":
      return "Tìm hiểu ngày đại lễ";
    case "historical-anniversary":
      return "Khám phá mốc son lịch sử";
    case "traditional-festival":
      return "Khám phá phong tục lễ hội";
    case "international-day":
      return "Tìm hiểu ý nghĩa ngày này";
    case "social-observance":
      return "Tìm hiểu ý nghĩa ngày kỷ niệm";
    case "arts-culture":
      return "Khám phá nét đẹp văn hóa";
    case "theme-day":
      return "Khám phá ngày chủ đề";
    default:
      break;
  }

  // Fallback by category
  switch (event.category) {
    case "vietnam-history":
      return "Khám phá mốc son lịch sử";
    case "traditional-culture":
      return "Khám phá nét đẹp văn hóa";
    case "national-holiday":
      return "Tìm hiểu ngày đại lễ";
    case "international":
      return "Tìm hiểu ý nghĩa ngày này";
    case "social-family":
      return "Tìm hiểu ý nghĩa ngày kỷ niệm";
    default:
      return "Tìm hiểu chi tiết sự kiện";
  }
}

interface VietnamTodayCardProps {
  info: VietnamTodayInfo;
  onOpenModal: () => void;
}

export function VietnamTodayCard({ info, onOpenModal }: VietnamTodayCardProps) {
  const [imageError, setImageError] = useState(false);
  const { event, isToday, badgeLabel, badgeSub } = info;

  const accentGradient = event.accentGradient || "from-amber-600/30 via-red-600/20 to-zinc-950";

  const holidayBorderClass = (() => {
    if (!event.effect) {
      return isToday
        ? "border-red-500/30 hover:border-amber-500/60 bg-zinc-950 shadow-red-950/20 hover:shadow-amber-950/30"
        : "border-white/10 hover:border-white/25 bg-zinc-950/90 shadow-black/40 hover:shadow-amber-500/10";
    }
    switch (event.effect) {
      case "mid-autumn":
        return "border-amber-500/50 hover:border-amber-400/80 bg-zinc-950 shadow-[0_0_28px_rgba(245,158,11,0.22)] hover:shadow-[0_0_35px_rgba(245,158,11,0.35)]";
      case "tet":
        return "border-red-500/50 hover:border-amber-400/80 bg-zinc-950 shadow-[0_0_28px_rgba(239,68,68,0.22)] hover:shadow-[0_0_35px_rgba(239,68,68,0.35)]";
      case "national-day":
        return "border-yellow-500/50 hover:border-yellow-400/80 bg-zinc-950 shadow-[0_0_28px_rgba(234,179,8,0.25)] hover:shadow-[0_0_35px_rgba(234,179,8,0.4)]";
      case "christmas":
        return "border-sky-400/50 hover:border-sky-300/80 bg-zinc-950 shadow-[0_0_28px_rgba(56,189,248,0.22)] hover:shadow-[0_0_35px_rgba(56,189,248,0.35)]";
      case "halloween":
        return "border-orange-500/50 hover:border-purple-400/80 bg-zinc-950 shadow-[0_0_28px_rgba(249,115,22,0.22)] hover:shadow-[0_0_35px_rgba(249,115,22,0.35)]";
      case "nana-birthday":
        return "border-pink-500/50 hover:border-pink-400/80 bg-zinc-950 shadow-[0_0_28px_rgba(236,72,153,0.22)] hover:shadow-[0_0_35px_rgba(236,72,153,0.35)]";
      default:
        return "border-red-500/30 hover:border-amber-500/60 bg-zinc-950 shadow-red-950/20";
    }
  })();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenModal}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenModal();
        }
      }}
      aria-label={`Sự kiện ${event.title}, bấm để xem chi tiết`}
      className={`group relative w-full min-h-[175px] sm:min-h-[195px] md:min-h-[215px] h-auto rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer select-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 border ${holidayBorderClass}`}
    >
      {/* 1. BACKGROUND IMAGE OR FALLBACK GRADIENT */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {!imageError && event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center filter brightness-[0.55] contrast-105 transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-r ${accentGradient} opacity-90`} />
        )}

        {/* Multi-stop cinematic dark gradient for guaranteed AAA readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 sm:via-zinc-950/80 to-transparent w-full sm:w-3/4 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* SPECIAL HOLIDAY EFFECT (Active only when event has effect) */}
      {event.effect && <VietnamEventEffect effect={event.effect} />}

      {/* 2. LEFT DECORATIVE ACCENT STRIPE */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 z-10 transition-opacity duration-300 ${
          isToday
            ? "bg-gradient-to-b from-red-500 via-amber-500 to-yellow-500 opacity-90 group-hover:opacity-100"
            : "bg-gradient-to-b from-amber-500/60 to-zinc-600 opacity-60 group-hover:opacity-100"
        }`}
      />

      {/* 3. CARD CONTENT */}
      <div className="relative z-10 h-full w-full px-5 sm:px-8 py-4 sm:py-6 flex flex-col justify-between">
        {/* TOP ROW: BADGES */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Primary Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-sm border transition-colors ${
              isToday
                ? "bg-red-500/25 border-red-500/40 text-red-200 group-hover:bg-red-500/35"
                : "bg-white/10 border-white/15 text-zinc-300 group-hover:bg-white/15"
            }`}
          >
            <VietnamFlagIcon className="w-3.5 h-2.5 sm:w-4 sm:h-2.8 rounded-[1px] shadow-sm" />
            <span className="tracking-wide">
              {isToday ? `${badgeLabel} • ${badgeSub}` : `${badgeLabel} • ${badgeSub}`}
            </span>
          </span>

          {/* Nature / Category tag */}
          <span className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-black/40 text-zinc-300 border border-white/10 backdrop-blur-md">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{event.natureLabel || event.categoryLabel}</span>
          </span>

          {/* Lunar date pill if applicable */}
          {event.lunarDisplayDate && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-amber-500/10 text-amber-200 border border-amber-500/25 backdrop-blur-md">
              <Calendar className="w-3 h-3 text-amber-300" />
              <span>{event.lunarDisplayDate}</span>
            </span>
          )}

          {/* Multi-event indicator */}
          {info.allEventsToday && info.allEventsToday.length > 1 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              <span className="sm:hidden">+{info.allEventsToday.length - 1} sự kiện</span>
              <span className="hidden sm:inline">+{info.allEventsToday.length - 1} sự kiện khác</span>
            </span>
          )}

          {/* Historical milestones indicator */}
          {info.historicalEventsToday && info.historicalEventsToday.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-950/60 text-red-200 border border-red-500/40 backdrop-blur-md shadow-sm">
              <span>📜</span>
              <span>
                {info.historicalEventsToday.length === 1
                  ? "1 mốc lịch sử"
                  : `${info.historicalEventsToday.length} mốc lịch sử`}
              </span>
            </span>
          )}
        </div>

        {/* MIDDLE BLOCK: EVENT TITLE & DESCRIPTION (Constrained to left side so right visuals have room) */}
        <div className="space-y-1.5 sm:space-y-2 my-2 sm:my-3 max-w-lg md:max-w-xl lg:max-w-2xl">
          <h3 className="text-lg sm:text-2xl md:text-[26px] font-black text-white tracking-tight group-hover:text-amber-300 transition-colors drop-shadow-md line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs sm:text-sm md:text-[14.5px] text-zinc-200/95 line-clamp-2 sm:line-clamp-3 leading-relaxed font-normal">
            {event.shortDescription}
          </p>
        </div>

        {/* BOTTOM ROW: SLEEK ACTION BUTTON */}
        <div className="flex items-center gap-3 pt-1">
          <span className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-amber-500/15 group-hover:bg-amber-500/25 border border-amber-500/30 group-hover:border-amber-400/60 text-amber-300 group-hover:text-amber-200 backdrop-blur-md shadow-sm transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]">
            <span>{getEventActionLabel(event)}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
          <span className="hidden sm:inline-block text-xs text-zinc-400 font-medium">
            {event.displayDate}
          </span>
        </div>
      </div>
    </div>
  );
}
