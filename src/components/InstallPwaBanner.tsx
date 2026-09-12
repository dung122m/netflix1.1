"use client";

import React, { useState, useEffect } from "react";
import { InstallPwaModal } from "./InstallPwaModal";

export const InstallPwaBanner: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Register Service Worker in production
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("Lỗi đăng ký Service Worker:", err);
      });
    }

    // Chỉ mở modal khi người dùng chủ động bấm "Cài đặt App" từ menu/footer
    const handleCustomOpen = () => {
      setShowModal(true);
    };

    window.addEventListener("open-pwa-install", handleCustomOpen);

    return () => {
      window.removeEventListener("open-pwa-install", handleCustomOpen);
    };
  }, []);

  return <InstallPwaModal isOpen={showModal} onClose={() => setShowModal(false)} />;
};
