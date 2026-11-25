/**
 * Lightweight standalone national country flag registry (~5 KB).
 * Decouples UI badges (`CountryBadge`) from heavy club/esports/R2 manifest data
 * in `teamAssets.ts` so catalog pages do not bundle ~250+ KB of live-sports assets.
 */

export interface NationalTeamEntry {
  name: string;
  emoji: string;
  logo?: string;
  aliases: string[];
}

export function normalizeTeamTokens(name: string): string[] {
  if (!name) return [];
  // Bảo toàn cụm đặc thù tránh nhầm lẫn giữa Barcelona SC và FC Barcelona
  const preserveSpecial = name.replace(/\bbarcelona\s+sc\b/gi, "barcelonasc");
  const clean = preserveSpecial
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    // Bỏ các tiền tố / hậu tố giải trẻ (U20, U23...), ĐTQG, tiền tố nhà nước (CH, IR, Republic of...)
    .replace(/\b(u\d{2}|u\d|doi tuyen|dtqg|dt|republic of the|republic of|cong hoa|ch|islamic republic of|ir)\b/gi, " ")
    .replace(/\b(clb|fc|sc|afc|vfb|ac|as|rc|cf|cd|ud|sd|rb|women|men|nu|b)\b/gi, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return clean.split(/\s+/).filter(Boolean);
}

export function normalizeTeamKey(name: string): string {
  return normalizeTeamTokens(name).join("");
}

// DANH SÁCH TOÀN BỘ CÁC ĐỘI TUYỂN QUỐC GIA TRÊN THẾ GIỚI
export const NATIONAL_TEAMS_DATA: NationalTeamEntry[] = [
  // --- CHÂU Á & ĐÔNG NAM Á (AFC) ---
  { name: "Việt Nam", emoji: "🇻🇳", aliases: ["vietnam", "viet nam", "viet", "vn", "vie", "dtqg viet nam", "vietnam nu", "u23 viet nam"] },
  { name: "Nhật Bản", emoji: "🇯🇵", aliases: ["japan", "nhat ban", "nhat", "jpn", "jp", "samurai blue"] },
  { name: "Hàn Quốc", emoji: "🇰🇷", aliases: ["south korea", "korea republic", "republic of korea", "han quoc", "han", "rok", "kor", "kr", "taegeuk warriors"] },
  { name: "Triều Tiên", emoji: "🇰🇵", aliases: ["north korea", "dpr korea", "dprk", "prk", "trieu tien", "bac trieu tien"] },
  { name: "Trung Quốc", emoji: "🇨🇳", aliases: ["china", "china pr", "pr china", "trung quoc", "trung", "cn", "chn", "team dragon"] },
  { name: "Thái Lan", emoji: "🇹🇭", aliases: ["thailand", "thai lan", "thai", "tha", "th", "war elephants"] },
  { name: "Indonesia", emoji: "🇮🇩", aliases: ["indonesia", "indo", "idn", "ina", "id", "timnas indonesia", "garuda"] },
  { name: "Malaysia", emoji: "🇲🇾", aliases: ["malaysia", "ma lai", "mas", "harimau malaya"] },
  { name: "Singapore", emoji: "🇸🇬", aliases: ["singapore", "sing", "sg", "the lions"] },
  { name: "Philippines", emoji: "🇵🇭", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/10739.png", aliases: ["philippines", "phi", "ph", "azkals"] },
  { name: "Myanmar", emoji: "🇲🇲", aliases: ["myanmar", "mianma", "mm", "asian lions"] },
  { name: "Lào", emoji: "🇱🇦", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/187.png", aliases: ["laos", "lao", "la"] },
  { name: "Campuchia", emoji: "🇰🇭", aliases: ["cambodia", "campuchia", "khmer", "kh"] },
  { name: "Brunei", emoji: "🇧🇳", aliases: ["brunei", "brunei darussalam", "bn"] },
  { name: "Đông Timor", emoji: "🇹🇱", aliases: ["timor leste", "dong timor", "timor", "tls"] },
  { name: "Úc", emoji: "🇦🇺", aliases: ["australia", "uc", "au", "socceroos", "matildas"] },
  { name: "Ả Rập Xê Út", emoji: "🇸🇦", aliases: ["saudi arabia", "a rap xe ut", "saudi", "sa", "green falcons"] },
  { name: "Qatar", emoji: "🇶🇦", aliases: ["qatar", "qa", "the maroon"] },
  { name: "UAE", emoji: "🇦🇪", aliases: ["united arab emirates", "uae", "cac tieu vuong quoc a rap", "al abyad"] },
  { name: "Iran", emoji: "🇮🇷", aliases: ["iran", "ir iran", "ir", "islamic republic of iran", "team melli"] },
  { name: "Iraq", emoji: "🇮🇶", aliases: ["iraq", "iq", "lions of mesopotamia"] },
  { name: "Uzbekistan", emoji: "🇺🇿", aliases: ["uzbekistan", "uzbek", "uz", "white wolves"] },
  { name: "Jordan", emoji: "🇯🇴", aliases: ["jordan", "jo", "the chivalrous"] },
  { name: "Palestine", emoji: "🇵🇸", aliases: ["palestine", "ps", "the fedayeen"] },
  { name: "Syria", emoji: "🇸🇾", aliases: ["syria", "sy", "qasioun eagles"] },
  { name: "Liban", emoji: "🇱🇧", aliases: ["lebanon", "liban", "lb", "cedars"] },
  { name: "Oman", emoji: "🇴🇲", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/165.png", aliases: ["oman", "om", "red warriors"] },
  { name: "Bahrain", emoji: "🇧🇭", aliases: ["bahrain", "bh", "dilmun warriors"] },
  { name: "Kuwait", emoji: "🇰🇼", aliases: ["kuwait", "kw", "al azraq"] },
  { name: "Yemen", emoji: "🇾🇪", aliases: ["yemen", "ye"] },
  { name: "Tajikistan", emoji: "🇹🇯", aliases: ["tajikistan", "tj", "crowns"] },
  { name: "Kyrgyzstan", emoji: "🇰🇬", aliases: ["kyrgyzstan", "kg", "white falcons"] },
  { name: "Turkmenistan", emoji: "🇹🇲", aliases: ["turkmenistan", "tm"] },
  { name: "Ấn Độ", emoji: "🇮🇳", aliases: ["india", "an do", "in", "blue tigers"] },
  { name: "Maldives", emoji: "🇲🇻", aliases: ["maldives", "mv", "red snappers"] },
  { name: "Đài Loan", emoji: "🇹🇼", aliases: ["chinese taipei", "taiwan", "dai loan", "tpe"] },
  { name: "Hong Kong", emoji: "🇭🇰", aliases: ["hong kong", "hk", "the dragons"] },
  { name: "Mông Cổ", emoji: "🇲🇳", aliases: ["mongolia", "mong co", "mn"] },
  { name: "Nepal", emoji: "🇳🇵", aliases: ["nepal", "np"] },
  { name: "Sri Lanka", emoji: "🇱🇰", aliases: ["sri lanka", "lk"] },
  { name: "Bangladesh", emoji: "🇧🇩", aliases: ["bangladesh", "bd"] },
  { name: "Pakistan", emoji: "🇵🇰", aliases: ["pakistan", "pk"] },
  { name: "Afghanistan", emoji: "🇦🇫", aliases: ["afghanistan", "af"] },
  { name: "Bhutan", emoji: "🇧🇹", aliases: ["bhutan", "bt"] },
  { name: "Macau", emoji: "🇲🇴", aliases: ["macau", "mo"] },
  { name: "Guam", emoji: "🇬🇺", aliases: ["guam", "gu"] },

  // --- CHÂU PHI (CAF) ---
  { name: "Sudan", emoji: "🇸🇩", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/22529.png", aliases: ["sudan", "sd", "falcons of jediane"] },
  { name: "Nam Sudan", emoji: "🇸🇸", aliases: ["south sudan", "nam sudan", "ss"] },
  { name: "Tanzania", emoji: "🇹🇿", aliases: ["tanzania", "tz", "taifa stars"] },
  { name: "Namibia", emoji: "🇳🇦", aliases: ["namibia", "na", "brave warriors"] },
  { name: "Congo", emoji: "🇨🇬", aliases: ["congo", "republic of the congo", "ch congo", "cong hoa congo", "cg", "red devils"] },
  { name: "CHDC Congo", emoji: "🇨🇩", aliases: ["dr congo", "democratic republic of the congo", "chdc congo", "cd", "leopards"] },
  { name: "Algeria", emoji: "🇩🇿", aliases: ["algeria", "dz", "desert foxes", "les fennecs"] },
  { name: "Tunisia", emoji: "🇹🇳", aliases: ["tunisia", "tn", "eagles of carthage"] },
  { name: "Ai Cập", emoji: "🇪🇬", aliases: ["egypt", "ai cap", "eg", "pharaohs"] },
  { name: "Ma-rốc", emoji: "🇲🇦", aliases: ["morocco", "ma roc", "ma", "atlas lions"] },
  { name: "Senegal", emoji: "🇸🇳", aliases: ["senegal", "sn", "lions of teranga"] },
  { name: "Nigeria", emoji: "🇳🇬", aliases: ["nigeria", "ng", "super eagles"] },
  { name: "Ghana", emoji: "🇬🇭", aliases: ["ghana", "gh", "black stars"] },
  { name: "Cameroon", emoji: "🇨🇲", aliases: ["cameroon", "cm", "indomitable lions"] },
  { name: "Bờ Biển Ngà", emoji: "🇨🇮", aliases: ["ivory coast", "cote d ivoire", "bo bien nga", "ci", "the elephants"] },
  { name: "Nam Phi", emoji: "🇿🇦", aliases: ["south africa", "nam phi", "za", "bafana bafana"] },
  { name: "Mali", emoji: "🇲🇱", aliases: ["mali", "ml", "les aigles"] },
  { name: "Burkina Faso", emoji: "🇧🇫", aliases: ["burkina faso", "bf", "les etalons"] },
  { name: "Guinea", emoji: "🇬🇳", aliases: ["guinea", "gn", "syli nationale"] },
  { name: "Zambia", emoji: "🇿🇲", aliases: ["zambia", "zm", "chipolopolo"] },
  { name: "Zimbabwe", emoji: "🇿🇼", aliases: ["zimbabwe", "zw", "the warriors"] },
  { name: "Angola", emoji: "🇦🇴", aliases: ["angola", "ao", "palancas negras"] },
  { name: "Mozambique", emoji: "🇲🇿", aliases: ["mozambique", "mz", "mambas"] },
  { name: "Uganda", emoji: "🇺🇬", aliases: ["uganda", "ug", "the cranes"] },
  { name: "Kenya", emoji: "🇰🇪", aliases: ["kenya", "ke", "harambee stars"] },
  { name: "Ethiopia", emoji: "🇪🇹", aliases: ["ethiopia", "et", "walias"] },
  { name: "Madagascar", emoji: "🇲🇬", aliases: ["madagascar", "mg", "barea"] },
  { name: "Mauritania", emoji: "🇲🇷", aliases: ["mauritania", "mr", "almoravids"] },
  { name: "Cape Verde", emoji: "🇨🇻", aliases: ["cape verde", "cv", "blue sharks"] },
  { name: "Gabon", emoji: "🇬🇦", aliases: ["gabon", "ga", "the panthers"] },
  { name: "Guinea Xích Đạo", emoji: "🇬🇶", aliases: ["equatorial guinea", "guinea xich dao", "gq", "nzalang nacional"] },
  { name: "Guinea-Bissau", emoji: "🇬🇼", aliases: ["guinea-bissau", "guinea bissau", "gw"] },
  { name: "Togo", emoji: "🇹🇬", aliases: ["togo", "tg", "the sparrowhawks"] },
  { name: "Benin", emoji: "🇧🇯", aliases: ["benin", "bj", "the cheetahs"] },
  { name: "Niger", emoji: "🇳🇪", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/189.png", aliases: ["niger", "ne", "mena"] },
  { name: "Libya", emoji: "🇱🇾", aliases: ["libya", "ly", "mediterranean knights"] },
  { name: "Botswana", emoji: "🇧🇼", aliases: ["botswana", "bw", "the zebras"] },
  { name: "Rwanda", emoji: "🇷🇼", aliases: ["rwanda", "rw", "amavubi"] },
  { name: "Burundi", emoji: "🇧🇮", aliases: ["burundi", "bi", "the swallows"] },

  // --- CHÂU ÂU (UEFA) ---
  { name: "Anh", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", aliases: ["england", "anh", "tam su", "three lions"] },
  { name: "Pháp", emoji: "🇫🇷", aliases: ["france", "phap", "fr", "les bleus", "gaulois"] },
  { name: "Đức", emoji: "🇩🇪", aliases: ["germany", "duc", "de", "die mannschaft"] },
  { name: "Tây Ban Nha", emoji: "🇪🇸", aliases: ["spain", "tay ban nha", "es", "la roja", "tbn"] },
  { name: "Bồ Đào Nha", emoji: "🇵🇹", aliases: ["portugal", "bo dao nha", "pt", "a selecao das quinas", "bdn"] },
  { name: "Ý", emoji: "🇮🇹", aliases: ["italy", "italia", "y", "it", "azzurri"] },
  { name: "Hà Lan", emoji: "🇳🇱", aliases: ["netherlands", "ha lan", "holland", "nl", "con loc mau da cam", "oranje"] },
  { name: "Bỉ", emoji: "🇧🇪", aliases: ["belgium", "bi", "be", "quy do", "red devils"] },
  { name: "Croatia", emoji: "🇭🇷", aliases: ["croatia", "hr", "vatreni"] },
  { name: "Thụy Sĩ", emoji: "🇨🇭", aliases: ["switzerland", "thuy si", "ch", "nati"] },
  { name: "Đan Mạch", emoji: "🇩🇰", aliases: ["denmark", "dan mach", "den", "dnk", "thung lung do", "danish dynamite"] },
  { name: "Thụy Điển", emoji: "🇸🇪", aliases: ["sweden", "thuy dien", "se", "blagult"] },
  { name: "Na Uy", emoji: "🇳🇴", aliases: ["norway", "na uy", "no", "lions"] },
  { name: "Ba Lan", emoji: "🇵🇱", aliases: ["poland", "ba lan", "pl", "dai bang trang", "biale orly"] },
  { name: "Thổ Nhĩ Kỳ", emoji: "🇹🇷", aliases: ["turkey", "tho nhi ky", "tr", "ay yildizlilar"] },
  { name: "Hy Lạp", emoji: "🇬🇷", aliases: ["greece", "hy lap", "gr", "piratiko"] },
  { name: "Séc", emoji: "🇨🇿", aliases: ["czech republic", "czechia", "sec", "cz", "narodak"] },
  { name: "Áo", emoji: "🇦🇹", aliases: ["austria", "ao", "at", "das team"] },
  { name: "Hungary", emoji: "🇭🇺", aliases: ["hungary", "hu", "magyarok"] },
  { name: "Ukraina", emoji: "🇺🇦", aliases: ["ukraine", "ukraina", "ua", "synio zhovti"] },
  { name: "Scotland", emoji: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", aliases: ["scotland", "tartan army"] },
  { name: "Xứ Wales", emoji: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", aliases: ["wales", "xu wales", "dragons"] },
  { name: "Cộng Hòa Ireland", emoji: "🇮🇪", aliases: ["ireland", "ai len", "republic of ireland", "boys in green"] },
  { name: "Bắc Ireland", emoji: "🇬🇧", aliases: ["northern ireland", "bac ireland", "green and white army"] },
  { name: "Serbia", emoji: "🇷🇸", aliases: ["serbia", "rs", "orlovi"] },
  { name: "Slovakia", emoji: "🇸🇰", aliases: ["slovakia", "sk", "sokoli"] },
  { name: "Slovenia", emoji: "🇸🇮", aliases: ["slovenia", "si"] },
  { name: "Romania", emoji: "🇷🇴", aliases: ["romania", "ro", "tricolorii"] },
  { name: "Bulgaria", emoji: "🇧🇬", aliases: ["bulgaria", "bg", "the lions"] },
  { name: "Georgia", emoji: "🇬🇪", aliases: ["georgia", "ge", "crusaders"] },
  { name: "Albania", emoji: "🇦🇱", aliases: ["albania", "alb", "kuqezinjte"] },
  { name: "Phần Lan", emoji: "🇫🇮", aliases: ["finland", "phan lan", "fi", "huuhkajat"] },
  { name: "Iceland", emoji: "🇮🇸", aliases: ["iceland", "is", "strakarnir okkar"] },
  { name: "Bosnia & Herzegovina", emoji: "🇧🇦", aliases: ["bosnia and herzegovina", "bosnia", "ba", "dragons"] },
  { name: "Kosovo", emoji: "🇽🇰", aliases: ["kosovo", "dardanet"] },
  { name: "Bắc Macedonia", emoji: "🇲🇰", aliases: ["north macedonia", "macedonia", "mk", "lynxes"] },
  { name: "Montenegro", emoji: "🇲🇪", aliases: ["montenegro", "me", "brave falcons"] },
  { name: "Síp", emoji: "🇨🇾", aliases: ["cyprus", "cy"] },
  { name: "Luxembourg", emoji: "🇱🇺", aliases: ["luxembourg", "lu", "red lions"] },
  { name: "Malta", emoji: "🇲🇹", aliases: ["malta", "mt"] },
  { name: "Kazakhstan", emoji: "🇰🇿", logo: "https://a.espncdn.com/i/teamlogos/nba/500/atl.png", aliases: ["kazakhstan", "kz", "hawks"] },
  { name: "Armenia", emoji: "🇦🇲", aliases: ["armenia", "am"] },
  { name: "Azerbaijan", emoji: "🇦🇿", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/140.png", aliases: ["azerbaijan", "az"] },
  { name: "Moldova", emoji: "🇲🇩", aliases: ["moldova", "md"] },
  { name: "Belarus", emoji: "🇧🇾", aliases: ["belarus", "by"] },
  { name: "Estonia", emoji: "🇪🇪", aliases: ["estonia", "ee"] },
  { name: "Latvia", emoji: "🇱🇻", aliases: ["latvia", "lv"] },
  { name: "Lithuania", emoji: "🇱🇹", aliases: ["lithuania", "lt"] },
  { name: "Quần đảo Faroe", emoji: "🇫🇴", aliases: ["faroe islands", "faroe", "fo"] },
  { name: "Gibraltar", emoji: "🇬🇮", aliases: ["gibraltar", "gi"] },
  { name: "Andorra", emoji: "🇦🇩", aliases: ["andorra", "ad"] },
  { name: "San Marino", emoji: "🇸🇲", aliases: ["san marino", "sm"] },
  { name: "Liechtenstein", emoji: "🇱🇮", aliases: ["liechtenstein", "li"] },
  { name: "Nga", emoji: "🇷🇺", aliases: ["russia", "nga", "ru", "sbornaya"] },

  // --- NAM MỸ (CONMEBOL) ---
  { name: "Brazil", emoji: "🇧🇷", aliases: ["brazil", "brasil", "br", "selecao", "samba"] },
  { name: "Argentina", emoji: "🇦🇷", aliases: ["argentina", "ar", "albiceleste"] },
  { name: "Uruguay", emoji: "🇺🇾", aliases: ["uruguay", "uy", "la celeste", "charruas"] },
  { name: "Colombia", emoji: "🇨🇴", aliases: ["colombia", "co", "los cafeteros"] },
  { name: "Ecuador", emoji: "🇪🇨", aliases: ["ecuador", "ec", "la tri"] },
  { name: "Chile", emoji: "🇨🇱", aliases: ["chile", "cl", "la roja"] },
  { name: "Peru", emoji: "🇵🇪", aliases: ["peru", "pe", "la blanquirroja"] },
  { name: "Paraguay", emoji: "🇵🇾", aliases: ["paraguay", "py", "la albirroja"] },
  { name: "Venezuela", emoji: "🇻🇪", aliases: ["venezuela", "ve", "la vinotinto"] },
  { name: "Bolivia", emoji: "🇧🇴", aliases: ["bolivia", "bo", "la verde"] },

  // --- BẮC & TRUNG MỸ (CONCACAF) ---
  { name: "Mỹ", emoji: "🇺🇸", aliases: ["united states", "usa", "my", "us", "usmnt", "stars and stripes"] },
  { name: "Mexico", emoji: "🇲🇽", aliases: ["mexico", "mx", "el tri"] },
  { name: "Canada", emoji: "🇨🇦", aliases: ["canada", "ca", "les rouges"] },
  { name: "Costa Rica", emoji: "🇨🇷", aliases: ["costa rica", "cr", "los ticos"] },
  { name: "Panama", emoji: "🇵🇦", aliases: ["panama", "pa", "los canaleros"] },
  { name: "Jamaica", emoji: "🇯🇲", aliases: ["jamaica", "jm", "reggae boyz"] },
  { name: "Honduras", emoji: "🇭🇳", aliases: ["honduras", "hn", "los catrachos"] },
  { name: "El Salvador", emoji: "🇸🇻", aliases: ["el salvador", "sv", "la selecta"] },
  { name: "Guatemala", emoji: "🇬🇹", aliases: ["guatemala", "gt", "los chapines"] },
  { name: "Trinidad & Tobago", emoji: "🇹🇹", aliases: ["trinidad and tobago", "trinidad", "tri", "tto", "soca warriors"] },
  { name: "Haiti", emoji: "🇭🇹", aliases: ["haiti", "ht", "les grenadiers"] },
  { name: "Curacao", emoji: "🇨🇼", aliases: ["curacao", "cw"] },
  { name: "Cuba", emoji: "🇨🇺", aliases: ["cuba", "cu"] },
  { name: "Nicaragua", emoji: "🇳🇮", aliases: ["nicaragua", "ni"] },
  { name: "Cộng Hòa Dominica", emoji: "🇩🇴", aliases: ["dominican republic", "dominica", "do"] },
  { name: "Suriname", emoji: "🇸🇷", aliases: ["suriname", "sr"] },

  // --- CHÂU ĐẠI DƯƠNG (OFC) ---
  { name: "New Zealand", emoji: "🇳🇿", aliases: ["new zealand", "nz", "all whites"] },
  { name: "Papua New Guinea", emoji: "🇵🇬", aliases: ["papua new guinea", "png", "pg", "kapuls"] },
  { name: "New Caledonia", emoji: "🇳🇨", aliases: ["new caledonia", "nc", "les cagous"] },
  { name: "Fiji", emoji: "🇫🇯", aliases: ["fiji", "fj", "bula boys"] },
  { name: "Tahiti", emoji: "🇵🇫", aliases: ["tahiti", "toamotu"] },
  { name: "Quần đảo Solomon", emoji: "🇸🇧", aliases: ["solomon islands", "solomon", "sb", "bonitos"] },
  { name: "Vanuatu", emoji: "🇻🇺", aliases: ["vanuatu", "vu"] },
  { name: "Samoa", emoji: "🇼🇸", aliases: ["samoa", "ws"] },
  { name: "Tonga", emoji: "🇹🇴", aliases: ["tonga", "to"] },
];

let flagLookupCache: Map<string, string> | null = null;

function getFlagLookupMap(): Map<string, string> {
  if (flagLookupCache) return flagLookupCache;
  const map = new Map<string, string>();
  for (const country of NATIONAL_TEAMS_DATA) {
    const primaryKey = normalizeTeamKey(country.name);
    if (primaryKey) {
      map.set(primaryKey, country.emoji);
    }
    for (const alias of country.aliases) {
      const aliasKey = normalizeTeamKey(alias);
      if (aliasKey) {
        map.set(aliasKey, country.emoji);
      }
    }
  }
  flagLookupCache = map;
  return map;
}

/**
 * Resolves a country name/alias to its flag emoji without loading club or R2 sports assets.
 */
export function lookupNationalCountryEmoji(countryName: string): string | null {
  const key = normalizeTeamKey(countryName);
  if (!key) return null;
  return getFlagLookupMap().get(key) ?? null;
}
