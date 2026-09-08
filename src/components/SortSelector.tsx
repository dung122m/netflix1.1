"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Check, Clock, Star, Flame, Calendar } from "lucide-react";

const SORT_OPTIONS = [
  { label: "Mới cập nhật", value: "", icon: Clock, iconColor: "text-sky-400" },
  { label: "Điểm đánh giá cao", value: "rating", icon: Star, iconColor: "text-amber-400" },
  { label: "Xem nhiều nhất", value: "views", icon: Flame, iconColor: "text-orange-500" },
  { label: "Năm mới nhất", value: "year", icon: Calendar, iconColor: "text-emerald-400" },
];

export const SortSelector: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "";
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption =
    SORT_OPTIONS.find((opt) => opt.value === currentSort) || SORT_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("sort", value);
    } else {
      params.delete("sort");
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left z-20">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/15 text-xs sm:text-sm font-medium text-gray-200 hover:text-white hover:border-white/30 transition cursor-pointer shadow-sm"
        aria-expanded={isOpen}
      >
        <ActiveIcon className={`w-3.5 h-3.5 ${activeOption.iconColor}`} />
        <span className="text-gray-400">Sắp xếp:</span>
        <span className="font-semibold text-white">{activeOption.label}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-zinc-950 border border-white/15 shadow-2xl p-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 px-2.5 py-1 uppercase tracking-wider border-b border-white/10 mb-1">
            <ArrowUpDown className="w-3 h-3 text-netflix-red" />
            <span>Tiêu chí sắp xếp</span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {SORT_OPTIONS.map((opt) => {
              const isSelected = currentSort === opt.value;
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition text-left cursor-pointer ${
                    isSelected
                      ? "bg-netflix-red text-white font-semibold shadow-md shadow-red-950/50"
                      : "text-gray-300 hover:bg-zinc-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <IconComp
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-white" : opt.iconColor
                      }`}
                    />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-2 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SortSelector;
