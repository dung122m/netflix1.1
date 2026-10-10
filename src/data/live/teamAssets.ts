/**
 * Data mapping cờ quốc gia và logo CLB bóng đá / thể thao phổ biến thế giới
 * - Lookup O(1) qua Map tĩnh
 * - Bao phủ toàn bộ >210 đội tuyển quốc gia (FIFA & UN) và >250 CLB bóng đá / bóng rổ hàng đầu
 * - Hỗ trợ alias đa ngôn ngữ (tiếng Việt, tiếng Anh, tên viết tắt, tiền tố giải trẻ U20/U23...)
 * - Không gọi API ngoài khi render
 */

export interface TeamAsset {
  name: string;
  emoji?: string;     // Cờ quốc gia emoji (VD: 🇻🇳, 🇯🇵, 🇰🇷, 🇸🇩, 🇹🇿) hoặc icon đặc thù
  logo?: string;      // Logo SVG/PNG/WebP của CLB hoặc đội bóng
  isCountry?: boolean;
}

export function normalizeTeamTokens(name: string): string[] {
  if (!name) return [];
  const clean = name
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

// 1. DANH SÁCH TOÀN BỘ CÁC ĐỘI TUYỂN QUỐC GIA TRÊN THẾ GIỚI (>210 NƯỚC)
const NATIONAL_TEAMS_DATA: Array<{ name: string; emoji: string; logo?: string; aliases: string[] }> = [
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
  { name: "Đông Timor", emoji: "🇹🇱", aliases: ["timor leste", "dong timor", "timor", "tl"] },
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
  { name: "Đài Loan", emoji: "🇹🇼", aliases: ["chinese taipei", "taiwan", "dai loan", "tw"] },
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
  { name: "Đan Mạch", emoji: "🇩🇰", aliases: ["denmark", "dan mach", "dk", "thung lung do", "danish dynamite"] },
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
  { name: "Albania", emoji: "🇦🇱", aliases: ["albania", "al", "kuqezinjte"] },
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
  { name: "Trinidad & Tobago", emoji: "🇹🇹", aliases: ["trinidad and tobago", "trinidad", "tt", "soca warriors"] },
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

// 2. DANH SÁCH CLB BÓNG ĐÁ, BÓNG RỔ & ESPORTS HÀNG ĐẦU THẾ GIỚI (>280 ĐỘI)
const CLUBS_DATA: Array<{ name: string; logo?: string; emoji?: string; aliases: string[] }> = [
  // --- BÓNG RỔ VIỆT NAM (VBA) & NBA ---
  { name: "Sài Gòn Heat", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mia.png", aliases: ["sai gon heat", "saigon heat", "sg heat", "heat"] },
  { name: "Hà Nội Buffaloes", emoji: "🏀", aliases: ["ha noi buffaloes", "ha noi buffalo", "hanoi buffaloes", "hanoi buffalo", "buffaloes", "buffalo"] },
  { name: "Thăng Long Warriors", emoji: "🏀", aliases: ["thang long warriors", "tl warriors", "thang long"] },
  { name: "Danang Dragons", emoji: "🏀", aliases: ["danang dragons", "da nang dragons", "dragons"] },
  { name: "Cantho Catfish", emoji: "🏀", aliases: ["cantho catfish", "can tho catfish", "catfish"] },
  { name: "Nha Trang Dolphins", emoji: "🏀", aliases: ["nha trang dolphins", "dolphins"] },
  { name: "Ho Chi Minh City Wings", emoji: "🏀", aliases: ["ho chi minh city wings", "hcmc wings", "city wings", "wings"] },
  { name: "Los Angeles Lakers", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/lal.png", aliases: ["lakers", "la lakers", "los angeles lakers"] },
  { name: "Golden State Warriors", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/gs.png", aliases: ["warriors", "golden state warriors", "gsw"] },
  { name: "Boston Celtics", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/bos.png", aliases: ["celtics", "boston celtics"] },
  { name: "Chicago Bulls", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/chi.png", aliases: ["bulls", "chicago bulls"] },
  { name: "Miami Heat", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mia.png", aliases: ["miami heat"] },
  { name: "Denver Nuggets", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/den.png", aliases: ["nuggets", "denver nuggets"] },
  { name: "Milwaukee Bucks", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mil.png", aliases: ["bucks", "milwaukee bucks"] },
  { name: "Dallas Mavericks", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/dal.png", aliases: ["mavericks", "mavs", "dallas mavericks"] },
  { name: "Phoenix Suns", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/phx.png", aliases: ["suns", "phoenix suns"] },
  { name: "New York Knicks", emoji: "🏀", logo: "https://a.espncdn.com/i/teamlogos/nba/500/ny.png", aliases: ["knicks", "new york knicks"] },

  // --- ESPORTS ---
  { name: "Apogee Esports", emoji: "🎮", aliases: ["apogee esports", "apogee esport", "apogee"] },
  { name: "JijieHao", emoji: "🎮", aliases: ["jijiehao", "jijie hao", "jjh"] },
  { name: "T1", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/4o02u71705664404.png", aliases: ["t1", "skt", "skt t1", "t1 lol"] },
  { name: "Gen.G", emoji: "🎮", aliases: ["gen g", "geng", "gen.g"] },
  { name: "GAM Esports", emoji: "🎮", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7102.png", aliases: ["gam", "gam esports", "gigabyte marines"] },
  { name: "Team Flash", emoji: "🎮", aliases: ["team flash", "flash", "fl"] },
  { name: "Saigon Phantom", emoji: "🎮", aliases: ["saigon phantom", "sgp"] },
  { name: "V Gaming", emoji: "🎮", aliases: ["v gaming", "vgp"] },
  { name: "G2 Esports", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/0vkww41675440633.png", aliases: ["g2", "g2 esports"] },
  { name: "Fnatic", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/u877191761294036.png", aliases: ["fnatic", "fnc"] },
  { name: "Team Liquid", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/o1bxs61761218944.png", aliases: ["team liquid", "liquid", "tl"] },
  { name: "Bilibili Gaming", emoji: "🎮", aliases: ["bilibili gaming", "blg"] },
  { name: "Top Esports", emoji: "🎮", aliases: ["top esports", "tes"] },
  { name: "Weibo Gaming", emoji: "🎮", aliases: ["weibo gaming", "wbg"] },

  // --- PREMIER LEAGUE & CHAMPIONSHIP (ANH) ---
  { name: "Arsenal", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png", aliases: ["arsenal", "phao thu", "gunners"] },
  { name: "Chelsea", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/363.png", aliases: ["chelsea", "the blues"] },
  { name: "Liverpool", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/364.png", aliases: ["liverpool", "the kop", "lfc"] },
  { name: "Manchester City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/382.png", aliases: ["manchester city", "man city", "mcfc", "the citizens"] },
  { name: "Manchester United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png", aliases: ["manchester united", "man utd", "mu", "man united", "quy do", "red devils", "mufc"] },
  { name: "Tottenham Hotspur", logo: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/367.png", aliases: ["tottenham hotspur", "tottenham", "spurs", "ga trong"] },
  { name: "Newcastle United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/361.png", aliases: ["newcastle united", "newcastle", "chich choe", "magpies"] },
  { name: "Aston Villa", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/362.png", aliases: ["aston villa", "villa", "avfc"] },
  { name: "West Ham United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/371.png", aliases: ["west ham united", "west ham", "the hammers"] },
  { name: "Brighton & Hove Albion", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/331.png", aliases: ["brighton", "brighton and hove albion", "brighton hov", "seagulls"] },
  { name: "Everton", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/368.png", aliases: ["everton", "the toffees"] },
  { name: "Wolverhampton Wanderers", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/380.png", aliases: ["wolves", "wolverhampton", "wolverhampt", "bay soi"] },
  { name: "Fulham", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/370.png", aliases: ["fulham", "the cottagers"] },
  { name: "Brentford", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/337.png", aliases: ["brentford", "the bees"] },
  { name: "Crystal Palace", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/384.png", aliases: ["crystal palace", "palace", "the eagles"] },
  { name: "Nottingham Forest", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/393.png", aliases: ["nottingham forest", "nottingham", "forest"] },
  { name: "AFC Bournemouth", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/349.png", aliases: ["bournemouth", "bournemout", "afc bournemouth", "cherries"] },
  { name: "Leicester City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/375.png", aliases: ["leicester city", "leicester", "the foxes"] },
  { name: "Southampton", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/376.png", aliases: ["southampton", "saints"] },
  { name: "Ipswich Town", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/373.png", aliases: ["ipswich town", "ipswich", "tractor boys"] },
  { name: "Leeds United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/357.png", aliases: ["leeds united", "leeds"] },
  { name: "Sunderland", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/366.png", aliases: ["sunderland", "black cats"] },
  { name: "Burnley", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/379.png", aliases: ["burnley", "clarets"] },
  { name: "Sheffield United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/398.png", aliases: ["sheffield united", "sheffield utd", "blades"] },
  { name: "Middlesbrough", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/369.png", aliases: ["middlesbrough", "boro"] },
  { name: "West Bromwich Albion", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/383.png", aliases: ["west brom", "west bromwich albion", "baggies"] },
  { name: "Norwich City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/381.png", aliases: ["norwich city", "norwich", "canaries"] },
  { name: "Watford", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/395.png", aliases: ["watford", "hornets"] },

  // --- EFL CHAMPIONSHIP, LEAGUE ONE & TWO (ANH) ---
  { name: "Wycombe Wanderers", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/344.png", aliases: ["wycombe wanderers", "wycombe wanderer", "wycombe", "chairboys"] },
  { name: "Reading", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/338.png", aliases: ["reading", "reading fc", "royals"] },
  { name: "Derby County", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/381.png", aliases: ["derby county", "derby", "rams"] },
  { name: "Bolton Wanderers", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/358.png", aliases: ["bolton wanderers", "bolton", "trotters"] },
  { name: "Peterborough United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/342.png", aliases: ["peterborough united", "peterborough", "posh"] },
  { name: "Portsmouth", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/385.png", aliases: ["portsmouth", "pompey"] },
  { name: "Barnsley", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/397.png", aliases: ["barnsley", "tykes"] },
  { name: "Charlton Athletic", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/372.png", aliases: ["charlton athletic", "charlton", "addicks"] },
  { name: "Oxford United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/311.png", aliases: ["oxford united", "oxford", "u's"] },
  { name: "Blackpool", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/346.png", aliases: ["blackpool", "seasiders", "tangerines"] },
  { name: "Lincoln City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/314.png", aliases: ["lincoln city", "lincoln", "imps"] },
  { name: "Wigan Athletic", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/350.png", aliases: ["wigan athletic", "wigan", "latics"] },
  { name: "Hull City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/306.png", aliases: ["hull city", "hull", "tigers"] },
  { name: "Stoke City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/336.png", aliases: ["stoke city", "stoke", "potters"] },
  { name: "Blackburn Rovers", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/365.png", aliases: ["blackburn rovers", "blackburn", "rovers"] },
  { name: "Preston North End", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/388.png", aliases: ["preston north end", "preston", "pne", "lilywhites"] },
  { name: "Coventry City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/368.png", aliases: ["coventry city", "coventry", "sky blues"] },
  { name: "Bristol City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/361.png", aliases: ["bristol city", "robins"] },
  { name: "Swansea City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/318.png", aliases: ["swansea city", "swansea", "swans"] },
  { name: "Cardiff City", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/347.png", aliases: ["cardiff city", "cardiff", "bluebirds"] },
  { name: "Queens Park Rangers", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/334.png", aliases: ["queens park rangers", "qpr", "hoops"] },
  { name: "Plymouth Argyle", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/384.png", aliases: ["plymouth argyle", "plymouth", "pilgrims"] },
  { name: "Millwall", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/389.png", aliases: ["millwall", "lions"] },
  { name: "Luton Town", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/390.png", aliases: ["luton town", "luton", "hatters"] },
  { name: "Sheffield Wednesday", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/393.png", aliases: ["sheffield wednesday", "sheff wed", "owls"] },

  // --- LA LIGA (TÂY BAN NHA) ---
  { name: "Real Madrid", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/86.png", aliases: ["real madrid", "real", "ken ken trang", "los blancos", "merengues"] },
  { name: "Barcelona", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/83.png", aliases: ["barcelona", "barca", "blaugrana", "culers"] },
  { name: "Atletico Madrid", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/1068.png", aliases: ["atletico madrid", "atletico", "atm", "colchoneros"] },
  { name: "Sevilla", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/243.png", aliases: ["sevilla", "los hispalenses"] },
  { name: "Valencia", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/94.png", aliases: ["valencia", "bay doi", "los che"] },
  { name: "Villarreal", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/102.png", aliases: ["villarreal", "tau ngam vang", "yellow submarine"] },
  { name: "Athletic Bilbao", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/96.png", aliases: ["athletic bilbao", "bilbao", "athletic club", "los leones"] },
  { name: "Real Sociedad", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/89.png", aliases: ["real sociedad", "sociedad", "txuri-urdin"] },
  { name: "Real Betis", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/244.png", aliases: ["real betis", "betis", "verdiblancos"] },
  { name: "Girona", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/9812.png", aliases: ["girona", "girona fc"] },
  { name: "Celta Vigo", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/85.png", aliases: ["celta vigo", "celta", "os celestes"] },
  { name: "RCD Mallorca", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/84.png", aliases: ["mallorca", "rcd mallorca"] },
  { name: "Osasuna", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/97.png", aliases: ["osasuna", "los rojillos"] },
  { name: "Getafe", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2922.png", aliases: ["getafe", "azulones"] },
  { name: "Rayo Vallecano", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/101.png", aliases: ["rayo vallecano", "rayo"] },
  { name: "Espanyol", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/88.png", aliases: ["espanyol", "rcd espanyol"] },
  { name: "Las Palmas", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/98.png", aliases: ["las palmas", "ud las palmas"] },
  { name: "Deportivo Alaves", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/95.png", aliases: ["alaves", "deportivo alaves", "deportivo al"] },
  { name: "Leganes", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/989.png", aliases: ["leganes", "cd leganes"] },
  { name: "Real Valladolid", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/100.png", aliases: ["valladolid", "real valladolid"] },

  // --- SERIE A (Ý) ---
  { name: "Inter Milan", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/110.png", aliases: ["inter milan", "inter", "internazionale", "nerazzurri"] },
  { name: "AC Milan", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/103.png", aliases: ["ac milan", "milan", "rossoneri"] },
  { name: "Juventus", logo: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/111.png", aliases: ["juventus", "juve", "ba dam gia", "bianconeri"] },
  { name: "Napoli", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/114.png", aliases: ["napoli", "ssc napoli", "partenopei"] },
  { name: "AS Roma", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/104.png", aliases: ["as roma", "roma", "giallorossi", "bay soi roma"] },
  { name: "Lazio", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/112.png", aliases: ["lazio", "ss lazio", "biancocelesti"] },
  { name: "Atalanta", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/122.png", aliases: ["atalanta", "la dea"] },
  { name: "Fiorentina", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/109.png", aliases: ["fiorentina", "la viola"] },
  { name: "Bologna", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/107.png", aliases: ["bologna", "rossoblu"] },
  { name: "Torino", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/239.png", aliases: ["torino", "il toro"] },
  { name: "Como 1907", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2573.png", aliases: ["como", "como 1907"] },
  { name: "Parma", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/115.png", aliases: ["parma", "parma calcio"] },
  { name: "Genoa", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/3263.png", aliases: ["genoa", "grifone"] },
  { name: "Cagliari", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/121.png", aliases: ["cagliari", "isolani"] },
  { name: "Hellas Verona", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/108.png", aliases: ["verona", "hellas verona"] },
  { name: "Udinese", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/118.png", aliases: ["udinese", "zebrette"] },
  { name: "Monza", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/4007.png", aliases: ["monza", "ac monza"] },
  { name: "Empoli", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/105.png", aliases: ["empoli", "azzurri"] },
  { name: "Venezia", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/17530.png", aliases: ["venezia", "lagunari"] },
  { name: "Lecce", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/113.png", aliases: ["lecce", "salentini"] },

  // --- BUNDESLIGA (ĐỨC) ---
  { name: "Bayern Munich", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/132.png", aliases: ["bayern munich", "bayern", "bayern munc", "hum xam", "die roten", "fcb"] },
  { name: "Borussia Dortmund", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/124.png", aliases: ["borussia dortmund", "dortmund", "bvb", "die schwarzgelben"] },
  { name: "Bayer Leverkusen", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/131.png", aliases: ["bayer leverkusen", "leverkusen", "die werkself"] },
  { name: "RB Leipzig", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/11420.png", aliases: ["rb leipzig", "leipzig", "die roten bullen"] },
  { name: "Eintracht Frankfurt", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/125.png", aliases: ["eintracht frankfurt", "frankfurt", "die adler"] },
  { name: "VfB Stuttgart", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/134.png", aliases: ["stuttgart", "vfb stuttgart", "die schwaben"] },
  { name: "Borussia Monchengladbach", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/268.png", aliases: ["monchengladbach", "borussia monchengladbach", "gladbach", "die fohlen"] },
  { name: "VfL Wolfsburg", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/138.png", aliases: ["wolfsburg", "vfl wolfsburg", "die wolfe"] },
  { name: "Werder Bremen", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/137.png", aliases: ["werder bremen", "bremen", "die werderaner"] },
  { name: "SC Freiburg", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/126.png", aliases: ["freiburg", "sc freiburg", "breisgau-brasilianer"] },
  { name: "TSG Hoffenheim", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7911.png", aliases: ["hoffenheim", "tsg hoffenheim"] },
  { name: "FC Augsburg", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/3841.png", aliases: ["augsburg", "fc augsburg"] },
  { name: "FSV Mainz 05", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2950.png", aliases: ["mainz", "mainz 05"] },
  { name: "Union Berlin", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/598.png", aliases: ["union berlin", "die eisernen"] },
  { name: "FC St. Pauli", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/272.png", aliases: ["st pauli", "fc st pauli"] },
  { name: "Hamburger SV", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/128.png", aliases: ["hamburg", "hamburger sv", "hsv"] },
  { name: "Schalke 04", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/133.png", aliases: ["schalke", "schalke 04", "die knappen"] },

  // --- LIGUE 1 (PHÁP) ---
  { name: "Paris Saint-Germain", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/160.png", aliases: ["paris saint germain", "psg", "paris", "les parisiens"] },
  { name: "AS Monaco", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/174.png", aliases: ["as monaco", "monaco", "les rouge et blanc"] },
  { name: "Olympique de Marseille", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/165.png", aliases: ["marseille", "olympique de marseille", "om", "les olympiens"] },
  { name: "Olympique Lyonnais", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/167.png", aliases: ["lyon", "olympique lyonnais", "ol", "les gones"] },
  { name: "Lille OSC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/166.png", aliases: ["lille", "lille osc", "losc", "les dogues"] },
  { name: "OGC Nice", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/173.png", aliases: ["nice", "ogc nice", "les aiglons"] },
  { name: "RC Lens", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/175.png", aliases: ["lens", "rc lens", "sang et or"] },
  { name: "Stade Rennais", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/169.png", aliases: ["rennes", "stade rennais", "les rouge et noir"] },
  { name: "Strasbourg", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/170.png", aliases: ["strasbourg", "rc strasbourg"] },
  { name: "Stade Brestois 29", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/6997.png", aliases: ["brest", "stade brestois"] },
  { name: "Toulouse", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/178.png", aliases: ["toulouse", "toulouse fc"] },
  { name: "Nantes", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/165.png", aliases: ["nantes", "fc nantes", "les canaris"] },
  { name: "Saint-Etienne", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/176.png", aliases: ["saint etienne", "asse", "les verts"] },
  { name: "Le Havre AC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/3236.png", aliases: ["le havre", "le havre ac", "havre", "havre athletic", "havre athleti", "havre ac"] },

  // --- EREDIVISIE (HÀ LAN) & PRIMEIRA LIGA (BỒ ĐÀO NHA) ---
  { name: "Ajax Amsterdam", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/139.png", aliases: ["ajax", "ajax amsterdam", "de godenzonen"] },
  { name: "PSV Eindhoven", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/148.png", aliases: ["psv", "psv eindhoven", "boeren"] },
  { name: "Feyenoord Rotterdam", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/142.png", aliases: ["feyenoord", "feyenoord rotterdam", "de club van het volk"] },
  { name: "AZ Alkmaar", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/140.png", aliases: ["az", "az alkmaar"] },
  { name: "Sporting CP", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/228.png", aliases: ["sporting cp", "sporting", "sporting lisbon", "leões"] },
  { name: "SL Benfica", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/221.png", aliases: ["benfica", "sl benfica", "as aguias"] },
  { name: "FC Porto", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/437.png", aliases: ["porto", "fc porto", "dragoes"] },
  { name: "SC Braga", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2994.png", aliases: ["braga", "sc braga", "os gverreiros do minho"] },

  // --- SAUDI PRO LEAGUE ---
  { name: "Al Nassr", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/817.png", aliases: ["al nassr", "alnassr", "al nasr", "cr7 team"] },
  { name: "Al Hilal", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/929.png", aliases: ["al hilal", "alhilal", "the blue waves"] },
  { name: "Al Ittihad", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2276.png", aliases: ["al ittihad", "alittihad", "tigers"] },
  { name: "Al Ahli Saudi", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/8346.png", aliases: ["al ahli", "alahli", "al ahli saudi"] },
  { name: "Al Shabab", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/793.png", aliases: ["al shabab", "alshabab"] },
  { name: "Al Ettifaq", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/8363.png", aliases: ["al ettifaq", "alettifaq"] },
  { name: "Al Hazm", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/21964.png", aliases: ["al hazm", "al hazem", "alhazm"] },
  { name: "NEOM SC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/130899.png", aliases: ["neom", "neom sc", "neom sports", "neom sports club"] },
  { name: "Al Khaleej", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/21829.png", aliases: ["al khaleej", "al khaleej club", "alkhaleej"] },

  // --- MLS (MỸ) ---
  { name: "Inter Miami CF", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/20232.png", aliases: ["inter miami", "inter miami cf", "miami", "messi team", "herons"] },
  { name: "LA Galaxy", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/187.png", aliases: ["la galaxy", "los angeles galaxy", "galaxy"] },
  { name: "Los Angeles FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/18966.png", aliases: ["lafc", "los angeles fc"] },
  { name: "New York Red Bulls", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/190.png", aliases: ["new york red bulls", "ny red bulls"] },
  { name: "New York City FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/17606.png", aliases: ["new york city", "nycfc"] },
  { name: "Atlanta United FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/18418.png", aliases: ["atlanta united", "atlanta utd"] },
  { name: "Columbus Crew", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/183.png", aliases: ["columbus crew"] },
  { name: "Seattle Sounders FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/9726.png", aliases: ["seattle sounders", "sounders"] },

  // --- V-LEAGUE (VIỆT NAM) ---
  { name: "Hà Nội FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/uzjjm91788454716.png", aliases: ["ha noi", "hanoi fc", "clb ha noi", "ha noi fc"] },
  { name: "Công An Hà Nội", logo: "https://r2.thesportsdb.com/images/media/team/badge/bwld2x1755751111.png", aliases: ["cong an ha noi", "cahn", "clb cong an ha noi"] },
  { name: "Thể Công - Viettel", logo: "https://r2.thesportsdb.com/images/media/team/badge/o0fu2m1788454777.png", aliases: ["the cong viettel", "viettel", "the cong", "clb viettel"] },
  { name: "Thép Xanh Nam Định", logo: "https://r2.thesportsdb.com/images/media/team/badge/6sxhhm1756533481.png", aliases: ["nam dinh", "thep xanh nam dinh", "clb nam dinh"] },
  { name: "Hoàng Anh Gia Lai", logo: "https://r2.thesportsdb.com/images/media/team/badge/cmo4q31788454939.png", aliases: ["hoang anh gia lai", "hagl", "clb hoang anh gia lai"] },
  { name: "Sông Lam Nghệ An", logo: "https://r2.thesportsdb.com/images/media/team/badge/y93jh41642709143.png", aliases: ["song lam nghe an", "slna", "clb song lam nghe an"] },
  { name: "Hải Phòng FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/shbwss1644249575.png", aliases: ["hai phong", "hai phong fc", "clb hai phong"] },
  { name: "Becamex Bình Dương", aliases: ["becamex binh duong", "binh duong", "clb binh duong"] },
  { name: "Đông Á Thanh Hóa", logo: "https://r2.thesportsdb.com/images/media/team/badge/2ewkub1789076140.png", aliases: ["thanh hoa", "dong a thanh hoa", "clb thanh hoa"] },
  { name: "SHB Đà Nẵng", logo: "https://r2.thesportsdb.com/images/media/team/badge/ly6chx1583778088.png", aliases: ["shb da nang", "da nang", "clb da nang"] },
  { name: "Quy Nhơn Bình Định", aliases: ["binh dinh", "quy nhon binh dinh"] },
  { name: "TP. Hồ Chí Minh", logo: "https://r2.thesportsdb.com/images/media/team/badge/zegcsi1757913072.png", aliases: ["tp ho chi minh", "tphcm", "clb tp ho chi minh"] },
  { name: "Hồng Lĩnh Hà Tĩnh", logo: "/images/teams/hong-linh-ha-tinh.png", aliases: ["hong linh ha tinh", "ha tinh", "clb ha tinh"] },
  { name: "Quảng Nam", aliases: ["quang nam", "clb quang nam"] },

  // --- THAI LEAGUE (THÁI LAN) ---
  { name: "Buriram United", aliases: ["buriram united", "buriram", "thunder castle"] },
  { name: "Bangkok United", aliases: ["bangkok united", "true bangkok united"] },
  { name: "BG Pathum United", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/17804.png", aliases: ["bg pathum united", "bg pathum", "pathum"] },
  { name: "Port FC", aliases: ["port fc", "port"] },
  { name: "Muangthong United", aliases: ["muangthong united", "muangthong", "the kirins"] },

  // --- J-LEAGUE (NHẬT BẢN) ---
  { name: "Vissel Kobe", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7477.png", aliases: ["vissel kobe", "kobe"] },
  { name: "Yokohama F. Marinos", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7116.png", aliases: ["yokohama f marinos", "yokohama marinos", "marinos"] },
  { name: "Kawasaki Frontale", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7112.png", aliases: ["kawasaki frontale", "frontale"] },
  { name: "Urawa Red Diamonds", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/3385.png", aliases: ["urawa red diamonds", "urawa reds", "reds"] },
  { name: "Kashima Antlers", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7115.png", aliases: ["kashima antlers", "antlers"] },
  { name: "Sanfrecce Hiroshima", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7114.png", aliases: ["sanfrecce hiroshima", "hiroshima"] },
  { name: "Gamba Osaka", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/7102.png", aliases: ["gamba osaka"] },
  { name: "FC Tokyo", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/3384.png", aliases: ["fc tokyo", "tokyo"] },

  // --- K-LEAGUE (HÀN QUỐC) ---
  { name: "Ulsan HD", aliases: ["ulsan hd", "ulsan hyundai", "ulsan"] },
  { name: "Jeonbuk Hyundai Motors", aliases: ["jeonbuk hyundai motors", "jeonbuk hyundai", "jeonbuk"] },
  { name: "Pohang Steelers", aliases: ["pohang steelers", "pohang"] },
  { name: "FC Seoul", aliases: ["fc seoul", "seoul"] },
  { name: "Suwon Samsung Bluewings", aliases: ["suwon samsung bluewings", "suwon samsung", "suwon"] },
  { name: "Incheon United", aliases: ["incheon united", "incheon"] },

  // --- CHÂU ÂU KHÁC (CHAMPIONS LEAGUE GIANTS) ---
  { name: "Celtic FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/301.png", aliases: ["celtic", "celtic fc", "the bhoys"] },
  { name: "Rangers FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/304.png", aliases: ["rangers", "rangers fc", "the gers"] },
  { name: "Galatasaray", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/432.png", aliases: ["galatasaray", "cimbom"] },
  { name: "Fenerbahce", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/436.png", aliases: ["fenerbahce", "sari kanaryalar"] },
  { name: "Besiktas", logo: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/433.png", aliases: ["besiktas", "black eagles"] },
  { name: "Shakhtar Donetsk", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/609.png", aliases: ["shakhtar donetsk", "shakhtar", "hirnyky"] },
  { name: "Dynamo Kyiv", logo: "https://r2.thesportsdb.com/images/media/team/badge/ktbncx1781158762.png", aliases: ["dynamo kyiv", "kiev"] },
  { name: "Red Bull Salzburg", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2753.png", aliases: ["salzburg", "red bull salzburg", "rb salzburg"] },
  { name: "Club Brugge", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/570.png", aliases: ["club brugge", "brugge", "blauw-zwart"] },
  { name: "RSC Anderlecht", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/441.png", aliases: ["anderlecht", "rsc anderlecht"] },
  { name: "FK Crvena Zvezda", logo: "https://r2.thesportsdb.com/images/media/team/badge/osgmbz1781157114.png", aliases: ["crvena zvezda", "sao do belgrade", "red star belgrade"] },
  { name: "GNK Dinamo Zagreb", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/597.png", aliases: ["dinamo zagreb", "zagreb"] },
  { name: "Olympiacos", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/435.png", aliases: ["olympiacos", "olympiakos", "thrylos"] },
  { name: "Panathinaikos", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/437.png", aliases: ["panathinaikos"] },
  { name: "FC Copenhagen", logo: "https://r2.thesportsdb.com/images/media/team/badge/styqtr1473535513.png", aliases: ["copenhagen", "fc copenhagen", "kobenhavn"] },
  { name: "FK Bodo/Glimt", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2980.png", aliases: ["bodo glimt", "bodo/glimt"] },
  { name: "FC Basel", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/583.png", aliases: ["basel", "fc basel"] },
  { name: "BSC Young Boys", logo: "https://r2.thesportsdb.com/images/media/team/badge/9mxdoo1534784569.png", aliases: ["young boys", "bsc young boys", "yb"] },
  { name: "Sparta Prague", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/433.png", aliases: ["sparta prague", "sparta praha"] },
  { name: "Slavia Prague", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/494.png", aliases: ["slavia prague", "slavia praha"] },

  // --- NAM MỸ & CONCACAF / LIGA MX ---
  { name: "Flamengo", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/819.png", aliases: ["flamengo", "cr flamengo", "mengao"] },
  { name: "Palmeiras", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2029.png", aliases: ["palmeiras", "verdao"] },
  { name: "Corinthians", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/874.png", aliases: ["corinthians", "timao"] },
  { name: "Sao Paulo FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2026.png", aliases: ["sao paulo", "sao paulo fc", "tricolor"] },
  { name: "Santos FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/2674.png", aliases: ["santos", "santos fc", "peixe"] },
  { name: "River Plate", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/16.png", aliases: ["river plate", "los millonarios"] },
  { name: "Boca Juniors", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/5.png", aliases: ["boca juniors", "boca", "xeneizes"] },
  { name: "Club Necaxa", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/229.png", aliases: ["necaxa", "club necaxa", "rayos del necaxa", "los rayos"] },
  { name: "Club America", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/227.png", aliases: ["club america", "america", "las aguilas", "aguilas del america"] },
  { name: "CD Guadalajara", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/219.png", aliases: ["chivas", "guadalajara", "chivas guadalajara", "rebano sagrado"] },
  { name: "Cruz Azul", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/218.png", aliases: ["cruz azul", "la maquina"] },
  { name: "CF Monterrey", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/220.png", aliases: ["monterrey", "rayados"] },
  { name: "Tigres UANL", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/232.png", aliases: ["tigres", "uanl", "tigres uanl"] },
  { name: "Pumas UNAM", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/233.png", aliases: ["pumas", "unam", "pumas unam"] },
  { name: "Deportivo Toluca", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/223.png", aliases: ["toluca", "diablos rojos"] },
  { name: "CF Pachuca", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/234.png", aliases: ["pachuca", "tuzos"] },
  { name: "Santos Laguna", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/230.png", aliases: ["santos laguna", "guerreros"] },
  { name: "Atlas FC", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/216.png", aliases: ["atlas", "zorros"] },
  { name: "Club Tijuana", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/10125.png", aliases: ["tijuana", "xolos"] },
  { name: "Club Leon", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/228.png", aliases: ["leon", "la fiera"] },
  { name: "Club Puebla", logo: "https://a.espncdn.com/i/teamlogos/soccer/500/231.png", aliases: ["puebla", "la franja"] },
];

// Xây dựng bảng tra cứu O(1)
const TEAM_ASSETS_MAP = new Map<string, TeamAsset>();

// Đăng ký toàn bộ ĐTQG
for (const country of NATIONAL_TEAMS_DATA) {
  const asset: TeamAsset = {
    name: country.name,
    emoji: country.emoji,
    isCountry: true,
  };
  TEAM_ASSETS_MAP.set(normalizeTeamKey(country.name), asset);
  for (const alias of country.aliases) {
    const key = normalizeTeamKey(alias);
    if (key) {
      TEAM_ASSETS_MAP.set(key, asset);
    }
  }
}

// Đăng ký toàn bộ CLB
for (const club of CLUBS_DATA) {
  const asset: TeamAsset = {
    name: club.name,
    logo: club.logo,
    emoji: club.emoji,
    isCountry: false,
  };
  TEAM_ASSETS_MAP.set(normalizeTeamKey(club.name), asset);
  for (const alias of club.aliases) {
    const key = normalizeTeamKey(alias);
    if (key) {
      // Ưu tiên ĐTQG nếu trùng tên ngắn
      if (!TEAM_ASSETS_MAP.has(key)) {
        TEAM_ASSETS_MAP.set(key, asset);
      }
    }
  }
}

/**
 * Tra cứu thông tin cờ / logo cho tên đội bóng (O(1))
 */
export function getTeamAsset(rawTeamName?: string | null): TeamAsset | null {
  if (!rawTeamName) return null;
  const key = normalizeTeamKey(rawTeamName);
  if (!key) return null;

  // 1. Exact match trên key đã chuẩn hóa
  const exact = TEAM_ASSETS_MAP.get(key);
  if (exact) return exact;

  // 2. Token match cho các trường hợp đặc biệt (tách từng từ có độ dài >= 3)
  const tokens = normalizeTeamTokens(rawTeamName);
  if (tokens.length > 1) {
    for (const t of tokens) {
      if (t.length >= 3) {
        const found = TEAM_ASSETS_MAP.get(t);
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Tổng số lượng đội bóng / ĐTQG đã được index
 */
export const TOTAL_MAPPED_TEAMS = NATIONAL_TEAMS_DATA.length + CLUBS_DATA.length;

/**
 * Trích xuất 2 chữ cái viết tắt của tên đội bóng hoặc biểu tượng bóng đá làm fallback
 */
export function getTeamInitials(teamName?: string | null): string {
  if (!teamName) return "⚽";
  const clean = teamName
    .replace(/^(?:CLB|FC|SSC|CD|UD|SD|AC|AS|RC|CF|BK|SC|U\d{1,2})\s+/i, "")
    .replace(/[^a-zA-Z0-9\s\u00C0-\u1EF9]/g, " ")
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (clean.length >= 2) {
    return clean.slice(0, 2).toUpperCase();
  }
  return clean.toUpperCase() || "⚽";
}

/**
 * Kiểm tra xem chuỗi giải đấu có phải là artifact số thuần túy / giờ phát sóng / ký tự rác không
 * Ví dụ: "23", "22", "🌵 23", "❖ 22", "🎮 🌵 23", "23:00"
 */
export function isRawNumericOrArtifactTournament(t?: string | null): boolean {
  if (!t) return true;
  const trimmed = t.trim();
  if (!trimmed) return true;
  // Phải có ít nhất 1 chữ cái (Latin hoặc Tiếng Việt)
  const hasLetters = /[a-zA-Z\u00C0-\u1EF9]/u.test(trimmed);
  if (!hasLetters) return true;
  // Bỏ emoji và ký tự đặc biệt, nếu chỉ còn lại số thì vẫn là artifact giờ phát sóng (VD: "🎮 23")
  const textWithoutEmojis = trimmed.replace(
    /[\p{Extended_Pictographic}\s\-_:./|()#❖🌵⚡📡🎙️📱🌐🏆⚽🏀🏐🎾🏸🥊🎮🏎️🎱🏅🌍🌎🇻🇳🇬🇧🇪🇸🇮🇹🇩🇪🇫🇷🇺🇸🇸🇦]/gu,
    "",
  );
  if (/^\d+$/.test(textWithoutEmojis)) return true;
  return false;
}
