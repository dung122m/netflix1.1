import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { cacheService } from "@/lib/cache";
import { getR2AssetUrl } from "@/lib/r2";

// Service cung cấp danh sách kênh truyền hình trực tiếp chuẩn FHD / HD
// - Kênh VTV sử dụng logo SVG vector chuẩn chính thức từ Đài Truyền hình Việt Nam
// - Các kênh khác giữ nguyên 100% logo gốc từ nguồn phát (M3U / Official CDN)

import {
  type TvChannel,
  VIETNAM_IPTV_M3U_SOURCES,
  CATEGORY_MAPPING,
  VERIFIED_CHANNELS,
} from "@/data/live/verifiedChannels";

export type { TvChannel };
export { VERIFIED_CHANNELS };

export interface LiveTvData {
  updatedAt: string;
  categories: string[];
  channels: TvChannel[];
}

const TV_M3U_SOURCES = [
  ...(process.env.LIVE_TV_M3U_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  ...VIETNAM_IPTV_M3U_SOURCES,
];

// Hàm gán logo VTV chuẩn chính thức (lưu trữ trực tiếp trên Cloudflare R2 CDN)
export function getVtvOfficialLogo(name: string): string {
  const upper = name.toUpperCase();

  if (
    upper.includes("CẦN THƠ") ||
    upper.includes("CAN THO") ||
    upper.includes("VTV10")
  ) {
    return "https://media.nanaflix.asia/tv-channels/vtv-can-tho.png";
  }
  if (
    upper.includes("TÂY NAM BỘ") ||
    upper.includes("TAY NAM BO") ||
    upper.includes("VTV5 TNB") ||
    upper.includes("VTV5TNB")
  ) {
    return "https://media.nanaflix.asia/tv-channels/vtv5-tay-nguyen.png";
  }
  if (
    upper.includes("TÂY NGUYÊN") ||
    upper.includes("TAY NGUYEN") ||
    upper.includes("VTV5 TN") ||
    upper.includes("VTV5TN")
  ) {
    return "https://media.nanaflix.asia/tv-channels/vtv5-tay-nguyen.png";
  }

  if (/\bVTV\s*1\b|\bVTV1\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv1.png";
  if (/\bVTV\s*2\b|\bVTV2\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv2.png";
  if (/\bVTV\s*3\b|\bVTV3\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv3.png";
  if (/\bVTV\s*4\b|\bVTV4\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv4.png";
  if (/\bVTV\s*5\b|\bVTV5\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv5.png";
  if (/\bVTV\s*6\b|\bVTV6\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv6.png";
  if (/\bVTV\s*7\b|\bVTV7\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv7.png";
  if (/\bVTV\s*8\b|\bVTV8\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv8.png";
  if (/\bVTV\s*9\b|\bVTV9\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/vtv9.png";

  return "https://media.nanaflix.asia/tv-channels/vtv1.png";
}

// Hàm gán logo HTV chuẩn chính thức
export function getHtvOfficialLogo(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes("THỂ THAO") || upper.includes("THE THAO")) {
    return "https://media.nanaflix.asia/tv-channels/htv-the-thao.png";
  }
  if (/\bHTV\s*7\b|\bHTV7\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/htv7.png";
  if (/\bHTV\s*9\b|\bHTV9\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/htv9.png";
  if (/\bHTV\s*1\b|\bHTV1\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/htv1.png";
  if (/\bHTV\s*2\b|\bHTV2\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/htv2.png";
  if (/\bHTV\s*3\b|\bHTV3\b/i.test(name)) return "https://media.nanaflix.asia/tv-channels/htv3.png";
  return "https://media.nanaflix.asia/tv-channels/htv7.png";
}

// Hàm gán logo THVL chuẩn chính thức
export function getThvlOfficialLogo(name: string): string {
  if (/\bTHVL\s*1\b|\bTHVL1\b|VĨNH LONG 1|VINH LONG 1/i.test(name)) return "https://media.nanaflix.asia/tv-channels/thvl1.webp";
  if (/\bTHVL\s*2\b|\bTHVL2\b|VĨNH LONG 2|VINH LONG 2/i.test(name)) return "https://media.nanaflix.asia/tv-channels/thvl2.webp";
  if (/\bTHVL\s*3\b|\bTHVL3\b|VĨNH LONG 3|VINH LONG 3/i.test(name)) return "https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/THVL3.webp";
  if (/\bTHVL\s*4\b|\bTHVL4\b|VĨNH LONG 4|VINH LONG 4/i.test(name)) return "https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/THVL4.webp";
  return "https://media.nanaflix.asia/tv-channels/thvl1.webp";
}

export function getOfficialChannelLogo(name: string): string {
  if (!name) return "";

  // 0. Tra cứu tự động từ Cloudflare R2 CDN (500+ kênh truyền hình Việt Nam & Quốc tế)
  const cleanName = name
    .replace(/\s*\(?(?:HD|FHD|SD|4K|1080p|720p)\)?/gi, "")
    .replace(/^[\s\.\-]+|[\s\.\-]+$/g, "")
    .trim();
  const slug = cleanName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const r2Logo = getR2AssetUrl(`tv-channels/${slug}`) || getR2AssetUrl(`tv-channels/${slug}.png`);
  if (r2Logo) return r2Logo;

  const upper = name.toUpperCase();
  if (upper.includes("VTV")) return getVtvOfficialLogo(name);
  if (upper.includes("HTV") && !upper.includes("HTVC")) return getHtvOfficialLogo(name);
  if (upper.includes("THVL") || upper.includes("VĨNH LONG") || upper.includes("VINH LONG")) return getThvlOfficialLogo(name);
  if (upper.includes("QPVN") || upper.includes("QUỐC PHÒNG")) return "https://media.nanaflix.asia/tv-channels/qpvn.png";
  if (upper.includes("HÀ NỘI 1") || upper.includes("HANOI 1") || upper.includes("HANOITV1")) return "https://media.nanaflix.asia/tv-channels/ha-noi-1.png";
  if (upper.includes("HÀ NỘI 2") || upper.includes("HANOI 2") || upper.includes("HANOITV2")) return "https://media.nanaflix.asia/tv-channels/ha-noi-2.png";
  return "";
}

let inFlightFetch: Promise<LiveTvData> | null = null;

export const liveTvService = {
  getTvChannels: async (): Promise<LiveTvData> => {
    return cacheService.fetchOrSet<LiveTvData>(
      "tv:channels:list",
      async () => liveTvService.fetchAndCacheTvChannels(),
      300
    );
  },

  revalidateTvChannels: async () => {
    if (inFlightFetch) return;
    inFlightFetch = liveTvService.fetchAndCacheTvChannels();
    try {
      const fresh = await inFlightFetch;
      await cacheService.set("tv:channels:list", fresh, 300);
    } catch {
      // Keep serving the last good snapshot when a source is unavailable.
    } finally {
      inFlightFetch = null;
    }
  },

  fetchAndCacheTvChannels: async (): Promise<LiveTvData> => {
    try {
      const fetchPromises = TV_M3U_SOURCES.map(async (srcUrl) => {
        try {
          const res = await fetch(srcUrl, {
            next: { revalidate: 300 },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(3000),
          });
          if (!res.ok) return "";
          return await res.text();
        } catch {
          return "";
        }
      });

      const results = await Promise.allSettled(fetchPromises);

      const channelList: TvChannel[] = [];
      const categoriesSet = new Set<string>();
      const seenUrls = new Set<string>();
      const seenChannelKeys = new Set<string>();

      // 1. Thêm các kênh Quốc gia & Thể thao đã xác thực trước
      VERIFIED_CHANNELS.forEach((ch) => {
        channelList.push(ch);
        categoriesSet.add(ch.category);
        seenUrls.add(ch.url);
        const normalizedName = ch.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "")
          .trim();
        seenChannelKeys.add(`${normalizedName}|${ch.category}`);
      });

      for (const resItem of results) {
        if (resItem.status !== "fulfilled" || !resItem.value) continue;
        const text = resItem.value;
        const lines = text.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith("#EXTINF")) continue;

          const rawGroupMatch = line.match(/group-title="([^"]+)"/);
          const group = rawGroupMatch ? rawGroupMatch[1].trim() : "Khác";

          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          let logo = logoMatch ? logoMatch[1].trim() : "";

          const idMatch = line.match(/tvg-id="([^"]+)"/);
          const tvgId = idMatch ? idMatch[1].trim() : "";

          const commaIdx = line.indexOf(",");
          const rawName =
            commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : "";

          // Quét tìm URL stream thực tế (bỏ qua các thẻ #EXTVLCOPT, #KODIPROP...)
          let finalUrl = "";
          for (let j = i + 1; j < lines.length && j < i + 8; j++) {
            const nextL = lines[j].trim();
            if (nextL.startsWith("http://") || nextL.startsWith("https://")) {
              finalUrl = nextL;
              break;
            }
            if (nextL.startsWith("#EXTINF")) break;
          }

          if (!finalUrl) continue;
          if (isBlockedStreamUrl(finalUrl)) continue;
          if (finalUrl.includes(".mpd")) continue;
          if (
            /(?:vips-livecdn\.fptplay\.net|^https?:\/\/[^/]*fptplay\d*\.(?:net|vn)\/)/i.test(
              finalUrl,
            ) &&
            !finalUrl.includes("token=")
          ) {
            continue;
          }

          const upperGroup = group.toUpperCase();
          const upperName = rawName.toUpperCase();

          // 1. LOẠI BỎ PHIM LẺ, ANIME, VOD, RADIO, BÁN HÀNG
          if (
            group === "LIVE EVENTS 🔴" ||
            upperGroup.includes("RADIO") ||
            upperGroup.includes("BÁN HÀNG") ||
            upperName.includes("TẬP ") ||
            upperName.includes("PHẦN ") ||
            upperName.includes("EPISODE") ||
            upperName.includes("KHÁM PHÁ")
          ) {
            continue;
          }

          // 2. LOẠI BỎ CÁC SỰ KIỆN THỂ THAO VÀ BLV (VÌ ĐÃ GOM VÀO TAB BÓNG ĐÁ / THỂ THAO)
          const isSportsOrEvent =
            upperGroup.includes("COLA TV") ||
            upperGroup.includes("PHÁO HOA TV") ||
            upperGroup.includes("FPT PLAY") ||
            upperGroup.includes("SỰ KIỆN FPT") ||
            upperGroup.includes("SỰ KIỆN TV360") ||
            upperGroup.includes("SỰ KIỆN VTVPRIME") ||
            upperGroup.includes("THỂ THAO QUỐC TẾ") ||
            upperGroup.includes("ASIAN GAMES") ||
            upperName.startsWith("SỰ KIỆN") ||
            upperName.startsWith("EVENT ") ||
            upperName.startsWith("BLV ") ||
            upperName.includes("SKY SPORT") ||
            upperName.includes("CANAL+") ||
            upperName.includes("TNT SPORTS");

          if (isSportsOrEvent) {
            continue;
          }

          // 3. Phân loại danh mục TV chuẩn
          let finalCategory = CATEGORY_MAPPING[group] || "Kênh Tổng Hợp";

          if (upperName.includes("VTV") && !upperName.includes("VTVCAB")) {
            finalCategory = "Kênh VTV";
          } else if (upperName.includes("HTV") || upperName.includes("HTVC")) {
            finalCategory = "Kênh HTV & HTVC";
          } else if (upperName.includes("SCTV")) {
            finalCategory = "Kênh SCTV";
          } else if (
            upperName.includes("VĨNH LONG") ||
            upperName.includes("THVL")
          ) {
            finalCategory = "Truyền Hình Vĩnh Long";
          } else if (
            upperName.includes("VTVCAB") ||
            upperName.startsWith("ON ")
          ) {
            finalCategory = "Kênh VTVcab";
          }

          // Bỏ qua nếu kênh này đã nằm trong danh sách VERIFIED_CHANNELS để tránh link hỏng từ M3U đè lên
          const isAlreadyInVerified = VERIFIED_CHANNELS.some(
            (v) =>
              v.name.toUpperCase().includes(upperName) ||
              (upperName.includes("VTV1") && v.id.includes("vtv1")) ||
              (upperName.includes("VTV2") && v.id.includes("vtv2")) ||
              (upperName.includes("VTV3") && v.id.includes("vtv3")) ||
              (upperName.includes("VTV4") && v.id.includes("vtv4")) ||
              (upperName.includes("VTV5") && v.id.includes("vtv5")) ||
              (upperName.includes("VTV7") && v.id.includes("vtv7")) ||
              (upperName.includes("VTV8") && v.id.includes("vtv8")) ||
              (upperName.includes("VTV9") && v.id.includes("vtv9")) ||
              (upperName.includes("HTV7") && v.id.includes("htv7")) ||
              (upperName.includes("HTV9") && v.id.includes("htv9")),
          );

          if (isAlreadyInVerified) {
            continue;
          }

          // Nâng cấp http sang https cho các domain hỗ trợ HTTPS
          if (
            finalUrl.startsWith("http://") &&
            (finalUrl.includes("fptplay") ||
              finalUrl.includes("akamaized") ||
              finalUrl.includes("vtv") ||
              finalUrl.includes("cdn") ||
              finalUrl.includes("cloudfront"))
          ) {
            finalUrl = finalUrl.replace(/^http:\/\//i, "https://");
          }

          // Đánh giá chất lượng
          const isFhd =
            finalUrl.includes("5000000") ||
            finalUrl.includes("live247-hls-avc") ||
            upperName.includes("HD") ||
            upperName.includes("FHD") ||
            upperName.includes("1080") ||
            finalUrl.includes("fnxhd") ||
            finalUrl.includes("epzhd");

          // Ưu tiên logo CDN chính thức từ Cloudflare R2 nếu có. Nếu không, giữ nguyên logo gốc từ nguồn phát
          const officialLogo = getOfficialChannelLogo(rawName);
          if (officialLogo) {
            logo = officialLogo;
          } else if (!logo || !logo.startsWith("http")) {
            logo = "/default-tv-logo.png";
          }

          // Giữ nguyên 100% logo gốc từ nguồn cho tất cả các kênh khác
          const channel: TvChannel = {
            id: `${tvgId || rawName}-${channelList.length}`,
            name: rawName,
            logo: logo,
            url: finalUrl,
            category: finalCategory,
            quality: isFhd ? "FHD 1080p" : "HD 720p",
          };

          const normalizedName = rawName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "")
            .trim();
          const channelKey = `${normalizedName}|${finalCategory}`;
          if (seenUrls.has(finalUrl) || seenChannelKeys.has(channelKey)) {
            continue;
          }

          channelList.push(channel);
          seenUrls.add(finalUrl);
          seenChannelKeys.add(channelKey);
          categoriesSet.add(finalCategory);
        }
      }

      // Sắp xếp thứ tự danh mục logic: Kênh VTV -> HTV -> Kênh Thể Thao -> SCTV -> VTVcab...
      const PREFERRED_ORDER = [
        "Kênh VTV",
        "Kênh HTV & HTVC",
        "Kênh Thể Thao",
        "Kênh SCTV",
        "Kênh VTVcab",
        "Truyền Hình Vĩnh Long",
        "Tin Tức & Thời Sự",
        "Kênh Phim & Cinema 24/7",
        "Kênh Địa Phương",
        "Kênh Quốc Tế",
        "Kênh Thiếu Nhi",
        "Kênh Âm Nhạc",
      ];

      const sortedCategories = Array.from(categoriesSet).sort((a, b) => {
        const idxA = PREFERRED_ORDER.indexOf(a);
        const idxB = PREFERRED_ORDER.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      });

      const data: LiveTvData = {
        updatedAt: new Date().toLocaleTimeString("vi-VN"),
        categories: sortedCategories,
        channels: channelList,
      };

      return data;
    } catch {
      return {
        updatedAt: new Date().toLocaleTimeString("vi-VN"),
        categories: [
          "Kênh VTV",
          "Kênh HTV & HTVC",
          "Kênh Thể Thao",
          "Kênh Quốc Tế",
        ],
        channels: VERIFIED_CHANNELS,
      };
    }
  },
};
