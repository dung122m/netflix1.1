import {
  enrichMatchLogosSync,
  triggerBackgroundLogoEnrichment,
} from "@/services/live/football-logo/service";
import { cacheService } from "@/lib/cache";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { resolveEsportsTeam } from "@/data/live/teamAssets";
import { LiveMatchScore } from "@/services/live/football-score/types";
import { footballScoreService } from "@/services/live/football-score/service";
import { matchFixtureToScore } from "@/services/live/football-score/matcher";
import { resolveCanonicalTournament } from "@/services/live/football-score/canonicalLeagues";
import {
  NATIONAL_TEAM_CANONICAL_MAP,
  NATIONAL_TEAM_CANONICAL_KEYS,
} from "./nationalTeamAliases";

export { NATIONAL_TEAM_CANONICAL_MAP, NATIONAL_TEAM_CANONICAL_KEYS };
export type { LiveMatchScore };

import {
  getFootballM3uSources,
  VERIFIED_SPORTS_STREAMS,
  FPT_EVENT_POSTER,
  getVerified247Channels,
  getFptEventChannels,
  extractHailabLogos,
} from "./m3uSourceManager";
import {
  OFFENSIVE_COMMENTATOR_REGEXES,
  isOffensiveCommentatorName,
  sanitizeCommentatorName,
} from "./commentatorSanitizer";
import {
  TOURNAMENT_NON_TEAM_KEYWORDS,
  BROADCASTER_NON_TEAM_KEYWORDS,
  GENERIC_SPORT_NON_TEAM_KEYWORDS,
  isValidFootballTeamName,
  isGenericTvChannel,
  cleanCandidateTeamName,
} from "./teamNameValidator";

export {
  getFootballM3uSources,
  VERIFIED_SPORTS_STREAMS,
  FPT_EVENT_POSTER,
  getVerified247Channels,
  getFptEventChannels,
  extractHailabLogos,
  OFFENSIVE_COMMENTATOR_REGEXES,
  isOffensiveCommentatorName,
  sanitizeCommentatorName,
  TOURNAMENT_NON_TEAM_KEYWORDS,
  BROADCASTER_NON_TEAM_KEYWORDS,
  GENERIC_SPORT_NON_TEAM_KEYWORDS,
  isValidFootballTeamName,
  isGenericTvChannel,
  cleanCandidateTeamName,
};


export interface StreamServer {
  name: string;
  url: string;
  format: "hls" | "flv" | "other";
  isHls: boolean;
  quality: "FHD" | "HD";
  sourceName?: string;
}

export type MatchCategory =
  | "senior_men"
  | "senior_women"
  | "u19"
  | "u20"
  | "u21"
  | "u23"
  | "futsal"
  | "youth"
  | "other";

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
  sport?: "football" | "basketball" | "volleyball" | "tennis" | "badminton" | "f1" | "motorsport" | "boxing" | "esports" | "billiards" | "other";
  category?: MatchCategory;
  gender?: "men" | "women";
  isCategoryExplicit?: boolean;
  isEvent?: boolean;
  sourceStatus?: SourceMatchStatus;
  timeline?: "live" | "today" | "upcoming" | "finished";
  servers: StreamServer[];
  score?: LiveMatchScore;
  realStatus?: "live" | "upcoming" | "finished";
  statusBadge?: string | null;
  lifecycle?: LifecycleEvaluation;
  isLive?: boolean;
  isFeatured?: boolean;
}

export interface LiveFootballData {
  updatedAt: string;
  channels: string[];
  matches: FootballMatch[];
}


export function parseMatchTimeToTimestamp(timeStr: string): number {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  const clean = timeStr.trim();
  // Format: "HH:mm DD/MM", "HHhMM DD/MM", "HH:mm", "HHhMM"
  const match = clean.match(
    /^(\d{1,2})[:hH](\d{2})(?:\s*[-/]?\s*(\d{1,2})[-/](\d{1,2}))?/,
  );
  if (!match) return Number.MAX_SAFE_INTEGER;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Lấy ngày tháng hiện tại theo múi giờ Việt Nam (UTC+7)
  const now = new Date();
  const vnFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = vnFormatter.formatToParts(now);
  const getPart = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  const currentYear = getPart("year");
  let day = getPart("day");
  let month = getPart("month") - 1; // 0-indexed

  if (match[3] && match[4]) {
    day = parseInt(match[3], 10);
    month = parseInt(match[4], 10) - 1;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const isoVN = `${currentYear}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+07:00`;
  const parsed = new Date(isoVN).getTime();
  return isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export type SourceMatchStatus = "live" | "finished" | "upcoming" | "unknown";

export function isMatchToday(timestamp: number, now: number = Date.now()): boolean {
  const vnFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const nowParts = vnFormatter.formatToParts(new Date(now));
  const matchParts = vnFormatter.formatToParts(new Date(timestamp));

  const getVal = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value;

  return (
    getVal(nowParts, "year") === getVal(matchParts, "year") &&
    getVal(nowParts, "month") === getVal(matchParts, "month") &&
    getVal(nowParts, "day") === getVal(matchParts, "day")
  );
}

export function parseSourceStatus(
  rawTitle: string,
  extinfLine?: string,
): SourceMatchStatus {
  if (extinfLine) {
    const statusMatch = extinfLine.match(
      /(?:status|tvg-status|match-status)="([^"]+)"/i,
    );
    if (statusMatch) {
      const val = statusMatch[1].trim().toUpperCase();
      if (val === "LIVE" || val === "IN_PROGRESS" || val === "PLAYING") {
        return "live";
      }
      if (
        val === "FINISHED" ||
        val === "ENDED" ||
        val === "FT" ||
        val === "FULL_TIME"
      ) {
        return "finished";
      }
      if (
        val === "SCHEDULED" ||
        val === "UPCOMING" ||
        val === "NOT_STARTED"
      ) {
        return "upcoming";
      }
    }
  }

  const upper = (rawTitle || "").toUpperCase();
  if (
    /\[(?:FT|FULL\s*TIME|FINISHED|ENDED|HẾT\s*GIỜ|KẾT\s*THÚC|ĐÃ\s*XONG|ĐÃ\s*KẾT\s*THÚC)\]/i.test(
      upper,
    ) ||
    /\b(?:FT|FULL\s*TIME)\b/.test(upper)
  ) {
    return "finished";
  }

  if (
    /\[(?:LIVE|TRỰC\s*TIẾP|ĐANG\s*PHÁT|ĐANG\s*ĐÁ|IN_PROGRESS)\]/i.test(upper) ||
    rawTitle.includes("🟢")
  ) {
    return "live";
  }

  if (
    /\[(?:UPCOMING|SCHEDULED|SẮP\s*ĐÁ|SẮP\s*DIỄN\s*RA|CHƯA\s*ĐÁ)\]/i.test(
      upper,
    ) ||
    rawTitle.includes("🟡")
  ) {
    return "upcoming";
  }

  return "unknown";
}

export function mergeSourceStatus(
  currentStatus: SourceMatchStatus = "unknown",
  newStatus: SourceMatchStatus = "unknown",
): SourceMatchStatus {
  if (currentStatus === "live" || newStatus === "live") return "live";
  if (currentStatus === "finished" && newStatus === "finished") return "finished";
  if (currentStatus === "upcoming" || newStatus === "upcoming") return "upcoming";
  if (currentStatus === "finished" || newStatus === "finished") return "finished";
  return "unknown";
}

export const MAX_MATCH_DURATION_MS = 140 * 60 * 1000; // 140 phút
export const MAX_EVENT_DURATION_MS = 8 * 60 * 60 * 1000; // 8 giờ (an toàn tối đa cho sự kiện trực tiếp kéo dài)
export const UPCOMING_DISPLAY_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 giờ (120 phút)

import {
  evaluateEventLifecycle,
  type LifecycleEvaluation,
} from "./lifecycleEngine";

export {
  evaluateEventLifecycle,
  SPORT_SAFETY_CEILINGS_MS,
  SPORT_NORMAL_DURATION_MS,
  normalizeSportCategory,
  type EventStatus,
  type StreamStatus,
  type ListingStatus,
  type EvaluationConfidence,
  type LifecycleEvaluation,
} from "./lifecycleEngine";

