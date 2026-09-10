import { enrichMatchLogos } from "@/services/footballLogoService";

export interface StreamServer {
  name: string;
  url: string;
  format: "hls" | "flv" | "other";
  isHls: boolean;
  quality: "FHD" | "HD";
  sourceName?: string;
}

export interface FootballMatch {
  id: string;
  time: string;
  timestamp: number;
  title: string;
  team1: string;
  team2: string;
  blv?: string;
  logo?: string;
  homeLogo?: string;
  awayLogo?: string;
  group: string;
  groups: string[];
  quality: "FHD 1080p" | "HD 720p" | "HD";
  tournament?: string;
  timeline?: "live" | "today" | "upcoming";
  servers: StreamServer[];
}

export interface LiveFootballData {
  updatedAt: string;
  channels: string[];
  matches: FootballMatch[];
}

// Danh sách các nguồn phát bóng đá & thể thao trực tiếp
const FOOTBALL_M3U_SOURCES = [
  {
    name: "Nguồn Trực Tiếp Tổng Hợp (Xôi Lạc / Thập Cẩm / S8 / Cà Khịa)",
    url: "https://tinhlagi.pro/s.m3u",
    priority: 1,
  },
];

export function parseMatchTimeToTimestamp(timeStr: string): number {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  // Format: "HH:mm DD/MM" or "HH:mm"
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s+(\d{1,2})\/(\d{1,2}))?/);
  if (!match) return Number.MAX_SAFE_INTEGER;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Lấy ngày tháng hiện tại theo múi giờ Việt Nam (UTC+7)
  const vnNowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnNow = new Date(vnNowStr);
  const currentYear = vnNow.getFullYear();
  let day = vnNow.getDate();
  let month = vnNow.getMonth();

  if (match[3] && match[4]) {
    day = parseInt(match[3], 10);
    month = parseInt(match[4], 10) - 1;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const isoVN = `${currentYear}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00+07:00`;
  const parsed = new Date(isoVN).getTime();
  return isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function getMatchTimeline(timestamp: number): "live" | "today" | "upcoming" {
  if (timestamp === Number.MAX_SAFE_INTEGER) return "today";
  const now = Date.now();
  // Trận đấu bắt đầu từ 2h30p trước đến 10p sau hiện tại tính là đang diễn ra
  if (timestamp >= now - 150 * 60 * 1000 && timestamp <= now + 10 * 60 * 1000) {
    return "live";
  }

  // So sánh ngày theo múi giờ Việt Nam (UTC+7)
  const vnNowStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vnNow = new Date(vnNowStr);
  const matchDate = new Date(new Date(timestamp).toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));

  if (
    vnNow.getFullYear() === matchDate.getFullYear() &&
    vnNow.getMonth() === matchDate.getMonth() &&
    vnNow.getDate() === matchDate.getDate()
  ) {
    return "today";
  }

  return "upcoming";
}

