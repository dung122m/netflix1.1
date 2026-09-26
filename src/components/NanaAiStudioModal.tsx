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
  ChevronRight,
  ChevronDown,
  Compass,
  Star,
  Clock,
} from "lucide-react";
import {
  loadAiChatHistory,
  saveAiChatHistory,
  clearAiChatHistory,
} from "@/services/aiChatHistory";
import { useBodyScrollLock } from "@/lib/scrollLock";

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
  overview?: string;
  description?: string;
  content?: string;
}

// Hàm lấy đoạn mô tả ngắn (highlight) động từ dữ liệu phim thực tế
function getMovieHighlight(movie: AiMovieCard) {
  let text =
    movie.reason ||
    movie.overview ||
    movie.description ||
    movie.content ||
    "";

  text = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!text) {
    if (movie.category) {
      return `Tác phẩm ${movie.category.toLowerCase()} xuất sắc, kịch tính và đáng xem trên Nanaflix.`;
    }
    return "Tác phẩm điện ảnh chọn lọc chất lượng cao đáng xem trên Nanaflix.";
  }

  if (text.length > 95) {
    const truncated = text.substring(0, 90);
    const lastSpace = truncated.lastIndexOf(" ");
    text = (lastSpace > 50 ? truncated.substring(0, lastSpace) : truncated) + "...";
  }
  return text;
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
    duration?: string;
  };
  punchline: string;
  badges: string[];
  matchScore: number;
  provider: string;
}

// ============================================================================
// CONSTANTS & PRESETS
// ============================================================================
const QUICK_CONCIERGE_PROMPTS = [
  {
    emoji: "🧩",
    label: "Trinh thám & Hack Não",
    desc: "Cú twist bất ngờ, đấu trí đỉnh cao",
    text: "Tìm cho tôi phim trinh thám hack não có cú twist bất ngờ và kịch tính",
    gradient: "from-purple-500/20 to-indigo-500/20 border-purple-500/30 text-purple-200",
  },
  {
    emoji: "🍿",
    label: "Hài Bựa Xả Stress",
    desc: "Cười nghiêng ngả, thư giãn cực đã",
    text: "Gợi ý những bộ phim hài hước duyên dáng xả stress cực tốt",
    gradient: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-200",
  },
  {
    emoji: "💖",
    label: "Tình Cảm Lãng Mạn",
    desc: "Hàn Quốc ngọt ngào & chữa lành",
    text: "Tìm phim tình cảm Hàn Quốc ngọt ngào nhẹ nhàng chữa lành tâm hồn",
    gradient: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-200",
  },
  {
    emoji: "🥋",
    label: "Hành Động & Võ Thuật",
    desc: "Quyền cước mãn nhãn, kỹ xảo đỉnh",
    text: "Gợi ý phim hành động võ thuật kịch tính mãn nhãn đỉnh cao",
    gradient: "from-red-500/20 to-rose-500/20 border-red-500/30 text-rose-200",
  },
  {
    emoji: "🌧️",
    label: "Mưa Đêm Hoài Niệm",
    desc: "Lắng đọng cảm xúc sâu sắc",
    text: "Tôi muốn tìm một bộ phim hoài niệm sâu lắng để xem một mình trong đêm",
    gradient: "from-sky-500/20 to-blue-500/20 border-sky-500/30 text-sky-200",
  },
  {
    emoji: "🚀",
    label: "Viễn Tưởng Vũ Trụ",
    desc: "Du hành thời gian & thế giới tương lai",
    text: "Phim viễn tưởng du hành thời gian hoặc khám phá vũ trụ kỳ vĩ",
    gradient: "from-cyan-500/20 to-teal-500/20 border-cyan-500/30 text-cyan-200",
  },
];

const ROULETTE_MOODS = [
  { id: "xa-stress", label: "Xả Stress", icon: Smile, emoji: "🍿", desc: "Hài hước, sảng khoái" },
  { id: "mau-lua", label: "Máu Lửa", icon: Flame, emoji: "🥋", desc: "Hành động, nghẹt thở" },
  { id: "hack-nao", label: "Hack Não", icon: Brain, emoji: "🤯", desc: "Trinh thám, cú twist" },
  { id: "ngot-ngao", label: "Ngọt Ngào", icon: Heart, emoji: "💖", desc: "Lãng mạn, chữa lành" },
  { id: "tram-lang", label: "Trầm Lắng", icon: CloudRain, emoji: "🌧️", desc: "Sâu sắc, cảm động" },
  { id: "kinh-di", label: "Kinh Dị", icon: Ghost, emoji: "👻", desc: "Rùng rợn, giật gân" },
  { id: "vien-tuong", label: "Viễn Tưởng", icon: Rocket, emoji: "🚀", desc: "Vũ trụ, tương lai" },
  { id: "anime", label: "Hoạt Hình", icon: Palette, emoji: "🎨", desc: "Anime, tuổi thơ" },
];

const ROULETTE_COUNTRIES = [
  { id: "all", label: "Toàn Cầu", flag: "🌐" },
  { id: "han-quoc", label: "Hàn Quốc", flag: "🇰🇷" },
  { id: "au-my", label: "Âu Mỹ", flag: "🇺🇸" },
  { id: "trung-quoc", label: "Trung Quốc", flag: "🇨🇳" },
  { id: "nhat-ban", label: "Nhật Bản", flag: "🇯🇵" },
  { id: "viet-nam", label: "Việt Nam", flag: "🇻🇳" },
  { id: "thai-lan", label: "Thái Lan", flag: "🇹🇭" },
];

