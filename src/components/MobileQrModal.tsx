"use client";

import React, { useState } from "react";
import { Smartphone, X, Copy, Check, QrCode } from "lucide-react";

interface MobileQrModalProps {
  title: string;
}

export function MobileQrModal({ title }: MobileQrModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    currentUrl
  )}&bgcolor=18-18-1b&color=ffffff&margin=12`;

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Quét mã QR xem trên điện thoại"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-zinc-900/80 px-2.5 py-1 text-xs md:text-sm font-medium text-gray-200 hover:bg-white/10 hover:text-white transition-all cursor-pointer active:scale-95"
      >
        <Smartphone className="h-3.5 w-3.5 text-sky-400" />
        <span className="hidden sm:inline">Xem trên điện thoại</span>
        <span className="sm:hidden">QR</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-900 p-6 shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mx-auto w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">
              Xem trên điện thoại
            </h3>
            <p className="text-xs text-gray-400 mb-4 px-2">
              Mở ứng dụng Máy ảnh (Camera) hoặc Zalo trên điện thoại quét mã dưới đây để tiếp tục xem:
            </p>

            <div className="mx-auto w-[200px] h-[200px] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 p-2 shadow-inner flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt={`Mã QR xem phim ${title}`}
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <div className="mt-3 text-[11px] text-gray-400 font-medium truncate max-w-full px-2">
              {title}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition border border-white/10"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Đã chép link</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-gray-400" />
                    <span>Sao chép link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileQrModal;