function normalizeText(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeClubKey(name: string): string {
  let str = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Loại bỏ các tiền tố CLB lặp lại (CLB, FC, S.S.C, SSC, VfB, AC, AS, RC, AFC, FK, RB...)
  str = str
    .replace(/^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb)\s+/i, "")
    .replace(/^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb)\s+/i, "")
    .replace(/\s+(clb|fc|fk|sc|cf|united|utd|city|town)$/i, "")
    .replace(/\s+(clb|fc|fk|sc|cf|united|utd|city|town)$/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

  const aliasMap: Record<string, string> = {
    parissaintgermain: "psg",
    parissg: "psg",
    paris: "psg",
    psg: "psg",
    aldiraiyah: "aldraih",
    aldraih: "aldraih",
    alderih: "aldraih",
    aldraihfc: "aldraih",
    alfateh: "alfateh",
    alfatehsc: "alfateh",
    italy: "italy",
    italia: "italy",
    ynu: "italy",
    y: "italy",
    australia: "australia",
    ucnu: "australia",
    uc: "australia",
    celtic: "celtic",
    celticfc: "celtic",
    saintjohnstone: "stjohnstone",
    stjohnstone: "stjohnstone",
    westbrom: "westbrom",
    westbromwichalbion: "westbrom",
    wba: "westbrom",
    atlmadrid: "atleticomadrid",
    atleticomadrid: "atleticomadrid",
    atleticodemadrid: "atleticomadrid",
    atletico: "atleticomadrid",
    atm: "atleticomadrid",
    atleti: "atleticomadrid",
    barca: "barcelona",
    barcelona: "barcelona",
    real: "realmadrid",
    realmadrid: "realmadrid",
    rma: "realmadrid",
    mancity: "mancity",
    mc: "mancity",
    mci: "mancity",
    manutd: "manutd",
    mu: "manutd",
    mun: "manutd",
    manchester: "manutd",
    spurs: "tottenham",
    tot: "tottenham",
    liv: "liverpool",
    lfc: "liverpool",
    che: "chelsea",
    cfc: "chelsea",
    ars: "arsenal",
    bvb: "dortmund",
    dortmund: "dortmund",
    bayern: "bayernmunich",
    bayernmunich: "bayernmunich",
    inter: "intermilan",
    intermilan: "intermilan",
    milan: "milan",
    acmilan: "milan",
    juve: "juventus",
    juventus: "juventus",
    napoli: "napoli",
    sscnapoli: "napoli",
    stuttgart: "stuttgart",
    vfbstuttgart: "stuttgart",
    viking: "viking",
    vikingfk: "viking",
    sporting: "sportingcp",
    sportingcp: "sportingcp",
    scp: "sportingcp",
    feyenoord: "feyenoord",
    feyenoordrotterdam: "feyenoord",
    leeds: "leeds",
    leedsunited: "leeds",
    slovan: "slovanbratislava",
    slovanbratislava: "slovanbratislava",
    galatasaray: "galatasaray",
    abhadraih: "abha",
    alshabab: "alshabab",
    intermiami: "intermiami",
    nyredbulls: "newyorkredbulls",
    lafc: "losangelesfc",
  };

  return aliasMap[str] || str;
}

// Bảng nhận diện câu lạc bộ theo giải đấu
const EPL_TEAMS = [
  "manchester united", "man utd", "man united", "mu", "mun", "mufc",
  "manchester city", "man city", "mc", "mci", "mcfc",
  "arsenal", "ars", "afc", "gunners",
  "liverpool", "liv", "lfc",
  "chelsea", "che", "cfc",
  "tottenham hotspur", "tottenham", "spurs", "tot",
  "newcastle united", "newcastle", "nufc",
  "aston villa", "villa", "avl", "avfc",
  "west ham united", "west ham", "whu",
  "brighton", "bha",
  "everton", "eve",
  "wolverhampton", "wolves", "wol",
  "fulham", "ful",
  "crystal palace", "palace", "cry",
  "brentford", "bre",
  "bournemouth", "bou",
  "nottingham forest", "nottingham", "forest", "nfo",
  "leicester city", "leicester", "lei",
  "southampton", "sou",
  "ipswich town", "ipswich", "ips",
  "leeds united", "leeds", "lu",
  "burnley", "sheffield united", "sheffield", "luton town", "luton",
  "sunderland", "norwich", "norwich city", "watford", "west brom", "west bromwich albion", "wba",
  "middlesbrough", "charlton", "charlton athletic", "queens park rangers", "qpr", "derby county", "derby", "birmingham city", "birmingham"
];

const LALIGA_TEAMS = [
  "real madrid", "rma",
  "barcelona", "barca", "barce", "fcb", "fc barcelona",
  "atletico madrid", "atletico de madrid", "atletico", "atl madrid", "atl. madrid", "atm", "atleti",
  "sevilla", "sev",
  "valencia", "val",
  "villarreal", "vil",
  "athletic bilbao", "athletic club", "ath bilbao", "bilbao", "ath",
  "real sociedad", "sociedad", "rso",
  "real betis", "betis", "bet",
  "girona", "gir",
  "mallorca", "celta vigo", "celta", "osasuna", "getafe",
  "rayo vallecano", "rayo", "alaves", "deportivo alaves", "las palmas", "espanyol", "leganes", "valladolid"
];