/**
 * Thời lượng phát sóng tối đa theo từng bộ môn thể thao:
 * - esports: 6 giờ (360 phút) - Các trận BO3, BO5 (LoL, Dota2, CS2, Valorant) kéo dài 3 - 5.5 giờ
 * - tennis: 5 giờ (300 phút) - Grand Slam 5 set hoặc trận 3 set kéo dài 3 - 4.5 giờ
 * - billiards: 6 giờ (360 phút) - Các trận bida / snooker nhiều frame kéo dài 4 - 6 giờ
 * - motorsport / f1: 4.5 giờ (270 phút) - Đua xe, cờ đỏ, trao giải
 * - basketball: 165 phút (~2h 45m) - 4 hiệp + hội ý + OT
 * - volleyball: 165 phút (~2h 45m) - 3 - 5 set
 * - football: 125 phút (~2h 05m) - Trận bóng 90m + 15m nghỉ + bù giờ. Sau 125m trận thông thường đã kết thúc 100%.
 * - other / sự kiện (isEvent): 8 giờ (480 phút)
 */
export function getSportMaxDurationMs(sport?: string, isEvent: boolean = false): number {
  if (isEvent) return MAX_EVENT_DURATION_MS;
  switch (sport) {
    case "esports":
      return 6 * 60 * 60 * 1000; // 6 giờ
    case "tennis":
      return 5 * 60 * 60 * 1000; // 5 giờ
    case "billiards":
      return 6 * 60 * 60 * 1000; // 6 giờ
    case "f1":
    case "motorsport":
      return 4.5 * 60 * 60 * 1000; // 4.5 giờ
    case "basketball":
    case "volleyball":
      return 165 * 60 * 1000; // 165 phút
    case "football":
      return 125 * 60 * 1000; // 125 phút
    default:
      return MAX_MATCH_DURATION_MS; // 140 phút mặc định cho generic/legacy
  }
}

export function getMatchTimeline(
  timestamp?: number | null,
  sourceStatusOrLiveMarker: SourceMatchStatus | boolean = "unknown",
  streamHealth: "alive" | "dead" | "unknown" = "unknown",
  now: number = Date.now(),
  isEvent: boolean = false,
  sport?: string,
  score?: LiveMatchScore | null,
): "live" | "upcoming" | "finished" {
  const evaluation = evaluateEventLifecycle({
    timestamp,
    sourceStatus: sourceStatusOrLiveMarker,
    streamHealth,
    now,
    isEvent,
    sport,
    score,
  });
  return evaluation.displayTimeline;
}

/**
 * Xác định xem một trận có thuộc phạm vi hiển thị trên trang /live hay không:
 * 1. ĐANG CHIẾU: timeline === "live"
 * 2. SẮP CHIẾU: timeline === "upcoming" VÀ bắt đầu trong vòng cửa sổ hiển thị (mặc định 2 giờ = 120 phút)
 * Trận đã kết thúc (finished) hoặc trận còn hơn 2 giờ (hoặc ngày mai) -> false (không hiển thị trên /live)
 */
export function isMatchInLiveWindow(
  timeline: "live" | "upcoming" | "finished" | "today" = "finished",
  timestamp?: number | null,
  now: number = Date.now(),
  windowMs: number = UPCOMING_DISPLAY_WINDOW_MS,
): boolean {
  if (timeline === "live") {
    return true;
  }
  if (timeline === "upcoming") {
    const hasValidTimestamp =
      timestamp !== undefined &&
      timestamp !== null &&
      timestamp > 0 &&
      timestamp !== Number.MAX_SAFE_INTEGER;
    if (!hasValidTimestamp) {
      return false;
    }
    return now < timestamp && timestamp <= now + windowMs;
  }
  return false;
}

