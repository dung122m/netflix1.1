"use client";

import React from "react";
import { Shield, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";
import { translatePosition } from "./lineupTranslators";
import { InlinePlayerDetailCard } from "./InlinePlayerDetailCard";

export interface TeamListColumnProps {
  team: {
    id: string;
    name: string;
    displayName: string;
    logo?: string;
    formation?: string;
  };
  roster?: {
    formation?: string;
    starters: MatchRosterPlayer[];
    bench: MatchRosterPlayer[];
  } | null;
  isHome: boolean;
  onSelectPlayer: (player: MatchRosterPlayer) => void;
  selectedPlayer?: MatchRosterPlayer | null;
  onCloseSelectedPlayer?: () => void;
  imageErrors?: Record<string, boolean>;
  onImageError?: (id: string) => void;
  matchStatus?: "live" | "finished" | "scheduled" | string;
}

export function TeamListColumn({
  team,
  roster,
  isHome,
  onSelectPlayer,
  selectedPlayer,
  onCloseSelectedPlayer,
  imageErrors = {},
  onImageError = () => {},
  matchStatus,
}: TeamListColumnProps) {
  const isMatchScheduled = matchStatus === "scheduled";
  const starters = roster?.starters || [];
  const bench = roster?.bench || [];
  const formation = roster?.formation || team.formation;

  return (
    <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${isHome ? "text-netflix-red" : "text-sky-400"}`} />
          <h5 className="text-xs sm:text-sm font-black text-white truncate">
            {team.displayName}
          </h5>
        </div>
        {formation && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
            {formation}
          </span>
        )}
      </div>

      {/* Card chi tiết cầu thủ nếu được chọn (trong chế độ danh sách) */}
      {selectedPlayer && (
        <InlinePlayerDetailCard
          key={selectedPlayer.id}
          player={selectedPlayer}
          isHome={isHome}
          onClose={onCloseSelectedPlayer || (() => {})}
          hasValidPhoto={Boolean(selectedPlayer.photoUrl && !imageErrors[selectedPlayer.id])}
          onImageError={onImageError}
          matchStatus={matchStatus}
          variant="inline"
        />
      )}

      <div className="space-y-1.5">
        <p className="text-xs sm:text-[13px] font-bold text-zinc-200">
          Đá chính ({starters.length})
        </p>
        {starters.map((p, i) => {
          const isSelected = selectedPlayer?.id === p.id;
          return (
            <div
              key={p.id || i}
              onClick={() => onSelectPlayer(p)}
              className={`flex items-center justify-between gap-2.5 py-2 px-3 rounded-xl cursor-pointer text-xs sm:text-sm transition ${
                isSelected ? "bg-white/[0.12]  " : "bg-white/[0.03] hover:bg-white/[0.08] "
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="font-sans tabular-nums text-zinc-400 min-w-[24px] font-bold text-xs sm:text-sm">
                  #{p.jersey || i + 1}
                </span>
                <span className="text-zinc-100 font-semibold truncate text-xs sm:text-sm">{p.displayName || p.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isMatchScheduled && p.subbedOut && (
                  <span className="text-xs text-red-400 font-bold flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded">
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>{p.subClock || "Ra sân"}</span>
                  </span>
                )}
                {p.position && (
                  <span className="text-xs text-zinc-400 font-medium">
                    {translatePosition(p.position)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {bench.length > 0 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs sm:text-[13px] font-bold text-zinc-400">
            Dự bị ({bench.length})
          </p>
          <div className="sm:max-h-[260px] sm:overflow-y-auto pr-0.5 scrollbar-thin space-y-1">
            {bench.map((p, i) => {
              const isSelected = selectedPlayer?.id === p.id;
              return (
                <div
                  key={p.id || i}
                  onClick={() => onSelectPlayer(p)}
                  className={`flex items-center justify-between gap-2.5 py-2 px-3 rounded-xl text-xs sm:text-sm cursor-pointer transition ${
                    isSelected
                      ? "bg-white/[0.12] text-white"
                      : "hover:bg-white/[0.05] text-zinc-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="font-sans tabular-nums text-zinc-500 min-w-[24px] font-semibold text-xs sm:text-sm">#{p.jersey || "-"}</span>
                    <span className="text-zinc-300 truncate text-xs sm:text-sm">{p.displayName || p.name}</span>
                  </div>
                  {!isMatchScheduled && p.subbedIn ? (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>{p.subClock || "Vào sân"}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      {translatePosition(p.position)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

