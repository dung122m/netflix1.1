"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X, Smartphone, Sparkles } from "lucide-react";
import { InstallPwaModal } from "./InstallPwaModal";

const DISMISS_KEY = "nanaflix_pwa_dismissed_at";
const DISMISS_DAYS = 7;

export const InstallPwaBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Register Service Worker if supported
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Lỗi đăng ký Service Worker:", err);
      });
    }

    // Check if running inside standalone PWA
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check dismissed time
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const diffMs = Date.now() - parseInt(dismissedAt, 10);
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < DISMISS_DAYS) {
        // Still in dismissed cool-down period
        return;
      }
    }

    // Delay slightly before showing banner so it doesn't interrupt initial page load
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 4000);

    // Global listener for custom open event
    const handleCustomOpen = () => {
      setShowModal(true);
    };

    window.addEventListener("open-pwa-install", handleCustomOpen);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("open-pwa-install", handleCustomOpen);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const handleOpenInstall = () => {
    setShowModal(true);
  };

  return (
    <>
      {/* Floating Bottom Banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-slideUp">
          <div className="relative bg-zinc-950/95 border border-white/15 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-white overflow-hidden group">
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-red-600/20 rounded-full blur-xl pointer-events-none" />

            {/* App Icon & Text */}
            <div
              onClick={handleOpenInstall}
              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
            >
              <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/10 bg-black">
                <Image
                  src="/icon-192.png"
                  alt="Nanaflix"
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-red-400">
                  <Sparkles className="w-3 h-3" />
                  <span>Ứng Dụng Nanaflix</span>
                </div>
                <div className="text-sm font-bold truncate text-zinc-100">
                  Cài đặt về màn hình chính
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  Xem full màn hình mượt mà không quảng cáo
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenInstall}
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/30 transition-all active:scale-95 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Cài App</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors"
                title="Đóng"
                aria-label="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install Modal */}
      <InstallPwaModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
