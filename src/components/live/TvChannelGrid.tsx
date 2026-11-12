"use client";

import React from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { TvChannel } from "@/services/live/tv/service";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { TvChannelLogo, getPageNumbers } from "./TvChannelLogo";
import { TV_CHANNELS_PER_PAGE } from "./hooks/useLiveTvFilters";

export interface TvChannelGridProps {
  viewMode: "grid" | "list";
  displayedChannels: TvChannel[];
  filteredChannelsCount: number;
  selectedTvChannel: TvChannel | null;
  isPlaying: boolean;
  safePage: number;
  totalPages: number;
  onSelectChannel: (channel: TvChannel) => void;
  onPageChange: (page: number) => void;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

export function TvChannelGrid({
  viewMode,
  displayedChannels,
  filteredChannelsCount,
  selectedTvChannel,
  isPlaying,
  safePage,
  totalPages,
  onSelectChannel,
  onPageChange,
  hasActiveFilters,
  onResetFilters,
}: TvChannelGridProps) {
  if (displayedChannels.length === 0) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-zinc-900/50 p-6 sm:p-12 text-center text-zinc-400 space-y-3">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-zinc-400">
          <Search className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-zinc-300">
          Không tìm thấy kênh truyền hình nào phù hợp với bộ lọc.
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white text-xs font-bold transition shadow-md shadow-black/50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-3.5">
          {displayedChannels.map((ch) => {
            const isSelected = selectedTvChannel?.id === ch.id;
            return (
              <div
                key={ch.id}
                tabIndex={0}
                onClick={() => onSelectChannel(ch)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectChannel(ch);
                  }
                }}
                className={`live-channel-card group relative rounded-xl sm:rounded-2xl p-2 sm:p-3.5 cursor-pointer transition-all duration-300 flex flex-col items-center justify-between text-center focus-visible:scale-105 focus-visible:ring-4 focus-visible:ring-netflix-red focus-visible:outline-none ${
                  isSelected
                    ? "live-channel-active scale-102"
                    : "hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {/* HUY HIỆU GÓC TRÊN */}
                <div className="w-full flex items-center justify-between gap-1 mb-1 sm:mb-2">
                  <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 truncate max-w-[55px] sm:max-w-[80px]">
                    {ch.category.replace("Kênh ", "")}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isSelected && isPlaying && <PlayingEqualizer />}
                    <span
                      className={`px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9.5px] font-black uppercase ${
                        ch.quality.includes("FHD")
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-sky-500/15 text-sky-400"
                      }`}
                    >
                      {ch.quality.replace(" 1080p", "").replace(" 720p", "")}
                    </span>
                  </div>
                </div>

                {/* LOGO KÊNH */}
                <div className="live-channel-logo-container w-full h-11 sm:h-16 md:h-18 rounded-lg sm:rounded-xl bg-zinc-950/60 p-1.5 sm:p-2 flex items-center justify-center my-0.5 sm:my-1.5 shadow-inner group-hover:scale-105 transition-transform overflow-hidden">
                  <TvChannelLogo logo={ch.logo} name={ch.name} />
                </div>

                {/* TÊN KÊNH */}
                <h3 className="live-channel-title text-[11px] sm:text-xs md:text-sm font-bold sm:font-extrabold text-white group-hover:text-netflix-red transition line-clamp-1 mt-0.5 sm:mt-1 leading-tight w-full">
                  {ch.name}
                </h3>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5">
          {displayedChannels.map((ch) => {
            const isSelected = selectedTvChannel?.id === ch.id;
            return (
              <div
                key={ch.id}
                tabIndex={0}
                onClick={() => onSelectChannel(ch)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectChannel(ch);
                  }
                }}
                className={`group rounded-xl p-2 sm:p-2.5 cursor-pointer transition-all flex items-center justify-between gap-2.5 sm:gap-3 live-channel-card focus-visible:scale-102 focus-visible:ring-4 focus-visible:ring-netflix-red focus-visible:outline-none ${
                  isSelected
                    ? "live-channel-active ring-1 ring-netflix-red/60 bg-netflix-red/10"
                    : "bg-zinc-900/40 hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="live-channel-logo-container w-11 h-8 sm:w-14 sm:h-10 rounded-lg sm:rounded-xl bg-zinc-950/60 p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <TvChannelLogo logo={ch.logo} name={ch.name} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="live-channel-title text-[11px] sm:text-xs font-bold text-white group-hover:text-netflix-red truncate">
                        {ch.name}
                      </h4>
                      {isSelected && isPlaying && <PlayingEqualizer />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[10px] text-zinc-400 truncate">
                      <span>{ch.category.replace("Kênh ", "")}</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[8.5px] sm:text-[9.5px] px-1.5 sm:px-2 py-0.5 rounded font-black uppercase flex-shrink-0 ${
                    ch.quality.includes("FHD")
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-sky-500/15 text-sky-400"
                  }`}
                >
                  {ch.quality.replace(" 1080p", "").replace(" 720p", "")}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* THANH ĐIỀU HƯỚNG PHÂN TRANG THEO SỐ TRANG (NUMBERED PAGINATION) */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-2 mt-6">
          <div className="text-xs text-zinc-400 text-center sm:text-left">
            Hiển thị <span className="text-white font-bold">{(safePage - 1) * TV_CHANNELS_PER_PAGE + 1}</span> -{" "}
            <span className="text-white font-bold">
              {Math.min(safePage * TV_CHANNELS_PER_PAGE, filteredChannelsCount)}
            </span>{" "}
            trên tổng số <span className="text-netflix-red font-bold">{filteredChannelsCount}</span> kênh
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 justify-center flex-nowrap">
            {/* Nút Trang Trước */}
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => onPageChange(safePage - 1)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 ${
                safePage <= 1
                  ? "opacity-35 cursor-not-allowed bg-white/[0.02] text-zinc-500"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer shadow-sm active:scale-95"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            {/* Các nút số trang */}
            <div className="flex items-center gap-1 shrink-0">
              {getPageNumbers(safePage, totalPages).map((p, idx) => {
                if (p === "...") {
                  return (
                    <span key={`dots-${idx}`} className="px-1 py-1 text-xs text-zinc-500 font-bold">
                      ...
                    </span>
                  );
                }
                const isCurrent = p === safePage;
                return (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => onPageChange(Number(p))}
                    className={`min-w-[30px] sm:min-w-[32px] h-7 sm:h-8 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                      isCurrent
                        ? "bg-netflix-red text-white shadow-md shadow-black/50 font-black scale-105"
                        : "bg-zinc-900/90 text-zinc-300 hover:text-white hover:bg-zinc-800"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Nút Trang Sau */}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => onPageChange(safePage + 1)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 ${
                safePage >= totalPages
                  ? "opacity-35 cursor-not-allowed bg-white/[0.02] text-zinc-500"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white cursor-pointer shadow-sm active:scale-95"
              }`}
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

