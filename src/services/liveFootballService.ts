export interface StreamServer {
  name: string;
  url: string;
  format: "hls" | "flv" | "other";
  isHls: boolean;
  quality: "FHD" | "HD";
  sourceName?: string;
}

export interface FootballMatch {
  id: string;
  time: string;
  timestamp: number;
  title: string;
  team1: string;
  team2: string;
  blv?: string;
  logo?: string;
  homeLogo?: string;
  awayLogo?: string;
  group: string;
  groups: string[];
  quality: "FHD 1080p" | "HD 720p" | "HD";
  tournament?: string;
  timeline?: "live" | "today" | "upcoming";
  servers: StreamServer[];
}

export interface LiveFootballData {
  updatedAt: string;
  channels: string[];
  matches: FootballMatch[];
}

// Danh sách các nguồn phát bóng đá & thể thao trực tiếp
const FOOTBALL_M3U_SOURCES = [
  {
    name: "Nguồn Trực Tiếp Tổng Hợp (Xôi Lạc / Thập Cẩm / S8 / Cà Khịa)",
    url: "https://tinhlagi.pro/s.m3u",
    priority: 1,
  },
];

export function parseMatchTimeToTimestamp(timeStr: string): number {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  // Format: "HH:mm DD/MM" or "HH:mm"
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s+(\d{1,2})\/(\d{1,2}))?/);
  if (!match) return Number.MAX_SAFE_INTEGER;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Lấy ngày tháng hiện tại theo múi giờ Việt Nam (UTC+7)
  const vnNowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnNow = new Date(vnNowStr);
  const currentYear = vnNow.getFullYear();
  let day = vnNow.getDate();
  let month = vnNow.getMonth();

  if (match[3] && match[4]) {
    day = parseInt(match[3], 10);
    month = parseInt(match[4], 10) - 1;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const isoVN = `${currentYear}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+07:00`;
  const parsed = new Date(isoVN).getTime();
  return isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function getMatchTimeline(timestamp: number): "live" | "today" | "upcoming" {
  if (timestamp === Number.MAX_SAFE_INTEGER) return "today";
  const now = Date.now();
  // Trận đấu bắt đầu từ 2h30p trước đến 10p sau hiện tại tính là đang diễn ra
  if (timestamp >= now - 150 * 60 * 1000 && timestamp <= now + 10 * 60 * 1000) {
    return "live";
  }

  // So sánh ngày theo múi giờ Việt Nam (UTC+7)
  const vnNowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnNow = new Date(vnNowStr);
  const matchDate = new Date(new Date(timestamp).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));

  if (
    vnNow.getFullYear() === matchDate.getFullYear() &&
    vnNow.getMonth() === matchDate.getMonth() &&
    vnNow.getDate() === matchDate.getDate()
  ) {
    return "today";
  }

  return "upcoming";
}

function detectTournament(title: string, team1: string, team2: string): string {
  const text = `${title} ${team1} ${team2}`.toLowerCase();

  // Ngoại Hạng Anh (Premier League / EPL)
  const eplClubs = [
    "manchester united", "man utd", "mu ", "man city", "manchester city", "arsenal",
    "liverpool", "chelsea", "tottenham", "spurs", "newcastle", "aston villa",
    "west ham", "brighton", "everton", "wolves", "wolverhampton", "fulham",
    "crystal palace", "brentford", "bournemouth", "nottingham", "forest",
    "leicester", "southampton", "ipswich", "epl", "premier league", "ngoại hạng anh"
  ];
  if (eplClubs.some((c) => text.includes(c))) return "Ngoại Hạng Anh";

  // Cúp C1 / Champions League
  const c1Clubs = [
    "champions league", "cúp c1", "cup c1", "uefa", "real madrid", "barcelona",
    "bayern munich", "bayern", "psg", "paris saint-germain", "inter milan",
    "ac milan", "juventus", "dortmund", "atletico madrid", "leverkusen"
  ];
  if (c1Clubs.some((c) => text.includes(c))) return "Cúp C1";

  // La Liga
  const laLigaClubs = ["la liga", "sevilla", "valencia", "villarreal", "athletic bilbao", "sociedad", "betis", "girona", "mallorca"];
  if (laLigaClubs.some((c) => text.includes(c))) return "La Liga";

  // Serie A
  const serieAClubs = ["serie a", "napoli", "roma", "lazio", "atalanta", "fiorentina", "bologna", "torino", "genoa"];
  if (serieAClubs.some((c) => text.includes(c))) return "Serie A";

  // Bundesliga
  const bundeClubs = ["bundesliga", "leipzig", "frankfurt", "stuttgart", "monchengladbach", "bremen"];
  if (bundeClubs.some((c) => text.includes(c))) return "Bundesliga";

  // V-League
  const vleagueClubs = ["v-league", "vleague", "hà nội fc", "hagl", "nam định", "thể công", "viettel", "cahn", "bình định", "hải phòng fc", "thanh hóa fc", "slna", "bình dương"];
  if (vleagueClubs.some((c) => text.includes(c))) return "V-League";

  return "";
}

