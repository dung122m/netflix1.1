import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";

// Service cung cấp danh sách kênh truyền hình trực tiếp chuẩn FHD / HD
// - Kênh VTV sử dụng logo SVG vector chuẩn chính thức từ Đài Truyền hình Việt Nam
// - Các kênh khác giữ nguyên 100% logo gốc từ nguồn phát (M3U / Official CDN)

export interface TvChannel {
  id: string;
  name: string;
  logo: string;
  url: string;
  fallbackUrl?: string;
  category: string;
  quality: "FHD 1080p" | "HD 720p";
}

export interface LiveTvData {
  updatedAt: string;
  categories: string[];
  channels: TvChannel[];
}

const VIETNAM_IPTV_M3U_SOURCES = [
  "https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/vmttv",
  "https://dl.dropboxusercontent.com/s/o5vygit34v9ryly71gam4/coban66.m3u?rlkey=auyoon54hfubajt16nc7u7dbn&st=70gyvtcu&dl=0",
  "https://raw.githubusercontent.com/vietng228/m3u/refs/heads/main/new.m3u",
  "https://raw.githubusercontent.com/khanh71/All-In-One-IPTV/main/http-iptv.m3u",
  "https://raw.githubusercontent.com/giangnam0201/All-In-One-IPTV/refs/heads/main/channels.m3u",
];

const TV_M3U_SOURCES = [
  ...(process.env.LIVE_TV_M3U_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  ...VIETNAM_IPTV_M3U_SOURCES,
];

// Danh mục chuẩn hóa thân thiện
const CATEGORY_MAPPING: Record<string, string> = {
  VTV: "Kênh VTV",
  "KÊNH VTV": "Kênh VTV",
  HTV: "Kênh HTV & HTVC",
  HTVC: "Kênh HTV & HTVC",
  "HTV/HTVC": "Kênh HTV & HTVC",
  "KÊNH HTV - BÁO VÀ PTTH TPHCM": "Kênh HTV & HTVC",
  "KÊNH HTVC - BÁO VÀ PTTH TPHCM": "Kênh HTV & HTVC",
  SCTV: "Kênh SCTV",
  "KÊNH SCTV": "Kênh SCTV",
  VTVcab: "Kênh VTVcab",
  "KÊNH VTVcab": "Kênh VTVcab",
  "Truyền hình Vĩnh Long": "Truyền Hình Vĩnh Long",
  "KÊNH THIẾT YẾU": "Tin Tức & Thời Sự",
  "KÊNH TIN TỨC": "Tin Tức & Thời Sự",
  "🌐| Thiết yếu": "Tin Tức & Thời Sự",
  VTC: "Tin Tức & Thời Sự",
  "KÊNH TRONG NƯỚC & ĐỊA PHƯƠNG": "Kênh Địa Phương",
  "Địa phương": "Kênh Địa Phương",
  "KÊNH PHIM TRUYỆN": "Kênh Phim & Cinema 24/7",
  "KÊNH GIẢI TRÍ": "Kênh Phim & Cinema 24/7",
  "Giải Trí": "Kênh Phim & Cinema 24/7",
  "📦| In The Box": "Kênh Phim & Cinema 24/7",
  TVB: "Kênh Phim & Cinema 24/7",
  "KÊNH THIẾU NHI": "Kênh Thiếu Nhi",
  "Quốc Tế": "Kênh Quốc Tế",
  "KÊNH TỔNG HỢP NUỚC NGOÀI": "Kênh Quốc Tế",
  "KÊNH ĐẶC SẮC": "Kênh Quốc Tế",
  "KÊNH CA NHẠC": "Kênh Âm Nhạc",
};

// Hàm gán logo VTV chuẩn chính thức (chỉ gán cho đúng kênh VTV)
export function getVtvOfficialLogo(name: string): string {
  const upper = name.toUpperCase();

  if (
    upper.includes("CẦN THƠ") ||
    upper.includes("CAN THO") ||
    upper.includes("TÂY NAM BỘ") ||
    upper.includes("TAY NAM BO")
  ) {
    if (upper.includes("VTV")) return "/images/channels/vtv-cantho.svg";
  }
  if (upper.includes("TÂY NGUYÊN") || upper.includes("TAY NGUYEN")) {
    if (upper.includes("VTV")) return "/images/channels/vtv-taynguyen.svg";
  }

  if (/\bVTV\s*1\b|\bVTV1\b/i.test(name)) return "/images/channels/vtv1.svg";
  if (/\bVTV\s*2\b|\bVTV2\b/i.test(name)) return "/images/channels/vtv2.svg";
  if (/\bVTV\s*3\b|\bVTV3\b/i.test(name)) return "/images/channels/vtv3.svg";
  if (/\bVTV\s*4\b|\bVTV4\b/i.test(name)) return "/images/channels/vtv4.svg";
  if (/\bVTV\s*5\b|\bVTV5\b/i.test(name)) return "/images/channels/vtv5.svg";
  if (/\bVTV\s*6\b|\bVTV6\b/i.test(name)) return "/images/channels/vtv6.svg";
  if (/\bVTV\s*7\b|\bVTV7\b/i.test(name)) return "/images/channels/vtv7.svg";
  if (/\bVTV\s*8\b|\bVTV8\b/i.test(name)) return "/images/channels/vtv8.svg";
  if (/\bVTV\s*9\b|\bVTV9\b/i.test(name)) return "/images/channels/vtv9.svg";

  return "";
}

// Hàm gán logo HTV chuẩn chính thức
export function getHtvOfficialLogo(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes("THỂ THAO") || upper.includes("THE THAO")) {
    return "/images/channels/htv-thethao.svg";
  }
  if (/\bHTV\s*7\b|\bHTV7\b/i.test(name)) return "/images/channels/htv7.svg";
  if (/\bHTV\s*9\b|\bHTV9\b/i.test(name)) return "/images/channels/htv9.svg";
  if (/\bHTV\s*1\b|\bHTV1\b/i.test(name)) return "/images/channels/htv1.svg";
  if (/\bHTV\s*2\b|\bHTV2\b/i.test(name)) return "/images/channels/htv2.svg";
  if (/\bHTV\s*3\b|\bHTV3\b/i.test(name)) return "/images/channels/htv3.svg";
  return "/images/channels/htv7.svg";
}

