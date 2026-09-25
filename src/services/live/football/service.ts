import { enrichMatchLogos } from "@/services/live/football-logo/service";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";
import { getTeamAsset, normalizeTeamKey } from "@/data/live/teamAssets";
import {
  NATIONAL_TEAM_CANONICAL_MAP,
  NATIONAL_TEAM_CANONICAL_KEYS,
} from "./nationalTeamAliases";

export { NATIONAL_TEAM_CANONICAL_MAP, NATIONAL_TEAM_CANONICAL_KEYS };


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
  isEvent?: boolean;
  sourceStatus?: SourceMatchStatus;
  timeline?: "live" | "today" | "upcoming" | "finished";
  servers: StreamServer[];
}

export interface LiveFootballData {
  updatedAt: string;
  channels: string[];
  matches: FootballMatch[];
}

// Danh sách các nguồn phát bóng đá & thể thao trực tiếp chuẩn Việt Nam & Quốc Tế
export function getFootballM3uSources(): {
  name: string;
  url: string;
  priority: number;
}[] {
  const envUrls = process.env.LIVE_FOOTBALL_M3U_URLS
    ? process.env.LIVE_FOOTBALL_M3U_URLS.split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const defaultSources = [
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
    {
      name: "THTT Live Sports Dự Phòng (ttthethao7)",
      url: "https://thtt27.github.io/tttt/tttt.m3u",
      priority: 3,
    },
  ];

  const customSources = envUrls.map((url, idx) => ({
    name: `Nguồn Tùy Chọn #${idx + 1}`,
    url,
    priority: 0,
  }));

  return [...customSources, ...defaultSources];
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

export function getMatchTimeline(
  timestamp?: number | null,
  sourceStatusOrLiveMarker: SourceMatchStatus | boolean = "unknown",
  streamHealth: "alive" | "dead" | "unknown" = "unknown",
  now: number = Date.now(),
): "live" | "upcoming" | "finished" {
  let normalizedStatus: SourceMatchStatus = "unknown";
  if (typeof sourceStatusOrLiveMarker === "boolean") {
    normalizedStatus = sourceStatusOrLiveMarker ? "live" : "unknown";
  } else if (sourceStatusOrLiveMarker) {
    normalizedStatus = sourceStatusOrLiveMarker;
  }

  const hasValidTimestamp =
    timestamp !== undefined &&
    timestamp !== null &&
    timestamp > 0 &&
    timestamp !== Number.MAX_SAFE_INTEGER;

  // 1. Explicit FINISHED source status hoặc stream DEAD: Luôn là finished (Ẩn)
  if (normalizedStatus === "finished" || streamHealth === "dead") {
    return "finished";
  }

  // 2. HARD DURATION GUARD: Sau 140 phút kể từ kickoff bắt buộc là FINISHED
  // Phải kiểm tra TRƯỚC bất kỳ rule nào có thể ép live (kể cả [LIVE], 🟢, HTTP 200 alive)
  if (hasValidTimestamp && now > timestamp + MAX_MATCH_DURATION_MS) {
    return "finished";
  }

  // 3. XỬ LÝ TRẬN CÓ KICKOFF TIMESTAMP HỢP LỆ
  if (hasValidTimestamp) {
    // 3A. TRẬN CHƯA KICKOFF (now < timestamp)
    if (now < timestamp) {
      // Upcoming chỉ là trận chưa kickoff và nằm trong cửa sổ 60 phút
      if (timestamp <= now + 60 * 60 * 1000) {
        return "upcoming";
      }
      // Bắt đầu hơn 60 phút tới -> không hiển thị trong SẮP PHÁT (finished/hidden)
      return "finished";
    }

    // 3B. TRẬN TRONG KHUNG 140 PHÚT (kickoff <= now <= kickoff + 140 phút)
    // Miễn là streamHealth !== "dead", trả về "live"
    // KHÔNG yêu cầu [LIVE]/🟢 trong sourceStatus (unknown không được tự động biến trận vừa kickoff thành finished)
    return "live";
  }

  // 4. XỬ LÝ TRẬN KHÔNG CÓ KICKOFF TIMESTAMP (Giữ nguyên behavior an toàn)
  if (normalizedStatus === "live") {
    return "live";
  }

  return "finished";
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

// Danh sách các từ định danh phụ trợ (phổ biến trong tên các CLB bóng đá trên thế giới)
const AUXILIARY_CLUB_WORDS = new Set([
  "clb", "fc", "ssc", "vfb", "ac", "as", "rc", "sc", "sl", "afc", "ogc", "fk", "sk", "cf", "cd", "ca",
  "csd", "deportes", "deportivo", "deportiva", "dep", "municipal", "muni", "club", "clube", "societa",
  "asociacion", "asoc", "agrupacion", "ud", "sd", "ad", "sv", "tsv", "fsv", "spvg", "vfl", "ksv", "bsc",
  "united", "utd", "city", "town", "athletic", "albion", "rovers", "wanderers", "county", "sports",
  "dtqg", "dt", "doituyen", "tuyen", "quocgia"
]);

const CLUB_ALIAS_MAP: Record<string, string> = {
  lao: "laos",
  laos: "laos",
  brunei: "bruneidarussalam",
  bruneidarussalam: "bruneidarussalam",
  parissaintgermain: "psg",
  parissg: "psg",
  paris: "psg",
  psg: "psg",
  aldiraiyah: "aldraih",
  aldraih: "aldraih",
  alderih: "aldraih",
  aldraihfc: "aldraih",
  alfateh: "alfateh",
  alfatehsc: "alfateh",
  italy: "italy",
  italia: "italy",
  ynu: "italy",
  y: "italy",
  australia: "australia",
  ucnu: "australia",
  uc: "australia",
  celtic: "celtic",
  celticfc: "celtic",
  saintjohnstone: "stjohnstone",
  stjohnstone: "stjohnstone",
  westbrom: "westbrom",
  westbromwichalbion: "westbrom",
  wba: "westbrom",
  atlmadrid: "atleticomadrid",
  atleticomadrid: "atleticomadrid",
  atleticodemadrid: "atleticomadrid",
  atletico: "atleticomadrid",
  atm: "atleticomadrid",
  atleti: "atleticomadrid",
  barca: "barcelona",
  barcelona: "barcelona",
  real: "realmadrid",
  realmadrid: "realmadrid",
  rma: "realmadrid",
  mancity: "mancity",
  mc: "mancity",
  mci: "mancity",
  manutd: "manutd",
  manchesterunited: "manutd",
  mu: "manutd",
  mun: "manutd",
  manchester: "manutd",
  spurs: "tottenham",
  tot: "tottenham",
  tottenham: "tottenham",
  liv: "liverpool",
  lfc: "liverpool",
  liverpool: "liverpool",
  che: "chelsea",
  cfc: "chelsea",
  chelsea: "chelsea",
  ars: "arsenal",
  arsenal: "arsenal",
  bvb: "dortmund",
  dortmund: "dortmund",
  bayern: "bayernmunich",
  bayernmunich: "bayernmunich",
  inter: "intermilan",
  intermilan: "intermilan",
  milan: "milan",
  acmilan: "milan",
  juve: "juventus",
  juventus: "juventus",
  napoli: "napoli",
  sscnapoli: "napoli",
  stuttgart: "stuttgart",
  vfbstuttgart: "stuttgart",
  viking: "viking",
  vikingfk: "viking",
  sporting: "sportingcp",
  sportingcp: "sportingcp",
  scp: "sportingcp",
  feyenoord: "feyenoord",
  feyenoordrotterdam: "feyenoord",
  leeds: "leeds",
  leedsunited: "leeds",
  slovan: "slovanbratislava",
  slovanbratislava: "slovanbratislava",
  galatasaray: "galatasaray",
  abhadraih: "abha",
  alshabab: "alshabab",
  intermiami: "intermiami",
  nyredbulls: "newyorkredbulls",
  lafc: "losangelesfc",

  // National Teams & International Fixture Aliases
  china: "china",
  trungquoc: "china",
  southkorea: "southkorea",
  hanquoc: "southkorea",
  korea: "southkorea",
  republicofkorea: "southkorea",
  korearepublic: "southkorea",
  rok: "southkorea",
  japan: "japan",
  nhatban: "japan",
  vietnam: "vietnam",
  thailand: "thailand",
  thailan: "thailand",
  england: "england",
  anh: "england",
  france: "france",
  phap: "france",
  germany: "germany",
  duc: "germany",
  spain: "spain",
  taybannha: "spain",
  espana: "spain",
  portugal: "portugal",
  bodaonha: "portugal",
  boaonha: "portugal",
  netherlands: "netherlands",
  halan: "netherlands",
  holland: "netherlands",
  belgium: "belgium",
  bi: "belgium",
  brazil: "brazil",
  brasil: "brazil",
  argentina: "argentina",
  usa: "usa",
  states: "usa",
  unitedstates: "usa",
  my: "usa",
  hoaky: "usa",
  uae: "uae",
  arabemirates: "uae",
  unitedarabemirates: "uae",
  saudiarabia: "saudiarabia",
  arapxeut: "saudiarabia",
  arapsaudi: "saudiarabia",
  northkorea: "northkorea",
  trieutien: "northkorea",
  bactrieutien: "northkorea",
  dprk: "northkorea",
  dprkorea: "northkorea",
  ireland: "ireland",
  republicofireland: "ireland",
  danmach: "denmark",
  denmark: "denmark",
  ao: "austria",
  austria: "austria",
  xuvales: "wales",
  wales: "wales",
  hylap: "greece",
  hyap: "greece",
  greece: "greece",
  nauy: "norway",
  norway: "norway",
  malta: "malta",
  andorra: "andorra",
  bahrain: "bahrain",
  qatar: "qatar",
  yemen: "yemen",
  lithuania: "lithuania",
  liechtenstein: "liechtenstein",
  serbia: "serbia",
  israel: "israel",
  kosovo: "kosovo",

  // Ivory Coast / Bờ Biển Ngà & Ghana
  bobiennga: "ivorycoast",
  ivorycoast: "ivorycoast",
  cotedivoire: "ivorycoast",
  theelephants: "ivorycoast",
  ghana: "ghana",

  // Additional African / European / American teams
  cameroon: "cameroon",
  camerun: "cameroon",
  nigeria: "nigeria",
  senegal: "senegal",
  maroc: "morocco",
  morocco: "morocco",
  aicap: "egypt",
  egypt: "egypt",
  namphi: "southafrica",
  southafrica: "southafrica",
  algeria: "algeria",
  tunisia: "tunisia",
  mali: "mali",
  burkinafaso: "burkinafaso",
  guinea: "guinea",
  zambia: "zambia",
  uganda: "uganda",
  congo: "congo",
  chdccongo: "drcongo",
  drcongo: "drcongo",
  thuysi: "switzerland",
  switzerland: "switzerland",
  thuydien: "sweden",
  sweden: "sweden",
  balan: "poland",
  poland: "poland",
  thonhiky: "turkey",
  turkey: "turkey",
  sec: "czechia",
  czechia: "czechia",
  czechrepublic: "czechia",
  hungary: "hungary",
  ukraina: "ukraine",
  ukraine: "ukraine",
  scotland: "scotland",
  bacireland: "northernireland",
  northernireland: "northernireland",
  slovakia: "slovakia",
  slovenia: "slovenia",
  romania: "romania",
  croatia: "croatia",
  uruguay: "uruguay",
  colombia: "colombia",
  chile: "chile",
  peru: "peru",
  ecuador: "ecuador",
  paraguay: "paraguay",
  venezuela: "venezuela",
  bolivia: "bolivia",
};

export function normalizeClubKey(name: string): string {
  if (!name) return "";

  const clean = name
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/^(?:doi\s*tuyen\s*quoc\s*gia|doi\s*tuyen|national\s*team|dtqg|dt|clb)\s+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Direct canonical national-team lookup on compact alphanumeric string (handles "chinapr", "trungquoc", "vietnam", "vn", etc.)
  const noSpace = clean.replace(/\s+/g, "");
  if (NATIONAL_TEAM_CANONICAL_MAP[noSpace]) {
    return NATIONAL_TEAM_CANONICAL_MAP[noSpace];
  }

  // 2. Auxiliary words stripping & check
  const words = clean.split(/\s+/).filter(Boolean);
  const coreWords = words.filter((w) => !AUXILIARY_CLUB_WORDS.has(w));
  const significant = coreWords.length > 0 ? coreWords.join("") : words.join("");

  if (NATIONAL_TEAM_CANONICAL_MAP[significant]) {
    return NATIONAL_TEAM_CANONICAL_MAP[significant];
  }

  if (CLUB_ALIAS_MAP[significant]) {
    return CLUB_ALIAS_MAP[significant];
  }

  // 3. Canonical TeamAsset lookup (>210 ĐTQG + CLB hàng đầu thế giới)
  const asset = getTeamAsset(name);
  if (asset && asset.name) {
    const assetClean = normalizeTeamKey(asset.name);
    if (NATIONAL_TEAM_CANONICAL_MAP[assetClean]) {
      return NATIONAL_TEAM_CANONICAL_MAP[assetClean];
    }
    if (CLUB_ALIAS_MAP[assetClean]) {
      return CLUB_ALIAS_MAP[assetClean];
    }
    return assetClean;
  }

  return significant;
}

function extractTeamTokens(name: string): string[] {
  if (!name) return [];
  const clean = name
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const significant = rawTokens.filter(
    (w) => w.length >= 3 && !AUXILIARY_CLUB_WORDS.has(w),
  );
  return significant.length > 0 ? significant : rawTokens;
}

function calculateStringSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length < s2.length ? s1 : s2;
  if (longer.length < 3) return 0;
  if (longer.includes(shorter) && shorter.length >= 4) return 0.9;

  const getBigrams = (str: string) => {
    const s = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      s.add(str.slice(i, i + 2));
    }
    return s;
  };
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  for (const item of b1) {
    if (b2.has(item)) intersection++;
  }
  return (2.0 * intersection) / (b1.size + b2.size || 1);
}

