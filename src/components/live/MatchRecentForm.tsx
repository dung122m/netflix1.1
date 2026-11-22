"use client";

import React, { useState } from "react";
import { MatchSummaryTeam, TeamPastGameItem, MatchHeadToHead } from "@/services/live/football-score/types";
import { TrendingUp } from "lucide-react";
import { toDarkModeLogoUrl } from "@/services/live/football-logo/service";

interface MatchRecentFormProps {
  homeTeam: MatchSummaryTeam;
  awayTeam: MatchSummaryTeam;
  recentForm?: {
    home?: TeamPastGameItem[];
    away?: TeamPastGameItem[];
  };
  headToHead?: MatchHeadToHead;
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
  // 1. Loại bỏ tiền tố mùa giải (vd: "2025-26 ", "2023-2024 ", "2023 ")
  let clean = name.replace(/^(\d{4}(?:-\d{2,4})?)\s+/i, "").trim();

  // 2. Dịch và chuẩn hóa tên giải đấu sang tiếng Việt ngắn gọn, không bị tràn hay cắt chữ
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

  // Loại bỏ các từ dư thừa như "German ", "English ", "Spanish ", "Italian ", "French "
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

function FormResultPill({ result, size = "md" }: { result: "W" | "D" | "L"; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  const dim = isSm ? "w-4 h-4 text-[9px]" : "w-5 h-5 text-[10px]";

  if (result === "W") {
    return (
      <span
        title="Thắng"
        className={`${dim} rounded-full bg-emerald-500/20 text-emerald-400 font-sans font-black flex items-center justify-center shrink-0 shadow-sm`}
      >
        T
      </span>
    );
  }
  if (result === "D") {
    return (
      <span
        title="Hòa"
        className={`${dim} rounded-full bg-amber-500/20 text-amber-400 font-sans font-black flex items-center justify-center shrink-0 shadow-sm`}
      >
        H
      </span>
    );
  }
  return (
    <span
      title="Thua"
      className={`${dim} rounded-full bg-rose-500/20 text-rose-400 font-sans font-black flex items-center justify-center shrink-0 shadow-sm`}
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
    <div className="space-y-3">
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

function HeadToHeadCard({
  headToHead,
}: {
  headToHead: MatchHeadToHead;
}) {
  const events = headToHead.events || [];

  return (
    <div className="space-y-3.5">
      {/* HEADER: TỔNG QUAN TỶ SỐ ĐỐI ĐẦU */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] gap-2 flex-wrap">
        <h4 className="text-xs sm:text-sm font-black text-white font-sans">
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
        <div className="space-y-1.5">
          {events.map((ev) => {
            const hTeam = ev.homeTeam;
            const aTeam = ev.awayTeam;
            const hLogo = hTeam.logo ? toDarkModeLogoUrl(hTeam.logo) : "";
            const aLogo = aTeam.logo ? toDarkModeLogoUrl(aTeam.logo) : "";

            return (
              <div
                key={ev.id}
                className="flex items-center justify-between gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition text-xs font-sans"
              >
                {/* 1. NGÀY & GIẢI ĐẤU (RÕ RÀNG, CHUẨN XÁC, KHÔNG CẮT CHỮ BỊ DẤU 3 CHẤM) */}
                <div className="flex flex-col min-w-[76px] sm:min-w-[90px] text-zinc-400 shrink-0">
                  <span className="tabular-nums text-[11px] font-bold text-zinc-300">
                    {formatH2HDate(ev.date) || formatGameDate(ev.date)}
                  </span>
                  {ev.competitionName && (
                    <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[100px] sm:max-w-[150px]">
                      {cleanCompetitionName(ev.competitionName)}
                    </span>
                  )}
                </div>

                {/* 2. ĐỘI NHÀ */}
                <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
                  <span className={`text-xs truncate ${hTeam.winner ? "font-bold text-white" : "font-medium text-zinc-300"}`}>
                    {hTeam.displayName || hTeam.name}
                  </span>
                  {hLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={hLogo} alt="" loading="lazy" className="w-4 h-4 object-contain shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-zinc-800 shrink-0" />
                  )}
                </div>

                {/* 3. TỶ SỐ TRUNG TÂM */}
                <div className="shrink-0 px-2 font-sans tabular-nums font-black text-xs text-white">
                  {hTeam.score} : {aTeam.score}
                </div>

                {/* 4. ĐỘI KHÁCH */}
                <div className="flex items-center justify-start gap-2 flex-1 min-w-0 text-left">
                  {aLogo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={aLogo} alt="" loading="lazy" className="w-4 h-4 object-contain shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-zinc-800 shrink-0" />
                  )}
                  <span className={`text-xs truncate ${aTeam.winner ? "font-bold text-white" : "font-medium text-zinc-300"}`}>
                    {aTeam.displayName || aTeam.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MatchRecentForm({ homeTeam, awayTeam, recentForm, headToHead }: MatchRecentFormProps) {
  const homeGames = recentForm?.home || [];
  const awayGames = recentForm?.away || [];
  const hasRecent = homeGames.length > 0 || awayGames.length > 0;
  const hasH2H = Boolean(headToHead && headToHead.events && headToHead.events.length > 0);

  const [formSubTab, setFormSubTab] = useState<"recent" | "h2h">(() => (hasRecent ? "recent" : "h2h"));

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
      {/* NÚT CHUYỂN ĐỔI TAB CON: 5 TRẬN GẦN NHẤT vs ĐỐI ĐẦU TRỰC TIẾP */}
      {hasRecent && hasH2H && (
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
            Lịch sử đối đầu
          </button>
        </div>
      )}

      {/* NỘI DUNG 1: 5 TRẬN GẦN NHẤT */}
      {(formSubTab === "recent" || !hasH2H) && hasRecent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <TeamFormCard team={homeTeam} games={homeGames} isHome={true} />
          <TeamFormCard team={awayTeam} games={awayGames} isHome={false} />
        </div>
      )}

      {/* NỘI DUNG 2: ĐỐI ĐẦU TRỰC TIẾP (H2H) */}
      {(formSubTab === "h2h" || !hasRecent) && headToHead && (
        <HeadToHeadCard headToHead={headToHead} />
      )}
    </div>
  );
}
