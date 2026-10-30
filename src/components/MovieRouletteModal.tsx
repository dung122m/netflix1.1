"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  X,
  Play,
  Dices,
  Smile,
  Flame,
  Brain,
  Ghost,
  Rocket,
  Palette,
  CloudRain,
  Globe2,
  Users,
  Heart,
  ChevronDown,
  Star,
  Clock,
  BookOpen,
  Film,
} from "lucide-react";
import { useBodyScrollLock } from "@/lib/scrollLock";
import { MovieRouletteDice3D } from "./MovieRouletteDice3D";

// Giữ animation khoảng 1.5–2 giây (1.6s) để tạo cảm giác hồi hộp, cao trào cinematic
const MIN_SPIN_DURATION_MS = 1600;

// ============================================================================
// TYPES
// ============================================================================
export interface RouletteResult {
  movie: {
    slug: string;
    title: string;
    originalTitle?: string;
    poster: string;
    year?: number | string;
    quality?: string;
    category?: string;
    categories?: string[];
    country?: string;
    episodeCurrent?: string;
    duration?: string;
    overview?: string;
    description?: string;
    content?: string;
    actors?: string[];
    director?: string[];
    rating?: number;
    trailerUrl?: string;
  };
  punchline: string;
  badges: string[];
  matchScore: number;
  provider: string;
  poolCandidates?: RouletteResult[];
}

// ============================================================================
// CONSTANTS & PRESETS
// ============================================================================
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

const STORAGE_KEY = "nana_roulette_rolled_slugs";
const MAX_ROLLED_SLUGS = 50;

const getStoredRolledSlugs = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_ROLLED_SLUGS) : [];
  } catch {
    return [];
  }
};

const saveStoredRolledSlugs = (slugs: string[]) => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slugs.slice(-MAX_ROLLED_SLUGS)));
  } catch {
    // Ignore storage quota errors
  }
};

export interface MovieRouletteModalProps {
  initialOpen?: boolean;
  onClose?: () => void;
}

