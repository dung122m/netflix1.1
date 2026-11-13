import { getTeamAsset, resolveEsportsTeam, normalizeTeamKey } from "@/data/live/teamAssets";
import { getR2TeamLogoUrl } from "@/lib/r2";
import {
  resolveDynamicSportsLogo,
  getCachedLogo,
  setCachedLogo,
} from "@/services/live/dynamicLogoService";
import { cleanSportsText, extractCoreTokens } from "@/lib/sports/teamNormalizer";

export { normalizeTeamKey };

// Service tự động tra cứu, chuẩn hóa và bổ sung Logo/Huy hiệu (Crest/Badge) cho các đội bóng đá
// Hỗ trợ: Static Dictionary (0ms), TheSportsDB API (Dynamic HD Badges), In-memory LRU cache

export const LOGO_CACHE = new Map<string, string>();

/**
 * Tự động chuyển đổi logo ESPN sang phiên bản Dark Mode (nền trắng / độ tương phản cao)
 * Áp dụng cho các CLB có logo đơn sắc tối màu (Tottenham, Juventus, Newcastle, Besiktas...)
 */
export function toDarkModeLogoUrl(url?: string | null): string {
  if (!url) return "";
  if (url.includes("/teamlogos/soccer/500/")) {
    const darkIds = ["367", "111", "361", "433", "370", "398", "358", "338", "373"];
    for (const id of darkIds) {
      if (url.includes(`/500/${id}.png`)) {
        return url.replace(`/500/${id}.png`, `/500-dark/${id}.png`);
      }
    }
  }
  if (url.includes("/teamlogos/nba/500/sa.png")) {
    return url.replace("/500/sa.png", "/500-dark/sa.png");
  }
  return url;
}

// In-memory runtime cache cho các logo đã phân giải thành công (0ms lookup)
export const STATIC_CLUB_LOGOS: Record<string, string> = {};

const DISCRIMINATIVE_WORDS = new Set([
  "city", "united", "utd", "wednesday", "rovers", "wanderers", "albion",
  "town", "athletic", "county", "forest", "hotspur", "villa", "palace",
  "inter", "milan", "real", "atletico", "sporting", "borussia",
  "north", "south", "east", "west", "central"
]);

function extractTokens(name: string): string[] {
  return cleanSportsText(name).split(/\s+/).filter(Boolean);
}

export function isTeamIdentityMatch(
  queriedTeam: string,
  apiTeam: { strTeam?: string; strTeamShort?: string; strAlternate?: string },
): boolean {
  if (!queriedTeam || !apiTeam || !apiTeam.strTeam) return false;

  const qKey = normalizeTeamKey(queriedTeam);
  const teamKey = normalizeTeamKey(apiTeam.strTeam);
  const altKey = apiTeam.strAlternate ? normalizeTeamKey(apiTeam.strAlternate) : "";
  const shortKey = apiTeam.strTeamShort ? normalizeTeamKey(apiTeam.strTeamShort) : "";

  // 1. Khớp chính xác hoàn toàn trên key đã chuẩn hóa hoặc alias chính thức
  if (qKey && (qKey === teamKey || (altKey && qKey === altKey) || (shortKey && qKey === shortKey))) {
    return true;
  }

  const qTokens = extractTokens(queriedTeam);
  const apiTokens = extractTokens(apiTeam.strTeam);

  // 2. Chống nhầm CLB có số phân biệt (ví dụ Manchester 62 vs Manchester City, Hannover 96, Schalke 04)
  const qNumbers = qTokens.filter((t) => /^\d+$/.test(t));
  const apiNumbers = apiTokens.filter((t) => /^\d+$/.test(t));
  if (qNumbers.length !== apiNumbers.length || !qNumbers.every((n) => apiNumbers.includes(n))) {
    return false;
  }

  // 3. Chống nhầm giữa các CLB cùng thành phố / vùng qua từ phân biệt cốt lõi (City, United, Wednesday, Rovers, Wanderers...)
  const STRICT_DISCRIMINATIVE = new Set([
    "city", "united", "utd", "wednesday", "rovers", "wanderers", "albion", "town"
  ]);
  const qStrict = qTokens.filter((t) => STRICT_DISCRIMINATIVE.has(t));
  const apiStrict = apiTokens.filter((t) => STRICT_DISCRIMINATIVE.has(t));
  if (qStrict.length !== apiStrict.length) {
    return false;
  }
  if (!qStrict.every((w) => apiStrict.includes(w))) {
    return false;
  }

  // 4. Nếu cả hai có từ phân biệt mở rộng mà khác nhau -> từ chối (Real vs Atletico, Inter vs Milan)
  const qDisc = qTokens.filter((t) => DISCRIMINATIVE_WORDS.has(t));
  const apiDisc = apiTokens.filter((t) => DISCRIMINATIVE_WORDS.has(t));
  if (qDisc.length > 0 && apiDisc.length > 0 && !qDisc.some((d) => apiDisc.includes(d))) {
    return false;
  }

  // 5. Kiểm tra token cốt lõi: không được nhận bừa chỉ vì trùng 1 token thành phố (như "manchester")
  const qCore = extractCoreTokens(queriedTeam);
  const apiCore = extractCoreTokens(apiTeam.strTeam);
  if (qCore.length === 0 || apiCore.length === 0) return false;

  const shared = qCore.filter((t) => apiCore.includes(t));
  if (qCore.length > 1 || apiCore.length > 1) {
    if (shared.length < Math.min(qCore.length, apiCore.length)) {
      return false;
    }
  }

  return shared.length > 0;
}

