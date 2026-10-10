// Service tự động tra cứu, chuẩn hóa và bổ sung Logo/Huy hiệu (Crest/Badge) cho các đội bóng đá
// Hỗ trợ: Static Dictionary (0ms), TheSportsDB API (Dynamic HD Badges), In-memory LRU cache

const LOGO_CACHE = new Map<string, string>();

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
  return url;
}

// Bảng huy hiệu chuẩn tĩnh của các CLB và Đội tuyển hàng đầu thế giới (0ms lookup)
const STATIC_CLUB_LOGOS: Record<string, string> = {
  arsenal: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png",
  chelsea: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png",
  liverpool: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png",
  manchestercity: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  mancity: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  mcfc: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png",
  manchesterunited: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  manutd: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  mu: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  mufc: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png",
  tottenham: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/367.png",
  tottenhamhotspur: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/367.png",
  spurs: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/367.png",
  newcastle: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/361.png",
  newcastleunited: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/361.png",
  astonvilla: "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
  villa: "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
  avfc: "https://a.espncdn.com/i/teamlogos/soccer/500/362.png",
  westham: "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
  westhamunited: "https://a.espncdn.com/i/teamlogos/soccer/500/371.png",
  brighton: "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
  brightonhov: "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
  brightonhovealbion: "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
  brightonandhovealbion: "https://a.espncdn.com/i/teamlogos/soccer/500/331.png",
  everton: "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
  wolves: "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
  wolverhampt: "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
  wolverhampton: "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
  wolverhamptonwanderers: "https://a.espncdn.com/i/teamlogos/soccer/500/380.png",
  fulham: "https://a.espncdn.com/i/teamlogos/soccer/500/370.png",
  brentford: "https://a.espncdn.com/i/teamlogos/soccer/500/337.png",
  crystalpalace: "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
  palace: "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
  nottinghamforest: "https://a.espncdn.com/i/teamlogos/soccer/500/393.png",
  nottingham: "https://a.espncdn.com/i/teamlogos/soccer/500/393.png",
  bournemouth: "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
  bournemout: "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
  afcbournemouth: "https://a.espncdn.com/i/teamlogos/soccer/500/349.png",
  leicestercity: "https://a.espncdn.com/i/teamlogos/soccer/500/375.png",
  leicester: "https://a.espncdn.com/i/teamlogos/soccer/500/375.png",
  southampton: "https://a.espncdn.com/i/teamlogos/soccer/500/376.png",
  ipswichtown: "https://a.espncdn.com/i/teamlogos/soccer/500/373.png",
  ipswich: "https://a.espncdn.com/i/teamlogos/soccer/500/373.png",
  leeds: "https://a.espncdn.com/i/teamlogos/soccer/500/357.png",
  leedsunited: "https://a.espncdn.com/i/teamlogos/soccer/500/357.png",
  sunderland: "https://a.espncdn.com/i/teamlogos/soccer/500/366.png",
  burnley: "https://a.espncdn.com/i/teamlogos/soccer/500/379.png",
  sheffieldunited: "https://a.espncdn.com/i/teamlogos/soccer/500/398.png",
  middlesbrough: "https://a.espncdn.com/i/teamlogos/soccer/500/369.png",
  westbrom: "https://a.espncdn.com/i/teamlogos/soccer/500/383.png",
  westbromwichalbion: "https://a.espncdn.com/i/teamlogos/soccer/500/383.png",
  norwich: "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
  norwichcity: "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
  watford: "https://a.espncdn.com/i/teamlogos/soccer/500/395.png",
  luton: "https://a.espncdn.com/i/teamlogos/soccer/500/390.png",
  lutontown: "https://a.espncdn.com/i/teamlogos/soccer/500/390.png",
  sheffieldwednesday: "https://a.espncdn.com/i/teamlogos/soccer/500/393.png",
  plymouth: "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
  plymouthargyle: "https://a.espncdn.com/i/teamlogos/soccer/500/384.png",
  derbycounty: "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
  derby: "https://a.espncdn.com/i/teamlogos/soccer/500/381.png",
  portsmouth: "https://a.espncdn.com/i/teamlogos/soccer/500/385.png",
  hullcity: "https://a.espncdn.com/i/teamlogos/soccer/500/306.png",
  hull: "https://a.espncdn.com/i/teamlogos/soccer/500/306.png",
  stokecity: "https://a.espncdn.com/i/teamlogos/soccer/500/336.png",
  stoke: "https://a.espncdn.com/i/teamlogos/soccer/500/336.png",
  blackburnrovers: "https://a.espncdn.com/i/teamlogos/soccer/500/365.png",
  blackburn: "https://a.espncdn.com/i/teamlogos/soccer/500/365.png",
  prestonnorthend: "https://a.espncdn.com/i/teamlogos/soccer/500/388.png",
  preston: "https://a.espncdn.com/i/teamlogos/soccer/500/388.png",
  coventrycity: "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
  coventry: "https://a.espncdn.com/i/teamlogos/soccer/500/368.png",
  bristolcity: "https://a.espncdn.com/i/teamlogos/soccer/500/361.png",
  swanseacity: "https://a.espncdn.com/i/teamlogos/soccer/500/318.png",
  swansea: "https://a.espncdn.com/i/teamlogos/soccer/500/318.png",
  cardiffcity: "https://a.espncdn.com/i/teamlogos/soccer/500/347.png",
  cardiff: "https://a.espncdn.com/i/teamlogos/soccer/500/347.png",
  queensparkrangers: "https://a.espncdn.com/i/teamlogos/soccer/500/334.png",
  qpr: "https://a.espncdn.com/i/teamlogos/soccer/500/334.png",
  millwall: "https://a.espncdn.com/i/teamlogos/soccer/500/389.png",
  realmadrid: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  real: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png",
  barcelona: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  barca: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png",
  atleticomadrid: "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
  atletico: "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
  atm: "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png",
  sevilla: "https://a.espncdn.com/i/teamlogos/soccer/500/243.png",
  valencia: "https://a.espncdn.com/i/teamlogos/soccer/500/94.png",
  villarreal: "https://a.espncdn.com/i/teamlogos/soccer/500/102.png",
  athleticbilbao: "https://a.espncdn.com/i/teamlogos/soccer/500/96.png",
  bilbao: "https://a.espncdn.com/i/teamlogos/soccer/500/96.png",
  athleticclub: "https://a.espncdn.com/i/teamlogos/soccer/500/96.png",
  realsociedad: "https://a.espncdn.com/i/teamlogos/soccer/500/89.png",
  sociedad: "https://a.espncdn.com/i/teamlogos/soccer/500/89.png",
  realbetis: "https://a.espncdn.com/i/teamlogos/soccer/500/244.png",
  betis: "https://a.espncdn.com/i/teamlogos/soccer/500/244.png",
  girona: "https://a.espncdn.com/i/teamlogos/soccer/500/9812.png",
  celtavigo: "https://a.espncdn.com/i/teamlogos/soccer/500/85.png",
  celta: "https://a.espncdn.com/i/teamlogos/soccer/500/85.png",
  mallorca: "https://a.espncdn.com/i/teamlogos/soccer/500/84.png",
  rcdmallorca: "https://a.espncdn.com/i/teamlogos/soccer/500/84.png",
  osasuna: "https://a.espncdn.com/i/teamlogos/soccer/500/97.png",
  getafe: "https://a.espncdn.com/i/teamlogos/soccer/500/2922.png",
  rayovallecano: "https://a.espncdn.com/i/teamlogos/soccer/500/101.png",
  rayo: "https://a.espncdn.com/i/teamlogos/soccer/500/101.png",
  espanyol: "https://a.espncdn.com/i/teamlogos/soccer/500/88.png",
  laspalmas: "https://a.espncdn.com/i/teamlogos/soccer/500/98.png",
  deportivoalaves: "https://a.espncdn.com/i/teamlogos/soccer/500/95.png",
  deportivoal: "https://a.espncdn.com/i/teamlogos/soccer/500/95.png",
  alaves: "https://a.espncdn.com/i/teamlogos/soccer/500/95.png",
  leganes: "https://a.espncdn.com/i/teamlogos/soccer/500/989.png",
  realvalladolid: "https://a.espncdn.com/i/teamlogos/soccer/500/100.png",
  valladolid: "https://a.espncdn.com/i/teamlogos/soccer/500/100.png",
  intermilan: "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  inter: "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  internazionale: "https://a.espncdn.com/i/teamlogos/soccer/500/110.png",
  acmilan: "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
  milan: "https://a.espncdn.com/i/teamlogos/soccer/500/103.png",
  juventus: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/111.png",
  juve: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/111.png",
  napoli: "https://a.espncdn.com/i/teamlogos/soccer/500/114.png",
  sscnapoli: "https://a.espncdn.com/i/teamlogos/soccer/500/114.png",
  asroma: "https://a.espncdn.com/i/teamlogos/soccer/500/104.png",
  roma: "https://a.espncdn.com/i/teamlogos/soccer/500/104.png",
  lazio: "https://a.espncdn.com/i/teamlogos/soccer/500/112.png",
  atalanta: "https://a.espncdn.com/i/teamlogos/soccer/500/122.png",
  fiorentina: "https://a.espncdn.com/i/teamlogos/soccer/500/109.png",
  bologna: "https://a.espncdn.com/i/teamlogos/soccer/500/107.png",
  torino: "https://a.espncdn.com/i/teamlogos/soccer/500/239.png",
  como: "https://a.espncdn.com/i/teamlogos/soccer/500/2573.png",
  como1907: "https://a.espncdn.com/i/teamlogos/soccer/500/2573.png",
  parma: "https://a.espncdn.com/i/teamlogos/soccer/500/115.png",
  genoa: "https://a.espncdn.com/i/teamlogos/soccer/500/3263.png",
  cagliari: "https://a.espncdn.com/i/teamlogos/soccer/500/121.png",
  hellasverona: "https://a.espncdn.com/i/teamlogos/soccer/500/108.png",
  verona: "https://a.espncdn.com/i/teamlogos/soccer/500/108.png",
  udinese: "https://a.espncdn.com/i/teamlogos/soccer/500/118.png",
  monza: "https://a.espncdn.com/i/teamlogos/soccer/500/4007.png",
  empoli: "https://a.espncdn.com/i/teamlogos/soccer/500/105.png",
  venezia: "https://a.espncdn.com/i/teamlogos/soccer/500/17530.png",
  lecce: "https://a.espncdn.com/i/teamlogos/soccer/500/113.png",
  bayernmunich: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  bayernmunc: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  bayern: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png",
  dortmund: "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
  borussiadortmund: "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
  bvb: "https://a.espncdn.com/i/teamlogos/soccer/500/124.png",
  bayerleverkusen: "https://a.espncdn.com/i/teamlogos/soccer/500/131.png",
  leverkusen: "https://a.espncdn.com/i/teamlogos/soccer/500/131.png",
  rbleipzig: "https://a.espncdn.com/i/teamlogos/soccer/500/11420.png",
  leipzig: "https://a.espncdn.com/i/teamlogos/soccer/500/11420.png",
  eintrachtfrankfurt: "https://a.espncdn.com/i/teamlogos/soccer/500/125.png",
  frankfurt: "https://a.espncdn.com/i/teamlogos/soccer/500/125.png",
  stuttgart: "https://a.espncdn.com/i/teamlogos/soccer/500/134.png",
  vfbstuttgart: "https://a.espncdn.com/i/teamlogos/soccer/500/134.png",
  monchengladbach: "https://a.espncdn.com/i/teamlogos/soccer/500/268.png",
  borussiamonchengladbach: "https://a.espncdn.com/i/teamlogos/soccer/500/268.png",
  gladbach: "https://a.espncdn.com/i/teamlogos/soccer/500/268.png",
  wolfsburg: "https://a.espncdn.com/i/teamlogos/soccer/500/138.png",
  vflwolfsburg: "https://a.espncdn.com/i/teamlogos/soccer/500/138.png",
  werderbremen: "https://a.espncdn.com/i/teamlogos/soccer/500/137.png",
  bremen: "https://a.espncdn.com/i/teamlogos/soccer/500/137.png",
  freiburg: "https://a.espncdn.com/i/teamlogos/soccer/500/126.png",
  scfreiburg: "https://a.espncdn.com/i/teamlogos/soccer/500/126.png",
  hoffenheim: "https://a.espncdn.com/i/teamlogos/soccer/500/7911.png",
  tsghoffenheim: "https://a.espncdn.com/i/teamlogos/soccer/500/7911.png",
  augsburg: "https://a.espncdn.com/i/teamlogos/soccer/500/3841.png",
  fcaugsburg: "https://a.espncdn.com/i/teamlogos/soccer/500/3841.png",
  mainz: "https://a.espncdn.com/i/teamlogos/soccer/500/2950.png",
  mainz05: "https://a.espncdn.com/i/teamlogos/soccer/500/2950.png",
  fsvmainz05: "https://a.espncdn.com/i/teamlogos/soccer/500/2950.png",
  unionberlin: "https://a.espncdn.com/i/teamlogos/soccer/500/598.png",
  stpauli: "https://a.espncdn.com/i/teamlogos/soccer/500/272.png",
  fcstpauli: "https://a.espncdn.com/i/teamlogos/soccer/500/272.png",
  hamburg: "https://a.espncdn.com/i/teamlogos/soccer/500/128.png",
  hamburgersv: "https://a.espncdn.com/i/teamlogos/soccer/500/128.png",
  schalke: "https://a.espncdn.com/i/teamlogos/soccer/500/133.png",
  schalke04: "https://a.espncdn.com/i/teamlogos/soccer/500/133.png",
  psg: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  parissaintgermain: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  paris: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png",
  monaco: "https://a.espncdn.com/i/teamlogos/soccer/500/174.png",
  asmonaco: "https://a.espncdn.com/i/teamlogos/soccer/500/174.png",
  marseille: "https://a.espncdn.com/i/teamlogos/soccer/500/165.png",
  olympymarseille: "https://a.espncdn.com/i/teamlogos/soccer/500/165.png",
  om: "https://a.espncdn.com/i/teamlogos/soccer/500/165.png",
  lyon: "https://a.espncdn.com/i/teamlogos/soccer/500/167.png",
  olympquelyonnais: "https://a.espncdn.com/i/teamlogos/soccer/500/167.png",
  ol: "https://a.espncdn.com/i/teamlogos/soccer/500/167.png",
  lille: "https://a.espncdn.com/i/teamlogos/soccer/500/166.png",
  losc: "https://a.espncdn.com/i/teamlogos/soccer/500/166.png",
  lilleosc: "https://a.espncdn.com/i/teamlogos/soccer/500/166.png",
  nice: "https://a.espncdn.com/i/teamlogos/soccer/500/173.png",
  ogcnice: "https://a.espncdn.com/i/teamlogos/soccer/500/173.png",
  lens: "https://a.espncdn.com/i/teamlogos/soccer/500/175.png",
  rclens: "https://a.espncdn.com/i/teamlogos/soccer/500/175.png",
  rennes: "https://a.espncdn.com/i/teamlogos/soccer/500/169.png",
  staderennais: "https://a.espncdn.com/i/teamlogos/soccer/500/169.png",
  strasbourg: "https://a.espncdn.com/i/teamlogos/soccer/500/170.png",
  rcstrasbourg: "https://a.espncdn.com/i/teamlogos/soccer/500/170.png",
  brest: "https://a.espncdn.com/i/teamlogos/soccer/500/6997.png",
  stadebrestois: "https://a.espncdn.com/i/teamlogos/soccer/500/6997.png",
  toulouse: "https://a.espncdn.com/i/teamlogos/soccer/500/178.png",
  toulousefc: "https://a.espncdn.com/i/teamlogos/soccer/500/178.png",
  lehavre: "https://a.espncdn.com/i/teamlogos/soccer/500/3236.png",
  lehavreac: "https://a.espncdn.com/i/teamlogos/soccer/500/3236.png",
  havreathletic: "https://a.espncdn.com/i/teamlogos/soccer/500/3236.png",
  havreathleti: "https://a.espncdn.com/i/teamlogos/soccer/500/3236.png",
  havre: "https://a.espncdn.com/i/teamlogos/soccer/500/3236.png",
  saintetienne: "https://a.espncdn.com/i/teamlogos/soccer/500/176.png",
  alnassr: "https://a.espncdn.com/i/teamlogos/soccer/500/817.png",
  alhilal: "https://a.espncdn.com/i/teamlogos/soccer/500/929.png",
  alittihad: "https://a.espncdn.com/i/teamlogos/soccer/500/2276.png",
  alahli: "https://a.espncdn.com/i/teamlogos/soccer/500/8346.png",
  alahlisaudi: "https://a.espncdn.com/i/teamlogos/soccer/500/8346.png",
  alshabab: "https://a.espncdn.com/i/teamlogos/soccer/500/793.png",
  alettifaq: "https://a.espncdn.com/i/teamlogos/soccer/500/8363.png",
  alhazm: "https://a.espncdn.com/i/teamlogos/soccer/500/21964.png",
  alhazem: "https://a.espncdn.com/i/teamlogos/soccer/500/21964.png",
  neom: "https://a.espncdn.com/i/teamlogos/soccer/500/130899.png",
  neomsc: "https://a.espncdn.com/i/teamlogos/soccer/500/130899.png",
  neomsports: "https://a.espncdn.com/i/teamlogos/soccer/500/130899.png",
  neomsportsclub: "https://a.espncdn.com/i/teamlogos/soccer/500/130899.png",
  alkhaleej: "https://a.espncdn.com/i/teamlogos/soccer/500/21829.png",
  alkhaleejclub: "https://a.espncdn.com/i/teamlogos/soccer/500/21829.png",
  intermiami: "https://a.espncdn.com/i/teamlogos/soccer/500/20232.png",
  intermiamicf: "https://a.espncdn.com/i/teamlogos/soccer/500/20232.png",
  lagalaxy: "https://a.espncdn.com/i/teamlogos/soccer/500/187.png",
  lafc: "https://a.espncdn.com/i/teamlogos/soccer/500/18966.png",
  newyorkredbulls: "https://a.espncdn.com/i/teamlogos/soccer/500/190.png",
  newyorkcity: "https://a.espncdn.com/i/teamlogos/soccer/500/17606.png",
  nycfc: "https://a.espncdn.com/i/teamlogos/soccer/500/17606.png",
  sportingcp: "https://a.espncdn.com/i/teamlogos/soccer/500/228.png",
  sporting: "https://a.espncdn.com/i/teamlogos/soccer/500/228.png",
  benfica: "https://a.espncdn.com/i/teamlogos/soccer/500/221.png",
  porto: "https://a.espncdn.com/i/teamlogos/soccer/500/226.png",
  ajax: "https://a.espncdn.com/i/teamlogos/soccer/500/139.png",
  psv: "https://a.espncdn.com/i/teamlogos/soccer/500/148.png",
  feyenoord: "https://a.espncdn.com/i/teamlogos/soccer/500/141.png",
  celtic: "https://a.espncdn.com/i/teamlogos/soccer/500/301.png",
  celticfc: "https://a.espncdn.com/i/teamlogos/soccer/500/301.png",
  rangers: "https://a.espncdn.com/i/teamlogos/soccer/500/304.png",
  rangersfc: "https://a.espncdn.com/i/teamlogos/soccer/500/304.png",
  galatasaray: "https://a.espncdn.com/i/teamlogos/soccer/500/432.png",
  fenerbahce: "https://a.espncdn.com/i/teamlogos/soccer/500/436.png",
  besiktas: "https://a.espncdn.com/i/teamlogos/soccer/500/433.png",
  shakhtar: "https://a.espncdn.com/i/teamlogos/soccer/500/609.png",
  shakhtardonetsk: "https://a.espncdn.com/i/teamlogos/soccer/500/609.png",
  salzburg: "https://a.espncdn.com/i/teamlogos/soccer/500/2753.png",
  redbullsalzburg: "https://a.espncdn.com/i/teamlogos/soccer/500/2753.png",
  clubbrugge: "https://a.espncdn.com/i/teamlogos/soccer/500/570.png",
  youngboys: "https://r2.thesportsdb.com/images/media/team/badge/9mxdoo1534784569.png",
  bscyoungboys: "https://r2.thesportsdb.com/images/media/team/badge/9mxdoo1534784569.png",
  copenhagen: "https://r2.thesportsdb.com/images/media/team/badge/styqtr1473535513.png",
  fccopenhagen: "https://r2.thesportsdb.com/images/media/team/badge/styqtr1473535513.png",
  dynamokyiv: "https://r2.thesportsdb.com/images/media/team/badge/ktbncx1781158762.png",
  crvenazvezda: "https://r2.thesportsdb.com/images/media/team/badge/osgmbz1781157114.png",
  fkcrvenazvezda: "https://r2.thesportsdb.com/images/media/team/badge/osgmbz1781157114.png",
  vietnam: "https://a.espncdn.com/i/teamlogos/countries/500/vie.png",
  vietnamnu: "https://a.espncdn.com/i/teamlogos/countries/500/vie.png",
  y: "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
  ynu: "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
  italia: "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
  italy: "https://a.espncdn.com/i/teamlogos/countries/500/ita.png",
  uc: "https://a.espncdn.com/i/teamlogos/countries/500/aus.png",
  ucnu: "https://a.espncdn.com/i/teamlogos/countries/500/aus.png",
  australia: "https://a.espncdn.com/i/teamlogos/countries/500/aus.png",
  anh: "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
  england: "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
  phap: "https://a.espncdn.com/i/teamlogos/countries/500/fra.png",
  france: "https://a.espncdn.com/i/teamlogos/countries/500/fra.png",
  duc: "https://a.espncdn.com/i/teamlogos/countries/500/ger.png",
  germany: "https://a.espncdn.com/i/teamlogos/countries/500/ger.png",
  taybannha: "https://a.espncdn.com/i/teamlogos/countries/500/esp.png",
  spain: "https://a.espncdn.com/i/teamlogos/countries/500/esp.png",
  bodaonha: "https://a.espncdn.com/i/teamlogos/countries/500/por.png",
  portugal: "https://a.espncdn.com/i/teamlogos/countries/500/por.png",
  argentina: "https://a.espncdn.com/i/teamlogos/countries/500/arg.png",
  brazil: "https://a.espncdn.com/i/teamlogos/countries/500/bra.png",
  halan: "https://a.espncdn.com/i/teamlogos/countries/500/ned.png",
  netherlands: "https://a.espncdn.com/i/teamlogos/countries/500/ned.png",
  nhatban: "https://a.espncdn.com/i/teamlogos/countries/500/jpn.png",
  japan: "https://a.espncdn.com/i/teamlogos/countries/500/jpn.png",
  hanquoc: "https://a.espncdn.com/i/teamlogos/countries/500/kor.png",
  korea: "https://a.espncdn.com/i/teamlogos/countries/500/kor.png",
  thailand: "https://a.espncdn.com/i/teamlogos/countries/500/tha.png",
  indonesia: "https://a.espncdn.com/i/teamlogos/countries/500/idn.png",
  iran: "https://a.espncdn.com/i/teamlogos/countries/500/irn.png",
  qatar: "https://a.espncdn.com/i/teamlogos/countries/500/qat.png",
  hanoifc: "https://r2.thesportsdb.com/images/media/team/badge/uzjjm91788454716.png",
  hanoi: "https://r2.thesportsdb.com/images/media/team/badge/uzjjm91788454716.png",
  viettel: "https://r2.thesportsdb.com/images/media/team/badge/o0fu2m1788454777.png",
  thecongviettel: "https://r2.thesportsdb.com/images/media/team/badge/o0fu2m1788454777.png",
  namdinh: "https://r2.thesportsdb.com/images/media/team/badge/6sxhhm1756533481.png",
  thepxanhnamdinh: "https://r2.thesportsdb.com/images/media/team/badge/6sxhhm1756533481.png",
  hoanganhgialai: "https://r2.thesportsdb.com/images/media/team/badge/cmo4q31788454939.png",
  hagl: "https://r2.thesportsdb.com/images/media/team/badge/cmo4q31788454939.png",
  songlamnghean: "https://r2.thesportsdb.com/images/media/team/badge/y93jh41642709143.png",
  slna: "https://r2.thesportsdb.com/images/media/team/badge/y93jh41642709143.png",
  haiphong: "https://r2.thesportsdb.com/images/media/team/badge/shbwss1644249575.png",
  haiphongfc: "https://r2.thesportsdb.com/images/media/team/badge/shbwss1644249575.png",
  thanhhoa: "https://r2.thesportsdb.com/images/media/team/badge/2ewkub1789076140.png",
  dongathanhhoa: "https://r2.thesportsdb.com/images/media/team/badge/2ewkub1789076140.png",
  danang: "https://r2.thesportsdb.com/images/media/team/badge/ly6chx1583778088.png",
  shbdanang: "https://r2.thesportsdb.com/images/media/team/badge/ly6chx1583778088.png",
  conganhanoi: "https://r2.thesportsdb.com/images/media/team/badge/bwld2x1755751111.png",
  cahn: "https://r2.thesportsdb.com/images/media/team/badge/bwld2x1755751111.png",
  tphcm: "https://r2.thesportsdb.com/images/media/team/badge/zegcsi1757913072.png",
  tphochiminh: "https://r2.thesportsdb.com/images/media/team/badge/zegcsi1757913072.png",
  honglinhhatinh: "/images/teams/hong-linh-ha-tinh.png",
  hatinh: "/images/teams/hong-linh-ha-tinh.png",
  santoslaguna: "https://a.espncdn.com/i/teamlogos/soccer/500/230.png",
  bgpathumunited: "https://a.espncdn.com/i/teamlogos/soccer/500/17804.png",
  bgpathum: "https://a.espncdn.com/i/teamlogos/soccer/500/17804.png",
};

