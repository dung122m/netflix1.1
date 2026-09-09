"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  Dices,
  Sparkles,
  X,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Heart,
  Users,
  Clock,
  Flame,
  Smile,
  CloudRain,
  Brain,
  Ghost,
  Rocket,
  Palette,
  ShieldAlert,
  Globe2,
} from "lucide-react";

interface RouletteResult {
  movie: {
    slug: string;
    title: string;
    originalTitle?: string;
    poster: string;
    year?: number | string;
    quality?: string;
    category?: string;
    country?: string;
    episodeCurrent?: string;
  };
  punchline: string;
  badges: string[];
  matchScore: number;
  provider: string;
}

const MOODS = [
  { id: "xa-stress", label: "Xả Stress", icon: Smile, emoji: "🍿", desc: "Hài hước, vui tươi, cười thả ga" },
  { id: "mau-lua", label: "Máu Lửa", icon: Flame, emoji: "🥋", desc: "Hành động, đấm đá, cháy nổ mãn nhãn" },
  { id: "hack-nao", label: "Hack Não", icon: Brain, emoji: "🤯", desc: "Trinh thám, twist bất ngờ, đấu trí" },
  { id: "ngot-ngao", label: "Ngọt Ngào", icon: Heart, emoji: "💖", desc: "Tình cảm, lãng mạn, chữa lành" },
  { id: "tram-lang", label: "Trầm Lắng", icon: CloudRain, emoji: "🌧️", desc: "Sâu sắc, cảm động, giàu nhân văn" },
  { id: "kinh-di", label: "Kinh Dị", icon: Ghost, emoji: "👻", desc: "Rùng rợn, ma mị, thót tim giật gân" },
  { id: "vien-tuong", label: "Viễn Tưởng", icon: Rocket, emoji: "🚀", desc: "Vũ trụ, siêu anh hùng, kỳ ảo" },
  { id: "anime", label: "Hoạt Hình", icon: Palette, emoji: "🎨", desc: "Anime, phiêu lưu kỳ thú, tuổi thơ" },
  { id: "co-trang", label: "Cổ Trang", icon: Sparkles, emoji: "⚔️", desc: "Kiếm hiệp, cung đấu, tiên hiệp" },
  { id: "toi-pham", label: "Tội Phạm", icon: ShieldAlert, emoji: "🕵️", desc: "Băng đảng, phá án, nghẹt thở" },
];

const COUNTRIES = [
  { id: "all", label: "Toàn Cầu", flag: "🌐" },
  { id: "han-quoc", label: "Hàn Quốc", flag: "🇰🇷" },
  { id: "au-my", label: "Âu Mỹ", flag: "🇺🇸" },
  { id: "trung-quoc", label: "Trung Quốc", flag: "🇨🇳" },
  { id: "nhat-ban", label: "Nhật Bản", flag: "🇯🇵" },
  { id: "viet-nam", label: "Việt Nam", flag: "🇻🇳" },
  { id: "thai-lan", label: "Thái Lan", flag: "🇹🇭" },
];

const COMPANIONS = [
  { id: "mot-minh", label: "Một Mình Chill", icon: "👤", desc: "Tự do cày phim" },
  { id: "nguoi-yeu", label: "Cùng Người Yêu", icon: "💑", desc: "Lãng mạn, ngọt ngào" },
  { id: "gia-dinh", label: "Cùng Gia Đình", icon: "👨‍👩‍👧‍👦", desc: "Ấm áp, hòa thuận" },
  { id: "ban-be", label: "Hội Bạn Thân", icon: "🍻", desc: "Sôi động, quẩy hết mình" },
];

const DURATIONS = [
  { id: "phim-le", label: "Phim Lẻ Nhanh", icon: "⚡", desc: "Dưới 2 tiếng trọn vẹn" },
  { id: "chieu-rap", label: "Bom Tấn Rạp", icon: "🎬", desc: "Hoành tráng, mãn nhãn" },
  { id: "phim-bo", label: "Series Cày Đêm", icon: "📺", desc: "Nhiều tập cuốn hút" },
  { id: "bat-ky", label: "Bất Kỳ", icon: "🎲", desc: "Để số phận quyết định" },
];

