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
      onMouseEnter={() => {
        fetch(`/api/actor-bio?name=${encodeURIComponent(name)}`).catch(() => {});
      }}
      title={`Xem hồ sơ tiểu sử Wikipedia & phim của ${name}`}
      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white backdrop-blur-md transition cursor-pointer active:scale-95"
    >
      {isDirector ? (
        <span className="text-[10px] text-zinc-400 group-hover:scale-110 transition-transform">🎬</span>
      ) : (
        <User className="w-3 h-3 text-zinc-400 group-hover:text-white group-hover:scale-110 transition-transform flex-none" />
      )}
      <span className="font-medium">{name}</span>
      <Sparkles className="w-2.5 h-2.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default ActorChipClient;
