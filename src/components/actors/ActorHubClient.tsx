"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  Sparkles,
  Film,
  User,
  ExternalLink,
  ChevronRight,
  Flame,
} from "lucide-react";
import { ActorCatalogItem } from "@/data/actorsCatalog";
import { normalizeForMatch } from "@/lib/stringUtils";

interface ActorHubClientProps {
  initialActors: ActorCatalogItem[];
}

const COUNTRY_FILTERS = [
  { code: "all", label: "Tất cả", flag: "🌎" },
  { code: "vn", label: "Việt Nam", flag: "🇻🇳" },
  { code: "kr", label: "Hàn Quốc", flag: "🇰🇷" },
  { code: "hk", label: "Hồng Kông", flag: "🇭🇰" },
  { code: "cn", label: "Trung Quốc", flag: "🇨🇳" },
  { code: "us_uk", label: "Âu Mỹ", flag: "🇺🇸" },
  { code: "jp", label: "Nhật Bản", flag: "🇯🇵" },
  { code: "th", label: "Thái Lan", flag: "🇹🇭" },
];

export const ActorHubClient: React.FC<ActorHubClientProps> = ({ initialActors }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCountry, setActiveCountry] = useState<string>("all");
  const [, startTransition] = useTransition();

  const handleCountryChange = (code: string) => {
    startTransition(() => {
      setActiveCountry(code);
    });
  };

  const filteredActors = useMemo(() => {
    const qNorm = normalizeForMatch(searchQuery);

    return initialActors.filter((actor) => {
      // 1. Lọc theo quốc gia
      if (activeCountry !== "all" && actor.countryCode !== activeCountry) {
        return false;
      }

      // 2. Lọc theo từ khóa tìm kiếm
      if (!qNorm) return true;

      const nameNorm = normalizeForMatch(actor.name);
      const engNorm = normalizeForMatch(actor.englishName || "");
      const rolesNorm = normalizeForMatch(actor.roles || "");
      const aliasNorm = (actor.aliases || []).some((a) => normalizeForMatch(a).includes(qNorm));

      return (
        nameNorm.includes(qNorm) ||
        engNorm.includes(qNorm) ||
        rolesNorm.includes(qNorm) ||
        aliasNorm
      );
    });
  }, [initialActors, searchQuery, activeCountry]);

  // Featured stars (diễn viên tiêu biểu)
  const featuredActors = useMemo(() => {
    return initialActors.filter((a) => a.featured).slice(0, 8);
  }, [initialActors]);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* ============================================================ */}
      {/* SEARCH & FILTER BAR */}
      {/* ============================================================ */}
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* INPUT TÌM KIẾM */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600/30 to-amber-600/30 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-300 pointer-events-none" />
          <div className="relative flex items-center bg-zinc-950/90 border border-white/[0.1] group-hover:border-white/20 rounded-2xl px-4 py-3 sm:py-3.5 shadow-2xl backdrop-blur-xl transition-all">
            <Search className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors shrink-0 mr-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm diễn viên, nghệ danh, đạo diễn (vd: Trấn Thành, Châu Tinh Trì, Tom Cruise)..."
              className="w-full bg-transparent text-white placeholder-gray-500 text-xs sm:text-sm font-medium focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 ml-2"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* BỘ LỌC QUỐC GIA (PILLS) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none justify-start sm:justify-center">
          {COUNTRY_FILTERS.map((item) => {
            const isActive = activeCountry === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => handleCountryChange(item.code)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-netflix-red text-white shadow-lg shadow-red-950/50 scale-[1.02]"
                    : "bg-zinc-950/80 hover:bg-zinc-900 text-gray-300 border border-white/[0.08] hover:border-white/20"
                }`}
              >
                <span>{item.flag}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* KẾT QUẢ / SỐ LƯỢNG */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>
            Hiển thị <strong className="text-white font-bold">{filteredActors.length}</strong> nghệ sĩ
            {activeCountry !== "all" && (
              <> thuộc khu vực <strong className="text-amber-300">{COUNTRY_FILTERS.find((c) => c.code === activeCountry)?.label}</strong></>
            )}
          </span>
        </div>

        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs text-netflix-red hover:underline font-semibold"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* ============================================================ */}
      {/* LƯỚI DIỄN VIÊN (ACTOR GRID) */}
      {/* ============================================================ */}
      {filteredActors.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {filteredActors.map((actor) => {
            return (
              <Link
                key={actor.slug}
                href={`/dien-vien/${actor.slug}`}
                className="group relative flex flex-col rounded-2xl bg-zinc-950/80 border border-white/[0.08] hover:border-netflix-red/50 hover:bg-zinc-900/90 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1.5 cursor-pointer"
              >
                {/* PORTRAIT CONTAINER (TỶ LỆ 3:4) */}
                <div className="relative aspect-[3/4] w-full bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden">
                  {actor.avatarUrl ? (
                    <Image
                      src={actor.avatarUrl}
                      alt={actor.name}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-center group-hover:from-zinc-800 group-hover:to-zinc-900 transition-colors">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-netflix-red group-hover:border-netflix-red/40 group-hover:scale-110 transition-all shadow-md">
                        <User className="w-7 h-7 sm:w-8 sm:h-8" />
                      </div>
                    </div>
                  )}

                  {/* GRADIENT OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                  {/* COUNTRY BADGE GÓC TRÊN */}
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-semibold text-gray-200 flex items-center gap-1 shadow">
                    <span>{actor.country}</span>
                  </div>

                  {/* FEATURED BADGE */}
                  {actor.featured && (
                    <div className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-amber-500/20 backdrop-blur-md border border-amber-500/30 text-amber-300 shadow">
                      <Flame className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* INFO BODY */}
                <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-1.5">
                  <div className="space-y-0.5">
                    <h3 className="text-xs sm:text-sm font-black text-white group-hover:text-netflix-red transition-colors line-clamp-1">
                      {actor.name}
                    </h3>
                    {actor.englishName && actor.englishName !== actor.name && (
                      <p className="text-[10px] sm:text-[11px] text-gray-400 line-clamp-1">
                        {actor.englishName}
                      </p>
                    )}
                  </div>

                  {actor.roles && (
                    <p className="text-[10px] text-zinc-400 font-medium line-clamp-1 border-t border-white/[0.06] pt-1.5 mt-0.5">
                      {actor.roles}
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-between text-[10px] sm:text-[11px] text-netflix-red font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Xem tác phẩm</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* EMPTY STATE / EXTENDED SEARCH */
        <div className="py-12 px-6 rounded-3xl bg-zinc-950/60 border border-white/[0.08] text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-netflix-red flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Không tìm thấy diễn viên phù hợp trong danh mục
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Bạn có thể tra cứu trực tiếp toàn bộ kho phim của nghệ sĩ <strong>&ldquo;{searchQuery}&rdquo;</strong> trên hệ thống tìm kiếm đa chiều Nanaflix.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/browse?actor=${encodeURIComponent(searchQuery)}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-netflix-red hover:bg-red-700 text-white font-bold text-xs transition shadow-lg shadow-red-950/40 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Tìm phim có &ldquo;{searchQuery}&rdquo;</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveCountry("all");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold transition cursor-pointer"
            >
              <span>Xem tất cả nghệ sĩ</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUICK DISCOVERY CAROUSEL / ROW */}
      {/* ============================================================ */}
      {featuredActors.length > 0 && !searchQuery && activeCountry === "all" && (
        <section className="pt-8 border-t border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-black text-sm sm:text-base">
              <Flame className="w-4 h-4 text-netflix-red" />
              <span>Nghệ Sĩ Được Tìm Kiếm Nhiều Nhất</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-none">
            {featuredActors.map((actor) => (
              <Link
                key={`pill-${actor.slug}`}
                href={`/dien-vien/${actor.slug}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/70 hover:bg-zinc-900 border border-white/[0.08] hover:border-netflix-red/50 text-xs font-semibold text-gray-200 hover:text-white transition whitespace-nowrap shadow group"
              >
                <span>{actor.country.split(" ")[1] || "🎬"}</span>
                <span className="group-hover:text-netflix-red transition-colors">{actor.name}</span>
                <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-white transition-colors" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
