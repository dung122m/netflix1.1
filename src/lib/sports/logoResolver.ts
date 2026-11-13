/**
 * Multi-Tier Sports Logo Resolver
 * - Tầng 1: Logo M3U hợp lệ từ nhà đài
 * - Tầng 2: Cloudflare R2 CDN nội bộ (O(1) qua r2AssetsManifest)
 * - Tầng 3: Cờ quốc gia emoji hoặc CDN thể thao tĩnh
 * - Tầng 4: Dynamic Monogram Badge (màu gradient xác định + chữ viết tắt)
 */

import { getR2TeamLogoUrl, getR2AssetUrl } from "@/lib/r2Manifest";
import {
  cleanSportsText,
  extractCoreTokens,
  toCanonicalSlug,
  toKebabSlug,
  SPORT_ACRONYMS,
} from "./teamNormalizer";
import NATIONAL_TEAM_ALIASES from "@/data/live/nationalTeamAliases.json";

export interface ResolvedTeamIdentity {
  name: string;
  logo?: string;
  emoji?: string;
  initials: string;
  isCountry?: boolean;
}

// Bảng ánh xạ cờ quốc gia O(1) từ mã ISO/slug sang Emoji
const COUNTRY_FLAGS: Record<string, string> = {
  vietnam: "🇻🇳",
  japan: "🇯🇵",
  korea: "🇰🇷",
  southkorea: "🇰🇷",
  northkorea: "🇰🇵",
  china: "🇨🇳",
  thailand: "🇹🇭",
  indonesia: "🇮🇩",
  malaysia: "🇲🇾",
  singapore: "🇸🇬",
  philippines: "🇵🇭",
  myanmar: "🇲🇲",
  laos: "🇱🇦",
  cambodia: "🇰🇭",
  brunei: "🇧🇳",
  timor: "🇹🇱",
  australia: "🇦🇺",
  saudiarabia: "🇸🇦",
  qatar: "🇶🇦",
  uae: "🇦🇪",
  iran: "🇮🇷",
  iraq: "🇮🇶",
  uzbekistan: "🇺🇿",
  jordan: "🇯🇴",
  palestine: "🇵🇸",
  syria: "🇸🇾",
  lebanon: "🇱🇧",
  oman: "🇴🇲",
  bahrain: "🇧🇭",
  kuwait: "🇰🇼",
  yemen: "🇾🇪",
  tajikistan: "🇹🇯",
  kyrgyzstan: "🇰🇬",
  turkmenistan: "🇹🇲",
  india: "🇮🇳",
  taiwan: "🇹🇼",
  hongkong: "🇭🇰",
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  france: "🇫🇷",
  germany: "🇩🇪",
  spain: "🇪🇸",
  italy: "🇮🇹",
  portugal: "🇵🇹",
  netherlands: "🇳🇱",
  belgium: "🇧🇪",
  croatia: "🇭🇷",
  switzerland: "🇨🇭",
  denmark: "🇩🇰",
  sweden: "🇸🇪",
  norway: "🇳🇴",
  poland: "🇵🇱",
  austria: "🇦🇹",
  turkey: "🇹🇷",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  czechia: "🇨🇿",
  czech: "🇨🇿",
  slovakia: "🇸🇰",
  hungary: "🇭🇺",
  serbia: "🇷🇸",
  ukraine: "🇺🇦",
  russia: "🇷🇺",
  greece: "🇬🇷",
  romania: "🇷🇴",
  bulgaria: "🇧🇬",
  finland: "🇫🇮",
  iceland: "🇮🇸",
  ireland: "🇮🇪",
  argentina: "🇦🇷",
  brazil: "🇧🇷",
  uruguay: "🇺🇾",
  colombia: "🇨🇴",
  chile: "🇨🇱",
  ecuador: "🇪🇨",
  peru: "🇵🇪",
  paraguay: "🇵🇾",
  venezuela: "🇻🇪",
  bolivia: "🇧🇴",
  usa: "🇺🇸",
  unitedstates: "🇺🇸",
  mexico: "🇲🇽",
  canada: "🇨🇦",
  costarica: "🇨🇷",
  panama: "🇵🇦",
  jamaica: "🇯🇲",
  honduras: "🇭🇳",
  curacao: "🇨🇼",
  antigua: "🇦🇬",
  antiguaandbarbuda: "🇦🇬",
  trinidad: "🇹🇹",
  trinidadandtobago: "🇹🇹",
  morocco: "🇲🇦",
  senegal: "🇸🇳",
  egypt: "🇪🇬",
  nigeria: "🇳🇬",
  algeria: "🇩🇿",
  cameroon: "🇨🇲",
  ghana: "🇬🇭",
  ivorycoast: "🇨🇮",
  cotedivoire: "🇨🇮",
  tunisia: "🇹🇳",
  mali: "🇲🇱",
  southafrica: "🇿🇦",
  drcorongo: "🇨🇩",
  congo: "🇨🇬",
};

/**
 * Trích xuất 2 chữ cái viết tắt đại diện cho tên đội bóng / VĐV
 */
export function extractInitials(name?: string | null): string {
  if (!name) return "⚽";
  const clean = cleanSportsText(name);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase() || "⚽";
}

