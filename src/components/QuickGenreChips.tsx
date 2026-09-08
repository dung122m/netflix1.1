"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Globe2,
  Calendar,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
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

export const QuickGenreChips: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") || "";
  const currentCountry = searchParams.get("country") || "";
  const currentYear = searchParams.get("year") || "";
  const currentSort = searchParams.get("sort") || "";
  const currentType = searchParams.get("type") || "";

  const [isExpanded, setIsExpanded] = useState(true);

  const [mobileTab, setMobileTab] = useState<"genre" | "country" | "year">("genre");
  const [showAllMobileRows, setShowAllMobileRows] = useState(false);

  // Kiểm tra có filter nào đang kích hoạt
  const hasActiveFilters = Boolean(
    currentCategory || currentCountry || currentYear || currentSort || currentType
  );

  const handleCategorySelect = (item: {
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
  };

  const handleCountrySelect = (slug: string) => {
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
  };

  const handleYearSelect = (year: string) => {
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
  };

  const handleClearAll = () => {
    const params = new URLSearchParams();
    router.push(`/browse?${params.toString()}`);
  };

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
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-medium w-24 sm:w-28">
        <Sparkles className="w-3.5 h-3.5 text-netflix-red" />
        <span>Thể loại:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-nowrap">
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
                  ? "bg-netflix-red text-white shadow-md shadow-red-950/50 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/25"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render hàng quốc gia
  const renderCountryRow = () => (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-medium w-24 sm:w-28">
        <Globe2 className="w-3.5 h-3.5 text-sky-400" />
        <span>Quốc gia:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-nowrap">
        {POPULAR_COUNTRIES.map((c) => {
          const isActive = c.slug === "" ? !currentCountry : currentCountry === c.slug;

          return (
            <button
              key={c.slug || "all-country"}
              type="button"
              onClick={() => handleCountrySelect(c.slug)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-sky-600 text-white shadow-md shadow-sky-950/50 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/25"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render hàng năm phát hành
  const renderYearRow = () => (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden touch-pan-x">
      <div className="hidden md:flex flex-none items-center gap-1.5 text-xs text-gray-400 pl-1 pr-2 font-medium w-24 sm:w-28">
        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
        <span>Năm phát hành:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-nowrap">
        {RECENT_YEARS.map((y) => {
          const isActive = y.year === "" ? !currentYear : currentYear === y.year;

          return (
            <button
              key={y.year || "all-year"}
              type="button"
              onClick={() => handleYearSelect(y.year)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50 scale-105"
                  : "bg-zinc-900/90 hover:bg-zinc-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/25"
              }`}
            >
              {y.name}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full mb-6 rounded-2xl border border-white/10 bg-zinc-950/75 p-3 sm:p-4 backdrop-blur-md shadow-xl space-y-2.5 sm:space-y-3">
      {/* THANH ĐIỀU HƯỚNG BỘ LỌC ĐANG CHỌN (NẾU CÓ) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-400 font-medium mr-1">Đang lọc theo:</span>

            {currentCategory && (
              <button
                type="button"
                onClick={() => handleCategorySelect({ slug: "", isSort: false, isType: false })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/40 text-rose-300 font-bold hover:bg-netflix-red hover:text-white transition"
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500 hover:text-black transition"
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold hover:bg-purple-500 hover:text-white transition"
              >
                <span>{currentSort === "rating" ? "⭐ Điểm cao" : "🔥 Xem nhiều"}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentCountry && (
              <button
                type="button"
                onClick={() => handleCountrySelect("")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold hover:bg-sky-500 hover:text-white transition"
              >
                <span>{activeCountryName}</span>
                <X className="w-3 h-3" />
              </button>
            )}

            {currentYear && (
              <button
                type="button"
                onClick={() => handleYearSelect("")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500 hover:text-black transition"
              >
                <span>Năm: {currentYear}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-rose-400 hover:bg-white/5 transition ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại tất cả</span>
          </button>
        </div>
      )}

      {/* MOBILE SEGMENTED CONTROL: Chuyển đổi linh hoạt Thể loại / Quốc gia / Năm để tiết kiệm diện tích màn hình */}
      <div className="flex md:hidden items-center justify-between gap-1 pb-1">
        <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setMobileTab("genre")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
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
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
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
            onClick={() => setMobileTab("year")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
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
          className="text-[11px] text-gray-400 hover:text-white px-2 py-1 transition flex items-center gap-0.5"
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
            {renderYearRow()}
          </>
        ) : (
          <>
            {mobileTab === "genre" && renderGenreRow()}
            {mobileTab === "country" && renderCountryRow()}
            {mobileTab === "year" && renderYearRow()}
          </>
        )}
      </div>

      {/* HIỂN THỊ TRÊN MÀN HÌNH DESKTOP (MD+): CẢ 3 HÀNG CÙNG LÚC ĐẦY ĐỦ VÀ TRỰC QUAN */}
      <div className="hidden md:block space-y-2.5">
        {renderGenreRow()}
        {renderCountryRow()}
        {renderYearRow()}
      </div>
    </div>
  );
};

export default QuickGenreChips;
