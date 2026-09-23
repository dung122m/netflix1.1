"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Film,
  BarChart2,
  MapPin,
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

  const filteredRecentActivity = useMemo(() => {
    const allowedTypes = new Set(["site_visit", "movie_view", "watch_start", "watch_end", "search"]);
    return (stats?.recentActivity || []).filter((ev) => allowedTypes.has(ev.eventType));
  }, [stats?.recentActivity]);

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
    // Skip fetch until Firebase auth has resolved to a real user.
    // Without this guard the effect fires once with user=null (→ 401, wasted request)
    // and then again after auth hydration, causing a duplicate request on every mount.
    if (!user) return;
    setLoading(true);
    fetchStats(timeframe);
  }, [timeframe, fetchStats, user]);

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
      case "site_visit":
        return <span className="px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold">Truy cập website</span>;
      case "movie_view":
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold">Mở trang phim</span>;
      case "watch_start":
        return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">Bắt đầu xem</span>;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

        {/* Today Visitors */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Lượt Truy Cập Hôm Nay</span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <MapPin size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-violet-400 flex items-baseline gap-2 group-hover:scale-105 transition-transform origin-left">
            <span>{loading ? "..." : stats?.todayVisitorsCount ?? 0}</span>
            <span className="text-xs font-normal text-gray-400">lượt truy cập độc nhất</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            Unique visitors hôm nay — User + Guest (site_visit)
          </p>
        </div>
      </div>

      {/* SECTION: ĐANG XEM (LIVE WATCHING) */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Film size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Đang Xem (Live Watching)</span>
                {stats?.liveWatching && stats.liveWatching.filter((s) => s.isLive).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {stats.liveWatching.filter((s) => s.isLive).length} trực tiếp
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-400">
                Phiên phát phim thời gian thực từ dữ liệu tiếp tục xem đa thiết bị
              </p>
            </div>
          </div>
          <span className="text-xs text-gray-400">
            {stats?.liveWatching?.length || 0} phiên ghi nhận
          </span>
        </div>

        {!stats?.liveWatching || stats.liveWatching.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-black/40 border border-white/5 text-gray-400 text-xs">
            Hiện chưa có thành viên nào đang phát phim.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.liveWatching.map((session) => (
              <div
                key={`${session.userId}-${session.movieSlug}`}
                className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition space-y-3 flex flex-col justify-between"
              >
                {/* User & Status Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-netflix-red flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden border border-white/10 flex-shrink-0">
                      {session.userAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={session.userAvatar}
                          alt={session.userName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(session.userName || "U")[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {session.userName}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {session.userEmail || session.userId.slice(0, 10)}
                      </div>
                    </div>
                  </div>

                  {session.isLive ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5 flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      🟢 Đang xem
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-gray-400 border border-white/10 text-[10px] font-medium flex items-center gap-1 flex-shrink-0">
                      <Clock size={10} />
                      Tạm dừng
                    </span>
                  )}
                </div>

                {/* Movie & Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/movies/${session.movieSlug}`}
                      target="_blank"
                      className="text-xs font-bold text-white hover:text-netflix-red truncate transition"
                    >
                      {session.movieTitle}
                    </Link>
                    {session.episodeName && (
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        {session.episodeName}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        session.isLive
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-netflix-red to-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, session.progressPercent))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>
                      {session.durationSeconds > 0 ? (
                        <>
                          {formatDuration(session.progressSeconds)} / {formatDuration(session.durationSeconds)}
                        </>
                      ) : (
                        <>Đã xem: {formatDuration(session.progressSeconds)}</>
                      )}
                    </span>
                    <span className="font-bold text-white">{session.progressPercent}%</span>
                  </div>
                </div>

                {/* Device & Timestamp Footer */}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
                  <span className="flex items-center gap-1">
                    {session.deviceName?.toLowerCase().includes("điện thoại") ||
                    session.deviceName?.toLowerCase().includes("mobile") ? (
                      <Smartphone size={12} className="text-emerald-400" />
                    ) : session.deviceName?.toLowerCase().includes("tablet") ||
                      session.deviceName?.toLowerCase().includes("ipad") ? (
                      <Tablet size={12} className="text-purple-400" />
                    ) : (
                      <Monitor size={12} className="text-blue-400" />
                    )}
                    <span>{session.deviceName || "Thiết bị"}</span>
                  </span>
                  <span>
                    {session.isLive
                      ? "Vừa xong"
                      : session.updatedAt > 0
                      ? `Tạm dừng lúc ${formatTime(session.updatedAt)}`
                      : "Chưa rõ thời gian"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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

      {/* 24-HOUR PEAK WATCHING HOURS */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-400" />
              <span>Hoạt Động Xem Theo Giờ (24 Giờ)</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Phân bố số lượt sự kiện phát video theo từng khung giờ trong ngày (Chỉ tính các sự kiện mở phim và phát video)
            </p>
          </div>

          {(() => {
            const list = stats?.hourlyWatchActivity || [];
            const peak = list.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), {
              hour: 0,
              label: "00:00",
              count: 0,
            });
            const total = list.reduce((acc, curr) => acc + curr.count, 0);

            if (total > 0 && peak.count > 0) {
              const nextHour = (peak.hour + 1).toString().padStart(2, "0") + ":00";
              return (
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>
                    Khung giờ cao điểm: <strong>{peak.label} – {nextHour}</strong> ({peak.count} lượt hoạt động)
                  </span>
                </div>
              );
            }
            return (
              <span className="text-xs text-gray-500">Chưa đủ dữ liệu trong khoảng thời gian này</span>
            );
          })()}
        </div>

        {(() => {
          const list = stats?.hourlyWatchActivity || [];
          const maxCount = Math.max(1, ...list.map((h) => h.count));
          const total = list.reduce((acc, curr) => acc + curr.count, 0);
          const peakCount = Math.max(...list.map((h) => h.count));

          return (
            <div className="space-y-2 pt-2">
              {/* Bars container */}
              <div className="h-32 flex items-end gap-1 sm:gap-1.5 pt-4 pb-1 border-b border-white/10">
                {list.map((h) => {
                  const heightPercent = total === 0 ? 4 : Math.max(4, Math.round((h.count / maxCount) * 100));
                  const isPeak = h.count > 0 && h.count === peakCount;
                  const percentageOfTotal = total > 0 ? Math.round((h.count / total) * 100) : 0;

                  return (
                    <div
                      key={h.hour}
                      className="flex-1 flex flex-col justify-end items-center h-full relative group cursor-pointer"
                    >
                      {/* Floating tooltip */}
                      <div className="absolute -top-10 z-20 hidden group-hover:flex flex-col items-center pointer-events-none transition-all">
                        <div className="px-2 py-1 rounded-lg bg-zinc-950 border border-white/20 text-white text-[10px] font-mono shadow-xl whitespace-nowrap">
                          {h.label}: <strong>{h.count}</strong> lượt hoạt động ({percentageOfTotal}%)
                        </div>
                        <div className="w-1.5 h-1.5 bg-zinc-950 border-r border-b border-white/20 rotate-45 -mt-1" />
                      </div>

                      {/* The Bar */}
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 ${
                          h.count === 0
                            ? "bg-white/5"
                            : isPeak
                            ? "bg-gradient-to-t from-netflix-red to-amber-400 shadow-md shadow-amber-950/40"
                            : "bg-gradient-to-t from-blue-600 to-cyan-400"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Hour X-Axis Labels */}
              <div className="flex justify-between text-[10px] text-gray-500 font-mono px-0.5">
                <span>00:00</span>
                <span className="hidden sm:inline">04:00</span>
                <span>08:00</span>
                <span className="hidden sm:inline">12:00</span>
                <span>16:00</span>
                <span className="hidden sm:inline">20:00</span>
                <span>23:00</span>
              </div>
            </div>
          );
        })()}
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
      <div className="p-4 sm:p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-amber-400 flex-shrink-0" />
            <span>Nhật Ký Hoạt Động Gần Đây</span>
          </h3>
          <span className="text-[11px] sm:text-xs text-gray-400">{filteredRecentActivity.length} sự kiện</span>
        </div>

        {filteredRecentActivity.length === 0 ? (
          <div className="p-8 sm:p-10 text-center rounded-xl bg-black/40 border border-white/5 text-gray-400 text-xs">
            Chưa có sự kiện nào gần đây. Hãy mở xem phim hoặc tìm kiếm để thử nghiệm!
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-hidden">
            {filteredRecentActivity.map((ev) => (
              <div
                key={ev.id}
                className="py-3 px-1 sm:px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-xs hover:bg-white/[0.02] transition rounded-lg"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="flex-shrink-0">{getEventBadge(ev.eventType)}</div>
                  <div className="truncate min-w-0">
                    <span className="font-bold text-white text-xs truncate">
                      {ev.eventType === "site_visit"
                        ? "Nanaflix"
                        : ev.movieTitle || ev.keyword || ev.movieSlug || "Nanaflix"}
                    </span>
                    {ev.episodeName && (
                      <span className="text-gray-400 ml-1.5 text-[11px]">({ev.episodeName})</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-gray-400 flex-wrap sm:flex-nowrap sm:flex-shrink-0 pl-1 sm:pl-0">
                  {ev.userId ? (
                    <span className="text-emerald-400 font-semibold truncate max-w-[120px] sm:max-w-none">
                      User: {ev.userId.slice(0, 8)}...
                    </span>
                  ) : (
                    <span className="text-gray-400 font-mono">
                      Guest ({ev.anonymousId?.slice(5, 11)})
                    </span>
                  )}
                  <span>•</span>
                  <span className="truncate">{ev.deviceType} / {ev.os}</span>
                  <span>•</span>
                  <span className="text-gray-500 font-mono flex-shrink-0">{formatTime(ev.createdAt)}</span>
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
