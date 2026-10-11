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
    | "super_cup"
    | "marquee_derby"
    | "prominent_team"
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

  // Anh (North West, Manchester Derby, North London Derby, Top Battles)
  { teams: ["liverpool", "manchesterunited"], label: "TÂM ĐIỂM" },
  { teams: ["manchestercity", "manchesterunited"], label: "MANCHESTER DERBY" },
  { teams: ["liverpool", "manchestercity"], label: "TÂM ĐIỂM" },
  { teams: ["arsenal", "tottenhamhotspur"], label: "NORTH LONDON DERBY" },
  { teams: ["arsenal", "tottenham"], label: "NORTH LONDON DERBY" },
  { teams: ["arsenal", "manchestercity"], label: "TÂM ĐIỂM" },
  { teams: ["arsenal", "chelsea"], label: "LONDON DERBY" },
  { teams: ["chelsea", "tottenhamhotspur"], label: "LONDON DERBY" },
  { teams: ["chelsea", "tottenham"], label: "LONDON DERBY" },

  // Ý (Derby della Madonnina & Derby d'Italia)
  { teams: ["acmilan", "intermilan"], label: "DERBY MILANO" },
  { teams: ["inter", "milan"], label: "DERBY MILANO" },
  { teams: ["intermilan", "juventus"], label: "DERBY D'ITALIA" },
  { teams: ["juventus", "milan"], label: "TÂM ĐIỂM" },
  { teams: ["acmilan", "juventus"], label: "TÂM ĐIỂM" },
  { teams: ["asroma", "lazio"], label: "DERBY DELLA CAPITALE" },

  // Đức (Der Klassiker)
  { teams: ["bayernmunchen", "borussiadortmund"], label: "DER KLASSIKER" },
  { teams: ["bayernmunich", "borussiadortmund"], label: "DER KLASSIKER" },

  // Pháp (Le Classique)
  { teams: ["marseille", "parissaintgermain"], label: "LE CLASSIQUE" },
  { teams: ["marseille", "psg"], label: "LE CLASSIQUE" },

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
 */
export const PROMINENT_FOOTBALL_TEAMS = new Set<string>([
  // Tây Ban Nha (La Liga)
  "realmadrid", "real", "rmcf",
  "barcelona", "barca", "fcbarcelona",
  "atleticomadrid", "atletico", "atm",

  // Anh (Premier League - Big 6 & nổi bật)
  "manchestercity", "mancity", "mcfc",
  "manchesterunited", "manutd", "mu", "mufc",
  "liverpool", "lfc",
  "arsenal", "afc",
  "chelsea", "cfc",
  "tottenham", "tottenhamhotspur", "spurs",
  "newcastle", "newcastleunited", "nufc",
  "astonvilla", "villa", "avfc",

  // Ý (Serie A)
  "intermilan", "inter", "internazionale",
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
  "parissaintgermain", "psg", "paris",
  "marseille", "om", "olympymarseille",
  "asmonaco", "monaco",
  "lyon", "ol", "olympquelyonnais",

  // Bồ Đào Nha & Hà Lan
  "sportingcp", "sporting",
  "benfica", "slbenfica",
  "porto", "fcporto",
  "ajax", "afcajax",

  // CLB ngôi sao nổi bật (Saudi Pro League, MLS)
  "alnassr",
  "alhilal",
  "alittihad",
  "intermiami",

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
 * Kiểm tra xem một đội bóng có thuộc danh sách CLB / ĐTQG nổi bật được quan tâm rộng rãi hay không.
 */
export function isProminentTeam(name?: string): boolean {
  if (!name || typeof name !== "string") return false;

  const clubKey = normalizeClubKey(name);
  if (clubKey && PROMINENT_FOOTBALL_TEAMS.has(clubKey)) {
    return true;
  }

  const logoKey = normalizeTeamKey(name);
  if (logoKey && PROMINENT_FOOTBALL_TEAMS.has(logoKey)) {
    return true;
  }

  return false;
}

/**
 * Regex phát hiện vòng đấu cúp / knock-out quan trọng từ tiêu đề hoặc metadata
 */
const FINAL_STAGE_REGEX = /\b(?:chung\s*kết|trận\s*chung\s*kết|\bfinal\b|\bgrand\s*final\b)\b/i;
const SEMI_FINAL_STAGE_REGEX = /\b(?:bán\s*kết|trận\s*bán\s*kết|\bsemi[- ]?final\b)\b/i;
const QUARTER_FINAL_STAGE_REGEX = /\b(?:tứ\s*kết|trận\s*tứ\s*kết|\bquarter[- ]?final\b)\b/i;
const SUPER_CUP_REGEX = /\b(?:siêu\s*cúp|\bsuper\s*cup\b|\bsupercup\b)\b/i;

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
 * Hàm phân loại Trận Cầu Tâm Điểm (Featured Match) tập trung, nhiều tiêu chí và có thứ tự ưu tiên chặt chẽ:
 *
 * Thứ tự ưu tiên:
 * 0. Guard môn thể thao: Nếu sport xác định không phải bóng đá -> không áp dụng.
 * 1. Nhóm A - Vòng đấu đặc biệt: Chung kết, Siêu cúp, Bán kết, Tứ kết.
 * 2. Nhóm B - Marquee Rivalries / Derbies: El Clásico, Derby Milano, Manchester Derby...
 * 3. Nhóm C - Có ít nhất một đội nổi bật (Marquee Club / ĐTQG được quan tâm) -> Gắn nhãn "TÂM ĐIỂM".
 * 4. Nhóm D - Trận thông thường: isFeatured = false.
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
}): FeaturedMatchResult {
  const { title, tournament = "", team1 = "", team2 = "", sport, stage = "", round = "" } = params;

  // 0. Sport Guard: Nếu môn thể thao không phải bóng đá (như basketball, volleyball, tv...)
  if (sport && sport !== "football" && sport !== "soccer") {
    return {
      isFeatured: false,
    };
  }

  // 1. Nhóm A: Vòng đấu cúp / knockout giai đoạn cuối (Chung kết, Siêu cúp, Bán kết, Tứ kết)
  const corpus = `${title} ${tournament} ${stage} ${round}`.toLowerCase();

  if (FINAL_STAGE_REGEX.test(corpus) && !/quarter|semi/i.test(corpus)) {
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

  // 4. Nhóm D: Trận đấu thông thường
  return {
    isFeatured: false,
  };
}
