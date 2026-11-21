"use client";

import React from "react";
import { MatchLeadersGroup, MatchLeaderAthlete } from "@/services/live/football-score/types";
import { Award, Target, Crosshair, ShieldCheck, HandMetal } from "lucide-react";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";

interface MatchLeadersCardProps {
  leaders?: MatchLeadersGroup[];
}

function getCategoryIcon(catName: string) {
  const norm = catName.toLowerCase();
  if (norm.includes("dứt điểm") || norm.includes("sút")) {
    return <Crosshair className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
  }
  if (norm.includes("chuyền")) {
    return <Target className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
  }
  if (norm.includes("phòng ngự") || norm.includes("tắc bóng") || norm.includes("chặn")) {
    return <ShieldCheck className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  }
  if (norm.includes("cứu thua")) {
    return <HandMetal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
  }
  return <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
}

function AthleteLeaderItem({ leader }: { leader: MatchLeaderAthlete }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-b-0 font-sans text-xs">
      {/* CỘT TRÁI: SỐ ÁO + TÊN CẦU THỦ + VỊ TRÍ */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="w-5 h-5 rounded bg-white/10 text-zinc-200 font-sans font-bold tabular-nums text-xs flex items-center justify-center shrink-0">
          {leader.jersey || "-"}
        </span>

        <div className="min-w-0 flex-1 truncate">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white text-xs truncate">
              {leader.name}
            </span>
            {leader.position && (
              <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                ({leader.position})
              </span>
            )}
          </div>
          <span className="text-[10.5px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
            {getCategoryIcon(leader.categoryName)}
            <span className="truncate">{leader.categoryName}</span>
          </span>
        </div>
      </div>

      {/* CỘT PHẢI: CHỈ SỐ THỐNG KÊ (MAIN STAT + SUBTEXT xG) */}
      <div className="flex flex-col items-end shrink-0 text-right">
        <span className="font-sans font-black tabular-nums text-xs sm:text-sm text-white">
          {leader.statValue}{" "}
          <span className="text-[10.5px] font-medium text-zinc-400">{leader.statLabel}</span>
        </span>
        {leader.subText && (
          <span className="font-sans tabular-nums text-[10px] text-zinc-400 font-medium">
            {leader.subText}
          </span>
        )}
      </div>
    </div>
  );
}

export function MatchLeadersCard({ leaders }: MatchLeadersCardProps) {
  if (!leaders || leaders.length === 0) return null;

  return (
    <div className="space-y-3.5 pt-2">
      {/* HEADER: CẦU THỦ NỔI BẬT TRẬN ĐẤU */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] gap-2">
        <h4 className="text-xs sm:text-sm font-bold text-white truncate font-sans">
          Cầu thủ nổi bật (Leaders)
        </h4>
        <span className="text-[10px] text-zinc-500 font-sans font-medium shrink-0">
          Theo ESPN Sports
        </span>
      </div>

      {/* 2 CỘT CHO 2 ĐỘI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {leaders.map((group, idx) => {
          const logo = group.teamLogo ? toDarkModeLogoUrl(group.teamLogo) : "";
          const isHome = idx === 0;

          return (
            <div key={`leader-team-${idx}`} className="space-y-2">
              <div className="flex items-center gap-2 pb-1 text-xs">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${isHome ? "bg-[#dc2626]" : "bg-[#0284c7]"}`}
                />
                {logo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logo} alt="" loading="lazy" className="w-4 h-4 object-contain shrink-0" />
                )}
                <span className="font-bold text-zinc-200 truncate">{group.teamName}</span>
              </div>

              <div className="space-y-1.5">
                {group.leaders.map((leader, lIdx) => (
                  <AthleteLeaderItem key={`leader-${idx}-${lIdx}`} leader={leader} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
