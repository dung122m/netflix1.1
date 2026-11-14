"use client";

import React from "react";
import { createPortal } from "react-dom";
import {
  SlidersHorizontal,
  X,
  Check,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";
import {
  MOVIE_TYPES,
  SORT_FIELDS,
  unpackSort,
  packSort,
} from "./filterConstants";

export interface FilterMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: { genres: any[]; countries: any[]; years: string[] };
  draftType: string;
  setDraftType: (v: string) => void;
  draftCategory: string;
  setDraftCategory: (v: string) => void;
  draftCountry: string;
  setDraftCountry: (v: string) => void;
  draftYear: string;
  setDraftYear: (v: string) => void;
  draftSort: string;
  setDraftSort: (v: string) => void;
  onReset: () => void;
  onApply: () => void;
  draftActiveCount: number;
}

export const FilterMobileDrawer: React.FC<FilterMobileDrawerProps> = React.memo(
  function FilterMobileDrawer({
    isOpen,
    onClose,
    filters,
    draftType,
    setDraftType,
    draftCategory,
    setDraftCategory,
    draftCountry,
    setDraftCountry,
    draftYear,
    setDraftYear,
    draftSort,
    setDraftSort,
    onReset,
    onApply,
    draftActiveCount,
  }) {
    if (!isOpen || typeof document === "undefined") return null;

    return createPortal(
      <div className="fixed inset-0 z-[100000] sm:hidden select-none">
        {/* Lớp nền mờ tối (Backdrop Overlay) */}
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Bảng điều khiển Bottom Sheet */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bảng điều khiển bộ lọc phim"
          className="fixed inset-x-0 bottom-0 z-[100001] max-h-[85dvh] flex flex-col rounded-t-3xl bg-zinc-950 border-t border-white/[0.08] shadow-[0_-16px_50px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-200"
        >
          {/* Thanh nắm kéo (Grab Handle) */}
          <div className="w-12 h-1.5 rounded-full bg-zinc-700/80 mx-auto my-2.5 shrink-0" />

          {/* Tiêu đề Bottom Sheet */}
          <div className="px-4 py-2 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-netflix-red shrink-0" />
              <h3 className="text-base font-bold text-white">Bộ Lọc Phim</h3>
              {draftActiveCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-netflix-red/20 text-netflix-red text-xs font-bold tabular-nums">
                  {draftActiveCount} đang chọn
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
              aria-label="Đóng bảng bộ lọc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Danh sách các nhóm bộ lọc có thể cuộn */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-contain">
            {/* NHÓM 1: SẮP XẾP (PHƯƠNG ÁN 2: TÁCH TIÊU CHÍ VÀ CHIỀU SẮP XẾP) */}
            {(() => {
              const { field: activeField, direction: activeDirection } = unpackSort(draftSort);
              const currentFieldObj = SORT_FIELDS.find((f) => f.field === activeField) || SORT_FIELDS[0];

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-400 flex items-center">
                      Tiêu chí sắp xếp
                    </span>
                    {draftSort && draftSort !== "latest" && (
                      <button
                        type="button"
                        onClick={() => setDraftSort("latest")}
                        className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                      >
                        Mặc định
                      </button>
                    )}
                  </div>

                  {/* 4 Tiêu chí chính: Lưới 2 cột trực quan */}
                  <div className="grid grid-cols-2 gap-2">
                    {SORT_FIELDS.map((opt) => {
                      const isFieldActive = activeField === opt.field;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.field}
                          type="button"
                          onClick={() => {
                            const next = packSort(opt.field, activeDirection);
                            setDraftSort(next);
                          }}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition active:scale-95 cursor-pointer text-left ${
                            isFieldActive
                              ? "bg-netflix-red/25 ring-1 ring-inset ring-netflix-red/60 text-white font-bold"
                              : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isFieldActive ? "text-white" : opt.color}`} />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Chiều sắp xếp (Tăng dần / Giảm dần) */}
                  <div className="p-1.5 rounded-xl bg-zinc-900/70 border border-white/[0.04] space-y-1.5">
                    <div className="px-1 text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                      <span>Thứ tự</span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {activeDirection === "desc" ? currentFieldObj.descLabel : currentFieldObj.ascLabel}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftSort(packSort(activeField, "desc"));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          activeDirection === "desc"
                            ? "bg-white/15 text-white font-bold shadow-sm"
                            : "text-zinc-400"
                        }`}
                      >
                        <ArrowDownWideNarrow className="w-3.5 h-3.5 text-netflix-red" />
                        <span>Giảm dần</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftSort(packSort(activeField, "asc"));
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          activeDirection === "asc"
                            ? "bg-white/15 text-white font-bold shadow-sm"
                            : "text-zinc-400"
                        }`}
                      >
                        <ArrowUpNarrowWide className="w-3.5 h-3.5 text-netflix-red" />
                        <span>Tăng dần</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* NHÓM 2: LOẠI PHIM */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 flex items-center">
                  Loại phim
                </span>
                {draftType && (
                  <button
                    type="button"
                    onClick={() => setDraftType("")}
                    className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraftType("")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    !draftType
                      ? "bg-netflix-red text-white font-bold"
                      : "bg-zinc-900/90 text-zinc-300"
                  }`}
                >
                  Tất cả
                </button>
                {MOVIE_TYPES.map((t) => {
                  const isSelected = draftType === t.slug;
                  return (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => setDraftType(isSelected ? "" : t.slug)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-netflix-red text-white font-bold shadow-sm"
                          : "bg-zinc-900/90 text-zinc-300"
                      }`}
                    >
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NHÓM 3: THỂ LOẠI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 flex items-center">
                  Thể loại
                </span>
                {draftCategory && (
                  <button
                    type="button"
                    onClick={() => setDraftCategory("")}
                    className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraftCategory("")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    !draftCategory
                      ? "bg-netflix-red text-white font-bold"
                      : "bg-zinc-900/90 text-zinc-300"
                  }`}
                >
                  Tất cả
                </button>
                {filters.genres.map((g) => {
                  const isSelected = draftCategory === g.slug;
                  return (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => setDraftCategory(isSelected ? "" : g.slug)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-netflix-red text-white font-bold shadow-sm"
                          : "bg-zinc-900/90 text-zinc-300"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NHÓM 4: QUỐC GIA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 flex items-center">
                  Quốc gia
                </span>
                {draftCountry && (
                  <button
                    type="button"
                    onClick={() => setDraftCountry("")}
                    className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraftCountry("")}
                  className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                    !draftCountry
                      ? "bg-netflix-red text-white font-bold"
                      : "bg-zinc-900/90 text-zinc-300"
                  }`}
                >
                  Tất cả
                </button>
                {filters.countries.map((c) => {
                  const isSelected = draftCountry === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setDraftCountry(isSelected ? "" : c.slug)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-netflix-red text-white font-bold shadow-sm"
                          : "bg-zinc-900/90 text-zinc-300"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* NHÓM 5: NĂM PHÁT HÀNH */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 flex items-center">
                  <span>Năm phát hành</span>
                </span>
                {draftYear && (
                  <button
                    type="button"
                    onClick={() => setDraftYear("")}
                    className="text-[11px] text-netflix-red hover:brightness-110 font-medium cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDraftYear("")}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer flex items-center justify-between ${
                  !draftYear
                    ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                    : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span>Tất cả các năm</span>
                {!draftYear && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              <div className="grid grid-cols-3 min-[360px]:grid-cols-4 gap-1.5">
                {filters.years.slice(0, 24).map((y) => {
                  const isSelected = draftYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setDraftYear(isSelected ? "" : y)}
                      className={`py-2 min-h-[38px] px-1 text-center rounded-xl text-xs sm:text-sm font-semibold tabular-nums transition active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-netflix-red text-white font-bold shadow-md shadow-black/50"
                          : "bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Chân Bottom Sheet dính cố định */}
          <div className="px-4 py-3 border-t border-white/[0.08] bg-zinc-950/98 backdrop-blur-md flex items-center gap-3 shrink-0 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+12px))] shadow-[0_-8px_20px_rgba(0,0,0,0.6)]">
            <button
              type="button"
              onClick={onReset}
              className="h-12 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs active:scale-95 transition cursor-pointer"
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={onApply}
              className="flex-1 h-12 rounded-xl bg-netflix-red hover:brightness-110 text-white font-bold text-sm shadow-md shadow-black/50 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
            >
              <span>Áp dụng bộ lọc</span>
              {draftActiveCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-black/25 text-white text-xs font-extrabold">
                  ({draftActiveCount})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }
);

