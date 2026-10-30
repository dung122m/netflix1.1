"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Keyboard, X, Play, Monitor } from "lucide-react";
import { useBodyScrollLock } from "@/lib/scrollLock";

interface PlayerShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  container?: HTMLElement | null;
}

interface ShortcutItem {
  label: string;
  keys: string[];
  note?: string;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Điều khiển phát & Tập phim",
    icon: <Play className="w-3.5 h-3.5 text-netflix-red" />,
    items: [
      { label: "Phát / Tạm dừng", keys: ["Space", "K"] },
      { label: "Tua tới 5 giây", keys: ["→"] },
      { label: "Tua lùi 5 giây", keys: ["←"] },
      { label: "Tập kế tiếp", keys: ["N"] },
      { label: "Tập trước", keys: ["P"] },
    ],
  },
  {
    title: "Màn hình & Âm thanh",
    icon: <Monitor className="w-3.5 h-3.5 text-netflix-red" />,
    items: [
      { label: "Toàn màn hình", keys: ["F"] },
      { label: "Chế độ Rạp phim", keys: ["T"] },
      { label: "Bật / Tắt âm thanh", keys: ["M"] },
      { label: "Tăng / Giảm âm lượng", keys: ["↑", "↓"] },
      { label: "Bật / Tắt bảng phím tắt", keys: ["?"] },
      { label: "Đóng bảng / Thoát chế độ", keys: ["Esc"] },
    ],
  },
];

export const PlayerShortcutModal: React.FC<PlayerShortcutModalProps> = React.memo(
  function PlayerShortcutModal({ isOpen, onClose, containerRef, container }) {
    const [mounted, setMounted] = useState(false);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useBodyScrollLock(Boolean(isOpen && mounted));

    useEffect(() => {
      setMounted(true);
    }, []);

    // Cập nhật portal target linh hoạt: ưu tiên fullscreen element để hiển thị trên cùng trong chế độ toàn màn hình
    useEffect(() => {
      const resolveTarget = () => {
        if (typeof document === "undefined") return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = document as any;
        const fsElem = (doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement) as HTMLElement | null;

        const targetEl = containerRef ? containerRef.current : container;

        if (fsElem) {
          setPortalTarget(fsElem);
        } else if (targetEl && targetEl.isConnected) {
          setPortalTarget(targetEl);
        } else {
          setPortalTarget(document.body);
        }
      };

      resolveTarget();

      document.addEventListener("fullscreenchange", resolveTarget);
      document.addEventListener("webkitfullscreenchange", resolveTarget);
      document.addEventListener("mozfullscreenchange", resolveTarget);
      document.addEventListener("MSFullscreenChange", resolveTarget);

      return () => {
        document.removeEventListener("fullscreenchange", resolveTarget);
        document.removeEventListener("webkitfullscreenchange", resolveTarget);
        document.removeEventListener("mozfullscreenchange", resolveTarget);
        document.removeEventListener("MSFullscreenChange", resolveTarget);
      };
    }, [containerRef, container, isOpen]);

    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" || e.key === "?" || (e.key === "/" && !e.shiftKey)) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown, true);
      return () => {
        window.removeEventListener("keydown", handleKeyDown, true);
      };
    }, [isOpen, onClose]);

    if (!isOpen || !mounted || !portalTarget) return null;

    return createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Phím tắt xem phim"
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999999] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto overscroll-contain select-none text-zinc-100"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg my-auto rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_30px_90px_rgba(0,0,0,0.95)] animate-in zoom-in-95 duration-200 overflow-hidden transform-gpu will-change-[transform,opacity]"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -left-24 w-52 h-52 bg-netflix-red/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-52 h-52 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative flex items-start justify-between pb-4 mb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-zinc-300">
                <Keyboard className="w-3.5 h-3.5 text-netflix-red shrink-0" />
                <span>Phím tắt điều khiển</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Thao tác nhanh trên trình phát
              </h3>
              <p className="text-xs text-zinc-400">
                Làm chủ trải nghiệm xem phim bằng bàn phím tiện lợi
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng phím tắt"
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcut Groups Grid */}
          <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  {group.icon}
                  <span>{group.title}</span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/5 transition-colors"
                    >
                      <span className="text-xs text-zinc-300">{item.label}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-[6px] bg-zinc-800 border border-zinc-700/80 shadow-[0_2px_0_1px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] text-[11px] font-mono font-semibold text-zinc-100 select-none tracking-tight"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          <div className="relative mt-5 pt-3.5 border-t border-white/10 space-y-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.99] text-white text-xs sm:text-sm font-semibold tracking-wide border border-white/15 transition cursor-pointer shadow-lg"
            >
              Đã hiểu
            </button>
            <p className="text-[11px] text-zinc-500">
              Mẹo: Nhấn <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">?</kbd> hoặc <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Esc</kbd> để đóng bảng bất kỳ lúc nào
            </p>
          </div>
        </div>
      </div>,
      portalTarget
    );
  }
);
