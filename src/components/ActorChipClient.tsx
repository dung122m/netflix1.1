"use client";

import React from "react";
import Link from "next/link";
import { User, Sparkles } from "lucide-react";
import { normalizeForMatch } from "@/lib/stringUtils";

interface ActorChipProps {
  name: string;
  isDirector?: boolean;
}

function toActorSlug(name: string): string {
  return normalizeForMatch(name).replace(/\s+/g, "-");
}

export const ActorChipClient: React.FC<ActorChipProps> = ({ name, isDirector = false }) => {
  const slug = toActorSlug(name);

  return (
    <Link
      href={`/dien-vien/${slug}`}
      title={`Xem hồ sơ & danh sách phim của ${name}`}
      className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white backdrop-blur-md transition cursor-pointer active:scale-95"
    >
      {isDirector ? (
        <span className="text-[10px] text-zinc-400 group-hover:scale-110 transition-transform">🎬</span>
      ) : (
        <User className="w-3 h-3 text-zinc-400 group-hover:text-white group-hover:scale-110 transition-transform flex-none" />
      )}
      <span className="font-medium">{name}</span>
      <Sparkles className="w-2.5 h-2.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
};

export default ActorChipClient;
