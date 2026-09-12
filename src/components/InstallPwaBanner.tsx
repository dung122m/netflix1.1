"use client";

import React, { useState, useEffect } from "react";
import { InstallPwaModal } from "./InstallPwaModal";

export const InstallPwaBanner: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Đăng ký Service Worker để kích hoạt tiêu chuẩn PWA của trình duyệt
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker đã sẵn sàng:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Lỗi đăng ký Service Worker:", err);
        });
    }

    // Bắt và lưu trữ sự kiện beforeinstallprompt toàn cục
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__deferredPwaPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa-prompt-ready"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Mở modal khi người dùng bấm "Cài đặt App" từ navbar hoặc menu
    const handleCustomOpen = () => {
      setShowModal(true);
    };

    window.addEventListener("open-pwa-install", handleCustomOpen);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("open-pwa-install", handleCustomOpen);
    };
  }, []);

  return <InstallPwaModal isOpen={showModal} onClose={() => setShowModal(false)} />;
};
