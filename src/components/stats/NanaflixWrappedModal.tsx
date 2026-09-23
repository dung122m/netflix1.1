"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Film,
  Clock,
  Globe,
  Share2,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Check,
  Flame,
  Award,
} from "lucide-react";
import { NanaflixWrappedData } from "@/services/statsService";
import { toast } from "@/components/Toast";

interface NanaflixWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  wrappedData: NanaflixWrappedData | null;
  userName?: string;
}

export const NanaflixWrappedModal: React.FC<NanaflixWrappedModalProps> = ({
  isOpen,
  onClose,
  wrappedData,
  userName = "Thành viên Nanaflix",
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState(false);

  const totalSlides = 4;

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setCopied(false);
    }
  }, [isOpen]);

  // Keyboard navigation & Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleShare = useCallback(async () => {
    if (!wrappedData) return;

    const shareText = `🎬 Nanaflix Wrapped của ${userName}!\n⏱ ${wrappedData.totalHours} giờ cày phim qua ${wrappedData.totalMovies} bộ phim.\n🔥 Gu số 1: ${wrappedData.topGenre} • 🌏 Quốc gia: ${wrappedData.topCountry}\n👑 Danh hiệu: "${wrappedData.personaTitle}"\nKhám phá tại https://nanaflix.vercel.app`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Nanaflix Wrapped 2026 - ${userName}`,
          text: shareText,
          url: "https://nanaflix.vercel.app/stats",
        });
        toast.success("Đã chia sẻ thành công!");
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          console.warn("Lỗi Web Share:", err);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success("Đã sao chép tổng kết Wrapped vào bộ nhớ tạm!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.info("Không thể sao chép văn bản tự động.");
    }
  }, [wrappedData, userName]);

  if (!isOpen || !wrappedData) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in"
    >
      {/* WRAPPED CARD CONTAINER */}
      <div className="relative w-full max-w-md sm:max-w-lg aspect-[9/16] sm:aspect-[4/5] max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col justify-between bg-gradient-to-br from-zinc-950 via-slate-900 to-zinc-950 p-6 sm:p-8 text-white select-none">
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

        {/* TOP BAR: Story Progress Indicator + Close Button */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-1.5 w-full">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <div
                key={idx}
                className="h-1 flex-1 rounded-full overflow-hidden bg-white/20 cursor-pointer"
                onClick={() => setCurrentSlide(idx)}
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    idx <= currentSlide ? "bg-gradient-to-r from-rose-500 to-amber-400" : "w-0"
                  }`}
                  style={{ width: idx <= currentSlide ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest uppercase bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> NANAFLIX WRAPPED
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
                2026
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SLIDE CONTENT */}
        <div className="relative z-10 flex-1 flex flex-col justify-center my-auto text-center py-4">
          {/* SLIDE 0: TỔNG QUAN GIỜ XEM */}
          {currentSlide === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="inline-flex p-4 rounded-3xl bg-rose-500/20 border border-rose-500/30 text-rose-400 mx-auto shadow-lg shadow-rose-950/50">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Năm nay bạn đã dành
                </p>
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
                  {wrappedData.totalHours} <span className="text-2xl sm:text-3xl text-rose-400">Giờ</span>
                </h2>
                <p className="text-xs text-zinc-400">cùng thế giới điện ảnh Nanaflix</p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-xs mx-auto flex items-center justify-around text-center">
                <div>
                  <p className="text-2xl font-black text-amber-300">{wrappedData.totalMovies}</p>
                  <p className="text-[11px] text-zinc-400">Bộ phim</p>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-black text-emerald-400">{wrappedData.completedCount}</p>
                  <p className="text-[11px] text-zinc-400">Hoàn thành</p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 1: GU THỂ LOẠI & QUỐC GIA #1 */}
          {currentSlide === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="inline-flex p-4 rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto shadow-lg shadow-amber-950/50">
                <Trophy className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Thể loại chiếm lĩnh trái tim bạn
                </p>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-rose-300 to-pink-400 bg-clip-text text-transparent">
                  {wrappedData.topGenre}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Quốc gia #1</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-white truncate">
                    {wrappedData.topCountry}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Film className="w-3.5 h-3.5 text-pink-400" />
                    <span>Loại phim #1</span>
                  </div>
                  <p className="text-base sm:text-lg font-bold text-white truncate">
                    {wrappedData.topType}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: NHỊP ĐIỆU XEM PHIM */}
          {currentSlide === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="inline-flex p-4 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 mx-auto shadow-lg shadow-indigo-950/50">
                <Flame className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                  Khung giờ vàng của bạn
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-snug">
                  {wrappedData.peakTimeSlot}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 max-w-xs mx-auto text-xs text-zinc-300 leading-relaxed">
                {wrappedData.peakTimeKey === "night"
                  ? "🌙 Khi màn đêm buông xuống, không gian tĩnh lặng là lúc trải nghiệm điện ảnh của bạn thăng hoa nhất!"
                  : wrappedData.peakTimeKey === "evening"
                  ? "🍿 Buổi tối sau ngày dài bận rộn là lúc bạn thư giãn trọn vẹn cùng Nanaflix!"
                  : "☀️ Bạn bắt đầu ngày mới đầy năng lượng cùng những tập phim hấp dẫn!"}
              </div>
            </div>
          )}

          {/* SLIDE 3: PERSONA DANH HIỆU */}
          {currentSlide === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-rose-500/30 to-amber-500/30 border border-amber-500/40 text-amber-300 mx-auto shadow-xl shadow-rose-950/60 animate-bounce-subtle">
                <Award className="w-12 h-12 sm:w-14 sm:h-14" />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Danh hiệu điện ảnh của {userName}
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-pink-400">
                  {wrappedData.personaTitle}
                </h2>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 max-w-xs mx-auto text-xs sm:text-sm text-zinc-200 italic leading-relaxed">
                &ldquo;{wrappedData.personaQuote}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR: Navigation + Share CTA */}
        <div className="relative z-10 space-y-3 pt-2">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {currentSlide === totalSlides - 1 ? (
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:opacity-90 active:scale-95 font-black text-xs sm:text-sm text-white shadow-xl shadow-rose-950/50 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-white" />
                    <span>Chia sẻ Wrapped</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
                className="flex-1 py-3 px-5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 font-bold text-xs sm:text-sm text-white border border-white/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setCurrentSlide((prev) => Math.min(totalSlides - 1, prev + 1))}
              disabled={currentSlide === totalSlides - 1}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NanaflixWrappedModal;
