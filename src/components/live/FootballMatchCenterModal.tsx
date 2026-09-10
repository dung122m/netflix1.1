"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  X,
  Search,
  RefreshCw,
  Trophy,
  Users,
  Activity,
  Calendar,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  POPULAR_LEAGUES,
  LiveScoreboardMatch,
} from "@/services/footballDataService";
import { FootballMatchDetailModal } from "./FootballMatchDetailModal";

interface FootballMatchCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLeague?: string;
}

export function FootballMatchCenterModal({
  isOpen,
  onClose,
  initialLeague = "eng.1",
}: FootballMatchCenterModalProps) {
  const [selectedLeague, setSelectedLeague] = useState<string>(initialLeague);
  const [matches, setMatches] = useState<LiveScoreboardMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");

  const fetchScoreboard = async (leagueId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/football-scoreboard?league=${leagueId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMatches(json.data);
      } else {
        setMatches([]);
      }
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScoreboard(selectedLeague);
    }
  }, [isOpen, selectedLeague]);

  // Auto-refresh scoreboard every 30s
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      fetchScoreboard(selectedLeague);
    }, 30000);
    return () => clearInterval(interval);
  }, [isOpen, selectedLeague]);

  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const q = searchQuery.toLowerCase().trim();
    return matches.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q)
    );
  }, [matches, searchQuery]);

  const liveMatches = useMemo(
    () => filteredMatches.filter((m) => m.isLive),
    [filteredMatches]
  );
  const otherMatches = useMemo(
    () => filteredMatches.filter((m) => !m.isLive),
    [filteredMatches]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-zinc-950/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-netflix-red border border-red-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-wide flex items-center gap-2">
                <span>Trung Tâm Trận Đấu & Tỉ Số Realtime</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Scores & Lineups
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Cập nhật tỉ số trực tiếp, đội hình ra sân chính thức & thống kê trận đấu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LEAGUE SELECTOR TABS & SEARCH */}
        <div className="p-3 sm:p-4 bg-zinc-900/50 border-b border-white/10 space-y-3">
          {/* TABS CÁC GIẢI ĐẤU */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {POPULAR_LEAGUES.map((league) => (
              <button
                key={league.id}
                type="button"
                onClick={() => {
                  setSelectedLeague(league.id);
                  setSearchQuery("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedLeague === league.id
                    ? "bg-netflix-red text-white shadow-md shadow-red-950/50 scale-102"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{league.flag}</span>
                <span>{league.vietnameseName}</span>
              </button>
            ))}
          </div>

          {/* THANH TÌM KIẾM & NÚT LÀM MỚI */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm câu lạc bộ, tên trận đấu..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchScoreboard(selectedLeague)}
              disabled={loading}
              title="Làm mới tỉ số"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-yellow-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* DANH SÁCH TRẬN ĐẤU */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
          {loading && matches.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-yellow-400" />
              <p className="text-xs font-semibold">Đang cập nhật lịch thi đấu & tỉ số trực tiếp...</p>
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="p-12 text-center text-gray-400 space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-gray-600" />
              <p className="text-xs font-semibold">
                Không có trận đấu nào trong vòng này hoặc không tìm thấy kết quả.
              </p>
            </div>
          ) : (
            <>
              {/* TRẬN ĐANG LIVE */}
              {liveMatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>Đang thi đấu trực tiếp ({liveMatches.length})</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {liveMatches.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedEventId(m.id);
                          setSelectedEventTitle(m.name);
                        }}
                        className="bg-gradient-to-r from-red-950/30 via-zinc-900 to-zinc-900 border border-red-500/30 hover:border-red-500/60 rounded-xl p-3.5 transition cursor-pointer hover:scale-[1.01] group shadow-lg shadow-red-950/20"
                      >
                        <div className="flex items-center justify-between text-[11px] mb-2.5 pb-2 border-b border-white/5">
                          <span className="text-xs font-bold text-red-400 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {m.clock ? `${m.clock}` : m.statusDetail}
                          </span>
                          <span className="text-gray-400 group-hover:text-yellow-400 transition text-[11px] flex items-center gap-0.5">
                            Xem đội hình & diễn biến
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          {/* ĐỘI NHÀ */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center">
                              {m.homeTeam.logo ? (
                                <Image
                                  src={m.homeTeam.logo}
                                  alt={m.homeTeam.name}
                                  width={32}
                                  height={32}
                                  className="object-contain max-h-8"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
                                  {m.homeTeam.shortName?.slice(0, 3)}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-bold text-gray-100 truncate">
                              {m.homeTeam.name}
                            </span>
                          </div>

                          {/* TỈ SỐ */}
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/5 font-black text-sm text-yellow-400">
                            <span>{m.homeTeam.score}</span>
                            <span className="text-gray-600 font-light">-</span>
                            <span>{m.awayTeam.score}</span>
                          </div>

                          {/* ĐỘI KHÁCH */}
                          <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-100 truncate text-right">
                              {m.awayTeam.name}
                            </span>
                            <div className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center">
                              {m.awayTeam.logo ? (
                                <Image
                                  src={m.awayTeam.logo}
                                  alt={m.awayTeam.name}
                                  width={32}
                                  height={32}
                                  className="object-contain max-h-8"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
                                  {m.awayTeam.shortName?.slice(0, 3)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TẤT CẢ TRẬN KHÁC (SẮP ĐÁ / ĐÃ KẾT THÚC) */}
              <div className="space-y-2">
                {liveMatches.length > 0 && (
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">
                    Lịch thi đấu & Kết quả ({otherMatches.length})
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {otherMatches.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedEventId(m.id);
                        setSelectedEventTitle(m.name);
                      }}
                      className="bg-zinc-900/60 border border-white/5 hover:border-white/20 rounded-xl p-3.5 transition cursor-pointer hover:scale-[1.01] group"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-2.5 pb-2 border-b border-white/5">
                        <span
                          className={`font-semibold ${
                            m.statusState === "post"
                              ? "text-gray-400"
                              : "text-sky-400"
                          }`}
                        >
                          {m.statusDetail}
                        </span>
                        <span className="text-gray-500 group-hover:text-gray-300 transition text-[11px] flex items-center gap-0.5">
                          Xem chi tiết
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        {/* ĐỘI NHÀ */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center">
                            {m.homeTeam.logo ? (
                              <Image
                                src={m.homeTeam.logo}
                                alt={m.homeTeam.name}
                                width={32}
                                height={32}
                                className="object-contain max-h-8"
                                unoptimized
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
                                {m.homeTeam.shortName?.slice(0, 3)}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-bold text-gray-200 truncate">
                            {m.homeTeam.name}
                          </span>
                        </div>

                        {/* TỈ SỐ / VS */}
                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 border border-white/5 font-bold text-xs">
                          {m.statusState === "post" ? (
                            <span className="text-white font-black">
                              {m.homeTeam.score} - {m.awayTeam.score}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-mono">VS</span>
                          )}
                        </div>

                        {/* ĐỘI KHÁCH */}
                        <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-200 truncate text-right">
                            {m.awayTeam.name}
                          </span>
                          <div className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center">
                            {m.awayTeam.logo ? (
                              <Image
                                src={m.awayTeam.logo}
                                alt={m.awayTeam.name}
                                width={32}
                                height={32}
                                className="object-contain max-h-8"
                                unoptimized
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-[10px]">
                                {m.awayTeam.shortName?.slice(0, 3)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL CHI TIẾT TRẬN ĐẤU (ĐỘI HÌNH, SƠ ĐỒ, DIỄN BIẾN) */}
        <FootballMatchDetailModal
          isOpen={!!selectedEventId}
          onClose={() => setSelectedEventId(null)}
          eventId={selectedEventId}
          matchTitle={selectedEventTitle}
        />
      </div>
    </div>
  );
}

export default FootballMatchCenterModal;
