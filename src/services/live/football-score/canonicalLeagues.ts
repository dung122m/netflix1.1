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
const TITLE_TOURNAMENT_PATTERNS: Array<{ regex: RegExp; name: string; sport?: "football" | "basketball" }> = [
  { regex: /\b(?:uefa\s*youth\s*league|youth\s*league|c1\s*u\s*19|ucl\s*u\s*19)\b/i, name: "UEFA Youth League", sport: "football" },
  { regex: /\b(?:champions\s*league|cúp\s*c1|cup\s*c1|\bucl\b)\b/i, name: "UEFA Champions League", sport: "football" },
  { regex: /\b(?:europa\s*league|cúp\s*c2|cup\s*c2|\buel\b)\b/i, name: "UEFA Europa League", sport: "football" },
  { regex: /\b(?:conference\s*league|cúp\s*c3|cup\s*c3|\buecl\b)\b/i, name: "UEFA Conference League", sport: "football" },
  { regex: /\b(?:premier\s*league|ngoại\s*hạng\s*anh|\bepl\b)\b/i, name: "Ngoại Hạng Anh", sport: "football" },
  { regex: /\b(?:la\s*liga|laliga)\b/i, name: "La Liga", sport: "football" },
  { regex: /\b(?:serie\s*a|seriea)\b/i, name: "Serie A", sport: "football" },
  { regex: /\b(?:bundesliga)\b/i, name: "Bundesliga", sport: "football" },
  { regex: /\b(?:ligue\s*1|ligue1)\b/i, name: "Ligue 1", sport: "football" },
  { regex: /\b(?:v[-_ ]?league|vleague)\b/i, name: "V-League", sport: "football" },
  { regex: /\b(?:saudi\s*(?:pro\s*)?league|spl)\b/i, name: "Saudi Pro League", sport: "football" },
  { regex: /\b(?:major\s*league\s*soccer|\bmls\b)\b/i, name: "Major League Soccer", sport: "football" },
  { regex: /\b(?:world\s*cup)\b/i, name: "World Cup", sport: "football" },
  { regex: /\b(?:euro\s*\d{4}|euro)\b/i, name: "Euro", sport: "football" },
  { regex: /\b(?:copa\s*america)\b/i, name: "Copa America", sport: "football" },
  { regex: /\b(?:asian\s*cup|aff\s*(?:cup|mitsubishi))\b/i, name: "Asian Cup / AFF", sport: "football" },
  { regex: /\b(?:asian\s*games|asiad)\b/i, name: "Asian Games / ASIAD" },
  { regex: /\b(?:fa\s*cup)\b/i, name: "FA Cup", sport: "football" },
  { regex: /\b(?:carabao\s*cup)\b/i, name: "Carabao Cup", sport: "football" },
  { regex: /\b(?:copa\s*del\s*rey)\b/i, name: "Copa del Rey", sport: "football" },
  { regex: /\b(?:nba)\b/i, name: "Giải Bóng Rổ NBA", sport: "basketball" },
  { regex: /\b(?:vba)\b/i, name: "Giải Bóng Rổ VBA", sport: "basketball" },
  { regex: /\b(?:easl|east\s*asia\s*super\s*league)\b/i, name: "Giải Bóng Rổ EASL", sport: "basketball" },
  { regex: /\b(?:pba|philippine\s*basketball)\b/i, name: "Giải Bóng Rổ PBA", sport: "basketball" },
  { regex: /\b(?:kbl|korean\s*basketball)\b/i, name: "Giải Bóng Rổ KBL", sport: "basketball" },
  { regex: /\b(?:mpbl)\b/i, name: "Giải Bóng Rổ MPBL", sport: "basketball" },
  { regex: /\b(?:euroleague|euro\s*league)\b/i, name: "Giải Bóng Rổ EuroLeague", sport: "basketball" },
  { regex: /\b(?:cba|chinese\s*basketball)\b/i, name: "Giải Bóng Rổ CBA", sport: "basketball" },

  // --- QUẦN VỢT (TENNIS) ---
  { regex: /\b(?:australian\s*open|úc\s*mở\s*rộng|\bao\b)\b/i, name: "Australian Open" },
  { regex: /\b(?:roland[- ]?garros|french\s*open|pháp\s*mở\s*rộng)\b/i, name: "Roland-Garros" },
  { regex: /\b(?:wimbledon)\b/i, name: "Wimbledon" },
  { regex: /\b(?:us\s*open|mỹ\s*mở\s*rộng)\b/i, name: "US Open" },
  { regex: /\b(?:atp\s*(?:finals|masters|1000|500|250)?|atp)\b/i, name: "ATP Tour" },
  { regex: /\b(?:wta\s*(?:finals|1000|500|250)?|wta)\b/i, name: "WTA Tour" },

  // --- ESPORTS (THỂ THAO ĐIỆN TỬ) ---
  { regex: /\b(?:lck)\b/i, name: "LCK" },
  { regex: /\b(?:lpl)\b/i, name: "LPL" },
  { regex: /\b(?:vcs)\b/i, name: "VCS" },
  { regex: /\b(?:worlds|chung\s*kết\s*thế\s*giới|\bcktg\b)\b/i, name: "Chung Kết Thế Giới" },
  { regex: /\b(?:msi|mid[- ]?season\s*invitational)\b/i, name: "MSI" },
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
  category?: string;
  gender?: string;
  score?: LiveMatchScore | null;
}): string {
  const { tournament, title, sport, category, gender, score } = params;
  const searchCorpus = `${title || ""} ${tournament || ""}`;
  const teamsCorpus = `${params.team1 || ""} ${params.team2 || ""}`;
  const fullCorpus = `${searchCorpus} ${teamsCorpus}`.trim();

  // Guard đặc biệt 1: Bóng đá Nữ (Women's Football / WSL / Liga F / Women's UCL)
  const isWomenSoccer =
    category === "senior_women" ||
    gender === "women" ||
    /\b(?:nữ|nu|women|woman|female|wsl|frauen|femenil)\b/i.test(`${fullCorpus} ${category || ""}`);

  if (isWomenSoccer) {
    if (/\b(?:premier\s*league|ngoại\s*hạng\s*anh|\bepl\b|wsl|fa\s*wsl)\b/i.test(fullCorpus)) {
      return "Nữ Ngoại Hạng Anh";
    }
    if (/\b(?:champions\s*league|cúp\s*c1|ucl)\b/i.test(fullCorpus)) {
      return "UEFA Women's Champions League";
    }
    if (/\b(?:la\s*liga|laliga|liga\s*f)\b/i.test(fullCorpus)) {
      return "Nữ La Liga (Liga F)";
    }
    if (/\b(?:serie\s*a|seriea)\b/i.test(fullCorpus)) {
      return "Nữ Serie A";
    }
    if (/\b(?:bundesliga|frauen)\b/i.test(fullCorpus)) {
      return "Nữ Bundesliga";
    }
    if (/\b(?:world\s*cup)\b/i.test(fullCorpus)) {
      return "World Cup Nữ";
    }
    if (tournament && !GENERIC_PLAYLIST_NAMES.has(tournament.toLowerCase())) {
      return tournament.startsWith("Nữ ") ? tournament : `Nữ ${tournament}`;
    }
    return "Bóng Đá Nữ";
  }

  // Guard đặc biệt 2: Trận đấu trẻ (U17, U18, U19, U21) có yếu tố C1/UEFA -> luôn là UEFA Youth League
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

  const isLikelyFootball =
    sport === "football" ||
    (!sport && /\b(?:fc|cf|clb)\b/i.test(teamsCorpus));

  // 2. TẦNG 2: Nhận diện từ Title hoặc Tournament string có từ khóa giải đấu rõ ràng
  for (const pattern of TITLE_TOURNAMENT_PATTERNS) {
    if (isLikelyFootball && pattern.sport && pattern.sport !== "football") {
      continue;
    }
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
      if (isLikelyFootball && /bóng\s*rổ|basketball|\bnba\b|\bvba\b|\bpba\b|\bkbl\b/i.test(cleanRaw)) {
        // Trận bóng đá không bao giờ nhận nhãn giải bóng rổ do lỗi metadata
      } else {
        if (/la\s*liga/i.test(cleanRaw)) return "La Liga";
        if (/serie\s*a/i.test(cleanRaw)) return "Serie A";
        if (/premier\s*league|ngoại\s*hạng\s*anh/i.test(cleanRaw)) return "Ngoại Hạng Anh";
        if (/bundesliga/i.test(cleanRaw)) return "Bundesliga";
        if (/ligue\s*1/i.test(cleanRaw)) return "Ligue 1";
        if (/v[-_ ]?league/i.test(cleanRaw)) return "V-League";
        return cleanRaw;
      }
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

/**
 * Tra cứu logo chính thức cho giải đấu hoặc bộ môn thể thao (Tennis Grand Slam, NBA, V-League...)
 */
export function resolveTournamentLogo(tournamentName?: string, sport?: string): string {
  if (!tournamentName && !sport) return "";
  const norm = (tournamentName || "").toLowerCase().trim();

  // 1. Basketball (NBA League Logo trên ESPN CDN)
  if (norm.includes("nba")) {
    return "https://a.espncdn.com/i/teamlogos/leagues/500/nba.png";
  }

  // 2. Football (V-League asset tĩnh có sẵn)
  if (norm.includes("v-league") || norm.includes("vleague")) {
    return "/images/tournaments/v-league.png";
  }

  // 3. Tennis Grand Slams (Verified CDN Thumbnails)
  if (norm.includes("australian open") || norm.includes("uc mo rong") || norm.includes("úc mở rộng")) {
    return "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b4/Australian_Open_Logo_2017.svg/330px-Australian_Open_Logo_2017.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail";
  }
  if (
    norm.includes("roland garros") ||
    norm.includes("roland-garros") ||
    norm.includes("phap mo rong") ||
    norm.includes("pháp mở rộng") ||
    norm.includes("french open")
  ) {
    return "https://thumb.wikimedia.org/wikipedia/en/thumb/1/1d/Logo_Roland-Garros.svg/330px-Logo_Roland-Garros.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail";
  }
  if (norm.includes("wimbledon")) {
    return "https://thumb.wikimedia.org/wikipedia/en/thumb/b/b9/Wimbledon.svg/330px-Wimbledon.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail";
  }
  if (norm.includes("us open") || norm.includes("my mo rong") || norm.includes("mỹ mở rộng")) {
    return "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Usopen-horizontal-logo.svg/330px-Usopen-horizontal-logo.svg.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail";
  }

  return "";
}
