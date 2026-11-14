"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Smartphone,
  Share2,
  PlusSquare,
  Download,
  CheckCircle2,
  Monitor,
  MoreVertical,
  Zap,
  Maximize2,
} from "lucide-react";
import { BaseModal } from "@/components/ui/BaseModal";

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
    const isAppleDevice =
      /iPad|iPhone|iPod/.test(ua) &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !(window as any).MSStream;
    const isMobileDevice =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        ua
      );

    setIsIOS(isAppleDevice);
    setIsMobile(isMobileDevice);

    // Catch Chrome/Edge beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Catch when app was installed
    const handleAppInstalled = () => {
      setInstallSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstallSuccess(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      setShowManualGuide(true);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Cài Đặt Lên Điện Thoại / PC"
      subtitle="Xem mượt mà, không quảng cáo, mở 1-click"
      icon={
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-xl shrink-0 bg-gradient-to-br from-netflix-red to-zinc-900 flex items-center justify-center p-1.5">
          <Image
            src="/icon-192.png"
            alt="Nanaflix App"
            width={48}
            height={48}
            className="w-full h-full object-contain rounded-xl drop-shadow"
          />
        </div>
      }
      bodyClassName="p-4 sm:p-6 space-y-4"
    >
      {/* State: Already Installed */}
      {isStandalone ? (
        <div className="bg-emerald-950/40 rounded-2xl p-5 text-center">
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
        <div className="bg-emerald-950/40 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
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
          <div className="bg-zinc-900/70 rounded-2xl p-4 space-y-3 text-xs">
            <div className="font-semibold text-zinc-200 flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4 text-netflix-red" />
              Hướng dẫn cài trên iPhone / iPad (Safari):
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-netflix-red/20 text-white font-bold flex items-center justify-center shrink-0 tabular-nums">
                1
              </div>
              <div className="text-zinc-300">
                Nhấn vào nút <strong className="text-white">Chia sẻ</strong>{" "}
                <Share2 className="inline w-3.5 h-3.5 mx-1 text-sky-400" /> ở
                thanh công cụ dưới cùng Safari.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-netflix-red/20 text-white font-bold flex items-center justify-center shrink-0 tabular-nums">
                2
              </div>
              <div className="text-zinc-300">
                Cuộn xuống và chọn{" "}
                <strong className="text-white">Thêm vào MH chính</strong>{" "}
                <PlusSquare className="inline w-3.5 h-3.5 mx-1 text-emerald-400" />{" "}
                (Add to Home Screen).
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-netflix-red/20 text-white font-bold flex items-center justify-center shrink-0 tabular-nums">
                3
              </div>
              <div className="text-zinc-300">
                Nhấn <strong className="text-white">Thêm</strong> ở góc trên
                phải. Mở ứng dụng từ màn hình chính để tận hưởng!
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Android & Desktop Chrome / Edge */
        <div className="space-y-4">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3.5 px-4 rounded-2xl bg-netflix-red hover:brightness-110 active:brightness-95 text-white font-bold text-sm shadow-lg shadow-netflix-red/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Cài Đặt Ngay Bây Giờ (Miễn Phí)</span>
            </button>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setShowManualGuide(!showManualGuide)}
                className="w-full py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Monitor className="w-4 h-4 text-netflix-red" />
                <span>
                  {showManualGuide
                    ? "Ẩn hướng dẫn cài đặt"
                    : "Hướng dẫn cài đặt thủ công"}
                </span>
              </button>

              {showManualGuide && (
                <div className="mt-3 bg-zinc-900/70 rounded-2xl p-4 text-xs space-y-2.5 text-zinc-300 animate-in fade-in duration-200">
                  <div className="font-semibold text-white">
                    {isMobile ? "Trên Chrome Android:" : "Trên Chrome / Edge (Máy tính):"}
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-netflix-red font-bold">1.</span>
                    <span>
                      Nhấn vào biểu tượng{" "}
                      <MoreVertical className="inline w-3.5 h-3.5 mx-0.5 text-zinc-400" />{" "}
                      (Menu góc trên phải trình duyệt).
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-netflix-red font-bold">2.</span>
                    <span>
                      Chọn{" "}
                      <strong className="text-white">
                        {isMobile
                          ? "Cài đặt ứng dụng"
                          : "Cài đặt Nanaflix..."}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-netflix-red font-bold">3.</span>
                    <span>Xác nhận cài đặt để tạo icon ứng dụng.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature Perks */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Mở nhanh 1-chạm</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">Không tốn bộ nhớ máy</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold text-white">
                <Maximize2 className="w-3.5 h-3.5 text-netflix-red shrink-0" />
                <span>Toàn màn hình</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">Trải nghiệm như ứng dụng gốc</p>
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
};

export default InstallPwaModal;
