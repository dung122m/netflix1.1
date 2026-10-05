"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { VietnamTodayInfo } from "@/lib/vietnamCalendar";
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

  const label = getCleanEventTitle(event.title);
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
      return "border-pink-500/40 hover:border-pink-400/70 bg-zinc-950 shadow-[0_0_24px_rgba(236,72,153,0.18)] hover:shadow-[0_0_32px_rgba(236,72,153,0.28)]";
    }
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

  const cleanTitle = React.useMemo(() => getCleanEventTitle(event.title), [event.title]);
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

      {/* 2. LEFT DECORATIVE ACCENT STRIPE */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 z-10 transition-opacity duration-300 ${
          isToday
            ? "bg-gradient-to-b from-red-500 via-amber-500 to-yellow-500 opacity-90 group-hover:opacity-100"
            : "bg-gradient-to-b from-amber-500/60 to-zinc-600 opacity-60 group-hover:opacity-100"
        }`}
      />

      {/* 3. CARD CONTENT */}
      <div className="relative z-10 h-full w-full px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 flex flex-col justify-between">
        {/* RESPONSIVE LAYOUT WRAPPER (Desktop 2-column: Left ~60%, Right ~40%; Mobile 1-column) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-8 flex-1">
          {/* LEFT COLUMN: PRIMARY EVENT INFO (~60% on Desktop) */}
          <div className="flex-1 min-w-0 md:max-w-[62%] flex flex-col justify-between">
            {/* TOP ROW: ONLY 1 STATUS BADGE (Không xếp chồng nhiều tầng pill) */}
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
                  {isToday ? "ĐANG DIỄN RA" : "SẮP DIỄN RA"}
                </span>
              </span>
            </div>

            {/* EVENT TITLE & RICH BANNER DESCRIPTION */}
            <div className="space-y-1.5 my-1.5">
              <h3 className="text-lg sm:text-2xl md:text-[24px] font-black text-white tracking-tight group-hover:text-amber-300 transition-colors drop-shadow-md line-clamp-2 leading-snug">
                {cleanTitle}
              </h3>
              <p className="text-xs sm:text-sm md:text-[13.5px] lg:text-[14px] text-zinc-300/95 line-clamp-3 sm:line-clamp-4 md:line-clamp-4 leading-relaxed font-normal">
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
                  className="inline-flex items-center gap-2 px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r from-red-600 via-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white border border-amber-400/40 shadow-lg shadow-red-950/40 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] active:scale-95 cursor-pointer z-10"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span>{getEventActionLabel(event)}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold bg-amber-500/15 group-hover:bg-amber-500/25 border border-amber-500/30 group-hover:border-amber-400/60 text-amber-300 group-hover:text-amber-200 backdrop-blur-md shadow-sm transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(245,158,11,0.25)]">
                  <span>{getEventActionLabel(event)}</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              )}
            </div>

            {/* MOBILE THEMATIC COMPACT VISUAL / QUOTE (< 768px - Placed below CTA) */}
            <div className="md:hidden mt-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md flex items-center gap-2.5">
              <span className="text-base flex-shrink-0">{currentBadge.emoji}</span>
              <p className="text-[11px] text-zinc-300/90 italic line-clamp-2 leading-snug font-normal">
                &ldquo;{quoteMessage}&rdquo;
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: THEMATIC EMBLEM / QUOTE CARD (~40% on Desktop ≥ 768px) */}
          <div className="hidden md:flex md:w-[38%] lg:w-[36%] flex-shrink-0 items-center justify-center">
            <div className="w-full rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-white/20 p-4 lg:p-5 backdrop-blur-md transition-all duration-300 shadow-lg relative overflow-hidden group/emblem">
              {/* Subtle ambient glow */}
              <div className="absolute -top-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex items-start gap-3.5">
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
                  <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400/90 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>Ý nghĩa & Thông điệp</span>
                  </div>
                  <p className="text-xs lg:text-[13px] text-zinc-200/90 leading-relaxed italic line-clamp-3 font-normal">
                    &ldquo;{quoteMessage}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VietnamTodayCard;

