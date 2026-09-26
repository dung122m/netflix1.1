"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  Calendar,
  Quote,
  Utensils,
  History,
  Award,
  Compass,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { VietnamTodayInfo } from "@/lib/vietnamCalendar";
import { VietnamEventEffect } from "./VietnamEventEffect";
import { VietnamFlagIcon } from "./VietnamFlagIcon";
import { useBodyScrollLock } from "@/lib/scrollLock";

// Lazy-load historical SVG visual scenes to prevent blocking initial modal render
const HistoricalVisual = dynamic(
  () => import("./HistoricalVisuals").then((m) => m.HistoricalVisual),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-zinc-900/60 rounded-xl">
        <div className="w-6 h-6 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
      </div>
    ),
  }
);

interface VietnamTodayModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: VietnamTodayInfo;
  initialTab?: "holiday" | "history";
}

export function VietnamTodayModal({
  isOpen,
  onClose,
  info,
  initialTab,
}: VietnamTodayModalProps) {
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const events =
    info.allEventsToday && info.allEventsToday.length > 0
      ? info.allEventsToday
      : [info.event];
  const [activeId, setActiveId] = useState<string>(info.event.id);

  const historicalEvents = React.useMemo(
    () => info.historicalEventsToday || [],
    [info.historicalEventsToday]
  );
  const hasHistory = historicalEvents.length > 0;

  // Decide active tab: if initialTab is passed use it; if no holiday today but history exists, default to history
  const [activeTab, setActiveTab] = useState<"holiday" | "history">("holiday");
  const [selectedHistId, setSelectedHistId] = useState<string>(
    historicalEvents[0]?.id || ""
  );

  const { isToday, daysUntil, solarDateFormatted, lunarDateFormatted } = info;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (!info.isToday && hasHistory) {
      setActiveTab("history");
    } else {
      setActiveTab("holiday");
    }
  }, [initialTab, isOpen, info.isToday, hasHistory]);

  useEffect(() => {
    setActiveId(info.event.id);
    setImageError(false);
  }, [info.event.id]);

  useEffect(() => {
    if (historicalEvents.length > 0) {
      setSelectedHistId(historicalEvents[0].id);
    }
  }, [historicalEvents]);

  useBodyScrollLock(isOpen);

  // Handle ESC key when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const currentEvent = events.find((e) => e.id === activeId) || events[0] || info.event;
  const accentGradient = currentEvent.accentGradient || "from-amber-600/30 via-red-600/20 to-zinc-950";

  const currentHist =
    historicalEvents.find((h) => h.id === selectedHistId) || historicalEvents[0];

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vietnam-event-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col my-auto transform-gpu will-change-[transform,opacity] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP TAB SWITCHER (Rendered when both Holiday & History are available) */}
        {hasHistory && (
          <div className="bg-zinc-900/90 border-b border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-shrink-0 z-30">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none min-w-0 flex-1 pr-1">
              {/* TAB 1: Holiday / Special Day */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("holiday");
                  if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-500 flex-shrink-0 whitespace-nowrap ${
                  activeTab === "holiday"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Nét đẹp ngày lễ</span>
              </button>

              {/* TAB 2: Historical Events */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("history");
                  if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-500 flex-shrink-0 whitespace-nowrap ${
                  activeTab === "history"
                    ? "bg-red-500/20 text-red-200 border border-red-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
              >
                <History className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                <span>Ngày này trong lịch sử</span>
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500/30 text-red-200 border border-red-500/40 flex-shrink-0">
                  {historicalEvents.length}
                </span>
              </button>
            </div>

            {/* Close Button top right - Dedicated non-collapsing zone */}
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-zinc-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: HOLIDAY / SPECIAL DAY TAB CONTENT                                 */}
        {/* ========================================================================= */}
        {activeTab === "holiday" && (
          <>
            {/* HERO HEADER WITH IMAGE OR AMBIENT GRADIENT */}
            <div className="relative h-44 sm:h-56 w-full overflow-hidden flex-shrink-0 bg-zinc-900">
              {!imageError && currentEvent.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentEvent.imageUrl}
                  alt={currentEvent.title}
                  loading="lazy"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-center filter brightness-75 scale-105 transition-all duration-500"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${accentGradient}`} />
              )}

              {/* Deep dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-zinc-950/40" />

              {/* SPECIAL HOLIDAY EFFECT (Active only when event has effect) */}
              {currentEvent.effect && <VietnamEventEffect effect={currentEvent.effect} />}

              {/* Close Button if no history tab header */}
              {!hasHistory && (
                <button
                  onClick={onClose}
                  aria-label="Đóng"
                  className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-black/70 hover:bg-white/20 text-zinc-300 hover:text-white border border-white/15 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Top badging */}
              <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-red-500/40 bg-red-600/40 text-red-200">
                  <VietnamFlagIcon className="w-4 h-2.8 rounded-[1px] shadow-sm" />
                  <span>
                    {isToday
                      ? "HÔM NAY"
                      : daysUntil === 1
                      ? "NGÀY MAI"
                      : `CÒN ${daysUntil} NGÀY`}
                  </span>
                </span>

                {/* Nature label */}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/60 text-zinc-200 border border-white/15">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {currentEvent.natureLabel || currentEvent.categoryLabel}
                </span>

                {currentEvent.tag && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/25 text-amber-200 border border-amber-500/35">
                    {currentEvent.tag}
                  </span>
                )}
              </div>

              {/* Title & Date overlaid on hero bottom */}
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="text-xs sm:text-sm font-medium text-amber-300/90 mb-1 flex items-center gap-2">
                  <span>{currentEvent.displayDate}</span>
                  {currentEvent.lunarDisplayDate && (
                    <>
                      <span className="text-zinc-500">•</span>
                      <span className="text-zinc-300">{currentEvent.lunarDisplayDate}</span>
                    </>
                  )}
                </div>
                <h2
                  id="vietnam-event-title"
                  className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-md line-clamp-2"
                >
                  {currentEvent.title}
                </h2>
                {currentEvent.subtitle && (
                  <p className="text-xs sm:text-sm text-amber-200/90 line-clamp-2 mt-0.5 font-medium">
                    {currentEvent.subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Multi-event tab switcher if today has multiple holidays */}
            {events.length > 1 && (
              <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-white/10 bg-zinc-950 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
                <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                  Sự kiện hôm nay:
                </span>
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setImageError(false);
                      setActiveId(ev.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      ev.id === currentEvent.id
                        ? "bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 bg-white/5 border border-white/10"
                    }`}
                  >
                    <span>{ev.title}</span>
                  </button>
                ))}
              </div>
            )}

            {/* MODAL CONTENT BODY - SCROLLABLE */}
            <div
              ref={contentScrollRef}
              className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-zinc-300 text-sm leading-relaxed custom-scrollbar"
            >
              {/* Quick summary */}
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-200 font-medium">
                {currentEvent.shortDescription}
              </div>

              {/* Grid: Nguồn gốc & Ý nghĩa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* 📖 Nguồn gốc */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 hover:border-white/15 transition-colors">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    <span>Nguồn gốc</span>
                  </div>
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                    {currentEvent.origin}
                  </p>
                </div>

                {/* 🎯 Ý nghĩa */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 hover:border-white/15 transition-colors">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold mb-2">
                    <Target className="w-4 h-4 text-rose-400" />
                    <span>Ý nghĩa</span>
                  </div>
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                    {currentEvent.meaning || currentEvent.significance}
                  </p>
                </div>
              </div>

              {/* 🏮 Phong tục & Nét đẹp tiêu biểu */}
              {currentEvent.traditions && currentEvent.traditions.length > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 via-zinc-900/70 to-zinc-900/50 border border-amber-500/25">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold mb-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Phong tục & Nét đẹp tiêu biểu</span>
                  </div>
                  <ul className="space-y-2">
                    {currentEvent.traditions.map((t, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 🍜 Ẩm thực đặc trưng */}
              {currentEvent.cuisine && (
                <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-500/25 flex items-start gap-3">
                  <Utensils className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <span className="font-semibold text-orange-300 mr-2">
                      Ẩm thực đặc trưng:
                    </span>
                    <span className="text-orange-100/90">{currentEvent.cuisine}</span>
                  </div>
                </div>
              )}

              {/* 💡 Bạn có biết? */}
              {currentEvent.didYouKnow && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/25 relative overflow-hidden">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Bạn có biết?</span>
                  </div>
                  <p className="text-amber-100/90 text-xs sm:text-sm leading-relaxed">
                    {currentEvent.didYouKnow}
                  </p>
                </div>
              )}

              {/* 📅 Các mốc lịch sử / Dòng thời gian */}
              {currentEvent.milestones && currentEvent.milestones.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10">
                  <div className="flex items-center gap-2 text-sky-400 font-semibold mb-2.5">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>
                      {currentEvent.traditions && currentEvent.traditions.length > 0
                        ? "Dấu mốc & Dòng thời gian"
                        : currentEvent.category === "vietnam-history" ||
                          currentEvent.category === "national-holiday"
                        ? "Dấu mốc lịch sử tiêu biểu"
                        : "Dấu mốc & Hoạt động tiêu biểu"}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {currentEvent.milestones.map((m, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 💬 Trích dẫn / Ca dao */}
              {currentEvent.quote && (
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-white/5 flex items-start gap-3 italic text-xs sm:text-sm text-zinc-300">
                  <Quote className="w-4 h-4 text-amber-400/80 flex-shrink-0 mt-0.5" />
                  <span>&ldquo;{currentEvent.quote}&rdquo;</span>
                </div>
              )}

              {/* 📜 LINK TO HISTORICAL EVENTS IF AVAILABLE TODAY */}
              {hasHistory && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/80 to-amber-950/30 border border-red-500/30 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-300 tracking-wide uppercase">
                      <History className="w-3.5 h-3.5 text-red-400" />
                      <span>Ngày này trong lịch sử Việt Nam</span>
                    </div>
                    <p className="text-xs text-zinc-300 line-clamp-1">
                      {historicalEvents[0].title} ({historicalEvents[0].year > 0 ? historicalEvents[0].year : `${Math.abs(historicalEvents[0].year)} TCN`})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("history");
                      if (contentScrollRef.current) contentScrollRef.current.scrollTop = 0;
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-100 border border-red-500/40 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all"
                  >
                    <span>Khám phá</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Today's Context Footer */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span>Hôm nay: {solarDateFormatted}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-400">{lunarDateFormatted}</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors text-xs ml-auto"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: HISTORICAL EVENTS TAB CONTENT                                      */}
        {/* ========================================================================= */}
        {activeTab === "history" && currentHist && (
          <div
            ref={contentScrollRef}
            className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-zinc-300 text-sm leading-relaxed custom-scrollbar flex-1"
          >
            {/* HISTORICAL HEADER BANNER */}
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">📜</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-amber-400 tracking-wider uppercase">
                    Ngày này trong lịch sử Việt Nam
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Dấu mốc lịch sử hào hùng đã được kiểm chứng
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600/25 text-red-200 border border-red-500/30">
                  <VietnamFlagIcon className="w-3.5 h-2.5" />
                  <span>
                    {currentHist.year > 0 ? `Năm ${currentHist.year}` : `${Math.abs(currentHist.year)} TCN`}
                  </span>
                </span>
              </div>
            </div>

            {/* MULTI-EVENT TIMELINE SWITCHER IF MORE THAN 1 HISTORICAL EVENT */}
            {historicalEvents.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">
                  Mốc thời gian:
                </span>
                {historicalEvents.map((h) => {
                  const isSelected = h.id === currentHist.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHistId(h.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        isSelected
                          ? "bg-red-600/30 text-red-100 border border-red-500/50 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200 bg-white/5 border border-white/10"
                      }`}
                    >
                      <span>
                        {h.year > 0 ? h.year : `${Math.abs(h.year)} TCN`}
                      </span>
                      <span className="text-zinc-500">•</span>
                      <span className="max-w-[140px] truncate">{h.title}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* HISTORICAL VECTOR SVG VISUAL SCENE */}
            <div className="relative w-full h-40 sm:h-52 rounded-2xl overflow-hidden bg-zinc-900/90 border border-white/10 shadow-lg group">
              <HistoricalVisual
                theme={currentHist.visualTheme}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent pointer-events-none" />

              {/* Exact Date & Location Badge Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-zinc-300 pointer-events-none">
                <span className="font-semibold text-amber-300 drop-shadow">
                  {currentHist.solarDate.day < 10 ? `0${currentHist.solarDate.day}` : currentHist.solarDate.day}/
                  {currentHist.solarDate.month < 10 ? `0${currentHist.solarDate.month}` : currentHist.solarDate.month}/
                  {currentHist.year > 0 ? currentHist.year : `${Math.abs(currentHist.year)} TCN`}
                </span>
                {currentHist.location && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-300 drop-shadow">
                    <MapPin className="w-3 h-3 text-red-400" />
                    <span>{currentHist.location}</span>
                  </span>
                )}
              </div>
            </div>

            {/* EVENT TITLE */}
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
                {currentHist.title}
              </h2>
            </div>

            {/* 1. ĐIỀU GÌ XẢY RA (SUMMARY) */}
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Diễn biến sự kiện</span>
              </div>
              <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed">
                {currentHist.summary}
              </p>
            </div>

            {/* 2. BỐI CẢNH & Ý NGHĨA LỊCH SỬ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Bối cảnh (nếu có) */}
              {currentHist.context && (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wide">
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                    <span>Bối cảnh lịch sử</span>
                  </div>
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                    {currentHist.context}
                  </p>
                </div>
              )}

              {/* Ý nghĩa lịch sử */}
              <div
                className={`p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-1.5 ${
                  !currentHist.context ? "md:col-span-2" : ""
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wide">
                  <Award className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ý nghĩa lịch sử</span>
                </div>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed">
                  {currentHist.significance}
                </p>
              </div>
            </div>

            {/* 3. DỮ KIỆN & CON SỐ ĐÁNG CHÚ Ý */}
            {currentHist.keyFacts && currentHist.keyFacts.length > 0 && (
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dữ kiện & Con số đáng nhớ</span>
                </div>
                <ul className="space-y-2">
                  {currentHist.keyFacts.map((fact, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-200"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 4. NHÂN VẬT LIÊN QUAN */}
            {currentHist.figures && currentHist.figures.length > 0 && (
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-white/10 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-1">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Nhân vật:</span>
                </div>
                {currentHist.figures.map((fig, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-zinc-200"
                  >
                    {fig}
                  </span>
                ))}
              </div>
            )}

            {/* 5. BẠN CÓ BIẾT? (DID YOU KNOW) */}
            {currentHist.didYouKnow && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/25 relative overflow-hidden">
                <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Bạn có biết?</span>
                </div>
                <p className="text-amber-100/90 text-xs sm:text-sm leading-relaxed">
                  {currentHist.didYouKnow}
                </p>
              </div>
            )}

            {/* 6. NGUỒN TƯ LIỆU KIỂM CHỨNG */}
            {currentHist.sources && currentHist.sources.length > 0 && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-zinc-500 space-y-1">
                <span className="font-semibold text-zinc-400">Nguồn tư liệu kiểm chứng:</span>
                <p className="text-zinc-400">{currentHist.sources.join(" • ")}</p>
              </div>
            )}

            {/* FOOTER */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span>{solarDateFormatted}</span>
                <span className="text-zinc-600">•</span>
                <span>{lunarDateFormatted}</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors text-xs ml-auto"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
