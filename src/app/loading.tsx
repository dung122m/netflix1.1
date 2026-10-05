import React from "react";
import { VietnamFlag } from "@/components/NetflixLogo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="relative flex flex-col items-center gap-5">
        {/* Pulsing Glow Container with Rectangular 3:2 Vietnam Flag */}
        <div className="relative">
          <div className="absolute -inset-4 bg-red-600/35 rounded-2xl blur-2xl animate-pulse" />
          <div className="relative w-24 h-16 sm:w-28 sm:h-[74px] rounded-2xl bg-zinc-950/90 border border-white/10 flex items-center justify-center shadow-2xl p-2">
            <VietnamFlag className="w-full h-full drop-shadow-[0_0_15px_rgba(234,29,36,0.85)] animate-pulse" />
          </div>
        </div>

        {/* Dynamic Loading Bar */}
        <div className="w-44 sm:w-56 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/10 shadow-inner">
          <div className="h-full w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-full animate-[progress_1.2s_ease-in-out_infinite]" />
        </div>

        <p className="text-xs sm:text-sm font-bold text-gray-400 tracking-wider uppercase animate-pulse">
          Nana đang chuẩn bị phòng chiếu...
        </p>
      </div>
    </div>
  );
}
