"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
  return (
    <section aria-label="Khám phá theo thể loại" className="space-y-3 w-full min-w-0 max-w-full overflow-hidden">
      {/* 1. Header có phân cấp rõ ràng - Cho phép click tiêu đề để mở /browse */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/browse"
          prefetch={false}
          className="group inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red rounded-xl transition cursor-pointer"
          aria-label="Khám phá toàn bộ kho phim Nanaflix"
        >
          <div>
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5 group-hover:text-zinc-200 transition-colors">
              <span>Thể Loại Phổ Biến</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-netflix-red group-hover:translate-x-0.5 transition-all" />
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400">
              Duyệt phim theo thể loại
            </p>
          </div>
        </Link>

        {/* Nút Kho phim dẫn trực tiếp tới /browse */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            href="/browse"
            prefetch={false}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-zinc-300 hover:text-white transition group outline-none focus-visible:ring-2 focus-visible:ring-netflix-red"
          >
            <span>Kho phim</span>
            <ChevronRight className="w-3.5 h-3.5 text-netflix-red group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* 2. Danh mục Thể loại: Cuộn ngang trên Mobile & Lưới tối đa 2 hàng trên Desktop (1 mảng DOM duy nhất) */}
      <div className="relative w-full min-w-0 max-w-full overflow-hidden">
        <div
          className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 pt-0.5 px-0.5 touch-pan-x touch-pan-y md:grid md:grid-cols-4 lg:grid-cols-8 md:gap-2 lg:gap-2.5 md:overflow-visible w-full min-w-0"
        >
          {FEATURED_GENRE_CHIPS.map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              prefetch={false}
              className={`inline-flex items-center justify-center px-3.5 md:px-2.5 lg:px-3 py-1.5 md:py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 md:flex-shrink text-center cursor-pointer transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
                chip.isAll
                  ? "bg-white text-black font-bold shadow-sm hover:bg-zinc-200"
                  : "bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 hover:text-white"
              }`}
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HomeGenreExploreBar;
