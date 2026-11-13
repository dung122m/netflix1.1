/**
 * Live Sports Match Matcher & Deduplication Engine
 * - Xử lý so khớp fixture trận đấu từ nhiều nhà đài (Thập Cẩm, Về Bờ, Xôi Lạc, FPT...)
 * - Nhận diện cặp đấu thuận chiều và đảo chiều
 * - Kiểm tra tính tương thích thời gian kickoff
 * - Bảo vệ không gộp nhầm ĐTQG hoặc khác hạng mục/giới tính
 */

import {
  resolveEsportsTeam,
  isEsportsTeamMatch,
} from "@/data/live/esportsTeams";
import {
  NATIONAL_TEAM_CANONICAL_MAP,
  NATIONAL_TEAM_CANONICAL_KEYS,
} from "@/services/live/football/nationalTeamAliases";
import { CLUB_ALIAS_MAP } from "@/data/live/leagueClubs";
import { getTeamAsset, normalizeTeamKey } from "@/data/live/teamAssets";
import { areTeamNamesMatching } from "./teamNormalizer";

export const MAX_MATCH_DURATION_MS = 140 * 60 * 1000; // 140 phút

// Danh sách các từ định danh phụ trợ (phổ biến trong tên các CLB bóng đá trên thế giới)
const AUXILIARY_CLUB_WORDS = new Set([
  "clb", "fc", "ssc", "vfb", "ac", "as", "rc", "sc", "sl", "afc", "ogc", "fk", "sk", "cf", "cd", "ca",
  "csd", "deportes", "deportivo", "deportiva", "dep", "municipal", "muni", "club", "clube", "societa",
  "asociacion", "asoc", "agrupacion", "ud", "sd", "ad", "sv", "tsv", "fsv", "spvg", "vfl", "ksv", "bsc",
  "united", "utd", "city", "town", "athletic", "albion", "rovers", "wanderers", "county", "sports",
  "dtqg", "dt", "doituyen", "tuyen", "quocgia",
  "bld", "belediye", "belediyespor", "spor", "sk", "bk", "vk", "kulubu", "dsk"
]);

export function normalizeClubKey(name: string): string {
  if (!name) return "";

  // 0. Canonical Esports resolution (O(1))
  const esp = resolveEsportsTeam(name);
  if (esp) {
    return esp.canonicalKey;
  }

  const clean = name
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/^(?:doi\s*tuyen\s*quoc\s*gia|doi\s*tuyen|national\s*team|dtqg|dt|clb)\s+/g, "")
    // Tách từ dính liền giữa số La Mã và chữ (ví dụ "iiwomen" -> "ii women")
    .replace(/\b(ii|iii|iv|v|\d+)(women|woman|nu|w)\b/g, "$1 $2")
    // Chuẩn hóa số La Mã chỉ đội B/2: Ha Noi II -> Ha Noi 2, Ha Noi III -> Ha Noi 3
    .replace(/\bii\b/g, "2")
    .replace(/\biii\b/g, "3")
    .replace(/\biv\b/g, "4")
    // Loại bỏ hậu tố giới tính thừa trong normalize key nếu có
    .replace(/(?<!\b(?:ha|viet|quang))\s+(?:nam|man)$/g, "")
    .replace(/\s+(?:nu|women|woman|w)$/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Direct canonical national-team & club lookup on compact alphanumeric string
  const noSpace = clean.replace(/\s+/g, "");
  if (NATIONAL_TEAM_CANONICAL_MAP[noSpace]) {
    return NATIONAL_TEAM_CANONICAL_MAP[noSpace];
  }
  if (CLUB_ALIAS_MAP[noSpace]) {
    return CLUB_ALIAS_MAP[noSpace];
  }

  // 2. Auxiliary words stripping & check
  const words = clean.split(/\s+/).filter(Boolean);
  const coreWords = words.filter((w) => !AUXILIARY_CLUB_WORDS.has(w));
  const significant = coreWords.length > 0 ? coreWords.join("") : words.join("");

  if (NATIONAL_TEAM_CANONICAL_MAP[significant]) {
    return NATIONAL_TEAM_CANONICAL_MAP[significant];
  }

  if (CLUB_ALIAS_MAP[significant]) {
    return CLUB_ALIAS_MAP[significant];
  }

  // 3. Canonical TeamAsset lookup (>210 ĐTQG + CLB hàng đầu thế giới)
  const asset = getTeamAsset(name);
  if (asset && asset.name) {
    const assetClean = normalizeTeamKey(asset.name);
    if (NATIONAL_TEAM_CANONICAL_MAP[assetClean]) {
      return NATIONAL_TEAM_CANONICAL_MAP[assetClean];
    }
    if (CLUB_ALIAS_MAP[assetClean]) {
      return CLUB_ALIAS_MAP[assetClean];
    }
    return assetClean;
  }

  return significant;
}

