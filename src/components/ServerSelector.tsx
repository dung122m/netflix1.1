"use client";

import React from "react";
import { Radio, Zap, Sparkles, ShieldCheck } from "lucide-react";
import { useWatchController, EpisodeServer, PlaybackProviderType } from "./WatchController";

export interface ServerSelectorItem {
  server_name?: string;
  count?: number;
  server_data?: unknown[];
}

interface ServerSelectorProps {
  servers?: ServerSelectorItem[] | EpisodeServer[];
  initialServerIndex?: number;
  showHeader?: boolean;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  servers: propServers,
  initialServerIndex = 0,
  showHeader = true,
}) => {
  const watchContext = useWatchController();

  const servers = (propServers && propServers.length > 0)
    ? propServers
    : (watchContext?.servers || []);

  const currentServerIndex = watchContext?.currentServerIndex ?? initialServerIndex;
  const switchServer = watchContext?.switchServer;
  const activeProvider = watchContext?.activeProvider ?? "nanaflix";
  const setActiveProvider = watchContext?.setActiveProvider;

  // Nếu không có bất kỳ server hay context nào, không render
  if (servers.length === 0 && !watchContext) return null;

  return (
    <div className="w-full space-y-3">
      {/* 1. HEADER KHỐI NGUỒN PHÁT */}
      {showHeader && (
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 text-white">
            <Radio className="w-4 h-4 text-netflix-red shrink-0" />
            <span>Nguồn phát</span>
          </h3>
          <span className="text-[11px] font-semibold text-gray-400">
            {activeProvider === "nanaflix"
              ? "Nanaflix VIP"
              : "VSMOV Dự phòng"}
          </span>
        </div>
      )}

      {/* 2. MÁY CHỦ (PHÂN CẤP CHÍNH - LEVEL 1) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>Máy chủ phát</span>
          </span>
          <span className="text-[10px] text-gray-500 font-medium">
            Tự động đồng bộ
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* SERVER 1: NANAFLIX (VIP HLS) */}
          <button
            type="button"
            onClick={() => setActiveProvider?.("nanaflix" as PlaybackProviderType)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeProvider === "nanaflix"
                ? "bg-zinc-100 text-black shadow-lg shadow-white/10 ring-2 ring-white/60"
                : "bg-zinc-800/80 text-gray-400 hover:text-white hover:bg-zinc-700/80 border border-white/5"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeProvider === "nanaflix" ? "bg-red-600 animate-pulse" : "bg-gray-500"}`} />
            <span>Nanaflix</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
              activeProvider === "nanaflix" ? "bg-black/15 text-zinc-900" : "bg-white/5 text-gray-400"
            }`}>
              HLS VIP
            </span>
          </button>

          {/* SERVER 2: VSMOV (DỰ PHÒNG) */}
          <button
            type="button"
            onClick={() => setActiveProvider?.("vsmov" as PlaybackProviderType)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeProvider === "vsmov"
                ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/60"
                : "bg-zinc-800/80 text-gray-400 hover:text-white hover:bg-zinc-700/80 border border-white/5"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>VSMOV</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
              activeProvider === "vsmov" ? "bg-black/20 text-cyan-950" : "bg-white/5 text-gray-400"
            }`}>
              Dự phòng
            </span>
          </button>
        </div>
      </div>

      {/* 3. BẢN PHIM (NGỮ CẢNH CỦA MÁY CHỦ HIỆN TẠI - LEVEL 2) */}
      <div className="space-y-1.5 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span>
              {activeProvider === "nanaflix"
                ? "Bản phim (Nanaflix)"
                : "Luồng phát VSMOV"}
            </span>
          </span>
          {activeProvider === "nanaflix" && servers.length > 0 && (
            <span className="text-[10px] text-gray-500 font-medium">
              {servers[currentServerIndex]?.server_name || "Mặc định"}
            </span>
          )}
        </div>

        {/* Khi đang ở Server Nanaflix -> Hiển thị danh sách Vietsub / Thuyết minh */}
        {activeProvider === "nanaflix" && (
          <div className="flex flex-wrap items-center gap-2">
            {servers.length > 0 ? (
              servers.map((s, sIdx) => {
                const isSelected = sIdx === currentServerIndex;
                const count = "count" in s && s.count !== undefined ? s.count : s.server_data?.length;
                const displayName = s.server_name || `Bản #${sIdx + 1}`;

                return (
                  <button
                    key={s.server_name || sIdx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      switchServer?.(sIdx);
                    }}
                    className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-netflix-red text-white shadow-lg shadow-red-950/60 ring-1 ring-white/20"
                        : "bg-zinc-800/90 text-gray-300 hover:text-white hover:bg-zinc-700/90 border border-white/5"
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : "text-gray-400 group-hover:text-gray-200"}`} />
                    <span>{displayName}</span>
                    {count !== undefined && count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold ${
                          isSelected ? "bg-black/30 text-white" : "bg-white/10 text-gray-400"
                        }`}
                      >
                        {count} tập
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-netflix-red text-white shadow-md ring-1 ring-white/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Bản chuẩn (Full HD)</span>
              </div>
            )}
          </div>
        )}

        {/* Khi đang ở Server VSMOV -> Thông báo luồng phát nhúng VSMOV */}
        {activeProvider === "vsmov" && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-900/30">
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Bản phát trực tiếp từ máy chủ VSMOV (Tự động phụ đề/lồng tiếng)</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveProvider?.("nanaflix")}
              className="text-[11px] font-bold text-gray-300 hover:text-white underline cursor-pointer transition"
            >
              Chuyển về Nanaflix
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerSelector;