export function isSingleTeamMatching(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const keyA = normalizeClubKey(nameA);
  const keyB = normalizeClubKey(nameB);

  // 1. Exact normalized key match (hoặc canonical national team alias match)
  if (keyA && keyB && keyA === keyB) return true;

  // 2. Guard tuyệt đối cho ĐTQG: Nếu bất kỳ đội nào là ĐTQG đã nhận diện canonical key mà keyA !== keyB:
  // Tuyệt đối không để getTeamAsset / fuzzy / token overlap / substring merge nhầm các quốc gia khác nhau hoặc với CLB khác
  // (ví dụ: Congo vs DR Congo, Guinea vs Equatorial Guinea vs Guinea-Bissau, Niger vs Nigeria, Australia vs Austria, North Korea vs South Korea)
  const isNationalA = NATIONAL_TEAM_CANONICAL_KEYS.has(keyA);
  const isNationalB = NATIONAL_TEAM_CANONICAL_KEYS.has(keyB);
  if (isNationalA || isNationalB) {
    return false;
  }

  // 3. Canonical Team Asset match (hỗ trợ toàn bộ CLB chuẩn hóa song ngữ Anh - Việt)
  const assetA = getTeamAsset(nameA);
  const assetB = getTeamAsset(nameB);
  if (assetA && assetB && assetA.name && assetA.name === assetB.name) {
    return true;
  }

  // 4. Token overlap: Có chung từ khóa định danh cốt lõi (ví dụ ['iquique'])
  const tokensA = extractTeamTokens(nameA);
  const tokensB = extractTeamTokens(nameB);
  if (tokensA.length > 0 && tokensB.length > 0) {
    const sharedTokens = tokensA.filter((t) => tokensB.includes(t));
    if (sharedTokens.some((t) => t.length >= 4)) {
      return true;
    }
  }

  // 4. Chuỗi con dài & độ tương đồng fuzzy cao với guard chặt chẽ
  if (keyA.length >= 5 && keyB.length >= 5) {
    if (keyA.includes(keyB) || keyB.includes(keyA)) return true;
    if (calculateStringSimilarity(keyA, keyB) >= 0.85) return true;
  }

  return false;
}

export function areMatchTimesCompatible(
  t1: { timestamp: number; time: string; isLive: boolean },
  t2: { timestamp: number; time: string; isLive: boolean },
  now: number = Date.now(),
  toleranceMs: number = 90 * 60 * 1000,
): boolean {
  const isLive1 = t1.isLive || t1.time === "Trực tiếp";
  const isLive2 = t2.isLive || t2.time === "Trực tiếp";

  const hasTs1 = t1.timestamp > 0 && t1.timestamp !== Number.MAX_SAFE_INTEGER;
  const hasTs2 = t2.timestamp > 0 && t2.timestamp !== Number.MAX_SAFE_INTEGER;

  // Case 1: Cả hai đều có kickoff timestamp rõ ràng (Scheduled ↔ Scheduled)
  if (hasTs1 && hasTs2) {
    const diffMs = Math.abs(t1.timestamp - t2.timestamp);
    if (diffMs <= toleranceMs) {
      return true;
    }

    // Nếu 1 bên có timestamp thực tế (scheduled), còn 1 bên chỉ có timestamp = now (do live marker):
    const scheduledTs = isLive1 && !isLive2 ? t2.timestamp : !isLive1 && isLive2 ? t1.timestamp : null;
    if (scheduledTs !== null) {
      return now >= scheduledTs - 60 * 60 * 1000 && now <= scheduledTs + MAX_MATCH_DURATION_MS;
    }

    return false;
  }

  // Case 2: Cả hai đều là Live stream (Live ↔ Live)
  if (isLive1 && isLive2) {
    return true;
  }

  // Case 3: Một bên Live và một bên Scheduled có timestamp
  if ((isLive1 && hasTs2) || (isLive2 && hasTs1)) {
    const scheduledTs = hasTs1 ? t1.timestamp : t2.timestamp;
    return now >= scheduledTs - 60 * 60 * 1000 && now <= scheduledTs + MAX_MATCH_DURATION_MS;
  }

  // Case 4: Text time matching ("21:00" === "21:00")
  if (t1.time && t2.time && t1.time !== "24/7" && t2.time !== "24/7") {
    if (t1.time === t2.time) return true;
    const c1 = t1.time.replace(/[^0-9]/g, "");
    const c2 = t2.time.replace(/[^0-9]/g, "");
    if (c1 && c2 && c1 === c2) return true;
  }

  // Case 5: 24/7 hoặc generic
  if (t1.time === "24/7" && t2.time === "24/7") return true;

  return false;
}

