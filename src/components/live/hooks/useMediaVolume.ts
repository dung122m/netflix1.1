"use client";

import { useState, useRef, useCallback, useEffect, RefObject } from "react";

export interface VolumeOsdState {
  volume: number;
  isMuted: boolean;
  visible: boolean;
}

export interface UseMediaVolumeOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  defaultVolume?: number;
  storageKey?: string;
  onVolumeChangeCallback?: (vol: number, muted: boolean) => void;
}

export function useMediaVolume({
  videoRef,
  defaultVolume = 0.9,
  storageKey = "nanaflix_live_volume",
  onVolumeChangeCallback,
}: UseMediaVolumeOptions) {
  const [volume, setVolume] = useState<number>(defaultVolume);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const userMutedRef = useRef<boolean>(false);
  const volumeRef = useRef<number>(defaultVolume);

  const [volumeOsd, setVolumeOsd] = useState<VolumeOsdState | null>(null);
  const volumeOsdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cập nhật volumeRef đồng bộ
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Kích hoạt OSD hiển thị âm lượng với debounce timeout 1500ms
  const triggerVolumeOsd = useCallback((newVol: number, muted: boolean) => {
    if (volumeOsdTimerRef.current) {
      clearTimeout(volumeOsdTimerRef.current);
      volumeOsdTimerRef.current = null;
    }
    setVolumeOsd({
      volume: newVol,
      isMuted: muted,
      visible: true,
    });
    volumeOsdTimerRef.current = setTimeout(() => {
      setVolumeOsd((prev) => (prev ? { ...prev, visible: false } : null));
      volumeOsdTimerRef.current = null;
    }, 1500);
  }, []);

  // Khôi phục volume đã lưu từ localStorage khi khởi tạo
  useEffect(() => {
    try {
      const savedVol = localStorage.getItem(storageKey);
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val > 0 && val <= 1) {
          setVolume(val);
          volumeRef.current = val;
        } else {
          setVolume(defaultVolume);
          volumeRef.current = defaultVolume;
        }
      } else {
        setVolume(defaultVolume);
        volumeRef.current = defaultVolume;
      }
    } catch {
      setVolume(defaultVolume);
      volumeRef.current = defaultVolume;
    }
  }, [defaultVolume, storageKey]);

  // Handler thay đổi volume từ thanh trượt
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, newVolume));
      setVolume(clamped);
      volumeRef.current = clamped;
      const shouldMute = clamped === 0;
      userMutedRef.current = shouldMute;
      setIsMuted(shouldMute);

      if (videoRef.current) {
        videoRef.current.volume = clamped;
        videoRef.current.muted = shouldMute;
      }

      triggerVolumeOsd(clamped, shouldMute);
      onVolumeChangeCallback?.(clamped, shouldMute);

      try {
        localStorage.setItem(storageKey, String(clamped));
      } catch {}
    },
    [videoRef, triggerVolumeOsd, storageKey, onVolumeChangeCallback],
  );

  // Tăng hoặc giảm âm lượng theo bước (ArrowUp / ArrowDown)
  const stepVolume = useCallback(
    (delta: number) => {
      const targetVol = Math.max(0, Math.min(1, +(volume + delta).toFixed(2)));
      setVolume(targetVol);
      volumeRef.current = targetVol;
      const shouldMute = targetVol === 0;
      userMutedRef.current = shouldMute;
      setIsMuted(shouldMute);

      if (videoRef.current) {
        videoRef.current.volume = targetVol;
        videoRef.current.muted = shouldMute;
      }

      triggerVolumeOsd(targetVol, shouldMute);
      onVolumeChangeCallback?.(targetVol, shouldMute);

      try {
        localStorage.setItem(storageKey, String(targetVol));
      } catch {}
    },
    [volume, videoRef, triggerVolumeOsd, storageKey, onVolumeChangeCallback],
  );

  // Bật/tắt mute (phím M hoặc click icon loa)
  const toggleMute = useCallback(
    (unmuteSoundCallback?: () => void) => {
      if (isMuted) {
        setIsMuted(false);
        userMutedRef.current = false;
        const targetVol = volume > 0 ? volume : 1;
        if (volume === 0) {
          setVolume(1);
          volumeRef.current = 1;
        }
        if (videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = targetVol;
        }
        unmuteSoundCallback?.();
        triggerVolumeOsd(targetVol, false);
      } else {
        setIsMuted(true);
        userMutedRef.current = true;
        if (videoRef.current) {
          videoRef.current.muted = true;
        }
        triggerVolumeOsd(volume, true);
      }
    },
    [isMuted, volume, videoRef, triggerVolumeOsd],
  );

  return {
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    volumeRef,
    userMutedRef,
    volumeOsd,
    handleVolumeChange,
    stepVolume,
    toggleMute,
    triggerVolumeOsd,
  };
}

