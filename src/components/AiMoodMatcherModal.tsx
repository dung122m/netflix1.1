"use client";

import React, { useState, useEffect, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  X,
  Heart,
  Send,
  Loader2,
  Play,
  RotateCcw,
  Film,
  Smile,
  Compass,
} from "lucide-react";
import { pickBestMoviePoster } from "@/lib/movieMedia";

const PRESET_MOODS = [
  { emoji: "💔", label: "Vừa chia tay cần chữa lành", prompt: "Tôi vừa chia tay người yêu, muốn tìm phim nhẹ nhàng chữa lành tâm hồn, kết thúc có hậu để có thêm hy vọng." },
  { emoji: "🌧️", label: "Mưa đêm cô đơn & hoài niệm", prompt: "Đêm mưa một mình thấy cô đơn, muốn tìm phim hoài niệm, không khí lắng đọng sâu sắc như Trùng Khánh Sâm Lâm hay Lost in Translation." },
  { emoji: "💼", label: "Áp lực muốn cười xả stress", prompt: "Vừa trải qua ngày làm việc căng thẳng, muốn xem một bộ phim hài bựa, vui nhộn từ đầu đến cuối để xả hết mệt mỏi." },
  { emoji: "🧩", label: "Kích thích trí não & Hack não", prompt: "Muốn xem phim trinh thám, du hành thời gian hoặc tâm lý giật gân có plot twist đỉnh cao khiến người xem phải suy ngẫm." },
  { emoji: "🌸", label: "Tình yêu ngọt ngào thanh xuân", prompt: "Muốn cảm giác rung động con tim với một bộ phim tình cảm lãng mạn ngọt ngào, thanh xuân vườn trường hoặc tình yêu vượt thời gian." },
  { emoji: "🔥", label: "Hành động kịch tính nghẹt thở", prompt: "Cần nạp năng lượng với phim hành động mãn nhãn, đấu trí căng thẳng, đánh đấm mãn nhãn từ đầu đến cuối." },
];

interface MatchedMovie {
  id?: string;
  name: string;
  origin_name?: string;
  slug: string;
  thumb_url?: string;
  poster_url?: string;
  year?: number | string;
  quality?: string;
  whyWatch?: string;
}

