"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  FootballMatch,
  LiveFootballData,
  getMatchTimeline,
} from "@/services/liveFootballService";
import { LivePlayer } from "./LivePlayer";
import { MatchCard } from "./MatchCard";
import {
  Search,
  Radio,
  Info,
  ChevronLeft,
  ChevronRight,
  X,
  Flame,
  Clock,
  Calendar,
  ChevronDown,
  RotateCcw,
  Bell,
} from "lucide-react";
import { MatchReminderModal } from "./MatchReminderModal";
import { useMatchReminders } from "@/hooks/useMatchReminders";

interface LiveFootballClientProps {
  initialData: LiveFootballData;
  hideHeader?: boolean;
}

const POPULAR_TOURNAMENTS = [
  { label: "🦁 Ngoại Hạng Anh", query: "Ngoại Hạng Anh" },
  { label: "⭐ Cúp C1", query: "Cúp C1" },
  { label: "🇪🇸 La Liga", query: "La Liga" },
  { label: "🇮🇹 Serie A", query: "Serie A" },
  { label: "🇩🇪 Bundesliga", query: "Bundesliga" },
  { label: "🇻🇳 V-League", query: "V-League" },
];

const INITIAL_PAGE_SIZE = 16;

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
      if (typeof window !== "undefined") {
        try {
          const matchParam = new URLSearchParams(window.location.search).get("match");
          const savedId = localStorage.getItem("nanaflix_live_match_id");
          const target = matchParam || savedId;
          if (target) {
            const found = matches.find(
              (m) =>
                m.id === target ||
                m.title.toLowerCase().includes(target.toLowerCase())
            );
            if (found) return found;
          }
        } catch {}
      }
      return defaultMatch;
    }
  );

  // Bộ lọc timeline: all | live | upcoming (sắp đá)
  const [timelineFilter, setTimelineFilter] = useState<"all" | "live" | "upcoming">("all");
  const [showAllUpcoming, setShowAllUpcoming] = useState<boolean>(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlyFhd, setOnlyFhd] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_PAGE_SIZE);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);
  const { reminders } = useMatchReminders();

  const playerRef = useRef<HTMLDivElement>(null);
  const channelsScrollRef = useRef<HTMLDivElement>(null);

  // Gán timeline cho từng trận nếu chưa có
  const enrichedMatches = useMemo(() => {
    return matches.map((m) => {
      if (m.timeline) return m;
      return {
        ...m,
        timeline: getMatchTimeline(m.timestamp),
      };
    });
  }, [matches]);

  // Thống kê số lượng theo timeline để hiển thị trên tabs (mặc định trong khung ±2h)
  const timelineCounts = useMemo(() => {
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const twoHoursLater = now + 2 * 60 * 60 * 1000;

    const activeMatches = enrichedMatches.filter((m) => {
      if (m.timestamp === Number.MAX_SAFE_INTEGER) return true;
      if (m.timestamp < twoHoursAgo) return false;
      if (!showAllUpcoming && m.timestamp > twoHoursLater) return false;
      return true;
    });

    let live = 0;
    let upcoming = 0;

    activeMatches.forEach((m) => {
      if (m.timeline === "live") live++;
      else upcoming++;
    });

    return {
      all: activeMatches.length,
      live,
      upcoming,
    };
  }, [enrichedMatches, showAllUpcoming]);

  // Đồng bộ khi URL / localStorage thay đổi
  useEffect(() => {
    if (matches.length === 0) return;
    const matchParam = searchParams.get("match");
    const savedId =
      typeof window !== "undefined"
        ? localStorage.getItem("nanaflix_live_match_id")
        : null;
    const target = matchParam || savedId;

    if (target) {
      const found = matches.find(
        (m) =>
          m.id === target ||
          m.title.toLowerCase().includes(target.toLowerCase())
      );
      if (found) {
        setSelectedMatch(found);
        return;
      }
    }

    if (!selectedMatch) {
      setSelectedMatch(defaultMatch);
    }
  }, [matches, searchParams, defaultMatch]);

  // Reset phân trang khi thay đổi bất kỳ bộ lọc nào
  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
  }, [timelineFilter, showAllUpcoming, selectedChannel, selectedTournament, searchQuery, onlyFhd]);

  const scrollChannels = (direction: "left" | "right") => {
    if (channelsScrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      channelsScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Lọc danh sách trận đấu (mặc định chỉ hiện trước 2h và sau 2h theo yêu cầu)
  const filteredMatches = useMemo(() => {
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;
    const twoHoursLater = now + 2 * 60 * 60 * 1000;

    return enrichedMatches
      .filter((m) => {
        // Ẩn trận đã kết thúc hơn 2 tiếng trước
        if (
          m.timestamp !== Number.MAX_SAFE_INTEGER &&
          m.timestamp < twoHoursAgo
        ) {
          return false;
        }

        // Mặc định chỉ hiển thị trận trong vòng 2 tiếng tới (sau 2 tiếng)
        if (
          !showAllUpcoming &&
          m.timestamp !== Number.MAX_SAFE_INTEGER &&
          m.timestamp > twoHoursLater
        ) {
          return false;
        }

        // Lọc theo Timeline
        if (timelineFilter === "live" && m.timeline !== "live") {
          return false;
        }
        if (timelineFilter === "upcoming" && m.timeline === "live") {
          return false;
        }

        // Lọc theo Kênh nguồn (Xôi Lạc, S8...)
        if (
          selectedChannel !== "all" &&
          m.group !== selectedChannel &&
          !m.groups?.includes(selectedChannel)
        ) {
          return false;
        }

        // Lọc theo Giải đấu nhanh
        if (selectedTournament) {
          const tQ = selectedTournament.toLowerCase();
          const inTourn = m.tournament?.toLowerCase().includes(tQ);
          const inTitle = m.title.toLowerCase().includes(tQ);
          const inTeam1 = m.team1.toLowerCase().includes(tQ);
          const inTeam2 = m.team2.toLowerCase().includes(tQ);
          if (!inTourn && !inTitle && !inTeam1 && !inTeam2) {
            return false;
          }
        }

        // Lọc FHD 1080p
        if (
          onlyFhd &&
          !m.quality.includes("FHD") &&
          !m.servers.some((s) => s.quality === "FHD")
        ) {
          return false;
        }

        // Lọc theo ô tìm kiếm
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const inTitle = m.title.toLowerCase().includes(q);
          const inTeam1 = m.team1.toLowerCase().includes(q);
          const inTeam2 = m.team2.toLowerCase().includes(q);
          const inBlv = m.blv?.toLowerCase().includes(q);
          const inTournament = m.tournament?.toLowerCase().includes(q);
          if (!inTitle && !inTeam1 && !inTeam2 && !inBlv && !inTournament) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [
    enrichedMatches,
    timelineFilter,
    showAllUpcoming,
    selectedChannel,
    selectedTournament,
    searchQuery,
    onlyFhd,
  ]);

  // Danh sách hiển thị theo phân trang chống ngợp
  const displayedMatches = useMemo(() => {
    return filteredMatches.slice(0, visibleCount);
  }, [filteredMatches, visibleCount]);

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

  const handleResetFilters = () => {
    setTimelineFilter("all");
    setShowAllUpcoming(false);
    setSelectedChannel("all");
    setSelectedTournament("");
    setSearchQuery("");
    setOnlyFhd(false);
  };

  const hasActiveFilters =
    timelineFilter !== "all" ||
    showAllUpcoming ||
    selectedChannel !== "all" ||
    selectedTournament !== "" ||
    searchQuery.trim() !== "" ||
    onlyFhd;

  return (
    <div
      className={
        hideHeader
          ? "space-y-6"
          : "max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16 space-y-6"
      }
    >
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

      {/* BỘ LỌC ĐIỀU HƯỚNG THÔNG MINH (CHỐNG NGỢP GIAO DIỆN) */}
      <div className="space-y-4 pt-4">
        {/* 1. THANH CHUYỂN DÒNG THỜI GIAN (TIMELINE SEGMENTED TABS) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          {/* Cụm Tabs: Tất cả (±2h) | Đang đá (LIVE) | Sắp đá (2h tới) */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/90 border border-white/10 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setTimelineFilter("all")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                timelineFilter === "all"
                  ? "bg-white text-black shadow-md font-extrabold scale-102"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{showAllUpcoming ? "Tất cả các trận" : "Tất cả (±2h)"}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  timelineFilter === "all"
                    ? "bg-black text-white"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {timelineCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTimelineFilter("live")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                timelineFilter === "live"
                  ? "bg-netflix-red text-white shadow-lg shadow-red-950/60 scale-102"
                  : "text-gray-400 hover:text-rose-400 hover:bg-white/5"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Đang đá (LIVE)</span>
              {timelineCounts.live > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    timelineFilter === "live"
                      ? "bg-black/40 text-white"
                      : "bg-red-500/20 text-rose-300"
                  }`}
                >
                  {timelineCounts.live}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTimelineFilter("upcoming")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                timelineFilter === "upcoming"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-950/60 scale-102"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Sắp đá ({showAllUpcoming ? "Tất cả" : "2h tới"})</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  timelineFilter === "upcoming"
                    ? "bg-black/40 text-white"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {timelineCounts.upcoming}
              </span>
            </button>

            {/* Nút chuyển nhanh giữa chỉ ±2h và xem thêm sau 2h */}
            <button
              type="button"
              onClick={() => setShowAllUpcoming((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                showAllUpcoming
                  ? "bg-purple-600/30 text-purple-300 border-purple-500"
                  : "bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5"
              }`}
              title={
                showAllUpcoming
                  ? "Bấm để thu gọn về chỉ trước và sau 2h"
                  : "Bấm để xem thêm các trận sau 2h nữa"
              }
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{showAllUpcoming ? "Thu gọn về ±2h" : "+ Xem thêm sau 2h"}</span>
            </button>
          </div>

          {/* Ô TÌM KIẾM & NÚT FHD */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            {/* NÚT XEM LỊCH NHẮC CỦA TÔI */}
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(true)}
              title="Xem danh sách các trận đã đặt lịch nhắc hẹn"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 border-amber-500/30 hover:border-amber-400"
            >
              <Bell
                className={`w-3.5 h-3.5 text-amber-400 ${
                  reminders.length > 0 ? "animate-bounce" : ""
                }`}
              />
              <span>Lịch nhắc</span>
              {reminders.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-amber-500 text-black">
                  {reminders.length}
                </span>
              )}
            </button>

            {/* LỌC FHD 1080P */}
            <button
              type="button"
              onClick={() => setOnlyFhd((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap ${
                onlyFhd
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/50 scale-102"
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
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-0.5 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. CÁC NÚT LỌC NHANH GIẢI ĐẤU (NGOẠI HẠNG ANH, C1, LA LIGA...) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] text-gray-400 font-bold whitespace-nowrap flex-none">
            Giải đấu:
          </span>

          <button
            type="button"
            onClick={() => setSelectedTournament("")}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
              selectedTournament === ""
                ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-950/50 scale-105"
                : "bg-white/5 text-gray-300 border-white/10 hover:border-white/25 hover:bg-white/10 hover:text-white"
            }`}
          >
            Tất cả giải đấu
          </button>

          {POPULAR_TOURNAMENTS.map((item) => {
            const isFilterActive = selectedTournament === item.query;
            const count = enrichedMatches.filter((m) => {
              const tQ = item.query.toLowerCase();
              return (
                m.tournament?.toLowerCase().includes(tQ) ||
                m.title.toLowerCase().includes(tQ) ||
                m.team1.toLowerCase().includes(tQ) ||
                m.team2.toLowerCase().includes(tQ)
              );
            }).length;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (isFilterActive) {
                    setSelectedTournament("");
                  } else {
                    setSelectedTournament(item.query);
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1.5 ${
                  isFilterActive
                    ? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-950/50 scale-105"
                    : "bg-white/5 text-gray-300 border-white/10 hover:border-white/25 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                      isFilterActive ? "bg-black/30 text-white" : "bg-white/10 text-gray-300"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. CAROUSEL TABS CHỌN NGUỒN PHÁT (XÔI LẠC, S8, COLA TV...) */}
        <div className="relative group/carousel">
          <button
            type="button"
            onClick={() => scrollChannels("left")}
            className="absolute -left-2 sm:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={channelsScrollRef}
            className="flex items-center gap-2 overflow-x-auto py-1 px-4 sm:px-6 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              onClick={() => setSelectedChannel("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer ${
                selectedChannel === "all"
                  ? "bg-zinc-200 text-black border-white shadow-md font-extrabold scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <span>Tất cả nguồn</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer ${
                    isSelected
                      ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-red-950/50 scale-102"
                      : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  <span>{ch}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
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

          <button
            type="button"
            onClick={() => scrollChannels("right")}
            className="absolute -right-2 sm:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-zinc-900/90 hover:bg-white text-gray-300 hover:text-black border border-white/20 shadow-xl flex items-center justify-center transition-all opacity-80 hover:opacity-100 backdrop-blur-md cursor-pointer"
            title="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* TIÊU ĐỀ KHU VỰC VÀ SỐ LƯỢNG TRẬN */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">
              {timelineFilter === "live"
                ? "🔴 Trận đấu đang phát trực tiếp"
                : timelineFilter === "upcoming"
                ? `⏰ Trận đấu sắp diễn ra (${showAllUpcoming ? "Tất cả" : "trong 2 giờ tới"})`
                : `🔥 Trận đấu đang & sắp diễn ra (${showAllUpcoming ? "Tất cả lịch thi đấu" : "khung giờ ±2h"})`}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-semibold">
              Hiển thị {Math.min(displayedMatches.length, filteredMatches.length)} / {filteredMatches.length} trận
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition cursor-pointer font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* DANH SÁCH CÁC TRẬN ĐẤU */}
      {displayedMatches.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                isSelected={selectedMatch?.id === match.id}
                onSelect={handleSelectMatch}
              />
            ))}
          </div>

          {/* NÚT XEM THÊM TRẬN ĐẤU (PAGINATION LOAD MORE ĐẸP MẮT & CHỐNG NGỢP) */}
          {filteredMatches.length > visibleCount && (
            <div className="flex flex-col items-center justify-center pt-4 pb-2 space-y-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + INITIAL_PAGE_SIZE)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-black text-xs sm:text-sm border border-white/20 hover:border-white/40 shadow-xl transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <span>Xem thêm các trận khác</span>
                <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] text-gray-200">
                  +{Math.min(INITIAL_PAGE_SIZE, filteredMatches.length - visibleCount)} trận
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-gray-400">
                Còn lại {filteredMatches.length - visibleCount} trận đấu
              </span>
            </div>
          )}

          {/* Nút thu gọn nếu đã xem nhiều */}
          {visibleCount > INITIAL_PAGE_SIZE && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setVisibleCount(INITIAL_PAGE_SIZE);
                  if (playerRef.current) {
                    playerRef.current.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="text-xs text-gray-400 hover:text-white transition underline cursor-pointer"
              >
                Thu gọn danh sách về 16 trận đầu ↑
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-12 text-center text-gray-400 space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-300">
            Không tìm thấy trận đấu nào phù hợp với bộ lọc hiện tại.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-lg shadow-red-950/50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc để xem tất cả {matches.length} trận</span>
            </button>
          )}
        </div>
      )}

      {/* MODAL DANH SÁCH TRẬN ĐÃ ĐẶT NHẮC HẸN */}
      <MatchReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSelectMatchId={(id) => {
          const found = matches.find((m) => m.id === id);
          if (found) {
            setSelectedMatch(found);
            if (playerRef.current) {
              playerRef.current.scrollIntoView({ behavior: "smooth" });
            }
          }
        }}
      />
    </div>
  );
}

export default LiveFootballClient;
