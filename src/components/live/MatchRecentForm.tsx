"use client";

import React from "react";
import { MatchSummaryTeam, TeamPastGameItem } from "@/services/live/football-score/types";
import { TrendingUp } from "lucide-react";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";

interface MatchRecentFormProps {
  homeTeam: MatchSummaryTeam;
  awayTeam: MatchSummaryTeam;
  recentForm?: {
    home?: TeamPastGameItem[];
    away?: TeamPastGameItem[];
  };
}

function formatGameDate(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  } catch {
    return "";
  }
}

function FormResultPill({ result, size = "md" }: { result: "W" | "D" | "L"; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  const dim = isSm ? "w-4 h-4 text-[9px]" : "w-5 h-5 text-[10px]";

  if (result === "W") {
    return (
      <span
        title="Thắng"
        className={`${dim} rounded-full bg-emerald-500/20 text-emerald-400 font-sans font-black flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-sm`}
      >
        T
      </span>
    );
  }
  if (result === "D") {
    return (
      <span
        title="Hòa"
        className={`${dim} rounded-full bg-amber-500/20 text-amber-400 font-sans font-black flex items-center justify-center shrink-0 border border-amber-500/30 shadow-sm`}
      >
        H
      </span>
    );
  }
  return (
    <span
      title="Thua"
      className={`${dim} rounded-full bg-rose-500/20 text-rose-400 font-sans font-black flex items-center justify-center shrink-0 border border-rose-500/30 shadow-sm`}
    >
      B
    </span>
  );
}

function TeamFormCard({
  team,
  games,
  isHome,
}: {
  team: MatchSummaryTeam;
  games: TeamPastGameItem[];
  isHome: boolean;
}) {
  const wins = games.filter((g) => g.result === "W").length;
  const draws = games.filter((g) => g.result === "D").length;
  const losses = games.filter((g) => g.result === "L").length;

  return (
    <div className="rounded-2xl bg-zinc-950/70 p-3.5 sm:p-4 space-y-3 border border-white/[0.05] shadow-md">
      {/* HEADER: TÊN ĐỘI & 5 CHẤM KẾT QUẢ GỌN GÀNG */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${isHome ? "bg-[#dc2626]" : "bg-[#0284c7]"}`}
            />
            <h4 className="text-xs sm:text-sm font-black text-white truncate font-sans">
              {team.displayName || team.name}
            </h4>
          </div>
          <span className="text-[10.5px] text-zinc-400 font-sans font-medium mt-0.5 pl-4">
            {wins} thắng • {draws} hòa • {losses} thua
          </span>
        </div>

        {/* 5 CHẤM PHONG ĐỘ (T, B, H...) */}
        <div className="flex items-center gap-1 shrink-0">
          {games.map((g) => (
            <FormResultPill key={`pill-${g.id}`} result={g.result} />
          ))}
        </div>
      </div>

      {/* DANH SÁCH 5 TRẬN ĐẤU (THIẾT KẾ PHẲNG, TINH GỌN, KHÔNG RỐI MẮT) */}
      {games.length === 0 ? (
        <p className="text-xs text-zinc-500 py-6 text-center font-sans">
          Chưa có dữ liệu phong độ gần đây
        </p>
      ) : (
        <div className="space-y-1">
          {games.map((g) => {
            const oppLogo = g.opponent?.logo ? toDarkModeLogoUrl(g.opponent.logo) : "";
            const isWin = g.result === "W";
            const isLoss = g.result === "L";

            return (
              <div
                key={g.id}
                className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition text-xs font-sans"
              >
                {/* 1. NGÀY & ĐỊA ĐIỂM (NHÀ / KHÁCH) */}
                <div className="flex items-center gap-1.5 shrink-0 min-w-[76px] text-zinc-400">
                  <span className="tabular-nums text-[11px] font-bold text-zinc-300">
                    {formatGameDate(g.date)}
                  </span>
                  <span className="text-zinc-600 text-[10px]">•</span>
                  <span className="text-[10px] font-medium text-zinc-400">
                    {g.homeAway === "home" ? "Sân nhà" : "Sân khách"}
                  </span>
                </div>

                {/* 2. ĐỐI THỦ (LOGO + TÊN TRỰC QUAN) */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {oppLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={oppLogo}
                      alt=""
                      loading="lazy"
                      className="w-4 h-4 object-contain shrink-0"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-zinc-800 shrink-0" />
                  )}
                  <span className="text-zinc-200 font-semibold text-xs truncate">
                    {g.opponent?.displayName || g.opponent?.name || "Đối thủ"}
                  </span>
                </div>

                {/* 3. TỈ SỐ & KẾT QUẢ GỌN GÀNG */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-sans tabular-nums font-black text-xs px-2 py-0.5 rounded-md ${
                      isWin
                        ? "bg-emerald-500/15 text-emerald-400"
                        : isLoss
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {g.score}
                  </span>
                  <FormResultPill result={g.result} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MatchRecentForm({ homeTeam, awayTeam, recentForm }: MatchRecentFormProps) {
  const homeGames = recentForm?.home || [];
  const awayGames = recentForm?.away || [];

  if (homeGames.length === 0 && awayGames.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-zinc-500 text-center">
        <TrendingUp className="w-7 h-7 text-zinc-600" />
        <p className="text-xs sm:text-sm font-semibold text-zinc-400">
          Chưa có dữ liệu phong độ gần đây của hai đội
        </p>
        <p className="text-[11px] text-zinc-500">
          Dữ liệu kết quả 5 trận gần nhất sẽ tự động hiển thị khi ban tổ chức cập nhật.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pt-1">
      {/* 2 CỘT PHONG ĐỘ CÂN ĐỐI CHO 2 ĐỘI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <TeamFormCard team={homeTeam} games={homeGames} isHome={true} />
        <TeamFormCard team={awayTeam} games={awayGames} isHome={false} />
      </div>
    </div>
  );
}
