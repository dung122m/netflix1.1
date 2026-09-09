"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Flame,
  Heart,
  Brain,
  Coffee,
  Popcorn,
  ShieldAlert,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { MovieEmotionalInsight } from "@/app/api/ai-insight/route";

interface Props {
  slug: string;
  title: string;
  category?: string;
  country?: string;
  synopsis?: string;
  year?: number | string;
}

export const MovieEmotionalRadar: React.FC<Props> = ({
  slug,
  title,
  category = "",
  country = "",
  synopsis = "",
  year = 2024,
}) => {
  const [data, setData] = useState<MovieEmotionalInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchRadar() {
      try {
        setLoading(true);
        const res = await fetch("/api/ai-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, title, category, country, synopsis, year }),
        });
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setData(json);
        }
      } catch (err) {
        console.warn("Lỗi tải Radar cảm xúc:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (slug && title) {
      fetchRadar();
    }

    return () => {
      isMounted = false;
    };
  }, [slug, title, category, country, synopsis, year]);

  if (loading) {
    return (
      <div className="mt-6 p-4 rounded-2xl bg-zinc-900/60 border border-white/10 animate-pulse flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/10 flex-none" />
        <div className="space-y-1.5 flex-1">
          <div className="h-4 bg-white/10 rounded w-1/3" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const meters = [
    {
      label: "Kịch tính & Hồi hộp",
      score: data.actionScore,
      icon: Flame,
      color: "from-amber-500 to-red-500",
      textColor: "text-rose-400",
    },
    {
      label: "Cảm động & Sâu lắng",
      score: data.emotionScore,
      icon: Heart,
      color: "from-rose-400 to-pink-600",
      textColor: "text-pink-400",
    },
    {
      label: "Bất ngờ & Plot Twist",
      score: data.twistScore,
      icon: Brain,
      color: "from-purple-400 to-indigo-600",
      textColor: "text-purple-400",
    },
    {
      label: "Thư giãn & Hài hước",
      score: data.chillScore,
      icon: Coffee,
      color: "from-emerald-400 to-teal-500",
      textColor: "text-emerald-400",
    },
    {
      label: "Độ cuốn hút (Binge)",
      score: data.bingeScore,
      icon: Popcorn,
      color: "from-amber-400 to-orange-500",
      textColor: "text-amber-400",
    },
  ];

  return (
    <div className="mt-6 rounded-2xl bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 border border-white/15 p-4 sm:p-5 shadow-2xl space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span>Radar Cảm Xúc & Vibe Phim</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-300 font-bold border border-rose-500/30">
                ✨ Nana AI
              </span>
            </h4>
            <p className="text-xs text-gray-300 line-clamp-1">{data.vibeSummary}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
        >
          <span>{isExpanded ? "Thu gọn" : "Xem chi tiết"}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* METERS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
        {meters.slice(0, isExpanded ? meters.length : 3).map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Icon className={`w-3.5 h-3.5 ${m.textColor}`} />
                  <span>{m.label}</span>
                </span>
                <span className={`font-mono ${m.textColor}`}>{m.score}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${m.color} rounded-full transition-all duration-700`}
                  style={{ width: `${m.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED SPOILER-FREE ADVICE (HIỂN THỊ KHI MỞ RỘNG HOẶC MẶC ĐỊNH 1 DÒNG) */}
      <div className="pt-1 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-300">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="italic">{data.contentWarning}</span>
        </div>
        {isExpanded && (
          <div className="flex items-center gap-2 text-indigo-300 bg-indigo-950/40 border border-indigo-500/20 px-3 py-1 rounded-xl">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{data.bestTimeToWatch}</span>
          </div>
        )}
      </div>
    </div>
  );
};
