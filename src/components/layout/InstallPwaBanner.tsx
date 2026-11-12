"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const InstallPwaModal = dynamic(
  () => import("@/components/modals/InstallPwaModal").then((mod) => mod.InstallPwaModal),
  { ssr: false }
);

export const InstallPwaBanner: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";
    const isLocalDev = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";

    // Gỡ bỏ Service Worker ở local dev đã được xử lý đồng bộ sớm trong <head> của layout.tsx;
    // ở đây chỉ đăng ký /sw.js khi chạy production trên domain thật.
    if ("serviceWorker" in navigator && !isLocalDev && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (reg?.scope) {
            console.log("[PWA] Service Worker đã sẵn sàng:", reg.scope);
          }
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

  return showModal ? (
    <InstallPwaModal isOpen={showModal} onClose={() => setShowModal(false)} />
  ) : null;
};