export function AiMovieRoulette() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [selectedMood, setSelectedMood] = useState("xa-stress");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCompanion, setSelectedCompanion] = useState("mot-minh");
  const [selectedDuration, setSelectedDuration] = useState("phim-le");

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<RouletteResult | null>(null);

  // Danh sách các phim đã quay trong phiên để đảm bảo không bị lặp
  const [seenSlugs, setSeenSlugs] = useState<string[]>([]);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-ai-roulette", handleOpen);
    return () => window.removeEventListener("open-ai-roulette", handleOpen);
  }, []);

  // Đóng bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSpin = async (excludeCurrent = false) => {
    setIsSpinning(true);
    setResult(null);

    const currentExSlugs = excludeCurrent && result ? [...seenSlugs, result.movie.slug] : seenSlugs;
    const currentExTitles = excludeCurrent && result ? [...seenTitles, result.movie.title] : seenTitles;

    try {
      const res = await fetch("/api/ai-roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: selectedMood,
          country: selectedCountry,
          companion: selectedCompanion,
          duration: selectedDuration,
          excludeSlugs: currentExSlugs,
          excludeTitles: currentExTitles,
        }),
      });

      const data = await res.json();

      // Hiệu ứng delay nhỏ tạo cảm giác bốc quẻ hồi hộp
      setTimeout(() => {
        if (data?.movie?.slug) {
          setResult(data);
          setSeenSlugs((prev) => Array.from(new Set([...prev, data.movie.slug])));
          setSeenTitles((prev) => Array.from(new Set([...prev, data.movie.title])));
        }
        setIsSpinning(false);
      }, 500);
    } catch {
      setIsSpinning(false);
    }
  };

  const handleChangeCriteria = () => {
    setResult(null);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-gradient-to-b from-zinc-900 via-zinc-950 to-black rounded-3xl border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-amber-900/50">
              <Dices className="w-5 h-5 animate-bounce [animation-duration:2s]" />
            </div>
            <div>
              <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-1.5">
                <span>Suất Chiếu Định Mệnh</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  AI Roulette 🎲
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Bốc quẻ điện ảnh chuẩn gu chỉ trong tích tắc
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
          {isSpinning ? (
            /* TRẠNG THÁI ĐANG BỐC QUẺ */
            <div className="py-16 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center" />
                <Dices className="w-8 h-8 text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-white font-black text-base">Đang Bốc Quẻ Định Mệnh...</h4>
                <p className="text-xs text-gray-400">Đang quét hàng nghìn bộ phim phù hợp nhất với tâm trạng của bạn</p>
              </div>
            </div>
          ) : !result ? (
            <>
              {/* 1. CHỌN TÂM TRẠNG */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    1. Tâm trạng của bạn lúc này?
                  </span>
                  <span className="text-[10px] text-gray-400">Chọn 1 vibe</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {MOODS.map((m) => {
                    const isSelected = selectedMood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-red-600/25 border-red-500 text-white shadow-md shadow-red-950/50 scale-[1.02]"
                            : "bg-zinc-900/60 border-white/10 text-gray-300 hover:bg-zinc-800/80 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{m.emoji}</span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </div>
                        <div className="mt-1.5 font-bold text-xs">{m.label}</div>
                        <div className="text-[10px] text-gray-400 line-clamp-1">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. CHỌN QUỐC GIA */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>2. Xuất xứ / Quốc gia ưu tiên?</span>
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {COUNTRIES.map((c) => {
                    const isSelected = selectedCountry === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCountry(c.id)}
                        className={`flex-none px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-sky-600/30 border-sky-500 text-white shadow-md shadow-sky-950/50 scale-105"
                            : "bg-zinc-900/60 border-white/10 text-gray-300 hover:bg-zinc-800/80 hover:border-white/20"
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. NGƯỜI XEM CÙNG */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. Bạn đang xem cùng ai?</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMPANIONS.map((c) => {
                    const isSelected = selectedCompanion === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCompanion(c.id)}
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600/25 border-emerald-500 text-white shadow-md shadow-emerald-950/50 scale-[1.02]"
                            : "bg-zinc-900/60 border-white/10 text-gray-300 hover:bg-zinc-800/80 hover:border-white/20"
                        }`}
                      >
                        <div className="text-lg">{c.icon}</div>
                        <div className="font-bold text-xs mt-1">{c.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{c.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. THỜI LƯỢNG / ĐỊNH DẠNG */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>4. Thời lượng & Định dạng?</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DURATIONS.map((d) => {
                    const isSelected = selectedDuration === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDuration(d.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/50 scale-[1.02]"
                            : "bg-zinc-900/60 border-white/10 text-gray-300 hover:bg-zinc-800/80 hover:border-white/20"
                        }`}
                      >
                        <div className="text-lg">{d.icon}</div>
                        <div className="font-bold text-xs mt-1">{d.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{d.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* KẾT QUẢ SUẤT CHIẾU ĐỊNH MỆNH */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-zinc-900 shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                {/* POSTER */}
                <div className="relative w-40 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden flex-none shadow-xl border border-white/10 group">
                  <Image
                    src={result.movie.poster}
                    alt={result.movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                    sizes="180px"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black shadow">
                    {result.movie.quality || "FHD"}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500 text-black text-[10px] font-black shadow">
                    {result.matchScore}% Phù Hợp
                  </div>
                </div>

                {/* INFO */}
                <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                    {result.badges.map((b, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-gray-200 border border-white/10 font-bold"
                      >
                        {b}
                      </span>
                    ))}
                    {result.movie.country && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                        {result.movie.country}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-white font-black text-lg sm:text-2xl line-clamp-1">
                      {result.movie.title}
                    </h4>
                    {result.movie.originalTitle && (
                      <p className="text-xs text-gray-400 italic line-clamp-1">
                        {result.movie.originalTitle} ({result.movie.year})
                      </p>
                    )}
                  </div>

                  {/* LỜI BÌNH AI */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed text-left">
                    <p className="font-bold text-[11px] text-amber-300 flex items-center gap-1 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nana AI đã chọn tác phẩm này cho bạn:</span>
                    </p>
                    <p className="italic font-medium">&quot;{result.punchline}&quot;</p>
                  </div>

                  {/* NÚT HÀNH ĐỘNG */}
                  <div className="pt-2 flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <Link
                      href={`/movies/${result.movie.slug}`}
                      onClick={() => setIsOpen(false)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-950 transition hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Xem Phim Này Luôn</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleSpin(true)}
                      disabled={isSpinning}
                      className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gray-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-white/10 hover:border-white/30"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                      <span>Quay Phim Khác 🎲</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleChangeCriteria}
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-white/10"
                      title="Thay đổi tâm trạng hoặc quốc gia"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Đổi Tiêu Chí Chọn</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER BUTTON (KHI CHƯA CÓ KẾT QUẢ VÀ KHÔNG ĐANG QUAY) */}
        {!result && !isSpinning && (
          <div className="p-4 border-t border-white/10 bg-zinc-900/80 flex items-center justify-between gap-3">
            <div className="text-[11px] text-gray-400 hidden sm:block">
              Đã bốc <span className="text-amber-400 font-bold">{seenSlugs.length}</span> quẻ trong phiên này
            </div>
            <button
              type="button"
              onClick={() => handleSpin(false)}
              disabled={isSpinning}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-950 transition hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Dices className="w-5 h-5" />
              <span>Bốc Quẻ Ngay 🎲</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default AiMovieRoulette;
