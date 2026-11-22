"use client";

import { ReactNode, useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Theo dõi thay đổi URL (route & search params / phân trang)
 * và hiển thị ngay từ đầu trang tức thì (0ms instant),
 * tuyệt đối không chạy hiệu ứng cuộn gây chóng mặt hay giật lag.
 */
function ScrollResetWatcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, searchParams]);

  return null;
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <ScrollResetWatcher />
      </Suspense>
      {children}
    </>
  );
}

