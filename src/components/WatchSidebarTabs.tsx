"use client";

import React, { useState } from "react";
import { Film, Sparkles } from "lucide-react";

interface WatchSidebarTabsProps {
  isSingleEpisode?: boolean;
  serverSelector: React.ReactNode;
  episodeList: React.ReactNode;
  episodeCountBadge?: React.ReactNode;
  recommendations: React.ReactNode;
}

/**
 * WatchSidebarTabs:
 * Gộp Danh sách tập phim và Phim đề xuất tương tự vào một khung Sidebar thống nhất (Cinema/Watch Pro).
 * - Phim bộ: 2 tab "Tập phim" & "Phim tương tự", chung một khung, cuộn mượt mà trong giới hạn viewport (không tràn).
 * - Phim lẻ: Giữ nguyên trải nghiệm nguồn phát + đề xuất phim.
 * - Giữ nguyên DOM mount bằng CSS hidden/flex để không remount, không mất trạng thái và không ảnh hưởng phát video.
 */
export function WatchSidebarTabs({
  isSingleEpisode = false,
  serverSelector,
  episodeList,
  episodeCountBadge,
  recommendations,
}: WatchSidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<"episodes" | "recommendations">("episodes");

  // VỚI PHIM LẺ: Giữ hành vi hiện tại (Nguồn phát phía trên + Đề xuất phía dưới)
  if (isSingleEpisode) {
    return (
      <div className="space-y-3.5">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3 sm:p-3.5 shadow-xl backdrop-blur-xl">
          {serverSelector}
        </div>
        <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 via-zinc-950/85 to-black/90 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl max-h-[calc(100vh-180px)] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500 pr-1">
          {recommendations}
        </div>
      </div>
    );
  }

  // VỚI PHIM BỘ: 2 tab dùng chung 1 khung duy nhất, khóa chiều cao vừa vặn màn hình
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/15 bg-gradient-to-b from-zinc-900/85 via-zinc-950/90 to-black/95 p-3 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col max-h-[calc(100vh-92px)] overflow-hidden">
      {/* 1. THANH CHUYỂN ĐỔI HAI TAB SIDEBAR (TẬP PHIM / PHIM TƯƠNG TỰ) */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-950/90 rounded-2xl border border-white/10 mb-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("episodes")}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
            activeTab === "episodes"
              ? "bg-netflix-red text-white shadow-md shadow-[var(--accent-glow,rgba(229,9,20,0.4))] font-black scale-[1.01]"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Film className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Tập phim</span>
          {episodeCountBadge}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recommendations")}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
            activeTab === "recommendations"
              ? "bg-netflix-red text-white shadow-md shadow-[var(--accent-glow,rgba(229,9,20,0.4))] font-black scale-[1.01]"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0 animate-pulse" />
          <span>Phim tương tự</span>
        </button>
      </div>

      {/* 2. KHUNG NỘI DUNG CHUNG — GIỮ NGUYÊN MOUNT BẰNG CSS ĐỂ TRÁNH RESET STATE HOẶC TẢI LẠI */}
      
      {/* TAB 1: TẬP PHIM */}
      <div
        className={`flex-1 flex-col min-h-0 ${
          activeTab === "episodes" ? "flex" : "hidden"
        }`}
      >
        {/* Nguồn phát (Server Selector) */}
        <div className="mb-2.5 flex-shrink-0 pb-2.5 border-b border-white/10">
          {serverSelector}
        </div>

        {/* Danh sách tập phim (cuộn mượt mà trong không gian còn lại của khung) */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500">
          {episodeList}
        </div>
      </div>

      {/* TAB 2: PHIM TƯƠNG TỰ */}
      <div
        className={`flex-1 flex-col min-h-0 ${
          activeTab === "recommendations" ? "flex" : "hidden"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500">
          {recommendations}
        </div>
      </div>
    </div>
  );
}

export default WatchSidebarTabs;
