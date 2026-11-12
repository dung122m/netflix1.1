"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Sliders,
  Scaling,
  Tv,
  Gauge,
  Repeat,
  FastForward,
  Subtitles,
  X,
} from "lucide-react";

export type VideoFit = "contain" | "cover" | "fill" | "zoom";

export interface QualityLevel {
  id: number;
  label: string;
  height: number;
}

export const FIT_OPTIONS: Array<{ id: VideoFit; label: string }> = [
  { id: "contain", label: "Vừa khung (16:9)" },
  { id: "cover", label: "Lấp đầy (Cover)" },
  { id: "fill", label: "Kéo giãn (Fill)" },
  { id: "zoom", label: "Phóng to (Zoom)" },
];

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export type SettingsView = "main" | "speed" | "quality" | "fit" | "server";

interface PlayerSettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  playbackSpeed: number;
  qualityLevels: QualityLevel[];
  currentQualityIndex: number;
  currentQualityLabel: string;
  videoFit: VideoFit;
  isNativeVideo: boolean;
  embedSrc?: string;
  loopVideo: boolean;
  onToggleLoop: () => void;
  onSpeedChange: (speed: number) => void;
  onQualityChange: (levelIndex: number) => void;
  onVideoFitChange?: (fit: VideoFit) => void;
  onUseIframeFallback: () => void;
  autoNextEpisode: boolean;
  onToggleAutoNextEpisode?: () => void;
  autoSubtitle: boolean;
  onToggleAutoSubtitle?: () => void;
}

function SettingsToggleRow({
  isMobileLayout,
  icon,
  label,
  checked,
  onClick,
}: {
  isMobileLayout: boolean;
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${
        isMobileLayout ? "px-4 py-3 text-sm rounded-xl" : "px-3.5 py-2.5 text-xs sm:text-sm"
      }`}
    >
      <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <div
        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
          checked ? "bg-netflix-red justify-end" : "bg-white/20 justify-start"
        }`}
      >
        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
      </div>
    </button>
  );
}

export function PlayerSettingsMenu(props: PlayerSettingsMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  // Nhận diện màn hình di động/cảm ứng để chuyển sang Bottom Sheet thay vì popup bị tràn
  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobileScreen(
        typeof window !== "undefined" &&
          (window.innerWidth < 640 ||
            (Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches) && window.innerWidth < 1024))
      );
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Nhận diện mục tiêu render Portal (document.fullscreenElement nếu đang toàn màn hình hoặc document.body)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const resolveTarget = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = document as any;
      const fsElem = (doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement) as HTMLElement | null;
      setPortalTarget(fsElem || document.body);
    };
    resolveTarget();
    document.addEventListener("fullscreenchange", resolveTarget);
    document.addEventListener("webkitfullscreenchange", resolveTarget);
    return () => {
      document.removeEventListener("fullscreenchange", resolveTarget);
      document.removeEventListener("webkitfullscreenchange", resolveTarget);
    };
  }, []);

  if (!props.isOpen) return null;

  return (
    <PlayerSettingsMenuInner
      {...props}
      mounted={mounted}
      isMobileScreen={isMobileScreen}
      portalTarget={portalTarget}
    />
  );
}

interface PlayerSettingsMenuInnerProps extends PlayerSettingsMenuProps {
  mounted: boolean;
  isMobileScreen: boolean;
  portalTarget: HTMLElement | null;
}

