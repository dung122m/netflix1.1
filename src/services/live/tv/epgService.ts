import { cacheService } from "@/lib/cache";

export interface EpgProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  start: string; // "19:00"
  end: string;   // "19:45"
  startTimestamp: number;
  endTimestamp: number;
  isLiveNow?: boolean;
  progressPercent?: number;
}

export interface ChannelEpg {
  channelId: string;
  channelName?: string;
  currentProgram?: EpgProgram;
  nextProgram?: EpgProgram;
  programs: EpgProgram[];
}

export type EpgDataMap = Record<string, ChannelEpg>;

const EPG_XML_SOURCES = [
  "https://lichphatsong.io.vn/epg.xml",
  "https://clickconcac.quanlehong539.workers.dev/epg.xml",
];

/**
 * Normalizes channel name or ID to a canonical key for matching.
 * Examples:
 * "VTV1 HD (Thời sự - Chính luận)" -> "vtv1"
 * "vtv1-fhd" -> "vtv1"
 * "HTV7 HD" -> "htv7"
 * "Truyền hình Vĩnh Long 1" -> "thvl1"
 * "THVL 1 HD" -> "thvl1"
 */
export function normalizeChannelKey(input: string): string {
  if (!input) return "";
  const clean = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove Vietnamese accents
    .replace(/\b(hd|fhd|sd|4k|truyen hinh|kenh|viet nam|chinh thuc|thoi su|giai tri|chinh luan|quoc te)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

  // Special regional VTV channels (Check TNB before TN)
  if (clean.includes("vtv5taynambo") || clean.includes("vtv5tnb") || clean.includes("vtv5hdtnb")) return "vtv5tnb";
  if (clean.includes("vtv5taynguyen") || clean.includes("vtv5tn") || clean.includes("vtv5hdtn")) return "vtv5tn";
  if (clean.includes("vtv10")) return "vtv10";

  // VTV channels (e.g. vtv1, vtv2, ..., vtv9)
  const vtvMatch = clean.match(/vtv(\d+)/);
  if (vtvMatch) {
    return `vtv${vtvMatch[1]}`;
  }

  // HTV channels
  if (clean.includes("htvthethao") || clean.includes("htvtt")) return "htvtt";
  const htvMatch = clean.match(/htv(\d+)/);
  if (htvMatch) {
    return `htv${htvMatch[1]}`;
  }

  // THVL / Vinh Long channels
  if (clean.includes("vinhlong1") || clean.includes("thvl1")) return "thvl1";
  if (clean.includes("vinhlong2") || clean.includes("thvl2")) return "thvl2";
  if (clean.includes("vinhlong3") || clean.includes("thvl3")) return "thvl3";
  if (clean.includes("vinhlong4") || clean.includes("thvl4")) return "thvl4";
  if (clean.includes("vinhlong5") || clean.includes("thvl5")) return "thvl5";

  // VTC channels
  const vtcMatch = clean.match(/vtc(\d+)/);
  if (vtcMatch) {
    return `vtc${vtcMatch[1]}`;
  }

  // Other specific channels
  if (clean.includes("qpvn") || clean.includes("quocphong")) return "qpvn";
  if (clean.includes("antv") || clean.includes("anninh")) return "antv";
  if (clean.includes("hanoi1") || clean.includes("hn1")) return "hanoi1";
  if (clean.includes("hanoi2") || clean.includes("hn2")) return "hanoi2";

  if (clean.includes("onsportsnews")) return "onsportsnews";
  if (clean.includes("onsportsplus")) return "onsportsplus";
  if (clean.includes("onsports")) return "onsports";
  if (clean.includes("onfootball")) return "onfootball";

  return clean;
}

/**
 * Parses XMLTV date format: "YYYYMMDDHHmmss +0700" or "YYYYMMDDHHmmss"
 */
function parseXmltvTime(timeStr: string): { timestamp: number; formattedTime: string } {
  if (!timeStr) return { timestamp: 0, formattedTime: "" };

  const match = timeStr.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?/);
  if (!match) {
    return { timestamp: 0, formattedTime: "" };
  }

  const [, y, m, d, hh, mm, ss, tz] = match;
  let iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
  if (tz) {
    const tzSign = tz.slice(0, 1);
    const tzH = tz.slice(1, 3);
    const tzM = tz.slice(3, 5);
    iso += `${tzSign}${tzH}:${tzM}`;
  } else {
    iso += "+07:00"; // Default Vietnam timezone
  }

  const date = new Date(iso);
  const timestamp = date.getTime();
  const formattedTime = `${hh}:${mm}`;

  return { timestamp, formattedTime };
}

