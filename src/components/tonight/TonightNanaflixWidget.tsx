"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Sparkles, Compass, ChevronRight, Moon, Sun, Coffee } from "lucide-react";
import { getTonightMoodConfig, TimeSlot } from "@/lib/dynamicHomeMoods";

export function TonightNanaflixWidget() {
  const config = useMemo(() => {
    return getTonightMoodConfig();
  }, []);

  const getSlotIcon = (slot: TimeSlot) => {
    switch (slot) {
      case "morning":
        return <Sun size={15} className="text-amber-400" />;
      case "afternoon":
        return <Coffee size={15} className="text-sky-400" />;
      case "latenight":
        return <Moon size={15} className="text-purple-400" />;
      case "evening":
      default:
        return <Moon size={15} className="text-rose-400" />;
    }
  };

  return (
    <div
      aria-label="Đêm nay Nanaflix - Gợi ý xem phim theo thời điểm"
      className={`relative overflow-hidden rounded-2xl border ${config.borderColor} bg-gradient-to-r ${config.accentGradient} bg-zinc-950/80 p-4 sm:p-5 backdrop-blur-xl shadow-lg transition-all duration-300`}
      style={{
        boxShadow: `0 8px 30px -5px ${config.glowColor}`,
      }}
    >
      {/* Visual background image with cinematic opacity and balanced dark gradient */}
      {config.bgImageUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.bgImageUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center opacity-55 filter brightness-[0.85] contrast-105 motion-reduce:transform-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/55 to-zinc-950/30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent pointer-events-none" />
        </div>
      )}

      {/* Visual background ambient glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-netflix-red/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Dynamic Time & Mood Title */}
        <div className="max-w-2xl space-y-1.5">
          {/* Badge & Time Label */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-zinc-200 backdrop-blur-md">
              <span>{config.badgeIcon}</span>
              <span>{config.badgeText}</span>
            </span>

            <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400">
              {getSlotIcon(config.slot)}
              <span>{config.timeLabel}</span>
            </span>
          </div>

          {/* Heading */}
          <h3 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-snug drop-shadow-sm flex items-center gap-2">
            <span>{config.title}</span>
            <Sparkles size={16} className="text-amber-400 flex-shrink-0 animate-pulse hidden sm:inline-block" />
          </h3>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-zinc-300/90 leading-relaxed line-clamp-2">
            {config.subtitle}
          </p>
        </div>

        {/* Right: Quick Mood Filter Tags & CTA */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center gap-2.5 flex-shrink-0 pt-1 md:pt-0">
          {/* Suggested Quick Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {config.suggestedTags.map((tag, idx) => (
              <Link
                key={idx}
                href={`/browse?${tag.query}`}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 hover:bg-white/15 hover:border-white/25 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-all duration-200 active:scale-95 cursor-pointer shadow-sm hover:text-white"
              >
                <span>{tag.label}</span>
              </Link>
            ))}
          </div>

          {/* Direct CTA */}
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 rounded-xl bg-netflix-red/90 hover:bg-netflix-red text-white px-3.5 py-1.5 text-xs font-bold transition-all duration-200 shadow-md hover:shadow-netflix-red/40 hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0"
          >
            <Compass size={14} />
            <span>Khám phá</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TonightNanaflixWidget;
