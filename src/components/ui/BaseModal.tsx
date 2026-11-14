"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useBodyScrollLock } from "@/lib/scrollLock";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  size?: ModalSize;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  ariaLabel?: string;
  footer?: React.ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  full: "max-w-[95vw] md:max-w-6xl",
};

export function BaseModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  size = "md",
  className = "",
  bodyClassName = "",
  headerClassName = "",
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  ariaLabel,
  footer,
}: BaseModalProps) {
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Khóa cuộn màn hình chống layout-shift
  useBodyScrollLock(isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : ariaLabel || "Hộp thoại"}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
    >
      {/* THẺ MODAL CHUẨN ĐIỆN ẢNH (LAYERED DARK SURFACE - BORDER IS EXCEPTION) */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${SIZE_CLASSES[size]} rounded-2xl sm:rounded-3xl bg-zinc-950/98 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 select-text ${className}`}
      >
        {/* NÚT ĐÓNG GÓC PHẢI */}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-90"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        )}

        {/* HEADER MODAL */}
        {(title || icon) && (
          <div
            className={`px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-white/[0.06] flex items-start gap-3 sm:gap-3.5 pr-14 ${headerClassName}`}
          >
            {icon && (
              <div className="shrink-0 mt-0.5 text-netflix-red">{icon}</div>
            )}
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-snug truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* NỘI DUNG CHÍNH (TỰ ĐỘNG CUỘN KHI DÀI) */}
        <div
          className={`flex-1 overflow-y-auto px-5 sm:px-7 py-4 sm:py-6 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent] ${bodyClassName}`}
        >
          {children}
        </div>

        {/* FOOTER (NẾU CÓ) */}
        {footer && (
          <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-t border-white/[0.06] bg-zinc-900/40 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default BaseModal;
