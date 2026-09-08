"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface MovieSynopsisProps {
  synopsis: string;
  originName?: string;
}

export function MovieSynopsis({ synopsis, originName }: MovieSynopsisProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = synopsis.length > 280;

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5 md:p-6 backdrop-blur-sm relative overflow-hidden">
      {/* Điểm nhấn viền đỏ đặc trưng của Netflix ở mép trái */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-netflix-red" />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-netflix-red" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Tóm tắt cốt truyện
          </h2>
        </div>

        {originName && (
          <span className="text-xs text-gray-400 font-medium italic truncate max-w-[200px] sm:max-w-xs">
            Tên gốc: {originName}
          </span>
        )}
      </div>

      <div className="relative">
        <p
          className={`text-gray-200 text-sm sm:text-base leading-relaxed transition-all duration-300 font-normal ${
            !expanded && isLong ? "line-clamp-3 sm:line-clamp-4" : ""
          }`}
        >
          {synopsis}
        </p>

        {!expanded && isLong && (
          <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-zinc-950/90 to-transparent pointer-events-none" />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-netflix-red hover:text-red-400 transition-colors cursor-pointer group"
        >
          <span>{expanded ? "Thu gọn" : "Xem toàn bộ tóm tắt"}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
          )}
        </button>
      )}
    </section>
  );
}

export default MovieSynopsis;
