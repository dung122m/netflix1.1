"use client";

import React from "react";
import { useWatchController } from "./WatchController";

interface WatchStageProps {
  player: React.ReactNode;
  mainContent: React.ReactNode;
  sidebar: React.ReactNode;
}

export function WatchStage({ player, mainContent, sidebar }: WatchStageProps) {
  const watchContext = useWatchController();
  const isTheaterMode = watchContext?.isTheaterMode ?? false;

  return (
    <div className="w-full transition-all duration-300">
      {/* NẾU ĐANG BẬT CHẾ ĐỘ RẠP PHIM (THEATER MODE) */}
      {isTheaterMode ? (
        <div className="w-full space-y-4 sm:space-y-6">
          {/* 1. KHUNG PLAYER CHIẾM TOÀN BỘ CHIỀU RỘNG (100% CONTAINER / 12 CỘT) Ở TRÊN CÙNG */}
          <div className="w-full">
            {player}
          </div>

          {/* 2. 2-COLUMN GRID NẰM PHÍA DƯỚI PLAYER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-8 space-y-4 sm:space-y-6 min-w-0">
              {mainContent}
            </div>
            <div className="hidden lg:block lg:col-span-4 space-y-5 min-w-0 sticky top-[80px]">
              {sidebar}
            </div>
          </div>
        </div>
      ) : (
        /* CHẾ ĐỘ THƯỜNG (YOUTUBE 2-COLUMN WATCH LAYOUT) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8 space-y-4 sm:space-y-6 min-w-0">
            {player}
            {mainContent}
          </div>
          <div className="hidden lg:block lg:col-span-4 space-y-5 min-w-0 sticky top-[80px]">
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchStage;
