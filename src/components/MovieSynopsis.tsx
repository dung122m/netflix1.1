"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cleanHtmlText } from "@/lib/cleanHtml";

interface MovieSynopsisProps {
  synopsis: string;
  originName?: string;
}

export function MovieSynopsis({ synopsis: rawSynopsis, originName }: MovieSynopsisProps) {
  const [expanded, setExpanded] = useState(false);
  const synopsis = cleanHtmlText(rawSynopsis);
  const isLong = synopsis.length > 280;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Nội dung phim
          </h2>
        </div>

        {originName && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400 font-medium">
            <span className="text-zinc-500 font-normal">Tên gốc:</span>
            <span className="text-zinc-300 italic truncate max-w-[200px] sm:max-w-xs">{originName}</span>
          </span>
        )}
      </div>

      <div className="relative">
        <p
          className={`text-zinc-300 text-sm sm:text-base leading-relaxed transition-all duration-300 font-normal ${
            !expanded && isLong ? "line-clamp-3 sm:line-clamp-4" : ""
          }`}
        >
          {synopsis}
        </p>

        {!expanded && isLong && (
          <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <span>{expanded ? "Thu gọn" : "Xem thêm"}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-400 transition-transform" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 transition-transform" />
          )}
        </button>
      )}
    </div>
  );
}

export default MovieSynopsis;