const ROULETTE_COMPANIONS = [
  { id: "mot-minh", label: "Một Mình Chill", icon: "👤", desc: "Tự do tuyệt đối" },
  { id: "nguoi-yeu", label: "Cùng Người Yêu", icon: "💑", desc: "Lãng mạn, gắn kết" },
  { id: "gia-dinh", label: "Cùng Gia Đình", icon: "👨‍👩‍👧‍👦", desc: "Ấm cúng, trọn vẹn" },
  { id: "ban-be", label: "Hội Bạn Thân", icon: "🍻", desc: "Sôi động, quẩy vui" },
];

const ROULETTE_DURATIONS = [
  { id: "all", label: "Không quan trọng", icon: "🌙", desc: "Mọi độ dài" },
  { id: "duoi-90", label: "Dưới 90 phút", icon: "⚡", desc: "Nhanh gọn, súc tích" },
  { id: "90-120", label: "90–120 phút", icon: "🍿", desc: "Chuẩn điện ảnh" },
  { id: "120-150", label: "120–150 phút", icon: "🎬", desc: "Sâu sắc, trọn vẹn" },
];

const ROULETTE_SURPRISES = [
  { id: "an-toan", label: "An toàn", icon: "🛡️", desc: "Phim nổi tiếng, rating cao" },
  { id: "can-bang", label: "Cân bằng", icon: "⚖️", desc: "Hài hòa giữa quen & lạ" },
  { id: "lieu", label: "Liều một phen", icon: "🎰", desc: "Ưu tiên hidden gems độc lạ" },
];

export interface NanaAiStudioModalProps {
  initialOpen?: boolean;
  initialTab?: StudioTab;
  initialPrompt?: string;
  initialMood?: string;
  initialAutoSearch?: boolean;
}

