import { useEffect } from "react";

let lockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";
let originalBodyPosition = "";
let originalBodyTop = "";
let originalBodyLeft = "";
let originalBodyWidth = "";
let originalHtmlOverflow = "";
let originalHtmlOverscroll = "";
let originalBodyOverscroll = "";
let savedScrollY = 0;

/**
 * Khóa cuộn trang web (body scroll) với cơ chế Reference Counting và bảo toàn scroll position.
 * Tương thích hoàn toàn trên Desktop và Mobile (iOS Safari / Android Chrome).
 * An toàn với SSR, React Strict Mode, và hỗ trợ đa tầng Nested Modals.
 */
export function lockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount++;
  if (lockCount === 1) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;

    const docEl = document.documentElement;
    const body = document.body;

    originalHtmlOverflow = docEl.style.overflow;
    originalHtmlOverscroll = docEl.style.overscrollBehavior;

    originalBodyOverflow = body.style.overflow;
    originalBodyPaddingRight = body.style.paddingRight;
    originalBodyPosition = body.style.position;
    originalBodyTop = body.style.top;
    originalBodyLeft = body.style.left;
    originalBodyWidth = body.style.width;
    originalBodyOverscroll = body.style.overscrollBehavior;

    // Tính toán độ rộng thanh cuộn trên Desktop để bù trừ padding (tránh Layout Shift)
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    // Khóa cuộn ở cấp HTML & Body
    docEl.style.overflow = "hidden";
    docEl.style.overscrollBehavior = "none";

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    // Khóa vị trí cố định trên mobile để ngăn chặn 100% hiện tượng touch drag kéo trượt trang nền
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.left = "0";
    body.style.width = "100%";
  }
}

/**
 * Mở khóa cuộn trang web khi tất cả các modal / drawer đã đóng hoàn toàn (lockCount === 0).
 */
export function unlockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const docEl = document.documentElement;
    const body = document.body;

    docEl.style.overflow = originalHtmlOverflow;
    docEl.style.overscrollBehavior = originalHtmlOverscroll;

    body.style.overflow = originalBodyOverflow;
    body.style.paddingRight = originalBodyPaddingRight;
    body.style.position = originalBodyPosition;
    body.style.top = originalBodyTop;
    body.style.left = originalBodyLeft;
    body.style.width = originalBodyWidth;
    body.style.overscrollBehavior = originalBodyOverscroll;

    // Khôi phục chính xác vị trí cuộn trước đó
    try {
      window.scrollTo({
        top: savedScrollY,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
    } catch {
      window.scrollTo(0, savedScrollY);
    }
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
