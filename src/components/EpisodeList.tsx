"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Check, Search, X, Play, ChevronRight, ChevronDown } from "lucide-react";
import { getWatchedEpisodes } from "@/lib/episodeTracker";
import { getShortEpisodeLabel, formatEpisodeName } from "@/lib/formatEpisode";
import { useWatchController } from "./WatchController";
import { ScrollablePillsRow } from "@/components/ui/ScrollablePillsRow";
import { getMovieEpisodesProgress } from "@/lib/watchHistory";

import WatchlistButton from "@/components/WatchlistButton";
import AddToCollectionButton from "@/components/Collections/AddToCollectionButton";

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
  movieTitle?: string;
  moviePoster?: string;
  movieYear?: number | string;
  movieQuality?: string;
  movieCategory?: string;
}

/**
 * Định dạng nhãn hiển thị tập phim thông minh và thẩm mỹ:
 * - Khi phim ít tập (<= 12 tập): Hiện đầy đủ "Tập 01", "Tập 02" hoặc "Bản Full"
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
  movieTitle: propMovieTitle,
  moviePoster: propMoviePoster,
  movieYear: propMovieYear,
  movieQuality: propMovieQuality,
  movieCategory: propMovieCategory,
}) {
  const watchContext = useWatchController();
  const episodes = watchContext?.episodes ?? propEpisodes;
  const activeEpisodeSlug = watchContext?.activeEpisodeSlug ?? propActiveEpisodeSlug;
  const switchEpisode = watchContext?.switchEpisode ?? onSelectEpisode;

  const movieTitle = watchContext?.movieTitle || propMovieTitle || movieSlug;
  const moviePoster = watchContext?.posterUrl || propMoviePoster || "/default-poster.jpg";
  const movieYear = watchContext?.year || propMovieYear;
  const movieQuality = watchContext?.quality || propMovieQuality;
  const movieCategory = watchContext?.category || propMovieCategory;

  const [watchedList, setWatchedList] = useState<string[]>([]);
  const [episodesProgress, setEpisodesProgress] = useState<
    Record<string, { progressSeconds: number; durationSeconds?: number }>
  >({});
  const [searchQuery, setSearchQuery] = useState("");

  // Tìm index của tập đang phát để tự động nhảy đúng tab dải tập
  const activeEpisodeIndex = useMemo(() => {
    return episodes.findIndex((tap) => tap.slug === activeEpisodeSlug);
  }, [episodes, activeEpisodeSlug]);

  const currentActiveEpisode = useMemo(() => {
    return episodes.find((tap) => tap.slug === activeEpisodeSlug) || (activeEpisodeIndex >= 0 ? episodes[activeEpisodeIndex] : undefined);
  }, [episodes, activeEpisodeSlug, activeEpisodeIndex]);

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

  // Tự động cuộn đến tập phim đang phát khi active episode thay đổi (chỉ trong container nội bộ, không cuộn window lúc mở trang)
  const activeItemRef = React.useRef<HTMLAnchorElement | null>(null);
  const isInitialMount = React.useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (activeEpisodeSlug && activeItemRef.current) {
      const scrollTimer = setTimeout(() => {
        const scrollParent = activeItemRef.current?.closest(".overflow-y-auto");
        if (scrollParent) {
          activeItemRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      }, 50);
      return () => clearTimeout(scrollTimer);
    }
  }, [activeEpisodeSlug, activeChunk]);

  useEffect(() => {
    // Đọc danh sách tập đã xem và tiến trình từng tập
    setWatchedList(getWatchedEpisodes(movieSlug));
    setEpisodesProgress(getMovieEpisodesProgress(movieSlug));

    const handleWatchedUpdate = () => {
      setWatchedList(getWatchedEpisodes(movieSlug));
    };

    const handleProgressUpdate = () => {
      setEpisodesProgress(getMovieEpisodesProgress(movieSlug));
    };

    window.addEventListener("watched-episodes-updated", handleWatchedUpdate);
    window.addEventListener("watch-progress-updated", handleProgressUpdate);
    return () => {
      window.removeEventListener("watched-episodes-updated", handleWatchedUpdate);
      window.removeEventListener("watch-progress-updated", handleProgressUpdate);
    };
  }, [movieSlug]);

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

  // Lọc danh sách tập hiển thị thông minh (hỗ trợ số thuần túy hoặc từ khóa)
  const displayEpisodes = useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) {
      if (totalChunks > 1) {
        const start = activeChunk * CHUNK_SIZE;
        return episodes.slice(start, start + CHUNK_SIZE);
      }
      return episodes;
    }

    const query = rawQuery.toLowerCase();
    const cleanNum = query.replace(/^(tập|tap|ep|ep\.|#)\s*/i, "").trim();

    return episodes.filter((tap, idx) => {
      const name = (tap.name || "").toLowerCase();
      const slug = (tap.slug || "").toLowerCase();

      // Khớp theo tên hoặc slug
      if (name.includes(query) || slug.includes(query)) return true;

      // Khớp theo số nếu người dùng gõ số (vd: 199, 59)
      if (cleanNum) {
        const shortNum = getShortEpisodeLabel(tap.name, String(idx + 1)).toLowerCase();
        if (shortNum === cleanNum || shortNum.startsWith(cleanNum)) return true;
        const slugNum = slug.replace(/^(tap|ep)[-_\s]*/i, "");
        if (slugNum === cleanNum || slugNum.startsWith(cleanNum)) return true;
      }
      return false;
    });
  }, [episodes, searchQuery, totalChunks, activeChunk]);

  // Kiểm tra số lượng tập để căn chỉnh bố cục lưới phù hợp nhất
  const isFewEpisodes = episodes.length <= 12;
  const isSearching = Boolean(searchQuery.trim());

  const gridClasses = useMemo(() => {
    // Nếu đang tìm kiếm: giữ lưới gọn gàng và không bao giờ kéo giãn 100%
    if (isSearching) {
      if (displayEpisodes.length <= 4) return "grid grid-cols-2 sm:grid-cols-3 gap-2";
      if (displayEpisodes.length <= 8) return "grid grid-cols-3 sm:grid-cols-4 gap-2";
      return "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2";
    }

    // Khi chỉ có 1 tập duy nhất (phim lẻ): nút trải dài full chiều ngang
    if (episodes.length === 1) {
      return "grid grid-cols-1";
    }
    // Khi có từ 2 đến 4 tập: chia 2 cột để mỗi nút đủ rộng hiển thị trọn vẹn "Tập 01", "Tập 02"
    if (episodes.length <= 4) {
      return "grid grid-cols-2 gap-2.5";
    }
    // Khi có từ 5 đến 8 tập
    if (episodes.length <= 8) {
      return "grid grid-cols-2 sm:grid-cols-3 gap-2.5";
    }
    // Khi có từ 9 đến 12 tập
    if (episodes.length <= 12) {
      return "grid grid-cols-2 min-[360px]:grid-cols-3 gap-2";
    }
    // Khi nhiều tập (> 12 tập): nhãn chỉ là số ngắn (1, 2, 3...)
    if (episodes.length <= 25) {
      return "grid grid-cols-4 min-[400px]:grid-cols-5 gap-2";
    }
    return "grid grid-cols-4 min-[400px]:grid-cols-5 sm:grid-cols-6 gap-2";
  }, [episodes.length, isSearching, displayEpisodes.length]);

  if (!episodes || episodes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 text-center text-sm text-zinc-400">
        Chưa có danh sách tập phim
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Ô TÌM NHANH SỐ TẬP (Hiển thị khi phim có từ 12 tập trở lên) */}
      {episodes.length > 12 && (
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-netflix-red transition-colors" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm nhanh số tập (vd: 1, 59, 199)..."
            aria-label="Tìm nhanh số tập"
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red/70 focus:bg-zinc-900/95 focus:ring-1 focus:ring-netflix-red/30 transition shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 hover:bg-white/10 rounded-full transition"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* THANH THÔNG BÁO KẾT QUẢ TÌM KIẾM */}
      {isSearching && (
        <div className="flex items-center justify-between text-xs text-zinc-400 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-netflix-red shrink-0" />
            <span className="truncate">
              Tìm thấy <strong className="text-white font-bold">{displayEpisodes.length}</strong> tập phù hợp
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-[11px] text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer shrink-0 ml-2 bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg active:scale-95"
          >
            <span>Xóa lọc</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* THANH ĐIỀU KHIỂN LƯU TẬP PHIM ĐANG CHỌN (Chỉ hiện khi không tìm kiếm để tránh rối mắt) */}
      {!isSearching && currentActiveEpisode?.slug && episodes.length > 1 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-zinc-900/90 to-zinc-950/90 border border-white/10 text-xs shadow-sm">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" aria-hidden="true" />
            <span className="text-zinc-300 truncate text-[11px] sm:text-xs">
              Tập đang chọn: <span className="text-white font-semibold">{currentActiveEpisode.name || currentActiveEpisode.slug}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <WatchlistButton
              movie={{
                slug: `${movieSlug}__ep__${currentActiveEpisode.slug}`,
                title: `${movieTitle} - ${currentActiveEpisode.name || currentActiveEpisode.slug}`,
                poster: moviePoster,
                imageUrl: moviePoster,
                year: movieYear,
                quality: movieQuality,
                category: movieCategory,
                itemType: "episode",
                seriesSlug: movieSlug,
                seriesTitle: movieTitle,
                episodeSlug: currentActiveEpisode.slug,
                episodeName: currentActiveEpisode.name || currentActiveEpisode.slug,
              }}
              variant="player"
              className="!px-2 !py-1 text-[11px]"
              label="Lưu tập"
            />
            <AddToCollectionButton
              movie={{
                slug: `${movieSlug}__ep__${currentActiveEpisode.slug}`,
                title: `${movieTitle} - ${currentActiveEpisode.name || currentActiveEpisode.slug}`,
                poster: moviePoster,
                year: movieYear,
                quality: movieQuality,
                category: movieCategory,
                itemType: "episode",
                seriesSlug: movieSlug,
                seriesTitle: movieTitle,
                episodeSlug: currentActiveEpisode.slug,
                episodeName: currentActiveEpisode.name || currentActiveEpisode.slug,
              }}
              variant="player"
              className="!px-2 !py-1 text-[11px]"
              label="Bộ sưu tập"
            />
          </div>
        </div>
      )}

      {/* DẢI TABS PHÂN NHÓM TẬP + NÚT CHỌN NHANH DẢI TẬP (Khi có trên 25 tập và không trong chế độ tìm kiếm) */}
      {!isSearching && chunks.length > 1 && (
        <div className="space-y-1.5">
          {chunks.length > 3 && (
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>Dải tập</span>
                <span className="text-[10px] text-zinc-500 font-mono">({chunks.length} dải)</span>
              </span>

              {/* Menu nhảy nhanh đến dải tập (hữu ích cho phim 1000+ tập như Conan/One Piece) */}
              <div className="relative flex items-center">
                <select
                  value={activeChunk}
                  onChange={(e) => setActiveChunk(Number(e.target.value))}
                  aria-label="Nhảy nhanh đến dải tập"
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[11px] font-semibold rounded-lg px-2 py-1 pr-6 border border-white/15 outline-none focus:border-netflix-red cursor-pointer transition appearance-none"
                >
                  {chunks.map((c) => (
                    <option key={c.index} value={c.index} className="bg-zinc-950 text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1.5 pointer-events-none" />
              </div>
            </div>
          )}

          <ScrollablePillsRow innerClassName="flex items-center gap-1.5 py-0.5 px-0.5">
            {chunks.map((chunk) => {
              const isSelected = activeChunk === chunk.index;
              return (
                <button
                  key={chunk.index}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActiveChunk(chunk.index)}
                  className={`px-3 py-1.5 min-h-[32px] rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer select-none border ${
                    isSelected
                      ? "bg-white text-zinc-950 border-white shadow-md shadow-white/10 font-black scale-[1.02]"
                      : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border-white/10 hover:border-white/20"
                  }`}
                >
                  {chunk.label}
                </button>
              );
            })}
          </ScrollablePillsRow>
        </div>
      )}

      {/* TRƯỜNG HỢP TÌM KIẾM CHỈ RA 1 TẬP: HIỂN THỊ THẺ TẬP NỔI BẬT CAO CẤP */}
      {isSearching && displayEpisodes.length === 1 && (() => {
        const singleTap = displayEpisodes[0];
        const tapSlug = singleTap.slug || `ep-1`;
        const tapName = singleTap.name || `Tập 1`;
        const isActive = Boolean(activeEpisodeSlug && activeEpisodeSlug === singleTap.slug);
        const isWatched = Boolean(singleTap.slug && watchedList.includes(singleTap.slug));
        const epIndex = episodes.findIndex((e) => e.slug === singleTap.slug);
        const chunkIdx = epIndex >= 0 ? Math.floor(epIndex / CHUNK_SIZE) : -1;
        const chunkObj = chunkIdx >= 0 ? chunks[chunkIdx] : null;

        return (
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-black border border-white/15 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                    isActive
                      ? "bg-gradient-to-br from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/40 ring-1 ring-white/30"
                      : "bg-white/10 text-white border border-white/15"
                  }`}
                >
                  {isActive ? (
                    <span className="flex items-end gap-[2px] h-3.5" title="Đang phát">
                      <span className="w-[2px] bg-white rounded-full animate-pulse h-2" />
                      <span className="w-[2px] bg-white rounded-full animate-pulse h-3.5" />
                      <span className="w-[2px] bg-white rounded-full animate-pulse h-2" />
                    </span>
                  ) : (
                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate flex items-center gap-2">
                    <span>{formatEpisodeName(tapName)}</span>
                    {isActive && (
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-netflix-red/30 text-rose-300 border border-netflix-red/40 shrink-0">
                        Đang phát
                      </span>
                    )}
                    {!isActive && isWatched && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                        <Check className="w-2.5 h-2.5" /> Đã xem
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {movieTitle} • Vị trí: Tập {epIndex >= 0 ? epIndex + 1 : 1} / {episodes.length}
                  </p>
                </div>
              </div>

              {/* Nút phát nhanh */}
              <Link
                href={`?ep=${tapSlug}`}
                scroll={false}
                onClick={(e) => {
                  if (switchEpisode && singleTap.slug) {
                    e.preventDefault();
                    switchEpisode(singleTap.slug);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-zinc-800 text-zinc-300 border border-white/10 cursor-default"
                    : "bg-netflix-red hover:bg-red-600 text-white shadow-md shadow-red-600/30 active:scale-95 cursor-pointer"
                }`}
              >
                {isActive ? "Đang chọn" : "Phát ngay"}
              </Link>
            </div>

            {/* Nút hành động thông minh: Nhảy đến dải tập tương ứng */}
            {chunkObj && (
              <button
                type="button"
                onClick={() => {
                  setActiveChunk(chunkIdx);
                  setSearchQuery("");
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition text-xs text-zinc-300 hover:text-white group cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 truncate">
                  <span>Xem trong dải tập:</span>
                  <strong className="text-white font-semibold">{chunkObj.label}</strong>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            )}
          </div>
        );
      })()}

      {/* LƯỚI TẬP PHIM THIẾT KẾ MỚI: Bố cục thích ứng, phím cơ Cinema sang trọng, equalizer sinh động */}
      {displayEpisodes.length > 0 ? (
        // Chỉ render lưới này khi không phải trường hợp 1 tập duy nhất trong tìm kiếm (đã hiển thị Card ở trên)
        (!isSearching || displayEpisodes.length > 1) && (
          <div className={gridClasses}>
            {displayEpisodes.map((tap, tapIdx) => {
              const tapSlug = tap.slug || `ep-${tapIdx + 1}`;
              const tapName = tap.name || `Tập ${tapIdx + 1}`;
              const isActive = Boolean(activeEpisodeSlug && activeEpisodeSlug === tap.slug);
              const isWatched = Boolean(tap.slug && watchedList.includes(tap.slug));
              
              // Nhãn nút: nếu đang tìm kiếm thì hiển thị "Tập X" rõ ràng, nếu xem dải thường thì rút gọn số
              const displayLabel = isSearching
                ? (tapName.toLowerCase().startsWith("tập") ? tapName : `Tập ${getShortEpisodeLabel(tapName, String(tapIdx + 1))}`)
                : getFormattedEpisodeLabel(tapName, tapIdx + 1, isFewEpisodes);

              // Tiến trình xem dở cho tập này (>= 10 giây và chưa hoàn thành)
              const epProg = tap.slug ? episodesProgress[tap.slug] : undefined;
              const progressSeconds = epProg?.progressSeconds || 0;
              const durationSeconds = epProg?.durationSeconds || 0;
              const isPartiallyWatched = !isActive && !isWatched && progressSeconds >= 10;
              const progressPercent = isPartiallyWatched
                ? durationSeconds > 0
                  ? Math.min(95, Math.max(8, Math.round((progressSeconds / durationSeconds) * 100)))
                  : 35
                : 0;

              const formatSec = (s: number) => {
                const m = Math.floor(s / 60);
                const sec = (s % 60).toString().padStart(2, "0");
                return `${m}:${sec}`;
              };
              const itemTitle = isPartiallyWatched
                ? `${tapName} • Đang xem dở (${formatSec(progressSeconds)}${durationSeconds > 0 ? ` / ${formatSec(durationSeconds)}` : ""})`
                : tapName;

              return (
                <Link
                  key={`${tapSlug}-${tapIdx}`}
                  ref={isActive ? activeItemRef : null}
                  href={`?ep=${tapSlug}`}
                  scroll={false}
                  tabIndex={0}
                  aria-current={isActive ? "page" : undefined}
                  title={itemTitle}
                  onClick={(e) => {
                    if (switchEpisode && tap.slug) {
                      e.preventDefault();
                      switchEpisode(tap.slug);
                    }
                  }}
                  className={`relative flex items-center justify-center text-center transition-all duration-200 group rounded-xl cursor-pointer select-none outline-none overflow-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:scale-[1.04] focus-visible:z-20 min-h-[40px] sm:min-h-[42px] ${
                    episodes.length === 1
                      ? "py-3 px-4 text-xs sm:text-sm font-bold"
                      : isFewEpisodes
                      ? "py-2.5 px-2 sm:px-3 text-xs sm:text-[13px] font-bold"
                      : "py-2 px-1 text-xs sm:text-[13px] font-bold"
                  } ${
                    isActive
                      ? "bg-gradient-to-br from-red-600 via-netflix-red to-rose-700 text-white font-black shadow-lg shadow-netflix-red/40 border border-white/30 scale-[1.03] z-10 ring-1 ring-white/20"
                      : isWatched
                      ? "bg-zinc-950/70 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/15"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border border-white/10 hover:border-white/25 hover:scale-[1.03] active:scale-[0.97] shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full min-w-0 px-1">
                    {/* Equalizer 3 cột sóng âm sống động khi tập đang phát */}
                    {isActive && (
                      <span className="flex items-end gap-[2px] h-3 shrink-0" aria-hidden="true" title="Đang phát">
                        <span className="w-[2px] bg-white rounded-full animate-[pulse_0.7s_ease-in-out_infinite] h-2" />
                        <span className="w-[2px] bg-white rounded-full animate-[pulse_1.1s_ease-in-out_infinite_0.2s] h-3" />
                        <span className="w-[2px] bg-white rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.4s] h-2" />
                      </span>
                    )}

                    <span className="truncate tracking-tight font-bold whitespace-nowrap">
                      {displayLabel}
                    </span>

                    {/* Khi chỉ có 1 tập duy nhất và đang phát: hiển thị thêm tag Đang phát */}
                    {episodes.length === 1 && isActive && (
                      <span className="text-[10px] sm:text-[11px] font-semibold text-white/90 shrink-0 ml-1 px-1.5 py-0.5 rounded-full bg-black/25 border border-white/20">
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

                  {/* Vạch tiến trình mini 2.5px ở đáy nút (Chuẩn Netflix) cho tập đang xem dở */}
                  {isPartiallyWatched && progressPercent > 0 && (
                    <div
                      className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/15 overflow-hidden pointer-events-none"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full bg-netflix-red rounded-r-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-6 text-center space-y-2 animate-in fade-in duration-150">
          <p className="text-sm font-semibold text-zinc-300">Không tìm thấy tập &ldquo;{searchQuery}&rdquo;</p>
          <p className="text-xs text-zinc-500">Thử tìm theo số tập (ví dụ: 1, 59, 199) hoặc xóa bộ lọc.</p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition active:scale-95 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa tìm kiếm</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default EpisodeList;
