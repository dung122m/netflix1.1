"use client";

import React, { useEffect } from "react";
import { Keyboard, X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/scrollLock";

interface NavHotkeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NavHotkeyModal: React.FC<NavHotkeyModalProps> = React.memo(function NavHotkeyModal({
  isOpen,
  onClose,
}) {
  useBodyScrollLock(isOpen);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.key === "?" && !isInput) {
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-950 rounded-2xl border border-white/20 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-netflix-red" />
            <h3 className="text-white font-bold text-base">Phím Tắt Rạp Chiếu</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-gray-300">
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span>Tìm kiếm phim nhanh</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
              Ctrl + K hoặc /
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span>Chế độ Rạp phim (Theater Mode)</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
              T
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span>Bật / Tắt đèn phòng chiếu</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
              L
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span>Tập phim tiếp theo</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
              N
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <span>Bảng phím tắt này</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
              ?
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span>Đóng cửa sổ / modal</span>
            <span className="bg-zinc-800 px-2 py-0.5 rounded border border-white/15 font-mono text-white font-semibold">
              Esc
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
