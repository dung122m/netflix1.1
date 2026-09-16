"use client";

import React, { useEffect } from "react";
import { Keyboard, X } from "lucide-react";

interface PlayerShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayerShortcutModal: React.FC<PlayerShortcutModalProps> = React.memo(
  function PlayerShortcutModal({ isOpen, onClose }) {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
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
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl border border-white/20 bg-zinc-950 p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200 overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-netflix-red/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2 font-bold text-base text-white">
              <Keyboard className="w-5 h-5 text-netflix-red" />
              <span>Phím tắt xem phim chuyên nghiệp</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
            {[
              { label: "Phát / Tạm dừng", key: "Space" },
              { label: "Toàn màn hình", key: "F" },
              { label: "Tua tới 10 giây", key: "→" },
              { label: "Tua lùi 10 giây", key: "←" },
              { label: "Tắt / Bật âm thanh", key: "M" },
              { label: "Tăng / Giảm âm lượng", key: "↑ / ↓" },
              { label: "Chế độ Rạp phim", key: "T" },
              { label: "Tắt / Bật đèn xung quanh", key: "L" },
              { label: "Chuyển về tập trước", key: "P" },
              { label: "Chuyển sang tập kế tiếp", key: "N" },
              { label: "Thoát chế độ / Đóng", key: "Esc" },
              { label: "Bật / Tắt bảng phím tắt", key: "?" },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-white/5">
                <span className="text-gray-300">{label}</span>
                <kbd className="px-2 py-0.5 rounded bg-zinc-800 border border-white/20 text-xs font-mono font-bold text-amber-300">
                  {key}
                </kbd>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-3 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-netflix-red text-white text-xs sm:text-sm font-bold hover:bg-red-700 transition cursor-pointer shadow-lg"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    );
  }
);
