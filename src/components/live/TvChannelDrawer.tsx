"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { TvChannel } from "@/services/live/tv/service";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { TvChannelLogo } from "./TvChannelLogo";

export interface TvChannelDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  useMobilePortal: boolean;
  selectedChannel: TvChannel | null;
  channels: TvChannel[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectChannel: (channel: TvChannel, autoPlay?: boolean) => void;
  drawerListRef?: React.RefObject<HTMLDivElement | null>;
  activeChannelRef?: React.RefObject<HTMLButtonElement | null>;
}

export function TvChannelDrawer({
  isOpen,
  onClose,
  useMobilePortal,
  selectedChannel,
  channels,
  searchQuery,
  onSearchChange,
  onSelectChannel,
  drawerListRef,
  activeChannelRef,
}: TvChannelDrawerProps) {
  if (!selectedChannel) return null;

  return (
    <>
      {/* BACKDROP KHI MỞ DRAWER KÊNH TRÊN MOBILE & DESKTOP */}
      <div
        className={`${
          useMobilePortal
            ? "fixed inset-0 z-[100000] bg-black/80"
            : "fixed inset-0 sm:absolute sm:inset-0 z-[100000] sm:z-40 bg-black/75 sm:bg-black/40"
        } backdrop-blur-sm transition-all duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* DRAWER / BOTTOM SHEET DANH SÁCH KÊNH TRUYỀN HÌNH (TỐI ƯU CẢM ỨNG MOBILE) */}
      <aside
        className={`${
          useMobilePortal
            ? "fixed inset-x-0 bottom-0 z-[100001] w-full max-h-[85vh] max-h-[85dvh] rounded-t-3xl bg-zinc-950/98 p-3.5 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] shadow-2xl backdrop-blur-2xl"
            : "fixed inset-x-0 bottom-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto z-[100001] sm:z-50 w-full sm:w-[380px] max-h-[85vh] max-h-[85dvh] sm:max-h-full rounded-t-3xl sm:rounded-none bg-zinc-950/98 sm:bg-zinc-950/95 p-3.5 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] sm:p-4 shadow-2xl backdrop-blur-2xl"
        } transition-all duration-300 flex flex-col ${
          isOpen
            ? "translate-y-0 sm:translate-x-0 opacity-100 pointer-events-auto visible"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 pointer-events-none invisible"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* THANH VUỐT KÉO GỢI Ý TRÊN MOBILE */}
        <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

        <div className="mb-2.5 flex items-center justify-between pb-2.5 shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-netflix-red animate-ping" />
              <p className="text-[11px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-netflix-red">
                Kênh Truyền Hình Trực Tiếp
              </p>
            </div>
            <p className="mt-0.5 truncate text-xs sm:text-xs font-bold text-white">
              Đang xem: {selectedChannel.name}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded-full p-2 text-white hover:bg-white/20 active:scale-95 bg-white/10 transition shrink-0 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center shadow-sm"
            title="Đóng danh sách kênh"
            aria-label="Đóng"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Ô TÌM KIẾM KÊNH TRONG DRAWER */}
        <div className="relative mb-2.5 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kênh theo tên, đài, danh mục..."
            className="w-full pl-9 pr-8 py-2 sm:py-1.5 rounded-xl bg-white/10 text-xs text-white placeholder-zinc-400 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* DANH SÁCH CUỘN KÊNH (TOUCH-FRIENDLY CHO MOBILE) */}
        <div
          ref={drawerListRef}
          className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin overscroll-contain"
        >
          {channels.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400">
              Không tìm thấy kênh phù hợp với tìm kiếm.
            </div>
          ) : (
            channels.map((channel) => {
              const active = selectedChannel.id === channel.id;
              return (
                <button
                  key={channel.id}
                  ref={active ? activeChannelRef : undefined}
                  type="button"
                  onClick={() => onSelectChannel(channel, false)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2.5 sm:p-2 text-left transition min-h-[56px] active:scale-[0.98] cursor-pointer touch-manipulation ${
                    active
                      ? "bg-netflix-red/20 text-white border-l-4 border-l-netflix-red shadow-md shadow-black/50"
                      : "bg-white/[0.04] text-zinc-200 hover:bg-white/[0.1] active:bg-white/[0.15]"
                  }`}
                >
                  <span className="flex h-11 w-14 sm:h-10 sm:w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-900/90 p-1 shadow-inner">
                    <TvChannelLogo
                      logo={channel.logo}
                      name={channel.name}
                      size="sm"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs sm:text-xs font-bold">
                        {channel.name}
                      </span>
                      {active && <PlayingEqualizer />}
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                      <span className="truncate text-[11px] sm:text-[10px] text-zinc-400">
                        {channel.category}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-emerald-400 font-bold uppercase">
                        {channel.quality}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* NÚT ĐÓNG TO RÕ Ở CUỐI DRAWER DÀNH RIÊNG CHO MOBILE */}
        <div className="pt-2.5 mt-2 shrink-0 sm:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-[0.99] text-white font-semibold text-xs transition cursor-pointer"
          >
            Đóng danh sách kênh
          </button>
        </div>
      </aside>
    </>
  );
}

