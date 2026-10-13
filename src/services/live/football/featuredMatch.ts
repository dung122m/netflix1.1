import { LiveMatchScore } from "../football-score/types";
import { normalizeTeamKey } from "../football-logo/service";
import { normalizeClubKey } from "./service";

export interface FeaturedMatchResult {
  isFeatured: boolean;
  badgeLabel?: string;
  reason?:
    | "final"
    | "semi_final"
    | "quarter_final"
    | "round_of_16"
    | "super_cup"
    | "marquee_derby"
    | "prominent_team"
    | "high_demand_sources"
    | "tournament_stage";
}

/**
 * Danh sách các cặp đấu đại chiến (Marquee Rivalries & Historic Derbies) được xác minh và cấu hình tập trung.
 * Sử dụng cặp normalized team key đã được sắp xếp để tra cứu O(1).
 */
const MARQUEE_RIVALRY_PAIRS: Array<{
  teams: [string, string];
  label: string;
}> = [
  // Tây Ban Nha (El Clásico & Madrid Derby)
  { teams: ["barcelona", "realmadrid"], label: "EL CLÁSICO" },
  { teams: ["atleticomadrid", "realmadrid"], label: "MADRID DERBY" },

  // Anh (North West, Manchester Derby, North London Derby, Merseyside Derby, London Derby, Top Battles)
  { teams: ["liverpool", "manchesterunited"], label: "TÂM ĐIỂM" },
  { teams: ["manchestercity", "manchesterunited"], label: "MANCHESTER DERBY" },
  { teams: ["liverpool", "manchestercity"], label: "TÂM ĐIỂM" },
  { teams: ["arsenal", "tottenhamhotspur"], label: "NORTH LONDON DERBY" },
  { teams: ["arsenal", "tottenham"], label: "NORTH LONDON DERBY" },
  { teams: ["arsenal", "manchestercity"], label: "TÂM ĐIỂM" },
  { teams: ["arsenal", "chelsea"], label: "LONDON DERBY" },
  { teams: ["chelsea", "tottenhamhotspur"], label: "LONDON DERBY" },
  { teams: ["chelsea", "tottenham"], label: "LONDON DERBY" },
  { teams: ["everton", "liverpool"], label: "MERSEYSIDE DERBY" },

  // Ý (Derby della Madonnina, Derby d'Italia, Derby della Capitale)
  { teams: ["acmilan", "intermilan"], label: "DERBY MILANO" },
  { teams: ["intermilan", "juventus"], label: "DERBY D'ITALIA" },
  { teams: ["acmilan", "juventus"], label: "TÂM ĐIỂM" },
  { teams: ["asroma", "lazio"], label: "DERBY DELLA CAPITALE" },

  // Đức (Der Klassiker)
  { teams: ["bayernmunich", "borussiadortmund"], label: "DER KLASSIKER" },

  // Pháp (Le Classique)
  { teams: ["marseille", "parissaintgermain"], label: "LE CLASSIQUE" },

  // Bồ Đào Nha (O Clássico)
  { teams: ["benfica", "porto"], label: "O CLÁSSICO" },

  // Saudi Arabia (Riyadh Derby)
  { teams: ["alhilal", "alnassr"], label: "RIYADH DERBY" },

  // Việt Nam (Derby Thủ Đô)
  { teams: ["conganhanoi", "hanoi"], label: "DERBY HÀ NỘI" },
  { teams: ["cahn", "hanoifc"], label: "DERBY HÀ NỘI" },

  // Đội tuyển quốc gia (Đông Nam Á & Siêu kinh điển thế giới)
  { teams: ["thailand", "vietnam"], label: "TÂM ĐIỂM ĐNA" },
  { teams: ["indonesia", "vietnam"], label: "TÂM ĐIỂM ĐNA" },
  { teams: ["argentina", "brazil"], label: "SUPERCLÁSICO" },
  { teams: ["england", "germany"], label: "TÂM ĐIỂM" },
  { teams: ["france", "germany"], label: "TÂM ĐIỂM" },
  { teams: ["france", "spain"], label: "TÂM ĐIỂM" },
  { teams: ["italy", "spain"], label: "TÂM ĐIỂM" },
];

/**
 * Danh sách chuẩn hóa các CLB và Đội tuyển Quốc gia nổi bật, được quan tâm rộng rãi.
 * Cấu hình tập trung, tra cứu O(1) qua normalized keys.
 * Không chứa các alias ngắn/từ chung gây va chạm nhận diện (như 'real', 'inter', 'paris', 'sporting', 'newcastle').
 */
