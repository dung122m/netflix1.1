"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Globe2,
  Calendar,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  Dices,
  Film,
} from "lucide-react";

// =========================================================
// 1. LOẠI PHIM (LOẠT PHIM)
// =========================================================
const POPULAR_TYPES = [
  { name: "🎬 Tất cả loại phim", slug: "" },
  { name: "🍿 Phim Lẻ", slug: "phim-le" },
  { name: "📺 Phim Bộ", slug: "phim-bo" },
  { name: "🎟️ Chiếu Rạp", slug: "phim-chieu-rap" },
  { name: "🎨 Hoạt Hình / Anime", slug: "hoat-hinh" },
  { name: "🎪 TV Shows", slug: "tv-shows" },
  { name: "⏳ Sắp Chiếu", slug: "phim-sap-chieu" },
  { name: "🎙️ Thuyết Minh", slug: "phim-thuyet-minh" },
  { name: "🗣️ Lồng Tiếng", slug: "phim-long-tieng" },
];

// =========================================================
// 2. THỂ LOẠI (GENRES)
// =========================================================
const POPULAR_GENRES = [
  { name: "✨ Tất cả thể loại", slug: "" },
  { name: "💥 Hành Động", slug: "hanh-dong" },
  { name: "💖 Tình Cảm", slug: "tinh-cam" },
  { name: "👻 Kinh Dị", slug: "kinh-di" },
  { name: "🤣 Hài Hước", slug: "hai-huoc" },
  { name: "🛸 Viễn Tưởng", slug: "vien-tuong" },
  { name: "🏯 Cổ Trang", slug: "co-trang" },
  { name: "🧠 Tâm Lý", slug: "tam-ly" },
  { name: "🥋 Võ Thuật", slug: "vo-thuat" },
  { name: "🕵️ Trinh Thám", slug: "trinh-tham" },
  { name: "⚔️ Chiến Tranh", slug: "chien-tranh" },
  { name: "🌟 Phiêu Lưu", slug: "phieu-luu" },
  { name: "🎵 Âm Nhạc", slug: "am-nhac" },
  { name: "🏆 Thể Thao", slug: "the-thao" },
  { name: "📚 Tài Liệu", slug: "tai-lieu" },
];

// =========================================================
// 3. QUỐC GIA (COUNTRIES)
// =========================================================
const POPULAR_COUNTRIES = [
  { name: "🌐 Tất cả quốc gia", slug: "" },
  { name: "🇰🇷 Hàn Quốc", slug: "han-quoc" },
  { name: "🇨🇳 Trung Quốc", slug: "trung-quoc" },
  { name: "🇺🇸 Âu Mỹ", slug: "au-my" },
  { name: "🇯🇵 Nhật Bản", slug: "nhat-ban" },
  { name: "🇹🇭 Thái Lan", slug: "thai-lan" },
  { name: "🇻🇳 Việt Nam", slug: "viet-nam" },
  { name: "🇭🇰 Hồng Kông", slug: "hong-kong" },
  { name: "🇹🇼 Đài Loan", slug: "dai-loan" },
  { name: "🇮🇳 Ấn Độ", slug: "an-do" },
  { name: "🇬🇧 Anh", slug: "anh" },
  { name: "🇫🇷 Pháp", slug: "phap" },
];

// =========================================================
// 4. DIỄN VIÊN (ACTORS)
// =========================================================
const POPULAR_ACTORS = [
  { name: "🎬 Trấn Thành", keyword: "Trấn Thành" },
  { name: "🥋 Thành Long", keyword: "Thành Long" },
  { name: "⚡ Châu Tinh Trì", keyword: "Châu Tinh Trì" },
  { name: "💥 Chân Tử Đan", keyword: "Chân Tử Đan" },
  { name: "🥊 Lý Liên Kiệt", keyword: "Lý Liên Kiệt" },
  { name: "✨ Lưu Diệc Phi", keyword: "Lưu Diệc Phi" },
  { name: "👑 Dương Mịch", keyword: "Dương Mịch" },
  { name: "🌟 Triệu Lệ Dĩnh", keyword: "Triệu Lệ Dĩnh" },
  { name: "⭐ Tiêu Chiến", keyword: "Tiêu Chiến" },
  { name: "🇰🇷 Song Joong Ki", keyword: "Song Joong Ki" },
  { name: "💫 Lee Min Ho", keyword: "Lee Min Ho" },
  { name: "💖 Hyun Bin", keyword: "Hyun Bin" },
  { name: "👊 Ma Dong Seok", keyword: "Ma Dong Seok" },
  { name: "🕶️ Tom Cruise", keyword: "Tom Cruise" },
  { name: "🎭 Leonardo DiCaprio", keyword: "Leonardo DiCaprio" },
  { name: "🔫 Keanu Reeves", keyword: "Keanu Reeves" },
];