/**
 * Tra cứu và trả về link Huy hiệu/Logo CLB chất lượng cao
 */
export async function resolveTeamLogo(teamName: string, sport?: string): Promise<string> {
  // 0. Tra cứu logo đội tuyển Esports chính thức (0ms)
  const esp = resolveEsportsTeam(teamName);
  if (esp?.logo) {
    const key = normalizeTeamKey(teamName);
    if (key) STATIC_CLUB_LOGOS[key] = esp.logo;
    return esp.logo;
  }
  if (!teamName) return "";
  const key = normalizeTeamKey(teamName);
  if (!key) return "";

  // 1. Kiểm tra cache RAM đã phân giải trước đó (0ms)
  if (STATIC_CLUB_LOGOS[key]) return STATIC_CLUB_LOGOS[key];

  // 2. Tra cứu curated TeamAsset từ teamAssets.ts (0ms O(1))
  const asset = getTeamAsset(teamName, sport);
  if (asset && asset.logo) {
    STATIC_CLUB_LOGOS[key] = asset.logo;
    return asset.logo;
  }

  // 3. Tra cứu từ Cloudflare R2 Manifest (0ms O(1))
  const r2Logo = getR2TeamLogoUrl(teamName, sport);
  if (r2Logo) {
    STATIC_CLUB_LOGOS[key] = r2Logo;
    return r2Logo;
  }

  // 3. Kiểm tra in-memory cache
  if (LOGO_CACHE.has(key)) return LOGO_CACHE.get(key) || "";
  const dynamicCached = getCachedLogo(`${sport || "all"}:${key}`);
  if (dynamicCached !== null) return dynamicCached;

  // 4. Nếu là môn Basketball, Esports hoặc Tennis -> ưu tiên Dynamic Resolver
  const s = (sport || "").toLowerCase();
  if (s === "basketball" || s === "esports" || s === "tennis") {
    const dynamicLogo = await resolveDynamicSportsLogo(teamName, sport);
    LOGO_CACHE.set(key, dynamicLogo);
    return dynamicLogo;
  }

  // 5. Thử tìm kiếm bóng đá qua TheSportsDB API
  const clean = teamName
    .replace(/^CLB\s+/i, "")
    .replace(/^FC\s+/i, "")
    .replace(/^S\.S\.C\.\s+/i, "")
    .replace(/^SSC\s+/i, "")
    .replace(/^VfB\s+/i, "")
    .replace(/^AC\s+/i, "")
    .replace(/^AS\s+/i, "")
    .replace(/^RC\s+/i, "")
    .replace(/^CSD\s+/i, "")
    .replace(/^Deportes\s+/i, "")
    .replace(/^Municipal\s+/i, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+(FC|CLB|FK|SC|CF)$/i, "")
    .trim();

  const queries = Array.from(
    new Set([
      clean,
      clean.replace(/-/g, " "),
      clean.replace(/^Saint\s+/i, "St "),
      clean.replace(/^St\s+/i, "Saint "),
      teamName,
    ])
  ).filter(Boolean);

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(1800),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.teams)) {
          for (const t of data.teams) {
            if (t?.strBadge && isTeamIdentityMatch(teamName, t)) {
              LOGO_CACHE.set(key, t.strBadge);
              setCachedLogo(`${sport || "all"}:${key}`, t.strBadge);
              return t.strBadge;
            }
          }
        }
      }
    } catch {
      // Timeout hoặc network error -> tiếp tục
    }
  }

  // 6. Fallback cuối cùng: Wikimedia dynamic lookup
  const dynamicFallback = await resolveDynamicSportsLogo(teamName, sport);
  LOGO_CACHE.set(key, dynamicFallback);
  return dynamicFallback;
}

