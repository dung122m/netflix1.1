/**
 * CANONICAL ESPORTS TEAMS REGISTRY & ALIAS DICTIONARY
 * 
 * Định danh chuẩn, logo chính thức và hệ thống bí danh (alias) toàn diện cho tất cả
 * các đội tuyển Thể Thao Điện Tử (Esports):
 * - League of Legends: LCK (Hàn Quốc), LPL (Trung Quốc), VCS (Việt Nam), LEC (Châu Âu), LCS/Americas, MSI & Worlds
 * - Liên Quân Mobile: AOG (Đấu Trường Danh Vọng), AIC, AWC
 * - FPS & MOBA: Valorant, CS2/CS:GO, Dota 2, PUBG
 * 
 * Giải quyết triệt để 2 bài toán:
 * 1. Chống phân mảnh match: Các nguồn stream dùng tên viết tắt (DK, BLG, HLE, TES, WBG, GEN, T1, TW, SGP...)
 *    và nguồn khác dùng tên đầy đủ (Dplus KIA, Bilibili Gaming, Hanwha Life, Saigon Phantom...)
 *    đều được chuẩn hóa về cùng một canonical key, giúp hệ thống tự động gộp (dedup) thành 1 trận duy nhất.
 * 2. Cung cấp Logo HD chính thức của đội esports, ngăn chặn tuyệt đối việc gán nhầm cờ quốc gia (ví dụ: DK nhầm cờ Đan Mạch 🇩🇰).
 */

export interface EsportsTeamDef {
  canonicalKey: string;
  name: string;
  shortName: string;
  logo: string;
  aliases: string[];
}

