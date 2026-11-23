import { getTeamAsset, resolveEsportsTeam, normalizeTeamKey } from "@/data/live/teamAssets";
import { getR2TeamLogoUrl } from "@/lib/r2";
import { cleanSportsText, extractCoreTokens } from "./teamNormalizer";
import { cacheService } from "@/lib/cache";

export { normalizeTeamKey };

// ============================================================================
// 1. UNIFIED IN-MEMORY CACHE & DATA TYPES
// ============================================================================

export interface CachedLogoEntry {
  url: string;
  expiresAt: number;
}

export const POSITIVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
export const NEGATIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;      // 6 giờ

// Bộ nhớ đệm L1 RAM duy nhất cho toàn bộ logo thể thao (bóng đá, bóng rổ, esports, tennis)
export const DYNAMIC_LOGO_CACHE = new Map<string, CachedLogoEntry>();

// Map tương thích ngược cho unit test và tra cứu 0ms
export const LOGO_CACHE = new Map<string, string>();
export const STATIC_CLUB_LOGOS: Record<string, string> = {};

export function getCachedLogo(key: string): string | null {
  const entry = DYNAMIC_LOGO_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    DYNAMIC_LOGO_CACHE.delete(key);
    return null;
  }
  return entry.url;
}

export function setCachedLogo(key: string, url: string, isNegative = false): void {
  const ttl = isNegative || !url ? NEGATIVE_CACHE_TTL_MS : POSITIVE_CACHE_TTL_MS;
  const entry: CachedLogoEntry = {
    url: url || "",
    expiresAt: Date.now() + ttl,
  };
  DYNAMIC_LOGO_CACHE.set(key, entry);
  if (url) {
    LOGO_CACHE.set(key, url);
  }
}

/**
 * Chuẩn hóa chuỗi tra cứu (bỏ dấu tiếng Việt, ký tự đặc biệt, chuyển chữ thường)
 */
export function normalizeEntityKey(name?: string | null): string {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Tự động chuyển đổi logo ESPN sang phiên bản Dark Mode (nền trắng / tương phản cao)
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

// ============================================================================
// 2. SO KHỚP DANH TÍNH ĐỘI BÓNG ĐÁ (THESPORTSDB IDENTITY MATCHING)
// ============================================================================

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

  if (qKey && (qKey === teamKey || (altKey && qKey === altKey) || (shortKey && qKey === shortKey))) {
    return true;
  }

  const qTokens = extractTokens(queriedTeam);
  const apiTokens = extractTokens(apiTeam.strTeam);

  const qNumbers = qTokens.filter((t) => /^\d+$/.test(t));
  const apiNumbers = apiTokens.filter((t) => /^\d+$/.test(t));
  if (qNumbers.length !== apiNumbers.length || !qNumbers.every((n) => apiNumbers.includes(n))) {
    return false;
  }

  const STRICT_DISCRIMINATIVE = new Set([
    "city", "united", "utd", "wednesday", "rovers", "wanderers", "albion", "town"
  ]);
  const qStrict = qTokens.filter((t) => STRICT_DISCRIMINATIVE.has(t));
  const apiStrict = apiTokens.filter((t) => STRICT_DISCRIMINATIVE.has(t));
  if (qStrict.length !== apiStrict.length || !qStrict.every((w) => apiStrict.includes(w))) {
    return false;
  }

  const qDisc = qTokens.filter((t) => DISCRIMINATIVE_WORDS.has(t));
  const apiDisc = apiTokens.filter((t) => DISCRIMINATIVE_WORDS.has(t));
  if (qDisc.length > 0 && apiDisc.length > 0 && !qDisc.some((d) => apiDisc.includes(d))) {
    return false;
  }

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

// ============================================================================
// 3. BASKETBALL RESOLVER (ESPN API & CDN)
// ============================================================================

interface EspnTeamRecord {
  id: string;
  name: string;
  displayName: string;
  shortDisplayName: string;
  abbreviation: string;
  nickname?: string;
  logo: string;
  searchTokens: Set<string>;
}

let espnBasketballIndex: EspnTeamRecord[] | null = null;
let espnIndexLoadingPromise: Promise<EspnTeamRecord[]> | null = null;

async function loadEspnBasketballIndex(): Promise<EspnTeamRecord[]> {
  if (espnBasketballIndex) return espnBasketballIndex;
  if (espnIndexLoadingPromise) return espnIndexLoadingPromise;

  espnIndexLoadingPromise = (async () => {
    const nbaRecords: EspnTeamRecord[] = [];
    const ncaaRecords: EspnTeamRecord[] = [];

    async function fetchEspnTeams(url: string, targetArr: EspnTeamRecord[], isNba = false) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
        if (!res.ok) return;
        const data = await res.json();
        const teams = data.sports?.[0]?.leagues?.[0]?.teams || [];
        for (const item of teams) {
          const t = item.team;
          if (!t?.displayName || !t?.logos?.[0]?.href) continue;
          let logoUrl = t.logos[0].href;
          if (isNba && logoUrl.includes("/teamlogos/nba/500/sa.png")) {
            logoUrl = logoUrl.replace("/500/sa.png", "/500-dark/sa.png");
          }
          const tokens = new Set<string>();
          for (const field of [t.name, t.displayName, t.shortDisplayName, t.abbreviation, t.nickname]) {
            if (field) {
              const norm = normalizeEntityKey(field);
              if (norm) tokens.add(norm);
            }
          }
          targetArr.push({
            id: t.id,
            name: t.name || "",
            displayName: t.displayName || "",
            shortDisplayName: t.shortDisplayName || "",
            abbreviation: t.abbreviation || "",
            nickname: t.nickname,
            logo: logoUrl,
            searchTokens: tokens,
          });
        }
      } catch {
        // Bỏ qua lỗi mạng
      }
    }

    await Promise.allSettled([
      fetchEspnTeams("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=100", nbaRecords, true),
      fetchEspnTeams("https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=350", ncaaRecords, false),
    ]);

    espnBasketballIndex = [...nbaRecords, ...ncaaRecords];
    return espnBasketballIndex;
  })();

  return espnIndexLoadingPromise;
}

