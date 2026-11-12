"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { saveWatchHistory } from "@/lib/watchHistory";
import { findEpisodeMatch } from "@/lib/formatEpisode";
import { useAuth } from "@/context/AuthContext";
import { getPlayerSettings, updatePlayerSettings } from "@/services/userService";

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
  switchEpisode: (slug: string) => void;
  switchServer: (serverIndex: number) => void;
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
        const settings = getPlayerSettings();
        if (settings?.preferredServer) {
          const pref = settings.preferredServer.toLowerCase();
          const foundIdx = initialServers.findIndex((s) =>
            s.server_name?.toLowerCase().includes(pref) ||
            pref.includes(s.server_name?.toLowerCase() || "")
          );
          if (foundIdx !== -1) return foundIdx;
        }
      } catch {}
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
    if (initialEpisodeSlug) {
      const found = findEpisodeMatch(episodes, initialEpisodeSlug);
      if (found?.slug) return found.slug;
    }
    return episodes[0]?.slug || "";
  });

  const prevInitialSlugRef = useRef(initialEpisodeSlug);
  const hasInitializedHistoryRef = useRef<string | null>(null);
  const streamFetchTriedRef = useRef<Set<string>>(new Set());

  // Ghi nhận lịch sử xem duy nhất 1 lần khi mount trang hoặc khởi tạo tập phim
  useEffect(() => {
    const currentSlug = activeEpisodeSlug || episodes[0]?.slug || "";
    if (!movieSlug || !currentSlug) return;
    const historyKey = `${movieSlug}_${currentSlug}`;
    if (hasInitializedHistoryRef.current === historyKey) return;
    hasInitializedHistoryRef.current = historyKey;

    const targetEp = episodes.find((ep) => ep.slug === currentSlug) || episodes[0];
    saveWatchHistory({
      slug: movieSlug,
      title: movieTitle,
      poster: posterUrl,
      thumb: thumbUrl,
      episodeName: targetEp?.name,
      episodeSlug: currentSlug,
      year,
      quality,
      category,
      country,
      type,
      actor,
    });
  }, [
    movieSlug,
    movieTitle,
    posterUrl,
    thumbUrl,
    activeEpisodeSlug,
    episodes,
    year,
    quality,
    category,
    country,
    type,
    actor,
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
      const fetchKey = `${movieSlug}_${activeEpisodeSlug}_s${currentServerIndex}`;
      if (streamFetchTriedRef.current.has(fetchKey)) return;
      streamFetchTriedRef.current.add(fetchKey);

      const serverParam = servers[currentServerIndex]?.server_name ? `&server=${encodeURIComponent(servers[currentServerIndex].server_name)}` : "";
      setIsResolvingStream(true);
      fetch(`/api/movies/streams?slug=${encodeURIComponent(movieSlug)}&ep=${encodeURIComponent(activeEpisodeSlug)}${serverParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.streams) && data.streams.length > 0) {
            setServers((prevServers) => {
              return prevServers.map((srv, sIdx) => {
                const streamMatch = data.streams.find(
                  (s: { server_name?: string }) => s.server_name === srv.server_name
                ) || data.streams[sIdx] || data.streams[0];
                if (!streamMatch) return srv;

                const updatedData = (srv.server_data || []).map((ep) => {
                  if (
                    ep.slug === activeEpisodeSlug ||
                    ep.name === targetEp?.name ||
                    (srv.server_data?.length === 1)
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
        .finally(() => setIsResolvingStream(false));
    }
  }, [movieSlug, activeEpisodeSlug, episodes, currentServerIndex, servers]);

  // Lắng nghe sự kiện điều hướng URL (Back / Forward) từ trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const serverParam = urlParams.get("server");
        let targetServerIndex = initialServerIndex || 0;
        if (serverParam !== null) {
          const parsed = parseInt(serverParam, 10);
          if (!isNaN(parsed) && parsed >= 0 && parsed < initialServers.length) {
            targetServerIndex = parsed;
          }
        }
        setCurrentServerIndex(targetServerIndex);

        const targetServer = initialServers[targetServerIndex] || initialServers[0];
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
  }, [initialServers, initialServerIndex]);

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
  const updateUrlQuietly = useCallback((epSlug: string, sIndex: number, _prov?: PlaybackProviderType) => {
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
      // Xóa mốc thời gian cũ khỏi thanh địa chỉ để tập mới luôn phát từ đầu (0:00)
      url.searchParams.delete("t");
      window.history.pushState(null, "", url.pathname + url.search);
    } catch {}
  }, []);

  const switchProvider = useCallback(() => {}, []);

  // Chuyển tập tức thì trong 0ms, tự động nạp stream on-demand nếu chưa có
  const switchEpisode = useCallback(
    (newSlug: string) => {
      if (!newSlug || newSlug === activeEpisodeSlug) return;

      const targetEp = episodes.find((ep) => ep.slug === newSlug) || findEpisodeMatch(episodes, newSlug);
      const canonicalSlug = targetEp?.slug || newSlug;
      setActiveEpisodeSlug(canonicalSlug);
      updateUrlQuietly(canonicalSlug, currentServerIndex, activeProvider);

      // Nếu tập chưa có direct link_m3u8, tải on-demand và cập nhật vào state
      if (targetEp && (!targetEp.link_m3u8 || !targetEp.link_embed)) {
        const fetchKey = `${movieSlug}_${canonicalSlug}_s${currentServerIndex}`;
        if (!streamFetchTriedRef.current.has(fetchKey)) {
          streamFetchTriedRef.current.add(fetchKey);
          fetch(`/api/movies/streams?slug=${encodeURIComponent(movieSlug)}&ep=${encodeURIComponent(canonicalSlug)}`)
            .then((res) => res.json())
            .then((data) => {
              if (data?.success && Array.isArray(data.streams) && data.streams.length > 0) {
                setServers((prevServers) => {
                  return prevServers.map((srv, sIdx) => {
                    const streamMatch = data.streams.find(
                      (s: { server_name?: string }) => s.server_name === srv.server_name
                    ) || data.streams[sIdx] || data.streams[0];
                    if (!streamMatch) return srv;

                    const updatedData = (srv.server_data || []).map((ep) => {
                      if (ep.slug === canonicalSlug || ep.name === targetEp?.name) {
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
            .catch(() => {});
        }
      }

      const targetEpForHistory = targetEp;
      if (targetEpForHistory) {
        saveWatchHistory({
          slug: movieSlug,
          title: movieTitle,
          poster: posterUrl,
          thumb: thumbUrl,
          episodeName: targetEpForHistory.name,
          episodeSlug: targetEpForHistory.slug,
          year,
          quality,
          category,
          country,
          type,
          actor,
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
      updateUrlQuietly,
    ]
  );

  // Chuyển server tức thì và đồng bộ stream 0ms
  const switchServer = useCallback(
    (newIndex: number) => {
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
      updateUrlQuietly(currentTargetSlug, safeIndex, activeProvider);

      // On-demand nạp stream nếu tập trên server mới chưa có direct link_m3u8
      const targetEp = foundMatch || newEpisodes[0];
      if (targetEp && (!targetEp.link_m3u8 || !targetEp.link_embed) && movieSlug && currentTargetSlug) {
        const fetchKey = `${movieSlug}_${currentTargetSlug}_s${safeIndex}`;
        if (!streamFetchTriedRef.current.has(fetchKey)) {
          streamFetchTriedRef.current.add(fetchKey);
          const sName = newServer?.server_name ? `&server=${encodeURIComponent(newServer.server_name)}` : "";
          fetch(`/api/movies/streams?slug=${encodeURIComponent(movieSlug)}&ep=${encodeURIComponent(currentTargetSlug)}${sName}`)
            .then((res) => res.json())
            .then((data) => {
              if (data?.success && Array.isArray(data.streams) && data.streams.length > 0) {
                setServers((prevServers) => {
                  return prevServers.map((srv, sIdx) => {
                    const streamMatch = data.streams.find(
                      (s: { server_name?: string }) => s.server_name === srv.server_name
                    ) || data.streams[sIdx] || data.streams[0];
                    if (!streamMatch) return srv;

                    const updatedData = (srv.server_data || []).map((ep) => {
                      if (ep.slug === currentTargetSlug || ep.name === targetEp?.name) {
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
            .catch(() => {});
        }
      }
    },
    [servers, activeEpisodeSlug, activeEpisode, activeProvider, movieSlug, updateUrlQuietly, user?.uid]
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
      {children}
    </WatchContext.Provider>
  );
}

export default WatchController;