function normalizeText(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// SPORTS MATCHING & TOURNAMENT CLASSIFICATION ENGINES
// (Tách rời độc lập vào @/lib/sports/ để tái sử dụng và kiểm thử)
// ============================================================
import {
  normalizeClubKey,
  isSingleTeamMatching,
  areMatchTimesCompatible,
  areMatchFixturesMatching,
} from "@/lib/sports/matchMatcher";
import {
  detectTournament,
  getSportLabel,
  extractSportAndGender,
  extractSportAndCategory,
} from "@/lib/sports/tournamentDetector";

export {
  normalizeClubKey,
  isSingleTeamMatching,
  areMatchTimesCompatible,
  areMatchFixturesMatching,
  detectTournament,
  getSportLabel,
  extractSportAndGender,
  extractSportAndCategory,
};


// Cache kết quả kiểm tra luồng stream (TTL 5 phút cho luồng sống, 60s cho luồng chết)
export const urlHealthCache = new Map<string, { isLive: boolean; expireAt: number }>();

export type StreamHealthStatus = "alive" | "dead" | "unknown";

export function getStreamHealthStatus(url: string): StreamHealthStatus {
  if (!url || isBlockedStreamUrl(url)) return "dead";

  const key = url.trim();
  if (
    process.env.VERCEL === "1" &&
    (/fptplay(?:53)?\.net/i.test(key) || /tv360\.vn/i.test(key))
  ) {
    return "alive";
  }

  const cached = urlHealthCache.get(key);
  if (cached && cached.expireAt > Date.now()) {
    return cached.isLive ? "alive" : "dead";
  }
  return "unknown";
}

export async function isStreamPlayable(
  url: string,
  timeoutMs: number = 1500,
): Promise<boolean> {
  if (!url || isBlockedStreamUrl(url)) return false;

  const key = url.trim();

  // Trên Vercel hoặc server nước ngoài, CDN FPT/TV360 chặn IP datacenter qua Geo-IP.
  // Trình duyệt client tại Việt Nam sẽ phát trực tiếp bình thường.
  if (
    process.env.VERCEL === "1" &&
    (/fptplay(?:53)?\.net/i.test(key) || /tv360\.vn/i.test(key))
  ) {
    return true;
  }

  const now = Date.now();
  const cached = urlHealthCache.get(key);
  if (cached && cached.expireAt > now) {
    return cached.isLive;
  }

  try {
    let checkUrl = key;
    if (checkUrl.includes("lauthaitv.cc") && checkUrl.includes(".flv")) {
      checkUrl = checkUrl
        .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
        .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
    }
    const res = await fetch(checkUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Range: "bytes=0-100",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 200/206 là thành công; 416 (Range Not Satisfiable) là do server từ chối Range trên file manifest nhưng endpoint hoàn toàn sống
    const isLive = res.ok || res.status === 416;
    urlHealthCache.set(key, {
      isLive,
      expireAt: now + (isLive ? 5 * 60 * 1000 : 60 * 1000), // Sống: cache 5 phút, chết: cache 60s
    });
    return isLive;
  } catch (err: unknown) {
    // Timeout hoặc AbortError không đánh dấu dead vĩnh viễn (giữ trạng thái unknown để không loại nhầm nguồn)
    const isTimeout =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    if (!isTimeout) {
      urlHealthCache.set(key, { isLive: false, expireAt: now + 60 * 1000 });
    }
    return false;
  }
}

let isBackgroundHealthRunning = false;

function getPriorityStreamUrls(matches: FootballMatch[]): string[] {
  const priorityUrls: string[] = [];
  const now = Date.now();

  // 1. Trận đang LIVE
  const liveMatches = matches.filter((m) => m.timeline === "live");
  for (const m of liveMatches) {
    for (const s of m.servers) {
      if (s.url && !isBlockedStreamUrl(s.url)) {
        priorityUrls.push(s.url);
      }
    }
  }

  // 2. Trận sắp diễn ra trong 2 giờ (120 phút)
  const soonMatches = matches.filter(
    (m) =>
      m.timeline === "today" &&
      m.timestamp > now &&
      m.timestamp <= now + 2 * 60 * 60 * 1000,
  );
  for (const m of soonMatches) {
    for (const s of m.servers) {
      if (s.url && !isBlockedStreamUrl(s.url)) {
        priorityUrls.push(s.url);
      }
    }
  }

  // 3. Các trận khác
  const otherMatches = matches.filter(
    (m) =>
      m.timeline !== "live" &&
      !(m.timestamp > now && m.timestamp <= now + 2 * 60 * 60 * 1000),
  );
  for (const m of otherMatches) {
    for (const s of m.servers) {
      if (s.url && !isBlockedStreamUrl(s.url)) {
        priorityUrls.push(s.url);
      }
    }
  }

  return Array.from(new Set(priorityUrls));
}

export async function scheduleBackgroundHealthChecks(
  urls: string[],
  concurrency = 8,
  maxBatch = 32,
): Promise<void> {
  if (isBackgroundHealthRunning || !urls || urls.length === 0) return;

  const unknownUrls = urls.filter(
    (url) => getStreamHealthStatus(url) === "unknown",
  );
  if (unknownUrls.length === 0) return;

  const batch = unknownUrls.slice(0, maxBatch);
  isBackgroundHealthRunning = true;

  try {
    let cursor = 0;
    const worker = async () => {
      while (cursor < batch.length) {
        const idx = cursor++;
        const targetUrl = batch[idx];
        if (!targetUrl) continue;
        try {
          await isStreamPlayable(targetUrl, 1200);
        } catch {
          // Error isolated to single stream
        }
      }
    };

    const workerCount = Math.min(concurrency, batch.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.allSettled(workers);
  } finally {
    isBackgroundHealthRunning = false;
  }
}

export interface RawStreamItem {
  rawTitle: string;
  group: string;
  rawLogo: string;
  url: string;
  effectiveUrl: string;
  extinfLine?: string;
  awayLogo?: string;
  tournament?: string;
  format?: "hls" | "flv" | "other" | string;
}

export function normalizeAndMergeStreams(
  rawStreams: RawStreamItem[],
  now: number = Date.now(),
): { channels: string[]; matches: FootballMatch[] } {
  const channelsSet = new Set<string>();
  interface NormalizedStream {
    rawTitle: string;
    displayTitle: string;
    cleanGroup: string;
    effectiveUrl: string;
    rawLogo: string;
    awayLogo?: string;
    isHls: boolean;
    format: "hls" | "flv" | "other";
    isFhd: boolean;
    serverQuality: "FHD" | "HD";
    isLiveMarker: boolean;
    sourceStatus: SourceMatchStatus;
    time: string;
    timestamp: number;
    blv: string;
    team1: string;
    team2: string;
    sport: "football" | "basketball" | "volleyball" | "tennis" | "badminton" | "f1" | "motorsport" | "boxing" | "esports" | "billiards" | "other";
    category: MatchCategory;
    gender?: "men" | "women";
    isCategoryExplicit?: boolean;
    isEvent: boolean;
    tournament: string;
    normT1: string;
    normT2: string;
  }

  const sanitizeLiveLogoUrl = (url?: string): string => {
    if (!url || typeof url !== "string") return "";
    let clean = url.trim();
    if (!clean) return "";
    // Tách nếu nguồn upstream nối nhầm hai URL (vd: "https://xoigac.tophttps//media.api-sports.io/...")
    const nestedIdx = clean.slice(8).search(/https?:?\/\//i);
    if (nestedIdx >= 0) {
      clean = clean.slice(8 + nestedIdx);
    }
    clean = clean.replace(/^https\/\//i, "https://").replace(/^http\/\//i, "http://");
    return clean;
  };

  const normalizedList: NormalizedStream[] = [];

  for (const item of rawStreams) {
    const group = item.group || "";
    const rawTitle = item.rawTitle || "";
    const rawLogo = sanitizeLiveLogoUrl(item.rawLogo);
    const effectiveUrl = item.effectiveUrl || item.url || "";
    const upperGroup = group.toUpperCase();
    const upperTitle = rawTitle.toUpperCase();

    const isHls =
      item.format?.toLowerCase() === "hls" ||
      effectiveUrl.includes(".m3u8") ||
      rawTitle.toLowerCase().includes("[hls");
    const isFlv =
      !isHls &&
      (item.format?.toLowerCase() === "flv" ||
        effectiveUrl.includes(".flv") ||
        rawTitle.toLowerCase().includes("[flv"));
    const format: "hls" | "flv" | "other" = isHls
      ? "hls"
      : isFlv
        ? "flv"
        : "other";

    if (!isHls && !isFlv) continue;

    const isFhd =
      upperTitle.includes("FHD") ||
      upperTitle.includes("1080P") ||
      effectiveUrl.toUpperCase().includes("1080P") ||
      effectiveUrl.toUpperCase().includes("_1080P");
    const serverQuality: "FHD" | "HD" = isFhd ? "FHD" : "HD";

    let cleanGroup = "Trực Tiếp Thể Thao";
    if (
      upperGroup.includes("FPT PLAY") ||
      upperGroup.includes("SỰ KIỆN FPT") ||
      upperTitle.includes("SỰ KIỆN FPT") ||
      effectiveUrl.includes("fptplay.net") ||
      effectiveUrl.includes("fptplay53.net")
    ) {
      cleanGroup = "FPT Play";
    } else if (upperGroup.includes("TV360") || upperTitle.includes("TV360+") || upperTitle.includes("360 C1")) {
      cleanGroup = "TV360";
    } else if (upperGroup.includes("XÔI LẠC")) {
      cleanGroup = "Xôi Lạc TV";
    } else if (upperGroup.includes("VUA SÂN CỎ")) {
      cleanGroup = "Vua Sân Cỏ TV";
    } else if (upperGroup.includes("COLA")) {
      cleanGroup = "Cola TV";
    } else if (upperGroup.includes("KHÁN ĐÀI")) {
      cleanGroup = "Khán Đài TV";
    } else if (upperGroup.includes("GIỜ VÀNG")) {
      cleanGroup = "Giờ Vàng TV";
    } else if (upperGroup.includes("CHUỐI CHIÊN")) {
      cleanGroup = "Chuối Chiên TV";
    } else if (upperGroup.includes("SÚT BÓNG")) {
      cleanGroup = "Sút Bóng TV";
    } else if (upperGroup.includes("PHÁ LÀNG")) {
      cleanGroup = "Phá Làng TV";
    } else if (upperGroup.includes("GÀ VÀNG")) {
      cleanGroup = "Gà Vàng TV";
    } else if (upperGroup.includes("BIA ÔM")) {
      cleanGroup = "Bia Ôm TV";
    } else if (upperGroup.includes("S8")) {
      cleanGroup = "S8 TV";
    } else if (upperGroup.includes("SAO KÊ")) {
      cleanGroup = "Sao Kê TV";
    } else if (upperGroup.includes("PHÁO HOA")) {
      cleanGroup = "Pháo Hoa TV";
    } else if (upperGroup.includes("HAILAB")) {
      cleanGroup = "Live Sports (Hailab)";
    } else if (group && !group.includes("Updated") && !group.includes("Changed")) {
      cleanGroup = group.toWellFormed().replace(/^[🔴🟢🟡⚪🟠\s]+/u, "").trim();
    }

    channelsSet.add(cleanGroup);

    const { sport, category, gender, isCategoryExplicit } = extractSportAndCategory(rawTitle, group);

    let cleanedTitle = rawTitle.toWellFormed().replace(/\[[^\]]*\]/g, " ").trim();
    const sourceStatus = parseSourceStatus(rawTitle, item.extinfLine);
    const isLiveMarker = sourceStatus === "live" || /\[(?:LIVE|TRỰC\s*TIẾP|ĐANG\s*PHÁT|ĐANG\s*ĐÁ|IN_PROGRESS)\]/i.test(rawTitle);
    const timeMatch = cleanedTitle.match(
      /(?:🟢\s*)?([012]?\d[:hH]\d{2}(?:\s*[-/.]?\s*\d{1,2}[-/.]\d{1,2})?|\b\d{1,2}[-/.]\d{1,2}\b)/,
    );
    const time = timeMatch
      ? timeMatch[1]
      : isLiveMarker
        ? "Trực tiếp"
        : "24/7";
    const timestamp =
      time !== "Trực tiếp" && time !== "24/7"
        ? parseMatchTimeToTimestamp(time)
        : Number.MAX_SAFE_INTEGER;

    cleanedTitle = cleanedTitle
      .replace(/^[🟢🔴⚪\s]+/u, "")
      .replace(/^\s*(?:(?:[012]?\d[:hH]\d{2}|\d{1,2})\s*)?(?:\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)?\s*/u, "")
      .replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}⚽🏀🎾🏐🏸🏒🥊🏎🏁🎱🎮\s]+/u, "")
      .trim();

    let blv = "";
    const blvParenthesisMatch = cleanedTitle.match(/\(([^)]+)\)\s*$/);
    if (blvParenthesisMatch) {
      blv = blvParenthesisMatch[1].trim();
      cleanedTitle = cleanedTitle.replace(/\(([^)]+)\)\s*$/, "").trim();
    } else {
      const blvInlineMatch = rawTitle.match(/(?:BLV|Bình luận viên)\s+([^()[\]\-]+)/i);
      if (blvInlineMatch) {
        blv = blvInlineMatch[1].trim();
        cleanedTitle = cleanedTitle.replace(/\s+(?:-\s+)?(?:blv|bình luận viên)\s+.*$/i, "").trim();
      }
    }

    if (blv) {
      blv = blv.replace(/^(?:blv|bình luận viên)\s+/i, "").trim();
    }

    blv = sanitizeCommentatorName(blv, cleanGroup);

    let prefixTournament = "";
    if (cleanedTitle.includes("|")) {
      const pipeParts = cleanedTitle.split("|").map((p) => p.trim());
      for (const part of pipeParts) {
        if (/\s+(?:vs|v|\bv\b)\s+/i.test(part) || /\s+-\s+/.test(part)) {
          cleanedTitle = part;
        } else if (!prefixTournament && part.length > 2) {
          prefixTournament = part;
        }
      }
    }

    if (cleanedTitle.includes(":")) {
      const colonParts = cleanedTitle.split(":");
      if (
        colonParts.length === 2 &&
        (/\s+(?:vs|v|\bv\b)\s+/i.test(colonParts[1]) || /\s+-\s+/.test(colonParts[1]))
      ) {
        prefixTournament = colonParts[0].trim();
        cleanedTitle = colonParts[1].trim();
      } else if (colonParts.length > 2) {
        const lastPart = colonParts[colonParts.length - 1].trim();
        if (/\s+(?:vs|v|\bv\b)\s+/i.test(lastPart) || /\s+-\s+/.test(lastPart)) {
          prefixTournament = colonParts.slice(0, -1).join(" : ").trim();
          cleanedTitle = lastPart;
        }
      }
    }

    let team1 = "";
    let team2 = "";

    const hasVs = /\s+(?:vs|v|\bv\b)\s+/i.test(cleanedTitle);
    const hasHyphen =
      /\s+-\s+/.test(cleanedTitle) &&
      !upperTitle.includes("COLA") &&
      !upperTitle.includes("PHÁO HOA");

    if (hasVs) {
      const vsMatch = cleanedTitle.match(/(.+?)\s+(?:vs|v|\bv\b)\s+(.+)/i);
      if (vsMatch) {
        const rawT1 = cleanCandidateTeamName(vsMatch[1]);
        const rawT2 = cleanCandidateTeamName(vsMatch[2]);
        if (isValidFootballTeamName(rawT1) && isValidFootballTeamName(rawT2)) {
          const k1 = normalizeClubKey(rawT1);
          const k2 = normalizeClubKey(rawT2);
          if (k1 && k2 && k1 !== k2) {
            team1 = rawT1;
            team2 = rawT2;
          }
        }
      }
    } else if (hasHyphen) {
      const hyphenMatch = cleanedTitle.match(/(.+?)\s+-\s+(.+)/);
      if (hyphenMatch) {
        const rawT1 = cleanCandidateTeamName(hyphenMatch[1]);
        const rawT2 = cleanCandidateTeamName(hyphenMatch[2]);
        if (isValidFootballTeamName(rawT1) && isValidFootballTeamName(rawT2)) {
          const k1 = normalizeClubKey(rawT1);
          const k2 = normalizeClubKey(rawT2);
          if (k1 && k2 && k1 !== k2) {
            team1 = rawT1;
            team2 = rawT2;
          }
        }
      }
    }

    if (isGenericTvChannel(rawTitle, group)) {
      continue;
    }

    let displayTitle = "";
    let isEvent = true;

    if (team1 && team2) {
      isEvent = false;
      displayTitle = `${team1} vs ${team2}`;
    } else {
      isEvent = true;
      team1 = "";
      team2 = "";
      displayTitle = cleanedTitle || rawTitle;

      const vsDupMatch = displayTitle.match(/(.+?)\s+(?:vs|v|\bv\b)\s+(.+)/i);
      if (vsDupMatch) {
        const left = vsDupMatch[1].trim();
        const right = vsDupMatch[2].trim();
        if (
          left.toLowerCase() === right.toLowerCase() ||
          normalizeText(left) === normalizeText(right)
        ) {
          displayTitle = left;
        }
      }
    }

    const rawDetectedTourn = item.tournament || prefixTournament || detectTournament(rawTitle, team1, team2);
    const tournament =
      sport && sport !== "football"
        ? getSportLabel(sport, rawDetectedTourn)
        : resolveCanonicalTournament({
            tournament: rawDetectedTourn,
            title: rawTitle,
            sport,
            team1,
            team2,
            category,
            gender,
          });

    const normT1 = !isEvent && team1 ? normalizeClubKey(team1) : "";
    const normT2 = !isEvent && team2 ? normalizeClubKey(team2) : "";

    normalizedList.push({
      rawTitle,
      displayTitle,
      cleanGroup,
      effectiveUrl,
      rawLogo,
      awayLogo: sanitizeLiveLogoUrl(item.awayLogo),
      isHls,
      format,
      isFhd,
      serverQuality,
      isLiveMarker,
      sourceStatus,
      time,
      timestamp,
      blv,
      team1,
      team2,
      sport,
      category,
      gender,
      isCategoryExplicit,
      isEvent,
      tournament,
      normT1,
      normT2,
    });
  }

  const mergedMatches: FootballMatch[] = [];

  for (const item of normalizedList) {
    let foundMatch: FootballMatch | null = null;

    // 1. Exact canonical URL match: Chỉ merge nếu cùng fixture hoặc event tương thích
    for (const existing of mergedMatches) {
      if (existing.servers.some((s) => s.url === item.effectiveUrl)) {
        if (
          !item.isEvent &&
          item.team1 &&
          item.team2 &&
          !existing.isEvent &&
          existing.team1 &&
          existing.team2
        ) {
          const isMatched = areMatchFixturesMatching(
            {
              team1: item.team1,
              team2: item.team2,
              time: item.time,
              timestamp: item.timestamp,
              isLiveMarker: item.isLiveMarker,
              sport: item.sport,
              category: item.category,
              isCategoryExplicit: item.isCategoryExplicit,
              isEvent: false,
            },
            {
              team1: existing.team1,
              team2: existing.team2,
              time: existing.time,
              timestamp: existing.timestamp,
              isLiveMarker: existing.sourceStatus === "live",
              sport: existing.sport,
              category: existing.category,
              isCategoryExplicit: existing.isCategoryExplicit,
              isEvent: false,
            },
            now,
          );
          if (isMatched) {
            foundMatch = existing;
            break;
          }
          // Khác trận đấu hoặc khác giờ dù cùng URL => KHÔNG merge
          continue;
        }

        // Không cho phép stream event không rõ fixture merge vào match fixture đã xác định (hoặc ngược lại)
        if (!item.isEvent !== !existing.isEvent) {
          continue;
        }

        // Nếu cả hai đều là generic event, chỉ merge khi có cùng tên/thời gian tương thích
        if (item.isEvent && existing.isEvent) {
          const normItemTitle = normalizeText(item.displayTitle);
          const normExTitle = normalizeText(existing.title);
          if (normItemTitle && normExTitle && normItemTitle === normExTitle) {
            const timeOk = areMatchTimesCompatible(
              { timestamp: item.timestamp, time: item.time, isLive: item.isLiveMarker },
              { timestamp: existing.timestamp, time: existing.time, isLive: existing.sourceStatus === "live" },
              now,
              90 * 60 * 1000,
              MAX_EVENT_DURATION_MS,
            );
            if (timeOk) {
              foundMatch = existing;
              break;
            }
          }
          continue;
        }
      }
    }

    // 2. Fixture match (Unordered team pair + compatible time + sport + category guard)
    if (!foundMatch && !item.isEvent && item.team1 && item.team2) {
      for (const existing of mergedMatches) {
        if (existing.isEvent) continue;

        const isMatched = areMatchFixturesMatching(
          {
            team1: item.team1,
            team2: item.team2,
            time: item.time,
            timestamp: item.timestamp,
            isLiveMarker: item.isLiveMarker,
            sport: item.sport,
            category: item.category,
            isCategoryExplicit: item.isCategoryExplicit,
            isEvent: false,
          },
          {
            team1: existing.team1,
            team2: existing.team2,
            time: existing.time,
            timestamp: existing.timestamp,
            isLiveMarker: existing.sourceStatus === "live",
            sport: existing.sport,
            category: existing.category,
            isCategoryExplicit: existing.isCategoryExplicit,
            isEvent: false,
          },
          now,
        );

        if (isMatched) {
          foundMatch = existing;
          break;
        }
      }
    }

    // 3. Generic event / Stream title match
    if (!foundMatch && item.isEvent) {
      const normItemTitle = normalizeText(item.displayTitle);
      for (const existing of mergedMatches) {
        if (existing.sport && item.sport && existing.sport !== item.sport) continue;
        if (existing.category && item.category && existing.category !== item.category) continue;

        if (existing.isEvent) {
          const normExTitle = normalizeText(existing.title);
          if (normItemTitle && normExTitle && normItemTitle === normExTitle) {
            const timeOk = areMatchTimesCompatible(
              { timestamp: item.timestamp, time: item.time, isLive: item.isLiveMarker },
              { timestamp: existing.timestamp, time: existing.time, isLive: existing.sourceStatus === "live" },
              now,
              90 * 60 * 1000,
              MAX_EVENT_DURATION_MS,
            );
            if (timeOk) {
              foundMatch = existing;
              break;
            }
          }
        }
      }
    }

    const serverLabel = item.blv
      ? `${item.cleanGroup} (${item.blv})`
      : `${item.cleanGroup}`;

    const newServer: StreamServer = {
      name: `${serverLabel} #${(foundMatch?.servers.length || 0) + 1}${item.isFhd ? " [FHD]" : ""}`,
      url: item.effectiveUrl,
      format: item.format,
      isHls: item.isHls,
      quality: item.serverQuality,
      sourceName: item.cleanGroup,
    };

    if (foundMatch) {
      if (!foundMatch.servers.some((s) => s.url === item.effectiveUrl)) {
        foundMatch.servers.push(newServer);
      }

      if (!foundMatch.groups.includes(item.cleanGroup)) {
        foundMatch.groups.push(item.cleanGroup);
      }

      if (item.isFhd) {
        foundMatch.quality = "FHD 1080p";
      }

      if ((!foundMatch.sport || foundMatch.sport === "other") && item.sport && item.sport !== "other") {
        foundMatch.sport = item.sport;
        foundMatch.tournament = getSportLabel(item.sport, foundMatch.tournament);
      }
      if ((!foundMatch.category || foundMatch.category === "senior_men") && item.category && item.category !== "senior_men") {
        foundMatch.category = item.category;
      }
      if (item.isCategoryExplicit) {
        foundMatch.isCategoryExplicit = true;
      }
      if (!foundMatch.gender && item.gender) {
        foundMatch.gender = item.gender;
      }

      if (
        (foundMatch.tournament === "Giải Đấu Khác" ||
          /^(?:⚽\s*Bóng Đá Trực Tiếp|🏆\s*Trực Tiếp Thể Thao|Live Sports|🎱\s*Bida \/ Billiards Trực Tiếp)$/i.test(foundMatch.tournament?.trim() || "")) &&
        item.tournament &&
        item.tournament !== "Giải Đấu Khác" &&
        !/^(?:⚽\s*Bóng Đá Trực Tiếp|🏆\s*Trực Tiếp Thể Thao|Live Sports|🎱\s*Bida \/ Billiards Trực Tiếp)$/i.test(item.tournament.trim())
      ) {
        foundMatch.tournament = item.tournament;
      }

      // Nâng cấp event thành fixture nếu stream sau có đầy đủ team1 và team2
      if (foundMatch.isEvent && !item.isEvent && item.team1 && item.team2) {
        foundMatch.team1 = item.team1;
        foundMatch.team2 = item.team2;
        foundMatch.isEvent = false;
        foundMatch.title = `${item.team1} vs ${item.team2}`;
      } else if (!foundMatch.isEvent && !item.isEvent && item.team1 && item.team2) {
        const espFound1 = resolveEsportsTeam(foundMatch.team1);
        const espItem1 = resolveEsportsTeam(item.team1);
        if (espFound1 && espItem1 && espFound1.canonicalKey === espItem1.canonicalKey) {
          if (item.team1.length > foundMatch.team1.length) {
            foundMatch.team1 = item.team1;
          }
        }
        const espFound2 = resolveEsportsTeam(foundMatch.team2);
        const espItem2 = resolveEsportsTeam(item.team2);
        if (espFound2 && espItem2 && espFound2.canonicalKey === espItem2.canonicalKey) {
          if (item.team2.length > foundMatch.team2.length) {
            foundMatch.team2 = item.team2;
          }
        }
        foundMatch.title = `${foundMatch.team1} vs ${foundMatch.team2}`;
      }

      if (item.blv) {
        const cleanedItemBlv = sanitizeCommentatorName(item.blv, item.cleanGroup);
        if (cleanedItemBlv) {
          const existingBlvs = foundMatch.blv
            ? foundMatch.blv.split(",").map((b) => b.trim()).filter(Boolean)
            : [];
          const normalizedItemBlv = cleanedItemBlv.toLowerCase();
          const alreadyExists = existingBlvs.some(
            (b) => b.toLowerCase() === normalizedItemBlv,
          );
          if (!alreadyExists) {
            existingBlvs.push(cleanedItemBlv);
            foundMatch.blv = existingBlvs.join(", ");
          }
        }
      }

      // Ưu tiên giữ/cập nhật giờ đá cụ thể (HH:mm) khi stream hiện tại là placeholder ("Trực tiếp", "24/7") hoặc chưa có
      const isFoundTimePlaceholder =
        !foundMatch.time ||
        foundMatch.time === "Trực tiếp" ||
        foundMatch.time === "24/7" ||
        foundMatch.timestamp === Number.MAX_SAFE_INTEGER;
      const isItemTimeValid = Boolean(
        item.time &&
        item.time !== "Trực tiếp" &&
        item.time !== "24/7" &&
        item.timestamp &&
        item.timestamp !== Number.MAX_SAFE_INTEGER
      );

      if (isFoundTimePlaceholder && isItemTimeValid) {
        foundMatch.timestamp = item.timestamp;
        foundMatch.time = item.time;
      }

      foundMatch.sourceStatus = mergeSourceStatus(
        foundMatch.sourceStatus,
        item.sourceStatus,
      );

      foundMatch.timeline = getMatchTimeline(
        foundMatch.timestamp,
        foundMatch.sourceStatus,
        "unknown",
        now,
        foundMatch.isEvent,
        foundMatch.sport || item.sport,
      );

      const espHomeMerge = resolveEsportsTeam(foundMatch.team1);
      if (espHomeMerge?.logo) {
        foundMatch.homeLogo = espHomeMerge.logo;
      } else if (!foundMatch.homeLogo && item.rawLogo && !item.rawLogo.includes("tinhlagi.pro/logo.jpg")) {
        foundMatch.homeLogo = item.rawLogo;
      }

      const espAwayMerge = resolveEsportsTeam(foundMatch.team2);
      if (espAwayMerge?.logo) {
        foundMatch.awayLogo = espAwayMerge.logo;
      } else if (!foundMatch.awayLogo && item.awayLogo && !item.awayLogo.includes("tinhlagi.pro/logo.jpg")) {
        foundMatch.awayLogo = item.awayLogo;
      }
    } else {
      const matchTitle = item.isEvent
        ? item.displayTitle
        : `${item.team1} vs ${item.team2}`;

      const timeKey = item.time && item.time !== "Trực tiếp" && item.time !== "24/7"
        ? item.time.replace(/[^a-zA-Z0-9]/g, "")
        : "live";

      const matchId = !item.isEvent && item.normT1 && item.normT2
        ? `${item.sport}_${item.category || "senior_men"}_${[item.normT1, item.normT2].sort().join("_")}_${timeKey}`
        : `${item.sport}_${item.cleanGroup}_${item.displayTitle}`.toLowerCase().replace(/[^a-z0-9_]/g, "");

      const timeline = getMatchTimeline(
        item.timestamp,
        item.sourceStatus,
        "unknown",
        now,
        item.isEvent,
        item.sport,
      );

      const espHomeNew = resolveEsportsTeam(item.team1);
      const espAwayNew = resolveEsportsTeam(item.team2);

      let effectiveLogo = item.rawLogo;
      if (!effectiveLogo && item.cleanGroup === "FPT Play") {
        effectiveLogo = FPT_EVENT_POSTER;
      }

      const effectiveHomeLogo =
        espHomeNew?.logo ||
        (!item.isEvent && effectiveLogo && !effectiveLogo.includes("tinhlagi.pro/logo.jpg")
          ? effectiveLogo
          : "");

      const effectiveAwayLogo =
        espAwayNew?.logo ||
        (!item.isEvent && item.awayLogo && !item.awayLogo.includes("tinhlagi.pro/logo.jpg")
          ? item.awayLogo
          : "");

      mergedMatches.push({
        id: matchId,
        time: item.time,
        timestamp: item.timestamp,
        title: matchTitle,
        team1: item.team1,
        team2: item.team2,
        blv: item.blv,
        logo: effectiveLogo,
        homeLogo: effectiveHomeLogo,
        awayLogo: effectiveAwayLogo,
        group: item.cleanGroup,
        groups: [item.cleanGroup],
        tournament: item.tournament,
        sport: item.sport,
        category: item.category,
        gender: item.gender,
        isCategoryExplicit: item.isCategoryExplicit,
        isEvent: item.isEvent,
        sourceStatus: item.sourceStatus,
        timeline,
        quality: item.isFhd ? "FHD 1080p" : "HD 720p",
        servers: [newServer],
      });
    }
  }

  return { channels: Array.from(channelsSet), matches: mergedMatches };
}

