"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
    <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5 md:p-6 backdrop-blur-sm relative overflow-hidden">
      {/* Điểm nhấn viền đỏ đặc trưng của Netflix ở mép trái */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-netflix-red" />

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-4 rounded-full bg-netflix-red" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Nội dung phim
          </h2>
        </div>

        {originName && (
          <span className="text-xs text-zinc-400 font-medium italic truncate max-w-[200px] sm:max-w-xs">
            Tên gốc: {originName}
          </span>
        )}
      </div>

      <div className="relative">
        <p
          className={`text-zinc-200 text-sm sm:text-base leading-relaxed transition-all duration-300 font-normal ${
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
          className="mt-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer group"
        >
          <span className="underline underline-offset-4 decoration-netflix-red/60 group-hover:decoration-netflix-red">
            {expanded ? "Thu gọn" : "Xem thêm"}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white transition-transform group-hover:-translate-y-0.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white transition-transform group-hover:translate-y-0.5" />
          )}
        </button>
      )}
    </section>
  );
}

export default MovieSynopsis;
