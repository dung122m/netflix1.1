"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Bot, ChevronDown, ChevronUp, CheckCircle2, Flame } from "lucide-react";

interface AiMovieVibeProps {
  slug: string;
  title: string;
  category?: string;
  country?: string;
  synopsis?: string;
  year?: number | string;
}

interface InsightData {
  vibe: string;
  targetAudience: string;
  hook: string;
  matchScore: number;
  highlightBadges: string[];
  provider: string;
}

export function AiMovieVibe({
  slug,
  title,
  category,
  country,
  synopsis,
  year,
}: AiMovieVibeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightData | null>(null);

  // Đọc từ bộ nhớ tạm của trình duyệt (0 token nếu đã xem trước đó)
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`ai_vibe_${slug}`);
      if (cached) {
        setData(JSON.parse(cached));
      }
    } catch {}
  }, [slug]);

  const handleFetchInsight = async () => {
    if (data) {
      setIsOpen(!isOpen);
      return;
    }

    setIsOpen(true);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          category,
          country,
          synopsis,
          year,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
        try {
          sessionStorage.setItem(`ai_vibe_${slug}`, JSON.stringify(json));
        } catch {}
      }
    } catch {
      // Fallback cục bộ an toàn
      setData({
        vibe: "Cuốn hút, đặc sắc và đáng trải nghiệm 🎬",
        targetAudience: "Khán giả yêu thích phim chất lượng cao",
        hook: "Tác phẩm tiêu biểu với cốt truyện giữ chân người xem",
        matchScore: 94,
        highlightBadges: ["Đáng Xem", "Trending", "Chất Lượng"],
        provider: "Trợ Lý Nana",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-rose-500/25 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-3 sm:p-4 shadow-[0_4px_25px_rgba(229,9,20,0.08)] relative overflow-hidden">
      {/* NÚT BẤM KÍCH HOẠT */}
      <button
        type="button"
        onClick={handleFetchInsight}
        className="w-full flex items-center justify-between gap-3 text-left group cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-purple-600 text-white flex items-center justify-center flex-none shadow-md shadow-red-950 border border-white/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin [animation-duration:5s]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white group-hover:text-rose-400 transition flex items-center gap-1.5">
                <span>Nana Nhận Định: Vì sao nên xem?</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  Nana AI
                </span>
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate mt-0.5">
              Nana phân tích gu xem, không khí phim và độ tương thích trước khi xem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-gray-400 group-hover:text-white transition flex-none">
          <span className="hidden sm:inline">
            {isOpen ? "Thu gọn" : "Khám phá"}
          </span>
          {isOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* NỘI DUNG NHẬN ĐỊNH EXPANDABLE */}
      {isOpen && (
        <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
          {loading ? (
            <div className="flex items-center gap-2.5 py-3 text-xs text-gray-400 animate-pulse">
              <Bot className="w-4 h-4 text-rose-500 animate-bounce" />
              <span>Nana đang phân tích không khí và điểm cuốn hút của phim...</span>
            </div>
          ) : data ? (
            <div className="space-y-3">
              {/* THANH ĐIỂM TƯƠNG THÍCH & BADGES */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-black shadow-inner">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>{data.matchScore}% Độ Hợp Gu</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {data.highlightBadges?.map((b, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold"
                    >
                      #{b}
                    </span>
                  ))}
                </div>
              </div>

              {/* KHÔNG KHÍ PHIM (VIBE) */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 mb-1">
                  <span>🎭 Không khí & Cảm xúc:</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-200 font-medium leading-relaxed">
                  {data.vibe}
                </p>
              </div>

              {/* ĐỐI TƯỢNG PHÙ HỢP & ĐIỂM CUỐN HÚT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>Dành cho ai:</span>
                  </span>
                  <p className="text-gray-300 leading-normal">
                    {data.targetAudience}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Điểm cuốn hút nhất:</span>
                  </span>
                  <p className="text-gray-300 leading-normal">{data.hook}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                <span>✨ Đánh giá được xử lý bởi {data.provider}</span>
                <span className="text-emerald-400 font-medium">Đã lưu đệm (0 Token lượt xem lại)</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default AiMovieVibe;