interface HailabChannel {
  id: string;
  name: string;
  title?: string;
  description?: string;
  label?: { text?: string };
  image?: { url?: string };
  url?: string;
}

interface HailabGroup {
  id: string;
  name: string;
  channels: HailabChannel[];
}

interface HailabResponse {
  groups?: HailabGroup[];
}

interface HailabStream {
  name?: string;
  url?: string;
  format?: string;
}

interface HailabContent {
  name?: string;
  streams?: HailabStream[];
}

interface HailabSource {
  name?: string;
  contents?: HailabContent[];
}

interface HailabDetailResponse {
  sources?: HailabSource[];
}


export async function fetchHailabStreams(now: number = Date.now()): Promise<RawStreamItem[]> {
  try {
    const res = await fetch("https://livesport.hailab.cloud", {
      next: { revalidate: 120 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as HailabResponse;
    if (!data.groups || !Array.isArray(data.groups)) return [];

    const uniqueChannels: HailabChannel[] = [];
    for (const g of data.groups) {
      if (!g.channels || !Array.isArray(g.channels)) continue;
      for (const ch of g.channels) {
        if (!uniqueChannels.some((c) => c.id === ch.id)) {
          uniqueChannels.push(ch);
        }
      }
    }

    const candidateChannels: {
      channel: HailabChannel;
      timeStr: string;
      timestamp: number;
      sourceStatus: SourceMatchStatus;
      timeline: "live" | "upcoming" | "finished";
    }[] = [];

    for (const ch of uniqueChannels) {
      if (!ch.name || !ch.name.includes("|")) continue;
      const parts = ch.name.split("|");
      const timeStr = parts[0].trim();
      const timestamp = parseMatchTimeToTimestamp(timeStr);

      let sourceStatus: SourceMatchStatus = "unknown";
      const statusText = `${ch.label?.text || ""} ${ch.description || ""}`.toLowerCase();
      if (statusText.includes("đang diễn ra") || statusText.includes("in_progress")) {
        sourceStatus = "live";
      } else if (statusText.includes("đã kết thúc") || statusText.includes("finished")) {
        sourceStatus = "finished";
      } else if (
        statusText.includes("sắp diễn ra") ||
        statusText.includes("chưa diễn ra") ||
        statusText.includes("upcoming")
      ) {
        sourceStatus = "upcoming";
      }

      // Phân loại bộ môn từ mô tả hoặc tên kênh
      let sport = "football";
      const descLower = `${ch.name} ${ch.description || ""}`.toLowerCase();
      if (descLower.includes("bóng rổ") || descLower.includes("basketball")) sport = "basketball";
      else if (descLower.includes("tennis") || descLower.includes("quần vợt")) sport = "tennis";
      else if (descLower.includes("esport") || descLower.includes("điện tử") || descLower.includes("lol") || descLower.includes("dota") || descLower.includes("cs")) sport = "esports";
      else if (descLower.includes("billiard") || descLower.includes("bida") || descLower.includes("snooker")) sport = "billiards";
      else if (descLower.includes("f1") || descLower.includes("motor") || descLower.includes("đua xe")) sport = "motorsport";
      else if (descLower.includes("bóng chuyền") || descLower.includes("volleyball")) sport = "volleyball";

      // QUY TẮC LỌC TRẬN HIỂN THỊ TRÊN /LIVE:
      // 1. Vòng đời: timeline = getMatchTimeline (live / upcoming / finished)
      // 2. Phạm vi hiển thị: isMatchInLiveWindow (ĐANG CHIẾU hoặc SẮP CHIẾU <= 2 giờ)
      const timeline = getMatchTimeline(timestamp, sourceStatus, "unknown", now, false, sport);
      if (!isMatchInLiveWindow(timeline, timestamp, now)) {
        continue;
      }

      candidateChannels.push({
        channel: ch,
        timeStr,
        timestamp,
        sourceStatus,
        timeline,
      });
    }

    // Chỉ fetch chi tiết stream cho các trận candidate hợp lệ theo bộ lọc
    const detailPromises = candidateChannels.map(async (candidate) => {
      try {
        const detailRes = await fetch(
          `https://livesport.hailab.cloud/iptv_channel_contents.php?id=${encodeURIComponent(candidate.channel.id)}`,
          {
            next: { revalidate: 120 },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(4000),
          },
        );
        if (!detailRes.ok) return null;
        const detailData = (await detailRes.json()) as HailabDetailResponse;
        return { candidate, detailData };
      } catch {
        return null;
      }
    });

    const detailResults = await Promise.allSettled(detailPromises);
    const streams: RawStreamItem[] = [];

    for (const result of detailResults) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const { candidate, detailData } = result.value;
      const ch = candidate.channel;

      const logos = extractHailabLogos(ch.image?.url);
      const homeLogo = logos.homeLogo || ch.image?.url || "";
      const awayLogo = logos.awayLogo || "";

      let sport = "football";
      const descLower = (ch.description || "").toLowerCase();
      if (descLower.includes("bóng rổ") || descLower.includes("basketball")) sport = "basketball";
      else if (descLower.includes("tennis") || descLower.includes("quần vợt")) sport = "tennis";

      const sportEmoji = sport === "basketball" ? "🏀 " : sport === "tennis" ? "🎾 " : "⚽ ";
      const isLive = candidate.timeline === "live" || candidate.sourceStatus === "live";
      const statusMarker = isLive ? "🟢 " : "";

      const nameParts = ch.name.split("|");
      const teamsPart = nameParts.slice(1).join("|").trim();

      let tournament = "";
      const tournMatch = ch.description?.match(/(?:Giải|Tournament):\s*([^|]+)/i);
      if (tournMatch) {
        tournament = tournMatch[1].trim();
      }

      for (const s of detailData.sources || []) {
        for (const c of s.contents || []) {
          for (const st of c.streams || []) {
            if (st.url && !isBlockedStreamUrl(st.url)) {
              const blvName = st.name?.trim() || "";
              const blvTag = blvName ? ` (${blvName})` : "";
              const rawTitle = `${statusMarker}${candidate.timeStr} ${sportEmoji}${teamsPart}${blvTag}`;
              streams.push({
                rawTitle,
                group: "Live Sports (Hailab)",
                rawLogo: homeLogo,
                awayLogo,
                tournament,
                url: st.url,
                effectiveUrl: st.url,
                format: st.format,
                extinfLine: `#EXTINF:-1 tvg-logo="${homeLogo}" group-title="Live Sports (Hailab)" status="${isLive ? "LIVE" : "UPCOMING"}",${rawTitle}`,
              });
            }
          }
        }
      }
    }

    return streams;
  } catch (err) {
    console.error("❌ Error fetching Hailab live streams:", err);
    return [];
  }
}

// Bộ nhớ đệm Server SWR (Stale-While-Revalidate)
let memoryCache: {
  data: LiveFootballData;
  expireAt: number;
  staleUntil: number;
} | null = null;
let inFlightFetch: Promise<LiveFootballData> | null = null;
const FOOTBALL_REDIS_KEY = "live:football:matches:v2";
const FOOTBALL_REDIS_TTL = 180; // 3 phút

/**
 * Lọc snapshot danh sách trận đấu tức thời theo thời gian thực (0ms overhead)
 * - Loại bỏ các trận đã có kết quả kết thúc (FT) từ livescore
 * - Loại bỏ các trận đã vượt quá thời lượng tiêu chuẩn + khoảng đệm mà stream không active
 * - Đảm bảo khi F5 reload, không bao giờ để dữ liệu cache cũ làm tái xuất hiện trận FT
 */
export function filterLiveMatchesSnapshot(
  data: LiveFootballData,
  now: number = Date.now(),
): LiveFootballData {
  if (!data || !Array.isArray(data.matches) || data.matches.length === 0) {
    return data;
  }

  const cachedScoreEvents = footballScoreService.getCachedEventsSync();
  const validMatches: FootballMatch[] = [];

  for (const m of data.matches) {
    let currentScore = m.score;
    if (cachedScoreEvents && cachedScoreEvents.length > 0) {
      const matched = matchFixtureToScore(m, cachedScoreEvents);
      if (matched) {
        currentScore = matched;
        m.score = matched;
      }
    }

    // 1. Loại bỏ ngay lập tức nếu livescore xác nhận FT/Finished
    if (currentScore && currentScore.status) {
      const rawStatusText = (currentScore as unknown as { statusText?: string }).statusText || "";
      const rawDetail = `${rawStatusText} ${currentScore.statusDetail || ""} ${currentScore.displayClock || ""}`.toLowerCase();
      const isExplicitFT =
        currentScore.status === "finished" ||
        /\bft\b/i.test(rawDetail) ||
        /\bfull[\s-]?time\b/i.test(rawDetail) ||
        /\bfinal\b/i.test(rawDetail) ||
        /\baet\b/i.test(rawDetail) ||
        rawDetail.includes("pen_ft") ||
        rawDetail.includes("kết thúc");
      if (isExplicitFT) {
        continue;
      }
    }

    // 2. Kiểm tra máy chủ phát
    const workingServers = (m.servers || []).filter((s) => {
      if (!s.url || isBlockedStreamUrl(s.url)) return false;
      const status = getStreamHealthStatus(s.url);
      return status !== "dead";
    });
    if (workingServers.length === 0) {
      continue;
    }

    const hasAlive = workingServers.some((s) => getStreamHealthStatus(s.url) === "alive");
    const streamHealth: StreamHealthStatus = hasAlive ? "alive" : "unknown";
    const effectiveTs = currentScore?.kickoffTimestamp || m.timestamp;

    const timeline = getMatchTimeline(
      effectiveTs,
      m.sourceStatus,
      streamHealth,
      now,
      m.isEvent,
      m.sport,
      currentScore,
    );
    m.timeline = timeline;

    if (!isMatchInLiveWindow(timeline, effectiveTs, now)) {
      continue;
    }

    validMatches.push(m);
  }

  return {
    ...data,
    matches: validMatches,
  };
}

export const liveFootballService = {
  getFootballMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    if (memoryCache) {
      if (memoryCache.expireAt > now) {
        return filterLiveMatchesSnapshot(memoryCache.data, now);
      }
      if (memoryCache.staleUntil > now) {
        liveFootballService.revalidateFootballMatches().catch(() => {});
        return filterLiveMatchesSnapshot(memoryCache.data, now);
      }
    }

    // Kiểm tra L2 Upstash Redis Cache (chia sẻ giữa các Vercel instance, 0 M3U fetches)
    try {
      const redisCached = await cacheService.get<LiveFootballData>(FOOTBALL_REDIS_KEY);
      if (redisCached && Array.isArray(redisCached.matches) && redisCached.matches.length > 0) {
        const filteredSnapshot = filterLiveMatchesSnapshot(redisCached, now);
        memoryCache = {
          data: filteredSnapshot,
          expireAt: now + 3 * 60 * 1000,
          staleUntil: now + 6 * 60 * 1000,
        };
        return filteredSnapshot;
      }
    } catch {}

    if (inFlightFetch) return inFlightFetch;
    inFlightFetch = liveFootballService.fetchAndCacheMatches();
    try {
      return await inFlightFetch;
    } finally {
      inFlightFetch = null;
    }
  },

  revalidateFootballMatches: async () => {
    if (inFlightFetch) return;
    inFlightFetch = liveFootballService.fetchAndCacheMatches();
    try {
      await inFlightFetch;
    } catch {
      // Keep serving the last good snapshot when a source is unavailable.
    } finally {
      inFlightFetch = null;
    }
  },

  fetchAndCacheMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    try {
      const channelsSet = new Set<string>();

      // 1. LẤY TOÀN BỘ NGUỒN PHÁT TỪ TẤT CẢ DANH SÁCH PLAYLIST M3U
      const sources = getFootballM3uSources();
      const m3uFetchPromises = sources.map(async (source) => {
        try {
          const res = await fetch(source.url, {
            next: { revalidate: 120 },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "*/*",
            },
            signal: AbortSignal.timeout(4500),
          });
          if (!res.ok) return "";
          return await res.text();
        } catch {
          return "";
        }
      });

      const m3uSettled = await Promise.allSettled(m3uFetchPromises);

      const rawStreams: RawStreamItem[] = [];

      // 2A. PARSE TỪNG DÒNG STREAM TỪ CÁC NGUỒN PLAYLIST M3U
      const m3uTexts = m3uSettled;
      for (const res of m3uTexts) {
        if (res.status !== "fulfilled" || !res.value) continue;
        const text = res.value;
        const lines = text.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith("#EXTINF")) continue;

          let url = "";
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine && !nextLine.startsWith("#")) {
              url = nextLine;
              break;
            }
          }

          if (!url || isBlockedStreamUrl(url)) continue;

          // Trích xuất group-title
          const groupMatch = line.match(/group-title="([^"]+)"/i);
          const group = groupMatch ? groupMatch[1].trim() : "Bóng Đá Trực Tiếp";

          // Trích xuất tvg-logo
          const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
          const rawLogo = logoMatch ? logoMatch[1].trim() : "";

          // Trích xuất tiêu đề
          const commaIdx = line.lastIndexOf(",");
          const rawTitle =
            commaIdx !== -1
              ? line.substring(commaIdx + 1).trim()
              : "Trực Tiếp Bóng Đá";

          const upperGroup = group.toUpperCase();

          // Loại bỏ các kênh truyền hình tổng hợp / tin tức / mua sắm / phim lẻ không liên quan đến thể thao
          if (
            upperGroup.includes("TINHLAGI.PRO") ||
            upperGroup.includes("RADIO") ||
            upperGroup.includes("BÁN HÀNG") ||
            upperGroup.includes("PHIM TRUYỆN") ||
            upperGroup.includes("GIẢI TRÍ") ||
            upperGroup.includes("THIẾU NHI") ||
            upperGroup.includes("CA NHẠC") ||
            upperGroup.includes("TIN TỨC") ||
            upperGroup.includes("ĐẶC SẮC") ||
            upperGroup.includes("THIẾT YẾU") ||
            upperGroup.includes("ĐỊA PHƯƠNG") ||
            upperGroup.includes("TRONG NƯỚC") ||
            upperGroup.includes("HÀN QUỐC") ||
            upperGroup.includes("TRUNG QUỐC") ||
            upperGroup.includes("LIVE EVENTS")
          ) {
            continue;
          }

          // Loại bỏ phim lẻ / phim bộ / kịch
          const isMovieOrDrama =
            /Tập\s*\d+|Tập\s*Cuối|Phần\s*\d+|Thuyết\s*Minh|Lồng\s*Tiếng|Vietsub|Chiếu\s*Rạp|Phim\s*(Bộ|Lẻ|Truyện|Ngắn)|Hài\s*Kịch|Web\s*Drama|Trailer/i.test(
              rawTitle,
            ) ||
            /Tập\s*\d+|Tập\s*Cuối|Phần\s*\d+|Phim/i.test(group);

          if (isMovieOrDrama) continue;

          // Loại bỏ kênh truyền hình nhà đài nếu không có dấu hiệu trận đấu hoặc phòng BLV
          const isTvStationChannel =
            /^(HTV[1-9]\b|HTVC\s+(THUẦN|PHIM|GIA|DU|CA)|THVL[1-4]\b|VTV[1-9]\b|VTV\s*CẦN\s*THƠ|VOV|ANTV|QPVN|TTXVN|HANOI)/i.test(
              rawTitle.trim(),
            );
          if (
            isTvStationChannel &&
            !/\s+(?:vs|v)\s+/i.test(rawTitle) &&
            !/BLV\s+/i.test(rawTitle)
          ) {
            continue;
          }

          // Loại bỏ kênh tiếng nước ngoài không phụ đề/thuyết minh
          const isForeignChannel =
            upperGroup.includes("QUỐC TẾ") ||
            /[а-яА-ЯёЁ]/.test(rawTitle) ||
            /[\u0E00-\u0E7F]/.test(rawTitle) ||
            /(?:cinerama\.uz|antik\.sk|thaimomo\.com|linkintel\.ru|uplink\.kz|tvs\.by|bonus-tv\.ru|skygo\.mn|amagi\.tv|proofix\.ru|smotrim\.ru|cdnvideo\.ru|klowdtv\.com|ukrainske\.tv|oktv\.kz|tulixcdn\.com)/i.test(
              url,
            );
          if (isForeignChannel) continue;

          let effectiveUrl = url;
          if (effectiveUrl.includes("lauthaitv.cc") && effectiveUrl.includes(".flv")) {
            effectiveUrl = effectiveUrl
              .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
              .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
          } else if (effectiveUrl.includes(".flv")) {
            effectiveUrl = effectiveUrl.replace(/\.flv(\?.*)?$/i, ".m3u8$1");
          }

          if (isBlockedStreamUrl(effectiveUrl)) continue;

          rawStreams.push({
            rawTitle,
            group,
            rawLogo,
            url,
            effectiveUrl,
            extinfLine: line,
          });
        }
      }


      // 3. NORMALIZE VÀ GỘP CÁC STREAM TRÙNG TRẬN (DEDUP CHÍNH XÁC THEO IDENTITY)
      const { channels, matches: mergedMatches } = normalizeAndMergeStreams(rawStreams, now);
      for (const ch of channels) {
        channelsSet.add(ch);
      }

      // 4B. FAST PRE-FLIGHT CHECK CHO SỰ KIỆN TRỰC TIẾP (PREVENT STALE EVENT ZOMBIE)
      // Kiểm tra nhanh stream của các sự kiện trực tiếp đã/đang diễn ra (chỉ 1-3 URLs)
      // để nếu stream chết (404/timeout), loại bỏ ngay từ lần render đầu tiên (không đợi 30s background check)
      const eventUrlsToCheck: string[] = [];
      for (const m of mergedMatches) {
        if (m.isEvent && (!m.timestamp || m.timestamp === Number.MAX_SAFE_INTEGER || now >= m.timestamp)) {
          for (const s of m.servers) {
            if (s.url && !isBlockedStreamUrl(s.url) && getStreamHealthStatus(s.url) === "unknown") {
              eventUrlsToCheck.push(s.url);
            }
          }
        }
      }
      if (eventUrlsToCheck.length > 0) {
        const uniqueEventUrls = Array.from(new Set(eventUrlsToCheck)).slice(0, 10);
        await Promise.allSettled(uniqueEventUrls.map((u) => isStreamPlayable(u, 800)));
      }

      // 5. LỌC VÀ SẮP XẾP CÁC MÁY CHỦ THEO HEALTH CACHE & GHÉP LIVESCORE TRƯỚC KHI ĐÁNH GIÁ VÒNG ĐỜI
      const availableMatches: FootballMatch[] = [];

      // Đồng bộ sẵn sự kiện livescore (0ms latency nếu có cache, hoặc fetch nhanh có timeout)
      let cachedScoreEvents = footballScoreService.getCachedEventsSync();
      if (!cachedScoreEvents || cachedScoreEvents.length === 0) {
        try {
          const scoreboardRes = await footballScoreService.getScoreboardEvents();
          cachedScoreEvents = scoreboardRes.events;
        } catch {}
      }

      for (const m of mergedMatches) {
        // Lọc bỏ các server đã xác nhận DEAD hoặc thuộc blocked host list
        // Giữ lại server ALIVE và UNKNOWN (để match vẫn hiển thị khi cold-start)
        const workingServers = m.servers.filter((s) => {
          if (isBlockedStreamUrl(s.url)) return false;
          const status = getStreamHealthStatus(s.url);
          return status !== "dead";
        });

        if (workingServers.length === 0) {
          // Toàn bộ stream của trận đều đã xác nhận DEAD -> ẩn trận khỏi giao diện
          continue;
        }

        // 5A. GHÉP LIVESCORE VÀ CHUẨN HÓA GIẢI ĐẤU TRƯỚC
        let matchedScore: LiveMatchScore | null = null;
        if (cachedScoreEvents && cachedScoreEvents.length > 0) {
          matchedScore = matchFixtureToScore(m, cachedScoreEvents);
          if (matchedScore) {
            m.score = matchedScore;
            // Bổ sung giờ đá và timestamp chuẩn xác từ Scoreboard API khi trận chỉ có mác placeholder ("Trực tiếp", "24/7")
            const wasPlaceholderTime = !m.time || m.time === "Trực tiếp" || m.time === "24/7";
            if (matchedScore.kickoffTime && wasPlaceholderTime) {
              m.time = matchedScore.kickoffTime;
            }
            if (
              matchedScore.kickoffTimestamp &&
              (wasPlaceholderTime || m.timestamp === Number.MAX_SAFE_INTEGER || !m.timestamp)
            ) {
              m.timestamp = matchedScore.kickoffTimestamp;
            }
          }
        }

        // Luôn chuẩn hóa giải đấu canonical duy nhất cho mọi trận đấu
        m.tournament = resolveCanonicalTournament({
          tournament: m.tournament,
          title: m.title,
          sport: m.sport,
          team1: m.team1,
          team2: m.team2,
          category: m.category,
          gender: m.gender,
          score: matchedScore,
        });

        const hasAlive = workingServers.some(
          (s) => getStreamHealthStatus(s.url) === "alive",
        );
        const streamHealth: StreamHealthStatus = hasAlive ? "alive" : "unknown";
        const effectiveTimestamp = m.score?.kickoffTimestamp || m.timestamp;

        // 5B. ĐÁNH GIÁ VÒNG ĐỜI TRẬN ĐẤU VỚI LIVESCORE ĐÃ ĐƯỢC GẮN
        m.timeline = getMatchTimeline(
          effectiveTimestamp,
          m.sourceStatus,
          streamHealth,
          now,
          m.isEvent,
          m.sport,
          m.score,
        );

        if (!isMatchInLiveWindow(m.timeline, effectiveTimestamp, now)) {
          // Chỉ hiển thị hai nhóm trận trên /live:
          // 1. ĐANG CHIẾU: timeline === "live"
          // 2. SẮP CHIẾU: timeline === "upcoming" trong cửa sổ <= 2 giờ (120 phút)
          // Ẩn hoàn toàn trận đã kết thúc (FT) hoặc trận còn hơn 2 giờ tới
          continue;
        }

        // Sắp xếp ưu tiên:
        // 1. Luồng HLS lên trước
        // 2. Server đã xác nhận ALIVE lên trước UNKNOWN
        workingServers.sort((a, b) => {
          if (a.isHls && !b.isHls) return -1;
          if (!a.isHls && b.isHls) return 1;
          const aStatus = getStreamHealthStatus(a.url);
          const bStatus = getStreamHealthStatus(b.url);
          if (aStatus === "alive" && bStatus !== "alive") return -1;
          if (aStatus !== "alive" && bStatus === "alive") return 1;
          return 0;
        });

        // Đánh số lại thứ tự máy chủ hiển thị sạch đẹp
        workingServers.forEach((s, idx) => {
          s.name = s.name.replace(/#\d+/, `#${idx + 1}`);
        });

        m.servers = workingServers;
        m.quality = workingServers.some((s) => s.quality === "FHD") ? "FHD 1080p" : "HD 720p";
        availableMatches.push(m);
      }

      // Sắp xếp các trận theo thứ tự thời gian
      const sortedMatches = availableMatches.sort(
        (a, b) => a.timestamp - b.timestamp,
      );

      // Tự động bổ sung Logo HD cho Đội Nhà & Đội Khách (0ms critical path, background discovery)
      const validLogoMatches = sortedMatches.filter(
        (match) =>
          !match.isEvent && Boolean(match.team1) && Boolean(match.team2),
      );
      enrichMatchLogosSync(validLogoMatches);
      triggerBackgroundLogoEnrichment(validLogoMatches);

      const result: LiveFootballData = {
        updatedAt: new Date().toISOString(),
        channels: Array.from(channelsSet),
        matches: sortedMatches,
      };

      memoryCache = {
        data: result,
        expireAt: now + 5 * 60 * 1000,
        staleUntil: now + 10 * 60 * 1000,
      };

      // Đồng bộ L2 Upstash Redis để các serverless instance khác tái sử dụng (0ms re-parse)
      if (result.matches && result.matches.length > 0) {
        cacheService.set(FOOTBALL_REDIS_KEY, result, FOOTBALL_REDIS_TTL).catch(() => {});
      }

      // Kích hoạt revalidate ngầm theo thứ tự ưu tiên (LIVE -> UPCOMING <= 60m -> Khác)
      // Tuyệt đối không await để không làm chậm response
      const priorityUrls = getPriorityStreamUrls(sortedMatches);
      scheduleBackgroundHealthChecks(priorityUrls, 8, 32).catch(() => {});

      return result;
    } catch (err) {
      console.error("❌ Lỗi tải danh sách bóng đá:", err);
      const fallbackData: LiveFootballData = {
        updatedAt: new Date().toISOString(),
        channels: [],
        matches: [],
      };
      return fallbackData;
    }
  },

  /**
   * Lấy dữ liệu danh sách trận đấu tức thì từ bộ nhớ đệm RAM (0ms latency, ZERO Redis commands)
   */
  getCachedFootballMatchesSync: (): LiveFootballData | null => {
    const now = Date.now();
    if (memoryCache && memoryCache.staleUntil > now) {
      return filterLiveMatchesSnapshot(memoryCache.data, now);
    }
    return null;
  },
};