const SERIE_A_TEAMS = [
  "inter milan", "internazionale", "ac milan", "milan", "acm",
  "juventus", "juve", "juv",
  "napoli", "nap",
  "as roma", "roma", "asr",
  "lazio", "laz",
  "atalanta", "ata",
  "fiorentina", "fio",
  "bologna", "bol",
  "torino", "tor",
  "genoa", "udinese", "sassuolo", "monza", "empoli", "verona", "hellas verona", "cagliari", "parma", "como", "lecce", "venezia"
];

const BUNDESLIGA_TEAMS = [
  "bayern munich", "bayern munchen", "bayern", "fc bayern",
  "borussia dortmund", "dortmund", "bvb",
  "bayer leverkusen", "leverkusen", "b04", "lev",
  "rb leipzig", "leipzig", "rbl",
  "eintracht frankfurt", "frankfurt", "sge",
  "vfb stuttgart", "stuttgart", "vfb",
  "borussia monchengladbach", "monchengladbach", "bmg", "gladbach",
  "wolfsburg", "wob", "freiburg", "scf",
  "werder bremen", "bremen", "svw",
  "hoffenheim", "tsg", "augsburg", "fca", "mainz", "m05",
  "union berlin", "heidenheim", "st pauli", "bochum", "holstein kiel"
];

const LIGUE_1_TEAMS = [
  "paris saint germain", "paris saint-germain", "psg", "paris sg",
  "as monaco", "monaco", "asm",
  "olympique de marseille", "marseille", "om",
  "olympique lyonnais", "lyon", "ol",
  "lille osc", "lille", "losc",
  "stade rennais", "rennes",
  "ogc nice", "nice",
  "rc lens", "lens",
  "toulouse", "strasbourg", "brest", "reims", "nantes", "montpellier", "auxerre", "le havre", "saint-etienne", "angers"
];

const OTHER_EUROPE_TEAMS = [
  "sporting cp", "sporting lisbon", "sporting", "scp",
  "benfica", "sl benfica", "slb",
  "porto", "fc porto", "fcp",
  "ajax", "afc ajax",
  "psv eindhoven", "psv",
  "feyenoord rotterdam", "feyenoord", "fey",
  "celtic", "celtic fc", "rangers", "rangers fc",
  "galatasaray", "fenerbahce", "besiktas", "trabzonspor",
  "shakhtar donetsk", "fc shakhtar donetsk", "shakhtar", "dynamo kyiv", "slavia praha", "slavia prague", "sparta prague", "sparta praha",
  "crvena zvezda", "red star", "red star belgrade",
  "salzburg", "rb salzburg",
  "dinamo zagreb", "olympiacos", "panathinaikos", "paok",
  "young boys", "slovan bratislava", "viking", "viking fk", "bodo glimt", "bodo / glimt", "bodø / glimt", "bodø/glimt",
  "club brugge", "brugge", "union sg", "copenhagen", "gent", "anderlecht", "sabah", "sabah fk"
];

const MLS_TEAMS = [
  "inter miami", "inter miami cf", "la galaxy", "los angeles galaxy", "lafc", "los angeles fc",
  "new york red bulls", "ny red bulls", "new york city", "new york city fc", "nycfc", "columbus crew", "chicago fire", "chicago",
  "philadelphia union", "fc cincinnati", "cincinnati", "toronto fc", "nashville sc",
  "austin fc", "colorado rapids", "houston dynamo", "real salt lake", "minnesota united", "minnesota united fc",
  "fc dallas", "san diego fc", "san jose earthquakes", "vancouver whitecaps", "vancouver whitecaps fc",
  "portland timbers", "st louis city", "st. louis city sc", "atlanta united", "seattle sounders", "orlando city", "sporting kansas city",
  "new england revolution", "dc united", "montreal impact", "cf montreal", "charlotte fc"
];

const SAUDI_TEAMS = [
  "al nassr", "al-nassr", "al nassr fc", "al hilal", "al-hilal", "al ittihad", "al-ittihad",
  "al ahli", "al-ahli", "al shabab", "al-shabab", "al ettifaq", "al kholood", "abha", "al tai", "al fateh", "al taawoun", "al draih", "shabab al ahli"
];

