"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Eye,
  Users,
  Radio,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  TrendingUp,
  Globe,
  Compass,
  Star,
  Info,
  BarChart2,
  Cpu,
  Sparkles,
} from "lucide-react";
import {
  AnalyticsDashboardStats,
} from "@/services/analyticsService";
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
    // Skip fetch until Firebase auth has resolved to a real user.
    if (!user) return;
    setLoading(true);
    fetchStats(timeframe);
  }, [timeframe, fetchStats, user]);

  // Helper to resolve route URL from pageGroup slug
  const getPageGroupUrl = (slug: string) => {
    switch (slug) {
      case "home":
        return "/";
      case "browse":
        return "/browse";
      case "live":
      case "live-tv":
        return "/live";
      case "search":
        return "/search";
      case "movie":
        return "/browse";
      default:
        if (slug.startsWith("/")) return slug;
        return "/";
    }
  };

  return (
    <div className="space-y-6">
      {/* TIMEFRAME FILTER & REFRESH BAR */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 font-semibold mr-1">Khoảng thời gian:</span>
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
                  ? "bg-netflix-red text-white shadow-md shadow-black/50"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
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
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          <span>{isRefreshing ? "Đang đồng bộ..." : "Làm mới số liệu"}</span>
        </button>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Visits */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Tổng Lượt Truy Cập</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Eye size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
            {loading ? "..." : (stats?.totalViews || 0).toLocaleString("vi-VN")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
            <span className="text-blue-400 font-medium">Chống trùng lặp 30s:</span>
            <span>Tính theo phiên và nhóm trang</span>
          </p>
        </div>

        {/* Unique Visitors */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Khách Truy Cập Riêng Biệt</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users size={18} />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 flex items-baseline gap-2 group-hover:scale-105 transition-transform origin-left">
            <span>{loading ? "..." : (stats?.uniqueViewers.total || 0).toLocaleString("vi-VN")}</span>
            <span className="text-xs font-normal text-zinc-400">khách</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-400">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
              👤 {stats?.uniqueViewers.loggedIn || 0} User
            </span>
            <span>•</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
              🎭 {stats?.uniqueViewers.guests || 0} Guest
            </span>
          </div>
        </div>

        {/* Active Guests Online */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 hover: transition backdrop-blur-sm relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
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
          <p className="text-[11px] text-zinc-400 mt-1">
            Khách vãng lai tương tác trong 30 phút gần nhất
          </p>
        </div>
      </div>

      {/* ROW: TOP PAGES BY VISITS & UNIQUE VISITORS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages by Visits */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-netflix-red" />
              <span>Top Trang Được Truy Cập</span>
            </h3>
            <span className="text-xs text-zinc-400">Xếp theo tổng lượt truy cập</span>
          </div>

          {!stats?.topMoviesByViews || stats.topMoviesByViews.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-black/40 text-zinc-400 text-xs">
              Chưa có lượt truy cập nào được ghi nhận trong khoảng thời gian này.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.topMoviesByViews.map((m, idx) => (
                <div
                  key={m.slug}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 hover: transition group"
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
                          : "bg-white/10 text-zinc-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Link
                      href={getPageGroupUrl(m.slug)}
                      target="_blank"
                      className="text-xs font-bold text-white hover:text-netflix-red truncate transition"
                    >
                      {m.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-black text-white font-sans tabular-nums">
                      {m.views.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-400">lượt truy cập</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Pages by Unique Visitors */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-emerald-400" />
              <span>Top Trang Theo Khách Riêng Biệt</span>
            </h3>
            <span className="text-xs text-zinc-400">Khách truy cập riêng biệt</span>
          </div>

          {!stats?.topMoviesByUnique || stats.topMoviesByUnique.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-black/40 text-zinc-400 text-xs">
              Chưa có dữ liệu khách truy cập riêng biệt trong khoảng thời gian này.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.topMoviesByUnique.map((m, idx) => (
                <div
                  key={m.slug}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 hover: transition group"
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
                          : "bg-white/10 text-zinc-300"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <Link
                      href={getPageGroupUrl(m.slug)}
                      target="_blank"
                      className="text-xs font-bold text-white hover:text-emerald-400 truncate transition"
                    >
                      {m.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-xs font-black text-emerald-400 font-sans tabular-nums">
                      {m.uniqueViewers.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-zinc-400">khách</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 24-HOUR PEAK VISIT TRAFFIC HOURS */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 size={16} className="text-amber-400" />
              <span>Lưu Lượng Truy Cập Theo Giờ (24 Giờ)</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Phân bố số lượt truy cập trang theo từng khung giờ trong ngày (Giờ Việt Nam UTC+7)
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
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>
                    Khung giờ cao điểm: <strong>{peak.label} – {nextHour}</strong> ({peak.count} lượt truy cập)
                  </span>
                </div>
              );
            }
            return (
              <span className="text-xs text-zinc-500">Chưa đủ dữ liệu trong khoảng thời gian này</span>
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
              <div className="h-32 flex items-end gap-1 sm:gap-1.5 pt-4 pb-1 border-b">
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
                        <div className="px-2 py-1 rounded-lg bg-zinc-950 text-white text-[10px] font-sans tabular-nums shadow-xl whitespace-nowrap">
                          {h.label}: <strong>{h.count}</strong> lượt truy cập ({percentageOfTotal}%)
                        </div>
                        <div className="w-1.5 h-1.5 bg-zinc-950 border-r border-b rotate-45 -mt-1" />
                      </div>

                      {/* The Bar */}
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 group-hover:brightness-125 ${
                          h.count === 0
                            ? "bg-white/5"
                            : isPeak
                            ? "bg-gradient-to-t from-netflix-red to-amber-400 shadow-md shadow-black/50"
                            : "bg-gradient-to-t from-blue-600 to-cyan-400"
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Hour X-Axis Labels */}
              <div className="flex justify-between text-[10px] text-zinc-500 font-sans tabular-nums px-0.5">
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

      {/* SECTION: THIẾT BỊ & NỀN TẢNG KHÁN GIẢ (PLATFORM & DEVICES) */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Hồ Sơ Nền Tảng & Thiết Bị (Platform & Devices)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                  Guest + User
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Phân tích nền tảng thiết bị, hệ điều hành và trình duyệt của người dùng
              </p>
            </div>
          </div>
          <span className="text-xs text-zinc-400 font-sans tabular-nums">
            {stats?.deviceProfileStats?.totalProfiles || stats?.devices ? (
              <>
                <strong className="text-white">
                  {(stats?.deviceProfileStats?.totalProfiles ?? (stats?.devices.desktop + stats?.devices.mobile + stats?.devices.tablet)).toLocaleString()}
                </strong>{" "}
                hồ sơ thiết bị
              </>
            ) : (
              "0 thiết bị"
            )}
          </span>
        </div>

        {/* ROW 1: DEVICE OVERVIEW, BROWSER, OPERATING SYSTEM */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Device Overview */}
          <div className="p-4 rounded-xl bg-black/40 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Monitor size={15} className="text-blue-400" />
              <span>Phân Loại Thiết Bị (Device Overview)</span>
            </h4>

            <div className="grid grid-cols-3 gap-2">
              {/* Desktop */}
              <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center">
                <Monitor size={16} className="text-blue-400 mx-auto mb-1" />
                <span className="text-[10px] text-zinc-400 block">Desktop</span>
                <span className="text-sm font-black text-white font-sans tabular-nums mt-0.5 block">
                  {stats?.deviceProfileStats?.overview.desktop ?? stats?.devices.desktop ?? 0}
                </span>
                <span className="text-[10px] text-blue-400 font-bold block mt-0.5">
                  {stats?.deviceProfileStats?.overview.desktopPercent ?? 0}%
                </span>
              </div>

              {/* Mobile */}
              <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center">
                <Smartphone size={16} className="text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] text-zinc-400 block">Mobile</span>
                <span className="text-sm font-black text-white font-sans tabular-nums mt-0.5 block">
                  {stats?.deviceProfileStats?.overview.mobile ?? stats?.devices.mobile ?? 0}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                  {stats?.deviceProfileStats?.overview.mobilePercent ?? 0}%
                </span>
              </div>

              {/* Tablet */}
              <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center">
                <Tablet size={16} className="text-purple-400 mx-auto mb-1" />
                <span className="text-[10px] text-zinc-400 block">Tablet</span>
                <span className="text-sm font-black text-white font-sans tabular-nums mt-0.5 block">
                  {stats?.deviceProfileStats?.overview.tablet ?? stats?.devices.tablet ?? 0}
                </span>
                <span className="text-[10px] text-purple-400 font-bold block mt-0.5">
                  {stats?.deviceProfileStats?.overview.tabletPercent ?? 0}%
                </span>
              </div>
            </div>

            {/* Visual ratio bar */}
            <div className="h-2 rounded-full bg-black/60 overflow-hidden flex mt-1">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${stats?.deviceProfileStats?.overview.desktopPercent || 0}%` }}
                title="Desktop"
              />
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${stats?.deviceProfileStats?.overview.mobilePercent || 0}%` }}
                title="Mobile"
              />
              <div
                className="bg-purple-500 h-full"
                style={{ width: `${stats?.deviceProfileStats?.overview.tabletPercent || 0}%` }}
                title="Tablet"
              />
            </div>
          </div>

          {/* 2. Browser */}
          <div className="p-4 rounded-xl bg-black/40 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Globe size={15} className="text-cyan-400" />
              <span>Trình Duyệt (Browser)</span>
            </h4>

            {stats?.deviceProfileStats?.browsers && stats.deviceProfileStats.browsers.length > 0 ? (
              <div className="space-y-2 pt-0.5">
                {stats.deviceProfileStats.browsers.slice(0, 4).map((b) => (
                  <div key={b.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 flex items-center gap-1.5">
                        {b.name === "Safari" ? (
                          <Compass size={12} className="text-blue-400" />
                        ) : (
                          <Globe size={12} className={b.name === "Chrome" ? "text-amber-400" : "text-cyan-400"} />
                        )}
                        <span className="truncate max-w-[120px]">{b.name}</span>
                      </span>
                      <span className="text-zinc-400 font-sans tabular-nums text-[11px]">
                        {b.count} ({b.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${Math.max(b.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Chưa có dữ liệu trình duyệt.</p>
            )}
          </div>

          {/* 3. Operating System */}
          <div className="p-4 rounded-xl bg-black/40 space-y-3">
            <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Sparkles size={15} className="text-amber-400" />
              <span>Hệ Điều Hành (Operating System)</span>
            </h4>

            {stats?.deviceProfileStats?.operatingSystems && stats.deviceProfileStats.operatingSystems.length > 0 ? (
              <div className="space-y-2 pt-0.5">
                {stats.deviceProfileStats.operatingSystems.slice(0, 4).map((os) => (
                  <div key={os.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 truncate max-w-[130px]">{os.name}</span>
                      <span className="text-zinc-400 font-sans tabular-nums text-[11px]">
                        {os.count} ({os.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400"
                        style={{ width: `${Math.max(os.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Chưa có dữ liệu hệ điều hành.</p>
            )}
          </div>
        </div>
      </div>

      {/* SYSTEM DIAGNOSTICS & RATINGS (PRESERVED FROM PREVIOUS DASHBOARD) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t">
        {/* Rating Distribution Chart */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-4">
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
                  <span className="w-12 text-zinc-400 font-bold">{s} sao:</span>
                  <div className="flex-1 h-3 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        s >= 4 ? "bg-amber-400" : s === 3 ? "bg-blue-400" : "bg-red-400"
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-zinc-300 font-sans tabular-nums">
                    {count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Info size={16} className="text-blue-400" />
            <span>Trạng Thái Hệ Thống & Phân Quyền</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40">
              <span className="text-zinc-400">Tài khoản Quản trị viên:</span>
              <span className="font-sans tabular-nums font-bold text-white">{adminEmail || "Chưa rõ"}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/40">
              <span className="text-zinc-400">Tổng thành viên ghi nhận:</span>
              <span className="text-zinc-200 font-sans tabular-nums font-bold">{totalMembersCount} người</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
