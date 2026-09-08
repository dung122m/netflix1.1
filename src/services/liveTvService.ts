export interface TvChannel {
  id: string;
  name: string;
  logo: string;
  url: string;
  category: string;
  quality: "FHD 1080p" | "HD 720p";
}

export interface LiveTvData {
  updatedAt: string;
  categories: string[];
  channels: TvChannel[];
}

const VIETNAM_IPTV_M3U =
  "https://raw.githubusercontent.com/khanh71/All-In-One-IPTV/main/http-iptv.m3u";

// Danh mục chuẩn hóa thân thiện
const CATEGORY_MAPPING: Record<string, string> = {
  "VTV": "Kênh VTV",
  "HTV/HTVC": "Kênh HTV & HTVC",
  "VTC": "Kênh VTC & Tin Tức",
  "Truyền hình Vĩnh Long": "Truyền Hình Vĩnh Long",
  "Thể thao": "Kênh Thể Thao",
  "Kênh Thể Thao": "Kênh Thể Thao",
  "Địa phương": "Kênh Địa Phương",
  "Quốc tế": "Kênh Quốc Tế",
};

// Kênh quốc tế thể thao chất lượng cao bổ sung
const CURATED_SPORTS_CHANNELS: TvChannel[] = [
  {
    id: "redbull-tv",
    name: "Red Bull TV Sports HD",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f5/Red_Bull_TV_logo.svg/512px-Red_Bull_TV_logo.svg.png",
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
  {
    id: "nhk-world-japan",
    name: "NHK World Japan HD",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/NHK_World-Japan.svg/512px-NHK_World-Japan.svg.png",
    url: "https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8",
    category: "Kênh Quốc Tế",
    quality: "FHD 1080p",
  },
];

let memoryCache: { data: LiveTvData; expireAt: number } | null = null;

export const liveTvService = {
  getTvChannels: async (): Promise<LiveTvData> => {
    const now = Date.now();
    if (memoryCache && memoryCache.expireAt > now) {
      return memoryCache.data;
    }

    try {
      const res = await fetch(VIETNAM_IPTV_M3U, {
        next: { revalidate: 600 }, // Cache 10 phút
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch IPTV M3U: ${res.status}`);
      }

      const text = await res.text();
      const lines = text.split("\n");

      const channelList: TvChannel[] = [];
      const categoriesSet = new Set<string>();

      // Thêm các kênh thể thao chọn lọc trước
      CURATED_SPORTS_CHANNELS.forEach((ch) => {
        channelList.push(ch);
        categoriesSet.add(ch.category);
      });

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line.startsWith("#EXTINF")) continue;

        const rawGroupMatch = line.match(/group-title="([^"]+)"/);
        let group = rawGroupMatch ? rawGroupMatch[1].trim() : "Khác";

        // Chuẩn hóa danh mục
        if (CATEGORY_MAPPING[group]) {
          group = CATEGORY_MAPPING[group];
        }

        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const logo = logoMatch ? logoMatch[1].trim() : "";

        const idMatch = line.match(/tvg-id="([^"]+)"/);
        const tvgId = idMatch ? idMatch[1].trim() : "";

        const commaIdx = line.indexOf(",");
        const rawName = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : "";

        let finalUrl = lines[i + 1]?.trim() || "";

        if (!finalUrl || (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://"))) {
          continue;
        }

        // Nâng cấp http sang https cho các domain hỗ trợ HTTPS
        if (finalUrl.startsWith("http://") && (
          finalUrl.includes("fptplay") ||
          finalUrl.includes("akamaized") ||
          finalUrl.includes("vtv") ||
          finalUrl.includes("cdn") ||
          finalUrl.includes("cloudfront")
        )) {
          finalUrl = finalUrl.replace(/^http:\/\//i, "https://");
        }

        // Tự động gom VTV5 / VTV Cần Thơ / HTV Thể Thao vào mục Kênh Thể Thao
        let finalCategory = group;
        const upperName = rawName.toUpperCase();
        if (
          upperName.includes("VTV5") ||
          upperName.includes("VTV CẦN THƠ") ||
          upperName.includes("VTV CAN THO") ||
          upperName.includes("THỂ THAO") ||
          upperName.includes("THE THAO") ||
          upperName.includes("SPORTS")
        ) {
          finalCategory = "Kênh Thể Thao";
        }

        // Đánh giá chất lượng (Ưu tiên FHD 5000000 bitrates hoặc master stream 1080p)
        const isFhd =
          finalUrl.includes("5000000") ||
          finalUrl.includes("live247-hls-avc") ||
          upperName.includes("HD") ||
          upperName.includes("FHD") ||
          upperName.includes("1080") ||
          finalUrl.includes("fnxhd") ||
          finalUrl.includes("epzhd");

        const channel: TvChannel = {
          id: `${tvgId || rawName}-${channelList.length}`,
          name: rawName,
          logo: logo || "https://i.imgur.com/q3fjpYc.png",
          url: finalUrl,
          category: finalCategory,
          quality: isFhd ? "FHD 1080p" : "HD 720p",
        };

        channelList.push(channel);
        categoriesSet.add(finalCategory);
      }

      // Sắp xếp thứ tự danh mục logic: Kênh Thể Thao -> Kênh VTV -> Kênh HTV -> Vĩnh Long -> Địa Phương -> Quốc Tế
      const PREFERRED_ORDER = [
        "Kênh Thể Thao",
        "Kênh VTV",
        "Kênh HTV & HTVC",
        "Truyền Hình Vĩnh Long",
        "Kênh VTC & Tin Tức",
        "Kênh Quốc Tế",
        "Kênh Địa Phương",
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
        expireAt: now + 10 * 60 * 1000,
      };

      return data;
    } catch {
      // Fallback nếu link lỗi
      return {
        updatedAt: new Date().toLocaleTimeString("vi-VN"),
        categories: ["Kênh Thể Thao", "Kênh Quốc Tế"],
        channels: CURATED_SPORTS_CHANNELS,
      };
    }
  },
};
