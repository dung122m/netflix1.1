"use client";

import { useEffect } from "react";
import { incrementUserWatchTime } from "@/services/userService";

export interface UseWatchTimeHeartbeatOptions {
  userId?: string | null;
  isNativeVideo: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useWatchTimeHeartbeat({
  userId,
  isNativeVideo,
  videoRef,
}: UseWatchTimeHeartbeatOptions) {
  useEffect(() => {
    if (!userId) return;

    const initialTimer = setTimeout(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        if (isNativeVideo && videoRef.current && (videoRef.current.paused || videoRef.current.ended)) return;
        incrementUserWatchTime(userId, 1);
      }
    }, 15000);

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (isNativeVideo && videoRef.current && (videoRef.current.paused || videoRef.current.ended)) return;
      incrementUserWatchTime(userId, 1);
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [userId, isNativeVideo, videoRef]);
}
