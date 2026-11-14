"use client";

import React from "react";
import { Search, X } from "lucide-react";

export interface EpisodeSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  resultCount: number;
  isSearching: boolean;
  totalEpisodes: number;
}

export const EpisodeSearchBar: React.FC<EpisodeSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onClear,
  resultCount,
  isSearching,
  totalEpisodes,
}) => {
  if (totalEpisodes <= 12) return null;

  return (
    <div className="space-y-1.5">
      {/* Ô TÌM NHANH SỐ TẬP */}
      <div className="relative group">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-netflix-red transition-colors"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tìm nhanh số tập (vd: 1, 59, 199)..."
          aria-label="Tìm nhanh số tập"
          className="w-full pl-8 pr-8 py-2 sm:py-1.5 rounded-lg bg-zinc-900/90 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red/70 focus:bg-zinc-900/95 focus:ring-1 focus:ring-netflix-red/30 transition shadow-inner"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Xóa nội dung tìm kiếm"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 hover:bg-white/10 rounded-full transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* THANH THÔNG BÁO KẾT QUẢ TÌM KIẾM */}
      {isSearching && (
        <div className="flex items-center justify-between text-xs text-zinc-400 px-2.5 py-1 rounded-lg bg-white/[0.04] animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-netflix-red shrink-0" />
            <span className="truncate text-[11px]">
              Tìm thấy <strong className="text-white font-bold">{resultCount}</strong> tập phù hợp
            </span>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer shrink-0 ml-2 bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded active:scale-95"
          >
            <span>Xóa lọc</span>
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default EpisodeSearchBar;
