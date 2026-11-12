"use client";

import React, { useEffect } from "react";
import { SkipBack, SkipForward } from "lucide-react";
import {
  calculateKeyboardSeek,
  createInitialKeyboardSeekState,
  KEYBOARD_SEEK_CYCLE_TIMEOUT_MS,
  KEYBOARD_SEEK_DEBOUNCE_MS,
} from "@/lib/keyboardSeekManager";
import {
  updateUserMutePreferenceDuringTransition,
  type AdTransitionState,
} from "@/lib/adTransitionController";
import { type EpisodeItem } from "@/components/cinema/cinemaStreamHelpers";
import { type PendingKeyboardSeekRefValue } from "@/components/cinema/hooks/useCinemaOsdAndControls";

interface UseCinemaShortcutsOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  pendingKeyboardSeekRef: React.RefObject<PendingKeyboardSeekRefValue>;
  singleTapTimerRef: React.RefObject<NodeJS.Timeout | null>;
  automatedAdSkipRef: React.RefObject<AdTransitionState | null>;
  isNativeVideo: boolean;
  isFullscreen: boolean;
  volume: number;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTheaterMode: React.Dispatch<React.SetStateAction<boolean>>;
  effectivePrevEpisode: EpisodeItem | null;
  effectiveNextEpisode: EpisodeItem | null;
  switchEpisode?: (slug: string) => void;
  togglePlayPause: () => void;
  toggleFullscreen: () => void;
  handleVolumeDelta: (delta: number) => void;
  triggerVolumeOsd: (newVol: number, muted: boolean) => void;
  showHud: (icon?: React.ReactNode, text?: string) => void;
  resetControlsTimeout: () => void;
  triggerDesktopFeedback: (
    type: "play" | "pause" | "seek-left" | "seek-right",
    text?: string,
    seconds?: number,
  ) => void;
  getEffectiveDuration: () => number;
  requestPlayerSeek: (targetTime: number, isProgrammatic?: boolean) => void;
}

