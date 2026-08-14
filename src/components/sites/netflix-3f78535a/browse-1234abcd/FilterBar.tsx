"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { movieApi } from "@/services/movieApi";

type FilterType = "the-loai" | "quoc-gia" | "year" | "type";

const MOVIE_TYPES = [
  { name: "Phim Lẻ", slug: "phim-le" },
  { name: "Phim Bộ", slug: "phim-bo" },
  { name: "Hoạt Hình", slug: "hoat-hinh" },
  { name: "TV Shows", slug: "tv-shows" },
];

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

  // =========================================================
  // LOAD FILTERS
  // =========================================================

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

  // =========================================================
  // LẤY PARAM TƯƠNG ỨNG VỚI FILTER
  // =========================================================

  const getParamKey = (filterType: FilterType) => {
    if (filterType === "type") {
      return "type";
    }

    if (filterType === "the-loai") {
      return "category";
    }

    if (filterType === "quoc-gia") {
      return "country";
    }

    return "year";
  };

  // =========================================================
  // CHỌN FILTER
  // =========================================================

  const handleFilterChange = (filterType: FilterType, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    const key = getParamKey(filterType);

    // Nếu bấm lại đúng lựa chọn đang chọn
    // => bỏ chọn
    if (params.get(key) === value) {
      params.delete(key);
    } else {
      // Chọn giá trị mới
      params.set(key, value);
    }

    // Khi filter thay đổi thì quay về page 1
    params.delete("page");

    router.push(`?${params.toString()}`);

    // Đóng dropdown
    setActiveDropdown(null);
  };

  // =========================================================
  // BẤM "TẤT CẢ"
  // =========================================================

  const handleClearFilter = (filterType: FilterType) => {
    const params = new URLSearchParams(searchParams.toString());

    const key = getParamKey(filterType);

    // Xóa filter hiện tại
    params.delete(key);

    // Reset page
    params.delete("page");

    router.push(`?${params.toString()}`);

    // Đóng dropdown
    setActiveDropdown(null);
  };

  // =========================================================
  // KIỂM TRA ITEM CÓ ĐANG ĐƯỢC CHỌN KHÔNG
  // =========================================================

  const isSelected = (filterType: FilterType, value: string) => {
    const key = getParamKey(filterType);

    return searchParams.get(key) === value;
  };

  // =========================================================
  // KIỂM TRA FILTER CÓ ĐANG ĐƯỢC CHỌN KHÔNG
  // =========================================================

  const hasSelectedFilter = (filterType: FilterType) => {
    const key = getParamKey(filterType);

    return !!searchParams.get(key);
  };

  // =========================================================
  // TÊN HIỂN THỊ TRÊN BUTTON
  // =========================================================

  const activeTypeSlug = searchParams.get("type");

  const activeTypeName =
    MOVIE_TYPES.find((item) => item.slug === activeTypeSlug)?.name ||
    "Loại phim";

  const activeCategorySlug = searchParams.get("category");

  const activeCategoryName =
    filters.genres.find((item) => item.slug === activeCategorySlug)?.name ||
    "Thể loại";

  const activeCountrySlug = searchParams.get("country");

  const activeCountryName =
    filters.countries.find((item) => item.slug === activeCountrySlug)?.name ||
    "Quốc gia";

  const activeYear = searchParams.get("year") || "Năm phát hành";

  // =========================================================
  // CHIP
  // =========================================================

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
        type="button"
        onClick={() => handleFilterChange(type, value)}
        className={`
          px-3
          py-2.5
          rounded-lg
          text-sm
          font-medium
          transition-all
          text-center
          truncate
          border

          ${
            selected
              ? "bg-white text-black border-white font-semibold shadow-md"
              : "bg-zinc-800 text-gray-300 border-zinc-800 hover:bg-zinc-700 hover:text-white"
          }
        `}
      >
        {selected && <span className="mr-1">✓</span>}

        {label}
      </button>
    );
  };

  // =========================================================
  // NÚT "TẤT CẢ"
  // =========================================================

  const renderAllButton = (type: FilterType) => {
    const isAllSelected = !hasSelectedFilter(type);

    return (
      <button
        type="button"
        onClick={() => handleClearFilter(type)}
        className={`
          px-3
          py-2.5
          rounded-lg
          text-sm
          font-medium
          transition-all
          text-center
          truncate
          border

          ${
            isAllSelected
              ? "bg-white text-black border-white font-semibold shadow-md"
              : "bg-zinc-800 text-gray-300 border-zinc-800 hover:bg-zinc-700 hover:text-white"
          }
        `}
      >
        {isAllSelected && <span className="mr-1">✓</span>}
        Tất cả
      </button>
    );
  };

  // =========================================================
  // XÓA TẤT CẢ FILTER
  // =========================================================

  const hasFilters =
    !!searchParams.get("type") ||
    !!searchParams.get("category") ||
    !!searchParams.get("country") ||
    !!searchParams.get("year");

  const clearAllFilters = () => {
    setActiveDropdown(null);

    router.push("?");
  };

  return (
    <div className="relative z-50 mt-20 px-4 md:px-8">
      {/* ================================================= */}
      {/* FILTER BUTTONS */}
      {/* ================================================= */}

      <div className="flex flex-wrap items-center gap-4">
        {/* LOẠI PHIM */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "type" ? null : "type")
          }
          className={`
            flex
            items-center
            gap-2
            px-4
            py-2
            rounded-lg
            border
            font-semibold
            transition
            text-sm

            ${
              activeDropdown === "type" || hasSelectedFilter("type")
                ? "bg-zinc-800 text-white border-zinc-500"
                : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
            }
          `}
        >
          {activeTypeName}

          <span className="text-[10px]">
            {activeDropdown === "type" ? "▲" : "▼"}
          </span>
        </button>

        {/* THỂ LOẠI */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "the-loai" ? null : "the-loai")
          }
          className={`
            flex
            items-center
            gap-2
            px-4
            py-2
            rounded-lg
            border
            font-semibold
            transition
            text-sm

            ${
              activeDropdown === "the-loai" || hasSelectedFilter("the-loai")
                ? "bg-zinc-800 text-white border-zinc-500"
                : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
            }
          `}
        >
          {activeCategoryName}

          <span className="text-[10px]">
            {activeDropdown === "the-loai" ? "▲" : "▼"}
          </span>
        </button>

        {/* QUỐC GIA */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "quoc-gia" ? null : "quoc-gia")
          }
          className={`
            flex
            items-center
            gap-2
            px-4
            py-2
            rounded-lg
            border
            font-semibold
            transition
            text-sm

            ${
              activeDropdown === "quoc-gia" || hasSelectedFilter("quoc-gia")
                ? "bg-zinc-800 text-white border-zinc-500"
                : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
            }
          `}
        >
          {activeCountryName}

          <span className="text-[10px]">
            {activeDropdown === "quoc-gia" ? "▲" : "▼"}
          </span>
        </button>

        {/* NĂM */}
        <button
          type="button"
          onClick={() =>
            setActiveDropdown(activeDropdown === "year" ? null : "year")
          }
          className={`
            flex
            items-center
            gap-2
            px-4
            py-2
            rounded-lg
            border
            font-semibold
            transition
            text-sm

            ${
              activeDropdown === "year" || hasSelectedFilter("year")
                ? "bg-zinc-800 text-white border-zinc-500"
                : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
            }
          `}
        >
          {activeYear}

          <span className="text-[10px]">
            {activeDropdown === "year" ? "▲" : "▼"}
          </span>
        </button>

        {/* XÓA TẤT CẢ */}
        {hasFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="
              text-gray-400
              hover:text-white
              px-3
              py-2
              text-sm
              underline
              underline-offset-4
              transition
            "
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* ================================================= */}
      {/* DROPDOWN */}
      {/* ================================================= */}

      {activeDropdown && (
        <>
          {/* OVERLAY */}
          <div
            className="
              fixed
              inset-0
              z-40
              bg-black/40
              backdrop-blur-[2px]
            "
            onClick={() => setActiveDropdown(null)}
          />

          {/* ================================================= */}
          {/* DROPDOWN BOX */}
          {/* ================================================= */}

          <div
            className="
              absolute
              top-full
              left-4
              md:left-8
              mt-3

              w-[calc(100%-2rem)]
              max-w-4xl

              bg-zinc-950
              border
              border-zinc-700
              rounded-2xl

              p-6

              shadow-2xl

              z-50
            "
          >
            {/* ================================================= */}
            {/* DANH SÁCH */}
            {/* ================================================= */}

            <div
              className="
                grid
                grid-cols-2
                sm:grid-cols-4
                md:grid-cols-6

                gap-2.5

                max-h-80
                overflow-y-auto
                overscroll-contain

                pr-2

                [&::-webkit-scrollbar]:w-2
                [&::-webkit-scrollbar-thumb]:bg-zinc-700
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-track]:bg-transparent
              "
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              {/* ================================================= */}
              {/* TẤT CẢ */}
              {/* ================================================= */}

              {renderAllButton(activeDropdown)}

              {/* ================================================= */}
              {/* LOẠI PHIM */}
              {/* ================================================= */}

              {activeDropdown === "type" &&
                MOVIE_TYPES.map((item) => (
                  <Chip
                    key={item.slug}
                    label={item.name}
                    value={item.slug}
                    type="type"
                  />
                ))}

              {/* ================================================= */}
              {/* THỂ LOẠI */}
              {/* ================================================= */}

              {activeDropdown === "the-loai" &&
                filters.genres.map((item) => (
                  <Chip
                    key={item.slug}
                    label={item.name}
                    value={item.slug}
                    type="the-loai"
                  />
                ))}

              {/* ================================================= */}
              {/* QUỐC GIA */}
              {/* ================================================= */}

              {activeDropdown === "quoc-gia" &&
                filters.countries.map((item) => (
                  <Chip
                    key={item.slug}
                    label={item.name}
                    value={item.slug}
                    type="quoc-gia"
                  />
                ))}

              {/* ================================================= */}
              {/* NĂM */}
              {/* ================================================= */}

              {activeDropdown === "year" &&
                filters.years.map((year) => (
                  <Chip key={year} label={year} value={year} type="year" />
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
