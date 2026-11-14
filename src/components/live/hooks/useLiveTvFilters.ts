"use client";

import { useState, useMemo, useEffect, useCallback, type RefObject } from "react";
import { useSearchParams } from "next/navigation";
import type { TvChannel } from "@/services/live/tv/service";

export const TV_CHANNELS_PER_PAGE = 24;

export interface UseLiveTvFiltersOptions {
  channels: TvChannel[];
  playerRef: RefObject<HTMLDivElement | null>;
  channelGridTopRef: RefObject<HTMLDivElement | null>;
  onBeforeSelectChannel?: () => void;
  onCloseDrawer?: () => void;
}

/**
 * Manages Live TV channel selection, URL/localStorage persistence,
 * category/search/FHD filtering, pagination, and next/previous channel switching.
 */
export function useLiveTvFilters({
  channels,
  playerRef,
  channelGridTopRef,
  onBeforeSelectChannel,
  onCloseDrawer,
}: UseLiveTvFiltersOptions) {
  const searchParams = useSearchParams();

  const defaultChannel = useMemo(() => {
    return (
      channels.find((c) => c.name.includes("VTV3")) ||
      channels.find((c) => c.name.includes("VTV1")) ||
      channels.find((c) => c.name.includes("HTV7")) ||
      channels[0] ||
      null
    );
  }, [channels]);

  const initialChannel = useMemo(() => {
    const channelParam = searchParams.get("channel");
    if (channelParam) {
      const found = channels.find(
        (c) =>
          c.id === channelParam ||
          c.name.toLowerCase() === channelParam.toLowerCase() ||
          c.name.toLowerCase().includes(channelParam.toLowerCase()),
      );
      if (found) return found;
    }
    return defaultChannel;
  }, [channels, searchParams, defaultChannel]);

  const [selectedTvChannel, setSelectedTvChannel] = useState<TvChannel | null>(
    initialChannel,
  );

  // Sync with searchParams if external navigation occurs
  useEffect(() => {
    setSelectedTvChannel(initialChannel);
  }, [initialChannel]);

  // Restore saved channel from localStorage ONLY after mount (if no URL parameter was given)
  useEffect(() => {
    const channelParam = searchParams.get("channel");
    if (!channelParam) {
      try {
        const savedId = localStorage.getItem("nanaflix_live_channel_id");
        if (savedId) {
          const found = channels.find(
            (c) =>
              c.id === savedId ||
              c.name.toLowerCase() === savedId.toLowerCase() ||
              c.name.toLowerCase().includes(savedId.toLowerCase()),
          );
          if (found) {
            setSelectedTvChannel(found);
          }
        }
      } catch {}
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlyFhd, setOnlyFhd] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Dải kênh phổ biến xem nhiều nhất (Quick Access Bar)
  const popularChannels = useMemo(() => {
    return channels
      .filter((ch) => {
        const lower = (ch.name + " " + ch.id).toLowerCase();
        return (
          lower.includes("vtv1") ||
          lower.includes("vtv3") ||
          lower.includes("vtv5") ||
          lower.includes("vtv6") ||
          lower.includes("htv7") ||
          lower.includes("htv9") ||
          lower.includes("sctv1") ||
          lower.includes("thvl1") ||
          lower.includes("thvl2") ||
          lower.includes("qpvn") ||
          lower.includes("antv") ||
          lower.includes("hbo") ||
          lower.includes("cinemax")
        );
      })
      .slice(0, 12);
  }, [channels]);

  // Đồng bộ khi channels hoặc URL thay đổi
  useEffect(() => {
    if (channels.length === 0) return;
    const channelParam = searchParams.get("channel");
    const savedId =
      typeof window !== "undefined"
        ? localStorage.getItem("nanaflix_live_channel_id")
        : null;
    const target = channelParam || savedId;

    if (target) {
      const found = channels.find(
        (c) =>
          c.id === target ||
          c.name.toLowerCase() === target.toLowerCase() ||
          c.name.toLowerCase().includes(target.toLowerCase()),
      );
      if (found) {
        setSelectedTvChannel(found);
        return;
      }
    }

    setSelectedTvChannel((prev) => prev || defaultChannel);
  }, [channels, searchParams, defaultChannel]);

  // Reset phân trang khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, onlyFhd]);

  // Lọc danh sách kênh
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (selectedCategory !== "all" && ch.category !== selectedCategory) {
        return false;
      }
      if (onlyFhd && !ch.quality.includes("FHD")) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = ch.name.toLowerCase().includes(q);
        const inCat = ch.category.toLowerCase().includes(q);
        if (!inName && !inCat) return false;
      }
      return true;
    });
  }, [channels, selectedCategory, searchQuery, onlyFhd]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredChannels.length / TV_CHANNELS_PER_PAGE),
  );
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedChannels = useMemo(() => {
    const startIndex = (safePage - 1) * TV_CHANNELS_PER_PAGE;
    return filteredChannels.slice(
      startIndex,
      startIndex + TV_CHANNELS_PER_PAGE,
    );
  }, [filteredChannels, safePage]);

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      if (channelGridTopRef.current) {
        const topOffset =
          channelGridTopRef.current.getBoundingClientRect().top +
          window.scrollY -
          100;
        window.scrollTo({ top: Math.max(0, topOffset), behavior: "smooth" });
      }
    },
    [channelGridTopRef],
  );

  const handleSelectChannel = useCallback(
    (channel: TvChannel, keepRailOpen = false) => {
      onBeforeSelectChannel?.();
      setSelectedTvChannel(channel);
      if (!keepRailOpen) {
        onCloseDrawer?.();
      }
      try {
        localStorage.setItem("nanaflix_live_channel_id", channel.id);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "tv");
        url.searchParams.set("channel", channel.id);
        // Dọn sạch các query params riêng của bóng đá
        url.searchParams.delete("match");
        url.searchParams.delete("tournament");
        url.searchParams.delete("group");
        url.searchParams.delete("fhd");
        window.history.replaceState(null, "", url.toString());
      } catch {}

      // Trên Mobile (<1024px): Nếu người dùng cuộn sâu xuống danh sách kênh, cuộn nhẹ về đầu Player
      // Trên Desktop (>=1024px): Player và danh sách kênh nằm song song cố định trong tầm mắt, tuyệt đối không cuộn giật trang
      if (playerRef.current && window.innerWidth < 1024 && window.scrollY > 80) {
        const topOffset =
          playerRef.current.getBoundingClientRect().top +
          window.scrollY -
          70;
        window.scrollTo({
          top: topOffset < 80 ? 0 : topOffset,
          behavior: "smooth",
        });
      }
    },
    [onBeforeSelectChannel, onCloseDrawer, playerRef],
  );

  // Chuyển kênh bằng phím N/P, PageDown/PageUp hoặc nút trên Player
  const handleSwitchChannel = useCallback(
    (direction: "next" | "prev") => {
      const activeList =
        filteredChannels.length > 0 ? filteredChannels : channels;
      if (activeList.length <= 1 || !selectedTvChannel) return;

      const currentIdx = activeList.findIndex(
        (c) =>
          c.id === selectedTvChannel.id ||
          c.name.toLowerCase() === selectedTvChannel.name.toLowerCase(),
      );

      let targetIdx = 0;
      if (currentIdx !== -1) {
        targetIdx =
          direction === "next"
            ? (currentIdx + 1) % activeList.length
            : (currentIdx - 1 + activeList.length) % activeList.length;
      }

      const nextCh = activeList[targetIdx];
      handleSelectChannel(nextCh);
    },
    [filteredChannels, channels, selectedTvChannel, handleSelectChannel],
  );

  const handleResetFilters = useCallback(() => {
    setSelectedCategory("all");
    setSearchQuery("");
    setOnlyFhd(false);
  }, []);

  const hasActiveFilters =
    selectedCategory !== "all" || searchQuery.trim() !== "" || onlyFhd;

  return {
    selectedTvChannel,
    setSelectedTvChannel,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    onlyFhd,
    setOnlyFhd,
    viewMode,
    setViewMode,
    popularChannels,
    filteredChannels,
    totalPages,
    safePage,
    displayedChannels,
    hasActiveFilters,
    handlePageChange,
    handleSelectChannel,
    handleSwitchChannel,
    handleResetFilters,
  };
}

