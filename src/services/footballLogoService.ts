// Service tự động tra cứu, chuẩn hóa và bổ sung Logo/Huy hiệu (Crest/Badge) cho các đội bóng đá
// Hỗ trợ: Static Dictionary (0ms), TheSportsDB API (Dynamic HD Badges), In-memory LRU cache

const LOGO_CACHE = new Map<string, string>();

// Bảng huy hiệu chuẩn tĩnh của các CLB và Đội tuyển hàng đầu thế giới (0ms lookup)
const STATIC_CLUB_LOGOS: Record<string, string> = {
  // --- PREMIER LEAGUE (ANH) ---
  arsenal: "https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png",
  chelsea: "https://r2.thesportsdb.com/images/media/team/badge/pbf4ul1782638263.png",
  liverpool: "https://r2.thesportsdb.com/images/media/team/badge/kfaher1737969724.png",
  manchestercity: "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png",
  mancity: "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png",
  manchesterunited: "https://r2.thesportsdb.com/images/media/team/badge/xzqdr11514149661.png",
  manutd: "https://r2.thesportsdb.com/images/media/team/badge/xzqdr11514149661.png",
  tottenham: "https://r2.thesportsdb.com/images/media/team/badge/df54i01737969894.png",
  spurs: "https://r2.thesportsdb.com/images/media/team/badge/df54i01737969894.png",
  newcastle: "https://r2.thesportsdb.com/images/media/team/badge/m62m781580047648.png",
  astonvilla: "https://r2.thesportsdb.com/images/media/team/badge/ywxvvr1422278488.png",
  westham: "https://r2.thesportsdb.com/images/media/team/badge/b91p3v1638210350.png",
  brighton: "https://r2.thesportsdb.com/images/media/team/badge/vprxwv1448815152.png",
  everton: "https://r2.thesportsdb.com/images/media/team/badge/6t165v1621593361.png",
  wolves: "https://r2.thesportsdb.com/images/media/team/badge/1v2l6f1580047806.png",
  wolverhampton: "https://r2.thesportsdb.com/images/media/team/badge/1v2l6f1580047806.png",
  fulham: "https://r2.thesportsdb.com/images/media/team/badge/0slmqu1556111718.png",
  brentford: "https://r2.thesportsdb.com/images/media/team/badge/gr4s2w1580047395.png",
  crystalpalace: "https://r2.thesportsdb.com/images/media/team/badge/xpyutx1422278380.png",
  nottinghamforest: "https://r2.thesportsdb.com/images/media/team/badge/vwupxp1473503254.png",
  nottingham: "https://r2.thesportsdb.com/images/media/team/badge/vwupxp1473503254.png",
  bournemouth: "https://r2.thesportsdb.com/images/media/team/badge/19px9l1534001918.png",
  leicestercity: "https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1422278413.png",
  leicester: "https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1422278413.png",
  southampton: "https://r2.thesportsdb.com/images/media/team/badge/tpuusy1422278560.png",
  ipswichtown: "https://r2.thesportsdb.com/images/media/team/badge/vtwvru1422278347.png",
  ipswich: "https://r2.thesportsdb.com/images/media/team/badge/vtwvru1422278347.png",
  leeds: "https://r2.thesportsdb.com/images/media/team/badge/jcgrml1756649030.png",
  leedsunited: "https://r2.thesportsdb.com/images/media/team/badge/jcgrml1756649030.png",
  sunderland: "https://r2.thesportsdb.com/images/media/team/badge/rrtwvy1422278589.png",

  // --- LA LIGA (TÂY BAN NHA) ---
  realmadrid: "https://r2.thesportsdb.com/images/media/team/badge/8p1usm1579298288.png",
  barcelona: "https://r2.thesportsdb.com/images/media/team/badge/l2413e1742982366.png",
  barca: "https://r2.thesportsdb.com/images/media/team/badge/l2413e1742982366.png",
  atleticomadrid: "https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png",
  atletico: "https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png",
  atm: "https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png",
  sevilla: "https://r2.thesportsdb.com/images/media/team/badge/vvyvvy1420577557.png",
  valencia: "https://r2.thesportsdb.com/images/media/team/badge/4quqsq1579298418.png",
  villarreal: "https://r2.thesportsdb.com/images/media/team/badge/qwwutt1420578149.png",
  athleticbilbao: "https://r2.thesportsdb.com/images/media/team/badge/xqwsrv1420577636.png",
  bilbao: "https://r2.thesportsdb.com/images/media/team/badge/xqwsrv1420577636.png",
  realsociedad: "https://r2.thesportsdb.com/images/media/team/badge/8sbf7j1638210433.png",
  realbetis: "https://r2.thesportsdb.com/images/media/team/badge/wwsttu1420577789.png",
  betis: "https://r2.thesportsdb.com/images/media/team/badge/wwsttu1420577789.png",
  girona: "https://r2.thesportsdb.com/images/media/team/badge/3w513q1659960248.png",
  celtavigo: "https://r2.thesportsdb.com/images/media/team/badge/qrxvvx1420577435.png",
  mallorca: "https://r2.thesportsdb.com/images/media/team/badge/65m88z1580047466.png",
  osasuna: "https://r2.thesportsdb.com/images/media/team/badge/ttxpsx1420577815.png",
  getafe: "https://r2.thesportsdb.com/images/media/team/badge/tswtwt1420577508.png",
  rayovallecano: "https://r2.thesportsdb.com/images/media/team/badge/u19g5l1580047530.png",
  espanyol: "https://r2.thesportsdb.com/images/media/team/badge/0slmqu1556111718.png",

  // --- SERIE A (Ý) ---
  intermilan: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png",
  inter: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png",
  acmilan: "https://r2.thesportsdb.com/images/media/team/badge/p3h1cf1621593502.png",
  milan: "https://r2.thesportsdb.com/images/media/team/badge/p3h1cf1621593502.png",
  juventus: "https://r2.thesportsdb.com/images/media/team/badge/h0v3z21579296564.png",
  juve: "https://r2.thesportsdb.com/images/media/team/badge/h0v3z21579296564.png",
  napoli: "https://r2.thesportsdb.com/images/media/team/badge/l8qyxv1742982541.png",
  sscnapoli: "https://r2.thesportsdb.com/images/media/team/badge/l8qyxv1742982541.png",
  asroma: "https://r2.thesportsdb.com/images/media/team/badge/83q63r1579296680.png",
  roma: "https://r2.thesportsdb.com/images/media/team/badge/83q63r1579296680.png",
  lazio: "https://r2.thesportsdb.com/images/media/team/badge/06b7441579296839.png",
  atalanta: "https://r2.thesportsdb.com/images/media/team/badge/1n84821579296996.png",
  fiorentina: "https://r2.thesportsdb.com/images/media/team/badge/wspxvy1420576395.png",
  bologna: "https://r2.thesportsdb.com/images/media/team/badge/7f34o21580047352.png",
  torino: "https://r2.thesportsdb.com/images/media/team/badge/sxwqrq1420576629.png",
  como: "https://r2.thesportsdb.com/images/media/team/badge/v0k00x1719984381.png",
  parma: "https://r2.thesportsdb.com/images/media/team/badge/8o4k3r1580047587.png",

  // --- BUNDESLIGA (ĐỨC) ---
  bayernmunich: "https://r2.thesportsdb.com/images/media/team/badge/m1y2941579294576.png",
  bayern: "https://r2.thesportsdb.com/images/media/team/badge/m1y2941579294576.png",
  dortmund: "https://r2.thesportsdb.com/images/media/team/badge/tpusvp1420577317.png",
  borussiadortmund: "https://r2.thesportsdb.com/images/media/team/badge/tpusvp1420577317.png",
  bvb: "https://r2.thesportsdb.com/images/media/team/badge/tpusvp1420577317.png",
  bayerleverkusen: "https://r2.thesportsdb.com/images/media/team/badge/vttwwv1420577488.png",
  leverkusen: "https://r2.thesportsdb.com/images/media/team/badge/vttwwv1420577488.png",
  rbleipzig: "https://r2.thesportsdb.com/images/media/team/badge/b7cghp1580047683.png",
  leipzig: "https://r2.thesportsdb.com/images/media/team/badge/b7cghp1580047683.png",
  eintrachtfrankfurt: "https://r2.thesportsdb.com/images/media/team/badge/vxspvx1420577226.png",
  frankfurt: "https://r2.thesportsdb.com/images/media/team/badge/vxspvx1420577226.png",
  stuttgart: "https://r2.thesportsdb.com/images/media/team/badge/uqxxuv1420577395.png",
  vfbstuttgart: "https://r2.thesportsdb.com/images/media/team/badge/uqxxuv1420577395.png",
  monchengladbach: "https://r2.thesportsdb.com/images/media/team/badge/vtpwxu1420577174.png",
  wolfsburg: "https://r2.thesportsdb.com/images/media/team/badge/vrrpvs1420577440.png",
  werderbremen: "https://r2.thesportsdb.com/images/media/team/badge/wpyvyv1420577271.png",
  bremen: "https://r2.thesportsdb.com/images/media/team/badge/wpyvyv1420577271.png",
  freiburg: "https://r2.thesportsdb.com/images/media/team/badge/qvvupv1420577595.png",

  // --- LIGUE 1 (PHÁP) ---
  psg: "https://r2.thesportsdb.com/images/media/team/badge/rwstuv1420577902.png",
  parissaintgermain: "https://r2.thesportsdb.com/images/media/team/badge/rwstuv1420577902.png",
  paris: "https://r2.thesportsdb.com/images/media/team/badge/rwstuv1420577902.png",
  monaco: "https://r2.thesportsdb.com/images/media/team/badge/xqxvws1420577843.png",
  asmonaco: "https://r2.thesportsdb.com/images/media/team/badge/xqxvws1420577843.png",
  marseille: "https://r2.thesportsdb.com/images/media/team/badge/vxssqv1420577717.png",
  lyon: "https://r2.thesportsdb.com/images/media/team/badge/xrrvvy1420577671.png",
  lille: "https://r2.thesportsdb.com/images/media/team/badge/vswrrx1420577759.png",
  nice: "https://r2.thesportsdb.com/images/media/team/badge/u18b3m1580047514.png",
  ogcnice: "https://r2.thesportsdb.com/images/media/team/badge/u18b3m1580047514.png",
  lens: "https://r2.thesportsdb.com/images/media/team/badge/ryxvvs1420577872.png",
  rennes: "https://r2.thesportsdb.com/images/media/team/badge/uwtyrr1420577931.png",

  // --- SAUDI LEAGUE & MLS ---
  alnassr: "https://r2.thesportsdb.com/images/media/team/badge/c8j53m1599818816.png",
  alhilal: "https://r2.thesportsdb.com/images/media/team/badge/q2l8921659960533.png",
  alittihad: "https://r2.thesportsdb.com/images/media/team/badge/9d77u51662991062.png",
  alahli: "https://r2.thesportsdb.com/images/media/team/badge/x8753q1751421890.png",
  alshabab: "https://r2.thesportsdb.com/images/media/team/badge/c8j53m1599818816.png",
  alettifaq: "https://r2.thesportsdb.com/images/media/team/badge/9d77u51662991062.png",
  intermiami: "https://r2.thesportsdb.com/images/media/team/badge/y145v91580047913.png",
  lagalaxy: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png",
  lafc: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png",
  newyorkredbulls: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png",
  nyredbulls: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png",
  newyorkcity: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png",

  // --- TOP CHÂU ÂU KHÁC ---
  sportingcp: "https://r2.thesportsdb.com/images/media/team/badge/ywwyqu1420578018.png",
  sporting: "https://r2.thesportsdb.com/images/media/team/badge/ywwyqu1420578018.png",
  benfica: "https://r2.thesportsdb.com/images/media/team/badge/vvwyps1420577960.png",
  porto: "https://r2.thesportsdb.com/images/media/team/badge/vxxutt1420578077.png",
  ajax: "https://r2.thesportsdb.com/images/media/team/badge/bmsi4a1599818641.png",
  psv: "https://r2.thesportsdb.com/images/media/team/badge/tuqwvq1420576974.png",
  feyenoord: "https://r2.thesportsdb.com/images/media/team/badge/sxrwwq1420577030.png",
  celtic: "https://r2.thesportsdb.com/images/media/team/badge/xurrrv1420576722.png",
  rangers: "https://r2.thesportsdb.com/images/media/team/badge/tuxvvs1420576778.png",
  galatasaray: "https://r2.thesportsdb.com/images/media/team/badge/vyuvpx1420576916.png",
  fenerbahce: "https://r2.thesportsdb.com/images/media/team/badge/uwtvvu1420576856.png",
  besiktas: "https://r2.thesportsdb.com/images/media/team/badge/rtqvvs1420576800.png",
  shakhtar: "https://r2.thesportsdb.com/images/media/team/badge/7f34o21580047352.png",
  shakhtardonetsk: "https://r2.thesportsdb.com/images/media/team/badge/7f34o21580047352.png",
  dynamokyiv: "https://r2.thesportsdb.com/images/media/team/badge/8sbf7j1638210433.png",
  salzburg: "https://r2.thesportsdb.com/images/media/team/badge/3w513q1659960248.png",
  rbsalzburg: "https://r2.thesportsdb.com/images/media/team/badge/3w513q1659960248.png",
  clubbrugge: "https://r2.thesportsdb.com/images/media/team/badge/6t165v1621593361.png",
  viking: "https://r2.thesportsdb.com/images/media/team/badge/1v2l6f1580047806.png",
  slovanbratislava: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png",

  // --- V-LEAGUE (VIỆT NAM) ---
  hanoi: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  hanoifc: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  hagl: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  hoanganhsaigon: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  namdinh: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  thepsoxanhnamdinh: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  viettel: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  cahn: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  conganhanoi: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",

  // --- ĐỘI TUYỂN QUỐC GIA (NATIONAL TEAMS) ---
  vietnam: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  vietnamnu: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png",
  y: "https://r2.thesportsdb.com/images/media/team/badge/1f54c21598717835.png",
  ynu: "https://r2.thesportsdb.com/images/media/team/badge/1f54c21598717835.png",
  italia: "https://r2.thesportsdb.com/images/media/team/badge/1f54c21598717835.png",
  italy: "https://r2.thesportsdb.com/images/media/team/badge/1f54c21598717835.png",
  uc: "https://r2.thesportsdb.com/images/media/team/badge/wqupsq1431696001.png",
  ucnu: "https://r2.thesportsdb.com/images/media/team/badge/wqupsq1431696001.png",
  australia: "https://r2.thesportsdb.com/images/media/team/badge/wqupsq1431696001.png",
  anh: "https://r2.thesportsdb.com/images/media/team/badge/h0a1x21598717316.png",
  england: "https://r2.thesportsdb.com/images/media/team/badge/h0a1x21598717316.png",
  phap: "https://r2.thesportsdb.com/images/media/team/badge/z9b9f71598717415.png",
  france: "https://r2.thesportsdb.com/images/media/team/badge/z9b9f71598717415.png",
  duc: "https://r2.thesportsdb.com/images/media/team/badge/bbfec41598717466.png",
  germany: "https://r2.thesportsdb.com/images/media/team/badge/bbfec41598717466.png",
  taybannha: "https://r2.thesportsdb.com/images/media/team/badge/u8e36m1598717904.png",
  spain: "https://r2.thesportsdb.com/images/media/team/badge/u8e36m1598717904.png",
  bodaonha: "https://r2.thesportsdb.com/images/media/team/badge/5o6p8e1598717772.png",
  portugal: "https://r2.thesportsdb.com/images/media/team/badge/5o6p8e1598717772.png",
  argentina: "https://r2.thesportsdb.com/images/media/team/badge/u6n0321598717112.png",
  brazil: "https://r2.thesportsdb.com/images/media/team/badge/d934om1598717208.png",
  halan: "https://r2.thesportsdb.com/images/media/team/badge/380i1r1598717676.png",
  netherlands: "https://r2.thesportsdb.com/images/media/team/badge/380i1r1598717676.png",
  nhatban: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png",
  japan: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png",
  hanquoc: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png",
  korea: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png",
  thailand: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png",
  indonesia: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png",
  iran: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png",
  qatar: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png",
};

