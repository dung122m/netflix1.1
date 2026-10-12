"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { Compass, ChevronRight, ChevronLeft } from "lucide-react";

interface GenreChipItem {
  label: string;
  href: string;
  isAll?: boolean;
}

const FEATURED_GENRE_CHIPS: GenreChipItem[] = [
  { label: "Tất cả", href: "/browse", isAll: true },
  { label: "Chiếu Rạp", href: "/browse?type=phim-chieu-rap" },
  { label: "Phim Bộ", href: "/browse?type=phim-bo" },
  { label: "Phim Lẻ", href: "/browse?type=phim-le" },
  { label: "Hoạt Hình & Anime", href: "/browse?type=hoat-hinh" },
  { label: "Hành Động", href: "/browse?category=hanh-dong" },
  { label: "Tình Cảm", href: "/browse?category=tinh-cam" },
  { label: "Cổ Trang", href: "/browse?category=co-trang" },
  { label: "Hài Hước", href: "/browse?category=hai-huoc" },
  { label: "Kinh Dị", href: "/browse?category=kinh-di" },
  { label: "Viễn Tưởng", href: "/browse?category=vien-tuong" },
  { label: "Võ Thuật", href: "/browse?category=vo-thuat" },
  { label: "Tâm Lý", href: "/browse?category=tam-ly" },
  { label: "Phiêu Lưu", href: "/browse?category=phieu-luu" },
  { label: "Chiến Tranh", href: "/browse?category=chien-tranh" },
  { label: "Thuyết Minh", href: "/browse?type=phim-thuyet-minh" },
];

export function HomeGenreExploreBar() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = direction === "left" ? -280 : 280;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section aria-label="Khám phá theo thể loại" className="space-y-3">
      {/* 1. Header có phân cấp rõ ràng */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-netflix-red/15 border border-netflix-red/30 flex items-center justify-center text-netflix-red shadow-sm flex-shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2">
              <span>Khám Phá Thể Loại</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400">
              Duyệt nhanh danh mục phim chọn lọc
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Nút cuộn trái / phải trên desktop */}
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Cuộn thể loại sang trái"
            className="hidden sm:flex w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/25 hover:bg-zinc-800 text-zinc-300 hover:text-white items-center justify-center transition cursor-pointer"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Cuộn thể loại sang phải"
            className="hidden sm:flex w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 hover:border-white/25 hover:bg-zinc-800 text-zinc-300 hover:text-white items-center justify-center transition cursor-pointer"
          >
            <ChevronRight size={15} />
          </button>

          <Link
            href="/browse"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition group"
          >
            <span>Kho phim</span>
            <ChevronRight className="w-3.5 h-3.5 text-netflix-red group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* 2. Dải Pill thể loại YouTube / Netflix style */}
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 pt-0.5 -mx-1 px-1 touch-pan-x"
      >
        {FEATURED_GENRE_CHIPS.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 cursor-pointer transition-all duration-200 active:scale-95 ${
              chip.isAll
                ? "bg-white text-black font-bold shadow-sm hover:bg-zinc-200"
                : "bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 hover:text-white border border-white/10 hover:border-white/25"
            }`}
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default HomeGenreExploreBar;
