"use client";

import React from "react";
import Link from "next/link";
import { Server, Zap } from "lucide-react";
import { useWatchController, EpisodeServer } from "./WatchController";

export interface ServerSelectorItem {
  server_name?: string;
  count?: number;
  server_data?: unknown[];
}

interface ServerSelectorProps {
  servers?: ServerSelectorItem[] | EpisodeServer[];
  initialServerIndex?: number;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  servers = [],
  initialServerIndex = 0,
}) => {
  const watchContext = useWatchController();
  const currentServerIndex = watchContext?.currentServerIndex ?? initialServerIndex;
  const switchServer = watchContext?.switchServer;

  if (servers.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-xs text-gray-400 font-medium flex-none flex items-center gap-1">
        <Server className="w-3.5 h-3.5 text-netflix-red" />
        <span>Nguồn phát:</span>
      </span>
      {servers.map((s, sIdx) => {
        const isSelected = sIdx === currentServerIndex;
        const count = "count" in s && s.count !== undefined ? s.count : s.server_data?.length;
        return (
          <Link
            key={s.server_name || sIdx}
            href={`?server=${sIdx}`}
            scroll={false}
            onClick={(e) => {
              if (switchServer) {
                e.preventDefault();
                switchServer(sIdx);
              }
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition flex-none flex items-center gap-1.5 ${
              isSelected
                ? "bg-netflix-red text-white shadow-md shadow-red-950/50"
                : "bg-zinc-800 text-gray-300 hover:text-white hover:bg-zinc-700"
            }`}
          >
            <Zap className={`w-3 h-3 ${isSelected ? "text-amber-300" : "text-gray-400"}`} />
            <span>{s.server_name || `Server #${sIdx + 1}`}</span>
            {count !== undefined && count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-white/10 text-gray-400"}`}>
                {count} tập
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default ServerSelector;
