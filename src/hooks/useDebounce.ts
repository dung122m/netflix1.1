import { useRef, useCallback, useEffect } from "react";

/**
 * useDebounce — trả về hàm debounced stable giữa các re-render.
 * Không dùng useState để tránh re-render thêm.
 */
export function useDebounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): [debounced: (...args: Parameters<T>) => void, cancel: () => void] {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef<T>(fn);

  // Cập nhật ref sau mỗi render để luôn gọi được version mới nhất
  useEffect(() => {
    fnRef.current = fn;
  });

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      timerRef.current = setTimeout(() => {
        fnRef.current(...args);
        timerRef.current = null;
      }, delay);
    },
    [cancel, delay]
  );

  return [debounced, cancel];
}

export default useDebounce;