export const MovieRouletteModal: React.FC<MovieRouletteModalProps> = ({
  initialOpen = false,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  useBodyScrollLock(isOpen);

  // ROULETTE STATE
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
  const [candidatePool, setCandidatePool] = useState<RouletteResult[]>([]);
  const [lastCriteriaKey, setLastCriteriaKey] = useState<string>("");
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const [diceValues, setDiceValues] = useState<[number, number]>([5, 6]);
  const requestSeqRef = useRef(0);
  const catalogPageRef = useRef(1);
  const isPrefetchingRef = useRef(false);
  const hasExhaustedCatalogRef = useRef(false);
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean timer and animations on unmount
  useEffect(() => {
    return () => {
      if (spinTimerRef.current) {
        clearTimeout(spinTimerRef.current);
        spinTimerRef.current = null;
      }
    };
  }, []);

  // Reset pagination and exhaustion state when criteria changes
  const activeCriteriaKey = `${selectedMood}|${selectedCountry}|${selectedCompanion}|${selectedDuration}|${selectedSurprise}`;
  useEffect(() => {
    catalogPageRef.current = 1;
    hasExhaustedCatalogRef.current = false;
  }, [activeCriteriaKey]);

  // Restore rolled slugs from sessionStorage on mount
  useEffect(() => {
    const stored = getStoredRolledSlugs();
    if (stored.length > 0) {
      setRolledSlugs(stored);
    }
  }, []);

  // Reset poster loading/error states on result change
  useEffect(() => {
    setPosterLoaded(false);
    setPosterError(false);
  }, [rouletteResult?.movie?.slug]);

  const recordRolledSlug = (slug: string) => {
    setRolledSlugs((prev) => {
      const next = prev.includes(slug) ? prev : [...prev, slug].slice(-MAX_ROLLED_SLUGS);
      saveStoredRolledSlugs(next);
      return next;
    });
  };

  const handleClose = useCallback(() => {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    requestSeqRef.current++;
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const handleOpenStudio = (e?: CustomEvent<{ tab?: string }>) => {
      if (!e?.detail?.tab || e.detail.tab === "roulette") {
        setIsOpen(true);
      }
    };

    const handleOpenRoulette = () => {
      setIsOpen(true);
    };

    window.addEventListener("open-nana-ai-studio" as unknown as keyof WindowEventMap, handleOpenStudio as EventListener);
    window.addEventListener("open-ai-roulette" as unknown as keyof WindowEventMap, handleOpenRoulette as EventListener);

    // Phím tắt Ctrl+K / Cmd+K mở nhanh Bốc Quẻ
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (!next) {
            onClose?.();
          }
          return next;
        });
      } else if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("open-nana-ai-studio" as unknown as keyof WindowEventMap, handleOpenStudio as EventListener);
      window.removeEventListener("open-ai-roulette" as unknown as keyof WindowEventMap, handleOpenRoulette as EventListener);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, handleClose]);

  useEffect(() => {
    setIsOpen(initialOpen);
  }, [initialOpen]);

  // CHỦ ĐỘNG NẠP BATCH TIẾP THEO Ở NỀN KHI POOL GẦN HẾT (BACKGROUND PREFETCH)
  const triggerBackgroundPrefetch = useCallback(
    async (
      criteriaKey: string,
      params: {
        mood: string;
        country: string;
        companion: string;
        duration: string;
        surprise: string;
      },
      currentRolled: string[]
    ) => {
      if (isPrefetchingRef.current || hasExhaustedCatalogRef.current) return;
      isPrefetchingRef.current = true;

      try {
        const nextPage = catalogPageRef.current + 1;
        const res = await fetch("/api/ai-roulette", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...params,
            page: nextPage,
            excludeSlugs: currentRolled,
          }),
        });

        // Hủy bỏ kết quả nạp nền nếu người dùng đã chuyển sang bộ tiêu chí khác
        if (lastCriteriaKey !== "" && lastCriteriaKey !== criteriaKey) return;

        if (res.status === 404) {
          hasExhaustedCatalogRef.current = true;
          return;
        }

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (!data || (lastCriteriaKey !== "" && lastCriteriaKey !== criteriaKey)) return;

          if (typeof data.nextPage === "number") {
            catalogPageRef.current = data.nextPage;
          } else {
            catalogPageRef.current = nextPage;
          }

          const incoming: RouletteResult[] = [
            data,
            ...(Array.isArray(data.poolCandidates) ? data.poolCandidates : []),
          ];

          setCandidatePool((prev) => {
            const seen = new Set([
              ...currentRolled,
              ...prev.map((c) => c.movie?.slug).filter(Boolean),
            ]);
            const fresh = incoming.filter((c) => c.movie?.slug && !seen.has(c.movie.slug));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      } catch {
        // Lỗi nạp nền không làm ảnh hưởng UI
      } finally {
        isPrefetchingRef.current = false;
      }
    },
    [lastCriteriaKey]
  );

  // ROULETTE SPIN & RANDOM QUẺ
  const spinRoulette = async (overrideCriteria?: {
    mood?: string;
    country?: string;
    companion?: string;
    duration?: string;
    surprise?: string;
  }) => {
    if (isSpinning) return;
    setRouletteError(null);
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }

    const moodToUse = overrideCriteria?.mood ?? selectedMood;
    const countryToUse = overrideCriteria?.country ?? selectedCountry;
    const companionToUse = overrideCriteria?.companion ?? selectedCompanion;
    const durationToUse = overrideCriteria?.duration ?? selectedDuration;
    const surpriseToUse = overrideCriteria?.surprise ?? selectedSurprise;

    const currentKey = `${moodToUse}|${countryToUse}|${companionToUse}|${durationToUse}|${surpriseToUse}`;
    const currentSeq = ++requestSeqRef.current;
    // Sinh giá trị 2 viên xúc xắc [1..6] cho phiên bốc quẻ này
    const nextDiceValues: [number, number] = [
      Math.floor(Math.random() * 6) + 1,
      Math.floor(Math.random() * 6) + 1,
    ];
    setDiceValues(nextDiceValues);
    setSpinCount((prev) => prev + 1);
    const spinStartTime = Date.now();

    // Chuyển ngay sang màn hình gieo quẻ 3D để người dùng thấy animation lập tức
    setShowCriteriaPicker(false);
    setRandomFortuneCard(null);

    // P2: Instant client-side re-roll if candidatePool has an unrolled item matching current criteria
    if (lastCriteriaKey === currentKey && candidatePool.length > 0) {
      const unrolledCandidate = candidatePool.find(
        (c) => c.movie?.slug && !rolledSlugs.includes(c.movie.slug)
      );
      if (unrolledCandidate) {
        setIsSpinning(true);
        // Giữ animation 600–900 ms (750ms) tạo cảm giác hồi hộp lắc xúc xắc 3D tự nhiên
        spinTimerRef.current = setTimeout(() => {
          if (currentSeq !== requestSeqRef.current) return;
          setRouletteResult({
            ...unrolledCandidate,
            poolCandidates: candidatePool,
          });
          const nextRolled = rolledSlugs.includes(unrolledCandidate.movie.slug)
            ? rolledSlugs
            : [...rolledSlugs, unrolledCandidate.movie.slug].slice(-MAX_ROLLED_SLUGS);
          recordRolledSlug(unrolledCandidate.movie.slug);
          setIsSpinning(false);

          // Chủ động nạp trước ở nền khi số lượng unrolled candidates trong pool còn <= 3
          const remainingUnrolled = candidatePool.filter(
            (c) => c.movie?.slug && !nextRolled.includes(c.movie.slug)
          ).length;
          if (remainingUnrolled <= 3) {
            triggerBackgroundPrefetch(
              currentKey,
              {
                mood: moodToUse,
                country: countryToUse,
                companion: companionToUse,
                duration: durationToUse,
                surprise: surpriseToUse,
              },
              nextRolled
            );
          }
        }, MIN_SPIN_DURATION_MS);
        return;
      }
    }

    setIsSpinning(true);

    try {
      const pageToFetch = lastCriteriaKey === currentKey ? catalogPageRef.current : 1;
      const res = await fetch("/api/ai-roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood: moodToUse,
          country: countryToUse,
          companion: companionToUse,
          duration: durationToUse,
          surprise: surpriseToUse,
          page: pageToFetch,
          excludeSlugs: rolledSlugs,
        }),
      });

      if (currentSeq !== requestSeqRef.current) return;

      const data = await res.json().catch(() => null);

      if (currentSeq !== requestSeqRef.current) return;

      // Đảm bảo giữ animation tối thiểu khoảng 600–900ms (750ms) tạo cảm giác hồi hộp
      // Nếu API phản hồi lâu hơn 750ms, remainingWait = 0, dừng animation ngay khi có kết quả
      const elapsed = Date.now() - spinStartTime;
      const remainingWait = Math.max(0, MIN_SPIN_DURATION_MS - elapsed);
      if (remainingWait > 0) {
        await new Promise((resolve) => {
          spinTimerRef.current = setTimeout(resolve, remainingWait);
        });
      }

      if (currentSeq !== requestSeqRef.current) return;

      if (res.ok && data && (data.movie || data.success)) {
        const pool = Array.isArray(data.poolCandidates) && data.poolCandidates.length > 0
          ? data.poolCandidates
          : [data];
        setCandidatePool(pool);
        setLastCriteriaKey(currentKey);
        if (typeof data.nextPage === "number") {
          catalogPageRef.current = data.nextPage;
        }
        hasExhaustedCatalogRef.current = false;
        setRouletteResult(data);
        setRouletteError(null);
        setShowCriteriaPicker(false);
        setRandomFortuneCard(null);
        if (data.movie?.slug) {
          recordRolledSlug(data.movie.slug);
          const nextRolled = rolledSlugs.includes(data.movie.slug)
            ? rolledSlugs
            : [...rolledSlugs, data.movie.slug].slice(-MAX_ROLLED_SLUGS);
          // Nếu pool trả về ít phim (<= 3), chủ động prefetch batch tiếp theo ngay
          if (pool.length <= 3) {
            triggerBackgroundPrefetch(
              currentKey,
              {
                mood: moodToUse,
                country: countryToUse,
                companion: companionToUse,
                duration: durationToUse,
                surprise: surpriseToUse,
              },
              nextRolled
            );
          }
        }
      } else {
        if (res.status === 429) {
          setRouletteError("⚡ Bạn đang quay quẻ quá nhanh. Vui lòng chờ vài giây rồi thử lại nhé!");
        } else if (res.status === 503) {
          setRouletteError("📡 Máy chủ nguồn phim đang phản hồi chậm hoặc gián đoạn. Vui lòng bấm thử lại.");
        } else {
          const errorMsg =
            data?.error ||
            "🎴 Đã khám phá hết các phim phù hợp với tiêu chí hiện tại. Bạn hãy thử đổi tiêu chí nhé!";
          setRouletteError(errorMsg);
          hasExhaustedCatalogRef.current = true;
        }
        setShowCriteriaPicker(true);
      }
    } catch (err) {
      if (currentSeq !== requestSeqRef.current) return;
      console.warn("Lỗi quay bốc quẻ:", err);
      setRouletteError("Tạm thời không thể kết nối tới máy chủ, vui lòng thử lại sau giây lát.");
      setShowCriteriaPicker(true);
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setIsSpinning(false);
      }
    }
  };

  const handleRandomFortune = () => {
    setIsRollingFortune(true);
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
      onClick={handleClose}
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-none touch-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[92dvh] sm:max-h-[840px] bg-zinc-950 rounded-2xl sm:rounded-3xl border border-amber-500/35 shadow-2xl shadow-black/80 flex flex-col overflow-hidden transform-gpu will-change-[transform,opacity] animate-in zoom-in-95 duration-150 overscroll-contain"
      >
        {/* Glow ambient lights */}
        <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl opacity-50" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl opacity-50" />

        {/* PINNED HEADER FOR ROULETTE */}
        <div className="relative z-30 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-white/10 bg-zinc-900 shrink-0 gap-2">
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
              <p className="hidden sm:block text-[10.5px] text-zinc-400 truncate">Vòng quay ngẫu nhiên chọn phim theo tâm trạng</p>
            </div>
          </div>

          {/* RIGHT ACTION PILLS */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-30">
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Đóng cửa sổ"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-zinc-200 hover:text-white transition cursor-pointer shrink-0 active:scale-95 border border-white/15 shadow-sm"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        </div>

        {/* DEDICATED BỐC QUẺ BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 flex flex-col animate-in fade-in duration-200">
          {/* STATE 1: 3D DICE SPINNING ANIMATION (Shown when spinning before first result) */}
          {isSpinning && !rouletteResult ? (
            <div className="flex-1 min-h-[360px] sm:min-h-[400px] flex items-center justify-center animate-in zoom-in-95 duration-200">
              <MovieRouletteDice3D key={spinCount} targetValues={diceValues} />
            </div>
          ) : rouletteResult && !showCriteriaPicker ? (
            /* STATE 2: SPOTLIGHT RESULT SHOWCASE */
            <div className="relative w-full my-auto py-1 space-y-3 animate-in zoom-in-95 duration-200 transition-all duration-300">
              {/* RE-ROLL 3D DICE OVERLAY: Preserves card dimensions, prevents layout collapse */}
              {isSpinning && (
                <div className="absolute inset-0 z-40 bg-zinc-950/85 backdrop-blur-md rounded-3xl flex items-center justify-center p-4 border border-amber-500/40 shadow-2xl animate-in fade-in duration-150">
                  <MovieRouletteDice3D key={spinCount} compact targetValues={diceValues} />
                </div>
              )}

              {/* COMPACT ACTIVE CRITERIA BAR */}
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-zinc-900/95 border border-amber-500/30 shadow-md flex-none">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto text-xs min-w-0 scrollbar-none">
                  <span className="text-amber-400 font-bold flex-none flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Quẻ:</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[11px] font-semibold whitespace-nowrap flex items-center gap-1">
                    <span>🎲</span>
                    <span>{diceValues[0]} + {diceValues[1]}</span>
                    <span className="text-[10px] text-amber-300/80 font-normal">({diceValues[0] + diceValues[1]}đ)</span>
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
              <div className="w-full p-3.5 sm:p-5 md:p-6 rounded-3xl bg-zinc-900/95 border-2 border-amber-500/40 shadow-2xl shadow-black/80 flex flex-col md:flex-row gap-3.5 sm:gap-5 items-stretch">
                {/* LEFT COLUMN (POSTER + DESKTOP MATCH BADGE) */}
                <div className="flex md:flex-col items-center md:items-stretch gap-3 sm:gap-3.5 md:w-48 lg:w-56 shrink-0">
                  {/* Poster */}
                  <div className="relative w-24 sm:w-28 md:w-full aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-950 border-2 border-amber-400/40 shadow-2xl ring-2 ring-amber-400/20 shrink-0 group">
                    {/* Skeleton shimmer while loading */}
                    {!posterLoaded && !posterError && (
                      <div className="absolute inset-0 z-10 bg-zinc-900 flex flex-col items-center justify-center p-2 text-center text-amber-500/40">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent animate-pulse" />
                        <Film className="w-8 h-8 animate-pulse mb-1 text-amber-400/30" />
                        <span className="text-[10px] font-medium text-amber-200/50">Đang tải poster...</span>
                      </div>
                    )}

                    {/* Error fallback card */}
                    {posterError || !rouletteResult.movie.poster ? (
                      <div className="absolute inset-0 z-10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 flex flex-col items-center justify-center p-3 text-center border border-amber-500/20">
                        <Film className="w-8 h-8 text-amber-400/60 mb-2" />
                        <span className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                          {rouletteResult.movie.title}
                        </span>
                        <span className="text-[9px] text-amber-300/70 mt-1">Nanaflix Cinema</span>
                      </div>
                    ) : (
                      <Image
                        src={rouletteResult.movie.poster}
                        alt={rouletteResult.movie.title}
                        fill
                        className={`object-cover transition-all duration-500 group-hover:scale-105 ${
                          posterLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        sizes="(max-width: 640px) 112px, (max-width: 768px) 128px, 224px"
                        priority
                        onLoad={() => setPosterLoaded(true)}
                        onError={() => setPosterError(true)}
                      />
                    )}

                    <div className="absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 rounded-md bg-netflix-red text-white text-[9px] font-black uppercase shadow-md">
                      {rouletteResult.movie.quality || "FHD"}
                    </div>
                    {rouletteResult.movie.episodeCurrent && (
                      <div className="absolute bottom-1.5 right-1.5 z-20 max-w-[85%] px-1.5 py-0.5 rounded-md bg-black/85 backdrop-blur-sm text-amber-300 text-[9px] font-bold border border-white/15 shadow-md truncate">
                        {rouletteResult.movie.episodeCurrent}
                      </div>
                    )}
                  </div>

                  {/* MOBILE TOP INFO (Beside Poster on < md) */}
                  <div className="md:hidden flex-1 min-w-0 space-y-1.5 text-left">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-black uppercase text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 inline-flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        <span>{rouletteResult.matchScore}% Hợp Định Mệnh</span>
                      </span>
                      {rouletteResult.movie.rating && rouletteResult.movie.rating > 0 && (
                        <span className="text-[10px] text-yellow-300 px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 font-bold flex items-center gap-0.5">
                          ⭐ {rouletteResult.movie.rating}/10
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-black text-white leading-tight line-clamp-2">
                      {rouletteResult.movie.title}
                    </h4>
                    {rouletteResult.movie.originalTitle && rouletteResult.movie.originalTitle !== rouletteResult.movie.title && (
                      <p className="text-[11px] text-zinc-400 font-medium italic truncate">
                        {rouletteResult.movie.originalTitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1 text-[10px]">
                      {rouletteResult.movie.category && (
                        <span className="text-amber-200 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 font-semibold">
                          {rouletteResult.movie.category}
                        </span>
                      )}
                      {rouletteResult.movie.duration && (
                        <span className="text-purple-300 px-1.5 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 font-medium">
                          ⏱️ {rouletteResult.movie.duration}
                        </span>
                      )}
                      {rouletteResult.movie.year && (
                        <span className="text-zinc-300 px-1.5 py-0.5 rounded-md bg-white/10 font-medium">
                          {rouletteResult.movie.year}
                        </span>
                      )}
                      {rouletteResult.movie.country && (
                        <span className="text-sky-300 px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/25 font-medium">
                          🌐 {rouletteResult.movie.country}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* DESKTOP MATCH BADGES UNDER POSTER (Visible on md+) */}
                  <div className="hidden md:flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>Hợp Định Mệnh</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">
                          Quẻ {diceValues[0] + diceValues[1]} điểm
                        </span>
                        <span className="font-black text-amber-200 text-sm">{rouletteResult.matchScore}%</span>
                      </div>
                    </div>
                    {rouletteResult.movie.rating && rouletteResult.movie.rating > 0 && (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-semibold">
                        <span>Đánh giá IMDb</span>
                        <span className="font-bold">⭐ {rouletteResult.movie.rating}/10</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT MAIN DOSSIER COLUMN */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3 text-left">
                  {/* DESKTOP TITLE & METADATA (Hidden on mobile) */}
                  <div className="hidden md:block space-y-1.5">
                    <h4 className="text-xl lg:text-2xl font-black text-white leading-tight">
                      {rouletteResult.movie.title}
                    </h4>
                    {rouletteResult.movie.originalTitle && rouletteResult.movie.originalTitle !== rouletteResult.movie.title && (
                      <p className="text-xs text-zinc-400 font-medium italic">
                        {rouletteResult.movie.originalTitle}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                      {rouletteResult.movie.category && (
                        <span className="text-amber-200 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 font-semibold">
                          {rouletteResult.movie.category}
                        </span>
                      )}
                      {rouletteResult.movie.duration && (
                        <span className="text-purple-300 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 font-medium">
                          ⏱️ {rouletteResult.movie.duration}
                        </span>
                      )}
                      {rouletteResult.movie.year && (
                        <span className="text-zinc-300 px-2 py-0.5 rounded-md bg-white/10 font-medium">
                          {rouletteResult.movie.year}
                        </span>
                      )}
                      {rouletteResult.movie.country && (
                        <span className="text-sky-300 px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/25 font-medium">
                          🌐 {rouletteResult.movie.country}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CAST & DIRECTOR */}
                  {((rouletteResult.movie.actors && rouletteResult.movie.actors.length > 0) ||
                    (rouletteResult.movie.director && rouletteResult.movie.director.length > 0)) && (
                    <div className="text-[11px] sm:text-xs text-zinc-300 space-y-1 p-2 sm:p-2.5 rounded-xl bg-zinc-950/60 border border-white/5">
                      {rouletteResult.movie.actors && rouletteResult.movie.actors.length > 0 && (
                        <div className="truncate">
                          <span className="text-amber-300 font-semibold">🎭 Diễn viên: </span>
                          <span className="text-zinc-300">{rouletteResult.movie.actors.join(", ")}</span>
                        </div>
                      )}
                      {rouletteResult.movie.director && rouletteResult.movie.director.length > 0 && (
                        <div className="truncate">
                          <span className="text-amber-300 font-semibold">🎬 Đạo diễn: </span>
                          <span className="text-zinc-300">{rouletteResult.movie.director.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* UNIFIED TAROT VERDICT & SYNOPSIS BOX */}
                  <div className="space-y-2 p-3 sm:p-3.5 rounded-2xl bg-zinc-950/80 border border-amber-500/30 text-left shadow-inner">
                    <p className="text-xs sm:text-[13px] text-amber-200 font-medium italic leading-relaxed px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      ✨ {rouletteResult.punchline}
                    </p>

                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tóm tắt nội dung</span>
                      </div>
                      <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed line-clamp-3 md:line-clamp-4">
                        {rouletteResult.movie.overview ||
                         rouletteResult.movie.description ||
                         rouletteResult.movie.content ||
                         `Tác phẩm ${rouletteResult.movie.category || "điện ảnh"} đặc sắc với cốt truyện lôi cuốn, kịch tính và tràn đầy cảm xúc. Hãy bắt đầu thưởng thức ngay suất chiếu định mệnh này trên Nanaflix.`}
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                    <Link
                      href={`/movies/${rouletteResult.movie.slug}`}
                      onClick={handleClose}
                      className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-black text-xs sm:text-sm transition shadow-md shadow-black/50 cursor-pointer active:scale-95 text-center truncate"
                    >
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" />
                      <span className="truncate">Xem Suất Chiếu</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => spinRoulette()}
                      disabled={isSpinning}
                      className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs sm:text-sm transition shadow-md shadow-black/50 cursor-pointer active:scale-95 disabled:opacity-50 text-center truncate"
                    >
                      <Dices className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSpinning ? "animate-spin" : ""} shrink-0`} />
                      <span className="truncate">Bốc Quẻ Khác</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 3: FULL CRITERIA PICKER */
            <div className="space-y-4 animate-in fade-in duration-200">
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
                      className="text-zinc-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-white/10 transition cursor-pointer"
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
                      <span className="text-2xl drop-shadow-md">🎴</span>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-amber-300 tracking-wider">
                          Quẻ hôm nay của bạn
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
                      className="flex-1 min-w-[200px] py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-black/50 active:scale-[0.99] transition cursor-pointer disabled:opacity-50 ring-2 ring-amber-400/40"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isSpinning ? "Đang Khai Quẻ..." : "🔮 Bốc phim theo quẻ này"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRandomFortuneCard(null)}
                      className="px-4 py-3 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs border border-white/10 transition cursor-pointer flex items-center gap-1.5"
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
                      <div className="text-[11px] text-zinc-400 truncate">
                        Để số mệnh tự kết duyên tổ hợp 5 tiêu chí hoàn hảo
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRandomFortune}
                    disabled={isRollingFortune || isSpinning}
                    className="ml-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-black/50 transition cursor-pointer active:scale-95 flex-none disabled:opacity-50"
                  >
                    <Dices className={`w-3.5 h-3.5 ${isRollingFortune ? "animate-spin" : ""}`} />
                    <span>Bốc quẻ ngẫu nhiên</span>
                  </button>
                </div>
              )}

              {rouletteResult && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-zinc-300">Hoặc tùy chỉnh tiêu chí theo ý muốn:</span>
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
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
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
                            ? "bg-gradient-to-br from-amber-500/25 to-orange-500/25 border-amber-400 text-white ring-2 ring-amber-400/40 shadow-md shadow-black/50 font-bold scale-[1.02]"
                            : "bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800/80 hover:border-amber-500/30"
                        }`}
                      >
                        <span className="text-xl p-1 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                          {m.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate group-hover:text-amber-300 transition-colors">
                            {m.label}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{m.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. COUNTRY */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
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
                            ? "bg-sky-500/25 border-sky-400 text-white ring-2 ring-sky-400/40 shadow-md shadow-black/50 scale-105"
                            : "bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
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
                <label className="text-xs font-bold text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
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
                            ? "bg-emerald-500/25 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-md shadow-black/50 font-bold scale-[1.02]"
                            : "bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        <span className="text-xl p-1 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                          {cp.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate group-hover:text-emerald-300 transition-colors">
                            {cp.label}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{cp.desc}</div>
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
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-200 uppercase tracking-wider">
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
                                  ? "bg-purple-500/25 border-purple-400 text-white ring-2 ring-purple-400/40 shadow-md shadow-black/50 font-bold scale-[1.02]"
                                  : "bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                              }`}
                            >
                              <span className="text-lg p-1 rounded-xl bg-black/40 border border-white/10">
                                {d.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate">{d.label}</div>
                                <div className="text-[10px] text-zinc-400 truncate">{d.desc}</div>
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
                                  ? "bg-rose-500/25 border-rose-400 text-white ring-2 ring-rose-400/40 shadow-md shadow-black/50 font-bold scale-[1.02]"
                                  : "bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                              }`}
                            >
                              <span className="text-lg p-1 rounded-xl bg-black/40 border border-white/10">
                                {s.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold truncate">{s.label}</div>
                                <div className="text-[10px] text-zinc-400 truncate">{s.desc}</div>
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
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-black/70 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 ring-2 ring-amber-400/30"
                >
                  <Dices className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
                  <span>{isSpinning ? "Đang Bốc Quẻ Số Phận..." : "Bốc Quẻ Suất Chiếu Định Mệnh 🎲"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieRouletteModal;
