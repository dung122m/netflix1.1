import { enrichMatchLogos } from "@/services/live/football-logo/service";
import { isBlockedStreamUrl } from "@/services/live/shared/streamHealth";

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
  isEvent?: boolean;
  timeline?: "live" | "today" | "upcoming";
  servers: StreamServer[];
}

export interface LiveFootballData {
  updatedAt: string;
  channels: string[];
  matches: FootballMatch[];
}

// Danh sách các nguồn phát bóng đá & thể thao trực tiếp chuẩn Việt Nam & Quốc Tế
export function getFootballM3uSources(): {
  name: string;
  url: string;
  priority: number;
}[] {
  const envUrls = process.env.LIVE_FOOTBALL_M3U_URLS
    ? process.env.LIVE_FOOTBALL_M3U_URLS.split(",")
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const defaultSources = [
    {
      name: "TV360 & Thể Thao Quốc Tế / COLA TV",
      url: "https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/refs/heads/main/vmttv",
      priority: 1,
    },
    {
      name: "VTV / HTV / SCTV & Kênh Thể Thao Tổng Hợp (VMTTV)",
      url: "https://dl.dropboxusercontent.com/s/o5vygit34v9ryly71gam4/coban66.m3u?rlkey=auyoon54hfubajt16nc7u7dbn&st=70gyvtcu&dl=0",
      priority: 2,
    },
    {
      name: "Kênh Thể Thao & Truyền Hình VietXiaomi",
      url: "https://raw.githubusercontent.com/vietng228/m3u/refs/heads/main/new.m3u",
      priority: 3,
    },
  ];

  const customSources = envUrls.map((url, idx) => ({
    name: `Nguồn Tùy Chọn #${idx + 1}`,
    url,
    priority: 0,
  }));

  return [...customSources, ...defaultSources];
}

export function parseMatchTimeToTimestamp(timeStr: string): number {
  if (!timeStr) return Number.MAX_SAFE_INTEGER;
  // Format: "HH:mm DD/MM" or "HH:mm"
  const match = timeStr
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?:\s+(\d{1,2})\/(\d{1,2}))?/);
  if (!match) return Number.MAX_SAFE_INTEGER;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // Lấy ngày tháng hiện tại theo múi giờ Việt Nam (UTC+7)
  const vnNowStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
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

export function getMatchTimeline(
  timestamp: number,
): "live" | "today" | "upcoming" {
  if (timestamp === Number.MAX_SAFE_INTEGER) return "today";
  const now = Date.now();
  // Trận đấu bắt đầu từ 2h30p trước đến 10p sau hiện tại tính là đang diễn ra
  if (timestamp >= now - 150 * 60 * 1000 && timestamp <= now + 10 * 60 * 1000) {
    return "live";
  }

  // So sánh ngày theo múi giờ Việt Nam (UTC+7)
  const vnNowStr = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const vnNow = new Date(vnNowStr);
  const matchDate = new Date(
    new Date(timestamp).toLocaleString("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
    }),
  );

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
    .replace(
      /^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb)\s+/i,
      "",
    )
    .replace(
      /^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb)\s+/i,
      "",
    )
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
  "manchester united",
  "man utd",
  "man united",
  "mu",
  "mun",
  "mufc",
  "manchester city",
  "man city",
  "mc",
  "mci",
  "mcfc",
  "arsenal",
  "ars",
  "afc",
  "gunners",
  "liverpool",
  "liv",
  "lfc",
  "chelsea",
  "che",
  "cfc",
  "tottenham hotspur",
  "tottenham",
  "spurs",
  "tot",
  "newcastle united",
  "newcastle",
  "nufc",
  "aston villa",
  "villa",
  "avl",
  "avfc",
  "west ham united",
  "west ham",
  "whu",
  "brighton",
  "bha",
  "everton",
  "eve",
  "wolverhampton",
  "wolves",
  "wol",
  "fulham",
  "ful",
  "crystal palace",
  "palace",
  "cry",
  "brentford",
  "bre",
  "bournemouth",
  "bou",
  "nottingham forest",
  "nottingham",
  "forest",
  "nfo",
  "leicester city",
  "leicester",
  "lei",
  "southampton",
  "sou",
  "ipswich town",
  "ipswich",
  "ips",
  "leeds united",
  "leeds",
  "lu",
  "burnley",
  "sheffield united",
  "sheffield",
  "luton town",
  "luton",
  "sunderland",
  "norwich",
  "norwich city",
  "watford",
  "west brom",
  "west bromwich albion",
  "wba",
  "middlesbrough",
  "charlton",
  "charlton athletic",
  "queens park rangers",
  "qpr",
  "derby county",
  "derby",
  "birmingham city",
  "birmingham",
];