const AUXILIARY_LOGO_WORDS = new Set([
  "clb", "fc", "ssc", "vfb", "ac", "as", "rc", "sc", "sl", "afc", "ogc", "fk", "sk", "cf", "cd", "ca",
  "csd", "deportes", "deportivo", "deportiva", "dep", "municipal", "muni", "club", "clube", "societa",
  "asociacion", "asoc", "agrupacion", "ud", "sd", "ad", "sv", "tsv", "fsv", "spvg", "vfl", "ksv", "bsc",
  "united", "utd", "city", "town", "athletic", "albion", "rovers", "wanderers", "county", "sports",
  "u19", "u20", "u21", "u23", "b", "reserves", "women", "nu"
]);

export function normalizeTeamKey(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb|csd|deportes|municipal)\s+/i, "")
    .replace(/^(clb|fc|s\s*s\s*c|ssc|vfb|v\s*f\s*b|ac|as|rc|sc|sl|afc|ogc|fk|sk|cf|cd|rb|csd|deportes|municipal)\s+/i, "")
    .replace(/\s+(clb|fc|fk|sc|cf|united|utd|city|town)$/i, "")
    .replace(/\s+(clb|fc|fk|sc|cf|united|utd|city|town)$/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function extractCoreTokens(name: string): string[] {
  if (!name) return [];
  const clean = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const significant = rawTokens.filter(
    (w) => w.length >= 3 && !AUXILIARY_LOGO_WORDS.has(w),
  );
  return significant.length > 0 ? significant : rawTokens;
}

function isTeamIdentityMatch(
  queriedTeam: string,
  apiTeam: { strTeam?: string; strTeamShort?: string; strAlternate?: string },
): boolean {
  if (!queriedTeam || !apiTeam || !apiTeam.strTeam) return false;

  const qKey = normalizeTeamKey(queriedTeam);
  const teamKey = normalizeTeamKey(apiTeam.strTeam);
  const altKey = apiTeam.strAlternate ? normalizeTeamKey(apiTeam.strAlternate) : "";
  const shortKey = apiTeam.strTeamShort ? normalizeTeamKey(apiTeam.strTeamShort) : "";

  // 1. Direct exact normalized key match or alias match
  if (qKey && (qKey === teamKey || (altKey && qKey === altKey) || (shortKey && qKey === shortKey))) {
    return true;
  }

  // 2. Core significant token overlap (e.g. "Deportes Iquique" vs "Iquique")
  const qTokens = extractCoreTokens(queriedTeam);
  const apiTokens = extractCoreTokens(apiTeam.strTeam);
  if (qTokens.length > 0 && apiTokens.length > 0) {
    const shared = qTokens.filter((t) => apiTokens.includes(t));
    if (shared.some((t) => t.length >= 4)) {
      return true;
    }
  }

  return false;
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
    .replace(/^CSD\s+/i, "")
    .replace(/^Deportes\s+/i, "")
    .replace(/^Municipal\s+/i, "")
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
          signal: AbortSignal.timeout(1800),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.teams)) {
          // Xác thực danh tính team trước khi lấy strBadge
          for (const t of data.teams) {
            if (t?.strBadge && isTeamIdentityMatch(teamName, t)) {
              LOGO_CACHE.set(key, t.strBadge);
              return t.strBadge;
            }
          }
        }
      }
    } catch {
      // Timeout hoặc network error -> thử query tiếp
    }
  }

  // Nếu không tìm thấy hoặc không khớp danh tính, lưu chuỗi rỗng vào cache để không gán nhầm
  LOGO_CACHE.set(key, "");
  return "";
}

