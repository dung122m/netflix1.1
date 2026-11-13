/**
 * Live Sports Tournament & Discipline Classification Engine
 * - Nhận diện giải đấu (Ngoại hạng Anh, C1, La Liga, V-League, NBA, VBA...)
 * - Phân loại bộ môn thể thao (Football, Basketball, Tennis, F1, Esports...)
 * - Phân loại giới tính & lứa tuổi (Senior Men, Senior Women, U19, U23, Futsal...)
 */

import {
  EPL_TEAMS,
  LALIGA_TEAMS,
  SERIE_A_TEAMS,
  BUNDESLIGA_TEAMS,
  LIGUE_1_TEAMS,
  OTHER_EUROPE_TEAMS,
  MLS_TEAMS,
  SAUDI_TEAMS,
  VLEAGUE_TEAMS,
} from "@/data/live/leagueClubs";

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

export type SportType =
  | "football"
  | "basketball"
  | "volleyball"
  | "tennis"
  | "badminton"
  | "f1"
  | "motorsport"
  | "boxing"
  | "esports"
  | "billiards"
  | "other";

function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchTeamInList(teamStr: string, clubList: string[]): boolean {
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

export function detectTournament(title: string, team1: string, team2: string): string {
  const cleanTitleForTourn = (title || "")
    .replace(/\((BLV\s+[^)]+|[^)]*)\)/gi, " ")
    .replace(/\[[^\]]+\]/g, " ");

  const normTitle = normalizeText(cleanTitleForTourn);
  const normT1 = normalizeText(team1);
  const normT2 = normalizeText(team2);

  // 1. Kiểm tra các bộ môn thể thao khác
  if (
    normTitle.includes("🏀") ||
    /\b(?:wnba|nba|vba)\b/i.test(normTitle) ||
    normTitle.includes("basketball") ||
    normTitle.includes("bong ro") ||
    /\b(?:wildcats|36ers|liberty|dream)\b/i.test(normTitle) ||
    /\bheat\b/i.test(normT1) ||
    /\bheat\b/i.test(normT2) ||
    /\bbuffalo(?:es)?\b/i.test(normT1) ||
    /\bbuffalo(?:es)?\b/i.test(normT2) ||
    /\bdolphins?\b/i.test(normT1) ||
    /\bdolphins?\b/i.test(normT2)
  ) {
    if (
      /\bvba\b/i.test(normTitle) ||
      /\bheat\b/i.test(normT1) ||
      /\bheat\b/i.test(normT2) ||
      /\bbuffalo(?:es)?\b/i.test(normT1) ||
      /\bbuffalo(?:es)?\b/i.test(normT2) ||
      /\bdolphins?\b/i.test(normT1) ||
      /\bdolphins?\b/i.test(normT2)
    ) {
      return "🏀 🇻🇳 Giải Bóng Rổ VBA";
    }
    if (/\b(?:nba|wnba)\b/i.test(normTitle)) {
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
    /\b(?:f1|formula\s*1|motogp|dua\s*xe)\b/i.test(normTitle)
  ) {
    return "🏎️ F1 / Đua Xe Trực Tiếp";
  }
  if (
    normTitle.includes("🥊") ||
    normTitle.includes("boxing") ||
    normTitle.includes("quyen anh") ||
    /\b(?:ufc|mma|one\s*championship)\b/i.test(normTitle)
  ) {
    return "🥊 Quyền Anh Trực Tiếp";
  }
  if (
    normTitle.includes("🎱") ||
    normTitle.includes("billiards") ||
    normTitle.includes("bida") ||
    normTitle.includes("snooker") ||
    /\b(?:pool\s*(?:9|8|bida|billiards|table)|bida\s*pool|billiards\s*pool|9-ball|8-ball)\b/i.test(normTitle)
  ) {
    return "🎱 Bida / Billiards Trực Tiếp";
  }
  if (
    normTitle.includes("🎮") ||
    normTitle.includes("esports") ||
    normTitle.includes("esport") ||
    /\b(?:lck|lpl|vcs|cs2|csgo|dota|valorant)\b/i.test(normTitle)
  ) {
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
    normTitle.includes("youth league") ||
    (/\b(?:u\s*(?:17|18|19|20|21)|youth)\b/i.test(`${normTitle} ${normT1} ${normT2}`) &&
      (normTitle.includes("champions league") || normTitle.includes("ucl") || normTitle.includes("cúp c1") || normTitle.includes("cup c1") || /\bc1\b/.test(normTitle)))
  ) {
    return "UEFA Youth League";
  }
  if (
    normTitle.includes("champions league") ||
    normTitle.includes("cup c1") ||
    normTitle.includes("cúp c1") ||
    normTitle.includes("ucl") ||
    /\bc1\b/.test(normTitle)
  ) {
    return "UEFA Champions League";
  }
  if (
    normTitle.includes("europa league") ||
    normTitle.includes("cup c2") ||
    normTitle.includes("cúp c2") ||
    normTitle.includes("uel") ||
    /\bc2\b/.test(normTitle)
  ) {
    return "UEFA Europa League";
  }
  if (
    normTitle.includes("conference league") ||
    normTitle.includes("cup c3") ||
    normTitle.includes("cúp c3") ||
    normTitle.includes("uecl") ||
    /\bc3\b/.test(normTitle)
  ) {
    return "UEFA Conference League";
  }
  if (normTitle.includes("nations league")) {
    return "UEFA Nations League";
  }

  // 3. Giải VĐQG hàng đầu Châu Âu
  if (
    normTitle.includes("premier league") ||
    normTitle.includes("ngoai hang anh") ||
    normTitle.includes("epl") ||
    (matchTeamInList(team1, EPL_TEAMS) && matchTeamInList(team2, EPL_TEAMS))
  ) {
    return "Ngoại Hạng Anh (Premier League)";
  }
  if (
    normTitle.includes("la liga") ||
    normTitle.includes("laliga") ||
    (matchTeamInList(team1, LALIGA_TEAMS) && matchTeamInList(team2, LALIGA_TEAMS))
  ) {
    return "La Liga";
  }
  if (
    normTitle.includes("serie a") ||
    normTitle.includes("seriea") ||
    (matchTeamInList(team1, SERIE_A_TEAMS) && matchTeamInList(team2, SERIE_A_TEAMS))
  ) {
    return "Serie A";
  }
  if (
    normTitle.includes("bundesliga") ||
    (matchTeamInList(team1, BUNDESLIGA_TEAMS) && matchTeamInList(team2, BUNDESLIGA_TEAMS))
  ) {
    return "Bundesliga";
  }
  if (
    normTitle.includes("ligue 1") ||
    normTitle.includes("ligue1") ||
    (matchTeamInList(team1, LIGUE_1_TEAMS) && matchTeamInList(team2, LIGUE_1_TEAMS))
  ) {
    return "Ligue 1";
  }

  // 4. Các giải Châu Á & Việt Nam
  if (
    normTitle.includes("v-league") ||
    normTitle.includes("vleague") ||
    normTitle.includes("v league") ||
    (matchTeamInList(team1, VLEAGUE_TEAMS) && matchTeamInList(team2, VLEAGUE_TEAMS))
  ) {
    return "V-League (Việt Nam)";
  }
  if (
    normTitle.includes("saudi") ||
    normTitle.includes("spl") ||
    (matchTeamInList(team1, SAUDI_TEAMS) && matchTeamInList(team2, SAUDI_TEAMS))
  ) {
    return "Saudi Pro League";
  }
  if (normTitle.includes("afc champions league") || normTitle.includes("acl")) {
    return "AFC Champions League";
  }

  // 5. Cúp quốc nội
  if (normTitle.includes("fa cup")) return "FA Cup";
  if (normTitle.includes("carabao") || normTitle.includes("efl cup")) return "Carabao Cup";
  if (normTitle.includes("copa del rey")) return "Copa del Rey";
  if (normTitle.includes("coppa italia")) return "Coppa Italia";
  if (normTitle.includes("dfb pokal")) return "DFB-Pokal";
  if (normTitle.includes("coupe de france")) return "Coupe de France";

  // 6. ĐTQG
  if (normTitle.includes("world cup") || normTitle.includes("fifa")) return "FIFA World Cup";
  if (normTitle.includes("euro")) return "UEFA EURO";
  if (normTitle.includes("copa america")) return "Copa América";
  if (normTitle.includes("asian cup")) return "AFC Asian Cup";
  if (normTitle.includes("aff cup") || normTitle.includes("asean")) return "AFF Mitsubishi Electric Cup";

  // 7. Giải đấu khác & Giao hữu
  if (normTitle.includes("championship")) return "Championship (Anh)";
  if (
    normTitle.includes("mls") ||
    (matchTeamInList(team1, MLS_TEAMS) && matchTeamInList(team2, MLS_TEAMS))
  ) {
    return "Major League Soccer (MLS)";
  }
  if (normTitle.includes("giao huu") || normTitle.includes("friendly")) return "Giao Hữu Quốc Tế";

  return "⚽ Bóng Đá Trực Tiếp";
}