// Bộ nhớ đệm Server 3 phút
let memoryCache: { data: LiveFootballData; expireAt: number } | null = null;

export const liveFootballService = {
  getFootballMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    if (memoryCache && memoryCache.expireAt > now) {
      return memoryCache.data;
    }

    try {
      const matchMap = new Map<string, FootballMatch>();
      const channelsSet = new Set<string>();

      const fetchPromises = FOOTBALL_M3U_SOURCES.map(async (source) => {
        try {
          const res = await fetch(source.url, {
            next: { revalidate: 180 },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return "";
          return await res.text();
        } catch {
          return "";
        }
      });

      const m3uTexts = await Promise.allSettled(fetchPromises);

      for (const res of m3uTexts) {
        if (res.status !== "fulfilled" || !res.value) continue;
        const text = res.value;
        const lines = text.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith("#EXTINF")) continue;

          const groupMatch = line.match(/group-title="([^"]+)"/);
          const group = groupMatch ? groupMatch[1].trim() : "Khác";

          // Bỏ qua thẻ thông báo, IP, QR
          if (group.includes("TINHLAGI.PRO")) continue;

          channelsSet.add(group);

          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          const rawLogo = logoMatch ? logoMatch[1].trim() : "";

          // Bóc tách logo đội nhà và đội khách nếu có trong merge_logos.php
          let homeLogo = "";
          let awayLogo = "";
          if (rawLogo.includes("merge_logos.php")) {
            try {
              const urlObj = new URL(rawLogo);
              const h = urlObj.searchParams.get("home") || "";
              const a = urlObj.searchParams.get("away") || "";
              if (h && !h.includes("tinhlagi.pro/logo.jpg")) {
                homeLogo = h;
              }
              if (a && !a.includes("tinhlagi.pro/logo.jpg")) {
                awayLogo = a;
              }
            } catch {
              // ignore
            }
          } else if (rawLogo && !rawLogo.includes("tinhlagi.pro/logo.jpg")) {
            homeLogo = rawLogo;
          }

          const commaIdx = line.indexOf(",");
          const rawTitle = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : "";
          const url = lines[i + 1]?.trim() || "";

          if (
            !url ||
            (!url.startsWith("http://") && !url.startsWith("https://"))
          ) {
            continue;
          }

          // Nhận diện định dạng
          const isHls =
            url.includes(".m3u8") || rawTitle.toLowerCase().includes("[hls");
          const isFlv =
            url.includes(".flv") || rawTitle.toLowerCase().includes("[flv");
          const format: "hls" | "flv" | "other" = isHls
            ? "hls"
            : isFlv
            ? "flv"
            : "other";

          // Xác định chất lượng FHD / HD
          const upperTitle = rawTitle.toUpperCase();
          const upperUrl = url.toUpperCase();
          const isFhd =
            upperTitle.includes("FHD") ||
            upperTitle.includes("1080P") ||
            upperUrl.includes("1080P") ||
            upperUrl.includes("_1080P");
          const serverQuality: "FHD" | "HD" = isFhd ? "FHD" : "HD";

          // Bóc tách thời gian
          const timeMatch = rawTitle.match(
            /^(\d{1,2}:\d{2}(?:\s+\d{1,2}\/\d{1,2})?)/
          );
          const time = timeMatch ? timeMatch[1] : "";

          // Bóc tách BLV
          const blvMatch = rawTitle.match(/\((BLV\s+[^)]+|[^)]*)\)/i);
          let blv = "";
          if (
            blvMatch &&
            !blvMatch[1].toLowerCase().includes("fhd") &&
            !blvMatch[1].toLowerCase().includes("hd")
          ) {
            blv = blvMatch[1].trim();
          }

          // Tên trận đấu sạch
          let cleanTitle = rawTitle
            .replace(/^(\d{1,2}:\d{2}(?:\s+\d{1,2}\/\d{1,2})?)/, "")
            .replace(/\[[^\]]+\]/g, "")
            .replace(/\((FHD|HD|1080p|720p)\)/gi, "")
            .trim();

          if (blv) {
            cleanTitle = cleanTitle.replace(`(${blv})`, "").trim();
          }

          // Tách 2 đội
          let team1 = cleanTitle;
          let team2 = "";
          const vsMatch = cleanTitle.match(/(.+?)\s+(?:vs|-)\s+(.+)/i);
          if (vsMatch) {
            team1 = vsMatch[1].trim();
            team2 = vsMatch[2].trim();
          }

          const normT1 = team1
            .toLowerCase()
            .replace(/^(clb|fc)\s+/i, "")
            .replace(/[^a-z0-9]/g, "");
          const normT2 = team2
            .toLowerCase()
            .replace(/^(clb|fc)\s+/i, "")
            .replace(/[^a-z0-9]/g, "");

          // Khóa trận đấu để gộp các nguồn phát và sắp xếp theo thời gian
          const matchKey = time
            ? `${time}_${normT1}_${normT2}`
            : `${group}_${cleanTitle || rawTitle}`
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

          const cleanGroupLabel = group
            .replace(/^[🔴🟢🟡⚪🟠\s]+/, "")
            .trim();

          let serverLabel = cleanGroupLabel;
          if (blv) serverLabel += ` (${blv})`;
          if (isFhd) serverLabel += " [FHD]";
          else if (format === "hls") serverLabel += " [HLS]";
          if (rawTitle.toLowerCase().includes("hls 2")) serverLabel += " #2";

          const tournament = detectTournament(rawTitle, team1, team2);
          const timestamp = parseMatchTimeToTimestamp(time);

          if (!matchMap.has(matchKey)) {
            matchMap.set(matchKey, {
              id: matchKey,
              time,
              timestamp,
              title: cleanTitle || rawTitle,
              team1,
              team2,
              blv,
              logo: rawLogo,
              homeLogo,
              awayLogo,
              group,
              groups: [group],
              tournament,
              timeline: getMatchTimeline(timestamp),
              quality: isFhd ? "FHD 1080p" : "HD 720p",
              servers: [
                {
                  name: serverLabel,
                  url,
                  format,
                  isHls,
                  quality: serverQuality,
                  sourceName: group,
                },
              ],
            });
          } else {
            const existing = matchMap.get(matchKey)!;
            if (!existing.groups.includes(group)) {
              existing.groups.push(group);
            }
            if (isFhd) {
              existing.quality = "FHD 1080p";
            }
            if (tournament && !existing.tournament) {
              existing.tournament = tournament;
            }
            if (blv && !existing.blv?.includes(blv)) {
              const currentBlvs = existing.blv ? existing.blv.split(", ") : [];
              if (currentBlvs.length < 3) {
                existing.blv = existing.blv ? `${existing.blv}, ${blv}` : blv;
              }
            }
            if (!existing.homeLogo && homeLogo) {
              existing.homeLogo = homeLogo;
            }
            if (!existing.awayLogo && awayLogo) {
              existing.awayLogo = awayLogo;
            }
            existing.servers.push({
              name: `${serverLabel} #${existing.servers.length + 1}`,
              url,
              format,
              isHls,
              quality: serverQuality,
              sourceName: group,
            });
          }
        }
      }

      // Ưu tiên sắp xếp các server HLS lên trước
      for (const m of matchMap.values()) {
        m.servers.sort((a, b) => (b.isHls ? 1 : 0) - (a.isHls ? 1 : 0));
      }

      // SẮP XẾP TẤT CẢ CÁC TRẬN ĐẤU THEO THỨ TỰ THỜI GIAN (CHRONOLOGICAL ORDER)
      const sortedMatches = Array.from(matchMap.values()).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Lọc các trận trong khung giờ trước 2 tiếng và sau 2 tiếng (±2h) theo yêu cầu
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const twoHoursLater = now + 2 * 60 * 60 * 1000;

      const windowMatches = sortedMatches.filter(
        (m) =>
          (m.timestamp >= twoHoursAgo && m.timestamp <= twoHoursLater) ||
          m.timestamp === Number.MAX_SAFE_INTEGER
      );

      // Nếu trong khung ±2h có trận thì lấy đúng danh sách đó, nếu không có trận nào thì lấy các trận sắp tới gần nhất
      const activeMatches =
        windowMatches.length > 0
          ? windowMatches
          : sortedMatches.filter((m) => m.timestamp >= twoHoursAgo).slice(0, 12);

      const result: LiveFootballData = {
        updatedAt: new Date().toISOString(),
        channels: Array.from(channelsSet),
        matches: activeMatches,
      };

      memoryCache = {
        data: result,
        expireAt: now + 180 * 1000,
      };

      return result;
    } catch (err) {
      console.error("❌ Lỗi tải playlist bóng đá M3U:", err);
      if (memoryCache) return memoryCache.data;
      return {
        updatedAt: new Date().toISOString(),
        channels: [],
        matches: [],
      };
    }
  },
};