/**
 * Parses raw XMLTV text into structured EpgDataMap
 */
export function parseXmltv(xmlText: string): EpgDataMap {
  const result: EpgDataMap = {};
  if (!xmlText) return result;

  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Keep programmes from start of today up to next 36 hours
  const minTime = today.getTime();
  const maxTime = minTime + 36 * 60 * 60 * 1000;

  const seenSlots = new Set<string>();

  // Regex to extract <programme ...> ... </programme>
  const programmeRegex = /<programme\s+([^>]*?)>([\s\S]*?)<\/programme>/gi;
  let match: RegExpExecArray | null;

  while ((match = programmeRegex.exec(xmlText)) !== null) {
    const attrs = match[1];
    const body = match[2];

    const startAttr = attrs.match(/start="([^"]+)"/i)?.[1] || "";
    const stopAttr = attrs.match(/stop="([^"]+)"/i)?.[1] || "";
    const channelAttr = attrs.match(/channel="([^"]+)"/i)?.[1] || "";

    if (!startAttr || !stopAttr || !channelAttr) continue;

    const { timestamp: startTimestamp, formattedTime: start } = parseXmltvTime(startAttr);
    const { timestamp: endTimestamp, formattedTime: end } = parseXmltvTime(stopAttr);

    if (!startTimestamp || !endTimestamp || endTimestamp < minTime || startTimestamp > maxTime) {
      continue;
    }

    const canonicalKey = normalizeChannelKey(channelAttr);
    if (!canonicalKey) continue;

    // Deduplicate: avoid duplicate programmes for the same channel at the same start time
    const slotKey = `${canonicalKey}:${startTimestamp}`;
    if (seenSlots.has(slotKey)) {
      continue;
    }
    seenSlots.add(slotKey);

    const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : "Chương trình truyền hình";
    title = title.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    const descMatch = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
    let description = descMatch ? descMatch[1].trim() : undefined;
    if (description) {
      description = description.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/&amp;/g, "&");
    }

    const isLiveNow = now >= startTimestamp && now < endTimestamp;
    let progressPercent: number | undefined;
    if (isLiveNow && endTimestamp > startTimestamp) {
      progressPercent = Math.min(100, Math.max(0, Math.round(((now - startTimestamp) / (endTimestamp - startTimestamp)) * 100)));
    }

    if (!result[canonicalKey]) {
      result[canonicalKey] = {
        channelId: canonicalKey,
        programs: [],
      };
    }

    const prog: EpgProgram = {
      id: `${canonicalKey}-${startTimestamp}`,
      channelId: canonicalKey,
      title,
      description,
      start,
      end,
      startTimestamp,
      endTimestamp,
      isLiveNow,
      progressPercent,
    };

    result[canonicalKey].programs.push(prog);
  }

  // Sort programmes and compute currentProgram & nextProgram for each channel
  for (const key of Object.keys(result)) {
    const channelEpg = result[key];
    channelEpg.programs.sort((a, b) => a.startTimestamp - b.startTimestamp);

    channelEpg.currentProgram = channelEpg.programs.find((p) => p.isLiveNow);
    if (channelEpg.currentProgram) {
      const currentIdx = channelEpg.programs.indexOf(channelEpg.currentProgram);
      channelEpg.nextProgram = channelEpg.programs[currentIdx + 1];
    } else {
      // If no program is strictly live now, pick the first upcoming one
      channelEpg.nextProgram = channelEpg.programs.find((p) => p.startTimestamp > now);
    }
  }

  return result;
}

/**
 * Curated standard daily schedule fallback for core Vietnamese national channels
 * Used if external XMLTV network is temporarily unreachable.
 */
