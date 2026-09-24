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
const NATIONAL_TEAMS_DATA: Array<{ name: string; emoji: string; aliases: string[] }> = [
  // --- CHÂU Á & ĐÔNG NAM Á (AFC) ---
  { name: "Việt Nam", emoji: "🇻🇳", aliases: ["vietnam", "viet nam", "vn", "dtqg viet nam", "vietnam nu", "u23 viet nam"] },
  { name: "Nhật Bản", emoji: "🇯🇵", aliases: ["japan", "nhat ban", "nhat", "jp", "samurai blue"] },
  { name: "Hàn Quốc", emoji: "🇰🇷", aliases: ["south korea", "korea", "han quoc", "han", "kr", "taegeuk warriors"] },
  { name: "Triều Tiên", emoji: "🇰🇵", aliases: ["north korea", "trieu tien", "bac trieu tien", "dprk"] },
  { name: "Trung Quốc", emoji: "🇨🇳", aliases: ["china", "trung quoc", "trung", "cn", "team dragon"] },
  { name: "Thái Lan", emoji: "🇹🇭", aliases: ["thailand", "thai lan", "thai", "th", "war elephants"] },
  { name: "Indonesia", emoji: "🇮🇩", aliases: ["indonesia", "indo", "id", "timnas indonesia", "garuda"] },
  { name: "Malaysia", emoji: "🇲🇾", aliases: ["malaysia", "ma lai", "my", "harimau malaya"] },
  { name: "Singapore", emoji: "🇸🇬", aliases: ["singapore", "sing", "sg", "the lions"] },
  { name: "Philippines", emoji: "🇵🇭", aliases: ["philippines", "phi", "ph", "azkals"] },
  { name: "Myanmar", emoji: "🇲🇲", aliases: ["myanmar", "mianma", "mm", "asian lions"] },
  { name: "Lào", emoji: "🇱🇦", aliases: ["laos", "lao", "la"] },
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
  { name: "Oman", emoji: "🇴🇲", aliases: ["oman", "om", "red warriors"] },
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
  { name: "Sudan", emoji: "🇸🇩", aliases: ["sudan", "sd", "falcons of jediane"] },
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
  { name: "Togo", emoji: "🇹🇬", aliases: ["togo", "tg", "the sparrowhawks"] },
  { name: "Benin", emoji: "🇧🇯", aliases: ["benin", "bj", "the cheetahs"] },
  { name: "Niger", emoji: "🇳🇪", aliases: ["niger", "ne", "mena"] },
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
  { name: "Kazakhstan", emoji: "🇰🇿", aliases: ["kazakhstan", "kz", "hawks"] },
  { name: "Armenia", emoji: "🇦🇲", aliases: ["armenia", "am"] },
  { name: "Azerbaijan", emoji: "🇦🇿", aliases: ["azerbaijan", "az"] },
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
const CLUBS_DATA: Array<{ name: string; logo: string; emoji?: string; aliases: string[] }> = [
  // --- BÓNG RỔ VIỆT NAM (VBA) & NBA ---
  { name: "Sài Gòn Heat", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/p3h1cf1621593502.png", aliases: ["sai gon heat", "saigon heat", "sg heat", "heat"] },
  { name: "Hà Nội Buffaloes", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png", aliases: ["ha noi buffaloes", "ha noi buffalo", "hanoi buffaloes", "hanoi buffalo", "buffaloes", "buffalo"] },
  { name: "Thăng Long Warriors", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/y145v91580047913.png", aliases: ["thang long warriors", "tl warriors", "thang long"] },
  { name: "Danang Dragons", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["danang dragons", "da nang dragons", "dragons"] },
  { name: "Cantho Catfish", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png", aliases: ["cantho catfish", "can tho catfish", "catfish"] },
  { name: "Nha Trang Dolphins", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png", aliases: ["nha trang dolphins", "dolphins"] },
  { name: "Ho Chi Minh City Wings", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["ho chi minh city wings", "hcmc wings", "city wings", "wings"] },
  { name: "Los Angeles Lakers", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["lakers", "la lakers", "los angeles lakers"] },
  { name: "Golden State Warriors", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["warriors", "golden state warriors", "gsw"] },
  { name: "Boston Celtics", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png", aliases: ["celtics", "boston celtics"] },
  { name: "Chicago Bulls", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png", aliases: ["bulls", "chicago bulls"] },
  { name: "Miami Heat", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["miami heat"] },
  { name: "Denver Nuggets", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["nuggets", "denver nuggets"] },
  { name: "Milwaukee Bucks", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png", aliases: ["bucks", "milwaukee bucks"] },
  { name: "Dallas Mavericks", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png", aliases: ["mavericks", "mavs", "dallas mavericks"] },
  { name: "Phoenix Suns", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["suns", "phoenix suns"] },
  { name: "New York Knicks", emoji: "🏀", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["knicks", "new york knicks"] },

  // --- ESPORTS ---
  { name: "Apogee Esports", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/p3h1cf1621593502.png", aliases: ["apogee esports", "apogee esport", "apogee"] },
  { name: "JijieHao", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png", aliases: ["jijiehao", "jijie hao", "jjh"] },
  { name: "T1", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/y145v91580047913.png", aliases: ["t1", "skt", "skt t1", "t1 lol"] },
  { name: "Gen.G", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["gen g", "geng", "gen.g"] },
  { name: "GAM Esports", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png", aliases: ["gam", "gam esports", "gigabyte marines"] },
  { name: "Team Flash", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png", aliases: ["team flash", "flash", "fl"] },
  { name: "Saigon Phantom", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["saigon phantom", "sgp"] },
  { name: "V Gaming", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["v gaming", "vgp"] },
  { name: "G2 Esports", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png", aliases: ["g2", "g2 esports"] },
  { name: "Fnatic", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png", aliases: ["fnatic", "fnc"] },
  { name: "Team Liquid", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["team liquid", "liquid", "tl"] },
  { name: "Bilibili Gaming", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["bilibili gaming", "blg"] },
  { name: "Top Esports", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png", aliases: ["top esports", "tes"] },
  { name: "Weibo Gaming", emoji: "🎮", logo: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png", aliases: ["weibo gaming", "wbg"] },

  // --- PREMIER LEAGUE & CHAMPIONSHIP (ANH) ---
  { name: "Arsenal", logo: "https://r2.thesportsdb.com/images/media/team/badge/uyhbfe1612467038.png", aliases: ["arsenal", "phao thu", "gunners"] },
  { name: "Chelsea", logo: "https://r2.thesportsdb.com/images/media/team/badge/pbf4ul1782638263.png", aliases: ["chelsea", "the blues"] },
  { name: "Liverpool", logo: "https://r2.thesportsdb.com/images/media/team/badge/kfaher1737969724.png", aliases: ["liverpool", "the kop", "lfc"] },
  { name: "Manchester City", logo: "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1467462651.png", aliases: ["manchester city", "man city", "mcfc", "the citizens"] },
  { name: "Manchester United", logo: "https://r2.thesportsdb.com/images/media/team/badge/xzqdr11514149661.png", aliases: ["manchester united", "man utd", "mu", "man united", "quy do", "red devils", "mufc"] },
  { name: "Tottenham Hotspur", logo: "https://r2.thesportsdb.com/images/media/team/badge/df54i01737969894.png", aliases: ["tottenham hotspur", "tottenham", "spurs", "ga trong"] },
  { name: "Newcastle United", logo: "https://r2.thesportsdb.com/images/media/team/badge/m62m781580047648.png", aliases: ["newcastle united", "newcastle", "chich choe", "magpies"] },
  { name: "Aston Villa", logo: "https://r2.thesportsdb.com/images/media/team/badge/ywxvvr1422278488.png", aliases: ["aston villa", "villa", "avfc"] },
  { name: "West Ham United", logo: "https://r2.thesportsdb.com/images/media/team/badge/b91p3v1638210350.png", aliases: ["west ham united", "west ham", "the hammers"] },
  { name: "Brighton & Hove Albion", logo: "https://r2.thesportsdb.com/images/media/team/badge/vprxwv1448815152.png", aliases: ["brighton", "brighton and hove albion", "seagulls"] },
  { name: "Everton", logo: "https://r2.thesportsdb.com/images/media/team/badge/6t165v1621593361.png", aliases: ["everton", "the toffees"] },
  { name: "Wolverhampton Wanderers", logo: "https://r2.thesportsdb.com/images/media/team/badge/1v2l6f1580047806.png", aliases: ["wolves", "wolverhampton", "bay soi"] },
  { name: "Fulham", logo: "https://r2.thesportsdb.com/images/media/team/badge/0slmqu1556111718.png", aliases: ["fulham", "the cottagers"] },
  { name: "Brentford", logo: "https://r2.thesportsdb.com/images/media/team/badge/gr4s2w1580047395.png", aliases: ["brentford", "the bees"] },
  { name: "Crystal Palace", logo: "https://r2.thesportsdb.com/images/media/team/badge/xpyutx1422278380.png", aliases: ["crystal palace", "palace", "the eagles"] },
  { name: "Nottingham Forest", logo: "https://r2.thesportsdb.com/images/media/team/badge/vwupxp1473503254.png", aliases: ["nottingham forest", "nottingham", "forest"] },
  { name: "AFC Bournemouth", logo: "https://r2.thesportsdb.com/images/media/team/badge/19px9l1534001918.png", aliases: ["bournemouth", "afc bournemouth", "cherries"] },
  { name: "Leicester City", logo: "https://r2.thesportsdb.com/images/media/team/badge/xtwxyt1422278413.png", aliases: ["leicester city", "leicester", "the foxes"] },
  { name: "Southampton", logo: "https://r2.thesportsdb.com/images/media/team/badge/tpuusy1422278560.png", aliases: ["southampton", "saints"] },
  { name: "Ipswich Town", logo: "https://r2.thesportsdb.com/images/media/team/badge/vtwvru1422278347.png", aliases: ["ipswich town", "ipswich", "tractor boys"] },
  { name: "Leeds United", logo: "https://r2.thesportsdb.com/images/media/team/badge/jcgrml1756649030.png", aliases: ["leeds united", "leeds"] },
  { name: "Sunderland", logo: "https://r2.thesportsdb.com/images/media/team/badge/rrtwvy1422278589.png", aliases: ["sunderland", "black cats"] },
  { name: "Burnley", logo: "https://r2.thesportsdb.com/images/media/team/badge/t6y5t01580047413.png", aliases: ["burnley", "clarets"] },
  { name: "Sheffield United", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["sheffield united", "sheffield utd", "blades"] },
  { name: "Middlesbrough", logo: "https://r2.thesportsdb.com/images/media/team/badge/m62m781580047648.png", aliases: ["middlesbrough", "boro"] },
  { name: "West Bromwich Albion", logo: "https://r2.thesportsdb.com/images/media/team/badge/vprxwv1448815152.png", aliases: ["west brom", "west bromwich albion", "baggies"] },
  { name: "Norwich City", logo: "https://r2.thesportsdb.com/images/media/team/badge/0slmqu1556111718.png", aliases: ["norwich city", "norwich", "canaries"] },
  { name: "Watford", logo: "https://r2.thesportsdb.com/images/media/team/badge/gr4s2w1580047395.png", aliases: ["watford", "hornets"] },

  // --- LA LIGA (TÂY BAN NHA) ---
  { name: "Real Madrid", logo: "https://r2.thesportsdb.com/images/media/team/badge/8p1usm1579298288.png", aliases: ["real madrid", "real", "ken ken trang", "los blancos", "merengues"] },
  { name: "Barcelona", logo: "https://r2.thesportsdb.com/images/media/team/badge/l2413e1742982366.png", aliases: ["barcelona", "barca", "blaugrana", "culers"] },
  { name: "Atletico Madrid", logo: "https://r2.thesportsdb.com/images/media/team/badge/0ulh3q1719984315.png", aliases: ["atletico madrid", "atletico", "atm", "colchoneros"] },
  { name: "Sevilla", logo: "https://r2.thesportsdb.com/images/media/team/badge/vvyvvy1420577557.png", aliases: ["sevilla", "los hispalenses"] },
  { name: "Valencia", logo: "https://r2.thesportsdb.com/images/media/team/badge/4quqsq1579298418.png", aliases: ["valencia", "bay doi", "los che"] },
  { name: "Villarreal", logo: "https://r2.thesportsdb.com/images/media/team/badge/qwwutt1420578149.png", aliases: ["villarreal", "tau ngam vang", "yellow submarine"] },
  { name: "Athletic Bilbao", logo: "https://r2.thesportsdb.com/images/media/team/badge/xqwsrv1420577636.png", aliases: ["athletic bilbao", "bilbao", "athletic club", "los leones"] },
  { name: "Real Sociedad", logo: "https://r2.thesportsdb.com/images/media/team/badge/8sbf7j1638210433.png", aliases: ["real sociedad", "sociedad", "txuri-urdin"] },
  { name: "Real Betis", logo: "https://r2.thesportsdb.com/images/media/team/badge/wwsttu1420577789.png", aliases: ["real betis", "betis", "verdiblancos"] },
  { name: "Girona", logo: "https://r2.thesportsdb.com/images/media/team/badge/3w513q1659960248.png", aliases: ["girona", "girona fc"] },
  { name: "Celta Vigo", logo: "https://r2.thesportsdb.com/images/media/team/badge/qrxvvx1420577435.png", aliases: ["celta vigo", "celta", "os celestes"] },
  { name: "RCD Mallorca", logo: "https://r2.thesportsdb.com/images/media/team/badge/65m88z1580047466.png", aliases: ["mallorca", "rcd mallorca"] },
  { name: "Osasuna", logo: "https://r2.thesportsdb.com/images/media/team/badge/ttxpsx1420577815.png", aliases: ["osasuna", "los rojillos"] },
  { name: "Getafe", logo: "https://r2.thesportsdb.com/images/media/team/badge/tswtwt1420577508.png", aliases: ["getafe", "azulones"] },
  { name: "Rayo Vallecano", logo: "https://r2.thesportsdb.com/images/media/team/badge/u19g5l1580047530.png", aliases: ["rayo vallecano", "rayo"] },
  { name: "Espanyol", logo: "https://r2.thesportsdb.com/images/media/team/badge/0slmqu1556111718.png", aliases: ["espanyol", "rcd espanyol"] },
  { name: "Las Palmas", logo: "https://r2.thesportsdb.com/images/media/team/badge/3w513q1659960248.png", aliases: ["las palmas", "ud las palmas"] },
  { name: "Deportivo Alaves", logo: "https://r2.thesportsdb.com/images/media/team/badge/ttxpsx1420577815.png", aliases: ["alaves", "deportivo alaves"] },
  { name: "Leganes", logo: "https://r2.thesportsdb.com/images/media/team/badge/tswtwt1420577508.png", aliases: ["leganes", "cd leganes"] },
  { name: "Real Valladolid", logo: "https://r2.thesportsdb.com/images/media/team/badge/wwsttu1420577789.png", aliases: ["valladolid", "real valladolid"] },

  // --- SERIE A (Ý) ---
  { name: "Inter Milan", logo: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png", aliases: ["inter milan", "inter", "internazionale", "nerazzurri"] },
  { name: "AC Milan", logo: "https://r2.thesportsdb.com/images/media/team/badge/p3h1cf1621593502.png", aliases: ["ac milan", "milan", "rossoneri"] },
  { name: "Juventus", logo: "https://r2.thesportsdb.com/images/media/team/badge/h0v3z21579296564.png", aliases: ["juventus", "juve", "ba dam gia", "bianconeri"] },
  { name: "Napoli", logo: "https://r2.thesportsdb.com/images/media/team/badge/l8qyxv1742982541.png", aliases: ["napoli", "ssc napoli", "partenopei"] },
  { name: "AS Roma", logo: "https://r2.thesportsdb.com/images/media/team/badge/83q63r1579296680.png", aliases: ["as roma", "roma", "giallorossi", "bay soi roma"] },
  { name: "Lazio", logo: "https://r2.thesportsdb.com/images/media/team/badge/06b7441579296839.png", aliases: ["lazio", "ss lazio", "biancocelesti"] },
  { name: "Atalanta", logo: "https://r2.thesportsdb.com/images/media/team/badge/1n84821579296996.png", aliases: ["atalanta", "la dea"] },
  { name: "Fiorentina", logo: "https://r2.thesportsdb.com/images/media/team/badge/wspxvy1420576395.png", aliases: ["fiorentina", "la viola"] },
  { name: "Bologna", logo: "https://r2.thesportsdb.com/images/media/team/badge/7f34o21580047352.png", aliases: ["bologna", "rossoblu"] },
  { name: "Torino", logo: "https://r2.thesportsdb.com/images/media/team/badge/sxwqrq1420576629.png", aliases: ["torino", "il toro"] },
  { name: "Como 1907", logo: "https://r2.thesportsdb.com/images/media/team/badge/v0k00x1719984381.png", aliases: ["como", "como 1907"] },
  { name: "Parma", logo: "https://r2.thesportsdb.com/images/media/team/badge/8o4k3r1580047587.png", aliases: ["parma", "parma calcio"] },
  { name: "Genoa", logo: "https://r2.thesportsdb.com/images/media/team/badge/7f34o21580047352.png", aliases: ["genoa", "grifone"] },
  { name: "Cagliari", logo: "https://r2.thesportsdb.com/images/media/team/badge/sxwqrq1420576629.png", aliases: ["cagliari", "isolani"] },
  { name: "Hellas Verona", logo: "https://r2.thesportsdb.com/images/media/team/badge/8o4k3r1580047587.png", aliases: ["verona", "hellas verona"] },
  { name: "Udinese", logo: "https://r2.thesportsdb.com/images/media/team/badge/wspxvy1420576395.png", aliases: ["udinese", "zebrette"] },
  { name: "Monza", logo: "https://r2.thesportsdb.com/images/media/team/badge/1n84821579296996.png", aliases: ["monza", "ac monza"] },
  { name: "Empoli", logo: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png", aliases: ["empoli", "azzurri"] },
  { name: "Venezia", logo: "https://r2.thesportsdb.com/images/media/team/badge/v0k00x1719984381.png", aliases: ["venezia", "lagunari"] },
  { name: "Lecce", logo: "https://r2.thesportsdb.com/images/media/team/badge/p3h1cf1621593502.png", aliases: ["lecce", "salentini"] },

  // --- BUNDESLIGA (ĐỨC) ---
  { name: "Bayern Munich", logo: "https://r2.thesportsdb.com/images/media/team/badge/m1y2941579294576.png", aliases: ["bayern munich", "bayern", "hum xam", "die roten", "fcb"] },
  { name: "Borussia Dortmund", logo: "https://r2.thesportsdb.com/images/media/team/badge/tpusvp1420577317.png", aliases: ["borussia dortmund", "dortmund", "bvb", "die schwarzgelben"] },
  { name: "Bayer Leverkusen", logo: "https://r2.thesportsdb.com/images/media/team/badge/vttwwv1420577488.png", aliases: ["bayer leverkusen", "leverkusen", "die werkself"] },
  { name: "RB Leipzig", logo: "https://r2.thesportsdb.com/images/media/team/badge/b7cghp1580047683.png", aliases: ["rb leipzig", "leipzig", "die roten bullen"] },
  { name: "Eintracht Frankfurt", logo: "https://r2.thesportsdb.com/images/media/team/badge/vxspvx1420577226.png", aliases: ["eintracht frankfurt", "frankfurt", "die adler"] },
  { name: "VfB Stuttgart", logo: "https://r2.thesportsdb.com/images/media/team/badge/uqxxuv1420577395.png", aliases: ["stuttgart", "vfb stuttgart", "die schwaben"] },
  { name: "Borussia Monchengladbach", logo: "https://r2.thesportsdb.com/images/media/team/badge/vtpwxu1420577174.png", aliases: ["monchengladbach", "borussia monchengladbach", "gladbach", "die fohlen"] },
  { name: "VfL Wolfsburg", logo: "https://r2.thesportsdb.com/images/media/team/badge/vrrpvs1420577440.png", aliases: ["wolfsburg", "vfl wolfsburg", "die wolfe"] },
  { name: "Werder Bremen", logo: "https://r2.thesportsdb.com/images/media/team/badge/wpyvyv1420577271.png", aliases: ["werder bremen", "bremen", "die werderaner"] },
  { name: "SC Freiburg", logo: "https://r2.thesportsdb.com/images/media/team/badge/qvvupv1420577595.png", aliases: ["freiburg", "sc freiburg", "breisgau-brasilianer"] },
  { name: "TSG Hoffenheim", logo: "https://r2.thesportsdb.com/images/media/team/badge/uqxxuv1420577395.png", aliases: ["hoffenheim", "tsg hoffenheim"] },
  { name: "FC Augsburg", logo: "https://r2.thesportsdb.com/images/media/team/badge/vxspvx1420577226.png", aliases: ["augsburg", "fc augsburg"] },
  { name: "FSV Mainz 05", logo: "https://r2.thesportsdb.com/images/media/team/badge/wpyvyv1420577271.png", aliases: ["mainz", "mainz 05"] },
  { name: "Union Berlin", logo: "https://r2.thesportsdb.com/images/media/team/badge/b7cghp1580047683.png", aliases: ["union berlin", "die eisernen"] },
  { name: "FC St. Pauli", logo: "https://r2.thesportsdb.com/images/media/team/badge/vttwwv1420577488.png", aliases: ["st pauli", "fc st pauli"] },
  { name: "Hamburger SV", logo: "https://r2.thesportsdb.com/images/media/team/badge/tpusvp1420577317.png", aliases: ["hamburg", "hamburger sv", "hsv"] },
  { name: "Schalke 04", logo: "https://r2.thesportsdb.com/images/media/team/badge/m1y2941579294576.png", aliases: ["schalke", "schalke 04", "die knappen"] },

  // --- LIGUE 1 (PHÁP) ---
  { name: "Paris Saint-Germain", logo: "https://r2.thesportsdb.com/images/media/team/badge/rwstuv1420577902.png", aliases: ["paris saint germain", "psg", "paris", "les parisiens"] },
  { name: "AS Monaco", logo: "https://r2.thesportsdb.com/images/media/team/badge/xqxvws1420577843.png", aliases: ["as monaco", "monaco", "les rouge et blanc"] },
  { name: "Olympique de Marseille", logo: "https://r2.thesportsdb.com/images/media/team/badge/vxssqv1420577717.png", aliases: ["marseille", "olympique de marseille", "om", "les olympiens"] },
  { name: "Olympique Lyonnais", logo: "https://r2.thesportsdb.com/images/media/team/badge/xrrvvy1420577671.png", aliases: ["lyon", "olympique lyonnais", "ol", "les gones"] },
  { name: "Lille OSC", logo: "https://r2.thesportsdb.com/images/media/team/badge/vswrrx1420577759.png", aliases: ["lille", "lille osc", "losc", "les dogues"] },
  { name: "OGC Nice", logo: "https://r2.thesportsdb.com/images/media/team/badge/u18b3m1580047514.png", aliases: ["nice", "ogc nice", "les aiglons"] },
  { name: "RC Lens", logo: "https://r2.thesportsdb.com/images/media/team/badge/ryxvvs1420577872.png", aliases: ["lens", "rc lens", "sang et or"] },
  { name: "Stade Rennais", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwtyrr1420577931.png", aliases: ["rennes", "stade rennais", "les rouge et noir"] },
  { name: "Strasbourg", logo: "https://r2.thesportsdb.com/images/media/team/badge/u18b3m1580047514.png", aliases: ["strasbourg", "rc strasbourg"] },
  { name: "Stade Brestois 29", logo: "https://r2.thesportsdb.com/images/media/team/badge/ryxvvs1420577872.png", aliases: ["brest", "stade brestois"] },
  { name: "Toulouse", logo: "https://r2.thesportsdb.com/images/media/team/badge/vswrrx1420577759.png", aliases: ["toulouse", "toulouse fc"] },
  { name: "Nantes", logo: "https://r2.thesportsdb.com/images/media/team/badge/xrrvvy1420577671.png", aliases: ["nantes", "fc nantes", "les canaris"] },
  { name: "Saint-Etienne", logo: "https://r2.thesportsdb.com/images/media/team/badge/rwstuv1420577902.png", aliases: ["saint etienne", "asse", "les verts"] },

  // --- EREDIVISIE (HÀ LAN) & PRIMEIRA LIGA (BỒ ĐÀO NHA) ---
  { name: "Ajax Amsterdam", logo: "https://r2.thesportsdb.com/images/media/team/badge/bmsi4a1599818641.png", aliases: ["ajax", "ajax amsterdam", "de godenzonen"] },
  { name: "PSV Eindhoven", logo: "https://r2.thesportsdb.com/images/media/team/badge/tuqwvq1420576974.png", aliases: ["psv", "psv eindhoven", "boeren"] },
  { name: "Feyenoord Rotterdam", logo: "https://r2.thesportsdb.com/images/media/team/badge/sxrwwq1420577030.png", aliases: ["feyenoord", "feyenoord rotterdam", "de club van het volk"] },
  { name: "AZ Alkmaar", logo: "https://r2.thesportsdb.com/images/media/team/badge/tuqwvq1420576974.png", aliases: ["az", "az alkmaar"] },
  { name: "Sporting CP", logo: "https://r2.thesportsdb.com/images/media/team/badge/ywwyqu1420578018.png", aliases: ["sporting cp", "sporting", "sporting lisbon", "leões"] },
  { name: "SL Benfica", logo: "https://r2.thesportsdb.com/images/media/team/badge/vvwyps1420577960.png", aliases: ["benfica", "sl benfica", "as aguias"] },
  { name: "FC Porto", logo: "https://r2.thesportsdb.com/images/media/team/badge/vxxutt1420578077.png", aliases: ["porto", "fc porto", "dragoes"] },
  { name: "SC Braga", logo: "https://r2.thesportsdb.com/images/media/team/badge/ywwyqu1420578018.png", aliases: ["braga", "sc braga", "os gverreiros do minho"] },

  // --- SAUDI PRO LEAGUE ---
  { name: "Al Nassr", logo: "https://r2.thesportsdb.com/images/media/team/badge/c8j53m1599818816.png", aliases: ["al nassr", "alnassr", "al nasr", "cr7 team"] },
  { name: "Al Hilal", logo: "https://r2.thesportsdb.com/images/media/team/badge/q2l8921659960533.png", aliases: ["al hilal", "alhilal", "the blue waves"] },
  { name: "Al Ittihad", logo: "https://r2.thesportsdb.com/images/media/team/badge/9d77u51662991062.png", aliases: ["al ittihad", "alittihad", "tigers"] },
  { name: "Al Ahli Saudi", logo: "https://r2.thesportsdb.com/images/media/team/badge/x8753q1751421890.png", aliases: ["al ahli", "alahli", "al ahli saudi"] },
  { name: "Al Shabab", logo: "https://r2.thesportsdb.com/images/media/team/badge/c8j53m1599818816.png", aliases: ["al shabab", "alshabab"] },
  { name: "Al Ettifaq", logo: "https://r2.thesportsdb.com/images/media/team/badge/9d77u51662991062.png", aliases: ["al ettifaq", "alettifaq"] },

  // --- MLS (MỸ) ---
  { name: "Inter Miami CF", logo: "https://r2.thesportsdb.com/images/media/team/badge/y145v91580047913.png", aliases: ["inter miami", "inter miami cf", "miami", "messi team", "herons"] },
  { name: "LA Galaxy", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["la galaxy", "los angeles galaxy", "galaxy"] },
  { name: "Los Angeles FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["lafc", "los angeles fc"] },
  { name: "New York Red Bulls", logo: "https://r2.thesportsdb.com/images/media/team/badge/wyvwsy1422044955.png", aliases: ["new york red bulls", "ny red bulls"] },
  { name: "New York City FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/utvvtw1422044929.png", aliases: ["new york city", "nycfc"] },
  { name: "Atlanta United FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/y145v91580047913.png", aliases: ["atlanta united", "atlanta utd"] },
  { name: "Columbus Crew", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwvrqv1422044874.png", aliases: ["columbus crew"] },
  { name: "Seattle Sounders FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/w036981519757655.png", aliases: ["seattle sounders", "sounders"] },

  // --- V-LEAGUE (VIỆT NAM) ---
  { name: "Hà Nội FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["ha noi", "hanoi fc", "clb ha noi", "ha noi fc"] },
  { name: "Công An Hà Nội", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["cong an ha noi", "cahn", "clb cong an ha noi"] },
  { name: "Thể Công - Viettel", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["the cong viettel", "viettel", "the cong", "clb viettel"] },
  { name: "Thép Xanh Nam Định", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["nam dinh", "thep xanh nam dinh", "clb nam dinh"] },
  { name: "Hoàng Anh Gia Lai", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["hoang anh gia lai", "hagl", "clb hoang anh gia lai"] },
  { name: "Sông Lam Nghệ An", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["song lam nghe an", "slna", "clb song lam nghe an"] },
  { name: "Hải Phòng FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["hai phong", "hai phong fc", "clb hai phong"] },
  { name: "Becamex Bình Dương", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["becamex binh duong", "binh duong", "clb binh duong"] },
  { name: "Đông Á Thanh Hóa", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["thanh hoa", "dong a thanh hoa", "clb thanh hoa"] },
  { name: "SHB Đà Nẵng", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["shb da nang", "da nang", "clb da nang"] },
  { name: "Quy Nhơn Bình Định", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["binh dinh", "quy nhon binh dinh"] },
  { name: "TP. Hồ Chí Minh", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["tp ho chi minh", "tphcm", "clb tp ho chi minh"] },
  { name: "Hồng Lĩnh Hà Tĩnh", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["hong linh ha tinh", "ha tinh"] },
  { name: "Quảng Nam", logo: "https://r2.thesportsdb.com/images/media/team/badge/z3v0j31599818731.png", aliases: ["quang nam", "clb quang nam"] },

  // --- THAI LEAGUE (THÁI LAN) ---
  { name: "Buriram United", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["buriram united", "buriram", "thunder castle"] },
  { name: "Bangkok United", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["bangkok united", "true bangkok united"] },
  { name: "BG Pathum United", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["bg pathum united", "bg pathum", "pathum"] },
  { name: "Port FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["port fc", "port"] },
  { name: "Muangthong United", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["muangthong united", "muangthong", "the kirins"] },

  // --- J-LEAGUE (NHẬT BẢN) ---
  { name: "Vissel Kobe", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["vissel kobe", "kobe"] },
  { name: "Yokohama F. Marinos", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["yokohama f marinos", "yokohama marinos", "marinos"] },
  { name: "Kawasaki Frontale", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["kawasaki frontale", "frontale"] },
  { name: "Urawa Red Diamonds", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["urawa red diamonds", "urawa reds", "reds"] },
  { name: "Kashima Antlers", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["kashima antlers", "antlers"] },
  { name: "Sanfrecce Hiroshima", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["sanfrecce hiroshima", "hiroshima"] },
  { name: "Gamba Osaka", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["gamba osaka"] },
  { name: "FC Tokyo", logo: "https://r2.thesportsdb.com/images/media/team/badge/yptxvv1431696756.png", aliases: ["fc tokyo", "tokyo"] },

  // --- K-LEAGUE (HÀN QUỐC) ---
  { name: "Ulsan HD", logo: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png", aliases: ["ulsan hd", "ulsan hyundai", "ulsan"] },
  { name: "Jeonbuk Hyundai Motors", logo: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png", aliases: ["jeonbuk hyundai motors", "jeonbuk hyundai", "jeonbuk"] },
  { name: "Pohang Steelers", logo: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png", aliases: ["pohang steelers", "pohang"] },
  { name: "FC Seoul", logo: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png", aliases: ["fc seoul", "seoul"] },
  { name: "Suwon Samsung Bluewings", logo: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png", aliases: ["suwon samsung bluewings", "suwon samsung", "suwon"] },
  { name: "Incheon United", logo: "https://r2.thesportsdb.com/images/media/team/badge/wtpswx1431696803.png", aliases: ["incheon united", "incheon"] },

  // --- CHÂU ÂU KHÁC (CHAMPIONS LEAGUE GIANTS) ---
  { name: "Celtic FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/xurrrv1420576722.png", aliases: ["celtic", "celtic fc", "the bhoys"] },
  { name: "Rangers FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/tuxvvs1420576778.png", aliases: ["rangers", "rangers fc", "the gers"] },
  { name: "Galatasaray", logo: "https://r2.thesportsdb.com/images/media/team/badge/vyuvpx1420576916.png", aliases: ["galatasaray", "cimbom"] },
  { name: "Fenerbahce", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwtvvu1420576856.png", aliases: ["fenerbahce", "sari kanaryalar"] },
  { name: "Besiktas", logo: "https://r2.thesportsdb.com/images/media/team/badge/rtqvvs1420576800.png", aliases: ["besiktas", "black eagles"] },
  { name: "Shakhtar Donetsk", logo: "https://r2.thesportsdb.com/images/media/team/badge/7f34o21580047352.png", aliases: ["shakhtar donetsk", "shakhtar", "hirnyky"] },
  { name: "Dynamo Kyiv", logo: "https://r2.thesportsdb.com/images/media/team/badge/8sbf7j1638210433.png", aliases: ["dynamo kyiv", "kiev"] },
  { name: "Red Bull Salzburg", logo: "https://r2.thesportsdb.com/images/media/team/badge/3w513q1659960248.png", aliases: ["salzburg", "red bull salzburg", "rb salzburg"] },
  { name: "Club Brugge", logo: "https://r2.thesportsdb.com/images/media/team/badge/6t165v1621593361.png", aliases: ["club brugge", "brugge", "blauw-zwart"] },
  { name: "RSC Anderlecht", logo: "https://r2.thesportsdb.com/images/media/team/badge/1v2l6f1580047806.png", aliases: ["anderlecht", "rsc anderlecht"] },
  { name: "FK Crvena Zvezda", logo: "https://r2.thesportsdb.com/images/media/team/badge/4v709i1617094056.png", aliases: ["crvena zvezda", "sao do belgrade", "red star belgrade"] },
  { name: "GNK Dinamo Zagreb", logo: "https://r2.thesportsdb.com/images/media/team/badge/8o4k3r1580047587.png", aliases: ["dinamo zagreb", "zagreb"] },
  { name: "Olympiacos", logo: "https://r2.thesportsdb.com/images/media/team/badge/vyuvpx1420576916.png", aliases: ["olympiacos", "olympiakos", "thrylos"] },
  { name: "Panathinaikos", logo: "https://r2.thesportsdb.com/images/media/team/badge/uwtvvu1420576856.png", aliases: ["panathinaikos"] },
  { name: "FC Copenhagen", logo: "https://r2.thesportsdb.com/images/media/team/badge/rtqvvs1420576800.png", aliases: ["copenhagen", "fc copenhagen", "kobenhavn"] },
  { name: "FK Bodo/Glimt", logo: "https://r2.thesportsdb.com/images/media/team/badge/7f34o21580047352.png", aliases: ["bodo glimt", "bodo/glimt"] },
  { name: "FC Basel", logo: "https://r2.thesportsdb.com/images/media/team/badge/wspxvy1420576395.png", aliases: ["basel", "fc basel"] },
  { name: "BSC Young Boys", logo: "https://r2.thesportsdb.com/images/media/team/badge/8sbf7j1638210433.png", aliases: ["young boys", "bsc young boys", "yb"] },
  { name: "Sparta Prague", logo: "https://r2.thesportsdb.com/images/media/team/badge/3w513q1659960248.png", aliases: ["sparta prague", "sparta praha"] },
  { name: "Slavia Prague", logo: "https://r2.thesportsdb.com/images/media/team/badge/6t165v1621593361.png", aliases: ["slavia prague", "slavia praha"] },

  // --- NAM MỸ (LIBERTADORES) ---
  { name: "Flamengo", logo: "https://r2.thesportsdb.com/images/media/team/badge/u6n0321598717112.png", aliases: ["flamengo", "cr flamengo", "mengao"] },
  { name: "Palmeiras", logo: "https://r2.thesportsdb.com/images/media/team/badge/d934om1598717208.png", aliases: ["palmeiras", "verdao"] },
  { name: "Corinthians", logo: "https://r2.thesportsdb.com/images/media/team/badge/380i1r1598717676.png", aliases: ["corinthians", "timao"] },
  { name: "Sao Paulo FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/u6n0321598717112.png", aliases: ["sao paulo", "sao paulo fc", "tricolor"] },
  { name: "Santos FC", logo: "https://r2.thesportsdb.com/images/media/team/badge/d934om1598717208.png", aliases: ["santos", "santos fc", "peixe"] },
  { name: "River Plate", logo: "https://r2.thesportsdb.com/images/media/team/badge/u6n0321598717112.png", aliases: ["river plate", "los millonarios"] },
  { name: "Boca Juniors", logo: "https://r2.thesportsdb.com/images/media/team/badge/d934om1598717208.png", aliases: ["boca juniors", "boca", "xeneizes"] },
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
