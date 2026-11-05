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
  Film,
} from "lucide-react";
import { useBodyScrollLock } from "@/lib/scrollLock";
import { MovieRouletteDice3D } from "./MovieRouletteDice3D";
import { toOptimizedCardPosterUrl } from "@/lib/movieMedia";

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
      className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-none touch-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl lg:max-w-3xl max-h-[92dvh] sm:max-h-[840px] bg-zinc-950 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black flex flex-col overflow-hidden transform-gpu will-change-[transform,opacity] animate-in zoom-in-95 duration-150 overscroll-contain text-white"
      >
        {/* CINEMATIC BACKDROP GLOW (Subtle blurred backdrop from the movie) */}
        {rouletteResult?.movie?.poster && !showCriteriaPicker && (
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-20">
            <Image
              src={toOptimizedCardPosterUrl(rouletteResult.movie.poster, 320) || "/default-poster.jpg"}
              alt=""
              fill
              unoptimized
              className="object-cover blur-3xl scale-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/60" />
          </div>
        )}

        {/* HEADER */}
        <div className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-netflix-red/15 border border-netflix-red/30 flex items-center justify-center text-netflix-red shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4 text-netflix-red" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                  Gợi Ý Phim Ngẫu Nhiên
                </h2>
                <span className="hidden sm:inline-flex text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 uppercase tracking-wider shrink-0">
                  Surprise Me
                </span>
              </div>
              <p className="text-[10.5px] sm:text-[11px] text-zinc-400 truncate">
                Khám phá bộ phim phù hợp nhất với tâm trạng hôm nay
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng cửa sổ"
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition active:scale-95 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-zinc-300" />
          </button>
        </div>

        {/* BODY */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-5 flex flex-col animate-in fade-in duration-200">
          {/* STATE 1: 3D DICE SPINNING ANIMATION */}
          {isSpinning && !rouletteResult ? (
            <div className="flex-1 min-h-[360px] sm:min-h-[400px] flex items-center justify-center animate-in zoom-in-95 duration-200">
              <MovieRouletteDice3D key={spinCount} targetValues={diceValues} />
            </div>
          ) : rouletteResult && !showCriteriaPicker ? (
            /* STATE 2: SPOTLIGHT RESULT SHOWCASE */
            <div className="relative w-full my-auto py-1 space-y-3 animate-in zoom-in-95 duration-200 transition-all duration-300">
              {/* RE-ROLL 3D DICE OVERLAY */}
              {isSpinning && (
                <div className="absolute inset-0 z-40 bg-zinc-950/85 backdrop-blur-md rounded-2xl flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-150">
                  <MovieRouletteDice3D key={spinCount} compact targetValues={diceValues} />
                </div>
              )}

              {/* COMPACT ACTIVE CRITERIA BAR */}
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto min-w-0 scrollbar-none">
                  <span className="text-zinc-400 text-[11px] font-medium shrink-0">Bộ lọc:</span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 text-[11px] font-medium whitespace-nowrap">
                    {ROULETTE_MOODS.find((m) => m.id === selectedMood)?.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 text-[11px] font-medium whitespace-nowrap">
                    {ROULETTE_COUNTRIES.find((c) => c.id === selectedCountry)?.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-zinc-200 text-[11px] font-medium whitespace-nowrap">
                    {ROULETTE_COMPANIONS.find((cp) => cp.id === selectedCompanion)?.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCriteriaPicker(true)}
                  className="ml-3 text-xs font-semibold text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer flex-none active:scale-95"
                >
                  Đổi gu
                </button>
              </div>

              {/* SPOTLIGHT MOVIE CARD */}
              <div className="w-full p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-white/10 shadow-2xl flex flex-col md:flex-row gap-4 sm:gap-5 items-stretch">
                {/* LEFT: POSTER */}
                <div className="flex md:flex-col items-center md:items-start gap-3.5 md:w-48 lg:w-52 shrink-0">
                  <div className="relative w-28 sm:w-32 md:w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shadow-2xl shrink-0 group">
                    {!posterLoaded && !posterError && (
                      <div className="absolute inset-0 z-10 bg-zinc-900 flex flex-col items-center justify-center p-2 text-center text-zinc-500">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
                        <Film className="w-7 h-7 animate-pulse mb-1 text-zinc-400" />
                        <span className="text-[10px] text-zinc-400">Đang tải...</span>
                      </div>
                    )}

                    {posterError || !rouletteResult.movie.poster ? (
                      <div className="absolute inset-0 z-10 bg-zinc-900 flex flex-col items-center justify-center p-3 text-center">
                        <Film className="w-8 h-8 text-zinc-500 mb-2" />
                        <span className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                          {rouletteResult.movie.title}
                        </span>
                        <span className="text-[9px] text-zinc-400 mt-1">Nanaflix</span>
                      </div>
                    ) : (
                      <Image
                        src={toOptimizedCardPosterUrl(rouletteResult.movie.poster, 360) || "/default-poster.jpg"}
                        alt={rouletteResult.movie.title}
                        fill
                        unoptimized
                        className={`object-cover transition-all duration-300 group-hover:scale-105 ${
                          posterLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        sizes="(max-width: 640px) 120px, (max-width: 768px) 140px, 224px"
                        priority
                        onLoad={() => setPosterLoaded(true)}
                        onError={() => setPosterError(true)}
                      />
                    )}

                    <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded bg-netflix-red text-white text-[9px] font-black uppercase tracking-wider shadow">
                      {rouletteResult.movie.quality || "FHD"}
                    </div>
                    {rouletteResult.movie.episodeCurrent && (
                      <div className="absolute bottom-2 right-2 z-20 max-w-[85%] px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-zinc-200 text-[9px] font-semibold truncate shadow">
                        {rouletteResult.movie.episodeCurrent}
                      </div>
                    )}
                  </div>

                  {/* Rating below poster on Desktop */}
                  {rouletteResult.movie.rating && rouletteResult.movie.rating > 0 ? (
                    <div className="hidden md:flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-amber-400 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{rouletteResult.movie.rating}/10</span>
                      <span className="text-[10px] text-zinc-400 font-normal">Đánh giá</span>
                    </div>
                  ) : null}

                  {/* MOBILE TITLE & METADATA (Beside poster on < md) */}
                  <div className="md:hidden flex-1 min-w-0 space-y-1 text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-netflix-red">
                      Phim Đề Xuất
                    </span>
                    <h4 className="text-base font-black text-white leading-tight line-clamp-2">
                      {rouletteResult.movie.title}
                    </h4>
                    {rouletteResult.movie.originalTitle && rouletteResult.movie.originalTitle !== rouletteResult.movie.title && (
                      <p className="text-[11px] text-zinc-400 italic truncate">
                        {rouletteResult.movie.originalTitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-300 pt-1">
                      {rouletteResult.movie.year && <span>{rouletteResult.movie.year}</span>}
                      {rouletteResult.movie.duration && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span>{rouletteResult.movie.duration}</span>
                        </>
                      )}
                      {rouletteResult.movie.category && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-zinc-200 font-semibold">{rouletteResult.movie.category}</span>
                        </>
                      )}
                      {rouletteResult.movie.rating && rouletteResult.movie.rating > 0 && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="text-amber-400 font-bold">★ {rouletteResult.movie.rating}/10</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: DETAILS */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3 text-left">
                  <div className="space-y-2">
                    {/* DESKTOP TITLE & METADATA */}
                    <div className="hidden md:block space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-netflix-red">
                          Phim Đề Xuất
                        </span>
                      </div>
                      <h4 className="text-xl lg:text-2xl font-black text-white leading-tight">
                        {rouletteResult.movie.title}
                      </h4>
                      {rouletteResult.movie.originalTitle && rouletteResult.movie.originalTitle !== rouletteResult.movie.title && (
                        <p className="text-xs text-zinc-400 italic">
                          {rouletteResult.movie.originalTitle}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2.5 text-xs text-zinc-300 pt-1 font-medium">
                        {rouletteResult.movie.year && <span>{rouletteResult.movie.year}</span>}
                        {rouletteResult.movie.duration && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span>{rouletteResult.movie.duration}</span>
                          </>
                        )}
                        {rouletteResult.movie.country && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span>{rouletteResult.movie.country}</span>
                          </>
                        )}
                        {rouletteResult.movie.category && (
                          <>
                            <span className="text-zinc-600">•</span>
                            <span className="text-zinc-200 font-semibold">{rouletteResult.movie.category}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* CAST & DIRECTOR */}
                    {((rouletteResult.movie.actors && rouletteResult.movie.actors.length > 0) ||
                      (rouletteResult.movie.director && rouletteResult.movie.director.length > 0)) && (
                      <div className="text-xs text-zinc-400 space-y-1 pt-1">
                        {rouletteResult.movie.actors && rouletteResult.movie.actors.length > 0 && (
                          <p className="truncate">
                            <span className="text-zinc-500 font-medium">Diễn viên: </span>
                            <span className="text-zinc-300">{rouletteResult.movie.actors.slice(0, 5).join(", ")}</span>
                          </p>
                        )}
                        {rouletteResult.movie.director && rouletteResult.movie.director.length > 0 && (
                          <p className="truncate">
                            <span className="text-zinc-500 font-medium">Đạo diễn: </span>
                            <span className="text-zinc-300">{rouletteResult.movie.director.join(", ")}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* SYNOPSIS */}
                    <div className="pt-1.5">
                      <p className="text-xs sm:text-[13px] text-zinc-300 leading-relaxed line-clamp-3 sm:line-clamp-4 font-normal">
                        {rouletteResult.movie.overview ||
                         rouletteResult.movie.description ||
                         rouletteResult.movie.content ||
                         "Tác phẩm điện ảnh hấp dẫn với cốt truyện lôi cuốn, hình ảnh sắc nét và trọn vẹn cảm xúc."}
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-2">
                    <Link
                      href={`/movies/${rouletteResult.movie.slug}`}
                      onClick={handleClose}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-netflix-red hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm transition shadow-lg shadow-netflix-red/25 cursor-pointer text-center truncate"
                    >
                      <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" />
                      <span className="truncate">Xem Phim Ngay</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => spinRoulette()}
                      disabled={isSpinning}
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/10 text-white font-semibold text-xs sm:text-sm transition cursor-pointer disabled:opacity-50 text-center truncate"
                    >
                      <Dices className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSpinning ? "animate-spin" : ""} shrink-0`} />
                      <span className="truncate">Đổi Phim Khác</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 3: FULL CRITERIA PICKER */
            <div className="space-y-4 animate-in fade-in duration-200">
              {rouletteError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/20 text-rose-200 text-xs flex items-center justify-between gap-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{rouletteError}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      type="button"
                      onClick={() => spinRoulette()}
                      disabled={isSpinning}
                      className="text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 transition cursor-pointer"
                    >
                      Thử lại
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

              {/* QUICK RANDOM BANNER */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white truncate">
                    Bạn chưa biết xem gì hôm nay?
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    Để Nanaflix tự chọn nhanh một bộ phim ngẫu nhiên dành cho bạn
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRandomFortune}
                  disabled={isRollingFortune || isSpinning}
                  className="ml-3 px-4 py-2 rounded-xl bg-netflix-red hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer active:scale-95 flex-none disabled:opacity-50"
                >
                  <Dices className={`w-3.5 h-3.5 ${isRollingFortune ? "animate-spin" : ""}`} />
                  <span>Gợi ý ngẫu nhiên</span>
                </button>
              </div>

              {randomFortuneCard && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white">
                        Tổ hợp tiêu chí ngẫu nhiên
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Đã chọn nhanh 5 tiêu chí phù hợp
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRandomFortune}
                      disabled={isRollingFortune || isSpinning}
                      className="text-xs font-semibold text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Dices className={`w-3 h-3 ${isRollingFortune ? "animate-spin" : ""}`} />
                      <span>Đổi tổ hợp</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 text-xs font-medium">
                      {ROULETTE_MOODS.find((m) => m.id === randomFortuneCard.mood)?.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 text-xs font-medium">
                      {ROULETTE_COUNTRIES.find((c) => c.id === randomFortuneCard.country)?.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 text-xs font-medium">
                      {ROULETTE_COMPANIONS.find((cp) => cp.id === randomFortuneCard.companion)?.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 text-xs font-medium">
                      {ROULETTE_DURATIONS.find((d) => d.id === randomFortuneCard.duration)?.label}
                    </span>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => spinRoulette()}
                      disabled={isSpinning}
                      className="flex-1 py-2.5 rounded-xl bg-netflix-red hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSpinning ? "Đang tìm phim..." : "Tìm phim theo gu này"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRandomFortuneCard(null)}
                      className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white font-semibold text-xs transition cursor-pointer"
                    >
                      Tự chọn
                    </button>
                  </div>
                </div>
              )}

              {rouletteResult && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-zinc-300">Hoặc tùy chỉnh tiêu chí:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setRouletteError(null);
                      setShowCriteriaPicker(false);
                    }}
                    className="text-xs text-netflix-red hover:text-rose-400 font-semibold underline cursor-pointer"
                  >
                    Quay lại kết quả trước
                  </button>
                </div>
              )}

              {/* 1. MOOD */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-netflix-red" />
                  <span>1. Bạn muốn cảm giác gì?</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROULETTE_MOODS.map((m) => {
                    const isSelected = selectedMood === m.id;
                    const IconComponent = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-2.5 cursor-pointer group shadow-sm ${
                          isSelected
                            ? "bg-netflix-red/20 border-netflix-red text-white font-bold scale-[1.02]"
                            : "bg-zinc-900/90 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                          <IconComponent className={`w-4 h-4 ${isSelected ? "text-netflix-red" : "text-zinc-400 group-hover:text-white"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">
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
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Globe2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>2. Quốc gia & Khu vực</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROULETTE_COUNTRIES.map((c) => {
                    const isSelected = selectedCountry === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCountry(c.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                          isSelected
                            ? "bg-white/20 border-white text-white font-bold"
                            : "bg-zinc-900/90 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
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
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>3. Bạn xem cùng ai?</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROULETTE_COMPANIONS.map((cp) => {
                    const isSelected = selectedCompanion === cp.id;
                    return (
                      <button
                        key={cp.id}
                        type="button"
                        onClick={() => setSelectedCompanion(cp.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-2.5 cursor-pointer group shadow-sm ${
                          isSelected
                            ? "bg-white/20 border-white text-white font-bold scale-[1.02]"
                            : "bg-zinc-900/90 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                        }`}
                      >
                        <span className="text-base p-1 rounded-lg bg-black/40">
                          {cp.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate">
                            {cp.label}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{cp.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. ADVANCED OPTIONS */}
              <div className="rounded-2xl bg-zinc-900/60 border border-white/10 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Tùy chọn thời lượng</span>
                    {selectedDuration !== "all" && (
                      <span className="w-2 h-2 rounded-full bg-netflix-red" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold">
                    <span>{showAdvancedOptions ? "Thu gọn" : "Mở rộng"}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        showAdvancedOptions ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {showAdvancedOptions && (
                  <div className="p-3.5 sm:p-4 pt-2 border-t border-white/10 space-y-3 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ROULETTE_DURATIONS.map((d) => {
                        const isSelected = selectedDuration === d.id;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedDuration(d.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-sm ${
                              isSelected
                                ? "bg-white/20 border-white text-white font-bold scale-[1.02]"
                                : "bg-zinc-900/80 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                            }`}
                          >
                            <span className="text-base p-1 rounded-lg bg-black/40">
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
                )}
              </div>

              {/* MEGA SPIN BUTTON */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => spinRoulette()}
                  disabled={isSpinning}
                  className="w-full py-3.5 sm:py-4 rounded-xl bg-netflix-red hover:bg-rose-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-netflix-red/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Dices className={`w-5 h-5 ${isSpinning ? "animate-spin" : ""}`} />
                  <span>{isSpinning ? "Đang tìm phim phù hợp..." : "Tìm Phim Ngẫu Nhiên"}</span>
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
