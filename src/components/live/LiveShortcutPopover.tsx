"use client";

import React, { useState, useRef, useEffect } from "react";
import { Keyboard, X } from "lucide-react";

interface LiveShortcutPopoverProps {
  mode?: "football" | "tv";
}

export function LiveShortcutPopover({ mode = "football" }: LiveShortcutPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Đóng khi click bên ngoài hoặc bấm Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const switchLabel = mode === "football" ? "Đổi trận tiếp / trước" : "Đổi kênh tiếp / trước";
  const railLabel = mode === "football" ? "Danh sách trận đấu" : "Danh sách kênh";

  return (
    <div className="relative hidden sm:inline-flex items-center">
      {/* Nút trigger nhỏ gọn */}
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Xem hướng dẫn phím tắt (Hotkeys)"
        className={`h-9 sm:h-10 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-full border text-[11px] sm:text-xs font-semibold transition backdrop-blur-md cursor-pointer select-none flex-shrink-0 ${
          isOpen
            ? "bg-white/25 text-white border-white/40 shadow-lg shadow-black/40"
            : "bg-black/60 hover:bg-white/20 text-gray-200 hover:text-white border-white/20"
        }`}
      >
        <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 shrink-0" />
        <span>Phím tắt</span>
      </button>

      {/* Popover / Panel nhỏ gọn overlay ở góc dưới phải player */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full right-0 mb-2 w-72 sm:w-80 rounded-2xl bg-zinc-950/95 border border-white/15 p-3.5 shadow-2xl backdrop-blur-xl z-50 text-left animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Keyboard className="w-4 h-4 text-red-400" />
              <span>Phím tắt điều khiển</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Danh sách phím tắt chia 2 nhóm ngắn gọn */}
          <div className="space-y-2.5">
            {/* Nhóm 1: Phát & Hiển thị */}
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">
                Phát &amp; Hiển thị
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px]">Dừng / Phát</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-amber-300 border border-white/10 font-bold shadow-sm">Space</kbd>
                </div>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px]">Bật / Tắt tiếng</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-gray-200 border border-white/10 font-bold shadow-sm">M</kbd>
                </div>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px]">Toàn màn hình</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-gray-200 border border-white/10 font-bold shadow-sm">F</kbd>
                </div>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px]">Thu nhỏ PiP</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-gray-200 border border-white/10 font-bold shadow-sm">I</kbd>
                </div>
              </div>
            </div>

            {/* Nhóm 2: Điều khiển & Kênh */}
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">
                Điều khiển &amp; Danh sách
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px]">Tua 10 giây</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-sky-300 border border-white/10 font-bold shadow-sm">← →</kbd>
                </div>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px]">Âm lượng</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-emerald-300 border border-white/10 font-bold shadow-sm">↑ ↓</kbd>
                </div>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px] truncate max-w-[90px]">{switchLabel}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-purple-300 border border-white/10 font-bold shadow-sm">N / P</kbd>
                </div>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition">
                  <span className="text-gray-300 text-[11px]">Về trực tiếp</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-rose-300 border border-white/10 font-bold shadow-sm">L</kbd>
                </div>
                <div className="flex items-center justify-between bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/5 transition col-span-2">
                  <span className="text-gray-300 text-[11px]">{railLabel}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-cyan-300 border border-white/10 font-bold shadow-sm">C</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