const VLEAGUE_TEAMS = [
  "ha noi", "clb ha noi", "hanoi fc",
  "hoang anh gia lai", "hagl",
  "thep xanh nam dinh", "nam dinh",
  "the cong viettel", "viettel",
  "cong an ha noi", "cahn",
  "quy nhon binh dinh", "binh dinh",
  "hai phong",
  "dong a thanh hoa", "thanh hoa",
  "song lam nghe an", "slna",
  "becamex binh duong", "binh duong",
  "tp ho chi minh", "tp hcm", "clb tphcm",
  "quang nam", "da nang", "shb da nang", "hong linh ha tinh", "ha tinh",
  "khanh hoa", "binh phuoc", "pvf cand", "pvf"
];

function matchTeamInList(teamStr: string, clubList: string[]): boolean {
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

function detectTournament(title: string, team1: string, team2: string): string {
  // Loại bỏ ngoặc BLV để tránh match nhầm BLV C2 / BLV C1
  const cleanTitleForTourn = (title || "")
    .replace(/\((BLV\s+[^)]+|[^)]*)\)/gi, " ")
    .replace(/\[[^\]]+\]/g, " ");

  const normTitle = normalizeText(cleanTitleForTourn);
  const normT1 = normalizeText(team1);
  const normT2 = normalizeText(team2);

  // 1. Kiểm tra từ khóa tường minh trên tiêu đề
  if (
    normTitle.includes("champions league") ||
    normTitle.includes("cup c1") ||
    normTitle.includes("cúp c1") ||
    normTitle.includes("cup 1") ||
    normTitle.includes("uefa cl") ||
    normTitle.includes("ucl") ||
    /\bc1\b/.test(normTitle)
  ) {
    return "Cúp C1";
  }
  if (
    normTitle.includes("europa league") ||
    normTitle.includes("cup c2") ||
    normTitle.includes("cúp c2") ||
    normTitle.includes("uel") ||
    /\bc2\b/.test(normTitle)
  ) {
    return "Cúp C2";
  }
  if (
    normTitle.includes("conference league") ||
    normTitle.includes("cup c3") ||
    normTitle.includes("cúp c3") ||
    normTitle.includes("uecl") ||
    /\bc3\b/.test(normTitle)
  ) {
    return "Cúp C3";
  }
  if (
    normTitle.includes("giao huu") ||
    normTitle.includes("giao hữu") ||
    normTitle.includes("friendly") ||
    normTitle.includes("club friendly")
  ) {
    return "Giao Hữu";
  }
  if (
    normTitle.includes("fa cup") ||
    normTitle.includes("cup fa") ||
    normTitle.includes("cúp fa")
  ) {
    return "Cúp FA";
  }
  if (
    normTitle.includes("carabao") ||
    normTitle.includes("league cup") ||
    normTitle.includes("cup lien doan") ||
    normTitle.includes("cúp liên đoàn")
  ) {
    return "Carabao Cup";
  }
  if (
    normTitle.includes("copa del rey") ||
    normTitle.includes("cup nha vua") ||
    normTitle.includes("cúp nhà vua")
  ) {
    return "Copa del Rey";
  }
  if (
    normTitle.includes("coppa italia") ||
    normTitle.includes("cup y") ||
    normTitle.includes("cúp ý")
  ) {
    return "Coppa Italia";
  }
  if (normTitle.includes("dfb pokal") || normTitle.includes("dfb-pokal")) {
    return "DFB-Pokal";
  }
  if (
    normTitle.includes("premier league") ||
    normTitle.includes("ngoai hang anh") ||
    normTitle.includes("epl")
  ) {
    return "Ngoại Hạng Anh";
  }
  if (normTitle.includes("la liga") || normTitle.includes("laliga")) {
    return "La Liga";
  }
  if (normTitle.includes("serie a") || normTitle.includes("seriea")) {
    return "Serie A";
  }
  if (normTitle.includes("bundesliga")) {
    return "Bundesliga";
  }
  if (normTitle.includes("ligue 1") || normTitle.includes("ligue1")) {
    return "Ligue 1";
  }
  if (normTitle.includes("mls") || normTitle.includes("major league soccer")) {
    return "MLS";
  }
  if (
    normTitle.includes("saudi pro league") ||
    normTitle.includes("saudi league") ||
    normTitle.includes("spl")
  ) {
    return "Saudi League";
  }
  if (
    normTitle.includes("v league") ||
    normTitle.includes("vleague") ||
    normTitle.includes("v league 1")
  ) {
    return "V-League";
  }

  // 2. Nhận diện giải đấu của từng câu lạc bộ
  const getLeagueOfTeam = (team: string): string => {
    if (!team) return "";
    if (matchTeamInList(team, MLS_TEAMS)) return "mls";
    if (matchTeamInList(team, SAUDI_TEAMS)) return "saudi";
    if (matchTeamInList(team, VLEAGUE_TEAMS)) return "vleague";
    if (matchTeamInList(team, EPL_TEAMS)) return "epl";
    if (matchTeamInList(team, LALIGA_TEAMS)) return "laliga";
    if (matchTeamInList(team, SERIE_A_TEAMS)) return "seriea";
    if (matchTeamInList(team, BUNDESLIGA_TEAMS)) return "bundesliga";
    if (matchTeamInList(team, LIGUE_1_TEAMS)) return "ligue1";
    if (matchTeamInList(team, OTHER_EUROPE_TEAMS)) return "other_europe";
    return "";
  };

  const l1 = getLeagueOfTeam(normT1);
  const l2 = getLeagueOfTeam(normT2);

  // Cùng giải quốc nội:
  if (l1 === "epl" && l2 === "epl") return "Ngoại Hạng Anh";
  if (l1 === "laliga" && l2 === "laliga") return "La Liga";
  if (l1 === "seriea" && l2 === "seriea") return "Serie A";
  if (l1 === "bundesliga" && l2 === "bundesliga") return "Bundesliga";
  if (l1 === "ligue1" && l2 === "ligue1") return "Ligue 1";
  if (l1 === "saudi" && l2 === "saudi") return "Saudi League";
  if (l1 === "mls" && l2 === "mls") return "MLS";
  if (l1 === "vleague" && l2 === "vleague") return "V-League";

  // Khác giải (2 đội bóng Châu Âu gặp nhau mà tiêu đề chưa ghi rõ C1/C2/C3) -> Cúp Châu Âu:
  const euroLeagues = ["epl", "laliga", "seriea", "bundesliga", "ligue1", "other_europe"];
  if (euroLeagues.includes(l1) && euroLeagues.includes(l2) && l1 !== l2) {
    return "Cúp Châu Âu";
  }

  // Đội thuộc giải đấu đặc thù:
  if (l1 === "other_europe" || l2 === "other_europe") return "Cúp Châu Âu";
  if (l1 === "mls" || l2 === "mls") return "MLS";
  if (l1 === "saudi" || l2 === "saudi") return "Saudi League";
  if (l1 === "vleague" || l2 === "vleague") return "V-League";

  return "";
}

