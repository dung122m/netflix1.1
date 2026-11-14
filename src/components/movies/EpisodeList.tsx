"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
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

import { EpisodeSearchBar } from "./EpisodeSearchBar";
import { EpisodeChunkSelector } from "./EpisodeChunkSelector";
import { EpisodeGridItem } from "./EpisodeGridItem";
import { EpisodeSingleSearchResult } from "./EpisodeSingleSearchResult";

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
    if (/^tập\s+/i.test(trimmed)) {
      return trimmed;
    }
    return `Tập ${short}`;
  }

  return short;
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
    const activeEpisodeSlug =
      watchContext?.activeEpisodeSlug ?? propActiveEpisodeSlug;
    const switchEpisode = watchContext?.switchEpisode ?? onSelectEpisode;

    const movieTitle = watchContext?.movieTitle || propMovieTitle || movieSlug;
    const moviePoster =
      watchContext?.posterUrl || propMoviePoster || "/default-poster.jpg";
    const movieYear = watchContext?.year || propMovieYear;
    const movieQuality = watchContext?.quality || propMovieQuality;
    const movieCategory = watchContext?.category || propMovieCategory;

    const [watchedList, setWatchedList] = useState<string[]>([]);
    const [episodesProgress, setEpisodesProgress] = useState<
      Record<string, EpisodeProgressData>
    >({});
    const [searchQuery, setSearchQuery] = useState("");

    // Tìm tập phim đang phát chuẩn xác bằng findEpisodeMatch
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

    // Tự động thu gọn danh sách tập trên mobile khi đổi dải tập
    useEffect(() => {
      setIsMobileExpanded(false);
    }, [activeChunk]);

    // Cập nhật tab khi activeEpisodeSlug hoặc danh sách tập thay đổi
    useEffect(() => {
      if (activeEpisodeIndex >= 0) {
        setActiveChunk(Math.floor(activeEpisodeIndex / CHUNK_SIZE));
      } else {
        setActiveChunk(0);
      }
    }, [activeEpisodeIndex, episodes]);

    // Tự động cuộn đến tập phim đang phát khi active episode thay đổi
    const activeItemRef = useRef<HTMLAnchorElement | null>(null);
    const isInitialMount = useRef(true);
    useEffect(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }
      if (activeEpisodeSlug && activeItemRef.current) {
        const scrollTimer = setTimeout(() => {
          const scrollParent =
            activeItemRef.current?.closest(".overflow-y-auto");
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

    // Đồng bộ danh sách tập đã xem & tiến độ
    useEffect(() => {
      if (!movieSlug) return;

      const refreshData = () => {
        const watched = getWatchedEpisodes(movieSlug);
        setWatchedList(watched);
        const progMap = getMovieEpisodesProgress(movieSlug);
        setEpisodesProgress(progMap);
      };

      refreshData();

      const handleWatchedUpdated = (e: Event) => {
        const detail = (e as CustomEvent)?.detail;
        if (!detail || detail.movieSlug === movieSlug) {
          refreshData();
        }
      };

      const handleStorageChange = (e: StorageEvent) => {
        if (
          e.key === `nanaflix_watched_episodes_${movieSlug}` ||
          e.key === "nanaflix_history_v1"
        ) {
          refreshData();
        }
      };

      window.addEventListener(
        "nanaflix-watched-episodes-updated",
        handleWatchedUpdated
      );
      window.addEventListener(
        "nanaflix-watch-progress-updated",
        handleWatchedUpdated
      );
      window.addEventListener("storage", handleStorageChange);

      return () => {
        window.removeEventListener(
          "nanaflix-watched-episodes-updated",
          handleWatchedUpdated
        );
        window.removeEventListener(
          "nanaflix-watch-progress-updated",
          handleWatchedUpdated
        );
        window.removeEventListener("storage", handleStorageChange);
      };
    }, [movieSlug]);

    const watchedEpisodeNums = useMemo(() => {
      const set = new Set<number>();
      for (const ep of watchedList) {
        const num = extractEpisodeNumber(ep);
        if (num !== null) {
          const prog = Object.entries(episodesProgress).find(([k, d]) => {
            const n =
              extractEpisodeNumber(k) ?? extractEpisodeNumber(d?.episodeName);
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
          const num =
            extractEpisodeNumber(epSlug) ??
            extractEpisodeNumber(epData?.episodeName);
          if (num !== null) set.add(num);
        }
      }
      return set;
    }, [watchedList, episodesProgress]);

    // Tạo các dải tập chuẩn xác
    const totalChunks = Math.ceil(episodes.length / CHUNK_SIZE);
    const chunks = useMemo(() => {
      if (totalChunks <= 1) return [];
      return Array.from({ length: totalChunks }, (_, i) => {
        const startIdx = i * CHUNK_SIZE;
        const endIdx = Math.min((i + 1) * CHUNK_SIZE - 1, episodes.length - 1);
        const startEp = episodes[startIdx];
        const endEp = episodes[endIdx];

        const startShort = startEp?.name
          ? getShortEpisodeLabel(startEp.name)
          : String(startIdx + 1);
        const endShort = endEp?.name
          ? getShortEpisodeLabel(endEp.name)
          : String(endIdx + 1);

        const label =
          startShort === endShort
            ? `Tập ${startShort}`
            : `Tập ${startShort} - ${endShort}`;
        return { index: i, label };
      });
    }, [totalChunks, episodes]);

    // Lọc danh sách tập hiển thị thông minh
    const displayEpisodes = useMemo(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        if (chunks.length <= 1) return episodes;
        const startIdx = activeChunk * CHUNK_SIZE;
        return episodes.slice(startIdx, startIdx + CHUNK_SIZE);
      }

      const isNumeric = /^\d+$/.test(q);
      const searchNum = isNumeric ? parseInt(q, 10) : null;

      const filtered = episodes.filter((tap, idx) => {
        const epSlug = (tap.slug || "").toLowerCase();
        const epName = (tap.name || "").toLowerCase();

        if (searchNum !== null) {
          const epNum =
            extractEpisodeNumber(tap.slug) ??
            extractEpisodeNumber(tap.name) ??
            idx + 1;
          if (epNum === searchNum) return true;
        }

        const shortLabel = getShortEpisodeLabel(tap.name, String(idx + 1)).toLowerCase();
        if (shortLabel === q) return true;

        return epSlug.includes(q) || epName.includes(q);
      });

      return filtered;
    }, [episodes, searchQuery, activeChunk, chunks.length]);

    const isSearching = Boolean(searchQuery.trim());
    const isFewEpisodes = episodes.length <= 12;

    const gridClasses = useMemo(() => {
      if (isSearching) {
        if (displayEpisodes.length <= 4) {
          return "grid grid-cols-2 sm:grid-cols-2 gap-2";
        }
        return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2";
      }

      if (episodes.length === 1) return "grid grid-cols-1 gap-2";
      if (episodes.length <= 4) return "grid grid-cols-1 sm:grid-cols-2 gap-2.5";
      if (episodes.length <= 8) return "grid grid-cols-2 sm:grid-cols-3 gap-2.5";
      if (episodes.length <= 12) return "grid grid-cols-2 min-[360px]:grid-cols-3 gap-2";
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
        {/* 1. KHUNG ĐIỀU KHIỂN CỐ ĐỊNH (SEARCH + TẬP ĐANG CHỌN + DẢI TẬP) */}
        <div className="flex-shrink-0 space-y-1.5">
          <EpisodeSearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
            resultCount={displayEpisodes.length}
            isSearching={isSearching}
            totalEpisodes={episodes.length}
          />

          {/* THANH ĐIỀU KHIỂN LƯU TẬP PHIM ĐANG CHỌN */}
          {!isSearching &&
            currentActiveEpisode?.slug &&
            episodes.length > 1 &&
            chunks.length <= 4 && (
              <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/70 text-xs">
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

          {/* DẢI TABS PHÂN NHÓM TẬP */}
          {!isSearching && (
            <EpisodeChunkSelector
              chunks={chunks}
              activeChunk={activeChunk}
              onSelectChunk={setActiveChunk}
              initialChunk={initialChunk}
              activeEpisodeIndex={activeEpisodeIndex}
              currentEpisodeName={currentActiveEpisode?.name}
              chunkSize={CHUNK_SIZE}
            />
          )}
        </div>

        {/* 2. KHUNG CUỘN DANH SÁCH TẬP PHIM */}
        <div className="flex-1 min-h-0 max-lg:overflow-y-visible lg:overflow-y-auto overscroll-auto overflow-x-hidden px-1.5 custom-scrollbar">
          {/* TRƯỜNG HỢP TÌM KIẾM CHỈ RA 1 TẬP DUY NHẤT */}
          {isSearching && displayEpisodes.length === 1 && (() => {
            const singleTap = displayEpisodes[0];
            const tapSlug = singleTap.slug || `ep-1`;
            const tapName = singleTap.name || `Tập 1`;
            const isActive = Boolean(
              activeEpisodeSlug && activeEpisodeSlug === singleTap.slug
            );
            const singleEpProg = singleTap.slug
              ? episodesProgress[singleTap.slug]
              : undefined;
            const singleNum =
              extractEpisodeNumber(singleTap.slug) ??
              extractEpisodeNumber(singleTap.name);
            const singleMatchingProg =
              singleEpProg ||
              (singleNum !== null
                ? Object.entries(episodesProgress).find(([k, d]) => {
                    const n =
                      extractEpisodeNumber(k) ??
                      extractEpisodeNumber(d?.episodeName);
                    return n === singleNum;
                  })?.[1]
                : undefined);

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
              singleTap.slug &&
                (watchedList.includes(singleTap.slug) ||
                  (singleNum !== null && watchedEpisodeNums.has(singleNum)))
            );
            const isWatched = Boolean(
              !isSinglePartiallyWatched &&
                (isSingleCompletedFromProg || isDirectlyWatched)
            );
            const epIndex = episodes.findIndex((e) => e.slug === singleTap.slug);
            const chunkIdx = epIndex >= 0 ? Math.floor(epIndex / CHUNK_SIZE) : -1;
            const chunkObj = chunkIdx >= 0 ? chunks[chunkIdx] : null;

            return (
              <EpisodeSingleSearchResult
                tapSlug={tapSlug}
                tapName={tapName}
                isActive={isActive}
                isWatched={isWatched}
                movieTitle={movieTitle}
                episodeIndex={epIndex}
                totalEpisodes={episodes.length}
                chunk={chunkObj}
                onSelect={(slug) => switchEpisode?.(slug)}
                onJumpToChunk={(cIdx) => {
                  setActiveChunk(cIdx);
                  setSearchQuery("");
                }}
              />
            );
          })()}

          {/* LƯỚI TẬP PHIM */}
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
                    const trueEpIndex = episodes.findIndex(
                      (e) => e.slug === tap.slug
                    );
                    const fallbackNum =
                      trueEpIndex >= 0 ? trueEpIndex + 1 : null;
                    const tapNum =
                      extractEpisodeNumber(tap.slug) ??
                      extractEpisodeNumber(tap.name) ??
                      fallbackNum;

                    const matchingProg =
                      (tap.slug ? episodesProgress[tap.slug] : undefined) ||
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
                    const hasValidDuration =
                      durationSeconds > 0 && Number.isFinite(durationSeconds);

                    const isCompletedFromProg = Boolean(
                      matchingProg?.isCompleted ||
                        (hasValidDuration &&
                          progressSeconds / durationSeconds >= 0.9)
                    );

                    const isPartiallyWatchedProg = Boolean(
                      !isCompletedFromProg &&
                        hasValidDuration &&
                        progressSeconds >= 10 &&
                        progressSeconds / durationSeconds < 0.9
                    );

                    const isDirectlyWatched = Boolean(
                      tap.slug &&
                        (watchedList.includes(tap.slug) ||
                          (tapNum !== null && watchedEpisodeNums.has(tapNum)))
                    );

                    const isWatched = Boolean(
                      !isPartiallyWatchedProg &&
                        (isCompletedFromProg || isDirectlyWatched)
                    );

                    const displayLabel = isSearching
                      ? formatEpisodeName(tapName, `Tập ${tapIdx + 1}`)
                      : getFormattedEpisodeLabel(
                          tapName,
                          tapIdx + 1,
                          isFewEpisodes
                        );

                    const isPartiallyWatched =
                      !isActive &&
                      !isWatched &&
                      (isPartiallyWatchedProg ||
                        (!hasValidDuration && progressSeconds >= 10));
                    const progressPercent = isPartiallyWatched
                      ? durationSeconds > 0
                        ? Math.min(
                            95,
                            Math.max(
                              8,
                              Math.round(
                                (progressSeconds / durationSeconds) * 100
                              )
                            )
                          )
                        : 35
                      : 0;

                    const formatSec = (s: number) => {
                      const m = Math.floor(s / 60);
                      const sec = (s % 60).toString().padStart(2, "0");
                      return `${m}:${sec}`;
                    };
                    const itemTitle = isPartiallyWatched
                      ? `${tapName} • Đang xem dở (${formatSec(progressSeconds)}${
                          durationSeconds > 0 ? ` / ${formatSec(durationSeconds)}` : ""
                        })`
                      : tapName;

                    const isHiddenOnMobile =
                      !isMobileExpanded &&
                      !isSearching &&
                      displayEpisodes.length > 8 &&
                      tapIdx >= 8;

                    return (
                      <EpisodeGridItem
                        key={`${tapSlug}-${tapIdx}`}
                        tapSlug={tapSlug}
                        tapName={tapName}
                        displayLabel={displayLabel}
                        itemTitle={itemTitle}
                        isActive={isActive}
                        isWatched={isWatched}
                        isPartiallyWatched={isPartiallyWatched}
                        progressPercent={progressPercent}
                        isHiddenOnMobile={isHiddenOnMobile}
                        isSingleEpisode={episodes.length === 1}
                        isFewEpisodes={isFewEpisodes}
                        activeItemRef={isActive ? activeItemRef : null}
                        onSelect={(slug) => switchEpisode?.(slug)}
                      />
                    );
                  })}
                </div>

                {/* Nút Xem thêm / Thu gọn tập phim trên mobile */}
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
                            {currentActiveEpisode &&
                            displayEpisodes.findIndex(
                              (e) => e.slug === currentActiveEpisode.slug
                            ) >= 8
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