export function useCinemaShortcuts({
  containerRef,
  videoRef,
  pendingKeyboardSeekRef,
  singleTapTimerRef,
  automatedAdSkipRef,
  isNativeVideo,
  isFullscreen,
  volume,
  setIsMuted,
  setIsTheaterMode,
  effectivePrevEpisode,
  effectiveNextEpisode,
  switchEpisode,
  togglePlayPause,
  toggleFullscreen,
  handleVolumeDelta,
  triggerVolumeOsd,
  showHud,
  resetControlsTimeout,
  triggerDesktopFeedback,
  getEffectiveDuration,
  requestPlayerSeek,
}: UseCinemaShortcutsOptions) {
  // Dedicated unmount teardown for keyboard seek timers to avoid cancelling in-flight seeks during normal re-renders
  useEffect(() => {
    const s = pendingKeyboardSeekRef.current;
    return () => {
      if (s.timer) {
        clearTimeout(s.timer);
        s.timer = null;
      }
      if (s.resetTimer) {
        clearTimeout(s.resetTimer);
        s.resetTimer = null;
      }
    };
  }, [pendingKeyboardSeekRef]);

  // Global Keyboard shortcuts & TV Player Focus Navigation (YouTube Style Direct Playback & 4-Tier Control Navigation)
  useEffect(() => {
    const singleTapTimerContainer = singleTapTimerRef;
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Bỏ qua nếu người dùng đang dùng tổ hợp phím hệ thống (Ctrl + C, Cmd + C, Ctrl + V, Alt + ...)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const target = (e.target || document.activeElement) as HTMLElement | null;
      const active = (document.activeElement || target) as HTMLElement | null;

      // 2. Bỏ qua phím tắt khi focus vào input, textarea, select, [contenteditable], role textbox/searchbox
      const isInput = Boolean(
        active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT" ||
            active.isContentEditable ||
            active.getAttribute("contenteditable") === "true" ||
            active.getAttribute("role") === "textbox" ||
            active.getAttribute("role") === "searchbox"),
      );
      if (isInput) return;

      // 3. Nếu đang mở modal / dialog bên ngoài player (ví dụ login modal, actor bio modal...):
      // không can thiệp video
      const isInsideDialog = Boolean(
        active?.closest('[role="dialog"], dialog, [aria-modal="true"]'),
      );
      if (isInsideDialog && !containerRef.current?.contains(active)) {
        return;
      }

      // 4. Phím Escape: Thoát toàn màn hình
      if (e.key === "Escape") {
        if (isFullscreen) {
          e.preventDefault();
          toggleFullscreen();
          return;
        }
      }

      // 6. Kiểm tra xem focus có đang nằm trong menu/dropdown điều hướng (đặc biệt cho Arrow keys)
      const isInsideMenu = Boolean(
        active?.closest('[role="menu"], [role="listbox"]') ||
          (containerRef.current &&
            active &&
            active.getAttribute("data-player-menu-item") === "true"),
      );

      // Nếu menu player đang mở và người dùng dùng ArrowUp/Down để di chuyển menu items:
      if (isInsideMenu && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        const menuItems = containerRef.current
          ? Array.from(
              containerRef.current.querySelectorAll<HTMLElement>(
                '[data-player-menu-item="true"]',
              ),
            )
          : [];
        if (menuItems.length > 0) {
          const currentMenuIdx = menuItems.findIndex((el) => el === active);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextIdx =
              currentMenuIdx < menuItems.length - 1 ? currentMenuIdx + 1 : 0;
            menuItems[nextIdx]?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevIdx =
              currentMenuIdx > 0 ? currentMenuIdx - 1 : menuItems.length - 1;
            menuItems[prevIdx]?.focus();
            return;
          }
        }
        return;
      }

      // 7. PHÍM SPACE / K: Phát / Tạm dừng
      if (
        e.code === "Space" ||
        e.key === " " ||
        e.key === "k" ||
        e.key === "K"
      ) {
        // Nếu active là một nút bấm hoặc link bên ngoài player (ví dụ nút chọn tập trong EpisodeList hoặc nút trên trang)
        // và phím là Space: để sự kiện click tự nhiên cho nút đó hoạt động
        if (
          (e.code === "Space" || e.key === " ") &&
          active &&
          (active.tagName === "BUTTON" || active.tagName === "A")
        ) {
          const isPlayerControlBtn = Boolean(
            containerRef.current?.contains(active),
          );
          if (!isPlayerControlBtn) {
            return;
          }
        }
        if (e.repeat) return;
        e.preventDefault();
        resetControlsTimeout();
        togglePlayPause();
        return;
      }

      // 8. PHÍM TẮT CHỨC NĂNG (F, M, T, P, N, ?)
      if (e.key === "f" || e.key === "F") {
        if (e.repeat) return;
        e.preventDefault();
        resetControlsTimeout();
        toggleFullscreen();
        return;
      }

      if (e.key === "m" || e.key === "M") {
        if (e.repeat) return;
        e.preventDefault();
        resetControlsTimeout();
        if (isNativeVideo && videoRef.current) {
          const nextMuted = !videoRef.current.muted;
          videoRef.current.muted = nextMuted;
          setIsMuted(nextMuted);
          if (automatedAdSkipRef.current && automatedAdSkipRef.current.active) {
            automatedAdSkipRef.current =
              updateUserMutePreferenceDuringTransition(
                automatedAdSkipRef.current,
                nextMuted,
              );
          }
          triggerVolumeOsd(volume, nextMuted);
        }
        return;
      }

      if (e.key === "t" || e.key === "T") {
        if (e.repeat) return;
        e.preventDefault();
        resetControlsTimeout();
        setIsTheaterMode((prev) => !prev);
        return;
      }

      if (
        (e.key === "p" || e.key === "P") &&
        effectivePrevEpisode?.slug &&
        switchEpisode
      ) {
        if (e.repeat) return;
        e.preventDefault();
        resetControlsTimeout();
        showHud(
          React.createElement(SkipBack, { className: "w-5 h-5 text-netflix-red" }),
          `Chuyển về ${effectivePrevEpisode.name}`,
        );
        switchEpisode(effectivePrevEpisode.slug);
        return;
      }

      if (
        (e.key === "n" || e.key === "N") &&
        effectiveNextEpisode?.slug &&
        switchEpisode
      ) {
        if (e.repeat) return;
        e.preventDefault();
        resetControlsTimeout();
        showHud(
          React.createElement(SkipForward, {
            className: "w-5 h-5 text-netflix-red",
          }),
          `Chuyển sang ${effectiveNextEpisode.name}`,
        );
        switchEpisode(effectiveNextEpisode.slug);
        return;
      }

      // 9. PHÍM TUA VIDEO (← / →): Tua lùi / tiến 10s (Chu kỳ hiển thị chuẩn xác và đồng bộ OSD)
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (
          active &&
          active.tagName === "INPUT" &&
          active.getAttribute("type") === "range"
        ) {
          return;
        }

        e.preventDefault();
        resetControlsTimeout();

        if (isNativeVideo && videoRef.current) {
          const v = videoRef.current;
          const effectiveDuration = getEffectiveDuration();
          const s = pendingKeyboardSeekRef.current;

          const result = calculateKeyboardSeek(
            s.state,
            e.key,
            v.currentTime || 0,
            effectiveDuration,
            Date.now(),
          );

          s.state = result.nextState;

          // Nếu đổi hướng tua trong lúc seek trước đang debounce, flush ngay lệnh trước
          if (
            result.shouldFlushPrevious &&
            result.previousTargetToFlush !== undefined
          ) {
            if (s.timer) {
              clearTimeout(s.timer);
              s.timer = null;
            }
            requestPlayerSeek(result.previousTargetToFlush, false);
          }

          // Cập nhật OSD phản hồi thị giác
          triggerDesktopFeedback(
            result.feedbackType,
            result.feedbackText,
            result.feedbackSeconds,
          );

          // Debounce lệnh seek thực tế đến player (250ms)
          if (s.timer) {
            clearTimeout(s.timer);
          }
          s.timer = setTimeout(() => {
            requestPlayerSeek(result.targetTime, false);
            s.timer = null;
            s.state.isDebouncePending = false;
          }, KEYBOARD_SEEK_DEBOUNCE_MS);

          // Reset chu kỳ sau khi indicator ẩn hoàn toàn (800ms)
          if (s.resetTimer) {
            clearTimeout(s.resetTimer);
          }
          s.resetTimer = setTimeout(() => {
            s.state = createInitialKeyboardSeekState();
            s.resetTimer = null;
          }, KEYBOARD_SEEK_CYCLE_TIMEOUT_MS);
        }
        return;
      }

      // 10. PHÍM TĂNG / GIẢM ÂM LƯỢNG (↑ / ↓): Thay đổi âm lượng ±5%
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        if (
          active &&
          active.tagName === "INPUT" &&
          active.getAttribute("type") === "range"
        ) {
          return;
        }

        e.preventDefault();
        resetControlsTimeout();
        handleVolumeDelta(e.key === "ArrowUp" ? 0.05 : -0.05);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      // NOTE: Không hủy pendingKeyboardSeekRef timer ở đây vì cleanup này chạy mỗi khi dependencies
      // (như volume, isFullscreen) thay đổi trong lúc player đang render. Unmount effect riêng sẽ dọn dẹp an toàn.
      if (singleTapTimerContainer.current) {
        clearTimeout(singleTapTimerContainer.current);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    containerRef,
    videoRef,
    pendingKeyboardSeekRef,
    singleTapTimerRef,
    automatedAdSkipRef,
    isNativeVideo,
    effectivePrevEpisode,
    effectiveNextEpisode,
    switchEpisode,
    togglePlayPause,
    toggleFullscreen,
    handleVolumeDelta,
    triggerVolumeOsd,
    showHud,
    volume,
    getEffectiveDuration,
    isFullscreen,
    resetControlsTimeout,
    triggerDesktopFeedback,
    setIsMuted,
    setIsTheaterMode,
    requestPlayerSeek,
  ]);
}

