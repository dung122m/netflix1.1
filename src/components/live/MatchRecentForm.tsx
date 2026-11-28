"use client";

import React, { useState } from "react";
import { MatchSummaryTeam, TeamPastGameItem, MatchHeadToHead } from "@/services/live/football/types";
import { TrendingUp } from "lucide-react";
import { toDarkModeLogoUrl } from "@/services/live/football/footballLogoService";

interface MatchRecentFormProps {
  homeTeam: MatchSummaryTeam;
  awayTeam: MatchSummaryTeam;
  recentForm?: {
    home?: TeamPastGameItem[];
    away?: TeamPastGameItem[];
  };
  headToHead?: MatchHeadToHead;
  mode?: "all" | "recent" | "h2h";
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

function formatH2HDate(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

function cleanCompetitionName(name?: string): string {
  if (!name) return "";
  let clean = name.replace(/^(\d{4}(?:-\d{2,4})?)\s+/i, "").trim();

  const lower = clean.toLowerCase();
  if (lower.includes("bundesliga")) return "Bundesliga";
  if (lower.includes("dfb-pokal") || lower.includes("dfb pokal")) return "Cúp QG Đức";
  if (lower.includes("premier league") || lower.includes("epl")) return "Ngoại Hạng Anh";
  if (lower.includes("laliga") || lower.includes("la liga")) return "La Liga";
  if (lower.includes("serie a")) return "Serie A";
  if (lower.includes("ligue 1")) return "Ligue 1";
  if (lower.includes("champions league")) return "Cúp C1";
  if (lower.includes("europa league")) return "Cúp C2";
  if (lower.includes("conference league")) return "Cúp C3";
  if (lower.includes("club friendly") || lower.includes("friendly")) return "Giao hữu";
  if (lower.includes("fa cup")) return "Cúp FA";
  if (lower.includes("carabao cup") || lower.includes("efl cup") || lower.includes("league cup")) return "Cúp Liên đoàn";
  if (lower.includes("copa del rey")) return "Cúp Nhà vua";
  if (lower.includes("coppa italia")) return "Cúp QG Ý";

  clean = clean
    .replace(/\b(German|English|Spanish|Italian|French)\s+/gi, "")
    .trim();

  return clean;
}

function formatH2HSummary(summary?: string): string {
  if (!summary) return "";
  let s = summary.trim();
  s = s.replace(/leads series/i, "dẫn");
  s = s.replace(/^series\s+tied/i, "Hòa đối đầu");
  return s;
}

/**
 * FotMob Authentic Form Match Row
 * [Home Team (right-aligned)] [Score Pill with Underline] [Away Team (left-aligned)]
 */
function FotmobFormMatchRow({
  game,
  trackedTeam,
}: {
  game: TeamPastGameItem;
  trackedTeam: MatchSummaryTeam;
}) {
  const isWin = game.result === "W";
  const isLoss = game.result === "L";
  const isTrackedHome = game.homeAway === "home";

  // Phân tích điểm số từ chuỗi (vd "2-1", "3 - 0", "0:5")
  const scoreMatch = game.score.match(/(\d+)\s*[-:]\s*(\d+)/);
  const n1 = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  const n2 = scoreMatch ? parseInt(scoreMatch[2], 10) : 0;

  const higher = Math.max(n1, n2);
  const lower = Math.min(n1, n2);

  let homeScore: number;
  let awayScore: number;

  if (isWin) {
    homeScore = isTrackedHome ? higher : lower;
    awayScore = isTrackedHome ? lower : higher;
  } else if (isLoss) {
    homeScore = isTrackedHome ? lower : higher;
    awayScore = isTrackedHome ? higher : lower;
  } else {
    homeScore = n1;
    awayScore = n2;
  }

  const trackedName = trackedTeam.displayName || trackedTeam.name;
  const opponentName = game.opponent?.displayName || game.opponent?.name || "Đối thủ";

  const homeTeamName = isTrackedHome ? trackedName : opponentName;
  const awayTeamName = isTrackedHome ? opponentName : trackedName;

  const pillBg = isWin
    ? "bg-[#16a34a] hover:bg-[#15803d]"
    : isLoss
      ? "bg-[#dc2626] hover:bg-[#b91c1c]"
      : "bg-[#d97706] hover:bg-[#b45309]";

  const underlineColor = isWin
    ? "bg-emerald-400"
    : isLoss
      ? "bg-rose-400"
      : "bg-amber-400";

  return (
    <div className="flex items-center justify-between py-2 px-0.5 sm:px-1 text-xs sm:text-[13px] font-sans group">
      {/* ĐỘI NHÀ (Căn phải) */}
      <span
        title={homeTeamName}
        className={`text-right truncate flex-1 font-medium transition-colors pr-1.5 sm:pr-3 ${
          isTrackedHome
            ? "text-white font-semibold group-hover:text-amber-200"
            : "text-zinc-300 group-hover:text-zinc-100"
        }`}
      >
        {homeTeamName}
      </span>

      {/* SCORE PILL VÀ GẠCH CHÂN CHUẨN FOTMOB */}
      <div className="flex flex-col items-center shrink-0 w-14 sm:w-20">
        <span
          className={`font-sans tabular-nums font-black text-xs sm:text-[12.5px] px-2 sm:px-2.5 py-0.5 rounded text-white shadow-sm transition-transform group-hover:scale-105 ${pillBg}`}
        >
          {homeScore} - {awayScore}
        </span>
        {/* Vạch gạch chân chỉ báo đội đang theo dõi chuẩn FotMob */}
        <div className="w-full flex mt-1 px-1">
          <div className={`w-1/2 flex items-center justify-center ${isTrackedHome ? "opacity-100" : "opacity-0"}`}>
            <span className={`w-3.5 h-0.5 rounded-full ${underlineColor}`} />
          </div>
          <div className={`w-1/2 flex items-center justify-center ${!isTrackedHome ? "opacity-100" : "opacity-0"}`}>
            <span className={`w-3.5 h-0.5 rounded-full ${underlineColor}`} />
          </div>
        </div>
      </div>

      {/* ĐỘI KHÁCH (Căn trái) */}
      <span
        title={awayTeamName}
        className={`text-left truncate flex-1 font-medium transition-colors pl-1.5 sm:pl-3 ${
          !isTrackedHome
            ? "text-white font-semibold group-hover:text-amber-200"
            : "text-zinc-300 group-hover:text-zinc-100"
        }`}
      >
        {awayTeamName}
      </span>
    </div>
  );
}

/**
 * Khối 5 trận gần nhất cho từng đội (có header logo, tên đội, dải phong độ T/H/B và ngăn cách rõ ràng trên mobile)
 */
function TeamRecentFormBlock({
  team,
  games,
  roleLabel,
}: {
  team: MatchSummaryTeam;
  games: TeamPastGameItem[];
  roleLabel: string;
}) {
  const teamName = team.displayName || team.name;
  const teamLogo = team.logo ? toDarkModeLogoUrl(team.logo) : "";

  return (
    <div className="rounded-xl bg-zinc-900/55 p-3 sm:p-3.5 space-y-2">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          {teamLogo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={teamLogo} alt="" loading="lazy" className="w-5 h-5 object-contain shrink-0" />
          ) : (
            <span className="w-5 h-5 rounded-full bg-zinc-800 shrink-0" />
          )}
          <span className="text-xs sm:text-[13px] font-bold text-white truncate">
            {teamName}
          </span>
          <span className="text-[10px] font-medium text-zinc-400 shrink-0">
            · {roleLabel}
          </span>
        </div>

        {games.length > 0 && (
          <div className="flex items-center gap-1 shrink-0" aria-label={`Chuỗi phong độ ${teamName}`}>
            {games.slice(0, 5).map((g) => {
              const badgeColor =
                g.result === "W"
                  ? "bg-emerald-600 text-white"
                  : g.result === "L"
                    ? "bg-rose-600 text-white"
                    : "bg-amber-600 text-white";
              const label = g.result === "W" ? "T" : g.result === "L" ? "B" : "H";
              return (
                <span
                  key={g.id}
                  className={`w-4 h-4 rounded text-[10px] font-bold font-sans tabular-nums flex items-center justify-center ${badgeColor}`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {games.length > 0 ? (
        <div className="divide-y divide-white/[0.04]">
          {games.map((g) => (
            <FotmobFormMatchRow key={g.id} game={g} trackedTeam={team} />
          ))}
        </div>
      ) : (
        <p className="text-center py-6 text-xs text-zinc-500 font-sans">
          Chưa có dữ liệu phong độ
        </p>
      )}
    </div>
  );
}

/**
 * FotMob Authentic Head-to-Head Section
 */
function HeadToHeadCard({
  headToHead,
}: {
  headToHead: MatchHeadToHead;
}) {
  const events = headToHead.events || [];

  return (
    <div className="rounded-2xl bg-zinc-950/70 p-3.5 sm:p-5 shadow-sm space-y-3">
      {/* HEADER: TỔNG QUAN TỶ SỐ ĐỐI ĐẦU */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] gap-2 flex-wrap">
        <h4 className="text-xs sm:text-sm font-bold text-white font-sans">
          Lịch sử đối đầu trực tiếp
        </h4>
        {headToHead.summary && (
          <span className="text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2.5 py-0.5 rounded-full font-sans tabular-nums">
            {formatH2HSummary(headToHead.summary)}
          </span>
        )}
      </div>

      {/* DANH SÁCH CÁC TRẬN ĐỐI ĐẦU TRỰC TIẾP */}
      {events.length === 0 ? (
        <p className="text-xs text-zinc-500 py-6 text-center font-sans">
          Chưa có dữ liệu đối đầu trước đây
        </p>
      ) : (
        <div className="space-y-2 sm:space-y-0.5">
          {events.map((ev) => {
            const hTeam = ev.homeTeam;
            const aTeam = ev.awayTeam;
            const hLogo = hTeam.logo ? toDarkModeLogoUrl(hTeam.logo) : "";
            const aLogo = aTeam.logo ? toDarkModeLogoUrl(aTeam.logo) : "";

            return (
              <div
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 py-2.5 sm:py-2 px-2.5 sm:px-3 bg-zinc-900/45 sm:bg-transparent sm:border-b sm:border-white/[0.04] sm:last:border-b-0 hover:bg-white/[0.03] transition rounded-xl sm:rounded-lg text-xs font-sans group"
              >
                {/* 1. NGÀY & GIẢI ĐẤU (Trên mobile xếp thành hàng meta phía trên để nhường tối đa chiều ngang cho tên 2 đội) */}
                <div className="flex items-center justify-between sm:flex-col sm:items-start sm:min-w-[85px] text-zinc-400 shrink-0 gap-2 sm:gap-0">
                  <span className="tabular-nums text-[11px] font-semibold text-zinc-400 sm:text-zinc-300">
                    {formatH2HDate(ev.date) || formatGameDate(ev.date)}
                  </span>
                  {ev.competitionName && (
                    <span className="text-[10.5px] sm:text-[10px] text-zinc-500 font-medium truncate max-w-[150px] sm:max-w-[130px]">
                      {cleanCompetitionName(ev.competitionName)}
                    </span>
                  )}
                </div>

                {/* 2. CẶP ĐẤU & TỶ SỐ TRUNG TÂM */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-1 min-w-0">
                  {/* Đội nhà */}
                  <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1 min-w-0 text-right">
                    <span className={`text-xs truncate ${hTeam.winner ? "font-bold text-white" : "font-medium text-zinc-300 group-hover:text-white"}`}>
                      {hTeam.displayName || hTeam.name}
                    </span>
                    {hLogo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={hLogo} alt="" loading="lazy" className="w-4 h-4 object-contain shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-zinc-800 shrink-0" />
                    )}
                  </div>

                  {/* Tỷ số trung tâm */}
                  <div className="shrink-0 font-sans tabular-nums font-black text-xs text-white bg-zinc-800/90 px-2 py-0.5 rounded shadow-sm min-w-[42px] text-center">
                    {hTeam.score} - {aTeam.score}
                  </div>

                  {/* Đội khách */}
                  <div className="flex items-center justify-start gap-1.5 sm:gap-2 flex-1 min-w-0 text-left">
                    {aLogo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={aLogo} alt="" loading="lazy" className="w-4 h-4 object-contain shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full bg-zinc-800 shrink-0" />
                    )}
                    <span className={`text-xs truncate ${aTeam.winner ? "font-bold text-white" : "font-medium text-zinc-300 group-hover:text-white"}`}>
                      {aTeam.displayName || aTeam.name}
                    </span>
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

export function MatchRecentForm({
  homeTeam,
  awayTeam,
  recentForm,
  headToHead,
  mode = "all",
}: MatchRecentFormProps) {
  const homeGames = recentForm?.home || [];
  const awayGames = recentForm?.away || [];
  const hasRecent = homeGames.length > 0 || awayGames.length > 0;
  const hasH2H = Boolean(headToHead && headToHead.events && headToHead.events.length > 0);

  const [formSubTab, setFormSubTab] = useState<"recent" | "h2h">(() => {
    if (mode === "recent") return "recent";
    if (mode === "h2h") return "h2h";
    return hasRecent ? "recent" : "h2h";
  });

  const effectiveView = mode === "all" ? formSubTab : mode;

  if (effectiveView === "recent" && !hasRecent) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-zinc-500 text-center">
        <TrendingUp className="w-7 h-7 text-zinc-600" />
        <p className="text-xs sm:text-sm font-semibold text-zinc-400">
          Chưa có dữ liệu 5 trận gần nhất
        </p>
        <p className="text-[11px] text-zinc-500">
          Dữ liệu kết quả các trận gần nhất sẽ tự động hiển thị khi ban tổ chức cập nhật.
        </p>
      </div>
    );
  }

  if (effectiveView === "h2h" && !hasH2H) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-zinc-500 text-center">
        <TrendingUp className="w-7 h-7 text-zinc-600" />
        <p className="text-xs sm:text-sm font-semibold text-zinc-400">
          Chưa có dữ liệu thành tích đối đầu
        </p>
        <p className="text-[11px] text-zinc-500">
          Dữ liệu các trận đối đầu trực tiếp sẽ tự động hiển thị khi có thông tin.
        </p>
      </div>
    );
  }

  if (!hasRecent && !hasH2H) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-zinc-500 text-center">
        <TrendingUp className="w-7 h-7 text-zinc-600" />
        <p className="text-xs sm:text-sm font-semibold text-zinc-400">
          Chưa có dữ liệu phong độ và đối đầu của hai đội
        </p>
        <p className="text-[11px] text-zinc-500">
          Dữ liệu kết quả 5 trận gần nhất sẽ tự động hiển thị khi ban tổ chức cập nhật.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-4xl mx-auto pt-1">
      {/* NÚT CHUYỂN ĐỔI TAB CON (CHỈ HIỂN THỊ KHI mode === "all") */}
      {mode === "all" && hasRecent && hasH2H && (
        <div className="flex items-center gap-5 pb-1 border-b border-white/[0.06]">
          <button
            type="button"
            onClick={() => setFormSubTab("recent")}
            className={`text-xs font-bold transition cursor-pointer pb-1.5 border-b-2 -mb-px ${
              formSubTab === "recent"
                ? "border-white text-white font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            5 trận gần nhất
          </button>
          <button
            type="button"
            onClick={() => setFormSubTab("h2h")}
            className={`text-xs font-bold transition cursor-pointer pb-1.5 border-b-2 -mb-px ${
              formSubTab === "h2h"
                ? "border-white text-white font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Thành tích đối đầu
          </button>
        </div>
      )}

      {/* NỘI DUNG 1: 5 TRẬN GẦN NHẤT - CHUẨN FORM FOTMOB */}
      {effectiveView === "recent" && hasRecent && (
        <div className="rounded-2xl bg-zinc-950/70 p-3 sm:p-5 shadow-sm space-y-3">
          {/* TIÊU ĐỀ SECTION CHÍNH GIỮA */}
          <h3 className="text-center font-sans font-bold text-sm sm:text-base text-white tracking-wide">
            Phong độ gần đây
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-5">
            <TeamRecentFormBlock
              team={homeTeam}
              games={homeGames}
              roleLabel="Đội nhà"
            />
            <TeamRecentFormBlock
              team={awayTeam}
              games={awayGames}
              roleLabel="Đội khách"
            />
          </div>
        </div>
      )}

      {/* NỘI DUNG 2: ĐỐI ĐẦU TRỰC TIẾP (H2H) */}
      {effectiveView === "h2h" && headToHead && (
        <HeadToHeadCard headToHead={headToHead} />
      )}
    </div>
  );
}
