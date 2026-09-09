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
} from "lucide-react";

const POPULAR_GENRES = [
  { name: "✨ Tất cả thể loại", slug: "", isSort: false, isType: false },
  { name: "⭐ Điểm cao nhất", slug: "rating", isSort: true, isType: false },
  { name: "🔥 Xem nhiều", slug: "views", isSort: true, isType: false },
  { name: "🎬 Chiếu Rạp", slug: "phim-chieu-rap", isSort: false, isType: true },
  { name: "💥 Hành Động", slug: "hanh-dong", isSort: false, isType: false },
  { name: "💖 Tình Cảm", slug: "tinh-cam", isSort: false, isType: false },
  { name: "👻 Kinh Dị", slug: "kinh-di", isSort: false, isType: false },
  { name: "🤣 Hài Hước", slug: "hai-huoc", isSort: false, isType: false },
  { name: "🛸 Viễn Tưởng", slug: "vien-tuong", isSort: false, isType: false },
  { name: "🏯 Cổ Trang", slug: "co-trang", isSort: false, isType: false },
  { name: "🎨 Hoạt Hình", slug: "hoat-hinh", isSort: false, isType: false },
  { name: "🧠 Tâm Lý", slug: "tam-ly", isSort: false, isType: false },
  { name: "🥋 Võ Thuật", slug: "vo-thuat", isSort: false, isType: false },
];

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

  const currentCategory = searchParams.get("category") || "";
  const currentCountry = searchParams.get("country") || "";
  const currentKeyword = searchParams.get("keyword") || "";
  const currentYear = searchParams.get("year") || "";
  const currentSort = searchParams.get("sort") || "";
  const currentType = searchParams.get("type") || "";

  const [mobileTab, setMobileTab] = useState<"genre" | "country" | "actor" | "year">("genre");
  const [showAllMobileRows, setShowAllMobileRows] = useState(false);

  // Refs for horizontal scrolling
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
    Boolean(currentCategory),
    Boolean(currentCountry),
    Boolean(currentKeyword),
    Boolean(currentYear),
    Boolean(currentSort),
    Boolean(currentType),
  ].filter(Boolean).length;

  const handleActorSelect = useCallback((kw: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("keyword")?.toLowerCase() === kw.toLowerCase()) {
      params.delete("keyword");
    } else {
      params.set("keyword", kw);
    }
    params.delete("page");
    router.push(`/browse?${params.toString()}`);
  }, [searchParams, router]);

  const handleCategorySelect = useCallback((item: {
    slug: string;
    isSort: boolean;
    isType: boolean;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (item.isSort) {
      if (params.get("sort") === item.slug) {
        params.delete("sort");
      } else {
        params.set("sort", item.slug);
      }
    } else if (item.isType) {
      if (params.get("type") === item.slug) {
        params.delete("type");
      } else {
        params.set("type", item.slug);
      }
    } else {
      if (!item.slug) {
        params.delete("category");
        params.delete("sort");
        if (params.get("type") === "phim-chieu-rap") params.delete("type");
      } else if (params.get("category") === item.slug) {
        params.delete("category");
      } else {
        params.set("category", item.slug);
      }
    }

    params.delete("page");
    router.push(`/browse?${params.toString()}`);
  }, [searchParams, router]);

  const handleCountrySelect = useCallback((slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!slug) {
      params.delete("country");
    } else if (params.get("country") === slug) {
      params.delete("country");
    } else {
      params.set("country", slug);
    }
    params.delete("page");
    router.push(`/browse?${params.toString()}`);
  }, [searchParams, router]);

  const handleYearSelect = useCallback((year: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!year) {
      params.delete("year");
    } else if (params.get("year") === year) {
      params.delete("year");
    } else {
      params.set("year", year);
    }
    params.delete("page");
    router.push(`/browse?${params.toString()}`);
  }, [searchParams, router]);

  const handleClearAll = useCallback(() => {
    const params = new URLSearchParams();
    router.push(`/browse?${params.toString()}`);
  }, [router]);

  // Tên hiển thị các bộ lọc đang chọn
  const activeCategoryName =
    POPULAR_GENRES.find(
      (g) =>
        (!g.isSort && !g.isType && g.slug === currentCategory) ||
        (g.isSort && g.slug === currentSort) ||
        (g.isType && g.slug === currentType)
    )?.name || currentCategory;

  const activeCountryName =
    POPULAR_COUNTRIES.find((c) => c.slug === currentCountry)?.name ||
    currentCountry;

  // Render hàng thể loại
  const renderGenreRow = () => (
    <div className="relative group/row flex items-center gap-2">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-semibold w-24 sm:w-28">
        <Sparkles className="w-3.5 h-3.5 text-netflix-red" />
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
        {POPULAR_GENRES.map((g) => {
          const isActive = g.isSort
            ? currentSort === g.slug
            : g.isType
            ? currentType === g.slug
            : g.slug === ""
            ? !currentCategory && !currentSort && !currentType
            : currentCategory === g.slug;

          return (
            <button
              key={g.slug || "all-genre"}
              type="button"
              onClick={() => handleCategorySelect(g)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-netflix-red text-white shadow-md shadow-red-950/60 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/25"
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

  // Render hàng quốc gia
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
              onClick={() => handleCountrySelect(c.slug)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-sky-600 text-white shadow-md shadow-sky-950/60 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/25"
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

  // Render hàng năm phát hành
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
              onClick={() => handleYearSelect(y.year)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/60 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/25"
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

  // Render hàng diễn viên
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
              onClick={() => handleActorSelect(act.keyword)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold shadow-md shadow-amber-950/60 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/25"
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

  return (
    <div className="w-full mb-6 rounded-3xl border border-white/10 bg-zinc-950/80 p-3.5 sm:p-5 backdrop-blur-xl shadow-2xl space-y-3">
      {/* THANH ĐIỀU HƯỚNG BỘ LỌC ĐANG CHỌN (NẾU CÓ) */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-gray-300 font-bold bg-white/10 px-2 py-0.5 rounded-md mr-1">
              <Filter className="w-3 h-3 text-netflix-red" />
              Đang lọc ({activeCount}):
            </span>

            {currentCategory && (
              <button
                type="button"
                onClick={() => handleCategorySelect({ slug: "", isSort: false, isType: false })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-rose-300 font-bold hover:bg-netflix-red hover:text-white transition cursor-pointer"
              >
                <span>{activeCategoryName}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentType && (
              <button
                type="button"
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.delete("type");
                  router.push(`/browse?${p.toString()}`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500 hover:text-black transition cursor-pointer"
              >
                <span>Chiếu Rạp</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentSort && (
              <button
                type="button"
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.delete("sort");
                  router.push(`/browse?${p.toString()}`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold hover:bg-purple-500 hover:text-white transition cursor-pointer"
              >
                <span>{currentSort === "rating" ? "⭐ Điểm cao" : "🔥 Xem nhiều"}</span>
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
                  router.push(`/browse?${p.toString()}`);
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
            onClick={() => setMobileTab("genre")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer flex-none ${
              mobileTab === "genre"
                ? "bg-netflix-red text-white shadow-sm"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Thể loại</span>
            {(currentCategory || currentSort || currentType) && (
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
            )}
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
            {currentCountry && (
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("actor")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer flex-none ${
              mobileTab === "actor"
                ? "bg-amber-500 text-black shadow-sm font-extrabold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-3 h-3" />
            <span>Diễn viên</span>
            {currentKeyword && (
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
            )}
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
            {currentYear && (
              <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAllMobileRows((prev) => !prev)}
          className="text-[11px] text-gray-400 hover:text-white px-2 py-1 transition flex items-center gap-0.5 cursor-pointer flex-none"
        >
          <span>{showAllMobileRows ? "Thu gọn" : "Hiện đủ"}</span>
          {showAllMobileRows ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* HIỂN THỊ TRÊN MOBILE: TAB ĐƯỢC CHỌN (HOẶC TẤT CẢ NẾU BẤM HIỆN ĐỦ) */}
      <div className="md:hidden space-y-2">
        {showAllMobileRows ? (
          <>
            {renderGenreRow()}
            {renderCountryRow()}
            {renderActorRow()}
            {renderYearRow()}
          </>
        ) : (
          <>
            {mobileTab === "genre" && renderGenreRow()}
            {mobileTab === "country" && renderCountryRow()}
            {mobileTab === "actor" && renderActorRow()}
            {mobileTab === "year" && renderYearRow()}
          </>
        )}
      </div>

      {/* HIỂN THỊ TRÊN MÀN HÌNH DESKTOP (MD+): CẢ 4 HÀNG CÙNG LÚC ĐẦY ĐỦ VÀ TRỰC QUAN */}
      <div className="hidden md:block space-y-2.5">
        {renderGenreRow()}
        {renderCountryRow()}
        {renderActorRow()}
        {renderYearRow()}
      </div>
    </div>
  );
};

export const QuickGenreChips = React.memo(QuickGenreChipsInner);
export default QuickGenreChips;
