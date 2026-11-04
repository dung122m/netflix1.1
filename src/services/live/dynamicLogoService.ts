/**
 * DYNAMIC REAL SPORTS LOGO SERVICE — NANAFLIX
 * 
 * Cung cấp cơ chế tìm kiếm, ánh xạ và cache logo thật động cho mọi đội tuyển / CLB / giải đấu:
 * 1. Basketball: ESPN Open API & CDN (NBA + NCAA + WNBA 500x500 HD PNGs)
 * 2. Esports: Wikimedia / Wikipedia PageImages API (Official SVG/PNG logos với kiểm duyệt danh tính nghiêm ngặt)
 * 3. Tennis: Wikimedia Official Badges (Grand Slams, ATP, WTA)
 * 
 * Đặc tính:
 * - Không hardcode: Tự động tra cứu đội mới xuất hiện trong feed
 * - Cache bộ nhớ TTL: 7 ngày cho kết quả thành công, 6 giờ cho negative cache
 * - Chống duplicate in-flight requests (ghép nhiều request trùng tên vào 1 Promise)
 * - Timeout an toàn (2500ms), không block SSR critical path
 * - Fallback trung tính (trả về "" khi không tự tin, tuyệt đối không gán nhầm đội khác)
 */

export interface CachedLogoEntry {
  url: string;
  expiresAt: number;
}

// In-memory cache với TTL
export const DYNAMIC_LOGO_CACHE = new Map<string, CachedLogoEntry>();

// In-flight promises để deduplicate các request đồng thời
const IN_FLIGHT_FETCHES = new Map<string, Promise<string>>();

const POSITIVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
const NEGATIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;      // 6 giờ

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
  DYNAMIC_LOGO_CACHE.set(key, {
    url: url || "",
    expiresAt: Date.now() + ttl,
  });
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

// ============================================================================
// 1. BASKETBALL RESOLVER (ESPN OPEN API & CDN)
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
        // Bỏ qua lỗi mạng từ 1 endpoint
      }
    }

    await Promise.allSettled([
      fetchEspnTeams("https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=100", nbaRecords, true),
      fetchEspnTeams("https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?limit=350", ncaaRecords, false),
    ]);

    // Luôn ưu tiên toàn bộ CLB NBA chuyên nghiệp trước các trường NCAA
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

  // 1. Match chính xác trên toàn bộ tokens (name, displayName, abbreviation, shortDisplayName)
  for (const t of index) {
    if (t.searchTokens.has(normKey)) {
      setCachedLogo(`basketball:${normKey}`, t.logo);
      return t.logo;
    }
  }

  // 2. Chống nhầm "la" với Clippers / Lakers: chỉ xét khi độ dài token từ 4 ký tự trở lên
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

  // 3. Fallback sang Wikimedia nếu là đội ngoài hệ thống ESPN (VBA, EuroLeague...)
  const wikiLogo = await searchWikimediaStrict(teamName, "basketball");
  setCachedLogo(`basketball:${normKey}`, wikiLogo, !wikiLogo);
  return wikiLogo;
}

// ============================================================================
// 2. ESPORTS RESOLVER (WIKIMEDIA STRICT VERIFICATION)
// ============================================================================

const DISALLOWED_WIKI_KEYWORDS = [
  "(gamer)",
  "(player)",
  "interview",
  "roster",
  "season",
  "tournament",
  "championships –",
  "stadium",
  "arena",
  "streamer",
];

const ALLOWED_IMAGE_INDICATORS = [
  "logo",
  "crest",
  "badge",
  "emblem",
  "shield",
  "wordmark",
  "insignia",
  ".svg",
];

const DISALLOWED_IMAGE_KEYWORDS = [
  "ambox",
  "pictogram",
  "emojione",
  "cruz_roja",
  "commons-logo",
  "wikinews",
  "question_book",
  "edit-clear",
  "symbol_",
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
    // Nếu đang tìm giải Tennis thì cho phép từ 'tournament'
    if (category === "tennis" && (kw === "tournament" || kw === "championships –")) continue;
    if (combined.includes(kw)) return true;
  }
  return false;
}

function verifyStrictIdentityMatch(target: string, resultTitle: string): boolean {
  const normTarget = normalizeEntityKey(target);
  const normResult = normalizeEntityKey(resultTitle);
  if (!normTarget || !normResult) return false;

  // Exact match
  if (normTarget === normResult) return true;

  // Ví dụ: "t1" vs "t1esports", "sentinels" vs "sentinelsesports"
  if (normResult.startsWith(normTarget) || normTarget.startsWith(normResult)) {
    const diff = Math.abs(normTarget.length - normResult.length);
    // Độ chênh lệch chấp nhận được nếu là hậu tố "esports" / "team" / "gaming"
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

async function searchWikimediaStrict(entityName: string, category: "esports" | "basketball" | "tennis" | "general"): Promise<string> {
  const cleanName = entityName
    .replace(/^CLB\s+/i, "")
    .replace(/^Team\s+/i, "")
    .replace(/\s+(Esports|Gaming|Team|Club|FC|LCK|LPL|VCS)$/i, "")
    .trim();

  // 1. Thử truy xuất trực tiếp Wikipedia Summary API theo các định dạng title chuẩn
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
      // Tiếp tục thử title khác
    }
  }

  // 1b. Nếu summary không có thumbnail trực tiếp, kiểm tra danh sách images trong trang
  for (const title of directTitles.slice(0, 2)) {
    try {
      const imgListUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
        title
      )}&prop=images&format=json`;
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
          // Phải thực sự là file logo/crest/badge mang tên CLB hoặc chứa chữ logo
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

  // 2. Fallback sang Wikimedia Generator Search API với bộ lọc nghiêm ngặt
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
      // Sắp xếp theo mức độ phù hợp của index tìm kiếm
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
    // Timeout hoặc lỗi kết nối
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

// ============================================================================
// 3. TENNIS RESOLVER (WIKIMEDIA OFFICIAL TOURNAMENTS & BADGES)
// ============================================================================

export async function resolveTennisEntityLogo(entityName: string): Promise<string> {
  const normKey = normalizeEntityKey(entityName);
  if (!normKey) return "";

  const cached = getCachedLogo(`tennis:${normKey}`);
  if (cached !== null) return cached;

  const logo = await searchWikimediaStrict(entityName, "tennis");
  setCachedLogo(`tennis:${normKey}`, logo, !logo);
  return logo;
}

// ============================================================================
// 4. MAIN DYNAMIC DISPATCHER
// ============================================================================

export async function resolveDynamicSportsLogo(name: string, sport?: string): Promise<string> {
  if (!name || !name.trim()) return "";
  const key = `${sport || "all"}:${normalizeEntityKey(name)}`;

  // 1. Kiểm tra cache tức thì (0ms)
  const cached = getCachedLogo(key);
  if (cached !== null) return cached;

  // 2. Ghép vào Promise in-flight nếu đang có request trùng tên chạy đồng thời
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
        // Môn chung hoặc thể thao khác: tìm kiếm có kiểm soát
        result = await searchWikimediaStrict(name, "general");
      }

      setCachedLogo(key, result, !result);
      return result;
    } catch {
      setCachedLogo(key, "", true);
      return "";
    } finally {
      IN_FLIGHT_FETCHES.delete(key);
    }
  })();

  IN_FLIGHT_FETCHES.set(key, fetchPromise);
  return fetchPromise;
}
