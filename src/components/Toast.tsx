"use client";

import React, { useEffect, useCallback, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// ─── Singleton event bus (không cần Context, nhẹ hơn) ────────────────────────
type ToastListener = (toast: ToastItem) => void;
type DismissListener = (id: string) => void;

const addListeners = new Set<ToastListener>();
const removeListeners = new Set<DismissListener>();

let counter = 0;

export const toast = {
  success: (message: string) => fire(message, "success"),
  error: (message: string) => fire(message, "error"),
  info: (message: string) => fire(message, "info"),
};

function fire(message: string, type: ToastType) {
  const id = `t-${++counter}`;
  const item: ToastItem = { id, message, type };
  addListeners.forEach((fn) => fn(item));
  // Auto-dismiss sau 3.5s
  setTimeout(() => {
    removeListeners.forEach((fn) => fn(id));
  }, 3500);
  return id;
}

// ─── Single Toast Item ────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />,
  error: <XCircle className="w-4 h-4 text-rose-400 flex-none" />,
  info: <Info className="w-4 h-4 text-sky-400 flex-none" />,
};

const COLORS: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-950/60",
  error: "border-rose-500/30 bg-rose-950/60",
  info: "border-sky-500/30 bg-sky-950/60",
};

function ToastBubble({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-2.5 pl-3.5 pr-2.5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl
        text-sm text-white font-medium max-w-[320px] w-full
        transition-all duration-300 ease-out
        ${COLORS[item.type]}
        ${visible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}
      `}
    >
      {ICONS[item.type]}
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer flex-none"
        aria-label="Đóng thông báo"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Toast Container (mount once in layout) ───────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const handleAdd = useCallback((item: ToastItem) => {
    setToasts((prev) => {
      // Max 4 toasts đồng thời
      const next = [item, ...prev].slice(0, 4);
      return next;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    addListeners.add(handleAdd);
    removeListeners.add(handleRemove);
    return () => {
      addListeners.delete(handleAdd);
      removeListeners.delete(handleRemove);
    };
  }, [handleAdd, handleRemove]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Thông báo"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100000] flex flex-col-reverse gap-2 items-center pointer-events-none w-full px-4 sm:bottom-8 sm:left-auto sm:right-6 sm:translate-x-0 sm:items-end sm:px-0 sm:max-w-sm"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto w-full sm:w-auto">
          <ToastBubble item={item} onDismiss={handleRemove} />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
