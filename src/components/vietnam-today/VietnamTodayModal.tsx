"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, BookOpen, Target, Lightbulb, Calendar, Quote, ExternalLink } from "lucide-react";
import { VietnamEvent } from "@/data/vietnamEvents";
import { VietnamTodayInfo } from "@/lib/vietnamCalendar";
import { VietnamEventEffect } from "./VietnamEventEffect";
import { VietnamFlagIcon } from "./VietnamFlagIcon";

interface VietnamTodayModalProps {
  isOpen: boolean;
  onClose: () => void;
  info: VietnamTodayInfo;
}

export function VietnamTodayModal({ isOpen, onClose, info }: VietnamTodayModalProps) {
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const events = info.allEventsToday && info.allEventsToday.length > 0 ? info.allEventsToday : [info.event];
  const [activeId, setActiveId] = useState<string>(info.event.id);

  const { isToday, daysUntil, solarDateFormatted, lunarDateFormatted } = info;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveId(info.event.id);
    setImageError(false);
  }, [info.event.id]);

  // Handle ESC key and prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const currentEvent = events.find((e) => e.id === activeId) || events[0] || info.event;
  const accentGradient = currentEvent.accentGradient || "from-amber-600/30 via-red-600/20 to-zinc-950";

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vietnam-event-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-full bg-black/60 hover:bg-white/20 text-zinc-300 hover:text-white border border-white/10 backdrop-blur-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top badging */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-sm border border-red-500/30 bg-red-600/30 text-red-200">
              <VietnamFlagIcon className="w-4 h-2.8 rounded-[1px] shadow-sm" />
              <span>{isToday ? "HÔM NAY" : daysUntil === 1 ? "NGÀY MAI" : `CÒN ${daysUntil} NGÀY`}</span>
            </span>

            {/* Nature label (e.g. Ngày lễ chính thức, Kỷ niệm lịch sử, Lễ hội truyền thống, Ngày quốc tế hưởng ứng) */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-black/50 text-zinc-300 border border-white/10 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {currentEvent.natureLabel || currentEvent.categoryLabel}
            </span>

            {currentEvent.tag && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30 backdrop-blur-md">
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
          </div>
        </div>

        {/* Multi-event tab switcher if today has multiple events */}
        {events.length > 1 && (
          <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-white/10 bg-zinc-950 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
            <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">Sự kiện hôm nay:</span>
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-zinc-300 text-sm leading-relaxed custom-scrollbar">
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
                {currentEvent.significance}
              </p>
            </div>
          </div>

          {/* 💡 Bạn có biết? (Fun fact / Did you know) */}
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

          {/* 📅 Các mốc & phong tục liên quan */}
          {currentEvent.milestones && currentEvent.milestones.length > 0 && (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/10">
              <div className="flex items-center gap-2 text-sky-400 font-semibold mb-2.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Dấu mốc & Phong tục tiêu biểu</span>
              </div>
              <ul className="space-y-2">
                {currentEvent.milestones.map((m, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-2 flex-shrink-0" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 💬 Trích dẫn / Ca dao nếu có */}
          {currentEvent.quote && (
            <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-white/5 flex items-start gap-3 italic text-xs sm:text-sm text-zinc-400">
              <Quote className="w-4 h-4 text-amber-400/70 flex-shrink-0 mt-0.5" />
              <span>&ldquo;{currentEvent.quote}&rdquo;</span>
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
      </div>
    </div>,
    document.body
  );
}
