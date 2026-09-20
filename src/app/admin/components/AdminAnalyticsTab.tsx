"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Eye,
  Users,
  Clock,
  Radio,
  Smartphone,
  Monitor,
  Tablet,
  Search,
  RefreshCw,
  TrendingUp,
  Activity,
  Globe,
  Compass,
  Star,
  Info,
} from "lucide-react";
import { AnalyticsDashboardStats } from "@/services/analyticsService";
import { toast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";

interface AdminAnalyticsTabProps {
  metrics: {
    avgScore: number;
    totalRatingReviews: number;
    starDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  adminEmail?: string | null;
  totalMembersCount: number;
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({
  metrics,
  adminEmail,
  totalMembersCount,
}) => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<"today" | "7d" | "30d" | "all">("today");
  const [stats, setStats] = useState<AnalyticsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async (tf: "today" | "7d" | "30d" | "all", showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const idToken = await user?.getIdToken().catch(() => null);
      const res = await fetch(`/api/analytics/stats?timeframe=${tf}`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data) {
        setStats(data.data);
        if (showToast) {
          toast.success("Đã làm mới dữ liệu phân tích số liệu!");
        }
      }
    } catch {
      if (showToast) {
        toast.error("Không thể tải dữ liệu phân tích!");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchStats(timeframe);
  }, [timeframe, fetchStats]);

  // Format seconds to hours and minutes
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0 phút";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} phút`;
  };

  // Format event date
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • ${d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "movie_view":
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold">Mở trang phim</span>;
      case "watch_start":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">Bắt đầu xem</span>;
      case "watch_progress":
        return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold">Đang xem</span>;
      case "watch_end":
        return <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold">Xem xong tập</span>;
      case "search":
        return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-bold">Tìm kiếm</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-zinc-700 text-gray-300 text-[10px]">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* TIMEFRAME FILTER & REFRESH BAR */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 font-semibold mr-1">Khoảng thời gian:</span>
          {(
            [
              { id: "today", label: "Hôm nay (Today)" },
              { id: "7d", label: "7 ngày qua" },
              { id: "30d", label: "30 ngày qua" },
              { id: "all", label: "Toàn bộ (All time)" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeframe(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                timeframe === t.id
                  ? "bg-netflix-red text-white shadow-md shadow-red-950/50"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => fetchStats(timeframe, true)}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition border border-white/10 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>{isRefreshing ? "Đang đồng bộ..." : "Làm mới số liệu"}</span>
        </button>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Views */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Tổng Lượt Xem Phim</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Eye size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
            {loading ? "..." : (stats?.totalViews || 0).toLocaleString("vi-VN")}
          </div>
          <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
            <span className="text-blue-400 font-medium">Chống trùng lặp 30 phút:</span>
            <span>1 người / 1 phim / 30m</span>
          </p>
        </div>

        {/* Unique Viewers */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Khán Giả Độc Nhất</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 flex items-baseline gap-2 group-hover:scale-105 transition-transform origin-left">
            <span>{loading ? "..." : stats?.uniqueViewers.total || 0}</span>
            <span className="text-xs font-normal text-gray-400">người</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
              👤 {stats?.uniqueViewers.loggedIn || 0} User
            </span>
            <span>•</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-gray-300 font-semibold">
              🎭 {stats?.uniqueViewers.guests || 0} Guest
            </span>
          </div>
        </div>

        {/* Total Watch Time */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Tổng Thời Gian Xem</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 group-hover:scale-105 transition-transform origin-left">
            {loading ? "..." : formatDuration(stats?.totalWatchTimeSeconds || 0)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Ghi nhận tiến trình thực tế của khán giả
          </p>
        </div>

        {/* Active Guests Online */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Khách Đang Trực Tuyến</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Radio size={18} className="animate-pulse" />
            </div>
          </div>
          <div className="text-3xl font-black text-white flex items-baseline gap-2 group-hover:scale-105 transition-transform origin-left">
            <span>{loading ? "..." : stats?.activeGuestsCount || 0}</span>
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Khách (30 phút qua)
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Khách vãng lai hoạt động gần đây
          </p>
        </div>
      </div>

      {/* ROW: TOP MOVIES & WATCHING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Movies by Views */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-netflix-red" />
              <span>Top Phim Theo Lượt Xem</span>
            </h3>
            <span className="text-xs text-gray-400">Xếp hạng cao nhất</span>
          </div>

          {!stats?.topMoviesByViews || stats.topMoviesByViews.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 text-gray-400 text-xs">
              Chưa có lượt xem nào được ghi nhận trong khoảng thời gian này.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.topMoviesByViews.map((m, idx) => (
                <div
                  key={m.slug}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        idx === 0
                          ? "bg-amber-400 text-black font-bold"
                          : idx === 1
                          ? "bg-zinc-300 text-black font-bold"
                          : idx === 2
                          ? "bg-amber-700 text-white font-bold"
                          : "bg-white/10 text-gray-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Link
                      href={`/movies/${m.slug}`}
                      target="_blank"
                      className="text-xs font-bold text-white hover:text-netflix-red truncate transition"
                    >
                      {m.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-black text-white font-mono">
                      {m.views.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400">views</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Movies by Unique Viewers */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              <span>Top Phim Theo Khán Giả Độc Nhất</span>
            </h3>
            <span className="text-xs text-gray-400">Unique Viewers</span>
          </div>

          {!stats?.topMoviesByUnique || stats.topMoviesByUnique.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 text-gray-400 text-xs">
              Chưa có dữ liệu người xem độc nhất.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.topMoviesByUnique.map((m, idx) => (
                <div
                  key={m.slug}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                        idx === 0
                          ? "bg-emerald-400 text-black font-bold"
                          : idx === 1
                          ? "bg-teal-300 text-black font-bold"
                          : idx === 2
                          ? "bg-teal-700 text-white font-bold"
                          : "bg-white/10 text-gray-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Link
                      href={`/movies/${m.slug}`}
                      target="_blank"
                      className="text-xs font-bold text-white hover:text-emerald-400 truncate transition"
                    >
                      {m.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      {m.uniqueViewers.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400">khán giả</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROW: DEVICES & SEARCHES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Monitor size={16} className="text-blue-400" />
            <span>Thiết Bị Truy Cập</span>
          </h3>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
              <Monitor size={18} className="text-blue-400 mx-auto mb-1.5" />
              <span className="text-[11px] text-gray-400 block">Desktop</span>
              <span className="text-base font-black text-white font-mono mt-0.5 block">
                {stats?.devices.desktop || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
              <Smartphone size={18} className="text-emerald-400 mx-auto mb-1.5" />
              <span className="text-[11px] text-gray-400 block">Mobile</span>
              <span className="text-base font-black text-white font-mono mt-0.5 block">
                {stats?.devices.mobile || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-center">
              <Tablet size={18} className="text-purple-400 mx-auto mb-1.5" />
              <span className="text-[11px] text-gray-400 block">Tablet</span>
              <span className="text-base font-black text-white font-mono mt-0.5 block">
                {stats?.devices.tablet || 0}
              </span>
            </div>
          </div>

          {/* OS Breakdown */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <span className="text-[11px] text-gray-400 font-semibold block">Hệ điều hành phổ biến</span>
            {stats?.osList && stats.osList.length > 0 ? (
              <div className="space-y-1.5">
                {stats.osList.slice(0, 4).map((os) => (
                  <div key={os.name} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{os.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-gray-400">{os.count}</span>
                      <span className="text-xs text-white font-bold w-10 text-right">
                        {os.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Chưa có dữ liệu hệ điều hành.</p>
            )}
          </div>
        </div>

        {/* Browser Breakdown */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe size={16} className="text-cyan-400" />
            <span>Trình Duyệt Sử Dụng</span>
          </h3>

          {stats?.browserList && stats.browserList.length > 0 ? (
            <div className="space-y-3 pt-1">
              {stats.browserList.slice(0, 5).map((b) => (
                <div key={b.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 flex items-center gap-1.5">
                      {b.name === "Safari" ? (
                        <Compass size={13} className="text-blue-400" />
                      ) : (
                        <Globe size={13} className={b.name === "Chrome" ? "text-amber-400" : "text-gray-400"} />
                      )}
                      <span>{b.name}</span>
                    </span>
                    <span className="text-gray-400 font-mono text-[11px]">
                      {b.count} ({b.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-black/50 overflow-hidden border border-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                      style={{ width: `${Math.max(b.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Chưa có dữ liệu trình duyệt.</p>
          )}
        </div>

        {/* Top Search Keywords */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search size={16} className="text-rose-400" />
              <span>Từ Khóa Tìm Kiếm Hot</span>
            </h3>
            <span className="text-xs text-gray-400">Search Queries</span>
          </div>

          {!stats?.topSearches || stats.topSearches.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 text-gray-400 text-xs">
              Chưa có lượt tìm kiếm nào được ghi nhận.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {stats.topSearches.map((s) => (
                <div
                  key={s.keyword}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs"
                >
                  <span className="text-gray-200 font-medium">{s.keyword}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-amber-400" />
            <span>Nhật Ký Hoạt Động Gần Đây (Live Recent Activity Feed)</span>
          </h3>
          <span className="text-xs text-gray-400">30 sự kiện mới nhất</span>
        </div>

        {!stats?.recentActivity || stats.recentActivity.length === 0 ? (
          <div className="p-10 text-center rounded-xl bg-black/40 border border-white/5 text-gray-400 text-xs">
            Chưa có sự kiện nào gần đây. Hãy mở xem phim hoặc tìm kiếm để thử nghiệm!
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-x-auto">
            {stats.recentActivity.map((ev) => (
              <div
                key={ev.id}
                className="py-3 px-2 flex items-center justify-between gap-4 text-xs hover:bg-white/[0.02] transition rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0">{getEventBadge(ev.eventType)}</div>
                  <div className="truncate">
                    <span className="font-bold text-white">
                      {ev.movieTitle || ev.keyword || ev.movieSlug || "Nanaflix"}
                    </span>
                    {ev.episodeName && (
                      <span className="text-gray-400 ml-1.5">({ev.episodeName})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-shrink-0">
                  {ev.userId ? (
                    <span className="text-emerald-400 font-semibold">User: {ev.userId.slice(0, 8)}...</span>
                  ) : (
                    <span className="text-gray-400 font-mono">Guest ({ev.anonymousId?.slice(5, 11)})</span>
                  )}
                  <span>•</span>
                  <span>{ev.deviceType} / {ev.os}</span>
                  <span>•</span>
                  <span className="text-gray-500 font-mono">{formatTime(ev.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SYSTEM DIAGNOSTICS & RATINGS (PRESERVED FROM PREVIOUS DASHBOARD) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/10">
        {/* Rating Distribution Chart */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Star size={16} className="text-amber-400 fill-amber-400" />
              <span>Phân Bổ Điểm Số Đánh Giá Toàn Hệ Thống</span>
            </h3>
            <span className="text-xs text-amber-400 font-bold">
              {metrics.avgScore} / 5.0 ⭐
            </span>
          </div>

          <div className="space-y-2.5 pt-2">
            {[5, 4, 3, 2, 1].map((s) => {
              const count = metrics.starDistribution[s as 1 | 2 | 3 | 4 | 5] || 0;
              const percent =
                metrics.totalRatingReviews > 0
                  ? Math.round((count / metrics.totalRatingReviews) * 100)
                  : 0;

              return (
                <div key={s} className="flex items-center gap-3 text-xs">
                  <span className="w-12 text-gray-400 font-bold">{s} sao:</span>
                  <div className="flex-1 h-3 rounded-full bg-black/60 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        s >= 4 ? "bg-amber-400" : s === 3 ? "bg-blue-400" : "bg-red-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-gray-300 font-mono">
                    {count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Info size={16} className="text-blue-400" />
            <span>Trạng Thái Hệ Thống & Phân Quyền</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-gray-400">Tài khoản Quản trị viên:</span>
              <span className="font-mono font-bold text-white">{adminEmail || "Chưa rõ"}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-gray-400">Cơ sở dữ liệu Supabase:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Hoạt động bình thường
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-gray-400">Bộ đệm Upstash Redis:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Đang kết nối (Dedup & Counters)
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5">
              <span className="text-gray-400">Tổng thành viên ghi nhận:</span>
              <span className="text-gray-200 font-mono font-bold">{totalMembersCount} người</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
