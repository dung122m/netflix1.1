"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  LayoutGrid,
  Radio,
} from "lucide-react";
import type { StreamServer } from "@/services/liveFootballService";
import {
  getSourceQuality,
  parseServerDisplayLabel,
} from "@/services/live/shared/serverSelectionHelper";
import { toCanonicalSourceUrl } from "@/services/live/shared/streamUrlHelper";
import { Tooltip } from "@/components/ui/Tooltip";

export interface LiveServerSectionProps {
  availableServers: StreamServer[];
  currentServer: StreamServer | null;
  selectedServerIndex: number;
  copied: boolean;
  onCopyStream: () => void;
  onSelectServer: (server: StreamServer) => void;
}

/**
 * Renders the broadcast server list section in either expanded mobile/desktop grid view
 * or compact horizontal scrollable chip row with desktop navigation arrows.
 */
export function LiveServerSection({
  availableServers,
  currentServer,
  selectedServerIndex,
  copied,
  onCopyStream,
  onSelectServer,
}: LiveServerSectionProps) {
  const [isGridView, setIsGridView] = useState(true);
  const [showAllMobileServers, setShowAllMobileServers] = useState(false);
  const chipsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeChipRef = useRef<HTMLButtonElement | null>(null);
  const [canScrollChipsLeft, setCanScrollChipsLeft] = useState(false);
  const [canScrollChipsRight, setCanScrollChipsRight] = useState(false);

  const checkChipsScroll = useCallback(() => {
    const el = chipsContainerRef.current;
    if (!el) return;
    setCanScrollChipsLeft(el.scrollLeft > 4);
    setCanScrollChipsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const handleScrollChipsBy = useCallback(
    (amount: number) => {
      if (!chipsContainerRef.current) return;
      chipsContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
      setTimeout(checkChipsScroll, 220);
    },
    [checkChipsScroll],
  );

  const handleChipsWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = chipsContainerRef.current;
      if (!el) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        if (
          (e.deltaY < 0 && el.scrollLeft > 0) ||
          (e.deltaY > 0 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
        ) {
          el.scrollLeft += e.deltaY;
          checkChipsScroll();
        }
      }
    },
    [checkChipsScroll],
  );

  useEffect(() => {
    checkChipsScroll();
    const el = chipsContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => checkChipsScroll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [checkChipsScroll, isGridView, availableServers.length]);

  useEffect(() => {
    if (!isGridView && chipsContainerRef.current && activeChipRef.current) {
      const container = chipsContainerRef.current;
      const chip = activeChipRef.current;
      const targetScroll =
        chip.offsetLeft - container.offsetWidth / 2 + chip.offsetWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth",
      });
      setTimeout(checkChipsScroll, 250);
    }
  }, [selectedServerIndex, isGridView, checkChipsScroll]);

  return (
    <div className="keep-dark-cinema rounded-2xl sm:rounded-3xl bg-zinc-900/95 p-3 sm:p-4 shadow-xl space-y-2.5 w-full min-w-0">
      <div className="flex items-center justify-between gap-3 pb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-zinc-200 font-bold text-xs sm:text-sm">
            <Radio className="w-3.5 h-3.5 text-netflix-red shrink-0" />
            <span>Nguồn phát</span>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 font-bold tabular-nums">
              {availableServers.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {availableServers.length > 1 && (
            <Tooltip
              content={isGridView ? "Thu gọn dạng hàng" : "Mở rộng dạng lưới"}
              side="top"
            >
              <button
                type="button"
                onClick={() => setIsGridView((prev) => !prev)}
                className="flex items-center gap-1 text-[11px] font-bold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                aria-label={
                  isGridView ? "Thu gọn dạng hàng" : "Mở rộng dạng lưới"
                }
              >
                {isGridView ? (
                  <>
                    <ChevronUp className="w-3 h-3 text-netflix-red" />
                    <span>Dạng hàng</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid className="w-3 h-3 text-netflix-red" />
                    <span>Lưới ({availableServers.length})</span>
                  </>
                )}
              </button>
            </Tooltip>
          )}

          {!isGridView && availableServers.length > 3 && (
            <div className="hidden sm:flex items-center gap-1 bg-white/5 p-0.5 rounded-xl">
              <Tooltip content="Cuộn sang trái" side="top">
                <button
                  type="button"
                  onClick={() => handleScrollChipsBy(-260)}
                  disabled={!canScrollChipsLeft}
                  className="w-6 h-6 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  aria-label="Cuộn sang trái"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip content="Cuộn sang phải" side="top">
                <button
                  type="button"
                  onClick={() => handleScrollChipsBy(260)}
                  disabled={!canScrollChipsRight}
                  className="w-6 h-6 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  aria-label="Cuộn sang phải"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>
          )}

          <Tooltip
            content="Sao chép link stream trực tiếp"
            side="top"
            align="end"
          >
            <button
              type="button"
              onClick={onCopyStream}
              aria-label="Sao chép link stream trực tiếp"
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 hidden sm:inline">
                    Đã chép
                  </span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sao chép</span>
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </div>

      {availableServers.length === 0 ? (
        <div className="py-4 px-3 text-center rounded-xl bg-red-950/20 text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>Không có nguồn phát khả dụng</span>
        </div>
      ) : isGridView ? (
        <div className="w-full min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2 w-full min-w-0 pt-0.5 px-0.5 sm:max-h-72 sm:overflow-y-auto">
            {availableServers.map((s, idx) => {
              const isSelected = currentServer?.url === s.url;
              const qualityBadge = getSourceQuality(s);
              const cleanName = parseServerDisplayLabel(s, idx);
              const isHiddenOnMobile =
                !showAllMobileServers && idx >= 6 && !isSelected;

              return (
                <button
                  key={`${toCanonicalSourceUrl(s.url) || "sv"}-${idx}`}
                  type="button"
                  onClick={() => onSelectServer(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all items-center justify-between gap-2 cursor-pointer text-left min-w-0 ${
                    isHiddenOnMobile ? "hidden sm:flex" : "flex"
                  } ${
                    isSelected
                      ? "bg-red-950/80 text-white shadow-md shadow-black/50"
                      : "bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 truncate">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected
                          ? "bg-red-400 animate-pulse"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span className="truncate">{cleanName}</span>
                  </div>

                  {qualityBadge && (
                    <span
                      className={`shrink-0 px-1.5 py-0.5 text-[9px] font-black rounded tracking-wider ${
                        qualityBadge === "FHD"
                          ? isSelected
                            ? "bg-amber-500/25 text-amber-300"
                            : "bg-amber-500/15 text-amber-300"
                          : isSelected
                            ? "bg-sky-500/25 text-sky-300"
                            : "bg-sky-500/15 text-sky-300"
                      }`}
                    >
                      {qualityBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {availableServers.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllMobileServers((prev) => !prev)}
              className="sm:hidden w-full py-2.5 mt-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-zinc-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {showAllMobileServers ? (
                <>
                  <span>Thu gọn nguồn phát</span>
                  <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                </>
              ) : (
                <>
                  <span>Xem thêm ({availableServers.length - 6} nguồn khác)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="relative group/chips flex items-center w-full min-w-0">
          {canScrollChipsLeft && (
            <div className="absolute left-0 top-0 bottom-0 z-10 hidden sm:flex items-center pl-1 pr-8 bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-transparent pointer-events-none">
              <Tooltip
                content="Cuộn sang trái"
                side="top"
                wrapperClassName="pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => handleScrollChipsBy(-280)}
                  className="w-7 h-7 rounded-full bg-zinc-800/95 hover:bg-zinc-700 text-white shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Cuộn sang trái"
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-200" />
                </button>
              </Tooltip>
            </div>
          )}

          <div
            ref={chipsContainerRef}
            onScroll={checkChipsScroll}
            onWheel={handleChipsWheel}
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-1 px-0.5 w-full min-w-0 touch-pan-x touch-pan-y scroll-smooth"
          >
            {availableServers.map((s, idx) => {
              const isSelected = currentServer?.url === s.url;
              const qualityBadge = getSourceQuality(s);
              const cleanName = parseServerDisplayLabel(s, idx);

              return (
                <button
                  key={`${toCanonicalSourceUrl(s.url) || "sv"}-${idx}`}
                  ref={isSelected ? activeChipRef : null}
                  type="button"
                  onClick={() => onSelectServer(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-red-950/80 text-white shadow-md shadow-black/50"
                      : "bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? "bg-red-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span>{cleanName}</span>
                  {qualityBadge && (
                    <span
                      className={`px-1.5 py-0.5 text-[9px] font-black rounded tracking-wider ${
                        qualityBadge === "FHD"
                          ? isSelected
                            ? "bg-amber-500/25 text-amber-300"
                            : "bg-amber-500/15 text-amber-300"
                          : isSelected
                            ? "bg-sky-500/25 text-sky-300"
                            : "bg-sky-500/15 text-sky-300"
                      }`}
                    >
                      {qualityBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {canScrollChipsRight && (
            <div className="absolute right-0 top-0 bottom-0 z-10 hidden sm:flex items-center pr-1 pl-8 bg-gradient-to-l from-zinc-900 via-zinc-900/90 to-transparent pointer-events-none">
              <Tooltip
                content="Cuộn sang phải"
                side="top"
                wrapperClassName="pointer-events-auto"
              >
                <button
                  type="button"
                  onClick={() => handleScrollChipsBy(280)}
                  className="w-7 h-7 rounded-full bg-zinc-800/95 hover:bg-zinc-700 text-white shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Cuộn sang phải"
                >
                  <ChevronRight className="w-4 h-4 text-zinc-200" />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