export const ESPORTS_TEAMS: EsportsTeamDef[] = [
  // =========================================================================
  // 1. LCK (HÀN QUỐC)
  // =========================================================================
  {
    canonicalKey: "dpluskia",
    name: "Dplus KIA",
    shortName: "DK",
    logo: "https://media.nanaflix.asia/teams/esports/dpluskia.png",
    aliases: ["dplus kia", "dplus", "dpluskia", "dk", "dwg", "dwg kia", "dwgkia", "damwon", "damwon gaming", "damwongaming"],
  },
  {
    canonicalKey: "t1",
    name: "T1",
    shortName: "T1",
    logo: "https://media.nanaflix.asia/teams/esports/t1.png",
    aliases: ["t1", "skt", "skt t1", "sktt1", "skt1", "t1 lol", "t1 esports"],
  },
  {
    canonicalKey: "geng",
    name: "Gen.G",
    shortName: "GEN",
    logo: "https://media.nanaflix.asia/teams/esports/geng.png",
    aliases: ["gen g", "geng", "gen.g", "gen", "ksv", "samsung galaxy", "ssg", "samsung esports"],
  },
  {
    canonicalKey: "hanwhalife",
    name: "Hanwha Life Esports",
    shortName: "HLE",
    logo: "https://media.nanaflix.asia/teams/esports/hanwhalife.png",
    aliases: ["hanwha life esports", "hanwha life", "hanwhalife", "hle", "hanwha", "rox tigers", "rox"],
  },
  {
    canonicalKey: "ktrolster",
    name: "KT Rolster",
    shortName: "KT",
    logo: "https://media.nanaflix.asia/teams/esports/ktrolster.png",
    aliases: ["kt rolster", "ktrolster", "kt", "rolster", "kt arrows", "kt bullets"],
  },
  {
    canonicalKey: "drx",
    name: "DRX",
    shortName: "DRX",
    logo: "https://media.nanaflix.asia/teams/esports/drx.png",
    aliases: ["drx", "dragonx", "kingzone dragonx", "kingzone", "kz"],
  },
  {
    canonicalKey: "kwangdongfreecs",
    name: "Kwangdong Freecs",
    shortName: "KDF",
    logo: "https://media.nanaflix.asia/teams/esports/kwangdongfreecs.png",
    aliases: ["kwangdong freecs", "freecs", "kdf", "afreeca freecs", "afreeca", "dn freecs"],
  },
  {
    canonicalKey: "fearx",
    name: "BNK FearX",
    shortName: "FOX",
    logo: "https://media.nanaflix.asia/teams/esports/fearx.png",
    aliases: ["bnk fearx", "fearx", "fox", "liiv sandbox", "sandbox", "sbx"],
  },
  {
    canonicalKey: "nongshimredforce",
    name: "Nongshim RedForce",
    shortName: "NS",
    logo: "https://media.nanaflix.asia/teams/esports/nongshimredforce.png",
    aliases: ["nongshim redforce", "nongshim", "ns redforce", "ns", "team dynamics"],
  },
  {
    canonicalKey: "okbrion",
    name: "OK BRION",
    shortName: "BRO",
    logo: "https://media.nanaflix.asia/teams/esports/okbrion.png",
    aliases: ["ok brion", "brion", "bro", "fredit brion", "ok savingsbank brion", "brion blade"],
  },

  // =========================================================================
  // 2. LPL (TRUNG QUỐC)
  // =========================================================================
  {
    canonicalKey: "bilibiligaming",
    name: "Bilibili Gaming",
    shortName: "BLG",
    logo: "https://media.nanaflix.asia/teams/esports/bilibiligaming.png",
    aliases: ["bilibili gaming", "bilibiligaming", "bilibili", "blg"],
  },
  {
    canonicalKey: "topesports",
    name: "Top Esports",
    shortName: "TES",
    logo: "https://media.nanaflix.asia/teams/esports/topesports.png",
    aliases: ["top esports", "topesports", "top esport", "tes", "top", "topsports gaming"],
  },
  {
    canonicalKey: "jdgaming",
    name: "JD Gaming",
    shortName: "JDG",
    logo: "https://media.nanaflix.asia/teams/esports/jdgaming.png",
    aliases: ["jd gaming", "jdgaming", "jdg", "jingdong"],
  },
  {
    canonicalKey: "weibogaming",
    name: "Weibo Gaming",
    shortName: "WBG",
    logo: "https://media.nanaflix.asia/teams/esports/weibogaming.png",
    aliases: ["weibo gaming", "weibogaming", "wbg", "weibo", "suning", "sn"],
  },
  {
    canonicalKey: "lngesports",
    name: "LNG Esports",
    shortName: "LNG",
    logo: "https://media.nanaflix.asia/teams/esports/lngesports.png",
    aliases: ["lng esports", "lngesports", "lng", "li ning", "lining", "snake esports", "snake"],
  },
  {
    canonicalKey: "edwardgaming",
    name: "Edward Gaming",
    shortName: "EDG",
    logo: "https://media.nanaflix.asia/teams/esports/edwardgaming.png",
    aliases: ["edward gaming", "edwardgaming", "edg"],
  },
  {
    canonicalKey: "royalnevergiveup",
    name: "Royal Never Give Up",
    shortName: "RNG",
    logo: "https://media.nanaflix.asia/teams/esports/royalnevergiveup.png",
    aliases: ["royal never give up", "royalnevergiveup", "rng", "royal", "star horn royal club"],
  },
  {
    canonicalKey: "funplusphoenix",
    name: "FunPlus Phoenix",
    shortName: "FPX",
    logo: "https://media.nanaflix.asia/teams/esports/funplusphoenix.png",
    aliases: ["funplus phoenix", "funplusphoenix", "fpx", "funplus"],
  },
  {
    canonicalKey: "invictusgaming",
    name: "Invictus Gaming",
    shortName: "IG",
    logo: "https://media.nanaflix.asia/teams/esports/invictusgaming.png",
    aliases: ["invictus gaming", "invictusgaming", "ig"],
  },
  {
    canonicalKey: "teamwe",
    name: "Team WE",
    shortName: "WE",
    logo: "https://media.nanaflix.asia/teams/esports/teamwe.png",
    aliases: ["team we", "teamwe", "world elite", "we"],
  },
  {
    canonicalKey: "ninjasinpyjamas",
    name: "Ninjas in Pyjamas",
    shortName: "NIP",
    logo: "https://media.nanaflix.asia/teams/esports/ninjasinpyjamas.png",
    aliases: ["ninjas in pyjamas", "ninjasinpyjamas", "nip", "victory five", "v5"],
  },
  {
    canonicalKey: "anyoneslegend",
    name: "Anyone's Legend",
    shortName: "AL",
    logo: "https://media.nanaflix.asia/teams/esports/anyoneslegend.png",
    aliases: ["anyone's legend", "anyones legend", "anyoneslegend", "al", "rogue warriors", "rw"],
  },
  {
    canonicalKey: "ohmygod",
    name: "OMG",
    shortName: "OMG",
    logo: "https://media.nanaflix.asia/teams/esports/ohmygod.png",
    aliases: ["oh my god", "ohmygod", "omg"],
  },
  {
    canonicalKey: "thundertalkgaming",
    name: "ThunderTalk Gaming",
    shortName: "TT",
    logo: "https://media.nanaflix.asia/teams/esports/thundertalkgaming.png",
    aliases: ["thundertalk gaming", "thundertalk", "tt gaming", "tt", "sino-dragon gaming", "sdg"],
  },
  {
    canonicalKey: "rareatom",
    name: "Rare Atom",
    shortName: "RA",
    logo: "https://media.nanaflix.asia/teams/esports/rareatom.png",
    aliases: ["rare atom", "rareatom", "ra", "vici gaming", "vg"],
  },
  {
    canonicalKey: "ultraprime",
    name: "Ultra Prime",
    shortName: "UP",
    logo: "https://media.nanaflix.asia/teams/esports/ultraprime.png",
    aliases: ["ultra prime", "ultraprime", "up", "estars gaming", "ym"],
  },
  {
    canonicalKey: "lgdgaming",
    name: "LGD Gaming",
    shortName: "LGD",
    logo: "https://media.nanaflix.asia/teams/esports/lgdgaming.png",
    aliases: ["lgd gaming", "lgdgaming", "lgd"],
  },

  // =========================================================================
  // 3. VCS (VIỆT NAM) & LIÊN QUÂN MOBILE (AOG / AIC / AWC)
  // =========================================================================
  {
    canonicalKey: "gamesports",
    name: "GAM Esports",
    shortName: "GAM",
    logo: "https://media.nanaflix.asia/teams/esports/gamesports.png",
    aliases: ["gam esports", "gamesports", "gam", "gigabyte marines", "marines", "boba marines"],
  },
  {
    canonicalKey: "teamwhales",
    name: "Team Whales",
    shortName: "TW",
    logo: "https://media.nanaflix.asia/teams/esports/teamwhales.png",
    aliases: ["team whales", "teamwhales", "whales", "tw"],
  },
  {
    canonicalKey: "teamsecret",
    name: "Team Secret",
    shortName: "TS",
    logo: "https://media.nanaflix.asia/teams/esports/teamsecret.png",
    aliases: ["team secret", "teamsecret", "secret", "ts", "lowkey esports", "lowkey"],
  },
  {
    canonicalKey: "vikingesports",
    name: "Vikings Esports",
    shortName: "VKE",
    logo: "https://media.nanaflix.asia/teams/esports/vikingesports.png",
    aliases: ["vikings esports", "viking esports", "vikings", "vke", "saigon buffalo", "sgb", "phong vu buffalo", "pvb"],
  },
  {
    canonicalKey: "cerberusesports",
    name: "Cerberus Esports",
    shortName: "CES",
    logo: "https://media.nanaflix.asia/teams/esports/cerberusesports.png",
    aliases: ["cerberus esports", "cerberusesports", "cerberus", "ces"],
  },
  {
    canonicalKey: "saigonphantom",
    name: "Saigon Phantom",
    shortName: "SGP",
    logo: "https://media.nanaflix.asia/teams/esports/saigonphantom.png",
    aliases: ["saigon phantom", "saigonphantom", "sgp", "phantom"],
  },
  {
    canonicalKey: "vgaming",
    name: "V Gaming",
    shortName: "VGM",
    logo: "https://media.nanaflix.asia/teams/esports/vgaming.png",
    aliases: ["v gaming", "vgaming", "vgp", "vgm"],
  },
  {
    canonicalKey: "teamflash",
    name: "Team Flash",
    shortName: "FL",
    logo: "https://media.nanaflix.asia/teams/esports/teamflash.png",
    aliases: ["team flash", "teamflash", "flash", "fl", "proarmy"],
  },
  {
    canonicalKey: "onestaresports",
    name: "One Star Esports",
    shortName: "1S",
    logo: "https://media.nanaflix.asia/teams/esports/onestaresports.png",
    aliases: ["one star esports", "one star", "1s", "onestar", "hq esports", "hq"],
  },
  {
    canonicalKey: "boxgaming",
    name: "Box Gaming",
    shortName: "BOX",
    logo: "https://media.nanaflix.asia/teams/esports/boxgaming.png",
    aliases: ["box gaming", "box", "mgn blue esports", "mgn box esports", "mgn"],
  },

  // =========================================================================
  // 4. QUỐC TẾ (LEC, LCS, VALORANT, CS2, DOTA 2)
  // =========================================================================
  {
    canonicalKey: "g2esports",
    name: "G2 Esports",
    shortName: "G2",
    logo: "https://media.nanaflix.asia/teams/esports/g2esports.png",
    aliases: ["g2 esports", "g2esports", "g2", "gamers2"],
  },
  {
    canonicalKey: "fnatic",
    name: "Fnatic",
    shortName: "FNC",
    logo: "https://media.nanaflix.asia/teams/esports/fnatic.png",
    aliases: ["fnatic", "fnc"],
  },
  {
    canonicalKey: "teamliquid",
    name: "Team Liquid",
    shortName: "TL",
    logo: "https://media.nanaflix.asia/teams/esports/teamliquid.png",
    aliases: ["team liquid", "teamliquid", "liquid", "tl"],
  },
  {
    canonicalKey: "cloud9",
    name: "Cloud9",
    shortName: "C9",
    logo: "https://media.nanaflix.asia/teams/esports/cloud9.png",
    aliases: ["cloud9", "cloud 9", "c9"],
  },
  {
    canonicalKey: "flyquest",
    name: "FlyQuest",
    shortName: "FLY",
    logo: "https://media.nanaflix.asia/teams/esports/flyquest.png",
    aliases: ["flyquest", "fly"],
  },
  {
    canonicalKey: "madlions",
    name: "MAD Lions KOI",
    shortName: "MKOI",
    logo: "https://media.nanaflix.asia/teams/esports/madlions.png",
    aliases: ["mad lions", "mad lions koi", "madlions", "mad", "koi", "mkoi", "splyce"],
  },
  {
    canonicalKey: "teambds",
    name: "Team BDS",
    shortName: "BDS",
    logo: "https://media.nanaflix.asia/teams/esports/teambds.png",
    aliases: ["team bds", "teambds", "bds"],
  },
  {
    canonicalKey: "karminecorp",
    name: "Karmine Corp",
    shortName: "KC",
    logo: "https://media.nanaflix.asia/teams/esports/karminecorp.png",
    aliases: ["karmine corp", "karminecorp", "kc", "kameto corp"],
  },
  {
    canonicalKey: "teamvitality",
    name: "Team Vitality",
    shortName: "VIT",
    logo: "https://media.nanaflix.asia/teams/esports/teamvitality.png",
    aliases: ["team vitality", "teamvitality", "vitality", "vit"],
  },
  {
    canonicalKey: "sentinels",
    name: "Sentinels",
    shortName: "SEN",
    logo: "https://media.nanaflix.asia/teams/esports/sentinels.png",
    aliases: ["sentinels", "sen", "phoenix1"],
  },
  {
    canonicalKey: "paperrex",
    name: "Paper Rex",
    shortName: "PRX",
    logo: "https://media.nanaflix.asia/teams/esports/paperrex.png",
    aliases: ["paper rex", "paperrex", "prx"],
  },
  {
    canonicalKey: "natusvincere",
    name: "Natus Vincere",
    shortName: "NAVI",
    logo: "https://media.nanaflix.asia/teams/esports/natusvincere.png",
    aliases: ["natus vincere", "natusvincere", "navi", "na'vi"],
  },
  {
    canonicalKey: "fazeclan",
    name: "FaZe Clan",
    shortName: "FAZE",
    logo: "https://media.nanaflix.asia/teams/esports/fazeclan.png",
    aliases: ["faze clan", "fazeclan", "faze"],
  },
  {
    canonicalKey: "astralis",
    name: "Astralis",
    shortName: "AST",
    logo: "https://media.nanaflix.asia/teams/esports/astralis.png",
    aliases: ["astralis", "ast", "origen"],
  },
  {
    canonicalKey: "teamspirit",
    name: "Team Spirit",
    shortName: "SPIRIT",
    logo: "https://media.nanaflix.asia/teams/esports/teamspirit.png",
    aliases: ["team spirit", "teamspirit", "spirit"],
  },
  {
    canonicalKey: "og",
    name: "OG",
    shortName: "OG",
    logo: "https://media.nanaflix.asia/teams/esports/og.png",
    aliases: ["og", "og esports", "monkey business"],
  },
  {
    canonicalKey: "apogee",
    name: "Apogee Esports",
    shortName: "APOGEE",
    logo: "https://media.nanaflix.asia/teams/esports/apogee.png",
    aliases: ["apogee esports", "apogee esport", "apogee"],
  },
  {
    canonicalKey: "jijiehao",
    name: "JijieHao",
    shortName: "JJH",
    logo: "https://media.nanaflix.asia/teams/esports/jijiehao.png",
    aliases: ["jijiehao", "jijie hao", "jjh"],
  },
];