export function getSportLabel(
  sport?: SportType,
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

export function extractSportAndGender(
  rawTitle: string,
  group?: string,
): {
  sport: SportType;
  gender?: "men" | "women";
} {
  const cleanTitle = (rawTitle || "")
    .replace(/\((?:BLV\s+[^)]+|[^)]*)\)/gi, " ")
    .replace(/\[(?:BLV\s+[^\]]+|[^\]]*)\]/gi, " ");

  const fullText = `${cleanTitle} ${group || ""}`;
  const norm = fullText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  let sport: SportType = "other";

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
    /(?:^|\s|[([_:\-/])(?:billiards|billiard|bida|snooker|9-ball|8-ball|jayson shaw|vanboening|vanboning|efren reyes)(?:$|\s|[)\]_:\-/])/i.test(norm) ||
    /\b(?:pool\s*(?:9|8|bida|billiards|table)|bida\s*pool|billiards\s*pool)\b/i.test(norm)
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
    /(?:^|\s|[([_:\-/])(?:football|soccer|bong da|vleague|premier league|ngoai hang anh|laliga|serie a|bundesliga|ligue 1|cúp c1|cup c1|cúp c2|cup c2|uecl|cup c3|champions league|europa league|ballon d'?or|qua bong vang|the best fifa)(?:$|\s|[)\]_:\-/])/i.test(norm) ||
    /\b(?:fc|cf|clb)\b/i.test(cleanTitle)
  ) {
    sport = "football";
  } else {
    // Kiểm tra tên các câu lạc bộ bóng đá đã biết
    if (
      matchTeamInList(cleanTitle, EPL_TEAMS) ||
      matchTeamInList(cleanTitle, LALIGA_TEAMS) ||
      matchTeamInList(cleanTitle, SERIE_A_TEAMS) ||
      matchTeamInList(cleanTitle, BUNDESLIGA_TEAMS) ||
      matchTeamInList(cleanTitle, LIGUE_1_TEAMS) ||
      matchTeamInList(cleanTitle, OTHER_EUROPE_TEAMS) ||
      matchTeamInList(cleanTitle, MLS_TEAMS) ||
      matchTeamInList(cleanTitle, SAUDI_TEAMS) ||
      matchTeamInList(cleanTitle, VLEAGUE_TEAMS)
    ) {
      sport = "football";
    } else {
      sport = "other";
    }
  }

  let gender: "men" | "women" | undefined = undefined;
  if (
    /(?:^|\s|[([_])(?:nu|women|woman|female|w)(?:$|\s|[)\]_])/i.test(norm) ||
    /(?:^|\s|[([_])(?:nữ)(?:$|\s|[)\]_])/i.test(fullText) ||
    /\([wW]\)/.test(rawTitle || "") ||
    /\b(?:women|woman|female)\b/i.test(norm) ||
    /\b(?:phong\s*phu\s*ha\s*nam|thai\s*nguyen\s*t&t|thai\s*nguyen\s*tt)\b/i.test(norm)
  ) {
    gender = "women";
  } else if (
    /(?:^|\s|[([_])(?:nam|men|male|m)(?:$|\s|[)\]_])/i.test(norm) ||
    /(?:^|\s|[([_])(?:nam)(?:$|\s|[)\]_])/i.test(fullText)
  ) {
    // Chỉ đánh dấu men nếu không phải là địa danh ghép (như "hà nam")
    if (!/(?:ha|hà|viet|việt|quang|quảng)\s*nam/i.test(norm)) {
      gender = "men";
    }
  }

  return { sport, gender };
}

export function extractSportAndCategory(
  rawTitle: string,
  group?: string,
): {
  sport: SportType;
  category: MatchCategory;
  gender?: "men" | "women";
  isCategoryExplicit?: boolean;
} {
  const fullText = `${rawTitle || ""} ${group || ""}`;
  const norm = fullText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const isFutsal = /\b(?:futsal)\b/i.test(norm) || /\b(?:futsal)\b/i.test(fullText);

  let category: MatchCategory = "senior_men";
  let isCategoryExplicit = false;

  if (isFutsal) {
    category = "futsal";
    isCategoryExplicit = true;
  } else if (/\b(?:u-?19)\b/i.test(norm) || /\bu19\b/i.test(fullText)) {
    category = "u19";
    isCategoryExplicit = true;
  } else if (/\b(?:u-?20)\b/i.test(norm) || /\bu20\b/i.test(fullText)) {
    category = "u20";
    isCategoryExplicit = true;
  } else if (/\b(?:u-?21)\b/i.test(norm) || /\bu21\b/i.test(fullText)) {
    category = "u21";
    isCategoryExplicit = true;
  } else if (/\b(?:u-?23)\b/i.test(norm) || /\bu23\b/i.test(fullText)) {
    category = "u23";
    isCategoryExplicit = true;
  } else if (
    /(?:^|\s|[([_])(?:nu|women|woman|female|w)(?:$|\s|[)\]_])/i.test(norm) ||
    /(?:^|\s|[([_])(?:nữ)(?:$|\s|[)\]_])/i.test(fullText) ||
    /\([wW]\)/.test(rawTitle || "") ||
    /\b(?:women|woman|female)\b/i.test(norm) ||
    /\b(?:phong\s*phu\s*ha\s*nam|thai\s*nguyen\s*t&t|thai\s*nguyen\s*tt)\b/i.test(norm)
  ) {
    category = "senior_women";
    isCategoryExplicit = true;
  } else if (/\b(?:youth|tre|trẻ)\b/i.test(norm)) {
    category = "youth";
    isCategoryExplicit = true;
  } else if (
    /(?:^|\s|[([_])(?:nam|men|male)(?:$|\s|[)\]_])/i.test(norm) &&
    !/(?:ha|hà|viet|việt|quang|quảng)\s*nam/i.test(norm)
  ) {
    category = "senior_men";
    isCategoryExplicit = true;
  }

  let { sport, gender } = extractSportAndGender(rawTitle, group);
  if (isFutsal) {
    sport = "football";
  }
  if (category === "senior_women") {
    gender = "women";
  } else if (category === "senior_men" && isCategoryExplicit && !gender) {
    gender = "men";
  }

  return { sport, category, gender, isCategoryExplicit };
}
