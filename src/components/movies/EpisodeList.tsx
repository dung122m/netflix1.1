"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Check, Search, X, Play, ChevronRight, ChevronDown, ChevronUp, Target } from "lucide-react";
import { getWatchedEpisodes, unmarkEpisodeAsWatched, extractEpisodeNumber } from "@/lib/episodeTracker";
import { getShortEpisodeLabel, formatEpisodeName, findEpisodeMatch } from "@/lib/formatEpisode";
import { useWatchController, EpisodeItem } from "@/components/cinema/WatchController";
import { ScrollablePillsRow } from "@/components/ui/ScrollablePillsRow";
import { Tooltip } from "@/components/ui/Tooltip";
import { getMovieEpisodesProgress, EpisodeProgressData } from "@/lib/watchHistory";

import WatchlistButton from "@/components/movies/WatchlistButton";
import AddToCollectionButton from "@/components/Collections/AddToCollectionButton";

const CHUNK_SIZE = 25;

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
    Record<string, EpisodeProgressData>
  >({});
  const [searchQuery, setSearchQuery] = useState("");

  // Tìm tập phim đang phát chuẩn xác bằng findEpisodeMatch (hỗ trợ tập 01 <-> 1, dải tập 39-40)
  const currentActiveEpisode = useMemo(() => {
    return (
      episodes.find((tap) => tap.slug === activeEpisodeSlug) ||
      findEpisodeMatch(episodes, activeEpisodeSlug)
    );
  }, [episodes, activeEpisodeSlug]);

  // Tìm index của tập đang phát để tự động nhảy đúng tab dải tập
  const activeEpisodeIndex = useMemo(() => {
    if (!currentActiveEpisode) return -1;
    return episodes.findIndex((tap) => tap.slug === currentActiveEpisode.slug);
  }, [episodes, currentActiveEpisode]);

  const initialChunk = useMemo(() => {
    if (activeEpisodeIndex >= 0) {
      return Math.floor(activeEpisodeIndex / CHUNK_SIZE);
    }
    return 0;
  }, [activeEpisodeIndex]);

  const [activeChunk, setActiveChunk] = useState<number>(initialChunk);
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const [isChunkDropdownOpen, setIsChunkDropdownOpen] = useState<boolean>(false);
  const chunkDropdownRef = React.useRef<HTMLDivElement | null>(null);

  // Click outside listener đóng dropdown chọn dải tập
  useEffect(() => {
    if (!isChunkDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (chunkDropdownRef.current && !chunkDropdownRef.current.contains(e.target as Node)) {
        setIsChunkDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isChunkDropdownOpen]);

  // Tự động thu gọn danh sách tập trên mobile khi đổi dải tập
  useEffect(() => {
    setIsMobileExpanded(false);
  }, [activeChunk]);

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
    const currentWatched = getWatchedEpisodes(movieSlug);
    const currentProgress = getMovieEpisodesProgress(movieSlug);
    setWatchedList(currentWatched);
    setEpisodesProgress(currentProgress);

    // Tự động giải phóng những tập bị lưu nhầm nếu tiến trình thực tế chỉ mới xem dở (< 90%)
    for (const [epSlug, epData] of Object.entries(currentProgress)) {
      if (
        epData?.durationSeconds &&
        epData.durationSeconds > 0 &&
        !epData.isCompleted &&
        epData.progressSeconds / epData.durationSeconds < 0.9
      ) {
        if (currentWatched.includes(epSlug)) {
          unmarkEpisodeAsWatched(movieSlug, epSlug);
        }
      }
    }

    const handleWatchedUpdate = () => {
      setWatchedList(getWatchedEpisodes(movieSlug));
    };

    const handleProgressUpdate = () => {
      const updatedProg = getMovieEpisodesProgress(movieSlug);
      setEpisodesProgress(updatedProg);
    };

    window.addEventListener("watched-episodes-updated", handleWatchedUpdate);
    window.addEventListener("watch-progress-updated", handleProgressUpdate);
    return () => {
      window.removeEventListener("watched-episodes-updated", handleWatchedUpdate);
      window.removeEventListener("watch-progress-updated", handleProgressUpdate);
    };
  }, [movieSlug]);

  // Tập hợp các số tập đã xem từ cả watchedList và episodesProgress (hỗ trợ chuyển server và slug không đồng nhất)
  const watchedEpisodeNums = useMemo(() => {
    const set = new Set<number>();
    for (const item of watchedList) {
      const num = extractEpisodeNumber(item);
      if (num !== null) {
        // Nếu có bản ghi tiến trình mâu thuẫn (< 90% và chưa hoàn thành), không tính là đã xem
        const prog = Object.entries(episodesProgress).find(([k, d]) => {
          const n = extractEpisodeNumber(k) ?? extractEpisodeNumber(d?.episodeName);
          return n === num;
        })?.[1];
        if (
          prog?.durationSeconds &&
          prog.durationSeconds > 0 &&
          !prog.isCompleted &&
          prog.progressSeconds / prog.durationSeconds < 0.9
        ) {
          continue;
        }
        set.add(num);
      }
    }
    for (const [epSlug, epData] of Object.entries(episodesProgress)) {
      if (
        epData?.isCompleted ||
        (epData?.durationSeconds &&
          epData.durationSeconds > 0 &&
          epData.progressSeconds / epData.durationSeconds >= 0.9)
      ) {
        const num = extractEpisodeNumber(epSlug) ?? extractEpisodeNumber(epData?.episodeName);
        if (num !== null) set.add(num);
      }
    }
    return set;
  }, [watchedList, episodesProgress]);

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
      return "grid grid-cols-3 min-[360px]:grid-cols-4 min-[460px]:grid-cols-5 gap-2";
    }
    return "grid grid-cols-3 min-[360px]:grid-cols-4 min-[460px]:grid-cols-5 sm:grid-cols-6 gap-2";
  }, [episodes.length, isSearching, displayEpisodes.length]);

  if (!episodes || episodes.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-950/60 p-4 text-center text-sm text-zinc-400">
        Chưa có danh sách tập phim
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2">
      {/* 1. KHUNG ĐIỀU KHIỂN CỐ ĐỊNH (SEARCH + TẬP ĐANG CHỌN + DẢI TẬP) - GHIM ĐẦU, KHÔNG CUỘN MẤT */}
      <div className="flex-shrink-0 space-y-1.5">
        {/* Ô TÌM NHANH SỐ TẬP (Hiển thị khi phim có từ 12 tập trở lên) */}
        {episodes.length > 12 && (
          <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-netflix-red transition-colors" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh số tập (vd: 1, 59, 199)..."
              aria-label="Tìm nhanh số tập"
              className="w-full pl-8 pr-8 py-2 sm:py-1.5 rounded-lg bg-zinc-900/90 text-base sm:text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-netflix-red/70 focus:bg-zinc-900/95 focus:ring-1 focus:ring-netflix-red/30 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Xóa nội dung tìm kiếm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 hover:bg-white/10 rounded-full transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* THANH THÔNG BÁO KẾT QUẢ TÌM KIẾM */}
        {isSearching && (
          <div className="flex items-center justify-between text-xs text-zinc-400 px-2.5 py-1 rounded-lg bg-white/[0.04] animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-netflix-red shrink-0" />
              <span className="truncate text-[11px]">
                Tìm thấy <strong className="text-white font-bold">{displayEpisodes.length}</strong> tập phù hợp
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[10px] text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer shrink-0 ml-2 bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded active:scale-95"
            >
              <span>Xóa lọc</span>
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN LƯU TẬP PHIM ĐANG CHỌN (CHỈ HIỆN KHI DẢI TẬP ÍT ĐỂ KHÔNG LÃNG PHÍ CHIỀU DỌC) */}
        {!isSearching && currentActiveEpisode?.slug && episodes.length > 1 && chunks.length <= 4 && (
          <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/70 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" aria-hidden="true" />
              <span className="text-zinc-300 truncate text-[11px]">
                Đang chọn: <span className="text-white font-semibold">{currentActiveEpisode.name || currentActiveEpisode.slug}</span>
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
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
                className="!px-2 !py-1 !min-h-[32px] sm:!min-h-[26px] !text-[11px]"
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
                className="!px-2 !py-1 !min-h-[32px] sm:!min-h-[26px] !text-[11px]"
                label="Bộ sưu tập"
              />
            </div>
          </div>
        )}

        {/* DẢI TABS PHÂN NHÓM TẬP + NÚT CHỌN NHANH DẢI TẬP */}
        {!isSearching && chunks.length > 1 && (
          <div className="space-y-1">
            {chunks.length > 4 ? (
              /* KHI CÓ NHIỀU DẢI TẬP (> 4 dải, vd Conan 41 dải): Thu gọn thành 1 hàng duy nhất kèm nút nhảy về tập đang xem */
              <div className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-zinc-900/80">
                <div className="relative flex-1 min-w-0" ref={chunkDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsChunkDropdownOpen((prev) => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={isChunkDropdownOpen}
                    aria-label="Chọn dải tập phim"
                    className="w-full flex items-center justify-between gap-2 bg-zinc-800/80 hover:bg-zinc-800 text-white text-xs font-bold py-2 sm:py-1.5 min-h-[36px] sm:min-h-[30px] pl-2.5 pr-2 rounded-md transition cursor-pointer text-left"
                  >
                    <span className="truncate">
                      {chunks[activeChunk]?.label || `Tập ${activeChunk * CHUNK_SIZE + 1} - ${(activeChunk + 1) * CHUNK_SIZE}`}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isChunkDropdownOpen ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>

                  {/* MENU DROPDOWN CUSTOM SANG TRỌNG CHUẨN CINEMA (KHÔNG DÙNG NATIVE SELECT) */}
                  {isChunkDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-full min-w-0 sm:min-w-[210px] max-h-64 overflow-y-auto rounded-xl bg-zinc-950/98 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] p-1 z-50 animate-in fade-in zoom-in-95 duration-150 scrollbar-thin">
                      {chunks.map((c) => {
                        const isSelected = c.index === activeChunk;
                        const isPlaying = c.index === initialChunk;
                        return (
                          <button
                            key={c.index}
                            type="button"
                            onClick={() => {
                              setActiveChunk(c.index);
                              setIsChunkDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left cursor-pointer ${
                              isSelected
                                ? "bg-netflix-red text-white font-bold shadow-sm"
                                : "text-zinc-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span className="truncate">{c.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {isPlaying && (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  isSelected ? "bg-black/30 text-emerald-200" : "bg-emerald-500/20 text-emerald-300"
                                }`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>Đang phát</span>
                                </span>
                              )}
                              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Nút nhảy nhanh về dải tập đang xem nếu người dùng đang duyệt dải khác */}
                {activeChunk !== initialChunk && activeEpisodeIndex >= 0 ? (
                  <Tooltip
                    content={`Chuyển về dải tập chứa ${currentActiveEpisode?.name || "tập đang phát"}`}
                    side="top"
                    align="end"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChunk(initialChunk);
                        setIsChunkDropdownOpen(false);
                      }}
                      aria-label={`Chuyển về dải tập chứa ${currentActiveEpisode?.name || "tập đang phát"}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-netflix-red hover:brightness-110 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer shrink-0 animate-in fade-in"
                    >
                      <Target className="w-3 h-3 shrink-0" />
                      <span className="truncate max-w-[130px]">Về {currentActiveEpisode?.name || `Tập ${activeEpisodeIndex + 1}`}</span>
                    </button>
                  </Tooltip>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-emerald-400 font-medium shrink-0 bg-emerald-500/10 rounded-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Đang phát {currentActiveEpisode?.name ? `• ${currentActiveEpisode.name}` : ""}</span>
                  </span>
                )}
              </div>
            ) : (
              <ScrollablePillsRow innerClassName="flex items-center gap-1 py-0.5 px-0.5">
                {chunks.map((chunk) => {
                  const isSelected = activeChunk === chunk.index;
                  return (
                    <button
                      key={chunk.index}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setActiveChunk(chunk.index)}
                      className={`px-2.5 py-1.5 min-h-[36px] sm:min-h-[30px] rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer select-none ${
                        isSelected
                          ? "bg-white text-zinc-950 shadow-sm font-black scale-[1.01]"
                          : "bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {chunk.label}
                    </button>
                  );
                })}
              </ScrollablePillsRow>
            )}
          </div>
        )}
      </div>

      {/* 2. KHUNG CUỘN DANH SÁCH TẬP PHIM (TỐI ƯU DESKTOP SIDEBAR, VUỐT MƯỢT KHÔNG BỊ TRAP TRÊN MOBILE) */}
      <div className="flex-1 min-h-0 max-lg:overflow-y-visible lg:overflow-y-auto overscroll-auto overflow-x-hidden px-1.5 custom-scrollbar">

      {/* TRƯỜNG HỢP TÌM KIẾM CHỈ RA 1 TẬP: HIỂN THỊ THẺ TẬP NỔI BẬT CAO CẤP */}
      {isSearching && displayEpisodes.length === 1 && (() => {
        const singleTap = displayEpisodes[0];
        const tapSlug = singleTap.slug || `ep-1`;
        const tapName = singleTap.name || `Tập 1`;
        const isActive = Boolean(activeEpisodeSlug && activeEpisodeSlug === singleTap.slug);
        const singleEpProg = singleTap.slug ? episodesProgress[singleTap.slug] : undefined;
        const singleNum = extractEpisodeNumber(singleTap.slug) ?? extractEpisodeNumber(singleTap.name);
        const singleMatchingProg = singleEpProg || (singleNum !== null ? Object.entries(episodesProgress).find(([k, d]) => {
          const n = extractEpisodeNumber(k) ?? extractEpisodeNumber(d?.episodeName);
          return n === singleNum;
        })?.[1] : undefined);

        const singleProgSec = singleMatchingProg?.progressSeconds || 0;
        const singleDurSec = singleMatchingProg?.durationSeconds || 0;
        const hasValidDur = singleDurSec > 0 && Number.isFinite(singleDurSec);

        const isSingleCompletedFromProg = Boolean(
          singleMatchingProg?.isCompleted ||
          (hasValidDur && singleProgSec / singleDurSec >= 0.9)
        );
        const isSinglePartiallyWatched = Boolean(
          !isSingleCompletedFromProg &&
          hasValidDur &&
          singleProgSec >= 10 &&
          singleProgSec / singleDurSec < 0.9
        );
        const isDirectlyWatched = Boolean(
          singleTap.slug && (watchedList.includes(singleTap.slug) || (singleNum !== null && watchedEpisodeNums.has(singleNum)))
        );
        const isWatched = Boolean(
          !isSinglePartiallyWatched && (
            isSingleCompletedFromProg ||
            isDirectlyWatched
          )
        );
        const epIndex = episodes.findIndex((e) => e.slug === singleTap.slug);
        const chunkIdx = epIndex >= 0 ? Math.floor(epIndex / CHUNK_SIZE) : -1;
        const chunkObj = chunkIdx >= 0 ? chunks[chunkIdx] : null;

        return (
          <div className="p-3.5 my-1 rounded-2xl bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-black shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                    isActive
                      ? "bg-gradient-to-br from-netflix-red to-netflix-red/80 text-white shadow-md shadow-black/50"
                      : "bg-white/10 text-white"
                  }`}
                >
                  {isActive ? (
                    <span className="flex items-end gap-[2px] h-3.5" aria-hidden="true">
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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-netflix-red/25 text-white shrink-0">
                        Đang phát
                      </span>
                    )}
                    {!isActive && isWatched && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1 shrink-0">
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
                prefetch={false}
                scroll={false}
                onClick={(e) => {
                  if (switchEpisode && singleTap.slug) {
                    e.preventDefault();
                    switchEpisode(singleTap.slug);
                  }
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? "bg-zinc-800 text-zinc-300 cursor-default"
                    : "bg-netflix-red hover:brightness-110 text-white shadow-md shadow-black/50 active:scale-95 cursor-pointer"
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition text-xs text-zinc-300 hover:text-white group cursor-pointer"
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
          <>
            <div className={`${gridClasses} p-1`}>
            {displayEpisodes.map((tap, tapIdx) => {
              const tapSlug = tap.slug || `ep-${tapIdx + 1}`;
              const tapName = tap.name || `Tập ${tapIdx + 1}`;
              const isActive = Boolean(
                currentActiveEpisode
                  ? currentActiveEpisode.slug === tap.slug
                  : activeEpisodeSlug && activeEpisodeSlug === tap.slug
              );
              const trueEpIndex = episodes.findIndex((e) => e.slug === tap.slug);
              const fallbackNum = trueEpIndex >= 0 ? trueEpIndex + 1 : null;
              const tapNum = extractEpisodeNumber(tap.slug) ?? extractEpisodeNumber(tap.name) ?? fallbackNum;

              // Tiến trình xem dở và trạng thái hoàn thành cho tập này (hỗ trợ đối chiếu chéo theo slug và số tập)
              const matchingProg = (tap.slug ? episodesProgress[tap.slug] : undefined) ||
                (tapNum !== null ? Object.entries(episodesProgress).find(([k, d]) => {
                  const n = extractEpisodeNumber(k) ?? extractEpisodeNumber(d?.episodeName);
                  return n === tapNum;
                })?.[1] : undefined);

              const progressSeconds = matchingProg?.progressSeconds || 0;
              const durationSeconds = matchingProg?.durationSeconds || 0;
              const hasValidDuration = durationSeconds > 0 && Number.isFinite(durationSeconds);

              // 1. Chỉ coi là hoàn thành khi tiến độ đạt >= 90% hoặc được đánh dấu isCompleted
              const isCompletedFromProg = Boolean(
                matchingProg?.isCompleted ||
                (hasValidDuration && progressSeconds / durationSeconds >= 0.9)
              );

              // 2. Nếu có duration hợp lệ và tiến độ dưới 90% (và chưa completed), đây là tập đang xem dở
              const isPartiallyWatchedProg = Boolean(
                !isCompletedFromProg &&
                hasValidDuration &&
                progressSeconds >= 10 &&
                progressSeconds / durationSeconds < 0.9
              );

              // 3. Khớp trực tiếp từ danh sách đã xem
              const isDirectlyWatched = Boolean(
                tap.slug && (watchedList.includes(tap.slug) || (tapNum !== null && watchedEpisodeNums.has(tapNum)))
              );

              // Một tập CHỈ được coi là đã xem khi:
              // - Đạt >= 90% / isCompleted từ tiến trình
              // - Hoặc có trong danh sách đã xem VÀ KHÔNG có tiến trình xem dở mâu thuẫn (< 90%)
              const isWatched = Boolean(
                !isPartiallyWatchedProg && (
                  isCompletedFromProg ||
                  isDirectlyWatched
                )
              );
              
              // Nhãn nút: nếu đang tìm kiếm thì hiển thị "Tập X" rõ ràng, nếu xem dải thường thì rút gọn số
              const displayLabel = isSearching
                ? (tapName.toLowerCase().startsWith("tập") ? tapName : `Tập ${getShortEpisodeLabel(tapName, String(tapIdx + 1))}`)
                : getFormattedEpisodeLabel(tapName, tapIdx + 1, isFewEpisodes);

              const isPartiallyWatched = !isActive && !isWatched && (isPartiallyWatchedProg || (!hasValidDuration && progressSeconds >= 10));
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

              const isHiddenOnMobile = !isMobileExpanded && !isSearching && displayEpisodes.length > 8 && tapIdx >= 8;

              return (
                <Link
                  key={`${tapSlug}-${tapIdx}`}
                  ref={isActive ? activeItemRef : null}
                  href={`?ep=${tapSlug}`}
                  prefetch={false}
                  scroll={false}
                  tabIndex={0}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={itemTitle}
                  onClick={(e) => {
                    if (switchEpisode && tap.slug) {
                      e.preventDefault();
                      switchEpisode(tap.slug);
                    }
                  }}
                  className={`relative flex items-center justify-center text-center transition-all duration-200 group rounded-xl cursor-pointer select-none outline-none overflow-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:scale-[1.02] focus-visible:z-20 ${
                    isHiddenOnMobile ? "max-lg:hidden" : ""
                  } ${
                    episodes.length === 1
                      ? "py-2.5 px-3 min-h-[38px] text-xs sm:text-sm font-bold"
                      : isFewEpisodes
                      ? "py-2 px-2 sm:px-2.5 min-h-[36px] text-xs sm:text-[13px] font-bold"
                      : "py-2 px-1.5 min-h-[38px] sm:min-h-[34px] text-xs sm:text-[13px] font-bold"
                  } ${
                    isActive
                      ? "bg-gradient-to-br from-netflix-red to-netflix-red/80 text-white font-black shadow-md shadow-black/50 scale-[1.02] ring-1 ring-white/20 z-10"
                      : isWatched
                      ? "bg-zinc-950/70 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:scale-[1.02]"
                      : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white hover:scale-[1.02] active:scale-[0.98] shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full min-w-0 px-1">
                    {/* Equalizer 3 cột sóng âm sống động khi tập đang phát */}
                    {isActive && (
                      <span className="flex items-end gap-[2px] h-3 shrink-0" aria-hidden="true">
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
                      <span className="text-[10px] sm:text-[11px] font-semibold text-white/90 shrink-0 ml-1 px-1.5 py-0.5 rounded-full bg-black/25">
                        Đang phát
                      </span>
                    )}

                    {/* Icon Checkmark tinh tế cho tập đã xem */}
                    {!isActive && isWatched && (
                      <span
                        aria-label="Đã xem"
                        className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0"
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

          {/* Nút Xem thêm / Thu gọn tập phim trên màn hình điện thoại (tránh chiếm quá nhiều chiều dọc màn hình & giúp vuốt trang dễ dàng) */}
          {!isSearching && displayEpisodes.length > 8 && (
            <div className="mt-2.5 px-1 text-center lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileExpanded((prev) => !prev)}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.07] hover:bg-white/12 active:bg-white/15 text-xs font-bold text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                {isMobileExpanded ? (
                  <>
                    <span>Thu gọn danh sách tập</span>
                    <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                  </>
                ) : (
                  <>
                    <span>
                      Xem thêm {displayEpisodes.length - 8} tập còn lại
                      {currentActiveEpisode && displayEpisodes.findIndex((e) => e.slug === currentActiveEpisode.slug) >= 8
                        ? ` (Đang xem: ${currentActiveEpisode.name || currentActiveEpisode.slug})`
                        : ""}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </>
                )}
              </button>
            </div>
          )}
        </>
        )
      ) : (
        <div className="rounded-2xl bg-zinc-950/60 p-6 text-center space-y-2 animate-in fade-in duration-150">
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
    </div>
  );
});

export default EpisodeList;
