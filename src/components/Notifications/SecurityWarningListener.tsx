"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/Toast";

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // Check every 3 minutes
const STORAGE_KEY = "nanaflix_last_sec_warn_ts";

export function SecurityWarningListener() {
  const { user, loading } = useAuth();
  const lastWarnedRef = useRef<number>(0);
  const lastCheckTimeRef = useRef<number>(0);

  useEffect(() => {
    // Không gọi checkSecurityWarning khi Firebase Auth đang hydrate
    if (loading) return;

    let timer: NodeJS.Timeout | null = null;
    let initialTimer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const checkSecurityWarning = async () => {
      // Chỉ thực hiện khi tab đang visible
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      try {
        lastCheckTimeRef.current = Date.now();
        const anonymousId = typeof window !== "undefined" ? localStorage.getItem("nanaflix_anon_id") || "" : "";
        const url = new URL("/api/security/warnings", window.location.origin);
        if (user?.uid) {
          url.searchParams.set("userId", user.uid);
        }
        if (anonymousId) {
          url.searchParams.set("anonymousId", anonymousId);
        }

        const headers: Record<string, string> = {};
        if (anonymousId) {
          headers["x-anonymous-id"] = anonymousId;
        }

        const res = await fetch(url.toString(), {
          headers,
          cache: "no-store",
        });

        if (!res.ok) return;
        const json = await res.json();

        if (isCancelled) return;

        if (json.success && json.data?.hasWarning) {
          const now = Date.now();
          const stored = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
          const lastWarnTime = stored ? parseInt(stored, 10) : lastWarnedRef.current;

          // Only notify if at least 2 minutes have elapsed since last warning toast
          if (now - lastWarnTime > 2 * 60 * 1000) {
            lastWarnedRef.current = now;
            if (typeof window !== "undefined") {
              sessionStorage.setItem(STORAGE_KEY, now.toString());
            }

            if (json.data.isBlocked) {
              toast.error(
                json.data.message ||
                  "Hệ thống phát hiện tần suất gửi yêu cầu bất thường. Để bảo vệ kết nối, tính năng tạm dừng trong ít phút. Vui lòng thử lại sau."
              );
            } else {
              toast.info(
                json.data.message ||
                  "Cảnh báo bảo mật: Vui lòng kiểm tra lại nội dung và tránh gửi yêu cầu liên tục quá nhanh."
              );
            }
          }
        }
      } catch {
        // Silently ignore network or abort errors
      }
    };

    // Initial check after a short delay (3s) once Auth is hydrated
    initialTimer = setTimeout(() => {
      checkSecurityWarning();
    }, 3000);

    // Periodic check every 3 minutes
    timer = setInterval(checkSecurityWarning, CHECK_INTERVAL_MS);

    // Khi tab quay lại visible sau thời gian dài (>= 3 phút), thực hiện check
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        if (now - lastCheckTimeRef.current >= CHECK_INTERVAL_MS) {
          checkSecurityWarning();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (initialTimer) clearTimeout(initialTimer);
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.uid, loading]);

  return null;
}
