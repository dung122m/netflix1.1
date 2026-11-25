"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Check,
  Play,
  ChevronRight,
  Target,
} from "lucide-react";
import {
  getWatchedEpisodes,
  extractEpisodeNumber,
} from "@/lib/episodeTracker";
import {
  getShortEpisodeLabel,
  formatEpisodeName,
  findEpisodeMatch,
  isFullEpisodeLabel,
} from "@/lib/formatEpisode";
import {
  useWatchController,
  EpisodeItem,
} from "@/components/cinema/WatchController";
import {
  getMovieEpisodesProgress,
  EpisodeProgressData,
} from "@/lib/watchHistory";
import WatchlistButton from "@/components/movies/WatchlistButton";
import AddToCollectionButton from "@/components/Collections/AddToCollectionButton";
import { ScrollablePillsRow } from "@/components/ui/ScrollablePillsRow";
import { Tooltip } from "@/components/ui/Tooltip";

const CHUNK_SIZE = 25;

export interface EpisodeListProps {
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

interface EpisodeChunkItem {
  index: number;
  label: string;
}

function getFormattedEpisodeLabel(
  rawName?: string,
  fallbackIndex = 1,
  isFew = false
): string {
  if (isFullEpisodeLabel(rawName)) return "Bản Full";
  const short = getShortEpisodeLabel(rawName, String(fallbackIndex));
  const lower = short.toLowerCase();

  if (lower === "full" || lower === "bản full") return "Bản Full";
  if (lower === "trailer") return "Trailer";

  if (isFew) {
    const trimmed = (rawName || "").trim();
    if (/^tập\s+/i.test(trimmed)) return trimmed;
    return `Tập ${short}`;
  }

  return short;
}

function getEpisodeWatchStatus(
  tapSlug: string,
  tapName: string,
  fallbackNum: number | null,
  episodesProgress: Record<string, EpisodeProgressData>,
  watchedList: string[],
  watchedEpisodeNums: Set<number>,
  isActive: boolean
) {
  const tapNum =
    extractEpisodeNumber(tapSlug) ??
    extractEpisodeNumber(tapName) ??
    fallbackNum;

  const matchingProg =
    (tapSlug ? episodesProgress[tapSlug] : undefined) ||
    (tapNum !== null
      ? Object.entries(episodesProgress).find(([k, d]) => {
          const n =
            extractEpisodeNumber(k) ??
            extractEpisodeNumber(d?.episodeName);
          return n === tapNum;
        })?.[1]
      : undefined);

  const progressSeconds = matchingProg?.progressSeconds || 0;
  const durationSeconds = matchingProg?.durationSeconds || 0;
  const hasValidDuration = durationSeconds > 0 && Number.isFinite(durationSeconds);

  const isCompleted = Boolean(
    matchingProg?.isCompleted ||
      (hasValidDuration && progressSeconds / durationSeconds >= 0.9)
  );

  const isPartiallyWatchedProg = Boolean(
    !isCompleted &&
      hasValidDuration &&
      progressSeconds >= 10 &&
      progressSeconds / durationSeconds < 0.9
  );

  const isDirectlyWatched = Boolean(
    tapSlug &&
      (watchedList.includes(tapSlug) ||
        (tapNum !== null && watchedEpisodeNums.has(tapNum)))
  );

  const isWatched = Boolean(
    !isPartiallyWatchedProg && (isCompleted || isDirectlyWatched)
  );

  const isPartiallyWatched =
    !isActive &&
    !isWatched &&
    (isPartiallyWatchedProg || (!hasValidDuration && progressSeconds >= 10));

  const progressPercent = isPartiallyWatched
    ? durationSeconds > 0
      ? Math.min(95, Math.max(8, Math.round((progressSeconds / durationSeconds) * 100)))
      : 35
    : 0;

  return {
    tapNum,
    isWatched,
    isPartiallyWatched,
    progressPercent,
    progressSeconds,
    durationSeconds,
  };
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/** Hook quản lý tiến độ xem của các tập */
function useEpisodeWatchData(movieSlug: string) {
  const [watchedList, setWatchedList] = useState<string[]>([]);
  const [episodesProgress, setEpisodesProgress] = useState<Record<string, EpisodeProgressData>>({});

  useEffect(() => {
    if (!movieSlug) return;

    const refreshData = () => {
      setWatchedList(getWatchedEpisodes(movieSlug));
      setEpisodesProgress(getMovieEpisodesProgress(movieSlug));
    };

    refreshData();

    const handleWatchedUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.movieSlug === movieSlug) refreshData();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === `nanaflix_watched_eps_${movieSlug}` ||
        e.key === "nanaflix_watch_history"
      ) {
        refreshData();
      }
    };

    window.addEventListener("watched-episodes-updated", handleWatchedUpdated);
    window.addEventListener("watch-progress-updated", refreshData);
    window.addEventListener("watch-history-updated", refreshData);
    window.addEventListener("nanaflix-auth-synced", refreshData);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("watched-episodes-updated", handleWatchedUpdated);
      window.removeEventListener("watch-progress-updated", refreshData);
      window.removeEventListener("watch-history-updated", refreshData);
      window.removeEventListener("nanaflix-auth-synced", refreshData);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [movieSlug]);

