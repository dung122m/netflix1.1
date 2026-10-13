import { LiveMatchScore } from "./types";

/**
 * Bảng ánh xạ chính thức từ leagueSlug (ESPN / Livescore) sang Tên giải đấu chuẩn hóa (Tiếng Việt/Quốc Tế)
 * Tuyệt đối không gắn emoji cờ quốc gia để tránh lỗi Unicode font trên Windows (es, it...)
 */
export const LEAGUE_CANONICAL_MAP: Record<string, string> = {
  "eng.1": "Ngoại Hạng Anh",
  "esp.1": "La Liga",
  "ita.1": "Serie A",
  "ger.1": "Bundesliga",
  "fra.1": "Ligue 1",
  "uefa.champions": "UEFA Champions League",
  "uefa.europa": "UEFA Europa League",
  "uefa.europa.conf": "UEFA Conference League",
  "ksa.1": "Saudi Pro League",
  "usa.1": "Major League Soccer",
  "ned.1": "Eredivisie",
  "por.1": "Liga Portugal",
  "tur.1": "Super Lig",
  "eng.fa": "FA Cup",
  "eng.league_cup": "Carabao Cup",
  "esp.copa_del_rey": "Copa del Rey",
};

/**
 * Danh sách các pattern từ khóa giải đấu trong tiêu đề trận đấu hoặc tên giải thô
 */
const TITLE_TOURNAMENT_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  { regex: /\b(?:uefa\s*youth\s*league|youth\s*league|c1\s*u\s*19|ucl\s*u\s*19)\b/i, name: "UEFA Youth League" },
  { regex: /\b(?:champions\s*league|cúp\s*c1|cup\s*c1|\bucl\b)\b/i, name: "UEFA Champions League" },
  { regex: /\b(?:europa\s*league|cúp\s*c2|cup\s*c2|\buel\b)\b/i, name: "UEFA Europa League" },
  { regex: /\b(?:conference\s*league|cúp\s*c3|cup\s*c3|\buecl\b)\b/i, name: "UEFA Conference League" },
  { regex: /\b(?:premier\s*league|ngoại\s*hạng\s*anh|\bepl\b)\b/i, name: "Ngoại Hạng Anh" },
  { regex: /\b(?:la\s*liga|laliga)\b/i, name: "La Liga" },
  { regex: /\b(?:serie\s*a|seriea)\b/i, name: "Serie A" },
  { regex: /\b(?:bundesliga)\b/i, name: "Bundesliga" },
  { regex: /\b(?:ligue\s*1|ligue1)\b/i, name: "Ligue 1" },
  { regex: /\b(?:v[-_ ]?league|vleague)\b/i, name: "V-League" },
  { regex: /\b(?:saudi\s*(?:pro\s*)?league|spl)\b/i, name: "Saudi Pro League" },
  { regex: /\b(?:major\s*league\s*soccer|\bmls\b)\b/i, name: "Major League Soccer" },
  { regex: /\b(?:world\s*cup)\b/i, name: "World Cup" },
  { regex: /\b(?:euro\s*\d{4}|euro)\b/i, name: "Euro" },
  { regex: /\b(?:copa\s*america)\b/i, name: "Copa America" },
  { regex: /\b(?:asian\s*cup|aff\s*(?:cup|mitsubishi))\b/i, name: "Asian Cup / AFF" },
  { regex: /\b(?:asian\s*games|asiad)\b/i, name: "Asian Games / ASIAD" },
  { regex: /\b(?:fa\s*cup)\b/i, name: "FA Cup" },
  { regex: /\b(?:carabao\s*cup)\b/i, name: "Carabao Cup" },
  { regex: /\b(?:copa\s*del\s*rey)\b/i, name: "Copa del Rey" },
  { regex: /\b(?:nba)\b/i, name: "Giải Bóng Rổ NBA" },
  { regex: /\b(?:vba)\b/i, name: "Giải Bóng Rổ VBA" },
  { regex: /\b(?:easl|east\s*asia\s*super\s*league)\b/i, name: "Giải Bóng Rổ EASL" },
  { regex: /\b(?:pba|philippine\s*basketball)\b/i, name: "Giải Bóng Rổ PBA" },
  { regex: /\b(?:kbl|korean\s*basketball)\b/i, name: "Giải Bóng Rổ KBL" },
  { regex: /\b(?:mpbl)\b/i, name: "Giải Bóng Rổ MPBL" },
  { regex: /\b(?:euroleague|euro\s*league)\b/i, name: "Giải Bóng Rổ EuroLeague" },
  { regex: /\b(?:cba|chinese\s*basketball)\b/i, name: "Giải Bóng Rổ CBA" },
];

