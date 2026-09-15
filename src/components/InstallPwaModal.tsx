"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  X,
  Smartphone,
  Share2,
  PlusSquare,
  Download,
  CheckCircle2,
  Sparkles,
  Monitor,
  MoreVertical,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallPwaModal: React.FC<InstallPwaModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running as installed standalone app
    const isApp =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;
    setIsStandalone(isApp);

    // Detect iOS & Mobile
    const ua = window.navigator.userAgent;
    const isIosDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    const isMobileDev =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      window.innerWidth < 768;

    setIsIOS(isIosDevice);
    setIsMobile(isMobileDev);

    // Check if global prompt already captured
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).__deferredPwaPrompt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDeferredPrompt((window as any).__deferredPwaPrompt);
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptReady = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).__deferredPwaPrompt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDeferredPrompt((window as any).__deferredPwaPrompt);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleInstallClick = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const promptEvent = deferredPrompt || (window as any).__deferredPwaPrompt;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setInstallSuccess(true);
          setTimeout(() => {
            onClose();
          }, 2500);
        }
        setDeferredPrompt(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__deferredPwaPrompt = null;
      } catch (err) {
        console.warn("Lỗi cài đặt PWA:", err);
        setShowManualGuide(true);
      }
    } else {
      // Prompt native chưa sẵn sàng -> Hiện hướng dẫn chi tiết đúng theo thiết bị
      setShowManualGuide(true);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-zinc-950 border border-white/15 rounded-3xl p-5 sm:p-6 md:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden"
      >
        {/* Glowing Red Ambient */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Icon & Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shadow-xl border border-red-500/30 shrink-0 bg-gradient-to-br from-red-600 to-zinc-900 flex items-center justify-center p-2">
            <Image
              src="/icon-192.png"
              alt="Nanaflix App"
              width={64}
              height={64}
              className="w-full h-full object-contain rounded-xl drop-shadow"
            />
            <span className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white select-none -z-0">
              N
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-600/20 text-red-400 border border-red-500/30 mb-1">
              <Sparkles className="w-3 h-3" />
              Ứng Dụng Nanaflix (PWA)
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">Cài Đặt Lên Điện Thoại / PC</h3>
            <p className="text-xs text-zinc-400">Xem mượt mà, không quảng cáo, mở 1-click</p>
          </div>
        </div>

        {/* State: Already Installed */}
        {isStandalone ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <div className="font-bold text-emerald-200 text-sm">
              Bạn đang dùng ứng dụng Nanaflix!
            </div>
            <p className="text-xs text-emerald-400/80 mt-1">
              Ứng dụng đã được cài đặt trên thiết bị của bạn.
            </p>
          </div>
        ) : installSuccess ? (
          /* State: Install Just Accepted */
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-6 text-center animate-fadeIn">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
            <div className="font-bold text-white text-base">
              Cài đặt ứng dụng thành công!
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Icon Nanaflix đã xuất hiện trên màn hình chính của bạn.
            </p>
          </div>
        ) : isIOS ? (
          /* iOS Safari Guide */
          <div className="space-y-4">
            <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 space-y-3 text-xs">
              <div className="font-semibold text-zinc-200 flex items-center gap-2 text-sm">
                <Smartphone className="w-4 h-4 text-red-500" />
                Hướng dẫn cài trên iPhone / iPad (Safari):
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center shrink-0 border border-red-500/30">
                  1
                </div>
                <div className="text-zinc-300">
                  Nhấn vào nút{" "}
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                    <Share2 className="w-3.5 h-3.5 text-blue-400 inline" /> Chia sẻ (Share)
                  </span>{" "}
                  ở thanh công cụ bên dưới Safari.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center shrink-0 border border-red-500/30">
                  2
                </div>
                <div className="text-zinc-300">
                  Cuộn danh sách xuống và chọn{" "}
                  <span className="inline-flex items-center gap-1 font-semibold text-white bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                    <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline" /> Thêm vào MH chính (Add to Home Screen)
                  </span>
                  .
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 font-bold flex items-center justify-center shrink-0 border border-red-500/30">
                  3
                </div>
                <div className="text-zinc-300">
                  Bấm nút <strong className="text-white">Thêm (Add)</strong> ở góc trên bên phải màn hình.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-white transition-all text-center cursor-pointer"
            >
              Đã hiểu, đóng hướng dẫn
            </button>
          </div>
        ) : (
          /* Android / Windows / Mac Chrome & Edge */
          <div className="space-y-4">
            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-xl shadow-red-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Cài Đặt App Ngay</span>
            </button>

            {/* Device-Specific Visual Guide */}
            {(showManualGuide || !deferredPrompt) && (
              <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-4 text-xs space-y-2.5 animate-fadeIn">
                {isMobile ? (
                  /* Android Mobile Chrome / Mobile Browser Guide */
                  <>
                    <div className="font-semibold text-zinc-200 flex items-center gap-2 text-sm">
                      <Smartphone className="w-4 h-4 text-red-500" />
                      <span>Hướng dẫn thêm vào màn hình trên Android:</span>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0 border border-red-500/30 mt-0.5">
                        1
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        Bấm vào menu 3 chấm <strong className="text-white inline-flex items-center gap-0.5"><MoreVertical size={13} /> Dấu 3 chấm</strong> ở góc trên bên phải trình duyệt Chrome / Cốc Cốc.
                      </p>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0 border border-red-500/30 mt-0.5">
                        2
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        Chọn dòng <strong className="text-amber-300">&quot;Thêm vào màn hình chính&quot;</strong> hoặc <strong className="text-emerald-300">&quot;Cài đặt ứng dụng&quot;</strong>.
                      </p>
                    </div>
                  </>
                ) : (
                  /* Desktop Browser Guide */
                  <>
                    <div className="font-semibold text-zinc-200 flex items-center gap-2 text-sm">
                      <Monitor className="w-4 h-4 text-red-500" />
                      <span>Hướng dẫn cài trên Chrome / Edge Máy tính:</span>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0 border border-red-500/30 mt-0.5">
                        1
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        Nhìn góc phải thanh địa chỉ (URL), bấm biểu tượng <strong className="text-white">Cài đặt (màn hình mũi tên ⬇️)</strong>.
                      </p>
                    </div>

                    <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-400 flex items-center justify-center font-bold text-xs shrink-0 border border-red-500/30 mt-0.5">
                        2
                      </div>
                      <p className="text-zinc-300 leading-relaxed">
                        Hoặc bấm menu 3 chấm <strong className="text-white">⋮</strong> góc trên bên phải ➔ Chọn <strong className="text-white">&quot;Cài đặt Nanaflix...&quot;</strong>.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Feature Perks */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300">
                🚀 <span className="font-semibold text-white">Mở nhanh 1-chạm</span>
                <p className="text-[11px] text-zinc-500 mt-0.5">Không tốn bộ nhớ máy</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-zinc-300">
                🎬 <span className="font-semibold text-white">Toàn màn hình</span>
                <p className="text-[11px] text-zinc-500 mt-0.5">Trải nghiệm như ứng dụng gốc</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
