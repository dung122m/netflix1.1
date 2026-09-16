"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  X,
  Send,
  Loader2,
  Play,
  Dices,
  MessageSquare,
  Smile,
  Flame,
  Brain,
  Ghost,
  Rocket,
  Palette,
  CloudRain,
  RotateCcw,
  Globe2,
  Users,
  Heart,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================
export type StudioTab = "concierge" | "roulette";

interface AiMovieCard {
  slug: string;
  title: string;
  poster: string;
  year?: string | number;
  quality?: string;
  category?: string;
  country?: string;
  actors?: string[];
  reason?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  movies?: AiMovieCard[];
  provider?: string;
  time: string;
}

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

// ============================================================================
// CONSTANTS
// ============================================================================
const QUICK_CONCIERGE_PROMPTS = [
  { emoji: "🧩", label: "Phim trinh thám hack não cú twist bất ngờ", text: "Tìm phim trinh thám hack não có cú twist bất ngờ" },
  { emoji: "🍿", label: "Hài bựa xả stress sảng khoái", text: "Gợi ý phim hài hước xả stress kinh điển" },
  { emoji: "💖", label: "Tình cảm lãng mạn nhẹ nhàng chữa lành", text: "Tôi cần tìm phim tình cảm nhẹ nhàng chữa lành tâm hồn" },
  { emoji: "🥋", label: "Hành động võ thuật quyền cước mãn nhãn", text: "Phim hành động kịch tính võ thuật mãn nhãn" },
  { emoji: "🌧️", label: "Mưa đêm một mình hoài niệm sâu lắng", text: "Đêm mưa một mình thấy cô đơn, gợi ý phim hoài niệm sâu sắc" },
  { emoji: "🚀", label: "Du hành thời gian & viễn tưởng vũ trụ", text: "Phim du hành thời gian viễn tưởng vũ trụ" },
];

const ROULETTE_MOODS = [
  { id: "xa-stress", label: "Xả Stress", icon: Smile, emoji: "🍿", desc: "Hài hước, vui tươi" },
  { id: "mau-lua", label: "Máu Lửa", icon: Flame, emoji: "🥋", desc: "Hành động, đấm đá" },
  { id: "hack-nao", label: "Hack Não", icon: Brain, emoji: "🤯", desc: "Trinh thám, twist" },
  { id: "ngot-ngao", label: "Ngọt Ngào", icon: Heart, emoji: "💖", desc: "Lãng mạn, chữa lành" },
  { id: "tram-lang", label: "Trầm Lắng", icon: CloudRain, emoji: "🌧️", desc: "Sâu sắc, cảm động" },
  { id: "kinh-di", label: "Kinh Dị", icon: Ghost, emoji: "👻", desc: "Rùng rợn, giật gân" },
  { id: "vien-tuong", label: "Viễn Tưởng", icon: Rocket, emoji: "🚀", desc: "Vũ trụ, siêu anh hùng" },
  { id: "anime", label: "Hoạt Hình", icon: Palette, emoji: "🎨", desc: "Anime, phiêu lưu" },
];

const ROULETTE_COUNTRIES = [
  { id: "all", label: "Toàn Cầu", flag: "🌐" },
  { id: "han-quoc", label: "Hàn Quốc", flag: "🇰🇷" },
  { id: "au-my", label: "Âu Mỹ", flag: "🇺🇸" },
  { id: "trung-quoc", label: "Trung Quốc", flag: "🇨🇳" },
  { id: "nhat-ban", label: "Nhật Bản", flag: "🇯🇵" },
  { id: "viet-nam", label: "Việt Nam", flag: "🇻🇳" },
];

const ROULETTE_COMPANIONS = [
  { id: "mot-minh", label: "Một Mình Chill", icon: "👤", desc: "Tự do cày phim" },
  { id: "nguoi-yeu", label: "Cùng Người Yêu", icon: "💑", desc: "Lãng mạn, ngọt ngào" },
  { id: "gia-dinh", label: "Cùng Gia Đình", icon: "👨‍👩‍👧‍👦", desc: "Ấm áp, hòa thuận" },
  { id: "ban-be", label: "Hội Bạn Thân", icon: "🍻", desc: "Sôi động, quẩy hết mình" },
];