/**
 * Tập hợp các nhãn playlist chung hoặc nhà đài lậu TUYỆT ĐỐI không được xem là giải đấu
 */
export const GENERIC_PLAYLIST_NAMES = new Set([
  "bóng đá trực tiếp",
  "bong da truc tiep",
  "trực tiếp thể thao",
  "truc tiep the thao",
  "live sports",
  "thể thao trực tiếp",
  "the thao truc tiep",
  "kênh thể thao 24/7",
  "kenh the thao 24/7",
  "kênh thể thao",
  "kenh the thao",
  "fpt play",
  "tv360",
  "xôi lạc tv",
  "xoilac",
  "cola tv",
  "vua sân cỏ tv",
  "khán đài tv",
  "giờ vàng tv",
  "chuối chiên tv",
  "sút bóng tv",
  "phá làng tv",
  "gà vàng tv",
  "bia ôm tv",
  "s8 tv",
  "sao kê tv",
  "phao hoa tv",
  "pháo hoa tv",
  "tennis trực tiếp",
  "tennis truc tiep",
  "quần vợt trực tiếp",
  "quan vot truc tiep",
  "tennis",
  "quần vợt",
  "quan vot",
  "live tennis",
  "bóng rổ trực tiếp",
  "bong ro truc tiep",
  "bóng chuyền trực tiếp",
  "bong chuyen truc tiep",
  "cầu lông trực tiếp",
  "cau long truc tiep",
  "esports trực tiếp",
  "esport truc tiep",
]);

/**
 * Danh sách tên môn thể thao chung (fallback tầng 4) KHÔNG được coi là giải đấu độc lập trong bộ lọc giải đấu.
 */
export const GENERIC_SPORT_NAMES = new Set([
  "bóng đá",
  "bong da",
  "bóng rổ",
  "bong ro",
  "quần vợt",
  "quan vot",
  "tennis",
  "bóng chuyền",
  "bong chuyen",
  "cầu lông",
  "cau long",
  "đua xe f1",
  "đua xe",
  "f1",
  "võ thuật / quyền anh",
  "võ thuật",
  "quyền anh",
  "boxing",
  "bida / billiards",
  "bida",
  "billiards",
  "thể thao điện tử",
  "esports",
  "esport",
  "e-sports",
  "thể thao khác",
  "khác",
  "giải đấu khác",
  "môn khác",
]);

/**
 * Kiểm tra xem tên giải đấu có phải là tên bộ môn thể thao chung hay không.
 * Các giải đấu thực sự (như "Giải Bóng Rổ NBA", "VBA", "Ngoại Hạng Anh", "La Liga"...) sẽ trả về false.
 */
export function isGenericSportTournament(tournamentName: string): boolean {
  if (!tournamentName) return true;
  const lower = tournamentName.trim().toLowerCase();
  return GENERIC_SPORT_NAMES.has(lower) || GENERIC_PLAYLIST_NAMES.has(lower);
}

/**
 * Hàm chuẩn hóa tên giải đấu trung tâm duy nhất cho toàn bộ hệ thống Nanaflix (thẻ trận, danh sách, bộ lọc)
 * Tuân thủ mô hình 4 tầng xác định:
 * Tầng 1: Metadata Ground Truth từ Livescore Event (leagueSlug) khi đã match thành công
 * Tầng 2: Từ khóa giải đấu rõ ràng trong Tiêu đề hoặc Tournament string
 * Tầng 3: Tên giải M3U hợp lệ (không phải playlist chung)
 * Tầng 4: Fallback có kiểm soát: "Giải Đấu Khác" hoặc tên bộ môn thể thao
 */
