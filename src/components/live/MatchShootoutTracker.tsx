"use client";

import React from "react";
import { MatchShootoutTeam, MatchSummaryTeam } from "@/services/live/football-score/types";
import { Check, X, ShieldAlert } from "lucide-react";

interface MatchShootoutTrackerProps {
  shootout: MatchShootoutTeam[];
  homeTeam: MatchSummaryTeam;
  awayTeam: MatchSummaryTeam;
}

export function MatchShootoutTracker({
  shootout,
  homeTeam,
  awayTeam,
}: MatchShootoutTrackerProps) {
  if (!shootout || shootout.length === 0) return null;

  const team1 = shootout[0];
  const team2 = shootout[1];

  const maxShots = Math.max(team1?.shots?.length || 0, team2?.shots?.length || 0, 5);
  const shotIndices = Array.from({ length: maxShots }, (_, i) => i + 1);

  return (
    <div className="rounded-2xl bg-zinc-950/80 p-3.5 sm:p-4 border border-rose-500/20 shadow-lg space-y-3">
      {/* Tiêu đề & Tỷ số luân lưu */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h4 className="text-xs sm:text-sm font-black text-white font-sans uppercase tracking-wider">
            Loạt sút luân lưu 11m
          </h4>
        </div>

        {team1 && team2 && (
          <div className="flex items-center gap-2 font-sans font-black tabular-nums text-sm sm:text-base text-white">
            <span className="text-rose-400">{team1.score}</span>
            <span className="text-zinc-500">-</span>
            <span className="text-sky-400">{team2.score}</span>
          </div>
        )}
      </div>

      {/* Lưới các quả sút của 2 đội */}
      <div className="space-y-2 font-sans text-xs">
        {[team1, team2].filter(Boolean).map((t, idx) => {
          const isHome = idx === 0;
          const displayTeamName =
            t.teamName || (isHome ? homeTeam.displayName || homeTeam.name : awayTeam.displayName || awayTeam.name);

          return (
            <div
              key={`shootout-${t.teamId || idx}`}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.02]"
            >
              {/* Tên đội */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${isHome ? "bg-[#dc2626]" : "bg-[#0284c7]"}`}
                />
                <span className="text-white font-bold truncate max-w-[140px] sm:max-w-[200px]">
                  {displayTeamName}
                </span>
              </div>

              {/* Dãy chấm kết quả các quả sút (1, 2, 3, 4, 5...) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {shotIndices.map((shotNum) => {
                  const shot = t.shots.find((s) => s.shotNumber === shotNum);

                  if (!shot) {
                    return (
                      <span
                        key={`empty-${shotNum}`}
                        title={`Lượt sút #${shotNum}: Chưa sút`}
                        className="w-5 h-5 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center text-[10px] text-zinc-600 font-bold"
                      >
                        {shotNum}
                      </span>
                    );
                  }

                  return (
                    <span
                      key={shot.id}
                      title={`${shot.playerName} (Lượt #${shotNum}): ${shot.didScore ? "Vào" : "Không vào"}`}
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm ${
                        shot.didScore
                          ? "bg-emerald-500 text-white"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {shot.didScore ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <X className="w-3 h-3 stroke-[3]" />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
