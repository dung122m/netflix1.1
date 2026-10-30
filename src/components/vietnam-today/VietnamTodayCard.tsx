"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import type { VietnamTodayInfo } from "@/lib/vietnamCalendarCore";
import { VietnamEvent } from "@/data/events/types";
import { VietnamEventEffect } from "./VietnamEventEffect";
import { VietnamFlagIcon } from "./VietnamFlagIcon";
import {
  getVietnamEventBackground,
  getVietnamEventPatternTheme,
  getVietnamEventThemeConfig,
  hasDedicatedEventDesign,
} from "@/lib/vietnamEventBackgrounds";
import { VietnamEventPatternLayer } from "./VietnamEventPatternLayer";

export function getEventActionLabel(event: VietnamEvent): string {
  if (event.actorName || event.id.startsWith("ev-actor-birthday")) {
    return `Xem phim của ${event.actorName || "diễn viên"}`;
  }

  const titleLower = event.title.toLowerCase();
  const idLower = event.id.toLowerCase();

  // Check if this is a memorial / solemn remembrance event
  const isMemorial =
    titleLower.includes("tưởng niệm") ||
    titleLower.includes("ngày mất") ||
    titleLower.includes("từ trần") ||
    titleLower.includes("liệt sĩ") ||
    titleLower.includes("thương binh") ||
    titleLower.includes("tri ân") ||
    idLower.includes("tuong-niem") ||
    idLower.includes("ngay-mat");

  if (isMemorial) {
    return "Tưởng nhớ & Tri ân";
  }

  if (event.relatedLabel) {
    return event.relatedLabel;
  }

  // Tôn vinh doanh nhân / ngày doanh nhân
  if (titleLower.includes("doanh nhân") || idLower.includes("doanh-nhan")) {
    return "Tôn vinh Doanh nhân Việt Nam";
  }

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
      return "Khám phá nét đẹp văn hóa & điện ảnh";
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
    case "entertainment":
      return "Khám phá kho phim";
    default:
      return "Tìm hiểu chi tiết sự kiện";
  }
}

export function getCleanEventTitle(rawTitle: string): string {
  return rawTitle.replace(/\s*\(\d{1,2}\/\d{1,2}(?:\/\d{4})?\)/g, "").trim();
}

export function parseEventTitleParts(rawTitle: string): { main: string; secondary: string | null } {
  const clean = getCleanEventTitle(rawTitle);
  const match = clean.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (match) {
    return {
      main: match[1].trim(),
      secondary: match[2].trim(),
    };
  }
  return { main: clean, secondary: null };
}