export function resolveCanonicalTournament(params: {
  tournament?: string;
  title?: string;
  sport?: string;
  team1?: string;
  team2?: string;
  score?: LiveMatchScore | null;
}): string {
  const { tournament, title, sport, score } = params;
  const searchCorpus = `${title || ""} ${tournament || ""}`;
  const teamsCorpus = `${params.team1 || ""} ${params.team2 || ""}`;
  const fullCorpus = `${searchCorpus} ${teamsCorpus}`.trim();

  // Guard đặc biệt: Trận đấu trẻ (U17, U18, U19, U21) có yếu tố C1/UEFA -> luôn là UEFA Youth League
  const isYouthSoccer = /\b(?:u\s*(?:17|18|19|20|21)|youth|academy)\b/i.test(fullCorpus);
  if (
    isYouthSoccer &&
    (/\b(?:uefa|youth\s*league|champions|ucl|c1)\b/i.test(fullCorpus) || score?.leagueSlug === "uefa.champions")
  ) {
    return "UEFA Youth League";
  }

  // 1. TẦNG 1: Ưu tiên số 1 - Metadata đã xác minh từ Scoreboard event (leagueSlug)
  if (score?.leagueSlug && LEAGUE_CANONICAL_MAP[score.leagueSlug]) {
    return LEAGUE_CANONICAL_MAP[score.leagueSlug];
  }

  // 2. TẦNG 2: Nhận diện từ Title hoặc Tournament string có từ khóa giải đấu rõ ràng
  for (const pattern of TITLE_TOURNAMENT_PATTERNS) {
    if (pattern.regex.test(searchCorpus)) {
      return pattern.name;
    }
  }

  // 3. TẦNG 3: Chuẩn hóa từ chuỗi tournament hiện có (nếu hợp lệ và không phải nhãn playlist rác)
  if (tournament && tournament.trim()) {
    const cleanRaw = tournament
      .toWellFormed()
      .replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s🔴🟢🟡⚪🟠⚽🏀🏐🏸🎾🎱🥊🏎️🏆]+/u, "")
      .replace(/^(?:es|it|en|fr|de|vn|sa|pt)\s+(?=[A-Z])/i, "")
      .trim();

    const lowerClean = cleanRaw.toLowerCase();
    if (
      cleanRaw &&
      !GENERIC_PLAYLIST_NAMES.has(lowerClean) &&
      !/^\d+$/.test(cleanRaw) &&
      !/^(?:kênh|channel|server|sv|stream)\s*\d+$/i.test(cleanRaw) &&
      !/^(?:blv|bình luận viên)\b/i.test(cleanRaw) &&
      !/^(?:thuyết minh|lồng tiếng|tiếng việt|tiếng anh)\b/i.test(cleanRaw) &&
      !/(?:hd|fhd|sd|4k|link\s*\d+|phòng\s*\d+)$/i.test(cleanRaw)
    ) {
      if (/la\s*liga/i.test(cleanRaw)) return "La Liga";
      if (/serie\s*a/i.test(cleanRaw)) return "Serie A";
      if (/premier\s*league|ngoại\s*hạng\s*anh/i.test(cleanRaw)) return "Ngoại Hạng Anh";
      if (/bundesliga/i.test(cleanRaw)) return "Bundesliga";
      if (/ligue\s*1/i.test(cleanRaw)) return "Ligue 1";
      if (/v[-_ ]?league/i.test(cleanRaw)) return "V-League";
      return cleanRaw;
    }
  }

  // 4. TẦNG 4: Phân loại bộ môn thể thao khác nếu có
  if (sport === "basketball" || /bóng\s*rổ|basketball/i.test(searchCorpus)) return "Bóng Rổ";
  if (sport === "tennis" || /tennis|quần\s*vợt|quan\s*vot/i.test(searchCorpus)) return "Quần Vợt";
  if (sport === "volleyball" || /bóng\s*chuyền|volleyball/i.test(searchCorpus)) return "Bóng Chuyền";
  if (sport === "badminton" || /cầu\s*lông|badminton/i.test(searchCorpus)) return "Cầu Lông";
  if (sport === "f1" || sport === "motorsport" || /formula|f1|motogp/i.test(searchCorpus)) return "Đua Xe F1";
  if (sport === "boxing" || /boxing|quyền\s*anh|ufc|mma/i.test(searchCorpus)) return "Võ Thuật / Quyền Anh";
  if (sport === "billiards" || /billiards|bida|snooker/i.test(searchCorpus)) return "Bida / Billiards";
  if (sport === "esports" || /esports|esport|lck|lpl|vcs/i.test(searchCorpus)) return "Thể Thao Điện Tử";

  // Mặc định cho bóng đá khi không đủ căn cứ xác minh: gom vào "Giải Đấu Khác"
  return "Giải Đấu Khác";
}
