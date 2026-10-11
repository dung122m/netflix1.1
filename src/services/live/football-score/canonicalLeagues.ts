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
]);

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

  // 1. TẦNG 1: Ưu tiên số 1 - Metadata đã xác minh từ Scoreboard event (leagueSlug)
  if (score?.leagueSlug && LEAGUE_CANONICAL_MAP[score.leagueSlug]) {
    return LEAGUE_CANONICAL_MAP[score.leagueSlug];
  }

  // 2. TẦNG 2: Nhận diện từ Title hoặc Tournament string có từ khóa giải đấu rõ ràng
  const searchCorpus = `${title || ""} ${tournament || ""}`;
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
  if (sport === "basketball") return "Bóng Rổ";
  if (sport === "tennis") return "Quần Vợt";
  if (sport === "volleyball") return "Bóng Chuyền";
  if (sport === "badminton") return "Cầu Lông";
  if (sport === "f1" || sport === "motorsport") return "Đua Xe F1";
  if (sport === "boxing") return "Võ Thuật / Quyền Anh";
  if (sport === "billiards") return "Bida / Billiards";
  if (sport === "esports") return "Thể Thao Điện Tử";

  // Mặc định cho bóng đá khi không đủ căn cứ xác minh: gom vào "Giải Đấu Khác"
  return "Giải Đấu Khác";
}