export const PROMINENT_FOOTBALL_TEAMS = new Set<string>([
  // Tây Ban Nha (La Liga)
  "realmadrid", "rmcf",
  "barcelona", "barca", "fcbarcelona",
  "atleticomadrid", "atletico", "atm",

  // Anh (Premier League - Big 6 & nổi bật)
  "manchestercity", "mancity", "mcfc",
  "manchesterunited", "manutd", "mu", "mufc",
  "liverpool", "lfc",
  "arsenal", "afc",
  "chelsea", "cfc",
  "tottenham", "tottenhamhotspur", "spurs",
  "newcastleunited", "nufc",
  "astonvilla", "villa", "avfc",

  // Ý (Serie A)
  "intermilan", "internazionale",
  "acmilan", "milan",
  "juventus", "juve",
  "asroma", "roma",
  "napoli", "sscnapoli",

  // Đức (Bundesliga)
  "bayernmunich", "bayernmunchen", "bayern",
  "borussiadortmund", "dortmund", "bvb",
  "bayerleverkusen", "leverkusen",
  "rbleipzig", "leipzig",

  // Pháp (Ligue 1)
  "parissaintgermain", "psg",
  "marseille", "om", "olympymarseille",
  "asmonaco", "monaco",
  "lyon", "ol", "olympquelyonnais",

  // Bồ Đào Nha & Hà Lan
  "sportingcp",
  "benfica", "slbenfica",
  "porto", "fcporto",
  "ajax", "afcajax",

  // CLB ngôi sao nổi bật (Saudi Pro League, MLS)
  "alnassr",
  "alhilal",
  "alittihad",
  "intermiami",

  // V-League (Việt Nam - Các CLB tiêu biểu đã xác minh)
  "hanoi", "hanoifc",
  "conganhanoi", "cahn",
  "thepxanhnamdinh", "namdinh",
  "thecongviettel", "viettel", "thecong",
  "hoanganhgialai", "hagl",
  "songlamnghean", "slna",
  "haiphong", "haiphongfc",

  // Đội tuyển Quốc gia được quan tâm đặc biệt (Đông Nam Á & Top Thế giới)
  "vietnam", "vn",
  "thailand", "thailan",
  "indonesia",
  "malaysia",
  "argentina",
  "brazil", "brasil",
  "england", "anh",
  "france", "phap",
  "germany", "duc",
  "spain", "taybannha", "espana",
  "portugal", "bodaonha",
  "italy", "italia", "y",
  "netherlands", "halan", "holland",
  "belgium", "bi",
  "croatia",
  "uruguay",
  "japan", "nhatban",
  "southkorea", "hanquoc", "korea",
  "usa", "unitedstates", "hoaky", "my"
]);

/**
 * Các CLB có chứa từ tố dễ nhầm lẫn nhưng KHÔNG phải CLB lớn tương ứng
 */
const NON_PROMINENT_NAME_REGEX =
  /\b(?:newcastle\s*jets|real\s*salt\s*lake|real\s*potosi|inter\s*turku|inter\s*leipzig|inter\s*de\s*escaldes|paris\s*fc|barcelona\s*sc|barcelona\s*sporting\s*club|sporting\s*kansas\s*city|sporting\s*gijon)\b/i;

const NON_PROMINENT_COLLISION_KEYS = new Set<string>([
  "newcastlejets",
  "realsaltlake",
  "realpotosi",
  "interturku",
  "interleipzig",
  "interdeescaldes",
  "parisfc",
  "barcelonasc",
  "barcelonasportingclub",
  "sportingkansascity",
  "sportinggijon",
]);

/**
 * Kiểm tra xem một đội bóng có thuộc danh sách CLB / ĐTQG nổi bật được quan tâm rộng rãi hay không.
 * Bảo vệ nghiêm ngặt chống nhận diện nhầm CLB thông qua tiền tố/hậu tố chung.
 */