export async function resolveBasketballTeamLogo(teamName: string): Promise<string> {
  const normKey = normalizeEntityKey(teamName);
  if (!normKey) return "";

  const cached = getCachedLogo(`basketball:${normKey}`);
  if (cached !== null) return cached;

  const index = await loadEspnBasketballIndex();

  for (const t of index) {
    if (t.searchTokens.has(normKey)) {
      setCachedLogo(`basketball:${normKey}`, t.logo);
      return t.logo;
    }
  }

  if (normKey.length >= 4) {
    for (const t of index) {
      const displayKey = normalizeEntityKey(t.displayName);
      const nameKey = normalizeEntityKey(t.name);
      if (
        (displayKey.length >= 4 && (displayKey === normKey || displayKey.startsWith(normKey) || normKey.startsWith(displayKey))) ||
        (nameKey.length >= 4 && (nameKey === normKey || nameKey.startsWith(normKey) || normKey.startsWith(nameKey)))
      ) {
        setCachedLogo(`basketball:${normKey}`, t.logo);
        return t.logo;
      }
    }
  }

  const wikiLogo = await searchWikimediaStrict(teamName, "basketball");
  setCachedLogo(`basketball:${normKey}`, wikiLogo, !wikiLogo);
  return wikiLogo;
}

// ============================================================================
// 4. WIKIMEDIA VERIFIED RESOLVER (ESPORTS, TENNIS, GENERAL)
// ============================================================================

const DISALLOWED_WIKI_KEYWORDS = [
  "(gamer)", "(player)", "interview", "roster", "season",
  "tournament", "championships –", "stadium", "arena", "streamer",
];

const ALLOWED_IMAGE_INDICATORS = [
  "logo", "crest", "badge", "emblem", "shield", "wordmark", "insignia", ".svg",
];

const DISALLOWED_IMAGE_KEYWORDS = [
  "ambox", "pictogram", "emojione", "cruz_roja", "commons-logo",
  "wikinews", "question_book", "edit-clear", "symbol_",
];