export function areMatchFixturesMatching(
  m1: {
    team1: string;
    team2: string;
    time: string;
    timestamp: number;
    isLiveMarker: boolean;
    sport?: string;
    category?: string;
    isEvent?: boolean;
  },
  m2: {
    team1: string;
    team2: string;
    time: string;
    timestamp: number;
    isLiveMarker: boolean;
    sport?: string;
    category?: string;
    isEvent?: boolean;
  },
  now: number = Date.now(),
): boolean {
  if (m1.sport && m2.sport && m1.sport !== m2.sport) return false;
  if (m1.category && m2.category && m1.category !== m2.category) return false;
  if (m1.isEvent || m2.isEvent) return false;
  if (!m1.team1 || !m1.team2 || !m2.team1 || !m2.team2) return false;

  // 1. Kiểm tra cặp 2 đội (Thuận chiều hoặc Đảo chiều)
  const isDirectMatch =
    isSingleTeamMatching(m1.team1, m2.team1) &&
    isSingleTeamMatching(m1.team2, m2.team2);

  const isSwappedMatch =
    isSingleTeamMatching(m1.team1, m2.team2) &&
    isSingleTeamMatching(m1.team2, m2.team1);

  if (!isDirectMatch && !isSwappedMatch) {
    return false;
  }

  // 2. Time Guard: Phải tương thích thời gian thi đấu
  return areMatchTimesCompatible(
    { timestamp: m1.timestamp, time: m1.time, isLive: m1.isLiveMarker },
    { timestamp: m2.timestamp, time: m2.time, isLive: m2.isLiveMarker },
    now,
  );
}

// Bảng nhận diện câu lạc bộ theo giải đấu
const EPL_TEAMS = [
  "manchester united",
  "man utd",
  "man united",
  "mu",
  "mun",
  "mufc",
  "manchester city",
  "man city",
  "mc",
  "mci",
  "mcfc",
  "arsenal",
  "ars",
  "afc",
  "gunners",
  "liverpool",
  "liv",
  "lfc",
  "chelsea",
  "che",
  "cfc",
  "tottenham hotspur",
  "tottenham",
  "spurs",
  "tot",
  "newcastle united",
  "newcastle",
  "nufc",
  "aston villa",
  "villa",
  "avl",
  "avfc",
  "west ham united",
  "west ham",
  "whu",
  "brighton",
  "bha",
  "everton",
  "eve",
  "wolverhampton",
  "wolves",
  "wol",
  "fulham",
  "ful",
  "crystal palace",
  "palace",
  "cry",
  "brentford",
  "bre",
  "bournemouth",
  "bou",
  "nottingham forest",
  "nottingham",
  "forest",
  "nfo",
  "leicester city",
  "leicester",
  "lei",
  "southampton",
  "sou",
  "ipswich town",
  "ipswich",
  "ips",
  "leeds united",
  "leeds",
  "lu",
  "burnley",
  "sheffield united",
  "sheffield",
  "luton town",
  "luton",
  "sunderland",
  "norwich",
  "norwich city",
  "watford",
  "west brom",
  "west bromwich albion",
  "wba",
  "middlesbrough",
  "charlton",
  "charlton athletic",
  "queens park rangers",
  "qpr",
  "derby county",
  "derby",
  "birmingham city",
  "birmingham",
];

const LALIGA_TEAMS = [
  "real madrid",
  "rma",
  "barcelona",
  "barca",
  "barce",
  "fcb",
  "fc barcelona",
  "atletico madrid",
  "atletico de madrid",
  "atletico",
  "atl madrid",
  "atl. madrid",
  "atm",
  "atleti",
  "sevilla",
  "sev",
  "valencia",
  "val",
  "villarreal",
  "vil",
  "athletic bilbao",
  "athletic club",
  "ath bilbao",
  "bilbao",
  "ath",
  "real sociedad",
  "sociedad",
  "rso",
  "real betis",
  "betis",
  "bet",
  "girona",
  "gir",
  "mallorca",
  "celta vigo",
  "celta",
  "osasuna",
  "getafe",
  "rayo vallecano",
  "rayo",
  "alaves",
  "deportivo alaves",
  "las palmas",
  "espanyol",
  "leganes",
  "valladolid",
];

const SERIE_A_TEAMS = [
  "inter milan",
  "internazionale",
  "ac milan",
  "milan",
  "acm",
  "juventus",
  "juve",
  "juv",
  "napoli",
  "nap",
  "as roma",
  "roma",
  "asr",
  "lazio",
  "laz",
  "atalanta",
  "ata",
  "fiorentina",
  "fio",
  "bologna",
  "bol",
  "torino",
  "tor",
  "genoa",
  "udinese",
  "sassuolo",
  "monza",
  "empoli",
  "verona",
  "hellas verona",
  "cagliari",
  "parma",
  "como",
  "lecce",
  "venezia",
];

const BUNDESLIGA_TEAMS = [
  "bayern munich",
  "bayern munchen",
  "bayern",
  "fc bayern",
  "borussia dortmund",
  "dortmund",
  "bvb",
  "bayer leverkusen",
  "leverkusen",
  "b04",
  "lev",
  "rb leipzig",
  "leipzig",
  "rbl",
  "eintracht frankfurt",
  "frankfurt",
  "sge",
  "vfb stuttgart",
  "stuttgart",
  "vfb",
  "borussia monchengladbach",
  "monchengladbach",
  "bmg",
  "gladbach",
  "wolfsburg",
  "wob",
  "freiburg",
  "scf",
  "werder bremen",
  "bremen",
  "svw",
  "hoffenheim",
  "tsg",
  "augsburg",
  "fca",
  "mainz",
  "m05",
  "union berlin",
  "heidenheim",
  "st pauli",
  "bochum",
  "holstein kiel",
];

const LIGUE_1_TEAMS = [
  "paris saint germain",
  "paris saint-germain",
  "psg",
  "paris sg",
  "as monaco",
  "monaco",
  "asm",
  "olympique de marseille",
  "marseille",
  "om",
  "olympique lyonnais",
  "lyon",
  "ol",
  "lille osc",
  "lille",
  "losc",
  "stade rennais",
  "rennes",
  "ogc nice",
  "nice",
  "rc lens",
  "lens",
  "toulouse",
  "strasbourg",
  "brest",
  "reims",
  "nantes",
  "montpellier",
  "auxerre",
  "le havre",
  "saint-etienne",
  "angers",
];

const OTHER_EUROPE_TEAMS = [
  "sporting cp",
  "sporting lisbon",
  "sporting",
  "scp",
  "benfica",
  "sl benfica",
  "slb",
  "porto",
  "fc porto",
  "fcp",
  "ajax",
  "afc ajax",
  "psv eindhoven",
  "psv",
  "feyenoord rotterdam",
  "feyenoord",
  "fey",
  "celtic",
  "celtic fc",
  "rangers",
  "rangers fc",
  "galatasaray",
  "fenerbahce",
  "besiktas",
  "trabzonspor",
  "shakhtar donetsk",
  "fc shakhtar donetsk",
  "shakhtar",
  "dynamo kyiv",
  "slavia praha",
  "slavia prague",
  "sparta prague",
  "sparta praha",
  "crvena zvezda",
  "red star",
  "red star belgrade",
  "salzburg",
  "rb salzburg",
  "dinamo zagreb",
  "olympiacos",
  "panathinaikos",
  "paok",
  "young boys",
  "slovan bratislava",
  "viking",
  "viking fk",
  "bodo glimt",
  "bodo / glimt",
  "bodø / glimt",
  "bodø/glimt",
  "club brugge",
  "brugge",
  "union sg",
  "copenhagen",
  "gent",
  "anderlecht",
  "sabah",
  "sabah fk",
];

const MLS_TEAMS = [
  "inter miami",
  "inter miami cf",
  "la galaxy",
  "los angeles galaxy",
  "lafc",
  "los angeles fc",
  "new york red bulls",
  "ny red bulls",
  "new york city",
  "new york city fc",
  "nycfc",
  "columbus crew",
  "chicago fire",
  "chicago",
  "philadelphia union",
  "fc cincinnati",
  "cincinnati",
  "toronto fc",
  "nashville sc",
  "austin fc",
  "colorado rapids",
  "houston dynamo",
  "real salt lake",
  "minnesota united",
  "minnesota united fc",
  "fc dallas",
  "san diego fc",
  "san jose earthquakes",
  "vancouver whitecaps",
  "vancouver whitecaps fc",
  "portland timbers",
  "st louis city",
  "st. louis city sc",
  "atlanta united",
  "seattle sounders",
  "orlando city",
  "sporting kansas city",
  "new england revolution",
  "dc united",
  "montreal impact",
  "cf montreal",
  "charlotte fc",
];

