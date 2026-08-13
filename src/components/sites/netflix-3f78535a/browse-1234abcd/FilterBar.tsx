"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { movieApi } from "@/services/movieApi";

export const FilterBar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<{
    genres: any[];
    countries: any[];
    years: string[];
  }>({
    genres: [],
    countries: [],
    years: [],
  });

  // State quản lý xem menu nào đang được mở (xổ ra)
  const [activeDropdown, setActiveDropdown] = useState<
    "the-loai" | "quoc-gia" | "year" | null
  >(null);

  useEffect(() => {
    const loadFilters = async () => {
      const data = await movieApi.getFilters();
      setFilters(data);
    };
    loadFilters();
  }, []);

  const handleFilterChange = (
    filterType: "the-loai" | "quoc-gia" | "year",
    slug: string,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (filterType === "year") {
      if (slug === params.get("year")) params.delete("year");
      else params.set("year", slug);
    } else {
      if (slug === params.get("slug")) {
        params.delete("slug");
        params.delete("type");
      } else {
        params.set("type", filterType);
        params.set("slug", slug);
      }
    }

    params.delete("page");
    router.push(`?${params.toString()}`);

    // Tự động đóng menu sau khi chọn xong
    setActiveDropdown(null);
  };

  const isSelected = (filterType: string, slug: string) => {
    if (filterType === "year") return searchParams.get("year") === slug;
    return (
      searchParams.get("type") === filterType &&
      searchParams.get("slug") === slug
    );
  };

  const toggleDropdown = (dropdown: "the-loai" | "quoc-gia" | "year") => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };

  // Component Nút bấm (Chip)
  const Chip = ({
    label,
    value,
    type,
  }: {
    label: string;
    value: string;
    type: "the-loai" | "quoc-gia" | "year";
  }) => (
    <button
      onClick={() => handleFilterChange(type, value)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
        isSelected(type, value)
          ? "bg-white text-black"
          : "bg-zinc-800 text-gray-300 hover:bg-zinc-700 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  // Lấy tên của bộ lọc đang được chọn để hiển thị ra ngoài nút Menu
  const activeGenreSlug =
    searchParams.get("type") === "the-loai" ? searchParams.get("slug") : null;
  const activeGenreName =
    filters.genres.find((g) => g.slug === activeGenreSlug)?.name || "Thể loại";

  const activeCountrySlug =
    searchParams.get("type") === "quoc-gia" ? searchParams.get("slug") : null;
  const activeCountryName =
    filters.countries.find((c) => c.slug === activeCountrySlug)?.name ||
    "Quốc gia";

  const activeYear = searchParams.get("year") || "Năm phát hành";

  return (
    <div className="relative z-20 mt-20">
      {/* THANH MENU CHÍNH (Các nút bấm xổ menu) */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => toggleDropdown("the-loai")}
          className={`flex items-center gap-2 px-4 py-2 rounded border font-semibold transition ${
            activeDropdown === "the-loai" || activeGenreSlug
              ? "bg-zinc-800 text-white border-zinc-500"
              : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
          }`}
        >
          {activeGenreName} <span className="text-[10px]">▼</span>
        </button>

        <button
          onClick={() => toggleDropdown("quoc-gia")}
          className={`flex items-center gap-2 px-4 py-2 rounded border font-semibold transition ${
            activeDropdown === "quoc-gia" || activeCountrySlug
              ? "bg-zinc-800 text-white border-zinc-500"
              : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
          }`}
        >
          {activeCountryName} <span className="text-[10px]">▼</span>
        </button>

        <button
          onClick={() => toggleDropdown("year")}
          className={`flex items-center gap-2 px-4 py-2 rounded border font-semibold transition ${
            activeDropdown === "year" || searchParams.get("year")
              ? "bg-zinc-800 text-white border-zinc-500"
              : "bg-black text-gray-300 border-zinc-800 hover:border-zinc-500"
          }`}
        >
          {activeYear} <span className="text-[10px]">▼</span>
        </button>

        {/* Nút Xoá Bộ Lọc */}
        {(searchParams.get("slug") || searchParams.get("year")) && (
          <button
            onClick={() => {
              router.push("?");
              setActiveDropdown(null);
            }}
            className="text-gray-400 hover:text-white px-2 py-2 text-sm underline underline-offset-4 ml-2"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* KHU VỰC NỘI DUNG XỔ XUỐNG (DROPDOWN) */}
      {activeDropdown && (
        <div className="absolute top-14 left-0 w-full max-w-4xl bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-2xl">
          {filters.genres.length === 0 ? (
            <div className="text-gray-400 animate-pulse">
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              {/* Nội dung xổ ra của Thể Loại */}
              {activeDropdown === "the-loai" && (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filters.genres.map((g: any) => (
                    <Chip
                      key={g.slug}
                      label={g.name}
                      value={g.slug}
                      type="the-loai"
                    />
                  ))}
                </div>
              )}

              {/* Nội dung xổ ra của Quốc Gia */}
              {activeDropdown === "quoc-gia" && (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filters.countries.map((c: any) => (
                    <Chip
                      key={c.slug}
                      label={c.name}
                      value={c.slug}
                      type="quoc-gia"
                    />
                  ))}
                </div>
              )}

              {/* Nội dung xổ ra của Năm */}
              {activeDropdown === "year" && (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {filters.years.map((y) => (
                    <Chip key={y} label={y} value={y} type="year" />
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
