"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  X,
  Send,
  Loader2,
  Key,
  Check,
  Play,
  Copy,
  CheckCheck,
  Dices,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

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
  mood?: string;
  movies?: AiMovieCard[];
  provider?: string;
  time: string;
}

const QUICK_MOOD_PROMPTS = [
  {
    label: "💖 Lãng mạn & Hẹn hò",
    prompt:
      "Gợi ý cho tôi phim tình cảm lãng mạn ngọt ngào để xem cùng người yêu",
  },
  {
    label: "💥 Bom tấn & Hành động",
    prompt: "Tôi muốn xem phim hành động bom tấn mãn nhãn, rượt đuổi kịch tính",
  },
  {
    label: "🤣 Hài hước & Xả stress",
    prompt: "Hôm nay tôi mệt mỏi quá, gợi ý phim hài hước cười xả stress nhé",
  },
  {
    label: "🧠 Trinh thám & Hack não",
    prompt: "Gợi ý phim trinh thám đấu trí căng não có cú lật mặt bất ngờ",
  },
  {
    label: "👻 Kinh dị & Lạnh gáy",
    prompt: "Đêm khuya muốn thử cảm giác mạnh với phim kinh dị rùng rợn",
  },
  {
    label: "🎨 Anime & Chữa lành",
    prompt:
      "Gợi ý phim hoạt hình anime nhẹ nhàng, cảm động và chữa lành tâm hồn",
  },
];

const SURPRISE_PROMPTS = [
  "Gợi ý cho tôi phim du hành thời gian viễn tưởng có cú twist cực mạnh",
  "Tìm phim trinh thám hình sự giật gân, bóc tách tâm lý tội phạm",
  "Tôi muốn xem phim học đường thanh xuân trong trẻo, hoài niệm tuổi trẻ",
  "Gợi ý phim võ thuật cổ trang tiên hiệp kỹ xảo hoành tráng mãn nhãn",
  "Phim về thế giới cyberpunk tương lai công nghệ cao kỹ xảo đỉnh",
  "Phim tình thân gia đình ấm áp, sâu sắc chạm đến trái tim",
  "Phim sát thủ điệp viên rượt đuổi nghẹt thở phong cách Hollywood",
  "Phim kinh dị tâm linh rùng rợn lạnh gáy để thử thách lòng dũng cảm",
];

function formatCountryBadge(name?: string): string {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n.includes("trung")) return "🇨🇳 " + name;
  if (n.includes("hàn") || n.includes("korea")) return "🇰🇷 " + name;
  if (n.includes("mỹ") || n.includes("âu") || n.includes("us"))
    return "🇺🇸 " + name;
  if (n.includes("hồng kông") || n.includes("hong kong")) return "🇭🇰 " + name;
  if (n.includes("nhật") || n.includes("japan")) return "🇯🇵 " + name;
  if (n.includes("thái") || n.includes("thai")) return "🇹🇭 " + name;
  if (n.includes("việt") || n.includes("viet")) return "🇻🇳 " + name;
  if (n.includes("ấn độ") || n.includes("india")) return "🇮🇳 " + name;
  return "🌏 " + name;
}

