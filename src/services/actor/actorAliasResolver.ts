import { normalizeForMatch } from "@/lib/stringUtils";

export interface ActorProfile {
  name: string;
  aliases: string[];
  country: string;
}

export function toVietnameseTitleCase(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * DANH SÁCH DIỄN VIÊN / NGHỆ SĨ HÀNG ĐẦU (TIER 1 - PRE-INDEXED)
 * Tốc độ tức thì (0ms), độ chính xác 100%, không tốn token AI, không phụ thuộc mạng.
 */
export const GOLDEN_ACTOR_INDEX: ActorProfile[] = [
  // --- VIỆT NAM ---
  {
    name: "Trường Giang",
    aliases: ["truong giang", "mười khó", "muoi kho", "mc truong giang", "danh hai truong giang"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Trấn Thành",
    aliases: ["tran thanh", "a xìn", "mc xìn", "mc tran thanh", "dao dien tran thanh"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Thái Hòa",
    aliases: ["thai hoa", "ông hoàng phòng vé thái hòa", "ong hoang phong ve thai hoa"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Ninh Dương Lan Ngọc",
    aliases: ["ninh duong lan ngoc", "lan ngoc", "ngoc nu ninh duong lan ngoc"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Kaity Nguyễn",
    aliases: ["kaity nguyen", "kaity"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Kiều Minh Tuấn",
    aliases: ["kieu minh tuan"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Thu Trang",
    aliases: ["thu trang", "hoa hậu hài thu trang"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Lý Hải",
    aliases: ["ly hai", "dao dien ly hai"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Hoài Linh",
    aliases: ["hoai linh", "nsut hoai linh", "danh hai hoai linh", "sau sang"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Việt Hương",
    aliases: ["viet huong", "nghe si viet huong"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Tuấn Trần",
    aliases: ["tuan tran"],
    country: "Việt Nam 🇻🇳",
  },
  {
    name: "Miu Lê",
    aliases: ["miu le"],
    country: "Việt Nam 🇻🇳",
  },

  // --- HÀN QUỐC ---
  {
    name: "Kim Ji-won",
    aliases: ["kim ji won", "kim jiwon"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Son Ye-jin",
    aliases: ["son ye jin", "son yejin"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Song Kang",
    aliases: ["song kang"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Hyun Bin",
    aliases: ["hyun bin", "hyeon bin"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Song Joong-ki",
    aliases: ["song joong ki", "song joongki"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Kim Soo-hyun",
    aliases: ["kim soo hyun", "kim soohyun"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Park Seo-joon",
    aliases: ["park seo joon", "park seojun"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Lee Min-ho",
    aliases: ["lee min ho", "lee minho"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "IU (Lee Ji-eun)",
    aliases: ["iu", "lee ji eun", "lee jieun"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Cha Eun-woo",
    aliases: ["cha eun woo", "cha eunwoo"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Lee Jong-suk",
    aliases: ["lee jong suk", "lee jongsuk"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Gong Yoo",
    aliases: ["gong yoo"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Han So-hee",
    aliases: ["han so hee", "han sohee"],
    country: "Hàn Quốc 🇰🇷",
  },
  {
    name: "Song Hye-kyo",
    aliases: ["song hye kyo", "song hyekyo"],
    country: "Hàn Quốc 🇰🇷",
  },

  // --- TRUNG QUỐC / HỒNG KÔNG ---
  {
    name: "Châu Tinh Trì",
    aliases: ["chau tinh tri", "tinh gia", "stephen chow", "vua hai chau tinh tri"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Dương Mịch",
    aliases: ["duong mich", "yang mi"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Triệu Lệ Dĩnh",
    aliases: ["trieu le dinh", "zhao liying", "zanilia zhao"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Tiêu Chiến",
    aliases: ["tieu chien", "xiao zhan", "sean xiao"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Phạm Băng Băng",
    aliases: ["pham bang bang", "fan bingbing", "fan bing bing"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Vương Nhất Bác",
    aliases: ["vuong nhat bac", "wang yibo"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Lưu Diệc Phi",
    aliases: ["luu diec phi", "crystal liu", "liu yifei", "than tien ty ty"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Tạ Đình Phong",
    aliases: ["ta dinh phong", "nicholas tse", "tạ đình phong"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Lưu Đức Hoa",
    aliases: ["luu duc hoa", "andy lau", "thiên vương lưu đức hoa"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Lương Triều Vỹ",
    aliases: ["luong trieu vy", "tony leung", "tony leung chiu wai"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Cổ Thiên Lạc",
    aliases: ["co thien lac", "louis koo"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Trịnh Gia Dĩnh",
    aliases: ["trinh gia dinh", "kevin cheng"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Âu Dương Chấn Hoa",
    aliases: ["au duong chan hoa", "bobby au yeung", "bobby au-yeung"],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Thành Long",
    aliases: [
      "thanh long",
      "thành long",
      "jackie chan",
      "chan kong-sang",
      "chan kong sang",
      "sing lung",
      "trần cảng sinh",
      "tran cang sinh",
    ],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Lý Liên Kiệt",
    aliases: ["ly lien kiet", "jet li"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Chân Tử Đan",
    aliases: [
      "chan tu dan",
      "chân tử đan",
      "donnie yen",
      "chung tử đơn",
      "chung tu don",
      "chung tử đan",
      "chung tu dan",
    ],
    country: "Hồng Kông 🇭🇰",
  },
  {
    name: "Địch Lệ Nhiệt Ba",
    aliases: ["dich le nhiet ba", "dilraba dilmurat", "dilraba"],
    country: "Trung Quốc 🇨🇳",
  },
  {
    name: "Dương Dương",
    aliases: ["duong duong", "yang yang"],
    country: "Trung Quốc 🇨🇳",
  },

  // --- HOLLYWOOD / QUỐC TẾ ---
  {
    name: "Benedict Cumberbatch",
    aliases: ["benedict cumberbatch", "cumberbatch"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Cillian Murphy",
    aliases: ["cillian murphy", "murphy"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Tom Cruise",
    aliases: ["tom cruise", "cruise"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Leonardo DiCaprio",
    aliases: ["leonardo dicaprio", "dicaprio", "leo dicaprio"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Robert Downey Jr",
    aliases: ["robert downey jr", "robert downey", "rdj"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Christopher Nolan",
    aliases: ["christopher nolan", "nolan", "dao dien nolan"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Keanu Reeves",
    aliases: ["keanu reeves"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Scarlett Johansson",
    aliases: ["scarlett johansson"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Tom Hiddleston",
    aliases: ["tom hiddleston"],
    country: "Hollywood 🇺🇸 / Anh Quốc 🇬🇧",
  },
  {
    name: "Margot Robbie",
    aliases: ["margot robbie"],
    country: "Hollywood 🇺🇸 / Úc 🇦🇺",
  },
  {
    name: "Dwayne Johnson (The Rock)",
    aliases: ["dwayne johnson", "the rock"],
    country: "Hollywood 🇺🇸",
  },
  {
    name: "Ryan Reynolds",
    aliases: ["ryan reynolds"],
    country: "Hollywood 🇺🇸",
  },

  // --- THÁI LAN & NHẬT BẢN ---
  {
    name: "Baifern Pimchanok",
    aliases: ["baifern pimchanok", "baifern", "pimchanok"],
    country: "Thái Lan 🇹🇭",
  },
  {
    name: "Mario Maurer",
    aliases: ["mario maurer", "mario"],
    country: "Thái Lan 🇹🇭",
  },
  {
    name: "Ken Watanabe",
    aliases: ["ken watanabe"],
    country: "Nhật Bản 🇯🇵",
  },
  {
    name: "Hayao Miyazaki",
    aliases: ["hayao miyazaki", "miyazaki"],
    country: "Nhật Bản 🇯🇵",
  },
  {
    name: "Makoto Shinkai",
    aliases: ["makoto shinkai", "shinkai"],
    country: "Nhật Bản 🇯🇵",
  },
];

// In-memory cache thông minh cho các truy vấn AI phân giải diễn viên (TTL: 7 ngày)
export const ACTOR_AI_CACHE = new Map<
  string,
  { actorName: string; country?: string; aliases: string[]; isActor: boolean; expireAt: number }
>();
export const CACHE_7_DAYS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache cho danh sách phim đã tìm thấy từ kho (TTL: 12h fresh, 48h stale SWR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ACTOR_FILM_CACHE = new Map<string, { items: any[]; expireAt: number; staleUntil: number }>();

export function setBoundedCache<K, V>(map: Map<K, V>, key: K, value: V, max = 500) {
  if (map.size >= max) {
    const oldestKey = map.keys().next().value;
    if (oldestKey !== undefined) map.delete(oldestKey);
  }
  map.set(key, value);
}

export { normalizeForMatch };

/**
 * Kiểm tra xem từ khóa có tiền tố chỉ định rõ ràng là tìm kiếm DIỄN VIÊN / ĐẠO DIỄN hay không.
 */
export function hasExplicitActorPrefix(query: string): boolean {
  const q = (query || "").trim();
  return /^(?:diễn\s+viên|dien\s+vien|đạo\s+diễn|dao\s+dien|phim\s+của|phim\s+cua|tuyển\s+tập\s+(?:phim\s+)?(?:của\s+)?|tuyen\s+tap\s+(?:phim\s+)?(?:cua\s+)?|actor\s*:\s*)/i.test(q);
}

// Tập hợp các từ khóa ngắn/từ đơn thông dụng dễ trùng tên phim hoặc từ thông dụng tiếng Việt
const COMMON_AMBIGUOUS_SHORT_WORDS = new Set([
  "mai", "an", "anh", "em", "nam", "hoa", "tam", "binh", "long", "ha",
  "linh", "dung", "phuc", "dat", "duc", "thao", "trang", "huong", "ngoc",
  "minh", "khoa", "thang", "quan", "hung", "son", "tuan", "hai", "vu",
  "bao", "cuong", "phong", "hieu", "huy", "giang", "thanh", "thuy", "yen",
  "thu", "quyen", "tien", "trieu", "viet", "khanh", "kien", "phuong",
  "nga", "loan", "diep", "sen", "truc", "dao", "cuc", "nhi", "lan",
  "bac", "trung", "do", "den", "xanh", "vang", "nha", "pho",
  "me", "cha", "con", "vo", "chong", "ba", "ong", "co", "chu"
]);

/**
 * Kiểm tra xem từ khóa có phải là từ ngắn/từ đơn mơ hồ (dễ là tên phim) mà không có tiền tố diễn viên rõ ràng hay không.
 */
export function isAmbiguousShortActorKeyword(query: string): boolean {
  const trimmed = (query || "").trim();
  if (!trimmed) return true;
  // Nếu có tiền tố rõ ràng như "diễn viên Mai", "phim của Mai" -> không bị coi là ambiguous
  if (hasExplicitActorPrefix(trimmed)) return false;

  const cleanNorm = normalizeForMatch(trimmed).toLowerCase();
  if (COMMON_AMBIGUOUS_SHORT_WORDS.has(cleanNorm)) return true;

  // Từ đơn (chỉ có 1 từ) và độ dài <= 4 ký tự (ví dụ: Mai, An, Anh, Ha, Nam...)
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 && trimmed.length <= 4) return true;

  return false;
}

export function cleanActorQuery(query: string): string {
  return (query || "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^phim\s+cua\s+/gi, "")
    .replace(/^tuyen\s+tap\s+(?:phim\s+)?(?:cua\s+)?/gi, "")
    .replace(/^dien\s+vien\s+/gi, "")
    .replace(/^dao\s+dien\s+/gi, "")
    .replace(/^actor\s*:\s*/gi, "")
    .replace(/\s+dong$/gi, "")
    .replace(/\s+dien\s+xuat$/gi, "")
    .replace(/[^\w\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// =========================================================================
// 1. TỪ ĐIỂN ALIAS (BÍ DANH) & TÊN CHUẨN TRONG DATABASE (CANONICAL ALIAS MAP)
// Map trực tiếp từ khóa/biệt danh/tên tiếng Việt thường gọi sang TÊN CHUẨN DUY NHẤT trong Database:
// Ví dụ:
//   {"iron man": "Robert Downey Jr", "rdj": "Robert Downey Jr", "trấn thành": "Huỳnh Trấn Thành"}
// =========================================================================
export const ACTOR_CANONICAL_MAP: Record<string, string> = {
  // Marvel & Hollywood
  "rdj": "Robert Downey Jr",
  "robert downey": "Robert Downey Jr",
  "robert downey jr": "Robert Downey Jr",
  "chris evans": "Chris Evans",
  "chris hemsworth": "Chris Hemsworth",
  "tom holland": "Tom Holland",
  "ryan reynolds": "Ryan Reynolds",
  "hugh jackman": "Hugh Jackman",
  "keanu reeves": "Keanu Reeves",
  "the rock": "Dwayne Johnson",
  "dwayne johnson": "Dwayne Johnson",
  "tom cruise": "Tom Cruise",
  "leonardo dicaprio": "Leonardo DiCaprio",
  "brad pitt": "Brad Pitt",
  "cillian murphy": "Cillian Murphy",
  "christian bale": "Christian Bale",
  "johnny depp": "Johnny Depp",
  "will smith": "Will Smith",
  "jason statham": "Jason Statham",
  "vin diesel": "Vin Diesel",
  "benedict cumberbatch": "Benedict Cumberbatch",
  "scarlett johansson": "Scarlett Johansson",
  "henry cavill": "Henry Cavill",

  // Việt Nam
  "trấn thành": "Huỳnh Trấn Thành",
  "tran thanh": "Huỳnh Trấn Thành",
  "huỳnh trấn thành": "Huỳnh Trấn Thành",
  "huynh tran thanh": "Huỳnh Trấn Thành",
  "a xìn": "Huỳnh Trấn Thành",
  "a xin": "Huỳnh Trấn Thành",
  "mc trấn thành": "Huỳnh Trấn Thành",
  "mc tran thanh": "Huỳnh Trấn Thành",
  "xìn": "Huỳnh Trấn Thành",
  "trường giang": "Trường Giang",
  "truong giang": "Trường Giang",
  "mười khó": "Trường Giang",
  "muoi kho": "Trường Giang",
  "mc trường giang": "Trường Giang",
  "thái hòa": "Thái Hòa",
  "thai hoa": "Thái Hòa",
  "ông hoàng phòng vé": "Thái Hòa",
  "ong hoang phong ve": "Thái Hòa",
  "ông hoàng phòng vé thái hòa": "Thái Hòa",
  "lý hải": "Lý Hải",
  "ly hai": "Lý Hải",
  "đạo diễn lý hải": "Lý Hải",
  "thu trang": "Thu Trang",
  "hoa hậu hài thu trang": "Thu Trang",
  "ninh dương lan ngọc": "Ninh Dương Lan Ngọc",
  "ninh duong lan ngoc": "Ninh Dương Lan Ngọc",
  "lan ngọc": "Ninh Dương Lan Ngọc",
  "lan ngoc": "Ninh Dương Lan Ngọc",
  "kaity nguyễn": "Kaity Nguyễn",
  "kaity nguyen": "Kaity Nguyễn",
  "kaity": "Kaity Nguyễn",
  "kiều minh tuấn": "Kiều Minh Tuấn",
  "kieu minh tuan": "Kiều Minh Tuấn",
  "hoài linh": "Hoài Linh",
  "hoai linh": "Hoài Linh",
  "sáu bảnh": "Hoài Linh",
  "việt hương": "Việt Hương",
  "viet huong": "Việt Hương",
  "mạc văn khoa": "Mạc Văn Khoa",
  "mac van khoa": "Mạc Văn Khoa",
  "tuấn trần": "Tuấn Trần",
  "tuan tran": "Tuấn Trần",
  "ngô thanh vân": "Ngô Thanh Vân",
  "ngo thanh van": "Ngô Thanh Vân",

  // Hồng Kông & Trung Quốc
  "thành long": "Jackie Chan",
  "thanh long": "Jackie Chan",
  "jackie chan": "Jackie Chan",
  "chan kong sang": "Jackie Chan",
  "chan kong-sang": "Jackie Chan",
  "sing lung": "Jackie Chan",
  "châu tinh trì": "Stephen Chow",
  "chau tinh tri": "Stephen Chow",
  "stephen chow": "Stephen Chow",
  "tinh gia": "Stephen Chow",
  "vua hài châu tinh trì": "Stephen Chow",
  "châu nhuận phát": "Chow Yun-Fat",
  "chau nhuan phat": "Chow Yun-Fat",
  "chow yun fat": "Chow Yun-Fat",
  "lưu đức hoa": "Andy Lau",
  "luu duc hoa": "Andy Lau",
  "andy lau": "Andy Lau",
  "chân tử đan": "Donnie Yen",
  "chan tu dan": "Donnie Yen",
  "chung tử đơn": "Donnie Yen",
  "chung tu don": "Donnie Yen",
  "chung tử đan": "Donnie Yen",
  "chung tu dan": "Donnie Yen",
  "donnie yen": "Donnie Yen",
  "lý liên kiệt": "Jet Li",
  "ly lien kiet": "Jet Li",
  "jet li": "Jet Li",
  "ngô kinh": "Wu Jing",
  "ngo kinh": "Wu Jing",
  "wu jing": "Wu Jing",
  "cổ thiên lạc": "Louis Koo",
  "co thien lac": "Louis Koo",
  "louis koo": "Louis Koo",
  "lương triều vỹ": "Tony Leung",
  "luong trieu vy": "Tony Leung",
  "tony leung": "Tony Leung",
  "triệu lệ dĩnh": "Zhao Liying",
  "trieu le dinh": "Zhao Liying",
  "zhao liying": "Zhao Liying",
  "dương mịch": "Yang Mi",
  "duong mich": "Yang Mi",
  "yang mi": "Yang Mi",
  "địch lệ nhiệt ba": "Dilraba Dilmurat",
  "dich le nhiet ba": "Dilraba Dilmurat",
  "dilraba": "Dilraba Dilmurat",
  "tiêu chiến": "Xiao Zhan",
  "tieu chien": "Xiao Zhan",
  "xiao zhan": "Xiao Zhan",
  "vương nhất bác": "Wang Yibo",
  "vuong nhat bac": "Wang Yibo",
  "wang yibo": "Wang Yibo",
  "lưu diệc phi": "Liu Yifei",
  "luu diec phi": "Liu Yifei",
  "liu yifei": "Liu Yifei",
  "thần tiên tỷ tỷ": "Liu Yifei",
  "bạch lộc": "Bai Lu",
  "bach loc": "Bai Lu",
  "bai lu": "Bai Lu",
  "dương tử": "Yang Zi",
  "duong tu": "Yang Zi",
  "yang zi": "Yang Zi",

  // Hàn Quốc, Nhật Bản, Thái Lan
  "song joong ki": "Song Joong-ki",
  "song hye kyo": "Song Hye-kyo",
  "hyun bin": "Hyun Bin",
  "son ye jin": "Son Ye-jin",
  "iu": "Lee Ji-eun",
  "lee ji eun": "Lee Ji-eun",
  "park seo joon": "Park Seo-joon",
  "gong yoo": "Gong Yoo",
  "lee min ho": "Lee Min-ho",
  "ma dong seok": "Ma Dong-seok",
  "don lee": "Ma Dong-seok",
  "kim soo hyun": "Kim Soo-hyun",
  "lee jong suk": "Lee Jong-suk",
  "baifern": "Baifern Pimchanok",
  "baifern pimchanok": "Baifern Pimchanok",
  "mario maurer": "Mario Maurer",
  "ken watanabe": "Ken Watanabe",
  "hayao miyazaki": "Hayao Miyazaki",
  "makoto shinkai": "Makoto Shinkai",
};

// Bảng ánh xạ slug và bí danh diễn viên quốc tế & Việt Nam (Mapping Table / Synonym Dictionary)
export const ACTOR_SLUG_MAP: Record<string, string[]> = {
  // Hồng Kông / Trung Quốc
  "thanh-long": [
    "thành long",
    "thanh long",
    "jackie chan",
    "chan kong sang",
    "chan kong-sang",
    "sing lung",
    "trần cảng sinh",
    "tran cang sinh",
    "phòng sĩ long",
    "phong si long",
  ],
  "chau-tinh-tri": ["châu tinh trì", "chau tinh tri", "stephen chow", "chow sing chi", "tinh gia"],
  "chan-tu-dan": [
    "chân tử đan",
    "chan tu dan",
    "chung tử đơn",
    "chung tu don",
    "chung tử đan",
    "chung tu dan",
    "donnie yen",
    "yen ji dan",
  ],
  "ly-lien-kiet": ["lý liên kiệt", "ly lien kiet", "jet li", "li lian jie"],
  "ngo-kinh": ["ngô kinh", "ngo kinh", "wu jing"],
  "luu-duc-hoa": ["lưu đức hoa", "luu duc hoa", "andy lau"],
  "luong-trieu-vy": ["lương triều vỹ", "luong trieu vy", "tony leung", "tony leung chiu wai"],
  "quach-phu-thanh": ["quách phú thành", "quach phu thanh", "aaron kwok"],
  "co-thien-lac": ["cổ thiên lạc", "co thien lac", "louis koo"],
  "truong-gia-huy": ["trương gia huy", "truong gia huy", "nick cheung"],
  "ta-dinh-phong": ["tạ đình phong", "ta dinh phong", "nicholas tse"],
  "hong-kim-bao": ["hồng kim bảo", "hong kim bao", "sammo hung"],
  "nguyen-biao": ["nguyên tiêu", "nguyen biao", "yuen biao"],
  "duong-mich": ["dương mịch", "duong mich", "yang mi"],
  "trieu-le-dinh": ["triệu lệ dĩnh", "trieu le dinh", "zhao liying", "zanilia zhao"],
  "dich-le-nhiet-ba": ["địch lệ nhiệt ba", "dich le nhiet ba", "dilraba dilmurat", "dilraba"],
  "tieu-chien": ["tiêu chiến", "tieu chien", "xiao zhan", "sean xiao"],
  "vuong-nhat-bac": ["vương nhất bác", "vuong nhat bac", "wang yibo"],
  "huynh-hieu-minh": ["huỳnh hiểu minh", "huynh hieu minh", "huang xiaoming"],
  "luu-diec-phi": ["lưu diệc phi", "luu diec phi", "crystal liu", "liu yifei"],
  "bach-loc": ["bạch lộc", "bach loc", "bai lu"],
  "la-van-hi": ["la vân hi", "la van hi", "leo luo", "luo yunxi"],
  "duong-tu": ["dương tử", "duong tu", "yang zi", "andy yang"],
  "nham-gia-luan": ["nhậm gia luân", "nham gia luan", "allen ren", "ren jialun"],
  "trieu-lo-tu": ["triệu lộ tư", "trieu lo tu", "zhao lusi", "rosy zhao"],
  "cuc-tinh-y": ["cúc tịnh y", "cuc tinh y", "ju jingyi"],
  "vuong-hac-de": ["vương hạc đệ", "vuong hac de", "dylan wang", "wang hedi"],
  "hua-khai": ["hứa khải", "hua khai", "xu kai"],
  "ngo-loi": ["ngô lỗi", "ngo loi", "leo wu", "wu lei"],
  "cung-tuan": ["cung tuấn", "cung tuan", "simon gong", "gong jun"],
  "chau-tan": ["châu tấn", "chau tan", "zhou xun"],
  "chuong-tu-di": ["chương tử di", "chuong tu di", "zhang ziyi"],
  "cung-loi": ["củng lợi", "cung loi", "gong li"],
  "thang-duy": ["thang duy", "tang wei"],
  "pham-bang-bang": ["phạm băng băng", "pham bang bang", "fan bingbing"],
  "ly-bang-bang": ["lý băng băng", "ly bang bang", "li bingbing"],

  "tran-thanh": ["trấn thành", "tran thanh", "mc tran thanh", "a xìn", "mc xìn", "dao dien tran thanh"],
  "truong-giang": ["trường giang", "truong giang", "mc truong giang", "mười khó", "muoi kho"],
  "thai-hoa": ["thái hòa", "thai hoa", "ông hoàng phòng vé thái hòa"],
  "ninh-duong-lan-ngoc": ["ninh dương lan ngọc", "ninh duong lan ngoc", "lan ngoc"],
  "kieu-minh-tuan": ["kiều minh tuấn", "kieu minh tuan"],
  "thu-trang": ["thu trang", "hoa hậu hài thu trang"],
  "ly-hai": ["lý hải", "ly hai", "đạo diễn lý hải"],
  "hoai-linh": ["hoài linh", "hoai linh", "sáu bảnh", "sau sang"],
  "viet-huong": ["việt hương", "viet huong"],
  "tuan-tran": ["tuấn trần", "tuan tran"],
  "miu-le": ["miu lê", "miu le"],

  // Hollywood
  "tom-cruise": ["tom cruise", "thomas cruise mapother"],
  "keanu-reeves": ["keanu reeves", "keanu charles reeves"],
  "leonardo-dicaprio": ["leonardo dicaprio", "leo dicaprio"],
  "dwayne-johnson": ["dwayne johnson", "the rock"],
  "jason-statham": ["jason statham"],
  "brad-pitt": ["brad pitt", "william bradley pitt"],
  "will-smith": ["will smith"],
  "robert-downey-jr": ["robert downey jr", "robert downey"],
  "chris-evans": ["chris evans"],
  "chris-hemsworth": ["chris hemsworth"],
  "scarlett-johansson": ["scarlett johansson"],
  "ryan-reynolds": ["ryan reynolds"],
  "cillian-murphy": ["cillian murphy"],
  "christian-bale": ["christian bale"],

  // Hàn Quốc
  "song-joong-ki": ["song joong ki", "song joong-ki"],
  "kim-soo-hyun": ["kim soo hyun", "kim soo-hyun"],
  "hyun-bin": ["hyun bin", "hyeon bin"],
  "lee-min-ho": ["lee min ho", "lee min-ho"],
  "park-seo-joon": ["park seo joon", "park seo-jun"],
  "son-ye-jin": ["son ye jin", "son ye-jin"],
  "kim-ji-won": ["kim ji won", "kim ji-won"],
  "song-kang": ["song kang"],
  "iu": ["iu", "lee ji eun", "lee ji-eun"],
  "cha-eun-woo": ["cha eun woo", "cha eunwoo"],
  "lee-jong-suk": ["lee jong suk", "lee jongsuk"],
  "gong-yoo": ["gong yoo"],
  "han-so-hee": ["han so hee", "han sohee"],
  "song-hye-kyo": ["song hye kyo", "song hyekyo"],
  "ma-dong-seok": ["ma dong seok", "ma dong-seok", "don lee"],
};

/**
 * 1. BẢNG QUY ĐỔI ĐỒNG NGHĨA (MAPPING TABLE / SYNONYM DICTIONARY)
 * Tra cứu mọi từ khóa (tiếng Việt có dấu, không dấu, tên tiếng Anh, nghệ danh, slug)
 * và trích xuất TOÀN BỘ các biến thể tên của diễn viên đó để thực hiện truy vấn đa biến thể.
 * Ví dụ: 'Thành Long' -> ['thành long', 'thanh long', 'jackie chan', 'chan kong sang', 'sing lung']
 */
export interface ActorSynonymResult {
  isMatched: boolean;
  slug: string;
  canonicalName: string;
  country?: string;
  variants: string[]; // Toàn bộ biến thể tên (Việt có dấu, không dấu, Anh/gốc, nghệ danh)
  englishName?: string;
}

export function getActorSynonyms(query: string): ActorSynonymResult {
  if (!query || query.trim().length < 2) {
    return { isMatched: false, slug: "", canonicalName: "", variants: [] };
  }

  const cleanRaw = query.trim().toLowerCase();
  const normalizedQuery = normalizeForMatch(query);
  const cleanedActorQ = cleanActorQuery(query);

  // 1. Tra cứu trực tiếp trong ACTOR_CANONICAL_MAP (Bí danh -> Tên chuẩn duy nhất trong Database)
  const canonicalDirect =
    ACTOR_CANONICAL_MAP[cleanRaw] ||
    ACTOR_CANONICAL_MAP[normalizedQuery] ||
    ACTOR_CANONICAL_MAP[cleanedActorQ];

  if (canonicalDirect) {
    const linkedAliases = Object.entries(ACTOR_CANONICAL_MAP)
      .filter(([, target]) => target.toLowerCase() === canonicalDirect.toLowerCase())
      .map(([key]) => key);

    const preset = GOLDEN_ACTOR_INDEX.find(
      (p) =>
        normalizeForMatch(p.name) === normalizeForMatch(canonicalDirect) ||
        p.aliases.some((pa) => normalizeForMatch(pa) === normalizeForMatch(canonicalDirect))
    );

    const allVariants = Array.from(
      new Set([
        canonicalDirect,
        canonicalDirect.toLowerCase(),
        normalizeForMatch(canonicalDirect),
        cleanRaw,
        normalizedQuery,
        ...linkedAliases,
        ...(preset?.aliases || []),
        ...(preset?.name ? [preset.name] : []),
      ].filter(Boolean))
    );

    const englishName = allVariants.find(
      (a) => !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(a) && a.includes(" ")
    ) || canonicalDirect;

    const slug = normalizeForMatch(canonicalDirect).replace(/\s+/g, "-");

    return {
      isMatched: true,
      slug,
      canonicalName: canonicalDirect,
      country: preset?.country,
      variants: allVariants,
      englishName,
    };
  }

  // 2. Đối chiếu qua ACTOR_SLUG_MAP
  for (const [slug, aliases] of Object.entries(ACTOR_SLUG_MAP)) {
    const normSlug = normalizeForMatch(slug.replace(/-/g, " "));
    const isSlugMatch = normalizedQuery === normSlug || cleanRaw === slug;
    const isAliasMatch = aliases.some((a) => {
      const normA = normalizeForMatch(a);
      return normA === normalizedQuery || cleanRaw === a.toLowerCase();
    });

    if (isSlugMatch || isAliasMatch) {
      const preset = GOLDEN_ACTOR_INDEX.find(
        (p) =>
          normalizeForMatch(p.name) === normalizedQuery ||
          p.aliases.some((pa) => normalizeForMatch(pa) === normalizedQuery) ||
          normalizeForMatch(p.name) === normSlug
      );

      const allVariants = Array.from(
        new Set([
          query.trim().toLowerCase(),
          normalizedQuery,
          slug.replace(/-/g, " "),
          ...aliases,
          ...(preset?.aliases || []),
          preset?.name?.toLowerCase(),
        ].filter((s): s is string => Boolean(s && s.trim().length >= 2)).map((s) => s.trim().toLowerCase()))
      );

      // Tìm tên tiếng Anh gốc (alias chữ Latinh không chứa dấu tiếng Việt và có dấu cách)
      const englishName = aliases.find(
        (a) => !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(a) && a.includes(" ")
      ) || aliases[2];

      const canonicalName = preset?.name || (aliases[0] ? toVietnameseTitleCase(aliases[0]) : toVietnameseTitleCase(query.trim()));

      return {
        isMatched: true,
        slug,
        canonicalName,
        country: preset?.country,
        variants: allVariants,
        englishName,
      };
    }
  }

  // 2. Đối chiếu qua GOLDEN_ACTOR_INDEX nếu chưa có trong ACTOR_SLUG_MAP
  for (const preset of GOLDEN_ACTOR_INDEX) {
    const normPName = normalizeForMatch(preset.name);
    const isMatch = normPName === normalizedQuery || preset.aliases.some((a) => normalizeForMatch(a) === normalizedQuery || cleanRaw === a.toLowerCase());
    if (isMatch) {
      const allVariants = Array.from(
        new Set([
          query.trim().toLowerCase(),
          normalizedQuery,
          preset.name.toLowerCase(),
          ...preset.aliases.map((a) => a.toLowerCase()),
        ].filter(Boolean))
      );
      return {
        isMatched: true,
        slug: normalizeForMatch(preset.name).replace(/\s+/g, "-"),
        canonicalName: preset.name,
        country: preset.country,
        variants: allVariants,
      };
    }
  }

  return {
    isMatched: false,
    slug: "",
    canonicalName: query.trim(),
    variants: [query.trim().toLowerCase(), normalizedQuery].filter(Boolean),
  };
}
