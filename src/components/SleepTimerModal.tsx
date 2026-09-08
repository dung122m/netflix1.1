"use client";

import React, { useState, useEffect } from "react";
import { Timer, X, Moon, Play } from "lucide-react";

interface SleepTimerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onTimerExpired?: () => void;
  customTrigger?: (openModal: () => void, remainingText: string | null) => React.ReactNode;
}

const TIMER_OPTIONS = [
  { label: "15 phút", minutes: 15 },
  { label: "30 phút", minutes: 30 },
  { label: "45 phút", minutes: 45 },
  { label: "60 phút (1 giờ)", minutes: 60 },
  { label: "90 phút", minutes: 90 },
  { label: "120 phút (2 giờ)", minutes: 120 },
];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  onTimerExpired,
  customTrigger,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };
  const handleOpen = () => {
    setInternalIsOpen(true);
  };
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Khôi phục timer từ sessionStorage nếu có
  useEffect(() => {
    try {
      const storedEndTime = sessionStorage.getItem("nanaflix_sleep_timer_end");
      if (storedEndTime) {
        const diff = Math.floor((parseInt(storedEndTime, 10) - Date.now()) / 1000);
        if (diff > 0) {
          setRemainingSeconds(diff);
        } else {
          sessionStorage.removeItem("nanaflix_sleep_timer_end");
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Đếm ngược từng giây
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          sessionStorage.removeItem("nanaflix_sleep_timer_end");
          setIsExpired(true);
          if (onTimerExpired) onTimerExpired();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, onTimerExpired]);

  const setTimer = (minutes: number) => {
    const totalSecs = minutes * 60;
    const endTime = Date.now() + totalSecs * 1000;
    try {
      sessionStorage.setItem("nanaflix_sleep_timer_end", endTime.toString());
    } catch {
      // Ignore
    }
    setRemainingSeconds(totalSecs);
    setIsExpired(false);
    handleClose();
  };

  const cancelTimer = () => {
    try {
      sessionStorage.removeItem("nanaflix_sleep_timer_end");
    } catch {
      // Ignore
    }
    setRemainingSeconds(null);
    setIsExpired(false);
  };

  // Format mm:ss hoặc hh:mm:ss
  const formatRemaining = (seconds: number | null): string | null => {
    if (seconds === null || seconds <= 0) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const remainingText = formatRemaining(remainingSeconds);

  return (
    <>
      {customTrigger ? (
        customTrigger(handleOpen, remainingText)
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          title={remainingText ? `Hẹn giờ tắt: còn ${remainingText}` : "Hẹn giờ tắt phim khi ngủ"}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs md:text-sm font-semibold transition-all cursor-pointer active:scale-95 ${
            remainingText
              ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-md animate-pulse"
              : "border-white/20 bg-zinc-900/80 text-gray-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Moon className={`h-3.5 w-3.5 ${remainingText ? "text-amber-400" : "text-gray-400"}`} />
          <span>{remainingText ? `⏳ ${remainingText}` : "Hẹn giờ tắt"}</span>
        </button>
      )}

      {/* POPUP CHỌN THỜI GIAN HẸN GIỜ */}
      {isOpen && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-white/15 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Timer className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Hẹn Giờ Tắt Phim</h3>
                <p className="text-xs text-gray-400">
                  Tự động dừng phát khi bạn ngủ quên
                </p>
              </div>
            </div>

            {/* Trạng thái đang đếm ngược nếu có */}
            {remainingText && (
              <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="text-xs text-amber-200 font-semibold">
                    Đang đếm ngược: <strong className="font-mono text-sm text-amber-300">{remainingText}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelTimer}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold hover:underline cursor-pointer"
                >
                  Hủy hẹn giờ
                </button>
              </div>
            )}

            {/* Danh sách mốc thời gian */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.minutes}
                  type="button"
                  onClick={() => setTimer(opt.minutes)}
                  className="flex items-center justify-center p-3 rounded-2xl bg-zinc-900 border border-white/10 hover:border-amber-500/50 hover:bg-zinc-850 text-xs font-bold text-gray-200 hover:text-white transition cursor-pointer active:scale-95 shadow-sm"
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/10 pt-3">
              <span>💡 Thích hợp xem phim đêm trên giường</span>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MÀN HÌNH BÁO ĐÃ HẾT GIỜ (SLEEP SCREEN) */}
      {isExpired && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-6 text-center animate-in fade-in duration-500"
        >
          <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-4 animate-bounce">
            <Moon className="w-12 h-12" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Đã Tự Động Tắt Theo Hẹn Giờ 🌙
          </h2>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            Hệ thống đã dừng phát video để bạn có một giấc ngủ ngon và tiết kiệm dung lượng pin thiết bị.
          </p>
          <button
            type="button"
            onClick={() => {
              setIsExpired(false);
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-extrabold text-sm transition shadow-lg active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Tiếp Tục Xem Phim</span>
          </button>
        </div>
      )}
    </>
  );
};

export default SleepTimerModal;