/**
 * Chuẩn hóa tên chuỗi tra cứu esports
 */
export function normalizeEsportsKey(name?: string | null): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(esports|esport|gaming|team|club|lol|dota|csgo|cs2|valorant)\b/gi, " ")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Bảng tra cứu Map O(1) tĩnh
const ESPORTS_LOOKUP_MAP = new Map<string, EsportsTeamDef>();
const ESPORTS_KEY_MAP = new Map<string, EsportsTeamDef>();

for (const team of ESPORTS_TEAMS) {
  ESPORTS_KEY_MAP.set(team.canonicalKey, team);

  // Index tên chuẩn
  const normName = normalizeEsportsKey(team.name);
  if (normName) ESPORTS_LOOKUP_MAP.set(normName, team);

  // Index tên viết tắt
  const normShort = normalizeEsportsKey(team.shortName);
  if (normShort) ESPORTS_LOOKUP_MAP.set(normShort, team);

  // Index tất cả alias
  for (const alias of team.aliases) {
    const normAlias = normalizeEsportsKey(alias);
    if (normAlias) {
      ESPORTS_LOOKUP_MAP.set(normAlias, team);
    }
    // Index cả chuỗi thuần không bỏ từ "esports" / "team" / "gaming"
    const rawCompact = alias
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .replace(/[^a-z0-9]/g, "");
    if (rawCompact && !ESPORTS_LOOKUP_MAP.has(rawCompact)) {
      ESPORTS_LOOKUP_MAP.set(rawCompact, team);
    }
  }
}

