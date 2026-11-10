"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();

    el.addEventListener("scroll", checkScroll, { passive: true });
    el.addEventListener("scrollend", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", checkScroll);
      el.removeEventListener("scrollend", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  return (
    <section aria-label="Khám phá theo thể loại" className="space-y-3 w-full min-w-0 max-w-full overflow-hidden">
      {/* 1. Header có phân cấp rõ ràng - Cho phép click tiêu đề để mở /browse */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/browse"
          prefetch={false}
          className="group inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red rounded-xl transition cursor-pointer"
          title="Khám phá toàn bộ kho phim Nanaflix"
        >
          <div>
            <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5 group-hover:text-zinc-200 transition-colors">
              <span>Khám Phá Thể Loại</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-netflix-red group-hover:translate-x-0.5 transition-all" />
            </h2>
            <p className="text-[11px] sm:text-xs text-zinc-400">
              Duyệt nhanh danh mục phim chọn lọc
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

      {/* 2. Desktop & Tablet: Bố cục tối đa 2 hàng trên desktop (8 cột) & tự thích ứng 4 cột trên tablet */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-8 gap-2 lg:gap-2.5 w-full pt-0.5">
        {FEATURED_GENRE_CHIPS.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            prefetch={false}
            className={`inline-flex items-center justify-center px-2.5 lg:px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap text-center transition-all duration-200 active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
              chip.isAll
                ? "bg-white text-black font-bold shadow-sm hover:bg-zinc-200"
                : "bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 hover:text-white"
            }`}
          >
            {chip.label}
          </Link>
        ))}
      </div>

      {/* 3. Mobile: Giữ trải nghiệm cuộn ngang gọn nhẹ, mượt mà, không tăng chiều cao khối */}
      <div className="md:hidden relative w-full min-w-0 max-w-full overflow-hidden">
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 pt-0.5 px-0.5 touch-pan-x w-full min-w-0"
        >
          {FEATURED_GENRE_CHIPS.map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              prefetch={false}
              className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 cursor-pointer transition-all duration-200 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-netflix-red ${
                chip.isAll
                  ? "bg-white text-black font-bold shadow-sm hover:bg-zinc-200"
                  : "bg-white/[0.06] hover:bg-white/[0.14] text-zinc-300 hover:text-white"
              }`}
            >
              {chip.label}
            </Link>
          ))}
        </div>

        {/* Fade mép phải gợi mở nội dung cuộn */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-0 bottom-1 right-0 w-8 bg-gradient-to-l from-black/85 via-black/35 to-transparent transition-opacity duration-300 z-10 ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
    </section>
  );
}

export default HomeGenreExploreBar;