function generateCuratedFallbackEpg(): EpgDataMap {
  const now = new Date();
  const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const baseMs = baseDate.getTime();
  const result: EpgDataMap = {};

  const schedules: Record<string, Array<{ startH: number; startM: number; endH: number; endM: number; title: string; desc?: string }>> = {
    vtv1: [
      { startH: 5, startM: 30, endH: 6, endM: 0, title: "Chào buổi sáng", desc: "Bản tin thời sự sớm" },
      { startH: 6, startM: 0, endH: 7, endM: 0, title: "Chào buổi sáng (tiếp)", desc: "Điểm tin kinh tế - xã hội" },
      { startH: 7, startM: 0, endH: 8, endM: 0, title: "Bản tin Thời sự sáng", desc: "Thông tin thời sự trong nước và quốc tế" },
      { startH: 8, startM: 0, endH: 9, endM: 0, title: "Tài chính kinh doanh", desc: "Cập nhật thị trường tài chính" },
      { startH: 9, startM: 0, endH: 11, endM: 0, title: "Phim tài liệu Việt Nam", desc: "Ký sự lịch sử và văn hóa" },
      { startH: 11, startM: 0, endH: 11, endM: 30, title: "Thời sự 11h00", desc: "Điểm tin trưa" },
      { startH: 11, startM: 30, endH: 12, endM: 15, title: "Chuyển động 24h", desc: "Tiêu điểm thời sự nóng hổi" },
      { startH: 12, startM: 15, endH: 13, endM: 0, title: "Bản tin Bất động sản", desc: "Thị trường nhà đất" },
      { startH: 13, startM: 0, endH: 14, endM: 0, title: "Thời sự 13h00 & Phim truyện", desc: "Phim truyền hình Việt Nam" },
      { startH: 14, startM: 0, endH: 17, endM: 0, title: "Hành trình di sản & Tạp chí kinh tế", desc: "Văn hóa vùng miền" },
      { startH: 17, startM: 0, endH: 18, endM: 0, title: "Thời sự 17h00", desc: "Thông tin chiều" },
      { startH: 18, startM: 0, endH: 18, endM: 30, title: "Chuyển động 24h Chiều", desc: "Tin nóng xã hội & Đời sống" },
      { startH: 18, startM: 30, endH: 19, endM: 0, title: "Việt Nam hôm nay", desc: "Toàn cảnh tin tức thời sự" },
      { startH: 19, startM: 0, endH: 19, endM: 45, title: "Thời sự 19h00 (Toàn cảnh Quốc gia)", desc: "Bản tin thời sự chính luận quốc gia của Đài Truyền hình Việt Nam" },
      { startH: 19, startM: 45, endH: 20, endM: 5, title: "Thời tiết & Thể thao 24/7", desc: "Dự báo thời tiết và thể thao" },
      { startH: 20, startM: 5, endH: 21, endM: 0, title: "Phim truyện Giờ Vàng VTV1", desc: "Phim truyền hình Việt Nam đặc sắc" },
      { startH: 21, startM: 0, endH: 21, endM: 40, title: "Vấn đề hôm nay", desc: "Bình luận chuyên sâu thời sự" },
      { startH: 21, startM: 40, endH: 22, endM: 30, title: "Thế giới 24h chuyển động", desc: "Tin quốc tế nổi bật" },
      { startH: 22, startM: 30, endH: 23, endM: 30, title: "Thời sự cuối ngày", desc: "Tổng kết tin tức trong ngày" },
      { startH: 23, startM: 30, endH: 24, endM: 0, title: "Ký sự đêm & Đất nước ngàn năm", desc: "Chương trình đêm" },
    ],
    vtv3: [
      { startH: 6, startM: 0, endH: 7, endM: 0, title: "Cà phê sáng cùng VTV3", desc: "Khởi đầu ngày mới tràn đầy năng lượng" },
      { startH: 7, startM: 0, endH: 8, endM: 30, title: "Vui khỏe mỗi ngày & Ẩm thực", desc: "Bí quyết sống khỏe" },
      { startH: 8, startM: 30, endH: 10, endM: 0, title: "Phim truyện nước ngoài", desc: "Phim tâm lý tình cảm đặc sắc" },
      { startH: 10, startM: 0, endH: 11, endM: 30, title: "Hãy chọn giá đúng / Ô cửa bí mật", desc: "Gameshow giải trí truyền hình" },
      { startH: 11, startM: 30, endH: 12, endM: 30, title: "Phim truyện trưa VTV3", desc: "Phim truyền hình hấp dẫn" },
      { startH: 12, startM: 30, endH: 13, endM: 30, title: "Đường lên đỉnh Olympia / Chiếc nón kỳ diệu", desc: "Gameshow trí tuệ & giải trí" },
      { startH: 13, startM: 30, endH: 16, endM: 0, title: "Phim truyện chiều VTV3", desc: "Phim bộ kinh điển" },
      { startH: 16, startM: 0, endH: 18, endM: 0, title: "Thể thao VTV3 & Sức sống mới", desc: "Bản tin thể thao hấp dẫn" },
      { startH: 18, startM: 0, endH: 19, endM: 0, title: "Phim truyện 18h", desc: "Phim thiếu nhi / thanh thiếu niên" },
      { startH: 19, startM: 0, endH: 19, endM: 45, title: "Tiếp sóng Thời sự 19h00", desc: "Thời sự VTV" },
      { startH: 19, startM: 45, endH: 20, endM: 30, title: "Ai là triệu phú / Đấu trí", desc: "Gameshow truyền hình đỉnh cao" },
      { startH: 20, startM: 30, endH: 21, endM: 30, title: "Phim Giờ Vàng VTV3", desc: "Phim truyền hình ăn khách nhất" },
      { startH: 21, startM: 30, endH: 22, endM: 30, title: "Ơn giời cậu đây rồi / Ký ức vui vẻ", desc: "Chương trình hài & hoài niệm" },
      { startH: 22, startM: 30, endH: 24, endM: 0, title: "Phim truyện đêm VTV3", desc: "Phim điện ảnh kinh điển" },
    ],
    vtv2: [
      { startH: 6, startM: 0, endH: 8, endM: 0, title: "Khoa học & Đời sống", desc: "Ứng dụng công nghệ" },
      { startH: 8, startM: 0, endH: 11, endM: 0, title: "Khám phá thế giới", desc: "Thiên nhiên kỳ thú và vũ trụ" },
      { startH: 11, startM: 0, endH: 13, endM: 0, title: "Phim truyện Khoa học - Viễn tưởng", desc: "Điện ảnh khoa học" },
      { startH: 13, startM: 0, endH: 18, endM: 0, title: "Thế giới động vật & Sức khỏe cho mọi người", desc: "Thế giới hoang dã" },
      { startH: 18, startM: 0, endH: 19, endM: 0, title: "Khoa học công nghệ 24/7", desc: "Cập nhật công nghệ" },
      { startH: 19, startM: 0, endH: 20, endM: 0, title: "Tiếp sóng Thời sự 19h00", desc: "Thời sự VTV" },
      { startH: 20, startM: 0, endH: 21, endM: 30, title: "Phim tài liệu Khoa học", desc: "Khám phá đại dương và không gian" },
      { startH: 21, startM: 30, endH: 24, endM: 0, title: "Bí ẩn thế giới & Khám phá vũ trụ", desc: "Khoa học vũ trụ" },
    ],
    htv7: [
      { startH: 6, startM: 0, endH: 7, endM: 30, title: "60 Giây Sáng", desc: "Bản tin thời sự TP.HCM" },
      { startH: 7, startM: 30, endH: 11, endM: 30, title: "Phim truyện sáng & Ẩm thực phương Nam", desc: "Giải trí buổi sáng" },
      { startH: 11, startM: 30, endH: 13, endM: 0, title: "Phim truyện trưa HTV7", desc: "Phim truyền hình miền Nam" },
      { startH: 13, startM: 0, endH: 18, endM: 30, title: "Ca nhạc & Gameshow HTV", desc: "Giải trí âm nhạc" },
      { startH: 18, startM: 30, endH: 19, endM: 0, title: "60 Giây Tối (Tin tức TP.HCM & Toàn cảnh)", desc: "Bản tin thời sự hấp dẫn" },
      { startH: 19, startM: 0, endH: 20, endM: 30, title: "Gameshow Thách Thức Danh Hài / Nhanh Như Chớp", desc: "Chương trình truyền hình vui nhộn" },
      { startH: 20, startM: 30, endH: 22, endM: 0, title: "Phim truyện Giờ Vàng HTV7", desc: "Phim bộ Việt Nam hấp dẫn" },
      { startH: 22, startM: 0, endH: 24, endM: 0, title: "Chuyện đêm muộn & Ca nhạc", desc: "Tâm tình đêm khuya" },
    ],
    thvl1: [
      { startH: 6, startM: 0, endH: 7, endM: 0, title: "Chào ngày mới THVL", desc: "Thời sự miền Tây" },
      { startH: 7, startM: 0, endH: 11, endM: 30, title: "Phim truyện sáng & Nông nghiệp xanh", desc: "Phim truyền hình" },
      { startH: 11, startM: 30, endH: 12, endM: 30, title: "Thời sự trưa THVL & Tin tức", desc: "Bản tin thời sự" },
      { startH: 12, startM: 30, endH: 18, endM: 30, title: "Phim truyện chiều THVL1", desc: "Phim bộ tâm lý xã hội" },
      { startH: 18, startM: 30, endH: 19, endM: 45, title: "Thời sự THVL1 & Nông thôn mới", desc: "Bản tin thời sự Vĩnh Long" },
      { startH: 19, startM: 45, endH: 21, endM: 0, title: "Phim Giờ Vàng THVL1 (Tình nghĩa miền Tây)", desc: "Phim truyền hình ăn khách THVL" },
      { startH: 21, startM: 0, endH: 22, endM: 30, title: "Tuyệt đỉnh song ca / Tình Bolero", desc: "Gameshow âm nhạc trữ tình" },
      { startH: 22, startM: 30, endH: 24, endM: 0, title: "Phim truyện đêm THVL1", desc: "Phim điện ảnh đêm" },
    ],
  };

  const currentMs = Date.now();

  for (const [key, items] of Object.entries(schedules)) {
    const programs: EpgProgram[] = [];
    for (const item of items) {
      const startTimestamp = baseMs + (item.startH * 60 + item.startM) * 60 * 1000;
      const endTimestamp = baseMs + (item.endH * 60 + item.endM) * 60 * 1000;
      const isLiveNow = currentMs >= startTimestamp && currentMs < endTimestamp;
      let progressPercent: number | undefined;
      if (isLiveNow && endTimestamp > startTimestamp) {
        progressPercent = Math.min(100, Math.max(0, Math.round(((currentMs - startTimestamp) / (endTimestamp - startTimestamp)) * 100)));
      }

      programs.push({
        id: `${key}-${startTimestamp}`,
        channelId: key,
        title: item.title,
        description: item.desc,
        start: `${String(item.startH).padStart(2, "0")}:${String(item.startM).padStart(2, "0")}`,
        end: `${String(item.endH).padStart(2, "0")}:${String(item.endM).padStart(2, "0")}`,
        startTimestamp,
        endTimestamp,
        isLiveNow,
        progressPercent,
      });
    }

    const currentProgram = programs.find((p) => p.isLiveNow);
    let nextProgram: EpgProgram | undefined;
    if (currentProgram) {
      const idx = programs.indexOf(currentProgram);
      nextProgram = programs[idx + 1];
    } else {
      nextProgram = programs.find((p) => p.startTimestamp > currentMs);
    }

    result[key] = {
      channelId: key,
      currentProgram,
      nextProgram,
      programs,
    };
  }

  return result;
}

