"use client";

import React, { useEffect, useState, useRef, useTransition, Suspense, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [, startTransition] = useTransition();

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  const stopLoading = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    isRunningRef.current = false;
    setProgress(100);

    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    finishTimerRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 280);
  }, []);

  const startLoading = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;

    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    setLoading(true);
    setProgress(15);

    // Tăng dần tiến trình giả lập mượt mà: 15% -> 45% -> 75% -> 88%
    let current = 15;
    progressTimerRef.current = setInterval(() => {
      current += (90 - current) * 0.18;
      setProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(current, 92);
      });
    }, 120);

    // Timeout an toàn 9s tự tắt nếu mạng lag hoặc chuyển trang bị hủy
    safetyTimerRef.current = setTimeout(() => {
      stopLoading();
    }, 9000);
  }, [stopLoading]);

  // 1. Theo dõi thay đổi URL (Pathname hoặc Query Params) -> Kết thúc loading
  const searchStr = searchParams ? searchParams.toString() : "";
  useEffect(() => {
    startTransition(() => {
      stopLoading();
    });
  }, [pathname, searchStr, stopLoading]);

  // 2. Bắt sự kiện click toàn trang trên thẻ <a> (Link nội bộ) để kích hoạt loading NGAY TỨC THÌ (0ms)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Bỏ qua click chuột giữa, chuột phải hoặc phím tắt mở tab mới
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented) {
        return;
      }

      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      // Bỏ qua nếu mở tab mới hoặc link ngoài
      if (targetAttr === "_blank" || !href) return;
      if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (href.startsWith("http://") || href.startsWith("https://")) {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
      }

      // Nếu click vào chính URL hiện tại (bao gồm cả hash) thì bỏ qua
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (href === currentUrl) return;

      startLoading();
    };

    const handleCustomStart = () => startLoading();
    const handleCustomEnd = () => stopLoading();

    document.addEventListener("click", handleDocumentClick, { capture: true, passive: true });
    window.addEventListener("app:loading-start", handleCustomStart);
    window.addEventListener("app:loading-end", handleCustomEnd);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("app:loading-start", handleCustomStart);
      window.removeEventListener("app:loading-end", handleCustomEnd);
    };
  }, [startLoading, stopLoading]);

  if (!loading && progress === 0) return null;

  return (
    <>
      {/* 1. THANH LOADING CHẠY TRÊN ĐẦU MÀN HÌNH (TOP GLOW PROGRESS BAR) */}
      <div
        className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none transition-opacity duration-300"
        style={{ opacity: loading ? 1 : 0 }}
      >
        <div
          className="h-[3px] sm:h-[3.5px] w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_15px_rgba(229,9,20,0.9),0_0_8px_rgba(251,191,36,0.8)] transition-all duration-200 ease-out will-change-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 2. SPINNER PHÁT QUANG GÓC TRÊN PHẢI (MOBILE & PC) */}
      <div
        className="fixed top-3 sm:top-4 right-3 sm:right-4 z-[999999] pointer-events-none transition-all duration-300 flex items-center gap-2 bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/20 shadow-2xl"
        style={{
          opacity: loading ? 1 : 0,
          transform: loading ? "scale(1) translateY(0)" : "scale(0.8) translateY(-6px)",
        }}
      >
        <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
        <span className="text-[10px] font-black text-gray-200 tracking-wider hidden xs:inline">Đang tải...</span>
      </div>
    </>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarInner />
    </Suspense>
  );
}

export default NavigationProgressBar;
