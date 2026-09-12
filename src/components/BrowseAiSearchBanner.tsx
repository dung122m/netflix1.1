"use client";

import React from "react";
import { Sparkles, MessageSquare } from "lucide-react";

interface Props {
  keyword: string;
  hasContentMatches?: boolean;
}

export function BrowseAiSearchBanner({ keyword, hasContentMatches }: Props) {
  if (!keyword || keyword.trim().length < 2) return null;

  const handleOpenConcierge = () => {
    const cleanPrompt = /^tìm\s*phim/i.test(keyword.trim())
      ? keyword.trim()
      : `Tìm phim liên quan đến "${keyword.trim()}"`;

    window.dispatchEvent(
      new CustomEvent("open-ai-concierge", {
        detail: {
          prompt: cleanPrompt,
          autoSearch: true,
        },
      })
    );
  };

  return (
    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900/90 to-zinc-900/90 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 flex-none shadow">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h4 className="text-white text-xs sm:text-sm font-bold flex items-center gap-2 flex-wrap">
            <span>Tìm kiếm theo nội dung &quot;{keyword}&quot;</span>
            {hasContentMatches && (
              <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                Khớp cả tóm tắt cốt truyện
              </span>
            )}
          </h4>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Cần tìm phim theo cốt truyện chi tiết hoặc tình huống cụ thể? Hỏi ngay Trợ lý Nana AI!
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleOpenConcierge}
        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 flex-none shadow-md shadow-red-950 cursor-pointer hover:scale-105 active:scale-95"
      >
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Hỏi Nana AI về &quot;{keyword.slice(0, 18)}{keyword.length > 18 ? "..." : ""}&quot;</span>
      </button>
    </div>
  );
}
