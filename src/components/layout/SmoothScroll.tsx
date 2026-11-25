"use client";

import { ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { resetBodyScrollLock } from "@/lib/scrollLock";

/**
 * Điều hướng trang: Hiển thị ngay từ đầu trang tức thì (0ms instant),
 * giữ nguyên vị trí cuộn của trình duyệt khi Back/Forward (popstate).
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPopNavigationRef = useRef(false);

  useEffect(() => {
    const handlePopState = () => {
      isPopNavigationRef.current = true;
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    resetBodyScrollLock();
    if (isPopNavigationRef.current) {
      isPopNavigationRef.current = false;
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname]);

  return <>{children}</>;
}


