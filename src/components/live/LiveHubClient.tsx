"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Tv, Radio, Zap, Trophy } from "lucide-react";
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
  const [hasMountedSports, setHasMountedSports] = useState<boolean>(initialTab === "sports");
  const [hasMountedTv, setHasMountedTv] = useState<boolean>(initialTab === "tv");

  const initialValidCount = useMemo(() => {
    const now = Date.now();
    return footballData.matches.filter((m) => {
      if (m.timeline === "finished" || m.realStatus === "finished" || m.sourceStatus === "finished") return false;
      if (!m.isEvent && m.timestamp && now > m.timestamp + 140 * 60 * 1000) return false;
      if (m.isEvent && m.timestamp && now > m.timestamp + 140 * 60 * 1000 && m.timeline !== "live") return false;
      return true;
    }).length;
  }, [footballData.matches]);

  const [sportsMatchesCount, setSportsMatchesCount] = useState<number>(initialValidCount);
  const [hasActiveMatch, setHasActiveMatch] = useState<boolean>(false);

  // Sync tab từ URL khi có external navigation (back/forward)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tv") {
      setHasMountedTv(true);
      if (activeTab !== "tv") setActiveTab("tv");
    } else {
      setHasMountedSports(true);
      if (activeTab !== "sports") setActiveTab("sports");
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = useCallback(
    (tab: "sports" | "tv") => {
      try {
        const url = new URL(window.location.href);

        if (tab === "tv") {
          setHasMountedTv(true);
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
          setHasMountedSports(true);
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

  const isSportsCinema = hasActiveMatch && activeTab === "sports";
  const isTvCinema = activeTab === "tv";

  return (
    <div
      className={`max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 transition-all duration-200 ${
        isTvCinema
          ? "pt-14 sm:pt-[64px] pb-4 space-y-2 sm:space-y-2.5"
          : isSportsCinema
            ? "pt-16 sm:pt-[72px] pb-3 sm:pb-4 space-y-2.5 sm:space-y-3"
            : "pt-16 sm:pt-20 pb-12 space-y-3 sm:space-y-4"
      }`}
    >
      {/* 1. NANAFLIX LIVE STUDIO COMMAND BAR */}
      {/* Khi ở chế độ TV: Hiển thị thanh chuyển tab tinh gọn (Slim Command Bar) để tối đa diện tích xem cho TV Player */}
      {isTvCinema ? (
        <header className="flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2 px-2 sm:px-3 rounded-xl bg-zinc-950/80 border border-white/10 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-red-600 to-sky-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-500/30 shrink-0">
                LIVE TV
              </span>
              <span className="hidden md:inline-flex text-[11px] font-bold text-gray-400 truncate">
                {tvData.channels.length} kênh truyền hình HD
              </span>
            </div>
          </div>

          {/* CỤM CHUYỂN ĐỔI TAB (THỂ THAO / TRUYỀN HÌNH) */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 rounded-lg bg-zinc-900 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("sports")}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-black transition-all cursor-pointer outline-none shrink-0 text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Thể Thao</span>
              <span className="hidden sm:inline-flex text-[11px] px-1.5 py-0.2 rounded-full font-black bg-black/40 text-gray-300">
                {sportsMatchesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("tv")}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-black transition-all cursor-pointer outline-none shrink-0 bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-black/40"
            >
              <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sky-200" />
              <span>Truyền Hình</span>
              <span className="hidden sm:inline-flex text-[11px] px-1.5 py-0.2 rounded-full font-black bg-black/40 text-gray-300">
                {tvData.channels.length}
              </span>
            </button>
          </div>
        </header>
      ) : !isSportsCinema ? (
        /* Khi ở chế độ Khám phá Thể thao (chưa chọn trận): Hiển thị header Discovery gọn trên mobile, đầy đủ trên desktop */
        <header className="flex flex-row items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 md:p-4 rounded-xl sm:rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-2xl shadow-xl md:shadow-2xl">
          <div className="flex items-center gap-1.5 sm:gap-3.5 min-w-0 shrink-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-black/40 shrink-0">
              <Radio className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-300 bg-netflix-red/20 px-1.5 sm:px-2 py-0.5 rounded border border-netflix-red/40 shrink-0">
                  LIVE HUB
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 items-center gap-1 shrink-0">
                  <Zap className="w-2.5 h-2.5 fill-current" />
                  <span>1080p Ultra-Low Latency</span>
                </span>
                {liveSportsCount > 0 && (
                  <span className="hidden xs:inline-flex sm:inline-flex text-[11px] font-bold text-rose-400 bg-red-500/15 px-1.5 sm:px-2 py-0.5 rounded border border-red-500/30 items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span>{liveSportsCount} live</span>
                  </span>
                )}
              </div>
              <h1 className="hidden sm:block text-sm sm:text-xl font-black text-white tracking-tight mt-0.5 truncate">
                Trung Tâm Trực Tiếp Thể Thao
              </h1>
            </div>
          </div>

          {/* CỤM CHUYỂN ĐỔI DANH MỤC (THỂ THAO, TRUYỀN HÌNH) */}
          <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg sm:rounded-xl bg-zinc-900 border border-white/10 shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => handleTabChange("sports")}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-4 md:px-5 py-1 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer outline-none shrink-0 focus-visible:ring-2 focus-visible:ring-netflix-red bg-gradient-to-r from-netflix-red to-netflix-red/85 text-white shadow-md shadow-black/40"
            >
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span>Thể Thao</span>
              <span className="hidden xs:inline-flex text-[11px] px-1.5 py-0.5 rounded-full font-black bg-black/40 text-gray-200">
                {sportsMatchesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("tv")}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-4 md:px-5 py-1 sm:py-2 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-black transition-all cursor-pointer outline-none shrink-0 focus-visible:ring-2 focus-visible:ring-sky-500 text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Tv className="w-3 h-3 sm:w-3.5 sm:h-4 shrink-0 text-gray-400" />
              <span>Truyền Hình</span>
              <span className="hidden xs:inline-flex text-[11px] px-1.5 py-0.5 rounded-full font-black bg-white/10 text-gray-400">
                {tvData.channels.length}
              </span>
            </button>
          </div>
        </header>
      ) : null}

      {/* 2. NỘI DUNG THEO TAB - Trì hoãn mount tab chưa mở để triệt tiêu SSR payload & hydration dư thừa, giữ nguyên trong DOM sau khi mở */}
      {hasMountedSports && (
        <div className={activeTab === "sports" ? "block" : "hidden"}>
          <LiveFootballClient
            initialData={footballData}
            hideHeader
            isActive={activeTab === "sports"}
            onMatchesCountChange={setSportsMatchesCount}
            onMatchSelectedChange={setHasActiveMatch}
          />
        </div>
      )}
      {hasMountedTv && (
        <div className={activeTab === "tv" ? "block" : "hidden"}>
          <LiveTvClient
            initialData={tvData}
            isActive={activeTab === "tv"}
          />
        </div>
      )}
    </div>
  );
}

export default LiveHubClient;
