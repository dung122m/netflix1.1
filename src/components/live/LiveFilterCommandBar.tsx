"use client";

import React, { useState } from "react";
import { Flame, RotateCcw, Search, Trophy, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import type { MatchStatusFilter } from "./hooks/useLiveFootballFilters";

export interface LiveFilterCounts {
  live: number;
  upcoming: number;
  finished: number;
  withStream: number;
  featured: number;
  total: number;
}

export interface LiveFilterCommandBarProps {
  activeSection: "matches" | "match-center" | "standings";
  selectedStatus: MatchStatusFilter;
  onlyFeatured: boolean;
  searchQuery: string;
  filteredCount: number;
  counts: LiveFilterCounts;
  hasActiveFilters: boolean;
  onStatusChange: (status: MatchStatusFilter) => void;
  onFeaturedToggle: () => void;
  onToggleStandings: () => void;
  onSearchChange: (query: string) => void;
  onResetFilters: () => void;
}

/**
 * Renders the unified sports filter capsule (All, Live, Upcoming, Featured, Standings),
 * desktop inline search bar, collapsible mobile search field, and filter reset banner.
 */
export function LiveFilterCommandBar({
  activeSection,
  selectedStatus,
  onlyFeatured,
  searchQuery,
  filteredCount,
  counts,
  hasActiveFilters,
  onStatusChange,
  onFeaturedToggle,
  onToggleStandings,
  onSearchChange,
  onResetFilters,
}: LiveFilterCommandBarProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <div className="relative z-30 space-y-2 sm:space-y-3 pt-1 pb-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 touch-pan-x touch-pan-y shrink-0 max-w-full order-2 lg:order-1">
          {!isMobileSearchOpen && !searchQuery && (
            <Tooltip content="Tìm kiếm trận đấu" side="bottom">
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(true)}
                aria-label="Tìm kiếm trận đấu"
                className="lg:hidden flex items-center justify-center w-9 h-9 min-h-[36px] sm:min-h-[38px] rounded-xl bg-zinc-900/90 text-zinc-400 hover:text-white shrink-0 transition"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}

          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/90 shrink-0 shadow-sm">
            <button
              type="button"
              onClick={() => onStatusChange("all")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                activeSection !== "standings" && selectedStatus === "all"
                  ? "bg-netflix-red text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>Tất cả</span>
              <span
                className={`tabular-nums text-[11px] ${
                  activeSection !== "standings" && selectedStatus === "all"
                    ? "opacity-80 font-normal"
                    : "opacity-60"
                }`}
              >
                ({counts.total})
              </span>
            </button>

            {counts.live > 0 && (
              <button
                type="button"
                onClick={() => onStatusChange("live")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                  activeSection !== "standings" && selectedStatus === "live"
                    ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                    : "text-zinc-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
                <span className="min-[380px]:hidden">Live</span>
                <span className="hidden min-[380px]:inline">Đang diễn ra</span>
                <span className="opacity-80 tabular-nums text-[11px] font-normal">
                  ({counts.live})
                </span>
              </button>
            )}

            {counts.upcoming > 0 && (
              <button
                type="button"
                onClick={() => onStatusChange("upcoming")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                  activeSection !== "standings" && selectedStatus === "upcoming"
                    ? "bg-netflix-red text-white font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="min-[380px]:hidden">Sắp đá</span>
                <span className="hidden min-[380px]:inline">Sắp diễn ra</span>
                <span className="opacity-80 tabular-nums text-[11px] font-normal">
                  ({counts.upcoming})
                </span>
              </button>
            )}

            {counts.finished > 0 && (
              <button
                type="button"
                onClick={() => onStatusChange("finished")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                  activeSection !== "standings" && selectedStatus === "finished"
                    ? "bg-netflix-red text-white font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="min-[380px]:hidden">Xong</span>
                <span className="hidden min-[380px]:inline">Đã kết thúc</span>
                <span className="opacity-80 tabular-nums text-[11px] font-normal">
                  ({counts.finished})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onFeaturedToggle}
              aria-pressed={onlyFeatured}
              aria-label="Chỉ hiện các trận cầu tâm điểm / đại chiến hấp dẫn nhất"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                activeSection !== "standings" && onlyFeatured
                  ? "bg-netflix-red text-white shadow-md shadow-black/50 font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Flame
                className={`w-3.5 h-3.5 shrink-0 ${
                  onlyFeatured
                    ? "text-amber-200 fill-amber-300"
                    : "text-amber-400 fill-amber-400/20"
                }`}
              />
              <span>Tâm điểm</span>
              {counts.featured > 0 && (
                <span className="opacity-80 tabular-nums text-[11px] font-normal">
                  ({counts.featured})
                </span>
              )}
            </button>

            <div className="w-[1px] h-4 bg-white/10 mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={onToggleStandings}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[36px] ${
                activeSection === "standings"
                  ? "bg-netflix-red text-white font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Trophy
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeSection === "standings"
                    ? "text-amber-200"
                    : "text-amber-400"
                }`}
              />
              <span>Bảng xếp hạng</span>
            </button>
          </div>
        </div>

        {/* Desktop search bar */}
        <div className="hidden lg:block relative w-72 xl:w-80 shrink-0 order-1 lg:order-2 lg:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm trận, giải đấu, bình luận viên..."
            className="w-full pl-9 pr-9 py-2 sm:py-2.5 rounded-xl bg-zinc-900/90 text-base sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-netflix-red/50 transition font-medium shadow-inner border border-white/5 focus:border-netflix-red/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Xóa tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile expandable search bar */}
        {(isMobileSearchOpen || searchQuery) && (
          <div className="flex lg:hidden items-center gap-1.5 w-full order-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm trận, giải đấu, BLV..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-zinc-900 text-base sm:text-xs text-white placeholder-zinc-400 focus:outline-none shadow-inner min-h-[36px] border border-white/10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Xóa tìm kiếm"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsMobileSearchOpen(false);
                if (searchQuery) onSearchChange("");
              }}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 text-xs font-semibold text-zinc-300 hover:text-white min-h-[36px] shrink-0"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-1.5 sm:pt-2 text-[11px] sm:text-xs">
          <span className="text-zinc-400">
            Hiển thị{" "}
            <strong className="text-white font-bold">{filteredCount}</strong>/
            {counts.total} trận
          </span>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-netflix-red hover:text-red-400 font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      )}
    </div>
  );
}

