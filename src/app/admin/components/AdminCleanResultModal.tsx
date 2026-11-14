"use client";

import React from "react";
import { ShieldAlert } from "lucide-react";
import { AutoCleanResult } from "@/services/commentService";
import { BaseModal } from "@/components/ui/BaseModal";

interface AdminCleanResultModalProps {
  cleanResult: AutoCleanResult | null;
  onClose: () => void;
}

export const AdminCleanResultModal: React.FC<AdminCleanResultModalProps> = React.memo(
  function AdminCleanResultModal({ cleanResult, onClose }) {
    if (!cleanResult) return null;

    return (
      <BaseModal
        isOpen={Boolean(cleanResult)}
        onClose={onClose}
        size="2xl"
        title="Báo Cáo Tự Động Quét & Xóa Bình Luận Rác"
        subtitle={
          <span>
            Đã quét <strong className="text-white">{cleanResult.scannedCount}</strong> bình luận • Đã xóa sạch{" "}
            <strong className="text-red-400">{cleanResult.deletedCount}</strong> vi phạm
          </span>
        }
        icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
        bodyClassName="p-4 sm:p-6 space-y-3 max-h-[70vh] overflow-y-auto"
        footer={
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer"
          >
            Đóng báo cáo
          </button>
        }
      >
        <p className="text-xs text-zinc-400">
          Danh sách các bình luận chứa từ ngữ vô văn hóa, tục tĩu hoặc hành vi spam đã được hệ thống tự động xóa vĩnh viễn:
        </p>

        <div className="space-y-2.5">
          {cleanResult.deletedItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3.5 rounded-2xl bg-red-950/20 text-xs space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{item.userName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-semibold">
                    {item.reason}
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-sans tabular-nums">
                  Phim: {item.movieSlug}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/50 text-zinc-200 font-sans">
                &ldquo;{item.content}&rdquo;
              </div>
            </div>
          ))}

          {cleanResult.deletedItems.length === 0 && (
            <div className="py-10 text-center text-zinc-400 text-xs">
              Không phát hiện bình luận vi phạm nào trong đợt quét này.
            </div>
          )}
        </div>
      </BaseModal>
    );
  }
);

export default AdminCleanResultModal;
