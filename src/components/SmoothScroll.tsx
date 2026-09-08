"use client";

import { ReactNode, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    // Tự động cuộn lên đầu trang tức thì khi chuyển sang xem phim mới
    if (pathname.startsWith("/movies/")) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname]);

  return <>{children}</>;
}
