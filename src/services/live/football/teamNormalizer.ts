/**
 * Core Sports Team Normalizer & Matching Engine
 * - Chuẩn hóa tên đội thể thao (bóng đá, bóng rổ, tennis, esports...)
 * - Loại bỏ stopwords, tiền tố CLB, nhà tài trợ, giới tính, lứa tuổi
 * - Mở rộng từ viết tắt phổ biến (MU, MC, ATM, BVB, GSW, LAL, DK, T1...)
 * - So khớp thông minh 2 tên đội từ các nhà đài khác nhau mà không cần gõ alias thủ công
 */

// Bảng mở rộng từ viết tắt thể thao toàn cầu (Football, NBA, Esports...)
export const SPORT_ACRONYMS: Record<string, string> = {
  // Football Club Acronyms
  mu: "manchester united",
  mun: "manchester united",
  mufc: "manchester united",
  manutd: "manchester united",
  manunited: "manchester united",
  mc: "manchester city",
  mci: "manchester city",
  mcfc: "manchester city",
  mancity: "manchester city",
  chel: "chelsea",
  cfc: "chelsea",
  ars: "arsenal",
  afc: "arsenal",
  liv: "liverpool",
  lfc: "liverpool",
  tot: "tottenham",
  thfc: "tottenham",
  spurs: "tottenham",
  new: "newcastle united",
  nufc: "newcastle united",
  whu: "west ham united",
  eve: "everton",
  avl: "aston villa",
  avfc: "aston villa",
  bha: "brighton",
  wol: "wolverhampton",
  rma: "real madrid",
  rm: "real madrid",
  bar: "barcelona",
  barca: "barcelona",
  fcb: "barcelona",
  atm: "atletico madrid",
  atleti: "atletico madrid",
  sev: "sevilla",
  val: "valencia",
  bet: "real betis",
  soc: "real sociedad",
  ath: "athletic bilbao",
  bilbao: "athletic bilbao",
  juv: "juventus",
  juve: "juventus",
  int: "inter milan",
  inter: "inter milan",
  acm: "ac milan",
  milan: "ac milan",
  rom: "as roma",
  roma: "as roma",
  laz: "lazio",
  nap: "napoli",
  ata: "atalanta",
  fio: "fiorentina",
  bay: "bayern munich",
  dort: "borussia dortmund",
  bvb: "borussia dortmund",
  lev: "bayer leverkusen",
  rbl: "rb leipzig",
  sge: "eintracht frankfurt",
  vfb: "vfb stuttgart",
  bmw: "borussia monchengladbach",
  bmg: "borussia monchengladbach",
  psg: "paris saint germain",
  om: "marseille",
  ol: "lyon",
  asm: "monaco",
  slb: "benfica",
  fcp: "porto",
  scp: "sporting cp",
  aja: "ajax",
  psv: "psv eindhoven",
  fey: "feyenoord",

  // Latin America & Others
  boca: "boca juniors",
  river: "river plate",
  fla: "flamengo",
  pal: "palmeiras",
  cor: "corinthians",
  sao: "sao paulo",
  san: "santos",
  grem: "gremio",
  interrs: "internacional",

  // Basketball (NBA)
  atl: "atlanta hawks",
  bos: "boston celtics",
  bkn: "brooklyn nets",
  cha: "charlotte hornets",
  chi: "chicago bulls",
  cle: "cleveland cavaliers",
  dal: "dallas mavericks",
  mavs: "dallas mavericks",
  den: "denver nuggets",
  det: "detroit pistons",
  pistons: "detroit pistons",
  gsw: "golden state warriors",
  dubs: "golden state warriors",
  hou: "houston rockets",
  ind: "indiana pacers",
  lac: "la clippers",
  clippers: "la clippers",
  lal: "los angeles lakers",
  lakers: "los angeles lakers",
  mem: "memphis grizzlies",
  grizzlies: "memphis grizzlies",
  mia: "miami heat",
  heat: "miami heat",
  mil: "milwaukee bucks",
  bucks: "milwaukee bucks",
  min: "minnesota timberwolves",
  wolves: "minnesota timberwolves",
  nop: "new orleans pelicans",
  pelicans: "new orleans pelicans",
  nyk: "new york knicks",
  knicks: "new york knicks",
  okc: "oklahoma city thunder",
  thunder: "oklahoma city thunder",
  orl: "orlando magic",
  magic: "orlando magic",
  phi: "philadelphia 76ers",
  sixers: "philadelphia 76ers",
  phx: "phoenix suns",
  suns: "phoenix suns",
  por: "portland trail blazers",
  blazers: "portland trail blazers",
  sac: "sacramento kings",
  kings: "sacramento kings",
  sas: "san antonio spurs",
  spursnba: "san antonio spurs",
  tor: "toronto raptors",
  raptors: "toronto raptors",
  uta: "utah jazz",
  jazz: "utah jazz",
  was: "washington wizards",
  wizards: "washington wizards",

  // Esports
  dk: "dplus kia",
  dplus: "dplus kia",
  t1: "t1",
  skt: "t1",
  gen: "gen g",
  geng: "gen g",
  hle: "hanwha life esports",
  kt: "kt rolster",
  drx: "drx",
  kdf: "kwangdong freecs",
  ns: "nongshim redforce",
  bro: "okbrion",
  fox: "bnk fearx",
  blg: "bilibili gaming",
  wbg: "weibo gaming",
  jdg: "jd gaming",
  tes: "top esports",
  lng: "lng esports",
  edg: "edward gaming",
  rng: "royal never give up",
  gam: "gam esports",
  ts: "team secret",
  tw: "team whales",
  ces: "cerberus esports",
  vke: "vikings esports",
};