// Hàm gán logo THVL chuẩn chính thức
export function getThvlOfficialLogo(name: string): string {
  if (/\bTHVL\s*1\b|\bTHVL1\b|VĨNH LONG 1|VINH LONG 1/i.test(name)) return "/images/channels/thvl1.svg";
  if (/\bTHVL\s*2\b|\bTHVL2\b|VĨNH LONG 2|VINH LONG 2/i.test(name)) return "/images/channels/thvl2.svg";
  if (/\bTHVL\s*3\b|\bTHVL3\b|VĨNH LONG 3|VINH LONG 3/i.test(name)) return "/images/channels/thvl3.svg";
  if (/\bTHVL\s*4\b|\bTHVL4\b|VĨNH LONG 4|VINH LONG 4/i.test(name)) return "/images/channels/thvl4.svg";
  return "/images/channels/thvl1.svg";
}

// Danh sách kênh Quốc Gia & Thể Thao ĐÃ KIỂM TRA 100% HOẠT ĐỘNG (FHD 1080p / 720p - Master Index)
const VERIFIED_CHANNELS: TvChannel[] = [
  // --- KÊNH VTV CHÍNH THỨC (FHD 1080P VỚI LOGO VECTOR CHÍNH THỨC) ---
  {
    id: "vtv1-fhd",
    name: "VTV1 HD (Thời sự - Chính luận)",
    logo: "/images/channels/vtv1.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv1/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv2-fhd",
    name: "VTV2 HD (Khoa học - Giáo dục)",
    logo: "/images/channels/vtv2.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv2/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv2/live247-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv3-hd",
    name: "VTV3 HD (Giải trí - Thể thao)",
    logo: "/images/channels/vtv3.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv3/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv4-fhd",
    name: "VTV4 HD (Đối ngoại)",
    logo: "/images/channels/vtv4.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv4/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv4/live247-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv5-fhd",
    name: "VTV5 HD (Thể thao & Dân tộc)",
    logo: "/images/channels/vtv5.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv5/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8",
    category: "Kênh Thể Thao",
    quality: "FHD 1080p",
  },
  {
    id: "vtv6-fhd",
    name: "VTV6 HD (Thanh thiếu niên - Thể thao)",
    logo: "/images/channels/vtv6.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv6/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv6/live247-hls-avc/index.m3u8",
    category: "Kênh Thể Thao",
    quality: "FHD 1080p",
  },
  {
    id: "vtv7-hd",
    name: "VTV7 HD (Giáo dục Quốc gia)",
    logo: "/images/channels/vtv7.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv7/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv7/live247-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv8-fhd",
    name: "VTV8 HD (Miền Trung - Tây Nguyên)",
    logo: "/images/channels/vtv8.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv8/live-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/epzhd1/vtv8hd_vhls.smil/chunklist_b5000000.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv9-hd",
    name: "VTV9 HD (Khu vực Miền Nam)",
    logo: "/images/channels/vtv9.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv9/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv9/live247-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv-cantho-fhd",
    name: "VTV Cần Thơ HD (Tây Nam Bộ)",
    logo: "/images/channels/vtv-cantho.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv5tnb/live-hls-avc/index.m3u8",
    fallbackUrl: "https://live-a.fptplay53.net/live/media/vtv5tnb/live-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },
  {
    id: "vtv-taynguyen-fhd",
    name: "VTV Tây Nguyên HD",
    logo: "/images/channels/vtv-taynguyen.svg",
    url: "https://vips-livecdn.fptplay.net/live/media/vtv5tn/live-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/live/media/vtv5tn/live-hls-avc/index.m3u8",
    category: "Kênh VTV",
    quality: "FHD 1080p",
  },

  // --- KÊNH HTV & THỂ THAO ---
  {
    id: "htv-thethao-fhd",
    name: "HTV Thể Thao HD",
    logo: "/images/channels/htv-thethao.svg",
    url: "https://live.fptplay53.net/live/media/htvthethao/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/epzhd1/htvcthethao_vhls.smil/chunklist.m3u8",
    category: "Kênh Thể Thao",
    quality: "FHD 1080p",
  },
  {
    id: "htv7-fhd",
    name: "HTV7 HD",
    logo: "/images/channels/htv7.svg",
    url: "https://live.fptplay53.net/live/media/htv7/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/epzhd1/htv7hd_vhls.smil/chunklist_b5000000.m3u8",
    category: "Kênh HTV & HTVC",
    quality: "FHD 1080p",
  },
  {
    id: "htv9-fhd",
    name: "HTV9 HD",
    logo: "/images/channels/htv9.svg",
    url: "https://live.fptplay53.net/live/media/htv9/live247-hls-avc/index.m3u8",
    fallbackUrl: "https://live.fptplay53.net/epzhd1/htv9hd_vhls.smil/chunklist_b5000000.m3u8",
    category: "Kênh HTV & HTVC",
    quality: "FHD 1080p",
  },
  {
    id: "htv1-hd",
    name: "HTV1",
    logo: "/images/channels/htv1.svg",
    url: "https://live.fptplay53.net/epzhd1/htv1_hls.smil/chunklist.m3u8",
    category: "Kênh HTV & HTVC",
    quality: "HD 720p",
  },
  {
    id: "htv2-hd",
    name: "HTV2 - Vie Channel HD",
    logo: "/images/channels/htv2.svg",
    url: "https://live.fptplay53.net/epzhd1/htv2hd_vhls.smil/chunklist_b5000000.m3u8",
    category: "Kênh HTV & HTVC",
    quality: "FHD 1080p",
  },
  {
    id: "htv3-hd",
    name: "HTV3 - DreamsTV (Thiếu Nhi)",
    logo: "/images/channels/htv3.svg",
    url: "https://live.fptplay53.net/epzhd1/htv3_hls.smil/chunklist.m3u8",
    category: "Kênh HTV & HTVC",
    quality: "HD 720p",
  },

  // --- TRUYỀN HÌNH VĨNH LONG ---
  {
    id: "thvl1-fhd",
    name: "THVL1 HD (Truyền hình Vĩnh Long 1)",
    logo: "/images/channels/thvl1.svg",
    url: "https://live.fptplay53.net/epzhd2/vinhlong1_vhls.smil/chunklist.m3u8",
    category: "Truyền Hình Vĩnh Long",
    quality: "FHD 1080p",
  },
  {
    id: "thvl2-fhd",
    name: "THVL2 HD (Truyền hình Vĩnh Long 2)",
    logo: "/images/channels/thvl2.svg",
    url: "https://live.fptplay53.net/epzhd2/vinhlong2_vhls.smil/chunklist.m3u8",
    fallbackUrl: "https://1011154949.vnns.net/CDN-FPT02/THVL2-HD-1080p/playlist.m3u8",
    category: "Truyền Hình Vĩnh Long",
    quality: "FHD 1080p",
  },
  {
    id: "thvl3-hd",
    name: "THVL3 HD (Phim Hay)",
    logo: "/images/channels/thvl3.svg",
    url: "https://live.fptplay53.net/epzhd2/vinhlong3_vhls.smil/chunklist.m3u8",
    category: "Truyền Hình Vĩnh Long",
    quality: "HD 720p",
  },
  {
    id: "thvl4-hd",
    name: "THVL4 HD (Giải trí tổng hợp)",
    logo: "/images/channels/thvl4.svg",
    url: "https://live.fptplay53.net/epzhd2/vinhlong4-hd_vhls.smil/chunklist.m3u8",
    category: "Truyền Hình Vĩnh Long",
    quality: "HD 720p",
  },

  // --- TIN TỨC & QUÂN ĐỘI ---
  {
    id: "qpvn-fhd",
    name: "QPVN HD (Quốc Phòng Việt Nam)",
    logo: "/images/channels/qpvn.svg",
    url: "https://qpvn.vn/live/qpvn/master.m3u8",
    category: "Tin Tức & Thời Sự",
    quality: "FHD 1080p",
  },
  {
    id: "hanoi1-hd",
    name: "Hà Nội 1 HD (HanoiTV1)",
    logo: "/images/channels/hanoi1.svg",
    url: "https://liveh34.vtvprime.vn/hls/HANOI1TV/index.m3u8",
    category: "Kênh Địa Phương",
    quality: "HD 720p",
  },

  // --- KÊNH QUỐC TẾ CHỌN LỌC ---
  {
    id: "redbull-tv",
    name: "Red Bull TV Sports HD",
    logo: "/images/channels/redbull.svg",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    category: "Kênh Thể Thao",
    quality: "FHD 1080p",
  },
  {
    id: "nasa-tv-hd",
    name: "NASA TV HD (Khám Phá)",
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    category: "Kênh Quốc Tế",
    quality: "FHD 1080p",
  },
];

let memoryCache: {
  data: LiveTvData;
  expireAt: number;
  staleUntil: number;
} | null = null;
let inFlightFetch: Promise<LiveTvData> | null = null;

export const liveTvService = {
  getTvChannels: async (): Promise<LiveTvData> => {
    const now = Date.now();
    if (memoryCache) {
      if (memoryCache.expireAt > now) {
        return memoryCache.data;
      }
      // Dùng tạm stale data 60 phút và fetch cập nhật ngầm
      if (memoryCache.staleUntil > now) {
        liveTvService.revalidateTvChannels().catch(() => {});
        return memoryCache.data;
      }
    }

    if (inFlightFetch) return inFlightFetch;
    inFlightFetch = liveTvService.fetchAndCacheTvChannels();
    try {
      return await inFlightFetch;
    } finally {
      inFlightFetch = null;
    }
  },

  revalidateTvChannels: async () => {
    if (inFlightFetch) return;
    inFlightFetch = liveTvService.fetchAndCacheTvChannels();
    try {
      await inFlightFetch;
    } catch {
      // Keep serving the last good snapshot when a source is unavailable.
    } finally {
      inFlightFetch = null;
    }
  },

  fetchAndCacheTvChannels: async (): Promise<LiveTvData> => {
    const now = Date.now();
    try {
      const fetchPromises = TV_M3U_SOURCES.map(async (srcUrl) => {
        try {
          const res = await fetch(srcUrl, {
            next: { revalidate: 300 },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(4500),
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

          // Gán logo vector chuẩn cho các kênh quốc gia & đài truyền hình lớn
          const vtvLogo = getVtvOfficialLogo(rawName);
          if (vtvLogo) {
            logo = vtvLogo;
          } else if (upperName.includes("HTV") && !upperName.includes("HTVC")) {
            const htvLogo = getHtvOfficialLogo(rawName);
            if (htvLogo) logo = htvLogo;
          } else if (upperName.includes("THVL") || upperName.includes("VĨNH LONG") || upperName.includes("VINH LONG")) {
            const thvlLogo = getThvlOfficialLogo(rawName);
            if (thvlLogo) logo = thvlLogo;
          } else if (upperName.includes("QPVN") || upperName.includes("QUỐC PHÒNG")) {
            logo = "/images/channels/qpvn.svg";
          } else if (upperName.includes("HÀ NỘI 1") || upperName.includes("HANOI 1") || upperName.includes("HANOITV1")) {
            logo = "/images/channels/hanoi1.svg";
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

      // Sắp xếp thứ tự danh mục logic: Kênh VTV -> HTV -> SCTV -> VTVcab -> Vĩnh Long -> Tin Tức -> Phim -> Địa Phương -> Quốc Tế
      const PREFERRED_ORDER = [
        "Kênh VTV",
        "Kênh HTV & HTVC",
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

      memoryCache = {
        data,
        expireAt: now + 10 * 60 * 1000, // 10 phút tươi
        staleUntil: now + 24 * 60 * 60 * 1000, // 24h stale-while-revalidate
      };

      return data;
    } catch {
      // Fallback nếu link lỗi
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
