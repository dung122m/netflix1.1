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
  episodes?: EpisodeItem[];
  activeEpisodeSlug?: string;
  onSelectEpisode?: (slug: string) => void;
}

/**
 * Định dạng nhãn hiển thị tập phim thông minh và thẩm mỹ:
 * - Khi phim ít tập (<= 12 tập): Hiện đầy đủ "Tập 0", "Tập 01", "Tập 02" hoặc "Bản Full"
 * - Khi phim nhiều tập (> 12 tập): Hiện số rút gọn để hiển thị dạng lưới gọn gàng
 */
function getFormattedEpisodeLabel(rawName?: string, fallbackIndex = 1, isFew = false): string {
  const short = getShortEpisodeLabel(rawName, String(fallbackIndex));
  const lower = short.toLowerCase();

  if (lower === "full" || lower === "bản full") return "Bản Full";
  if (lower === "trailer") return "Trailer";

  if (isFew) {
    const trimmed = (rawName || "").trim();
    if (/^tập\s+/i.test(trimmed)) {
      return trimmed;
    }
    return `Tập ${short}`;
  }

  return short;
}

export const EpisodeList: React.FC<EpisodeListProps> = React.memo(function EpisodeList({
  movieSlug,
  episodes: propEpisodes = [],
  activeEpisodeSlug: propActiveEpisodeSlug,
  onSelectEpisode,
}) {
  const watchContext = useWatchController();
  const episodes = watchContext?.episodes ?? propEpisodes;
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

  // Cập nhật tab khi activeEpisodeSlug hoặc danh sách tập thay đổi (khi đổi nguồn phát / server)
  useEffect(() => {
    if (activeEpisodeIndex >= 0) {
      setActiveChunk(Math.floor(activeEpisodeIndex / CHUNK_SIZE));
    } else {
      setActiveChunk(0);
    }
  }, [activeEpisodeIndex, episodes]);

  useEffect(() => {
    // Đọc danh sách tập đã xem của phim này
    setWatchedList(getWatchedEpisodes(movieSlug));

    // ĐÁNH DẤU ĐÃ XEM KHI NGƯỜI DÙNG Ở LẠI TẬP NÀY TỐI THIỂU 60 GIÂY (1 PHÚT)
    let watchTimer: NodeJS.Timeout | null = null;
    if (activeEpisodeSlug) {
      watchTimer = setTimeout(() => {
        markEpisodeAsWatched(movieSlug, activeEpisodeSlug);
        setWatchedList(getWatchedEpisodes(movieSlug));
      }, 60000);
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
          (tap.name && tap.name.toLowerCase().includes(query)) ||
          (tap.slug && tap.slug.toLowerCase().includes(query))
      );
    }

    if (totalChunks > 1) {
      const start = activeChunk * CHUNK_SIZE;
      return episodes.slice(start, start + CHUNK_SIZE);
    }

    return episodes;
  }, [episodes, searchQuery, totalChunks, activeChunk]);

  // Kiểm tra số lượng tập để căn chỉnh bố cục lưới phù hợp nhất
  const isFewEpisodes = episodes.length <= 12;

  const gridClasses = useMemo(() => {
    // Nếu đang tìm kiếm và chỉ có ít kết quả
    if (searchQuery.trim()) {
      if (displayEpisodes.length === 1) return "grid grid-cols-1";
      if (displayEpisodes.length <= 4) return "grid grid-cols-2 gap-2.5";
      if (displayEpisodes.length <= 8) return "grid grid-cols-2 sm:grid-cols-3 gap-2.5";
      return "grid grid-cols-3 sm:grid-cols-4 gap-2";
    }

    // Khi chỉ có 1 tập duy nhất (phim lẻ): nút trải dài full chiều ngang, cực kỳ thoáng và rõ ràng
    if (episodes.length === 1) {
      return "grid grid-cols-1";
    }
    // Khi có từ 2 đến 4 tập: chia 2 cột để mỗi nút đủ rộng hiển thị trọn vẹn "Tập 01", "Tập 02", không bao giờ bị cắt chữ
    if (episodes.length <= 4) {
      return "grid grid-cols-2 gap-2.5";
    }
    // Khi có từ 5 đến 8 tập: 2 cột trên mobile hẹp, 3 cột trên tablet/desktop
    if (episodes.length <= 8) {
      return "grid grid-cols-2 sm:grid-cols-3 gap-2.5";
    }
    // Khi có từ 9 đến 12 tập: 3 cột đều đặn
    if (episodes.length <= 12) {
      return "grid grid-cols-3 gap-2";
    }
    // Khi nhiều tập (> 12 tập): nhãn chỉ là số ngắn (1, 2, 3...) nên chia 4-5 cột rất gọn gàng
    if (episodes.length <= 25) {
      return "grid grid-cols-4 sm:grid-cols-5 gap-2";
    }
    return "grid grid-cols-4 sm:grid-cols-5 xl:grid-cols-6 gap-2";
  }, [episodes.length, searchQuery, displayEpisodes.length]);

  if (!episodes || episodes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-center text-sm text-gray-400">
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
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-red-500/60 transition"
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
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x overscroll-x-contain">
          {chunks.map((chunk) => {
            const isSelected = activeChunk === chunk.index;
            return (
              <button
                key={chunk.index}
                type="button"
                onClick={() => setActiveChunk(chunk.index)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                  isSelected
                    ? "bg-white text-black border-white shadow-sm font-bold scale-102"
                    : "bg-zinc-900/90 text-gray-400 hover:text-white hover:bg-zinc-800 border-white/10"
                }`}
              >
                {chunk.label}
              </button>
            );
          })}
        </div>
      )}

      {/* LƯỚI TẬP PHIM THIẾT KẾ MỚI: Bố cục thích ứng, nhãn trực quan, equalizer đang phát sống động */}
      {displayEpisodes.length > 0 ? (
        <div className={gridClasses}>
          {displayEpisodes.map((tap, tapIdx) => {
            const tapSlug = tap.slug || `ep-${tapIdx + 1}`;
            const tapName = tap.name || `Tập ${tapIdx + 1}`;
            const isActive = Boolean(activeEpisodeSlug && activeEpisodeSlug === tap.slug);
            const isWatched = Boolean(tap.slug && watchedList.includes(tap.slug));
            const displayLabel = getFormattedEpisodeLabel(tapName, tapIdx + 1, isFewEpisodes);

            return (
              <Link
                key={tapSlug}
                href={`?ep=${tapSlug}`}
                scroll={false}
                title={tapName}
                onClick={(e) => {
                  if (switchEpisode && tap.slug) {
                    e.preventDefault();
                    switchEpisode(tap.slug);
                  }
                }}
                className={`relative flex items-center justify-center text-center transition-all duration-200 group rounded-xl sm:rounded-2xl cursor-pointer select-none ${
                  episodes.length === 1
                    ? "py-3 px-4 text-xs sm:text-sm"
                    : isFewEpisodes
                    ? "py-2.5 px-3 text-xs sm:text-[13px]"
                    : "py-2 sm:py-2.5 px-1 text-xs"
                } ${
                  isActive
                    ? "bg-gradient-to-br from-red-600 via-netflix-red to-rose-700 text-white font-black shadow-[0_4px_18px_rgba(229,9,20,0.45)] border border-red-400/60 scale-[1.01] z-10"
                    : isWatched
                    ? "bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/15"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border border-white/10 hover:border-white/25 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                }`}
              >
                <div className="flex items-center justify-center gap-2 w-full min-w-0">
                  {/* Equalizer 3 cột sóng âm sống động khi tập đang phát */}
                  {isActive && (
                    <span className="flex items-end gap-[2px] h-3.5 shrink-0" aria-hidden="true" title="Đang phát">
                      <span className="w-[2px] bg-white rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-2" />
                      <span className="w-[2px] bg-white rounded-full animate-[pulse_1.1s_ease-in-out_infinite_0.2s] h-3.5" />
                      <span className="w-[2px] bg-white rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.4s] h-2" />
                    </span>
                  )}

                  <span className="truncate font-bold tracking-tight whitespace-nowrap">
                    {displayLabel}
                  </span>

                  {/* Khi chỉ có 1 tập duy nhất và đang phát: hiển thị thêm tag Đang phát */}
                  {episodes.length === 1 && isActive && (
                    <span className="text-[11px] sm:text-xs font-semibold text-white/90 shrink-0 ml-1 px-2 py-0.5 rounded-full bg-black/25 border border-white/20">
                      Đang phát
                    </span>
                  )}

                  {/* Icon Checkmark tinh tế cho tập đã xem */}
                  {!isActive && isWatched && (
                    <span
                      title="Đã xem"
                      className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                    </span>
                  )}
                </div>
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
});

export default EpisodeList;
