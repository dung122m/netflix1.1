"use client";

import React, { useRef, type RefObject } from "react";
import {
  Search,
  Tv,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  Zap,
} from "lucide-react";
import type { TvChannel } from "@/services/live/tv/service";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { Tooltip } from "@/components/ui/Tooltip";
import { TvChannelLogo } from "./TvChannelLogo";
import { TvChannelGrid } from "./TvChannelGrid";

export interface LiveTvChannelBrowserProps {
  channels: TvChannel[];
  categories: string[];
  popularChannels: TvChannel[];
  filteredChannels: TvChannel[];
  displayedChannels: TvChannel[];
  selectedTvChannel: TvChannel | null;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onlyFhd: boolean;
  onToggleOnlyFhd: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  isPlaying: boolean;
  safePage: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onSelectChannel: (channel: TvChannel, keepRailOpen?: boolean) => void;
  onPageChange: (page: number) => void;
  onResetFilters: () => void;
  channelGridTopRef: RefObject<HTMLDivElement | null>;
}

/**
 * Renders Quick Access popular TV channels bar, responsive category sidebar/tabs,
 * search & FHD filter toolbar, and paginated channel grid/list.
 */
export function LiveTvChannelBrowser({
  channels,
  categories,
  popularChannels,
  filteredChannels,
  displayedChannels,
  selectedTvChannel,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onlyFhd,
  onToggleOnlyFhd,
  viewMode,
  onViewModeChange,
  isPlaying,
  safePage,
  totalPages,
  hasActiveFilters,
  onSelectChannel,
  onPageChange,
  onResetFilters,
  channelGridTopRef,
}: LiveTvChannelBrowserProps) {
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const popularScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const scrollPopular = (direction: "left" | "right") => {
    if (popularScrollRef.current) {
      const offset = direction === "left" ? -260 : 260;
      popularScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <>
      {/* 2. DẢI "KÊNH PHỔ BIẾN / XEM NHIỀU NHẤT" (QUICK ACCESS ROW) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-300 tracking-wide">
            Kênh phổ biến
          </span>
        </div>

        <div className="relative group/popular">
          <Tooltip
            content="Cuộn trái"
            side="right"
            wrapperClassName="absolute -left-2 top-1/2 -translate-y-1/2 z-20"
          >
            <button
              type="button"
              onClick={() => scrollPopular("left")}
              aria-label="Cuộn trái"
              className="w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <div
            ref={popularScrollRef}
            className="flex items-center gap-2 overflow-x-auto py-1 px-3 scrollbar-none [&::-webkit-scrollbar]:hidden scroll-smooth"
          >
            {popularChannels.map((ch) => {
              const isSelected = selectedTvChannel?.id === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onSelectChannel(ch)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all flex-none cursor-pointer focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:outline-none ${
                    isSelected
                      ? "bg-netflix-red text-white shadow-md shadow-black/50 font-bold"
                      : "bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <div className="w-7 h-5 sm:w-8 sm:h-6 rounded-md bg-zinc-950/90 p-0.5 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <TvChannelLogo logo={ch.logo} name={ch.name} size="sm" />
                  </div>
                  <span className="text-xs whitespace-nowrap">
                    {ch.name.split(" ")[0]}
                  </span>
                  {isSelected && <PlayingEqualizer />}
                  <span
                    className={`text-[9px] px-1 py-0.5 rounded font-black uppercase ${
                      isSelected
                        ? "bg-black/30 text-white"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    FHD
                  </span>
                </button>
              );
            })}
          </div>

          <Tooltip
            content="Cuộn phải"
            side="left"
            wrapperClassName="absolute -right-2 top-1/2 -translate-y-1/2 z-20"
          >
            <button
              type="button"
              onClick={() => scrollPopular("right")}
              className="w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
              aria-label="Cuộn phải"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* 3. BỘ CHỌN KÊNH TRUYỀN HÌNH ĐA THIẾT BỊ (RESPONSIVE 2 CỘT CHO DESKTOP + HORIZONTAL TABS CHO MOBILE) */}
      <div className="pt-2">
        {/* MOBILE & TABLET (< lg): THANH CUỘN NGANG TABS DANH MỤC */}
        <div className="lg:hidden space-y-3 mb-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 min-w-0 shrink">
              <span className="whitespace-nowrap">Đài truyền hình</span>
              <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-semibold whitespace-nowrap shrink-0">
                {filteredChannels.length} kênh
              </span>
            </h2>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Lọc FHD */}
              <button
                type="button"
                onClick={onToggleOnlyFhd}
                className={`flex items-center gap-1 px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition  cursor-pointer whitespace-nowrap ${
                  onlyFhd
                    ? "bg-emerald-600 text-white "
                    : "bg-zinc-900 text-zinc-300  hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>FHD</span>
              </button>
              {/* Grid / List */}
              <div className="flex items-center p-0.5 rounded-xl bg-zinc-900 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewModeChange("grid")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "grid"
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-400"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange("list")}
                  className={`p-1.5 rounded-lg transition ${
                    viewMode === "list"
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-400"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Ô tìm kiếm mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm tên kênh (VTV3, HTV7, THVL...)"
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900 border border-white/10 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/25 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tabs cuộn ngang Mobile */}
          <div className="relative group/carousel">
            <button
              type="button"
              onClick={() => scrollCategories("left")}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 backdrop-blur-md cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div
              ref={categoryScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto py-1 px-3 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
            >
              <button
                type="button"
                onClick={() => onSelectCategory("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-white text-black shadow-md font-extrabold"
                    : "bg-zinc-900/90 text-zinc-300 hover:text-white"
                }`}
              >
                <Tv className="w-3.5 h-3.5 shrink-0" />
                <span>Tất cả</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-current font-black tabular-nums">
                  {channels.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = channels.filter((c) => c.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                        : "bg-zinc-900/90 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <span>{cat.replace("Kênh ", "")}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-current font-semibold">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollCategories("right")}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/95 hover:bg-white text-zinc-300 hover:text-black shadow-lg flex items-center justify-center transition-all opacity-80 backdrop-blur-md cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* CONTAINER CHÍNH: DESKTOP SIDEBAR + LƯỚI KÊNH */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          {/* DESKTOP SIDEBAR (>= lg) */}
          <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 space-y-3 sticky top-20 rounded-2xl bg-zinc-950/90 p-3.5 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between pb-2.5 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white">
                  Danh mục đài TV
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-bold">
                {channels.length} kênh
              </span>
            </div>

            {/* Ô tìm kiếm trong sidebar */}
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm kênh theo tên..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/25 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Danh sách danh mục dạng dọc */}
            <div className="space-y-1 max-h-[calc(100dvh-280px)] overflow-y-auto pr-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => onSelectCategory("all")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                  selectedCategory === "all"
                    ? "bg-netflix-red text-white shadow-md shadow-black/50"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tv className="w-3.5 h-3.5 shrink-0" />
                  <span>Tất cả kênh</span>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    selectedCategory === "all"
                      ? "bg-black/30 text-white"
                      : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {channels.length}
                </span>
              </button>

              {categories.map((cat) => {
                const count = channels.filter((c) => c.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="truncate pr-2">
                      {cat.replace("Kênh ", "")}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                        isSelected
                          ? "bg-black/30 text-white"
                          : "bg-white/10 text-zinc-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* CỘT PHẢI: LƯỚI KÊNH & TOOLBAR */}
          <div
            ref={channelGridTopRef}
            className="flex-1 min-w-0 space-y-4 w-full scroll-mt-24"
          >
            {/* Header thanh công cụ Desktop */}
            <div className="hidden lg:flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>
                    {selectedCategory === "all"
                      ? "Tất cả kênh truyền hình"
                      : selectedCategory}
                  </span>
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-netflix-red/20 text-netflix-red font-bold">
                  {filteredChannels.length} kênh
                </span>
                {totalPages > 1 && (
                  <span className="text-xs text-zinc-400 font-medium">
                    (Trang {safePage}/{totalPages})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* LỌC NHANH FHD */}
                <button
                  type="button"
                  onClick={onToggleOnlyFhd}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:outline-none ${
                    onlyFhd
                      ? "bg-emerald-600 text-white shadow-md shadow-black/50"
                      : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Chỉ FHD</span>
                </button>

                {/* NÚT CHUYỂN CHẾ ĐỘ XEM: GRID HOẶC LIST */}
                <div className="flex items-center p-1 rounded-xl bg-zinc-900">
                  <Tooltip content="Xem dạng lưới" side="top">
                    <button
                      type="button"
                      onClick={() => onViewModeChange("grid")}
                      aria-label="Xem dạng lưới"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        viewMode === "grid"
                          ? "bg-white text-black shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                  <Tooltip
                    content="Xem dạng danh sách gọn"
                    side="top"
                    align="end"
                  >
                    <button
                      type="button"
                      onClick={() => onViewModeChange("list")}
                      aria-label="Xem dạng danh sách gọn"
                      className={`p-1.5 rounded-lg transition cursor-pointer ${
                        viewMode === "list"
                          ? "bg-white text-black shadow-sm"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* DANH SÁCH KÊNH (GRID HOẶC LIST) */}
            <TvChannelGrid
              viewMode={viewMode}
              displayedChannels={displayedChannels}
              filteredChannelsCount={filteredChannels.length}
              selectedTvChannel={selectedTvChannel}
              isPlaying={isPlaying}
              safePage={safePage}
              totalPages={totalPages}
              onSelectChannel={onSelectChannel}
              onPageChange={onPageChange}
              hasActiveFilters={hasActiveFilters}
              onResetFilters={onResetFilters}
            />
          </div>
        </div>
      </div>
    </>
  );
}

