"use client";

import React, { useEffect, useRef, useState } from "react";
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

  const firstRender = useRef(true);

  // Load danh sách filter
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

  // Tự động scroll sau khi filter thay đổi
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      const movieList = document.getElementById("movie-list");
      if (!movieList) return;

      movieList.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchParams]);

  const handleFilterChange = (filterType: FilterType, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (filterType === "type") {
      const current = params.get("type");
      if (current === value) params.delete("type");
      else params.set("type", value);
    }

    if (filterType === "the-loai") {
      const current = params.get("category");
      if (current === value) params.delete("category");
      else params.set("category", value);
    }

    if (filterType === "quoc-gia") {
      const current = params.get("country");
      if (current === value) params.delete("country");
      else params.set("country", value);
    }

    if (filterType === "year") {
      const current = params.get("year");
      if (current === value) params.delete("year");
      else params.set("year", value);
    }

    params.delete("page");
    const query = params.toString();

    router.push(query ? `?${query}` : "?");
    setActiveDropdown(null);
  };

  const isSelected = (filterType: FilterType, value: string) => {
    if (filterType === "type") return searchParams.get("type") === value;
    if (filterType === "the-loai")
      return searchParams.get("category") === value;
    if (filterType === "quoc-gia") return searchParams.get("country") === value;
    return searchParams.get("year") === value;
  };

  const toggleDropdown = (dropdown: FilterType) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

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

  const activeTypeSlug = searchParams.get("type");
  const activeTypeName =
    MOVIE_TYPES.find((t) => t.slug === activeTypeSlug)?.name || "Loại phim";

  const activeCategorySlug = searchParams.get("category");
  const activeCategoryName =
    filters.genres.find((genre) => genre.slug === activeCategorySlug)?.name ||
    "Thể loại";

  const activeCountrySlug = searchParams.get("country");
  const activeCountryName =
    filters.countries.find((country) => country.slug === activeCountrySlug)
      ?.name || "Quốc gia";

  const activeYear = searchParams.get("year") || "Năm phát hành";

  const hasFilters =
    !!searchParams.get("type") ||
    !!searchParams.get("category") ||
    !!searchParams.get("country") ||
    !!searchParams.get("year");

  const clearFilters = () => {
    router.push("?");
    setActiveDropdown(null);
  };

  return (
    <div className="relative z-50 mt-20 px-4 md:px-8">
      {/* Thanh Filter */}
      <div className="flex flex-wrap items-center gap-4 relative z-50">
        <button
          onClick={() => toggleDropdown("type")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition text-sm ${
            activeDropdown === "type" || activeTypeSlug
              ? "bg-zinc-800 text-white border-zinc-500"
              : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
          }`}
        >
          {activeTypeName}
          <span className="text-[10px]">▼</span>
        </button>

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

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-gray-400 hover:text-white px-3 py-2 text-sm underline underline-offset-4 transition"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* Lớp nền tối che chắn sự kiện (Overlay) khi dropdown mở */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setActiveDropdown(null)}
        />
      )}

      {/* Dropdown Menu */}
      {activeDropdown && (
        <div className="absolute top-full left-4 md:left-8 mt-3 w-[calc(100%-2rem)] max-w-4xl bg-zinc-950 border border-zinc-700 rounded-2xl p-6 shadow-2xl z-50">
          {filters.genres.length === 0 &&
          filters.countries.length === 0 &&
          activeDropdown !== "type" &&
          activeDropdown !== "year" ? (
            <div className="text-gray-400 animate-pulse text-sm">
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              {activeDropdown === "type" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {MOVIE_TYPES.map((type) => (
                    <Chip
                      key={type.slug}
                      label={type.name}
                      value={type.slug}
                      type="type"
                    />
                  ))}
                </div>
              )}

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

              {activeDropdown === "year" && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filters.years.map((year) => (
                    <Chip
                      key={year}
                      label={year}
                      value={year}
                      type="year"
                    />
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