const LALIGA_TEAMS = [
  "real madrid",
  "rma",
  "barcelona",
  "barca",
  "barce",
  "fcb",
  "fc barcelona",
  "atletico madrid",
  "atletico de madrid",
  "atletico",
  "atl madrid",
  "atl. madrid",
  "atm",
  "atleti",
  "sevilla",
  "sev",
  "valencia",
  "val",
  "villarreal",
  "vil",
  "athletic bilbao",
  "athletic club",
  "ath bilbao",
  "bilbao",
  "ath",
  "real sociedad",
  "sociedad",
  "rso",
  "real betis",
  "betis",
  "bet",
  "girona",
  "gir",
  "mallorca",
  "celta vigo",
  "celta",
  "osasuna",
  "getafe",
  "rayo vallecano",
  "rayo",
  "alaves",
  "deportivo alaves",
  "las palmas",
  "espanyol",
  "leganes",
  "valladolid",
];

const SERIE_A_TEAMS = [
  "inter milan",
  "internazionale",
  "ac milan",
  "milan",
  "acm",
  "juventus",
  "juve",
  "juv",
  "napoli",
  "nap",
  "as roma",
  "roma",
  "asr",
  "lazio",
  "laz",
  "atalanta",
  "ata",
  "fiorentina",
  "fio",
  "bologna",
  "bol",
  "torino",
  "tor",
  "genoa",
  "udinese",
  "sassuolo",
  "monza",
  "empoli",
  "verona",
  "hellas verona",
  "cagliari",
  "parma",
  "como",
  "lecce",
  "venezia",
];

const BUNDESLIGA_TEAMS = [
  "bayern munich",
  "bayern munchen",
  "bayern",
  "fc bayern",
  "borussia dortmund",
  "dortmund",
  "bvb",
  "bayer leverkusen",
  "leverkusen",
  "b04",
  "lev",
  "rb leipzig",
  "leipzig",
  "rbl",
  "eintracht frankfurt",
  "frankfurt",
  "sge",
  "vfb stuttgart",
  "stuttgart",
  "vfb",
  "borussia monchengladbach",
  "monchengladbach",
  "bmg",
  "gladbach",
  "wolfsburg",
  "wob",
  "freiburg",
  "scf",
  "werder bremen",
  "bremen",
  "svw",
  "hoffenheim",
  "tsg",
  "augsburg",
  "fca",
  "mainz",
  "m05",
  "union berlin",
  "heidenheim",
  "st pauli",
  "bochum",
  "holstein kiel",
];

const LIGUE_1_TEAMS = [
  "paris saint germain",
  "paris saint-germain",
  "psg",
  "paris sg",
  "as monaco",
  "monaco",
  "asm",
  "olympique de marseille",
  "marseille",
  "om",
  "olympique lyonnais",
  "lyon",
  "ol",
  "lille osc",
  "lille",
  "losc",
  "stade rennais",
  "rennes",
  "ogc nice",
  "nice",
  "rc lens",
  "lens",
  "toulouse",
  "strasbourg",
  "brest",
  "reims",
  "nantes",
  "montpellier",
  "auxerre",
  "le havre",
  "saint-etienne",
  "angers",
];

const OTHER_EUROPE_TEAMS = [
  "sporting cp",
  "sporting lisbon",
  "sporting",
  "scp",
  "benfica",
  "sl benfica",
  "slb",
  "porto",
  "fc porto",
  "fcp",
  "ajax",
  "afc ajax",
  "psv eindhoven",
  "psv",
  "feyenoord rotterdam",
  "feyenoord",
  "fey",
  "celtic",
  "celtic fc",
  "rangers",
  "rangers fc",
  "galatasaray",
  "fenerbahce",
  "besiktas",
  "trabzonspor",
  "shakhtar donetsk",
  "fc shakhtar donetsk",
  "shakhtar",
  "dynamo kyiv",
  "slavia praha",
  "slavia prague",
  "sparta prague",
  "sparta praha",
  "crvena zvezda",
  "red star",
  "red star belgrade",
  "salzburg",
  "rb salzburg",
  "dinamo zagreb",
  "olympiacos",
  "panathinaikos",
  "paok",
  "young boys",
  "slovan bratislava",
  "viking",
  "viking fk",
  "bodo glimt",
  "bodo / glimt",
  "bodø / glimt",
  "bodø/glimt",
  "club brugge",
  "brugge",
  "union sg",
  "copenhagen",
  "gent",
  "anderlecht",
  "sabah",
  "sabah fk",
];