export const NanaAiStudioModal: React.FC<NanaAiStudioModalProps> = ({
  initialOpen = false,
  initialTab = "concierge",
  initialPrompt,
  initialMood,
  initialAutoSearch = false,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  useBodyScrollLock(isOpen);

  // TAB 1: CONCIERGE CHAT STATE
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [visibleMovieCounts, setVisibleMovieCounts] = useState<Record<string, number>>({});
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMessage[]>([]);
  chatMessagesRef.current = chatMessages;
  const isHistoryLoadedRef = useRef(false);

  // Khôi phục lịch sử chat 24h từ localStorage sau khi browser hoàn tất initial frame paint
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      const saved = loadAiChatHistory();
      if (saved && saved.length > 0) {
        setChatMessages(saved);
      }
      isHistoryLoadedRef.current = true;
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Tự động lưu lịch sử chat vào localStorage mỗi khi conversation thay đổi
  useEffect(() => {
    if (!isHistoryLoadedRef.current) return;
    if (chatMessages.length > 0) {
      saveAiChatHistory(chatMessages);
    }
  }, [chatMessages]);

  // TAB 2: ROULETTE STATE
  const [selectedMood, setSelectedMood] = useState("xa-stress");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedCompanion, setSelectedCompanion] = useState("mot-minh");
  const [selectedDuration, setSelectedDuration] = useState("all");
  const [selectedSurprise, setSelectedSurprise] = useState("can-bang");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [randomFortuneCard, setRandomFortuneCard] = useState<{
    mood: string;
    country: string;
    companion: string;
    duration: string;
    surprise: string;
  } | null>(null);
  const [isRollingFortune, setIsRollingFortune] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<RouletteResult | null>(null);
  const [rouletteError, setRouletteError] = useState<string | null>(null);
  const [showCriteriaPicker, setShowCriteriaPicker] = useState(false);
  const [rolledSlugs, setRolledSlugs] = useState<string[]>([]);

  // LISTEN TO GLOBAL DISPATCH EVENTS
  const sendChatMessageRef = useRef<(textToSend?: string) => Promise<void>>(() => Promise.resolve());

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
          setTimeout(() => sendChatMessageRef.current(e.detail?.prompt), 100);
        }
      }
    };

    const handleOpenMoodMatcher = (e?: CustomEvent<{ mood?: string }>) => {
      setIsOpen(true);
      setActiveTab("concierge");
      if (e?.detail?.mood) {
        setChatInput(e.detail.mood);
        setTimeout(() => sendChatMessageRef.current(e.detail?.mood), 100);
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
    if (initialOpen) {
      setIsOpen(true);
      if (initialTab) setActiveTab(initialTab);
      if (initialPrompt) {
        setChatInput(initialPrompt);
        if (initialAutoSearch) {
          setTimeout(() => sendChatMessageRef.current(initialPrompt), 100);
        }
      } else if (initialMood) {
        setChatInput(initialMood);
        setTimeout(() => sendChatMessageRef.current(initialMood), 100);
      }
    }
  }, [initialOpen, initialTab, initialPrompt, initialMood, initialAutoSearch]);

  useEffect(() => {
    if (chatScrollContainerRef.current) {
      const container = chatScrollContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [chatMessages, chatLoading]);

  // TAB 1: SEND CHAT MESSAGE
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

    // Trích xuất ngữ cảnh hội thoại gọn gàng (tối đa 6 tin nhắn gần nhất) để giữ prompt nhẹ và nhanh
    const historyContext = chatMessagesRef.current.slice(-6).map((m) => {
      let content = m.text || "";
      if (m.role === "assistant" && m.movies && m.movies.length > 0) {
        const topTitles = m.movies.slice(0, 4).map((mov) => mov.title).filter(Boolean).join(", ");
        if (topTitles) {
          content = `${content} [Đã gợi ý: ${topTitles}]`;
        }
      }
      return {
        role: m.role,
        content: content.slice(0, 250),
      };
    });

    // Thu thập danh sách slug phim đã từng xuất hiện trong cuộc trò chuyện để tránh gợi ý trùng lặp
    const alreadyShownSlugs = chatMessagesRef.current
      .flatMap((m) => (m.movies ? m.movies.map((mov) => mov.slug) : []))
      .filter(Boolean);

    try {
      const res = await fetch("/api/ai-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text.trim(),
          history: historyContext,
          excludeSlugs: alreadyShownSlugs.slice(-40),
        }),
      });

      const data = await res.json();
      if (data && (data.reply || (data.movies && data.movies.length > 0) || data.success)) {
        const assistantMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          text: data.reply || "Dưới đây là các tác phẩm điện ảnh xuất sắc nhất mà Nana AI đã tuyển chọn riêng cho bạn:",
          movies: data.movies || [],
          provider: data.provider,
          time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          text: data?.error || "Xin lỗi bạn, Nana tạm thời chưa tìm thấy phim phù hợp với từ khóa này. Bạn hãy thử miêu tả chi tiết hơn nhé!",
          time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, errMsg]);
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn AI:", err);
      const errorMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: "Xin lỗi bạn, Nana đang gặp trục trặc khi kết nối với máy chủ AI. Bạn hãy thử lại sau giây lát nhé!",
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setChatLoading(false);
    }
  };
  sendChatMessageRef.current = sendChatMessage;

  // TAB 2: ROULETTE SPIN & RANDOM QUẺ
  const spinRoulette = async (overrideCriteria?: {
    mood?: string;
    country?: string;
    companion?: string;
    duration?: string;
    surprise?: string;
  }) => {
    if (isSpinning) return;
    setIsSpinning(true);
    setRouletteError(null);

    const moodToUse = overrideCriteria?.mood ?? selectedMood;
    const countryToUse = overrideCriteria?.country ?? selectedCountry;
    const companionToUse = overrideCriteria?.companion ?? selectedCompanion;
    const durationToUse = overrideCriteria?.duration ?? selectedDuration;
    const surpriseToUse = overrideCriteria?.surprise ?? selectedSurprise;

    try {
      const res = await fetch("/api/ai-roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: moodToUse,
          country: countryToUse,
          companion: companionToUse,
          duration: durationToUse,
          surprise: surpriseToUse,
          excludeSlugs: rolledSlugs,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data && (data.movie || data.success)) {
        setRouletteResult(data);
        setRouletteError(null);
        setShowCriteriaPicker(false);
        setRandomFortuneCard(null);
        if (data.movie?.slug) {
          setRolledSlugs((prev) => [...prev, data.movie.slug]);
        }
      } else {
        const errorMsg =
          data?.error ||
          "🎴 Chưa tìm thấy suất chiếu phù hợp với quẻ này. Bạn hãy thử bốc lại hoặc đổi tiêu chí nhé!";
        setRouletteError(errorMsg);
        setShowCriteriaPicker(true);
      }
    } catch (err) {
      console.warn("Lỗi quay bốc quẻ:", err);
      setRouletteError("Tạm thời không thể kết nối tới máy chủ, vui lòng thử lại sau giây lát.");
      setShowCriteriaPicker(true);
    } finally {
      setIsSpinning(false);
    }
  };

  const handleRandomFortune = () => {
    setIsRollingFortune(true);
    // Chọn ngẫu nhiên từ các tùy chọn hợp lệ hiện có
    const randomMood = ROULETTE_MOODS[Math.floor(Math.random() * ROULETTE_MOODS.length)].id;
    const randomCountry = ROULETTE_COUNTRIES[Math.floor(Math.random() * ROULETTE_COUNTRIES.length)].id;
    const randomCompanion = ROULETTE_COMPANIONS[Math.floor(Math.random() * ROULETTE_COMPANIONS.length)].id;
    const randomDuration = ROULETTE_DURATIONS[Math.floor(Math.random() * ROULETTE_DURATIONS.length)].id;
    const randomSurprise = ROULETTE_SURPRISES[Math.floor(Math.random() * ROULETTE_SURPRISES.length)].id;

    setSelectedMood(randomMood);
    setSelectedCountry(randomCountry);
    setSelectedCompanion(randomCompanion);
    setSelectedDuration(randomDuration);
    setSelectedSurprise(randomSurprise);

    setRandomFortuneCard({
      mood: randomMood,
      country: randomCountry,
      companion: randomCompanion,
      duration: randomDuration,
      surprise: randomSurprise,
    });

    setTimeout(() => {
      setIsRollingFortune(false);
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-3xl h-[88dvh] max-h-[760px] sm:min-h-[500px] bg-zinc-950 rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transform-gpu will-change-[transform,opacity] animate-in zoom-in-95 duration-150 ${
          activeTab === "concierge"
            ? "border-pink-500/30 shadow-pink-950/40"
            : "border-amber-500/35 shadow-amber-950/40"
        }`}
      >
        {/* Glow ambient lights (tĩnh để loại bỏ continuous GPU rasterization load) */}
        {activeTab === "concierge" ? (
          <>
            <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-pink-600/15 rounded-full blur-3xl opacity-50" />
            <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl opacity-50" />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl opacity-50" />
            <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl opacity-50" />
          </>
        )}

        {/* ========================================================= */}
        {/* DEDICATED PINNED HEADER FOR EACH MODE (NO REDUNDANT TABS) */}
        {/* ========================================================= */}
        <div className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 bg-zinc-900 shrink-0 gap-2">
          {activeTab === "concierge" ? (
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="relative w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-xl bg-gradient-to-br from-pink-500 via-rose-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-600/30 shrink-0 ring-1 ring-pink-500/30">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-full border border-zinc-900 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-white truncate">
                    <span className="sm:hidden">Nana AI</span>
                    <span className="hidden sm:inline">Nana AI Trợ Lý Điện Ảnh</span>
                  </h2>
                  <span className="hidden sm:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-wider shrink-0">
                    Smart Chat
                  </span>
                </div>
                <p className="hidden sm:block text-[10.5px] text-gray-400 truncate">Hỏi đáp phim ảnh & nhận đề xuất kiệt tác theo gu chuẩn xác</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="relative w-7 h-7 sm:w-8.5 sm:h-8.5 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30 shrink-0 ring-1 ring-amber-500/30">
                <Dices className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-amber-400 rounded-full border border-zinc-900 animate-ping" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-white truncate">
                    <span className="sm:hidden">Bốc Quẻ Phim</span>
                    <span className="hidden sm:inline">Bốc Quẻ Định Mệnh</span>
                  </h2>
                  <span className="hidden sm:inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider shrink-0">
                    Cinema Tarot
                  </span>
                </div>
                <p className="hidden sm:block text-[10.5px] text-gray-400 truncate">Vòng quay ngẫu nhiên chọn phim theo tâm trạng</p>
              </div>
            </div>
          )}

          {/* RIGHT ACTION PILLS: Đảm bảo không bao giờ bị co rúm hay che khuất trên mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-30">
            {/* Quick Switch Button */}
            {activeTab === "concierge" ? (
              <button
                type="button"
                onClick={() => setActiveTab("roulette")}
                title="Chuyển sang chế độ Bốc Quẻ Định Mệnh"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition cursor-pointer active:scale-95"
              >
                <Dices className="w-3.5 h-3.5 text-amber-400" />
                <span>Bốc Quẻ</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab("concierge")}
                title="Chuyển sang chế độ Trò Chuyện & Tìm Phim"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 transition cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Chat AI</span>
              </button>
            )}

            {/* Clear Chat (If in Concierge and has messages) */}
            {activeTab === "concierge" && chatMessages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  clearAiChatHistory();
                  setChatMessages([]);
                }}
                title="Làm mới đoạn hội thoại"
                className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Close Button: Luôn hiển thị rõ ràng, cố định kích thước và dễ bấm trên mobile */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng cửa sổ"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-200 hover:text-white transition cursor-pointer shrink-0 active:scale-95 border border-white/15 shadow-sm"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL BODY CONTAINER */}
        {/* ========================================================= */}
        <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* ========================================================= */}
          {/* GIAO DIỆN 1: DEDICATED NANA AI CHAT CONCIERGE */}
          {/* ========================================================= */}
          {activeTab === "concierge" && (
            <div className="flex flex-col h-full flex-1 min-h-0 overflow-hidden">
              {/* MESSAGES SCROLL AREA */}
              <div
                ref={chatScrollContainerRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4 pr-2"
              >
                {chatMessages.length === 0 ? (
                  <div className="py-2 sm:py-4 text-center space-y-3.5 max-w-xl mx-auto animate-in fade-in duration-200">
                    {/* Hero Bot Avatar */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 via-purple-600/20 to-indigo-600/20 border border-pink-500/30 flex items-center justify-center text-pink-400 mx-auto shadow-xl ring-2 ring-pink-500/10">
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-pink-400 animate-pulse" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Chào bạn! Nana có thể gợi ý bộ phim nào cho bạn hôm nay?
                      </h3>
                      <p className="text-[11.5px] sm:text-xs text-gray-400 max-w-md mx-auto">
                        Mô tả cốt truyện, diễn viên, thể loại hoặc cảm xúc bạn muốn trải nghiệm, Nana AI sẽ tìm phim chuẩn gu!
                      </p>
                    </div>

                    {/* LUXURY INTERACTIVE QUICK PROMPT CARDS */}
                    <div className="pt-1 text-left">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1 flex items-center gap-1.5">
                        <Compass className="w-3 h-3 text-pink-400" />
                        <span>Gợi ý chủ đề thịnh hành:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {QUICK_CONCIERGE_PROMPTS.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => sendChatMessage(p.text)}
                            className={`p-2.5 rounded-xl border bg-gradient-to-br transition-all duration-200 cursor-pointer flex items-center gap-2.5 group text-left shadow-sm hover:scale-[1.01] hover:shadow-md active:scale-[0.99] ${p.gradient}`}
                          >
                            <span className="text-xl flex-none p-1 rounded-lg bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                              {p.emoji}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-pink-300 transition-colors truncate">
                                {p.label}
                              </h4>
                              <p className="text-[10.5px] text-gray-400 truncate">
                                {p.desc}
                              </p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition flex-none" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-2 sm:gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-150`}
                    >
                      {m.role === "assistant" && (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white flex-none mt-0.5 shadow-sm shadow-pink-600/30">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}

                      {m.role === "user" ? (
                        <div className="w-fit max-w-[80%] sm:max-w-[70%] py-1.5 px-3 sm:py-2 sm:px-3.5 rounded-2xl rounded-tr-xs bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white shadow-md shadow-pink-950/25 text-xs sm:text-[13px] font-medium leading-relaxed">
                          <p className="whitespace-pre-wrap select-text break-words">{m.text}</p>
                          <div className="text-[9px] text-white/70 text-right mt-0.5 select-none">
                            {m.time}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`${
                            m.movies && m.movies.length > 0
                              ? "w-full sm:max-w-[85%]"
                              : "max-w-[95%] sm:max-w-[82%]"
                          } p-3 sm:p-3.5 rounded-2xl rounded-tl-xs bg-zinc-900/95 border border-white/15 text-gray-200 shadow-xl text-xs sm:text-sm space-y-2.5`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap select-text">{m.text}</p>

                          {/* HIGH-END MOVIE RECOMMENDATION CARDS (BAN ĐẦU 4 PHIM + NÚT XEM THÊM) */}
                          {m.movies && m.movies.length > 0 && (() => {
                            const visibleCount = visibleMovieCounts[m.id] || 4;
                            const displayedMovies = m.movies.slice(0, visibleCount);
                            const hasMore = m.movies.length > visibleCount;

                            return (
                              <div className="space-y-2.5 pt-2.5 mt-1 border-t border-white/10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {displayedMovies.map((mov, movIdx) => (
                                    <Link
                                      key={`${mov.slug || "movie"}-${movIdx}`}
                                      href={`/movies/${mov.slug}`}
                                      onClick={() => setIsOpen(false)}
                                      className="group relative flex items-stretch gap-2.5 p-2 sm:p-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 hover:border-pink-500/50 transition-all duration-300 shadow-md hover:shadow-pink-950/25 hover:-translate-y-0.5"
                                    >
                                      {/* POSTER WITH PLAY OVERLAY */}
                                      <div className="relative w-16 sm:w-20 min-h-[112px] self-stretch rounded-lg overflow-hidden bg-zinc-900 flex-none shrink-0 border border-white/10 shadow-sm">
                                        <Image
                                          src={mov.poster || "/default-poster.jpg"}
                                          alt={mov.title || "Phim"}
                                          fill
                                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                                          sizes="(max-width: 640px) 64px, 80px"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                          <div className="w-7 h-7 rounded-full bg-pink-500/90 text-white flex items-center justify-center shadow-md shadow-pink-500/50 transform scale-75 group-hover:scale-100 transition-transform">
                                            <Play className="w-3 h-3 fill-current ml-0.5" />
                                          </div>
                                        </div>
                                      </div>

                                      {/* MOVIE DETAILS */}
                                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 gap-1.5">
                                        <div className="space-y-1">
                                          <h5
                                            className="text-xs sm:text-[13px] font-bold text-white truncate group-hover:text-pink-300 transition-colors"
                                            title={mov.title}
                                          >
                                            {mov.title}
                                          </h5>
                                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 flex-wrap">
                                            {mov.year && <span className="text-zinc-300 font-semibold">{mov.year}</span>}
                                            {mov.category && (
                                              <>
                                                <span className="text-zinc-600">•</span>
                                                <span className="text-pink-400 font-medium truncate max-w-[85px]">
                                                  {mov.category}
                                                </span>
                                              </>
                                            )}
                                            {mov.quality && (
                                              <span className="border border-white/20 bg-white/5 px-1 py-0.2 rounded text-[9px] font-semibold text-zinc-300">
                                                {mov.quality}
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-1 px-2 py-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-start gap-1">
                                            <span className="font-semibold text-pink-400 shrink-0 text-[10px] mt-0.5 select-none">✦</span>
                                            <p className="text-[10px] sm:text-[10.5px] text-pink-200/90 leading-snug line-clamp-2 m-0 p-0 break-words">
                                              {getMovieHighlight(mov)}
                                            </p>
                                          </div>
                                        </div>

                                        {/* SEPARATE BOTTOM ACTION ROW */}
                                        <div className="pt-1.5 mt-1 border-t border-white/5 flex items-center justify-between text-[10.5px] font-bold text-pink-400 group-hover:text-pink-300 transition-colors">
                                          <span className="flex items-center gap-1.5">
                                            <Play className="w-2.5 h-2.5 fill-current text-netflix-red group-hover:text-pink-400 transition-colors" />
                                            <span>Xem chi tiết</span>
                                          </span>
                                          <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-pink-300 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                      </div>
                                    </Link>
                                  ))}
                                </div>

                            {/* NÚT XEM THÊM HOẶC THÔNG BÁO ĐÃ HIỂN THỊ HẾT */}
                            {hasMore ? (
                              <div className="pt-1 flex justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisibleMovieCounts((prev) => ({
                                      ...prev,
                                      [m.id]: visibleCount + 4,
                                    }))
                                  }
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-pink-500/20 active:bg-pink-500/30 text-pink-300 hover:text-pink-200 border border-pink-500/30 hover:border-pink-500/50 transition-all shadow-sm cursor-pointer active:scale-95"
                                >
                                  <span>Xem thêm ({m.movies.length - visibleCount} phim còn lại)</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-pink-400" />
                                </button>
                              </div>
                            ) : m.movies.length > 4 ? (
                              <div className="pt-1 text-center text-[10px] text-gray-500 italic select-none">
                                Đã hiển thị hết {m.movies.length} phim
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}

                          <div className="text-[9.5px] text-gray-400 flex items-center justify-end gap-1 pt-0.5 opacity-70 select-none">
                            <span>{m.time}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div className="flex items-center gap-2.5 text-xs text-pink-300 py-2.5 px-3.5 rounded-2xl bg-zinc-900/90 border border-pink-500/20 max-w-sm animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400 flex-none" />
                    <span>Nana AI đang tìm kiếm phim phù hợp cho bạn...</span>
                  </div>
                )}
              </div>

              {/* CHAT INPUT FORM (PINNED AT BOTTOM) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendChatMessage();
                }}
                className="flex-none px-3 py-2 sm:px-4 sm:py-2.5 bg-zinc-900/98 border-t border-white/10 relative flex items-center justify-center"
              >
                <div className="relative w-full max-w-2xl flex items-center">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập tâm trạng, diễn viên hoặc nội dung bạn muốn xem..."
                    className="w-full pl-3.5 pr-10 py-2 sm:py-2.5 rounded-full bg-zinc-950 border border-white/15 focus:border-pink-500 focus:ring-1 focus:ring-pink-500/25 text-white placeholder-gray-500 text-xs sm:text-sm outline-none shadow-inner transition"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    aria-label="Gửi tin nhắn"
                    className="absolute right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white hover:from-pink-500 hover:to-purple-500 transition disabled:opacity-30 cursor-pointer shadow-md active:scale-95 flex items-center justify-center shrink-0"
                  >
                    {chatLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================= */}
          {/* GIAO DIỆN 2: DEDICATED BỐC QUẺ ĐỊNH MỆNH */}
          {/* ========================================================= */}
          {activeTab === "roulette" && (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 flex flex-col animate-in fade-in duration-200">
              {/* STATE 1: LOADING / SPINNING ANIMATION */}
              {isSpinning ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-4 text-center animate-in zoom-in-95 duration-200">
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center text-white shadow-2xl shadow-amber-500/40 ring-4 ring-amber-400/30 animate-pulse">
                    <Dices className="w-10 h-10 animate-spin text-white" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-black text-white">Đang Khai Quẻ Số Mệnh...</h3>
                    <p className="text-xs text-amber-300/80 animate-pulse">
                      Đang tìm kiếm bộ phim hợp duyên nhất với tâm trạng của bạn...
                    </p>
                  </div>
                </div>
              ) : rouletteResult && !showCriteriaPicker ? (
                /* STATE 2: SPOTLIGHT RESULT SHOWCASE (FITS 100% IN MODAL WITHOUT SCROLLING) */
                <div className="flex-1 flex flex-col justify-between py-1 space-y-3 animate-in zoom-in-95 duration-200">
                  {/* COMPACT ACTIVE CRITERIA BAR */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-zinc-900/95 border border-amber-500/30 shadow-md flex-none">
                    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-xs min-w-0 scrollbar-none">
                      <span className="text-amber-400 font-bold flex-none flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Quẻ:</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[11px] font-semibold whitespace-nowrap">
                        {ROULETTE_MOODS.find((m) => m.id === selectedMood)?.emoji}{" "}
                        {ROULETTE_MOODS.find((m) => m.id === selectedMood)?.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-200 border border-sky-500/30 text-[11px] font-semibold whitespace-nowrap">
                        {ROULETTE_COUNTRIES.find((c) => c.id === selectedCountry)?.flag}{" "}
                        {ROULETTE_COUNTRIES.find((c) => c.id === selectedCountry)?.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 text-[11px] font-semibold whitespace-nowrap">
                        {ROULETTE_COMPANIONS.find((cp) => cp.id === selectedCompanion)?.icon}{" "}
                        {ROULETTE_COMPANIONS.find((cp) => cp.id === selectedCompanion)?.label}
                      </span>
                      {selectedDuration !== "all" && (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[11px] font-semibold whitespace-nowrap">
                          {ROULETTE_DURATIONS.find((d) => d.id === selectedDuration)?.icon}{" "}
                          {ROULETTE_DURATIONS.find((d) => d.id === selectedDuration)?.label}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[11px] font-semibold whitespace-nowrap">
                        {ROULETTE_SURPRISES.find((s) => s.id === selectedSurprise)?.icon}{" "}
                        {ROULETTE_SURPRISES.find((s) => s.id === selectedSurprise)?.label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCriteriaPicker(true)}
                      className="ml-2 text-xs font-bold text-amber-300 hover:text-white px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition cursor-pointer flex-none flex items-center gap-1 active:scale-95"
                    >
                      <span>Đổi gu</span>
                    </button>
                  </div>

                  {/* SPOTLIGHT MOVIE CARD */}
                  <div className="flex-1 min-h-0 p-3.5 sm:p-5 rounded-3xl bg-zinc-900/95 border-2 border-amber-500/40 shadow-2xl shadow-amber-950/40 flex flex-col sm:flex-row gap-3.5 sm:gap-5 items-center justify-center">
                    {/* Poster */}
                    <div className="relative w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-950 border-2 border-amber-400/40 flex-none shadow-2xl ring-2 ring-amber-400/20">
                      <Image
                        src={rouletteResult.movie.poster || "/default-poster.jpg"}
                        alt={rouletteResult.movie.title}
                        fill
                        className="object-cover"
                        sizes="160px"
                        priority
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-netflix-red text-white text-[10px] font-black uppercase shadow">
                        {rouletteResult.movie.quality || "HD"}
                      </div>
                    </div>

                    {/* Movie Info & Punchline */}
                    <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left flex flex-col justify-center">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                        <span className="text-[11px] font-black uppercase text-amber-300 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-300" />
                          <span>{rouletteResult.matchScore}% Hợp Định Mệnh</span>
                        </span>
                        {rouletteResult.movie.category && (
                          <span className="text-[11px] text-gray-300 px-2 py-0.5 rounded-full bg-white/10 font-medium">
                            {rouletteResult.movie.category}
                          </span>
                        )}
                        {rouletteResult.movie.duration && (
                          <span className="text-[11px] text-purple-300 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 font-semibold">
                            ⏱️ {rouletteResult.movie.duration}
                          </span>
                        )}
                        {rouletteResult.movie.year && (
                          <span className="text-[11px] text-gray-400">
                            {rouletteResult.movie.year}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base sm:text-2xl font-black text-white leading-tight">
                        {rouletteResult.movie.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-amber-200/95 italic bg-amber-500/15 p-2.5 sm:p-3 rounded-2xl border border-amber-500/30 leading-relaxed max-w-xl">
                        ✨ {rouletteResult.punchline}
                      </p>

                      {/* Action Buttons */}
                      <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5">
                        <Link
                          href={`/movies/${rouletteResult.movie.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-black text-xs sm:text-sm transition shadow-xl shadow-red-950/50 cursor-pointer active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Xem Suất Chiếu Này Ngay</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => spinRoulette()}
                          disabled={isSpinning}
                          className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Dices className={`w-4 h-4 ${isSpinning ? "animate-spin" : ""}`} />
                          <span>Bốc Quẻ Khác (Đổi Phim)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* STATE 3: FULL CRITERIA PICKER */
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Thông báo nếu không tìm thấy phim theo bộ lọc */}
                  {rouletteError && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎴</span>
                        <span className="font-semibold">{rouletteError}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-none">
                        <button
                          type="button"
                          onClick={() => spinRoulette()}
                          disabled={isSpinning}
                          className="text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/30 hover:bg-amber-500/50 border border-amber-400/40 transition cursor-pointer"
                        >
                          🎲 Bốc lại
                        </button>
                        <button
                          type="button"
                          onClick={() => setRouletteError(null)}
                          className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10 transition cursor-pointer"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QUẺ HÔM NAY PREVIEW CARD KHI DÙNG 'BỐC QUẺ NGẪU NHIÊN' */}
                  {randomFortuneCard ? (
                    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-purple-500/20 border-2 border-amber-400/50 shadow-2xl space-y-3.5 animate-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl animate-bounce">🎴</span>
                          <div>
                            <h4 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider">
                              QUẺ HÔM NAY CỦA BẠN
                            </h4>
                            <p className="text-[11px] text-amber-200/80">
                              Định mệnh vừa kết duyên 5 yếu tố độc nhất cho bạn
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRandomFortune}
                          disabled={isRollingFortune || isSpinning}
                          className="text-xs font-bold text-amber-300 hover:text-white px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          <Dices className={`w-3.5 h-3.5 ${isRollingFortune ? "animate-spin" : ""}`} />
                          <span>Bốc quẻ khác</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/25 text-amber-200 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <span>{ROULETTE_MOODS.find((m) => m.id === randomFortuneCard.mood)?.emoji}</span>
                          <span>{ROULETTE_MOODS.find((m) => m.id === randomFortuneCard.mood)?.label}</span>
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-sky-500/25 text-sky-200 border border-sky-400/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <span>{ROULETTE_COUNTRIES.find((c) => c.id === randomFortuneCard.country)?.flag}</span>
                          <span>{ROULETTE_COUNTRIES.find((c) => c.id === randomFortuneCard.country)?.label}</span>
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <span>{ROULETTE_COMPANIONS.find((cp) => cp.id === randomFortuneCard.companion)?.icon}</span>
                          <span>{ROULETTE_COMPANIONS.find((cp) => cp.id === randomFortuneCard.companion)?.label}</span>
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-purple-500/25 text-purple-200 border border-purple-400/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <span>{ROULETTE_DURATIONS.find((d) => d.id === randomFortuneCard.duration)?.icon}</span>
                          <span>{ROULETTE_DURATIONS.find((d) => d.id === randomFortuneCard.duration)?.label}</span>
                        </span>
                        <span className="px-3 py-1.5 rounded-xl bg-rose-500/25 text-rose-200 border border-rose-400/40 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                          <span>{ROULETTE_SURPRISES.find((s) => s.id === randomFortuneCard.surprise)?.icon}</span>
                          <span>{ROULETTE_SURPRISES.find((s) => s.id === randomFortuneCard.surprise)?.label}</span>
                        </span>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => spinRoulette()}
                          disabled={isSpinning}
                          className="flex-1 min-w-[200px] py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 ring-2 ring-amber-400/40"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{isSpinning ? "Đang Khai Quẻ..." : "🔮 BỐC PHIM THEO QUẺ NÀY"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRandomFortuneCard(null)}
                          className="px-4 py-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white font-semibold text-xs border border-white/10 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>⚙️ Tự chỉnh tiêu chí</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* BANNER BỐC QUẺ NGẪU NHIÊN KHI CHƯA MỞ CARD */
                    <div className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/15 border border-amber-500/30">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-2xl flex-none">🎴</span>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-black text-amber-300 truncate">
                            Bạn phân vân chưa biết xem gì hôm nay?
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            Để số mệnh tự kết duyên tổ hợp 5 tiêu chí hoàn hảo
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRandomFortune}
                        disabled={isRollingFortune || isSpinning}
                        className="ml-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/50 transition cursor-pointer active:scale-95 flex-none disabled:opacity-50"
                      >
                        <Dices className={`w-3.5 h-3.5 ${isRollingFortune ? "animate-spin" : ""}`} />
                        <span>Bốc quẻ ngẫu nhiên</span>
                      </button>
                    </div>
                  )}

                  {rouletteResult && (
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-gray-300">Hoặc tùy chỉnh tiêu chí theo ý muốn:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRouletteError(null);
                          setShowCriteriaPicker(false);
                        }}
                        className="text-xs text-amber-400 hover:text-white font-bold underline cursor-pointer"
                      >
                        Quay lại kết quả trước
                      </button>
                    </div>
                  )}

                  {/* 1. MOOD */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>1. 🔥 Bạn muốn cảm giác gì?</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ROULETTE_MOODS.map((m) => {
                        const isSelected = selectedMood === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMood(m.id)}
                            className={`p-2.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-2.5 cursor-pointer group shadow-sm ${
                              isSelected
                                ? "bg-gradient-to-br from-amber-500/25 to-orange-500/25 border-amber-400 text-white ring-2 ring-amber-400/40 shadow-lg shadow-amber-950/40 font-bold scale-[1.02]"
                                : "bg-zinc-900/80 border-white/10 text-gray-300 hover:text-white hover:bg-zinc-800/80 hover:border-amber-500/30"
                            }`}
                          >
                            <span className="text-xl p-1 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                              {m.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate group-hover:text-amber-300 transition-colors">
                                {m.label}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">{m.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. COUNTRY */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <Globe2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>2. 🌏 Bạn muốn xem phim ở đâu?</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ROULETTE_COUNTRIES.map((c) => {
                        const isSelected = selectedCountry === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCountry(c.id)}
                            className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                              isSelected
                                ? "bg-sky-500/25 border-sky-400 text-white ring-2 ring-sky-400/40 shadow-sky-950/40 scale-105"
                                : "bg-zinc-900/80 border-white/10 text-gray-300 hover:text-white hover:bg-zinc-800"
                            }`}
                          >
                            <span>{c.flag}</span>
                            <span>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. COMPANION */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>3. 👥 Xem cùng ai?</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ROULETTE_COMPANIONS.map((cp) => {
                        const isSelected = selectedCompanion === cp.id;
                        return (
                          <button
                            key={cp.id}
                            type="button"
                            onClick={() => setSelectedCompanion(cp.id)}
                            className={`p-2.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-2.5 cursor-pointer group shadow-sm ${
                              isSelected
                                ? "bg-emerald-500/25 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-950/40 font-bold scale-[1.02]"
                                : "bg-zinc-900/80 border-white/10 text-gray-300 hover:text-white hover:bg-zinc-800"
                            }`}
                          >
                            <span className="text-xl p-1 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                              {cp.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate group-hover:text-emerald-300 transition-colors">
                                {cp.label}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">{cp.desc}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. TÙY CHỌN THÊM (THỜI LƯỢNG & ĐỘ BẤT NGỜ) */}
                  <div className="border border-white/10 rounded-2xl bg-zinc-900/60 overflow-hidden shadow-md">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-200 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>✨ Tùy chọn thêm (Thời lượng & Độ bất ngờ)</span>
                        {(selectedDuration !== "all" || selectedSurprise !== "can-bang") && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                        <span>{showAdvancedOptions ? "Thu gọn" : "Mở rộng"}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            showAdvancedOptions ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {showAdvancedOptions && (
                      <div className="p-3.5 sm:p-4 pt-2 border-t border-white/5 space-y-4 animate-in fade-in duration-150">
                        {/* ⏱️ THỜI LƯỢNG */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                            <span>⏱️ Thời lượng:</span>
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {ROULETTE_DURATIONS.map((d) => {
                              const isSelected = selectedDuration === d.id;
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => setSelectedDuration(d.id)}
                                  className={`p-2.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm ${
                                    isSelected
                                      ? "bg-purple-500/25 border-purple-400 text-white ring-2 ring-purple-400/40 shadow-lg shadow-purple-950/40 font-bold scale-[1.02]"
                                      : "bg-zinc-900/80 border-white/10 text-gray-300 hover:text-white hover:bg-zinc-800"
                                  }`}
                                >
                                  <span className="text-lg p-1 rounded-xl bg-black/40 border border-white/10">
                                    {d.icon}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">{d.label}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{d.desc}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 🎲 ĐỘ BẤT NGỜ */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
                            <Dices className="w-3.5 h-3.5 text-rose-400" />
                            <span>🎲 Độ bất ngờ:</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {ROULETTE_SURPRISES.map((s) => {
                              const isSelected = selectedSurprise === s.id;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => setSelectedSurprise(s.id)}
                                  className={`p-2.5 rounded-2xl border text-left transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm ${
                                    isSelected
                                      ? "bg-rose-500/25 border-rose-400 text-white ring-2 ring-rose-400/40 shadow-lg shadow-rose-950/40 font-bold scale-[1.02]"
                                      : "bg-zinc-900/80 border-white/10 text-gray-300 hover:text-white hover:bg-zinc-800"
                                  }`}
                                >
                                  <span className="text-lg p-1 rounded-xl bg-black/40 border border-white/10">
                                    {s.icon}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold truncate">{s.label}</div>
                                    <div className="text-[10px] text-gray-400 truncate">{s.desc}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MEGA SPIN BUTTON */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => spinRoulette()}
                      disabled={isSpinning}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-2xl shadow-amber-950/60 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 ring-2 ring-amber-400/30"
                    >
                      <Dices className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
                      <span>{isSpinning ? "Đang Bốc Quẻ Số Phận..." : "Bốc Quẻ Suất Chiếu Định Mệnh 🎲"}</span>
                    </button>
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
