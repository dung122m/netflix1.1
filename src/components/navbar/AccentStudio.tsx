"use client";

import React, { useState, useEffect, useRef } from "react";
import { Palette, Check, Sparkles, X, Play, Plus } from "lucide-react";
import {
  ACCENT_PRESETS,
  AccentPreset,
  getActiveAccent,
  applyAccent,
} from "@/lib/accentStudio";

interface AccentStudioProps {
  className?: string;
}

export const AccentStudio: React.FC<AccentStudioProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentAccent, setCurrentAccent] = useState<AccentPreset>(ACCENT_PRESETS[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize with storage on mount and listen to changes
  useEffect(() => {
    const active = getActiveAccent();
    setCurrentAccent(active);
    applyAccent(active.id);

    const handleAccentChange = (e: Event) => {
      const customEvent = e as CustomEvent<AccentPreset>;
      if (customEvent.detail) {
        setCurrentAccent(customEvent.detail);
      }
    };

    window.addEventListener("nanaflix-accent-changed", handleAccentChange);
    return () => {
      window.removeEventListener("nanaflix-accent-changed", handleAccentChange);
    };
  }, []);

  // Click outside and Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectPreset = (presetId: string) => {
    const updated = applyAccent(presetId);
    setCurrentAccent(updated);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* TRIGGER BUTTON (PALETTE WITH SMART GLOW DOT) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Đổi màu giao diện (Accent Studio)"
        aria-label="Đổi màu giao diện (Accent Studio)"
        aria-expanded={isOpen}
        className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-zinc-900/90 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 shadow-sm group outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <Palette className="w-4 h-4 transition-transform group-hover:rotate-45 duration-300" />

        {/* Glow indicator dot of current accent */}
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-black transition-all duration-300"
          style={{
            backgroundColor: currentAccent.color,
            boxShadow: `0 0 10px ${currentAccent.glow}`,
          }}
        />
      </button>

      {/* ACCENT STUDIO COMPACT POPOVER */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Tùy biến Accent Studio"
          className="absolute top-full mt-2 right-0 w-[310px] sm:w-[350px] bg-zinc-950/95 border border-white/20 backdrop-blur-2xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-4 z-[110] animate-in fade-in zoom-in-95 duration-150"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-md transition-all duration-300"
                style={{
                  backgroundColor: currentAccent.color,
                  boxShadow: `0 0 14px ${currentAccent.glow}`,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm tracking-tight flex items-center gap-1.5">
                  <span>Accent Studio</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-gray-300 border border-white/10 font-medium">
                    6 Presets
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">Tùy biến màu sắc rạp chiếu</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng"
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* REALTIME LIVE MINI PREVIEW */}
          <div className="mb-3.5 p-3 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="font-semibold text-gray-300">Live Preview:</span>
              <span className="text-xs font-bold text-white flex items-center gap-1">
                <span>{currentAccent.icon}</span>
                <span>{currentAccent.name}</span>
              </span>
            </div>

            {/* Mini Simulated Components */}
            <div className="flex items-center gap-2 pt-1">
              <div
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-default"
                style={{
                  backgroundColor: currentAccent.color,
                  boxShadow: `0 4px 15px -2px ${currentAccent.glow}`,
                }}
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Xem Ngay</span>
              </div>

              <div className="inline-flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-white/10 border border-white/15 text-xs font-medium text-gray-200 cursor-default">
                <Plus className="w-3 h-3 text-gray-300" />
                <span>Lưu</span>
              </div>
            </div>

            {/* Simulated active tab underline */}
            <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: "60%",
                  backgroundColor: currentAccent.color,
                  boxShadow: `0 0 10px ${currentAccent.glow}`,
                }}
              />
            </div>
          </div>

          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
            <span>Chọn màu giao diện</span>
            <span className="text-[10px] text-zinc-500 lowercase">bấm đổi tức thì</span>
          </div>

          {/* 6 ACCENT PRESETS GRID (2x3) */}
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Danh sách màu giao diện">
            {ACCENT_PRESETS.map((preset) => {
              const isSelected = currentAccent.id === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${preset.name}: ${preset.subtitle}`}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isSelected
                      ? "bg-white/15 border-white/40 shadow-lg scale-[1.02]"
                      : "bg-zinc-900/70 hover:bg-zinc-800/90 border-white/10 hover:border-white/25"
                  }`}
                  style={
                    isSelected
                      ? {
                          borderColor: preset.border,
                          boxShadow: `0 4px 18px -4px ${preset.glow}`,
                        }
                      : {}
                  }
                >
                  {/* COLOR SWATCH WITH GLOW */}
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white flex-none transition-transform group-hover:scale-110 shadow-md"
                    style={{
                      backgroundColor: preset.color,
                      boxShadow: isSelected
                        ? `0 0 14px ${preset.glow}`
                        : `0 0 6px ${preset.glow}`,
                    }}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    ) : (
                      <span className="text-xs">{preset.icon}</span>
                    )}
                  </div>

                  {/* LABEL & BADGE */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-black truncate ${
                          isSelected
                            ? "text-white"
                            : "text-gray-200 group-hover:text-white"
                        }`}
                      >
                        {preset.badgeText}
                      </p>
                      {isSelected && (
                        <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">
                      {preset.subtitle.split("•")[0]?.trim()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* FOOTER NOTE */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10.5px] text-gray-400 px-1">
            <span>
              Đang dùng: <strong className="text-white">{currentAccent.icon} {currentAccent.badgeText}</strong>
            </span>
            <span className="text-zinc-500">Auto-saved</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccentStudio;