// Từ định danh phụ trợ / stopwords phổ biến trên toàn thế giới
const SPORTS_STOPWORDS = new Set([
  // Tiền tố / Hậu tố thể thao
  "clb", "fc", "sc", "ssc", "vfb", "ac", "as", "rc", "cf", "cd", "ca", "afc", "ogc", "fk", "sk", "sv",
  "tsv", "fsv", "spvg", "vfl", "ksv", "bsc", "bk", "vk", "csd", "ud", "sd", "ad", "deportes", "deportivo",
  "deportiva", "dep", "municipal", "muni", "club", "clube", "societa", "asociacion", "asoc", "agrupacion",
  "united", "utd", "city", "town", "athletic", "albion", "rovers", "wanderers", "county", "sports", "sport",
  "bld", "belediye", "belediyespor", "spor", "kulubu", "dsk", "calcio", "football", "basketball",
  // Giới tính, lứa tuổi, hạng đấu
  "women", "woman", "men", "man", "nu", "nam", "youth", "reserves", "academy", "u15", "u16", "u17", "u18",
  "u19", "u20", "u21", "u22", "u23", "b", "ii", "iii", "iv",
  // Tiền tố ĐTQG
  "doi", "tuyen", "quoc", "gia", "dtqg", "dt", "doituyen", "quocgia", "national", "team", "republic",
  "cong", "hoa",
]);

/**
 * Chuẩn hóa chuỗi văn bản thể thao:
 * - Bỏ dấu tiếng Việt, chuyển chữ thường
 * - Khử số La Mã (II -> 2, III -> 3)
 * - Tách các từ dính liền giữa số và chữ
 */
export function cleanSportsText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(ii|iii|iv|v|\d+)(women|woman|nu|w)\b/gi, "$1 $2")
    .replace(/\bii\b/gi, "2")
    .replace(/\biii\b/gi, "3")
    .replace(/\biv\b/gi, "4")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Trích xuất các token mang tính định danh cốt lõi (Core Tokens)
 * Bỏ qua toàn bộ từ rác, tiền tố FC/CLB, số phân hạng
 */
