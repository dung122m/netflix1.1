"use client";

import React, { useEffect, useRef, useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { movieApi } from "@/services/movieApi";

type FilterType = "the-loai" | "quoc-gia" | "year";

export const FilterBar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    genres: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    countries: any[];
    years: string[];
  }>({
    genres: [],
    countries: [],
    years: [],
  });

  const [activeDropdown, setActiveDropdown] = useState<FilterType | null>(null);

  // Dùng để không scroll ngay lần đầu mở trang
  const firstRender = useRef(true);

  // =====================================================
  // LOAD DANH SÁCH FILTER
  // =====================================================

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await movieApi.getFilters();

        setFilters(data);
      } catch (error) {
        console.error("❌ Lỗi tải bộ lọc:", error);
      }
    };

    loadFilters();
  }, []);

  // =====================================================
  // TỰ ĐỘNG SCROLL SAU KHI FILTER THAY ĐỔI
  // =====================================================

  useEffect(() => {
    // Không scroll khi vừa mở trang
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    console.log("🔄 Filter đã thay đổi -> chờ render danh sách...");

    /*
     * router.push() làm Server Component render lại.
     * Vì vậy KHÔNG scroll ngay trong handleFilterChange.
     *
     * Chờ DOM cập nhật xong rồi mới scroll.
     */
    const timer = window.setTimeout(() => {
      const movieList = document.getElementById("movie-list");

      if (!movieList) {
        console.warn("⚠️ Không tìm thấy #movie-list");
        return;
      }

      console.log("✅ Scroll xuống danh sách phim");

      movieList.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchParams]);

  // =====================================================
  // XỬ LÝ KHI CHỌN FILTER
  // =====================================================

  const handleFilterChange = (filterType: FilterType, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    // ---------------------------------------------
    // THỂ LOẠI
    // ---------------------------------------------

    if (filterType === "the-loai") {
      const current = params.get("category");

      if (current === value) {
        params.delete("category");
      } else {
        params.set("category", value);
      }
    }

    // ---------------------------------------------
    // QUỐC GIA
    // ---------------------------------------------

    if (filterType === "quoc-gia") {
      const current = params.get("country");

      if (current === value) {
        params.delete("country");
      } else {
        params.set("country", value);
      }
    }

    // ---------------------------------------------
    // NĂM
    // ---------------------------------------------

    if (filterType === "year") {
      const current = params.get("year");

      if (current === value) {
        params.delete("year");
      } else {
        params.set("year", value);
      }
    }

    // ---------------------------------------------
    // MỖI LẦN ĐỔI FILTER -> VỀ TRANG 1
    // ---------------------------------------------

    params.delete("page");

    const query = params.toString();

    console.log("🚀 Filter mới:", query);

    // ---------------------------------------------
    // CẬP NHẬT URL
    // ---------------------------------------------

    router.push(query ? `?${query}` : "?");

    // Đóng dropdown
    setActiveDropdown(null);

    /*
     * KHÔNG scroll ở đây.
     *
     * useEffect phía trên sẽ đợi searchParams
     * thay đổi rồi mới scroll.
     */
  };

  // =====================================================
  // KIỂM TRA FILTER ĐANG ĐƯỢC CHỌN
  // =====================================================

  const isSelected = (filterType: FilterType, value: string) => {
    if (filterType === "the-loai") {
      return searchParams.get("category") === value;
    }

    if (filterType === "quoc-gia") {
      return searchParams.get("country") === value;
    }

    return searchParams.get("year") === value;
  };

  // =====================================================
  // DROPDOWN
  // =====================================================

  const toggleDropdown = (dropdown: FilterType) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // =====================================================
  // CHIP
  // =====================================================

  const Chip = ({
    label,
    value,
    type,
  }: {
    label: string;
    value: string;
    type: FilterType;
  }) => {
    const selected = isSelected(type, value);

    return (
      <button
        onClick={() => handleFilterChange(type, value)}
        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-center truncate ${
          selected
            ? "bg-white text-black font-semibold shadow-md"
            : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white"
        }`}
        title={label}
      >
        {label}
      </button>
    );
  };

  // =====================================================
  // CATEGORY ĐANG CHỌN
  // =====================================================

  const activeCategorySlug = searchParams.get("category");

  const activeCategoryName =
    filters.genres.find((genre) => genre.slug === activeCategorySlug)?.name ||
    "Thể loại";

  // =====================================================
  // COUNTRY ĐANG CHỌN
  // =====================================================

  const activeCountrySlug = searchParams.get("country");

  const activeCountryName =
    filters.countries.find((country) => country.slug === activeCountrySlug)
      ?.name || "Quốc gia";

  // =====================================================
  // YEAR ĐANG CHỌN
  // =====================================================

  const activeYear = searchParams.get("year") || "Năm phát hành";

  // =====================================================
  // CÓ FILTER HAY KHÔNG
  // =====================================================

  const hasFilters =
    !!searchParams.get("category") ||
    !!searchParams.get("country") ||
    !!searchParams.get("year");

  // =====================================================
  // XÓA TOÀN BỘ FILTER
  // =====================================================

  const clearFilters = () => {
    router.push("?");

    setActiveDropdown(null);

    /*
     * Không scroll thủ công.
     * searchParams thay đổi -> useEffect xử lý.
     */
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="relative z-30 mt-20 px-4 md:px-8">
      {/* =================================================
          THANH FILTER
      ================================================= */}

      <div className="flex flex-wrap items-center gap-4">
        {/* ===============================================
            THỂ LOẠI
        =============================================== */}

        <button
          onClick={() => toggleDropdown("the-loai")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition text-sm ${
            activeDropdown === "the-loai" || activeCategorySlug
              ? "bg-zinc-800 text-white border-zinc-500"
              : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
          }`}
        >
          {activeCategoryName}

          <span className="text-[10px]">▼</span>
        </button>

        {/* ===============================================
            QUỐC GIA
        =============================================== */}

        <button
          onClick={() => toggleDropdown("quoc-gia")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition text-sm ${
            activeDropdown === "quoc-gia" || activeCountrySlug
              ? "bg-zinc-800 text-white border-zinc-500"
              : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
          }`}
        >
          {activeCountryName}

          <span className="text-[10px]">▼</span>
        </button>

        {/* ===============================================
            NĂM
        =============================================== */}

        <button
          onClick={() => toggleDropdown("year")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition text-sm ${
            activeDropdown === "year" || searchParams.get("year")
              ? "bg-zinc-800 text-white border-zinc-500"
              : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
          }`}
        >
          {activeYear}

          <span className="text-[10px]">▼</span>
        </button>

        {/* ===============================================
            XÓA FILTER
        =============================================== */}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-gray-400 hover:text-white px-3 py-2 text-sm underline underline-offset-4 transition"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* =================================================
          DROPDOWN
      ================================================= */}

      {activeDropdown && (
        <div className="absolute top-full left-4 md:left-8 mt-3 w-[calc(100%-2rem)] max-w-4xl bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl">
          {/* LOADING */}

          {filters.genres.length === 0 && filters.countries.length === 0 ? (
            <div className="text-gray-400 animate-pulse text-sm">
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              {/* =========================================
                  THỂ LOẠI
              ========================================= */}

              {activeDropdown === "the-loai" && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    filters.genres.map((genre: any) => (
                      <Chip
                        key={genre.slug}
                        label={genre.name}
                        value={genre.slug}
                        type="the-loai"
                      />
                    ))
                  }
                </div>
              )}

              {/* =========================================
                  QUỐC GIA
              ========================================= */}

              {activeDropdown === "quoc-gia" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    filters.countries.map((country: any) => (
                      <Chip
                        key={country.slug}
                        label={country.name}
                        value={country.slug}
                        type="quoc-gia"
                      />
                    ))
                  }
                </div>
              )}

              {/* =========================================
                  NĂM
              ========================================= */}

              {activeDropdown === "year" && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filters.years.map((year) => (
                    <Chip key={year} label={year} value={year} type="year" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