export const AiMoodMatcherModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMood, setInputMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [nanaNote, setNanaNote] = useState<string | null>(null);
  const [moodSummary, setMoodSummary] = useState<string | null>(null);
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [movies, setMovies] = useState<MatchedMovie[]>([]);
  const [provider, setProvider] = useState<string | null>(null);
  const inputId = useId();

  const handleMatch = useCallback(async (customText?: string) => {
    const textToMatch = customText || inputMood;
    if (!textToMatch || textToMatch.trim().length < 2) return;

    setLoading(true);
    setNanaNote(null);
    setMovies([]);

    try {
      const res = await fetch("/api/ai-mood-matcher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: textToMatch }),
      });

      const data = await res.json();
      if (data.success) {
        setNanaNote(data.nanaNote);
        setMoodSummary(data.moodSummary);
        setVibeTags(data.vibeTags || []);
        setMovies(data.movies || []);
        setProvider(data.provider || "Groq Qwen 27B");
      }
    } catch (err) {
      console.error("Lỗi AI Mood Matcher:", err);
    } finally {
      setLoading(false);
    }
  }, [inputMood]);

  useEffect(() => {
    const handleOpen = (e?: CustomEvent<{ mood?: string }>) => {
      setIsOpen(true);
      if (e?.detail?.mood) {
        setInputMood(e.detail.mood);
        handleMatch(e.detail.mood);
      }
    };

    window.addEventListener("open-ai-mood-matcher" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    return () => {
      window.removeEventListener("open-ai-mood-matcher" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    };
  }, [handleMatch]);

  // Đóng bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-zinc-950/95 rounded-3xl border border-rose-500/30 shadow-2xl shadow-rose-950/40 overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Glow ambient background */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />

        {/* HEADER */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-zinc-900/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30">
              <Heart className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <span>Nana AI Mood & Vibe Matcher</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Mới
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">Tìm phim may đo theo cảm xúc & câu chuyện của bạn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="relative z-10 p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* QUICK MOOD CHIPS */}
          {!movies.length && !loading && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-rose-400" />
                <span>Chọn nhanh cảm xúc lúc này:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_MOODS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputMood(p.prompt);
                      handleMatch(p.prompt);
                    }}
                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-rose-500/40 text-left transition flex items-center gap-2.5 group cursor-pointer"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{p.emoji}</span>
                    <span className="text-xs font-semibold text-gray-200 group-hover:text-white leading-tight">
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleMatch();
            }}
            className="space-y-2"
          >
            <label htmlFor={inputId} className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-purple-400" />
              <span>Hoặc kể cho Nana nghe tâm trạng của bạn:</span>
            </label>
            <div className="relative flex items-center">
              <input
                id={inputId}
                type="text"
                value={inputMood}
                onChange={(e) => setInputMood(e.target.value)}
                placeholder="Ví dụ: Vừa thi xong mệt mỏi, muốn xem phim phiêu lưu kịch tính..."
                className="w-full px-4 py-3.5 pr-12 rounded-2xl bg-zinc-900 border border-white/15 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-white placeholder-gray-500 text-xs sm:text-sm transition outline-none"
              />
              <button
                type="submit"
                disabled={loading || !inputMood.trim()}
                className="absolute right-2 p-2 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 text-white hover:from-rose-500 hover:to-purple-500 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>

          {/* LOADING STATE */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
                <Sparkles className="w-5 h-5 text-rose-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-white">Nana AI đang thấu cảm và may đo playlist phim...</p>
              <p className="text-[11px] text-gray-400">Đang phân tích tâm lý qua Groq Qwen 27B & Kho phim HD</p>
            </div>
          )}

          {/* RESULTS STATE */}
          {nanaNote && !loading && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
              {/* NANA LETTER */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-zinc-900 border border-rose-500/30 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💌</span>
                    <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                      Lời Nhắn Từ Nana
                    </span>
                  </div>
                  {moodSummary && (
                    <span className="text-[11px] font-bold text-gray-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                      {moodSummary}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed italic">
                  &ldquo;{nanaNote}&rdquo;
                </p>
                {vibeTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {vibeTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* RECOMMENDED MOVIES LIST */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-rose-400" />
                    <span>Tác phẩm phù hợp nhất dành riêng cho bạn:</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setNanaNote(null);
                      setMovies([]);
                      setInputMood("");
                    }}
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Chọn tâm trạng khác</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {movies.map((movie) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const poster = pickBestMoviePoster(movie as any);
                    return (
                      <Link
                        key={movie.slug}
                        href={`/movies/${movie.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="p-3 sm:p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800/95 border border-white/10 hover:border-rose-500/50 transition-all flex gap-3.5 group shadow-lg hover:scale-101 cursor-pointer items-start"
                      >
                        {/* POSTER */}
                        <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-950 flex-none border border-white/10 shadow-md">
                          {poster ? (
                            <Image
                              src={poster}
                              alt={movie.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="100px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              <Film className="w-6 h-6" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-netflix-red flex items-center justify-center text-white shadow-lg">
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            </div>
                          </div>
                          {movie.quality && (
                            <span className="absolute top-1.5 left-1.5 px-1 py-0.2 rounded bg-black/80 text-amber-300 text-[8px] font-bold border border-white/10">
                              {movie.quality}
                            </span>
                          )}
                        </div>

                        {/* INFO & WHY WATCH */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                              {movie.name}
                            </h4>
                            <p className="text-[11px] text-gray-400 truncate">
                              {movie.origin_name || (movie.year ? `Năm ${movie.year}` : "")}
                            </p>
                          </div>

                          {movie.whyWatch && (
                            <div className="text-[11px] text-rose-200/90 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20 leading-relaxed font-normal">
                              💡 {movie.whyWatch}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {provider && (
                <div className="text-[10px] text-center text-gray-500 pt-2">
                  Được hỗ trợ bởi AI tốc độ cao: {provider}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiMoodMatcherModal;
