/**
 * Quản lý các nguồn cấp M3U bóng đá, thể thao trực tiếp và các cấu hình kênh sự kiện.
 */

import type { FootballMatch } from "./service";

export interface M3uSourceConfig {
  name: string;
  url: string;
  priority: number;
}

// Danh sách các nguồn phát bóng đá & thể thao trực tiếp chuẩn Việt Nam & Quốc Tế
export function getFootballM3uSources(): M3uSourceConfig[] {
  const envUrls = process.env.LIVE_FOOTBALL_M3U_URLS
    ? process.env.LIVE_FOOTBALL_M3U_URLS.split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const defaultSources: M3uSourceConfig[] = [
    {
      name: "THTT Live Sports (ttthethao6)",
      url: "https://thtt.pages.dev/tttt.m3u",
      priority: 1,
    },
    {
      name: "TV360 & COLA TV / Phòng BLV Bóng Đá (vmt47)",
      url: "https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/vmttv",
      priority: 2,
    },
  ];

  const customSources = envUrls.map((url, idx) => ({
    name: `Nguồn Tùy Chọn #${idx + 1}`,
    url,
    priority: 0,
  }));

  return [...customSources, ...defaultSources];
}

export const VERIFIED_SPORTS_STREAMS = {
  htvTheThao: "https://live.fptplay53.net/live/media/htvthethao/live247-hls-avc/index.m3u8",
  vtv5: "https://vips-livecdn.fptplay.net/live/media/vtv5/live247-hls-avc/index.m3u8",
  vtv6: "https://vips-livecdn.fptplay.net/live/media/vtv6/live247-hls-avc/index.m3u8",
  redbull: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
};

export const FPT_EVENT_POSTER = "https://images.fptplay53.net/media/home_event/OTT_ECS/2026/09/09/slide-thumb_1788937623612.jpg";

export function getVerified247Channels(): FootballMatch[] {
  return [];
}

export async function getFptEventChannels(): Promise<FootballMatch[]> {
  // Chỉ lấy các trận đấu thực tế từ feed M3U, không sinh dummy 18 kênh tĩnh gây lỗi 404
  return [];
}

export function extractHailabLogos(posterUrl?: string): { homeLogo?: string; awayLogo?: string } {
  if (!posterUrl) return {};
  try {
    const url = new URL(posterUrl, "https://livesport.hailab.cloud");
    const home = url.searchParams.get("home");
    const away = url.searchParams.get("away");
    return {
      homeLogo: home ? decodeURIComponent(home) : undefined,
      awayLogo: away ? decodeURIComponent(away) : undefined,
    };
  } catch {
    return {};
  }
}
