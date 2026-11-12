import React from "react";
import { VietnamFlag } from "@/components/layout/NetflixLogo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative w-24 h-16 sm:w-28 sm:h-[74px] rounded-2xl bg-zinc-950/90 flex items-center justify-center shadow-2xl p-2">
          <VietnamFlag className="w-full h-full" />
        </div>

        {/* Dynamic Loading Bar */}
        <div className="w-44 sm:w-56 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full w-full bg-netflix-red rounded-full animate-[progress_1.2s_ease-in-out_infinite]" />
        </div>

        <p className="text-xs sm:text-sm font-medium text-zinc-400">
          Nana đang chuẩn bị phòng chiếu...
        </p>
      </div>
    </div>
  );
}