const SAUDI_TEAMS = [
  "al nassr",
  "al-nassr",
  "al nassr fc",
  "al hilal",
  "al-hilal",
  "al ittihad",
  "al-ittihad",
  "al ahli",
  "al-ahli",
  "al shabab",
  "al-shabab",
  "al ettifaq",
  "al kholood",
  "abha",
  "al tai",
  "al fateh",
  "al taawoun",
  "al draih",
  "shabab al ahli",
];

const VLEAGUE_TEAMS = [
  "ha noi",
  "clb ha noi",
  "hanoi fc",
  "hoang anh gia lai",
  "hagl",
  "thep xanh nam dinh",
  "nam dinh",
  "the cong viettel",
  "viettel",
  "cong an ha noi",
  "cahn",
  "quy nhon binh dinh",
  "binh dinh",
  "hai phong",
  "dong a thanh hoa",
  "thanh hoa",
  "song lam nghe an",
  "slna",
  "becamex binh duong",
  "binh duong",
  "tp ho chi minh",
  "tp hcm",
  "clb tphcm",
  "quang nam",
  "da nang",
  "shb da nang",
  "hong linh ha tinh",
  "ha tinh",
  "khanh hoa",
  "binh phuoc",
  "pvf cand",
  "pvf",
];

function matchTeamInList(teamStr: string, clubList: string[]): boolean {
  if (!teamStr) return false;
  const cleanTeam = normalizeText(teamStr);
  if (!cleanTeam) return false;
  const words = cleanTeam.split(/\s+/).filter(Boolean);

  for (const club of clubList) {
    const cleanClub = normalizeText(club);
    // 1. So khớp chính xác
    if (cleanTeam === cleanClub) return true;

    // 2. So khớp từ ghép >= 4 ký tự
    if (cleanClub.length >= 4 && cleanTeam.length >= 4) {
      if (
        cleanTeam === cleanClub ||
        cleanTeam.startsWith(cleanClub + " ") ||
        cleanTeam.endsWith(" " + cleanClub) ||
        cleanTeam.includes(" " + cleanClub + " ")
      ) {
        return true;
      }
      if (
        cleanClub.startsWith(cleanTeam + " ") ||
        cleanClub.endsWith(" " + cleanTeam) ||
        cleanClub.includes(" " + cleanTeam + " ")
      ) {
        return true;
      }
    }

    // 3. So khớp từ viết tắt ngắn độc lập (atm, psg, bvb, lfc, cfc, scp...)
    if (words.includes(cleanClub)) {
      return true;
    }
  }
  return false;
}

function detectTournament(title: string, team1: string, team2: string): string {
  // Loại bỏ ngoặc BLV để tránh match nhầm BLV C2 / BLV C1
  const cleanTitleForTourn = (title || "")
    .replace(/\((BLV\s+[^)]+|[^)]*)\)/gi, " ")
    .replace(/\[[^\]]+\]/g, " ");

  const normTitle = normalizeText(cleanTitleForTourn);
  const normT1 = normalizeText(team1);
  const normT2 = normalizeText(team2);

  // 1. Kiểm tra các bộ môn thể thao khác
  if (
    normTitle.includes("🏀") ||
    normTitle.includes("wnba") ||
    normTitle.includes("nba") ||
    normTitle.includes("vba") ||
    normTitle.includes("basketball") ||
    normTitle.includes("bong ro") ||
    normTitle.includes("wildcats") ||
    normTitle.includes("36ers") ||
    normTitle.includes("liberty") ||
    normTitle.includes("dream") ||
    normT1.includes("heat") ||
    normT2.includes("heat") ||
    normT1.includes("buffalo") ||
    normT2.includes("buffalo") ||
    normT1.includes("dolphins") ||
    normT2.includes("dolphins")
  ) {
    if (
      normTitle.includes("vba") ||
      normT1.includes("heat") ||
      normT2.includes("heat") ||
      normT1.includes("buffalo") ||
      normT2.includes("buffalo") ||
      normT1.includes("dolphins") ||
      normT2.includes("dolphins")
    ) {
      return "🏀 🇻🇳 Giải Bóng Rổ VBA";
    }
    if (normTitle.includes("nba") || normTitle.includes("wnba")) {
      return "🏀 🇺🇸 Giải Bóng Rổ NBA";
    }
    return "🏀 Bóng Rổ Trực Tiếp";
  }
  if (normTitle.includes("🏐") || normTitle.includes("volleyball") || normTitle.includes("bong chuyen")) {
    return "🏐 Bóng Chuyền Trực Tiếp";
  }
  if (normTitle.includes("🎾") || normTitle.includes("🥎") || normTitle.includes("tennis") || normTitle.includes("quan vot")) {
    return "🎾 Tennis Trực Tiếp";
  }
  if (
    normTitle.includes("🏎") ||
    normTitle.includes("🏎️") ||
    normTitle.includes("🏁") ||
    normTitle.includes("f1") ||
    normTitle.includes("formula 1") ||
    normTitle.includes("motogp") ||
    normTitle.includes("dua xe")
  ) {
    return "🏎️ F1 / Đua Xe Trực Tiếp";
  }
  if (normTitle.includes("🥊") || normTitle.includes("boxing") || normTitle.includes("quyen anh") || normTitle.includes("ufc") || normTitle.includes("mma")) {
    return "🥊 Quyền Anh Trực Tiếp";
  }
  if (normTitle.includes("🎱") || normTitle.includes("billiards") || normTitle.includes("bida") || normTitle.includes("snooker") || normTitle.includes("pool")) {
    return "🎱 Bida / Billiards Trực Tiếp";
  }
  if (normTitle.includes("🎮") || normTitle.includes("esports") || normTitle.includes("esport") || normTitle.includes("lck") || normTitle.includes("lpl") || normTitle.includes("vcs")) {
    return "🎮 Esports Trực Tiếp";
  }
  if (normTitle.includes("🏸") || normTitle.includes("badminton") || normTitle.includes("cau long")) {
    return "🏸 Cầu Lông Trực Tiếp";
  }
  if (
    normTitle.includes("asiad") ||
    normTitle.includes("asian games") ||
    normTitle.includes("sea games")
  ) {
    return "🏅 Asian Games / ASIAD";
  }

  // 2. Kiểm tra cúp & giải đấu Châu Âu
  if (
    normTitle.includes("champions league") ||
    normTitle.includes("cup c1") ||
    normTitle.includes("cúp c1") ||
    normTitle.includes("ucl") ||
    /\bc1\b/.test(normTitle)
  ) {
    return "🏆 Cúp C1 Châu Âu";
  }
  if (
    normTitle.includes("europa league") ||
    normTitle.includes("cup c2") ||
    normTitle.includes("cúp c2") ||
    normTitle.includes("uel") ||
    /\bc2\b/.test(normTitle)
  ) {
    return "🏆 Cúp C2 Europa League";
  }
  if (
    normTitle.includes("conference league") ||
    normTitle.includes("cup c3") ||
    normTitle.includes("cúp c3") ||
    normTitle.includes("uecl") ||
    /\bc3\b/.test(normTitle)
  ) {
    return "🏆 Cúp C3";
  }
  if (
    normTitle.includes("premier league") ||
    normTitle.includes("ngoai hang anh") ||
    normTitle.includes("epl")
  ) {
    return "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Ngoại Hạng Anh";
  }
  if (normTitle.includes("la liga") || normTitle.includes("laliga")) {
    return "🇪🇸 La Liga";
  }
  if (normTitle.includes("serie a") || normTitle.includes("seriea")) {
    return "🇮🇹 Serie A";
  }
  if (normTitle.includes("bundesliga")) {
    return "🇩🇪 Bundesliga";
  }
  if (normTitle.includes("ligue 1") || normTitle.includes("ligue1")) {
    return "🇫🇷 Ligue 1";
  }
  if (
    normTitle.includes("mls") ||
    normTitle.includes("major league soccer") ||
    normTitle.includes("sounders") ||
    normTitle.includes("salt lake")
  ) {
    return "🇺🇸 MLS (Mỹ)";
  }
  if (
    normTitle.includes("saudi pro league") ||
    normTitle.includes("saudi league") ||
    normTitle.includes("spl")
  ) {
    return "🇸🇦 Saudi League";
  }
  if (
    normTitle.includes("v league") ||
    normTitle.includes("vleague") ||
    normTitle.includes("v league 1")
  ) {
    return "🇻🇳 V-League";
  }

  // 3. Đội tuyển Quốc gia & Giao hữu Quốc tế
  const nationalKeywords = [
    "laos", "brunei", "japan", "uruguay", "china", "maldives", "myanmar", "timor", "namibia", "congo",
    "uae", "yemen", "libya", "botswana", "mauritania", "central african", "equatorial guinea", "andorra",
    "malta", "vietnam", "thailand", "indonesia", "malaysia", "singapore", "philippines", "aruba", "antigua",
    "brazil", "argentina", "france", "germany", "england", "spain", "portugal", "italy", "netherlands",
    "belgium", "croatia", "korea", "australia"
  ];
  if (
    nationalKeywords.some((n) => normT1.includes(n)) ||
    nationalKeywords.some((n) => normT2.includes(n)) ||
    normTitle.includes("giao huu") ||
    normTitle.includes("giao hữu") ||
    normTitle.includes("friendly")
  ) {
    return "🌍 Giao Hữu & ĐTQG";
  }

  // 4. Giải Nam Mỹ / Châu Mỹ
  const southAmericaKeywords = [
    "cali", "iquique", "antofagasta", "calera", "catolica", "aguilas", "doradas", "boca", "river",
    "flamengo", "palmeiras", "colo", "nacional", "millonarios", "junior", "santa fe", "medellin", "copa"
  ];
  if (
    southAmericaKeywords.some((n) => normT1.includes(n)) ||
    southAmericaKeywords.some((n) => normT2.includes(n)) ||
    normTitle.includes("chile") ||
    normTitle.includes("colombia") ||
    normTitle.includes("argentina") ||
    normTitle.includes("brazil")
  ) {
    return "🌎 Giải Nam Mỹ (Copa / VĐQG)";
  }

  // 5. Nhận diện giải đấu của từng câu lạc bộ
  const getLeagueOfTeam = (team: string): string => {
    if (!team) return "";
    if (matchTeamInList(team, MLS_TEAMS)) return "mls";
    if (matchTeamInList(team, SAUDI_TEAMS)) return "saudi";
    if (matchTeamInList(team, VLEAGUE_TEAMS)) return "vleague";
    if (matchTeamInList(team, EPL_TEAMS)) return "epl";
    if (matchTeamInList(team, LALIGA_TEAMS)) return "laliga";
    if (matchTeamInList(team, SERIE_A_TEAMS)) return "seriea";
    if (matchTeamInList(team, BUNDESLIGA_TEAMS)) return "bundesliga";
    if (matchTeamInList(team, LIGUE_1_TEAMS)) return "ligue1";
    if (matchTeamInList(team, OTHER_EUROPE_TEAMS)) return "other_europe";
    return "";
  };

  const l1 = getLeagueOfTeam(normT1);
  const l2 = getLeagueOfTeam(normT2);

  // Cùng giải quốc nội:
  if (l1 === "epl" && l2 === "epl") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Ngoại Hạng Anh";
  if (l1 === "laliga" && l2 === "laliga") return "🇪🇸 La Liga";
  if (l1 === "seriea" && l2 === "seriea") return "🇮🇹 Serie A";
  if (l1 === "bundesliga" && l2 === "bundesliga") return "🇩🇪 Bundesliga";
  if (l1 === "ligue1" && l2 === "ligue1") return "🇫🇷 Ligue 1";
  if (l1 === "saudi" && l2 === "saudi") return "🇸🇦 Saudi League";
  if (l1 === "mls" && l2 === "mls") return "🇺🇸 MLS (Mỹ)";
  if (l1 === "vleague" && l2 === "vleague") return "🇻🇳 V-League";

  // Khác giải (2 đội bóng Châu Âu gặp nhau mà tiêu đề chưa ghi rõ C1/C2/C3) -> Cúp Châu Âu:
  const euroLeagues = [
    "epl",
    "laliga",
    "seriea",
    "bundesliga",
    "ligue1",
    "other_europe",
  ];
  if (euroLeagues.includes(l1) && euroLeagues.includes(l2) && l1 !== l2) {
    return "🏆 Cúp Châu Âu";
  }

  if (l1 === "other_europe" || l2 === "other_europe") return "🏆 Cúp Châu Âu";
  if (l1 === "mls" || l2 === "mls") return "🇺🇸 MLS (Mỹ)";
  if (l1 === "saudi" || l2 === "saudi") return "🇸🇦 Saudi League";
  if (l1 === "vleague" || l2 === "vleague") return "🇻🇳 V-League";

  return "";
}

