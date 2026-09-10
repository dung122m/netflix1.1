"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  const router = useRouter();
  const initialTab = searchParams.get("tab") === "tv" ? "tv" : "football";
  const [activeTab, setActiveTab] = useState<"football" | "tv">(initialTab);

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
      router.replace(`/live?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  const liveFootballCount = useMemo(() => {
    return footballData.matches.filter((m) => m.timeline === "live").length;
  }, [footballData.matches]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16 space-y-8">
      {/* 1. HEADER TRANG CHÍNH & TABS CHUYỂN ĐỔI BÓNG ĐÁ / TRUYỀN HÌNH */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-xs font-black animate-pulse shadow-sm">
              <Radio className="w-3.5 h-3.5" />
              <span>LIVE HUB</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Zap className="w-3 h-3 fill-emerald-400" />
              <span>Ultra Low Latency (HLS FHD)</span>
            </span>
            {liveFootballCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-rose-400 font-bold bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>{liveFootballCount} trận đang đá</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            {activeTab === "football"
              ? "Trực Tiếp Bóng Đá HD"
              : "Truyền Hình TV Miễn Phí"}
          </h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl leading-relaxed">
            {activeTab === "football"
              ? "Xem các trận cầu đỉnh cao có Bình luận viên tiếng Việt từ Xôi Lạc, Cola TV, Gà Vàng, S8 TV... Tốc độ cao, không giật lag."
              : "Xem trực tiếp các kênh VTV, HTV, Truyền hình Vĩnh Long, Kênh Thể Thao & Kênh Quốc Tế chuẩn FHD 1080p."}
          </p>
        </div>

        {/* CỤM NÚT CHUYỂN TAB */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/15 shadow-2xl backdrop-blur-xl self-start md:self-auto">
          {/* TAB BÓNG ĐÁ */}
          <button
            type="button"
            onClick={() => handleTabChange("football")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === "football"
                ? "bg-gradient-to-r from-netflix-red to-red-600 text-white shadow-xl shadow-red-950/70 scale-[1.02]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flame className={`w-4 h-4 ${activeTab === "football" ? "text-amber-300 animate-pulse" : "text-gray-400"}`} />
            <span>Bóng Đá Trực Tiếp</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === "football"
                  ? "bg-black/40 text-white"
                  : "bg-white/10 text-gray-300"
              }`}
            >
              {footballData.matches.length}
            </span>
          </button>

          {/* TAB TRUYỀN HÌNH */}
          <button
            type="button"
            onClick={() => handleTabChange("tv")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === "tv"
                ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-xl shadow-sky-950/70 scale-[1.02]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Tv className={`w-4 h-4 ${activeTab === "tv" ? "text-sky-200 animate-pulse" : "text-gray-400"}`} />
            <span>Truyền Hình TV</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
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

      {/* 2. NỘI DUNG THEO TAB - truyền isActive để tự động pause player của tab không active, tránh chạy song song */}
      <div className={activeTab === "football" ? "block" : "hidden"}>
        <LiveFootballClient
          initialData={footballData}
          hideHeader
          isActive={activeTab === "football"}
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
