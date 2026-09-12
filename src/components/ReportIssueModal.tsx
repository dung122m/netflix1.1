"use client";

import React, { useState } from "react";
import { Flag, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatEpisodeName } from "@/lib/formatEpisode";

interface ReportIssueModalProps {
  movieTitle: string;
  episodeName?: string;
}

const ISSUE_TYPES = [
  "⚠️ Video không tải được / Màn hình đen",
  "🔇 Mất âm thanh / Tiếng bị rè, bé",
  "🔤 Phụ đề bị lệch / Vietsub không khớp",
  "⚡ Video bị đứng hình / Giật lag liên tục",
  "❌ Nhầm tập / Thiếu tập so với mô tả",
];

export function ReportIssueModal({
  movieTitle,
  episodeName,
}: ReportIssueModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string>(ISSUE_TYPES[0]);
  const [customNote, setCustomNote] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const reports = JSON.parse(
        localStorage.getItem("nanaflix_error_reports") || "[]"
      );
      reports.push({
        movieTitle,
        episodeName: episodeName || "Tập 1",
        issue: selectedIssue,
        note: customNote,
        time: new Date().toISOString(),
      });
      localStorage.setItem("nanaflix_error_reports", JSON.stringify(reports));
    } catch {
      // Ignore
    }

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setIsOpen(false);
      setCustomNote("");
    }, 2200);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Báo lỗi video / link hỏng"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-zinc-900/80 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-300 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-500/40 transition-all cursor-pointer active:scale-95"
      >
        <Flag className="h-3.5 w-3.5 text-rose-400" />
        <span className="hidden sm:inline">Báo lỗi</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-white/15 bg-zinc-900 p-6 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {isSubmitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Đã gửi phản hồi!</h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Cảm ơn bạn. Báo cáo về tập phim đã được ghi nhận để kỹ thuật viên kiểm tra ngay.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <h3>Báo lỗi tập phim</h3>
                </div>

                <p className="text-xs text-gray-400">
                  Phim: <strong className="text-white">{movieTitle}</strong>
                  {episodeName && (
                    <>
                      {" "}
                      • <strong className="text-netflix-red">{formatEpisodeName(episodeName)}</strong>
                    </>
                  )}
                </p>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 block">
                    Chọn sự cố bạn gặp phải:
                  </label>
                  <div className="space-y-1.5">
                    {ISSUE_TYPES.map((issue) => (
                      <label
                        key={issue}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          selectedIssue === issue
                            ? "bg-rose-500/10 border-rose-500/50 text-white font-medium"
                            : "bg-zinc-800/60 border-white/5 text-gray-300 hover:bg-zinc-800"
                        }`}
                      >
                        <input
                          type="radio"
                          name="issueType"
                          checked={selectedIssue === issue}
                          onChange={() => setSelectedIssue(issue)}
                          className="accent-rose-500"
                        />
                        <span>{issue}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-300 block mb-1">
                    Ghi chú chi tiết thêm (tuỳ chọn):
                  </label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Ví dụ: Bị đứng ở phút thứ 12..."
                    className="w-full rounded-xl bg-zinc-950 border border-white/10 p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500/50 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-950/40"
                  >
                    Gửi phản hồi
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ReportIssueModal;