export function getEventTabBadge(event: VietnamEvent): { label: string; emoji: string } {
  const id = event.id.toLowerCase();
  const title = event.title.toLowerCase();

  let emoji = "✨";
  if (
    title.includes("tưởng niệm") ||
    title.includes("ngày mất") ||
    title.includes("từ trần") ||
    title.includes("liệt sĩ") ||
    title.includes("thương binh") ||
    id.includes("tuong-niem") ||
    id.includes("ngay-mat")
  ) {
    emoji = "🕯️";
  } else if (id.startsWith("ev-actor-birthday") || title.includes("sinh nhật")) emoji = "🎂";
  else if (id.includes("dien-anh") || title.includes("điện ảnh") || title.includes("chiếu bóng")) emoji = "🎬";
  else if (id.includes("hoat-hinh") || title.includes("hoạt hình")) emoji = "🎨";
  else if (id.includes("cao-tuoi") || title.includes("cao tuổi")) emoji = "👴";
  else if (id.includes("ca-phe") || title.includes("cà phê")) emoji = "☕";
  else if (id.includes("phu-nu") || title.includes("phụ nữ")) emoji = "🌸";
  else if (id.includes("nha-giao") || id.includes("thay-co") || title.includes("nhà giáo")) emoji = "📚";
  else if (id.includes("khuyen-hoc") || title.includes("khuyến học")) emoji = "🎓";
  else if (id.includes("tet") || title.includes("tết")) emoji = "🧧";
  else if (id.includes("trung-thu") || title.includes("trung thu")) emoji = "🥮";
  else if (id.includes("thieu-nhi") || title.includes("thiếu nhi")) emoji = "🎈";
  else if (id.includes("thay-thuoc") || id.includes("y-te") || title.includes("thầy thuốc") || title.includes("tim mạch")) emoji = "🩺";
  else if (id.includes("quoc-khanh") || id.includes("doc-lap")) emoji = "🇻🇳";
  else if (id.includes("moi-truong") || title.includes("môi trường")) emoji = "🌱";
  else if (id.includes("sach") || title.includes("sách")) emoji = "📖";
  else if (id.includes("gia-dinh") || title.includes("gia đình")) emoji = "🏡";
  else if (id.includes("dich-thuat") || title.includes("dịch thuật")) emoji = "🌐";
  else if (id.includes("doanh-nhan") || title.includes("doanh nhân")) emoji = "💼";
  else if (id.includes("nong-dan") || title.includes("nông dân")) emoji = "🌾";
  else if (id.includes("thanh-nien") || title.includes("thanh niên")) emoji = "⚡";
  else if (event.nature === "arts-culture" || event.category === "entertainment") emoji = "🎭";
  else if (event.category === "vietnam-history" || event.nature === "historical-anniversary") emoji = "📜";

  let label = getCleanEventTitle(event.title);
  if (label.includes(" (") && label.endsWith(")")) {
    label = label.replace(/\s*\([^)]*\)$/, "").trim();
  }
  return { label, emoji };
}

export function getEventQuoteOrMessage(event: VietnamEvent): string {
  if (event.message && event.message.trim().length > 0) {
    return event.message;
  }
  if (event.quote && event.quote.trim().length > 0) {
    return event.quote;
  }
  if (event.meaning && event.meaning.trim().length > 0) {
    return event.meaning;
  }
  if (event.subtitle && event.subtitle.trim().length > 0 && event.subtitle !== event.shortDescription) {
    return event.subtitle;
  }
  if (event.significance && event.significance.trim().length > 0) {
    return event.significance;
  }
  return event.shortDescription;
}

interface VietnamTodayCardProps {
  info: VietnamTodayInfo;
  selectedEventId?: string;
  onOpenModal: (eventId?: string) => void;
}