/**
 * Bổ sung logo cho tất cả các trận đấu song song (Tối ưu hóa siêu tốc cho Vercel SSR)
 */
export async function enrichMatchLogos<T extends { team1: string; team2: string; homeLogo?: string; awayLogo?: string }>(
  matches: T[]
): Promise<T[]> {
  // 1. Phục hồi 0ms từ static dictionary trước
  for (const m of matches) {
    if (m.team1 && (!m.homeLogo || m.homeLogo.includes("tinhlagi.pro/logo.jpg"))) {
      const key = normalizeTeamKey(m.team1);
      if (key && STATIC_CLUB_LOGOS[key]) m.homeLogo = STATIC_CLUB_LOGOS[key];
      else if (key && LOGO_CACHE.has(key)) m.homeLogo = LOGO_CACHE.get(key) || "";
    }
    if (m.team2 && (!m.awayLogo || m.awayLogo.includes("tinhlagi.pro/logo.jpg"))) {
      const key = normalizeTeamKey(m.team2);
      if (key && STATIC_CLUB_LOGOS[key]) m.awayLogo = STATIC_CLUB_LOGOS[key];
      else if (key && LOGO_CACHE.has(key)) m.awayLogo = LOGO_CACHE.get(key) || "";
    }
  }

  // 2. Query TheSportsDB bất đồng bộ chạy nền để cập nhật LOGO_CACHE cho các request tiếp theo (KHÔNG block SSR critical path)
  const pending = matches
    .filter(
      (m) =>
        (m.team1 && (!m.homeLogo || m.homeLogo.includes("tinhlagi.pro/logo.jpg"))) ||
        (m.team2 && (!m.awayLogo || m.awayLogo.includes("tinhlagi.pro/logo.jpg")))
    )
    .slice(0, 8);

  if (pending.length > 0) {
    Promise.allSettled(
      pending.map(async (m) => {
        const needHome = Boolean(m.team1) && (!m.homeLogo || m.homeLogo.includes("tinhlagi.pro/logo.jpg"));
        const needAway = Boolean(m.team2) && (!m.awayLogo || m.awayLogo.includes("tinhlagi.pro/logo.jpg"));

        if (needHome && m.team1) {
          const logo = await resolveTeamLogo(m.team1);
          if (logo) m.homeLogo = logo;
        }
        if (needAway && m.team2) {
          const logo = await resolveTeamLogo(m.team2);
          if (logo) m.awayLogo = logo;
        }
      })
    ).catch(() => {});
  }

  return matches;
}
