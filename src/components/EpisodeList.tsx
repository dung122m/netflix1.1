"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Check, Search, X } from "lucide-react";
import {
  getWatchedEpisodes,
  markEpisodeAsWatched,
} from "@/lib/episodeTracker";
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

    // Nếu có tập đang phát, tự động đánh dấu đã xem
    if (activeEpisodeSlug) {
      markEpisodeAsWatched(movieSlug, activeEpisodeSlug);
      setWatchedList(getWatchedEpisodes(movieSlug));
    }

    const handleUpdate = () => {
      setWatchedList(getWatchedEpisodes(movieSlug));
    };

    window.addEventListener("watched-episodes-updated", handleUpdate);
    return () =>
      window.removeEventListener("watched-episodes-updated", handleUpdate);
  }, [movieSlug, activeEpisodeSlug]);

  // Tạo các dải tập nếu số tập > 25
  const totalChunks = Math.ceil(episodes.length / CHUNK_SIZE);
  const chunks = useMemo(() => {
    if (totalChunks <= 1) return [];
    return Array.from({ length: totalChunks }, (_, i) => {
      const start = i * CHUNK_SIZE + 1;
      const end = Math.min((i + 1) * CHUNK_SIZE, episodes.length);
      return { index: i, label: `Tập ${start} - ${end}` };
    });
  }, [totalChunks, episodes.length]);

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
                    ? "bg-white text-black shadow-sm"
                    : "bg-zinc-800/80 text-gray-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                {chunk.label}
              </button>
            );
          })}
        </div>
      )}

      {/* LƯỚI TẬP PHIM: 5 cột trên điện thoại giúp danh sách gọn gàng, giảm 40% chiều cao */}
      {displayEpisodes.length > 0 ? (
        <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {displayEpisodes.map((tap) => {
            const isActive = activeEpisodeSlug === tap.slug;
            const isWatched = watchedList.includes(tap.slug);

            return (
              <Link
                key={tap.slug}
                href={`?ep=${tap.slug}`}
                scroll={false}
                onClick={(e) => {
                  if (switchEpisode) {
                    e.preventDefault();
                    switchEpisode(tap.slug);
                  }
                }}
                className={`relative flex items-center justify-center text-center py-2 sm:py-2.5 px-1 rounded-lg text-xs font-semibold transition group ${
                  isActive
                    ? "bg-netflix-red text-white shadow-lg shadow-red-950/60 scale-[1.02] ring-1 ring-white/30"
                    : isWatched
                    ? "bg-zinc-800/60 text-gray-400 hover:bg-zinc-700 hover:text-white border border-white/5"
                    : "bg-zinc-800 text-gray-200 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                <span className="truncate">{tap.name}</span>

                {/* ICON CHECK CHO TẬP ĐÃ XEM HOẶC CHỈ BÁO TẬP ĐANG XEM */}
                {isActive ? (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-netflix-red border border-white"></span>
                  </span>
                ) : isWatched ? (
                  <span
                    title="Đã xem"
                    className="absolute top-1 right-1 flex items-center justify-center w-3 h-3 rounded-full bg-white/10 text-green-400"
                  >
                    <Check className="w-2 h-2" />
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
