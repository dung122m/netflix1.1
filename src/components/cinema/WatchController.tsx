"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { saveWatchHistory } from "@/lib/watchHistory";
import { resolveNextResumeEpisode } from "@/lib/seriesResume";
import { findEpisodeMatch } from "@/lib/formatEpisode";
import { useAuth } from "@/context/AuthContext";
import { getPlayerSettings, updatePlayerSettings } from "@/services/userService";
import { canServerUseNanaflixPlayer } from "@/components/cinema/cinemaStreamHelpers";

export type PlaybackProviderType = "nanaflix";

export interface EpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
  [key: string]: unknown;
}

export interface EpisodeServer {
  server_name?: string;
  server_data?: EpisodeItem[];
}

export interface WatchContextValue {
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  thumbUrl?: string;
  year?: number | string;
  quality?: string;
  category?: string;
  servers: EpisodeServer[];
  currentServerIndex: number;
  episodes: EpisodeItem[];
  activeEpisodeSlug?: string;
  activeEpisode?: EpisodeItem;
  currentIndex: number;
  prevEpisode: EpisodeItem | null;
  nextEpisode: EpisodeItem | null;
  isTrailerOnly: boolean;
  isResolvingStream: boolean;
  switchEpisode: (slug: string, options?: { preserveTime?: boolean }) => void;
  switchServer: (serverIndex: number, options?: { preserveTime?: boolean }) => void;
  activeProvider: PlaybackProviderType;
  setActiveProvider: (provider: PlaybackProviderType) => void;
  hasNanaflixSource?: boolean;
  tmdbId?: string | number | null;
  isSeries?: boolean;
  isTheaterMode: boolean;
  setIsTheaterMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleTheaterMode: () => void;
  isLightsOff: boolean;
  setIsLightsOff: React.Dispatch<React.SetStateAction<boolean>>;
  toggleLightsOff: () => void;
}

const WatchContext = createContext<WatchContextValue | null>(null);

export function useWatchController() {
  const ctx = useContext(WatchContext);
  return ctx;
}

interface WatchControllerProps {
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  thumbUrl?: string;
  year?: number | string;
  quality?: string;
  category?: string;
  country?: string;
  type?: string;
  actor?: string[];
  initialServers: EpisodeServer[];
  initialServerIndex?: number;
  initialEpisodeSlug?: string;
  initialProvider?: PlaybackProviderType;
  hasNanaflixSource?: boolean;
  tmdbId?: string | number | null;
  isSeries?: boolean;
  isTrailerOnly?: boolean;
  children: React.ReactNode;
}