/**
 * Phục hồi logo 0ms từ static dictionary & dynamic cache (Hoàn toàn đồng bộ, không bao giờ block critical path)
 */
export function enrichMatchLogosSync<
  T extends { team1: string; team2: string; homeLogo?: string; awayLogo?: string; sport?: string }
>(matches: T[]): T[] {
  for (const m of matches) {
    const s = m.sport || "all";
    if (m.team1 && (!m.homeLogo || m.homeLogo.includes("tinhlagi.pro/logo.jpg"))) {
      const esp = resolveEsportsTeam(m.team1);
      if (esp?.logo) {
        m.homeLogo = esp.logo;
      } else {
        const asset = getTeamAsset(m.team1);
        if (asset?.logo) {
          m.homeLogo = asset.logo;
        } else {
          const r2Logo = getR2TeamLogoUrl(m.team1, m.sport);
          if (r2Logo) {
            m.homeLogo = r2Logo;
          } else {
            const key = normalizeTeamKey(m.team1);
            if (key && STATIC_CLUB_LOGOS[key]) {
              m.homeLogo = STATIC_CLUB_LOGOS[key];
            } else if (key) {
              const cached = getCachedLogo(`${s}:${key}`) ?? LOGO_CACHE.get(key);
              if (cached) m.homeLogo = cached;
            }
          }
        }
      }
    }
    if (m.team2 && (!m.awayLogo || m.awayLogo.includes("tinhlagi.pro/logo.jpg"))) {
      const esp = resolveEsportsTeam(m.team2);
      if (esp?.logo) {
        m.awayLogo = esp.logo;
      } else {
        const asset = getTeamAsset(m.team2);
        if (asset?.logo) {
          m.awayLogo = asset.logo;
        } else {
          const r2Logo = getR2TeamLogoUrl(m.team2, m.sport);
          if (r2Logo) {
            m.awayLogo = r2Logo;
          } else {
            const key = normalizeTeamKey(m.team2);
            if (key && STATIC_CLUB_LOGOS[key]) {
              m.awayLogo = STATIC_CLUB_LOGOS[key];
            } else if (key) {
              const cached = getCachedLogo(`${s}:${key}`) ?? LOGO_CACHE.get(key);
              if (cached) m.awayLogo = cached;
            }
          }
        }
      }
    }
  }
  return matches;
}

/**
 * Bổ sung logo tĩnh nhanh 0ms mà KHÔNG chạy Auto Harvester ngầm
 */
export function triggerBackgroundLogoEnrichment<
  T extends { team1: string; team2: string; homeLogo?: string; awayLogo?: string; sport?: string }
>(matches: T[]): void {
  enrichMatchLogosSync(matches);
}

/**
 * Bổ sung logo cho tất cả các trận đấu từ Static Dictionary & R2 CDN (0ms thuần túy)
 */
export async function enrichMatchLogos<
  T extends { team1: string; team2: string; homeLogo?: string; awayLogo?: string; sport?: string }
>(matches: T[]): Promise<T[]> {
  return enrichMatchLogosSync(matches);
}