function isLikelyLogoImage(url?: string, filename?: string): boolean {
  if (!url) return false;
  const combined = `${url} ${filename || ""}`.toLowerCase();
  if (DISALLOWED_IMAGE_KEYWORDS.some((kw) => combined.includes(kw))) {
    return false;
  }
  return ALLOWED_IMAGE_INDICATORS.some((ind) => combined.includes(ind));
}

function isDisallowedPage(title = "", desc = "", category?: string): boolean {
  const combined = `${title} ${desc}`.toLowerCase();
  for (const kw of DISALLOWED_WIKI_KEYWORDS) {
    if (category === "tennis" && (kw === "tournament" || kw === "championships –")) continue;
    if (combined.includes(kw)) return true;
  }
  return false;
}

function verifyStrictIdentityMatch(target: string, resultTitle: string): boolean {
  const normTarget = normalizeEntityKey(target);
  const normResult = normalizeEntityKey(resultTitle);
  if (!normTarget || !normResult) return false;

  if (normTarget === normResult) return true;

  if (normResult.startsWith(normTarget) || normTarget.startsWith(normResult)) {
    const diff = Math.abs(normTarget.length - normResult.length);
    if (diff <= 8) return true;
  }

  return false;
}

async function fetchImageInfoThumbnail(fileName: string): Promise<string> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": "NanaflixSportsBot/1.0 (sports-logo@nanaflix.app)" },
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const pages = data.query?.pages ? Object.values(data.query.pages) : [];
    interface WikiPageImageInfo {
      imageinfo?: Array<{ thumburl?: string; url?: string }>;
    }
    const info = (pages[0] as WikiPageImageInfo | undefined)?.imageinfo?.[0];
    return info?.thumburl || info?.url || "";
  } catch {
    return "";
  }
}

