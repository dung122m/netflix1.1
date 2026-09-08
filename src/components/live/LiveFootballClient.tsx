"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FootballMatch, LiveFootballData } from "@/services/liveFootballService";
import { LivePlayer } from "./LivePlayer";
import { MatchCard } from "./MatchCard";
import {
  Search,
  Radio,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface LiveFootballClientProps {
  initialData: LiveFootballData;
  hideHeader?: boolean;
}

export function LiveFootballClient({
  initialData,
  hideHeader = false,
}: LiveFootballClientProps) {
  const { channels, matches } = initialData;
  const searchParams = useSearchParams();

  // Khởi tạo match mặc định
  const defaultMatch = useMemo(() => {
    return (
      matches.find((m) => m.servers.some((s) => s.isHls)) || matches[0] || null
    );
  }, [matches]);

  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(
    () => {
      // Ưu tiên đọc từ URL hoặc localStorage ngay lúc mount
      if (typeof window !== "undefined") {
        try {
          const matchParam = new URLSearchParams(window.location.search).get("match");
          const savedId = localStorage.getItem("nanaflix_live_match_id");
          const target = matchParam || savedId;
          if (target) {
            const found = matches.find((m) => m.id === target || m.title.toLowerCase().includes(target.toLowerCase()));
            if (found) return found;
          }
        } catch {}
      }
      return defaultMatch;
    }
  );

  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlyFhd, setOnlyFhd] = useState<boolean>(false);
  const [showPastMatches, setShowPastMatches] = useState<boolean>(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const channelsScrollRef = useRef<HTMLDivElement>(null);

  // Đồng bộ khi matches hoặc URL thay đổi
  useEffect(() => {
    if (matches.length === 0) return;
    const matchParam = searchParams.get("match");
    const savedId = typeof window !== "undefined" ? localStorage.getItem("nanaflix_live_match_id") : null;
    const target = matchParam || savedId;

    if (target) {
      const found = matches.find((m) => m.id === target || m.title.toLowerCase().includes(target.toLowerCase()));
      if (found) {
        setSelectedMatch(found);
        return;
      }
    }

    if (!selectedMatch) {
      setSelectedMatch(defaultMatch);
    }
  }, [matches, searchParams, defaultMatch]);

  const scrollChannels = (direction: "left" | "right") => {
    if (channelsScrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      channelsScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Lọc danh sách trận đấu
  const filteredMatches = useMemo(() => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;

    return matches
      .filter((m) => {
        // Lọc ẩn trận đã kết thúc > 2 tiếng trước nếu không bật showPastMatches
        if (
          !showPastMatches &&
          m.timestamp !== Number.MAX_SAFE_INTEGER &&
          m.timestamp < twoHoursAgo
        ) {
          return false;
        }

        // Lọc theo kênh
        if (
          selectedChannel !== "all" &&
          m.group !== selectedChannel &&
          !m.groups?.includes(selectedChannel)
        ) {
          return false;
        }

        // Lọc FHD 1080p
        if (
          onlyFhd &&
          !m.quality.includes("FHD") &&
          !m.servers.some((s) => s.quality === "FHD")
        ) {
          return false;
        }

        // Lọc theo tìm kiếm
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const inTitle = m.title.toLowerCase().includes(q);
          const inTeam1 = m.team1.toLowerCase().includes(q);
          const inTeam2 = m.team2.toLowerCase().includes(q);
          const inBlv = m.blv?.toLowerCase().includes(q);
          const inTournament = m.tournament?.toLowerCase().includes(q);
          if (!inTitle && !inTeam1 && !inTeam2 && !inBlv && !inTournament)
            return false;
        }

        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [matches, selectedChannel, searchQuery, onlyFhd, showPastMatches]);

  const handleSelectMatch = (match: FootballMatch) => {
    setSelectedMatch(match);
    try {
      localStorage.setItem("nanaflix_live_match_id", match.id);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "football");
      url.searchParams.set("match", match.id);
      window.history.replaceState(null, "", url.toString());
    } catch {}

    if (playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className={hideHeader ? "space-y-8" : "max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16 space-y-8"}>
      {/* TIÊU ĐỀ TRANG (CHỈ HIỆN KHI KHÔNG NHÚNG TRONG HUB) */}
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-netflix-red text-xs font-bold animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span>LIVE SPORTS</span>
              </span>
              <span className="text-xs text-gray-400 font-medium">
                Cập nhật trực tiếp từ M3U
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Trực Tiếp Bóng Đá HD
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Phát sóng trực tiếp các trận đấu đỉnh cao kèm Bình luận tiếng Việt
              từ Xôi Lạc, Cola TV, Gà Vàng, Socolive...
            </p>
          </div>

          {/* MẸO XEM VLC */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-gray-300 max-w-md">
            <Info className="w-4 h-4 text-orange-400 flex-shrink-0" />
            <span>
              Hỗ trợ phát sóng qua HLS Web Player hoặc mở nhanh 1 chạm bằng{" "}
              <strong className="text-orange-400 font-bold">VLC / IPTV</strong>.
            </span>
          </div>
        </div>
      )}

      {/* KHU VỰC TRÌNH PHÁT VIDEO CHÍNH */}
      {selectedMatch ? (
        <div ref={playerRef} className="scroll-mt-24">
          <LivePlayer
            match={selectedMatch}
            title={selectedMatch.title}
            servers={selectedMatch.servers}
            blv={selectedMatch.blv}
            time={selectedMatch.time}
            group={selectedMatch.group}
            team1={selectedMatch.team1}
            team2={selectedMatch.team2}
            homeLogo={selectedMatch.homeLogo}
            awayLogo={selectedMatch.awayLogo}
          />
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-12 text-center text-gray-400">
          Hiện chưa có trận đấu nào được chọn.
        </div>
      )}

      {/* BỘ LỌC KÊNH & Ô TÌM KIẾM */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span>Lịch thi đấu trực tiếp</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-normal">
                {filteredMatches.length} trận
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {!showPastMatches
                ? "⚡ Đang hiển thị các trận từ 2 giờ trước đến sắp diễn ra"
                : "📜 Hiển thị tất cả trận đấu trong ngày"}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* NÚT BẬT/TẮT TRẬN ĐÃ QUA */}
            <button
              type="button"
              onClick={() => setShowPastMatches((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap ${
                !showPastMatches
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 shadow-red-950/50"
                  : "bg-zinc-900 text-gray-400 border-white/10 hover:text-white"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{!showPastMatches ? "Đang & Sắp đá (từ 2h trước)" : "Xem tất cả (cả trận cũ)"}</span>
            </button>

            {/* NÚT LỌC NHANH FHD 1080P */}
            <button
              type="button"
              onClick={() => setOnlyFhd((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap ${
                onlyFhd
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-emerald-950/50 scale-105"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>⚡</span>
              <span>Chỉ FHD 1080p</span>
            </button>

            {/* THANH TÌM KIẾM TRẬN ĐẤU */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên đội, BLV..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
              />
            </div>
          </div>
        </div>

        {/* CÁC NÚT LỌC NHANH GIẢI ĐẤU (NGOẠI HẠNG ANH, C1, LA LIGA...) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] text-gray-400 font-bold whitespace-nowrap flex-none">
            Giải đấu:
          </span>
          {[
            { label: "🦁 Ngoại Hạng Anh", query: "Ngoại Hạng Anh" },
            { label: "⭐ Cúp C1", query: "Cúp C1" },
            { label: "🇪🇸 La Liga", query: "La Liga" },
            { label: "🇮🇹 Serie A", query: "Serie A" },
            { label: "🇩🇪 Bundesliga", query: "Bundesliga" },
            { label: "🇻🇳 V-League", query: "V-League" },
          ].map((item) => {
            const isFilterActive = searchQuery.toLowerCase() === item.query.toLowerCase();
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (isFilterActive) {
                    setSearchQuery("");
                  } else {
                    setSearchQuery(item.query);
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  isFilterActive
                    ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-950/50 scale-105"
                    : "bg-white/5 text-gray-300 border-white/10 hover:border-white/25 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* CAROUSEL TABS CHỌN KÊNH PHÁT (KHÔNG CÒN THANH CUỘN THÔ CỨNG) */}
        <div className="relative group/carousel">
          {/* NÚT CUỘN TRÁI */}
          <button
            type="button"
            onClick={() => scrollChannels("left")}
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* VÙNG CUỘN KÊNH (ẨN THANH CUỘN THÔ) */}
          <div
            ref={channelsScrollRef}
            className="flex items-center gap-2 overflow-x-auto py-1.5 px-4 sm:px-6 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              onClick={() => setSelectedChannel("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm ${
                selectedChannel === "all"
                  ? "bg-white text-black border-white shadow-md font-extrabold scale-105"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span>🔥 Tất cả trận đấu</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  selectedChannel === "all"
                    ? "bg-black text-white"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {matches.length}
              </span>
            </button>

            {channels.map((ch) => {
              const count = matches.filter((m) => m.group === ch).length;
              const isSelected = selectedChannel === ch;
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm ${
                    isSelected
                      ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-red-950/50 scale-105"
                      : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span>{ch}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                      isSelected
                        ? "bg-black/40 text-white"
                        : "bg-white/10 text-gray-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* NÚT CUỘN PHẢI */}
          <button
            type="button"
            onClick={() => scrollChannels("right")}
            className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DANH SÁCH CÁC TRẬN ĐẤU */}
      {filteredMatches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              isSelected={selectedMatch?.id === match.id}
              onSelect={handleSelectMatch}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-12 text-center text-gray-400">
          Không tìm thấy trận đấu nào phù hợp với bộ lọc tìm kiếm.
        </div>
      )}
    </div>
  );
}

export default LiveFootballClient;
