"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "./Toast";

export const AiVoiceCommandModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("Đang lắng nghe... Hãy nói tên phim hoặc lệnh bạn muốn thực hiện!");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const executeVoiceCommand = useCallback((rawText: string) => {
    const text = rawText.toLowerCase().trim();
    if (!text) return;

    // 1. Phim theo thể loại
    if (text.includes("hành động")) {
      setFeedback("Đang mở phim Hành động...");
      setTimeout(() => {
        router.push("/browse?category=hanh-dong");
        setIsOpen(false);
      }, 700);
      return;
    }
    if (text.includes("kinh dị") || text.includes("ma")) {
      setFeedback("Đang mở phim Kinh dị...");
      setTimeout(() => {
        router.push("/browse?category=kinh-di");
        setIsOpen(false);
      }, 700);
      return;
    }
    if (text.includes("hoạt hình") || text.includes("anime")) {
      setFeedback("Đang mở phim Hoạt hình / Anime...");
      setTimeout(() => {
        router.push("/browse?type=hoat-hinh");
        setIsOpen(false);
      }, 700);
      return;
    }
    if (text.includes("phim rạp") || text.includes("chiếu rạp")) {
      setFeedback("Đang mở phim Chiếu rạp...");
      setTimeout(() => {
        router.push("/browse?type=phim-chieu-rap");
        setIsOpen(false);
      }, 700);
      return;
    }
    if (text.includes("phim bộ")) {
      setFeedback("Đang mở danh sách Phim bộ...");
      setTimeout(() => {
        router.push("/browse?type=phim-bo");
        setIsOpen(false);
      }, 700);
      return;
    }
    if (text.includes("phim lẻ")) {
      setFeedback("Đang mở danh sách Phim lẻ...");
      setTimeout(() => {
        router.push("/browse?type=phim-le");
        setIsOpen(false);
      }, 700);
      return;
    }

    // 2. Trực tiếp bóng đá & truyền hình
    if (text.includes("bóng đá") || text.includes("trực tiếp")) {
      setFeedback("Đang chuyển đến Trực tiếp bóng đá...");
      setTimeout(() => {
        router.push("/live");
        setIsOpen(false);
      }, 700);
      return;
    }
    if (text.includes("truyền hình") || text.includes("tv") || text.includes("vtv")) {
      setFeedback("Đang mở Kênh Truyền hình TV...");
      setTimeout(() => {
        router.push("/live/tv");
        setIsOpen(false);
      }, 700);
      return;
    }

    // 3. Phim ngẫu nhiên
    if (text.includes("ngẫu nhiên") || text.includes("chọn đại") || text.includes("may mắn")) {
      setFeedback("Đang quay phim ngẫu nhiên...");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-ai-roulette"));
        setIsOpen(false);
      }, 700);
      return;
    }

    // 4. Mặc định: Tìm kiếm phim theo tên
    setFeedback(`Đang tìm kiếm phim: "${rawText}"...`);
    setTimeout(() => {
      router.push(`/browse?keyword=${encodeURIComponent(rawText)}`);
      setIsOpen(false);
    }, 800);
  }, [router]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedback("Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói Web Speech. Vui lòng sử dụng Chrome hoặc Edge!");
      toast.error("Trình duyệt chưa hỗ trợ Web Speech API");
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "vi-VN";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let currentText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }

        const trimmed = currentText.trim();
        setTranscript(trimmed);

        if (event.results[0].isFinal) {
          executeVoiceCommand(trimmed);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setFeedback("Không nghe rõ giọng nói. Hãy bấm vào mic và thử lại nhé!");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [executeVoiceCommand]);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTranscript("");
      setFeedback("Đang lắng nghe... Hãy nói câu lệnh của bạn!");
      startListening();
    };

    window.addEventListener("open-ai-voice-command" as unknown as keyof WindowEventMap, handleOpen as EventListener);
    return () => {
      window.removeEventListener("open-ai-voice-command" as unknown as keyof WindowEventMap, handleOpen as EventListener);
      stopListening();
    };
  }, [startListening, stopListening]);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, stopListening]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 overflow-hidden">
        {/* NÚT ĐÓNG */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition cursor-pointer"
          title="Đóng (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Nana AI Voice Assistant</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Điều Khiển Bằng Giọng Nói
          </h3>
        </div>

        {/* ANIMATED SOUNDWAVE VISUALIZER & MIC BUTTON */}
        <div className="py-4 flex flex-col items-center justify-center">
          <div className="relative">
            {/* PULSING RINGS KHI ĐANG NGHE */}
            {isListening && (
              <>
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-red-600 to-rose-600 opacity-40 animate-ping [animation-duration:2s]" />
                <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-rose-600 to-amber-600 opacity-20 animate-pulse [animation-duration:1.5s]" />
              </>
            )}

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
                isListening
                  ? "bg-gradient-to-tr from-netflix-red via-rose-600 to-amber-500 text-white scale-105"
                  : "bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700 border border-white/20"
              }`}
            >
              {isListening ? (
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 animate-bounce [animation-duration:1s]" />
              ) : (
                <MicOff className="w-10 h-10 sm:w-12 sm:h-12" />
              )}
            </button>
          </div>

          <p className="mt-4 text-xs font-bold text-gray-400">
            {isListening ? "ĐANG LẮNG NGHE..." : "BẤM VÀO MIC ĐỂ NÓI"}
          </p>
        </div>

        {/* TRANSCRIPT & STATUS BOX */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-2 text-left min-h-[90px] flex flex-col justify-center">
          {transcript ? (
            <div>
              <span className="text-[11px] text-gray-400 uppercase font-semibold">
                Bạn đã nói:
              </span>
              <p className="text-sm sm:text-base font-bold text-white italic">
                &ldquo;{transcript}&rdquo;
              </p>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-gray-400 text-center">
              {feedback}
            </p>
          )}
        </div>

        {/* SAMPLE VOICE PROMPTS */}
        <div className="space-y-2 pt-1 text-left">
          <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">
            Thử nói các câu lệnh mẫu:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "🎬 Tìm phim Đào, Phở và Piano",
              "🌟 Phim của Thành Long",
              "🍿 Phim của Châu Tinh Trì",
              "🎲 Bốc quẻ phim",
              "💥 Phim hành động Hàn Quốc",
              "⚽ Xem trực tiếp bóng đá",
            ].map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => executeVoiceCommand(sample.replace(/^[^\w\s\u00C0-\u1EF9]*\s*/u, ""))}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 transition cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
