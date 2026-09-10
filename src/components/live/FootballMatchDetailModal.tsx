"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Shield,
  MapPin,
  RefreshCw,
  Users,
  Activity,
  BarChart3,
  Search,
} from "lucide-react";
import { MatchSummaryData, TeamLineup, RosterPlayer } from "@/services/footballDataService";

interface FootballMatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  matchTitle?: string;
  onOpenMatchCenter?: () => void;
}

export function FootballMatchDetailModal({
  isOpen,
  onClose,
  eventId,
  matchTitle,
  onOpenMatchCenter,
}: FootballMatchDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"lineup" | "timeline" | "stats">("lineup");
  const [selectedTeamTab, setSelectedTeamTab] = useState<"both" | "home" | "away">("both");
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>("");
  const [data, setData] = useState<MatchSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !eventId) {
      setData(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/football-match-detail?event=${eventId}`);
        const json = await res.json();
        if (!isMounted) return;
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || "Không có thông tin chi tiết cho trận đấu này.");
        }
      } catch {
        if (!isMounted) return;
        setError("Lỗi kết nối khi tải chi tiết trận đấu.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();

    // Tự động làm mới mỗi 30s nếu trận đang LIVE
    const interval = setInterval(() => {
      if (isOpen && eventId) {
        fetchDetail();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, eventId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER TOP BAR */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-gray-200">
              {data?.leagueName || matchTitle || "Chi Tiết Trận Đấu & Danh Sách Cầu Thủ"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {onOpenMatchCenter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMatchCenter();
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
              >
                <span>🌐 Tất cả trận khác</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {loading && !data ? (
          <div className="p-14 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-yellow-400" />
            <p className="text-xs font-semibold">Đang cập nhật danh sách cầu thủ & tỉ số mùa 2026/27...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-gray-400 space-y-4">
            <Shield className="w-10 h-10 mx-auto text-gray-500 opacity-60" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-200">{error}</p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Trận đấu này có thể chưa công bố danh sách hoặc thuộc giải đấu không cung cấp dữ liệu chi tiết.
              </p>
            </div>
            {onOpenMatchCenter && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMatchCenter();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-netflix-red hover:bg-red-700 text-white text-xs font-bold transition shadow-lg shadow-red-950/50 cursor-pointer"
              >
                <span>Mở Trung Tâm Trận Đấu</span>
              </button>
            )}
          </div>
        ) : data ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* SCOREBOARD HERO BANNER */}
            <div className="bg-gradient-to-b from-zinc-900 via-zinc-900/60 to-zinc-950 p-4 sm:p-5 border-b border-white/5">
              <div className="flex items-center justify-between gap-4">
                {/* ĐỘI NHÀ */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 relative mb-1.5 flex items-center justify-center">
                    {data.homeTeam.logo ? (
                      <Image
                        src={data.homeTeam.logo}
                        alt={data.homeTeam.name}
                        width={56}
                        height={56}
                        className="object-contain drop-shadow-md max-h-12 sm:max-h-14"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-black text-sm">
                        {data.homeTeam.shortName?.slice(0, 3) || "HOM"}
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold line-clamp-1 text-gray-100">
                    {data.homeTeam.name}
                  </h4>
                  {data.homeTeam.formation && (
                    <span className="text-[10px] text-gray-400 mt-0.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      Sơ đồ: {data.homeTeam.formation}
                    </span>
                  )}
                </div>

                {/* TỈ SỐ & TRẠNG THÁI */}
                <div className="flex flex-col items-center justify-center px-2 min-w-[110px]">
                  <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black tracking-wider text-white">
                    <span className={data.homeTeam.score > data.awayTeam.score ? "text-yellow-400" : ""}>
                      {data.homeTeam.score}
                    </span>
                    <span className="text-gray-500 font-light text-lg">-</span>
                    <span className={data.awayTeam.score > data.homeTeam.score ? "text-yellow-400" : ""}>
                      {data.awayTeam.score}
                    </span>
                  </div>

                  <span
                    className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      data.isLive
                        ? "bg-red-500 text-white animate-pulse"
                        : data.statusState === "post"
                        ? "bg-white/10 text-gray-300"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                    }`}
                  >
                    {data.clock ? `${data.clock}` : data.statusDetail}
                  </span>

                  {data.venue && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1.5 text-center line-clamp-1 max-w-[180px]">
                      <MapPin className="w-3 h-3 flex-shrink-0 text-gray-500" />
                      <span className="truncate">{data.venue}</span>
                    </div>
                  )}
                </div>

                {/* ĐỘI KHÁCH */}
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 relative mb-1.5 flex items-center justify-center">
                    {data.awayTeam.logo ? (
                      <Image
                        src={data.awayTeam.logo}
                        alt={data.awayTeam.name}
                        width={56}
                        height={56}
                        className="object-contain drop-shadow-md max-h-12 sm:max-h-14"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center font-black text-sm">
                        {data.awayTeam.shortName?.slice(0, 3) || "AWY"}
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold line-clamp-1 text-gray-100">
                    {data.awayTeam.name}
                  </h4>
                  {data.awayTeam.formation && (
                    <span className="text-[10px] text-gray-400 mt-0.5 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      Sơ đồ: {data.awayTeam.formation}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex items-center justify-center gap-1.5 p-2 bg-zinc-900/50 border-b border-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("lineup")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === "lineup"
                    ? "bg-yellow-500 text-black font-bold shadow-md shadow-yellow-950/40"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Danh Sách Cầu Thủ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === "timeline"
                    ? "bg-yellow-500 text-black font-bold shadow-md shadow-yellow-950/40"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Diễn Biến Trận Đấu</span>
                {data.keyEvents.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30">
                    {data.keyEvents.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("stats")}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === "stats"
                    ? "bg-yellow-500 text-black font-bold shadow-md shadow-yellow-950/40"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Thống Kê Trận Đấu</span>
              </button>
            </div>

            {/* NỘI DUNG TỪNG TAB */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
              {/* 1. TAB DANH SÁCH CẦU THỦ 2026/27 */}
              {activeTab === "lineup" && (
                <div className="space-y-4">
                  {/* BỘ LỌC ĐỘI & TÌM KIẾM */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => setSelectedTeamTab("both")}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                          selectedTeamTab === "both"
                            ? "bg-yellow-500 text-black shadow-sm"
                            : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        👥 Cả 2 Đội
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamTab("home")}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                          selectedTeamTab === "home"
                            ? "bg-yellow-500 text-black shadow-sm"
                            : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        🏠 {data.homeTeam.shortName || data.homeTeam.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamTab("away")}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] whitespace-nowrap transition cursor-pointer ${
                          selectedTeamTab === "away"
                            ? "bg-yellow-500 text-black shadow-sm"
                            : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        ✈️ {data.awayTeam.shortName || data.awayTeam.name}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 whitespace-nowrap">
                        ⚡ Mùa Giải 2026/27
                      </span>
                      <div className="relative w-full sm:w-48">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Tìm cầu thủ / số áo..."
                          value={playerSearchQuery}
                          onChange={(e) => setPlayerSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* DANH SÁCH CẦU THỦ THEO TỪNG ĐỘI */}
                  <div
                    className={`grid gap-4 sm:gap-6 ${
                      selectedTeamTab === "both" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {/* ĐỘI NHÀ */}
                    {(selectedTeamTab === "both" || selectedTeamTab === "home") && (
                      <TeamSquadCard
                        teamName={data.homeTeam.name}
                        teamLogo={data.homeTeam.logo}
                        teamShort={data.homeTeam.shortName}
                        lineup={data.lineups.home}
                        isConfirmed={data.isConfirmedLineup}
                        searchQuery={playerSearchQuery}
                      />
                    )}

                    {/* ĐỘI KHÁCH */}
                    {(selectedTeamTab === "both" || selectedTeamTab === "away") && (
                      <TeamSquadCard
                        teamName={data.awayTeam.name}
                        teamLogo={data.awayTeam.logo}
                        teamShort={data.awayTeam.shortName}
                        lineup={data.lineups.away}
                        isConfirmed={data.isConfirmedLineup}
                        searchQuery={playerSearchQuery}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 2. TAB DIỄN BIẾN TRẬN ĐẤU */}
              {activeTab === "timeline" && (
                <div className="space-y-3">
                  {data.keyEvents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">
                      Chưa có bàn thắng hoặc diễn biến nổi bật nào được ghi nhận.
                    </div>
                  ) : (
                    <div className="relative border-l border-white/10 ml-4 space-y-4 py-2">
                      {data.keyEvents.map((event) => {
                        const isGoal = event.category === "goal";
                        const isCard = event.category === "card";
                        const isSub = event.category === "sub";

                        return (
                          <div key={event.id} className="relative pl-6">
                            {/* ICON MỐC THỜI GIAN */}
                            <span
                              className={`absolute -left-2.5 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-md ${
                                isGoal
                                  ? "bg-emerald-500 text-black font-black"
                                  : isCard
                                  ? "bg-amber-500 text-black"
                                  : isSub
                                  ? "bg-sky-500 text-white"
                                  : "bg-zinc-700 text-gray-300"
                              }`}
                            >
                              {isGoal ? "⚽" : isCard ? "🟨" : isSub ? "🔄" : "⏱️"}
                            </span>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-bold text-yellow-400">
                                  {event.clock ? `${event.clock}` : event.type}
                                </span>
                                {event.teamName && (
                                  <span className="text-[11px] text-gray-400 font-semibold">
                                    {event.teamName}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-200 leading-relaxed">
                                {event.text || event.type}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 3. TAB THỐNG KÊ */}
              {activeTab === "stats" && (
                <div className="space-y-4">
                  {data.statistics.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-xs">
                      Chưa có dữ liệu thống kê chi tiết cho trận đấu này.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.statistics.map((stat, idx) => (
                        <div
                          key={idx}
                          className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-200">{stat.homeValue}</span>
                            <span className="text-[11px] font-semibold text-gray-400">
                              {stat.label}
                            </span>
                            <span className="font-bold text-gray-200">{stat.awayValue}</span>
                          </div>

                          {/* THANH SO SÁNH TRỰC QUAN */}
                          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800">
                            <div
                              className="bg-yellow-500 transition-all duration-500"
                              style={{ width: `${stat.homePercent ?? 50}%` }}
                            />
                            <div
                              className="bg-sky-500 transition-all duration-500"
                              style={{ width: `${stat.awayPercent ?? 50}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SUB-COMPONENT: THẺ DANH SÁCH LỰC LƯỢNG CỦA 1 CLB
// ----------------------------------------------------
interface TeamSquadCardProps {
  teamName: string;
  teamLogo?: string;
  teamShort?: string;
  lineup: TeamLineup;
  isConfirmed?: boolean;
  searchQuery?: string;
}

function TeamSquadCard({
  teamName,
  teamLogo,
  teamShort,
  lineup,
  isConfirmed,
  searchQuery = "",
}: TeamSquadCardProps) {
  const grouped = lineup.grouped || {
    goalkeepers: [],
    defenders: [],
    midfielders: [],
    forwards: [],
    total: 0,
  };

  const filterList = (list: RosterPlayer[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.jersey.includes(q) ||
        p.position.toLowerCase().includes(q)
    );
  };

  const gks = filterList(grouped.goalkeepers);
  const defs = filterList(grouped.defenders);
  const mids = filterList(grouped.midfielders);
  const fwds = filterList(grouped.forwards);
  const totalCount = gks.length + defs.length + mids.length + fwds.length;

  return (
    <div className="bg-zinc-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col space-y-4">
      {/* HEADER CLB */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {teamLogo ? (
            <Image
              src={teamLogo}
              alt={teamName}
              width={28}
              height={28}
              className="object-contain max-h-7"
              unoptimized
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">
              {teamShort?.slice(0, 3) || "CLB"}
            </div>
          )}
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">{teamName}</h4>
            <span className="text-[10px] text-gray-400">
              {isConfirmed ? "Đội hình chính thức" : "Lực lượng mùa giải 2026/27"} ({totalCount} cầu thủ)
            </span>
          </div>
        </div>

        {lineup.formation && (
          <span className="text-[10px] font-semibold text-yellow-400/90 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20">
            {lineup.formation}
          </span>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="py-8 text-center text-gray-500 text-xs">
          {searchQuery
            ? "Không tìm thấy cầu thủ phù hợp với từ khóa tìm kiếm."
            : "Đang cập nhật danh sách cầu thủ của đội bóng..."}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. THỦ MÔN */}
          {gks.length > 0 && (
            <PositionGroupSection
              title="Thủ Môn"
              icon="🧤"
              count={gks.length}
              accentColor="emerald"
              players={gks}
              isConfirmed={isConfirmed}
            />
          )}

          {/* 2. HẬU VỆ */}
          {defs.length > 0 && (
            <PositionGroupSection
              title="Hậu Vệ"
              icon="🛡️"
              count={defs.length}
              accentColor="sky"
              players={defs}
              isConfirmed={isConfirmed}
            />
          )}

          {/* 3. TIỀN VỆ */}
          {mids.length > 0 && (
            <PositionGroupSection
              title="Tiền Vệ"
              icon="⚙️"
              count={mids.length}
              accentColor="amber"
              players={mids}
              isConfirmed={isConfirmed}
            />
          )}

          {/* 4. TIỀN ĐẠO */}
          {fwds.length > 0 && (
            <PositionGroupSection
              title="Tiền Đạo"
              icon="⚡"
              count={fwds.length}
              accentColor="rose"
              players={fwds}
              isConfirmed={isConfirmed}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// SUB-COMPONENT: NHÓM VỊ TRÍ (GK, DEF, MID, FWD)
// ----------------------------------------------------
interface PositionGroupSectionProps {
  title: string;
  icon: string;
  count: number;
  accentColor: "emerald" | "sky" | "amber" | "rose";
  players: RosterPlayer[];
  isConfirmed?: boolean;
}

function PositionGroupSection({
  title,
  icon,
  count,
  accentColor,
  players,
  isConfirmed,
}: PositionGroupSectionProps) {
  const colorStyles = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
            {title}
          </span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${colorStyles[accentColor]}`}
          >
            {count}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {players.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2.5 p-2 rounded-xl bg-black/30 border border-white/5 hover:border-white/20 hover:bg-white/5 transition group"
          >
            {/* Ảnh đại diện / Avatar */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-white/10">
              {p.headshot ? (
                <Image
                  src={p.headshot}
                  alt={p.name}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-[10px] font-black text-gray-400">
                  {p.jersey !== "-" ? p.jersey : p.name.charAt(0)}
                </span>
              )}
            </div>

            {/* Thông tin cầu thủ */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black font-mono text-yellow-400/90 flex-shrink-0">
                  #{p.jersey !== "-" ? p.jersey : "•"}
                </span>
                <span className="text-xs font-semibold text-gray-200 truncate group-hover:text-yellow-400 transition">
                  {p.name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                <span className="truncate">{p.position || title}</span>
                {isConfirmed && p.starter && (
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1 rounded flex-shrink-0">
                    Đá chính
                  </span>
                )}
                {p.subbedOut && (
                  <span className="text-[9px] text-rose-400 font-semibold flex-shrink-0">
                    (Ra sân)
                  </span>
                )}
                {p.subbedIn && (
                  <span className="text-[9px] text-emerald-400 font-semibold flex-shrink-0">
                    (Vào sân)
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FootballMatchDetailModal;
