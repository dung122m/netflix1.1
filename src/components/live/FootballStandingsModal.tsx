"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Trophy,
  X,
  Sparkles,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Flame,
} from "lucide-react";
import {
  POPULAR_LEAGUES,
  TeamStanding,
  LeagueInfo,
} from "@/services/footballDataService";

interface FootballStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLeagueId?: string;
}

export const FootballStandingsModal: React.FC<FootballStandingsModalProps> = ({
  isOpen,
  onClose,
  defaultLeagueId = "eng.1",
}) => {
  const [activeLeague, setActiveLeague] = useState<string>(defaultLeagueId);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const loadStandings = (leagueId: string) => {
    setLoading(true);
    fetch(`/api/football-standings?league=${encodeURIComponent(leagueId)}`)
      .then((res) => res.json())
      .then((data) => {
        setStandings(data.standings || []);
      })
      .catch((err) => {
        console.error("Lỗi tải bảng xếp hạng:", err);
        setStandings([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      loadStandings(activeLeague);
    }
  }, [isOpen, activeLeague]);

  // Phím ESC đóng modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentLeagueObj =
    POPULAR_LEAGUES.find((l) => l.id === activeLeague) || POPULAR_LEAGUES[0];

  const filteredTeams = standings.filter(
    (t) =>
      t.name.toLowerCase().includes(searchFilter.toLowerCase().trim()) ||
      (t.shortName && t.shortName.toLowerCase().includes(searchFilter.toLowerCase().trim()))
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-zinc-950 rounded-3xl border border-white/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-amber-950/60">
              <Trophy className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Bảng Xếp Hạng & Điểm Số Thể Thao</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600/30 text-rose-300 font-bold border border-red-500/40">
                  LIVE ESPN
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Dữ liệu trực tiếp liên tục từ các giải đấu hàng đầu thế giới
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => loadStandings(activeLeague)}
              title="Làm mới dữ liệu"
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LEAGUE TABS SELECTOR */}
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/60 border-b border-white/10 overflow-x-auto scrollbar-none">
          {POPULAR_LEAGUES.map((league) => {
            const isSelected = activeLeague === league.id;
            return (
              <button
                key={league.id}
                type="button"
                onClick={() => {
                  setActiveLeague(league.id);
                  setSearchFilter("");
                }}
                className={`flex-none px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-950/60 ring-1 ring-white/30"
                    : "bg-zinc-800/80 text-gray-300 hover:text-white hover:bg-zinc-700 border border-white/5"
                }`}
              >
                <span>{league.flag}</span>
                <span>{league.vietnameseName}</span>
              </button>
            );
          })}
        </div>

        {/* SEARCH & CONTROLS */}
        <div className="px-5 py-2.5 bg-zinc-950/90 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Tìm đội bóng trong ${currentLeagueObj.vietnameseName}...`}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Top 4: Cúp C1
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Cúp C2/C3
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Xuống hạng
            </span>
          </div>
        </div>

        {/* STANDINGS TABLE */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-netflix-red" />
              <p className="text-xs font-semibold">Đang cập nhật điểm số từ ESPN...</p>
            </div>
          ) : filteredTeams.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-200 border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-2 text-center w-10">#</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Đội bóng</th>
                    <th className="py-2.5 px-2 text-center" title="Số trận đã đá">Trận</th>
                    <th className="py-2.5 px-2 text-center" title="Thắng">T</th>
                    <th className="py-2.5 px-2 text-center" title="Hòa">H</th>
                    <th className="py-2.5 px-2 text-center" title="Thua">B</th>
                    <th className="py-2.5 px-2 text-center hidden sm:table-cell" title="Bàn thắng">BT</th>
                    <th className="py-2.5 px-2 text-center hidden sm:table-cell" title="Bàn thua">BB</th>
                    <th className="py-2.5 px-2 text-center" title="Hiệu số">HS</th>
                    <th className="py-2.5 px-3 text-center font-black text-amber-400" title="Điểm số">Điểm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredTeams.map((team) => {
                    const isTop4 = team.rank <= 4;
                    const isTop6 = team.rank > 4 && team.rank <= 6;
                    const isRelegation = team.rank >= standings.length - 2 && standings.length > 10;

                    return (
                      <tr
                        key={team.teamId || team.name}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        {/* HẠNG */}
                        <td className="py-2.5 px-2 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-extrabold text-[11px] ${
                              team.rank === 1
                                ? "bg-amber-400 text-black shadow-md shadow-amber-500/50"
                                : isTop4
                                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                                : isTop6
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : isRelegation
                                ? "bg-red-600/20 text-red-400 border border-red-500/30"
                                : "text-gray-400"
                            }`}
                          >
                            {team.rank}
                          </span>
                        </td>

                        {/* ĐỘI BÓNG */}
                        <td className="py-2.5 px-3 font-semibold">
                          <div className="flex items-center gap-2.5">
                            {team.logo ? (
                              <div className="relative w-6 h-6 flex-none">
                                <Image
                                  src={team.logo}
                                  alt={team.name}
                                  fill
                                  sizes="24px"
                                  className="object-contain"
                                />
                              </div>
                            ) : (
                              <Shield className="w-5 h-5 text-gray-500 flex-none" />
                            )}
                            <span className="truncate group-hover:text-white transition-colors font-bold">
                              {team.name}
                            </span>
                          </div>
                        </td>

                        {/* TRẬN / T / H / B */}
                        <td className="py-2.5 px-2 text-center text-gray-300 font-medium">
                          {team.gamesPlayed}
                        </td>
                        <td className="py-2.5 px-2 text-center text-emerald-400 font-medium">
                          {team.wins}
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-400 font-medium">
                          {team.ties}
                        </td>
                        <td className="py-2.5 px-2 text-center text-rose-400 font-medium">
                          {team.losses}
                        </td>

                        {/* BT / BB */}
                        <td className="py-2.5 px-2 text-center text-gray-400 hidden sm:table-cell">
                          {team.goalsFor}
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-400 hidden sm:table-cell">
                          {team.goalsAgainst}
                        </td>

                        {/* HIỆU SỐ */}
                        <td className="py-2.5 px-2 text-center font-semibold text-gray-300">
                          {team.goalDifference}
                        </td>

                        {/* ĐIỂM */}
                        <td className="py-2.5 px-3 text-center">
                          <span className="font-black text-sm text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            {team.points}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center text-gray-400 text-xs">
              Chưa có dữ liệu bảng xếp hạng cho giải đấu này.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FootballStandingsModal;