export function WatchController({
  movieSlug,
  movieTitle,
  posterUrl,
  thumbUrl,
  year,
  quality,
  category,
  country,
  type,
  actor,
  initialServers,
  initialServerIndex = 0,
  initialEpisodeSlug,
  initialProvider: _initialProvider,
  hasNanaflixSource: _hasNanaflixSource = true,
  tmdbId,
  isSeries,
  isTrailerOnly = false,
  children,
}: WatchControllerProps) {
  const { user } = useAuth();
  const [currentServerIndex, setCurrentServerIndex] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const serverParam = urlParams.get("server");
        if (serverParam !== null) {
          const parsed = parseInt(serverParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < initialServers.length) {
            return parsed;
          }
        }
      } catch {}
    }
    // Tự động khớp server ưa thích đã lưu trên tài khoản (Cloud Sync)
    if (initialServers && initialServers.length > 1) {
      try {
        const settings = getPlayerSettings(user?.uid);
        if (settings?.preferredServer) {
          const pref = settings.preferredServer.toLowerCase();
          const foundIdx = initialServers.findIndex((s) =>
            s.server_name?.toLowerCase().includes(pref) ||
            pref.includes(s.server_name?.toLowerCase() || "")
          );
          if (foundIdx !== -1) {
            // Nếu server ưa thích dùng được trình phát Nanaflix, dùng ngay
            if (canServerUseNanaflixPlayer(initialServers[foundIdx])) {
              return foundIdx;
            }
            // Nếu server ưa thích không dùng được, nhưng có server khác dùng được -> ưu tiên server dùng được
            const nativeIdx = initialServers.findIndex((s) => canServerUseNanaflixPlayer(s));
            if (nativeIdx !== -1) return nativeIdx;
            return foundIdx;
          }
        }
      } catch {}
    }

    // Nếu không có serverParam trên URL, ưu tiên chọn server dùng được trình phát Nanaflix
    if (initialServers && initialServers.length > 0) {
      const nativeIdx = initialServers.findIndex((s) => canServerUseNanaflixPlayer(s));
      if (nativeIdx !== -1) return nativeIdx;
    }

    return initialServerIndex;
  });
  const [activeProvider] = useState<PlaybackProviderType>("nanaflix");
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [isLightsOff, setIsLightsOff] = useState<boolean>(false);
  const [isResolvingStream, setIsResolvingStream] = useState<boolean>(false);

  const toggleTheaterMode = useCallback(() => {
    setIsTheaterMode((prev) => !prev);
  }, []);

  const toggleLightsOff = useCallback(() => {
    setIsLightsOff((prev) => !prev);
  }, []);

  const [servers, setServers] = useState<EpisodeServer[]>(initialServers);

  useEffect(() => {
    setServers(initialServers);
  }, [initialServers]);

  const currentServer = servers[currentServerIndex] || servers[0];
  const episodes = useMemo(
    () => currentServer?.server_data || [],
    [currentServer]
  );

  const [activeEpisodeSlug, setActiveEpisodeSlug] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const epParam = urlParams.get("ep");
        if (epParam && episodes.length > 0) {
          const found = findEpisodeMatch(episodes, epParam);
          if (found?.slug) return found.slug;
        }
      } catch {}
    }
    if (initialEpisodeSlug) {
      const found = findEpisodeMatch(episodes, initialEpisodeSlug);
      if (found?.slug) return found.slug;
    }
    return episodes[0]?.slug || "";
  });

  const prevInitialSlugRef = useRef(initialEpisodeSlug);
  const hasInitializedHistoryRef = useRef<string | null>(null);
  const hasCheckedAutoResumeRef = useRef<string | null>(null);
  const serversRef = useRef<EpisodeServer[]>(initialServers);
  const streamFetchTriedRef = useRef<Set<string>>(new Set());
  const activeStreamFetchIdRef = useRef<number>(0);

  const fetchEpisodeStreamsOnDemand = useCallback(
    (targetSlug: string, targetServerIdx: number, targetEpName?: string) => {
      if (!movieSlug || !targetSlug) return;
      const fetchKey = `${movieSlug}_${targetSlug}_s${targetServerIdx}`;
      if (streamFetchTriedRef.current.has(fetchKey)) return;
      streamFetchTriedRef.current.add(fetchKey);

      const targetServer = serversRef.current[targetServerIdx];
      const serverParam = targetServer?.server_name
        ? `&server=${encodeURIComponent(targetServer.server_name)}`
        : "";

      const requestId = ++activeStreamFetchIdRef.current;
      setIsResolvingStream(true);
      fetch(
        `/api/movies/streams?slug=${encodeURIComponent(movieSlug)}&ep=${encodeURIComponent(targetSlug)}${serverParam}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.streams) && data.streams.length > 0) {
            setServers((prevServers) => {
              return prevServers.map((srv, sIdx) => {
                const streamMatch =
                  data.streams.find(
                    (s: { server_name?: string }) => s.server_name === srv.server_name
                  ) ||
                  data.streams[sIdx] ||
                  data.streams[0];
                if (!streamMatch) return srv;

                const updatedData = (srv.server_data || []).map((ep) => {
                  if (
                    ep.slug === targetSlug ||
                    (targetEpName && ep.name === targetEpName) ||
                    srv.server_data?.length === 1
                  ) {
                    return {
                      ...ep,
                      link_embed: streamMatch.link_embed || ep.link_embed,
                      link_m3u8: streamMatch.link_m3u8 || ep.link_m3u8,
                    };
                  }
                  return ep;
                });
                return { ...srv, server_data: updatedData };
              });
            });
          }
        })
        .catch(() => {})
        .finally(() => {
          if (activeStreamFetchIdRef.current === requestId) {
            setIsResolvingStream(false);
          }
        });
    },
    [movieSlug]
  );

  useEffect(() => {
    serversRef.current = servers;
  }, [servers]);

  const activeEpisode = useMemo(() => {
    if (activeEpisodeSlug) {
      return (
        episodes.find((ep) => ep.slug === activeEpisodeSlug) ||
        findEpisodeMatch(episodes, activeEpisodeSlug)
      );
    }
    return episodes[0];
  }, [episodes, activeEpisodeSlug]);

  const currentIndex = useMemo(() => {
    return episodes.findIndex((ep) => ep.slug === activeEpisode?.slug);
  }, [episodes, activeEpisode]);

  const prevEpisode = useMemo(() => {
    return currentIndex > 0 ? episodes[currentIndex - 1] : null;
  }, [currentIndex, episodes]);

  const nextEpisode = useMemo(() => {
    return currentIndex >= 0 && currentIndex < episodes.length - 1
      ? episodes[currentIndex + 1]
      : null;
  }, [currentIndex, episodes]);

  // Cập nhật URL sạch trên thanh địa chỉ không làm reload trang, giữ đúng provider đã chọn
  const updateUrlQuietly = useCallback(
    (
      epSlug: string,
      sIndex: number,
      _prov?: PlaybackProviderType,
      options?: { preserveTime?: boolean; replace?: boolean }
    ) => {
      if (typeof window === "undefined") return;
      try {
        const url = new URL(window.location.href);
        if (epSlug) {
          url.searchParams.set("ep", epSlug);
        } else {
          url.searchParams.delete("ep");
        }
        if (sIndex > 0) {
          url.searchParams.set("server", String(sIndex));
        } else {
          url.searchParams.delete("server");
        }
        // Xóa provider thừa nếu có trong URL cũ
        url.searchParams.delete("provider");
        // Chỉ xóa mốc thời gian cũ khi người dùng chủ động đổi tập (giữ nguyên khi có preserveTime)
        if (!options?.preserveTime) {
          url.searchParams.delete("t");
        }
        if (options?.replace) {
          window.history.replaceState(null, "", url.pathname + url.search);
        } else {
          window.history.pushState(null, "", url.pathname + url.search);
        }
      } catch {}
    },
    []
  );

  // Tự động tiếp tục tập đang xem dở (nếu URL không chỉ định ?ep=) rồi mới ghi nhận lịch sử xem
  useEffect(() => {
    const currentSlug = activeEpisodeSlug || episodes[0]?.slug || "";
    if (!movieSlug || !currentSlug) return;

    const resumeKey = `${user?.uid || "guest"}_${movieSlug}`;
    if (hasCheckedAutoResumeRef.current !== resumeKey) {
      hasCheckedAutoResumeRef.current = resumeKey;
      let hasExplicitEpParam = false;
      if (typeof window !== "undefined") {
        try {
          hasExplicitEpParam = Boolean(new URLSearchParams(window.location.search).get("ep"));
        } catch {}
      }
      if (!hasExplicitEpParam && episodes.length > 0) {
        const resolved = resolveNextResumeEpisode(movieSlug, episodes);
        if (
          resolved &&
          (resolved.caseType === "in_progress" || resolved.caseType === "next_episode") &&
          resolved.episode?.slug &&
          resolved.episode.slug !== currentSlug
        ) {
          setActiveEpisodeSlug(resolved.episode.slug);
          updateUrlQuietly(resolved.episode.slug, currentServerIndex, activeProvider, {
            replace: true,
            preserveTime: resolved.caseType === "in_progress",
          });
          return;
        }
      }
    }

    const historyKey = `${user?.uid || "guest"}_${movieSlug}_${currentSlug}`;
    if (hasInitializedHistoryRef.current === historyKey) return;
    hasInitializedHistoryRef.current = historyKey;

    const targetEp = episodes.find((ep) => ep.slug === currentSlug) || episodes[0];
    const targetEpIdx = episodes.findIndex((ep) => ep.slug === (targetEp?.slug || currentSlug));
    const resolvedNextEp =
      targetEpIdx >= 0 && targetEpIdx < episodes.length - 1
        ? episodes[targetEpIdx + 1]
        : null;
    saveWatchHistory({
      slug: movieSlug,
      title: movieTitle,
      poster: posterUrl,
      thumb: thumbUrl,
      episodeName: targetEp?.name,
      episodeSlug: currentSlug,
      nextEpisodeSlug: resolvedNextEp?.slug || "",
      nextEpisodeName: resolvedNextEp?.name || "",
      year,
      quality,
      category,
      country,
      type,
      actor,
      tmdbId: tmdbId ?? undefined,
    });
  }, [
    user?.uid,
    movieSlug,
    movieTitle,
    posterUrl,
    thumbUrl,
    activeEpisodeSlug,
    episodes,
    currentServerIndex,
    activeProvider,
    updateUrlQuietly,
    year,
    quality,
    category,
    country,
    type,
    actor,
    tmdbId,
  ]);

  // Chỉ đồng bộ khi initialEpisodeSlug từ Server hoặc Router Navigation bên ngoài thay đổi
  useEffect(() => {
    if (initialEpisodeSlug && initialEpisodeSlug !== prevInitialSlugRef.current) {
      prevInitialSlugRef.current = initialEpisodeSlug;
      const found = findEpisodeMatch(episodes, initialEpisodeSlug);
      if (found?.slug) {
        setActiveEpisodeSlug(found.slug);
      }
    }
  }, [initialEpisodeSlug, episodes]);

  // Tự động nạp stream on-demand nếu tập hiện tại chưa có direct m3u8 hoặc chưa có liên kết streaming (nâng cấp lên direct HLS)
  useEffect(() => {
    if (!movieSlug || !activeEpisodeSlug) return;
    const targetEp = episodes.find((ep) => ep.slug === activeEpisodeSlug) || findEpisodeMatch(episodes, activeEpisodeSlug);
    // Nếu chưa có direct link_m3u8 hoặc hoàn toàn chưa có link, chủ động gọi stream API để nâng cấp lên direct HLS
    const needsStreamUpgrade = targetEp && (!targetEp.link_m3u8 || !targetEp.link_embed);
    if (needsStreamUpgrade) {
      fetchEpisodeStreamsOnDemand(activeEpisodeSlug, currentServerIndex, targetEp?.name);
    }
  }, [movieSlug, activeEpisodeSlug, episodes, currentServerIndex, fetchEpisodeStreamsOnDemand]);

  // Lắng nghe sự kiện điều hướng URL (Back / Forward) từ trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const serverParam = urlParams.get("server");
        const currentServers = serversRef.current;
        let targetServerIndex = initialServerIndex || 0;
        if (serverParam !== null) {
          const parsed = parseInt(serverParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < currentServers.length) {
            targetServerIndex = parsed;
          }
        } else if (currentServers && currentServers.length > 0) {
          const nativeIdx = currentServers.findIndex((s) => canServerUseNanaflixPlayer(s));
          if (nativeIdx !== -1) {
            targetServerIndex = nativeIdx;
          }
        }
        setCurrentServerIndex(targetServerIndex);

        const targetServer = currentServers[targetServerIndex] || currentServers[0];
        const targetEpisodes = targetServer?.server_data || [];
        const epParam = urlParams.get("ep");
        if (epParam && targetEpisodes.length > 0) {
          const found = findEpisodeMatch(targetEpisodes, epParam);
          setActiveEpisodeSlug(found?.slug || targetEpisodes[0]?.slug || "");
        } else if (targetEpisodes.length > 0) {
          setActiveEpisodeSlug(targetEpisodes[0]?.slug || "");
        }
      } catch {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [initialServerIndex]);

  const switchProvider = useCallback(() => {}, []);

  // Chuyển tập tức thì trong 0ms, tự động nạp stream on-demand nếu chưa có
  const switchEpisode = useCallback(
    (newSlug: string, options?: { preserveTime?: boolean }) => {
      if (!newSlug || newSlug === activeEpisodeSlug) return;

      const targetEp = episodes.find((ep) => ep.slug === newSlug) || findEpisodeMatch(episodes, newSlug);
      const canonicalSlug = targetEp?.slug || newSlug;
      setActiveEpisodeSlug(canonicalSlug);
      updateUrlQuietly(canonicalSlug, currentServerIndex, activeProvider, options);

      // Nếu tập chưa có direct link_m3u8, tải on-demand và bật trạng thái resolving ngay lập tức
      if (!targetEp || !targetEp.link_m3u8 || !targetEp.link_embed) {
        fetchEpisodeStreamsOnDemand(canonicalSlug, currentServerIndex, targetEp?.name);
      }

      const targetEpForHistory = targetEp;
      if (targetEpForHistory) {
        const targetEpIdx = episodes.findIndex((ep) => ep.slug === targetEpForHistory.slug);
        const targetNextEp =
          targetEpIdx >= 0 && targetEpIdx < episodes.length - 1
            ? episodes[targetEpIdx + 1]
            : null;
        saveWatchHistory({
          slug: movieSlug,
          title: movieTitle,
          poster: posterUrl,
          thumb: thumbUrl,
          episodeName: targetEpForHistory.name,
          episodeSlug: targetEpForHistory.slug,
          nextEpisodeSlug: targetNextEp?.slug || "",
          nextEpisodeName: targetNextEp?.name || "",
          year,
          quality,
          category,
          country,
          type,
          actor,
          tmdbId: tmdbId ?? undefined,
        });
      }
    },
    [
      activeEpisodeSlug,
      episodes,
      currentServerIndex,
      activeProvider,
      movieSlug,
      movieTitle,
      posterUrl,
      thumbUrl,
      year,
      quality,
      category,
      country,
      type,
      actor,
      tmdbId,
      updateUrlQuietly,
      fetchEpisodeStreamsOnDemand,
    ]
  );

  // Chuyển server tức thì và đồng bộ stream 0ms
  const switchServer = useCallback(
    (newIndex: number, options?: { preserveTime?: boolean }) => {
      const safeIndex = Math.max(0, Math.min(newIndex, servers.length - 1));
      setCurrentServerIndex(safeIndex);
      const newServer = servers[safeIndex];
      if (newServer?.server_name) {
        updatePlayerSettings(user?.uid, { preferredServer: newServer.server_name });
      }
      const newEpisodes = newServer?.server_data || [];
      const foundMatch =
        findEpisodeMatch(newEpisodes, activeEpisode?.slug || activeEpisodeSlug) ||
        (activeEpisode?.name ? findEpisodeMatch(newEpisodes, activeEpisode.name) : undefined);
      const currentTargetSlug = foundMatch?.slug || newEpisodes[0]?.slug || "";
      setActiveEpisodeSlug(currentTargetSlug);
      updateUrlQuietly(currentTargetSlug, safeIndex, activeProvider, options);

      // On-demand nạp stream nếu tập trên server mới chưa có direct link_m3u8
      const targetEp = foundMatch || newEpisodes[0];
      if (targetEp && (!targetEp.link_m3u8 || !targetEp.link_embed) && movieSlug && currentTargetSlug) {
        fetchEpisodeStreamsOnDemand(currentTargetSlug, safeIndex, targetEp.name);
      }
    },
    [servers, activeEpisodeSlug, activeEpisode, activeProvider, movieSlug, updateUrlQuietly, user?.uid, fetchEpisodeStreamsOnDemand]
  );

  const value = useMemo<WatchContextValue>(() => {
    return {
      movieSlug,
      movieTitle,
      posterUrl,
      thumbUrl,
      year,
      quality,
      category,
      servers,
      currentServerIndex,
      episodes,
      activeEpisodeSlug,
      activeEpisode,
      currentIndex,
      prevEpisode,
      nextEpisode,
      isTrailerOnly,
      isResolvingStream,
      switchEpisode,
      switchServer,
      activeProvider,
      setActiveProvider: switchProvider,
      hasNanaflixSource: true,
      tmdbId,
      isSeries,
      isTheaterMode,
      setIsTheaterMode,
      toggleTheaterMode,
      isLightsOff,
      setIsLightsOff,
      toggleLightsOff,
    };
  }, [
    movieSlug,
    movieTitle,
    posterUrl,
    thumbUrl,
    year,
    quality,
    category,
    servers,
    currentServerIndex,
    episodes,
    activeEpisodeSlug,
    activeEpisode,
    currentIndex,
    prevEpisode,
    nextEpisode,
    isTrailerOnly,
    isResolvingStream,
    switchEpisode,
    switchServer,
    activeProvider,
    switchProvider,
    tmdbId,
    isSeries,
    isTheaterMode,
    toggleTheaterMode,
    isLightsOff,
    toggleLightsOff,
  ]);

  return (
    <WatchContext.Provider value={value}>
      <Suspense fallback={null}>
        <WatchUrlSync />
      </Suspense>
      {children}
    </WatchContext.Provider>
  );
}

/**
 * Client Component đồng bộ URL searchParams (ep, server) với WatchController state.
 * Được bọc trong <Suspense> để trang xem phim có thể chạy Static ISR hoàn toàn trên Vercel Edge.
 */
function WatchUrlSync() {
  const searchParams = useSearchParams();
  const watchContext = useWatchController();
  const { servers, currentServerIndex, activeEpisodeSlug, switchServer, switchEpisode } =
    watchContext || {};
  const lastProcessedRef = useRef<string>("");

  useEffect(() => {
    if (!servers || !switchServer || !switchEpisode) return;
    const ep = searchParams?.get("ep") || "";
    const server = searchParams?.get("server") || "";
    const syncKey = `${server}_${ep}`;

    // Chỉ thực hiện khi URL params thực sự thay đổi và có ít nhất 1 tham số
    if (!ep && !server) {
      lastProcessedRef.current = syncKey;
      return;
    }
    if (lastProcessedRef.current === syncKey) {
      return;
    }
    lastProcessedRef.current = syncKey;

    let targetServerIdx = currentServerIndex ?? 0;
    if (server) {
      const parsed = parseInt(server, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < servers.length) {
        targetServerIdx = parsed;
        if (parsed !== currentServerIndex) {
          switchServer(parsed, { preserveTime: true });
        }
      }
    }

    if (ep) {
      const targetEpisodes = servers[targetServerIdx]?.server_data || [];
      const found = findEpisodeMatch(targetEpisodes, ep);
      if (found?.slug && found.slug !== activeEpisodeSlug) {
        switchEpisode(found.slug, { preserveTime: true });
      }
    }
  }, [searchParams, servers, currentServerIndex, activeEpisodeSlug, switchServer, switchEpisode]);

  return null;
}

export default WatchController;
