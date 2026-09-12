"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { saveWatchHistory } from "@/lib/watchHistory";

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

interface WatchContextValue {
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
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
  switchEpisode: (slug: string) => void;
  switchServer: (serverIndex: number) => void;
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
  year?: number | string;
  quality?: string;
  category?: string;
  initialServers: EpisodeServer[];
  initialServerIndex?: number;
  initialEpisodeSlug?: string;
  isTrailerOnly?: boolean;
  children: React.ReactNode;
}

export function WatchController({
  movieSlug,
  movieTitle,
  posterUrl,
  year,
  quality,
  category,
  initialServers = [],
  initialServerIndex = 0,
  initialEpisodeSlug,
  isTrailerOnly = false,
  children,
}: WatchControllerProps) {
  const [currentServerIndex, setCurrentServerIndex] = useState(initialServerIndex);

  const currentServer = initialServers[currentServerIndex] || initialServers[0];
  const episodes = useMemo(
    () => currentServer?.server_data || [],
    [currentServer]
  );

  const [activeEpisodeSlug, setActiveEpisodeSlug] = useState<string>(() => {
    if (initialEpisodeSlug) {
      const found = episodes.find((ep) => ep.slug === initialEpisodeSlug);
      if (found) return found.slug || "";
    }
    return episodes[0]?.slug || "";
  });

  // Đồng bộ khi episodes hoặc initialEpisodeSlug thay đổi từ ngoài
  useEffect(() => {
    if (initialEpisodeSlug) {
      setActiveEpisodeSlug(initialEpisodeSlug);
    } else if (episodes.length > 0 && !episodes.some((e) => e.slug === activeEpisodeSlug)) {
      setActiveEpisodeSlug(episodes[0]?.slug || "");
    }
  }, [initialEpisodeSlug, episodes, activeEpisodeSlug]);

  const activeEpisode = useMemo(() => {
    return episodes.find((ep) => ep.slug === activeEpisodeSlug) || episodes[0];
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

  // Cập nhật URL sạch không làm trigger Next.js Server Re-render
  const updateUrlQuietly = useCallback((epSlug: string, sIndex: number) => {
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
      window.history.replaceState(null, "", url.pathname + url.search);
    } catch {}
  }, []);

  // Chuyển tập tức thì trong 0ms
  const switchEpisode = useCallback(
    (newSlug: string) => {
      if (!newSlug || newSlug === activeEpisodeSlug) return;
      setActiveEpisodeSlug(newSlug);
      updateUrlQuietly(newSlug, currentServerIndex);

      const targetEp = episodes.find((ep) => ep.slug === newSlug);
      if (targetEp) {
        saveWatchHistory({
          slug: movieSlug,
          title: movieTitle,
          poster: posterUrl,
          episodeName: targetEp.name,
          episodeSlug: targetEp.slug,
          year,
          quality,
          category,
        });
      }
    },
    [
      activeEpisodeSlug,
      episodes,
      currentServerIndex,
      movieSlug,
      movieTitle,
      posterUrl,
      year,
      quality,
      category,
      updateUrlQuietly,
    ]
  );

  // Chuyển server tức thì
  const switchServer = useCallback(
    (newIndex: number) => {
      const safeIndex = Math.max(0, Math.min(newIndex, initialServers.length - 1));
      setCurrentServerIndex(safeIndex);
      const newServer = initialServers[safeIndex];
      const newEpisodes = newServer?.server_data || [];
      const currentTargetSlug = newEpisodes.some((e) => e.slug === activeEpisodeSlug)
        ? activeEpisodeSlug
        : newEpisodes[0]?.slug || "";
      setActiveEpisodeSlug(currentTargetSlug);
      updateUrlQuietly(currentTargetSlug, safeIndex);
    },
    [initialServers, activeEpisodeSlug, updateUrlQuietly]
  );

  const value = useMemo<WatchContextValue>(() => {
    return {
      movieSlug,
      movieTitle,
      posterUrl,
      year,
      quality,
      category,
      servers: initialServers,
      currentServerIndex,
      episodes,
      activeEpisodeSlug,
      activeEpisode,
      currentIndex,
      prevEpisode,
      nextEpisode,
      isTrailerOnly,
      switchEpisode,
      switchServer,
    };
  }, [
    movieSlug,
    movieTitle,
    posterUrl,
    year,
    quality,
    category,
    initialServers,
    currentServerIndex,
    episodes,
    activeEpisodeSlug,
    activeEpisode,
    currentIndex,
    prevEpisode,
    nextEpisode,
    isTrailerOnly,
    switchEpisode,
    switchServer,
  ]);

  return (
    <WatchContext.Provider value={value}>
      {children}
    </WatchContext.Provider>
  );
}

export default WatchController;