export function getSportLabel(
  sport?: "football" | "basketball" | "volleyball" | "tennis" | "badminton" | "f1" | "motorsport" | "boxing" | "esports" | "billiards" | "other",
  rawTournament?: string,
): string {
  if (sport === "basketball") {
    if (rawTournament && !/^(?:bóng rổ|basketball|bong ro)$/i.test(rawTournament.trim())) {
      return rawTournament.startsWith("🏀") ? rawTournament : `🏀 ${rawTournament}`;
    }
    return "🏀 Bóng Rổ Trực Tiếp";
  }
  if (sport === "tennis") {
    if (rawTournament && !/^(?:tennis|quần vợt|quan vot)$/i.test(rawTournament.trim())) {
      const clean = rawTournament.replace(/Quần Vợt/gi, "Tennis");
      return clean.startsWith("🎾") ? clean : `🎾 ${clean}`;
    }
    return "🎾 Tennis Trực Tiếp";
  }
  if (sport === "f1" || sport === "motorsport") {
    if (rawTournament && !/^(?:f1|đua xe|dua xe|motorsport)$/i.test(rawTournament.trim())) {
      return rawTournament.startsWith("🏎") ? rawTournament : `🏎️ ${rawTournament}`;
    }
    return "🏎️ F1 / Đua Xe Trực Tiếp";
  }
  if (sport === "boxing") {
    if (rawTournament && !/^(?:boxing|quyền anh|quyen anh)$/i.test(rawTournament.trim())) {
      return rawTournament.startsWith("🥊") ? rawTournament : `🥊 ${rawTournament}`;
    }
    return "🥊 Quyền Anh Trực Tiếp";
  }
  if (sport === "esports") {
    if (rawTournament && !/^(?:esports|esport)$/i.test(rawTournament.trim())) {
      return rawTournament.startsWith("🎮") ? rawTournament : `🎮 ${rawTournament}`;
    }
    return "🎮 Esports Trực Tiếp";
  }
  if (sport === "billiards") {
    if (rawTournament && !/^(?:billiards|bida|billiard|pool|snooker)$/i.test(rawTournament.trim())) {
      return rawTournament.startsWith("🎱") ? rawTournament : `🎱 ${rawTournament}`;
    }
    return "🎱 Bida / Billiards Trực Tiếp";
  }
  if (sport === "volleyball") {
    if (rawTournament && !/^(?:volleyball|bóng chuyền|bong chuyen)$/i.test(rawTournament.trim())) {
      return rawTournament.startsWith("🏐") ? rawTournament : `🏐 ${rawTournament}`;
    }
    return "🏐 Bóng Chuyền Trực Tiếp";
  }
  if (sport === "badminton") {
    if (rawTournament && !/^(?:badminton|cầu lông|cau long)$/i.test(rawTournament.trim())) {
      return rawTournament.startsWith("🏸") ? rawTournament : `🏸 ${rawTournament}`;
    }
    return "🏸 Cầu Lông Trực Tiếp";
  }
  if (sport === "football") {
    if (rawTournament && rawTournament.trim() && rawTournament !== "⚽ Bóng Đá Trực Tiếp" && rawTournament !== "⚽ Trực Tiếp Thể Thao") {
      return rawTournament;
    }
    return "⚽ Bóng Đá Trực Tiếp";
  }

  // Khi sport là other hoặc chưa xác định: KHÔNG tự đoán là football
  if (rawTournament && rawTournament.trim() && rawTournament !== "⚽ Bóng Đá Trực Tiếp" && rawTournament !== "⚽ Trực Tiếp Thể Thao") {
    return rawTournament;
  }
  return "🏆 Trực Tiếp Thể Thao";
}

// Danh sách các từ khóa giải đấu / sự kiện / thể thao không được coi là tên CLB bóng đá
export const TOURNAMENT_NON_TEAM_KEYWORDS = [
  "asiad", "asian games", "olympic", "sea games", "paragames",
  "world cup", "euro", "copa america", "aff cup", "asian cup", "gold cup", "nations league",
  "v-league", "vleague", "premier league", "ngoai hang anh", "champions league", "cup c1", "cup c2", "cup c3",
  "cup quoc gia", "europa league", "conference league", "la liga", "serie a", "bundesliga", "ligue 1",
  "fa cup", "carabao cup", "copa del rey", "coppa italia", "dfb pokal", "coupe de france",
  "sieu cup", "super cup", "u23 chau a", "u23", "u21", "u20", "u19", "u17", "vleague 1", "vleague 2",
  "hang nhat", "hang nhi", "giao huu", "friendly", "friendlies", "club friendly", "nba", "wnba", "pba", "fiba", "vtv cup"
];

