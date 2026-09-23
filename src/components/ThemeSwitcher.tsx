"use client";

import React, { useState, useEffect, useRef } from "react";
import { Palette, Check, Sparkles, X, Sun, Moon } from "lucide-react";
import {
  THEMES,
  getCurrentTheme,
  setTheme,
  ThemeOption,
  getThemeMode,
  setThemeMode,
  ThemeMode,
} from "@/lib/theme";

interface ThemeSwitcherProps {
  className?: string;
  isMobileInline?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  className = "",
  isMobileInline = false,
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>(THEMES[0]);
  const [currentMode, setCurrentMode] = useState<ThemeMode>("dark");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentTheme(getCurrentTheme());
    setCurrentMode(getThemeMode());

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeOption>;
      if (customEvent.detail) {
        setCurrentTheme(customEvent.detail);
      }
    };

    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail) {
        setCurrentMode(customEvent.detail);
      }
    };

    window.addEventListener("nanaflix-theme-changed", handleThemeChange);
    window.addEventListener("nanaflix-mode-changed", handleModeChange);
    return () => {
      window.removeEventListener("nanaflix-theme-changed", handleThemeChange);
      window.removeEventListener("nanaflix-mode-changed", handleModeChange);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectTheme = (themeId: string) => {
    setTheme(themeId);
    setIsOpen(false);
  };

  const handleSelectMode = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  // If used as an inline grid inside the mobile drawer menu
  if (isMobileInline) {
    return (
      <div className="py-1.5 px-1">
        <div className="flex items-center justify-between gap-2">
          {/* Mode Switcher Pill */}
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-900 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectMode("dark")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                currentMode === "dark"
                  ? "bg-zinc-800 text-amber-300 shadow-sm border border-white/15"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Moon size={12} />
              <span>Tối</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode("light")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                currentMode === "light"
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Sun size={12} className="text-amber-500" />
              <span>Sáng</span>
            </button>
          </div>

          {/* Color Dots Swatch Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {THEMES.map((theme) => {
              const isSelected = currentTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme.id)}
                  title={theme.name}
                  aria-label={theme.name}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: theme.color,
                    boxShadow: isSelected ? `0 0 10px ${theme.glow}` : "none",
                  }}
                >
                  {isSelected && <Check size={11} className="text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Đổi màu sắc & chế độ sáng/tối"
        aria-label="Đổi màu giao diện"
        className="relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-zinc-900/90 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white transition cursor-pointer active:scale-95 shadow-sm group outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <Palette className="w-4 h-4 transition-transform group-hover:rotate-45 duration-300" />

        {/* Glow indicator dot of current theme */}
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-black"
          style={{
            backgroundColor: currentTheme.color,
            boxShadow: `0 0 8px ${currentTheme.glow}`,
          }}
        />
      </button>

      {/* THEME PICKER POPOVER DROPDOWN */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-[300px] sm:w-[340px] bg-zinc-950/95 border border-white/20 backdrop-blur-2xl rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* HEADER */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                style={{
                  backgroundColor: currentTheme.color,
                  boxShadow: `0 0 12px ${currentTheme.glow}`,
                }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-white font-black text-sm">Giao Diện & Màu Sắc</h4>
                <p className="text-[11px] text-gray-400">Tùy biến rạp chiếu của bạn</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* CHẾ ĐỘ SÁNG / TỐI (LIGHT / DARK SWITCHER) */}
          <div className="mb-3.5 p-1 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSelectMode("dark")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentMode === "dark"
                  ? "bg-zinc-800 text-white shadow-md border border-white/15"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-amber-300" />
              <span>Chế độ Tối</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectMode("light")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentMode === "light"
                  ? "bg-white text-black shadow-md border border-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Chế độ Sáng</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Chủ đề màu sắc (6 phong cách)
          </div>

          {/* THEME OPTIONS GRID */}
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((theme) => {
              const isSelected = currentTheme.id === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all text-left cursor-pointer group ${
                    isSelected
                      ? "bg-white/15 border-white/40 shadow-lg scale-[1.02]"
                      : "bg-zinc-900/70 hover:bg-zinc-800/90 border-white/10 hover:border-white/25"
                  }`}
                >
                  {/* COLOR SWATCH */}
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-white flex-none transition-transform group-hover:scale-110 shadow-md"
                    style={{
                      backgroundColor: theme.color,
                      boxShadow: isSelected
                        ? `0 0 14px ${theme.glow}`
                        : `0 0 6px ${theme.glow}`,
                    }}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    ) : (
                      <span className="text-xs">{theme.icon}</span>
                    )}
                  </div>

                  {/* LABEL & SUBTITLE */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-black truncate ${
                        isSelected ? "text-white" : "text-gray-200 group-hover:text-white"
                      }`}
                    >
                      {theme.name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {theme.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* FOOTER NOTE */}
          <div className="mt-3 pt-2.5 border-t border-white/10 text-center">
            <span className="text-[10.5px] text-gray-400">
              💡 Tự động lưu và đồng bộ trên mọi trang
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export const ThemeModeToggle: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    setMode(getThemeMode());
    const handleModeChange = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      if (customEvent.detail) setMode(customEvent.detail);
    };
    window.addEventListener("nanaflix-mode-changed", handleModeChange);
    return () =>
      window.removeEventListener("nanaflix-mode-changed", handleModeChange);
  }, []);

  const toggleMode = () => {
    const nextMode = mode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
  };

  return (
    <button
      type="button"
      onClick={toggleMode}
      title={
        mode === "dark"
          ? "Chuyển sang chế độ Sáng (Day Cinema)"
          : "Chuyển sang chế độ Tối (Cinema Night)"
      }
      aria-label="Đổi sáng tối"
      className={`relative flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-zinc-900/90 border border-white/15 hover:border-white/30 text-gray-300 hover:text-white transition cursor-pointer active:scale-95 shadow-sm ${className}`}
    >
      {mode === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 hover:rotate-90 transition-transform duration-300" />
      ) : (
        <Moon className="w-4 h-4 text-sky-400 hover:-rotate-45 transition-transform duration-300" />
      )}
    </button>
  );
};

export default ThemeSwitcher;
