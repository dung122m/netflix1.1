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
    <section className="relative w-full" aria-labelledby="synopsis-heading">
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-netflix-red/15 text-netflix-red border border-netflix-red/30 shadow-sm shrink-0">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <h2
            id="synopsis-heading"
            className="text-base sm:text-lg font-bold text-white tracking-wide truncate"
          >
            Nội dung phim
          </h2>
        </div>

        {originName && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-400 font-medium shrink-0 max-w-full">
            <span className="text-zinc-500 font-normal">Tên gốc:</span>
            <span className="text-zinc-300 italic truncate max-w-[200px] sm:max-w-xs">{originName}</span>
          </span>
        )}
      </div>

      <div className="relative">
        <p
          id="movie-synopsis-text"
          className={`text-zinc-300 text-sm sm:text-base leading-relaxed max-w-[75ch] transition-all duration-300 font-normal ${
            !expanded && isLong ? "line-clamp-3 sm:line-clamp-4" : ""
          }`}
        >
          {synopsis}
        </p>

        {!expanded && isLong && (
          <div
            className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="movie-synopsis-text"
          className="mt-3 inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-netflix-red/60"
        >
          <span>{expanded ? "Thu gọn" : "Xem thêm"}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-zinc-400 transition-transform" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400 transition-transform" aria-hidden="true" />
          )}
        </button>
      )}
    </section>
  );
}

export default MovieSynopsis;
