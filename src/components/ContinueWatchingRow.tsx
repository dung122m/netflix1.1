"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, X, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getWatchHistory,
  removeWatchHistoryItem,
  WatchHistoryItem,
} from "@/lib/watchHistory";

export function ContinueWatchingRow() {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (!rowRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    setIsClient(true);
    const historyItems = getWatchHistory();
    setItems(historyItems);

    const handleUpdate = () => {
      setItems(getWatchHistory());
    };

    window.addEventListener("watch-history-updated", handleUpdate);
    return () =>
      window.removeEventListener("watch-history-updated", handleUpdate);
  }, []);

  useEffect(() => {
    checkScroll();
    const currentRef = rowRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", checkScroll, { passive: true });
    }
    window.addEventListener("resize", checkScroll);
    return () => {
      if (currentRef) {
        currentRef.removeEventListener("scroll", checkScroll);
      }
      window.removeEventListener("resize", checkScroll);
    };
  }, [items]);

  if (!isClient || items.length === 0) {
    return null;
  }

  const handleScroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const scrollAmount = rowRef.current.clientWidth * 0.75;
    rowRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleRemove = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeWatchHistoryItem(slug);
  };

  return (
    <section className="relative z-10 px-4 sm:px-8 max-w-[1800px] mx-auto mt-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-netflix-red" />
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
            Tiếp tục xem
          </h2>
        </div>
        <Link
          href="/my-list?tab=history"
          className="text-xs sm:text-sm text-gray-400 hover:text-white transition font-medium"
        >
          Xem tất cả ({items.length})
        </Link>
      </div>

      {/* KHUNG CAROUSEL CÓ NÚT ĐIỀU HƯỚNG TRÁI/PHẢI CHUẨN NETFLIX, ẨN HOÀN TOÀN THANH CUỘN */}
      <div className="relative group/row">
        {/* NÚT CUỘN TRÁI */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            aria-label="Cuộn sang trái"
            className="absolute left-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all rounded-r-lg cursor-pointer hover:scale-105"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* NÚT CUỘN PHẢI */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            aria-label="Cuộn sang phải"
            className="absolute right-0 top-0 bottom-0 z-30 w-10 sm:w-12 bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all rounded-l-lg cursor-pointer hover:scale-105"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* DANH SÁCH THẺ PHIM ĐÃ XEM (KHÔNG HIỂN THỊ THANH KÉO) */}
        <div
          ref={rowRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto py-2 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {items.slice(0, 15).map((item) => {
            const href = item.episodeSlug
              ? `/movies/${item.slug}?ep=${item.episodeSlug}`
              : `/movies/${item.slug}`;

            return (
              <div
                key={item.slug}
                className="group relative flex-none w-[220px] sm:w-[260px] md:w-[280px] bg-zinc-900 rounded-xl overflow-hidden border border-white/10 hover:border-white/30 transition-all duration-300 hover:scale-[1.03] shadow-md hover:shadow-xl"
              >
                <Link href={href} className="block">
                  {/* ẢNH THUMBNAIL */}
                  <div className="relative aspect-video w-full bg-zinc-800 overflow-hidden">
                    <Image
                      src={item.poster || "/default-hero.jpg"}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 260px, 300px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* NÚT PLAY Ở GIỮA */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-11 h-11 rounded-full bg-netflix-red text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* THANH TIẾN ĐỘ GIẢ LẬP ĐANG XEM DỞ */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800">
                      <div className="h-full bg-gradient-to-r from-netflix-red to-rose-500 rounded-r-full shadow-sm shadow-red-500/50 w-[65%]" />
                    </div>

                    {/* NÚT XOÁ KHỎI TIẾP TỤC XEM */}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, item.slug)}
                      aria-label="Xoá khỏi danh sách tiếp tục xem"
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-gray-300 hover:text-white hover:bg-black/90 backdrop-blur-sm transition z-10 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* THÔNG TIN PHIM */}
                  <div className="p-3">
                    <h3 className="text-white text-sm font-semibold truncate group-hover:text-netflix-red transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                      <span className="text-netflix-red font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-netflix-red animate-pulse" />
                        <span>{item.episodeName ? `Tập ${item.episodeName}` : "Đang xem dở"}</span>
                      </span>
                      {item.quality && (
                        <span className="bg-zinc-800/90 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-gray-300 font-semibold">
                          {item.quality}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ContinueWatchingRow;
