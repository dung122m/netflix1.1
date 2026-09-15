"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Check, Search, X } from "lucide-react";
import {
  getWatchedEpisodes,
  markEpisodeAsWatched,
} from "@/lib/episodeTracker";
import { getShortEpisodeLabel } from "@/lib/formatEpisode";
import { useWatchController } from "./WatchController";

const CHUNK_SIZE = 25;

interface EpisodeItem {
  name: string;
  slug: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface EpisodeListProps {
  movieSlug: string;
  episodes: EpisodeItem[];
  activeEpisodeSlug?: string;
  onSelectEpisode?: (slug: string) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({
  movieSlug,
  episodes = [],
  activeEpisodeSlug: propActiveEpisodeSlug,
  onSelectEpisode,
}) => {
  const watchContext = useWatchController();
  const activeEpisodeSlug = watchContext?.activeEpisodeSlug ?? propActiveEpisodeSlug;
  const switchEpisode = watchContext?.switchEpisode ?? onSelectEpisode;

  const [watchedList, setWatchedList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Tìm index của tập đang phát để tự động nhảy đúng tab dải tập
  const activeEpisodeIndex = useMemo(() => {
    return episodes.findIndex((tap) => tap.slug === activeEpisodeSlug);
  }, [episodes, activeEpisodeSlug]);

  const initialChunk = useMemo(() => {
    if (activeEpisodeIndex >= 0) {
      return Math.floor(activeEpisodeIndex / CHUNK_SIZE);
    }
    return 0;
  }, [activeEpisodeIndex]);

  const [activeChunk, setActiveChunk] = useState<number>(initialChunk);

  // Cập nhật tab khi activeEpisodeSlug thay đổi
  useEffect(() => {
    if (activeEpisodeIndex >= 0) {
      setActiveChunk(Math.floor(activeEpisodeIndex / CHUNK_SIZE));
    }
  }, [activeEpisodeIndex]);

  useEffect(() => {
    // Đọc danh sách tập đã xem của phim này
    setWatchedList(getWatchedEpisodes(movieSlug));

    // CHỈ ĐÁNH DẤU ĐÃ XEM KHI NGƯỜI DÙNG Ở LẠI TẬP NÀY TỐI THIỂU 60 GIÂY (1 PHÚT)
    let watchTimer: NodeJS.Timeout | null = null;
    if (activeEpisodeSlug) {
      watchTimer = setTimeout(() => {
        markEpisodeAsWatched(movieSlug, activeEpisodeSlug);
        setWatchedList(getWatchedEpisodes(movieSlug));
      }, 60000); // 60 giây
    }

    const handleUpdate = () => {
      setWatchedList(getWatchedEpisodes(movieSlug));
    };

    window.addEventListener("watched-episodes-updated", handleUpdate);
    return () => {
      if (watchTimer) clearTimeout(watchTimer);
      window.removeEventListener("watched-episodes-updated", handleUpdate);
    };
  }, [movieSlug, activeEpisodeSlug]);

  // Tạo các dải tập chuẩn xác theo số tập thực tế bắt đầu và kết thúc trong dải
  const totalChunks = Math.ceil(episodes.length / CHUNK_SIZE);
  const chunks = useMemo(() => {
    if (totalChunks <= 1) return [];
    return Array.from({ length: totalChunks }, (_, i) => {
      const startIdx = i * CHUNK_SIZE;
      const endIdx = Math.min((i + 1) * CHUNK_SIZE - 1, episodes.length - 1);
      const startEp = episodes[startIdx];
      const endEp = episodes[endIdx];

      const startShort = startEp?.name ? getShortEpisodeLabel(startEp.name) : String(startIdx + 1);
      const endShort = endEp?.name ? getShortEpisodeLabel(endEp.name) : String(endIdx + 1);

      const label = startShort === endShort ? `Tập ${startShort}` : `Tập ${startShort} - ${endShort}`;
      return { index: i, label };
    });
  }, [totalChunks, episodes]);

  // Lọc danh sách tập hiển thị
  const displayEpisodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return episodes.filter(
        (tap) =>
          tap.name.toLowerCase().includes(query) ||
          tap.slug.toLowerCase().includes(query)
      );
    }

    if (totalChunks > 1) {
      const start = activeChunk * CHUNK_SIZE;
      return episodes.slice(start, start + CHUNK_SIZE);
    }

    return episodes;
  }, [episodes, searchQuery, totalChunks, activeChunk]);

  if (!episodes || episodes.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/25 p-4 text-gray-300">
        Chưa có tập phim khả dụng.
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Ô TÌM NHANH SỐ TẬP (Hiển thị khi phim có từ 12 tập trở lên) */}
      {episodes.length > 12 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh tập (vd: 12)..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-zinc-800/90 border border-white/10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-netflix-red transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* DẢI TABS PHÂN NHÓM TẬP (Khi có trên 25 tập và không trong chế độ tìm kiếm) */}
      {!searchQuery.trim() && chunks.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-y overscroll-x-contain">
          {chunks.map((chunk) => {
            const isSelected = activeChunk === chunk.index;
            return (
              <button
                key={chunk.index}
                type="button"
                onClick={() => setActiveChunk(chunk.index)}
                className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? "bg-white text-black shadow-sm font-bold"
                    : "bg-zinc-800/80 text-gray-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                {chunk.label}
              </button>
            );
          })}
        </div>
      )}

      {/* LƯỚI TẬP PHIM: 6 cột mobile giúp danh sách rất gọn, số hiển thị lớn và rõ ràng */}
      {displayEpisodes.length > 0 ? (
        <div className="grid grid-cols-6 sm:grid-cols-7 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2">
          {displayEpisodes.map((tap) => {
            const isActive = activeEpisodeSlug === tap.slug;
            const isWatched = watchedList.includes(tap.slug);
            const shortLabel = getShortEpisodeLabel(tap.name);

            return (
              <Link
                key={tap.slug}
                href={`?ep=${tap.slug}`}
                scroll={false}
                title={tap.name}
                onClick={(e) => {
                  if (switchEpisode) {
                    e.preventDefault();
                    switchEpisode(tap.slug);
                  }
                }}
                className={`relative flex items-center justify-center text-center py-2 sm:py-2.5 px-1 rounded-xl text-xs font-bold transition-all duration-200 group ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 via-netflix-red to-rose-600 text-white font-black shadow-[0_0_16px_rgba(229,9,20,0.7)] ring-2 ring-white/80 border border-white/40 scale-[1.05] z-10"
                    : isWatched
                    ? "bg-zinc-900/90 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-white/10"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white border border-white/5"
                }`}
              >
                <span className="truncate flex items-center justify-center gap-1 font-mono tracking-tight font-extrabold text-[13px] sm:text-xs">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
                  )}
                  {shortLabel}
                </span>

                {/* ICON CHECK CHO TẬP ĐÃ XEM HOẶC CHỈ BÁO TẬP ĐANG XEM */}
                {isActive ? (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-netflix-red border border-white"></span>
                  </span>
                ) : isWatched ? (
                  <span
                    title="Đã xem"
                    className="absolute top-1 right-1 flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  >
                    <Check className="w-2.5 h-2.5" />
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-gray-400">
          Không tìm thấy tập phim nào khớp với &quot;{searchQuery}&quot;.
        </div>
      )}
    </div>
  );
};

export default EpisodeList;