const MLS_TEAMS = [
  "inter miami",
  "inter miami cf",
  "la galaxy",
  "los angeles galaxy",
  "lafc",
  "los angeles fc",
  "new york red bulls",
  "ny red bulls",
  "new york city",
  "new york city fc",
  "nycfc",
  "columbus crew",
  "chicago fire",
  "chicago",
  "philadelphia union",
  "fc cincinnati",
  "cincinnati",
  "toronto fc",
  "nashville sc",
  "austin fc",
  "colorado rapids",
  "houston dynamo",
  "real salt lake",
  "minnesota united",
  "minnesota united fc",
  "fc dallas",
  "san diego fc",
  "san jose earthquakes",
  "vancouver whitecaps",
  "vancouver whitecaps fc",
  "portland timbers",
  "st louis city",
  "st. louis city sc",
  "atlanta united",
  "seattle sounders",
  "orlando city",
  "sporting kansas city",
  "new england revolution",
  "dc united",
  "montreal impact",
  "cf montreal",
  "charlotte fc",
];

const SAUDI_TEAMS = [
  "al nassr",
  "al-nassr",
  "al nassr fc",
  "al hilal",
  "al-hilal",
  "al ittihad",
  "al-ittihad",
  "al ahli",
  "al-ahli",
  "al shabab",
  "al-shabab",
  "al ettifaq",
  "al kholood",
  "abha",
  "al tai",
  "al fateh",
  "al taawoun",
  "al draih",
  "shabab al ahli",
];

