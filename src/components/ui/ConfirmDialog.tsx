"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Trash2, AlertTriangle, HelpCircle, X } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "info";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface DialogState extends ConfirmOptions {
  isOpen: boolean;
  resolve?: (confirmed: boolean) => void;
}

const CONFIRM_EVENT_NAME = "nanaflix-show-confirm-dialog";

type ConfirmDetail = ConfirmOptions & { resolve: (confirmed: boolean) => void };
let globalConfirmHandler: ((detail: ConfirmDetail) => void) | null = null;
const pendingConfirmQueue: ConfirmDetail[] = [];

/**
 * Hàm gọi hộp thoại xác nhận tuỳ biến thay thế hoàn toàn window.confirm()
 * Trả về Promise<boolean>: true nếu người dùng bấm Đồng ý / Xóa, false nếu Hủy
 * 
 * Ví dụ sử dụng:
 * const ok = await showConfirmDialog({
 *   title: "Xóa bộ sưu tập",
 *   message: "Bạn có chắc chắn muốn xóa bộ sưu tập này không?",
 *   confirmText: "Xóa vĩnh viễn",
 *   variant: "danger",
 * });
 * if (!ok) return;
 */
export function showConfirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  const opts: ConfirmOptions =
    typeof options === "string" ? { message: options } : options;

  return new Promise<boolean>((resolve) => {
    const detail: ConfirmDetail = { ...opts, resolve };
    if (globalConfirmHandler) {
      globalConfirmHandler(detail);
    } else {
      pendingConfirmQueue.push(detail);
    }
    window.dispatchEvent(
      new CustomEvent(CONFIRM_EVENT_NAME, {
        detail,
      })
    );
  });
}

/**
 * Component Modal Xác nhận toàn cục (Mount tại ClientModals)
 */
export const GlobalConfirmDialog: React.FC = () => {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    message: "",
  });

  const resolveRef = useRef<((confirmed: boolean) => void) | undefined>(undefined);

  const handleClose = useCallback((confirmed: boolean) => {
    if (resolveRef.current) {
      const res = resolveRef.current;
      resolveRef.current = undefined;
      res(confirmed);
    }
    setDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    const handleDetail = (detail: ConfirmDetail) => {
      resolveRef.current = detail.resolve;
      setDialog({
        isOpen: true,
        title: detail.title,
        message: detail.message,
        confirmText: detail.confirmText || "Xác nhận",
        cancelText: detail.cancelText || "Hủy bỏ",
        variant: detail.variant || "danger",
      });
    };

    globalConfirmHandler = handleDetail;

    while (pendingConfirmQueue.length > 0) {
      const queued = pendingConfirmQueue.shift();
      if (queued) handleDetail(queued);
    }

    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ConfirmDetail>;
      if (customEvent.detail) {
        handleDetail(customEvent.detail);
      }
    };

    window.addEventListener(CONFIRM_EVENT_NAME, handleEvent);
    return () => {
      globalConfirmHandler = null;
      window.removeEventListener(CONFIRM_EVENT_NAME, handleEvent);
    };
  }, []);

  useEffect(() => {
    if (!dialog.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog.isOpen, handleClose]);

  if (!dialog.isOpen) return null;

  const variant = dialog.variant || "danger";

  return (
    <div
      onClick={() => handleClose(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm sm:max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-5 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.95)] text-white transform-gpu will-change-[transform,opacity] animate-in zoom-in-95 duration-150 overflow-hidden"
      >
        {/* Glow hiệu ứng màu nền tinh tế */}
        {variant === "danger" && (
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-rose-600/25 rounded-full blur-3xl pointer-events-none" />
        )}
        {variant === "warning" && (
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
        )}
        {variant === "info" && (
          <div className="absolute -top-20 -left-20 w-44 h-44 bg-sky-500/25 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={() => handleClose(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon & Tiêu đề */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              variant === "danger"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/35"
                : variant === "warning"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/35"
                : "bg-sky-500/20 text-sky-400 border border-sky-500/35"
            }`}
          >
            {variant === "danger" ? (
              <Trash2 className="w-5 h-5" />
            ) : variant === "warning" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <HelpCircle className="w-5 h-5" />
            )}
          </div>
          <div className="pt-0.5">
            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
              {dialog.title || (variant === "danger" ? "Xác nhận xóa" : "Xác nhận hành động")}
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 mt-1.5 leading-relaxed break-words">
              {dialog.message}
            </p>
          </div>
        </div>

        {/* Nút tác vụ chân modal */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
          >
            {dialog.cancelText || "Hủy bỏ"}
          </button>
          <button
            type="button"
            onClick={() => handleClose(true)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition active:scale-95 cursor-pointer ${
              variant === "danger"
                ? "bg-netflix-red hover:bg-red-700 text-white shadow-red-950/50"
                : variant === "warning"
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-950/50"
                : "bg-white hover:bg-gray-200 text-black shadow-white/10"
            }`}
          >
            {dialog.confirmText || (variant === "danger" ? "Xóa" : "Đồng ý")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalConfirmDialog;