async function searchWikimediaStrict(
  entityName: string,
  category: "esports" | "basketball" | "tennis" | "general"
): Promise<string> {
  const cleanName = entityName
    .replace(/^CLB\s+/i, "")
    .replace(/^Team\s+/i, "")
    .replace(/\s+(Esports|Gaming|Team|Club|FC|LCK|LPL|VCS)$/i, "")
    .trim();

  const directTitles = [
    cleanName.replace(/\s+/g, "_") + (category === "esports" ? "_(esports)" : ""),
    cleanName.replace(/\s+/g, "_"),
    entityName.replace(/\s+/g, "_"),
  ];

  if (category === "tennis") {
    if (/roland[- ]?garros/i.test(entityName)) {
      directTitles.unshift("French_Open", "Roland_Garros");
    } else if (/wimbledon/i.test(entityName)) {
      directTitles.unshift("Wimbledon_Championships", "The_Championships,_Wimbledon");
    } else if (/us[- ]?open/i.test(entityName)) {
      directTitles.unshift("US_Open_(tennis)");
    } else if (/australian[- ]?open/i.test(entityName)) {
      directTitles.unshift("Australian_Open");
    } else if (/atp/i.test(entityName)) {
      directTitles.unshift("ATP_Tour");
    } else if (/wta/i.test(entityName)) {
      directTitles.unshift("WTA_Tour");
    }
  }

  for (const title of directTitles) {
    try {
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
      const res = await fetch(summaryUrl, {
        headers: { "User-Agent": "NanaflixSportsBot/1.0 (sports-logo@nanaflix.app)" },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const d = await res.json();
        const imgUrl = d.thumbnail?.source || d.originalimage?.source;
        if (imgUrl && isLikelyLogoImage(imgUrl, d.title) && !isDisallowedPage(d.title, d.description, category)) {
          if (verifyStrictIdentityMatch(cleanName, d.title) || category === "tennis") {
            return imgUrl;
          }
        }
      }
    } catch {
      // Tiếp tục
    }
  }

  for (const title of directTitles.slice(0, 2)) {
    try {
      const imgListUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=images&format=json`;
      const res = await fetch(imgListUrl, {
        headers: { "User-Agent": "NanaflixSportsBot/1.0 (sports-logo@nanaflix.app)" },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        const pages = data.query?.pages ? Object.values(data.query.pages) : [];
        interface WikiPageImages {
          images?: Array<{ title: string }>;
        }
        const images: Array<{ title: string }> = (pages[0] as WikiPageImages | undefined)?.images || [];
        for (const img of images) {
          const fileTitle = img.title || "";
          const lowerFile = fileTitle.toLowerCase();
          if (
            isLikelyLogoImage(fileTitle, fileTitle) &&
            (lowerFile.includes("logo") || lowerFile.includes("crest") || lowerFile.includes("emblem")) &&
            !DISALLOWED_IMAGE_KEYWORDS.some((kw) => lowerFile.includes(kw))
          ) {
            const thumb = await fetchImageInfoThumbnail(fileTitle);
            if (thumb) return thumb;
          }
        }
      }
    } catch {
      // Bỏ qua
    }
  }

  const searchQuery = `${cleanName}${category === "esports" ? " esports team" : category === "tennis" ? " tennis tournament" : ""}`;
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(
    searchQuery
  )}&gsrlimit=5&prop=pageimages|description&pithumbsize=400`;

  try {
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "NanaflixSportsBot/1.0 (sports-logo@nanaflix.app)" },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages ? Object.values(data.query.pages) : [];
      interface WikiSearchResultPage {
        title?: string;
        description?: string;
        pageimage?: string;
        thumbnail?: { source?: string };
        index?: number;
      }
      pages.sort((a, b) => {
        const pageA = a as WikiSearchResultPage;
        const pageB = b as WikiSearchResultPage;
        return (pageA.index || 99) - (pageB.index || 99);
      });

      for (const p of pages as WikiSearchResultPage[]) {
        if (!p.title || isDisallowedPage(p.title, p.description, category)) continue;
        const img = p.thumbnail?.source;
        if (img && isLikelyLogoImage(img, p.pageimage || p.title)) {
          if (verifyStrictIdentityMatch(cleanName, p.title)) {
            return img;
          }
        }
      }
    }
  } catch {
    // Timeout
  }

  return "";
}

export async function resolveEsportsTeamLogo(teamName: string): Promise<string> {
  const normKey = normalizeEntityKey(teamName);
  if (!normKey) return "";

  const cached = getCachedLogo(`esports:${normKey}`);
  if (cached !== null) return cached;

  const logo = await searchWikimediaStrict(teamName, "esports");
  setCachedLogo(`esports:${normKey}`, logo, !logo);
  return logo;
}

export async function resolveTennisEntityLogo(entityName: string): Promise<string> {
  const normKey = normalizeEntityKey(entityName);
  if (!normKey) return "";

  const cached = getCachedLogo(`tennis:${normKey}`);
  if (cached !== null) return cached;

  const logo = await searchWikimediaStrict(entityName, "tennis");
  setCachedLogo(`tennis:${normKey}`, logo, !logo);
  return logo;
}

const IN_FLIGHT_FETCHES = new Map<string, Promise<string>>();

export async function resolveDynamicSportsLogo(name: string, sport?: string): Promise<string> {
  if (!name || !name.trim()) return "";
  const key = `${sport || "all"}:${normalizeEntityKey(name)}`;

  const cached = getCachedLogo(key);
  if (cached !== null) return cached;

  const redisKey = `live:logo:${key}`;
  try {
    const redisHit = await cacheService.get<string>(redisKey);
    if (typeof redisHit === "string") {
      setCachedLogo(key, redisHit, !redisHit);
      return redisHit;
    }
  } catch {
    // Graceful fallback
  }

  if (IN_FLIGHT_FETCHES.has(key)) {
    return IN_FLIGHT_FETCHES.get(key)!;
  }

  const fetchPromise = (async () => {
    try {
      const s = (sport || "").toLowerCase();
      let result = "";

      if (s === "basketball") {
        result = await resolveBasketballTeamLogo(name);
      } else if (s === "esports") {
        result = await resolveEsportsTeamLogo(name);
      } else if (s === "tennis") {
        result = await resolveTennisEntityLogo(name);
      } else {
        result = await searchWikimediaStrict(name, "general");
      }

      setCachedLogo(key, result, !result);
      const ttl = result ? 7 * 86400 : 3600;
      cacheService.set(redisKey, result, ttl).catch(() => {});
      return result;
    } catch {
      setCachedLogo(key, "", true);
      cacheService.set(redisKey, "", 3600).catch(() => {});
      return "";
    } finally {
      IN_FLIGHT_FETCHES.delete(key);
    }
  })();

  IN_FLIGHT_FETCHES.set(key, fetchPromise);
  return fetchPromise;
}

// ============================================================================
// 5. UNIFIED DISPATCHER: resolveTeamLogo & enrichMatchLogosSync
// ============================================================================

/**
 * Cổng phân giải Logo duy nhất (Unified Resolver) cho toàn bộ nền tảng thể thao Nanaflix.
 * Tầng 1: Esports curated check (0ms)
 * Tầng 2: RAM caches L1 (0ms)
 * Tầng 3: Curated team assets & R2 CDN (0ms)
 * Tầng 4: Dynamic APIs (ESPN, TheSportsDB, Wikimedia)
 */
export async function resolveTeamLogo(teamName: string, sport?: string): Promise<string> {
  if (!teamName) return "";

  // 1. Tra cứu logo Esports curated (0ms)
  const esp = resolveEsportsTeam(teamName);
  if (esp?.logo) {
    const key = normalizeTeamKey(teamName);
    if (key) {
      STATIC_CLUB_LOGOS[key] = esp.logo;
      setCachedLogo(`${sport || "all"}:${key}`, esp.logo);
    }
    return esp.logo;
  }

  const key = normalizeTeamKey(teamName);
  if (!key) return "";

  // 2. Tra cứu RAM cache L1 (0ms)
  if (STATIC_CLUB_LOGOS[key]) {
    setCachedLogo(`${sport || "all"}:${key}`, STATIC_CLUB_LOGOS[key]);
    return STATIC_CLUB_LOGOS[key];
  }

  // 3. Tra cứu curated TeamAsset từ teamAssets.ts (0ms O(1))
  const asset = getTeamAsset(teamName, sport);
  if (asset?.logo) {
    STATIC_CLUB_LOGOS[key] = asset.logo;
    setCachedLogo(`${sport || "all"}:${key}`, asset.logo);
    return asset.logo;
  }

  // 4. Tra cứu từ Cloudflare R2 Manifest (0ms O(1))
  const r2Logo = getR2TeamLogoUrl(teamName, sport);
  if (r2Logo) {
    STATIC_CLUB_LOGOS[key] = r2Logo;
    setCachedLogo(`${sport || "all"}:${key}`, r2Logo);
    return r2Logo;
  }

  // 5. Kiểm tra in-memory cache
  if (LOGO_CACHE.has(key)) return LOGO_CACHE.get(key) || "";
  const dynamicCached = getCachedLogo(`${sport || "all"}:${key}`);
  if (dynamicCached !== null) return dynamicCached;

  // 6. Basketball, Esports hoặc Tennis -> Dynamic Resolver
  const s = (sport || "").toLowerCase();
  if (s === "basketball" || s === "esports" || s === "tennis") {
    const dynamicLogo = await resolveDynamicSportsLogo(teamName, sport);
    LOGO_CACHE.set(key, dynamicLogo);
    setCachedLogo(`${sport || "all"}:${key}`, dynamicLogo);
    return dynamicLogo;
  }

  // 7. Thử tìm kiếm bóng đá qua TheSportsDB API
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
      // Timeout -> tiếp tục
    }
  }

  // 8. Fallback cuối cùng: Wikimedia lookup
  const dynamicFallback = await resolveDynamicSportsLogo(teamName, sport);
  LOGO_CACHE.set(key, dynamicFallback);
  return dynamicFallback;
}

/**
 * Phục hồi logo 0ms đồng bộ từ static dictionary & dynamic cache mà không block critical path.
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

export function triggerBackgroundLogoEnrichment<
  T extends { team1: string; team2: string; homeLogo?: string; awayLogo?: string; sport?: string }
>(matches: T[]): void {
  enrichMatchLogosSync(matches);
}

export async function enrichMatchLogos<
  T extends { team1: string; team2: string; homeLogo?: string; awayLogo?: string; sport?: string }
>(matches: T[]): Promise<T[]> {
  return enrichMatchLogosSync(matches);
}
