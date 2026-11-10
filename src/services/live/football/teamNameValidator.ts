/**
 * Bộ kiểm tra và chuẩn hóa tên đội bóng đá, lọc bỏ tên đài truyền hình, kênh kỹ thuật, hoặc từ khóa sự kiện.
 */

import { NATIONAL_TEAM_CANONICAL_MAP } from "./nationalTeamAliases";
import { getTeamAsset } from "@/data/live/teamAssets";

export function normalizeText(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  "ngay thi dau", "ngay", "luong", "stream", "session", "matchday", "round", "vong", "bang",
  "le trao giai", "trao giai", "gala", "qua bong vang", "ballon d'or", "ballon d or", "ballon dor", "qbv", "khai mac", "be mac", "boc tham", "hop bao"
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
  if (/^(?:ban\s*\d+|table\s*\d+|san\s*\d+|court\s*\d+|phong\s*(?:blv|stream|ky\s*thuat|vip|\d+)|room\s*\d+|kenh\s*\d+|channel\s*\d+|ch\s*\d+|link\s*\d+|server\s*\d+|sv\s*\d+|stream\s*\d+|cam\s*\d+|feed\s*\d+|track\s*\d+|bang\s*[a-z0-9]|group\s*[a-z0-9]|vong\s*\d+|round\s*\d+|tap\s*\d+|phan\s*\d+|tran\s*\d+|match\s*\d+|luong\s*\d+|session\s*\d+|matchday\s*\d+|ngay\s*\d+)\b/i.test(norm)) return false;
  if (/^(?:ban|table|san|court|phong|room|kenh|channel|ch|link|server|sv|stream|cam|feed|track|bang|group|vong|round|tap|phan|tran|match|luong|session|matchday|ngay)$/i.test(norm)) return false;
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
  if (/^(?:truc tiep|re live|highlight|full match|ban ket|chung ket|tu ket|vong loai|ngay thi dau|session|le trao giai|trao giai|gala|qua bong vang|ballon\s*d\s*or|ballon\s*d'?or|qbv|khai mac|be mac|boc tham|hop bao)\b/i.test(norm)) {
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
  const fullText = `${rawTitle} ${group}`;
  const normFull = `${normTitle} ${normGroup}`;

  // 1. Cặp đấu đối đầu (vs, v, -) -> THỂ THAO -> GIỮ
  const hasMatchIndicator =
    /\s+(?:vs|v|\bv\b)\s+/i.test(rawTitle) ||
    /\[(?:vs|v)\]/i.test(rawTitle) ||
    /\s+-\s+/.test(rawTitle);
  if (hasMatchIndicator && !/^(?:htv|vtv|thvl|sctv|vtc)\s*\d+/i.test(normTitle)) {
    return false;
  }

  // 2. Bình luận viên / Phòng BLV -> THỂ THAO -> GIỮ
  if (
    /\b(?:blv|binh luan vien|binh luan|phong blv)\b/i.test(normFull) ||
    /\((?:alan|tom|captain|giang a|batman|pocari|nguoi nan|dec|leo|ti|te)\)/i.test(rawTitle)
  ) {
    return false;
  }

  // 3. Kênh thể thao Việt Nam hợp lệ (K+ Sport, ON Sports/Football/Golf, HTV Thể Thao, SPOTV, FPT Sport,...) -> THỂ THAO -> GIỮ
  const isVnSportsChannel =
    /(?:k\+\s*(?:sport|action|1|2|pm|pc|ns)|kplus\s*(?:sport|action)|on\s+(?:sports|football|golf|volleyball|sports\s*news|sports\s*\+)|htv\s*(?:the\s*thao|thao|tt)|spotv|spotv\s*2|fpt\s*(?:sport|bong\s*da|the\s*thao)|vtc3|sctv15)\b/i.test(
      normTitle,
    );
  if (isVnSportsChannel) {
    return false;
  }

  // 4. Giải đấu / Kênh / Sự kiện thể thao quốc tế -> THỂ THAO -> GIỮ
  const isSportsTournamentOrEvent =
    /(?:asian\s*games|asiad|sea\s*games|olympic|world\s*cup|euro|copa|champions\s*league|cup\s*c1|cup\s*c2|cup\s*c3|europa\s*league|premier\s*league|ngoai\s*hang\s*anh|la\s*liga|serie\s*a|bundesliga|ligue\s*1|v[-_ ]?league|vleague|afc|concacaf|conmebol|fa\s*cup|carabao|nba|cba|pba|vba|basketball|bong\s*ro|bong\s*chuyen|volleyball|tennis|quan\s*vot|roland\s*garros|wimbledon|us\s*open|atp|wta|f1|formula|motogp|ufc|mma|one\s*championship|boxing|quyen\s*anh|billiards|bida|snooker|esports|esport|lck|lpl|vcs|dota|cs2|valorant|bein\s*sports|astro\s*supersport|true\s*sport|fox\s*sports|sky\s*sports|bt\s*sport|tnt\s*sports|eurosport|nba\s*tv|mutv|chelsea\s*tv|manchester|real\s*madrid|barcelona|arsenal|chelsea|liverpool|juventus|bayern|psg|inter|milan|dortmund|tottenham|ballon\s*d'?or|qua\s*bong\s*vang)\b/i.test(
      normFull,
    ) ||
    /[⚽🏀🎾🏐🏸🏒🥊🏎🏁🎱🎮]/u.test(fullText);

  if (isSportsTournamentOrEvent) {
    const isMovieVod =
      /Tập\s*\d+|Phim\s*(Bộ|Lẻ|Truyện|Ngắn)|Chiếu\s*Rạp|Thuyết\s*Minh|Lồng\s*Tiếng|Vietsub|Web\s*Drama/i.test(
        rawTitle,
      );
    if (!isMovieVod) {
      return false;
    }
  }

  // 5. Nếu nhóm thuộc thể thao / bóng đá trực tiếp
  const isSportsGroup =
    /(?:bong\s*da|the\s*thao|sports|live\s*sports|football|soccer|tennis|basketball|esports|fpt\s*play|tv360|xoi\s*lac|cola|sao\s*ke|phao\s*hoa|pha\s*lang|vua\s*san\s*co|ga\s*vang|chuoi\s*chien|sut\s*bong|s8)/i.test(
      normGroup,
    );

  // 6. Nhận diện các kênh truyền hình nhà đài thông thường 24/7 KHÔNG PHẢI THỂ THAO -> LOẠI
  const isGenericStationPattern =
    /^(?:vtv[1-9]|vtv\s*(?:can\s*tho|dac\s*sac|hd|sd)?|htv[1-9]|thvl[1-4]|sctv[1-9]\d*|vtc[1-9]\d*|btv[1-9]|htvc|vov|antv|qpvn|ttxvn|hanoitv|hanoi\s*tv|thhn|todaytv|truyenhinh|kenh\s*\d+)\b/i.test(
      normTitle,
    ) ||
    /^(?:hbo|cinemax|axn|discovery|cartoon\s*network|disney|fox|cnn|bbc|nhk|kbs|cctv|tvb)\b/i.test(
      normTitle,
    );

  if (isGenericStationPattern) {
    return true;
  }

  // 7. Danh mục / Nhóm kênh truyền hình 24/7 không phải thể thao -> LOẠI
  const isNonSportsGroup =
    /(?:kenh\s+vtv|kenh\s+htv|kenh\s+sctv|kenh\s+vtvcab|truyen\s+hinh|thiet\s+yeu|tin\s+tuc|phim\s+truyen|giai\s+tri|thieu\s+nhi|ca\s+nhac|dia\s+phuong|quoc\s+te|am\s+nhac|phim\s+le|phim\s+bo)/i.test(
      normGroup,
    );

  if (isNonSportsGroup) {
    return true;
  }

  // 8. Kênh kỹ thuật đơn lẻ không có metadata thể thao ("Kênh 1", "Server 2") -> LOẠI
  if (/^(?:kenh|channel|dai|server|sv|stream|feed|ban|table|san|court)\s*\d+\s*(?:hd|fhd|4k|sd)?$/i.test(normTitle)) {
    return true;
  }

  // Nếu thuộc sports group -> GIỮ
  if (isSportsGroup) {
    return false;
  }

  // Mặc định không có metadata thể thao -> LOẠI
  return true;
}

export function cleanCandidateTeamName(name: string): string {
  if (!name) return "";
  let clean = name.toWellFormed().replace(/\uFFFD+/g, " ").trim();

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
  clean = clean.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s🔴🟢⚪🟡🟠]/gu, " ");

  // 7. Strip leading/trailing timestamps, dates and time-like prefixes
  clean = clean
    .replace(/^\s*(?:(?:[012]?\d[:hH]\d{2}|\d{1,2})\s*)?(?:\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)?\s*/, "")
    .replace(/^\s*(?:[012]?\d[:hH]\d{2})\s*/, "")
    .replace(/\s*(?:(?:[012]?\d[:hH]\d{2}|\d{1,2})\s*)?(?:\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)\s*$/, "")
    .trim();

  // 7B. Normalize sticky Roman numerals / numbers and gender / category words (e.g. "IIWomen" -> "II Women", "2Women" -> "2 Women")
  clean = clean.replace(/\b(ii|iii|iv|v|\d+)(women|woman|nu|nữ|w)\b/gi, "$1 $2");

  // 8. Strip leading and trailing gender markers: "Nữ", "Nam", "Women", "Men"
  clean = clean.replace(/^(?:nữ|nu|nam|women|woman|men)\s+/i, "");
  // Bảo vệ không cắt nhầm "Nam" trong các địa danh / tên đội bóng hợp lệ: "Hà Nam", "Việt Nam", "Quảng Nam"
  clean = clean.replace(/(?<!\b(?:ha|hà|viet|việt|quang|quảng))\s+(?:nam|man)$/i, "");
  clean = clean.replace(/\s+(?:nữ|nu|women|woman)$/i, "");
  clean = clean.replace(/\s+\([wWsS]\)$/i, "");
  clean = clean.replace(/\s+[wWsS]$/, "");

  // 8B. Strip team prefix markers: "Đội tuyển quốc gia", "Đội tuyển", "National team", "ĐTQG", "ĐT", "CLB"
  clean = clean.replace(/^(?:đội tuyển quốc gia|doi tuyen quoc gia|đội tuyển|doi tuyen|national team|đtqg|dtqg|đt|dt|clb)\s+/i, "");
  clean = clean.replace(/\s+(?:clb|national team)$/i, "");

  // 9. Strip any remaining surrounding symbols/punctuation
  clean = clean.replace(/^[\s\-_|/:\.,;=~+*#@!?^$()\[\]{}'"]+|[\s\-_|/:\.,;=~+*#@!?^$()\[\]{}'"]+$/g, "").trim();

  // 10. Repeat gender & prefix strip if symbols were removed around it
  clean = clean.replace(/^(?:nữ|nu|nam|women|woman|men)\s+/i, "");
  clean = clean.replace(/(?<!\b(?:ha|hà|viet|việt|quang|quảng))\s+(?:nam|man)$/i, "");
  clean = clean.replace(/\s+(?:nữ|nu|women|woman)$/i, "");
  clean = clean.replace(/\s+\([wWsS]\)$/i, "");
  clean = clean.replace(/\s+[wWsS]$/, "");
  clean = clean.replace(/^(?:đội tuyển quốc gia|doi tuyen quoc gia|đội tuyển|doi tuyen|national team|đtqg|dtqg|đt|dt|clb)\s+/i, "");
  clean = clean.replace(/\s+(?:clb|national team)$/i, "");

  return clean.toWellFormed().replace(/\uFFFD+/g, " ").replace(/\s+/g, " ").trim();
}

