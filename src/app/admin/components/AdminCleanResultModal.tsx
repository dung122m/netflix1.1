"use client";

import React from "react";
import { ShieldAlert, X } from "lucide-react";
import { AutoCleanResult } from "@/services/commentService";

interface AdminCleanResultModalProps {
  cleanResult: AutoCleanResult | null;
  onClose: () => void;
}

export const AdminCleanResultModal: React.FC<AdminCleanResultModalProps> = React.memo(
  function AdminCleanResultModal({ cleanResult, onClose }) {
    if (!cleanResult) return null;

    return (
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="max-w-2xl w-full bg-zinc-950 border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Báo Cáo Tự Động Quét & Xóa Bình Luận Rác
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Đã quét <strong className="text-white">{cleanResult.scannedCount}</strong> bình luận • Đã xóa sạch <strong className="text-red-400">{cleanResult.deletedCount}</strong> vi phạm
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            <p className="text-xs text-gray-400">
              Danh sách các bình luận chứa từ ngữ vô văn hóa, tục tĩu hoặc hành vi spam đã được hệ thống tự động xóa vĩnh viễn:
            </p>

            <div className="space-y-2.5">
              {cleanResult.deletedItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-2xl bg-red-950/20 border border-red-500/20 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.userName}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-500/20 text-red-300 font-semibold border border-red-500/30">
                        {item.reason}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Phim: {item.movieSlug}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-gray-200 font-sans">
                    &ldquo;{item.content}&rdquo;
                  </div>

                  {item.violations && item.violations.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-red-300 font-medium">Từ khóa phát hiện:</span>
                      {item.violations.map((kw, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.2 rounded bg-red-900/60 border border-red-500/30 text-red-200 text-[10px] font-mono"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-red-950/40"
            >
              Xác Nhận & Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }
);
