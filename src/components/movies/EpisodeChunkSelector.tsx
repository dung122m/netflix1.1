"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Target } from "lucide-react";
import { ScrollablePillsRow } from "@/components/ui/ScrollablePillsRow";
import { Tooltip } from "@/components/ui/Tooltip";

export interface EpisodeChunkItem {
  index: number;
  label: string;
}

export interface EpisodeChunkSelectorProps {
  chunks: EpisodeChunkItem[];
  activeChunk: number;
  onSelectChunk: (index: number) => void;
  initialChunk: number;
  activeEpisodeIndex: number;
  currentEpisodeName?: string;
  chunkSize?: number;
}

export const EpisodeChunkSelector: React.FC<EpisodeChunkSelectorProps> = ({
  chunks,
  activeChunk,
  onSelectChunk,
  initialChunk,
  activeEpisodeIndex,
  currentEpisodeName,
  chunkSize = 25,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  if (chunks.length <= 1) return null;

  // Khi có nhiều hơn 4 dải tập (vd Conan 40 dải): Hiển thị dropdown tinh gọn
  if (chunks.length > 4) {
    return (
      <div className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-zinc-900/80">
        <div className="relative flex-1 min-w-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-label="Chọn dải tập phim"
            className="w-full flex items-center justify-between gap-2 bg-zinc-800/80 hover:bg-zinc-800 text-white text-xs font-bold py-2 sm:py-1.5 min-h-[36px] sm:min-h-[30px] pl-2.5 pr-2 rounded-md transition cursor-pointer text-left select-none"
          >
            <span className="truncate">
              {chunks[activeChunk]?.label ||
                `Tập ${activeChunk * chunkSize + 1} - ${(activeChunk + 1) * chunkSize}`}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180 text-white" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-full min-w-0 sm:min-w-[210px] max-h-64 overflow-y-auto rounded-xl bg-zinc-950/98 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] p-1 z-50 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
              {chunks.map((c) => {
                const isSelected = c.index === activeChunk;
                const isPlaying = c.index === initialChunk;
                return (
                  <button
                    key={c.index}
                    type="button"
                    onClick={() => {
                      onSelectChunk(c.index);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-sm"
                        : "text-zinc-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{c.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {isPlaying && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            isSelected
                              ? "bg-black/30 text-emerald-200"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Đang phát</span>
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nút nhảy nhanh về dải tập đang xem nếu người dùng đang duyệt dải khác */}
        {activeChunk !== initialChunk && activeEpisodeIndex >= 0 ? (
          <Tooltip
            content={`Chuyển về dải tập chứa ${currentEpisodeName || "tập đang phát"}`}
            side="top"
            align="end"
          >
            <button
              type="button"
              onClick={() => {
                onSelectChunk(initialChunk);
                setIsDropdownOpen(false);
              }}
              aria-label={`Chuyển về dải tập chứa ${currentEpisodeName || "tập đang phát"}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-netflix-red hover:brightness-110 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer shrink-0 animate-in fade-in"
            >
              <Target className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[130px]">
                Về {currentEpisodeName || `Tập ${activeEpisodeIndex + 1}`}
              </span>
            </button>
          </Tooltip>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-emerald-400 font-medium shrink-0 bg-emerald-500/10 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>
              Đang phát {currentEpisodeName ? `• ${currentEpisodeName}` : ""}
            </span>
          </span>
        )}
      </div>
    );
  }

  // Khi có từ 2 đến 4 dải tập: Hiển thị danh sách cuộn pills
  return (
    <ScrollablePillsRow innerClassName="flex items-center gap-1 py-0.5 px-0.5">
      {chunks.map((chunk) => {
        const isSelected = activeChunk === chunk.index;
        return (
          <button
            key={chunk.index}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectChunk(chunk.index)}
            className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-[30px] rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer select-none ${
              isSelected
                ? "bg-white text-zinc-950 shadow-sm font-black scale-[1.01]"
                : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {chunk.label}
          </button>
        );
      })}
    </ScrollablePillsRow>
  );
};

export default EpisodeChunkSelector;
