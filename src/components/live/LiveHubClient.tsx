"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Flame, Tv, Radio, Zap } from "lucide-react";
import { LiveFootballData } from "@/services/liveFootballService";
import { LiveTvData } from "@/services/liveTvService";
import { LiveFootballClient } from "./LiveFootballClient";
import { LiveTvClient } from "./LiveTvClient";

interface LiveHubClientProps {
  footballData: LiveFootballData;
  tvData: LiveTvData;
}

export function LiveHubClient({ footballData, tvData }: LiveHubClientProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "tv" ? "tv" : "football";
  const [activeTab, setActiveTab] = useState<"football" | "tv">(initialTab);
  const [footballCount, setFootballCount] = useState<number>(
    footballData.matches.length,
  );

  // Sync tab từ URL chỉ khi URL thay đổi bởi external navigation (back/forward)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tv" && activeTab !== "tv") {
      setActiveTab("tv");
    } else if (tabParam === "football" && activeTab !== "football") {
      setActiveTab("football");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dùng useCallback để không tạo lại hàm khi re-render
  const handleTabChange = useCallback(
    (tab: "football" | "tv") => {
      setActiveTab(tab);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        if (tab === "football") {
          url.searchParams.delete("channel");
        } else if (tab === "tv") {
          const savedTvChannelId =
            typeof window !== "undefined"
              ? localStorage.getItem("nanaflix_live_channel_id")
              : null;
          if (savedTvChannelId) {
            url.searchParams.set("channel", savedTvChannelId);
          }
        }
        window.history.replaceState(null, "", url.toString());
      } catch {}
    },
    []
  );

  const liveFootballCount = useMemo(() => {
    return footballData.matches.filter((m) => m.timeline === "live").length;
  }, [footballData.matches]);

  return (
    <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 space-y-4">
      {/* 1. NANAFLIX LIVE STUDIO COMMAND BAR */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-950/50 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-netflix-red bg-netflix-red/15 px-2 py-0.5 rounded-md border border-netflix-red/30">
                LIVE HUB
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 fill-current" />
                <span>1080p Ultra-Low Latency</span>
              </span>
              {liveFootballCount > 0 && (
                <span className="text-[10px] font-bold text-rose-400 bg-red-500/15 px-2 py-0.5 rounded-md border border-red-500/30 flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>{liveFootballCount} trận đang trực tiếp</span>
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight mt-0.5">
              {activeTab === "football"
                ? "Trung Tâm Trực Tiếp Bóng Đá & Thể Thao"
                : "Truyền Hình Trực Tuyến Live TV"}
            </h1>
          </div>
        </div>

        {/* CỤM CHUYỂN ĐỔI KHÔNG GIAN (TV VS BÓNG ĐÁ) */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10 shadow-inner">
          {/* TAB BÓNG ĐÁ */}
          <button
            type="button"
            onClick={() => handleTabChange("football")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
              activeTab === "football"
                ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-lg shadow-red-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flame className={`w-4 h-4 ${activeTab === "football" ? "text-amber-300 animate-pulse" : "text-gray-400"}`} />
            <span>Sân Cỏ Trực Tiếp</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "football"
                  ? "bg-black/50 text-white"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {footballCount}
            </span>
          </button>

          {/* TAB TRUYỀN HÌNH */}
          <button
            type="button"
            onClick={() => handleTabChange("tv")}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === "tv"
                ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Tv className={`w-4 h-4 ${activeTab === "tv" ? "text-sky-200 animate-pulse" : "text-gray-400"}`} />
            <span>Kênh Truyền Hình</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "tv"
                  ? "bg-black/50 text-white"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {tvData.channels.length}
            </span>
          </button>
        </div>
      </header>

      {/* 2. NỘI DUNG THEO TAB - Giữ cả hai component trong DOM để bảo toàn kênh/trận và không remount Player khi đổi tab */}
      <div className={activeTab === "football" ? "block" : "hidden"}>
        <LiveFootballClient
          initialData={footballData}
          hideHeader
          isActive={activeTab === "football"}
          onMatchesCountChange={setFootballCount}
        />
      </div>
      <div className={activeTab === "tv" ? "block" : "hidden"}>
        <LiveTvClient
          initialData={tvData}
          isActive={activeTab === "tv"}
        />
      </div>
    </div>
  );
}

export default LiveHubClient;
