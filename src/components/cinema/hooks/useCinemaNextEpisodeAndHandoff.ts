"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { markEpisodeAsWatched } from "@/lib/episodeTracker";
import { saveEpisodeProgress } from "@/lib/watchHistory";
import { type EpisodeItem } from "@/components/cinema/cinemaStreamHelpers";

interface UseCinemaNextEpisodeAndHandoffOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  userId?: string;
  movieSlug?: string;
  contextMovieSlug?: string;
  propMovieSlug?: string;
  activeEpisodeSlug?: string;
  activeEpisodeName?: string;
  effectiveNextEpisode: EpisodeItem | null;
  switchEpisode?: (slug: string) => void;
  title: string;
  posterUrl: string;
  resolvedThumb?: string;
  initialTime?: number;
  urlParamT: string | null;
  showHud: (icon?: React.ReactNode, text?: string) => void;
  requestPlayerSeek: (targetTime: number, isProgrammatic?: boolean) => void;
}

export function useCinemaNextEpisodeAndHandoff({
  videoRef,
  userId,
  movieSlug,
  contextMovieSlug,
  propMovieSlug,
  activeEpisodeSlug,
  activeEpisodeName,
  effectiveNextEpisode,
  switchEpisode,
  title,
  posterUrl,
  resolvedThumb,
  initialTime,
  urlParamT,
  showHud,
  requestPlayerSeek,
}: UseCinemaNextEpisodeAndHandoffOptions) {
  const [showNextEpCountdown, setShowNextEpCountdown] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(10);
  const isNextEpDismissedRef = useRef(false);
  const nextEpCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setShowNextEpCountdown(false);
    setNextEpCountdown(10);
    isNextEpDismissedRef.current = false;
    if (nextEpCountdownTimerRef.current) {
      clearInterval(nextEpCountdownTimerRef.current);
      nextEpCountdownTimerRef.current = null;
    }
  }, [activeEpisodeSlug]);

  useEffect(() => {
    return () => {
      if (nextEpCountdownTimerRef.current) {
        clearInterval(nextEpCountdownTimerRef.current);
        nextEpCountdownTimerRef.current = null;
      }
    };
  }, []);

  const markCompletedCurrentEpisode = useCallback(() => {
    if (!movieSlug || !activeEpisodeSlug) return;
    const v = videoRef.current;
    const dur =
      v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : undefined;
    const cur =
      v && Number.isFinite(v.currentTime) && v.currentTime > 0 ? v.currentTime : 0;
    markEpisodeAsWatched(movieSlug, activeEpisodeSlug);
    saveEpisodeProgress(movieSlug, activeEpisodeSlug, cur, dur, {
      episodeName: activeEpisodeName,
      isCompleted: true,
    });
  }, [movieSlug, activeEpisodeSlug, activeEpisodeName, videoRef]);

  useEffect(() => {
    if (showNextEpCountdown && effectiveNextEpisode?.slug) {
      setNextEpCountdown(10);
      if (nextEpCountdownTimerRef.current) {
        clearInterval(nextEpCountdownTimerRef.current);
      }
      nextEpCountdownTimerRef.current = setInterval(() => {
        setNextEpCountdown((prev) => {
          if (prev <= 1) {
            if (nextEpCountdownTimerRef.current) {
              clearInterval(nextEpCountdownTimerRef.current);
              nextEpCountdownTimerRef.current = null;
            }
            setShowNextEpCountdown(false);
            markCompletedCurrentEpisode();
            if (switchEpisode && effectiveNextEpisode?.slug) {
              switchEpisode(effectiveNextEpisode.slug);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (nextEpCountdownTimerRef.current) {
          clearInterval(nextEpCountdownTimerRef.current);
          nextEpCountdownTimerRef.current = null;
        }
      };
    } else if (nextEpCountdownTimerRef.current) {
      clearInterval(nextEpCountdownTimerRef.current);
      nextEpCountdownTimerRef.current = null;
    }
  }, [
    showNextEpCountdown,
    effectiveNextEpisode?.slug,
    switchEpisode,
    markCompletedCurrentEpisode,
  ]);

  // Tiến độ xem đa thiết bị được đồng bộ qua watch_history ở AuthContext thay vì query thêm device_handoff
  void userId;
  void contextMovieSlug;
  void propMovieSlug;
  void title;
  void posterUrl;
  void resolvedThumb;
  void initialTime;
  void urlParamT;
  void showHud;
  void requestPlayerSeek;

  const handlePlayNextEpisode = useCallback(() => {
    markCompletedCurrentEpisode();
    if (switchEpisode && effectiveNextEpisode?.slug) {
      switchEpisode(effectiveNextEpisode.slug);
    }
  }, [markCompletedCurrentEpisode, switchEpisode, effectiveNextEpisode]);

  const handleDismissNextEpisode = useCallback(() => {
    isNextEpDismissedRef.current = true;
    setShowNextEpCountdown(false);
  }, []);

  return {
    showNextEpCountdown,
    setShowNextEpCountdown,
    nextEpCountdown,
    setNextEpCountdown,
    isNextEpDismissedRef,
    nextEpCountdownTimerRef,
    handlePlayNextEpisode,
    handleDismissNextEpisode,
  };
}