export function VietnamTodayCard({ info, selectedEventId, onOpenModal }: VietnamTodayCardProps) {
  const [imageError, setImageError] = useState(false);

  const events = React.useMemo(() => {
    return info.allEventsToday && info.allEventsToday.length > 0
      ? info.allEventsToday
      : [info.event];
  }, [info]);

  const activeEventId = selectedEventId || info.event.id;

  const event = React.useMemo(() => {
    return events.find((e) => e.id === activeEventId) || events[0] || info.event;
  }, [events, activeEventId, info.event]);

  const currentInfo: VietnamTodayInfo = React.useMemo(() => {
    return {
      ...info,
      event,
    };
  }, [info, event]);

  const { isToday } = currentInfo;

  const isDedicated = React.useMemo(() => {
    return hasDedicatedEventDesign(currentInfo);
  }, [currentInfo]);

  const bgImageUrl = React.useMemo(() => {
    return getVietnamEventBackground(currentInfo);
  }, [currentInfo]);

  const patternTheme = React.useMemo(() => {
    return getVietnamEventPatternTheme(currentInfo);
  }, [currentInfo]);

  const themeConfig = React.useMemo(() => {
    return getVietnamEventThemeConfig(patternTheme);
  }, [patternTheme]);

  React.useEffect(() => {
    setImageError(false);
  }, [event.id, bgImageUrl]);

  const holidayBorderClass = (() => {
    if (event.id.startsWith("ev-actor-birthday") || event.actorSlug) {
      return "border-pink-500/40 hover:border-pink-400/70 bg-zinc-950 shadow-xl shadow-black/60";
    }
    if (!event.effect) {
      return isToday
        ? "border-red-500/30 hover:border-red-500/50 bg-zinc-950 shadow-xl shadow-black/60"
        : "border-white/10 hover:border-white/20 bg-zinc-950/90 shadow-lg shadow-black/50";
    }
    switch (event.effect) {
      case "mid-autumn":
        return "border-amber-500/30 hover:border-amber-400/60 bg-zinc-950 shadow-xl shadow-black/60";
      case "tet":
        return "border-red-500/30 hover:border-red-400/60 bg-zinc-950 shadow-xl shadow-black/60";
      case "national-day":
        return "border-yellow-500/30 hover:border-yellow-400/60 bg-zinc-950 shadow-xl shadow-black/60";
      case "christmas":
        return "border-sky-400/30 hover:border-sky-300/60 bg-zinc-950 shadow-xl shadow-black/60";
      case "halloween":
        return "border-orange-500/30 hover:border-orange-400/60 bg-zinc-950 shadow-xl shadow-black/60";
      case "nana-birthday":
        return "border-pink-500/30 hover:border-pink-400/60 bg-zinc-950 shadow-xl shadow-black/60";
      default:
        return "border-red-500/25 hover:border-red-500/40 bg-zinc-950 shadow-xl shadow-black/60";
    }
  })();

  const parsedTitle = parseEventTitleParts(event.title);
  const cleanTitle = parsedTitle.main;
  const currentBadge = React.useMemo(() => getEventTabBadge(event), [event]);
  const quoteMessage = React.useMemo(() => getEventQuoteOrMessage(event), [event]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenModal(event.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenModal(event.id);
        }
      }}
      aria-label={`Sự kiện ${cleanTitle}, bấm để xem chi tiết`}
      className={`group relative w-full min-h-[185px] sm:min-h-[200px] md:min-h-[220px] h-auto rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer select-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 border ${holidayBorderClass}`}
    >
      {/* 1. BACKGROUND IMAGE OR THEMATIC GRADIENT */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {!imageError && bgImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={bgImageUrl}
            src={bgImageUrl}
            alt=""
            aria-hidden="true"
            onError={(e) => {
              setImageError(true);
              e.currentTarget.style.display = "none";
            }}
            className="w-full h-full object-cover object-center opacity-55 filter brightness-[0.80] contrast-105 transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-70 motion-reduce:transform-none"
          />
        ) : (
          <div className="relative w-full h-full overflow-hidden">
            {/* Thematic rich subtle gradient */}
            <div className={`w-full h-full bg-gradient-to-r ${themeConfig.gradient}`} />
            
            {/* Ambient soft glow spotlights */}
            <div
              className="absolute -right-12 -top-12 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none transition-all duration-700"
              style={{ backgroundColor: themeConfig.spotlightRgba }}
            />
            <div
              className="absolute right-1/4 -bottom-16 w-56 h-56 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-700"
              style={{ backgroundColor: themeConfig.spotlightRgba }}
            />
          </div>
        )}

        {/* Multi-stop cinematic dark gradient for guaranteed AAA readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/60 sm:via-zinc-950/40 to-transparent w-full sm:w-3/5 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* THEMATIC ICON ILLUSTRATION COMPOSITION (Chỉ render khi event CHƯA có thiết kế riêng) */}
      {!isDedicated && <VietnamEventPatternLayer themeKey={patternTheme} />}

      {/* SPECIAL HOLIDAY EFFECT (Active only when event has effect) */}
      {event.effect && <VietnamEventEffect effect={event.effect} />}

      {/* 2. AMBIENT BORDER HIGHLIGHT */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl border transition-colors duration-300 z-10 ${
          isToday
            ? "border-red-500/30 group-hover:border-red-500/60"
            : "border-white/10 group-hover:border-white/25"
        }`}
      />

      {/* 3. CARD CONTENT */}
      <div className="relative z-10 h-full w-full px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 flex flex-col justify-between">
        {/* RESPONSIVE 12-COLUMN GRID (Balanced on wide displays, eliminates central gap) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 lg:gap-8 items-center flex-1 w-full">
          {/* LEFT COLUMN: PRIMARY EVENT INFO (7 of 12 columns on Desktop) */}
          <div className="md:col-span-7 lg:col-span-7 xl:col-span-7 flex flex-col justify-between min-w-0">
            {/* TOP ROW: ONLY 1 STATUS BADGE */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold backdrop-blur-md shadow-sm border transition-colors ${
                  isToday
                    ? "bg-red-500/20 border-red-500/40 text-red-200 group-hover:bg-red-500/30"
                    : "bg-white/10 border-white/15 text-zinc-300 group-hover:bg-white/15"
                }`}
              >
                <VietnamFlagIcon className="w-3.5 h-2.5 sm:w-4 sm:h-2.8 rounded-[1px] shadow-sm" />
                <span className="tracking-wide">
                  {isToday ? "Đang diễn ra" : "Sắp diễn ra"}
                </span>
              </span>
            </div>

            {/* EVENT TITLE & RICH BANNER DESCRIPTION */}
            <div className="space-y-1.5 my-1.5">
              <h3 className="text-base sm:text-2xl md:text-[23px] lg:text-[25px] font-black text-white tracking-tight group-hover:text-amber-300 transition-colors drop-shadow-md line-clamp-2 leading-snug">
                <span>{parsedTitle.main}</span>
                {parsedTitle.secondary && (
                  <span className="hidden sm:inline font-bold text-zinc-400 text-sm sm:text-lg md:text-[20px]">
                    {" "}({parsedTitle.secondary})
                  </span>
                )}
              </h3>
              <p className="text-xs sm:text-sm md:text-[13.5px] lg:text-[14.5px] text-zinc-200/95 max-w-[70ch] line-clamp-3 sm:line-clamp-4 leading-relaxed font-normal">
                {event.bannerDescription || event.shortDescription}
              </p>
            </div>

            {/* ACTION BUTTON (Single CTA with direct link when available) */}
            <div className="flex items-center gap-3 pt-2">
              {event.relatedLink ? (
                <Link
                  href={event.relatedLink}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={getEventActionLabel(event)}
                  className="inline-flex items-center gap-2 px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border border-amber-400/40 shadow-md shadow-black/50 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer z-10"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span>{getEventActionLabel(event)}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-amber-500/15 group-hover:bg-amber-500/25 border border-amber-500/30 group-hover:border-amber-400/60 text-amber-300 group-hover:text-amber-200 backdrop-blur-md shadow-sm transition-all duration-300">
                  <span>{getEventActionLabel(event)}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              )}
            </div>

            {/* MOBILE THEMATIC COMPACT VISUAL / QUOTE (< 768px) */}
            <div className="md:hidden mt-2.5 flex items-center gap-2 text-zinc-300/90 border-l-2 border-amber-400/40 pl-2 py-0.5">
              <span className="text-sm flex-shrink-0">{currentBadge.emoji}</span>
              <p className="text-[11px] italic line-clamp-2 leading-snug font-normal max-w-[55ch]">
                &ldquo;{quoteMessage}&rdquo;
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: THEMATIC SPOTLIGHT CALLOUT PANEL (5 of 12 columns on Desktop) */}
          <div className="hidden md:flex md:col-span-5 lg:col-span-5 xl:col-span-5 h-full items-center">
            <div className="w-full border-l-2 border-amber-500/40 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.03] to-transparent pl-4 sm:pl-5 pr-3 py-3 rounded-r-2xl flex items-start gap-3.5 group/emblem">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-2xl shadow-inner overflow-hidden">
                {event.imageUrl && (event.actorSlug || event.id.startsWith("ev-actor-birthday")) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.imageUrl}
                    alt={event.actorName || cleanTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentBadge.emoji
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] tracking-wider font-bold text-amber-400 mb-1 flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ý nghĩa & Thông điệp</span>
                </div>
                <p className="text-xs lg:text-[13.5px] text-zinc-200 leading-relaxed italic line-clamp-3 font-normal">
                  &ldquo;{quoteMessage}&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VietnamTodayCard;

