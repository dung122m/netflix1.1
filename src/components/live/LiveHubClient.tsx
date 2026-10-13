"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Tv, Radio, Zap, Trophy, Activity } from "lucide-react";
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
  const initialTabParam = searchParams.get("tab");
  const initialTab: "sports" | "tv" = initialTabParam === "tv" ? "tv" : "sports";
  const [activeTab, setActiveTab] = useState<"sports" | "tv">(initialTab);

  const initialValidCount = useMemo(() => {
    const now = Date.now();
    return footballData.matches.filter((m) => {
      if (m.timeline === "finished" || m.realStatus === "finished" || m.sourceStatus === "finished") return false;
      if (m.timestamp && now > m.timestamp + 140 * 60 * 1000) return false;
      return true;
    }).length;
  }, [footballData.matches]);

  const [sportsMatchesCount, setSportsMatchesCount] = useState<number>(initialValidCount);

  // Sync tab từ URL khi có external navigation (back/forward)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tv") {
      if (activeTab !== "tv") setActiveTab("tv");
    } else {
      if (activeTab !== "sports") setActiveTab("sports");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = useCallback(
    (tab: "sports" | "tv") => {
      try {
        const url = new URL(window.location.href);

        if (tab === "tv") {
          setActiveTab("tv");
          url.searchParams.set("tab", "tv");
          url.searchParams.delete("sport");
          url.searchParams.delete("match");
          url.searchParams.delete("tournament");
          const savedTvChannelId =
            typeof window !== "undefined"
              ? localStorage.getItem("nanaflix_live_channel_id")
              : null;
          if (savedTvChannelId) {
            url.searchParams.set("channel", savedTvChannelId);
          }
        } else {
          setActiveTab("sports");
          url.searchParams.set("tab", "sports");
          url.searchParams.delete("channel");
        }

        window.history.replaceState(null, "", url.toString());
      } catch {}
    },
    [],
  );

  const liveSportsCount = useMemo(() => {
    return footballData.matches.filter((m) => m.timeline === "live").length;
  }, [footballData.matches]);

  return (
    <div className="max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 space-y-3 sm:space-y-4">
      {/* 1. NANAFLIX LIVE STUDIO COMMAND BAR */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 p-2.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-950/50 shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-netflix-red bg-netflix-red/15 px-2 py-0.5 rounded-md border border-netflix-red/30 shrink-0">
                LIVE HUB
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 items-center gap-1 shrink-0">
                <Zap className="w-2.5 h-2.5 fill-current" />
                <span>1080p Ultra-Low Latency</span>
              </span>
              {liveSportsCount > 0 && (
                <span className="text-[9.5px] sm:text-[10px] font-bold text-rose-400 bg-red-500/15 px-2 py-0.5 rounded-md border border-red-500/30 flex items-center gap-1.5 animate-pulse shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span>{liveSportsCount} trực tiếp</span>
                </span>
              )}
            </div>
            <h1 className="text-sm sm:text-xl font-black text-white tracking-tight mt-0.5 truncate">
              {activeTab === "sports"
                ? "Trung Tâm Trực Tiếp Thể Thao"
                : "Truyền Hình Trực Tuyến Live TV"}
            </h1>
          </div>
        </div>

        {/* CỤM CHUYỂN ĐỔI DANH MỤC (THỂ THAO, TRUYỀN HÌNH) - 2 CỘT ĐỀU NHAU TRÊN MOBILE */}
        <div className="grid grid-cols-2 gap-1 w-full md:flex md:w-auto p-1 rounded-xl bg-zinc-900 border border-white/10 shadow-inner">
          {/* DANH MỤC 1: THỂ THAO */}
          <button
            type="button"
            onClick={() => handleTabChange("sports")}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer outline-none shrink-0 focus-visible:ring-2 focus-visible:ring-netflix-red ${
              activeTab === "sports"
                ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-lg shadow-red-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span>Thể Thao</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "sports"
                  ? "bg-black/50 text-white"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {sportsMatchesCount}
            </span>
          </button>

          {/* DANH MỤC 2: TRUYỀN HÌNH */}
          <button
            type="button"
            onClick={() => handleTabChange("tv")}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer outline-none shrink-0 focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === "tv"
                ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Tv className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${activeTab === "tv" ? "text-sky-200 animate-pulse" : "text-gray-400"}`} />
            <span>Truyền Hình</span>
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
      <div className={activeTab === "sports" ? "block" : "hidden"}>
        <LiveFootballClient
          initialData={footballData}
          hideHeader
          isActive={activeTab === "sports"}
          onMatchesCountChange={setSportsMatchesCount}
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
