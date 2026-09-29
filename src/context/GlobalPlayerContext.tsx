"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export interface ActivePlaybackState {
  movieSlug: string;
  movieTitle: string;
  posterUrl: string;
  episodeName?: string;
  episodeSlug?: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackSpeed: number;
  m3u8Link?: string;
  embedSrc?: string;
  isNativeVideo: boolean;
}

interface GlobalPlayerContextValue {
  activePlayback: ActivePlaybackState | null;
  isMiniPlayerOpen: boolean;
  isMainPlayerMounted: boolean;
  registerMainPlayer: (state: Partial<ActivePlaybackState>) => void;
  updatePlaybackState: (state: Partial<ActivePlaybackState>) => void;
  unregisterMainPlayer: (lastState?: Partial<ActivePlaybackState>) => void;
  openMiniPlayer: (state: ActivePlaybackState) => void;
  closeMiniPlayer: () => void;
  expandToFullPlayer: () => void;
}

const GlobalPlayerContext = createContext<GlobalPlayerContextValue | null>(null);

export function useGlobalPlayer() {
  const ctx = useContext(GlobalPlayerContext);
  return ctx;
}

export function GlobalPlayerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [activePlayback, setActivePlayback] = useState<ActivePlaybackState | null>(null);
  const activePlaybackRef = useRef<ActivePlaybackState | null>(null);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState<boolean>(false);
  const [isMainPlayerMounted, setIsMainPlayerMounted] = useState<boolean>(false);

  useEffect(() => {
    activePlaybackRef.current = activePlayback;
  }, [activePlayback]);

  // Đăng ký khi CinemaPlayer ở trang /movies/[slug] được mount
  const registerMainPlayer = useCallback((state: Partial<ActivePlaybackState>) => {
    setIsMainPlayerMounted(true);
    setIsMiniPlayerOpen(false);
    setActivePlayback((prev) => {
      const merged: ActivePlaybackState = {
        movieSlug: state.movieSlug || prev?.movieSlug || "",
        movieTitle: state.movieTitle || prev?.movieTitle || "Đang phát",
        posterUrl: state.posterUrl || prev?.posterUrl || "",
        episodeName: state.episodeName ?? prev?.episodeName,
        episodeSlug: state.episodeSlug ?? prev?.episodeSlug,
        currentTime: state.currentTime ?? prev?.currentTime ?? 0,
        duration: state.duration ?? prev?.duration ?? 0,
        isPlaying: state.isPlaying ?? prev?.isPlaying ?? false,
        isMuted: state.isMuted ?? prev?.isMuted ?? false,
        volume: state.volume ?? prev?.volume ?? 1,
        playbackSpeed: state.playbackSpeed ?? prev?.playbackSpeed ?? 1,
        m3u8Link: state.m3u8Link ?? prev?.m3u8Link,
        embedSrc: state.embedSrc ?? prev?.embedSrc,
        isNativeVideo: state.isNativeVideo ?? prev?.isNativeVideo ?? true,
      };
      activePlaybackRef.current = merged;
      return merged;
    });
  }, []);

  // Cập nhật trạng thái phát liên tục từ CinemaPlayer
  const updatePlaybackState = useCallback((state: Partial<ActivePlaybackState>) => {
    setActivePlayback((prev) => {
      if (!prev) return null;
      const updated: ActivePlaybackState = {
        ...prev,
        ...state,
      };
      activePlaybackRef.current = updated;
      return updated;
    });
  }, []);

  // Khi CinemaPlayer unmount (người dùng chuyển sang trang khác như Trang chủ / Tìm kiếm)
  const unregisterMainPlayer = useCallback((lastState?: Partial<ActivePlaybackState>) => {
    setIsMainPlayerMounted(false);
    const current = activePlaybackRef.current;
    const finalState = { ...current, ...lastState };

    // Nếu video đã có tiến độ hoặc đang phát -> Tự động bật In-App Mini Player như YouTube
    if (finalState && finalState.movieSlug && ((finalState.currentTime ?? 0) > 1 || finalState.isPlaying)) {
      setActivePlayback(finalState as ActivePlaybackState);
      setIsMiniPlayerOpen(true);
    } else {
      setIsMiniPlayerOpen(false);
    }
  }, []);

  const openMiniPlayer = useCallback((state: ActivePlaybackState) => {
    setActivePlayback(state);
    activePlaybackRef.current = state;
    setIsMiniPlayerOpen(true);
  }, []);

  const closeMiniPlayer = useCallback(() => {
    setIsMiniPlayerOpen(false);
    setActivePlayback((prev) => (prev ? { ...prev, isPlaying: false } : null));
  }, []);

  // Phóng to trở lại trang xem phim (/movies/[slug]) tại đúng mốc thời gian và tập đang phát
  const expandToFullPlayer = useCallback(() => {
    const current = activePlaybackRef.current;
    if (!current || !current.movieSlug) return;
    setIsMiniPlayerOpen(false);

    const queryParams = new URLSearchParams();
    if (current.episodeSlug) {
      queryParams.set("ep", current.episodeSlug);
    }
    if (current.currentTime > 0) {
      queryParams.set("t", Math.floor(current.currentTime).toString());
    }

    const targetUrl = `/movies/${current.movieSlug}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    router.push(targetUrl);
  }, [router]);

  // Nếu đang ở trang xem phim của đúng phim đó thì tự ẩn MiniPlayer để tránh trùng lặp
  useEffect(() => {
    if (pathname && activePlayback?.movieSlug) {
      const isCurrentMoviePage = pathname.includes(`/movies/${activePlayback.movieSlug}`);
      if (isCurrentMoviePage && isMiniPlayerOpen) {
        setIsMiniPlayerOpen(false);
      }
    }
  }, [pathname, activePlayback?.movieSlug, isMiniPlayerOpen]);

  const value = {
    activePlayback,
    isMiniPlayerOpen,
    isMainPlayerMounted,
    registerMainPlayer,
    updatePlaybackState,
    unregisterMainPlayer,
    openMiniPlayer,
    closeMiniPlayer,
    expandToFullPlayer,
  };

  return (
    <GlobalPlayerContext.Provider value={value}>
      {children}
    </GlobalPlayerContext.Provider>
  );
}
