"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  FilterGroup,
  MOVIE_TYPES,
} from "./filterConstants";

export interface FilterDropdownMenuProps {
  activeDropdown: FilterGroup | null;
  dropdownOffset: { left?: number; right?: number; top?: number };
  currentType: string;
  currentCategory: string;
  currentCountry: string;
  currentYear: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: { genres: any[]; countries: any[]; years: string[] };
  updateQueryParam: (key: string, value: string) => void;
}

export const FilterDropdownMenu: React.FC<FilterDropdownMenuProps> = React.memo(
  function FilterDropdownMenu({
    activeDropdown,
    dropdownOffset,
    currentType,
    currentCategory,
    currentCountry,
    currentYear,
    filters,
    updateQueryParam,
  }) {
    if (!activeDropdown) return null;

    return (
      <div
        className="hidden sm:block absolute z-50 transition-all duration-150"
        style={{
          top: dropdownOffset.top !== undefined ? `${dropdownOffset.top}px` : undefined,
          left: dropdownOffset.left !== undefined ? `${dropdownOffset.left}px` : undefined,
          right: dropdownOffset.right !== undefined ? `${dropdownOffset.right}px` : undefined,
        }}
      >
        {/* POPUP 1: LOẠI PHIM */}
        {activeDropdown === "type" && (
          <div className="w-56 sm:w-60 rounded-2xl bg-zinc-950/98 p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 border-b border-white/[0.08] mb-2 flex items-center justify-between">
              <span>Chọn loại phim</span>
              {currentType && (
                <button
                  type="button"
                  onClick={() => updateQueryParam("type", "")}
                  className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
              <button
                type="button"
                onClick={() => updateQueryParam("type", "")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                  !currentType
                    ? "bg-white/10 text-white font-bold"
                    : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                }`}
              >
                <span>Tất cả loại phim</span>
                {!currentType && <Check className="w-3.5 h-3.5 text-netflix-red" />}
              </button>
              {MOVIE_TYPES.map((t) => {
                const isSelected = currentType === t.slug;
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => updateQueryParam("type", t.slug)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                        : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                    }`}
                  >
                    <span>{t.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* POPUP 2: THỂ LOẠI */}
        {activeDropdown === "genre" && (
          <div className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 rounded-2xl bg-zinc-950/98 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 border-b border-white/[0.08] mb-2 flex items-center justify-between">
              <span>Chọn thể loại</span>
              {currentCategory && (
                <button
                  type="button"
                  onClick={() => updateQueryParam("category", "")}
                  className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            <div className="max-h-64 sm:max-h-72 overflow-y-auto grid grid-cols-2 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
              <button
                type="button"
                onClick={() => updateQueryParam("category", "")}
                className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                  !currentCategory
                    ? "bg-white/10 text-white font-bold"
                    : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                }`}
              >
                <span>Tất cả thể loại</span>
                {!currentCategory && <Check className="w-3.5 h-3.5 text-netflix-red" />}
              </button>
              {filters.genres.map((g) => {
                const isSelected = currentCategory === g.slug;
                return (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => updateQueryParam("category", g.slug)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left truncate ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                        : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white bg-zinc-900/60"
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white flex-none ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* POPUP 3: QUỐC GIA */}
        {activeDropdown === "country" && (
          <div className="w-[calc(100vw-2rem)] sm:w-80 rounded-2xl bg-zinc-950/98 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 border-b border-white/[0.08] mb-2 flex items-center justify-between">
              <span>Chọn quốc gia</span>
              {currentCountry && (
                <button
                  type="button"
                  onClick={() => updateQueryParam("country", "")}
                  className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
            <div className="max-h-64 sm:max-h-72 overflow-y-auto grid grid-cols-2 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
              <button
                type="button"
                onClick={() => updateQueryParam("country", "")}
                className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                  !currentCountry
                    ? "bg-white/10 text-white font-bold"
                    : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                }`}
              >
                <span>Tất cả quốc gia</span>
                {!currentCountry && <Check className="w-3.5 h-3.5 text-netflix-red" />}
              </button>
              {filters.countries.map((c) => {
                const isSelected = currentCountry === c.slug;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => updateQueryParam("country", c.slug)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left truncate ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                        : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white bg-zinc-900/60"
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white flex-none ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* POPUP 4: NĂM PHÁT HÀNH */}
        {activeDropdown === "year" && (
          <div className="w-[calc(100vw-2rem)] sm:w-80 rounded-2xl bg-zinc-950/98 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 border-b border-white/[0.08] mb-2 flex items-center justify-between">
              <span>Chọn năm phát hành</span>
              {currentYear && (
                <button
                  type="button"
                  onClick={() => updateQueryParam("year", "")}
                  className="text-netflix-red hover:brightness-110 text-[11px] normal-case font-medium cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => updateQueryParam("year", "")}
              className={`w-full mb-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer text-left ${
                !currentYear
                  ? "bg-white/10 text-white font-bold"
                  : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
              }`}
            >
              <span>Tất cả các năm</span>
              {!currentYear && <Check className="w-3.5 h-3.5 text-netflix-red" />}
            </button>
            <div className="max-h-60 overflow-y-auto grid grid-cols-3 min-[360px]:grid-cols-4 gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
              {filters.years.map((y) => {
                const isSelected = currentYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => updateQueryParam("year", y)}
                    className={`py-2 min-h-[38px] px-1 text-center rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                        : "text-zinc-300 hover:bg-zinc-800 hover:text-white bg-zinc-900/60"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

