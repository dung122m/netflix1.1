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
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 sm:pt-18 md:pt-20 pb-8 space-y-3.5 sm:space-y-4">
      {/* 1. HEADER TRANG CHÍNH & TABS CHUYỂN ĐỔI BÓNG ĐÁ / TRUYỀN HÌNH */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-white/10 pb-3 sm:pb-3.5">
        <div>
          {/* BADGES METADATA TINH GỌN */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-[10px] font-black shadow-sm shrink-0">
              <Radio className="w-3 h-3 text-netflix-red" />
              <span>NANA LIVE HUB</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              <Zap className="w-2.5 h-2.5 fill-emerald-400" />
              <span>Full HD 1080p</span>
            </span>
            {liveFootballCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>{liveFootballCount} trận đang đá</span>
              </span>
            )}
          </div>

          {/* HEADING ANCHOR CHÍNH */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            {activeTab === "football"
              ? "Trực Tiếp Bóng Đá HD"
              : "Truyền Hình Trực Tuyến Live TV"}
          </h1>
        </div>

        {/* CỤM NÚT CHUYỂN TAB GỌN GÀNG, ĐẸP MẮT */}
        <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 border border-white/10 shadow-lg backdrop-blur-xl">
          {/* TAB BÓNG ĐÁ */}
          <button
            type="button"
            onClick={() => handleTabChange("football")}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
              activeTab === "football"
                ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-md shadow-red-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${activeTab === "football" ? "text-amber-300 animate-pulse" : "text-gray-400"}`} />
            <span>Bóng Đá</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "football"
                  ? "bg-black/40 text-white"
                  : "bg-white/10 text-gray-300"
              }`}
            >
              {footballCount}
            </span>
          </button>

          {/* TAB TRUYỀN HÌNH */}
          <button
            type="button"
            onClick={() => handleTabChange("tv")}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeTab === "tv"
                ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Tv className={`w-3.5 h-3.5 ${activeTab === "tv" ? "text-sky-200 animate-pulse" : "text-gray-400"}`} />
            <span>Truyền Hình</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "tv"
                  ? "bg-black/40 text-white"
                  : "bg-white/10 text-gray-300"
              }`}
            >
              {tvData.channels.length}
            </span>
          </button>
        </div>
      </div>

      {/* 2. NỘI DUNG THEO TAB - Chỉ mount component của tab đang active để tối ưu DOM & Hydration */}
      {activeTab === "football" ? (
        <LiveFootballClient
          initialData={footballData}
          hideHeader
          isActive={true}
          onMatchesCountChange={setFootballCount}
        />
      ) : (
        <LiveTvClient
          initialData={tvData}
          isActive={true}
        />
      )}
    </div>
  );
}

export default LiveHubClient;
