"use client";

import React from "react";
import { User, Sparkles } from "lucide-react";

interface ActorChipProps {
  name: string;
  isDirector?: boolean;
}

export const ActorChipClient: React.FC<ActorChipProps> = ({ name, isDirector = false }) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("open-actor-bio", {
          detail: { name },
        })
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Xem hồ sơ tiểu sử Wikipedia & phim của ${name}`}
      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition cursor-pointer active:scale-95 ${
        isDirector
          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-white border-amber-500/20 hover:border-amber-500/50"
          : "bg-white/5 hover:bg-rose-500/20 text-gray-200 hover:text-white border-white/10 hover:border-rose-500/40"
      }`}
    >
      {isDirector ? (
        <span className="text-[10px] text-amber-400 group-hover:scale-110 transition-transform">🎬</span>
      ) : (
        <User className="w-3 h-3 text-rose-400 group-hover:scale-110 transition-transform flex-none" />
      )}
      <span className="font-medium">{name}</span>
      <Sparkles className="w-2.5 h-2.5 text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default ActorChipClient;
