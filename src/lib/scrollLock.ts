import { useEffect } from "react";

let lockCount = 0;
let originalBodyOverflow = "";
let originalBodyOverscroll = "";

/**
 * Khóa cuộn trang web (body scroll) với cơ chế Reference Counting và bảo toàn scroll position.
 * Tận dụng `scrollbar-gutter: stable` trong CSS để chống triệt để mọi hiện tượng Layout Shift & giật ngang Navbar.
 * Chỉ tác động lên body để tránh làm gián đoạn viewport của root documentElement trên thiết bị di động.
 */
export function lockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount++;
  if (lockCount === 1) {
    const body = document.body;

    originalBodyOverflow = body.style.overflow;
    originalBodyOverscroll = body.style.overscrollBehavior;

    // Khóa cuộn ở cấp Body mà không làm xáo trộn root documentElement viewport
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
  }
}

/**
 * Mở khóa cuộn trang web khi tất cả các modal / drawer đã đóng hoàn toàn (lockCount === 0).
 */
export function unlockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const body = document.body;

    body.style.overflow = originalBodyOverflow;
    body.style.overscrollBehavior = originalBodyOverscroll;
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
