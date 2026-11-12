"use client";

import React from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { MatchRosterPlayer } from "@/services/live/football-score/types";
import { SoccerBallIcon } from "../MatchTimelineSidebar";
import { translatePosition } from "./lineupTranslators";
import { YellowCardIcon, RedCardIcon } from "./PitchEventIcons";
import { DualPlayerEventSummary, TeamInfo } from "./dualPitchMath";

interface DualMobileRosterViewProps {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeStarters: MatchRosterPlayer[];
  homeBench: MatchRosterPlayer[];
  awayStarters: MatchRosterPlayer[];
  awayBench: MatchRosterPlayer[];
  mobileTeamTab: "home" | "away";
  onChangeTab: (tab: "home" | "away") => void;
  getPlayerEventBadges: (player: MatchRosterPlayer) => DualPlayerEventSummary;
}

export function DualMobileRosterView({
  homeTeam,
  awayTeam,
  homeStarters,
  homeBench,
  awayStarters,
  awayBench,
  mobileTeamTab,
  onChangeTab,
  getPlayerEventBadges,
}: DualMobileRosterViewProps) {
  const isCurrentHome = mobileTeamTab === "home";
  const currentTeam = isCurrentHome ? homeTeam : awayTeam;
  const currentStarters = isCurrentHome ? homeStarters : awayStarters;
  const currentBench = isCurrentHome ? homeBench : awayBench;

  return (
    <div className="block md:hidden space-y-3">
      {/* THANH CHUYỂN ĐỔI 2 ĐỘI BÓNG */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-zinc-900/90 shadow-sm">
        <button
          type="button"
          onClick={() => onChangeTab("home")}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs transition cursor-pointer whitespace-nowrap min-w-0 ${
            mobileTeamTab === "home"
              ? "bg-[#dc2626] text-white font-black shadow-md"
              : "text-zinc-400 hover:text-white font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white shrink-0" />
          <span className="truncate">{homeTeam.displayName}</span>
          {homeTeam.formation && (
            <span className="font-sans tabular-nums text-[10px] opacity-85 shrink-0">
              ({homeTeam.formation})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onChangeTab("away")}
          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs transition cursor-pointer whitespace-nowrap min-w-0 ${
            mobileTeamTab === "away"
              ? "bg-[#0284c7] text-white font-black shadow-md"
              : "text-zinc-400 hover:text-white font-semibold"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-white shrink-0" />
          <span className="truncate">{awayTeam.displayName}</span>
          {awayTeam.formation && (
            <span className="font-sans tabular-nums text-[10px] opacity-85 shrink-0">
              ({awayTeam.formation})
            </span>
          )}
        </button>
      </div>

      {/* DANH SÁCH ĐỘI HÌNH CHÍNH (STARTERS) */}
      <div className="rounded-2xl bg-zinc-950/80 p-3 space-y-2 shadow-sm">
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isCurrentHome ? "bg-[#dc2626]" : "bg-[#0284c7]"}`} />
            <span>Đội hình xuất phát</span>
          </span>
          <span className="font-sans tabular-nums font-bold text-zinc-400 text-[11px]">
            {currentStarters.length} cầu thủ
          </span>
        </div>

        <div className="space-y-1">
          {currentStarters.map((player) => {
            const eventsInfo = getPlayerEventBadges(player);
            const isGK =
              Boolean(player.position && /goalkeeper|gk|thủ môn|thủ thành/i.test(player.position)) ||
              player.formationPlace === 1;

            return (
              <div
                key={`m-starter-${player.id}`}
                className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] select-none pointer-events-none cursor-default"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-sans font-black tabular-nums text-xs shrink-0 shadow-sm ${
                      isGK
                        ? "bg-amber-500/20 text-amber-300"
                        : isCurrentHome
                          ? "bg-rose-500/20 text-rose-300"
                          : "bg-sky-500/20 text-sky-300"
                    }`}
                  >
                    {player.jersey || (isGK ? "1" : "-")}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white font-bold text-xs truncate font-sans">
                        {player.displayName || player.name}
                      </span>
                      {player.captain && (
                        <span
                          className="w-3.5 h-3.5 rounded-full bg-amber-400 text-zinc-950 font-black text-[8px] flex items-center justify-center shrink-0"
                          aria-label="Đội trưởng"
                        >
                          C
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-sans block truncate">
                      {translatePosition(player.position)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {eventsInfo.goals > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 text-[10px] font-bold font-sans">
                      <SoccerBallIcon className="w-3 h-3" />
                      {eventsInfo.goalMinutes.length > 0 && (
                        <span className="tabular-nums">{eventsInfo.goalMinutes.join("', ")}&apos;</span>
                      )}
                    </span>
                  )}
                  {eventsInfo.yellowCards > 0 && <YellowCardIcon className="w-2.5 h-3.5" />}
                  {eventsInfo.redCards > 0 && <RedCardIcon className="w-2.5 h-3.5" />}
                  {player.subbedOut && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[9.5px] font-bold font-sans">
                      <ArrowDownLeft className="w-2.5 h-2.5 stroke-[2.5]" />
                      <span>{player.subClock ? `${player.subClock}'` : "Ra sân"}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DANH SÁCH DỰ BỊ (BENCH) */}
      <div className="rounded-2xl bg-zinc-950/80 p-3 space-y-2 shadow-sm">
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span>Dự bị</span>
          </span>
          <span className="font-sans tabular-nums font-bold text-zinc-400 text-[11px]">
            {currentBench.length} cầu thủ
          </span>
        </div>

        {currentBench.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center font-sans">Chưa có danh sách dự bị</p>
        ) : (
          <div className="space-y-1">
            {currentBench.map((player) => {
              const eventsInfo = getPlayerEventBadges(player);

              return (
                <div
                  key={`m-bench-${player.id}`}
                  className="flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl bg-white/[0.02] select-none pointer-events-none cursor-default"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center font-sans font-bold tabular-nums text-xs shrink-0 shadow-sm">
                      {player.jersey || "-"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-zinc-200 font-semibold text-xs truncate font-sans">
                          {player.displayName || player.name}
                        </span>
                        {player.captain && (
                          <span className="text-[9px] font-bold text-amber-400">(C)</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 font-sans block truncate">
                        {translatePosition(player.position)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {eventsInfo.goals > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-300 text-[10px] font-bold font-sans">
                        <SoccerBallIcon className="w-3 h-3" />
                      </span>
                    )}
                    {eventsInfo.yellowCards > 0 && <YellowCardIcon className="w-2.5 h-3.5" />}
                    {eventsInfo.redCards > 0 && <RedCardIcon className="w-2.5 h-3.5" />}
                    {player.subbedIn && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9.5px] font-bold font-sans">
                        <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>Vào sân {player.subClock ? `(${player.subClock}')` : ""}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* THÔNG TIN HLV (NẾU CÓ) */}
      {currentTeam.coach && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/40 text-xs font-sans">
          <span className="text-zinc-400">HLV:</span>
          <span className="font-bold text-white truncate max-w-[200px]">{currentTeam.coach}</span>
        </div>
      )}
    </div>
  );
}