  const watchedEpisodeNums = useMemo(() => {
    const set = new Set<number>();
    for (const epSlug of watchedList) {
      const num = extractEpisodeNumber(epSlug);
      if (num !== null) set.add(num);
    }
    return set;
  }, [watchedList]);

  return { watchedList, episodesProgress, watchedEpisodeNums };
}

/** Subcomponent: Chọn dải tập */
function EpisodeChunkSelectorInline({
  chunks,
  activeChunk,
  onSelectChunk,
  initialChunk,
  activeEpisodeIndex,
}: {
  chunks: EpisodeChunkItem[];
  activeChunk: number;
  onSelectChunk: (index: number) => void;
  initialChunk: number;
  activeEpisodeIndex: number;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  if (chunks.length <= 1) return null;

  if (chunks.length > 4) {
    return (
      <div className="flex items-center justify-between gap-1.5 p-1 rounded-lg bg-zinc-900/80">
        <div className="relative flex-1 min-w-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-label="Chọn dải tập phim"
            className="w-full flex items-center justify-between gap-2 bg-zinc-800/80 hover:bg-zinc-800 text-white text-xs font-bold py-2 sm:py-1.5 min-h-[36px] sm:min-h-[30px] pl-2.5 pr-2 rounded-md transition cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-zinc-400 font-normal">Dải tập:</span>
              <span className="text-white truncate">
                {chunks[activeChunk]?.label || chunks[0]?.label}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDropdownOpen && (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-lg bg-zinc-900/95 border border-white/10 p-1 shadow-2xl backdrop-blur-xl custom-scrollbar animate-in fade-in zoom-in-95 duration-150"
            >
              {chunks.map((chunk) => {
                const isSelected = chunk.index === activeChunk;
                const isCurrentPlayingChunk = chunk.index === initialChunk;
                return (
                  <button
                    key={chunk.index}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectChunk(chunk.index);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition cursor-pointer text-left ${
                      isSelected
                        ? "bg-netflix-red text-white font-bold shadow-sm"
                        : "text-zinc-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{chunk.label}</span>
                    {isCurrentPlayingChunk && (
                      <span className="text-[10px] font-normal px-1 rounded bg-white/20 text-white shrink-0 ml-1">
                        Đang phát
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {initialChunk !== activeChunk && activeEpisodeIndex >= 0 && (
          <Tooltip content={`Về dải đang phát: ${chunks[initialChunk]?.label || ""}`}>
            <button
              type="button"
              onClick={() => onSelectChunk(initialChunk)}
              aria-label="Về dải tập đang phát"
              className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer shrink-0"
            >
              <Target className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-1.5">
      <ScrollablePillsRow className="flex-1 min-w-0">
        {chunks.map((chunk) => {
          const isSelected = chunk.index === activeChunk;
          const isCurrentPlayingChunk = chunk.index === initialChunk;
          return (
            <button
              key={chunk.index}
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectChunk(chunk.index)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? "bg-white text-zinc-950 font-bold shadow-sm"
                  : "bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span>{chunk.label}</span>
              {isCurrentPlayingChunk && (
                <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </ScrollablePillsRow>
    </div>
  );
}

/** Subcomponent: Thẻ tập đơn trong lưới */
function EpisodeGridItemInline({
  tapSlug,
  displayLabel,
  itemTitle,
  isActive,
  isWatched,
  isPartiallyWatched,
  progressPercent,
  isHiddenOnMobile,
  isSingleEpisode,
  isFewEpisodes,
  activeItemRef,
  onSelect,
}: {
  tapSlug: string;
  displayLabel: string;
  itemTitle: string;
  isActive: boolean;
  isWatched: boolean;
  isPartiallyWatched: boolean;
  progressPercent: number;
  isHiddenOnMobile: boolean;
  isSingleEpisode: boolean;
  isFewEpisodes: boolean;
  activeItemRef?: React.Ref<HTMLAnchorElement> | null;
  onSelect?: (slug: string) => void;
}) {
  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(tapSlug);
    }
  };

  return (
    <Link
      ref={activeItemRef}
      href={`?ep=${tapSlug}`}
      prefetch={false}
      scroll={false}
      tabIndex={0}
      aria-current={isActive ? "page" : undefined}
      aria-label={itemTitle}
      onClick={handleClick}
      className={`relative flex items-center justify-center text-center transition-all duration-200 group rounded-xl cursor-pointer select-none outline-none overflow-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:scale-[1.02] focus-visible:z-20 ${
        isHiddenOnMobile ? "max-lg:hidden" : ""
      } ${
        isSingleEpisode
          ? "py-2 px-3 min-h-[38px] text-xs sm:text-sm font-bold"
          : isFewEpisodes
          ? "py-2 px-1.5 sm:px-2.5 min-h-[38px] text-xs sm:text-[13px] font-bold"
          : "p-2 min-h-[38px] text-xs sm:text-sm font-bold"
      } ${
        isActive
          ? "bg-netflix-red text-white shadow-lg shadow-netflix-red/30 scale-[1.02] z-10"
          : isWatched
          ? "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/90 hover:text-white"
          : "bg-zinc-900/90 text-zinc-200 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      <span className="truncate tracking-tight">{displayLabel}</span>

      {isWatched && !isActive && (
        <span
          className="absolute top-1 right-1 flex items-center justify-center w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400"
          aria-hidden="true"
        >
          <Check className="w-2 h-2" />
        </span>
      )}

      {isPartiallyWatched && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800 overflow-hidden"
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
}

/** Subcomponent: Kết quả tìm kiếm 1 tập */
function EpisodeSingleSearchResultInline({
  tapSlug,
  tapName,
  isActive,
  isWatched,
  movieTitle,
  episodeIndex,
  totalEpisodes,
  chunk,
  onSelect,
  onJumpToChunk,
}: {
  tapSlug: string;
  tapName: string;
  isActive: boolean;
  isWatched: boolean;
  movieTitle: string;
  episodeIndex: number;
  totalEpisodes: number;
  chunk?: { index: number; label: string } | null;
  onSelect?: (slug: string) => void;
  onJumpToChunk?: (chunkIndex: number) => void;
}) {
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
              {movieTitle} • Vị trí: Tập {episodeIndex >= 0 ? episodeIndex + 1 : 1} / {totalEpisodes}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect?.(tapSlug)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0 shadow-sm ${
            isActive
              ? "bg-white/10 text-zinc-300 hover:bg-white/15"
              : "bg-netflix-red text-white hover:bg-netflix-red/90"
          }`}
        >
          <span>{isActive ? "Đang xem" : "Xem tập này"}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {chunk && (
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
          <span>Thuộc dải: <strong className="text-zinc-200">{chunk.label}</strong></span>
          <button
            type="button"
            onClick={() => onJumpToChunk?.(chunk.index)}
            className="text-netflix-red hover:underline font-semibold cursor-pointer"
          >
            Mở cả dải tập này
          </button>
        </div>
      )}
    </div>
  );
}

export const EpisodeList: React.FC<EpisodeListProps> = React.memo(
  function EpisodeList({
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

    const { watchedList, episodesProgress, watchedEpisodeNums } = useEpisodeWatchData(movieSlug);
    const [searchQuery, setSearchQuery] = useState("");

    const currentActiveEpisode = useMemo(() => {
      return (
        episodes.find((tap) => tap.slug === activeEpisodeSlug) ||
        findEpisodeMatch(episodes, activeEpisodeSlug)
      );
    }, [episodes, activeEpisodeSlug]);

    const activeEpisodeIndex = useMemo(() => {
      if (!currentActiveEpisode) return -1;
      return episodes.findIndex((tap) => tap.slug === currentActiveEpisode.slug);
    }, [episodes, currentActiveEpisode]);

    const initialChunk = useMemo(() => {
      return activeEpisodeIndex >= 0 ? Math.floor(activeEpisodeIndex / CHUNK_SIZE) : 0;
    }, [activeEpisodeIndex]);

    const [activeChunk, setActiveChunk] = useState<number>(initialChunk);
    const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);

    useEffect(() => {
      setIsMobileExpanded(false);
    }, [activeChunk]);

    useEffect(() => {
      if (activeEpisodeIndex >= 0) {
        setActiveChunk(Math.floor(activeEpisodeIndex / CHUNK_SIZE));
      } else {
        setActiveChunk(0);
      }
    }, [activeEpisodeIndex, episodes]);

    const activeItemRef = useRef<HTMLAnchorElement | null>(null);
    const isInitialMount = useRef(true);
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
        }, 150);
        return () => clearTimeout(scrollTimer);
      }
    }, [activeEpisodeSlug]);

    const chunks = useMemo(() => {
      if (episodes.length <= CHUNK_SIZE) return [];
      const chunkList: EpisodeChunkItem[] = [];
      const totalChunks = Math.ceil(episodes.length / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE + 1;
        const end = Math.min((i + 1) * CHUNK_SIZE, episodes.length);
        chunkList.push({ index: i, label: `${start} - ${end}` });
      }
      return chunkList;
    }, [episodes.length]);

    const isFewEpisodes = episodes.length <= 12;

    const displayEpisodes = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        if (chunks.length === 0) return episodes;
        const start = activeChunk * CHUNK_SIZE;
        return episodes.slice(start, start + CHUNK_SIZE);
      }

      const qNum = extractEpisodeNumber(q);
      const isPureNumeric = /^\d+$/.test(q);

      return episodes.filter((tap, idx) => {
        const tapName = (tap.name || "").toLowerCase();
        const tapSlug = (tap.slug || "").toLowerCase();

        if (tapName.includes(q) || tapSlug.includes(q)) return true;

        if (qNum !== null) {
          const tapNum =
            extractEpisodeNumber(tap.slug) ??
            extractEpisodeNumber(tap.name) ??
            (idx + 1);

          if (tapNum === qNum) return true;

          if (isPureNumeric && !isFewEpisodes) {
            const shortLabel = getShortEpisodeLabel(tap.name, String(idx + 1));
            if (shortLabel === q) return true;
          }
        }
        return false;
      });
    }, [episodes, searchQuery, chunks.length, activeChunk, isFewEpisodes]);

    const isSearching = searchQuery.trim().length > 0;

    const gridClasses = useMemo(() => {
      if (episodes.length === 1) return "grid grid-cols-1 gap-2";
      if (isFewEpisodes) {
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-3 gap-2";
      }
      return "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2";
    }, [episodes.length, isFewEpisodes]);

    const handleSelect = useCallback((slug: string) => {
      switchEpisode?.(slug);
    }, [switchEpisode]);

    return (
      <div className="flex flex-col h-full min-h-0 space-y-2">
        {/* THANH ĐIỀU KHIỂN CỐ ĐỊNH */}
        <div className="flex-shrink-0 space-y-1.5">
          {episodes.length > 12 && (
            <div className="space-y-1.5">
              <div className="relative group">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-netflix-red transition-colors"
                  aria-hidden="true"
                />
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {!isSearching &&
            currentActiveEpisode?.slug &&
            episodes.length > 1 &&
            chunks.length <= 4 && (
              <div className="hidden lg:flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/70 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-zinc-300 truncate text-[11px]">
                    Đang chọn:{" "}
                    <span className="text-white font-semibold">
                      {currentActiveEpisode.name || currentActiveEpisode.slug}
                    </span>
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
                      episodeName:
                        currentActiveEpisode.name || currentActiveEpisode.slug,
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
                      episodeName:
                        currentActiveEpisode.name || currentActiveEpisode.slug,
                    }}
                    variant="player"
                    className="!px-2 !py-1 !min-h-[32px] sm:!min-h-[26px] !text-[11px]"
                    label="Bộ sưu tập"
                  />
                </div>
              </div>
            )}

          {!isSearching && (
            <EpisodeChunkSelectorInline
              chunks={chunks}
              activeChunk={activeChunk}
              onSelectChunk={setActiveChunk}
              initialChunk={initialChunk}
              activeEpisodeIndex={activeEpisodeIndex}
            />
          )}
        </div>

        {/* KHUNG CUỘN DANH SÁCH TẬP */}
        <div className="flex-1 min-h-0 max-lg:overflow-y-visible lg:overflow-y-auto overscroll-auto overflow-x-hidden px-1.5 custom-scrollbar">
          {isSearching && displayEpisodes.length === 1 && (() => {
            const singleTap = displayEpisodes[0];
            const tapSlug = singleTap.slug || `ep-1`;
            const tapName = singleTap.name || `Tập 1`;
            const isActive = Boolean(
              activeEpisodeSlug && activeEpisodeSlug === singleTap.slug
            );
            const epIndex = episodes.findIndex((e) => e.slug === singleTap.slug);
            const fallbackNum = epIndex >= 0 ? epIndex + 1 : null;
            const status = getEpisodeWatchStatus(
              tapSlug,
              tapName,
              fallbackNum,
              episodesProgress,
              watchedList,
              watchedEpisodeNums,
              isActive
            );
            const chunkIdx = epIndex >= 0 ? Math.floor(epIndex / CHUNK_SIZE) : -1;
            const chunkObj = chunkIdx >= 0 ? chunks[chunkIdx] : null;

            return (
              <EpisodeSingleSearchResultInline
                tapSlug={tapSlug}
                tapName={tapName}
                isActive={isActive}
                isWatched={status.isWatched}
                movieTitle={movieTitle}
                episodeIndex={epIndex}
                totalEpisodes={episodes.length}
                chunk={chunkObj}
                onSelect={handleSelect}
                onJumpToChunk={(cIdx) => {
                  setActiveChunk(cIdx);
                  setSearchQuery("");
                }}
              />
            );
          })()}

          {displayEpisodes.length > 0 ? (
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
                    const status = getEpisodeWatchStatus(
                      tapSlug,
                      tapName,
                      fallbackNum,
                      episodesProgress,
                      watchedList,
                      watchedEpisodeNums,
                      isActive
                    );

                    const displayLabel = isSearching
                      ? formatEpisodeName(tapName, `Tập ${tapIdx + 1}`)
                      : getFormattedEpisodeLabel(tapName, tapIdx + 1, isFewEpisodes);

                    const itemTitle = status.isPartiallyWatched
                      ? `${tapName} • Đang xem dở (${formatDuration(status.progressSeconds)}${
                          status.durationSeconds > 0 ? ` / ${formatDuration(status.durationSeconds)}` : ""
                        })`
                      : tapName;

                    const isHiddenOnMobile =
                      !isMobileExpanded &&
                      !isSearching &&
                      displayEpisodes.length > 16 &&
                      tapIdx >= 16 &&
                      !isActive;

                    return (
                      <EpisodeGridItemInline
                        key={`${tapSlug}-${tapIdx}`}
                        tapSlug={tapSlug}
                        displayLabel={displayLabel}
                        itemTitle={itemTitle}
                        isActive={isActive}
                        isWatched={status.isWatched}
                        isPartiallyWatched={status.isPartiallyWatched}
                        progressPercent={status.progressPercent}
                        isHiddenOnMobile={isHiddenOnMobile}
                        isSingleEpisode={episodes.length === 1}
                        isFewEpisodes={isFewEpisodes}
                        activeItemRef={isActive ? activeItemRef : null}
                        onSelect={handleSelect}
                      />
                    );
                  })}
                </div>

                {!isSearching && displayEpisodes.length > 16 && (
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
                            Xem thêm {displayEpisodes.length - 16} tập còn lại
                            {currentActiveEpisode &&
                            displayEpisodes.findIndex(
                              (e) => e.slug === currentActiveEpisode.slug
                            ) >= 16
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
              <p className="text-sm font-semibold text-zinc-300">
                Không tìm thấy tập &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-zinc-500">
                Thử tìm theo số tập (ví dụ: 1, 59, 199) hoặc xóa bộ lọc.
              </p>
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
  }
);

export default EpisodeList;