export function extractTeamTokens(name: string): string[] {
  if (!name) return [];
  const clean = name
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const significant = rawTokens.filter(
    (w) => w.length >= 3 && !AUXILIARY_CLUB_WORDS.has(w),
  );
  return significant.length > 0 ? significant : rawTokens;
}

export function calculateStringSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length < s2.length ? s1 : s2;
  if (longer.length < 3) return 0;
  if (longer.includes(shorter) && shorter.length >= 4) return 0.9;

  const getBigrams = (str: string) => {
    const s = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      s.add(str.slice(i, i + 2));
    }
    return s;
  };
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  for (const item of b1) {
    if (b2.has(item)) intersection++;
  }
  return (2.0 * intersection) / (b1.size + b2.size || 1);
}

export function isSingleTeamMatching(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;

  // 0. Esports canonical match check:
  if (isEsportsTeamMatch(nameA, nameB)) {
    return true;
  }

  const keyA = normalizeClubKey(nameA);
  const keyB = normalizeClubKey(nameB);

  // 1. Exact normalized key match (hoặc canonical national team alias match)
  if (keyA && keyB && keyA === keyB) return true;

  // 2. Guard tuyệt đối cho ĐTQG: Nếu bất kỳ đội nào là ĐTQG đã nhận diện canonical key mà keyA !== keyB:
  const isNationalA = NATIONAL_TEAM_CANONICAL_KEYS.has(keyA);
  const isNationalB = NATIONAL_TEAM_CANONICAL_KEYS.has(keyB);
  if (isNationalA || isNationalB) {
    return false;
  }

  // 3. Canonical Team Asset match (hỗ trợ toàn bộ CLB chuẩn hóa song ngữ Anh - Việt)
  const assetA = getTeamAsset(nameA);
  const assetB = getTeamAsset(nameB);
  if (assetA && assetB && assetA.name && assetA.name === assetB.name) {
    return true;
  }

  // 4. Token overlap: Có chung từ khóa định danh cốt lõi (ví dụ ['iquique'])
  const tokensA = extractTeamTokens(nameA);
  const tokensB = extractTeamTokens(nameB);
  if (tokensA.length > 0 && tokensB.length > 0) {
    const sharedTokens = tokensA.filter((t) => tokensB.includes(t));
    if (sharedTokens.some((t) => t.length >= 4)) {
      return true;
    }
  }

  // 4. Chuỗi con dài & độ tương đồng fuzzy cao với guard chặt chẽ
  if (keyA.length >= 5 && keyB.length >= 5) {
    if (keyA.includes(keyB) || keyB.includes(keyA)) return true;
    if (calculateStringSimilarity(keyA, keyB) >= 0.85) return true;
  }

  // 5. Intelligent Algorithmic Matcher (Core tokens, stemming, acronyms)
  if (areTeamNamesMatching(nameA, nameB)) {
    return true;
  }

  return false;
}