export const BROADCASTER_NON_TEAM_KEYWORDS = [
  "vtv", "htv", "thvl", "sctv", "vtc", "btv", "k+", "kplus", "vov", "antv", "qpvn", "ttxvn",
  "hanoitv", "hanoi tv", "dai ha noi", "truyen hinh ha noi",
  "fpt play", "fpt", "tv360", "xoi lac", "xoilac", "vua san co", "vuasanco", "cola tv", "colatv", "cola",
  "khan dai", "khandaitv", "gio vang", "giovang", "chuoi chien", "chuoichien", "sut bong", "sutbong",
  "pha lang", "phalang", "ga vang", "gavang", "bia om", "biaom", "s8 tv", "s8tv", "s8", "sao ke", "saoke",
  "phao hoa", "phaohoa", "vebo", "thapcam", "tiengruoi", "mitom", "rakhoi", "cakhia", "90phut", "thuckheya",
  "on sports", "on football", "beinsports", "espn", "kenh", "dai", "truyen hinh", "phat thanh"
];

export const GENERIC_SPORT_NON_TEAM_KEYWORDS = [
  "bong da", "football", "soccer", "bong ro", "basketball", "bong chuyen", "volleyball",
  "quan vot", "tennis", "cau long", "badminton", "bong ban", "table tennis", "bida", "billiards",
  "boxing", "mma", "ufc", "dua xe", "f1", "esports", "game", "su kien", "event", "live", "truc tiep",
  "re-live", "full match", "highlight", "ban ket", "chung ket", "tu ket", "vong loai", "playoff", "tieng viet",
  "ngay thi dau", "ngay", "luong", "stream", "session", "matchday", "round", "vong", "bang"
];

export function isValidFootballTeamName(name: string): boolean {
  if (!name) return false;
  const raw = name.trim();
  const norm = normalizeText(raw);
  const compactNorm = norm.replace(/\s+/g, "");

  // ĐTQG hoặc CLB chuẩn trong từ điển canonical luôn là team hợp lệ
  if (
    NATIONAL_TEAM_CANONICAL_MAP[norm] ||
    NATIONAL_TEAM_CANONICAL_MAP[compactNorm] ||
    Boolean(getTeamAsset(raw))
  ) {
    return true;
  }

  if (norm.length < 2) return false;

  // 1. Phải có ít nhất một chữ cái (không chỉ là số hoặc ký hiệu) và không phải từ nối "vs" / "v"
  if (!/[a-z]/.test(norm)) return false;
  if (norm === "vs" || norm === "v" || norm === "x") return false;

  // 2. Kênh truyền hình nhà đài (VTV1-9, HTV1-9, THVL1-4, SCTV, VTC, K+, ON Sports...)
  if (/^(?:vtv|htv|thvl|sctv|vtc|btv|kplus|k\+)\s*\d*/i.test(norm)) return false;
  if (/^k\s+(?:sport|action|cine|life|kids|\d)\b/i.test(norm) || /^k\+/i.test(raw)) return false;
  if (/^(?:htvc|vov|antv|qpvn|ttxvn|hanoitv|hanoi tv|thhn)\b/i.test(norm)) return false;
  if (/^on\s+(?:sports|football|golf|volleyball)\b/i.test(norm)) return false;

  // 3. Sub-channel / Table / Court / Server / Room codes (e.g. A1, A2, Bàn 1, Server 2, Sân 3, Phòng BLV)
  if (/^[a-z]\d{1,2}$/.test(norm)) return false;
  if (/^(?:ban|table|san|court|phong|room|kenh|channel|ch|link|server|sv|stream|cam|feed|track|bang|group|vong|round|tap|phan|tran|match|luong|session|matchday|ngay)\b/i.test(norm)) return false;
  if (/^(?:sv|hd|fhd|4k)\s*\d*$/i.test(norm)) return false;
  if (/^ngay\s*thi\s*dau/i.test(norm)) return false;

  // 4. Commentator string / Room BLV
  if (/\b(?:blv|binh luan vien)\b/i.test(norm)) return false;

  // 5. Broadcaster string (exact or broadcaster prefix)
  for (const b of BROADCASTER_NON_TEAM_KEYWORDS) {
    if (norm === b || norm === `kenh ${b}` || norm === `dai ${b}`) {
      return false;
    }
    if (norm.startsWith(b + " ") || (norm.startsWith(b) && norm.length <= b.length + 3)) {
      return false;
    }
  }

  // 6. Generic sport / event terms (exact match or generic event prefixes)
  for (const g of GENERIC_SPORT_NON_TEAM_KEYWORDS) {
    if (norm === g) {
      return false;
    }
  }
  if (/^(?:truc tiep|re live|highlight|full match|ban ket|chung ket|tu ket|vong loai|ngay thi dau|session)\b/i.test(norm)) {
    return false;
  }

  // 7. Tournament exact match or standalone tournament name (e.g. "ASIAD 2026", "V-League", "World Cup")
  const normWithoutNumbers = norm.replace(/\s*\d+.*$/, "").trim();
  for (const t of TOURNAMENT_NON_TEAM_KEYWORDS) {
    if (norm === t || normWithoutNumbers === t) {
      return false;
    }
  }

  return true;
}

export function isGenericTvChannel(
  rawTitle: string,
  group: string = "",
): boolean {
  const normTitle = normalizeText(rawTitle);
  const normGroup = normalizeText(group);

  // 1. Trận đấu có cặp đấu rõ ràng (vs / v) -> Không phải kênh truyền hình chung
  const hasMatchIndicator =
    /\s+(?:vs|v|\bv\b)\s+/i.test(rawTitle) ||
    /\[(?:vs|v)\]/i.test(rawTitle);

  if (hasMatchIndicator) {
    return false;
  }

  // 2. Kênh phát phòng BLV hoặc bình luận thể thao trực tiếp -> Không phải kênh truyền hình chung
  if (
    /\b(?:blv|binh luan vien)\b/i.test(rawTitle) ||
    /\b(?:blv|binh luan vien)\b/i.test(group) ||
    /\((?:alan|tom|captain|giang a|batman|pocari|nguoi nan|dec|leo|ti|te)\)/i.test(rawTitle)
  ) {
    return false;
  }

  // 3. Tên kênh truyền hình nhà đài quốc gia / truyền hình cáp 24/7
  const isTvStationPattern =
    /^(?:vtv|htv|thvl|sctv|vtc|btv|kplus|k)\s*\d*/i.test(normTitle) ||
    /^(?:htvc|vov|antv|qpvn|ttxvn|hanoitv|hanoi tv|thhn)\b/i.test(normTitle) ||
    /^k\s+(?:sport|action|cine|life|kids|\d)\b/i.test(normTitle) ||
    /^k\+/i.test(rawTitle.trim()) ||
    /^on\s+(?:sports|football|golf|volleyball|plus|cine)\b/i.test(normTitle) ||
    /^(?:hbo|cinemax|axn|discovery|cartoon network|disney|fox|cnn|bbc)\b/i.test(normTitle);

  if (isTvStationPattern) {
    return true;
  }

  // 4. Danh mục / Nhóm kênh truyền hình 24/7
  const isTvGroup =
    /^(?:kenh\s+vtv|kenh\s+htv|kenh\s+sctv|kenh\s+vtvcab|truyen\s+hinh|thiet\s+yeu|tin\s+tuc|phim\s+truyen|giai\s+tri|thieu\s+nhi|ca\s+nhac|dia\s+phuong|quoc\s+te|iptv|24\s*7\s*tv)/i.test(
      normGroup,
    );

  if (isTvGroup) {
    return true;
  }

  // 5. Kênh số / Kênh kỹ thuật đơn lẻ không gắn với sự kiện thể thao (ví dụ "Kênh 1 HD", "Server 2 FHD", "Channel 5")
  if (/^(?:kenh|channel|dai|server|sv|stream|feed|ban|table|san|court)\s*\d+\s*(?:hd|fhd|4k|sd)?$/i.test(normTitle)) {
    return true;
  }

  return false;
}

