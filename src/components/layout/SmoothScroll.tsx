"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { resetBodyScrollLock } from "@/lib/scrollLock";

/**
 * Điều hướng trang: Hiển thị ngay từ đầu trang tức thì (0ms instant),
 * tuyệt đối không chạy hiệu ứng cuộn kéo dài gây chóng mặt hay giật lag.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    resetBodyScrollLock();
    window.scrollTo(0, 0);
  }, [pathname]);

  return <>{children}</>;
}