function AiMovieSection({
  movies,
  onSelectMovie,
}: {
  movies: AiMovieCard[];
  onSelectMovie: () => void;
}) {
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedActor, setSelectedActor] = useState<string>("all");
  const [actorSearch, setActorSearch] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Trích xuất danh sách Quốc gia duy nhất từ kết quả AI
  const countryList = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movies) {
      if (m.country) {
        const c = m.country.trim();
        if (c) map.set(c, (map.get(c) || 0) + 1);
      }
    }
    return Array.from(map.entries());
  }, [movies]);

  // Trích xuất danh sách Diễn viên xuất hiện nhiều nhất từ kết quả AI
  const actorList = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const m of movies) {
      for (const a of m.actors || []) {
        const name = a.trim();
        if (name && name.length > 2) {
          map.set(name, (map.get(name) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [movies]);

  // Bộ lọc thời gian thực (0 token, 0ms)
  const filteredMovies = React.useMemo(() => {
    return movies.filter((m) => {
      // 1. Lọc Quốc gia
      if (selectedCountry !== "all") {
        const c = (m.country || "").toLowerCase();
        if (!c.includes(selectedCountry.toLowerCase())) return false;
      }
      // 2. Lọc Diễn viên qua nút bấm
      if (selectedActor !== "all") {
        const hasAct = m.actors?.some((a) =>
          a.toLowerCase().includes(selectedActor.toLowerCase()),
        );
        if (!hasAct) return false;
      }
      // 3. Lọc Diễn viên hoặc Tên phim qua ô tìm kiếm
      if (actorSearch.trim()) {
        const q = actorSearch.toLowerCase().trim();
        const hasAct = m.actors?.some((a) => a.toLowerCase().includes(q));
        const hasTitle = m.title.toLowerCase().includes(q);
        if (!hasAct && !hasTitle) return false;
      }
      return true;
    });
  }, [movies, selectedCountry, selectedActor, actorSearch]);

  const visibleMovies = isExpanded
    ? filteredMovies
    : filteredMovies.slice(0, 6);

  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
      {/* THANH BỘ LỌC THÔNG MINH THEO QUỐC GIA VÀ DIỄN VIÊN */}
      <div className="bg-black/50 rounded-xl p-2.5 border border-white/10 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-200">
            <Filter className="w-3.5 h-3.5 text-rose-400" />
            <span>
              Lọc Nhanh Gợi Ý ({filteredMovies.length}/{movies.length} phim)
            </span>
          </div>
          {(selectedCountry !== "all" ||
            selectedActor !== "all" ||
            actorSearch) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCountry("all");
                setSelectedActor("all");
                setActorSearch("");
              }}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        {/* 1. Nút bấm lọc theo Quốc gia */}
        {countryList.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <span className="text-[10px] text-gray-400 flex-none font-semibold">
              Quốc gia:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCountry("all")}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition flex-none cursor-pointer ${
                selectedCountry === "all"
                  ? "bg-netflix-red text-white shadow-sm"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              Tất cả ({movies.length})
            </button>
            {countryList.map(([cName, count]) => (
              <button
                key={cName}
                type="button"
                onClick={() =>
                  setSelectedCountry(selectedCountry === cName ? "all" : cName)
                }
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition flex-none cursor-pointer ${
                  selectedCountry === cName
                    ? "bg-netflix-red text-white shadow-sm"
                    : "bg-white/10 text-gray-300 hover:bg-white/20"
                }`}
              >
                {formatCountryBadge(cName)} ({count})
              </button>
            ))}
          </div>
        )}

        {/* 2. Lọc theo Diễn viên */}
        {(actorList.length > 0 ||
          movies.some((m) => m.actors && m.actors.length > 0)) && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 flex-none font-semibold">
                Diễn viên:
              </span>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={actorSearch}
                  onChange={(e) => {
                    setActorSearch(e.target.value);
                    if (e.target.value) setSelectedActor("all");
                  }}
                  placeholder="Nhập tên diễn viên muốn lọc..."
                  className="w-full bg-zinc-950 border border-white/15 px-2.5 py-1 rounded-lg text-white text-[11px] placeholder-gray-500 outline-none focus:border-netflix-red"
                />
                {actorSearch && (
                  <button
                    type="button"
                    onClick={() => setActorSearch("")}
                    className="absolute right-2 top-1.5 text-gray-400 hover:text-white text-[10px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {actorList.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {actorList.map(([actName, count]) => (
                  <button
                    key={actName}
                    type="button"
                    onClick={() => {
                      setSelectedActor(
                        selectedActor === actName ? "all" : actName,
                      );
                      setActorSearch("");
                    }}
                    className={`px-2 py-0.5 rounded-full text-[9.5px] font-semibold transition flex-none cursor-pointer ${
                      selectedActor === actName
                        ? "bg-rose-600 text-white"
                        : "bg-white/5 text-gray-400 hover:text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    ⭐ {actName} ({count})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DANH SÁCH THẺ PHIM */}
      {visibleMovies.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-xs bg-black/20 rounded-xl border border-white/5">
          Không tìm thấy phim nào khớp với bộ lọc đã chọn. Hãy thử chọn quốc gia
          hoặc diễn viên khác nhé!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {visibleMovies.map((movie) => (
            <div
              key={movie.slug}
              className="group/card rounded-xl bg-black/60 border border-white/15 p-2.5 flex gap-2.5 hover:border-netflix-red/60 hover:bg-zinc-900/80 transition-all shadow-md"
            >
              <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover/card:scale-105 transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/default-hero.jpg";
                  }}
                />
                {movie.quality && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[8.5px] font-black bg-black/80 text-white border border-white/20">
                    {movie.quality}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <h5 className="text-xs font-black text-white group-hover/card:text-rose-400 transition truncate">
                    {movie.title}
                  </h5>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5 flex-wrap">
                    <span>{movie.year}</span>
                    {movie.country && (
                      <>
                        <span>•</span>
                        <span className="text-rose-300 font-medium">
                          {formatCountryBadge(movie.country)}
                        </span>
                      </>
                    )}
                    {movie.category && (
                      <>
                        <span>•</span>
                        <span className="truncate">{movie.category}</span>
                      </>
                    )}
                  </div>
                  {movie.actors && movie.actors.length > 0 && (
                    <p className="text-[9.5px] text-gray-400 truncate mt-0.5">
                      <span className="text-gray-500">Diễn viên:</span>{" "}
                      {movie.actors.slice(0, 3).join(", ")}
                    </p>
                  )}
                  {movie.reason && (
                    <p className="text-[10px] text-gray-300 line-clamp-2 mt-1 leading-snug italic">
                      &ldquo;{movie.reason}&rdquo;
                    </p>
                  )}
                </div>

                <Link
                  href={`/movies/${movie.slug}`}
                  onClick={onSelectMovie}
                  className="inline-flex items-center gap-1 text-[10.5px] font-black text-rose-400 hover:text-white transition mt-1.5 self-start"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Xem phim ngay →</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NÚT XEM THÊM / THU GỌN KHI KẾT QUẢ > 6 PHIM */}
      {filteredMovies.length > 6 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Thu gọn danh sách</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>
                Xem thêm {filteredMovies.length - 6} phim gợi ý khác ⬇
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function AiMovieConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [serverKeyActive, setServerKeyActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Xin chào! Tôi là Trợ lý Nana (Nana Concierge) 🎬. Bạn đang muốn xem thể loại nào hôm nay? Hãy chia sẻ tâm trạng, diễn viên hoặc cốt truyện bạn mong muốn, Nana sẽ tìm cho bạn những bộ phim hoàn hảo nhất nhé!",
      time: "Vừa xong",
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Kiểm tra trạng thái Gemini API Key từ server
  useEffect(() => {
    fetch("/api/ai-concierge")
      .then((r) => r.json())
      .then((d) => {
        if (d?.hasServerKey) setServerKeyActive(true);
      })
      .catch(() => {});
  }, []);

  // Đọc API Key lưu trong localStorage
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("nanaflix_gemini_key");
      if (savedKey) setApiKey(savedKey);
    } catch {}
  }, []);

  // Lắng nghe sự kiện mở toàn cục
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    window.addEventListener("open-ai-concierge", handleOpen);
    return () => window.removeEventListener("open-ai-concierge", handleOpen);
  }, []);

  // Cuộn xuống cuối hội thoại
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // Đóng bằng phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSaveKey = () => {
    try {
      if (!apiKey.trim()) {
        localStorage.removeItem("nanaflix_gemini_key");
        setApiKey("");
      } else {
        localStorage.setItem("nanaflix_gemini_key", apiKey.trim());
      }
      setKeySaved(true);
      setTimeout(() => {
        setKeySaved(false);
        setShowKeyInput(false);
      }, 1200);
    } catch {}
  };

  const handleClearKey = () => {
    try {
      localStorage.removeItem("nanaflix_gemini_key");
      setApiKey("");
      setKeySaved(false);
      setShowKeyInput(false);
    } catch {}
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyRecommendation = (msg: ChatMessage) => {
    if (!msg.movies || msg.movies.length === 0) return;
    const textLines = [
      `🎬 Nana Gợi Ý: ${msg.mood || "Tuyển Tập Phim"}`,
      `${msg.text}`,
      "",
      ...msg.movies.map(
        (m, idx) =>
          `${idx + 1}. ${m.title} (${m.year || "Phim"}) - ${m.quality || "HD"}\n   👉 "${m.reason || "Rất đáng xem"}"`,
      ),
      "",
      "✨ Cùng Nana khám phá và thưởng thức trọn bộ tại Nanaflix!",
    ];
    navigator.clipboard.writeText(textLines.join("\n"));
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSurpriseMe = () => {
    const randomPrompt =
      SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
    handleSendMessage(randomPrompt);
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const query = (promptToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: query,
      time: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // 1. KIỂM TRA BỘ NHỚ TRÌNH DUYỆT (0 TOKEN & 0MS NẾU ĐÃ HỎI TRONG PHIÊN NÀY)
    const clientCacheKey = `concierge_cache_${query.toLowerCase().trim()}`;
    try {
      const cached = sessionStorage.getItem(clientCacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: cachedData.reply || "Dưới đây là một số gợi ý phù hợp với bạn:",
          mood: cachedData.mood,
          movies: cachedData.movies || [],
          provider: "Nana AI",
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setLoading(false);
        return;
      }
    } catch {}

    try {
      const res = await fetch("/api/ai-concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: query,
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      // Lưu vào sessionStorage để lần sau hỏi lại không tốn token và mạng
      try {
        sessionStorage.setItem(clientCacheKey, JSON.stringify(data));
      } catch {}

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: data.reply || "Dưới đây là một số gợi ý phù hợp với bạn:",
        mood: data.mood,
        movies: data.movies || [],
        provider: data.provider,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          text: "Xin lỗi, đã xảy ra lỗi khi kết nối. Bạn hãy thử lại hoặc chọn một tâm trạng bên dưới nhé!",
          time: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 1. NÚT NỔI GÓC DƯỚI PHẢI (FLOATING TRIGGER BUTTON) */}
      <div className="fixed bottom-6 right-4 sm:bottom-6 sm:right-6 z-40 hidden min-[450px]:block">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          title="Trợ Lý Nana Gợi Ý Phim Theo Tâm Trạng"
          className="group relative flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 text-white font-extrabold text-xs sm:text-sm shadow-[0_10px_35px_rgba(229,9,20,0.45)] hover:shadow-[0_15px_45px_rgba(229,9,20,0.7)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-white/25"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin [animation-duration:4s]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="hidden min-[450px]:inline tracking-wide font-black">
            Nana Gợi Ý Phim
          </span>
        </button>
      </div>

      {/* 2. MODAL TRÒ CHUYỆN NANA GỢI Ý PHIM CHUYÊN NGHIỆP */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 md:p-6 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-zinc-950 rounded-3xl border border-white/20 shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col h-[88vh] max-h-[780px] overflow-hidden animate-in zoom-in-95 duration-200"
            >
              {/* HEADER */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 flex-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-red-950/60 flex-none border border-white/20">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-black text-sm sm:text-base flex items-center gap-2 truncate">
                      <span>Trợ Lý Nana</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600/30 to-purple-600/30 text-rose-300 font-bold border border-rose-500/30 hidden sm:inline">
                        Nana AI
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        Nana gợi ý phim thông minh theo cảm xúc & gu xem của bạn
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(
                          new CustomEvent("open-ai-roulette"),
                        );
                      }
                    }}
                    title="Mở vòng quay Suất Chiếu Định Mệnh"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition cursor-pointer border text-xs font-bold text-amber-300 bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25"
                  >
                    <Dices className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bốc Quẻ 🎲</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    title="Cài đặt Google Gemini API Key"
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition cursor-pointer border text-xs font-bold ${
                      serverKeyActive || apiKey
                        ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30 shadow-sm shadow-emerald-950"
                        : "text-amber-300 bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {serverKeyActive || apiKey
                        ? "✨ Gemini Đang Chạy"
                        : "Nhập API Key"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* DẢI CÀI ĐẶT API KEY (COLLAPSIBLE) */}
              {showKeyInput && (
                <div className="px-4 py-3 bg-zinc-900/95 border-b border-white/10 text-xs space-y-2 animate-in slide-in-from-top-2 duration-150">
                  {serverKeyActive && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs shadow-inner">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-none" />
                      <span>
                        <strong>Đã kích hoạt Google Gemini 3.5 Flash:</strong>{" "}
                        Hệ thống đã nạp thành công API Key từ file{" "}
                        <code>.env.local</code> của bạn. Tất cả câu hỏi đều được
                        Google Gemini AI xử lý trực tiếp!
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="font-bold text-gray-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Tùy chọn: Nhập Key cá nhân riêng (nếu muốn ghi đè)
                      </span>
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-sky-400 hover:underline font-bold"
                    >
                      Lấy Key miễn phí tại Google AI Studio ↗
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={
                        serverKeyActive
                          ? "Đang dùng key hệ thống .env.local (hoặc dán key riêng...)"
                          : "Dán Gemini API Key của bạn tại đây..."
                      }
                      className="flex-1 bg-zinc-950 border border-white/15 px-3 py-1.5 rounded-xl text-white text-xs placeholder-gray-500 outline-none focus:border-netflix-red"
                    />
                    <button
                      type="button"
                      onClick={handleSaveKey}
                      className="px-3 py-1.5 rounded-xl bg-netflix-red text-white font-bold hover:bg-red-700 transition cursor-pointer flex items-center gap-1"
                    >
                      {keySaved ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        "Lưu"
                      )}
                    </button>
                    {apiKey && (
                      <button
                        type="button"
                        onClick={handleClearKey}
                        title="Xóa key trình duyệt và dùng key mặc định hệ thống"
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-gray-300 hover:text-white hover:bg-zinc-700 transition cursor-pointer text-[11px]"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* VÙNG NỘI DUNG HỘI THOẠI */}
              <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4 scrollbar-thin">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-md ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-br-none"
                          : "bg-zinc-900/90 text-gray-200 border border-white/10 rounded-bl-none"
                      }`}
                    >
                      {msg.mood && (
                        <div className="mb-2 pb-1.5 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap text-[11px] font-black text-rose-300">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-none" />
                            <span>Tâm trạng nhận diện: {msg.mood}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {msg.movies && msg.movies.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleCopyRecommendation(msg)}
                                title="Sao chép danh sách phim gợi ý"
                                className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/15 transition flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-300">
                                      Đã sao chép
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Sao chép</span>
                                  </>
                                )}
                              </button>
                            )}
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1 flex-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                              Nana AI
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="whitespace-pre-line">{msg.text}</p>

                      {/* DANH SÁCH THẺ PHIM ĐƯỢC GỢI Ý KÈM BỘ LỌC CHÍNH XÁC QUỐC GIA & DIỄN VIÊN */}
                      {msg.movies && msg.movies.length > 0 && (
                        <AiMovieSection
                          movies={msg.movies}
                          onSelectMovie={() => setIsOpen(false)}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-gray-500">
                      <span>{msg.time}</span>
                      {msg.provider && (
                        <>
                          <span>•</span>
                          <span
                            className={
                              msg.provider.includes("Gemini")
                                ? "text-emerald-400 font-semibold"
                                : "text-gray-400 font-medium"
                            }
                          >
                            Xử lý bởi {msg.provider}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}

                {/* TRẠNG THÁI AI ĐANG SUY NGHĨ */}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 bg-zinc-900/80 p-3 rounded-2xl border border-white/10 max-w-xs animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-netflix-red" />
                    <span>AI đang phân tích cảm xúc & chọn phim...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* GỢI Ý TÂM TRẠNG NHANH (CHIPS) */}
              <div className="px-3.5 sm:px-5 py-2 border-t border-white/10 bg-zinc-900/50 flex-none">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden py-0.5">
                  <button
                    type="button"
                    onClick={handleSurpriseMe}
                    disabled={loading}
                    className="flex-none px-2.5 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 hover:text-white border border-amber-500/40 hover:bg-amber-500/30 transition cursor-pointer whitespace-nowrap flex items-center gap-1 shadow-sm"
                  >
                    <Dices className="w-3.5 h-3.5 text-amber-400" />
                    <span>🎲 Gợi ý bất ngờ</span>
                  </button>
                  {QUICK_MOOD_PROMPTS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      disabled={loading}
                      className="flex-none px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition cursor-pointer whitespace-nowrap"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KHUNG NHẬP NỘI DUNG */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-zinc-950 flex-none">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập cảm xúc của bạn (vd: 'Buồn muốn khóc', 'Hành động kịch tính')..."
                    disabled={loading}
                    className="flex-1 bg-zinc-900 border border-white/15 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 outline-none focus:border-netflix-red transition"
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-netflix-red hover:bg-red-700 disabled:opacity-40 text-white font-bold transition flex items-center justify-center cursor-pointer shadow-md shadow-red-950/50 flex-none"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export default AiMovieConcierge;