export function extractSportAndGender(
  rawTitle: string,
  group?: string,
): {
  sport: "football" | "basketball" | "volleyball" | "tennis" | "badminton" | "f1" | "motorsport" | "boxing" | "esports" | "billiards" | "other";
  gender?: "men" | "women";
} {
  const fullText = `${rawTitle || ""} ${group || ""}`;
  const norm = fullText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let sport: "football" | "basketball" | "volleyball" | "tennis" | "badminton" | "f1" | "motorsport" | "boxing" | "esports" | "billiards" | "other" = "other";

  if (
    fullText.includes("🏀") ||
    /(?:^|\s|[([_:\-/])(?:wnba|nba|kbl|cba|vba|pba|basketball|bong ro|fiba|36ers|wildcats|shanghai sharks|seoul knights|goyang sono|rytas vilnius|dai loan|philippines)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "basketball";
  } else if (
    fullText.includes("🏐") ||
    /(?:^|\s|[([_:\-/])(?:volleyball|bong chuyen|vtv cup)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "volleyball";
  } else if (
    fullText.includes("🎾") ||
    fullText.includes("🥎") ||
    /(?:^|\s|[([_:\-/])(?:tennis|quan vot|atp|wta|itf|roland garros|wimbledon|us open|australian open|ostapenko|wang xinyu|joanna garland|preston|talia gibson|morvayova)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "tennis";
  } else if (
    fullText.includes("🏎") ||
    fullText.includes("🏎️") ||
    fullText.includes("🏁") ||
    /(?:^|\s|[([_:\-/])(?:f1|formula 1|formula1|motogp|moto gp|dua xe|nascar|indycar)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "f1";
  } else if (
    fullText.includes("🥊") ||
    /(?:^|\s|[([_:\-/])(?:boxing|quyen anh|ufc|mma|one championship)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "boxing";
  } else if (
    fullText.includes("🎱") ||
    /(?:^|\s|[([_:\-/])(?:billiards|billiard|bida|snooker|pool|jayson shaw|vanboening|vanboning|efren reyes)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "billiards";
  } else if (
    fullText.includes("🎮") ||
    /(?:^|\s|[([_:\-/])(?:esports|esport|lck|lpl|vcs|dota|csgo|cs2|valorant|lien minh|lien quan|pubg)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "esports";
  } else if (
    fullText.includes("🏸") ||
    /(?:^|\s|[([_:\-/])(?:badminton|cau long|bwf)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "badminton";
  } else if (
    fullText.includes("⚽") ||
    /(?:^|\s|[([_:\-/])(?:football|soccer|bong da|vleague|premier league|ngoai hang anh|laliga|serie a|bundesliga|ligue 1|cúp c1|cup c1|cúp c2|cup c2|uecl|cup c3|champions league|europa league)(?:$|\s|[)\]_:\-/])/i.test(norm)
  ) {
    sport = "football";
  } else {
    // Kiểm tra tên các câu lạc bộ bóng đá đã biết
    if (
      matchTeamInList(rawTitle, EPL_TEAMS) ||
      matchTeamInList(rawTitle, LALIGA_TEAMS) ||
      matchTeamInList(rawTitle, SERIE_A_TEAMS) ||
      matchTeamInList(rawTitle, BUNDESLIGA_TEAMS) ||
      matchTeamInList(rawTitle, LIGUE_1_TEAMS) ||
      matchTeamInList(rawTitle, OTHER_EUROPE_TEAMS) ||
      matchTeamInList(rawTitle, MLS_TEAMS) ||
      matchTeamInList(rawTitle, SAUDI_TEAMS) ||
      matchTeamInList(rawTitle, VLEAGUE_TEAMS)
    ) {
      sport = "football";
    } else {
      sport = "other";
    }
  }

  let gender: "men" | "women" | undefined = undefined;
  if (
    /(?:^|\s|[([_])(?:nu|women|woman|female|w)(?:$|\s|[)\]_])/i.test(norm) ||
    /(?:^|\s|[([_])(?:nữ)(?:$|\s|[)\]_])/i.test(fullText)
  ) {
    gender = "women";
  } else if (
    /(?:^|\s|[([_])(?:nam|men|male|m)(?:$|\s|[)\]_])/i.test(norm) ||
    /(?:^|\s|[([_])(?:nam)(?:$|\s|[)\]_])/i.test(fullText)
  ) {
    gender = "men";
  }

  return { sport, gender };
}

export function extractSportAndCategory(
  rawTitle: string,
  group?: string,
): {
  sport: "football" | "basketball" | "volleyball" | "tennis" | "badminton" | "f1" | "motorsport" | "boxing" | "esports" | "billiards" | "other";
  category: MatchCategory;
  gender?: "men" | "women";
} {
  const fullText = `${rawTitle || ""} ${group || ""}`;
  const norm = fullText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const isFutsal = /\b(?:futsal)\b/i.test(norm) || /\b(?:futsal)\b/i.test(fullText);

  let category: MatchCategory = "senior_men";
  if (isFutsal) {
    category = "futsal";
  } else if (/\b(?:u-?19)\b/i.test(norm) || /\bu19\b/i.test(fullText)) {
    category = "u19";
  } else if (/\b(?:u-?20)\b/i.test(norm) || /\bu20\b/i.test(fullText)) {
    category = "u20";
  } else if (/\b(?:u-?21)\b/i.test(norm) || /\bu21\b/i.test(fullText)) {
    category = "u21";
  } else if (/\b(?:u-?23)\b/i.test(norm) || /\bu23\b/i.test(fullText)) {
    category = "u23";
  } else if (
    /(?:^|\s|[([_])(?:nu|women|woman|female)(?:$|\s|[)\]_])/i.test(norm) ||
    /(?:^|\s|[([_])(?:nữ)(?:$|\s|[)\]_])/i.test(fullText)
  ) {
    category = "senior_women";
  } else if (/\b(?:youth|tre|trẻ)\b/i.test(norm)) {
    category = "youth";
  }

  let { sport, gender } = extractSportAndGender(rawTitle, group);
  if (isFutsal) {
    sport = "football";
  }
  if (category === "senior_women") {
    gender = "women";
  } else if (category === "senior_men" && !gender) {
    gender = "men";
  }

  return { sport, category, gender };
}

export function cleanCandidateTeamName(name: string): string {
  if (!name) return "";
  let clean = name.trim();

  // 1. Strip square brackets [flv], [hls], [HD], etc.
  clean = clean.replace(/\[[^\]]*\]/g, " ");

  // 2. Strip trailing commentator / tag in parenthesis (e.g. "(ALAN)", "(TOM)", "(NGƯỜI NẶN)", "(BLV POCARI)")
  clean = clean.replace(/\([^)]+\)\s*$/g, " ");

  // 3. Strip commentator / resolution / tags in parenthesis inside
  clean = clean.replace(/\((?:blv\s+[^)]+|hd\s+[^)]+|fhd|hd|4k|nu|nữ|women|men|nam|w|m|[^)]*tv[^)]*)\)/gi, " ");

  // 3B. Strip unparenthesized trailing BLV / commentator
  clean = clean.replace(/\s+(?:-\s+)?(?:blv|bình luận viên)\s+.*$/i, "").trim();

  // 4. Strip trailing channel suffix (e.g. " - K+ SPORT 1", " - Server 1", " - FHD")
  clean = clean.replace(/\s+-\s+(?:k\+|vtv\d*|htv\d*|sctv\d*|vtc\d*|server\s*\d*|sv\s*\d*|fhd|hd|4k|link\s*\d*|kenh\s*\d*|ch\s*\d*|fpt|tv360).*$/i, "").trim();

  // 5. Strip trailing resolution / quality tags (e.g. "Chelsea FHD", "Arsenal 1080p")
  clean = clean.replace(/\s+(?:fhd|hd|4k|1080p|720p|sd)$/i, "").trim();

  // 6. Strip all sport and status emojis
  clean = clean.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}⚽🏀🎾🏐🏸🏒🥊⚾🎮🎱🏓🏊🚴🏆🏅🏎🏁🔴🟢⚪🟡🟠]/gu, " ");

  // 7. Strip leading/trailing timestamps, dates and time-like prefixes
  // e.g. "00 24/09", "09:00 24/09", "09:00", "09h00", "24/09", "24-09", "00h", "08:30"
  clean = clean
    .replace(/^\s*(?:(?:[012]?\d[:hH]\d{2}|\d{1,2})\s*)?(?:\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)?\s*/, "")
    .replace(/^\s*(?:[012]?\d[:hH]\d{2})\s*/, "")
    .replace(/\s*(?:(?:[012]?\d[:hH]\d{2}|\d{1,2})\s*)?(?:\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)\s*$/, "")
    .trim();

  // 8. Strip leading and trailing gender markers: "Nữ", "Nam", "Women", "Men"
  clean = clean.replace(/^(?:nữ|nu|nam|women|woman|men)\s+/i, "");
  clean = clean.replace(/\s+(?:nữ|nu|nam|women|woman|men|man)$/i, "");
  clean = clean.replace(/\s+[wWsS]$/, "");

  // 8B. Strip team prefix markers: "Đội tuyển quốc gia", "Đội tuyển", "National team", "ĐTQG", "ĐT", "CLB"
  clean = clean.replace(/^(?:đội tuyển quốc gia|doi tuyen quoc gia|đội tuyển|doi tuyen|national team|đtqg|dtqg|đt|dt|clb)\s+/i, "");
  clean = clean.replace(/\s+(?:clb|national team)$/i, "");

  // 9. Strip any remaining surrounding symbols/punctuation
  clean = clean.replace(/^[\s\-_|/:\.,;=~+*#@!?^$()\[\]{}'"]+|[\s\-_|/:\.,;=~+*#@!?^$()\[\]{}'"]+$/g, "").trim();

  // 10. Repeat gender & prefix strip if symbols were removed around it
  clean = clean.replace(/^(?:nữ|nu|nam|women|woman|men)\s+/i, "");
  clean = clean.replace(/\s+(?:nữ|nu|nam|women|woman|men|man)$/i, "");
  clean = clean.replace(/\s+[wWsS]$/, "");
  clean = clean.replace(/^(?:đội tuyển quốc gia|doi tuyen quoc gia|đội tuyển|doi tuyen|national team|đtqg|dtqg|đt|dt|clb)\s+/i, "");
  clean = clean.replace(/\s+(?:clb|national team)$/i, "");

  return clean.replace(/\s+/g, " ").trim();
}

// Danh sách các kênh thể thao phát sóng HLS chính thức 100% hoạt động
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

// Cache kết quả kiểm tra luồng stream (TTL 5 phút cho luồng sống, 60s cho luồng chết)
const urlHealthCache = new Map<string, { isLive: boolean; expireAt: number }>();

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
  timeoutMs: number = 1200,
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
    const isLive = res.ok;
    urlHealthCache.set(key, {
      isLive,
      expireAt: now + (isLive ? 5 * 60 * 1000 : 60 * 1000), // Sống: cache 5 phút, chết: cache 60s
    });
    return isLive;
  } catch {
    urlHealthCache.set(key, { isLive: false, expireAt: now + 60 * 1000 });
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

  // 2. Trận sắp diễn ra trong 60 phút
  const soonMatches = matches.filter(
    (m) =>
      m.timeline === "today" &&
      m.timestamp > now &&
      m.timestamp <= now + 60 * 60 * 1000,
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
      !(m.timestamp > now && m.timestamp <= now + 60 * 60 * 1000),
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
    isEvent: boolean;
    tournament: string;
    normT1: string;
    normT2: string;
  }

  const normalizedList: NormalizedStream[] = [];

  for (const item of rawStreams) {
    const { group, rawTitle, rawLogo, effectiveUrl } = item;
    const upperGroup = group.toUpperCase();
    const upperTitle = rawTitle.toUpperCase();

    const isHls =
      effectiveUrl.includes(".m3u8") ||
      rawTitle.toLowerCase().includes("[hls");
    const isFlv =
      !isHls &&
      (effectiveUrl.includes(".flv") || rawTitle.toLowerCase().includes("[flv"));
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
      cleanGroup = group.replace(/^[🔴🟢🟡⚪🟠\s]+/, "").trim();
    }

    channelsSet.add(cleanGroup);

    const { sport, category, gender } = extractSportAndCategory(rawTitle, group);

    let cleanedTitle = rawTitle.replace(/\[[^\]]*\]/g, " ").trim();
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
        : isLiveMarker
          ? now
          : Number.MAX_SAFE_INTEGER;

    cleanedTitle = cleanedTitle
      .replace(/^[🟢🔴⚪\s]+/, "")
      .replace(/^\s*(?:(?:[012]?\d[:hH]\d{2}|\d{1,2})\s*)?(?:\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)?\s*/, "")
      .replace(/^[⚽🏀🎾🏐🏸🏒🥊🏎🏁🎱🎮\s]+/, "")
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

    if (!blv) {
      if (cleanGroup === "TV360") blv = "TV360";
      else if (cleanGroup === "FPT Play") blv = "FPT Play";
    }

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
    const tournament = getSportLabel(sport, rawDetectedTourn);

    const normT1 = !isEvent && team1 ? normalizeClubKey(team1) : "";
    const normT2 = !isEvent && team2 ? normalizeClubKey(team2) : "";

    normalizedList.push({
      rawTitle,
      displayTitle,
      cleanGroup,
      effectiveUrl,
      rawLogo,
      awayLogo: item.awayLogo,
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
        if (existing.sport && item.sport && existing.sport !== item.sport) continue;
        if (existing.category && item.category && existing.category !== item.category) continue;

        const isMatched = areMatchFixturesMatching(
          {
            team1: item.team1,
            team2: item.team2,
            time: item.time,
            timestamp: item.timestamp,
            isLiveMarker: item.isLiveMarker,
            sport: item.sport,
            category: item.category,
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
      if (!foundMatch.category && item.category) {
        foundMatch.category = item.category;
      }
      if (!foundMatch.gender && item.gender) {
        foundMatch.gender = item.gender;
      }

      // Nâng cấp event thành fixture nếu stream sau có đầy đủ team1 và team2
      if (foundMatch.isEvent && !item.isEvent && item.team1 && item.team2) {
        foundMatch.team1 = item.team1;
        foundMatch.team2 = item.team2;
        foundMatch.isEvent = false;
        foundMatch.title = `${item.team1} vs ${item.team2}`;
      }

      if (item.blv) {
        const existingBlvs = foundMatch.blv
          ? foundMatch.blv.split(",").map((b) => b.trim()).filter(Boolean)
          : [];
        const normalizedItemBlv = item.blv.toLowerCase();
        const alreadyExists = existingBlvs.some(
          (b) => b.toLowerCase() === normalizedItemBlv,
        );
        if (!alreadyExists) {
          existingBlvs.push(item.blv);
          foundMatch.blv = existingBlvs.join(", ");
        }
      }

      if (
        foundMatch.timestamp === Number.MAX_SAFE_INTEGER &&
        item.timestamp !== Number.MAX_SAFE_INTEGER
      ) {
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
      );

      if (!foundMatch.homeLogo && item.rawLogo && !item.rawLogo.includes("tinhlagi.pro/logo.jpg")) {
        foundMatch.homeLogo = item.rawLogo;
      }
      if (!foundMatch.awayLogo && item.awayLogo && !item.awayLogo.includes("tinhlagi.pro/logo.jpg")) {
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
      );

      let effectiveLogo = item.rawLogo;
      if (!effectiveLogo && item.cleanGroup === "FPT Play") {
        effectiveLogo = FPT_EVENT_POSTER;
      }

      const effectiveHomeLogo =
        !item.isEvent && effectiveLogo && !effectiveLogo.includes("tinhlagi.pro/logo.jpg")
          ? effectiveLogo
          : "";

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
        awayLogo: item.awayLogo || "",
        group: item.cleanGroup,
        groups: [item.cleanGroup],
        tournament: item.tournament,
        sport: item.sport,
        category: item.category,
        gender: item.gender,
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

      // QUY TẮC LỌC TRẬN ĐANG ĐÁ / SẮP ĐÁ <= 60 PHÚT
      // 1. Kickoff <= now <= kickoff + 140 phút -> live
      // 2. now < kickoff <= now + 60 phút -> upcoming
      // 3. Kickoff > now + 60 phút hoặc > 140 phút quá khứ -> finished (loại bỏ)
      const timeline = getMatchTimeline(timestamp, sourceStatus, "unknown", now);
      if (timeline === "finished") {
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

export const liveFootballService = {
  getFootballMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    if (memoryCache) {
      if (memoryCache.expireAt > now) {
        return memoryCache.data;
      }
      if (memoryCache.staleUntil > now) {
        liveFootballService.revalidateFootballMatches().catch(() => {});
        return memoryCache.data;
      }
    }

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

      // 1. LẤY TOÀN BỘ NGUỒN PHÁT TỪ TẤT CẢ DANH SÁCH PLAYLIST M3U VÀ LIVE SPORTS (HAILAB) ĐỒNG THỜI
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

      const [m3uSettled, hailabSettled] = await Promise.allSettled([
        Promise.allSettled(m3uFetchPromises),
        fetchHailabStreams(now),
      ]);

      const rawStreams: RawStreamItem[] = [];

      // 2A. PARSE TỪNG DÒNG STREAM TỪ CÁC NGUỒN PLAYLIST M3U
      const m3uTexts = m3uSettled.status === "fulfilled" ? m3uSettled.value : [];
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

      // 2B. GỘP CÁC STREAM TỪ NGUỒN HAILAB ĐÃ QUA LỌC CANDIDATE
      if (hailabSettled.status === "fulfilled" && Array.isArray(hailabSettled.value)) {
        for (const st of hailabSettled.value) {
          rawStreams.push(st);
        }
      }

      // 3. NORMALIZE VÀ GỘP CÁC STREAM TRÙNG TRẬN (DEDUP CHÍNH XÁC THEO IDENTITY)
      const { channels, matches: mergedMatches } = normalizeAndMergeStreams(rawStreams, now);
      for (const ch of channels) {
        channelsSet.add(ch);
      }

      // 5. LỌC VÀ SẮP XẾP CÁC MÁY CHỦ THEO HEALTH CACHE (0ms, KHÔNG BLOCK CRITICAL PATH)
      const availableMatches: FootballMatch[] = [];

      for (const m of mergedMatches) {
        // Lọc bỏ các server đã xác nhận DEAD (chỉ loại bỏ khi cache dead còn hiệu lực hoặc URL bị blacklist)
        // Giữ lại server ALIVE và UNKNOWN (để match vẫn hiển thị khi cold-start)
        const workingServers = m.servers.filter((s) => {
          const status = getStreamHealthStatus(s.url);
          return status !== "dead";
        });

        if (workingServers.length === 0) {
          // Toàn bộ stream của trận đều đã xác nhận DEAD -> ẩn trận khỏi giao diện
          continue;
        }

        const hasAlive = workingServers.some(
          (s) => getStreamHealthStatus(s.url) === "alive",
        );
        const streamHealth: StreamHealthStatus = hasAlive ? "alive" : "unknown";
        m.timeline = getMatchTimeline(
          m.timestamp,
          m.sourceStatus,
          streamHealth,
          now,
        );

        if (m.timeline === "finished") {
          // Ẩn trận đã kết thúc
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

      // Tự động bổ sung Logo HD cho Đội Nhà & Đội Khách
      await enrichMatchLogos(
        sortedMatches.filter(
          (match) =>
            !match.isEvent && Boolean(match.team1) && Boolean(match.team2),
        ),
      );

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
};