export function isProminentTeam(name?: string): boolean {
  if (!name || typeof name !== "string") return false;

  // 1. Tuyệt đối loại trừ các CLB bị trùng tiền tố/hậu tố chung với CLB lớn
  if (NON_PROMINENT_NAME_REGEX.test(name)) {
    return false;
  }

  const logoKey = normalizeTeamKey(name);
  if (NON_PROMINENT_COLLISION_KEYS.has(logoKey)) {
    return false;
  }

  const clubKey = normalizeClubKey(name);
  if (NON_PROMINENT_COLLISION_KEYS.has(clubKey)) {
    return false;
  }

  if (clubKey && PROMINENT_FOOTBALL_TEAMS.has(clubKey)) {
    return true;
  }

  if (logoKey && PROMINENT_FOOTBALL_TEAMS.has(logoKey)) {
    return true;
  }

  return false;
}

/**
 * Regex phát hiện vòng đấu cúp / knock-out quan trọng từ tiêu đề hoặc metadata
 */
const FINAL_STAGE_REGEX = /\b(?:chung\s*kết|trận\s*chung\s*kết|\bfinal\b|\bgrand\s*final\b)\b/i;
const SUPER_CUP_REGEX = /\b(?:siêu\s*cúp|\bsuper\s*cup\b|\bsupercup\b)\b/i;
const SEMI_FINAL_STAGE_REGEX = /\b(?:bán\s*kết|trận\s*bán\s*kết|\bsemi[- ]?final\b)\b/i;
const QUARTER_FINAL_STAGE_REGEX = /\b(?:tứ\s*kết|trận\s*tứ\s*kết|\bquarter[- ]?final\b)\b/i;
const ROUND_OF_16_STAGE_REGEX =
  /\b(?:vòng\s*(?:1\/8|16\s*đội|16)|\bround\s*of\s*16\b|\br16\b|\blast\s*16\b|\bround_of_16\b|\beighth[- ]?finals?\b)\b/i;

function normalizeRivalryKey(t1: string, t2: string): string {
  const k1 = normalizeTeamKey(t1);
  const k2 = normalizeTeamKey(t2);
  return [k1, k2].sort().join("::");
}

const RIVALRY_LOOKUP_MAP = new Map<string, string>();

for (const item of MARQUEE_RIVALRY_PAIRS) {
  const [t1, t2] = item.teams;
  const k1 = normalizeTeamKey(t1);
  const k2 = normalizeTeamKey(t2);
  if (k1 && k2) {
    RIVALRY_LOOKUP_MAP.set([k1, k2].sort().join("::"), item.label);
  }

  const c1 = normalizeClubKey(t1);
  const c2 = normalizeClubKey(t2);
  if (c1 && c2) {
    RIVALRY_LOOKUP_MAP.set([c1, c2].sort().join("::"), item.label);
  }
}

/**
 * Chuẩn hóa URL nguồn phát và đếm số lượng URL duy nhất hợp lệ (loại bỏ proxy unwrap và query params trùng)
 */
export function countUniqueServers(
  servers?: Array<{ url?: string; [key: string]: any } | string | null | undefined> | null
): number {
  if (!servers || !Array.isArray(servers) || servers.length === 0) return 0;
  const uniqueUrls = new Set<string>();
  for (const item of servers) {
    const rawUrl = typeof item === "string" ? item : item?.url;
    if (!rawUrl || typeof rawUrl !== "string") continue;
    let clean = rawUrl.trim();
    if (clean.includes("/api/live-football/proxy?url=")) {
      try {
        const match = clean.match(/url=([^&]+)/);
        if (match) {
          clean = decodeURIComponent(match[1]).trim();
        }
      } catch {}
    }
    const canonical = clean.split("?")[0].trim();
    if (canonical && (canonical.startsWith("http://") || canonical.startsWith("https://") || canonical.startsWith("//"))) {
      uniqueUrls.add(canonical);
    }
  }
  return uniqueUrls.size;
}

/**
 * Hàm phân loại Trận Cầu Tâm Điểm (Featured Match) tập trung, nhiều tiêu chí và có thứ tự ưu tiên chặt chẽ:
 *
 * Thứ tự ưu tiên:
 * 0. Guard môn thể thao: Nếu sport xác định không phải bóng đá -> không áp dụng.
 * 1. Nhóm A - Vòng đấu đặc biệt: Chung kết, Siêu cúp, Bán kết, Tứ kết, Vòng 1/8.
 * 2. Nhóm B - Marquee Rivalries / Derbies: El Clásico, Derby Milano, Manchester Derby, Merseyside Derby...
 * 3. Nhóm C - Có ít nhất một đội nổi bật (Marquee Club / ĐTQG được quan tâm) -> Gắn nhãn "TÂM ĐIỂM".
 * 4. Nhóm D - Ngưỡng 20 nguồn phát độc lập hợp lệ (High Demand) -> Gắn nhãn chung "TÂM ĐIỂM".
 * 5. Nhóm E - Trận thông thường: isFeatured = false.
 */
