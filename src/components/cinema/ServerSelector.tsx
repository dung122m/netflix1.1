"use client";

import React from "react";
import { Zap } from "lucide-react";
import { useWatchController, EpisodeServer } from "@/components/cinema/WatchController";

interface ServerSelectorProps {
  servers?: EpisodeServer[];
  currentServerIndex?: number;
  initialServerIndex?: number;
  onSelectServer?: (index: number) => void;
  showHeader?: boolean;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  servers: propServers,
  currentServerIndex,
  initialServerIndex = 0,
  onSelectServer,
}) => {
  const watchContext = useWatchController();

  const servers = (propServers && propServers.length > 0)
    ? propServers
    : (watchContext?.servers || []);

  const effectiveServerIndex = watchContext?.currentServerIndex ?? currentServerIndex ?? initialServerIndex;
  const switchServer = watchContext?.switchServer ?? onSelectServer;

  // Nếu không có server nào hoặc chỉ có 1 server duy nhất, không cần hiển thị selector chiếm diện tích
  if (!servers || servers.length <= 1) return null;

  return (
    <nav className="w-full space-y-1.5" aria-label="Lựa chọn bản phim">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          <span>Bản phim</span>
        </span>
        {servers.length > 2 && (
          <span className="text-[10px] text-zinc-500 font-sans tabular-nums">
            ({servers.length} bản)
          </span>
        )}
      </div>

      {/* Dải cuộn ngang mượt mà 1 hàng */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 no-scrollbar"
        role="group"
        aria-label="Danh sách các bản phát hành"
      >
        {servers.map((s, sIdx) => {
          const isSelected = sIdx === effectiveServerIndex;
          const displayName = s.server_name || `Bản #${sIdx + 1}`;

          return (
            <button
              key={s.server_name || sIdx}
              type="button"
              aria-pressed={isSelected}
              onClick={(e) => {
                e.preventDefault();
                switchServer?.(sIdx);
              }}
              className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer ${
                isSelected
                  ? "bg-netflix-red text-white shadow-sm font-bold scale-[1.01]"
                  : "bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Zap className={`w-3 h-3 ${isSelected ? "text-amber-300" : "text-zinc-400"}`} aria-hidden="true" />
              <span>{displayName}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default ServerSelector;
