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
  const initialTab = searchParams.get("tab") === "tv" ? "tv" : "football";
  const initialSportParam = searchParams.get("sport");
  const initialSport: "all" | "football" | "basketball" =
    initialSportParam === "basketball"
      ? "basketball"
      : initialSportParam === "football"
      ? "football"
      : "all";

  const [activeTab, setActiveTab] = useState<"football" | "tv">(initialTab);
  const [activeSport, setActiveSport] = useState<"all" | "football" | "basketball">(initialSport);

  // Thống kê số lượng từng bộ môn thể thao
  const footballOnlyCount = useMemo(() => {
    return footballData.matches.filter(
      (m) => m.sport !== "basketball",
    ).length;
  }, [footballData.matches]);

  const basketballCount = useMemo(() => {
    return footballData.matches.filter((m) => m.sport === "basketball").length;
  }, [footballData.matches]);

  // Sync tab và sport từ URL khi có external navigation (back/forward)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const sportParam = searchParams.get("sport");

    if (tabParam === "tv") {
      if (activeTab !== "tv") setActiveTab("tv");
    } else {
      if (activeTab !== "football") setActiveTab("football");
      if (sportParam === "basketball" && activeSport !== "basketball") {
        setActiveSport("basketball");
      } else if (sportParam === "football" && activeSport !== "football") {
        setActiveSport("football");
      } else if (!sportParam && activeSport !== "all" && activeSport !== "football") {
        // Mặc định giữ nguyên nếu chưa chọn
      }
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Xác định danh mục active hiện tại
  const activeCategory: "football" | "basketball" | "tv" = useMemo(() => {
    if (activeTab === "tv") return "tv";
    if (activeSport === "basketball") return "basketball";
    return "football";
  }, [activeTab, activeSport]);

  const handleCategoryChange = useCallback(
    (category: "football" | "basketball" | "tv") => {
      try {
        const url = new URL(window.location.href);

        if (category === "tv") {
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
          setActiveTab("football");
          url.searchParams.set("tab", "football");
          url.searchParams.delete("channel");

          if (category === "basketball") {
            setActiveSport("basketball");
            url.searchParams.set("sport", "basketball");
          } else {
            setActiveSport("football");
            url.searchParams.delete("sport");
          }
        }

        window.history.replaceState(null, "", url.toString());
      } catch {}
    },
    [],
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
              {activeCategory === "basketball"
                ? "Trực Tiếp Bóng Rổ NBA & VBA"
                : activeCategory === "football"
                ? "Trung Tâm Trực Tiếp Bóng Đá & Thể Thao"
                : "Truyền Hình Trực Tuyến Live TV"}
            </h1>
          </div>
        </div>

        {/* CỤM CHUYỂN ĐỔI DANH MỤC (BÓNG ĐÁ, BÓNG RỔ, TRUYỀN HÌNH) - ICON KÈM CHỮ CHUYÊN NGHIỆP */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10 shadow-inner overflow-x-auto scrollbar-none max-w-full">
          {/* DANH MỤC 1: BÓNG ĐÁ */}
          <button
            type="button"
            onClick={() => handleCategoryChange("football")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer outline-none shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-netflix-red ${
              activeCategory === "football"
                ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-lg shadow-red-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-3.5 h-3.5 shrink-0" />
            <span>Bóng Đá</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeCategory === "football"
                  ? "bg-black/50 text-white"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {footballOnlyCount}
            </span>
          </button>

          {/* DANH MỤC 2: BÓNG RỔ */}
          <button
            type="button"
            onClick={() => handleCategoryChange("basketball")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer outline-none shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-amber-500 ${
              activeCategory === "basketball"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-orange-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>Bóng Rổ</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeCategory === "basketball"
                  ? "bg-black/50 text-white"
                  : "bg-white/10 text-gray-400"
              }`}
            >
              {basketballCount}
            </span>
          </button>

          {/* DANH MỤC 3: TRUYỀN HÌNH */}
          <button
            type="button"
            onClick={() => handleCategoryChange("tv")}
            className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer outline-none shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-sky-500 ${
              activeCategory === "tv"
                ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-950/60 scale-[1.01]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Tv className={`w-4 h-4 ${activeCategory === "tv" ? "text-sky-200 animate-pulse" : "text-gray-400"}`} />
            <span>Truyền Hình</span>
            <span
              className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                activeCategory === "tv"
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
          selectedSport={activeSport}
          onSportChange={setActiveSport}
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
