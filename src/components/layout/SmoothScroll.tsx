"use client";

import { ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Chỉ kích hoạt Lenis trên môi trường trình duyệt client
    if (typeof window === "undefined") return;

    // Khởi tạo Lenis Smooth Scroll Engine chuẩn Apple / Linear
    // Đảm bảo cuộn bánh xe chuột (mouse wheel) có quán tính đầm mượt, triệt tiêu giật cục trên Windows
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential deceleration
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.2,
      syncTouch: false, // Giữ cuộn cảm ứng tự nhiên 120Hz trên iOS / Android
    });

    lenisRef.current = lenis;

    // Expose lenis lên window để các component khác có thể gọi nếu cần
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);

  useEffect(() => {
    // Tự động cuộn lên đầu tức thì khi chuyển sang xem phim mới
    if (pathname.startsWith("/movies/")) {
      const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [pathname]);

  return <>{children}</>;
}
