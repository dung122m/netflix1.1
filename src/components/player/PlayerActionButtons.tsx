"use client";

import React from "react";

interface EpisodeItem {
  name?: string;
  slug?: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface PlayerActionButtonsProps {
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  isLightsOff?: boolean;
  onToggleLightsOff?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  prevEpisode?: EpisodeItem | null;
  nextEpisode?: EpisodeItem | null;
  onSwitchEpisode?: (slug: string) => void;
  isSticky?: boolean;
}

/**
 * PlayerActionButtons: Đã gỡ bỏ toàn bộ cụm nút thừa dưới Player theo yêu cầu UX mới.
 * Mọi thao tác (Phím tắt, Rạp phim, Toàn màn hình, Chuyển tập) hiện được tích hợp
 * trực tiếp trên thanh điều khiển PlayerNativeControls.
 */
export const PlayerActionButtons: React.FC<PlayerActionButtonsProps> = React.memo(
  function PlayerActionButtons() {
    return null;
  }
);

PlayerActionButtons.displayName = "PlayerActionButtons";