export const NanaAiStudioModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>("concierge");

  // TAB 1: CONCIERGE STATE
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TAB 2: ROULETTE STATE
  const [selectedMood, setSelectedMood] = useState("xa-stress");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCompanion, setSelectedCompanion] = useState("mot-minh");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<RouletteResult | null>(null);
  const [rolledSlugs, setRolledSlugs] = useState<string[]>([]);

  // LISTEN TO GLOBAL DISPATCH EVENTS
  useEffect(() => {
    const handleOpenStudio = (e?: CustomEvent<{ tab?: StudioTab }>) => {
      setIsOpen(true);
      if (e?.detail?.tab) setActiveTab(e.detail.tab === "roulette" ? "roulette" : "concierge");
    };

    const handleOpenConcierge = (e?: CustomEvent<{ prompt?: string; autoSearch?: boolean }>) => {
      setIsOpen(true);
      setActiveTab("concierge");
      if (e?.detail?.prompt) {
        setChatInput(e.detail.prompt);
        if (e.detail.autoSearch) {
          setTimeout(() => sendChatMessage(e.detail?.prompt), 100);
        }
      }
    };

    const handleOpenMoodMatcher = (e?: CustomEvent<{ mood?: string }>) => {
      setIsOpen(true);
      setActiveTab("concierge");
      if (e?.detail?.mood) {
        setChatInput(e.detail.mood);
        setTimeout(() => sendChatMessage(e.detail?.mood), 100);
      }
    };

    const handleOpenRoulette = () => {
      setIsOpen(true);
      setActiveTab("roulette");
    };

    window.addEventListener("open-nana-ai-studio" as unknown as keyof WindowEventMap, handleOpenStudio as EventListener);
    window.addEventListener("open-ai-concierge" as unknown as keyof WindowEventMap, handleOpenConcierge as EventListener);
    window.addEventListener("open-ai-mood-matcher" as unknown as keyof WindowEventMap, handleOpenMoodMatcher as EventListener);
    window.addEventListener("open-ai-roulette" as unknown as keyof WindowEventMap, handleOpenRoulette as EventListener);

    // Keyboard shortcut Ctrl+K / Cmd+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-nana-ai-studio" as unknown as keyof WindowEventMap, handleOpenStudio as EventListener);
      window.removeEventListener("open-ai-concierge" as unknown as keyof WindowEventMap, handleOpenConcierge as EventListener);
      window.removeEventListener("open-ai-mood-matcher" as unknown as keyof WindowEventMap, handleOpenMoodMatcher as EventListener);
      window.removeEventListener("open-ai-roulette" as unknown as keyof WindowEventMap, handleOpenRoulette as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // TAB 1 ACTIONS: SEND CHAT MESSAGE
  const sendChatMessage = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text || !text.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: text.trim(),
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text.trim(),
          history: chatMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (data && (data.reply || (data.movies && data.movies.length > 0) || data.success)) {
        const assistantMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          text: data.reply || "Dưới đây là các tác phẩm được Nana AI tuyển chọn cho bạn:",
          movies: data.movies || [],
          provider: data.provider,
          time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          text: data?.error || "Xin lỗi bạn, Nana tạm thời chưa tìm thấy phim phù hợp. Hãy thử đổi từ khoá khác nhé!",
          time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, errMsg]);
      }
    } catch (err) {
      console.warn("Lỗi chat Nana AI:", err);
      const errMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: "Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra lại kết nối mạng!",
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  // TAB 2 ACTIONS: ROULETTE SPIN (GUARANTEED NO REPETITIONS)
  const spinRoulette = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    try {
      const res = await fetch("/api/ai-roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: selectedMood,
          country: selectedCountry,
          companion: selectedCompanion,
          excludeSlugs: rolledSlugs,
        }),
      });

      const data = await res.json();
      if (data && (data.movie || data.success)) {
        setRouletteResult(data);
        if (data.movie?.slug) {
          setRolledSlugs((prev) => [...prev, data.movie.slug]);
        }
      }
    } catch (err) {
      console.warn("Lỗi quay bốc quẻ:", err);
    } finally {
      setIsSpinning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl h-[88vh] max-h-[750px] min-h-[480px] bg-zinc-950/95 rounded-3xl border border-rose-500/30 shadow-2xl shadow-rose-950/40 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Glow ambient lights */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />

        {/* HEADER BAR (PINNED) */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-white/10 bg-zinc-900/95 backdrop-blur-md flex-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Nana AI Cinema Studio</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                  Trợ Lý Thông Minh
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">Đàm thoại gợi ý phim theo ngữ cảnh & Bốc quẻ định mệnh tức thì</p>
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

        {/* UNIFIED 2-TAB SWITCHER (PINNED) */}
        <div className="relative z-10 flex items-center border-b border-white/10 bg-black/50 px-5 pt-2 gap-3 flex-none overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("concierge")}
            className={`pb-2.5 px-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === "concierge"
                ? "border-rose-500 text-rose-300 scale-100"
                : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
          >
            <MessageSquare className="w-4 h-4 text-rose-400" />
            <span>Trò Chuyện & Tìm Phim</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roulette")}
            className={`pb-2.5 px-3.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === "roulette"
                ? "border-amber-400 text-amber-300 scale-100"
                : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
          >
            <Dices className="w-4 h-4 text-amber-400" />
            <span>Bốc Quẻ Định Mệnh</span>
          </button>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* ========================================================= */}
          {/* TAB 1: CONCIERGE CHAT & SEARCH */}
          {/* ========================================================= */}
          {activeTab === "concierge" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* MESSAGES SCROLL AREA */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="py-6 sm:py-8 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-purple-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-xl">
                      <Bot className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-white">Chào bạn! Tôi là Nana AI</h3>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        Hãy mô tả bất kỳ bộ phim, diễn viên, tâm trạng hoặc cốt truyện nào bạn muốn xem, tôi sẽ tìm ra kiệt tác phù hợp nhất!
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center max-w-xl mx-auto pt-2">
                      {QUICK_CONCIERGE_PROMPTS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => sendChatMessage(p.text)}
                          className="text-[11px] font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{p.emoji}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {m.role === "assistant" && (
                        <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white flex-none mt-1">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm space-y-3 ${m.role === "user"
                            ? "bg-gradient-to-r from-rose-600 to-purple-600 text-white rounded-tr-sm shadow-md"
                            : "bg-zinc-900 border border-white/10 text-gray-200 rounded-tl-sm shadow-lg"
                          }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>

                        {/* MOVIE CARDS IN CHAT */}
                        {m.movies && m.movies.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
                            {m.movies.map((mov) => (
                              <Link
                                key={mov.slug}
                                href={`/movies/${mov.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="p-2.5 rounded-xl bg-black/60 hover:bg-black/90 border border-white/10 hover:border-rose-500/50 transition flex gap-2.5 group cursor-pointer"
                              >
                                <div className="relative w-14 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-950 flex-none border border-white/10 shadow-sm">
                                  <Image
                                    src={mov.poster || "/default-poster.jpg"}
                                    alt={mov.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform"
                                    sizes="60px"
                                  />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <h5 className="text-xs font-bold text-white truncate group-hover:text-rose-300">
                                    {mov.title}
                                  </h5>
                                  {mov.reason && (
                                    <p className="text-[10px] text-rose-200/90 line-clamp-2 leading-tight">
                                      💡 {mov.reason}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    <span>Nana AI đang suy nghĩ và tìm phim...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* CHAT INPUT FORM (PINNED AT BOTTOM) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChatMessage();
                }}
                className="flex-none p-3 sm:p-4 bg-zinc-900/90 border-t border-white/10 relative flex items-center"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hỏi bất kỳ điều gì: 'Phim trinh thám đấu trí', 'Phim Châu Tinh Trì làm cảnh sát'..."
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-zinc-950 border border-white/15 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-white placeholder-gray-500 text-xs sm:text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="absolute right-5 sm:right-6 p-2 rounded-xl bg-gradient-to-r from-rose-600 to-purple-600 text-white hover:from-rose-500 hover:to-purple-500 transition disabled:opacity-40 cursor-pointer shadow"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: ROULETTE (SUẤT CHIẾU ĐỊNH MỆNH) */}
          {/* ========================================================= */}
          {activeTab === "roulette" && (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 animate-in fade-in duration-200">
              {/* CRITERIA GRIDS */}
              <div className="space-y-4">
                {/* 1. MOOD */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. Tâm trạng mong muốn:</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ROULETTE_MOODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${selectedMood === m.id
                            ? "bg-amber-500/20 border-amber-400 text-white shadow-md shadow-amber-950/40 font-bold"
                            : "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
                          }`}
                      >
                        <span className="text-lg">{m.emoji}</span>
                        <span className="text-xs truncate">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. COUNTRY */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>2. Quốc gia ưu tiên:</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ROULETTE_COUNTRIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCountry(c.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${selectedCountry === c.id
                            ? "bg-sky-500/20 border-sky-400 text-white shadow font-bold"
                            : "bg-white/5 border-white/10 text-gray-300 hover:text-white"
                          }`}
                      >
                        <span>{c.flag}</span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. COMPANION */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>3. Bạn đang xem cùng ai?</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ROULETTE_COMPANIONS.map((cp) => (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => setSelectedCompanion(cp.id)}
                        className={`p-2 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${selectedCompanion === cp.id
                            ? "bg-emerald-500/20 border-emerald-400 text-white shadow font-bold"
                            : "bg-white/5 border-white/10 text-gray-300 hover:text-white"
                          }`}
                      >
                        <span className="text-lg">{cp.icon}</span>
                        <span className="text-xs truncate">{cp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SPIN BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={spinRoulette}
                  disabled={isSpinning}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                >
                  <Dices className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
                  <span>{isSpinning ? "Đang Bốc Quẻ Số Phận..." : "Bốc Quẻ Suất Chiếu Định Mệnh 🎲"}</span>
                </button>
              </div>

              {/* ROULETTE RESULT CARD */}
              {rouletteResult && (
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-amber-500/40 shadow-2xl flex flex-col sm:flex-row gap-4 items-center animate-in zoom-in-95 duration-200">
                  <div className="relative w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden bg-zinc-950 border border-white/10 flex-none shadow-lg">
                    <Image
                      src={rouletteResult.movie.poster || "/default-poster.jpg"}
                      alt={rouletteResult.movie.title}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-xs font-black uppercase text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                        {rouletteResult.matchScore}% Hợp Định Mệnh
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-black text-white">
                      {rouletteResult.movie.title}
                    </h4>

                    <p className="text-xs text-amber-200/90 italic bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                      ✨ {rouletteResult.punchline}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      <Link
                        href={`/movies/${rouletteResult.movie.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition shadow-lg cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Xem Suất Chiếu Này Ngay</span>
                      </Link>

                      <button
                        type="button"
                        onClick={spinRoulette}
                        disabled={isSpinning}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white font-semibold text-xs transition border border-white/10 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                        <span>Bốc Quẻ Khác (Đổi Phim Mới)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NanaAiStudioModal;