const VLEAGUE_TEAMS = [
  "ha noi",
  "clb ha noi",
  "hanoi fc",
  "hoang anh gia lai",
  "hagl",
  "thep xanh nam dinh",
  "nam dinh",
  "the cong viettel",
  "viettel",
  "cong an ha noi",
  "cahn",
  "quy nhon binh dinh",
  "binh dinh",
  "hai phong",
  "dong a thanh hoa",
  "thanh hoa",
  "song lam nghe an",
  "slna",
  "becamex binh duong",
  "binh duong",
  "tp ho chi minh",
  "tp hcm",
  "clb tphcm",
  "quang nam",
  "da nang",
  "shb da nang",
  "hong linh ha tinh",
  "ha tinh",
  "khanh hoa",
  "binh phuoc",
  "pvf cand",
  "pvf",
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
  const euroLeagues = [
    "epl",
    "laliga",
    "seriea",
    "bundesliga",
    "ligue1",
    "other_europe",
  ];
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

// Danh sách các kênh thể thao phát sóng HLS chính thức 100% hoạt động
export const VERIFIED_SPORTS_STREAMS = {
  htvTheThao: "https://live.fptplay53.net/live/media/htvthethao/live247-hls-avc/index.m3u8",
  vtv5: "https://vips-livecdn.fptplay.net/live/media/vtv5/live247-hls-avc/index.m3u8",
  vtv6: "https://vips-livecdn.fptplay.net/live/media/vtv6/live247-hls-avc/index.m3u8",
  redbull: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
};

export const FPT_EVENT_POSTER = "https://images.fptplay53.net/media/home_event/OTT_ECS/2026/09/09/slide-thumb_1788937623612.jpg";

export function getVerified247Channels(): FootballMatch[] {
  const now = Date.now();
  return [
    {
      id: "sport_htv_thethao_247",
      time: "24/7",
      timestamp: now,
      title: "HTV Thể Thao HD (Trực Tiếp Thể Thao & Bóng Đá 24/7)",
      team1: "HTV Thể Thao HD",
      team2: "",
      blv: "HTV Sports",
      group: "Kênh Thể Thao VTV & HTV",
      groups: ["Kênh Thể Thao VTV & HTV"],
      tournament: "Kênh Thể Thao 24/7",
      isEvent: true,
      timeline: "live",
      quality: "FHD 1080p",
      servers: [
        {
          name: "HTV Thể Thao FHD (Master)",
          url: VERIFIED_SPORTS_STREAMS.htvTheThao,
          format: "hls",
          isHls: true,
          quality: "FHD",
          sourceName: "HTV Thể Thao",
        },
      ],
    },
    {
      id: "sport_redbull_thethao_247",
      time: "24/7",
      timestamp: now,
      title: "RedBull TV Sports HD (Thể Thao Tốc Độ & Mạo Hiểm Quốc Tế)",
      team1: "RedBull TV Thể Thao",
      team2: "",
      blv: "Quốc Tế",
      group: "Thể Thao Quốc Tế",
      groups: ["Thể Thao Quốc Tế"],
      tournament: "Kênh Thể Thao 24/7",
      isEvent: true,
      timeline: "live",
      quality: "FHD 1080p",
      servers: [
        {
          name: "RedBull TV Sports Master",
          url: VERIFIED_SPORTS_STREAMS.redbull,
          format: "hls",
          isHls: true,
          quality: "HD",
          sourceName: "RedBull Sports",
        },
      ],
    },
  ];
}

// Cache kết quả kiểm tra luồng stream (TTL 5 phút cho luồng sống, 60s cho luồng chết)
const urlHealthCache = new Map<string, { isLive: boolean; expireAt: number }>();

export async function isStreamPlayable(
  url: string,
  timeoutMs: number = 1500,
): Promise<boolean> {
  if (!url || isBlockedStreamUrl(url)) return false;

  const now = Date.now();
  const cached = urlHealthCache.get(url);
  if (cached && cached.expireAt > now) {
    return cached.isLive;
  }

  try {
    let checkUrl = url;
    if (checkUrl.includes("lauthaitv.cc") && checkUrl.includes(".flv")) {
      checkUrl = checkUrl
        .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
        .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
    }
    const res = await fetch(checkUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Range: "bytes=0-100",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const isLive = res.ok;
    urlHealthCache.set(url, {
      isLive,
      expireAt: now + (isLive ? 180 * 1000 : 45 * 1000),
    });
    return isLive;
  } catch {
    urlHealthCache.set(url, { isLive: false, expireAt: now + 45 * 1000 });
    return false;
  }
}

// Bộ nhớ đệm Server SWR (Stale-While-Revalidate)
let memoryCache: {
  data: LiveFootballData;
  expireAt: number;
  staleUntil: number;
} | null = null;
let inFlightFetch: Promise<LiveFootballData> | null = null;

export const liveFootballService = {
  getFootballMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    if (memoryCache) {
      if (memoryCache.expireAt > now) {
        return memoryCache.data;
      }
      if (memoryCache.staleUntil > now) {
        liveFootballService.revalidateFootballMatches().catch(() => {});
        return memoryCache.data;
      }
    }

    if (inFlightFetch) return inFlightFetch;
    inFlightFetch = liveFootballService.fetchAndCacheMatches();
    try {
      return await inFlightFetch;
    } finally {
      inFlightFetch = null;
    }
  },

  revalidateFootballMatches: async () => {
    if (inFlightFetch) return;
    inFlightFetch = liveFootballService.fetchAndCacheMatches();
    try {
      await inFlightFetch;
    } catch {
      // Keep serving the last good snapshot when a source is unavailable.
    } finally {
      inFlightFetch = null;
    }
  },

  fetchAndCacheMatches: async (): Promise<LiveFootballData> => {
    const now = Date.now();
    try {
      const matchMap = new Map<string, FootballMatch>();
      const channelsSet = new Set<string>();

      // 1. NẠP CÁC KÊNH THỂ THAO 24/7 CHÍNH THỨC
      const verifiedChannels = getVerified247Channels();
      for (const m of verifiedChannels) {
        matchMap.set(m.id, m);
        channelsSet.add(m.group);
        m.groups.forEach((g) => channelsSet.add(g));
      }

      // QUÉT TẤT CẢ NGUỒN M3U THỰC TẾ (CHỈ LẤY TRẬN ĐẤU & PHÒNG BLV)
      const sources = getFootballM3uSources();
      const fetchPromises = sources.map(async (source) => {
        try {
          const res = await fetch(source.url, {
            next: { revalidate: 120 },
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              Accept: "*/*",
            },
            signal: AbortSignal.timeout(4500),
          });
          if (!res.ok) return "";
          return await res.text();
        } catch {
          return "";
        }
      });

      const m3uTexts = await Promise.allSettled(fetchPromises);

      interface RawCandidate {
        line: string;
        rawTitle: string;
        group: string;
        rawLogo: string;
        url: string;
      }
      const candidates: RawCandidate[] = [];

      for (const res of m3uTexts) {
        if (res.status !== "fulfilled" || !res.value) continue;
        const text = res.value;
        const lines = text.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith("#EXTINF")) continue;

          let url = "";
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine && !nextLine.startsWith("#")) {
              url = nextLine;
              break;
            }
          }

          if (!url || isBlockedStreamUrl(url)) continue;

          // Trích xuất group-title
          const groupMatch = line.match(/group-title="([^"]+)"/i);
          const group = groupMatch ? groupMatch[1].trim() : "Bóng Đá Trực Tiếp";

          // Trích xuất tvg-logo
          const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
          const rawLogo = logoMatch ? logoMatch[1].trim() : "";

          // Trích xuất Tên trận / phòng BLV
          const commaIdx = line.lastIndexOf(",");
          const rawTitle =
            commaIdx !== -1
              ? line.substring(commaIdx + 1).trim()
              : "Trực Tiếp Bóng Đá";

          const upperGroup = group.toUpperCase();
          const upperTitle = rawTitle.toUpperCase();

          // 1. LOẠI BỎ TOÀN BỘ CÁC KÊNH TRUYỀN HÌNH TỔNG HỢP / ĐỊA PHƯƠNG / GIẢI TRÍ / KÊNH TV 24/7
          if (
            upperGroup.includes("TINHLAGI.PRO") ||
            upperGroup.includes("RADIO") ||
            upperGroup.includes("BÁN HÀNG") ||
            upperGroup.includes("PHIM TRUYỆN") ||
            upperGroup.includes("GIẢI TRÍ") ||
            upperGroup.includes("THIẾU NHI") ||
            upperGroup.includes("CA NHẠC") ||
            upperGroup.includes("TIN TỨC") ||
            upperGroup.includes("ĐẶC SẮC") ||
            upperGroup.includes("THIẾT YẾU") ||
            upperGroup.includes("ĐỊA PHƯƠNG") ||
            upperGroup.includes("TRONG NƯỚC")
          ) {
            continue;
          }

          // 2. LOẠI BỎ PHIM / HÀI / TẬP PHIM / WEB DRAMA / SHOW
          const isMovieOrDrama =
            /Tập\s*\d+|Tập\s*Cuối|Phần\s*\d+|Thuyết\s*Minh|Lồng\s*Tiếng|Vietsub|Chiếu\s*Rạp|Phim\s*(Bộ|Lẻ|Truyện|Ngắn)|Hài\s*Kịch|Hùng\s*Long|Cuốc\s*Xe|Bố\s*Già|Lật\s*Mặt|Nhà\s*Bà|Mai\s*\(|Web\s*Drama|Gái\s*Già|Trailer/i.test(
              rawTitle,
            ) ||
            /Tập\s*\d+|Tập\s*Cuối|Phần\s*\d+|Phim/i.test(group);

          if (isMovieOrDrama) continue;

          // 3. LOẠI TRỪ CÁC KÊNH TRUYỀN HÌNH TỔNG HỢP (HTV1..HTV9, THVL, VTV TỔNG HỢP, VTV5 TÂY NAM BỘ...)
          if (
            /HTV[1-9]\b|HTVC\s+(THUẦN|PHIM|GIA|DU|CA)|THVL[1-4]\b|VTV[1-4789]\b|VTV5\s+TÂY|VTV5\s+TN/i.test(
              rawTitle,
            )
          ) {
            continue;
          }

          const isSportsOrEvent =
            upperGroup.includes("COLA TV") ||
            upperGroup.includes("PHÁO HOA TV") ||
            upperGroup.includes("FPT PLAY") ||
            upperGroup.includes("SỰ KIỆN FPT") ||
            upperGroup.includes("TV360") ||
            upperGroup.includes("VTVPRIME") ||
            upperGroup.includes("THỂ THAO") ||
            upperGroup.includes("SPORT") ||
            upperGroup.includes("ASIAN GAMES") ||
            upperTitle.includes("SỰ KIỆN") ||
            upperTitle.includes("EVENT ") ||
            upperTitle.includes("VS") ||
            upperTitle.includes("BLV ") ||
            upperTitle.includes("SPORTS") ||
            upperTitle.includes("FOOTBALL") ||
            upperTitle.includes("THỂ THAO");

          if (!isSportsOrEvent) continue;

          candidates.push({ line, rawTitle, group, rawLogo, url });
        }
      }

      // 3. KIỂM TRA SỨC KHỎE TẤT CẢ LUỒNG STREAM ĐỒNG THỜI
      const healthResults = await Promise.allSettled(
        candidates.map(async (c) => {
          let effectiveUrl = c.url;
          if (effectiveUrl.includes("lauthaitv.cc") && effectiveUrl.includes(".flv")) {
            effectiveUrl = effectiveUrl
              .replace("flv.lauthaitv.cc", "hls.lauthaitv.cc")
              .replace(/\.flv(\?.*)?$/i, "/index.m3u8$1");
          } else if (effectiveUrl.includes(".flv")) {
            effectiveUrl = effectiveUrl.replace(/\.flv(\?.*)?$/i, ".m3u8$1");
          }

          const isAlive = await isStreamPlayable(effectiveUrl, 1800);
          if (!isAlive) throw new Error("Stream offline");
          return { ...c, effectiveUrl };
        }),
      );

      const activeCandidates = healthResults
        .filter((r): r is PromiseFulfilledResult<RawCandidate & { effectiveUrl: string }> => r.status === "fulfilled")
        .map((r) => r.value);

      // 4. CHUYỂN ĐỔI CHÍNH XÁC NGUỒN PHÁT THÀNH TRẬN ĐẤU / KÊNH PHÁT
      for (const item of activeCandidates) {
        const { group, rawTitle, rawLogo, effectiveUrl } = item;
        const upperGroup = group.toUpperCase();
        const upperTitle = rawTitle.toUpperCase();

        let cleanGroup = "Phòng BLV Tiếng Việt";
        if (
          upperGroup.includes("FPT PLAY") ||
          upperGroup.includes("SỰ KIỆN FPT") ||
          upperTitle.includes("SỰ KIỆN FPT")
        ) {
          cleanGroup = "Sự Kiện FPT Play";
        } else if (upperGroup.includes("TV360") || upperTitle.includes("TV360+")) {
          cleanGroup = "Sự Kiện TV360+";
        } else if (
          upperGroup.includes("COLA") ||
          upperGroup.includes("PHÁO HOA") ||
          upperGroup.includes("BLV") ||
          upperTitle.includes("BLV")
        ) {
          cleanGroup = "Phòng BLV Tiếng Việt";
        } else if (
          upperGroup.includes("QUỐC TẾ") ||
          upperGroup.includes("SPORT") ||
          upperTitle.includes("SPORT") ||
          upperTitle.includes("TNT") ||
          upperTitle.includes("CANAL") ||
          upperTitle.includes("SKY")
        ) {
          cleanGroup = "Thể Thao Quốc Tế";
        } else if (
          upperGroup.includes("HTV") ||
          upperGroup.includes("VTV") ||
          upperGroup.includes("THỂ THAO")
        ) {
          cleanGroup = "Kênh Thể Thao VTV & HTV";
        }

        channelsSet.add(cleanGroup);

        const isHls =
          effectiveUrl.includes(".m3u8") ||
          rawTitle.toLowerCase().includes("[hls");
        const isFlv =
          !isHls &&
          (effectiveUrl.includes(".flv") || rawTitle.toLowerCase().includes("[flv"));
        const format: "hls" | "flv" | "other" = isHls
          ? "hls"
          : isFlv
            ? "flv"
            : "other";

        if (!isHls && !isFlv) continue;

        const isFhd =
          upperTitle.includes("FHD") ||
          upperTitle.includes("1080P") ||
          effectiveUrl.toUpperCase().includes("1080P") ||
          effectiveUrl.toUpperCase().includes("_1080P");
        const serverQuality: "FHD" | "HD" = isFhd ? "FHD" : "HD";

        const timeMatch = rawTitle.match(
          /(?:^|\s)(\d{1,2}:\d{2}(?:\s+\d{1,2}\/\d{1,2})?)/,
        );
        const time = timeMatch ? timeMatch[1] : "Trực tiếp";

        // Tách tên BLV thật
        let blv = "";
        const blvMatch = rawTitle.match(/(BLV\s+[^()[\]]+)/i);
        if (blvMatch) {
          blv = blvMatch[1].trim();
        } else if (cleanGroup === "Kênh Thể Thao VTV & HTV") {
          blv = rawTitle.includes("HTV") ? "HTV Sports" : "VTV Sports";
        } else if (cleanGroup === "Sự Kiện TV360+") {
          blv = "TV360 Sports";
        } else if (cleanGroup === "Sự Kiện FPT Play") {
          blv = "FPT Play";
        } else if (cleanGroup === "Thể Thao Quốc Tế") {
          blv = "Quốc tế";
        }

        // Định dạng tiêu đề hiển thị thật
        let displayTitle = rawTitle;
        if (cleanGroup === "Phòng BLV Tiếng Việt") {
          if (upperGroup.includes("COLA") && !displayTitle.toUpperCase().includes("COLA")) {
            displayTitle = `COLA TV - ${displayTitle}`;
          } else if (upperGroup.includes("PHÁO HOA") && !displayTitle.toUpperCase().includes("PHÁO HOA")) {
            displayTitle = `PHÁO HOA TV - ${displayTitle}`;
          }
        }

        // Kiểm tra linh hoạt: Trận đối đầu 2 đội (Team A vs Team B / Team A - Team B) hoặc Sự kiện / Phòng BLV / Kênh thể thao
        let isEvent = true;
        let team1 = displayTitle;
        let team2 = "";

        const hasVs = /\s+(?:vs|v)\s+/i.test(rawTitle);
        const hasHyphen =
          /\s+-\s+/.test(rawTitle) &&
          !upperTitle.includes("COLA") &&
          !upperTitle.includes("PHÁO HOA");

        if (hasVs) {
          const vsMatch = rawTitle.match(/(.+?)\s+(?:vs|v)\s+(.+)/i);
          if (vsMatch) {
            const t1 = vsMatch[1]
              .replace(/\([^)]*\)/g, " ")
              .replace(/\[[^\]]*\]/g, " ")
              .trim();
            const t2 = vsMatch[2]
              .replace(/\([^)]*\)/g, " ")
              .replace(/\[[^\]]*\]/g, " ")
              .trim();
            if (t1 && t2 && t1.length >= 2 && t2.length >= 2) {
              team1 = t1;
              team2 = t2;
              isEvent = false;
            }
          }
        } else if (hasHyphen) {
          const hyphenMatch = rawTitle.match(/(.+?)\s+-\s+(.+)/);
          if (hyphenMatch) {
            const t1 = hyphenMatch[1]
              .replace(/\([^)]*\)/g, " ")
              .replace(/\[[^\]]*\]/g, " ")
              .trim();
            const t2 = hyphenMatch[2]
              .replace(/\([^)]*\)/g, " ")
              .replace(/\[[^\]]*\]/g, " ")
              .trim();
            if (
              t1 &&
              t2 &&
              t1.length >= 2 &&
              t2.length >= 2 &&
              !/^(Sự\s*kiện|Kênh|FPT|TV360|Live|Trực\s*tiếp)/i.test(t1) &&
              !/^(Sự\s*kiện|Kênh|FPT|TV360|Live|Trực\s*tiếp|Tập|Phần|SV\d+)/i.test(t2)
            ) {
              team1 = t1;
              team2 = t2;
              isEvent = false;
            }
          }
        }

        let tournament = detectTournament(rawTitle, team1, team2);
        if (!tournament) {
          if (cleanGroup === "Phòng BLV Tiếng Việt") tournament = "Phòng BLV Tiếng Việt";
          else if (cleanGroup === "Sự Kiện FPT Play") tournament = "Sự Kiện FPT Play";
          else if (cleanGroup === "Sự Kiện TV360+") tournament = "Sự Kiện TV360+";
          else if (cleanGroup === "Thể Thao Quốc Tế") tournament = "Thể Thao Quốc Tế";
          else tournament = "Kênh Thể Thao 24/7";
        }

        const normT1 = normalizeClubKey(team1);
        const normT2 = normalizeClubKey(team2);
        const sortedClubKey = [normT1, normT2].sort().join("_");

        const matchKey =
          !isEvent && normT1 && normT2 && time !== "Trực tiếp"
            ? `${time}_${sortedClubKey}`
            : `${cleanGroup}_${displayTitle}`
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");

        let serverLabel = cleanGroup;
        if (blv) serverLabel += ` (${blv})`;
        if (isFhd) serverLabel += " [FHD]";
        else if (format === "hls") serverLabel += " [HLS]";

        const timestamp =
          time !== "Trực tiếp" ? parseMatchTimeToTimestamp(time) : now;

        let effectiveLogo = rawLogo;
        if (!effectiveLogo && cleanGroup === "Sự Kiện FPT Play") {
          effectiveLogo = FPT_EVENT_POSTER;
        }

        const initialServers: StreamServer[] = [
          {
            name: serverLabel,
            url: effectiveUrl,
            format,
            isHls,
            quality: serverQuality,
            sourceName: cleanGroup,
          },
        ];

        if (cleanGroup === "Sự Kiện FPT Play" && effectiveUrl.includes("vips-livecdn.fptplay.net")) {
          const backupUrl = effectiveUrl.replace("vips-livecdn.fptplay.net", "live.fptplay53.net");
          initialServers.push({
            name: `${serverLabel} (Backup)`,
            url: backupUrl,
            format,
            isHls,
            quality: serverQuality,
            sourceName: cleanGroup,
          });
        }

        if (!matchMap.has(matchKey)) {
          matchMap.set(matchKey, {
            id: matchKey,
            time,
            timestamp,
            title: displayTitle,
            team1,
            team2,
            blv,
            logo: effectiveLogo,
            group: cleanGroup,
            groups: [cleanGroup],
            tournament,
            isEvent,
            timeline: "live",
            quality: isFhd ? "FHD 1080p" : "HD 720p",
            servers: initialServers,
          });
        } else {
          const existing = matchMap.get(matchKey)!;
          if (!existing.groups.includes(cleanGroup)) {
            existing.groups.push(cleanGroup);
          }
          if (isFhd) existing.quality = "FHD 1080p";
          if (blv && !existing.blv?.includes(blv)) {
            existing.blv = existing.blv ? `${existing.blv}, ${blv}` : blv;
          }
          const alreadyExists = existing.servers.some((s) => s.url === effectiveUrl);
          if (!alreadyExists) {
            existing.servers.push({
              name: `${serverLabel} #${existing.servers.length + 1}`,
              url: effectiveUrl,
              format,
              isHls,
              quality: serverQuality,
              sourceName: cleanGroup,
            });
          }
        }
      }

      // PASS 2: GỘP CÁC NGUỒN CÙNG PHÁT 1 TRẬN HOẶC 1 SỰ KIỆN
      const uniqueMatches: FootballMatch[] = [];
      const mergedSet = new Set<string>();
      const allRawMatches = Array.from(matchMap.values());

      for (let i = 0; i < allRawMatches.length; i++) {
        const m1 = allRawMatches[i];
        if (mergedSet.has(m1.id)) continue;

        for (let j = i + 1; j < allRawMatches.length; j++) {
          const m2 = allRawMatches[j];
          if (mergedSet.has(m2.id)) continue;

          if (!m1.isEvent && !m2.isEvent) {
            const sameTime =
              m1.time === m2.time ||
              (m1.timestamp !== Number.MAX_SAFE_INTEGER &&
                m2.timestamp !== Number.MAX_SAFE_INTEGER &&
                Math.abs(m1.timestamp - m2.timestamp) < 15 * 60 * 1000);

            if (sameTime) {
              const k1_t1 = normalizeClubKey(m1.team1);
              const k1_t2 = normalizeClubKey(m1.team2);
              const k2_t1 = normalizeClubKey(m2.team1);
              const k2_t2 = normalizeClubKey(m2.team2);

              const hasValidTeams = Boolean(
                k1_t1 && k1_t2 && k2_t1 && k2_t2 && k1_t1 !== k1_t2,
              );
              const isSameClubs =
                hasValidTeams &&
                ((k1_t1 === k2_t1 && k1_t2 === k2_t2) ||
                  (k1_t1 === k2_t2 && k1_t2 === k2_t1));

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
          } else if (m1.isEvent && m2.isEvent) {
            const key1 = m1.title.toLowerCase().replace(/[^a-z0-9]/g, "");
            const key2 = m2.title.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (key1 === key2 && key1.length > 3) {
              mergedSet.add(m2.id);
              m2.groups.forEach((g) => {
                if (!m1.groups.includes(g)) m1.groups.push(g);
              });
              if (m2.quality.includes("FHD")) m1.quality = "FHD 1080p";
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

      // Ưu tiên server HLS
      for (const m of uniqueMatches) {
        const hlsServers = m.servers.filter((s) => s.isHls);
        if (hlsServers.length > 0) {
          m.servers = hlsServers;
        }
      }

      // Sắp xếp danh sách trận đấu theo thứ tự thời gian
      const sortedMatches = uniqueMatches.sort(
        (a, b) => a.timestamp - b.timestamp,
      );

      // Tự động bổ sung Logo HD cho cả Đội Nhà & Đội Khách nếu có
      await enrichMatchLogos(
        sortedMatches.filter(
          (match) =>
            !match.isEvent && Boolean(match.team1) && Boolean(match.team2),
        ),
      );

      const result: LiveFootballData = {
        updatedAt: new Date().toISOString(),
        channels: Array.from(channelsSet),
        matches: sortedMatches,
      };

      memoryCache = {
        data: result,
        expireAt: now + 5 * 60 * 1000,
        staleUntil: now + 24 * 60 * 60 * 1000,
      };

      return result;
    } catch (err) {
      console.error("❌ Lỗi tải danh sách bóng đá:", err);
      const fallbackData: LiveFootballData = {
        updatedAt: new Date().toISOString(),
        channels: [],
        matches: [],
      };
      return fallbackData;
    }
  },
};



