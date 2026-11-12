"use client";

import React, { useState } from "react";
import { Film, Compass } from "lucide-react";

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
        <div className="rounded-2xl bg-zinc-950/70 p-3 sm:p-3.5 shadow-xl backdrop-blur-xl">
          {serverSelector}
        </div>
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-zinc-900/80 via-zinc-950/85 to-black/90 p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl max-h-[calc(100dvh-180px)] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-zinc-500 [&::-webkit-scrollbar-corner]:bg-transparent pr-1">
          {recommendations}
        </div>
      </div>
    );
  }

  // VỚI PHIM BỘ: 2 tab dùng chung 1 khung duy nhất, chiều cao vừa vặn hoàn hảo màn hình laptop & desktop
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-b from-zinc-900/85 via-zinc-950/90 to-black/95 p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl flex flex-col h-[calc(100dvh-84px)] max-h-[calc(100dvh-84px)] overflow-hidden">
      {/* 1. THANH CHUYỂN ĐỔI HAI TAB SIDEBAR (TẬP PHIM / PHIM TƯƠNG TỰ) - TINH GỌN CHIỀU CAO */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-950/90 rounded-2xl mb-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("episodes")}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
            activeTab === "episodes"
              ? "bg-netflix-red text-white shadow-md shadow-black/50 font-black scale-[1.01]"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Film className="w-3.5 h-3.5 shrink-0" />
          <span>Tập phim</span>
          {episodeCountBadge}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recommendations")}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
            activeTab === "recommendations"
              ? "bg-netflix-red text-white shadow-md shadow-black/50 font-black scale-[1.01]"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Compass className="w-3.5 h-3.5 shrink-0" />
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
        {/* Nguồn phát (Server Selector) - Ghim cố định ở trên đầu */}
        <div className="mb-1.5 flex-shrink-0 pb-1.5 border-b border-white/[0.08]">
          {serverSelector}
        </div>

        {/* Danh sách tập phim: chiếm trọn phần chiều cao còn lại, cuộn nội bộ mượt mà */}
        <div className="flex-1 min-h-0 flex flex-col">
          {episodeList}
        </div>
      </div>

      {/* TAB 2: PHIM TƯƠNG TỰ */}
      <div
        className={`flex-1 flex-col min-h-0 ${
          activeTab === "recommendations" ? "flex" : "hidden"
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar overscroll-auto">
          {recommendations}
        </div>
      </div>
    </div>
  );
}

export default WatchSidebarTabs;
