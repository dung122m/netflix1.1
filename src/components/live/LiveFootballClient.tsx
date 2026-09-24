"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  FootballMatch,
  LiveFootballData,
  getMatchTimeline,
  getStreamHealthStatus,
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
  Clock,
  RotateCcw,
  Zap,
} from "lucide-react";


interface LiveFootballClientProps {
  initialData: LiveFootballData;
  hideHeader?: boolean;
  isActive?: boolean;
  onMatchesCountChange?: (count: number) => void;
}

export function LiveFootballClient({
  initialData,
  hideHeader = false,
  isActive = true,
  onMatchesCountChange,
}: LiveFootballClientProps) {
  const { channels } = initialData;
  const searchParams = useSearchParams();
  const [liveMatches, setLiveMatches] = useState<FootballMatch[]>(
    initialData.matches,
  );

  // Đồng bộ khi dữ liệu từ server thay đổi hoặc khi lọc kênh
  useEffect(() => {
    setLiveMatches(initialData.matches);
  }, [initialData.matches]);

  useEffect(() => {
    onMatchesCountChange?.(liveMatches.length);
  }, [liveMatches.length, onMatchesCountChange]);

  // TỰ ĐỘNG LÀM MỚI DANH SÁCH TRẬN ĐẤU MỖI 3 PHÚT (không cần F5)
  // Trận mới bắt đầu, trận kết thúc sẽ tự cập nhật đồng bộ
  useEffect(() => {
    const refreshMatches = async () => {
      try {
        const res = await fetch("/api/live-football/matches", {
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.status && Array.isArray(json.data?.matches) && json.data.matches.length > 0) {
          setLiveMatches(json.data.matches);
        }
      } catch {
        // Giữ nguyên dữ liệu cũ nếu fetch thất bại
      }
    };

    // Refresh ngay sau 30s lần đầu, sau đó mỗi 3 phút
    const initialDelay = setTimeout(refreshMatches, 30_000);
    const interval = setInterval(refreshMatches, 3 * 60 * 1000);
    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);

  // Khởi tạo match mặc định: Ưu tiên trận ĐANG ĐÁ (LIVE) và có luồng HLS
  const defaultMatch = useMemo(() => {
    return (
      liveMatches.find((m) => m.timeline === "live" && m.servers.some((s) => s.isHls)) ||
      liveMatches.find((m) => m.timeline === "live") ||
      liveMatches.find((m) => m.servers.some((s) => s.isHls)) ||
      liveMatches[0] ||
      null
    );
  }, [liveMatches]);

  const [now, setNow] = useState<number>(() => Date.now());

  // Cập nhật đồng hồ mỗi 10 giây để tự động chuyển trận từ "Sắp phát" sang "Đang phát" và ẩn khi kết thúc
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  const [selectedMatch, setSelectedMatch] = useState<FootballMatch | null>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const matchParam = new URLSearchParams(window.location.search).get(
            "match",
          );
          const savedId = localStorage.getItem("nanaflix_live_match_id");
          const target = matchParam || savedId;
          if (target) {
            const found = liveMatches.find(
              (m) =>
                m.id === target ||
                m.title.toLowerCase().includes(target.toLowerCase()),
            );
            if (found) return found;
          }
        } catch { }
      }
      return defaultMatch;
    },
  );
  const [selectedFootballGroup, setSelectedFootballGroup] = useState<string>(
    () => searchParams.get("group") || "all",
  );
  const [selectedTournament, setSelectedTournament] = useState<string>(
    () => searchParams.get("tournament") || "all",
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    () => searchParams.get("q") || "",
  );
  const [onlyFhd, setOnlyFhd] = useState<boolean>(
    () => searchParams.get("fhd") === "1",
  );
  const [showMatchRail, setShowMatchRail] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const channelsScrollRef = useRef<HTMLDivElement>(null);

  // Helper đồng bộ URL an toàn
  const updateUrl = useCallback(
    (
      updates: {
        match?: string | null;
        tournament?: string | null;
        group?: string | null;
        q?: string | null;
        fhd?: boolean | null;
      },
      pushHistory = false,
    ) => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "football");
        url.searchParams.delete("channel"); // TV channel param tuyệt đối không thuộc về Football tab

        if (updates.match !== undefined) {
          if (updates.match) url.searchParams.set("match", updates.match);
          else url.searchParams.delete("match");
        }

        if (updates.tournament !== undefined) {
          if (updates.tournament && updates.tournament !== "all") {
            url.searchParams.set("tournament", updates.tournament);
          } else {
            url.searchParams.delete("tournament");
          }
        }

        if (updates.group !== undefined) {
          if (updates.group && updates.group !== "all") {
            url.searchParams.set("group", updates.group);
          } else {
            url.searchParams.delete("group");
          }
        }

        if (updates.q !== undefined) {
          if (updates.q && updates.q.trim()) {
            url.searchParams.set("q", updates.q.trim());
          } else {
            url.searchParams.delete("q");
          }
        }

        if (updates.fhd !== undefined) {
          if (updates.fhd) {
            url.searchParams.set("fhd", "1");
          } else {
            url.searchParams.delete("fhd");
          }
        }

        if (pushHistory) {
          window.history.pushState(null, "", url.toString());
        } else {
          window.history.replaceState(null, "", url.toString());
        }
      } catch { }
    },
    [],
  );

  // Phân loại trạng thái realtime: Đang phát (live), Sắp phát trong 60 phút (upcoming_60m), Ẩn (hidden)
  const enrichedMatches = useMemo(() => {
    return liveMatches.map((m) => {
      const hasReliableTimestamp =
        m.timestamp !== undefined &&
        m.timestamp !== null &&
        m.timestamp > 0 &&
        m.timestamp !== Number.MAX_SAFE_INTEGER;

      const timeline = getMatchTimeline(
        m.timestamp,
        m.sourceStatus,
        m.servers && m.servers.length > 0 && m.servers.some((s) => getStreamHealthStatus(s.url) === "alive")
          ? "alive"
          : m.servers && m.servers.length > 0 && m.servers.every((s) => getStreamHealthStatus(s.url) === "dead")
            ? "dead"
            : "unknown",
        now,
      );

      const isLive = timeline === "live";

      // SẮP PHÁT (TRONG 60 PHÚT TỚI): Chưa đến giờ đá và kickoff <= now + 60m
      const isUpcoming60m =
        timeline === "upcoming" &&
        hasReliableTimestamp &&
        m.timestamp >= now &&
        m.timestamp <= now + 60 * 60 * 1000;

      let sectionState: "live" | "upcoming_60m" | "hidden" = "hidden";
      if (isLive) sectionState = "live";
      else if (isUpcoming60m) sectionState = "upcoming_60m";

      return {
        ...m,
        timeline: isLive
          ? ("live" as const)
          : isUpcoming60m
            ? ("upcoming" as const)
            : ("finished" as const),
        sectionState,
      };
    });
  }, [liveMatches, now]);

  // Bộ lọc tìm kiếm & tùy chọn
  const matchesSearch = useCallback(
    (m: FootballMatch) => {
      if (
        onlyFhd &&
        !m.quality.includes("FHD") &&
        !m.servers.some((s) => s.quality === "FHD")
      ) {
        return false;
      }
      if (
        selectedTournament !== "all" &&
        m.tournament !== selectedTournament
      ) {
        return false;
      }
      if (
        selectedFootballGroup !== "all" &&
        m.group !== selectedFootballGroup &&
        !m.groups?.includes(selectedFootballGroup)
      ) {
        return false;
      }
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
    },
    [onlyFhd, selectedTournament, selectedFootballGroup, searchQuery],
  );

  // 1. Danh sách trận ĐANG PHÁT TRỰC TIẾP
  const liveMatchesList = useMemo(() => {
    return enrichedMatches
      .filter((m) => m.sectionState === "live" && matchesSearch(m))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [enrichedMatches, matchesSearch]);

  // 2. Danh sách trận SẮP PHÁT (TRONG 60 PHÚT TỚI)
  const upcomingMatchesList = useMemo(() => {
    return enrichedMatches
      .filter((m) => m.sectionState === "upcoming_60m" && matchesSearch(m))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [enrichedMatches, matchesSearch]);

  // Danh sách toàn bộ các trận hiển thị trên trang để truyền cho LivePlayer
  const allVisibleMatches = useMemo(() => {
    return [...liveMatchesList, ...upcomingMatchesList];
  }, [liveMatchesList, upcomingMatchesList]);

  // Đồng bộ số lượng với LiveHubClient
  useEffect(() => {
    onMatchesCountChange?.(allVisibleMatches.length);
  }, [allVisibleMatches.length, onMatchesCountChange]);

  // Danh sách các giải đấu có trong các trận hiển thị
  const availableTournaments = useMemo(() => {
    const map = new Map<string, number>();
    allVisibleMatches.forEach((m) => {
      if (m.tournament && m.tournament.trim()) {
        const t = m.tournament.trim();
        map.set(t, (map.get(t) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [allVisibleMatches]);

  // Danh sách các kênh nguồn có trong các trận hiển thị
  const activeChannels = useMemo(() => {
    return channels.filter(
      (ch) =>
        ch &&
        !ch.includes(";") &&
        !["Undefined", "General", "Shop", "Kids", "Education"].includes(ch) &&
        allVisibleMatches.some(
          (m) => m.group === ch || m.groups?.includes(ch),
        ),
    );
  }, [channels, allVisibleMatches]);

  // Đồng bộ khi URL / Back / Forward thay đổi
  useEffect(() => {
    if (liveMatches.length === 0) return;
    const matchParam = searchParams.get("match");
    const savedId =
      typeof window !== "undefined"
        ? localStorage.getItem("nanaflix_live_match_id")
        : null;
    const target = matchParam || savedId;

    if (target) {
      const found = liveMatches.find(
        (m) =>
          m.id === target ||
          m.title.toLowerCase().includes(target.toLowerCase()),
      );
      if (found) {
        setSelectedMatch(found);
      } else {
        setSelectedMatch((prev) => prev || defaultMatch);
      }
    } else {
      setSelectedMatch((prev) => prev || defaultMatch);
    }

    const tourParam = searchParams.get("tournament");
    setSelectedTournament(tourParam || "all");

    const groupParam = searchParams.get("group");
    setSelectedFootballGroup(groupParam || "all");

    const qParam = searchParams.get("q");
    setSearchQuery(qParam || "");

    const fhdParam = searchParams.get("fhd");
    setOnlyFhd(fhdParam === "1");
  }, [liveMatches, searchParams, defaultMatch]);

  useEffect(() => {
    setShowMatchRail(false);
  }, [isActive]);

  const scrollChannels = (direction: "left" | "right") => {
    if (channelsScrollRef.current) {
      const offset = direction === "left" ? -280 : 280;
      channelsScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleTournamentChange = (t: string) => {
    setSelectedTournament(t);
    updateUrl({ tournament: t });
  };

  const handleFootballGroupChange = (grp: string) => {
    setSelectedFootballGroup(grp);
    updateUrl({ group: grp });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    updateUrl({ q });
  };

  const handleFhdToggle = () => {
    const next = !onlyFhd;
    setOnlyFhd(next);
    updateUrl({ fhd: next });
  };

  const handleSelectMatch = (match: FootballMatch) => {
    setSelectedMatch(match);
    try {
      localStorage.setItem("nanaflix_live_match_id", match.id);
      updateUrl(
        {
          match: match.id,
          tournament: selectedTournament !== "all" ? selectedTournament : null,
          group: selectedFootballGroup !== "all" ? selectedFootballGroup : null,
          q: searchQuery.trim() || null,
          fhd: onlyFhd,
        },
        true,
      );
    } catch { }

    if (playerRef.current) {
      const topOffset =
        playerRef.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, topOffset), behavior: "smooth" });
    }
  };

  const handleResetFilters = () => {
    setSelectedFootballGroup("all");
    setSelectedTournament("all");
    setSearchQuery("");
    setOnlyFhd(false);
    updateUrl({
      tournament: "all",
      group: "all",
      q: "",
      fhd: false,
    });
  };

  const hasActiveFilters =
    selectedFootballGroup !== "all" ||
    selectedTournament !== "all" ||
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
                <span>NANA SPORTS LIVE</span>
              </span>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Full HD • Tốc độ cao
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Trực Tiếp Bóng Đá & Thể Thao
            </h1>
            <p className="text-sm text-gray-400 mt-2">
              Phát sóng trực tiếp các trận cầu tâm điểm kèm Bình luận viên Tiếng Việt. Trải nghiệm mượt mà, không giật lag.
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
        <div ref={playerRef} className="group/player relative scroll-mt-24">
          <LivePlayer
            match={selectedMatch}
            title={selectedMatch.title}
            servers={selectedMatch.servers}
            blv={selectedMatch.blv}
            time={selectedMatch.time}
            matchOptions={
              allVisibleMatches.length > 0
                ? allVisibleMatches
                : [selectedMatch]
            }
            onSelectMatch={handleSelectMatch}
            showMatchRail={showMatchRail}
            onToggleMatchRail={() => setShowMatchRail((prev) => !prev)}
            onCloseMatchRail={() => setShowMatchRail(false)}
            isActive={isActive}
          />
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-12 text-center text-gray-400">
          Hiện chưa có trận đấu nào được chọn.
        </div>
      )}

      {/* THANH TÌM KIẾM & BỘ LỌC */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-gray-300">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>
                {liveMatchesList.length} đang đá • {upcomingMatchesList.length} sắp phát
              </span>
            </span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* LỌC FHD 1080P */}
            <button
              type="button"
              onClick={handleFhdToggle}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-sm cursor-pointer whitespace-nowrap ${onlyFhd
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-emerald-950/50 scale-102"
                  : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/20 hover:text-white"
                }`}
            >
              <span>⚡</span>
              <span>Chỉ FHD 1080p</span>
            </button>

            {/* THANH TÌM KIẾM */}
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Tìm tên đội, BLV..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-0.5 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition cursor-pointer font-semibold whitespace-nowrap text-xs active:scale-95 px-2.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20"
                title="Đặt lại bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* CAROUSEL TABS CHỌN NGUỒN PHÁT */}
        {activeChannels.length > 0 && (
          <div className="hidden sm:block relative group/carousel">
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
                onClick={() => handleFootballGroupChange("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer ${selectedFootballGroup === "all"
                    ? "bg-zinc-200 text-black border-white shadow-md font-extrabold scale-102"
                    : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                  }`}
              >
                <span>Tất cả nguồn</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedFootballGroup === "all"
                      ? "bg-black text-white"
                      : "bg-white/10 text-gray-300"
                    }`}
                >
                  {allVisibleMatches.length}
                </span>
              </button>

              {activeChannels.map((ch) => {
                const count = allVisibleMatches.filter(
                  (m) => m.group === ch || m.groups?.includes(ch),
                ).length;
                const isSelected = selectedFootballGroup === ch;
                const icon =
                  ch.includes("VTV") || ch.includes("HTV")
                    ? "📡"
                    : ch.includes("BLV")
                      ? "🎙️"
                      : ch.includes("FPT")
                        ? "⚡"
                        : ch.includes("TV360")
                          ? "📱"
                          : "🌐";
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => handleFootballGroupChange(ch)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border shadow-sm cursor-pointer ${isSelected
                        ? "bg-netflix-red text-white border-netflix-red shadow-lg shadow-red-950/50 scale-102"
                        : "bg-zinc-900/90 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                      }`}
                  >
                    <span>
                      {icon} {ch}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${isSelected
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
        )}

        {/* CAROUSEL TABS GIẢI ĐẤU */}
        {availableTournaments.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto py-1 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => handleTournamentChange("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${selectedTournament === "all"
                  ? "bg-white text-black border-white shadow-sm font-extrabold"
                  : "bg-zinc-900/80 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
                }`}
            >
              Tất cả giải đấu
            </button>
            {availableTournaments.map((t) => {
              const tourIcon = t.name.includes("Ngoại Hạng Anh")
                ? "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
                : t.name.includes("La Liga")
                  ? "🇪🇸"
                  : t.name.includes("Serie A")
                    ? "🇮🇹"
                    : t.name.includes("Bundesliga")
                      ? "🇩🇪"
                      : t.name.includes("Ligue 1")
                        ? "🇫🇷"
                        : t.name.includes("V-League")
                          ? "🇻🇳"
                          : t.name.includes("24/7") || t.name.includes("Kênh")
                            ? "📺"
                            : "🏆";
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => handleTournamentChange(t.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:scale-105 ${selectedTournament === t.name
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400 shadow-md shadow-amber-950/50 font-extrabold scale-102"
                      : "bg-zinc-900/80 text-gray-300 border-white/10 hover:border-white/25 hover:text-white hover:bg-zinc-800"
                    }`}
                >
                  <span>
                    {tourIcon} {t.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${selectedTournament === t.name
                        ? "bg-black/40 text-white"
                        : "bg-white/10 text-gray-400"
                      }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. KHU VỰC 🔴 ĐANG PHÁT TRỰC TIẾP */}
      {liveMatchesList.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🔴 ĐANG PHÁT TRỰC TIẾP</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-rose-300 font-black text-xs border border-red-500/30">
                {liveMatchesList.length} trận
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {liveMatchesList.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                isSelected={selectedMatch?.id === match.id}
                onSelect={handleSelectMatch}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. KHU VỰC 🕐 SẮP PHÁT (TRONG 60 PHÚT TỚI) */}
      {upcomingMatchesList.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>🕐 SẮP PHÁT SÓNG (TRONG 60 PHÚT TỚI)</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-black text-xs border border-sky-500/30">
                {upcomingMatchesList.length} trận
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
            {upcomingMatchesList.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                isSelected={selectedMatch?.id === match.id}
                onSelect={handleSelectMatch}
              />
            ))}
          </div>
        </section>
      )}

      {/* TRẠNG THÁI RỖNG: KHÔNG CÓ TRẬN ĐANG PHÁT LẪN SẮP PHÁT TRONG 60 PHÚT */}
      {liveMatchesList.length === 0 && upcomingMatchesList.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-12 text-center text-gray-400 space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-base font-bold text-gray-200">
            Hiện tại không có trận đấu nào đang phát hoặc sắp diễn ra trong 60 phút tới.
          </p>
          <p className="text-xs text-gray-400">
            Hệ thống sẽ tự động cập nhật ngay khi các trận đấu tâm điểm bước vào khung giờ phát sóng.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}

export default LiveFootballClient;
