import { useEffect } from "react";

let lockCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

/**
 * Khóa cuộn trang web (body scroll) với cơ chế Reference Counting và bù trừ Scrollbar Width.
 * An toàn với SSR, React Strict Mode, và hỗ trợ đa tầng Nested Modals.
 */
export function lockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount++;
  if (lockCount === 1) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;

    // Tính toán độ rộng thực tế của thanh cuộn trên Desktop (tránh Layout Shift)
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = "hidden";
  }
}

/**
 * Mở khóa cuộn trang web khi tất cả các modal / drawer đã đóng hoàn toàn (lockCount === 0).
 */
export function unlockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}

/**
 * Lấy số lượng modal/drawer đang kích hoạt khóa cuộn (hỗ trợ kiểm thử/debug).
 */
export function getScrollLockCount(): number {
  return lockCount;
}

/**
 * Hook React tiện ích cho modal/drawer. Tự động lock khi isOpen = true và unlock khi unmount/close.
 */
export function useBodyScrollLock(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);
}
