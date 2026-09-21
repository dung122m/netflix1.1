import React from "react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none select-none">
      <div className="relative flex flex-col items-center gap-5">
        {/* Pulsing Glow Logo Container */}
        <div className="relative">
          <div className="absolute -inset-4 bg-netflix-red/30 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-center shadow-2xl">
            <span className="text-3xl sm:text-4xl font-black text-netflix-red tracking-tighter drop-shadow-[0_0_15px_rgba(229,9,20,0.8)]">
              N
            </span>
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
