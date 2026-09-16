"use client";

import React from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Check,
  ExternalLink,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ErrorReportItem } from "@/services/supabaseService";

interface AdminReportsTabProps {
  errorReports: ErrorReportItem[];
  filteredErrorReports: ErrorReportItem[];
  reportFilter: "all" | "pending" | "resolved" | "ignored";
  setReportFilter: (filter: "all" | "pending" | "resolved" | "ignored") => void;
  reportSearchQuery: string;
  setReportSearchQuery: (query: string) => void;
  onUpdateReportStatus: (reportId: string, status: "pending" | "resolved" | "ignored") => void;
  onDeleteReport: (reportId: string) => void;
  formatDate: (timestamp?: number) => string;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = React.memo(
  function AdminReportsTab({
    errorReports,
    filteredErrorReports,
    reportFilter,
    setReportFilter,
    reportSearchQuery,
    setReportSearchQuery,
    onUpdateReportStatus,
    onDeleteReport,
    formatDate,
  }) {
    return (
      <div className="space-y-4">
        {/* Filter and Search Bar for Reports */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={reportSearchQuery}
              onChange={(e) => setReportSearchQuery(e.target.value)}
              placeholder="Tìm theo tên phim, slug, mô tả lỗi, người báo..."
              className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-netflix-red transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-shrink-0">
            <button
              type="button"
              onClick={() => setReportFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                reportFilter === "all"
                  ? "bg-white text-black font-bold"
                  : "bg-white/5 text-gray-300 hover:text-white"
              }`}
            >
              <span>Tất cả ({errorReports.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setReportFilter("pending")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                reportFilter === "pending"
                  ? "bg-amber-500 text-black font-bold"
                  : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Chờ sửa ({errorReports.filter((r) => r.status === "pending").length})</span>
            </button>

            <button
              type="button"
              onClick={() => setReportFilter("resolved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                reportFilter === "resolved"
                  ? "bg-emerald-500 text-black font-bold"
                  : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              }`}
            >
              <Check size={13} />
              <span>Đã sửa ({errorReports.filter((r) => r.status === "resolved").length})</span>
            </button>

            <button
              type="button"
              onClick={() => setReportFilter("ignored")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                reportFilter === "ignored"
                  ? "bg-zinc-600 text-white font-bold"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              <X size={13} />
              <span>Bỏ qua ({errorReports.filter((r) => r.status === "ignored").length})</span>
            </button>
          </div>
        </div>

        {/* Error Reports List */}
        {filteredErrorReports.length === 0 ? (
          <div className="p-12 rounded-2xl bg-zinc-900/40 border border-white/5 text-center text-gray-500 space-y-2">
            <AlertOctagon size={36} className="mx-auto text-gray-600 mb-2" />
            <p className="text-sm font-semibold text-gray-400">Không có báo cáo sự cố nào</p>
            <p className="text-xs text-gray-500">
              {reportSearchQuery
                ? "Không tìm thấy kết quả phù hợp với bộ lọc tìm kiếm."
                : "Toàn bộ phim đang hoạt động ổn định hoặc chưa có phản hồi lỗi mới."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredErrorReports.map((report) => {
              const issueBadgeMap: Record<string, { label: string; color: string }> = {
                broken_link: {
                  label: "Hỏng video / Không phát được",
                  color: "bg-red-500/20 text-red-300 border-red-500/30",
                },
                audio_issue: {
                  label: "Lỗi âm thanh / Mất tiếng",
                  color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                },
                subtitle_issue: {
                  label: "Lỗi phụ đề / Lệch sub",
                  color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                },
                wrong_episode: {
                  label: "Sai tập phim / Trùng lặp",
                  color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
                },
                other: {
                  label: "Sự cố khác",
                  color: "bg-zinc-700/50 text-gray-300 border-zinc-600/40",
                },
              };
              const badge = issueBadgeMap[report.issueType] || {
                label: report.issueType,
                color: "bg-zinc-700/50 text-gray-300 border-zinc-600/40",
              };

              return (
                <div
                  key={report.id}
                  className={`p-4 rounded-2xl border backdrop-blur-sm transition flex flex-col justify-between gap-3 relative overflow-hidden ${
                    report.status === "pending"
                      ? "bg-amber-950/10 border-amber-500/30 shadow-lg shadow-amber-950/20"
                      : report.status === "resolved"
                      ? "bg-emerald-950/10 border-emerald-500/20"
                      : "bg-zinc-900/40 border-white/5 opacity-75"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/movies/${report.movieSlug}`}
                            target="_blank"
                            className="text-sm font-bold text-white hover:text-red-400 transition truncate flex items-center gap-1.5 group"
                          >
                            <span>{report.movieTitle || report.movieSlug}</span>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400" />
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 flex-wrap">
                          {report.episodeName && (
                            <span className="text-red-300 font-semibold bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20">
                              Tập: {report.episodeName}
                            </span>
                          )}
                          <span>•</span>
                          <span>{formatDate(report.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {report.status === "pending" && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            Chờ xử lý
                          </span>
                        )}
                        {report.status === "resolved" && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                            <Check size={11} />
                            Đã sửa
                          </span>
                        )}
                        {report.status === "ignored" && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-gray-400 border border-zinc-700 text-[10px] font-medium">
                            Đã bỏ qua
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Issue Type Badge & Reporter Info */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-gray-400 truncate max-w-[220px]">
                        Báo bởi: <strong className="text-white">{report.userName || report.userEmail || "Người xem ẩn danh"}</strong>
                      </span>
                    </div>

                    {/* Description */}
                    <div className="p-3 rounded-xl bg-black/50 border border-white/5 text-xs text-gray-200 leading-relaxed font-sans break-words">
                      &ldquo;{report.description}&rdquo;
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {report.status !== "resolved" && (
                        <button
                          type="button"
                          onClick={() => onUpdateReportStatus(report.id, "resolved")}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Check size={13} />
                          <span>Đã khắc phục</span>
                        </button>
                      )}
                      {report.status !== "ignored" && (
                        <button
                          type="button"
                          onClick={() => onUpdateReportStatus(report.id, "ignored")}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                        >
                          <X size={13} />
                          <span>Bỏ qua</span>
                        </button>
                      )}
                      {report.status !== "pending" && (
                        <button
                          type="button"
                          onClick={() => onUpdateReportStatus(report.id, "pending")}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw size={12} />
                          <span>Mở lại</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/movies/${report.movieSlug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition"
                        title="Mở trang phim"
                      >
                        <ExternalLink size={13} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDeleteReport(report.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                        title="Xóa báo cáo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);