// =========================================================
// 5. NĂM PHÁT HÀNH (YEARS)
// =========================================================
const RECENT_YEARS = [
  { name: "📅 Tất cả năm", year: "" },
  { name: "🚀 2026", year: "2026" },
  { name: "✨ 2025", year: "2025" },
  { name: "🌟 2024", year: "2024" },
  { name: "2023", year: "2023" },
  { name: "2022", year: "2022" },
  { name: "2021", year: "2021" },
  { name: "2020", year: "2020" },
  { name: "2019", year: "2019" },
  { name: "2018", year: "2018" },
];

const QuickGenreChipsInner: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get("type") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentCountry = searchParams.get("country") || "";
  const currentKeyword = searchParams.get("keyword") || "";
  const currentYear = searchParams.get("year") || "";
  const currentSort = searchParams.get("sort") || "";

  const [mobileTab, setMobileTab] = useState<"type" | "genre" | "country" | "actor" | "year">("type");
  const [showAllMobileRows, setShowAllMobileRows] = useState(false);

  // Refs for horizontal scrolling
  const typeRowRef = useRef<HTMLDivElement>(null);
  const genreRowRef = useRef<HTMLDivElement>(null);
  const countryRowRef = useRef<HTMLDivElement>(null);
  const actorRowRef = useRef<HTMLDivElement>(null);
  const yearRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement | null>, offset: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // Đếm số lượng bộ lọc đang chọn
  const activeCount = [
    Boolean(currentType),
    Boolean(currentCategory),
    Boolean(currentCountry),
    Boolean(currentKeyword),
    Boolean(currentYear),
    Boolean(currentSort),
  ].filter(Boolean).length;

  const [isPending, startTransition] = React.useTransition();

  // URL Helpers
  const getTypeUrl = useCallback((slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!slug) {
      params.delete("type");
    } else if (params.get("type") === slug) {
      params.delete("type");
    } else {
      params.set("type", slug);
    }
    params.delete("page");
    return `/browse?${params.toString()}`;
  }, [searchParams]);

  const handleTypeSelect = useCallback((slug: string) => {
    const url = getTypeUrl(slug);
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }, [getTypeUrl, router]);

  const getCategoryUrl = useCallback((slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!slug) {
      params.delete("category");
    } else if (params.get("category") === slug) {
      params.delete("category");
    } else {
      params.set("category", slug);
    }
    params.delete("page");
    return `/browse?${params.toString()}`;
  }, [searchParams]);

  const handleCategorySelect = useCallback((slug: string) => {
    const url = getCategoryUrl(slug);
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }, [getCategoryUrl, router]);

  const getCountryUrl = useCallback((slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!slug) {
      params.delete("country");
    } else if (params.get("country") === slug) {
      params.delete("country");
    } else {
      params.set("country", slug);
    }
    params.delete("page");
    return `/browse?${params.toString()}`;
  }, [searchParams]);

  const handleCountrySelect = useCallback((slug: string) => {
    const url = getCountryUrl(slug);
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }, [getCountryUrl, router]);

  const getActorUrl = useCallback((kw: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("keyword")?.toLowerCase() === kw.toLowerCase()) {
      params.delete("keyword");
    } else {
      params.set("keyword", kw);
    }
    params.delete("page");
    return `/browse?${params.toString()}`;
  }, [searchParams]);

  const handleActorSelect = useCallback((kw: string) => {
    const url = getActorUrl(kw);
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }, [getActorUrl, router]);

  const getYearUrl = useCallback((year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!year) {
      params.delete("year");
    } else if (params.get("year") === year) {
      params.delete("year");
    } else {
      params.set("year", year);
    }
    params.delete("page");
    return `/browse?${params.toString()}`;
  }, [searchParams]);

  const handleYearSelect = useCallback((year: string) => {
    const url = getYearUrl(year);
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }, [getYearUrl, router]);

  const handleClearAll = useCallback(() => {
    const params = new URLSearchParams();
    startTransition(() => {
      router.push(`/browse?${params.toString()}`, { scroll: false });
    });
  }, [router]);

  // Tên hiển thị các bộ lọc đang chọn
  const activeTypeName =
    POPULAR_TYPES.find((t) => t.slug === currentType)?.name || currentType;

  const activeCategoryName =
    POPULAR_GENRES.find((g) => g.slug === currentCategory)?.name || currentCategory;

  const activeCountryName =
    POPULAR_COUNTRIES.find((c) => c.slug === currentCountry)?.name || currentCountry;

  // 1. Render hàng Loại Phim (Loạt phim)
  const renderTypeRow = () => (
    <div className="relative group/row flex items-center gap-2">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-semibold w-24 sm:w-28">
        <Film className="w-3.5 h-3.5 text-rose-500" />
        <span>Loại phim:</span>
      </div>

      <button
        type="button"
        onClick={() => scrollRow(typeRowRef, -240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn trái"
        aria-label="Cuộn loại phim sang trái"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        ref={typeRowRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x scroll-smooth"
      >
        {POPULAR_TYPES.map((t) => {
          const isActive = t.slug === "" ? !currentType : currentType === t.slug;

          return (
            <button
              key={t.slug || "all-type"}
              type="button"
              onMouseEnter={() => router.prefetch(getTypeUrl(t.slug))}
              onClick={() => handleTypeSelect(t.slug)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-[0_0_15px_rgba(229,9,20,0.5)] border border-rose-400 scale-105 font-bold"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              {t.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollRow(typeRowRef, 240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn phải"
        aria-label="Cuộn loại phim sang phải"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // 2. Render hàng thể loại
  const renderGenreRow = () => (
    <div className="relative group/row flex items-center gap-2">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-semibold w-24 sm:w-28">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Thể loại:</span>
      </div>

      <button
        type="button"
        onClick={() => scrollRow(genreRowRef, -240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn trái"
        aria-label="Cuộn thể loại sang trái"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        ref={genreRowRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x scroll-smooth"
      >
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-ai-roulette"));
            }
          }}
          className="flex-none px-3.5 py-1.5 rounded-full text-xs font-black transition-all duration-300 cursor-pointer bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-md shadow-amber-950/60 hover:scale-105 active:scale-95 border border-amber-400/40 flex items-center gap-1.5"
        >
          <Dices className="w-3.5 h-3.5 text-amber-200" />
          <span>Suất Chiếu Định Mệnh 🎲</span>
        </button>

        {POPULAR_GENRES.map((g) => {
          const isActive = g.slug === "" ? !currentCategory : currentCategory === g.slug;

          return (
            <button
              key={g.slug || "all-genre"}
              type="button"
              onMouseEnter={() => router.prefetch(getCategoryUrl(g.slug))}
              onClick={() => handleCategorySelect(g.slug)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-red-600 to-netflix-red text-white shadow-[0_0_15px_rgba(229,9,20,0.45)] border border-red-400/60 scale-105 font-bold"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollRow(genreRowRef, 240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn phải"
        aria-label="Cuộn thể loại sang phải"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // 3. Render hàng quốc gia
  const renderCountryRow = () => (
    <div className="relative group/row flex items-center gap-2">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-semibold w-24 sm:w-28">
        <Globe2 className="w-3.5 h-3.5 text-sky-400" />
        <span>Quốc gia:</span>
      </div>

      <button
        type="button"
        onClick={() => scrollRow(countryRowRef, -240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn trái"
        aria-label="Cuộn quốc gia sang trái"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        ref={countryRowRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x scroll-smooth"
      >
        {POPULAR_COUNTRIES.map((c) => {
          const isActive = c.slug === "" ? !currentCountry : currentCountry === c.slug;

          return (
            <button
              key={c.slug || "all-country"}
              type="button"
              onMouseEnter={() => router.prefetch(getCountryUrl(c.slug))}
              onClick={() => handleCountrySelect(c.slug)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-[0_0_15px_rgba(2,132,199,0.45)] border border-sky-400/60 scale-105 font-bold"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollRow(countryRowRef, 240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn phải"
        aria-label="Cuộn quốc gia sang phải"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // 4. Render hàng diễn viên
  const renderActorRow = () => (
    <div className="relative group/row flex items-center gap-2">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-semibold w-24 sm:w-28">
        <Users className="w-3.5 h-3.5 text-amber-400" />
        <span>Diễn viên:</span>
      </div>

      <button
        type="button"
        onClick={() => scrollRow(actorRowRef, -240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn trái"
        aria-label="Cuộn diễn viên sang trái"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        ref={actorRowRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x scroll-smooth"
      >
        {POPULAR_ACTORS.map((act) => {
          const isActive =
            currentKeyword.toLowerCase().trim() === act.keyword.toLowerCase().trim();

          return (
            <button
              key={act.keyword}
              type="button"
              onMouseEnter={() => router.prefetch(getActorUrl(act.keyword))}
              onClick={() => handleActorSelect(act.keyword)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              {act.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollRow(actorRowRef, 240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn phải"
        aria-label="Cuộn diễn viên sang phải"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  // 5. Render hàng năm phát hành
  const renderYearRow = () => (
    <div className="relative group/row flex items-center gap-2">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-semibold w-24 sm:w-28">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span>Năm chiếu:</span>
      </div>

      <button
        type="button"
        onClick={() => scrollRow(yearRowRef, -240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn trái"
        aria-label="Cuộn năm sang trái"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <div
        ref={yearRowRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x scroll-smooth"
      >
        {RECENT_YEARS.map((y) => {
          const isActive = y.year === "" ? !currentYear : currentYear === y.year;

          return (
            <button
              key={y.year || "all-year"}
              type="button"
              onMouseEnter={() => router.prefetch(getYearUrl(y.year))}
              onClick={() => handleYearSelect(y.year)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.45)] border border-emerald-400/60 scale-105 font-bold"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              {y.name}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => scrollRow(yearRowRef, 240)}
        className="hidden md:flex flex-none items-center justify-center w-6 h-6 rounded-full bg-zinc-900/90 hover:bg-white text-gray-400 hover:text-black border border-white/10 transition z-10 cursor-pointer shadow-md opacity-0 group-hover/row:opacity-100"
        title="Cuộn phải"
        aria-label="Cuộn năm sang phải"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="w-full mb-6 rounded-3xl border border-white/10 bg-zinc-950/80 p-3.5 sm:p-5 backdrop-blur-xl shadow-2xl space-y-3 relative overflow-hidden">
      {/* THANH TIẾN TRÌNH NẠP KHI CHUYỂN BỘ LỌC */}
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse z-30 shadow-[0_0_10px_rgba(229,9,20,0.8)]" />
      )}

      {/* THANH ĐIỀU HƯỚNG BỘ LỌC ĐANG CHỌN (NẾU CÓ) */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-gray-300 font-bold bg-white/10 px-2 py-0.5 rounded-md mr-1">
              <Filter className="w-3 h-3 text-netflix-red" />
              Đang lọc ({activeCount}):
            </span>

            {currentType && (
              <button
                type="button"
                onClick={() => handleTypeSelect("")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold hover:bg-rose-500 hover:text-white transition cursor-pointer"
              >
                <span>{activeTypeName}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentCategory && (
              <button
                type="button"
                onClick={() => handleCategorySelect("")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-rose-300 font-bold hover:bg-netflix-red hover:text-white transition cursor-pointer"
              >
                <span>{activeCategoryName}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentCountry && (
              <button
                type="button"
                onClick={() => handleCountrySelect("")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold hover:bg-sky-500 hover:text-white transition cursor-pointer"
              >
                <span>{activeCountryName}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentKeyword && (
              <button
                type="button"
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.delete("keyword");
                  p.delete("page");
                  router.push(`/browse?${p.toString()}`, { scroll: false });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500 hover:text-black transition cursor-pointer"
              >
                <span>Diễn viên: {currentKeyword}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentYear && (
              <button
                type="button"
                onClick={() => handleYearSelect("")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500 hover:text-black transition cursor-pointer"
              >
                <span>Năm: {currentYear}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-rose-400 hover:bg-white/5 transition ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại tất cả</span>
          </button>
        </div>
      )}

      {/* MOBILE SEGMENTED CONTROL */}
      <div className="flex md:hidden items-center justify-between gap-1 pb-1">
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10 text-xs overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setMobileTab("type")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer flex-none ${
              mobileTab === "type"
                ? "bg-netflix-red text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Film className="w-3 h-3" />
            <span>Loại phim</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("genre")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer flex-none ${
              mobileTab === "genre"
                ? "bg-netflix-red text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Thể loại</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("country")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer flex-none ${
              mobileTab === "country"
                ? "bg-sky-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Globe2 className="w-3 h-3" />
            <span>Quốc gia</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("actor")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer flex-none ${
              mobileTab === "actor"
                ? "bg-amber-500 text-black shadow-sm font-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Diễn viên</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("year")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer flex-none ${
              mobileTab === "year"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Năm</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAllMobileRows(!showAllMobileRows)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition cursor-pointer flex-none"
        >
          <span>{showAllMobileRows ? "Thu gọn" : "Tất cả"}</span>
          {showAllMobileRows ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* MOBILE DISPLAY */}
      <div className="md:hidden space-y-2.5">
        {showAllMobileRows ? (
          <>
            {renderTypeRow()}
            {renderGenreRow()}
            {renderCountryRow()}
            {renderActorRow()}
            {renderYearRow()}
          </>
        ) : (
          <>
            {mobileTab === "type" && renderTypeRow()}
            {mobileTab === "genre" && renderGenreRow()}
            {mobileTab === "country" && renderCountryRow()}
            {mobileTab === "actor" && renderActorRow()}
            {mobileTab === "year" && renderYearRow()}
          </>
        )}
      </div>

      {/* DESKTOP DISPLAY: HIỂN THỊ CẢ 5 HÀNG TRỰC QUAN */}
      <div className="hidden md:flex md:flex-col space-y-2.5">
        {renderTypeRow()}
        {renderGenreRow()}
        {renderCountryRow()}
        {renderActorRow()}
        {renderYearRow()}
      </div>
    </div>
  );
};

export const QuickGenreChips: React.FC = () => {
  return <QuickGenreChipsInner />;
};