function PlayerSettingsMenuInner({
  onClose,
  anchorRef,
  playbackSpeed,
  qualityLevels,
  currentQualityIndex,
  currentQualityLabel,
  videoFit,
  isNativeVideo,
  embedSrc,
  loopVideo,
  onToggleLoop,
  onSpeedChange,
  onQualityChange,
  onVideoFitChange,
  onUseIframeFallback,
  autoNextEpisode,
  onToggleAutoNextEpisode,
  autoSubtitle,
  onToggleAutoSubtitle,
  mounted,
  isMobileScreen,
  portalTarget,
}: PlayerSettingsMenuInnerProps) {
  const [settingsView, setSettingsView] = useState<SettingsView>("main");
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const closeAndReset = () => {
    setSettingsView("main");
    onClose();
  };

  // Xử lý đóng menu khi click ra ngoài hoặc nhấn Esc / Backspace
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMobileScreen) return;
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        setSettingsView("main");
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        if (settingsView !== "main") {
          setSettingsView("main");
        } else {
          onClose();
          anchorRef.current?.focus();
        }
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape, { capture: true });
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape, { capture: true });
    };
  }, [settingsView, isMobileScreen, anchorRef, onClose]);

  const currentFitLabel =
    FIT_OPTIONS.find((f) => f.id === videoFit)?.label || "Vừa khung (16:9)";

  const renderSettingsInner = (isMobileLayout: boolean) => {
    const itemBtnCls = isMobileLayout
      ? "px-4 py-3 text-sm rounded-xl"
      : "px-3.5 py-2.5 text-xs sm:text-sm";
    const subItemCls = isMobileLayout
      ? "px-4 py-3 text-sm rounded-xl"
      : "px-4 py-2 text-xs sm:text-[13px]";
    const iconCls = `${isMobileLayout ? "w-5 h-5" : "w-4 h-4"} text-zinc-400 group-hover:text-white`;

    return (
      <>
        {settingsView === "main" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <div className="px-4 py-2 border-b border-white/[0.08] flex items-center justify-between text-xs font-semibold text-zinc-400">
                <span>Cài đặt trình phát</span>
                <span className="text-[11px] font-medium bg-white/10 px-1.5 py-0.5 rounded text-zinc-300">
                  Nanaflix
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSettingsView("speed")}
              className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${itemBtnCls}`}
            >
              <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                <Gauge className={iconCls} />
                <span className="font-medium">Tốc độ phát</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                <span>{playbackSpeed === 1 ? "Chuẩn" : `${playbackSpeed}x`}</span>
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              </div>
            </button>

            {qualityLevels.length > 0 && (
              <button
                type="button"
                onClick={() => setSettingsView("quality")}
                className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${itemBtnCls}`}
              >
                <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                  <Sliders className={iconCls} />
                  <span className="font-medium">Chất lượng</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                  <span>{currentQualityLabel}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            )}

            {isNativeVideo && (
              <button
                type="button"
                onClick={() => setSettingsView("fit")}
                className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${itemBtnCls}`}
              >
                <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                  <Scaling className={iconCls} />
                  <span className="font-medium">Tỉ lệ màn hình</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                  <span className="truncate max-w-[120px]">{currentFitLabel.split(" ")[0]}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            )}

            {embedSrc && (
              <button
                type="button"
                onClick={() => setSettingsView("server")}
                className={`flex items-center justify-between hover:bg-white/10 transition cursor-pointer text-left group ${itemBtnCls}`}
              >
                <div className="flex items-center gap-3 text-zinc-200 group-hover:text-white">
                  <Tv className={iconCls} />
                  <span className="font-medium">Nguồn phát</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm">
                  <span>Chính (HLS)</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            )}

            <SettingsToggleRow
              isMobileLayout={isMobileLayout}
              icon={<Repeat className={iconCls} />}
              label="Lặp lại video"
              checked={loopVideo}
              onClick={onToggleLoop}
            />

            {onToggleAutoNextEpisode && (
              <SettingsToggleRow
                isMobileLayout={isMobileLayout}
                icon={<FastForward className={iconCls} />}
                label="Tự động chuyển tập"
                checked={autoNextEpisode}
                onClick={onToggleAutoNextEpisode}
              />
            )}

            {onToggleAutoSubtitle && (
              <SettingsToggleRow
                isMobileLayout={isMobileLayout}
                icon={<Subtitles className={iconCls} />}
                label="Bật phụ đề mặc định"
                checked={autoSubtitle}
                onClick={onToggleAutoSubtitle}
              />
            )}
          </div>
        )}

        {settingsView === "speed" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Tốc độ phát</span>
              </button>
            )}
            <div className={`${isMobileLayout ? "max-h-[60dvh]" : "max-h-56"} overflow-y-auto py-1`}>
              {SPEED_OPTIONS.map((spd) => {
                const isSelected = playbackSpeed === spd;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      onSpeedChange(spd);
                      closeAndReset();
                    }}
                    className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${subItemCls} ${
                      isSelected ? "text-netflix-red font-bold" : "text-zinc-200"
                    }`}
                  >
                    <span>{spd === 1 ? "Chuẩn (1x)" : `${spd}x`}</span>
                    {isSelected && <Check className="w-4 h-4 text-netflix-red" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {settingsView === "quality" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Chất lượng video</span>
              </button>
            )}
            <div className={`${isMobileLayout ? "max-h-[60dvh]" : "max-h-56"} overflow-y-auto py-1`}>
              <button
                type="button"
                onClick={() => {
                  onQualityChange(-1);
                  closeAndReset();
                }}
                className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${subItemCls} ${
                  currentQualityIndex === -1 ? "text-netflix-red font-bold" : "text-zinc-200"
                }`}
              >
                <div className="flex flex-col text-left">
                  <span>Tự động</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Tối ưu theo đường truyền</span>
                </div>
                {currentQualityIndex === -1 && <Check className="w-4 h-4 text-netflix-red" />}
              </button>
              {qualityLevels.map((lvl) => {
                const isSelected = currentQualityIndex === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      onQualityChange(lvl.id);
                      closeAndReset();
                    }}
                    className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${subItemCls} ${
                      isSelected ? "text-netflix-red font-bold" : "text-zinc-200"
                    }`}
                  >
                    <span>{lvl.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-netflix-red" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {settingsView === "fit" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Tỉ lệ màn hình</span>
              </button>
            )}
            <div className="py-1">
              {FIT_OPTIONS.map((opt) => {
                const isSelected = videoFit === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onVideoFitChange?.(opt.id);
                      closeAndReset();
                    }}
                    className={`w-full flex items-center justify-between hover:bg-white/10 transition cursor-pointer ${subItemCls} ${
                      isSelected ? "text-netflix-red font-bold" : "text-zinc-200"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-netflix-red" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {settingsView === "server" && (
          <div className="py-1 flex flex-col">
            {!isMobileLayout && (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.08] text-xs font-semibold text-white hover:bg-white/10 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Nguồn phát / Máy chủ</span>
              </button>
            )}
            <div className="py-1">
              <button
                type="button"
                onClick={closeAndReset}
                className={`w-full flex items-center justify-between text-netflix-red font-bold hover:bg-white/10 transition cursor-pointer ${subItemCls}`}
              >
                <div className="flex flex-col text-left">
                  <span>Nguồn HLS (Chính)</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Tốc độ cao, mượt mà</span>
                </div>
                <Check className="w-4 h-4 text-netflix-red" />
              </button>
              {embedSrc && (
                <button
                  type="button"
                  onClick={() => {
                    closeAndReset();
                    onUseIframeFallback();
                  }}
                  className={`w-full flex items-center justify-between text-zinc-200 hover:bg-white/10 transition cursor-pointer ${subItemCls}`}
                >
                  <div className="flex flex-col text-left">
                    <span>Nguồn dự phòng (Embed)</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Dùng khi server chính gặp sự cố</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  if (!isMobileScreen) {
    return (
      <div
        ref={settingsPanelRef}
        role="dialog"
        aria-label="Cài đặt trình phát"
        className="pointer-events-auto absolute bottom-full right-0 mb-3 w-[270px] sm:w-[290px] max-h-[min(380px,calc(100dvh-100px))] bg-zinc-950/98 rounded-2xl shadow-2xl backdrop-blur-2xl text-white overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-150"
      >
        {renderSettingsInner(false)}
      </div>
    );
  }

  if (!mounted || !portalTarget) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cài đặt trình phát"
      className="fixed inset-0 z-[9999999] pointer-events-auto flex flex-col justify-end select-none"
      onClick={closeAndReset}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200" />
      <div
        ref={settingsPanelRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg mx-auto bg-zinc-950/98 border-t border-white/[0.08] rounded-t-3xl shadow-[0_-15px_45px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-white p-4 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] max-h-[82dvh] overflow-y-auto animate-in slide-in-from-bottom duration-250 transform-gpu will-change-transform"
      >
        <div className="w-10 h-1 bg-white/25 rounded-full mx-auto mb-3" />
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            {settingsView !== "main" ? (
              <button
                type="button"
                onClick={() => setSettingsView("main")}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-200 hover:text-white p-1 -ml-1 rounded-lg active:bg-white/10"
              >
                <ChevronLeft className="w-5 h-5 text-amber-400" />
                <span>
                  {settingsView === "speed"
                    ? "Tốc độ phát"
                    : settingsView === "quality"
                      ? "Chất lượng video"
                      : settingsView === "fit"
                        ? "Tỉ lệ màn hình"
                        : "Nguồn phát"}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Cài đặt trình phát</span>
                <span className="text-[11px] font-medium bg-white/[0.08] px-2 py-0.5 rounded-md text-zinc-300">
                  Nanaflix
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={closeAndReset}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition active:scale-90"
            aria-label="Đóng cài đặt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {renderSettingsInner(true)}
      </div>
    </div>,
    portalTarget
  );
}
