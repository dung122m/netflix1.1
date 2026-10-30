"use client";

import React from "react";
import { Radio, Zap, Sparkles, ShieldCheck, ArrowLeft } from "lucide-react";
import { useWatchController, EpisodeServer, PlaybackProviderType } from "./WatchController";
import { Tooltip } from "@/components/ui/Tooltip";

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
  const isVsmovOnly = Boolean(
    watchContext?.isVsmovOnly ||
    (servers.length > 0 && servers.every((s) => (s.server_name || "").toLowerCase().includes("vsmov")))
  );
  const hasNanaflixSource = watchContext?.hasNanaflixSource ?? !isVsmovOnly;
  const activeProvider = watchContext?.activeProvider ?? (isVsmovOnly ? "vsmov" : "nanaflix");
  const setActiveProvider = watchContext?.setActiveProvider;

  // Nếu không có bất kỳ server hay context nào, không render
  if (servers.length === 0 && !watchContext) return null;

  const isSingleSource = servers.length <= 1;

  return (
    <nav className="w-full space-y-2.5" aria-label="Lựa chọn nguồn phát và bản phim">
      {/* 1. GIAO DIỆN CAPSULE GỌN GÀNG KHI CHỈ CÓ 1 BẢN/NGUỒN PHIM */}
      {isSingleSource ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Radio className="w-3.5 h-3.5 text-netflix-red shrink-0" aria-hidden="true" />
              <span className="text-xs font-bold text-white tracking-wide shrink-0">Nguồn phát:</span>
              <span className="text-xs font-medium text-zinc-300 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full truncate">
                {activeProvider === "vsmov"
                  ? (servers[0]?.server_name || "Máy chủ VSMOV")
                  : (servers[0]?.server_name || "Bản chuẩn HD")}
              </span>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-full border border-white/10 shrink-0">
              <Tooltip
                content={!hasNanaflixSource ? "Phim này hiện chỉ có nguồn phát độc quyền từ máy chủ VSMOV" : "Chuyển sang nguồn Nanaflix "}
                side="top"
              >
                <button
                  type="button"
                  disabled={!hasNanaflixSource}
                  onClick={() => hasNanaflixSource && setActiveProvider?.("nanaflix" as PlaybackProviderType)}
                  aria-pressed={activeProvider === "nanaflix"}
                  aria-label={!hasNanaflixSource ? "Phim này hiện chỉ có nguồn phát độc quyền từ máy chủ VSMOV" : "Chuyển sang nguồn Nanaflix "}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 min-h-[32px] rounded-full text-xs font-semibold transition ${
                    !hasNanaflixSource
                      ? "text-zinc-500 opacity-40 cursor-not-allowed"
                      : activeProvider === "nanaflix"
                      ? "bg-zinc-100 text-black shadow-sm cursor-pointer"
                      : "text-zinc-400 hover:text-white cursor-pointer"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${activeProvider === "nanaflix" && hasNanaflixSource ? "bg-red-600 animate-pulse" : "bg-zinc-500"}`} />
                  <span>Nanaflix </span>
                </button>
              </Tooltip>
              <button
                type="button"
                onClick={() => setActiveProvider?.("vsmov" as PlaybackProviderType)}
                aria-pressed={activeProvider === "vsmov"}
                className={`inline-flex items-center gap-1.5 px-3 py-1 min-h-[32px] rounded-full text-xs font-semibold transition cursor-pointer ${
                  activeProvider === "vsmov"
                    ? "bg-sky-500 text-black shadow-sm font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>VSMOV</span>
              </button>
            </div>
          </div>

          {activeProvider === "vsmov" && (
            <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-sky-200">
                  {isVsmovOnly ? "Máy chủ VSMOV độc quyền" : "Đang phát từ máy chủ đối tác VSMOV"}
                </span>
                <span className="text-[11px] font-medium text-sky-300 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  Phụ đề chuẩn
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Đang phát luồng video từ đối tác VSMOV. Tự động đồng bộ phụ đề đa ngôn ngữ và tốc độ tải cao.
              </p>
              {hasNanaflixSource && (
                <button
                  type="button"
                  onClick={() => setActiveProvider?.("nanaflix")}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Chuyển về Nanaflix </span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 2. GIAO DIỆN ĐẦY ĐỦ KHI CÓ NHIỀU BẢN/PHÂN LOẠI PHIM */
        <div className="space-y-2.5">
          {showHeader && (
            <div className="flex items-center justify-between pb-2 border-b border-white/10 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-white">
                <Radio className="w-3.5 h-3.5 text-netflix-red shrink-0" aria-hidden="true" />
                <span>Nguồn phát</span>
              </h3>
              <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-full border border-white/10">
                <Tooltip
                  content={!hasNanaflixSource ? "Phim này hiện chỉ có nguồn phát độc quyền từ máy chủ VSMOV" : "Chuyển sang nguồn Nanaflix "}
                  side="top"
                >
                  <button
                    type="button"
                    disabled={!hasNanaflixSource}
                    onClick={() => hasNanaflixSource && setActiveProvider?.("nanaflix" as PlaybackProviderType)}
                    aria-pressed={activeProvider === "nanaflix"}
                    aria-label={!hasNanaflixSource ? "Phim này hiện chỉ có nguồn phát độc quyền từ máy chủ VSMOV" : "Chuyển sang nguồn Nanaflix "}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 min-h-[32px] rounded-full text-xs font-semibold transition ${
                      !hasNanaflixSource
                        ? "text-zinc-500 opacity-40 cursor-not-allowed"
                        : activeProvider === "nanaflix"
                        ? "bg-zinc-100 text-black shadow-sm cursor-pointer"
                        : "text-zinc-400 hover:text-white cursor-pointer"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${activeProvider === "nanaflix" && hasNanaflixSource ? "bg-red-600 animate-pulse" : "bg-zinc-500"}`} />
                    <span>Nanaflix </span>
                  </button>
                </Tooltip>
                <button
                  type="button"
                  onClick={() => setActiveProvider?.("vsmov" as PlaybackProviderType)}
                  aria-pressed={activeProvider === "vsmov"}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 min-h-[32px] rounded-full text-xs font-semibold transition cursor-pointer ${
                    activeProvider === "vsmov"
                      ? "bg-sky-500 text-black shadow-sm font-bold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>VSMOV</span>
                </button>
              </div>
            </div>
          )}

          {/* CHỈ HIỂN THỊ DANH SÁCH BẢN PHIM CỦA NANAFLIX KHI ACTIVE PROVIDER LÀ NANAFLIX */}
          {activeProvider === "nanaflix" ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" aria-hidden="true" />
                <span>Bản phim</span>
              </span>

              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Danh sách các bản phát hành">
                {servers.map((s, sIdx) => {
                  const isSelected = sIdx === currentServerIndex;
                  const count = "count" in s && s.count !== undefined ? s.count : s.server_data?.length;
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
                      className={`group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-netflix-red text-white shadow-sm ring-1 ring-white/20 scale-[1.02]"
                          : "bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-white/10"
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300" : "text-zinc-400"}`} aria-hidden="true" />
                      <span>{displayName}</span>
                      {count !== undefined && count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            isSelected ? "bg-black/30 text-white" : "bg-white/10 text-zinc-400"
                          }`}
                        >
                          {count} tập
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* GIAO DIỆN TRẠNG THÁI KHI CHỌN MÁY CHỦ VSMOV */
            <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/25 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500 text-black shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>VSMOV Live</span>
                  </span>
                  <span className="text-xs font-semibold text-sky-200">
                    {isVsmovOnly ? "Máy chủ VSMOV" : "Máy chủ dự phòng VSMOV"}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-sky-300 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                  Tự động phụ đề
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isVsmovOnly
                  ? "Đang phát luồng video chất lượng cao từ máy chủ đối tác VSMOV."
                  : "Đang phát luồng video từ máy chủ đối tác VSMOV. Chuyển sang Nanaflix  để chọn các bản Vietsub hoặc Lồng Tiếng."}
              </p>
              {hasNanaflixSource && (
                <div className="pt-0.5 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveProvider?.("nanaflix")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Quay lại Nanaflix </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default ServerSelector;
