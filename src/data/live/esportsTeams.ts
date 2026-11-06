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
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/DPlus_KIA_Logo.svg/500px-DPlus_KIA_Logo.svg.png",
    aliases: ["dplus kia", "dplus", "dpluskia", "dk", "dwg", "dwg kia", "dwgkia", "damwon", "damwon gaming", "damwongaming"],
  },
  {
    canonicalKey: "t1",
    name: "T1",
    shortName: "T1",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/4o02u71705664404.png",
    aliases: ["t1", "skt", "skt t1", "sktt1", "skt1", "t1 lol", "t1 esports"],
  },
  {
    canonicalKey: "geng",
    name: "Gen.G",
    shortName: "GEN",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Gen.G_Logo.svg/500px-Gen.G_Logo.svg.png",
    aliases: ["gen g", "geng", "gen.g", "gen", "ksv", "samsung galaxy", "ssg", "samsung esports"],
  },
  {
    canonicalKey: "hanwhalife",
    name: "Hanwha Life Esports",
    shortName: "HLE",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Hanwha_Life_Esports_logo.svg/500px-Hanwha_Life_Esports_logo.svg.png",
    aliases: ["hanwha life esports", "hanwha life", "hanwhalife", "hle", "hanwha", "rox tigers", "rox"],
  },
  {
    canonicalKey: "ktrolster",
    name: "KT Rolster",
    shortName: "KT",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/KT_Logo.svg/500px-KT_Logo.svg.png",
    aliases: ["kt rolster", "ktrolster", "kt", "rolster", "kt arrows", "kt bullets"],
  },
  {
    canonicalKey: "drx",
    name: "DRX",
    shortName: "DRX",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/DRX_logo_2023.png/500px-DRX_logo_2023.png",
    aliases: ["drx", "dragonx", "kingzone dragonx", "kingzone", "kz"],
  },
  {
    canonicalKey: "kwangdongfreecs",
    name: "Kwangdong Freecs",
    shortName: "KDF",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Kwangdong_Freecs_logo.png/500px-Kwangdong_Freecs_logo.png",
    aliases: ["kwangdong freecs", "freecs", "kdf", "afreeca freecs", "afreeca", "dn freecs"],
  },
  {
    canonicalKey: "fearx",
    name: "BNK FearX",
    shortName: "FOX",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/FearX_logo.png/500px-FearX_logo.png",
    aliases: ["bnk fearx", "fearx", "fox", "liiv sandbox", "sandbox", "sbx"],
  },
  {
    canonicalKey: "nongshimredforce",
    name: "Nongshim RedForce",
    shortName: "NS",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Nongshim_RedForce_logo.png/500px-Nongshim_RedForce_logo.png",
    aliases: ["nongshim redforce", "nongshim", "ns redforce", "ns", "team dynamics"],
  },
  {
    canonicalKey: "okbrion",
    name: "OK BRION",
    shortName: "BRO",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/OK_Brion_logo.png/500px-OK_Brion_logo.png",
    aliases: ["ok brion", "brion", "bro", "fredit brion", "ok savingsbank brion", "brion blade"],
  },

  // =========================================================================
  // 2. LPL (TRUNG QUỐC)
  // =========================================================================
  {
    canonicalKey: "bilibiligaming",
    name: "Bilibili Gaming",
    shortName: "BLG",
    logo: "https://upload.wikimedia.org/wikipedia/en/6/66/Bilibili_Gaming_logo_%282021%29.png",
    aliases: ["bilibili gaming", "bilibiligaming", "bilibili", "blg"],
  },
  {
    canonicalKey: "topesports",
    name: "Top Esports",
    shortName: "TES",
    logo: "https://upload.wikimedia.org/wikipedia/en/a/ac/Top_Esports_logo.png",
    aliases: ["top esports", "topesports", "top esport", "tes", "top", "topsports gaming"],
  },
  {
    canonicalKey: "jdgaming",
    name: "JD Gaming",
    shortName: "JDG",
    logo: "https://upload.wikimedia.org/wikipedia/en/7/7d/JD_Gaming_logo.png",
    aliases: ["jd gaming", "jdgaming", "jdg", "jingdong"],
  },
  {
    canonicalKey: "weibogaming",
    name: "Weibo Gaming",
    shortName: "WBG",
    logo: "https://upload.wikimedia.org/wikipedia/en/7/75/Weibo_Gaming_logo.png",
    aliases: ["weibo gaming", "weibogaming", "wbg", "weibo", "suning", "sn"],
  },
  {
    canonicalKey: "lngesports",
    name: "LNG Esports",
    shortName: "LNG",
    logo: "https://upload.wikimedia.org/wikipedia/en/a/ae/LNG_Esports_logo.png",
    aliases: ["lng esports", "lngesports", "lng", "li ning", "lining", "snake esports", "snake"],
  },
  {
    canonicalKey: "edwardgaming",
    name: "Edward Gaming",
    shortName: "EDG",
    logo: "https://upload.wikimedia.org/wikipedia/en/2/2c/EDward_Gaming_logo.png",
    aliases: ["edward gaming", "edwardgaming", "edg"],
  },
  {
    canonicalKey: "royalnevergiveup",
    name: "Royal Never Give Up",
    shortName: "RNG",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/RNG_logo.svg/500px-RNG_logo.svg.png",
    aliases: ["royal never give up", "royalnevergiveup", "rng", "royal", "star horn royal club"],
  },
  {
    canonicalKey: "funplusphoenix",
    name: "FunPlus Phoenix",
    shortName: "FPX",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/01/FunPlus_Phoenix_logo.svg/500px-FunPlus_Phoenix_logo.svg.png",
    aliases: ["funplus phoenix", "funplusphoenix", "fpx", "funplus"],
  },
  {
    canonicalKey: "invictusgaming",
    name: "Invictus Gaming",
    shortName: "IG",
    logo: "https://upload.wikimedia.org/wikipedia/en/1/1f/Invictus_Gaming_logo.png",
    aliases: ["invictus gaming", "invictusgaming", "ig"],
  },
  {
    canonicalKey: "teamwe",
    name: "Team WE",
    shortName: "WE",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Team_WE_logo.png/500px-Team_WE_logo.png",
    aliases: ["team we", "teamwe", "world elite", "we"],
  },
  {
    canonicalKey: "ninjasinpyjamas",
    name: "Ninjas in Pyjamas",
    shortName: "NIP",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Ninjas_in_Pyjamas_logo.svg/500px-Ninjas_in_Pyjamas_logo.svg.png",
    aliases: ["ninjas in pyjamas", "ninjasinpyjamas", "nip", "victory five", "v5"],
  },
  {
    canonicalKey: "anyoneslegend",
    name: "Anyone's Legend",
    shortName: "AL",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Anyone%27s_Legend_logo.png/500px-Anyone%27s_Legend_logo.png",
    aliases: ["anyone's legend", "anyones legend", "anyoneslegend", "al", "rogue warriors", "rw"],
  },
  {
    canonicalKey: "ohmygod",
    name: "OMG",
    shortName: "OMG",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/OMG_logo.png/500px-OMG_logo.png",
    aliases: ["oh my god", "ohmygod", "omg"],
  },
  {
    canonicalKey: "thundertalkgaming",
    name: "ThunderTalk Gaming",
    shortName: "TT",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/ThunderTalk_Gaming_logo.png/500px-ThunderTalk_Gaming_logo.png",
    aliases: ["thundertalk gaming", "thundertalk", "tt gaming", "tt", "sino-dragon gaming", "sdg"],
  },
  {
    canonicalKey: "rareatom",
    name: "Rare Atom",
    shortName: "RA",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Rare_Atom_logo.png/500px-Rare_Atom_logo.png",
    aliases: ["rare atom", "rareatom", "ra", "vici gaming", "vg"],
  },
  {
    canonicalKey: "ultraprime",
    name: "Ultra Prime",
    shortName: "UP",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Ultra_Prime_logo.png/500px-Ultra_Prime_logo.png",
    aliases: ["ultra prime", "ultraprime", "up", "estars gaming", "ym"],
  },
  {
    canonicalKey: "lgdgaming",
    name: "LGD Gaming",
    shortName: "LGD",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/LGD_Gaming_logo.png/500px-LGD_Gaming_logo.png",
    aliases: ["lgd gaming", "lgdgaming", "lgd"],
  },

  // =========================================================================
  // 3. VCS (VIỆT NAM) & LIÊN QUÂN MOBILE (AOG / AIC / AWC)
  // =========================================================================
  {
    canonicalKey: "gamesports",
    name: "GAM Esports",
    shortName: "GAM",
    logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7102.png",
    aliases: ["gam esports", "gamesports", "gam", "gigabyte marines", "marines", "boba marines"],
  },
  {
    canonicalKey: "teamwhales",
    name: "Team Whales",
    shortName: "TW",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Team_Whales_logo.png/500px-Team_Whales_logo.png",
    aliases: ["team whales", "teamwhales", "whales", "tw"],
  },
  {
    canonicalKey: "teamsecret",
    name: "Team Secret",
    shortName: "TS",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/Team_Secret_logo.svg/500px-Team_Secret_logo.svg.png",
    aliases: ["team secret", "teamsecret", "secret", "ts", "lowkey esports", "lowkey"],
  },
  {
    canonicalKey: "vikingesports",
    name: "Vikings Esports",
    shortName: "VKE",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Vikings_Esports_logo.png/500px-Vikings_Esports_logo.png",
    aliases: ["vikings esports", "viking esports", "vikings", "vke", "saigon buffalo", "sgb", "phong vu buffalo", "pvb"],
  },
  {
    canonicalKey: "cerberusesports",
    name: "Cerberus Esports",
    shortName: "CES",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Cerberus_Esports_logo.png/500px-Cerberus_Esports_logo.png",
    aliases: ["cerberus esports", "cerberusesports", "cerberus", "ces"],
  },
  {
    canonicalKey: "saigonphantom",
    name: "Saigon Phantom",
    shortName: "SGP",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Saigon_Phantom_logo.png/500px-Saigon_Phantom_logo.png",
    aliases: ["saigon phantom", "saigonphantom", "sgp", "phantom"],
  },
  {
    canonicalKey: "vgaming",
    name: "V Gaming",
    shortName: "VGM",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/V_Gaming_logo.png/500px-V_Gaming_logo.png",
    aliases: ["v gaming", "vgaming", "vgp", "vgm"],
  },
  {
    canonicalKey: "teamflash",
    name: "Team Flash",
    shortName: "FL",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Team_Flash_logo.png/500px-Team_Flash_logo.png",
    aliases: ["team flash", "teamflash", "flash", "fl", "proarmy"],
  },
  {
    canonicalKey: "onestaresports",
    name: "One Star Esports",
    shortName: "1S",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/One_Star_Esports_logo.png/500px-One_Star_Esports_logo.png",
    aliases: ["one star esports", "one star", "1s", "onestar", "hq esports", "hq"],
  },
  {
    canonicalKey: "boxgaming",
    name: "Box Gaming",
    shortName: "BOX",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Box_Gaming_logo.png/500px-Box_Gaming_logo.png",
    aliases: ["box gaming", "box", "mgn blue esports", "mgn box esports", "mgn"],
  },

  // =========================================================================
  // 4. QUỐC TẾ (LEC, LCS, VALORANT, CS2, DOTA 2)
  // =========================================================================
  {
    canonicalKey: "g2esports",
    name: "G2 Esports",
    shortName: "G2",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/0vkww41675440633.png",
    aliases: ["g2 esports", "g2esports", "g2", "gamers2"],
  },
  {
    canonicalKey: "fnatic",
    name: "Fnatic",
    shortName: "FNC",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/u877191761294036.png",
    aliases: ["fnatic", "fnc"],
  },
  {
    canonicalKey: "teamliquid",
    name: "Team Liquid",
    shortName: "TL",
    logo: "https://r2.thesportsdb.com/images/media/team/badge/o1bxs61761218944.png",
    aliases: ["team liquid", "teamliquid", "liquid", "tl"],
  },
  {
    canonicalKey: "cloud9",
    name: "Cloud9",
    shortName: "C9",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Cloud9_logo.svg/500px-Cloud9_logo.svg.png",
    aliases: ["cloud9", "cloud 9", "c9"],
  },
  {
    canonicalKey: "flyquest",
    name: "FlyQuest",
    shortName: "FLY",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Flyquest_logo_2021.svg/500px-Flyquest_logo_2021.svg.png",
    aliases: ["flyquest", "fly"],
  },
  {
    canonicalKey: "madlions",
    name: "MAD Lions KOI",
    shortName: "MKOI",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/MAD_Lions_KOI_logo.png/500px-MAD_Lions_KOI_logo.png",
    aliases: ["mad lions", "mad lions koi", "madlions", "mad", "koi", "mkoi", "splyce"],
  },
  {
    canonicalKey: "teambds",
    name: "Team BDS",
    shortName: "BDS",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Team_BDS_logo.png/500px-Team_BDS_logo.png",
    aliases: ["team bds", "teambds", "bds"],
  },
  {
    canonicalKey: "karminecorp",
    name: "Karmine Corp",
    shortName: "KC",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Karmine_Corp_logo.svg/500px-Karmine_Corp_logo.svg.png",
    aliases: ["karmine corp", "karminecorp", "kc", "kameto corp"],
  },
  {
    canonicalKey: "teamvitality",
    name: "Team Vitality",
    shortName: "VIT",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/4/49/Team_Vitality_logo.svg/500px-Team_Vitality_logo.svg.png",
    aliases: ["team vitality", "teamvitality", "vitality", "vit"],
  },
  {
    canonicalKey: "sentinels",
    name: "Sentinels",
    shortName: "SEN",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Sentinels_logo.svg/500px-Sentinels_logo.svg.png",
    aliases: ["sentinels", "sen", "phoenix1"],
  },
  {
    canonicalKey: "paperrex",
    name: "Paper Rex",
    shortName: "PRX",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Paper_Rex_logo.svg/500px-Paper_Rex_logo.svg.png",
    aliases: ["paper rex", "paperrex", "prx"],
  },
  {
    canonicalKey: "natusvincere",
    name: "Natus Vincere",
    shortName: "NAVI",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/NAVI-Logo.svg/500px-NAVI-Logo.svg.png",
    aliases: ["natus vincere", "natusvincere", "navi", "na'vi"],
  },
  {
    canonicalKey: "fazeclan",
    name: "FaZe Clan",
    shortName: "FAZE",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Faze_Clan.svg/500px-Faze_Clan.svg.png",
    aliases: ["faze clan", "fazeclan", "faze"],
  },
  {
    canonicalKey: "astralis",
    name: "Astralis",
    shortName: "AST",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Astralis_logo.svg/500px-Astralis_logo.svg.png",
    aliases: ["astralis", "ast", "origen"],
  },
  {
    canonicalKey: "teamspirit",
    name: "Team Spirit",
    shortName: "SPIRIT",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Team_Spirit_new_em.svg/500px-Team_Spirit_new_em.svg.png",
    aliases: ["team spirit", "teamspirit", "spirit"],
  },
  {
    canonicalKey: "og",
    name: "OG",
    shortName: "OG",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/00/OG_logo.svg/500px-OG_logo.svg.png",
    aliases: ["og", "og esports", "monkey business"],
  },
  {
    canonicalKey: "apogee",
    name: "Apogee Esports",
    shortName: "APOGEE",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Apogee_Esports.png/500px-Apogee_Esports.png",
    aliases: ["apogee esports", "apogee esport", "apogee"],
  },
  {
    canonicalKey: "jijiehao",
    name: "JijieHao",
    shortName: "JJH",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/JijieHao_logo.png/500px-JijieHao_logo.png",
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

