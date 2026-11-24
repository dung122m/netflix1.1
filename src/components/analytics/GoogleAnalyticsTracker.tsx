"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface GoogleAnalyticsTrackerProps {
  gaId: string;
}

export function GoogleAnalyticsTracker({ gaId }: GoogleAnalyticsTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrlRef = useRef<string>("");

  useEffect(() => {
    if (!pathname || typeof window === "undefined" || !gaId) return;

    const query = searchParams?.toString();
    const currentUrl = query ? `${pathname}?${query}` : pathname;

    // Tránh gửi trùng lặp nếu URL không thay đổi
    if (lastTrackedUrlRef.current === currentUrl) return;
    lastTrackedUrlRef.current = currentUrl;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;

    const sendHit = () => {
      if (typeof win.gtag === "function") {
        // Gửi cả config và explicit event page_view để đảm bảo GA4 Realtime ghi nhận tức thì (0ms trễ)
        win.gtag("config", gaId, {
          page_path: currentUrl,
          page_title: document.title,
          page_location: window.location.href,
        });
        win.gtag("event", "page_view", {
          page_title: document.title,
          page_location: window.location.href,
          page_path: currentUrl,
          send_to: gaId,
        });
      }
    };

    // Đợi Next.js App Router cập nhật xong thẻ <title> của trang/phim mới
    const timer = setTimeout(sendHit, 150);

    return () => clearTimeout(timer);
  }, [pathname, searchParams, gaId]);

  return null;
}

