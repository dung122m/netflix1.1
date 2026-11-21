"use client";

import React from "react";
import { MatchSummaryTeam, TeamPastGameItem } from "@/services/live/football-score/types";
import { TrendingUp, Home, Plane } from "lucide-react";
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

function ResultBadge({ result }: { result: "W" | "D" | "L" }) {
  if (result === "W") {
    return (
      <span
        title="Thắng"
        className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-sans font-black text-[10px] flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-sm"
      >
        T
      </span>
    );
  }
  if (result === "D") {
    return (
      <span
        title="Hòa"
        className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-sans font-black text-[10px] flex items-center justify-center shrink-0 border border-amber-500/30 shadow-sm"
      >
        H
      </span>
    );
  }
  return (
    <span
      title="Thua"
      className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-sans font-black text-[10px] flex items-center justify-center shrink-0 border border-rose-500/30 shadow-sm"
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
    <div className="rounded-2xl bg-zinc-950/70 p-3.5 sm:p-4 space-y-3.5 border border-white/[0.04] shadow-sm">
      {/* Header đội bóng & tóm tắt phong độ */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06] gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHome ? "bg-[#dc2626]" : "bg-[#0284c7]"}`}
          />
          <h4 className="text-xs sm:text-sm font-black text-white truncate font-sans">
            {team.displayName || team.name}
          </h4>
        </div>

        {/* Tóm tắt Thắng - Hòa - Thua */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-sans tabular-nums text-[10px] sm:text-[11px] font-bold text-zinc-400">
            <span className="text-emerald-400 font-black">{wins}T</span> -{" "}
            <span className="text-amber-400 font-black">{draws}H</span> -{" "}
            <span className="text-rose-400 font-black">{losses}B</span>
          </span>
          <div className="flex items-center gap-1 ml-1.5">
            {games.map((g) => (
              <ResultBadge key={`badge-${g.id}`} result={g.result} />
            ))}
          </div>
        </div>
      </div>

      {/* Danh sách 5 trận đấu gần nhất */}
      {games.length === 0 ? (
        <p className="text-xs text-zinc-500 py-4 text-center font-sans">
          Chưa có dữ liệu phong độ gần đây
        </p>
      ) : (
        <div className="space-y-1.5">
          {games.map((g) => {
            const oppLogo = g.opponent?.logo ? toDarkModeLogoUrl(g.opponent.logo) : "";
            const isWin = g.result === "W";
            const isLoss = g.result === "L";

            return (
              <div
                key={g.id}
                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition text-xs font-sans"
              >
                {/* Ngày & Sân nhà / Sân khách */}
                <div className="flex items-center gap-2 shrink-0 min-w-[70px]">
                  <span className="tabular-nums text-[10.5px] font-bold text-zinc-400">
                    {formatGameDate(g.date)}
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-[9.5px] font-semibold px-1 py-0.2 rounded ${
                      g.homeAway === "home"
                        ? "bg-white/10 text-zinc-300"
                        : "bg-white/5 text-zinc-400"
                    }`}
                    title={g.homeAway === "home" ? "Sân nhà" : "Sân khách"}
                  >
                    {g.homeAway === "home" ? (
                      <Home className="w-2.5 h-2.5" />
                    ) : (
                      <Plane className="w-2.5 h-2.5" />
                    )}
                    <span>{g.homeAway === "home" ? "Nhà" : "Khách"}</span>
                  </span>
                </div>

                {/* Đối thủ */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[11px] text-zinc-400 font-medium shrink-0">vs</span>
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
                  <span className="text-zinc-200 font-bold text-[11px] sm:text-xs truncate">
                    {g.opponent?.displayName || g.opponent?.name || "Đối thủ"}
                  </span>
                </div>

                {/* Tỉ số & Kết quả */}
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
                  <ResultBadge result={g.result} />
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
          Dữ liệu kết quả 5 trận gần nhất sẽ hiển thị khi ban tổ chức cập nhật.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pt-1">
      {/* 2 Cột phong độ cho 2 đội */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <TeamFormCard team={homeTeam} games={homeGames} isHome={true} />
        <TeamFormCard team={awayTeam} games={awayGames} isHome={false} />
      </div>
    </div>
  );
}
