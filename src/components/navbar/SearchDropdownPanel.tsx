"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { History, Loader2, Search, X } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { toOptimizedPhimimgUrl, toFastCdnImageUrl } from "@/lib/movieMedia";
import {
  resolveSuggestionHref,
  type SearchSuggestion,
} from "./hooks/useNavSearch";

export interface SearchDropdownPanelProps {
  variant: "mobile" | "desktop";
  queryText: string;
  hasSearchText: boolean;
  isSearching: boolean;
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  selectedSuggestionIndex: number;
  onRecentClick: (keyword: string) => void;
  onRemoveRecent: (keyword: string, e: React.MouseEvent) => void;
  onClearAllRecent: (e: React.MouseEvent) => void;
  onSuggestionSelect: (collapseExpanded: boolean) => void;
  onSubmitSearch: (e: React.FormEvent) => void;
}

/**
 * Shared dropdown content rendered by NavSearchBar on both mobile overlay
 * and desktop expandable bar: recent searches, loading shimmer, movie suggestions, and empty state.
 */
export function SearchDropdownPanel({
  variant,
  queryText,
  hasSearchText,
  isSearching,
  suggestions,
  recentSearches,
  selectedSuggestionIndex,
  onRecentClick,
  onRemoveRecent,
  onClearAllRecent,
  onSuggestionSelect,
  onSubmitSearch,
}: SearchDropdownPanelProps) {
  const isMobile = variant === "mobile";
  const containerClass = isMobile
    ? "fixed top-[52px] sm:top-[56px] inset-x-2 w-auto max-w-lg mx-auto bg-zinc-950/98 backdrop-blur-xl rounded-2xl p-3 shadow-2xl z-50 max-h-[calc(100dvh-64px)] sm:max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain transform-gpu will-change-[transform,opacity]"
    : "absolute top-full mt-2 right-0 w-[360px] bg-zinc-950/98 backdrop-blur-xl rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 transform-gpu will-change-[transform,opacity]";

  return (
    <div className={containerClass}>
      {!hasSearchText && recentSearches.length > 0 ? (
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 px-2 py-1 mb-1 border-b border-white/[0.08]">
            <span className="flex items-center gap-1.5 text-xs">
              <History size={12} className="text-netflix-red" />
              Tìm kiếm gần đây
            </span>
            <button
              type="button"
              onClick={onClearAllRecent}
              className="text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
            >
              Xóa tất cả
            </button>
          </div>

          <div className="flex flex-col gap-0.5 mt-1">
            {recentSearches.map((kw, idx) => (
              <div
                key={kw}
                onClick={() => onRecentClick(kw)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer group ${
                  selectedSuggestionIndex === idx
                    ? "bg-zinc-800 text-white"
                    : "hover:bg-zinc-850 text-zinc-300 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <History
                    size={13}
                    className="text-zinc-500 group-hover:text-netflix-red transition flex-none"
                  />
                  <span className="text-xs transition truncate">{kw}</span>
                </div>
                <Tooltip content="Xóa từ khóa này" side="left">
                  <button
                    type="button"
                    onClick={(e) => onRemoveRecent(kw, e)}
                    aria-label="Xóa từ khóa này"
                    className="p-1 text-zinc-500 hover:text-white rounded transition cursor-pointer hover:bg-white/10"
                  >
                    <X size={12} />
                  </button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      ) : isSearching && suggestions.length === 0 ? (
        <div className="p-1 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 px-2 py-1">
            <Loader2 size={13} className="animate-spin text-netflix-red flex-none" />
            <span>Đang tìm kiếm gợi ý phim...</span>
          </div>
          <div className="flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] animate-pulse"
              >
                <div className="w-10 h-14 bg-zinc-800 rounded flex-none" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3.5 bg-zinc-700/60 rounded w-3/4" />
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 bg-zinc-800 rounded w-12" />
                    <div className="h-2.5 bg-zinc-800/80 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.08] mt-2 pt-2">
            <button
              type="button"
              onClick={onSubmitSearch}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-850 hover:bg-netflix-red text-zinc-200 hover:text-white font-medium text-xs transition shadow-md cursor-pointer active:scale-98"
            >
              <Search size={13} />
              <span>Tìm kiếm ngay cho &quot;{queryText}&quot;</span>
            </button>
          </div>
        </div>
      ) : suggestions.length > 0 ? (
        <>
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-2.5 py-1">
            <span>Gợi ý phim</span>
            {isSearching && (
              <span className="flex items-center gap-1.5 text-netflix-red normal-case font-medium text-xs">
                <Loader2 size={12} className="animate-spin flex-none" />
                <span>Đang cập nhật...</span>
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {suggestions.map((item, idx) => (
              <Link
                key={item.slug}
                href={resolveSuggestionHref(item.slug)}
                onClick={() => onSuggestionSelect(isMobile)}
                className={`flex items-center gap-3 p-2 rounded-lg transition group ${
                  selectedSuggestionIndex === idx
                    ? "bg-zinc-800 text-white"
                    : "hover:bg-zinc-850"
                }`}
              >
                <div className="relative w-10 h-14 bg-zinc-800 rounded overflow-hidden flex-none">
                  <Image
                    src={toFastCdnImageUrl(toOptimizedPhimimgUrl(item.poster, 192))}
                    alt={item.title}
                    fill
                    unoptimized
                    sizes="40px"
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-white group-hover:text-netflix-red transition-colors truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    {item.year && <span>{item.year}</span>}
                    {item.category && (
                      <span className="text-amber-400 font-medium">
                        {item.category}
                      </span>
                    )}
                    {item.quality && (
                      <span className="bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-bold">
                        {item.quality}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="border-t border-white/[0.08] mt-2 pt-2">
            <button
              type="button"
              onClick={onSubmitSearch}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-xs transition shadow-md cursor-pointer active:scale-98"
            >
              <Search size={13} />
              <span>Xem tất cả kết quả cho &quot;{queryText}&quot;</span>
            </button>
          </div>
        </>
      ) : hasSearchText ? (
        <div className="py-4 px-2 text-center space-y-2">
          <p className="text-xs text-zinc-400">
            {queryText.trim().length >= 2
              ? "Không có gợi ý nhanh phù hợp"
              : "Nhập từ 2 ký tự trở lên để xem gợi ý phim..."}
          </p>
          {queryText.trim().length >= 2 && (
            <button
              type="button"
              onClick={onSubmitSearch}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-xs transition shadow-md cursor-pointer active:scale-98"
            >
              <Search size={13} />
              <span>
                Tìm kiếm toàn bộ kho phim cho &quot;{queryText}&quot;
              </span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

