"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  Trash2,
  Play,
  Clock,
} from "lucide-react";
import {
  useMatchReminders,
} from "@/hooks/useMatchReminders";

interface MatchReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMatchId?: (matchId: string) => void;
}

function formatCountdown(timestamp: number): string {
  if (timestamp === Number.MAX_SAFE_INTEGER) return "Chờ cập nhật";
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) {
    if (Math.abs(diff) < 2 * 3600 * 1000) {
      return "🔴 Đang diễn ra";
    }
    return "Đã kết thúc";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `Còn ${days} ngày nữa`;
  }

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function MatchReminderModal({
  isOpen,
  onClose,
  onSelectMatchId,
}: MatchReminderModalProps) {
  const router = useRouter();
  const { reminders, removeReminder, clearAllReminders } =
    useMatchReminders();

  const [, setTick] = useState(0);

  // Cập nhật đếm ngược mỗi giây
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Đóng bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-zinc-950 rounded-3xl border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Lịch Nhắc Trận Đấu</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                  {reminders.length}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Thông báo tự động trước 10 phút & khi trận bắt đầu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {reminders.length > 0 && (
              <button
                type="button"
                onClick={clearAllReminders}
                title="Xóa tất cả lịch nhắc"
                className="text-[11px] text-gray-400 hover:text-rose-400 transition px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                Xóa hết
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DANH SÁCH CÁC TRẬN ĐÃ ĐẶT NHẮC */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
          {reminders.length > 0 ? (
            reminders.map((item) => {
              const countdown = formatCountdown(item.timestamp);
              const isLive = countdown.includes("Đang diễn ra");

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3.5 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                      {item.tournament && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          🏆 {item.tournament}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                        ⏰ {item.time || "Trực tiếp"}
                      </span>
                      {item.group && (
                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                          {item.group}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-white truncate">
                      {item.team1} <span className="text-rose-400 font-bold text-xs">vs</span> {item.team2}
                    </h4>

                    {/* ĐẾM NGƯỢC THỜI GIAN */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span
                        className={`font-mono font-bold ${
                          isLive
                            ? "text-rose-400 animate-pulse"
                            : "text-amber-300"
                        }`}
                      >
                        {countdown}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onSelectMatchId) {
                          onSelectMatchId(item.id);
                        } else {
                          router.push(
                            `/live?match=${encodeURIComponent(item.id)}`
                          );
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-md shadow-red-950/40 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Xem ngay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeReminder(item.id)}
                      title="Hủy nhắc trận này"
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-white/5 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                <Bell className="w-6 h-6 text-gray-500" />
              </div>
              <h4 className="text-sm font-bold text-gray-200">
                Chưa có trận đấu nào được hẹn giờ
              </h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                Hãy bấm vào biểu tượng 🔔 trên các trận đấu sắp diễn ra để nhận thông báo trước giờ bóng lăn!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MatchReminderModal;