export function extractCoreTokens(teamName?: string | null): string[] {
  if (!teamName) return [];
  const clean = cleanSportsText(teamName);
  const words = clean.split(/\s+/).filter(Boolean);

  // Nếu là từ viết tắt có trong SPORT_ACRONYMS, mở rộng thành các từ gốc
  const compact = words.join("");
  if (SPORT_ACRONYMS[compact]) {
    return cleanSportsText(SPORT_ACRONYMS[compact]).split(/\s+/).filter(Boolean);
  }

  const core = words.filter((w) => !SPORTS_STOPWORDS.has(w) && w.length >= 2);
  return core.length > 0 ? core : words;
}

/**
 * Tạo slug chuẩn hóa O(1) từ tên đội (vd: "Manchester United FC" -> "manchesterunited")
 */
export function toCanonicalSlug(teamName?: string | null): string {
  if (!teamName) return "";
  const core = extractCoreTokens(teamName);
  return core.join("");
}

/**
 * Tạo kebab-case slug cho tra cứu R2 CDN (vd: "Detroit Pistons" -> "detroit-pistons")
 */
export function toKebabSlug(teamName?: string | null): string {
  if (!teamName) return "";
  const core = extractCoreTokens(teamName);
  return core.join("-");
}

/**
 * Tính toán độ tương đồng Dice Coefficient dựa trên Bigrams
 */
export function calculateDiceSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

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

/**
 * Thuật toán so khớp 2 tên đội thể thao thông minh
 * - Không cần gõ tay alias
 * - Nhận diện trùng khớp từ các nhà đài khác nhau (Thập Cẩm, Về Bờ, Xôi Lạc, FPT...)
 */
export function areTeamNamesMatching(nameA?: string | null, nameB?: string | null): boolean {
  if (!nameA || !nameB) return false;
  if (nameA === nameB) return true;

  const cleanA = cleanSportsText(nameA);
  const cleanB = cleanSportsText(nameB);
  if (cleanA === cleanB) return true;

  // 1. So khớp sau khi khử khoảng trắng
  const noSpaceA = cleanA.replace(/\s+/g, "");
  const noSpaceB = cleanB.replace(/\s+/g, "");
  if (noSpaceA === noSpaceB) return true;

  // 2. Mở rộng Acronyms nếu có
  const expandedA = SPORT_ACRONYMS[noSpaceA] ? cleanSportsText(SPORT_ACRONYMS[noSpaceA]).replace(/\s+/g, "") : noSpaceA;
  const expandedB = SPORT_ACRONYMS[noSpaceB] ? cleanSportsText(SPORT_ACRONYMS[noSpaceB]).replace(/\s+/g, "") : noSpaceB;
  if (expandedA === expandedB) return true;

  // 3. Trích xuất core tokens
  const tokensA = extractCoreTokens(nameA);
  const tokensB = extractCoreTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const coreA = tokensA.join("");
  const coreB = tokensB.join("");
  if (coreA === coreB) return true;

  // 4. Token Intersection (Jaccard similarity trên core tokens)
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let sharedCount = 0;
  let sharedLongLength = 0;

  for (const t of setA) {
    if (setB.has(t)) {
      sharedCount++;
      if (t.length > sharedLongLength) {
        sharedLongLength = t.length;
      }
    }
  }

  // Nếu cả 2 đều có ít nhất 1 token đặc thù dài >= 4 ký tự (vd: "iquique", "chico", "corinthians", "avalanche", "senators", "pistons")
  if (sharedLongLength >= 4) {
    // Bảo vệ không match nhầm nếu token còn lại chỉ rõ 2 thành phố/thực thể khác nhau hoàn toàn
    if (tokensA.length === 1 || tokensB.length === 1) return true;
    if (sharedCount >= Math.min(tokensA.length, tokensB.length) - 1) return true;
  }

  // 5. Chuỗi con dài & Dice similarity >= 0.85
  if (coreA.length >= 5 && coreB.length >= 5) {
    if (coreA.includes(coreB) || coreB.includes(coreA)) return true;
    if (calculateDiceSimilarity(coreA, coreB) >= 0.85) return true;
  }

  return false;
}