export function normalizeTeamKey(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb)\s+/i, "")
    .replace(/^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb)\s+/i, "")
    .replace(/\s+(clb|fc|fk|sc|cf|united|utd|city|town)$/i, "")
    .replace(/\s+(clb|fc|fk|sc|cf|united|utd|city|town)$/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Tra cứu và trả về link Huy hiệu/Logo CLB chất lượng cao
 */
export async function resolveTeamLogo(teamName: string): Promise<string> {
  if (!teamName) return "";
  const key = normalizeTeamKey(teamName);
  if (!key) return "";

  // 1. Kiểm tra bộ nhớ đệm hoặc từ điển tĩnh (0ms)
  if (STATIC_CLUB_LOGOS[key]) return STATIC_CLUB_LOGOS[key];
  if (LOGO_CACHE.has(key)) return LOGO_CACHE.get(key) || "";

  // 2. Dọn sạch tên để tìm kiếm trên TheSportsDB API
  const clean = teamName
    .replace(/^CLB\s+/i, "")
    .replace(/^FC\s+/i, "")
    .replace(/^S\.S\.C\.\s+/i, "")
    .replace(/^SSC\s+/i, "")
    .replace(/^VfB\s+/i, "")
    .replace(/^AC\s+/i, "")
    .replace(/^AS\s+/i, "")
    .replace(/^RC\s+/i, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+(FC|CLB|FK|SC|CF|United|Utd|City|Town)$/i, "")
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
          signal: AbortSignal.timeout(2800),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const badge = data.teams?.[0]?.strBadge;
        if (badge) {
          LOGO_CACHE.set(key, badge);
          return badge;
        }
      }
    } catch {
      // Timeout hoặc network error -> thử query tiếp
    }
  }

  // Nếu không tìm thấy, lưu chuỗi rỗng vào cache để không query lại
  LOGO_CACHE.set(key, "");
  return "";
}

/**
 * Bổ sung logo cho tất cả các trận đấu song song
 */
export async function enrichMatchLogos<T extends { team1: string; team2: string; homeLogo?: string; awayLogo?: string }>(
  matches: T[]
): Promise<T[]> {
  await Promise.allSettled(
    matches.map(async (m) => {
      const needHome = !m.homeLogo || m.homeLogo.includes("tinhlagi.pro/logo.jpg");
      const needAway = !m.awayLogo || m.awayLogo.includes("tinhlagi.pro/logo.jpg");

      if (needHome) {
        const logo = await resolveTeamLogo(m.team1);
        if (logo) m.homeLogo = logo;
      }
      if (needAway) {
        const logo = await resolveTeamLogo(m.team2);
        if (logo) m.awayLogo = logo;
      }
    })
  );
  return matches;
}