/**
 * Fetches and parses EPG data with Multi-Tier Caching (L1 Memory SWR + Upstash Redis)
 */
async function fetchEpgDataInternal(): Promise<EpgDataMap> {
  for (const url of EPG_XML_SOURCES) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const text = await res.text();
        if (text && text.includes("<programme")) {
          const parsed = parseXmltv(text);
          if (Object.keys(parsed).length > 0) {
            // Merge curated fallback for any missing key
            const fallback = generateCuratedFallbackEpg();
            for (const key of Object.keys(fallback)) {
              if (!parsed[key] || parsed[key].programs.length === 0) {
                parsed[key] = fallback[key];
              }
            }
            return parsed;
          }
        }
      }
    } catch {
      // Try next source
    }
  }

  // Graceful fallback: Curated standard daily schedule
  return generateCuratedFallbackEpg();
}

/**
 * Public EPG Service
 */
export const epgService = {
  getEpgData: async (): Promise<EpgDataMap> => {
    return await cacheService.fetchOrSet(
      "live:tv:epg:v3",
      fetchEpgDataInternal,
      2 * 60 * 60 // 2 hours TTL
    );
  },

  getEpgForChannel: async (channelNameOrId: string): Promise<ChannelEpg | null> => {
    const epgData = await epgService.getEpgData();
    const key = normalizeChannelKey(channelNameOrId);
    return epgData[key] || null;
  },
};