export function isFeaturedMatch(params: {
  title: string;
  tournament?: string;
  team1?: string;
  team2?: string;
  sport?: string;
  stage?: string;
  round?: string;
  score?: LiveMatchScore | null;
  validServersCount?: number;
  servers?: Array<{ url?: string; [key: string]: any }>;
}): FeaturedMatchResult {
  const { title, tournament = "", team1 = "", team2 = "", sport, stage = "", round = "" } = params;

  // 0. Sport Guard: Nếu môn thể thao không phải bóng đá (như basketball, volleyball, tennis, esports...)
  if (sport && sport !== "football" && sport !== "soccer") {
    return {
      isFeatured: false,
    };
  }

  // 1. Nhóm A: Vòng đấu cúp / knockout giai đoạn cuối (Chung kết, Siêu cúp, Bán kết, Tứ kết, Vòng 1/8)
  const structuredStage = `${stage} ${round} ${params.score?.statusDetail || ""}`.toLowerCase();
  const titleCorpus = `${title} ${tournament}`.toLowerCase();
  const corpus = `${titleCorpus} ${structuredStage}`.trim();

  if (FINAL_STAGE_REGEX.test(corpus) && !/quarter|semi|eighth|round_of_16|1\/8/i.test(corpus)) {
    return {
      isFeatured: true,
      badgeLabel: "CHUNG KẾT",
      reason: "final",
    };
  }

  if (SUPER_CUP_REGEX.test(corpus)) {
    return {
      isFeatured: true,
      badgeLabel: "SIÊU CÚP",
      reason: "super_cup",
    };
  }

  if (SEMI_FINAL_STAGE_REGEX.test(corpus)) {
    return {
      isFeatured: true,
      badgeLabel: "BÁN KẾT",
      reason: "semi_final",
    };
  }

  if (QUARTER_FINAL_STAGE_REGEX.test(corpus)) {
    return {
      isFeatured: true,
      badgeLabel: "TỨ KẾT",
      reason: "quarter_final",
    };
  }

  // Nhận diện Vòng 1/8 cúp (Round of 16 / R16 / Vòng 1/8), tuyệt đối không nhận nhầm vòng play-off
  const isPlayOff = /\bplay[- ]?offs?\b/i.test(corpus);
  if (!isPlayOff && (ROUND_OF_16_STAGE_REGEX.test(structuredStage) || ROUND_OF_16_STAGE_REGEX.test(titleCorpus))) {
    return {
      isFeatured: true,
      badgeLabel: "VÒNG 1/8",
      reason: "round_of_16",
    };
  }

  // 2. Nhóm B: Marquee Rivalries & Historic Derbies đã được xác minh danh tính 2 đội
  if (team1 && team2) {
    const key = normalizeRivalryKey(team1, team2);
    let label = RIVALRY_LOOKUP_MAP.get(key);
    if (!label) {
      const c1 = normalizeClubKey(team1);
      const c2 = normalizeClubKey(team2);
      if (c1 && c2) {
        label = RIVALRY_LOOKUP_MAP.get([c1, c2].sort().join("::"));
      }
    }
    if (label) {
      return {
        isFeatured: true,
        badgeLabel: label,
        reason: "marquee_derby",
      };
    }
  }

  // 3. Nhóm C: Có ít nhất một đội nổi bật (CLB hoặc ĐTQG thuộc danh sách được quan tâm rộng rãi)
  if (isProminentTeam(team1) || isProminentTeam(team2)) {
    return {
      isFeatured: true,
      badgeLabel: "TÂM ĐIỂM",
      reason: "prominent_team",
    };
  }

  // 4. Nhóm D: Tích hợp ngưỡng 20 nguồn phát độc lập hợp lệ (High Demand)
  const uniqueServersCount =
    typeof params.validServersCount === "number" && !isNaN(params.validServersCount)
      ? Math.max(0, params.validServersCount)
      : countUniqueServers(params.servers);

  if (uniqueServersCount >= 20) {
    return {
      isFeatured: true,
      badgeLabel: "TÂM ĐIỂM",
      reason: "high_demand_sources",
    };
  }

  // 5. Nhóm E: Trận đấu thông thường
  return {
    isFeatured: false,
  };
}
