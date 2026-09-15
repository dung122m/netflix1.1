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
      const found = findEpisodeMatch(episodes, initialEpisodeSlug);
      if (found?.slug) return found.slug;
    }
    return episodes[0]?.slug || "";
  });

  const prevInitialSlugRef = useRef(initialEpisodeSlug);

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

  // Lắng nghe sự kiện điều hướng URL (Back / Forward) từ trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const epParam = urlParams.get("ep");
        if (epParam && episodes.length > 0) {
          const found = findEpisodeMatch(episodes, epParam);
          if (found?.slug) {
            setActiveEpisodeSlug(found.slug);
          }
        }
      } catch {}
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [episodes]);

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

  // Cập nhật URL sạch trên thanh địa chỉ không làm reload trang
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
      window.history.pushState(null, "", url.pathname + url.search);
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
      const foundMatch =
        findEpisodeMatch(newEpisodes, activeEpisodeSlug) ||
        (activeEpisode?.name ? findEpisodeMatch(newEpisodes, activeEpisode.name) : undefined);
      const currentTargetSlug = foundMatch?.slug || newEpisodes[0]?.slug || "";
      setActiveEpisodeSlug(currentTargetSlug);
      updateUrlQuietly(currentTargetSlug, safeIndex);
    },
    [initialServers, activeEpisodeSlug, activeEpisode?.name, updateUrlQuietly]
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
