"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Trash2, AlertTriangle, HelpCircle } from "lucide-react";
import { BaseModal } from "./BaseModal";

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
      if (e.key === "Enter") {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dialog.isOpen, handleClose]);

  if (!dialog.isOpen) return null;

  const variant = dialog.variant || "danger";
  const iconNode =
    variant === "danger" ? (
      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg">
        <Trash2 className="w-5 h-5" />
      </div>
    ) : variant === "warning" ? (
      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg">
        <AlertTriangle className="w-5 h-5" />
      </div>
    ) : (
      <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center shadow-lg">
        <HelpCircle className="w-5 h-5" />
      </div>
    );

  return (
    <BaseModal
      isOpen={dialog.isOpen}
      onClose={() => handleClose(false)}
      size="md"
      title={dialog.title || (variant === "danger" ? "Xác nhận xóa" : "Xác nhận hành động")}
      icon={iconNode}
      bodyClassName="p-4 sm:p-6"
      footer={
        <div className="w-full flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleClose(false)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer"
          >
            {dialog.cancelText || "Hủy bỏ"}
          </button>
          <button
            type="button"
            onClick={() => handleClose(true)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition active:scale-95 cursor-pointer ${
              variant === "danger"
                ? "bg-netflix-red hover:bg-red-700 text-white shadow-black/50"
                : variant === "warning"
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-black/50"
                : "bg-white hover:bg-zinc-200 text-black shadow-black/50"
            }`}
          >
            {dialog.confirmText || (variant === "danger" ? "Xóa" : "Đồng ý")}
          </button>
        </div>
      }
    >
      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed break-words">
        {dialog.message}
      </p>
    </BaseModal>
  );
};

export default GlobalConfirmDialog;