/**
 * Tra cứu logo R2 thông minh đa tầng:
 * 1. Kebab slug (`detroit-pistons`)
 * 2. Canonical compact slug (`detroitpistons`)
 * 3. Token cốt lõi cuối cùng (vd: `pistons`, `hornets`, `celtics`)
 * 4. Mở rộng từ viết tắt (vd: `mu` -> `manchesterunited`)
 */
export function resolveR2Logo(teamName: string, sport?: string): string | null {
  if (!teamName) return null;

  // 1. Tra cứu trực tiếp qua hàm getR2TeamLogoUrl
  const direct = getR2TeamLogoUrl(teamName, sport);
  if (direct) return direct;

  const kebab = toKebabSlug(teamName);
  const canonical = toCanonicalSlug(teamName);
  const tokens = extractCoreTokens(teamName);

  // 2. Thử các prefix phổ biến
  const sports = sport ? [sport.toLowerCase()] : ["football", "basketball", "esports"];

  for (const s of sports) {
    // Kebab match: teams/basketball/detroit-pistons.png
    if (kebab) {
      const urlKebab = getR2AssetUrl(`teams/${s}/${kebab}.png`) || getR2AssetUrl(`teams/${s}/${kebab}.webp`);
      if (urlKebab) return urlKebab;
    }
    // Canonical match: teams/football/manchesterunited.png
    if (canonical) {
      const urlCanonical = getR2AssetUrl(`teams/${s}/${canonical}.png`) || getR2AssetUrl(`teams/${s}/${canonical}.webp`);
      if (urlCanonical) return urlCanonical;
    }
    // Token cuối cùng (VD: "Pistons", "Lakers", "Warriors")
    if (tokens.length > 1) {
      const lastToken = tokens[tokens.length - 1];
      if (lastToken.length >= 4) {
        const urlLast = getR2AssetUrl(`teams/${s}/${lastToken}.png`) || getR2AssetUrl(`teams/${s}/${lastToken}.webp`);
        if (urlLast) return urlLast;
      }
    }
  }

  // 3. Thử mở rộng Acronym
  const compact = cleanSportsText(teamName).replace(/\s+/g, "");
  if (SPORT_ACRONYMS[compact]) {
    const expandedKebab = toKebabSlug(SPORT_ACRONYMS[compact]);
    const expandedCanonical = toCanonicalSlug(SPORT_ACRONYMS[compact]);
    for (const s of sports) {
      const url =
        getR2AssetUrl(`teams/${s}/${expandedKebab}.png`) ||
        getR2AssetUrl(`teams/${s}/${expandedCanonical}.png`);
      if (url) return url;
    }
  }

  return null;
}

/**
 * Kiểm tra xem tên đội có phải là Đội tuyển quốc gia hay không
 */
export function resolveNationalTeam(teamName: string): { name: string; emoji: string } | null {
  if (!teamName) return null;
  const compact = cleanSportsText(teamName).replace(/\s+/g, "");

  // Tra cứu trong nationalTeamAliases.json
  const aliasMap = NATIONAL_TEAM_ALIASES as Record<string, string>;
  const canonicalKey = aliasMap[compact];
  if (canonicalKey && COUNTRY_FLAGS[canonicalKey]) {
    return {
      name: teamName,
      emoji: COUNTRY_FLAGS[canonicalKey],
    };
  }

  // Tra cứu trực tiếp trong COUNTRY_FLAGS
  if (COUNTRY_FLAGS[compact]) {
    return {
      name: teamName,
      emoji: COUNTRY_FLAGS[compact],
    };
  }

  return null;
}

/**
 * Giải quyết toàn diện thông tin định danh & logo của đội (Multi-Tier Resolver)
 */
export function resolveTeamIdentity(
  rawName: string,
  sport?: string,
  providedLogo?: string | null,
): ResolvedTeamIdentity {
  const initials = extractInitials(rawName);

  // 1. Kiểm tra ĐTQG (nếu có cờ emoji)
  const country = resolveNationalTeam(rawName);
  if (country) {
    return {
      name: rawName,
      emoji: country.emoji,
      logo: providedLogo && isValidExternalLogo(providedLogo) ? providedLogo : undefined,
      initials,
      isCountry: true,
    };
  }

  // 2. Tra cứu R2 CDN (O(1))
  const r2Logo = resolveR2Logo(rawName, sport);
  if (r2Logo) {
    return {
      name: rawName,
      logo: r2Logo,
      initials,
      isCountry: false,
    };
  }

  // 3. Sử dụng logo từ nhà đài nếu hợp lệ và không phải ảnh hỏng
  if (providedLogo && isValidExternalLogo(providedLogo)) {
    return {
      name: rawName,
      logo: providedLogo,
      initials,
      isCountry: false,
    };
  }

  // 4. Fallback về monogram initials
  return {
    name: rawName,
    initials,
    isCountry: false,
  };
}

/**
 * Kiểm tra tính hợp lệ của link logo từ nhà đài
 */
function isValidExternalLogo(url?: string | null): boolean {
  if (!url) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  // Bỏ qua các ảnh spacer trong suốt 1x1 hoặc link lỗi
  if (url.includes("1x1") || url.includes("spacer") || url.includes("blank.gif")) return false;
  return true;
}

