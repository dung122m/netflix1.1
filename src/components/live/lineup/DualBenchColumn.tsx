"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";
import { SoccerBallIcon } from "../MatchTimelineSidebar";
import { translatePosition } from "./lineupTranslators";
import { YellowCardIcon, RedCardIcon } from "./PitchEventIcons";
import { DualPlayerEventSummary } from "./dualPitchMath";

interface DualBenchColumnProps {
  teamName: string;
  bench: MatchRosterPlayer[];
  isHome: boolean;
  selectedPlayerId?: string;
  onSelectPlayer: (player: MatchRosterPlayer, isHome: boolean) => void;
  getPlayerEventBadges: (player: MatchRosterPlayer) => DualPlayerEventSummary;
}

export function DualBenchColumn({
  teamName,
  bench,
  isHome,
  selectedPlayerId,
  onSelectPlayer,
  getPlayerEventBadges,
}: DualBenchColumnProps) {
  const keyPrefix = isHome ? "hb" : "ab";
  const dotClass = isHome ? "bg-[#dc2626]" : "bg-[#0284c7]";
  const selectedBgClass = isHome ? "bg-rose-500/20 text-white" : "bg-sky-500/20 text-white";
  const jerseyClass = isHome
    ? "bg-rose-500/15 text-rose-300"
    : "bg-sky-500/15 text-sky-300";

  return (
    <div className="rounded-2xl bg-zinc-950/80 p-3 sm:p-3.5 flex flex-col justify-between overflow-hidden shadow-sm">
      <div className="flex items-center justify-between pb-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full ${dotClass} shrink-0`} />
          <h5 className="text-xs font-semibold text-white truncate font-sans">
            Dự bị: {teamName}
          </h5>
        </div>
        <span className="text-xs font-sans tabular-nums font-bold text-zinc-400 shrink-0">
          ({bench.length})
        </span>
      </div>

      {bench.length === 0 ? (
        <p className="text-xs text-zinc-500 py-8 text-center font-sans">Chưa có danh sách dự bị</p>
      ) : (
        <div className="space-y-1 sm:overflow-y-auto sm:max-h-[320px] pr-1 scrollbar-thin">
          {bench.map((p) => {
            const eventsInfo = getPlayerEventBadges(p);
            const isSelected = selectedPlayerId === p.id;
            const isCaptain = Boolean(p.captain);
            return (
              <button
                key={`${keyPrefix}-${p.id}`}
                type="button"
                onClick={() => onSelectPlayer(p, isHome)}
                className={`w-full flex items-center px-2 py-1.5 rounded-xl transition text-left cursor-pointer group ${
                  isSelected
                    ? selectedBgClass
                    : "bg-white/[0.02] hover:bg-white/[0.05] text-zinc-300"
                }`}
              >
                {/* Cột 1: Số áo cố định w-6 */}
                <span className={`w-6 h-6 rounded-lg ${jerseyClass} flex items-center justify-center font-sans font-bold tabular-nums text-xs shrink-0 mr-2`}>
                  {p.jersey || "-"}
                </span>

                {/* Cột 2: Tên & Vị trí flex-1 */}
                <div className="min-w-0 flex-1 pr-2 truncate">
                  <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate font-sans leading-snug">
                    {p.displayName || p.name}
                    {isCaptain && (
                      <span className="text-[10px] font-bold text-amber-400 ml-1">(C)</span>
                    )}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate font-sans leading-snug">
                    {translatePosition(p.position)}
                  </p>
                </div>

                {/* Cột 3: Cột Sự kiện (Bàn thắng & Thẻ phạt) cố định w-12 */}
                <div className="w-12 shrink-0 flex items-center justify-center gap-1.5">
                  {eventsInfo.goals > 0 && (
                    <span aria-label={`${eventsInfo.goals} Bàn thắng`}>
                      <SoccerBallIcon className="w-3.5 h-3.5 shrink-0" />
                    </span>
                  )}
                  {eventsInfo.yellowCards > 0 && <YellowCardIcon className="shrink-0" />}
                  {eventsInfo.redCards > 0 && <RedCardIcon className="shrink-0" />}
                </div>

                {/* Cột 4: Cột Trạng thái Vào Sân cố định w-20 căn phải */}
                <div className="w-20 shrink-0 flex items-center justify-end">
                  {p.subbedIn && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-sans text-[10px] font-bold shrink-0">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
                      <span>Vào sân</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