export function areMatchTimesCompatible(
  t1: { timestamp: number; time: string; isLive: boolean },
  t2: { timestamp: number; time: string; isLive: boolean },
  now: number = Date.now(),
  toleranceMs: number = 90 * 60 * 1000,
  maxDurationMs: number = MAX_MATCH_DURATION_MS,
): boolean {
  const isLive1 = t1.isLive || t1.time === "Trực tiếp";
  const isLive2 = t2.isLive || t2.time === "Trực tiếp";

  const hasTs1 = t1.timestamp > 0 && t1.timestamp !== Number.MAX_SAFE_INTEGER;
  const hasTs2 = t2.timestamp > 0 && t2.timestamp !== Number.MAX_SAFE_INTEGER;

  // Case 1: Cả hai đều có kickoff timestamp rõ ràng (Scheduled ↔ Scheduled)
  if (hasTs1 && hasTs2) {
    const diffMs = Math.abs(t1.timestamp - t2.timestamp);
    if (diffMs <= toleranceMs) {
      return true;
    }

    // Nếu 1 bên có timestamp thực tế (scheduled), còn 1 bên chỉ có timestamp = now (do live marker):
    const scheduledTs = isLive1 && !isLive2 ? t2.timestamp : !isLive1 && isLive2 ? t1.timestamp : null;
    if (scheduledTs !== null) {
      return now >= scheduledTs - 60 * 60 * 1000 && now <= scheduledTs + maxDurationMs;
    }

    return false;
  }

  // Case 2: Cả hai đều là Live stream (Live ↔ Live)
  if (isLive1 && isLive2) {
    return true;
  }

  // Case 3: Một bên Live và một bên Scheduled có timestamp
  if ((isLive1 && hasTs2) || (isLive2 && hasTs1)) {
    const scheduledTs = hasTs1 ? t1.timestamp : t2.timestamp;
    return now >= scheduledTs - 60 * 60 * 1000 && now <= scheduledTs + maxDurationMs;
  }

  // Case 4: Text time matching ("21:00" === "21:00")
  if (t1.time && t2.time && t1.time !== "24/7" && t2.time !== "24/7") {
    if (t1.time === t2.time) return true;
    const c1 = t1.time.replace(/[^0-9]/g, "");
    const c2 = t2.time.replace(/[^0-9]/g, "");
    if (c1 && c2 && c1 === c2) return true;
  }

  // Case 5: 24/7 hoặc generic
  if (t1.time === "24/7" && t2.time === "24/7") return true;

  return false;
}

export function areMatchFixturesMatching(
  m1: {
    team1: string;
    team2: string;
    time: string;
    timestamp: number;
    isLiveMarker: boolean;
    sport?: string;
    category?: string;
    isCategoryExplicit?: boolean;
    isEvent?: boolean;
  },
  m2: {
    team1: string;
    team2: string;
    time: string;
    timestamp: number;
    isLiveMarker: boolean;
    sport?: string;
    category?: string;
    isCategoryExplicit?: boolean;
    isEvent?: boolean;
  },
  now: number = Date.now(),
): boolean {
  // 1. Sport Guard: Nếu 2 bên đều có sport cụ thể và sport khác nhau -> không merge
  if (
    m1.sport &&
    m2.sport &&
    m1.sport !== "other" &&
    m2.sport !== "other" &&
    m1.sport !== m2.sport
  ) {
    return false;
  }

  // 1B. Category Guard & Safe Reconciliation Rule:
  if (m1.category && m2.category && m1.category !== m2.category) {
    const isOneWomenOneDefaultMen =
      (m1.category === "senior_women" && m2.category === "senior_men" && m2.isCategoryExplicit !== true) ||
      (m2.category === "senior_women" && m1.category === "senior_men" && m1.isCategoryExplicit !== true);

    if (isOneWomenOneDefaultMen) {
      const k1 = normalizeClubKey(m1.team1);
      const k2 = normalizeClubKey(m1.team2);
      // Chỉ hòa giải khi có ít nhất một CLB nữ đặc thù
      const isKnownWomenClub =
        k1 === "phongphuhanam" ||
        k2 === "phongphuhanam" ||
        k1 === "thainguyen" ||
        k2 === "thainguyen" ||
        k1 === "hanoi2" ||
        k2 === "hanoi2";

      if (!isKnownWomenClub) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (m1.isEvent || m2.isEvent) return false;
  if (!m1.team1 || !m1.team2 || !m2.team1 || !m2.team2) return false;

  // 1. Kiểm tra cặp 2 đội (Thuận chiều hoặc Đảo chiều)
  const isDirectMatch =
    isSingleTeamMatching(m1.team1, m2.team1) &&
    isSingleTeamMatching(m1.team2, m2.team2);

  const isSwappedMatch =
    isSingleTeamMatching(m1.team1, m2.team2) &&
    isSingleTeamMatching(m1.team2, m2.team1);

  if (!isDirectMatch && !isSwappedMatch) {
    return false;
  }

  // 2. Time Guard: Phải tương thích thời gian thi đấu
  return areMatchTimesCompatible(
    { timestamp: m1.timestamp, time: m1.time, isLive: m1.isLiveMarker },
    { timestamp: m2.timestamp, time: m2.time, isLive: m2.isLiveMarker },
    now,
  );
}

