"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export interface SegmentedTabItem<T extends string = string> {
  id: T;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  iconColor?: string;
  count?: number;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: SegmentedTabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  variant?: "pills" | "contained" | "compact";
  size?: "sm" | "md";
  className?: string;
  scrollable?: boolean;
  ariaLabel?: string;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  variant = "pills",
  size = "md",
  className = "",
  scrollable = true,
  ariaLabel = "Thanh điều hướng danh mục",
}: SegmentedTabsProps<T>) {
  const isContained = variant === "contained";
  const isCompact = variant === "compact";
  const isSm = size === "sm" || isCompact;

  const scrollWrapperClass = scrollable
    ? "w-full min-w-0 max-w-full overflow-x-auto scrollbar-none pb-1 no-scrollbar flex items-center touch-pan-x touch-pan-y"
    : "flex items-center flex-wrap";

  const containerClass = isContained
    ? `p-1 rounded-xl bg-zinc-900/90 flex items-center gap-1 sm:gap-1.5 shadow-md shadow-black/40 ${className}`
    : `${scrollWrapperClass} gap-2 ${className}`;

  return (
    <div role="tablist" aria-label={ariaLabel} className={containerClass}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        let buttonStyle = "";

        if (isContained) {
          buttonStyle = isActive
            ? "bg-netflix-red text-white shadow-md font-bold"
            : "text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium";
        } else {
          buttonStyle = isActive
            ? "bg-netflix-red text-white shadow-md shadow-black/50 font-bold"
            : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/10 font-bold";
        }

        const sizeStyle = isSm
          ? "px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs rounded-lg"
          : "px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-xl";

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`flex-none shrink-0 flex items-center gap-1.5 sm:gap-2 transition-all duration-200 cursor-pointer whitespace-nowrap active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red select-none ${sizeStyle} ${buttonStyle} ${
              tab.disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""
            }`}
          >
            {Icon && (
              <Icon
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                  isActive ? "text-white" : tab.iconColor || "text-zinc-400"
                }`}
              />
            )}

            <span>{tab.label}</span>

            {/* SỐ ĐẾM / BADGE */}
            {typeof tab.count === "number" && (
              <span
                className={`font-sans tabular-nums text-[11px] sm:text-xs transition-opacity ${
                  isActive ? "text-white/90" : "text-zinc-400"
                }`}
              >
                ({tab.count})
              </span>
            )}

            {tab.badge && <span className="shrink-0">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
