"use client";

import React from "react";
import Link from "next/link";
import { Check, Play, ChevronRight } from "lucide-react";
import { formatEpisodeName } from "@/lib/formatEpisode";

export interface EpisodeSingleSearchResultProps {
  tapSlug: string;
  tapName: string;
  isActive: boolean;
  isWatched: boolean;
  movieTitle: string;
  episodeIndex: number;
  totalEpisodes: number;
  chunk?: { index: number; label: string } | null;
  onSelect?: (slug: string) => void;
  onJumpToChunk?: (chunkIndex: number) => void;
}

export const EpisodeSingleSearchResult: React.FC<EpisodeSingleSearchResultProps> = ({
  tapSlug,
  tapName,
  isActive,
  isWatched,
  movieTitle,
  episodeIndex,
  totalEpisodes,
  chunk,
  onSelect,
  onJumpToChunk,
}) => {
  return (
    <div className="p-3.5 my-1 rounded-2xl bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-black shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
              isActive
                ? "bg-gradient-to-br from-netflix-red to-netflix-red/80 text-white shadow-md shadow-black/50"
                : "bg-white/10 text-white"
            }`}
          >
            {isActive ? (
              <span className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
                <span className="w-[2px] bg-white rounded-full animate-pulse h-2" />
                <span className="w-[2px] bg-white rounded-full animate-pulse h-3.5" />
                <span className="w-[2px] bg-white rounded-full animate-pulse h-2" />
              </span>
            ) : (
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate flex items-center gap-2">
              <span>{formatEpisodeName(tapName)}</span>
              {isActive && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-netflix-red/25 text-white shrink-0">
                  Đang phát
                </span>
              )}
              {!isActive && isWatched && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1 shrink-0">
                  <Check className="w-2.5 h-2.5" /> Đã xem
                </span>
              )}
            </h4>
            <p className="text-[11px] text-zinc-400 truncate">
              {movieTitle} • Vị trí: Tập {episodeIndex >= 0 ? episodeIndex + 1 : 1} / {totalEpisodes}
            </p>
          </div>
        </div>

        {/* Nút phát nhanh */}
        <Link
          href={`?ep=${tapSlug}`}
          prefetch={false}
          scroll={false}
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault();
              onSelect(tapSlug);
            }
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            isActive
              ? "bg-zinc-800 text-zinc-300 cursor-default"
              : "bg-netflix-red hover:brightness-110 text-white shadow-md shadow-black/50 active:scale-95 cursor-pointer"
          }`}
        >
          {isActive ? "Đang chọn" : "Phát ngay"}
        </Link>
      </div>

      {/* Nút hành động thông minh: Nhảy đến dải tập tương ứng */}
      {chunk && onJumpToChunk && (
        <button
          type="button"
          onClick={() => onJumpToChunk(chunk.index)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition text-xs text-zinc-300 hover:text-white group cursor-pointer"
        >
          <span className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 truncate">
            <span>Xem trong dải tập:</span>
            <strong className="text-white font-semibold">{chunk.label}</strong>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
        </button>
      )}
    </div>
  );
};

export default EpisodeSingleSearchResult;
