import { useState, useCallback, useRef, useEffect } from "react";

/**
 * useLocalStorage — đọc/ghi localStorage với type-safe và SSR-safe.
 * Tránh viết try/catch lặp lại ở từng component.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const keyRef = useRef(key);

  // Cập nhật keyRef nếu key thay đổi
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const newValue =
            typeof value === "function"
              ? (value as (prev: T) => T)(prev)
              : value;
          window.localStorage.setItem(keyRef.current, JSON.stringify(newValue));
          return newValue;
        });
      } catch {
        // Bỏ qua lỗi (e.g. private mode, quota)
      }
    },
    []
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(keyRef.current);
      setStoredValue(initialValue);
    } catch {
      // ignore
    }
  }, [initialValue]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
