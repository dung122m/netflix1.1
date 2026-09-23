"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Film,
  Clock,
  CheckCircle2,
  Sparkles,
  Globe,
  Trophy,
  Compass,
  ArrowRight,
  TrendingUp,
  History,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchUserStats,
  UserStatsData,
  NanaflixWrappedData,
} from "@/services/statsService";
import { StatsTimeRange } from "@/app/api/user/stats/route";
import { NanaflixWrappedModal } from "./NanaflixWrappedModal";

const TIME_RANGE_TABS: Array<{ id: StatsTimeRange; label: string }> = [
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
  { id: "90d", label: "3 tháng" },
  { id: "2026", label: "Năm 2026" },
  { id: "all", label: "Tất cả" },
];

export const MyStatsClient: React.FC = () => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<StatsTimeRange>("all");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [wrapped, setWrapped] = useState<NanaflixWrappedData | null>(null);
  const [showWrappedModal, setShowWrappedModal] = useState(false);

  const loadStats = useCallback(async (range: StatsTimeRange) => {
    setLoading(true);
    const res = await fetchUserStats(range);
    if (res && res.success) {
      setStats(res.stats);
      setWrapped(res.wrapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats(selectedRange);
  }, [selectedRange, loadStats]);

  const displayName = user?.displayName || "Bạn";

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Thống Kê Xem Phim
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Tổng kết thói quen giải trí, thể loại và quốc gia yêu thích của {displayName}
          </p>
        </div>

        {/* NÚT MỞ NANAFLIX WRAPPED */}
        {wrapped && wrapped.totalMovies > 0 && (
          <button
            type="button"
            onClick={() => setShowWrappedModal(true)}
            className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:opacity-95 active:scale-95 text-white text-xs sm:text-sm font-black shadow-xl shadow-rose-950/60 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
            <span>Khám Phá Nanaflix Wrapped</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TIME_RANGE_TABS.map((tab) => {
          const isActive = selectedRange === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRange(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 ${
                isActive
                  ? "bg-white text-black shadow-lg shadow-white/10 scale-105"
                  : "bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* STATS CONTENT */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-zinc-900/70 border border-white/5"
            />
          ))}
        </div>
      ) : !stats || stats.totalMovies === 0 ? (
        /* EMPTY STATE */
        <div className="py-16 text-center space-y-4 rounded-3xl bg-zinc-950/70 border border-white/10 p-6">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
            <History className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Chưa có dữ liệu xem trong khoảng thời gian này</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Hãy thưởng thức những bộ phim đặc sắc trên Nanaflix để hệ thống tự động ghi nhận thống kê và mở khóa Wrapped cho bạn!
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-xs transition"
          >
            <Compass className="w-4 h-4" />
            <span>Khám Phá Phim Ngay</span>
          </Link>
        </div>
      ) : (
        /* STATS GRIDS */
        <div className="space-y-8 animate-fade-in">
          {/* 1. TOP CARDS OVERVIEW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* CARD 1: TỔNG SỐ PHIM */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Phim Đã Xem</span>
                <Film className="w-4 h-4 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.totalMovies}
                </span>
                <span className="text-xs text-zinc-500 font-medium">bộ phim</span>
              </div>
              <p className="text-[11px] text-zinc-400">{stats.totalEpisodes} lượt phát tập</p>
            </div>

            {/* CARD 2: TỔNG THỜI GIAN XEM */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Thời Gian Xem</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.totalHours}
                </span>
                <span className="text-xs text-zinc-500 font-medium">giờ</span>
              </div>
              <p className="text-[11px] text-zinc-400">≈ {stats.totalMinutes} phút thư giãn</p>
            </div>

            {/* CARD 3: HOÀN THÀNH */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Tập Hoàn Thành</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {stats.completedCount}
                </span>
                <span className="text-xs text-zinc-500 font-medium">tập</span>
              </div>
              <p className="text-[11px] text-zinc-400">Xem trên 85% thời lượng</p>
            </div>

            {/* CARD 4: GU #1 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 space-y-2 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold">Thể Loại #1</span>
                <Trophy className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="truncate">
                <span className="text-xl sm:text-2xl font-black text-amber-300 truncate">
                  {stats.topGenres[0]?.name || "Đa dạng"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {stats.topGenres[0] ? `${stats.topGenres[0].count} lượt xem` : "Đang cập nhật"}
              </p>
            </div>
          </div>

          {/* 2. CHI TIẾT THỂ LOẠI & QUỐC GIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* TOP THỂ LOẠI */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-rose-400" />
                <h3 className="text-base font-bold text-white">Top Thể Loại Bạn Xem Nhiều</h3>
              </div>
              <div className="space-y-3">
                {stats.topGenres.length === 0 ? (
                  <p className="text-xs text-zinc-500">Chưa có dữ liệu thể loại</p>
                ) : (
                  stats.topGenres.map((item, idx) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200">
                          #{idx + 1} {item.name}
                        </span>
                        <span className="text-zinc-400 font-medium">
                          {item.count} phim ({item.percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
                          style={{ width: `${Math.min(100, Math.max(8, item.percent))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TOP QUỐC GIA */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Top Quốc Gia Yêu Thích</h3>
              </div>
              <div className="space-y-3">
                {stats.topCountries.length === 0 ? (
                  <p className="text-xs text-zinc-500">Chưa có dữ liệu quốc gia</p>
                ) : (
                  stats.topCountries.map((item, idx) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-200">
                          #{idx + 1} {item.name}
                        </span>
                        <span className="text-zinc-400 font-medium">
                          {item.count} phim ({item.percent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${Math.min(100, Math.max(8, item.percent))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3. LOẠI PHIM & KHUNG GIỜ XEM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* ĐỊNH DẠNG XEM */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">Tỷ Lệ Loại Phim</h3>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {stats.topTypes.map((item) => (
                  <div
                    key={item.name}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1"
                  >
                    <p className="text-xs text-zinc-400 truncate">{item.name}</p>
                    <p className="text-lg font-black text-white">{item.count} <span className="text-xs text-zinc-500 font-normal">lượt</span></p>
                    <span className="text-[10px] font-bold text-amber-400">
                      {item.percent}% tổng số
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* THÓI QUEN KHUNG GIỜ */}
            <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-white/10 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Thói Quen Khung Giờ</h3>
              </div>
              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">☀️ Buổi sáng (05:00 - 12:00)</span>
                  <span className="text-xs font-bold text-white">{stats.timeSlots.morning} lượt</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">🌤 Buổi chiều (12:00 - 18:00)</span>
                  <span className="text-xs font-bold text-white">{stats.timeSlots.afternoon} lượt</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">🍿 Buổi tối (18:00 - 23:00)</span>
                  <span className="text-xs font-bold text-white">{stats.timeSlots.evening} lượt</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-zinc-300">🌙 Cú đêm (23:00 - 05:00)</span>
                  <span className="text-xs font-bold text-white">{stats.timeSlots.night} lượt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WRAPPED MODAL */}
      <NanaflixWrappedModal
        isOpen={showWrappedModal}
        onClose={() => setShowWrappedModal(false)}
        wrappedData={wrapped}
        userName={displayName}
      />
    </div>
  );
};

export default MyStatsClient;