/**
 * Tra cứu thông tin đội tuyển Esports chuẩn hóa (O(1))
 * Hỗ trợ nhận diện mọi tên gọi: "DK", "Dplus", "Dplus KIA", "BLG", "Bilibili Gaming", "T1", "SKT"...
 */
export function resolveEsportsTeam(name?: string | null): EsportsTeamDef | null {
  if (!name) return null;
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d");
  const rawClean = clean.replace(/[^a-z0-9]/g, "");
  if (rawClean && ESPORTS_LOOKUP_MAP.has(rawClean)) {
    return ESPORTS_LOOKUP_MAP.get(rawClean)!;
  }
  const normKey = normalizeEsportsKey(name);
  if (normKey && ESPORTS_LOOKUP_MAP.has(normKey)) {
    return ESPORTS_LOOKUP_MAP.get(normKey)!;
  }
  return null;
}

/**
 * Kiểm tra xem hai tên đội có cùng chỉ một đội tuyển Esports hay không
 */
export function isEsportsTeamMatch(nameA: string, nameB: string): boolean {
  if (!nameA || !nameB) return false;
  const teamA = resolveEsportsTeam(nameA);
  const teamB = resolveEsportsTeam(nameB);
  if (teamA && teamB) {
    return teamA.canonicalKey === teamB.canonicalKey;
  }
  return false;
}

