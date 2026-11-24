"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface GoogleAnalyticsTrackerProps {
  gaId: string;
}

export function GoogleAnalyticsTracker({ gaId }: GoogleAnalyticsTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Bỏ qua lần render đầu tiên vì script trong layout.tsx đã gửi page_view khởi tạo
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!pathname || typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (typeof win.gtag !== "function") return;

    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;

    // Đợi Next.js App Router cập nhật xong thẻ <title> của phim mới
    const timer = setTimeout(() => {
      win.gtag("config", gaId, {
        page_path: url,
        page_title: document.title,
        page_location: window.location.href,
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [pathname, searchParams, gaId]);

  return null;
}
