"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Clock,
  RefreshCw,
  Search,
  CheckCircle2,
  Unlock,
  Eye,
  Smartphone,
  Laptop,
  Terminal,
  FileCode2,
  X,
} from "lucide-react";
import { toast } from "@/components/Toast";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  SecurityIncident,
  SecurityStats,
} from "@/services/securityRiskService";
import { auth } from "@/lib/firebase";

interface AdminSecurityTabProps {
  adminEmail?: string | null;
}

export const AdminSecurityTab: React.FC<AdminSecurityTabProps> = React.memo(
  function AdminSecurityTab() {
    const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
    const [stats, setStats] = useState<SecurityStats>({
      totalIncidents: 0,
      activeIncidents: 0,
      resolvedIncidents: 0,
      tempBlockedEntities: 0,
      highAlertEntities: 0,
      incidentsToday: 0,
      topViolationTypes: [],
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "warning" | "resolved">("all");
    const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);

    // Fetch security data from Admin API
    const fetchSecurityData = useCallback(async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      try {
        const token = await auth?.currentUser?.getIdToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/admin/security?limit=100", {
          headers,
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          setIncidents(json.data.incidents || []);
          if (json.data.stats) {
            setStats(json.data.stats);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu Security Center:", err);
        if (!isSilent) {
          toast.error("Không thể tải dữ liệu Security Center.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

    useEffect(() => {
      fetchSecurityData();
    }, [fetchSecurityData]);

    // Handle resolve incident
    const handleResolve = async (incident: SecurityIncident) => {
      const confirmed = await showConfirmDialog({
        title: "Xác nhận xử lý sự cố",
        message: `Đánh dấu sự cố của "${incident.userDisplayName || incident.userEmail || incident.entityId}" là đã xử lý?`,
        confirmText: "Đánh dấu đã xử lý",
        cancelText: "Hủy",
        variant: "warning",
      });

      if (!confirmed) return;

      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/security", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: "resolve",
            incidentId: incident.id,
          }),
        });

        const json = await res.json();
        if (json.success) {
          toast.success("Đã đánh dấu sự cố là đã xử lý.");
          setIncidents((prev) =>
            prev.map((item) =>
              item.id === incident.id
                ? { ...item, status: "resolved", resolvedAt: Date.now() }
                : item
            )
          );
          if (selectedIncident?.id === incident.id) {
            setSelectedIncident((prev) =>
              prev ? { ...prev, status: "resolved", resolvedAt: Date.now() } : null
            );
          }
        } else {
          toast.error(json.error || "Không thể xử lý sự cố.");
        }
      } catch (err) {
        console.error("Lỗi resolve incident:", err);
        toast.error("Lỗi kết nối khi xử lý sự cố.");
      }
    };

    // Handle unblock entity
    const handleUnblock = async (incident: SecurityIncident) => {
      const confirmed = await showConfirmDialog({
        title: "Xác nhận gỡ chặn tạm thời",
        message: `Bạn có chắc muốn gỡ chặn đối tượng "${incident.userDisplayName || incident.userEmail || incident.entityId}" (${incident.entityType}) và đặt lại điểm rủi ro về 0?`,
        confirmText: "Gỡ chặn ngay",
        cancelText: "Hủy",
        variant: "warning",
      });

      if (!confirmed) return;

      try {
        const token = await auth?.currentUser?.getIdToken();
        const res = await fetch("/api/admin/security", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: "unblock",
            entityType: incident.entityType,
            entityId: incident.entityId,
          }),
        });

        const json = await res.json();
        if (json.success) {
          toast.success("Đã gỡ chặn và đặt lại điểm rủi ro thành công!");
          fetchSecurityData(true);
        } else {
          toast.error(json.error || "Không thể gỡ chặn.");
        }
      } catch (err) {
        console.error("Lỗi unblock entity:", err);
        toast.error("Lỗi kết nối khi gỡ chặn.");
      }
    };

    // Filter & Search
    const filteredIncidents = useMemo(() => {
      return incidents.filter((item) => {
        // Status filter
        if (statusFilter === "active" && item.status !== "active") return false;
        if (statusFilter === "resolved" && item.status !== "resolved") return false;
        if (statusFilter === "blocked" && (item.riskScore < 60 || item.status === "resolved")) return false;
        if (statusFilter === "warning" && (item.riskScore < 30 || item.riskScore >= 60 || item.status === "resolved")) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchUser = item.userDisplayName?.toLowerCase().includes(q) || item.userEmail?.toLowerCase().includes(q);
          const matchEntity = item.entityId.toLowerCase().includes(q) || item.ipHash.toLowerCase().includes(q);
          const matchReason = item.reason.toLowerCase().includes(q) || item.violationType.toLowerCase().includes(q);
          const matchDevice = item.device?.toLowerCase().includes(q) || item.browser?.toLowerCase().includes(q);
          return matchUser || matchEntity || matchReason || matchDevice;
        }

        return true;
      });
    }, [incidents, statusFilter, searchQuery]);

    // Format time
    const formatTime = (timestamp?: number) => {
      if (!timestamp) return "—";
      const date = new Date(timestamp);
      return date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    };

    // Risk badge rendering
    const renderRiskBadge = (score: number) => {
      if (score >= 80) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/40">
            <ShieldAlert size={12} className="animate-pulse" />
            <span>{score} / 100</span>
          </span>
        );
      }
      if (score >= 60) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Ban size={12} />
            <span>{score} / 100</span>
          </span>
        );
      }
      if (score >= 30) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <AlertTriangle size={12} />
            <span>{score} / 100</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck size={12} />
          <span>{score} / 100</span>
        </span>
      );
    };

    // Device icon
    const renderDeviceIcon = (device?: string) => {
      const d = device?.toLowerCase() || "";
      if (d.includes("mobile") || d.includes("phone")) {
        return <Smartphone size={14} className="text-gray-400" />;
      }
      if (d.includes("tablet") || d.includes("ipad")) {
        return <Smartphone size={14} className="text-gray-400" />;
      }
      return <Laptop size={14} className="text-gray-400" />;
    };

    return (
      <div className="space-y-6">
        {/* STATS HEADER CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Incidents */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-medium truncate">Tổng Sự Cố</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <FileCode2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{stats.totalIncidents}</div>
            <p className="text-[11px] text-gray-400 mt-1">Đã ghi nhận trong hệ thống</p>
          </div>

          {/* Card 2: High Alert (80+) */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-medium truncate">High Alert (80+)</span>
              <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                <ShieldAlert size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-red-400">{stats.highAlertEntities}</div>
            <p className="text-[11px] text-gray-400 mt-1">Hành vi tấn công nghiêm trọng</p>
          </div>

          {/* Card 3: Temp Blocked (60+) */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-medium truncate">Tạm Chặn (60+)</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Ban size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400">{stats.tempBlockedEntities}</div>
            <p className="text-[11px] text-gray-400 mt-1">Đang bị khóa tính năng tạm thời</p>
          </div>

          {/* Card 4: Active Incidents */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-medium truncate">Cần Xử Lý</span>
              <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-yellow-400">{stats.activeIncidents}</div>
            <p className="text-[11px] text-gray-400 mt-1">Chưa được đánh dấu giải quyết</p>
          </div>

          {/* Card 5: Resolved */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
            <div className="flex items-center justify-between text-gray-400 mb-1.5">
              <span className="text-xs font-medium truncate">Đã Xử Lý</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats.resolvedIncidents}</div>
            <p className="text-[11px] text-gray-400 mt-1">Đã giải quyết / Gỡ chặn</p>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo User, Guest ID, IP Hash, Hành vi, Thiết bị..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { key: "all", label: "Tất cả" },
                { key: "blocked", label: "Tạm chặn (60+)" },
                { key: "warning", label: "Cảnh báo (30+)" },
                { key: "active", label: "Chưa xử lý" },
                { key: "resolved", label: "Đã xử lý" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.key
                    ? "bg-netflix-red text-white"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => fetchSecurityData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition cursor-pointer flex-shrink-0"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* INCIDENTS TABLE */}
        <div className="rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-netflix-red border-t-transparent animate-spin mb-3" />
              <p className="text-xs">Đang tải nhật ký bảo mật...</p>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <ShieldCheck size={44} className="text-emerald-500/80 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-200">Không có vi phạm bảo mật nào</p>
              <p className="text-xs text-gray-500 mt-1">
                Hệ thống an toàn. Tất cả các yêu cầu và thao tác đều nằm trong giới hạn cho phép.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40 text-gray-400 font-semibold">
                    <th className="py-3 px-4">Đối Tượng (User / Guest)</th>
                    <th className="py-3 px-4">Điểm Rủi Ro</th>
                    <th className="py-3 px-4">Hành Vi Phát Hiện</th>
                    <th className="py-3 px-4">Thiết Bị / Trình Duyệt</th>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredIncidents.map((incident) => {
                    const isBlocked = incident.riskScore >= 60 && incident.status === "active";
                    const isUser = Boolean(incident.userId);

                    return (
                      <tr
                        key={incident.id}
                        className="hover:bg-white/[0.03] transition-colors group"
                      >
                        {/* User / Guest */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                isUser
                                  ? "bg-blue-600/30 text-blue-400 border border-blue-500/30"
                                  : "bg-zinc-800 text-gray-400 border border-zinc-700"
                              }`}
                            >
                              {isUser ? (incident.userDisplayName?.[0]?.toUpperCase() || "U") : "G"}
                            </div>
                            <div className="max-w-[160px] truncate">
                              <div className="font-semibold text-white truncate">
                                {isUser
                                  ? incident.userDisplayName || incident.userEmail || "Người dùng đã đăng nhập"
                                  : "Khách (Guest)"}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono truncate">
                                {isUser ? `UID: ${incident.userId?.slice(0, 10)}...` : `IP Hash: ${incident.ipHash.slice(0, 12)}...`}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Risk Score */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderRiskBadge(incident.riskScore)}
                        </td>

                        {/* Reason / Violation */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="font-medium text-white truncate">{incident.reason}</div>
                          <div className="text-[10px] text-gray-500 truncate mt-0.5">
                            Loại: <span className="font-mono text-gray-400">{incident.violationType}</span>
                          </div>
                        </td>

                        {/* Device / Browser */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-gray-300">
                            {renderDeviceIcon(incident.device)}
                            <span className="capitalize">{incident.device || "Desktop"}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {incident.browser || "Chrome"}
                          </div>
                        </td>

                        {/* Time */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-gray-400 text-[11px]">
                          {formatTime(incident.createdAt)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {incident.status === "resolved" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                              <CheckCircle2 size={12} />
                              Đã xử lý
                            </span>
                          ) : isBlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400">
                              <Ban size={12} />
                              Tạm chặn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                              <Clock size={12} />
                              Chờ xử lý
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View History & Detail */}
                            <button
                              type="button"
                              onClick={() => setSelectedIncident(incident)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition cursor-pointer"
                              title="Xem chi tiết & Lịch sử vi phạm"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Unblock button if blocked */}
                            {incident.riskScore >= 60 && (
                              <button
                                type="button"
                                onClick={() => handleUnblock(incident)}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                                title="Gỡ chặn đối tượng này"
                              >
                                <Unlock size={14} />
                              </button>
                            )}

                            {/* Resolve button if active */}
                            {incident.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleResolve(incident)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                                title="Đánh dấu đã giải quyết"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* INCIDENT DETAIL & HISTORY MODAL */}
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-zinc-900 border border-white/15 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-netflix-red/10 text-netflix-red border border-netflix-red/20">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Chi Tiết Sự Cố Bảo Mật</h3>
                  <p className="text-xs text-gray-400 font-mono">ID: {selectedIncident.id}</p>
                </div>
              </div>

              <div className="space-y-3 bg-black/50 p-4 rounded-xl border border-white/10 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Loại đối tượng:</span>
                  <span className="font-semibold text-white capitalize">{selectedIncident.entityType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Định danh Entity:</span>
                  <span className="font-mono text-gray-300 truncate max-w-[240px]">{selectedIncident.entityId}</span>
                </div>
                {selectedIncident.userId && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400">User ID:</span>
                    <span className="font-mono text-gray-300 truncate max-w-[240px]">{selectedIncident.userId}</span>
                  </div>
                )}
                {selectedIncident.userEmail && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white font-medium">{selectedIncident.userEmail}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Hashed Client IP:</span>
                  <span className="font-mono text-gray-400">{selectedIncident.ipHash}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Điểm Rủi Ro:</span>
                  <span>{renderRiskBadge(selectedIncident.riskScore)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Loại vi phạm:</span>
                  <span className="font-mono text-amber-400">{selectedIncident.violationType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400">Thiết bị & Trình duyệt:</span>
                  <span className="text-gray-300">{selectedIncident.device || "Desktop"} / {selectedIncident.browser || "Chrome"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">Thời gian ghi nhận:</span>
                  <span className="text-gray-300">{formatTime(selectedIncident.createdAt)}</span>
                </div>
              </div>

              {/* Payload snippet preview (if any) */}
              {selectedIncident.payloadSnippet && (
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <Terminal size={14} />
                    <span>Dữ liệu mẫu vi phạm (Provable Payload):</span>
                  </div>
                  <pre className="p-3 bg-black/80 border border-white/10 rounded-xl text-[11px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                    {selectedIncident.payloadSnippet}
                  </pre>
                </div>
              )}

              {/* Modal action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                {selectedIncident.riskScore >= 60 && (
                  <button
                    type="button"
                    onClick={() => handleUnblock(selectedIncident)}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    Gỡ Chặn Ngay
                  </button>
                )}
                {selectedIncident.status === "active" && (
                  <button
                    type="button"
                    onClick={() => handleResolve(selectedIncident)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    Đánh Dấu Đã Xử Lý
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
