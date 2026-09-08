"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Flame, Tv, Radio } from "lucide-react";
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

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "tv") {
      setActiveTab("tv");
    } else if (tabParam === "football") {
      setActiveTab("football");
    }
  }, [searchParams]);

  const handleTabChange = (tab: "football" | "tv") => {
    setActiveTab(tab);
    router.replace(`/live?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16 space-y-8">
      {/* 1. HEADER TRANG CHÍNH & TABS CHUYỂN ĐỔI BÓNG ĐÁ / TRUYỀN HÌNH */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-xs font-black animate-pulse">
              <Radio className="w-3.5 h-3.5" />
              <span>LIVE HUB</span>
            </span>
            <span className="text-xs text-gray-400 font-semibold">
              Phát sóng trực tiếp chất lượng cao (FHD / HD)
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            {activeTab === "football"
              ? "Trực Tiếp Bóng Đá HD"
              : "Truyền Hình TV Miễn Phí"}
          </h1>
          <p className="text-sm text-gray-400 mt-2 max-w-2xl">
            {activeTab === "football"
              ? "Theo dõi các trận cầu đỉnh cao có Bình luận viên tiếng Việt từ Xôi Lạc, Cola TV, Gà Vàng, S8 TV..."
              : "Xem trực tiếp các kênh VTV, HTV, Truyền hình Vĩnh Long, Kênh Thể Thao & Kênh Quốc Tế chuẩn FHD 1080p."}
          </p>
        </div>

        {/* CỤM NÚT CHUYỂN TAB ĐẲNG CẤP */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-900 border border-white/15 shadow-xl self-start md:self-auto">
          {/* TAB BÓNG ĐÁ */}
          <button
            type="button"
            onClick={() => handleTabChange("football")}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === "football"
                ? "bg-netflix-red text-white shadow-lg shadow-red-950/60 scale-[1.02]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Flame className="w-4 h-4 text-amber-400" />
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
                ? "bg-sky-600 text-white shadow-lg shadow-sky-950/60 scale-[1.02]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Tv className="w-4 h-4 text-sky-300" />
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

      {/* 2. NỘI DUNG TƯƠNG ỨNG THEO TAB */}
      {activeTab === "football" ? (
        <LiveFootballClient initialData={footballData} hideHeader />
      ) : (
        <LiveTvClient initialData={tvData} />
      )}
    </div>
  );
}

export default LiveHubClient;
