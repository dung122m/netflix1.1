"use client";

import React, { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";

    // Ưu tiên Web Share API trên thiết bị di động
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Xem phim ${title} trên Nanaflix`,
          text: `Đang xem phim "${title}" chất lượng cao miễn phí trên Nanaflix.`,
          url,
        });
        return;
      } catch {
        // Nếu hủy chia sẻ thì tiếp tục dùng clipboard
      }
    }

    // Sao chép liên kết vào clipboard
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      title="Chia sẻ phim này"
      aria-label="Chia sẻ phim"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-zinc-900/80 px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer active:scale-95 flex-shrink-0 whitespace-nowrap"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 font-semibold whitespace-nowrap">Đã chép!</span>
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="whitespace-nowrap">Chia sẻ</span>
        </>
      )}
    </button>
  );
}

export default ShareButton;
