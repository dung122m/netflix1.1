"use client";

import React, { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finishTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  const currentUrl = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
  const lastUrlRef = useRef(currentUrl);

  const stopLoading = useCallback(() => {
    if (!isRunningRef.current) return;
    isRunningRef.current = false;

    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    setProgress(100);

    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    finishTimerRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 280);
  }, []);

  const startLoading = useCallback(() => {
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

    isRunningRef.current = true;
    setLoading(true);
    setProgress(18);

    // Tăng dần tiến trình giả lập mượt mà: 18% -> 48% -> 72% -> 88%
    let current = 18;
    progressTimerRef.current = setInterval(() => {
      current += (90 - current) * 0.16;
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(current, 90);
      });
    }, 100);

    // Timeout an toàn 15s tự tắt nếu mạng đứt hoặc navigation bị hủy
    // KHÔNG dùng 4s vì SSR / TMDb / Wikipedia cold start có thể cần 3.5 - 5s
    safetyTimerRef.current = setTimeout(() => {
      stopLoading();
    }, 15000);
  }, [stopLoading]);

  // 1. Theo dõi chuyển trang (Khi URL Pathname hoặc Query Params thay đổi)
  // Khi URL thay đổi là Next.js đã hoàn thành fetch Server Component và mount màn hình mới,
  // do đó tiến trình kết thúc chính xác ngay lúc màn hình mới xuất hiện.
  useEffect(() => {
    const isUrlChanged = lastUrlRef.current !== currentUrl;
    lastUrlRef.current = currentUrl;

    if (isUrlChanged && isRunningRef.current) {
      stopLoading();
    }
  }, [currentUrl, stopLoading]);

  // 2. Bắt sự kiện click toàn trang trên thẻ <a> (Link nội bộ, Tab, Menu, Thẻ phim) để kích hoạt loading NGAY TỨC THÌ (0ms)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Bỏ qua click chuột giữa, chuột phải hoặc phím tắt mở tab mới
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }

      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      // Bỏ qua nếu mở tab mới hoặc link ngoài
      if (targetAttr === "_blank" || !href) return;
      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;

        // Nếu click vào chính URL hiện tại (bao gồm cả query) thì bỏ qua
        const currentFullUrl = `${window.location.pathname}${window.location.search}`;
        const targetFullUrl = `${url.pathname}${url.search}`;
        if (targetFullUrl === currentFullUrl) return;

        startLoading();
      } catch {}
    };

    const handlePopState = () => {
      startLoading();
    };

    const handleCustomStart = () => startLoading();
    const handleCustomEnd = () => stopLoading();

    document.addEventListener("click", handleDocumentClick, { capture: true, passive: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("app:loading-start", handleCustomStart);
    window.addEventListener("app:loading-end", handleCustomEnd);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
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
          className="h-[3px] sm:h-[3.5px] w-full bg-netflix-red shadow-sm shadow-black/80 transition-all duration-200 ease-out will-change-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 2. SPINNER PHÁT QUANG GÓC TRÊN PHẢI (MOBILE & PC) */}
      <div
        className="fixed top-3 sm:top-4 right-3 sm:right-4 z-[999999] pointer-events-none transition-all duration-300 flex items-center gap-2 bg-black/85 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-2xl"
        style={{
          opacity: loading ? 1 : 0,
          transform: loading ? "scale(1) translateY(0)" : "scale(0.8) translateY(-6px)",
        }}
      >
        <div className="w-3.5 h-3.5 rounded-full border-2 border-netflix-red/30 border-t-netflix-red animate-spin" />
        <span className="text-[10px] font-black text-zinc-200 tracking-wider hidden min-[380px]:inline">Đang tải...</span>
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