// Bộ nhớ đệm Server SWR (Stale-While-Revalidate)
let memoryCache: { data: LiveFootballData; expireAt: number; staleUntil: number } | null = null;

export const liveFootballService = {
  getFootballMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    if (memoryCache) {
      if (memoryCache.expireAt > now) {
        return memoryCache.data;
      }
      // Dùng tạm stale data trong 30 phút (0ms load) và fetch cập nhật ngầm
      if (memoryCache.staleUntil > now) {
        liveFootballService.revalidateFootballMatches().catch(() => {});
        return memoryCache.data;
      }
    }

    return await liveFootballService.fetchAndCacheMatches();
  },

  revalidateFootballMatches: async () => {
    try {
      await liveFootballService.fetchAndCacheMatches();
    } catch {}
  },

  fetchAndCacheMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    try {
      const matchMap = new Map<string, FootballMatch>();
      const channelsSet = new Set<string>();

      const fetchPromises = FOOTBALL_M3U_SOURCES.map(async (source) => {
        try {
          const res = await fetch(source.url, {
            next: { revalidate: 120 },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            },
            signal: AbortSignal.timeout(3500),
          });
          if (!res.ok) return "";
          return await res.text();
        } catch {
          return "";
        }
      });

      const m3uTexts = await Promise.allSettled(fetchPromises);

      for (const res of m3uTexts) {
        if (res.status !== "fulfilled" || !res.value) continue;
        const text = res.value;
        const lines = text.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith("#EXTINF")) continue;

          const groupMatch = line.match(/group-title="([^"]+)"/);
          const group = groupMatch ? groupMatch[1].trim() : "Khác";

          // Bỏ qua thẻ thông báo, IP, QR
          if (group.includes("TINHLAGI.PRO")) continue;

          channelsSet.add(group);

          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          const rawLogo = logoMatch ? logoMatch[1].trim() : "";

          // Bóc tách logo đội nhà và đội khách nếu có trong merge_logos.php
          let homeLogo = "";
          let awayLogo = "";
          if (rawLogo.includes("merge_logos.php")) {
            try {
              const urlObj = new URL(rawLogo);
              const h = urlObj.searchParams.get("home") || "";
              const a = urlObj.searchParams.get("away") || "";
              if (h && !h.includes("tinhlagi.pro/logo.jpg")) {
                homeLogo = h;
              }
              if (a && !a.includes("tinhlagi.pro/logo.jpg")) {
                awayLogo = a;
              }
            } catch {
              // ignore
            }
          } else if (rawLogo && !rawLogo.includes("tinhlagi.pro/logo.jpg")) {
            homeLogo = rawLogo;
          }

          const commaIdx = line.indexOf(",");
          const rawTitle = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : "";
          const url = lines[i + 1]?.trim() || "";

          if (
            !url ||
            (!url.startsWith("http://") && !url.startsWith("https://"))
          ) {
            continue;
          }

          // Nhận diện định dạng & Tự động chuyển đổi link FLV sang HLS tương ứng
          let effectiveUrl = url;
          if (url.includes("lauthaitv.cc") && url.includes(".flv")) {
            effectiveUrl = url
              .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
              .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
          } else if (url.includes(".flv")) {
            effectiveUrl = url.replace(/\.flv(\?.*)?$/i, ".m3u8$1");
          }

          const isHls =
            effectiveUrl.includes(".m3u8") || rawTitle.toLowerCase().includes("[hls");
          const isFlv =
            !isHls && (url.includes(".flv") || rawTitle.toLowerCase().includes("[flv"));
          const format: "hls" | "flv" | "other" = isHls
            ? "hls"
            : isFlv
            ? "flv"
            : "other";

          // Xác định chất lượng FHD / HD
          const upperTitle = rawTitle.toUpperCase();
          const upperUrl = url.toUpperCase();
          const isFhd =
            upperTitle.includes("FHD") ||
            upperTitle.includes("1080P") ||
            upperUrl.includes("1080P") ||
            upperUrl.includes("_1080P");
          const serverQuality: "FHD" | "HD" = isFhd ? "FHD" : "HD";

          // Bóc tách thời gian
          const timeMatch = rawTitle.match(
            /^(\d{1,2}:\d{2}(?:\s+\d{1,2}\/\d{1,2})?)/
          );
          const time = timeMatch ? timeMatch[1] : "";

          // Bóc tách BLV
          const blvMatch = rawTitle.match(/\((BLV\s+[^)]+|[^)]*)\)/i);
          let blv = "";
          if (
            blvMatch &&
            !blvMatch[1].toLowerCase().includes("fhd") &&
            !blvMatch[1].toLowerCase().includes("hd")
          ) {
            blv = blvMatch[1].trim();
          }

          // Tên trận đấu sạch (loại bỏ toàn bộ ngoặc và tag để lấy tên CLB chuẩn nhất)
          const cleanTitle = rawTitle
            .replace(/^(\d{1,2}:\d{2}(?:\s+\d{1,2}\/\d{1,2})?)/, "")
            .replace(/\[[^\]]*\]/g, " ")
            .replace(/\([^)]*\)/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          // Tách 2 đội
          let team1 = cleanTitle;
          let team2 = "";
          const vsMatch = cleanTitle.match(/(.+?)\s+(?:vs|-)\s+(.+)/i);
          if (vsMatch) {
            team1 = vsMatch[1].replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").trim();
            team2 = vsMatch[2].replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").trim();
          }

          // Chuẩn hóa tên CLB không phân biệt dấu và tiền tố
          const normT1 = normalizeClubKey(team1);
          const normT2 = normalizeClubKey(team2);

          // Chuẩn hóa giờ
          const timeHourMin = time.match(/^(\d{1,2}:\d{2})/)?.[1] || time;
          const sortedClubs = [normT1, normT2].sort().join("_");

          // Khóa trận đấu để gộp tất cả các đài phát (COLA TV, Gà Vàng, Vua Săn Cỏ...) vào 1 trận duy nhất
          const matchKey = timeHourMin && sortedClubs
            ? `${timeHourMin}_${sortedClubs}`
            : `${cleanTitle || rawTitle}`.toLowerCase().replace(/[^a-z0-9]/g, "");

          const cleanGroupLabel = group
            .replace(/^[🔴🟢🟡⚪🟠\s]+/, "")
            .trim();

          let serverLabel = cleanGroupLabel;
          if (blv) serverLabel += ` (${blv})`;
          if (isFhd) serverLabel += " [FHD]";
          else if (format === "hls") serverLabel += " [HLS]";
          if (rawTitle.toLowerCase().includes("hls 2")) serverLabel += " #2";

          const tournament = detectTournament(rawTitle, team1, team2);
          const timestamp = parseMatchTimeToTimestamp(time);

          if (!matchMap.has(matchKey)) {
            matchMap.set(matchKey, {
              id: matchKey,
              time,
              timestamp,
              title: cleanTitle || rawTitle,
              team1,
              team2,
              blv,
              logo: rawLogo,
              homeLogo,
              awayLogo,
              group,
              groups: [group],
              tournament,
              timeline: getMatchTimeline(timestamp),
              quality: isFhd ? "FHD 1080p" : "HD 720p",
              servers: [
                {
                  name: serverLabel,
                  url: effectiveUrl,
                  format,
                  isHls,
                  quality: serverQuality,
                  sourceName: group,
                },
              ],
            });
          } else {
            const existing = matchMap.get(matchKey)!;
            if (!existing.groups.includes(group)) {
              existing.groups.push(group);
            }
            if (isFhd) {
              existing.quality = "FHD 1080p";
            }
            if (tournament && (!existing.tournament || existing.tournament === "Khác")) {
              existing.tournament = tournament;
            }
            if (blv && !existing.blv?.includes(blv)) {
              const currentBlvs = existing.blv ? existing.blv.split(", ") : [];
              if (currentBlvs.length < 3) {
                existing.blv = existing.blv ? `${existing.blv}, ${blv}` : blv;
              }
            }
            if (!existing.homeLogo && homeLogo) {
              existing.homeLogo = homeLogo;
            }
            if (!existing.awayLogo && awayLogo) {
              existing.awayLogo = awayLogo;
            }
            const alreadyExists = existing.servers.some(
              (s) => s.url === effectiveUrl
            );
            if (!alreadyExists) {
              const cleanBaseLabel = serverLabel.replace(/\s+#\d+$/g, "").trim();
              existing.servers.push({
                name: `${cleanBaseLabel} #${existing.servers.length + 1}`,
                url: effectiveUrl,
                format,
                isHls,
                quality: serverQuality,
                sourceName: group,
              });
            }
          }
        }
      }

      // PASS 2: GỘP TRIỆT ĐỂ CÁC TRẬN CÙNG GIỜ & CÙNG CẶP ĐẤU (BẢO ĐẢM 100% KHÔNG BỊ TÁCH TRẬN)
      const uniqueMatches: FootballMatch[] = [];
      const mergedSet = new Set<string>();
      const allRawMatches = Array.from(matchMap.values());

      for (let i = 0; i < allRawMatches.length; i++) {
        const m1 = allRawMatches[i];
        if (mergedSet.has(m1.id)) continue;

        for (let j = i + 1; j < allRawMatches.length; j++) {
          const m2 = allRawMatches[j];
          if (mergedSet.has(m2.id)) continue;

          const sameTime =
            m1.time === m2.time ||
            Math.abs(m1.timestamp - m2.timestamp) < 15 * 60 * 1000;

          if (sameTime) {
            const k1_t1 = normalizeClubKey(m1.team1);
            const k1_t2 = normalizeClubKey(m1.team2);
            const k2_t1 = normalizeClubKey(m2.team1);
            const k2_t2 = normalizeClubKey(m2.team2);

            const isSameClubs =
              (k1_t1 === k2_t1 && k1_t2 === k2_t2) ||
              (k1_t1 === k2_t2 && k1_t2 === k2_t1) ||
              ((k1_t1.includes(k2_t1) || k2_t1.includes(k1_t1)) && (k1_t2.includes(k2_t2) || k2_t2.includes(k1_t2))) ||
              ((k1_t1.includes(k2_t2) || k2_t2.includes(k1_t1)) && (k1_t2.includes(k2_t1) || k2_t1.includes(k1_t2)));

            if (isSameClubs) {
              mergedSet.add(m2.id);
              m2.groups.forEach((g) => {
                if (!m1.groups.includes(g)) m1.groups.push(g);
              });
              if (m2.quality.includes("FHD")) m1.quality = "FHD 1080p";
              if (!m1.homeLogo && m2.homeLogo) m1.homeLogo = m2.homeLogo;
              if (!m1.awayLogo && m2.awayLogo) m1.awayLogo = m2.awayLogo;
              if (m2.blv && !m1.blv?.includes(m2.blv)) {
                m1.blv = m1.blv ? `${m1.blv}, ${m2.blv}` : m2.blv;
              }
              for (const s of m2.servers) {
                if (!m1.servers.some((existS) => existS.url === s.url)) {
                  m1.servers.push(s);
                }
              }
            }
          }
        }
        uniqueMatches.push(m1);
      }

      // Ưu tiên sắp xếp các server HLS lên trước và loại bỏ FLV không tương thích web
      for (const m of uniqueMatches) {
        const hlsServers = m.servers.filter((s) => s.isHls);
        if (hlsServers.length > 0) {
          m.servers = hlsServers;
        } else {
          m.servers.sort((a, b) => (b.isHls ? 1 : 0) - (a.isHls ? 1 : 0));
        }
      }

      // SẮP XẾP TẤT CẢ CÁC TRẬN ĐẤU THEO THỨ TỰ THỜI GIAN
      const sortedMatches = uniqueMatches.sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Lọc các trận trong khung giờ trước 2 tiếng và sau 2 tiếng (±2h)
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const twoHoursLater = now + 2 * 60 * 60 * 1000;

      const windowMatches = sortedMatches.filter(
        (m) =>
          (m.timestamp >= twoHoursAgo && m.timestamp <= twoHoursLater) ||
          m.timestamp === Number.MAX_SAFE_INTEGER
      );

      const activeMatches =
        windowMatches.length > 0
          ? windowMatches
          : sortedMatches.filter((m) => m.timestamp >= twoHoursAgo).slice(0, 16);

      // Tự động bổ sung Logo HD cho cả Đội Nhà & Đội Khách
      await enrichMatchLogos(activeMatches);

      const result: LiveFootballData = {
        updatedAt: new Date().toISOString(),
        channels: Array.from(channelsSet),
        matches: activeMatches,
      };

      memoryCache = {
        data: result,
        expireAt: now + 120 * 1000,
        staleUntil: now + 1800 * 1000,
      };

      return result;
    } catch (err) {
      console.error("❌ Lỗi tải playlist bóng đá M3U:", err);
      if (memoryCache) return memoryCache.data;
      return {
        updatedAt: new Date().toISOString(),
        channels: [],
        matches: [],
      };
    }
  },
};
