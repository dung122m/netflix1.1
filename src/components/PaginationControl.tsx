"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, X } from "lucide-react";

interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  pages: (number | string)[];
}

export const PaginationControl: React.FC<PaginationControlProps> = ({
  currentPage,
  totalPages,
  pages,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [targetPageInput, setTargetPageInput] = useState<string>("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Xây dựng URL giữ nguyên 100% search params hiện tại
  const buildPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("page", pageNumber.toString());
    return `?${params.toString()}`;
  };

  // Tự động focus ô nhập khi mở popover
  useEffect(() => {
    if (isJumpOpen) {
      setTargetPageInput(currentPage.toString());
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isJumpOpen, currentPage]);

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    if (!isJumpOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsJumpOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isJumpOpen]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(targetPageInput.trim(), 10);
    if (isNaN(pageNum)) return;

    const validPage = Math.min(Math.max(1, pageNum), totalPages);
    setIsJumpOpen(false);
    router.push(buildPageUrl(validPage));
  };

  return (
    <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-8 sm:mt-12 relative select-none">
      {/* ============================================================ */}
      {/* 1. NÚT « TRƯỚC (Dùng chung cho cả Mobile & Desktop) */}
      {/* ============================================================ */}
      <Link
        href={buildPageUrl(Math.max(1, currentPage - 1))}
        prefetch={true}
        {...(currentPage > 1 ? { "data-tv-pagination": "true" } : {})}
        tabIndex={currentPage <= 1 ? -1 : 0}
        className={`px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl font-semibold transition touch-target min-h-[40px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
          currentPage <= 1
            ? "bg-zinc-900 text-zinc-600 pointer-events-none cursor-not-allowed opacity-50"
            : "bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95"
        }`}
        aria-label="Trang trước"
      >
        « Trước
      </Link>

      {/* ============================================================ */}
      {/* 2. DESKTOP VIEW: Dãy số trang đầy đủ (≥ 640px) */}
      {/* ============================================================ */}
      <div className="hidden sm:flex items-center gap-1.5">
        {pages.map((p, index) => {
          if (p === "...") {
            return (
              <span key={index} className="px-1.5 sm:px-2 text-xs sm:text-sm text-gray-500">
                ...
              </span>
            );
          }
          return (
            <Link
              key={index}
              href={buildPageUrl(p as number)}
              prefetch={true}
              data-tv-pagination="true"
              className={`w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm flex items-center justify-center rounded-lg font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-110 ${
                currentPage === p
                  ? "bg-netflix-red text-white shadow-sm"
                  : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white"
              }`}
            >
              {p}
            </Link>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE VIEW: Nút "2 / 515" bấm mở Popover "Đi tới trang" (< 640px) */}
      {/* ============================================================ */}
      <div className="sm:hidden relative" ref={popoverRef}>
        <button
          type="button"
          data-tv-pagination="true"
          onClick={() => setIsJumpOpen((prev) => !prev)}
          className="px-3.5 py-2 min-h-[40px] text-xs font-bold text-white bg-netflix-red rounded-xl shadow-md active:scale-95 hover:bg-red-700 transition-all flex items-center justify-center gap-1 touch-target border border-red-500/30 outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105"
          aria-label="Chọn nhanh trang"
          title="Chạm để chuyển tới trang bất kỳ"
        >
          <span>{currentPage} / {totalPages}</span>
        </button>

        {/* POPOVER NHẬP SỐ TRANG TRÊN MOBILE */}
        {isJumpOpen && (
          <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-200">
            {/* Header Popover */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Đi tới trang</span>
                <span className="text-[10px] text-gray-400 font-normal">
                  (1 - {totalPages})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIsJumpOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Form Nhập */}
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="number"
                min="1"
                max={totalPages}
                value={targetPageInput}
                onChange={(e) => setTargetPageInput(e.target.value)}
                placeholder={`1 - ${totalPages}`}
                className="w-full bg-zinc-950 text-white font-bold text-center text-sm px-3 py-2 rounded-xl border border-white/15 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
              <button
                type="submit"
                className="flex-none bg-netflix-red hover:bg-red-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-md active:scale-95"
              >
                <span>Đi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. NÚT TIẾP » (Dùng chung cho cả Mobile & Desktop) */}
      {/* ============================================================ */}
      <Link
        href={buildPageUrl(currentPage + 1)}
        prefetch={true}
        {...(currentPage < totalPages ? { "data-tv-pagination": "true" } : {})}
        tabIndex={currentPage >= totalPages ? -1 : 0}
        className={`px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl font-semibold transition touch-target min-h-[40px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${
          currentPage >= totalPages
            ? "bg-zinc-900 text-zinc-600 pointer-events-none cursor-not-allowed opacity-50"
            : "bg-zinc-800 text-white hover:bg-zinc-700 active:scale-95"
        }`}
        aria-label="Trang sau"
      >
        Tiếp »
      </Link>
    </div>
  );
};

export default PaginationControl;
