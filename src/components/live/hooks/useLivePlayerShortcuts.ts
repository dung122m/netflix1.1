"use client";

import { useEffect } from "react";

export interface UseLivePlayerShortcutsOptions {
  isActive?: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  volume: number;
  isRailVisible: boolean;
  togglePlay: () => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  togglePip: () => void;
  goToLiveEdge: () => void;
  handleVolumeChange: (vol: number) => void;
  handleSwitchServer: (direction: "next" | "prev") => void;
  handleSeek: (seconds: number) => void;
  toggleRail: () => void;
  closeRail: () => void;
}

export function useLivePlayerShortcuts({
  isActive = true,
  containerRef,
  isFullscreen,
  volume,
  isRailVisible,
  togglePlay,
  toggleMute,
  toggleFullscreen,
  togglePip,
  goToLiveEdge,
  handleVolumeChange,
  handleSwitchServer,
  handleSeek,
  toggleRail,
  closeRail,
}: UseLivePlayerShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Vô hiệu hóa phím tắt khi người dùng đang nhập liệu trong modal, form hoặc input
      const target = e.target as HTMLElement | null;
      const tagName = typeof target?.tagName === "string" ? target.tagName.toLowerCase() : "";
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      // Bỏ qua nếu người dùng đang dùng tổ hợp phím hệ thống (Ctrl + C copy, Cmd + C, Ctrl + V, Alt + ...)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Chỉ xử lý shortcut khi focus thực sự nằm trong vùng Live Player (hoặc đang tương tác với player)
      const active = document.activeElement as HTMLElement | null;
      const activeTagName = typeof active?.tagName === "string" ? active.tagName.toLowerCase() : "";
      const isPlayerContainer = Boolean(
        containerRef.current &&
        active &&
        containerRef.current.contains(active)
      );

      // Nếu focus đang ở ngoài player trên các input, form, textarea hoặc thẻ nút danh sách -> nhường quyền TV navigation
      if (!isPlayerContainer && (["input", "textarea", "select"].includes(activeTagName) || (!isFullscreen && (activeTagName === "button" || activeTagName === "a")))) {
        return;
      }

      if (e.code === "Space" || e.key === "Enter") {
        if (activeTagName === "button" || activeTagName === "input" || activeTagName === "a") {
          return;
        }
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSeek(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleSeek(10);
      } else if (e.key === "ArrowUp") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
        }
      } else if (e.key === "ArrowDown") {
        if (isFullscreen) {
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "n" || e.key === "N" || e.key === "PageDown") {
        e.preventDefault();
        handleSwitchServer("next");
      } else if (e.key === "p" || e.key === "P" || e.key === "PageUp") {
        e.preventDefault();
        handleSwitchServer("prev");
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        goToLiveEdge();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        togglePip();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        toggleRail();
      } else if (e.key === "[" || e.key === "-") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      } else if (e.key === "]" || e.key === "=" || e.key === "+") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      } else if (e.key === "Escape") {
        if (isRailVisible) {
          e.preventDefault();
          closeRail();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    containerRef,
    isFullscreen,
    volume,
    isRailVisible,
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePip,
    goToLiveEdge,
    handleVolumeChange,
    handleSwitchServer,
    handleSeek,
    toggleRail,
    closeRail,
  ]);
}

