"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Play,
  Tv,
  Radio,
  Flame,
  Film,
  Dices,
  Volume2,
  CheckCircle2,
  Search,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "./Toast";

function speakResponse(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith("vi") ||
        v.name.toLowerCase().includes("vietnam") ||
        v.name.toLowerCase().includes("tiếng việt") ||
        v.name.toLowerCase().includes("hoaimy") ||
        v.name.toLowerCase().includes("namminh") ||
        v.name.toLowerCase().includes("an")
    );

    // Chỉ phát âm thanh nếu máy có cài giọng Tiếng Việt chuẩn
    if (!viVoice) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = viVoice;
    utterance.lang = viVoice.lang || "vi-VN";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch {}
}

export const AiVoiceCommandModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [feedback, setFeedback] = useState("Bấm vào micro và nói lệnh hoặc tên phim bạn muốn...");
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const router = useRouter();
  const latestTranscriptRef = useRef<string>("");
  const hasExecutedRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const executeVoiceCommand = useCallback((rawText: string) => {
    if (hasExecutedRef.current) return;
    const text = rawText.toLowerCase().trim();
    if (!text) return;

    hasExecutedRef.current = true;
    setIsExecuting(true);
    stopListening();

    // 1. KÊNH TRUYỀN HÌNH (VTV & TV LIVE)
    if (text.includes("vtv3") || text.includes("vtv 3")) {
      const msg = "Đang mở kênh VTV3 HD...";
      setFeedback(msg);
      speakResponse("Đang mở kênh VTV3 cho bạn");
      toast.success("Mở VTV3 HD");
      setTimeout(() => {
        router.push("/live?tab=tv&channel=vtv3-hd");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("vtv1") || text.includes("vtv 1") || text.includes("thời sự")) {
      const msg = "Đang mở kênh VTV1 HD (Thời sự)...";
      setFeedback(msg);
      speakResponse("Đang mở kênh VTV1 cho bạn");
      toast.success("Mở VTV1 HD");
      setTimeout(() => {
        router.push("/live?tab=tv&channel=vtv1-fhd");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("vtv2") || text.includes("vtv 2")) {
      const msg = "Đang mở kênh VTV2 HD...";
      setFeedback(msg);
      speakResponse("Đang mở VTV2");
      setTimeout(() => {
        router.push("/live?tab=tv&channel=vtv2-fhd");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("vtv5") || text.includes("vtv 5")) {
      const msg = "Đang mở kênh VTV5 HD...";
      setFeedback(msg);
      speakResponse("Đang mở VTV5");
      setTimeout(() => {
        router.push("/live?tab=tv&channel=vtv5-fhd");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("vtv6") || text.includes("vtv 6")) {
      const msg = "Đang mở kênh VTV6 HD...";
      setFeedback(msg);
      speakResponse("Đang mở VTV6");
      setTimeout(() => {
        router.push("/live?tab=tv&channel=vtv6-fhd");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (
      text.includes("truyền hình") ||
      text.includes("kênh tv") ||
      text.includes("xem tivi") ||
      text.includes("tivi") ||
      text.includes("htv") ||
      text.includes("thvl") ||
      text.includes("vtc")
    ) {
      const msg = "Đang mở danh mục Kênh Truyền hình TV...";
      setFeedback(msg);
      speakResponse("Đang chuyển đến danh mục truyền hình");
      toast.success("Mở Truyền hình TV");
      setTimeout(() => {
        router.push("/live?tab=tv");
        setIsOpen(false);
      }, 600);
      return;
    }

    // 2. TRỰC TIẾP BÓNG ĐÁ
    if (
      text.includes("bóng đá") ||
      text.includes("đá bóng") ||
      text.includes("trực tiếp") ||
      text.includes("trận đấu") ||
      text.includes("ngoại hạng anh") ||
      text.includes("champions league")
    ) {
      const msg = "Đang mở Trực tiếp bóng đá hôm nay...";
      setFeedback(msg);
      speakResponse("Đang mở trực tiếp bóng đá");
      toast.success("Mở Trực tiếp bóng đá");
      setTimeout(() => {
        router.push("/live?tab=football");
        setIsOpen(false);
      }, 600);
      return;
    }

    // 3. SUẤT CHIẾU ĐỊNH MỆNH (AI ROULETTE / BỐC QUẺ)
    if (
      text.includes("ngẫu nhiên") ||
      text.includes("chọn đại") ||
      text.includes("may mắn") ||
      text.includes("bốc quẻ") ||
      text.includes("quay phim") ||
      text.includes("roulette")
    ) {
      const msg = "Đang mở Vòng quay Bốc quẻ điện ảnh...";
      setFeedback(msg);
      speakResponse("Đang bốc quẻ phim ngẫu nhiên cho bạn");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-ai-roulette"));
        setIsOpen(false);
      }, 500);
      return;
    }

    // 4. TRỢ LÝ NANA GỢI Ý PHIM (AI CONCIERGE)
    if (
      text.includes("trợ lý") ||
      text.includes("nana ai") ||
      text.includes("tư vấn") ||
      text.includes("gợi ý phim") ||
      text.includes("hỏi ai")
    ) {
      const msg = "Đang mở Trợ lý AI gợi ý phim...";
      setFeedback(msg);
      speakResponse("Trợ lý Nana sẵn sàng gợi ý phim cho bạn");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-ai-concierge"));
        setIsOpen(false);
      }, 500);
      return;
    }

    // 5. DANH SÁCH YÊU THÍCH & LỊCH SỬ
    if (
      text.includes("yêu thích") ||
      text.includes("đã lưu") ||
      text.includes("danh sách của tôi") ||
      text.includes("my list") ||
      text.includes("watchlist")
    ) {
      const msg = "Đang mở Danh sách phim yêu thích...";
      setFeedback(msg);
      speakResponse("Đang mở danh sách phim của bạn");
      setTimeout(() => {
        router.push("/my-list");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("lịch sử") || text.includes("đang xem")) {
      const msg = "Đang mở Lịch sử xem phim...";
      setFeedback(msg);
      speakResponse("Đang mở lịch sử xem phim");
      setTimeout(() => {
        router.push("/my-list?tab=history");
        setIsOpen(false);
      }, 600);
      return;
    }

    // 6. TRANG CHỦ
    if (text.includes("trang chủ") || text.includes("về trang chủ") || text === "home") {
      const msg = "Đang quay về Trang chủ...";
      setFeedback(msg);
      speakResponse("Đang về trang chủ");
      setTimeout(() => {
        router.push("/");
        setIsOpen(false);
      }, 500);
      return;
    }

    // 7. THỂ LOẠI PHIM
    if (text.includes("hành động") || text.includes("đánh nhau")) {
      setFeedback("Đang mở danh mục Phim Hành Động...");
      speakResponse("Đang mở phim Hành động");
      setTimeout(() => {
        router.push("/browse?category=hanh-dong");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("kinh dị") || text.includes("phim ma") || text.includes("rùng rợn")) {
      setFeedback("Đang mở danh mục Phim Kinh Dị...");
      speakResponse("Đang mở phim Kinh dị");
      setTimeout(() => {
        router.push("/browse?category=kinh-di");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("tình cảm") || text.includes("lãng mạn") || text.includes("ngôn tình")) {
      setFeedback("Đang mở danh mục Phim Tình Cảm...");
      speakResponse("Đang mở phim Tình cảm");
      setTimeout(() => {
        router.push("/browse?category=tinh-cam");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("hài hước") || text.includes("hài kịch") || text.includes("xả stress")) {
      setFeedback("Đang mở danh mục Phim Hài Hước...");
      speakResponse("Đang mở phim Hài hước xả stress");
      setTimeout(() => {
        router.push("/browse?category=hai-huoc");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("hoạt hình") || text.includes("anime")) {
      setFeedback("Đang mở danh mục Hoạt Hình / Anime...");
      speakResponse("Đang mở phim Hoạt hình Anime");
      setTimeout(() => {
        router.push("/browse?type=hoat-hinh");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("chiếu rạp") || text.includes("phim rạp")) {
      setFeedback("Đang mở danh mục Phim Chiếu Rạp...");
      speakResponse("Đang mở phim Chiếu rạp");
      setTimeout(() => {
        router.push("/browse?type=phim-chieu-rap");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("phim bộ")) {
      setFeedback("Đang mở danh mục Phim Bộ...");
      speakResponse("Đang mở danh sách Phim bộ");
      setTimeout(() => {
        router.push("/browse?type=phim-bo");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("phim lẻ")) {
      setFeedback("Đang mở danh mục Phim Lẻ...");
      speakResponse("Đang mở danh sách Phim lẻ");
      setTimeout(() => {
        router.push("/browse?type=phim-le");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("viễn tưởng") || text.includes("khoa học viễn tưởng")) {
      setFeedback("Đang mở danh mục Phim Viễn Tưởng...");
      speakResponse("Đang mở phim Viễn tưởng");
      setTimeout(() => {
        router.push("/browse?category=vien-tuong");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("cổ trang") || text.includes("võ thuật") || text.includes("kiếm hiệp")) {
      setFeedback("Đang mở danh mục Phim Cổ Trang / Võ Thuật...");
      speakResponse("Đang mở phim Cổ trang võ thuật");
      setTimeout(() => {
        router.push("/browse?category=co-trang");
        setIsOpen(false);
      }, 600);
      return;
    }

    // 8. QUỐC GIA
    if (text.includes("hàn quốc") || text.includes("phim hàn")) {
      setFeedback("Đang mở Phim Hàn Quốc...");
      speakResponse("Đang mở phim Hàn Quốc");
      setTimeout(() => {
        router.push("/browse?country=han-quoc");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("trung quốc") || text.includes("phim trung")) {
      setFeedback("Đang mở Phim Trung Quốc...");
      speakResponse("Đang mở phim Trung Quốc");
      setTimeout(() => {
        router.push("/browse?country=trung-quoc");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("âu mỹ") || text.includes("phim mỹ") || text.includes("hollywood")) {
      setFeedback("Đang mở Phim Âu Mỹ...");
      speakResponse("Đang mở phim Âu Mỹ");
      setTimeout(() => {
        router.push("/browse?country=au-my");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("nhật bản") || text.includes("phim nhật")) {
      setFeedback("Đang mở Phim Nhật Bản...");
      speakResponse("Đang mở phim Nhật Bản");
      setTimeout(() => {
        router.push("/browse?country=nhat-ban");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("thái lan") || text.includes("phim thái")) {
      setFeedback("Đang mở Phim Thái Lan...");
      speakResponse("Đang mở phim Thái Lan");
      setTimeout(() => {
        router.push("/browse?country=thai-lan");
        setIsOpen(false);
      }, 600);
      return;
    }
    if (text.includes("việt nam") || text.includes("phim việt")) {
      setFeedback("Đang mở Phim Việt Nam...");
      speakResponse("Đang mở phim Việt Nam");
      setTimeout(() => {
        router.push("/browse?country=viet-nam");
        setIsOpen(false);
      }, 600);
      return;
    }

    // 9. TÌM KIẾM THEO TÊN PHIM / DIỄN VIÊN
    let searchKeyword = rawText
      .replace(/^(tìm kiếm phim|tìm kiếm|tìm phim|tìm|cho tôi xem phim|cho tôi xem|mở phim|mở|xem phim|xem|chiếu phim|chiếu|phát phim|phát|bật phim|bật)\s+/i, "")
      .trim();

    if (!searchKeyword) searchKeyword = rawText.trim();

    setFeedback(`Đang tìm kiếm: "${searchKeyword}"...`);
    speakResponse(`Đang tìm kiếm phim ${searchKeyword}`);
    toast.success(`Tìm kiếm: ${searchKeyword}`);

    setTimeout(() => {
      router.push(`/browse?keyword=${encodeURIComponent(searchKeyword)}`);
      setIsOpen(false);
    }, 650);
  }, [router, stopListening]);

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;

    setErrorMessage(null);
    hasExecutedRef.current = false;
    setIsExecuting(false);
    latestTranscriptRef.current = "";
    setTranscript("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói Web Speech. Hãy sử dụng Google Chrome, Cốc Cốc hoặc Microsoft Edge!");
      setFeedback("Trình duyệt chưa hỗ trợ Web Speech");
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "vi-VN";
      recognition.interimResults = true;
      recognition.continuous = false; // continuous = false cho nhận diện lệnh chuẩn xác và phản hồi tức thì
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setFeedback("Đang lắng nghe... Hãy nói câu lệnh hoặc tên phim!");
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let currentText = "";
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          currentText += item[0].transcript;
          if (item.isFinal) {
            isFinal = true;
          }
        }

        const trimmed = currentText.trim();
        if (trimmed) {
          latestTranscriptRef.current = trimmed;
          setTranscript(trimmed);

          if (isFinal) {
            executeVoiceCommand(trimmed);
          } else {
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
              if (latestTranscriptRef.current && !hasExecutedRef.current) {
                executeVoiceCommand(latestTranscriptRef.current);
              }
            }, 1000);
          }
        }
      };

      recognition.onerror = (event: { error?: string }) => {
        console.warn("Speech Recognition error:", event.error);
        setIsListening(false);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setErrorMessage("Trình duyệt chưa được cấp quyền Micro. Hãy bấm vào biểu tượng Micro/Ổ khóa trên thanh địa chỉ để Chọn Cho phép (Allow) nhé!");
          setFeedback("Chưa được cấp quyền sử dụng Micro!");
        } else if (event.error === "audio-capture") {
          setErrorMessage("Không tìm thấy micro trên máy tính. Hãy kiểm tra lại thiết bị thu âm của bạn.");
          setFeedback("Không tìm thấy thiết bị thu âm!");
        } else if (event.error === "no-speech") {
          setFeedback("Chưa nghe thấy giọng nói. Hãy bấm lại vào Micro và thử nói nhé!");
        } else {
          setFeedback("Hãy bấm vào Micro để thử lại nhé!");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (latestTranscriptRef.current && !hasExecutedRef.current) {
          executeVoiceCommand(latestTranscriptRef.current);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn("SpeechRecognition start exception:", e);
      setIsListening(false);
      setFeedback("Không thể khởi động micro. Hãy bấm vào micro để thử lại!");
    }
  }, [executeVoiceCommand]);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTranscript("");
      setManualInput("");
      setErrorMessage(null);
      hasExecutedRef.current = false;
      setIsExecuting(false);
      setFeedback("Đang khởi động micro... Hãy nói câu lệnh của bạn!");
      setTimeout(() => {
        startListening();
      }, 150);
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    executeVoiceCommand(manualInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 overflow-hidden">
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
            <span>Nana AI Voice Controller</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            Điều Khiển Bằng Giọng Nói
          </h3>
        </div>

        {/* CẢNH BÁO QUYỀN MICRO */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 text-left">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Lưu ý kết nối Micro:</p>
              <p className="text-amber-300/90 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* NÚT MICRO & HIỆU ỨNG SÓNG ÂM THANH DYNAMIC */}
        <div className="py-2 flex flex-col items-center justify-center">
          <div className="relative my-2">
            {/* PULSING RINGS KHI ĐANG NGHE */}
            {isListening && (
              <>
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-red-600 to-rose-600 opacity-50 animate-ping [animation-duration:1.8s]" />
                <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-rose-600 to-amber-600 opacity-25 animate-pulse [animation-duration:1.2s]" />
              </>
            )}

            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
                isListening
                  ? "bg-gradient-to-tr from-netflix-red via-rose-600 to-amber-500 text-white scale-105 shadow-red-950/70 ring-4 ring-rose-500/50"
                  : "bg-zinc-800 text-gray-400 hover:text-white hover:bg-zinc-700 border border-white/20"
              }`}
              title={isListening ? "Nhấn để dừng nghe" : "Nhấn để bắt đầu nói"}
            >
              {isListening ? (
                <Mic className="w-10 h-10 sm:w-12 sm:h-12 animate-bounce [animation-duration:0.9s]" />
              ) : isExecuting ? (
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 animate-pulse" />
              ) : (
                <MicOff className="w-10 h-10 sm:w-12 sm:h-12" />
              )}
            </button>
          </div>

          {/* SÓNG ÂM AUDIO WAVE BARS */}
          {isListening && (
            <div className="flex items-center justify-center gap-1.5 h-6 my-1">
              {[0.4, 0.8, 1.0, 0.6, 0.9, 0.5, 0.7, 1.0, 0.4].map((scale, i) => (
                <span
                  key={i}
                  className="w-1 bg-gradient-to-t from-rose-500 to-amber-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.round(scale * 20)}px`,
                    animationDelay: `${i * 0.12}s`,
                    animationDuration: "0.6s",
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isListening ? "bg-red-500 animate-ping" : isExecuting ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <p className="text-xs font-black uppercase tracking-wider text-gray-300">
              {isListening
                ? "Đang lắng nghe giọng nói..."
                : isExecuting
                ? "Đang thực hiện lệnh..."
                : "Bấm vào biểu tượng micro để nói"}
            </p>
          </div>
        </div>

        {/* KHUNG HIỂN THỊ KẾT QUẢ / TRẠNG THÁI */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-3 text-left min-h-[90px] flex flex-col justify-center">
          {transcript ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400 uppercase font-bold flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                  Bạn đã nói:
                </span>
                {isListening && (
                  <span className="text-[10px] text-amber-400 font-semibold animate-pulse">
                    Đang xử lý...
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-extrabold text-white leading-snug">
                &ldquo;{transcript}&rdquo;
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                {feedback}
              </p>
              {!isListening && (
                <button
                  type="button"
                  onClick={startListening}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-rose-400 hover:text-white transition flex-shrink-0 cursor-pointer"
                  title="Thử lại"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* NÚT THỰC THI THỦ CÔNG KHI ĐÃ CÓ TEXT */}
          {transcript && isListening && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => executeVoiceCommand(transcript)}
                className="px-4 py-1.5 rounded-full bg-netflix-red hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Thực hiện ngay</span>
              </button>
            </div>
          )}
        </div>

        {/* NHẬP TAY DỰ PHÒNG */}
        <form onSubmit={handleManualSubmit} className="relative flex items-center">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Hoặc gõ câu lệnh / tên phim vào đây..."
            className="w-full px-4 py-2.5 pr-24 rounded-xl bg-zinc-900/80 border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-rose-400" />
            <span>Gửi</span>
          </button>
        </form>

        {/* CÂU LỆNH MẪU (CLICK CHẠY TỨC THÌ) */}
        <div className="space-y-2 pt-1 text-left">
          <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">
            Thử nói hoặc bấm vào câu lệnh mẫu:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: "Mở kênh VTV3", icon: Tv, cmd: "mở kênh vtv3" },
              { label: "Trực tiếp bóng đá", icon: Radio, cmd: "xem trực tiếp bóng đá" },
              { label: "Phim Hành Động", icon: Flame, cmd: "mở phim hành động" },
              { label: "Phim Hoạt Hình", icon: Film, cmd: "mở phim hoạt hình anime" },
              { label: "Bốc quẻ điện ảnh", icon: Dices, cmd: "bốc quẻ may mắn" },
              { label: "Tìm Đào, Phở và Piano", icon: Sparkles, cmd: "tìm phim Đào Phở và Piano" },
            ].map((sample, idx) => {
              const Icon = sample.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => executeVoiceCommand(sample.cmd)}
                  className="text-xs p-2 rounded-xl bg-white/5 hover:bg-white/15 text-gray-200 hover:text-white border border-white/10 transition flex items-center gap-2 text-left cursor-pointer group"
                >
                  <Icon className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <span className="truncate">{sample.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
