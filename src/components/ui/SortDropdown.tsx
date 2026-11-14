"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, ChevronDown, LucideIcon, ArrowUpDown, Loader2 } from "lucide-react";

export interface SortOption<T extends string = string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  color?: string;
}

export interface SortDropdownProps<T extends string = string> {
  value: T;
  onChange: (newValue: T) => void;
  options: SortOption<T>[];
  labelPrefix?: string;
  className?: string;
  buttonClassName?: string;
  menuAlign?: "left" | "right";
  size?: "sm" | "md";
  isPending?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function SortDropdown<T extends string = string>({
  value,
  onChange,
  options,
  labelPrefix = "Sắp xếp",
  className = "",
  buttonClassName = "",
  menuAlign = "right",
  size = "sm",
  isPending = false,
  onOpenChange,
}: SortDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const isCustomSort = Boolean(value && value !== "latest" && value !== options[0]?.value);

  const updateIsOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setIsOpen((prev) => {
        const val = typeof next === "function" ? next(prev) : next;
        onOpenChange?.(val);
        return val;
      });
    },
    [onOpenChange]
  );

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        updateIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        updateIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateIsOpen]);

  const handleSelect = useCallback(
    (newVal: T) => {
      onChange(newVal);
      updateIsOpen(false);
    },
    [onChange, updateIsOpen]
  );

  const SelectedIcon = selectedOption?.icon || ArrowUpDown;

  const sizeButtonClasses =
    size === "md"
      ? "h-10 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold"
      : "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold";

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* NÚT KÍCH HOẠT DROPDOWN */}
      <button
        type="button"
        onClick={() => updateIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${labelPrefix}: ${selectedOption?.label || "Mặc định"}`}
        className={`inline-flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-md shadow-black/40 active:scale-95 select-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black ${sizeButtonClasses} ${
          isCustomSort
            ? "bg-white/[0.12] text-white ring-1 ring-white/10"
            : isOpen
            ? "bg-zinc-800 text-white"
            : "bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white"
        } ${buttonClassName}`}
      >
        <SelectedIcon
          className={`w-3.5 h-3.5 shrink-0 ${
            isCustomSort
              ? "text-netflix-red"
              : selectedOption?.color || "text-zinc-400"
          }`}
        />
        {labelPrefix && (
          <span className="text-zinc-400 font-normal hidden min-[480px]:inline">
            {labelPrefix}:
          </span>
        )}
        <span className="text-white font-bold whitespace-nowrap">
          {selectedOption?.shortLabel || selectedOption?.label}
        </span>
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 text-netflix-red animate-spin flex-none" />
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 flex-none ${
              isOpen ? "rotate-180 text-white" : ""
            }`}
          />
        )}
      </button>

      {/* POPUP MENU SẮP XẾP */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className={`absolute top-full mt-1.5 z-50 w-56 sm:w-60 rounded-2xl bg-zinc-950/98 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150 ${
            menuAlign === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-white/[0.08] mb-1 flex items-center justify-between select-none">
            <span>{labelPrefix || "Sắp xếp"} theo</span>
          </div>

          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              const OptionIcon = option.icon || ArrowUpDown;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left select-none ${
                    isSelected
                      ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                      : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <OptionIcon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? "text-white" : option.color || "text-zinc-400"
                      }`}
                    />
                    <span className="truncate">{option.label}</span>
                  </div>

                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SortDropdown;
