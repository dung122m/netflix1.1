"use client";

import React, { type RefObject } from "react";
import { AlertCircle, Check, Mic, RotateCcw, X } from "lucide-react";
import type { StreamServer } from "@/services/liveFootballService";
import {
  getSourceQuality,
  parseServerDisplayLabel,
} from "@/services/live/shared/serverSelectionHelper";
import { toCanonicalSourceUrl } from "@/services/live/shared/streamUrlHelper";
import { PlayingEqualizer } from "./PlayingEqualizer";
import { Tooltip } from "@/components/ui/Tooltip";

export interface LiveSourceDrawerProps {
  serversCount: number;
  sortedAvailableServers: StreamServer[];
  currentServer: StreamServer | null;
  isRailVisible: boolean;
  useMobilePortal: boolean;
  title: string;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  drawerListRef: RefObject<HTMLDivElement | null>;
  activeOptionRef: RefObject<HTMLButtonElement | null>;
  onCloseRail: () => void;
  onRetry: () => void;
  onSelectServer: (server: StreamServer, displayLabel: string, quality: string) => void;
}

/**
 * Slide-over / bottom-sheet drawer for switching live football broadcast servers.
 */
export function LiveSourceDrawer({
  serversCount,
  sortedAvailableServers,
  currentServer,
  isRailVisible,
  useMobilePortal,
  title,
  isPlaying,
  isLoading,
  hasError,
  drawerListRef,
  activeOptionRef,
  onCloseRail,
  onRetry,
  onSelectServer,
}: LiveSourceDrawerProps) {
  if (serversCount === 0) return null;

  return (
    <>
      {/* BACKDROP KHI MỞ DRAWER CHỌN NGUỒN PHÁT TRÊN MOBILE & DESKTOP */}
      <div
        className={`${
          useMobilePortal
            ? "fixed inset-0 z-[100000] bg-black/80"
            : "fixed inset-0 sm:absolute sm:inset-0 z-[100000] sm:z-40 bg-black/75 sm:bg-black/40"
        } backdrop-blur-sm transition-all duration-300 ${
          isRailVisible
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onCloseRail();
        }}
      />

      {/* DRAWER / BOTTOM SHEET CHỌN NGUỒN PHÁT CỦA TRẬN ĐANG XEM */}
      <aside
        className={`${
          useMobilePortal
            ? "fixed inset-x-0 bottom-0 z-[100001] w-full max-h-[85dvh] rounded-t-3xl bg-zinc-950/98 p-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] shadow-2xl backdrop-blur-2xl"
            : "fixed inset-x-0 bottom-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto z-[100001] sm:z-50 w-full sm:w-[360px] max-h-[85dvh] sm:max-h-full rounded-t-3xl sm:rounded-none bg-zinc-950/98 sm:bg-zinc-950/95 p-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] sm:pb-4 shadow-2xl backdrop-blur-2xl"
        } transition-all duration-300 flex flex-col ${
          isRailVisible
            ? "translate-y-0 sm:translate-x-0 opacity-100 pointer-events-auto visible"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full opacity-0 pointer-events-none invisible"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/30 rounded-full mx-auto mb-3 sm:hidden flex-shrink-0" />

        <div className="mb-3 flex items-center justify-between pb-3 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs font-bold text-amber-400">
                Nguồn phát trực tiếp
              </p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300 font-bold tabular-nums">
                {sortedAvailableServers.length}
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-bold text-white">{title}</p>
          </div>
          <Tooltip content="Đóng danh sách nguồn phát" side="left">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCloseRail();
              }}
              className="rounded-full p-2 text-white hover:bg-white/20 active:scale-95 bg-white/10 transition flex-shrink-0 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center shadow-sm"
              aria-label="Đóng danh sách nguồn phát"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </Tooltip>
        </div>

        <div
          ref={drawerListRef}
          className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin overscroll-contain"
        >
          {sortedAvailableServers.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-red-950/20 text-zinc-300 text-xs flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <span>Tất cả nguồn phát đang gặp sự cố hoặc gián đoạn tín hiệu.</span>
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold transition flex items-center gap-2 cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử kết nối lại</span>
              </button>
            </div>
          ) : (
            sortedAvailableServers.map((s, idx) => {
              const isSelected =
                toCanonicalSourceUrl(currentServer?.url) ===
                toCanonicalSourceUrl(s.url);
              const quality = getSourceQuality(s);
              const displayLabel = parseServerDisplayLabel(s, idx);

              return (
                <button
                  key={`${toCanonicalSourceUrl(s.url) || "srv"}-${idx}`}
                  type="button"
                  onClick={() => onSelectServer(s, displayLabel, quality || "")}
                  ref={isSelected ? activeOptionRef : undefined}
                  className={`w-full rounded-xl p-2.5 sm:p-3 text-left transition flex items-center gap-2.5 cursor-pointer min-h-[44px] active:scale-[0.99] touch-manipulation ${
                    isSelected
                      ? "bg-red-950/70 text-white shadow-md shadow-black/50"
                      : "bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
                  }`}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-emerald-400 font-bold" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white/20" />
                    )}
                  </div>

                  <div className="shrink-0 flex items-center">
                    {quality === "FHD" ? (
                      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>FHD</span>
                      </span>
                    ) : quality === "HD" ? (
                      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                        <span>HD</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                        <span>SD</span>
                      </span>
                    )}
                  </div>

                  <span className="text-zinc-500 text-xs shrink-0">·</span>

                  <span className="truncate text-xs sm:text-sm font-semibold text-zinc-100 flex-1 min-w-0">
                    {displayLabel}
                  </span>

                  {isSelected && isPlaying && !isLoading && !hasError && (
                    <div className="shrink-0">
                      <PlayingEqualizer />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="pt-2.5 mt-2 flex-shrink-0 sm:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCloseRail();
            }}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation shadow-md"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đóng danh sách</span>
          </button>
        </div>
      </aside>
    </>
  );
}
