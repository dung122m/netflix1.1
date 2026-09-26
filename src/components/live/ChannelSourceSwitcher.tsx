"use client";

import React, { useCallback, KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Tv, Mic } from "lucide-react";

export interface ChannelSourceSwitcherProps {
  /**
   * Chế độ hoạt động: "channel" cho Live TV hoặc "source" cho Live Football
   */
  type: "channel" | "source";
  /**
   * Tên kênh hoặc tên nguồn hiện tại (ví dụ: "VTV3 HD", "Server 1 - BLV Giàng A Phò")
   */
  currentName: string;
  /**
   * Vị trí index hiện tại (0-indexed)
   */
  currentIndex: number;
  /**
   * Tổng số kênh / nguồn khả dụng
   */
  totalCount: number;
  /**
   * Callback khi bấm chuyển kênh/nguồn trước đó
   */
  onPrevious: () => void;
  /**
   * Callback khi bấm chuyển kênh/nguồn kế tiếp
   */
  onNext: () => void;
  /**
   * Callback khi bấm vào vùng giữa để mở/đóng danh sách đầy đủ
   */
  onOpenList?: () => void;
  /**
   * Trạng thái danh sách đang mở hay đóng
   */
  isListOpen?: boolean;
  /**
   * Cho phép xoay vòng (loop) danh sách khi tới phần tử đầu/cuối
   * Mặc định: true
   */
  canLoop?: boolean;
  /**
   * Disabled toàn bộ control
   */
  disabled?: boolean;
  /**
   * Class name tùy chỉnh thêm
   */
  className?: string;
}

export const ChannelSourceSwitcher: React.FC<ChannelSourceSwitcherProps> = ({
  type,
  currentName,
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  onOpenList,
  isListOpen = false,
  canLoop = true,
  disabled = false,
  className = "",
}) => {
  const isChannel = type === "channel";
  const displayIndex = totalCount > 0 ? (currentIndex >= 0 ? currentIndex + 1 : 1) : 0;
  const displayTotal = totalCount > 0 ? totalCount : 1;

  // Xử lý boundary cho nút Previous / Next
  const isSingleItem = totalCount <= 1 || disabled;
  const isPrevDisabled = isSingleItem || (!canLoop && currentIndex <= 0);
  const isNextDisabled = isSingleItem || (!canLoop && currentIndex >= totalCount - 1);

  // Xử lý phím tắt ArrowLeft / ArrowRight / Enter / Space / Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        e.stopPropagation();
        if (!isPrevDisabled) onPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        if (!isNextDisabled) onNext();
      } else if (e.key === "Escape" && isListOpen && onOpenList) {
        e.preventDefault();
        e.stopPropagation();
        onOpenList();
      }
    },
    [disabled, isPrevDisabled, isNextDisabled, onPrevious, onNext, isListOpen, onOpenList],
  );

  const prevTitle = isChannel
    ? "Kênh trước đó (Phím P hoặc PageUp)"
    : "Nguồn phát trước (Phím P hoặc PageUp)";
  const nextTitle = isChannel
    ? "Kênh kế tiếp (Phím N hoặc PageDown)"
    : "Nguồn phát kế tiếp (Phím N hoặc PageDown)";
  const listTitle = isChannel
    ? "Mở danh sách kênh truyền hình (Phím C)"
    : "Mở danh sách nguồn phát của trận (Phím C)";

  return (
    <div
      role="group"
      aria-label={isChannel ? "Bộ chọn kênh truyền hình" : "Bộ chọn nguồn phát"}
      onKeyDown={handleKeyDown}
      className={`h-8 sm:h-10 inline-flex items-center bg-black/60 hover:bg-black/75 rounded-full border border-white/20 p-0.5 sm:p-1 backdrop-blur-md shrink-0 transition select-none shadow-sm ${className}`}
    >
      {/* NÚT ‹ CHUYỂN TRƯỚC */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPrevious();
        }}
        disabled={isPrevDisabled}
        title={prevTitle}
        aria-label={prevTitle}
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 ${
          isChannel ? "focus-visible:ring-sky-400" : "focus-visible:ring-red-400"
        } ${
          isPrevDisabled
            ? "text-gray-500 opacity-40 cursor-not-allowed"
            : "text-gray-300 hover:text-white hover:bg-white/15 active:bg-white/25 cursor-pointer active:scale-95"
        }`}
      >
        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
      </button>

      {/* VÙNG GIỮA: TÊN KÊNH / NGUỒN + INDEX + CHEVRON ĐỂ MỞ DANH SÁCH */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenList) onOpenList();
        }}
        disabled={disabled}
        title={listTitle}
        aria-label={listTitle}
        aria-expanded={isListOpen}
        aria-haspopup="listbox"
        className={`h-full flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-full text-[11px] sm:text-xs font-semibold transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${
          isChannel
            ? "focus-visible:ring-sky-400"
            : "focus-visible:ring-red-400"
        } ${
          isListOpen
            ? isChannel
              ? "bg-sky-500/25 text-sky-300 border border-sky-400/40 shadow-sm"
              : "bg-red-500/25 text-amber-300 border border-red-400/40 shadow-sm"
            : "text-white hover:text-amber-300 hover:bg-white/10 active:bg-white/15"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isChannel ? (
          <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-400 shrink-0" />
        ) : (
          <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
        )}

        {/* Tên kênh / nguồn rút gọn trên mobile, đầy đủ hơn trên desktop */}
        <span className="max-w-[55px] min-[360px]:max-w-[75px] xs:max-w-[90px] sm:max-w-[130px] md:max-w-[180px] truncate leading-none">
          {currentName || (isChannel ? "Chọn kênh" : "Chọn nguồn")}
        </span>

        {/* Chỉ số thứ tự item/tổng: Mobile hiện gọn • 3/12, Desktop hiện • Kênh 3/12 hoặc • Nguồn 1/4 */}
        {totalCount > 0 && (
          <span className="text-[10px] sm:text-[11px] font-mono text-gray-300 select-none whitespace-nowrap opacity-90">
            <span className="hidden md:inline">
              • {isChannel ? "Kênh " : "Nguồn "}
            </span>
            <span className="md:hidden">• </span>
            <span className={isChannel ? "text-sky-300" : "text-amber-300"}>
              {displayIndex}
            </span>
            /{displayTotal}
          </span>
        )}

        {/* Mũi tên chỉ thị danh sách sổ xuống */}
        <ChevronDown
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300 shrink-0 transition-transform duration-200 ${
            isListOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {/* NÚT › CHUYỂN KẾ TIẾP */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        disabled={isNextDisabled}
        title={nextTitle}
        aria-label={nextTitle}
        className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 ${
          isChannel ? "focus-visible:ring-sky-400" : "focus-visible:ring-red-400"
        } ${
          isNextDisabled
            ? "text-gray-500 opacity-40 cursor-not-allowed"
            : "text-gray-300 hover:text-white hover:bg-white/15 active:bg-white/25 cursor-pointer active:scale-95"
        }`}
      >
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
      </button>
    </div>
  );
};

export default ChannelSourceSwitcher;
