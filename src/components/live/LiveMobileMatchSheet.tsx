"use client";

import React from "react";
import { Clock, Search, X } from "lucide-react";
import { FootballMatch } from "@/services/live/football/service";
import { LiveMatchScore } from "@/services/live/football-score/types";
import { MatchCard } from "./MatchCard";

export interface LiveMobileMatchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filteredMatches: FootballMatch[];
  selectedMatch: FootballMatch | null;
  scoresMap: Record<string, LiveMatchScore>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: "all" | "live" | "upcoming" | "finished") => void;
  counts: { total: number; live: number; upcoming: number; finished: number };
  liveMatchesList: FootballMatch[];
  upcomingMatchesList: FootballMatch[];
  onSelectMatch: (match: FootballMatch) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export function LiveMobileMatchSheet({
  isOpen,
  onClose,
  filteredMatches,
  selectedMatch,
  scoresMap,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  counts,
  liveMatchesList,
  upcomingMatchesList,
  onSelectMatch,
  onTouchStart,
  onTouchEnd,
}: LiveMobileMatchSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Danh sách đổi trận đấu"
      className="fixed inset-0 z-[100000] lg:hidden flex flex-col justify-end"
    >
      {/* Backdrop làm mờ tối */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Khay Bottom Sheet */}
      <div
        style={{ overscrollBehavior: "contain" }}
        className="relative z-10 w-full h-[78dvh] max-h-[85dvh] flex flex-col rounded-t-3xl bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overscroll-contain animate-in slide-in-from-bottom duration-300 ease-out"
      >
        {/* Vùng tay nắm kéo (Drag handle) & Header cố định */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="shrink-0 pt-2.5 pb-2 px-4 select-none cursor-grab active:cursor-grabbing"
        >
          {/* Thanh gạt tay nắm */}
          <div className="w-10 h-1.5 rounded-full bg-white/25 mx-auto mb-2" />

          {/* Tiêu đề & nút đóng */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-4 h-4 text-netflix-red shrink-0" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider truncate">
                Đổi trận
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 shrink-0">
                {filteredMatches.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng danh sách đổi trận"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ô tìm kiếm cố định */}
        <div className="shrink-0 px-3 pt-3 pb-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm trận, giải, BLV..."
              className="w-full pl-9 pr-14 py-2 rounded-xl bg-zinc-900 text-xs text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-netflix-red/50 transition shadow-inner font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                title="Xóa tìm kiếm"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 cursor-pointer rounded-full hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Hàng nút lọc nhanh trạng thái trong Bottom Sheet */}
        <div className="shrink-0 px-3 pb-2 pt-0.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none touch-pan-x border-b border-white/5 bg-zinc-950">
          <button
            type="button"
            onClick={() => onStatusChange("all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
              selectedStatus === "all"
                ? "bg-zinc-700/90 text-white shadow-sm font-bold"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Tất cả ({counts.total})
          </button>
          {counts.live > 0 && (
            <button
              type="button"
              onClick={() => onStatusChange("live")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedStatus === "live"
                  ? "bg-netflix-red text-white shadow-sm"
                  : "bg-zinc-900 text-rose-300 hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Đang live ({counts.live})</span>
            </button>
          )}
          {counts.upcoming > 0 && (
            <button
              type="button"
              onClick={() => onStatusChange("upcoming")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedStatus === "upcoming"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-zinc-900 text-sky-300 hover:text-white"
              }`}
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Sắp đá ({counts.upcoming})</span>
            </button>
          )}
        </div>

        {/* Vùng danh sách thẻ trận cuộn dọc độc lập */}
        <div
          style={{ overscrollBehavior: "contain" }}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-0 scrollbar-thin touch-pan-y pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          {filteredMatches.length > 0 ? (
            <div className="space-y-2.5">
              {/* KHỐI TRẬN ĐANG TRỰC TIẾP */}
              {liveMatchesList.length > 0 && (
                <div>
                  <div className="sticky top-0 z-20 -mx-3 px-3.5 py-2.5 bg-zinc-950 border-b border-red-500/30 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                      </span>
                      <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-red-200">
                        Đang trực tiếp
                      </span>
                    </div>
                    <span className="text-xs font-black tabular-nums px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-200 border border-red-500/30">
                      {liveMatchesList.length} trận
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {liveMatchesList.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        score={scoresMap[match.id] || match.score}
                        isSelected={selectedMatch?.id === match.id}
                        onSelect={onSelectMatch}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* KHỐI TRẬN SẮP DIỄN RA */}
              {upcomingMatchesList.length > 0 && (
                <div className="mt-3">
                  <div className="sticky top-0 z-20 -mx-3 px-3.5 py-2.5 bg-zinc-950 border-b border-sky-500/30 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-sky-200">
                        Sắp diễn ra
                      </span>
                    </div>
                    <span className="text-xs font-black tabular-nums px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/30">
                      {upcomingMatchesList.length} trận
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    {upcomingMatchesList.map((match) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        score={scoresMap[match.id] || match.score}
                        isSelected={selectedMatch?.id === match.id}
                        onSelect={onSelectMatch}
                        compact={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <Search className="w-6 h-6 mx-auto text-zinc-500" />
              <p className="text-xs font-bold text-white">Không tìm thấy trận</p>
              <p className="text-[11px] text-zinc-500">
                {searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Chưa có trận nào"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
